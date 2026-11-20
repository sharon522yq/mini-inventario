import express from 'express';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { loadEnvFile } from 'node:process';

try {
  loadEnvFile(fileURLToPath(new URL('./.env', import.meta.url)));
} catch (error) {
  if (error.code !== 'ENOENT') throw new Error('No se pudo cargar la configuración .env.');
}

function configuracionPublica(env) {
  const { SUPABASE_URL: url, SUPABASE_KEY: key } = env;
  try {
    const parsed = new URL(url);
    const local = ['localhost', '127.0.0.1', '[::1]'].includes(parsed.hostname);
    if ((parsed.protocol !== 'https:' && !(local && parsed.protocol === 'http:'))
      || parsed.username || parsed.password || parsed.search || parsed.hash || parsed.pathname !== '/') return null;
    if (typeof key !== 'string') return null;
    let publica = /^sb_publishable_[A-Za-z0-9_-]+$/.test(key);
    if (!publica && /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(key)) {
      const payload = JSON.parse(Buffer.from(key.split('.')[1], 'base64url').toString('utf8'));
      publica = payload.role === 'anon';
    }
    return publica ? { SUPABASE_URL: parsed.origin, SUPABASE_KEY: key } : null;
  } catch {
    return null;
  }
}

export function crearApp(env = process.env) {
  const app = express();
  app.disable('x-powered-by');
  app.get('/health', (_request, response) => response.json({ status: 'ok' }));
  app.get('/config.js', (_request, response) => {
    response.set('Cache-Control', 'no-store').type('application/javascript');
    const config = configuracionPublica(env);
    if (!config) return response.status(503).send('// Configura SUPABASE_URL y una SUPABASE_KEY publishable o anon.\n');
    const json = JSON.stringify(config).replace(/</g, '\\u003c').replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029');
    response.send(`window.SUPABASE_CONFIG = Object.freeze(${json});\n`);
  });
  app.get('/vendor/supabase.js', (_request, response) => {
    response.sendFile(fileURLToPath(new URL('./node_modules/@supabase/supabase-js/dist/umd/supabase.js', import.meta.url)));
  });
  app.use(express.static(fileURLToPath(new URL('./public/', import.meta.url))));
  return app;
}

export const app = crearApp();

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  const port = process.env.PORT || 3000;
  app.listen(port, () => console.log(`Mini Inventario disponible en http://localhost:${port}`));
}
