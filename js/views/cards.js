import { getState, subscribe } from '../store.js';
import { mxn, fechaCorta } from '../utils/format.js';
import { renderBottomNav } from '../components/bottom-nav.js';
import { cardList } from '../components/card-item.js';
import { navigate } from '../router.js';
import { modal, confirm, toast } from '../utils/ui.js';
import { createCard, updateCard, deleteCard } from '../api/cards.js';
import { refreshAll } from '../api/sync.js';

export async function cardsView(root) {
  let state = getState();
  const unsubscribe = subscribe((s) => { state = s; render(); });

  function render() {
    const { cards, expenses, currentMonth } = state;
    const { year, month } = currentMonth;

    const spentByCard = {};
    expenses.filter((e) => e.year === year && e.month === month).forEach((e) => {
      if (e.card_id) spentByCard[e.card_id] = (spentByCard[e.card_id] || 0) + +e.amount;
    });

    const totalLimit = cards.reduce((s, c) => s + +c.credit_limit, 0);
    const totalSpent = Object.values(spentByCard).reduce((s, v) => s + v, 0);

    root.innerHTML = `
      <section class="page-enter page">
        <div class="page-header row-between">
          <div>
            <span class="t-eyebrow">Cartera</span>
            <h1 class="t-display" style="margin-top:4px">Tarjetas</h1>
            <div class="t-small" style="margin-top:4px">${cards.length} activa${cards.length === 1 ? '' : 's'}</div>
          </div>
          <button class="btn btn-ink btn-sm" id="add-card">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M12 5v14M5 12h14" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
            Agregar
          </button>
        </div>

        ${cards.length ? `
          <div class="card card-tinted" style="margin-bottom:24px">
            <div class="grid-2">
              <div class="stat-block">
                <div class="stat-label">Total gastado</div>
                <div class="stat-value t-mono" style="font-size:22px">${mxn(totalSpent)}</div>
              </div>
              <div class="stat-block">
                <div class="stat-label">Límite combinado</div>
                <div class="stat-value t-mono" style="font-size:22px;color:var(--ink-60)">${mxn(totalLimit)}</div>
              </div>
            </div>
          </div>
        ` : ''}

        <div id="cards-container">${cardList(cards, { spentByCard })}</div>
      </section>

      <button class="fab" id="fab" aria-label="Nueva tarjeta">
        <svg viewBox="0 0 24 24" fill="none"><path d="M12 5v14M5 12h14" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
      </button>
    `;

    root.appendChild(renderBottomNav());

    root.querySelector('#add-card').addEventListener('click', () => openCardForm());
    root.querySelector('#fab').addEventListener('click', () => openCardForm());

    root.querySelectorAll('[data-id]').forEach((el) => {
      el.addEventListener('click', () => {
        const card = cards.find((c) => c.id === el.dataset.id);
        if (card) openCardDetail(card);
      });
    });
  }

  render();
  return () => unsubscribe();
}

function openCardForm(existing = null) {
  const isEdit = !!existing;
  const colors = [
    { v: '#c5471e', label: 'Terracota' },
    { v: '#2e4a6b', label: 'Egeo' },
    { v: '#4a5d3a', label: 'Oliva' },
    { v: '#6b3e5e', label: 'Ciruela' },
    { v: '#d4a017', label: 'Ocre' },
    { v: '#1a1814', label: 'Tinta' }
  ];

  modal(`
    <div class="modal-handle"></div>
    <div class="modal-header">
      <div>
        <span class="t-eyebrow">${isEdit ? 'Editar' : 'Nueva'}</span>
        <h3 class="t-display-sm" style="margin-top:2px">${isEdit ? 'Tarjeta' : 'Tarjeta de crédito'}</h3>
      </div>
      <button class="btn btn-ghost btn-sm" data-act="close">Cerrar</button>
    </div>
    <div class="modal-body stack">
      <div>
        <label class="label">Dueño</label>
        <div class="chip-group" data-group="owner">
          <button type="button" class="chip ${(existing?.owner || 'Haziel') === 'Haziel' ? 'active' : ''}" data-val="Haziel">Haziel</button>
          <button type="button" class="chip ${existing?.owner === 'Areli' ? 'active' : ''}" data-val="Areli">Areli</button>
        </div>
      </div>
      <div>
        <label class="label">Nombre</label>
        <input class="input" id="f-name" placeholder="Ej. Platinum" value="${existing?.name || ''}" />
      </div>
      <div>
        <label class="label">Banco</label>
        <input class="input" id="f-bank" placeholder="Ej. BBVA, Banamex..." value="${existing?.bank || ''}" />
      </div>
      <div class="grid-2">
        <div>
          <label class="label">Día de corte</label>
          <input class="input" type="number" min="1" max="31" id="f-cutoff" value="${existing?.cutoff_day || 15}" />
        </div>
        <div>
          <label class="label">Día de pago</label>
          <input class="input" type="number" min="1" max="31" id="f-payment" value="${existing?.payment_day || 5}" />
        </div>
      </div>
      <div>
        <label class="label">Límite de crédito (MXN)</label>
        <input class="input" type="number" min="0" id="f-limit" value="${existing?.credit_limit || 0}" />
      </div>
      <div>
        <label class="label">Color</label>
        <div class="chip-group" data-group="color">
          ${colors.map((c) => `
            <button type="button" class="chip ${(existing?.color || colors[0].v) === c.v ? 'active' : ''}" data-val="${c.v}" style="${(existing?.color || colors[0].v) === c.v ? `background:${c.v};color:#fff;border-color:${c.v}` : ''}">
              <span style="width:10px;height:10px;border-radius:50%;background:${c.v};display:inline-block"></span>
              ${c.label}
            </button>
          `).join('')}
        </div>
      </div>
      <button class="btn btn-ink btn-block btn-lg" id="f-save">${isEdit ? 'Guardar cambios' : 'Crear tarjeta'}</button>
      ${isEdit ? `<button class="btn btn-ghost btn-block btn-sm" id="f-delete" style="color:var(--clay)">Eliminar tarjeta</button>` : ''}
    </div>
  `, {
    onMount: ({ root: r, close }) => {
      let owner = existing?.owner || 'Haziel';
      let color = existing?.color || colors[0].v;

      r.querySelector('[data-group="owner"]').addEventListener('click', (e) => {
        const b = e.target.closest('[data-val]');
        if (!b) return;
        e.preventDefault();
        e.stopPropagation();
        owner = b.dataset.val;
        r.querySelectorAll('[data-group="owner"] .chip').forEach((c) => c.classList.remove('active'));
        b.classList.add('active');
      });

      r.querySelector('[data-group="color"]').addEventListener('click', (e) => {
        const b = e.target.closest('[data-val]');
        if (!b) return;
        e.preventDefault();
        e.stopPropagation();
        color = b.dataset.val;
        r.querySelectorAll('[data-group="color"] .chip').forEach((c) => {
          c.classList.remove('active');
          c.style.background = '';
          c.style.color = '';
          c.style.borderColor = '';
        });
        b.classList.add('active');
        b.style.background = color;
        b.style.color = '#fff';
        b.style.borderColor = color;
      });

      r.querySelector('[data-act="close"]').onclick = close;
      r.querySelector('#f-save').onclick = async () => {
        const payload = {
          name: r.querySelector('#f-name').value.trim(),
          bank: r.querySelector('#f-bank').value.trim() || null,
          cutoff_day: +r.querySelector('#f-cutoff').value,
          payment_day: +r.querySelector('#f-payment').value,
          credit_limit: +r.querySelector('#f-limit').value || 0,
          owner,
          color
        };
        if (!payload.name) return toast('El nombre es obligatorio');
        try {
          if (isEdit) {
            await updateCard(existing.id, payload);
            toast('Tarjeta actualizada');
          } else {
            const { room } = getState();
            await createCard({ ...payload, room_id: room.id, active: true });
            toast('Tarjeta creada');
          }
          await refreshAll();
          close();
        } catch (e) {
          toast('Error: ' + e.message);
        }
      };

      const del = r.querySelector('#f-delete');
      if (del) {
        del.onclick = async () => {
          const ok = await confirm({ title: '¿Eliminar tarjeta?', message: 'Se desactivará pero no se borrarán sus gastos.', danger: true });
          if (!ok) return;
          await deleteCard(existing.id);
          await refreshAll();
          close();
          toast('Tarjeta eliminada');
        };
      }
    }
  });
}

function openCardDetail(card) {
  const { expenses, payments } = getState();
  const cardExpenses = expenses.filter((e) => e.card_id === card.id).slice(0, 20);
  const cardPayments = payments.filter((p) => p.card_id === card.id).slice(0, 10);
  const disponible = Math.max(0, +card.credit_limit - cardExpenses.reduce((s, e) => s + +e.amount, 0));

  modal(`
    <div class="modal-handle"></div>
    <div class="modal-header">
      <div>
        <span class="t-eyebrow">${card.bank || 'Tarjeta'}</span>
        <h3 class="t-display-sm" style="margin-top:2px">${card.name}</h3>
      </div>
      <button class="btn btn-ghost btn-sm" data-act="close">✕</button>
    </div>
    <div class="modal-body stack">
      <div class="hero-stat grain">
        <div class="content">
          <div class="stat-label">Disponible</div>
          <div class="stat-value"><span class="unit">$</span>${mxn(disponible).replace('$','').trim()}</div>
          <div style="margin-top:8px;font-family:var(--f-mono);font-size:10.5px;letter-spacing:0.08em;text-transform:uppercase;color:var(--ink-60)">
            de ${mxn(card.credit_limit)}
          </div>
        </div>
      </div>

      <div class="grid-2">
        <div class="card card-tinted">
          <div class="stat-label">Día de corte</div>
          <div class="t-display-sm" style="margin-top:4px;font-family:var(--f-display);font-weight:500;font-size:28px">${card.cutoff_day}</div>
        </div>
        <div class="card card-tinted">
          <div class="stat-label">Día de pago</div>
          <div class="t-display-sm" style="margin-top:4px;font-family:var(--f-display);font-weight:500;font-size:28px">${card.payment_day}</div>
        </div>
      </div>

      <div class="row" style="gap:8px">
        <button class="btn btn-ink btn-block" id="pay-btn">Registrar pago</button>
        <button class="btn btn-ghost btn-block" id="edit-btn">Editar</button>
      </div>

      <div>
        <div class="section-header">
          <span class="t-eyebrow">Pagos recientes</span>
        </div>
        ${cardPayments.length ? `<div class="list">${cardPayments.map((p) => `
          <div class="list-row">
            <div style="flex:1">
              <div class="name">${fechaCorta(p.due_date)}</div>
              <div class="meta">${p.month}/${p.year} · ${p.notes || '—'}</div>
            </div>
            <div class="right">
              <div class="amount">${mxn(p.amount)}</div>
              <div style="margin-top:4px"><span class="pill ${p.status === 'paid' ? 'pill-haziel' : p.status === 'partial' ? 'pill-ochre' : 'pill-clay'}">${p.status === 'paid' ? 'Pagado' : p.status === 'partial' ? 'Parcial' : 'Pendiente'}</span></div>
            </div>
          </div>
        `).join('')}</div>` : `<div class="empty" style="padding:24px">Sin pagos aún</div>`}
      </div>
    </div>
  `, {
    onMount: ({ root: r, close }) => {
      r.querySelector('[data-act="close"]').onclick = close;
      r.querySelector('#pay-btn').onclick = () => { close(); navigate(`/payments/new?card=${card.id}`); };
      r.querySelector('#edit-btn').onclick = () => { close(); openCardForm(card); };
    }
  });
}
