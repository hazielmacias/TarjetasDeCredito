import { getSupabase } from '../supabase.js';

export async function listExpenses(roomId, { month, year, cardId, categoryId } = {}) {
  const sb = await getSupabase();
  let q = sb.from('expenses').select('*').eq('room_id', roomId).order('date', { ascending: false });
  if (month) q = q.eq('month', month);
  if (year) q = q.eq('year', year);
  if (cardId) q = q.eq('card_id', cardId);
  if (categoryId) q = q.eq('category_id', categoryId);
  const { data, error } = await q.limit(500);
  if (error) throw error;
  return data || [];
}

export async function createExpense(expense) {
  const sb = await getSupabase();
  const { data, error } = await sb.from('expenses').insert(expense).select().single();
  if (error) throw error;
  return data;
}

export async function updateExpense(id, patch) {
  const sb = await getSupabase();
  const { data, error } = await sb.from('expenses').update(patch).eq('id', id).select().single();
  if (error) throw error;
  return data;
}

export async function deleteExpense(id) {
  const sb = await getSupabase();
  const { error } = await sb.from('expenses').delete().eq('id', id);
  if (error) throw error;
}
