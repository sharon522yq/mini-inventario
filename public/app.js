import { listarProductos, crearProducto, editarProducto } from './productos.js';

const buscar = id => document.getElementById(id);
const formulario = buscar('formulario');
let productos = [];
let editando = null;
let pendiente = false;

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
    for (const valor of [producto.cantidad, producto.minimo]) {
      const celda = document.createElement('td');
      celda.className = 'numero';
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
  buscar('actualizar').disabled = true;
  mostrarError('error-listado');
  try {
    productos = await listarProductos();
    dibujar();
  } catch (error) {
    mostrarError('error-listado', error.message);
    buscar('estado-listado').hidden = true;
  } finally {
    buscar('actualizar').disabled = false;
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
  if (pendiente) return;
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
    // Actualizar solo después de que la capa de datos confirme el guardado.
    productos = eraEdicion ? productos.map(p => p.id === producto.id ? producto : p) : [...productos, producto];
    limpiarFormulario();
    buscar('mensaje').textContent = eraEdicion ? 'Cambios guardados.' : 'Producto agregado.';
  } catch (error) {
    const errores = Object.entries(error.errores ?? {});
    mostrarError('error-formulario', errores.length ? 'Corrige los campos marcados para guardar.' : error.message);
    for (const [campo, mensaje] of errores) {
      buscar(campo).setAttribute('aria-invalid', 'true');
      mostrarError(`error-${campo}`, mensaje);
    }
  } finally {
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
window.addEventListener('storage', () => { if (!pendiente) cargar(); });
cargar();
