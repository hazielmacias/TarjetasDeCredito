import { getSupabase, signInShared } from '../supabase.js';
import { ROOM_ACCESS_CODE } from '../config.js';

/**
 * Une o crea una sala mediante la Edge Function join-room.
 * Si el código coincide con uno existente se une; si no existe se crea.
 */
export async function joinOrCreateRoom(deviceName = 'Dispositivo') {
  const session = await signInShared();
  if (!session) throw new Error('Sin sesión');

  const sb = await getSupabase();
  const res = await sb.functions.invoke('join-room', {
    body: {
      access_code: ROOM_ACCESS_CODE,
      device_name: deviceName
    }
  });

  if (res.error) {
    const msg = await res.error.context?.json?.().catch(() => ({}));
    throw new Error(msg.error || res.error.message);
  }

  return res.data;
}

/**
 * Actualiza el nombre de la sala.
 */
export async function updateRoom(roomId, patch) {
  const sb = await getSupabase();
  const { data, error } = await sb.from('rooms').update(patch).eq('id', roomId).select().single();
  if (error) throw error;
  return data;
}

/**
 * Suscribe a cambios en tiempo real de la sala.
 */
export async function subscribeRoom(roomId, onChange) {
  const sb = await getSupabase();
  return sb.channel(`room:${roomId}`)
    .on('postgres_changes', { event: '*', schema: 'public', filter: `room_id=eq.${roomId}` }, onChange)
    .subscribe();
}
