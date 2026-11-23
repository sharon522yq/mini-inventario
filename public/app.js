import { listarProductos, crearProducto, editarProducto } from './productos.js';
import { obtenerCliente } from './supabase.js';
import { autenticar } from './auth.js';

const buscar = id => document.getElementById(id);
const formulario = buscar('formulario');
let productos = [];
let editando = null;
let pendiente = false;
let usuarioId = null;
let versionSesion = 0;
let versionCarga = 0;
let cliente;

function mostrarError(id, mensaje = '') {
  buscar(id).textContent = mensaje;
  buscar(id).hidden = !mensaje;
}

function limpiarErroresFormulario() {
  mostrarError('error-formulario');
  for (const campo of ['nombre', 'sku', 'cantidad', 'minimo']) {
    buscar(campo).removeAttribute('aria-invalid');
    mostrarError(`error-${campo}`);
  }
}

function dibujar() {
  const filas = document.createDocumentFragment();
  for (const producto of productos) {
    const bajo = producto.cantidad < producto.minimo;
    const fila = document.createElement('tr');
    const identidad = document.createElement('td');
    const nombre = document.createElement('strong');
    nombre.textContent = producto.nombre;
    const sku = document.createElement('span');
    sku.className = 'sku';
    sku.textContent = producto.sku;
    identidad.append(nombre, sku);
    fila.append(identidad);
    for (const [etiqueta, valor] of [['Cantidad', producto.cantidad], ['Mínimo', producto.minimo]]) {
      const celda = document.createElement('td');
      celda.className = 'numero';
      celda.setAttribute('data-etiqueta', etiqueta);
      celda.textContent = valor;
      fila.append(celda);
    }
    const estado = document.createElement('td');
    const marca = document.createElement('span');
    marca.className = bajo ? 'insignia bajo' : 'insignia';
    marca.textContent = bajo ? 'Bajo mínimo' : 'En orden';
    estado.append(marca);
    const acciones = document.createElement('td');
    const editar = document.createElement('button');
    editar.type = 'button';
    editar.className = 'editar';
    editar.textContent = 'Editar';
    editar.disabled = pendiente;
    editar.setAttribute('aria-label', `Editar ${producto.nombre}`);
    editar.addEventListener('click', () => comenzarEdicion(producto));
    acciones.append(editar);
    fila.append(estado, acciones);
    filas.append(fila);
  }
  buscar('productos').replaceChildren(filas);
  buscar('total').textContent = productos.length;
  buscar('bajos').textContent = productos.filter(p => p.cantidad < p.minimo).length;
  buscar('tabla-contenedor').hidden = productos.length === 0;
  buscar('estado-listado').hidden = productos.length > 0;
  buscar('estado-listado').textContent = 'Tu inventario empieza aquí. Agrega tu primer producto con el formulario.';
}

async function cargar() {
  if (!usuarioId) return;
  const version = versionSesion;
  const carga = ++versionCarga;
  buscar('actualizar').disabled = true;
  mostrarError('error-listado');
  try {
    const resultado = await listarProductos();
    if (version !== versionSesion || carga !== versionCarga) return;
    productos = resultado;
    dibujar();
  } catch (error) {
    if (version !== versionSesion || carga !== versionCarga) return;
    if (error.sesionExpirada) return caducarSesion();
    mostrarError('error-listado', error.message);
    buscar('estado-listado').hidden = true;
  } finally {
    if (version === versionSesion && carga === versionCarga) buscar('actualizar').disabled = pendiente;
  }
}

function limpiarFormulario() {
  editando = null;
  formulario.reset();
  buscar('modo-formulario').textContent = 'NUEVO PRODUCTO';
  buscar('titulo-formulario').textContent = 'Agrega a tu inventario';
  buscar('guardar').textContent = 'Agregar producto';
  buscar('cancelar').hidden = true;
  limpiarErroresFormulario();
}

function comenzarEdicion(producto) {
  limpiarFormulario();
  editando = producto.id;
  for (const campo of ['nombre', 'sku', 'cantidad', 'minimo']) buscar(campo).value = producto[campo];
  buscar('modo-formulario').textContent = 'EDITANDO PRODUCTO';
  buscar('titulo-formulario').textContent = 'Actualiza tu producto';
  buscar('guardar').textContent = 'Guardar cambios';
  buscar('cancelar').hidden = false;
  buscar('mensaje').textContent = '';
  buscar('nombre').focus();
}

formulario.addEventListener('submit', async evento => {
  evento.preventDefault();
  if (pendiente || !usuarioId) return;
  const version = versionSesion;
  ++versionCarga;
  pendiente = true;
  const eraEdicion = editando !== null;
  const datos = Object.fromEntries(new FormData(formulario));
  limpiarErroresFormulario();
  buscar('mensaje').textContent = '';
  formulario.querySelectorAll('input, button').forEach(campo => { campo.disabled = true; });
  buscar('actualizar').disabled = true;
  buscar('guardar').textContent = 'Guardando…';
  dibujar();
  try {
    const producto = eraEdicion ? await editarProducto(editando, datos) : await crearProducto(datos);
    if (version !== versionSesion) return;
    // Actualizar solo después de que la capa de datos confirme el guardado.
    productos = eraEdicion ? productos.map(p => p.id === producto.id ? producto : p) : [...productos, producto];
    limpiarFormulario();
    buscar('mensaje').textContent = eraEdicion ? 'Cambios guardados.' : 'Producto agregado.';
  } catch (error) {
    if (version !== versionSesion) return;
    if (error.sesionExpirada) return caducarSesion();
    const errores = Object.entries(error.errores ?? {});
    mostrarError('error-formulario', errores.length ? 'Corrige los campos marcados para guardar.' : error.message);
    for (const [campo, mensaje] of errores) {
      buscar(campo).setAttribute('aria-invalid', 'true');
      mostrarError(`error-${campo}`, mensaje);
    }
  } finally {
    if (version !== versionSesion) return;
    pendiente = false;
    formulario.querySelectorAll('input, button').forEach(campo => { campo.disabled = false; });
    buscar('actualizar').disabled = false;
    buscar('guardar').textContent = editando ? 'Guardar cambios' : 'Agregar producto';
    dibujar();
    const invalido = formulario.querySelector('[aria-invalid]');
    if (invalido) invalido.focus();
    else if (!buscar('error-formulario').hidden) buscar('error-formulario').scrollIntoView({ block: 'nearest' });
    else buscar('nombre').focus();
  }
});

buscar('cancelar').addEventListener('click', () => { limpiarFormulario(); buscar('nombre').focus(); });
buscar('actualizar').addEventListener('click', cargar);

function cambiarSesion(sesion) {
  const nuevoId = sesion?.user?.id ?? null;
  if (nuevoId === usuarioId) return;
  usuarioId = nuevoId;
  ++versionSesion;
  ++versionCarga;
  productos = [];
  pendiente = false;
  limpiarFormulario();
  formulario.querySelectorAll('input, button').forEach(campo => { campo.disabled = false; });
  buscar('actualizar').disabled = false;
  mostrarError('error-listado');
  buscar('mensaje').textContent = '';
  buscar('inventario').hidden = !nuevoId;
  buscar('acceso').hidden = Boolean(nuevoId);
  buscar('usuario').textContent = sesion?.user?.email ?? '';
  buscar('contrasena').value = '';
  dibujar();
  if (nuevoId) setTimeout(cargar, 0);
}

function caducarSesion() {
  cambiarSesion(null);
  mostrarError('error-acceso', 'Tu sesión expiró. Vuelve a iniciar sesión.');
}

let accesoPendiente = false;
buscar('formulario-acceso').addEventListener('submit', async evento => {
  evento.preventDefault();
  if (accesoPendiente || !cliente) return;
  const registrar = evento.submitter?.value === 'registrar';
  const email = buscar('correo').value.trim();
  const password = buscar('contrasena').value;
  mostrarError('error-acceso');
  buscar('mensaje').textContent = '';
  accesoPendiente = true;
  const controles = buscar('formulario-acceso').querySelectorAll('input, button');
  controles.forEach(control => { control.disabled = true; });
  try {
    const data = await autenticar(cliente, { email, password }, registrar);
    buscar('contrasena').value = '';
    if (data.session) cambiarSesion(data.session);
    else buscar('mensaje').textContent = 'Solicitud recibida. Si corresponde, revisa tu correo para confirmar la cuenta y luego inicia sesión.';
  } catch (error) {
    mostrarError('error-acceso', error.message);
  } finally {
    accesoPendiente = false;
    controles.forEach(control => { control.disabled = false; });
  }
});

buscar('cerrar-sesion').addEventListener('click', async () => {
  buscar('cerrar-sesion').disabled = true;
  mostrarError('error-acceso');
  try {
    const { error } = await cliente.auth.signOut({ scope: 'local' });
    if (error) throw error;
    cambiarSesion(null);
  } catch {
    mostrarError('error-acceso', 'No se pudo cerrar sesión. Inténtalo de nuevo.');
  } finally {
    buscar('cerrar-sesion').disabled = false;
  }
});

try {
  cliente = obtenerCliente();
  cliente.auth.onAuthStateChange((_evento, sesion) => cambiarSesion(sesion));
} catch (error) {
  mostrarError('error-acceso', error.message);
  buscar('formulario-acceso').querySelectorAll('input, button').forEach(control => { control.disabled = true; });
}
