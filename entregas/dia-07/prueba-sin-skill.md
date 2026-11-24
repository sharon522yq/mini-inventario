# Intento 1: prueba de edición SIN skill

**Pedido (conversación limpia):**

> Escribe una prueba de Playwright para editar un producto

**Archivos que modificó Codex:** agregó la prueba dentro de `tests/inventario.spec.js` (+46 líneas) y editó `tests/README.md`. Ambos cambios se descartaron después de guardar este registro.

**Resultado:** la primera ejecución falló porque Codex la corrió dentro de su sandbox sin red (no pudo iniciar sesión). Al repetirla fuera del sandbox: `1 passed (6.7s)`.

## Código generado

```js
test('edita un producto y conserva los cambios al recargar', async ({ page, producto }) => {
  await ingresar(page);
  await expect(page.locator('#inventario')).toBeVisible();
  const fila = await agregar(page, producto, 7, 3);
  await expect(fila.locator('.insignia')).toHaveText('En orden');

  await fila.getByRole('button', { name: `Editar ${producto.nombre}`, exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Actualiza tu producto', exact: true })).toBeVisible();
  await expect(page.getByLabel('Nombre', { exact: true })).toHaveValue(producto.nombre);
  await expect(page.getByLabel('SKU', { exact: true })).toHaveValue(producto.sku);
  await expect(page.getByLabel('Cantidad', { exact: true })).toHaveValue('7');
  await expect(page.getByLabel('Cantidad mínima', { exact: true })).toHaveValue('3');

  const nombreEditado = `${producto.nombre} editado`;
  await page.getByLabel('Nombre', { exact: true }).fill(nombreEditado);
  // Conservar el SKU permite que la fixture limpie el producto incluso si falla la prueba.
  await page.getByLabel('Cantidad', { exact: true }).fill('2');
  await page.getByLabel('Cantidad mínima', { exact: true }).fill('5');
  const [respuesta] = await Promise.all([
    page.waitForResponse(response =>
      new URL(response.url()).pathname === '/rest/v1/productos' && response.request().method() === 'PATCH'),
    page.getByRole('button', { name: 'Guardar cambios', exact: true }).click(),
  ]);
  await respuesta.finished();
  if (!respuesta.ok()) throw new Error('El servicio rechazó la edición del producto E2E.');

  await expect(page.getByRole('status')).toHaveText('Cambios guardados.');
  await expect(fila).toHaveCount(1);
  await expect(fila.locator('strong')).toHaveText(nombreEditado);
  await expect(fila.locator('.sku')).toHaveText(producto.sku);
  await expect(fila.locator('td').nth(1)).toHaveText('2');
  await expect(fila.locator('td').nth(2)).toHaveText('5');
  await expect(fila.locator('.insignia')).toHaveText('Bajo mínimo');
  await expect(page.getByRole('button', { name: 'Agregar producto', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Cancelar edición', exact: true })).toBeHidden();

  await page.reload();
  await expect(fila).toHaveCount(1);
  await expect(fila.locator('strong')).toHaveText(nombreEditado);
  await expect(fila.locator('.sku')).toHaveText(producto.sku);
  await expect(fila.locator('td').nth(1)).toHaveText('2');
  await expect(fila.locator('td').nth(2)).toHaveText('5');
  await expect(fila.locator('.insignia')).toHaveText('Bajo mínimo');
  await expect(fila.getByRole('button', { name: `Editar ${nombreEditado}`, exact: true })).toBeVisible();
});

```
