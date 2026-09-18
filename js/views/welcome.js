import { joinOrCreateRoom } from '../api/rooms.js';
import { setState, getState } from '../store.js';
import { navigate } from '../router.js';
import { refreshAll, watchRoom } from '../api/sync.js';
import { DEFAULT_CATEGORIES, createCategory } from '../api/categories.js';
import { getSupabase } from '../supabase.js';
import { toast } from '../utils/ui.js';

export async function welcomeView(root) {
  const { session, room } = getState();

  root.innerHTML = `
    <section class="page-enter page" style="min-height:100vh;display:flex;flex-direction:column;padding-top:48px;padding-bottom:24px">
      <div class="row-between" style="margin-bottom:48px">
        <div class="brand-mark"><span class="dot"></span></div>
        <span></span>
      </div>

      <div style="flex:1;display:flex;flex-direction:column;justify-content:center">
        <div style="margin-bottom:8px">
          <span class="t-eyebrow">Edición compartida</span>
        </div>

        <h1 class="t-display-xl" style="margin:0">
          Nuestras<br>
          <span class="hl-pill">finanzas</span>,
          <span class="t-display-italic" style="color:var(--ink-60)">juntas</span>.
        </h1>

        <p class="t-serif-body" style="margin-top:24px;max-width:340px">
          Tarjetas, pagos y gastos compartidos en un cuaderno
          que Areli y Haziel pueden leer.
        </p>
      </div>

      <div class="stack">
        <button id="enter-btn" class="btn btn-ink btn-block btn-lg">
          Entrar
        </button>

        <button id="reset-btn" class="btn btn-ghost btn-block btn-sm">
          Cerrar sesión de este dispositivo
        </button>
      </div>

      <div id="status" class="t-small" style="text-align:center;margin-top:16px;min-height:18px"></div>
    </section>
  `;

  const status = root.querySelector('#status');
  const btn = root.querySelector('#enter-btn');

  async function enter() {
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner"></span> Conectando...';
    status.textContent = '';
    try {
      const result = await joinOrCreateRoom(navigator.userAgent?.includes('Mobile') ? 'Móvil' : 'Web');
      const r = result.room;

      const sb = await getSupabase();
      const { data: { session: currentSession } } = await sb.auth.getSession();

      setState({ room: r, session: currentSession });

      try {
        await seedDefaultsIfNeeded(r.id);
      } catch (seedErr) {
        console.warn('seedDefaults falló (continúa):', seedErr);
      }

      try {
        await refreshAll();
      } catch (refErr) {
        console.warn('refreshAll falló (continúa):', refErr);
      }

      try {
        await watchRoom();
      } catch (watchErr) {
        console.warn('watchRoom falló (continúa):', watchErr);
      }

      navigate('/');
    } catch (e) {
      console.error('enter error:', e);
      status.innerHTML = `<span style="color:var(--clay)">${e.message || 'Error al conectar'}</span>`;
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
