import { test } from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { app, crearApp } from '../server.js';
import { runInNewContext } from 'node:vm';

test('health, recursos públicos y archivos privados', async t => {
  const servidor = app.listen(0, '127.0.0.1');
  await once(servidor, 'listening');
  t.after(() => new Promise((resolve, reject) => servidor.close(error => error ? reject(error) : resolve())));
  const base = `http://127.0.0.1:${servidor.address().port}`;
  const health = await fetch(`${base}/health`);
  assert.equal(health.status, 200);
  assert.deepEqual(await health.json(), { status: 'ok' });
  const pagina = await fetch(base);
  assert.equal(pagina.status, 200);
  assert.match(await pagina.text(), /Mini Inventario/);
  for (const archivo of ['app.js', 'productos.js', 'supabase.js', 'styles.css', 'vendor/supabase.js']) {
    assert.equal((await fetch(`${base}/${archivo}`)).status, 200);
  }
  for (const archivo of ['docs/requisitos.md', 'package.json', '.env', '.env.example', 'server.js', 'AGENTS.md', 'node_modules/@supabase/supabase-js/package.json']) {
    assert.equal((await fetch(`${base}/${archivo}`)).status, 404);
  }
});

const url = 'https://prueba.supabase.co';
const jwt = role => ['eyJhbGciOiJIUzI1NiJ9', Buffer.from(JSON.stringify({ role })).toString('base64url'), 'firma_prueba'].join('.');

async function consultarConfig(t, env) {
  const servidor = crearApp(env).listen(0, '127.0.0.1');
  await once(servidor, 'listening');
  t.after(() => new Promise(resolve => servidor.close(resolve)));
  return fetch(`http://127.0.0.1:${servidor.address().port}/config.js`);
}

test('/config.js expone solo URL y clave pública, sin caché', async t => {
  for (const clave of ['sb_publishable_prueba', jwt('anon')]) {
    const respuesta = await consultarConfig(t, { SUPABASE_URL: url, SUPABASE_KEY: clave, SECRETO: 'no-publicar' });
    assert.equal(respuesta.status, 200);
    assert.match(respuesta.headers.get('content-type'), /javascript/);
    assert.equal(respuesta.headers.get('cache-control'), 'no-store');
    const contexto = { window: {} };
    const texto = await respuesta.text();
    runInNewContext(texto, contexto);
    assert.deepEqual(JSON.parse(JSON.stringify(contexto.window.SUPABASE_CONFIG)), { SUPABASE_URL: url, SUPABASE_KEY: clave });
    assert.doesNotMatch(texto, /no-publicar/);
  }
});

test('/config.js rechaza service_role, secret, claves inválidas o configuración ausente', async t => {
  for (const clave of [jwt('service_role'), jwt('authenticated'), 'sb_secret_no_publicar', 'incorrecta', '', undefined]) {
    const respuesta = await consultarConfig(t, { SUPABASE_URL: url, SUPABASE_KEY: clave });
    assert.equal(respuesta.status, 503);
    const texto = await respuesta.text();
    assert.doesNotMatch(texto, /SUPABASE_CONFIG|sb_secret|service_role|incorrecta/);
  }
  for (const invalida of [undefined, 'javascript:alert(1)', 'http://remoto.example', 'https://usuario:clave@prueba.supabase.co', `${url}/ruta`]) {
    const respuesta = await consultarConfig(t, { SUPABASE_URL: invalida, SUPABASE_KEY: 'sb_publishable_prueba' });
    assert.equal(respuesta.status, 503);
  }
});
