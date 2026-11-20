# Mini Inventario

Web de inventario privado por usuario con registro e inicio de sesión por correo y contraseña, listado, alta y edición de productos. Marca **Bajo mínimo** cuando `cantidad < minimo`.

## Arranque local

Requiere Node.js 22 y npm. Python 3.12 forma parte del entorno, pero esta aplicación no lo utiliza.

```powershell
npm ci
Copy-Item .env.example .env
```

Completa `.env` con `SUPABASE_URL` (URL de tu proyecto) y `SUPABASE_KEY` (clave **publishable** o la antigua **anon**). No uses una clave `service_role` ni `sb_secret_`. No subas `.env` al repositorio. `.env.example` contiene solamente los nombres de las variables sin valores.

```powershell
npm start
```

Abre http://localhost:3000. Node carga `.env` desde la raíz del proyecto al arrancar; reinicia después de modificarlo. Para elegir otro puerto, establece `$env:PORT = '4000'` antes de ejecutar `npm start`.

`GET /config.js` entrega exclusivamente la URL y la clave pública como `window.SUPABASE_CONFIG`, con `Cache-Control: no-store`. Rechaza claves secretas, JWT con un rol distinto de `anon` y configuración ausente o inválida con HTTP 503. Estas claves públicas identifican el proyecto: las políticas RLS de la base autorizan el acceso a las filas. Express sirve `public/`, este endpoint y el archivo de navegador del cliente oficial instalado; los demás archivos del repositorio siguen siendo privados. `GET /health` responde con `{"status":"ok"}`.

## Supabase y uso

La base debe tener la migración `supabase/migrations/20261120143556_crear_productos_con_rls.sql`, ya aplicada al proyecto de Mini Inventario. No vuelvas a aplicarla en ese proyecto. La tabla incluye restricciones, SKU normalizado único por usuario y políticas RLS para lectura, creación, edición y eliminación propias.

Activa el proveedor de correo y contraseña en Supabase Auth. El diseño prevé un mínimo de contraseña de 8 caracteres y confirmación de correo deshabilitada; estos ajustes se administran en Supabase, no desde la aplicación. La interfaz exige 8 caracteres al registrarse y también admite proyectos con confirmación habilitada, indicando que se revise el correo cuando el registro no devuelve sesión. Configura Site URL y las URL de redirección en Auth si usas confirmación. Referencia: [autenticación con contraseña](https://supabase.com/docs/guides/auth/passwords).

Crea una cuenta o inicia sesión para consultar tu inventario. Completa nombre, SKU, cantidad y mínimo para agregar productos. Usa **Editar**, **Guardar cambios**, **Cancelar edición** y **Actualizar**. **Cerrar sesión** termina la sesión de este navegador. La interfaz se limpia al cerrar sesión o cambiar de cuenta y descarta respuestas de la sesión anterior.

Supabase conserva y renueva la sesión en el navegador mediante su cliente oficial. Las contraseñas se envían directamente a Supabase Auth. Los productos se leen y escriben en Supabase; el inventario antiguo de localStorage no se importa ni se borra. Las altas y ediciones envían solamente `nombre`, `sku`, `cantidad` y `minimo`; la base genera `id`, `user_id` y `created_at`. Los errores conservan el formulario, y una edición sin fila accesible no se presenta como exitosa. La interfaz de eliminación sigue pendiente.

## Organización y verificación

- `server.js`: carga `.env`, valida configuración pública y sirve recursos.
- `public/supabase.js`: instancia compartida del cliente oficial.
- `public/auth.js`: registro, acceso y mensajes de autenticación.
- `public/productos.js`: validación y operaciones de productos en Supabase.
- `public/app.js`: sesión, formulario y listado; renderiza datos como texto.

El cliente `@supabase/supabase-js` está fijado en `package.json` y `package-lock.json`, y se sirve localmente sin CDN.

```powershell
npm test
```

Las pruebas comprueban las peticiones mediante el cliente oficial con transporte simulado: campos enviados, identidad, orden, validaciones, conflictos y sesión ausente. También prueban autenticación, rechazo de claves privilegiadas, recursos públicos y protección de archivos privados. No crean cuentas reales ni modifican la base remota.
