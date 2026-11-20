let cliente;

export function obtenerCliente() {
  if (cliente) return cliente;
  const config = globalThis.SUPABASE_CONFIG;
  if (!config?.SUPABASE_URL || !config?.SUPABASE_KEY || !globalThis.supabase?.createClient) {
    throw new Error('No se pudo conectar con el servicio. Revisa la configuración del servidor y vuelve a cargar la página.');
  }
  cliente = globalThis.supabase.createClient(config.SUPABASE_URL, config.SUPABASE_KEY);
  return cliente;
}
