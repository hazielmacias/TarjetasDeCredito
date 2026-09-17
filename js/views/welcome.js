import { joinOrCreateRoom } from '../api/rooms.js';
import { setState, getState } from '../store.js';
import { navigate } from '../router.js';
import { refreshAll, watchRoom } from '../api/sync.js';
import { DEFAULT_CATEGORIES } from '../api/categories.js';
import { createCategory } from '../api/categories.js';
import { getSupabase } from '../supabase.js';
import { toast } from '../utils/ui.js';

export async function welcomeView(root) {
  const { session, room } = getState();

  root.innerHTML = `
    <section class="page-enter px-6 pt-16 pb-10 min-h-screen flex flex-col">
      <div class="text-center mb-12">
        <div class="inline-flex items-center gap-2 mb-4">
          <span class="inline-block w-10 h-10 rounded-card gradient-sky"></span>
        </div>
        <h1 class="heading-xl mb-3">
          Nuestras <span class="highlight-pill">Finanzas</span>
        </h1>
        <p class="body-serif max-w-sm mx-auto">
          Tarjetas, pagos y gastos en un solo lugar — juntos pero ordenados.
        </p>
      </div>

      <div class="space-y-3 max-w-sm mx-auto w-full">
        <div class="card-tight card">
          <div class="flex items-start gap-3 mb-3">
            <div class="w-9 h-9 rounded-card bg-sky-tint flex items-center justify-center">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path d="M3 11l9-8 9 8v9a2 2 0 0 1-2 2h-4a1 1 0 0 1-1-1v-5h-4v5a1 1 0 0 1-1 1H5a2 2 0 0 1-2-2v-9z" stroke="#0075de" stroke-width="1.6" stroke-linejoin="round"/>
              </svg>
            </div>
            <div class="flex-1">
              <div class="heading-sm">Código compartido</div>
              <p class="text-xs text-stone">Usa <strong>1234</strong> en ambos dispositivos.</p>
            </div>
          </div>
        </div>

        <button id="enter-btn" class="btn btn-primary btn-block btn-lg">
          Entrar
        </button>
        <button id="reset-btn" class="btn btn-text btn-block btn-sm">
          Cerrar sesión de este dispositivo
        </button>
      </div>

      <div id="status" class="text-center text-xs text-stone mt-6"></div>
    </section>
  `;

  const status = root.querySelector('#status');
  const btn = root.querySelector('#enter-btn');

  async function enter() {
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner"></span> Conectando...';
    status.textContent = '';
    try {
      const { room: r, session: s } = await joinOrCreateRoom(navigator.userAgent?.includes('Mobile') ? 'Móvil' : 'Web');
      setState({ room: r, session: s });
      await seedDefaultsIfNeeded(r.id);
      await refreshAll();
      await watchRoom();
      navigate('/');
    } catch (e) {
      console.error(e);
      status.innerHTML = `<span class="text-coral">${e.message || 'Error al conectar'}</span>`;
      btn.disabled = false;
      btn.innerHTML = 'Entrar';
    }
  }

  btn.addEventListener('click', enter);

  root.querySelector('#reset-btn').addEventListener('click', async () => {
    const sb = await getSupabase();
    await sb.auth.signOut();
    setState({ session: null, room: null });
    location.reload();
  });

  if (session && room) {
    enter();
  }

  async function seedDefaultsIfNeeded(roomId) {
    const sb = await getSupabase();
    const { data: existing } = await sb.from('categories').select('id').eq('room_id', roomId);
    if (existing && existing.length === 0) {
      await Promise.all(DEFAULT_CATEGORIES.map((c) =>
        createCategory({ ...c, room_id: roomId, is_default: true })
      ));
      toast('Categorías predeterminadas creadas');
    }
  }
}
