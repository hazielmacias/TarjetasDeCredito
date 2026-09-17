import { getState, subscribe } from '../store.js';
import { mxn, fechaCorta, hoyISO } from '../utils/format.js';
import { renderBottomNav } from '../components/bottom-nav.js';
import { expenseList } from '../components/expense-item.js';
import { modal, toast } from '../utils/ui.js';
import { navigate } from '../router.js';
import { setMonth } from '../store.js';

export async function expensesView(root) {
  let state = getState();
  const unsubscribe = subscribe((s) => { state = s; render(); });

  function render() {
    const { expenses, categories, cards, currentMonth } = state;
    const { year, month } = currentMonth;
    const monthExpenses = expenses.filter((e) => e.year === year && e.month === month);

    const total = monthExpenses.reduce((s, e) => s + +e.amount, 0);

    const byCategory = {};
    monthExpenses.forEach((e) => {
      const cid = e.category_id || 'none';
      byCategory[cid] = (byCategory[cid] || 0) + +e.amount;
    });

    const topCategories = Object.entries(byCategory)
      .map(([id, amount]) => ({
        category: categories.find((c) => c.id === id),
        amount
      }))
      .filter((x) => x.category)
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 4);

    root.innerHTML = `
      <section class="page-enter px-5 pt-6">
        <header class="mb-5 flex items-center justify-between">
          <div>
            <h1 class="heading-xl">Gastos</h1>
            <p class="text-sm text-stone mt-1">${monthExpenses.length} este mes · ${mxn(total)}</p>
          </div>
          <button class="btn btn-primary" id="add-exp">+ Agregar</button>
        </header>

        ${topCategories.length ? `
          <div class="mb-5">
            <div class="section-title">Por categoría</div>
            <div class="card">
              ${topCategories.map((t) => {
                const pct = total > 0 ? (t.amount / total) * 100 : 0;
                return `
                  <div class="mb-3 last:mb-0">
                    <div class="flex justify-between text-sm mb-1">
                      <span class="flex items-center gap-2">
                        <span class="w-2 h-2 rounded-full" style="background:${t.category.color}"></span>
                        ${t.category.name}
                      </span>
                      <span class="font-semibold text-balance">${mxn(t.amount)}</span>
                    </div>
                    <div class="h-1.5 rounded-pill bg-paper-warmth overflow-hidden">
                      <div class="h-full rounded-pill" style="width:${pct}%;background:${t.category.color}"></div>
                    </div>
                  </div>
                `;
              }).join('')}
            </div>
          </div>
        ` : ''}

        <div class="mb-5">
          <div class="section-title">Movimientos</div>
          ${expenseList(monthExpenses, { categories, cards, emptyText: 'Sin gastos este mes' })}
        </div>
      </section>

      <button class="fab" id="fab">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M12 5v14M5 12h14" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
      </button>
    `;

    root.appendChild(renderBottomNav());

    root.querySelector('#add-exp').onclick = () => navigate('/expenses/new');
    root.querySelector('#fab').onclick = () => navigate('/expenses/new');

    root.querySelectorAll('[data-id]').forEach((el) => {
      el.onclick = () => openExpenseDetail(el.dataset.id);
    });
  }

  render();
  return () => unsubscribe();
}

export async function expenseFormView(root, qs = {}) {
  const state = getState();
  const { cards, categories, room, currentMonth } = state;

  root.innerHTML = `
    <section class="page-enter px-5 pt-6">
      <header class="mb-5 flex items-center justify-between">
        <button class="btn btn-text btn-sm" id="back">← Volver</button>
        <h1 class="heading-md">Nuevo gasto</h1>
        <span></span>
      </header>

      <div class="space-y-4">
        <div>
          <label class="label">Monto (MXN)</label>
          <input class="input" type="number" step="0.01" min="0" id="f-amount" placeholder="0.00" autofocus inputmode="decimal" />
        </div>

        <div>
          <label class="label">¿Dónde?</label>
          <input class="input" id="f-place" placeholder="Starbucks, Walmart, Uber..." />
        </div>

        <div>
          <label class="label">Categoría</label>
          <div class="chip-group" id="f-cat-group">
            ${categories.map((c) => `
              <button type="button" class="chip" data-id="${c.id}" data-color="${c.color}" style="--c:${c.color}">
                <span class="w-2 h-2 rounded-full" style="background:${c.color}"></span>
                ${c.name}
              </button>
            `).join('')}
          </div>
        </div>

        <div>
          <label class="label">Método de pago</label>
          <div class="chip-group" id="f-method-group">
            <button type="button" class="chip active" data-val="card">Tarjeta</button>
            <button type="button" class="chip" data-val="cash">Efectivo</button>
            <button type="button" class="chip" data-val="transfer">Transferencia</button>
          </div>
        </div>

        <div id="f-cards-wrap">
          <label class="label">Tarjeta</label>
          <div class="chip-group" id="f-cards-group">
            ${cards.map((c) => `
              <button type="button" class="chip" data-id="${c.id}" style="border-color:${c.color}">
                <span class="w-2 h-2 rounded-full" style="background:${c.color}"></span>
                ${c.name}
              </button>
            `).join('')}
          </div>
        </div>

        <div>
          <label class="label">¿De quién?</label>
          <div class="chip-group" id="f-owner-group">
            <button type="button" class="chip active" data-val="Haziel">Haziel</button>
            <button type="button" class="chip" data-val="Areli">Areli</button>
          </div>
        </div>

        <div>
          <label class="label">Fecha</label>
          <input class="input" type="date" id="f-date" value="${hoyISO()}" />
        </div>

        <button class="btn btn-primary btn-block btn-lg" id="f-save">Guardar gasto</button>
      </div>
    </section>
  `;

  let selected = { category: null, method: 'card', card: null, owner: 'Haziel' };

  function updateCardVisibility() {
    root.querySelector('#f-cards-wrap').style.display = selected.method === 'card' ? 'block' : 'none';
  }

  function bindChipGroup(group, key) {
    group.addEventListener('click', (e) => {
      const b = e.target.closest('[data-id], [data-val]');
      if (!b) return;
      group.querySelectorAll('.chip').forEach((c) => c.classList.remove('active'));
      b.classList.add('active');
      selected[key] = b.dataset.id || b.dataset.val;
      if (key === 'method') updateCardVisibility();
    });
  }

  bindChipGroup(root.querySelector('#f-cat-group'), 'category');
  bindChipGroup(root.querySelector('#f-method-group'), 'method');
  bindChipGroup(root.querySelector('#f-cards-group'), 'card');
  bindChipGroup(root.querySelector('#f-owner-group'), 'owner');

  root.querySelector('#back').onclick = () => history.length > 1 ? history.back() : navigate('/expenses');

  root.querySelector('#f-save').onclick = async () => {
    const amount = +root.querySelector('#f-amount').value;
    const place = root.querySelector('#f-place').value.trim();
    const dateStr = root.querySelector('#f-date').value;
    if (!amount || amount <= 0) return toast('Ingresa un monto válido');
    if (!place) return toast('Indica dónde fue');
    if (selected.method === 'card' && !selected.card) return toast('Selecciona una tarjeta');

    const date = new Date(dateStr);
    const payload = {
      room_id: room.id,
      card_id: selected.method === 'card' ? selected.card : null,
      category_id: selected.category || null,
      payment_method: selected.method,
      amount,
      place,
      owner: selected.owner,
      date: dateStr,
      month: date.getMonth() + 1,
      year: date.getFullYear()
    };

    try {
      const { createExpense } = await import('../api/expenses.js');
      await createExpense(payload);
      toast('Gasto guardado');
      const { refreshAll } = await import('../api/sync.js');
      await refreshAll();
      history.length > 1 ? history.back() : navigate('/expenses');
    } catch (e) {
      toast('Error: ' + e.message);
    }
  };
}

function openExpenseDetail(id) {
  const { expenses, categories, cards } = getState();
  const e = expenses.find((x) => x.id === id);
  if (!e) return;
  const cat = categories.find((c) => c.id === e.category_id);
  const card = e.card_id ? cards.find((c) => c.id === e.card_id) : null;

  modal(`
    <div class="modal-header">
      <h3 class="heading-md">Detalle del gasto</h3>
      <button class="btn btn-text btn-sm" data-act="close">✕</button>
    </div>
    <div class="modal-body">
      <div class="text-center mb-4">
        <div class="kpi-value">${mxn(e.amount)}</div>
        <div class="text-stone text-sm mt-1">${e.place}</div>
      </div>
      <div class="space-y-2 text-sm">
        <div class="flex justify-between"><span class="text-stone">Fecha</span><span>${fechaCorta(e.date)}</span></div>
        <div class="flex justify-between"><span class="text-stone">Categoría</span><span>${cat?.name || '—'}</span></div>
        <div class="flex justify-between"><span class="text-stone">Método</span><span>${e.payment_method === 'card' ? 'Tarjeta' : e.payment_method === 'cash' ? 'Efectivo' : 'Transferencia'}</span></div>
        ${card ? `<div class="flex justify-between"><span class="text-stone">Tarjeta</span><span>${card.name}</span></div>` : ''}
        <div class="flex justify-between"><span class="text-stone">Dueño</span><span>${e.owner || '—'}</span></div>
      </div>
      <button class="btn btn-danger btn-block mt-5" id="f-del">Eliminar gasto</button>
    </div>
  `, {
    onMount: ({ root: r, close }) => {
      r.querySelector('[data-act="close"]').onclick = close;
      r.querySelector('#f-del').onclick = async () => {
        const { confirm } = await import('../utils/ui.js');
        const ok = await confirm({ title: '¿Eliminar gasto?', danger: true });
        if (!ok) return;
        const { deleteExpense } = await import('../api/expenses.js');
        await deleteExpense(id);
        const { refreshAll } = await import('../api/sync.js');
        await refreshAll();
        close();
        toast('Gasto eliminado');
      };
    }
  });
}
