import { obtenerCliente } from './supabase.js';

const MAXIMO_INTEGER = 2147483647;

export class ErrorProducto extends Error {
  constructor(message, campo, errores = {}) {
    super(message);
    this.name = 'ErrorProducto';
    this.campo = campo;
    this.errores = errores;
  }
}

function validar(datos) {
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

const COLUMNAS = 'id,user_id,nombre,sku,cantidad,minimo,created_at';

function traducirError(error) {
  if (error.code === '23505') {
    return new ErrorProducto('SKU: ya existe un producto con ese SKU.', 'sku', {
      sku: 'SKU: ya existe un producto con ese SKU.'
    });
  }
  if (error.code === '23514') {
    const reglas = {
      productos_nombre_no_vacio: ['nombre', 'Nombre: este campo es obligatorio.'],
      productos_sku_no_vacio: ['sku', 'SKU: este campo es obligatorio.'],
      productos_cantidad_no_negativa: ['cantidad', 'Cantidad: introduce un entero igual o mayor que cero.'],
      productos_minimo_no_negativo: ['minimo', 'Cantidad mínima: introduce un entero igual o mayor que cero.']
    };
    const regla = Object.entries(reglas).find(([nombre]) => error.message?.includes(nombre));
    if (regla) {
      const [campo, mensaje] = regla[1];
      return new ErrorProducto(mensaje, campo, { [campo]: mensaje });
    }
  }
  if (error.status === 401 || error.code === 'PGRST301' || error.code === 'PGRST303') {
    const resultado = new ErrorProducto('Tu sesión expiró. Vuelve a iniciar sesión.');
    resultado.sesionExpirada = true;
    return resultado;
  }
  return new ErrorProducto('No se pudo completar la operación. Comprueba tu conexión e inténtalo de nuevo.');
}

async function sesionActual(cliente) {
  const { data, error } = await cliente.auth.getSession();
  if (error || !data.session) {
    const resultado = new ErrorProducto('Inicia sesión para consultar tu inventario.');
    resultado.sesionExpirada = true;
    throw resultado;
  }
  return data.session;
}

export function crearRepositorioProductos(cliente) {
  async function ejecutar(operacion) {
    try { return await operacion(); }
    catch (error) {
      if (error instanceof ErrorProducto) throw error;
      throw traducirError(error);
    }
  }
  return {
    listarProductos: () => ejecutar(async () => {
      const sesion = await sesionActual(cliente);
      const { data, error } = await cliente.from('productos').select(COLUMNAS)
        .eq('user_id', sesion.user.id).order('created_at').order('id');
      if (error) throw error;
      return data;
    }),
    crearProducto: datos => ejecutar(async () => {
      const campos = validar(datos);
      await sesionActual(cliente);
      const { data, error } = await cliente.from('productos').insert(campos).select(COLUMNAS).single();
      if (error) throw error;
      return data;
    }),
    editarProducto: (id, datos) => ejecutar(async () => {
      const campos = validar(datos);
      await sesionActual(cliente);
      const { data, error } = await cliente.from('productos').update(campos).eq('id', id)
        .select(COLUMNAS).maybeSingle();
      if (error) throw error;
      if (!data) throw new ErrorProducto('El producto ya no está disponible. Actualiza el listado.');
      return data;
    })
  };
}

export async function listarProductos() {
  return crearRepositorioProductos(obtenerCliente()).listarProductos();
}

export async function crearProducto(datos) {
  return crearRepositorioProductos(obtenerCliente()).crearProducto(datos);
}

export async function editarProducto(id, datos) {
  return crearRepositorioProductos(obtenerCliente()).editarProducto(id, datos);
}
