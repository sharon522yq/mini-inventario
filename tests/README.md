# Pruebas de navegador

Ejecutar desde la raíz con `npx playwright test`. Se usa únicamente Chromium;
Playwright arranca `npm start` en el puerto 3000 y detiene el servidor al terminar.
El puerto debe estar libre antes de ejecutar la suite.

`playwright.config.js` carga `.env` con `process.loadEnvFile`. También admite
variables ya definidas en el entorno. Se requieren `TEST_EMAIL`, `TEST_PASSWORD`,
`SUPABASE_URL` y `SUPABASE_KEY` (publishable o anon). La contraseña en `.env`
debe ir entre comillas para conservar `#`. No imprimir ni adjuntar estos valores.

Las cuatro pruebas usan la cuenta y el servicio reales, sin simulaciones. Cada
prueba reserva un SKU con UUID. Las de autenticación no crean productos; las
de alta y stock bajo usan el formulario y comprueban la fila correspondiente.

La fixture marca el intento de creación antes de enviar el formulario y ejecuta
su limpieza en `finally`, también si falla una aserción. Usa un cliente separado
de la página, con los permisos de la cuenta de prueba y filtros por usuario y SKU
exactos. Comprueba que no queden filas con ese SKU y reporta error si no puede
confirmar la limpieza. No borra productos anteriores ni los de otras pruebas.
Si el servicio deja de responder durante la limpieza, será necesario repetirla
cuando vuelva a estar disponible: ninguna prueba puede garantizar un borrado
remoto durante una caída del servicio.

Las trazas, capturas y vídeos automáticos están desactivados para proteger las
credenciales. Los artefactos locales de Playwright están excluidos del repositorio.
