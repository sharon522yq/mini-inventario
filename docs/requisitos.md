# Requisitos de Mini Inventario

## Alcance

Mini Inventario es una web de inventario personal. Cada usuario se registra e inicia sesión con correo y contraseña y solo puede consultar y gestionar sus propios productos.

Cada producto tiene nombre, SKU, cantidad y cantidad mínima. El SKU es obligatorio y único por usuario; se compara sin distinguir mayúsculas de minúsculas e ignorando espacios al inicio y al final. Cantidad y cantidad mínima son enteros iguales o mayores que cero.

Se permite registrar, consultar, editar y eliminar productos. La cantidad se actualiza editando el total del producto. Un producto está “Bajo mínimo” cuando su cantidad es menor que su cantidad mínima.

Quedan fuera del alcance los roles, reportes, categorías y la exportación.

## 1. Crear una cuenta e iniciar sesión

**Como persona usuaria, quiero registrarme e iniciar sesión con correo y contraseña para acceder a mi inventario.**

Criterios de aceptación:

- Con un correo válido no registrado y una contraseña de al menos 8 caracteres, puedo crear una cuenta.
- Con una contraseña de menos de 8 caracteres, no se crea la cuenta y se muestra que debe tener al menos 8 caracteres.
- Si el correo ya está registrado, no se crea una segunda cuenta.
- Con credenciales correctas, accedo a mi inventario; con credenciales incorrectas, se muestra un error y no se permite el acceso.
- Al cerrar sesión, necesito autenticarme nuevamente para consultar o modificar productos.

## 2. Registrar productos

**Como persona usuaria, quiero registrar productos para llevar el control de mis existencias.**

Criterios de aceptación:

- Cada producto requiere nombre, SKU, cantidad y cantidad mínima.
- Cantidad y cantidad mínima aceptan únicamente enteros iguales o mayores que cero.
- Si falta un campo obligatorio o una cantidad es inválida, se muestra un mensaje que nombra el campo con problema y no se guarda el producto.
- El SKU se compara sin distinguir mayúsculas de minúsculas e ignorando espacios al inicio y al final. Un SKU formado solo por espacios se considera vacío.
- No puedo registrar dos productos con el mismo SKU en mi inventario. Por ejemplo, si ya existe `abc-1`, registrar ` ABC-1 ` no guarda el producto y muestra un mensaje que nombra el campo SKU.
- Otro usuario puede utilizar ese mismo SKU en su propio inventario.
- Al guardar correctamente, el producto aparece en mi listado con los valores capturados.

## 3. Consultar mi inventario y detectar existencias bajas

**Como persona usuaria, quiero ver mis productos y cuáles están bajo el mínimo para identificar qué necesito reponer.**

Criterios de aceptación:

- El listado muestra nombre, SKU, cantidad y cantidad mínima de cada producto.
- Solo puedo consultar mis productos, incluso si intento acceder directamente a un producto de otro usuario.
- Un producto se marca como “Bajo mínimo” únicamente cuando su cantidad es menor que su cantidad mínima.
- Un producto con cantidad igual o superior al mínimo no se marca.
- Un producto con cantidad cero y mínimo cero no se marca.
- Si no tengo productos, se muestra un mensaje que lo indica.

## 4. Editar productos

**Como persona usuaria, quiero editar mis productos para corregir sus datos y actualizar las existencias.**

Criterios de aceptación:

- Puedo cambiar nombre, SKU, cantidad y cantidad mínima de mis productos.
- Todos los campos son obligatorios; cantidad y cantidad mínima aceptan únicamente enteros iguales o mayores que cero.
- El SKU se compara sin distinguir mayúsculas de minúsculas e ignorando espacios al inicio y al final. Un SKU formado solo por espacios se considera vacío.
- No puedo cambiar el SKU por uno que corresponda a otro de mis productos. Por ejemplo, si otro producto tiene `abc-1`, cambiarlo a ` ABC-1 ` se rechaza.
- Puedo guardar un producto conservando su SKU actual, incluso si solo cambio sus mayúsculas o los espacios al inicio o al final.
- Si falta un campo obligatorio, una cantidad es inválida o el SKU está duplicado, se muestra un mensaje que nombra el campo con problema, no se guardan los cambios y se mantienen los valores anteriores.
- Después de guardar, el listado y la marca “Bajo mínimo” reflejan los nuevos valores.
- No puedo editar productos de otro usuario.

## 5. Eliminar productos

**Como persona usuaria, quiero eliminar productos que ya no manejo para mantener actualizado mi inventario.**

Criterios de aceptación:

- Antes de eliminar, se solicita confirmación y se identifica el producto.
- Si cancelo, el producto permanece sin cambios.
- Si confirmo, el producto desaparece del inventario y deja de poder consultarse.
- Después de eliminarlo, puedo registrar otro producto con ese SKU.
- No puedo eliminar productos de otro usuario.
