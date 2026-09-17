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

    root.innerHTML = `
      <section class="page-enter px-5 pt-6">
        <header class="mb-5 flex items-center justify-between">
          <div>
            <h1 class="heading-xl">Tarjetas</h1>
            <p class="text-sm text-stone mt-1">${cards.length} registrada${cards.length === 1 ? '' : 's'}</p>
          </div>
          <button class="btn btn-primary" id="add-card">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M12 5v14M5 12h14" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
            Agregar
          </button>
        </header>

        <div id="cards-container">
          ${cardList(cards, { spentByCard })}
        </div>
      </section>

      <button class="fab" id="fab">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M12 5v14M5 12h14" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
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
    { v: '#0075de', label: 'Azul' },
    { v: '#f64932', label: 'Coral' },
    { v: '#ffb110', label: 'Marigold' },
    { v: '#62aef0', label: 'Cielo' },
    { v: '#02093a', label: 'Noche' },
    { v: '#b18164', label: 'Mocha' }
  ];

  modal(`
    <div class="modal-header">
      <h3 class="heading-md">${isEdit ? 'Editar' : 'Nueva'} tarjeta</h3>
      <button class="btn btn-text btn-sm" data-act="close">Cancelar</button>
    </div>
    <div class="modal-body space-y-3">
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
        <input class="input" id="f-bank" placeholder="Ej. BBVA" value="${existing?.bank || ''}" />
      </div>
      <div class="grid grid-cols-2 gap-3">
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
          ${colors.map((c, i) => `<button type="button" class="chip ${(existing?.color || colors[0].v) === c.v ? 'active' : ''}" data-val="${c.v}" style="${i === 0 ? 'background:'+c.v+';color:#fff' : ''}">${c.label}</button>`).join('')}
        </div>
      </div>
      <button class="btn btn-primary btn-block btn-lg" id="f-save">${isEdit ? 'Guardar cambios' : 'Crear tarjeta'}</button>
      ${isEdit ? `<button class="btn btn-text btn-block btn-sm text-coral" id="f-delete">Eliminar tarjeta</button>` : ''}
    </div>
  `, {
    onMount: ({ root: r, close }) => {
      let owner = existing?.owner || 'Haziel';
      let color = existing?.color || colors[0].v;

      r.querySelector('[data-group="owner"]').addEventListener('click', (e) => {
        const b = e.target.closest('[data-val]');
        if (!b) return;
        owner = b.dataset.val;
        r.querySelectorAll('[data-group="owner"] .chip').forEach((c) => c.classList.remove('active'));
        b.classList.add('active');
      });

      r.querySelector('[data-group="color"]').addEventListener('click', (e) => {
        const b = e.target.closest('[data-val]');
        if (!b) return;
        color = b.dataset.val;
        r.querySelectorAll('[data-group="color"] .chip').forEach((c) => c.classList.remove('active'));
        b.classList.add('active');
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

  modal(`
    <div class="modal-header">
      <div>
        <h3 class="heading-md">${card.name}</h3>
        <p class="text-sm text-stone">${card.bank || ''} · ${card.owner}</p>
      </div>
      <button class="btn btn-text btn-sm" data-act="close">✕</button>
    </div>
    <div class="modal-body">
      <div class="card-tight card mb-3">
        <div class="grid grid-cols-2 gap-3 text-sm">
          <div>
            <div class="text-xs text-stone">Día de corte</div>
            <div class="font-semibold">${card.cutoff_day}</div>
          </div>
          <div>
            <div class="text-xs text-stone">Día de pago</div>
            <div class="font-semibold">${card.payment_day}</div>
          </div>
          <div>
            <div class="text-xs text-stone">Límite</div>
            <div class="font-semibold">${mxn(card.credit_limit)}</div>
          </div>
          <div>
            <div class="text-xs text-stone">Disponible</div>
            <div class="font-semibold">${mxn(Math.max(0, +card.credit_limit - cardExpenses.reduce((s, e) => s + +e.amount, 0)))}</div>
          </div>
        </div>
      </div>

      <div class="flex gap-2 mb-4">
        <button class="btn btn-primary btn-block" id="pay-btn">Registrar pago</button>
        <button class="btn btn-text btn-block" id="edit-btn">Editar</button>
      </div>

      <div class="section-title">Historial de pagos</div>
      ${cardPayments.length ? cardPayments.map((p) => `
        <div class="list-item">
          <div class="flex-1">
            <div class="font-medium">${fechaCorta(p.due_date)} · ${p.year}/${String(p.month).padStart(2,'0')}</div>
            <div class="text-xs text-stone">${p.notes || '—'}</div>
          </div>
          <div class="text-right">
            <div class="font-semibold">${mxn(p.amount)}</div>
            <span class="pill ${p.status === 'paid' ? 'pill-sky' : p.status === 'partial' ? 'pill-marigold' : 'pill-coral'}" style="padding:1px 8px;font-size:10px">
              ${p.status === 'paid' ? 'Pagado' : p.status === 'partial' ? 'Parcial' : 'Pendiente'}
            </span>
          </div>
        </div>
      `).join('') : '<div class="empty-state text-sm">Sin pagos registrados</div>'}
    </div>
  `, {
    onMount: ({ root: r, close }) => {
      r.querySelector('[data-act="close"]').onclick = close;
      r.querySelector('#pay-btn').onclick = () => { close(); navigate(`/payments/new?card=${card.id}`); };
      r.querySelector('#edit-btn').onclick = () => { close(); openCardForm(card); };
    }
  });
}
