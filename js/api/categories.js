import { getSupabase } from '../supabase.js';

export async function listCategories(roomId) {
  const sb = await getSupabase();
  const { data, error } = await sb.from('categories').select('*').eq('room_id', roomId).order('is_default', { ascending: false }).order('name');
  if (error) throw error;
  return data || [];
}

export async function createCategory(category) {
  const sb = await getSupabase();
  const { data, error } = await sb.from('categories').insert(category).select().single();
  if (error) throw error;
  return data;
}

export async function deleteCategory(id) {
  const sb = await getSupabase();
  const { error } = await sb.from('categories').delete().eq('id', id);
  if (error) throw error;
}

export const DEFAULT_CATEGORIES = [
  { name: 'Comida', color: '#ffb110', icon: 'utensils' },
  { name: 'Transporte', color: '#62aef0', icon: 'car' },
  { name: 'Casa', color: '#b18164', icon: 'home' },
  { name: 'Entretenimiento', color: '#f64932', icon: 'sparkles' },
  { name: 'Salud', color: '#097fe8', icon: 'heart' },
  { name: 'Compras', color: '#e89d01', icon: 'bag' },
  { name: 'Servicios', color: '#02093a', icon: 'bolt' },
  { name: 'Otros', color: '#696969', icon: 'tag' }
];
