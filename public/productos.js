// Contrato asíncrono de datos. La interfaz no conoce localStorage.
// Al migrar a Supabase, conservar listarProductos, crearProducto y editarProducto.
const CLAVE = 'mini-inventario.productos.v1';
const MAXIMO_INTEGER = 2147483647;

export class ErrorProducto extends Error {
  constructor(message, campo, errores = {}) {
    super(message);
    this.name = 'ErrorProducto';
    this.campo = campo;
    this.errores = errores;
  }
}

function validar(datos, productos = [], id) {
  const etiquetas = { nombre: 'Nombre', sku: 'SKU', cantidad: 'Cantidad', minimo: 'Cantidad mínima' };
  const errores = {};
  for (const campo of Object.keys(etiquetas)) {
    if (datos[campo] === null || datos[campo] === undefined || String(datos[campo]).trim() === '') {
      errores[campo] = `${etiquetas[campo]}: este campo es obligatorio.`;
    }
  }
  const nombre = typeof datos.nombre === 'string' ? datos.nombre.trim() : '';
  const sku = typeof datos.sku === 'string' ? datos.sku.trim() : '';
  if (!errores.nombre && !nombre) errores.nombre = 'Nombre: escribe el nombre del producto.';
  if (!errores.sku && !sku) errores.sku = 'SKU: escribe un código para el producto.';
  if (!errores.sku && productos.some(producto => producto.id !== id && producto.sku.trim().toLowerCase() === sku.toLowerCase())) {
    errores.sku = 'SKU: ya existe un producto con ese SKU.';
  }
  const resultado = { nombre, sku };
  for (const [campo, etiqueta] of [['cantidad', 'Cantidad'], ['minimo', 'Cantidad mínima']]) {
    const valor = datos[campo];
    if (!errores[campo] && ((typeof valor !== 'string' && typeof valor !== 'number') || !Number.isSafeInteger(Number(valor)) || Number(valor) < 0)) {
      errores[campo] = `${etiqueta}: introduce un entero igual o mayor que cero.`;
    }
    if (!errores[campo] && Number(valor) > MAXIMO_INTEGER) {
      errores[campo] = `${etiqueta}: el máximo permitido es ${MAXIMO_INTEGER}.`;
    }
    resultado[campo] = Number(valor);
  }
  if (Object.keys(errores).length) {
    throw new ErrorProducto(Object.values(errores).join(' '), Object.keys(errores)[0], errores);
  }
  return resultado;
}

function leer() {
  let contenido;
  try {
    contenido = localStorage.getItem(CLAVE);
  } catch {
    throw new ErrorProducto('No se puede acceder al almacenamiento del navegador. Comprueba su configuración e inténtalo de nuevo.');
  }
  if (contenido === null) return [];
  try {
    const productos = JSON.parse(contenido);
    if (!Array.isArray(productos)) throw new Error('Formato inválido');
    const ids = new Set();
    const skus = new Set();
    for (const producto of productos) {
      const datos = validar(producto);
      const sku = datos.sku.toLowerCase();
      if (typeof producto.id !== 'string' || !producto.id || ids.has(producto.id) || skus.has(sku)) throw new Error('Producto inválido');
      // Los productos de la primera versión no tenían fecha; se consideran anteriores a los nuevos.
      if (producto.created_at === undefined) producto.created_at = '1970-01-01T00:00:00.000Z';
      if (typeof producto.created_at !== 'string' || !Number.isFinite(Date.parse(producto.created_at))) throw new Error('Fecha inválida');
      ids.add(producto.id);
      skus.add(sku);
    }
    return productos;
  } catch {
    throw new ErrorProducto('No se pudieron leer los productos guardados. Los datos se conservan; revisa el almacenamiento antes de volver a guardar.');
  }
}

function guardar(productos) {
  try {
    localStorage.setItem(CLAVE, JSON.stringify(productos));
  } catch {
    throw new ErrorProducto('No se pudo guardar. El almacenamiento puede estar lleno o bloqueado; tus cambios siguen en el formulario.');
  }
}

export async function listarProductos() {
  return leer().sort((a, b) => Date.parse(a.created_at) - Date.parse(b.created_at)
    || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
}

export async function crearProducto(datos) {
  const productos = leer();
  const campos = validar(datos, productos);
  const producto = { id: crypto.randomUUID(), created_at: new Date().toISOString(), ...campos };
  guardar([...productos, producto]);
  return producto;
}

export async function editarProducto(id, datos) {
  const productos = leer();
  const indice = productos.findIndex(producto => producto.id === id);
  if (indice === -1) throw new ErrorProducto('El producto ya no está disponible. Actualiza el listado.');
  const campos = validar(datos, productos, id);
  const producto = { ...productos[indice], ...campos };
  productos[indice] = producto;
  guardar(productos);
  return producto;
}
