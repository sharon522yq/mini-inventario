import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { listarProductos, crearProducto, editarProducto } from '../public/productos.js';

let almacen;
beforeEach(() => {
  almacen = new Map();
  globalThis.localStorage = {
    getItem: clave => almacen.get(clave) ?? null,
    setItem: (clave, valor) => almacen.set(clave, valor)
  };
});
const datos = { nombre: 'Cuaderno', sku: 'ABC-1', cantidad: '3', minimo: '5' };

test('inventario vacío, creación normalizada y lectura persistente', async () => {
  assert.deepEqual(await listarProductos(), []);
  const producto = await crearProducto({ ...datos, nombre: ' Cuaderno ', sku: ' ABC-1 ' });
  assert.equal(producto.nombre, 'Cuaderno');
  assert.equal(producto.sku, 'ABC-1');
  assert.equal(producto.cantidad, 3);
  assert.ok(producto.id);
  assert.deepEqual(await listarProductos(), [producto]);
  producto.nombre = 'Cambio externo';
  assert.equal((await listarProductos())[0].nombre, 'Cuaderno');
});

test('la lectura normaliza cantidades guardadas como texto y calcula correctamente Bajo mínimo', async () => {
  const producto = {
    ...datos, id: 'producto-texto', nombre: ' Cuaderno ', sku: ' ABC-1 ',
    cantidad: '10', minimo: '5', created_at: '2026-11-19T12:00:00.000Z'
  };
  const contenido = JSON.stringify([producto]);
  almacen.set('mini-inventario.productos.v1', contenido);
  const [leido] = await listarProductos();
  assert.deepEqual(leido, { ...producto, nombre: 'Cuaderno', sku: 'ABC-1', cantidad: 10, minimo: 5 });
  assert.equal(leido.cantidad < leido.minimo, false);
  assert.equal(almacen.get('mini-inventario.productos.v1'), contenido);
});

test('cantidad y mínimo aceptan el máximo integer y rechazan el siguiente sin guardar', async () => {
  const producto = await crearProducto({ ...datos, cantidad: '2147483647', minimo: 2147483647 });
  for (const [campo, etiqueta] of [['cantidad', 'Cantidad'], ['minimo', 'Cantidad mínima']]) {
    for (const valor of [2147483648, '2147483648']) {
      const entrada = { ...datos, sku: 'OTRO', [campo]: valor };
      const comprobar = error => error.errores[campo] === `${etiqueta}: el máximo permitido es 2147483647.`;
      await assert.rejects(crearProducto(entrada), comprobar);
      await assert.rejects(editarProducto(producto.id, entrada), comprobar);
      assert.deepEqual(await listarProductos(), [producto]);
    }
  }
  const editado = await editarProducto(producto.id, { ...datos, cantidad: 2147483647, minimo: '2147483647' });
  assert.equal(editado.cantidad, 2147483647);
  assert.equal(editado.minimo, 2147483647);
});

test('la fecha se genera al crear, se persiste y no se puede cambiar al editar', async () => {
  const inicio = Date.now();
  const producto = await crearProducto({ ...datos, created_at: '2000-01-01T00:00:00.000Z' });
  assert.ok(Date.parse(producto.created_at) >= inicio);
  assert.ok(Date.parse(producto.created_at) <= Date.now());
  assert.equal(JSON.parse(almacen.get('mini-inventario.productos.v1'))[0].created_at, producto.created_at);
  const editado = await editarProducto(producto.id, { ...datos, created_at: '2099-01-01T00:00:00.000Z' });
  assert.equal(editado.created_at, producto.created_at);
  assert.deepEqual(await listarProductos(), [editado]);
});

test('el listado ordena por fecha ascendente y desempata por id, incluidos productos antiguos', async () => {
  const filas = [
    { ...datos, id: 'z', sku: 'Z', created_at: '2026-11-19T12:00:00.000Z' },
    { ...datos, id: 'antiguo', sku: 'ANTIGUO' },
    { ...datos, id: 'a', sku: 'A', created_at: '2026-11-19T12:00:00.000Z' },
    { ...datos, id: 'previo', sku: 'PREVIO', created_at: '2026-11-18T12:00:00.000Z' }
  ];
  const contenido = JSON.stringify(filas);
  almacen.set('mini-inventario.productos.v1', contenido);
  const listado = await listarProductos();
  assert.deepEqual(listado.map(producto => producto.id), ['antiguo', 'previo', 'a', 'z']);
  assert.equal(listado[0].created_at, '1970-01-01T00:00:00.000Z');
  assert.equal(almacen.get('mini-inventario.productos.v1'), contenido);
  const editado = await editarProducto('antiguo', { ...datos, sku: 'ANTIGUO' });
  assert.equal(editado.created_at, listado[0].created_at);
  assert.deepEqual((await listarProductos()).map(producto => producto.id), ['antiguo', 'previo', 'a', 'z']);
});

test('SKU duplicado al crear y editar; conservar el propio SKU está permitido', async () => {
  const primero = await crearProducto(datos);
  const segundo = await crearProducto({ ...datos, sku: 'DEF-2' });
  await assert.rejects(crearProducto({ ...datos, sku: ' abc-1 ' }), /SKU/);
  await assert.rejects(editarProducto(segundo.id, { ...datos, sku: ' abc-1 ' }), /SKU/);
  assert.equal((await listarProductos()).find(producto => producto.id === segundo.id).sku, 'DEF-2');
  const editado = await editarProducto(primero.id, { ...datos, sku: ' abc-1 ', cantidad: 9 });
  assert.equal(editado.id, primero.id);
  assert.equal(editado.sku, 'abc-1');
  assert.equal((await listarProductos()).find(producto => producto.id === primero.id).cantidad, 9);
});

test('validación por campo no guarda datos inválidos ni modifica los anteriores', async () => {
  const producto = await crearProducto(datos);
  for (const [campo, valor] of [['nombre', '  '], ['sku', '  '], ['cantidad', ''], ['minimo', ' '], ['cantidad', -1], ['minimo', 1.5], ['cantidad', Infinity], ['cantidad', null], ['cantidad', true], ['minimo', Number.MAX_SAFE_INTEGER + 1]]) {
    const entrada = { ...datos, [campo]: valor };
    await assert.rejects(crearProducto(entrada), error => Boolean(error.errores[campo]));
    await assert.rejects(editarProducto(producto.id, entrada), error => Boolean(error.errores[campo]));
    assert.deepEqual(await listarProductos(), [producto]);
  }
});

test('editar un id inexistente no crea productos', async () => {
  await assert.rejects(editarProducto('inexistente', datos), /no está disponible/);
  assert.deepEqual(await listarProductos(), []);
});

test('los mensajes nombran cada campo obligatorio vacío en alta y edición', async () => {
  const producto = await crearProducto(datos);
  for (const [campo, etiqueta] of [['nombre', 'Nombre'], ['sku', 'SKU'], ['cantidad', 'Cantidad'], ['minimo', 'Cantidad mínima']]) {
    for (const vacio of ['', '   ', null, undefined]) {
      const entrada = { ...datos, [campo]: vacio };
      const comprobar = error => error.errores[campo] === `${etiqueta}: este campo es obligatorio.`;
      await assert.rejects(crearProducto(entrada), comprobar);
      await assert.rejects(editarProducto(producto.id, entrada), comprobar);
      assert.deepEqual(await listarProductos(), [producto]);
    }
  }
  const vacios = { nombre: '', sku: '', cantidad: '', minimo: '' };
  const comprobarTodos = error => {
    assert.deepEqual(error.errores, {
      nombre: 'Nombre: este campo es obligatorio.',
      sku: 'SKU: este campo es obligatorio.',
      cantidad: 'Cantidad: este campo es obligatorio.',
      minimo: 'Cantidad mínima: este campo es obligatorio.'
    });
    return true;
  };
  await assert.rejects(crearProducto(vacios), comprobarTodos);
  await assert.rejects(editarProducto(producto.id, vacios), comprobarTodos);
  assert.deepEqual(await listarProductos(), [producto]);
});

test('reúne SKU duplicado y otros errores a la vez sin guardar el alta ni la edición', async () => {
  const primero = await crearProducto(datos);
  const segundo = await crearProducto({ ...datos, sku: 'DEF-2' });
  const anteriores = await listarProductos();
  const entrada = { nombre: ' ', sku: ' abc-1 ', cantidad: -1, minimo: 1.5 };
  const comprobar = error => {
    assert.deepEqual(error.errores, {
      nombre: 'Nombre: este campo es obligatorio.',
      sku: 'SKU: ya existe un producto con ese SKU.',
      cantidad: 'Cantidad: introduce un entero igual o mayor que cero.',
      minimo: 'Cantidad mínima: introduce un entero igual o mayor que cero.'
    });
    return true;
  };
  await assert.rejects(crearProducto(entrada), comprobar);
  await assert.rejects(editarProducto(segundo.id, entrada), comprobar);
  const dosErrores = { ...datos, sku: ' abc-1 ', cantidad: -1 };
  const comprobarDos = error => {
    assert.deepEqual(error.errores, {
      sku: 'SKU: ya existe un producto con ese SKU.',
      cantidad: 'Cantidad: introduce un entero igual o mayor que cero.'
    });
    return true;
  };
  await assert.rejects(crearProducto(dosErrores), comprobarDos);
  await assert.rejects(editarProducto(segundo.id, dosErrores), comprobarDos);
  assert.deepEqual(await listarProductos(), anteriores);
  // Al corregir el SKU propio y los demás campos se puede reintentar.
  const corregido = await editarProducto(segundo.id, { ...datos, sku: ' def-2 ', cantidad: 0 });
  assert.equal(corregido.sku, 'def-2');
  assert.equal(corregido.cantidad, 0);
});

test('se conservan datos corruptos y se informa de errores de almacenamiento', async () => {
  almacen.set('mini-inventario.productos.v1', '{invalido');
  await assert.rejects(listarProductos(), /leer los productos/);
  await assert.rejects(crearProducto(datos), /leer los productos/);
  assert.equal(almacen.get('mini-inventario.productos.v1'), '{invalido');
  almacen.clear();
  localStorage.setItem = () => { throw new Error('Cuota agotada'); };
  await assert.rejects(crearProducto(datos), /No se pudo guardar/);
  assert.deepEqual(await listarProductos(), []);
  localStorage.getItem = () => { throw new Error('Bloqueado'); };
  await assert.rejects(listarProductos(), /almacenamiento/);
});

test('cantidades menor, igual, mayor y cero frente a cero se conservan al editar', async () => {
  const producto = await crearProducto(datos);
  for (const [cantidad, minimo, bajo] of [[1, 2, true], [2, 2, false], [3, 2, false], [0, 0, false]]) {
    await editarProducto(producto.id, { ...datos, cantidad, minimo });
    const [guardado] = await listarProductos();
    assert.equal(guardado.cantidad < guardado.minimo, bajo);
  }
});
