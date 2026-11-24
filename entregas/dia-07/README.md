# Bitácora — Día 7: skill y subagente revisor

**Agente:** Codex (CLI), permisos "Ask for approval" · **Rama:** dia-07-skill

## Prompts clave

1. Pedido de prueba (idéntico en los dos intentos, cada uno en una conversación limpia):
   > Escribe una prueba de Playwright para editar un producto

2. Skill:
   > Crea una skill llamada pruebas-inventario en la ruta correcta para este agente. Debe indicar: usar Playwright en tests/, leer credenciales del entorno, usar un SKU único por prueba, borrar lo creado, seleccionar elementos por rol o etiqueta, y cubrir el caso correcto y un caso de error. La descripción debe activarse cuando se pidan pruebas de Mini Inventario. No uses git.

3. Subagente:
   > Crea un subagente llamado revisor-pr en el formato correcto para este agente, en .codex/agents/revisor-pr.toml dentro de este proyecto, con name, description y developer_instructions. Su trabajo es revisar git diff main en busca de secretos, cambios sin pruebas y consultas sin protección por usuario. Debe responder con una lista de hallazgos, archivo y gravedad. No debe modificar archivos ni ejecutar comandos que cambien el proyecto.

4. Ejecución del revisor:
   > Usa el subagente revisor-pr para revisar esta rama contra main y muéstrame sus hallazgos.

## Skill `pruebas-inventario`

Ruta: `.agents/skills/pruebas-inventario/SKILL.md`, con `name` y `description` en el encabezado (`skill-instalada.png`). Sus reglas son concretas para este proyecto:

- Pruebas en `tests/` reutilizando `ingresar()`, `agregar()` y la fixture `producto` de `tests/fixtures.js`.
- Credenciales desde `TEST_EMAIL`, `TEST_PASSWORD`, `SUPABASE_URL` y `SUPABASE_KEY`, sin imprimirlas.
- SKU único con prefijo `E2E-` y limpieza en `finally`, con aprobación explícita antes de borrar (regla de `AGENTS.md`).
- Selección por etiqueta (`Nombre`, `SKU`, `Cantidad`, `Cantidad mínima`) y por rol (`Agregar producto`, `Guardar cambios`, `Editar <nombre>`); prohíbe `#id`, `.clase` y `td.nth()`.
- Caso correcto y caso de error, con ejemplos del proyecto: SKU duplicado, campo vacío, cantidad negativa y contraseña incorrecta.
- Ejecutar las pruebas fuera del sandbox, porque necesitan red.

Ajusté la descripción para incluir las palabras de mi pedido ("escribir… una prueba de Playwright… editar… productos"), porque la original solo decía "pruebas de Mini Inventario" y mi pedido no menciona ese nombre.

## Comparación: sin skill vs. con skill

| Aspecto | Sin skill | Con skill |
|---|---|---|
| Dónde quedó la prueba | Dentro de `tests/inventario.spec.js`; además editó `tests/README.md` sin que se lo pidiera | Archivo propio `tests/editar-producto.spec.js`; no tocó el README |
| Selectores | Mezcla: etiquetas en el formulario, pero `#inventario`, `.insignia`, `strong`, `.sku` y `td.nth()` en la tabla | Solo rol y etiqueta: `getByRole('row')`, `getByRole('cell')`, `getByRole('alert')`, `getByLabel` |
| Caso de error | Ninguno | Cantidad negativa: comprueba el mensaje, `aria-invalid` y que el producto no cambie tras recargar |
| Credenciales, SKU único y limpieza | Sí, porque copió el estilo de `fixtures.js` | Sí, porque la skill lo indica explícitamente |
| Ejecución | Falló la primera vez dentro del sandbox sin red; tuvo que repetirla | Pidió correrla fuera del sandbox desde el primer intento: `2 passed` (`con-skill-2-passed.png`) |
| Aprobación para borrar | La pidió | La pidió citando la skill y `AGENTS.md` |
| Intentó crear su propia rama | Sí (`test/editar-producto-playwright`) | Sí (`test/editar-producto`) |
| Correcciones que pedí | 1 (no usar git) | 1 (no usar git) |

**Qué mejoró:** archivo separado, selectores accesibles en toda la prueba, un caso de error y ejecución correcta a la primera.

**Qué sigue mal:** en los dos intentos Codex quiso crear una rama propia. La skill solo habla de pruebas, no de git, así que no lo evitó.

**Cuánto corregí:** lo mismo en ambos (rechazar la rama). Con skill no tuve que pedir el caso de error ni corregir selectores; sin skill habría tenido que pedir las dos cosas.

El código del primer intento está en `prueba-sin-skill.md`. Lo descarté con `git restore` después de guardarlo.

## Subagente `revisor-pr`

Ruta: `.codex/agents/revisor-pr.toml`, con `name`, `description` y `developer_instructions`. Revisa tres áreas (secretos, cambios sin pruebas y consultas sin protección por usuario) y responde con gravedad, archivo y hallazgo.

Es de solo lectura por sus instrucciones: prohíbe crear, editar, borrar o formatear archivos, cambiar el índice, ramas o historial, instalar, migrar o desplegar, y solo permite `git diff`, `rg` y leer archivos. Codex consultó la documentación y explicó que en Codex el subagente hereda el sandbox del agente principal, por lo que el TOML no puede imponer uno propio; por eso la restricción va en las instrucciones.

## Ejecución y hallazgo

- Hice commit antes de ejecutarlo para partir de un árbol limpio (`git-status-antes.png`).
- Codex lo lanzó con `agent_type: "revisor-pr"` (`subagente-revision_pr.png`, `tipo-subagente.png`).
- Después de la ejecución, `git status` solo mostró mis capturas nuevas; el revisor no modificó ningún archivo (`git-status-despues.png`).

**Hallazgo (gravedad baja), `tests/editar-producto.spec.js`:** las aserciones buscaban una celda con "2" y otra con "5" en la fila, pero no comprobaban qué columna tenía cada valor. Si un error intercambiara Cantidad y Mínimo, la prueba seguiría pasando (`hallazgos.png`).

**Cómo lo atendí:** pedí que, después de guardar y de recargar, la prueba vuelva a abrir la edición y compruebe por etiqueta que `Cantidad` y `Cantidad mínima` tengan cada una su valor, y luego cancele la edición. Lo mismo en la prueba de cantidad negativa (7 y 3). El archivo pasó de nuevo: `2 passed` (`correccion-2-passed.png`).

## Errores o malas decisiones de la IA

- En los dos intentos de prueba quiso crear su propia rama; lo rechacé.
- Primero intentó guardar la skill en mi carpeta personal (`C:\Users\sharo\.codex\skills`), fuera del proyecto. Lo rechacé porque así no quedaría en el repositorio.
- En la primera ejecución del revisor respondió "sin hallazgos" aunque el registro decía "No agents completed yet". Pedí repetirla y ver la respuesta completa; ahí apareció el hallazgo.

## Comandos aprobados o rechazados

- **Rechacé** `git switch -c test/editar-producto-playwright` y `git switch -c test/editar-producto`.
- **Rechacé** crear la skill en `C:\Users\sharo\.codex\skills`.
- **Aprobé** `npx playwright test` fuera del sandbox, con borrado limitado a los productos que crea cada prueba.
- **Aprobé** solo comandos de lectura durante la ejecución del revisor.

## Cómo comprobé que funciona

- `/skills` muestra `pruebas-inventario` y Codex la citó por su ruta al escribir la prueba.
- `tests/editar-producto.spec.js`: `2 passed`, antes y después de atender el hallazgo.
- `git status` antes y después del revisor: sin cambios causados por él.

![Skill instalada](skill-instalada.png)
![Con skill: 2 passed](con-skill-2-passed.png)
![git status antes](git-status-antes.png)
![Subagente en ejecución](subagente-revision_pr.png)
![Tipo de subagente](tipo-subagente.png)
![Hallazgos](hallazgos.png)
![git status después](git-status-despues.png)
![Corrección: 2 passed](correccion-2-passed.png)
