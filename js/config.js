/**
 * Configuración del cliente Supabase.
 * Las credenciales se inyectan al desplegar.
 */
const SUPABASE_CONFIG = {
  url: 'https://ljgvtgvzfnaotrrzwfhx.supabase.co',
  publishableKey: 'sb_publishable_bI1rx8-WLE3iCcOBRAohvw_rs-_Ehed',
  vapidPublicKey: '1Jg4S3qkUIuzaHpATQQIPFveBtdX8ilXxxoSlguQnLQ_xxOEmM6YNYXQDgh54nER71-itowsL7xZk2GG8IyiIEI'
};

const ROOM_ACCESS_CODE = '1234';

/**
 * Credenciales compartidas. Ambos dispositivos usan la misma
 * cuenta autenticada; la distinción entre "Haziel" y "Areli"
 * se hace por el campo `owner` en expenses y payments.
 *
 * Creado via Edge Function `bootstrap-users`.
 */
const SHARED_CREDS = {
  email: 'haziel@nf.local',
  password: 'nf-haziel-2026'
};

export { SUPABASE_CONFIG, ROOM_ACCESS_CODE, SHARED_CREDS };
