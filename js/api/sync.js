import { getState, setState } from '../store.js';
import { listCards } from './cards.js';
import { listPayments } from './payments.js';
import { listExpenses } from './expenses.js';
import { listCategories } from './categories.js';
import { subscribeRoom } from './rooms.js';

/**
 * Carga todos los datos del room actual.
 */
export async function refreshAll() {
  const { room } = getState();
  if (!room) return;
  setState({ loading: true });
  try {
    const [cards, categories, payments, expenses] = await Promise.all([
      listCards(room.id),
      listCategories(room.id),
      listPayments(room.id),
      listExpenses(room.id)
    ]);
    setState({ cards, categories, payments, expenses, loading: false });
  } catch (e) {
    console.error(e);
    setState({ loading: false });
  }
}

/**
 * Suscribe a cambios en tiempo real.
 */
export async function watchRoom() {
  const { room } = getState();
  if (!room) return null;
  return subscribeRoom(room.id, () => {
    refreshAll();
  });
}
