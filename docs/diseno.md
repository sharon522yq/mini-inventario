# Diseño técnico de Mini Inventario

## Alcance y decisiones

Este documento propone cómo implementar las cinco historias de [requisitos.md](requisitos.md). Incluye registro e inicio de sesión, inventario privado por usuario, alta, consulta, edición y eliminación de productos, y detección de existencias bajo el mínimo. Roles, reportes, categorías y exportación quedan fuera del alcance.

Tecnologías: Node.js 22 con Express para servir la página; HTML, CSS y JavaScript sin framework para la interfaz; Supabase Auth para correo y contraseña; PostgreSQL de Supabase para los productos. Python no es necesario para esta aplicación.

El documento describe una propuesta: no configura servicios, crea tablas ni despliega la aplicación.

## Arquitectura

El navegador obtiene HTML, CSS y JavaScript desde Express. El JavaScript usa el cliente oficial de Supabase para autenticarse y consultar la API de datos mediante HTTPS. Express no recibe contraseñas ni actúa como intermediario de las operaciones de productos.

Express sirve únicamente un directorio público dedicado mediante su mecanismo de archivos estáticos. La raíz del repositorio, documentos, archivos de configuración y archivos de entorno no se publican. Véase [archivos estáticos de Express](https://expressjs.com/starter/static-files/).

La página puede descargarse sin iniciar sesión. Sus datos están protegidos en Supabase: ocultar formularios en el navegador es una decisión de interfaz, no una medida suficiente de autorización.

## Interfaz y organización prevista

- Acceso: formularios de registro e inicio de sesión con correo y contraseña.
- Inventario: listado con nombre, SKU, cantidad, mínimo y marca “Bajo mínimo”; mensaje cuando no existen productos; botón para cerrar sesión.
- Formulario de producto: creación y edición de los cuatro campos de negocio.
- Eliminación: confirmación que identifica el producto antes de enviar la solicitud.

El JavaScript se separará por responsabilidades: conexión a Supabase, sesión, operaciones de productos, validación de formularios y actualización de la interfaz. El cliente oficial se distribuirá como dependencia con versión fijada; esto no requiere un framework de interfaz.

Los nombres y SKU se insertan en la página como texto, sin interpretar HTML. Mientras una operación está pendiente se evita el envío repetido. Solo una respuesta exitosa actualiza el listado; un fallo conserva el formulario y muestra un mensaje.

## Inicio de sesión y sesión

Supabase Auth administra cuentas, contraseñas y sesiones. La aplicación no crea una tabla propia de contraseñas ni las registra en logs. Se configura en Supabase una longitud mínima de contraseña de 8 caracteres; se aplica también en el formulario. Véase [seguridad de contraseñas](https://supabase.com/docs/guides/auth/password-security).

Se deshabilita la confirmación de correo en Supabase Auth: después de registrarse, la persona puede iniciar sesión de inmediato. El registro duplicado nunca crea otra cuenta; el mensaje puede ser genérico para evitar revelar si una dirección está registrada. Véanse [registro](https://supabase.com/docs/reference/javascript/auth-signup) y [autenticación con contraseña](https://supabase.com/docs/guides/auth/passwords).

El cliente de Supabase mantiene y renueva la sesión. Al cargar la página se comprueba su estado y se escucha cualquier cambio. Sin sesión se muestra el acceso; al expirar o cerrarse, se limpia el inventario visible y se vuelve al acceso. Las solicitudes incluyen el token del usuario, cuya validez comprueba Supabase.

Para esta propuesta, la sesión persiste en el navegador mediante el cliente de Supabase. Esto exige evitar scripts no confiables y renderizar los datos como texto. No se guardan contraseñas en el navegador.

## Tabla productos

Ubicación: esquema `public`, tabla `productos`.

| Campo | Tipo propuesto | Obligatorio y valor inicial | Regla |
| --- | --- | --- | --- |
| id | UUID | Sí; generado por la base | Clave primaria. No editable por el cliente. |
| user_id | UUID | Sí; identidad de la sesión como valor predeterminado | Referencia a `auth.users.id`. Propietario del producto. |
| nombre | text | Sí; sin valor predeterminado | No puede estar vacío ni contener solo espacios. |
| sku | text | Sí; sin valor predeterminado | No puede estar vacío ni contener solo espacios. Único por usuario según la comparación normalizada. |
| cantidad | integer | Sí; sin valor predeterminado | CHECK (cantidad >= 0). |
| minimo | integer | Sí; sin valor predeterminado | CHECK (minimo >= 0). |
| created_at | timestamptz | Sí; hora de la base al crear | Fecha y hora de creación. No editable por el cliente. |

Todos los campos llevan restricción de no nulos. Las restricciones de contenido y cantidades se aplican tanto a altas como a modificaciones. La referencia de usuario impide productos huérfanos; no se propone borrado en cascada de cuentas. Eliminar cuentas queda fuera del alcance.

### SKU y unicidad

Se define una sola regla de normalización: quitar espacios en los extremos y convertir a minúsculas para comparar. Se conserva el uso de mayúsculas elegido para mostrar el SKU; al guardar se quitan los espacios exteriores. Los espacios interiores no se eliminan.

Un índice único compuesto por `user_id` y la expresión de SKU normalizado garantiza la regla incluso ante dos solicitudes simultáneas. `abc-1` y ` ABC-1 ` colisionan para el mismo usuario, pero no para usuarios diferentes. La normalización en base y navegador debe cubrir los mismos espacios exteriores y verificar estos ejemplos. PostgreSQL permite imponer unicidad con un [índice sobre expresiones](https://www.postgresql.org/docs/18/indexes-expressional.html).

La edición del mismo producto puede mantener su SKU normalizado. No hace falta consultar primero para garantizar unicidad: la base es la autoridad. Si se hace una comprobación previa para ayudar al usuario, igualmente se maneja el conflicto al guardar.

## Autorización y permisos de datos

Se habilita Row Level Security (RLS) en `productos`. Se conceden los permisos de tabla y columna necesarios al rol `authenticated`; el rol `anon` no recibe acceso a productos. Las políticas se aplican a usuarios autenticados y comparan `user_id` con `auth.uid()`:

| Operación | Condición de la política |
| --- | --- |
| Consultar | La fila pertenece al usuario de la sesión. |
| Crear | El propietario de la nueva fila es el usuario de la sesión. |
| Editar | Tanto la fila existente como la resultante pertenecen al usuario de la sesión. |
| Eliminar | La fila existente pertenece al usuario de la sesión. |

El cliente solo puede insertar o editar nombre, SKU, cantidad y mínimo. Los permisos por columna reservan la generación de id, propietario y fecha a la base. Esto evita transferir productos o alterar sus metadatos. Las políticas no sustituyen los permisos de tabla ni las restricciones. Véase [RLS de Supabase](https://supabase.com/docs/guides/database/postgres/row-level-security).

## Qué valida cada capa

| Capa | Validaciones y responsabilidad |
| --- | --- |
| HTML y JavaScript | Campos obligatorios; correo con formato válido; contraseña de al menos 8 caracteres al registrar; nombre y SKU no vacíos tras quitar espacios; cantidades enteras no negativas; confirmación de eliminación; mensajes que nombran el campo con problema. Estas comprobaciones ayudan al usuario y pueden ser eludidas. |
| Express | Sirve únicamente recursos públicos y configuración pública permitida; controla rutas y responde a errores de entrega. En esta arquitectura no valida productos ni autentica las solicitudes de datos porque estas van directamente a Supabase. |
| Supabase Auth y API | Auth valida las credenciales, la política de contraseña y la sesión. La API comprueba el token antes de ejecutar las operaciones con la identidad y el rol correspondientes. |
| PostgreSQL | Impone tipos, no nulos, contenido obligatorio, enteros no negativos, referencias, unicidad del SKU normalizado, permisos y políticas RLS. Mantiene estas reglas aunque se omita la interfaz o se construya una petición manual. |

No se confía en el `user_id` enviado por el navegador ni en una consulta filtrada desde JavaScript como única protección de datos.

## Flujos de productos y errores

1. **Consultar:** después de iniciar sesión se obtienen los productos autorizados, ordenados por creación e id para un orden estable. La ausencia de filas muestra el estado vacío.
2. **Crear:** validar el formulario, enviar los cuatro campos de negocio y esperar confirmación de la base. Si hay conflicto de unicidad, mostrar “SKU: ya existe un producto con ese SKU”.
3. **Editar:** identificar el producto por id y enviar los campos editables. Aplicar las mismas validaciones y traducir las restricciones a mensajes de campo. Si falla la operación, la fila anterior permanece sin cambios.
4. **Eliminar:** pedir confirmación con nombre y SKU; cancelar no envía solicitudes. Confirmar elimina únicamente el id seleccionado. No indicar éxito si no se eliminó una fila autorizada.
5. **Evaluar existencias:** después de consultar o guardar, marcar “Bajo mínimo” cuando `cantidad < minimo`. No almacenar un indicador adicional que pueda quedar desactualizado. Igualdad y cero frente a cero no se marcan.

Las modificaciones solicitarán el resultado de la operación para distinguir éxito de una fila inexistente o no accesible. Para ambas situaciones se muestra el mismo mensaje sin revelar productos ajenos. Los errores de sesión llevan al acceso; los fallos de red permiten reintentar. Los mensajes no muestran SQL, tokens ni detalles internos.

Se traducen los errores conocidos de restricciones a los nombres visibles de los campos: nombre, SKU, cantidad o cantidad mínima. Los fallos de red y servicio usan un mensaje general porque no pertenecen a un campo. Una operación fallida no se presenta como guardada.

## Configuración y límites

La URL del proyecto y la clave publicable de Supabase pueden llegar al navegador: identifican el proyecto y no sustituyen la autorización. No se usa una clave secreta ni `service_role` en la página; tampoco son necesarias para Express en este diseño. Los secretos y archivos `.env` no se suben al repositorio.

Las restricciones, permisos e índices se describirán mediante migraciones versionadas cuando se autorice la implementación. Los cambios de configuración de Auth deben documentarse junto con ellas. Servir la aplicación por HTTPS será un requisito del entorno publicado. Este diseño no autoriza un despliegue ni borrado de datos.

Las ediciones concurrentes de un mismo producto usarán inicialmente la última escritura confirmada. No se incluyen movimientos de almacén ni resolución de conflictos; la cantidad representa el total actual.

## Verificación prevista para la implementación

- Crear cuentas con contraseñas de 7 y 8 caracteres y comprobar rechazo y aceptación según corresponda, incluyendo el mensaje del mínimo.
- Comprobar inicio de sesión inmediato después del registro, registro duplicado, credenciales incorrectas, cierre de sesión y sesión expirada.
- Usar dos usuarios y una sesión anónima para probar consulta, creación, edición y eliminación mediante peticiones directas, incluyendo ids ajenos e intentos de cambiar el propietario.
- Intentar enviar campos vacíos, solo espacios, nulos y cantidades negativas; comprobar que no se guardan y que los mensajes de formulario nombran el campo.
- Probar `abc-1` y ` ABC-1 ` en altas y ediciones del mismo usuario, en usuarios distintos y con solicitudes simultáneas. Verificar también edición del SKU propio y reutilización después de eliminar.
- Comprobar cantidades menor, igual y mayor al mínimo, incluido cero frente a cero, después de crear y editar.
- Cancelar una eliminación, confirmar otra y simular un fallo de red sin mostrar un éxito falso.

Estas son comprobaciones propuestas; en esta fase solo se guarda el diseño y no se ejecutan pruebas de una aplicación todavía no implementada.
