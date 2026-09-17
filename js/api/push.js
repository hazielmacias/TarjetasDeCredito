/**
 * Suscripción a notificaciones push (Web Push API).
 */
import { SUPABASE_CONFIG } from '../config.js';
import { getSupabase, getSession } from '../supabase.js';

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  const out = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) out[i] = rawData.charCodeAt(i);
  return out;
}

export async function subscribeToPush() {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    return { ok: false, reason: 'unsupported' };
  }
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') return { ok: false, reason: 'denied' };

  const reg = await navigator.serviceWorker.ready;
  let sub = await reg.pushManager.getSubscription();
  if (!sub) {
    sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(SUPABASE_CONFIG.vapidPublicKey)
    });
  }

  // Persistir en la DB
  const sb = await getSupabase();
  const session = await getSession();
  if (!session) return { ok: false, reason: 'no_session' };

  const { error } = await sb.from('room_devices')
    .update({ push_subscription: sub.toJSON(), last_seen_at: new Date().toISOString() })
    .eq('user_id', session.user.id);
  if (error) console.warn('No se pudo guardar la suscripción:', error);

  return { ok: true, subscription: sub };
}

export async function unsubscribeFromPush() {
  if (!('serviceWorker' in navigator)) return { ok: false };
  const reg = await navigator.serviceWorker.ready;
  const sub = await reg.pushManager.getSubscription();
  if (sub) await sub.unsubscribe();

  const sb = await getSupabase();
  const session = await getSession();
  if (session) {
    await sb.from('room_devices')
      .update({ push_subscription: null })
      .eq('user_id', session.user.id);
  }
  return { ok: true };
}

export async function isPushSubscribed() {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) return false;
  const reg = await navigator.serviceWorker.ready;
  const sub = await reg.pushManager.getSubscription();
  return !!sub;
}
