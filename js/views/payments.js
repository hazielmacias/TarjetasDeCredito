import { getState, subscribe } from '../store.js';
import { mxn, fechaCorta } from '../utils/format.js';
import { renderBottomNav } from '../components/bottom-nav.js';
import { modal, toast, confirm } from '../utils/ui.js';
import { createPayment, updatePayment, deletePayment } from '../api/payments.js';
import { refreshAll } from '../api/sync.js';

export async function paymentsView(root) {
  let state = getState();
  const unsubscribe = subscribe((s) => { state = s; render(); });

  function render() {
    const { payments, cards } = state;
    const sorted = [...payments].sort((a, b) => new Date(b.due_date) - new Date(a.due_date));

    root.innerHTML = `
      <section class="page-enter px-5 pt-6">
        <header class="mb-5 flex items-center justify-between">
          <div>
            <h1 class="heading-xl">Pagos</h1>
            <p class="text-sm text-stone mt-1">Historial de pagos a tarjetas</p>
          </div>
        </header>

        ${sorted.length ? `<div class="space-y-2">
          ${sorted.map((p) => {
            const card = cards.find((c) => c.id === p.card_id);
            if (!card) return '';
            const tono = p.status === 'paid' ? 'sky' : p.status === 'partial' ? 'marigold' : 'coral';
            const label = p.status === 'paid' ? 'Pagado' : p.status === 'partial' ? 'Parcial' : 'Pendiente';
            return `
              <div class="list-item" data-id="${p.id}">
                <div class="w-10 h-10 rounded-card flex items-center justify-center" style="background:${card.color}22">
                  <span class="font-semibold text-sm" style="color:${card.color}">${card.name.slice(0, 2).toUpperCase()}</span>
                </div>
                <div class="flex-1 min-w-0">
                  <div class="font-medium truncate">${card.name}</div>
                  <div class="text-xs text-stone">Vence ${fechaCorta(p.due_date)} · ${p.month}/${p.year}</div>
                </div>
                <div class="text-right">
                  <div class="font-semibold text-balance">${mxn(p.amount)}</div>
                  <span class="pill pill-${tono}" style="padding:1px 8px;font-size:10px">${label}</span>
                </div>
              </div>
            `;
          }).join('')}
        </div>` : `<div class="empty-state">Sin pagos registrados</div>`}

        <button class="btn btn-primary btn-block btn-lg mt-6" id="add-pay">+ Registrar pago</button>
      </section>
    `;

    root.appendChild(renderBottomNav());

    root.querySelector('#add-pay').onclick = () => openPaymentForm();
    root.querySelectorAll('[data-id]').forEach((el) => {
      el.onclick = () => {
        const p = payments.find((x) => x.id === el.dataset.id);
        if (p) openPaymentDetail(p);
      };
    });
  }

  render();
  return () => unsubscribe();
}

export async function paymentFormView(root, qs = {}) {
  const { cards, room, currentMonth } = getState();
  const preselectedCardId = qs.get?.('card') || qs.card || null;

  if (!cards.length) {
    root.innerHTML = `
      <section class="page-enter px-5 pt-6">
        <button class="btn btn-text btn-sm mb-4" id="back">← Volver</button>
        <div class="empty-state">Primero agrega una tarjeta</div>
      </section>
    `;
    root.querySelector('#back').onclick = () => history.back();
    return;
  }

  root.innerHTML = `
    <section class="page-enter px-5 pt-6">
      <header class="mb-5 flex items-center justify-between">
        <button class="btn btn-text btn-sm" id="back">← Volver</button>
        <h1 class="heading-md">Registrar pago</h1>
        <span></span>
      </header>

      <div class="space-y-4">
        <div>
          <label class="label">Tarjeta</label>
          <div class="chip-group" id="f-cards">
            ${cards.map((c) => `
              <button type="button" class="chip ${c.id === preselectedCardId ? 'active' : ''}" data-id="${c.id}" style="border-color:${c.color}">
                <span class="w-2 h-2 rounded-full" style="background:${c.color}"></span>
                ${c.name}
              </button>
            `).join('')}
          </div>
        </div>

        <div>
          <label class="label">Monto</label>
          <input class="input" type="number" step="0.01" min="0" id="f-amount" autofocus inputmode="decimal" />
        </div>

        <div>
          <label class="label">Fecha límite</label>
          <input class="input" type="date" id="f-due" />
        </div>

        <div>
          <label class="label">Estado</label>
          <div class="chip-group" id="f-status">
            <button type="button" class="chip active" data-val="pending">Pendiente</button>
            <button type="button" class="chip" data-val="partial">Parcial</button>
            <button type="button" class="chip" data-val="paid">Pagado</button>
          </div>
        </div>

        <div>
          <label class="label">Notas (opcional)</label>
          <input class="input" id="f-notes" placeholder="Pago del mes..." />
        </div>

        <button class="btn btn-primary btn-block btn-lg" id="f-save">Guardar pago</button>
      </div>
    </section>
  `;

  let selected = { card: preselectedCardId || cards[0].id, status: 'pending' };

  function bindGroup(group, key, valAttr = 'val') {
    group.addEventListener('click', (e) => {
      const b = e.target.closest(`[data-${valAttr}]`);
      if (!b) return;
      group.querySelectorAll('.chip').forEach((c) => c.classList.remove('active'));
      b.classList.add('active');
      selected[key] = valAttr === 'id' ? b.dataset.id : b.dataset.val;
      if (key === 'card') {
        const card = cards.find((c) => c.id === selected.card);
        if (card) {
          const due = new Date();
          due.setDate(card.payment_day);
          if (due <= new Date()) due.setMonth(due.getMonth() + 1);
          root.querySelector('#f-due').value = due.toISOString().slice(0, 10);
        }
      }
    });
  }

  bindGroup(root.querySelector('#f-cards'), 'card', 'id');
  bindGroup(root.querySelector('#f-status'), 'status', 'val');

  // Set default due date
  const card = cards.find((c) => c.id === selected.card);
  if (card) {
    const due = new Date();
    due.setDate(card.payment_day);
    if (due <= new Date()) due.setMonth(due.getMonth() + 1);
    root.querySelector('#f-due').value = due.toISOString().slice(0, 10);
  }

  root.querySelector('#back').onclick = () => history.back();

  root.querySelector('#f-save').onclick = async () => {
    const amount = +root.querySelector('#f-amount').value;
    const dueDateStr = root.querySelector('#f-due').value;
    const notes = root.querySelector('#f-notes').value.trim();

    if (!amount || amount <= 0) return toast('Ingresa un monto');
    if (!dueDateStr) return toast('Ingresa la fecha');
    if (!selected.card) return toast('Selecciona una tarjeta');

    const due = new Date(dueDateStr);
    const payload = {
      room_id: room.id,
      card_id: selected.card,
      amount,
      due_date: dueDateStr,
      status: selected.status,
      month: due.getMonth() + 1,
      year: due.getFullYear(),
      paid_date: selected.status === 'paid' ? new Date().toISOString().slice(0, 10) : null,
      notes: notes || null
    };

    try {
      await createPayment(payload);
      toast('Pago registrado');
      await refreshAll();
      history.back();
    } catch (e) {
      toast('Error: ' + e.message);
    }
  };
}

function openPaymentDetail(p) {
  const { cards } = getState();
  const card = cards.find((c) => c.id === p.card_id);

  modal(`
    <div class="modal-header">
      <h3 class="heading-md">Detalle del pago</h3>
      <button class="btn btn-text btn-sm" data-act="close">✕</button>
    </div>
    <div class="modal-body">
      <div class="text-center mb-4">
        <div class="kpi-value">${mxn(p.amount)}</div>
        <div class="text-stone text-sm mt-1">${card?.name || '—'}</div>
      </div>
      <div class="space-y-2 text-sm">
        <div class="flex justify-between"><span class="text-stone">Vence</span><span>${fechaCorta(p.due_date)}</span></div>
        <div class="flex justify-between"><span class="text-stone">Estado</span><span>${p.status}</span></div>
        ${p.paid_date ? `<div class="flex justify-between"><span class="text-stone">Pagado el</span><span>${fechaCorta(p.paid_date)}</span></div>` : ''}
        ${p.notes ? `<div class="flex justify-between"><span class="text-stone">Notas</span><span>${p.notes}</span></div>` : ''}
      </div>
      <div class="grid grid-cols-2 gap-2 mt-5">
        <button class="btn btn-text btn-block" id="f-paid">Marcar pagado</button>
        <button class="btn btn-danger btn-block" id="f-del">Eliminar</button>
      </div>
    </div>
  `, {
    onMount: ({ root: r, close }) => {
      r.querySelector('[data-act="close"]').onclick = close;
      r.querySelector('#f-paid').onclick = async () => {
        await updatePayment(p.id, { status: 'paid', paid_date: new Date().toISOString().slice(0, 10) });
        await refreshAll();
        close();
        toast('Marcado como pagado');
      };
      r.querySelector('#f-del').onclick = async () => {
        const ok = await confirm({ title: '¿Eliminar pago?', danger: true });
        if (!ok) return;
        await deletePayment(p.id);
        await refreshAll();
        close();
        toast('Pago eliminado');
      };
    }
  });
}
