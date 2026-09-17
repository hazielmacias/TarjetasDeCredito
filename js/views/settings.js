import { getState, subscribe } from '../store.js';
import { mxn, mesNombre, hoyISO } from '../utils/format.js';
import { renderBottomNav } from '../components/bottom-nav.js';
import { subscribeToPush, unsubscribeFromPush, isPushSubscribed } from '../api/push.js';
import { toast } from '../utils/ui.js';
import { navigate } from '../router.js';
import { updateRoom } from '../api/rooms.js';
import { getSupabase } from '../supabase.js';
import { setState } from '../store.js';

export async function settingsView(root) {
  let state = getState();
  const unsubscribe = subscribe((s) => { state = s; render(); });
  let pushOn = await isPushSubscribed();

  function render() {
    const { room, cards, expenses, payments, categories } = state;

    root.innerHTML = `
      <section class="page-enter page">
        <div class="page-header">
          <span class="t-eyebrow">Ajustes</span>
          <h1 class="t-display" style="margin-top:4px">La sala</h1>
        </div>

        <div class="stack-loose">
          <div class="card">
            <div class="section-header">
              <span class="t-eyebrow">Identidad</span>
            </div>
            <div class="stack">
              <div>
                <label class="label">Nombre de la sala</label>
                <input class="input" id="room-name" value="${room?.name || ''}" />
              </div>
              <div class="grid-2">
                <div>
                  <label class="label">Tú</label>
                  <input class="input" id="owner-name" value="${room?.owner_name || 'Haziel'}" />
                </div>
                <div>
                  <label class="label">Pareja</label>
                  <input class="input" id="partner-name" value="${room?.partner_name || 'Areli'}" />
                </div>
              </div>
              <button class="btn btn-ink btn-block" id="save-room">Guardar</button>
            </div>
          </div>

          <div class="card">
            <div class="section-header">
              <span class="t-eyebrow">Notificaciones</span>
            </div>
            <div class="row-between">
              <div>
                <div style="font-weight:500">Recordatorios</div>
                <div class="t-small" style="margin-top:2px">Avisos antes de pagos y cortes</div>
              </div>
              <button class="btn ${pushOn ? 'btn-ink' : 'btn-outline'} btn-sm" id="toggle-push">
                ${pushOn ? 'Activadas' : 'Activar'}
              </button>
            </div>
          </div>

          <div class="card">
            <div class="section-header">
              <span class="t-eyebrow">Datos</span>
            </div>
            <div class="grid-2">
              <div>
                <div class="stat-label">Tarjetas</div>
                <div class="stat-value t-mono" style="font-size:22px;margin-top:4px">${cards.length}</div>
              </div>
              <div>
                <div class="stat-label">Gastos</div>
                <div class="stat-value t-mono" style="font-size:22px;margin-top:4px">${expenses.length}</div>
              </div>
              <div>
                <div class="stat-label">Pagos</div>
                <div class="stat-value t-mono" style="font-size:22px;margin-top:4px">${payments.length}</div>
              </div>
              <div>
                <div class="stat-label">Categorías</div>
                <div class="stat-value t-mono" style="font-size:22px;margin-top:4px">${categories.length}</div>
              </div>
            </div>
          </div>

          <div class="stack-tight">
            <button class="btn btn-ghost btn-block btn-sm" id="goto-cards">Tarjetas →</button>
            <button class="btn btn-ghost btn-block btn-sm" id="goto-cats">Categorías →</button>
            <button class="btn btn-ghost btn-block btn-sm" id="goto-payments">Pagos →</button>
            <button class="btn btn-ghost btn-block btn-sm" id="goto-history">Historial →</button>
          </div>

          <button class="btn btn-ghost btn-block btn-sm" id="signout" style="color:var(--clay)">Cerrar sesión de este dispositivo</button>

          <div style="text-align:center;padding:24px 0 8px">
            <span class="folio">Nuestras Finanzas · Edición 2026</span>
            <div style="margin-top:6px;font-family:var(--f-mono);font-size:10.5px;letter-spacing:0.1em;color:var(--ink-40);text-transform:uppercase">Código · 1234</div>
          </div>
        </div>
      </section>
    `;

    root.appendChild(renderBottomNav());

    root.querySelector('#save-room').onclick = async () => {
      try {
        const patch = {
          name: root.querySelector('#room-name').value.trim() || 'Nuestras Finanzas',
          owner_name: root.querySelector('#owner-name').value.trim() || 'Haziel',
          partner_name: root.querySelector('#partner-name').value.trim() || 'Areli'
        };
        await updateRoom(room.id, patch);
        setState({ room: { ...room, ...patch } });
        toast('Sala actualizada');
      } catch (e) {
        toast('Error: ' + e.message);
      }
    };

    root.querySelector('#toggle-push').onclick = async () => {
      const btn = root.querySelector('#toggle-push');
      btn.disabled = true;
      try {
        if (pushOn) {
          await unsubscribeFromPush();
          pushOn = false;
          toast('Notificaciones desactivadas');
        } else {
          const res = await subscribeToPush();
          if (res.ok) {
            pushOn = true;
            toast('Notificaciones activadas');
          } else {
            toast('Permiso denegado o no soportado');
          }
        }
        render();
      } finally {
        btn.disabled = false;
      }
    };

    root.querySelector('#goto-cards').onclick = () => navigate('/cards');
    root.querySelector('#goto-cats').onclick = () => navigate('/categories');
    root.querySelector('#goto-payments').onclick = () => navigate('/payments');
    root.querySelector('#goto-history').onclick = () => navigate('/history');
    root.querySelector('#signout').onclick = async () => {
      const sb = await getSupabase();
      await sb.auth.signOut();
      setState({ session: null, room: null });
      navigate('/welcome');
    };
  }

  render();
  return () => unsubscribe();
}
