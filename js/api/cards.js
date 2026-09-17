import { getSupabase } from '../supabase.js';

export async function listCards(roomId) {
  const sb = await getSupabase();
  const { data, error } = await sb.from('cards').select('*').eq('room_id', roomId).eq('active', true).order('created_at');
  if (error) throw error;
  return data || [];
}

export async function createCard(card) {
  const sb = await getSupabase();
  const { data, error } = await sb.from('cards').insert(card).select().single();
  if (error) throw error;
  return data;
}

export async function updateCard(id, patch) {
  const sb = await getSupabase();
  const { data, error } = await sb.from('cards').update(patch).eq('id', id).select().single();
  if (error) throw error;
  return data;
}

export async function deleteCard(id) {
  const sb = await getSupabase();
  const { error } = await sb.from('cards').update({ active: false }).eq('id', id);
  if (error) throw error;
}
