import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { runInNewContext } from 'node:vm';
import { autenticar } from '../public/auth.js';

const codigo = (await readFile(new URL('../public/app.js', import.meta.url), 'utf8')).replace(/^import .*;\r?$/gm, '');

class Elemento {
  hidden = false;
  disabled = false;
  value = '';
  textContent = '';
  children = [];
  eventos = {};
  atributos = {};
  controles = [];
  append(...nodos) { this.children.push(...nodos); }
  replaceChildren(...nodos) { this.children = nodos; }
  addEventListener(tipo, fn) { this.eventos[tipo] = fn; }
  setAttribute(clave, valor) { this.atributos[clave] = valor; }
  removeAttribute(clave) { delete this.atributos[clave]; }
  querySelectorAll() { return this.controles; }
  querySelector() { return null; }
  reset() { this.controles.forEach(control => { control.value = ''; }); }
  focus() {}
  scrollIntoView() {}
}

function diferido() {
  let resolver;
  const promesa = new Promise(resolve => { resolver = resolve; });
  return { promesa, resolver };
}

function iniciar({ listar = async () => [], crear = async datos => ({ id: 'nuevo', ...datos }) } = {}) {
  const elementos = new Map();
  const buscar = id => {
    if (!elementos.has(id)) elementos.set(id, new Elemento());
    return elementos.get(id);
  };
  buscar('formulario').controles = ['nombre', 'sku', 'cantidad', 'minimo', 'guardar', 'cancelar'].map(buscar);
  buscar('formulario-acceso').controles = ['correo', 'contrasena', 'iniciar-sesion', 'registrar'].map(buscar);
  buscar('inventario').hidden = true;
  let cambio;
  const temporizadores = [];
  const cliente = { auth: {
    onAuthStateChange: fn => { cambio = fn; },
    signOut: async () => { cambio('SIGNED_OUT', null); return { error: null }; },
    signInWithPassword: async () => ({ data: { session: { user: { id: 'a', email: 'a@example.com' } } }, error: null })
  } };
  runInNewContext(codigo, {
    document: { getElementById: buscar, createElement: () => new Elemento(), createDocumentFragment: () => new Elemento() },
    obtenerCliente: () => cliente, listarProductos: listar, crearProducto: crear, editarProducto: crear, autenticar,
    setTimeout: fn => temporizadores.push(fn),
    FormData: class { *[Symbol.iterator]() { for (const campo of ['nombre', 'sku', 'cantidad', 'minimo']) yield [campo, buscar(campo).value]; } }
  });
  return { buscar, cliente, cambiar: sesion => cambio('SIGNED_IN', sesion), cargar: () => temporizadores.shift()?.() };
}

const sesion = id => ({ user: { id, email: `${id}@example.com` } });
const producto = { id: 'producto', nombre: 'Cuaderno', sku: 'ABC', cantidad: 1, minimo: 2 };
const submit = { preventDefault() {}, submitter: { value: 'ingresar' } };

test('inicia sesión y al salir limpia productos, formulario e identidad', async () => {
  const ui = iniciar({ listar: async () => [producto] });
  ui.buscar('correo').value = 'a@example.com';
  ui.buscar('contrasena').value = 'password';
  await ui.buscar('formulario-acceso').eventos.submit(submit);
  await ui.cargar();
  assert.equal(ui.buscar('inventario').hidden, false);
  assert.equal(ui.buscar('acceso').hidden, true);
  assert.equal(ui.buscar('total').textContent, 1);
  ui.buscar('nombre').value = 'dato privado';
  await ui.buscar('cerrar-sesion').eventos.click();
  assert.equal(ui.buscar('inventario').hidden, true);
  assert.equal(ui.buscar('acceso').hidden, false);
  assert.equal(ui.buscar('total').textContent, 0);
  assert.equal(ui.buscar('nombre').value, '');
  assert.equal(ui.buscar('usuario').textContent, '');
  assert.equal(ui.buscar('contrasena').value, '');
});

test('una consulta tardía de otra cuenta no repuebla la interfaz', async () => {
  const primera = diferido();
  let llamadas = 0;
  const ui = iniciar({ listar: () => ++llamadas === 1 ? primera.promesa : Promise.resolve([]) });
  ui.cambiar(sesion('a'));
  const cargaAnterior = ui.cargar();
  ui.cambiar(sesion('b'));
  await ui.cargar();
  primera.resolver([producto]);
  await cargaAnterior;
  assert.equal(ui.buscar('usuario').textContent, 'b@example.com');
  assert.equal(ui.buscar('total').textContent, 0);
});

test('un guardado tardío después de cerrar sesión no devuelve datos privados', async () => {
  const guardado = diferido();
  const ui = iniciar({ crear: () => guardado.promesa });
  ui.cambiar(sesion('a'));
  await ui.cargar();
  const pendiente = ui.buscar('formulario').eventos.submit(submit);
  ui.cambiar(null);
  guardado.resolver(producto);
  await pendiente;
  assert.equal(ui.buscar('inventario').hidden, true);
  assert.equal(ui.buscar('total').textContent, 0);
  assert.equal(ui.buscar('mensaje').textContent, '');
});

test('sesión expirada oculta y limpia el inventario', async () => {
  let expirar = false;
  const ui = iniciar({ listar: async () => {
    if (expirar) throw Object.assign(new Error('Sesión expirada'), { sesionExpirada: true });
    return [producto];
  } });
  ui.cambiar(sesion('a'));
  await ui.cargar();
  expirar = true;
  await ui.buscar('actualizar').eventos.click();
  assert.equal(ui.buscar('inventario').hidden, true);
  assert.equal(ui.buscar('total').textContent, 0);
  assert.match(ui.buscar('error-acceso').textContent, /expiró/);
});
