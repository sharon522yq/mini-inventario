const mensajes = {
  invalid_credentials: 'Correo o contraseña incorrectos.',
  email_not_confirmed: 'Confirma tu correo antes de iniciar sesión.',
  weak_password: 'Contraseña: usa al menos 8 caracteres y cumple los requisitos del servicio.',
  over_request_rate_limit: 'Demasiados intentos. Espera un momento e inténtalo de nuevo.',
  over_email_send_rate_limit: 'Demasiadas solicitudes de correo. Espera un momento e inténtalo de nuevo.',
  user_already_exists: 'Si ya tienes una cuenta, inicia sesión con tus credenciales.'
};

export async function autenticar(cliente, { email, password }, registrar = false) {
  email = email.trim();
  if (!email || !password) throw new Error('Completa el correo y la contraseña.');
  if (registrar && password.length < 8) throw new Error('Contraseña: usa al menos 8 caracteres para registrarte.');
  let resultado;
  try {
    resultado = registrar
      ? await cliente.auth.signUp({ email, password })
      : await cliente.auth.signInWithPassword({ email, password });
  } catch {
    throw new Error('No se pudo conectar. Comprueba tu conexión e inténtalo de nuevo.');
  }
  if (resultado.error) {
    throw new Error(mensajes[resultado.error.code] ?? 'No se pudo completar el acceso. Inténtalo de nuevo.');
  }
  return resultado.data;
}
