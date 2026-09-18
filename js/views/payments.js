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

    const pending = sorted.filter((p) => p.status !== 'paid').length;
    const totalPaid = sorted.filter((p) => p.status === 'paid').reduce((s, p) => s + +p.amount, 0);

    root.innerHTML = `
      <section class="page-enter page">
        <div class="page-header row-between">
          <div>
            <span class="t-eyebrow">Compromisos</span>
            <h1 class="t-display" style="margin-top:4px">Pagos</h1>
          </div>
          <button class="btn btn-ink btn-sm" id="add-pay">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M12 5v14M5 12h14" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
            Registrar
          </button>
        </div>

        ${sorted.length ? `
          <div class="grid-2" style="margin-bottom:24px">
            <div class="card card-tinted">
              <div class="stat-label">Pendientes</div>
              <div class="stat-value t-mono" style="font-size:32px">${pending}</div>
            </div>
            <div class="card card-tinted">
              <div class="stat-label">Pagado</div>
              <div class="stat-value t-mono" style="font-size:22px">${mxn(totalPaid)}</div>
            </div>
          </div>
        ` : ''}

        ${sorted.length ? `<div class="list">
          ${sorted.map((p) => {
            const card = cards.find((c) => c.id === p.card_id);
            if (!card) return '';
            const tono = p.status === 'paid' ? 'pill-haziel' : p.status === 'partial' ? 'pill-ochre' : 'pill-clay';
            const label = p.status === 'paid' ? 'Pagado' : p.status === 'partial' ? 'Parcial' : 'Pendiente';
            return `
              <div class="list-row" data-id="${p.id}">
                <div class="avatar" style="background:${card.color}">${card.name.slice(0, 2).toUpperCase()}</div>
                <div style="flex:1;min-width:0">
                  <div class="name">${card.name}</div>
                  <div class="meta">${fechaCorta(p.due_date)} · ${p.month}/${p.year}</div>
                </div>
                <div class="right">
                  <div class="amount">${mxn(p.amount)}</div>
                  <div style="margin-top:4px"><span class="pill ${tono}">${label}</span></div>
                </div>
              </div>
            `;
          }).join('')}
        </div>` : `<div class="empty">Sin pagos registrados aún.</div>`}
      </section>
    `;

    root.appendChild(renderBottomNav());

    root.querySelector('#add-pay').onclick = () => navigate('/payments/new');
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
      <section class="page-enter page">
        <button class="btn-link btn-link-back btn-sm" id="back" style="border:none;cursor:pointer;background:transparent;padding:8px 0">Volver</button>
        <div class="empty" style="margin-top:80px">Primero agrega una tarjeta</div>
      </section>
    `;
    root.querySelector('#back').onclick = () => history.back();
    return;
  }

  root.innerHTML = `
    <section class="page-enter page">
      <div class="page-header with-back">
        <div class="row" style="justify-content:space-between">
          <button class="btn-link btn-link-back btn-sm" id="back" style="border:none;cursor:pointer;background:transparent">Volver</button>
          <span class="t-eyebrow-mono">Nuevo</span>
          <span style="width:50px"></span>
        </div>
        <h1 class="t-display" style="margin-top:12px">Pago</h1>
      </div>

      <div class="stack-loose">
        <div>
          <label class="label">Tarjeta</label>
          <div class="chip-group" id="f-cards">
            ${cards.map((c) => `
              <button type="button" class="chip ${c.id === preselectedCardId ? 'active' : ''}" data-id="${c.id}">
                <span style="width:8px;height:8px;border-radius:50%;background:${c.color};display:inline-block"></span>
                ${c.name}
              </button>
            `).join('')}
          </div>
        </div>

        <div>
          <label class="label">Monto</label>
          <input class="input t-mono-lg" type="number" step="0.01" min="0" id="f-amount" autofocus inputmode="decimal" style="font-size:32px" />
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

        <button class="btn btn-ink btn-block btn-lg" id="f-save">Guardar pago</button>
      </div>
    </section>
  `;

  let selected = { card: preselectedCardId || cards[0].id, status: 'pending' };

  function bindGroup(group, key, valAttr = 'val') {
    group.addEventListener('click', (e) => {
      const b = e.target.closest(`[data-${valAttr}]`);
      if (!b || !group.contains(b)) return;
      e.preventDefault();
      e.stopPropagation();
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
    <div class="modal-handle"></div>
    <div class="modal-header">
      <div>
        <span class="t-eyebrow">Pago</span>
        <h3 class="t-display-sm" style="margin-top:2px">${card?.name || 'Tarjeta'}</h3>
      </div>
      <button class="btn btn-ghost btn-sm" data-act="close">✕</button>
    </div>
    <div class="modal-body stack">
      <div class="hero-stat grain">
        <div class="content">
          <div class="stat-label">Monto</div>
          <div class="stat-value"><span class="unit">$</span>${mxn(p.amount).replace('$','').trim()}</div>
          <div style="margin-top:6px;font-family:var(--f-mono);font-size:10.5px;letter-spacing:0.08em;text-transform:uppercase;color:var(--ink-60)">${fechaCorta(p.due_date)}</div>
        </div>
      </div>

      <div class="card stack-tight">
        <div class="row-between"><span class="t-small">Estado</span><span style="font-weight:500">${p.status === 'paid' ? 'Pagado' : p.status === 'partial' ? 'Parcial' : 'Pendiente'}</span></div>
        ${p.paid_date ? `<div class="row-between"><span class="t-small">Pagado el</span><span style="font-weight:500">${fechaCorta(p.paid_date)}</span></div>` : ''}
        ${p.notes ? `<div class="row-between"><span class="t-small">Notas</span><span style="font-weight:500">${p.notes}</span></div>` : ''}
      </div>

      <div class="row" style="gap:8px">
        ${p.status !== 'paid' ? `<button class="btn btn-ink btn-block" id="f-paid">Marcar pagado</button>` : '<div style="flex:1"></div>'}
        <button class="btn btn-ghost btn-block" id="f-del" style="color:var(--clay)">Eliminar</button>
      </div>
    </div>
  `, {
    onMount: ({ root: r, close }) => {
      r.querySelector('[data-act="close"]').onclick = close;
      const paidBtn = r.querySelector('#f-paid');
      if (paidBtn) {
        paidBtn.onclick = async () => {
          await updatePayment(p.id, { status: 'paid', paid_date: new Date().toISOString().slice(0, 10) });
          await refreshAll();
          close();
          toast('Marcado como pagado');
        };
      }
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
