import { test } from 'node:test';
import assert from 'node:assert/strict';
import { autenticar } from '../public/auth.js';

test('registro exige ocho caracteres antes de llamar al servicio', async () => {
  let llamadas = 0;
  const cliente = { auth: { signUp: async () => { ++llamadas; return { data: { session: null }, error: null }; } } };
  await assert.rejects(autenticar(cliente, { email: 'persona@example.com', password: '1234567' }, true), /8 caracteres/);
  assert.equal(llamadas, 0);
  assert.deepEqual(await autenticar(cliente, { email: 'persona@example.com', password: '12345678' }, true), { session: null });
  assert.equal(llamadas, 1);
});

test('registro e inicio envían correo recortado y contraseña intacta', async () => {
  const llamadas = [];
  const session = { user: { id: 'persona' } };
  const cliente = { auth: Object.fromEntries(['signUp', 'signInWithPassword'].map(metodo => [metodo, async datos => {
    llamadas.push({ metodo, datos });
    return { data: { session }, error: null };
  }])) };
  for (const registrar of [true, false]) {
    const resultado = await autenticar(cliente, { email: ' persona@example.com ', password: ' contraseña ' }, registrar);
    assert.equal(resultado.session, session);
  }
  assert.deepEqual(llamadas, ['signUp', 'signInWithPassword'].map(metodo => ({ metodo, datos: { email: 'persona@example.com', password: ' contraseña ' } })));
});

test('acceso traduce errores y oculta detalles del servicio o de red', async () => {
  for (const [code, esperado] of [['invalid_credentials', /incorrectos/], ['email_not_confirmed', /Confirma/], ['user_already_exists', /Si ya tienes/], ['desconocido', /Inténtalo/]]) {
    const cliente = { auth: { signInWithPassword: async () => ({ error: { code, message: 'secreto interno' } }) } };
    await assert.rejects(autenticar(cliente, { email: 'persona@example.com', password: 'password' }), error => {
      assert.match(error.message, esperado);
      assert.doesNotMatch(error.message, /secreto|interno/);
      return true;
    });
  }
  const cliente = { auth: { signInWithPassword: async () => { throw new Error('detalle privado'); } } };
  await assert.rejects(autenticar(cliente, { email: 'persona@example.com', password: 'password' }), /No se pudo conectar/);
});
