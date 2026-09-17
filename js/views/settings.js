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
      <section class="page-enter px-5 pt-6">
        <header class="mb-5">
          <h1 class="heading-xl">Ajustes</h1>
        </header>

        <div class="space-y-4">
          <div class="card">
            <div class="section-title">Sala</div>
            <div class="space-y-3">
              <div>
                <label class="label">Nombre de la sala</label>
                <input class="input" id="room-name" value="${room?.name || ''}" />
              </div>
              <div class="grid grid-cols-2 gap-3">
                <div>
                  <label class="label">Tu nombre</label>
                  <input class="input" id="owner-name" value="${room?.owner_name || 'Haziel'}" />
                </div>
                <div>
                  <label class="label">Pareja</label>
                  <input class="input" id="partner-name" value="${room?.partner_name || 'Areli'}" />
                </div>
              </div>
              <button class="btn btn-primary btn-block" id="save-room">Guardar</button>
            </div>
          </div>

          <div class="card">
            <div class="section-title">Notificaciones</div>
            <div class="flex items-center justify-between">
              <div>
                <div class="font-medium">Recordatorios de pago</div>
                <div class="text-xs text-stone">Recibe avisos antes de fechas de pago y corte</div>
              </div>
              <button class="btn ${pushOn ? 'btn-primary' : 'btn-outline'} btn-sm" id="toggle-push">
                ${pushOn ? 'Activadas' : 'Activar'}
              </button>
            </div>
          </div>

          <div class="card">
            <div class="section-title">Datos</div>
            <div class="space-y-2 text-sm">
              <div class="flex justify-between"><span class="text-stone">Tarjetas</span><span class="font-semibold">${cards.length}</span></div>
              <div class="flex justify-between"><span class="text-stone">Gastos</span><span class="font-semibold">${expenses.length}</span></div>
              <div class="flex justify-between"><span class="text-stone">Pagos</span><span class="font-semibold">${payments.length}</span></div>
              <div class="flex justify-between"><span class="text-stone">Categorías</span><span class="font-semibold">${categories.length}</span></div>
            </div>
            <div class="grid grid-cols-2 gap-2 mt-4">
              <button class="btn btn-text btn-block btn-sm" id="goto-cards">Tarjetas</button>
              <button class="btn btn-text btn-block btn-sm" id="goto-cats">Categorías</button>
            </div>
          </div>

          <button class="btn btn-text btn-block btn-sm text-coral" id="signout">Cerrar sesión de este dispositivo</button>

          <div class="text-center text-xs text-stone pt-4">
            <p>Nuestras Finanzas · v1.0</p>
            <p class="mt-1">Código compartido: <strong>1234</strong></p>
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
