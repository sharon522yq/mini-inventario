import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createClient } from '@supabase/supabase-js';
import { crearRepositorioProductos } from '../public/productos.js';

const datos = { nombre: 'Cuaderno', sku: 'ABC-1', cantidad: '3', minimo: '5' };
const fila = { id: 'producto-1', user_id: 'usuario-1', nombre: 'Cuaderno', sku: 'ABC-1', cantidad: 3, minimo: 5, created_at: '2026-11-20T00:00:00Z' };

function preparar(respuesta = fila, status = 200) {
  const peticiones = [];
  const cliente = createClient('https://prueba.supabase.co', 'sb_publishable_prueba', {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: { fetch: async (url, opciones) => {
      peticiones.push({ url: new URL(url), ...opciones });
      return new Response(JSON.stringify(respuesta), { status, headers: { 'Content-Type': 'application/json' } });
    } }
  });
  cliente.auth.getSession = async () => ({ data: { session: { user: { id: 'usuario-1' }, access_token: 'token-prueba' } }, error: null });
  return { repo: crearRepositorioProductos(cliente), peticiones, cliente };
}

test('listado consulta Supabase con identidad, token y orden estable', async () => {
  const { repo, peticiones } = preparar([fila]);
  assert.deepEqual(await repo.listarProductos(), [fila]);
  const [peticion] = peticiones;
  assert.equal(peticion.method, 'GET');
  assert.equal(peticion.url.pathname, '/rest/v1/productos');
  assert.equal(peticion.url.searchParams.get('user_id'), 'eq.usuario-1');
  assert.equal(peticion.url.searchParams.get('order'), 'created_at.asc,id.asc');
  assert.equal(new Headers(peticion.headers).get('authorization'), 'Bearer token-prueba');
});

test('alta y edición envían únicamente cuatro campos normalizados', async () => {
  for (const editar of [false, true]) {
    const { repo, peticiones } = preparar(fila);
    const entrada = { ...datos, nombre: ' Cuaderno ', sku: ' ABC-1 ', id: 'inyectado', user_id: 'otro', created_at: '2000-01-01' };
    const guardado = editar ? await repo.editarProducto(fila.id, entrada) : await repo.crearProducto(entrada);
    assert.deepEqual(guardado, fila);
    assert.equal(peticiones.length, 1);
    assert.deepEqual(JSON.parse(peticiones[0].body), { nombre: 'Cuaderno', sku: 'ABC-1', cantidad: 3, minimo: 5 });
    assert.equal(peticiones[0].method, editar ? 'PATCH' : 'POST');
    if (editar) assert.equal(peticiones[0].url.searchParams.get('id'), 'eq.producto-1');
  }
});

test('validación por campo impide peticiones con valores inválidos', async () => {
  const { repo, peticiones } = preparar();
  for (const [campo, valor] of [['nombre', '  '], ['sku', '\t'], ['cantidad', ''], ['minimo', null], ['cantidad', -1], ['minimo', 1.5], ['cantidad', Infinity], ['cantidad', true], ['minimo', 2147483648]]) {
    const entrada = { ...datos, [campo]: valor };
    for (const operacion of [() => repo.crearProducto(entrada), () => repo.editarProducto(fila.id, entrada)]) {
      await assert.rejects(operacion, error => Boolean(error.errores[campo]));
    }
  }
  assert.equal(peticiones.length, 0);
});

test('integer máximo se acepta y campos obligatorios se informan juntos', async () => {
  const { repo, peticiones } = preparar();
  await repo.crearProducto({ ...datos, cantidad: 2147483647, minimo: '2147483647' });
  assert.equal(JSON.parse(peticiones[0].body).cantidad, 2147483647);
  await assert.rejects(repo.crearProducto({}), error => {
    assert.deepEqual(Object.keys(error.errores), ['nombre', 'sku', 'cantidad', 'minimo']);
    return true;
  });
});

test('unicidad concurrente y restricciones de la base se traducen sin SQL interno', async () => {
  for (const editar of [false, true]) {
    const { repo } = preparar({ code: '23505', message: 'SQL interno sensible' }, 409);
    await assert.rejects(editar ? repo.editarProducto(fila.id, datos) : repo.crearProducto(datos), error => {
      assert.equal(error.errores.sku, 'SKU: ya existe un producto con ese SKU.');
      assert.doesNotMatch(error.message, /interno/);
      return true;
    });
  }
  const { repo } = preparar({ code: '23514', message: 'constraint productos_minimo_no_negativo' }, 400);
  await assert.rejects(repo.crearProducto(datos), error => Boolean(error.errores.minimo));
});

test('edición sin fila autorizada no informa éxito', async () => {
  const { repo } = preparar(null);
  await assert.rejects(repo.editarProducto('ajeno', datos), /no está disponible/);
});

test('sin sesión no se consulta ni se escribe y se pide iniciar sesión', async () => {
  const { repo, cliente, peticiones } = preparar();
  cliente.auth.getSession = async () => ({ data: { session: null }, error: null });
  for (const operacion of [() => repo.listarProductos(), () => repo.crearProducto(datos), () => repo.editarProducto(fila.id, datos)]) {
    await assert.rejects(operacion, error => error.sesionExpirada === true);
  }
  assert.equal(peticiones.length, 0);
});

test('token rechazado y errores remotos se muestran sin detalles internos', async () => {
  const expirado = preparar({ code: 'PGRST301', message: 'JWT interno' }, 401);
  await assert.rejects(expirado.repo.listarProductos(), error => error.sesionExpirada === true);
  const fallo = preparar({ code: 'XX000', message: 'secreto SQL' }, 500);
  await assert.rejects(fallo.repo.crearProducto(datos), error => {
    assert.match(error.message, /conexión/);
    assert.doesNotMatch(error.message, /secreto|SQL/);
    return true;
  });
});
