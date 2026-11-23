import { test as base, expect } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'node:crypto';

async function limpiarProducto(sku) {
  // Cliente independiente de la página: también funciona si esta se cierra o falla.
  const cliente = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: { fetch: (url, options) => fetch(url, { ...options, signal: AbortSignal.timeout(10_000) }) },
  });
  try {
    const { data, error } = await cliente.auth.signInWithPassword({
      email: process.env.TEST_EMAIL,
      password: process.env.TEST_PASSWORD,
    });
    if (error || !data.user) throw new Error('No se pudo autenticar la limpieza de productos E2E.');
    for (let intento = 0; intento < 3; intento++) {
      const eliminado = await cliente.from('productos').delete()
        .eq('user_id', data.user.id).eq('sku', sku);
      if (eliminado.error) continue;
      const restantes = await cliente.from('productos').select('id')
        .eq('user_id', data.user.id).eq('sku', sku);
      if (!restantes.error && restantes.data.length === 0) return;
    }
    throw new Error('No se pudo confirmar la limpieza del producto E2E.');
  } catch {
    // No propagar mensajes del cliente que pudieran contener datos de la sesión.
    throw new Error('No se pudo confirmar la limpieza del producto E2E.');
  } finally {
    cliente.auth.stopAutoRefresh();
  }
}

export const test = base.extend({
  producto: [async ({}, use) => {
    const producto = {
      sku: `E2E-${randomUUID()}`,
      nombre: 'Producto de prueba Playwright',
      creacionIntentada: false,
    };
    try {
      await use(producto);
    } finally {
      // Se activa ANTES de enviar el formulario, incluso si la respuesta se pierde.
      if (producto.creacionIntentada) await limpiarProducto(producto.sku);
    }
  }, { timeout: 90_000 }],
});

export { expect };

export async function ingresar(page, password = process.env.TEST_PASSWORD) {
  await page.goto('/');
  // evaluate evita incluir valores de fill() en los mensajes de error de Playwright.
  await page.evaluate(({ email, password }) => {
    document.querySelector('#correo').value = email;
    document.querySelector('#contrasena').value = password;
  }, { email: process.env.TEST_EMAIL, password });
  await page.getByRole('button', { name: 'Iniciar sesión', exact: true }).click();
}

export async function agregar(page, producto, cantidad, minimo) {
  await page.getByLabel('Nombre', { exact: true }).fill(producto.nombre);
  await page.getByLabel('SKU', { exact: true }).fill(producto.sku);
  await page.getByLabel('Cantidad', { exact: true }).fill(String(cantidad));
  await page.getByLabel('Cantidad mínima', { exact: true }).fill(String(minimo));
  producto.creacionIntentada = true;
  // Esperar la petición completa evita competir con la limpieza tras un fallo de aserción.
  const [respuesta] = await Promise.all([
    page.waitForResponse(response =>
      new URL(response.url()).pathname === '/rest/v1/productos' && response.request().method() === 'POST'),
    page.getByRole('button', { name: 'Agregar producto', exact: true }).click(),
  ]);
  await respuesta.finished();
  if (!respuesta.ok()) throw new Error('El servicio rechazó el alta del producto E2E.');
  return page.locator('#productos tr').filter({ has: page.getByText(producto.sku, { exact: true }) });
}
