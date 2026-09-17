import { getState } from './store.js';
import { route, navigate, render } from './router.js';

import { welcomeView } from './views/welcome.js';
import { homeView } from './views/home.js';
import { cardsView } from './views/cards.js';
import { expensesView, expenseFormView } from './views/expenses.js';
import { paymentsView, paymentFormView } from './views/payments.js';
import { categoriesView } from './views/categories.js';
import { settingsView } from './views/settings.js';
import { historyView } from './views/history.js';

import { signInShared, getSession } from './supabase.js';

// Registrar service worker
if ('serviceWorker' in navigator) {
  window.addEventListener('load', async () => {
    try {
      await navigator.serviceWorker.register('./service-worker.js', { scope: './' });
    } catch (e) {
      console.warn('SW no registrado:', e);
    }
  });
}

// Rutas
route('/', async (root) => {
  const { session, room } = getState();
  if (!session || !room) return navigate('/welcome');
  return homeView(root);
});

route('/welcome', welcomeView);
route('/cards', async (root) => {
  if (!getState().room) return navigate('/welcome');
  return cardsView(root);
});
route('/expenses', async (root) => {
  if (!getState().room) return navigate('/welcome');
  return expensesView(root);
});
route('/expenses/new', async (root) => {
  if (!getState().room) return navigate('/welcome');
  return expenseFormView(root);
});
route('/payments', async (root) => {
  if (!getState().room) return navigate('/welcome');
  return paymentsView(root);
});
route('/payments/new', async (root) => {
  if (!getState().room) return navigate('/welcome');
  const qs = Object.fromEntries(new URLSearchParams(window.location.search.replace(/^\?/, '')));
  return paymentFormView(root, qs);
});
route('/categories', async (root) => {
  if (!getState().room) return navigate('/welcome');
  return categoriesView(root);
});
route('/settings', async (root) => {
  if (!getState().room) return navigate('/welcome');
  return settingsView(root);
});
route('/history', async (root) => {
  if (!getState().room) return navigate('/welcome');
  return historyView(root);
});

// Init
async function boot() {
  // Reanudar sesión si existe
  try {
    const session = await getSession();
    if (session) {
      const { room } = await loadRoomFromSession(session.user.id);
      if (room) {
        const { setState } = await import('./store.js');
        setState({ session, room });
      }
    }
  } catch (e) {
    console.warn('No hay sesión previa:', e);
  }

  // Render inicial
  render();
}

async function loadRoomFromSession(userId) {
  try {
    const { getSupabase } = await import('./supabase.js');
    const sb = await getSupabase();
    const { data } = await sb
      .from('room_devices')
      .select('room:rooms(*)')
      .eq('user_id', userId)
      .maybeSingle();
    if (data && data.room) return { room: data.room };
  } catch (e) {
    console.warn('No se pudo cargar la sala:', e);
  }
  return { room: null };
}

boot();
