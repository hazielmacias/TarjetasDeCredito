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
import { upcomingView } from './views/upcoming.js';

import { signInShared, getSession } from './supabase.js';

// Desregistrar SW viejo y limpiar caches (fix de layout PC)
if ('serviceWorker' in navigator) {
  window.addEventListener('load', async () => {
    try {
      // Borrar TODOS los caches existentes
      if (caches && caches.keys) {
        const keys = await caches.keys();
        await Promise.all(keys.map((k) => caches.delete(k)));
      }
      // Desregistrar todos los SW
      const regs = await navigator.serviceWorker.getRegistrations();
      await Promise.all(regs.map((reg) => reg.unregister()));
      console.info('[NF] Service worker desregistrado, caches limpiados');
    } catch (e) {
      console.warn('Limpieza SW:', e);
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
  // El query string puede estar en window.location.search O en el hash
  const searchStr = window.location.hash.includes('?')
    ? window.location.hash.split('?')[1] || ''
    : window.location.search.replace(/^\?/, '');
  const qs = Object.fromEntries(new URLSearchParams(searchStr));
  return paymentFormView(root, qs);
});
route('/upcoming', async (root) => {
  if (!getState().room) return navigate('/welcome');
  return upcomingView(root);
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
      let room = (await loadRoomFromSession(session.user.id))?.room;

      // Fallback: si no encontramos room_device (por RLS o porque no existe),
      // llamar a join-room que es la fuente de verdad.
      if (!room) {
        try {
          const { joinOrCreateRoom } = await import('./api/rooms.js');
          const res = await joinOrCreateRoom('Boot');
          room = res?.room;
        } catch (e) {
          console.warn('joinOrCreateRoom en boot:', e);
        }
      }

      if (room) {
        const { setState } = await import('./store.js');
        setState({ session, room });
        // Cargar todos los datos del room (cards, expenses, payments, categories)
        // ANTES del primer render para que la UI no muestre estados vacíos.
        try {
          const { refreshAll } = await import('./api/sync.js');
          await refreshAll();
        } catch (e) {
          console.warn('refreshAll on boot:', e);
        }
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
