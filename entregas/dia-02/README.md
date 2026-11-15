# Bitácora — Día 2: planeación, requisitos y diseño

**Agente utilizado:** Codex (CLI) · **Rama:** dia-02-planeacion

**Documentos:** [docs/requisitos.md](../../docs/requisitos.md) · [docs/diseno.md](../../docs/diseno.md)

**Issues:** #3, #4, #5, #6 y #7

## Prompts clave

1. Historias de usuario:
   > Vamos a planear Mini Inventario, una web donde una persona inicia sesión, registra productos con nombre, SKU, cantidad y cantidad mínima, y ve cuáles están por debajo del mínimo. No escribas código. Hazme preguntas sobre lo que no esté claro y luego propone 5 historias de usuario, cada una con criterios de aceptación que se puedan comprobar.

2. Diseño técnico:
   > Propón el diseño técnico de Mini Inventario y guárdalo en docs/diseno.md. Usa Node.js con Express para servir la página, HTML y JavaScript sin framework, y Supabase para base de datos e inicio de sesión. Define la tabla productos con id, user_id, nombre, sku, cantidad, minimo y created_at. Explica qué valida cada capa.

3. Issues:
   > Crea un issue en GitHub por cada historia de docs/requisitos.md usando gh. Pon los criterios de aceptación como lista de tareas. Muéstrame cada comando antes de ejecutarlo.

## Correcciones que hice al agente (criterio propio)

1. **Contraseña válida.** Codex dejó "contraseña válida" sin definir, así que el criterio no se podía comprobar. La fijé en mínimo 8 caracteres y agregué el caso de rechazo.
2. **SKU único.** No decía si `abc-1` y ` ABC-1 ` eran el mismo SKU. Definí que se compara sin distinguir mayúsculas y sin espacios en los extremos, para evitar duplicados.
3. **Mensajes de error.** Cambié "se indica el error" por "se muestra un mensaje que nombra el campo con problema", porque el original era vago.
4. **Tipo de cantidad y mínimo.** El diseño proponía `numeric` con restricciones contra fracciones, NaN e infinitos. Lo cambié a `integer` con `CHECK (>= 0)`, que es más simple y suficiente.
5. **Confirmación de correo.** El diseño la agregaba aunque no estaba en los requisitos. La quité porque sumaba pantallas y configuración fuera del alcance.

## Error o mala decisión de la IA

El diseño técnico agregó piezas que nadie pidió: confirmación de correo y cantidades en `numeric`. El propio documento admitía que la confirmación "no estaba definida en los requisitos".

**Cómo lo detecté:** comparé `docs/diseno.md` contra las 5 historias de `docs/requisitos.md` y marqué lo que no correspondía a ninguna.

## Comandos que aprobé o rechacé

- **Aprobé** el permiso "Ask for approval" y **rechacé** "Full Access", porque Codex solo necesitaba escribir archivos dentro del proyecto.
- **Aprobé** uno por uno los cinco `gh issue create`. Por ejemplo:
  `gh issue create --repo sharon522yq/mini-inventario --title "Crear una cuenta e iniciar sesión" --body-file ...\historia-1.md`
  Este comando crea un issue en mi repositorio con ese título y toma el contenido del archivo indicado. Antes de aprobarlo abrí el archivo con `cat`, porque el comando no muestra el texto del issue.
- **Rechacé** la opción "don't ask again for commands that start with gh issue create", para poder leer cada comando.
- Hice yo misma el commit y el push, porque el día 1 el sandbox de Codex dejó la carpeta `.git` con otro usuario.

## Cómo comprobé que funciona

- Leí `docs/requisitos.md` y `docs/diseno.md` con `cat` después de cada cambio.
- Revisé que las 5 historias tengan criterios comprobables y que el diseño defina la tabla, la tecnología y las validaciones por capa.
- Codex reportó los 5 issues creados (#3 a #7) y los abrí en GitHub para confirmar que los criterios aparecen como casillas.
- Ejecuté `gh issue list` y mostró "5 of 5 open issues": del #3 al #7, uno por historia.