# Mini Inventario

Primera versión de la web de inventario: lista, agrega y edita productos con nombre, SKU, cantidad y cantidad mínima. Marca **Bajo mínimo** solo cuando la cantidad es menor que el mínimo.

## Arranque local

Requiere Node.js 22 y npm. Python 3.12 forma parte del entorno del proyecto, pero esta aplicación no lo utiliza. Express es la única dependencia directa.

```powershell
npm install
npm start
```

Abre http://localhost:3000. Para elegir otro puerto en PowerShell:

```powershell
$env:PORT = '4000'
npm start
```

`GET /health` responde `200` con `{"status":"ok"}`. Express sirve exclusivamente `public/`.

## Uso y almacenamiento

Completa los cuatro campos y pulsa **Agregar producto**. Usa **Editar** para modificar un producto y **Guardar cambios** para confirmar. **Cancelar edición** descarta únicamente los cambios del formulario. **Actualizar** vuelve a consultar el inventario.

Nombre y SKU son obligatorios y se guardan sin espacios exteriores. El SKU es único sin distinguir mayúsculas ni espacios exteriores; las cantidades son enteros no negativos. Los errores nombran el campo y conservan los valores del formulario. Los fallos de almacenamiento no se presentan como guardados.

Esta entrega usa localStorage: los productos persisten al recargar en el mismo navegador, origen y dispositivo. No hay cuentas, sincronización entre dispositivos ni eliminación. Cambiar de puerto cambia el origen y, por tanto, el inventario visible. No se cargan productos de ejemplo ni se borra información existente.

## Organización

- `server.js`: Express, archivos estáticos y salud.
- `public/index.html`, `public/styles.css`: interfaz en español y diseño adaptable.
- `public/app.js`: formulario y listado; inserta nombre y SKU como texto.
- `public/productos.js`: todo el acceso a datos y validación, con funciones asíncronas `listarProductos()`, `crearProducto(datos)` y `editarProducto(id, datos)`. Los productos tienen `id`, `nombre`, `sku`, `cantidad` y `minimo`. La futura integración con Supabase reemplazará esta capa; las restricciones y permisos deberán aplicarse también en la base de datos.

El alcance de esta entrega ajusta temporalmente [requisitos](docs/requisitos.md) y [diseño](docs/diseno.md): autenticación, datos privados por usuario, Supabase y eliminación quedan pendientes.

## Verificación

```powershell
npm test
```

Usa el ejecutor integrado de Node, sin dependencias adicionales. Comprueba persistencia, validaciones, unicidad en alta y edición, errores de almacenamiento, límites de existencias, `/health` y que los archivos del repositorio no se sirvan al navegador.
