import { randomUUID } from 'node:crypto';
import { test, expect, ingresar, agregar } from './fixtures.js';

test('inicia sesión con la cuenta de prueba', async ({ page, producto }) => {
  await ingresar(page);
  await expect(page.locator('#inventario')).toBeVisible();
  await expect(page.locator('#acceso')).toBeHidden();
  await expect(page.getByRole('button', { name: 'Cerrar sesión', exact: true })).toBeVisible();
  // Las pruebas de autenticación reservan un SKU, pero no necesitan insertar filas.
  await expect(page.getByText(producto.sku, { exact: true })).toHaveCount(0);
});

test('rechaza una contraseña incorrecta', async ({ page, producto }) => {
  await ingresar(page, `${process.env.TEST_PASSWORD}-incorrecta-${randomUUID()}`);
  await expect(page.locator('#error-acceso')).toHaveText('Correo o contraseña incorrectos.');
  await expect(page.locator('#inventario')).toBeHidden();
  await expect(page.locator('#acceso')).toBeVisible();
  await expect(page.getByText(producto.sku, { exact: true })).toHaveCount(0);
});

test('agrega un producto y lo conserva al recargar', async ({ page, producto }) => {
  await ingresar(page);
  await expect(page.locator('#inventario')).toBeVisible();
  const fila = await agregar(page, producto, 7, 3);
  await expect(fila).toHaveCount(1);
  await expect(fila.locator('td').nth(0)).toContainText(producto.nombre);
  await expect(fila.locator('td').nth(1)).toHaveText('7');
  await expect(fila.locator('td').nth(2)).toHaveText('3');
  await expect(fila.locator('.insignia')).toHaveText('En orden');
  await page.reload();
  await expect(fila).toBeVisible();
  await expect(fila.locator('td').nth(1)).toHaveText('7');
});

test('marca Bajo mínimo cuando la cantidad es menor al mínimo', async ({ page, producto }) => {
  await ingresar(page);
  await expect(page.locator('#inventario')).toBeVisible();
  const fila = await agregar(page, producto, 2, 5);
  await expect(fila.locator('td').nth(1)).toHaveText('2');
  await expect(fila.locator('td').nth(2)).toHaveText('5');
  await expect(fila.locator('.insignia')).toHaveText('Bajo mínimo');
  await expect(fila.locator('.insignia')).toHaveClass(/\bbajo\b/);
  await expect(fila.getByRole('button', { name: `Editar ${producto.nombre}`, exact: true })).toBeVisible();
});
