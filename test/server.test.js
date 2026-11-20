import { test } from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { app } from '../server.js';

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
  for (const archivo of ['app.js', 'productos.js', 'styles.css']) {
    assert.equal((await fetch(`${base}/${archivo}`)).status, 200);
  }
  for (const archivo of ['docs/requisitos.md', 'package.json', '.env', 'server.js', 'AGENTS.md']) {
    assert.equal((await fetch(`${base}/${archivo}`)).status, 404);
  }
});
