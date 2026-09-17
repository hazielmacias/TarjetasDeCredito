import { getSupabase } from '../supabase.js';

export async function listPayments(roomId, { cardId, month, year } = {}) {
  const sb = await getSupabase();
  let q = sb.from('payments').select('*').eq('room_id', roomId).order('due_date', { ascending: false });
  if (cardId) q = q.eq('card_id', cardId);
  if (month) q = q.eq('month', month);
  if (year) q = q.eq('year', year);
  const { data, error } = await q;
  if (error) throw error;
  return data || [];
}

export async function createPayment(payment) {
  const sb = await getSupabase();
  const { data, error } = await sb.from('payments').insert(payment).select().single();
  if (error) throw error;
  return data;
}

export async function updatePayment(id, patch) {
  const sb = await getSupabase();
  const { data, error } = await sb.from('payments').update(patch).eq('id', id).select().single();
  if (error) throw error;
  return data;
}

export async function deletePayment(id) {
  const sb = await getSupabase();
  const { error } = await sb.from('payments').delete().eq('id', id);
  if (error) throw error;
}
