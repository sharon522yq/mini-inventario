import { test, expect, ingresar, agregar } from './fixtures.js';

test('edita un producto y conserva los cambios al recargar', async ({ page, producto }) => {
  await ingresar(page);
  await agregar(page, producto, 7, 3);
  const fila = page.getByRole('row').filter({
    has: page.getByText(producto.sku, { exact: true }),
  });
  await expect(fila).toHaveCount(1);
  await fila.getByRole('button', { name: `Editar ${producto.nombre}`, exact: true }).click();

  await expect(page.getByLabel('Nombre', { exact: true })).toHaveValue(producto.nombre);
  await expect(page.getByLabel('SKU', { exact: true })).toHaveValue(producto.sku);
  await expect(page.getByLabel('Cantidad', { exact: true })).toHaveValue('7');
  await expect(page.getByLabel('Cantidad mínima', { exact: true })).toHaveValue('3');

  const nombreEditado = `${producto.nombre} editado`;
  await page.getByLabel('Nombre', { exact: true }).fill(nombreEditado);
  await page.getByLabel('Cantidad', { exact: true }).fill('2');
  await page.getByLabel('Cantidad mínima', { exact: true }).fill('5');
  await page.getByRole('button', { name: 'Guardar cambios', exact: true }).click();

  await expect(page.getByRole('status')).toHaveText('Cambios guardados.');
  await expect(fila.getByRole('cell', { name: `${nombreEditado} ${producto.sku}`, exact: true })).toBeVisible();
  await expect(fila.getByRole('cell', { name: '2', exact: true })).toBeVisible();
  await expect(fila.getByRole('cell', { name: '5', exact: true })).toBeVisible();
  await expect(fila.getByRole('cell', { name: 'Bajo mínimo', exact: true })).toBeVisible();

  await fila.getByRole('button', { name: `Editar ${nombreEditado}`, exact: true }).click();
  await expect(page.getByLabel('Cantidad', { exact: true })).toHaveValue('2');
  await expect(page.getByLabel('Cantidad mínima', { exact: true })).toHaveValue('5');
  await page.getByRole('button', { name: 'Cancelar edición', exact: true }).click();

  await page.reload();
  await expect(fila).toHaveCount(1);
  await expect(fila.getByRole('cell', { name: `${nombreEditado} ${producto.sku}`, exact: true })).toBeVisible();
  await expect(fila.getByRole('cell', { name: '2', exact: true })).toBeVisible();
  await expect(fila.getByRole('cell', { name: '5', exact: true })).toBeVisible();
  await expect(fila.getByRole('cell', { name: 'Bajo mínimo', exact: true })).toBeVisible();

  await fila.getByRole('button', { name: `Editar ${nombreEditado}`, exact: true }).click();
  await expect(page.getByLabel('Cantidad', { exact: true })).toHaveValue('2');
  await expect(page.getByLabel('Cantidad mínima', { exact: true })).toHaveValue('5');
  await page.getByRole('button', { name: 'Cancelar edición', exact: true }).click();
});

test('rechaza una cantidad negativa al editar y conserva el producto original', async ({ page, producto }) => {
  await ingresar(page);
  await agregar(page, producto, 7, 3);
  const fila = page.getByRole('row').filter({
    has: page.getByText(producto.sku, { exact: true }),
  });
  await fila.getByRole('button', { name: `Editar ${producto.nombre}`, exact: true }).click();
  const cantidad = page.getByLabel('Cantidad', { exact: true });
  await cantidad.fill('-1');
  await page.getByRole('button', { name: 'Guardar cambios', exact: true }).click();

  await expect(page.getByRole('alert')).toHaveText('Corrige los campos marcados para guardar.');
  await expect(cantidad).toHaveAttribute('aria-invalid', 'true');
  await expect(page.getByText('Cantidad: introduce un entero igual o mayor que cero.', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Guardar cambios', exact: true })).toBeVisible();
  await expect(page.getByRole('status')).toBeEmpty();
  await expect(fila.getByRole('cell', { name: '7', exact: true })).toBeVisible();

  await page.reload();
  await expect(fila).toHaveCount(1);
  await expect(fila.getByRole('cell', { name: `${producto.nombre} ${producto.sku}`, exact: true })).toBeVisible();
  await expect(fila.getByRole('cell', { name: '7', exact: true })).toBeVisible();
  await expect(fila.getByRole('cell', { name: '3', exact: true })).toBeVisible();
  await expect(fila.getByRole('cell', { name: 'En orden', exact: true })).toBeVisible();

  await fila.getByRole('button', { name: `Editar ${producto.nombre}`, exact: true }).click();
  await expect(page.getByLabel('Cantidad', { exact: true })).toHaveValue('7');
  await expect(page.getByLabel('Cantidad mínima', { exact: true })).toHaveValue('3');
  await page.getByRole('button', { name: 'Cancelar edición', exact: true }).click();
});
