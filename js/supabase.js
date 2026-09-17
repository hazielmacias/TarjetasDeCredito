/**
 * Cliente Supabase (CDN UMD).
 * Se carga una sola vez desde el index.html y se expone aquí.
 */
import { SUPABASE_CONFIG, SHARED_CREDS } from './config.js';

let _client = null;

export async function getSupabase() {
  if (_client) return _client;

  if (!window.supabase) {
    await loadScript('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/dist/umd/supabase.min.js');
  }

  _client = window.supabase.createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.publishableKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      storage: window.localStorage,
      storageKey: 'nf-auth'
    }
  });

  return _client;
}

function loadScript(src) {
  return new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = src;
    s.onload = resolve;
    s.onerror = reject;
    document.head.appendChild(s);
  });
}

export async function getSession() {
  const sb = await getSupabase();
  const { data } = await sb.auth.getSession();
  return data.session ?? null;
}

/**
 * Login con credenciales fijas compartidas.
 *
 * Ambos dispositivos entran con el mismo usuario (`haziel@nf.local`).
 * La distinción entre "este gasto es de Haziel o de Areli" se hace
 * con el campo `owner` en cada expense/payment.
 *
 * Credenciales fueron creadas via Edge Function `bootstrap-users`.
 */
export async function signInShared() {
  const sb = await getSupabase();

  // Intentar reusar sesión existente; si está expirada o falla, hacer login limpio.
  let { data } = await sb.auth.getSession();
  if (data?.session) {
    // Verificar que la sesión aún es válida pidiendo el user
    const { data: userData, error: userErr } = await sb.auth.getUser();
    if (!userErr && userData?.user) {
      return data.session;
    }
    // Sesión inválida — limpiarla
    await sb.auth.signOut().catch(() => {});
  }

  const { data: sign, error } = await sb.auth.signInWithPassword({
    email: SHARED_CREDS.email,
    password: SHARED_CREDS.password
  });
  if (error) throw error;
  if (!sign?.session) throw new Error('No se pudo iniciar sesión');

  return sign.session;
}

export async function getAccessToken() {
  const session = await getSession();
  return session?.access_token ?? null;
}
