import express from 'express';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

export const app = express();
app.disable('x-powered-by');
app.get('/health', (_request, response) => response.json({ status: 'ok' }));
app.use(express.static(fileURLToPath(new URL('./public/', import.meta.url))));

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  const port = process.env.PORT || 3000;
  app.listen(port, () => console.log(`Mini Inventario disponible en http://localhost:${port}`));
}
