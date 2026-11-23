# Revisión del día 05

Se arrancó la aplicación con `npm start` en http://localhost:3000 y se probó con playwright-cli en Chromium.

## Resultado funcional

- Inicio de sesión completado usando las credenciales de prueba de `.env`.
- Producto creado: **Prueba día 05 — stock bajo**, SKU **QA-D05-20261122**, cantidad **2**, mínimo **5**.
- La fila muestra **Bajo mínimo** y el resumen muestra **2 productos registrados / 1 bajo mínimo**.
- Se recargó la página y se confirmó que el producto permanece guardado con los mismos valores.
- El producto de prueba permanece en el inventario.

## Revisión visual

- **1280 × 800:** la tabla, el estado de stock bajo y el formulario se muestran sin desbordamiento horizontal del documento (1280 px).
- **390 × 844:** el estado aparece parcialmente recortado y la acción Editar queda fuera de la vista inicial de la tabla. La tabla mide 480 px y el documento alcanza 434 px para un viewport de 390 px. Se observó también un elemento `solo-lector` fuera del ancho visible. Hay desbordamiento horizontal que conviene revisar.
- Las capturas corresponden al área del inventario; la vista móvil requiere desplazamiento vertical para completar el formulario.

## Consola y autenticación

- Al abrir: **404** para `/favicon.ico`.
- En el primer intento de acceso: **400** en `/auth/v1/token?grant_type=password`, acompañado de “Correo o contraseña incorrectos”. La contraseña contiene un `#` sin comillas y `loadEnvFile` interpretó el resto como comentario. Al usar el valor completo de la línea, el acceso funcionó. No se modificó `.env`.
- Durante esa sesión se registraron **2 errores y 0 advertencias**, los dos descritos arriba; no se registraron errores adicionales al crear el producto.
- Después de recargar y confirmar la persistencia: **0 errores y 0 advertencias** en el registro de la página recargada.

## Capturas

- [Escritorio 1280 × 800](escritorio-1280x800.png)
- [Móvil 390 × 844](movil-390x844.png)
- [Móvil, fila con stock bajo 390 × 844](movil-stock-390x844.png)

Se aplicó una máscara al correo de la cuenta al capturar. No se hicieron correcciones de código, no se usó git, no se borraron datos ni se desplegó la aplicación.

## Corrección posterior de la vista móvil

- Hasta 580 px, cada producto se presenta como tarjeta con nombre, SKU, cantidad, mínimo, estado y botón Editar. En escritorio se conserva la tabla.
- Verificado en Chromium a 320, 390, 580, 581 y 1280 px: el ancho del documento coincide con el viewport y todas las celdas quedan dentro de pantalla, sin contenido recortado. Editar abre el producto correcto; se canceló la edición sin guardar.
- `npm test`: 18 pruebas aprobadas.
- [Móvil corregido 390 × 844](movil-corregido-390x844.png). Captura de viewport, desplazada al resumen y listado como la anterior.
- Esta verificación y captura usan **datos simulados en el navegador**, con los dos productos de la revisión anterior. El acceso remoto agotó el tiempo de conexión; no se verificó nuevamente el inventario remoto. La simulación no forma parte del código de producción.
- No se usó git, no se modificaron datos remotos ni se desplegó.
