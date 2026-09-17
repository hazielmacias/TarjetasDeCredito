/**
 * Cliente Supabase (CDN UMD).
 * Se carga una sola vez desde el index.html y se expone aquí.
 */
import { SUPABASE_CONFIG } from './config.js';

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

export async function signInAnonymously() {
  const sb = await getSupabase();
  let { data } = await sb.auth.getSession();
  if (data?.session) return data.session;

  // Login anónimo vía signInAnonymously (Supabase >= 2.0 lo soporta)
  const { data: sign, error } = await sb.auth.signInAnonymously();
  if (error) throw error;
  return sign.session;
}

export async function getAccessToken() {
  const session = await getSession();
  return session?.access_token ?? null;
}
