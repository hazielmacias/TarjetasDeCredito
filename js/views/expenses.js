import { getState, subscribe } from '../store.js';
import { mxn, fechaCorta, hoyISO } from '../utils/format.js';
import { renderBottomNav } from '../components/bottom-nav.js';
import { expenseList } from '../components/expense-item.js';
import { modal, toast } from '../utils/ui.js';
import { navigate } from '../router.js';

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
      <section class="page-enter page">
        <div class="page-header row-between">
          <div>
            <span class="t-eyebrow">Movimientos</span>
            <h1 class="t-display" style="margin-top:4px">Gastos</h1>
            <div class="t-small" style="margin-top:4px"><span class="t-mono">${monthExpenses.length}</span> este mes · <span class="t-mono">${mxn(total)}</span></div>
          </div>
          <button class="btn btn-ink btn-sm" id="add-exp">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M12 5v14M5 12h14" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
            Agregar
          </button>
        </div>

        ${topCategories.length ? `
          <div style="margin-bottom:32px">
            <div class="section-header">
              <span class="t-eyebrow">Por categoría</span>
            </div>
            <div class="card">
              ${topCategories.map((t) => {
                const pct = total > 0 ? (t.amount / total) * 100 : 0;
                return `
                  <div style="margin-bottom:16px">
                    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">
                      <div style="display:flex;align-items:center;gap:8px">
                        <span style="width:8px;height:8px;border-radius:50%;background:${t.category.color}"></span>
                        <span style="font-size:13.5px;font-weight:500">${t.category.name}</span>
                      </div>
                      <span class="amount" style="font-size:14px">${mxn(t.amount)}</span>
                    </div>
                    <div class="progress">
                      <div class="progress-bar" style="width:${pct}%;background:${t.category.color}"></div>
                    </div>
                  </div>
                `;
              }).join('')}
            </div>
          </div>
        ` : ''}

        <div>
          <div class="section-header">
            <span class="t-eyebrow">Movimientos del mes</span>
          </div>
          ${expenseList(monthExpenses, { categories, cards, emptyText: 'Sin gastos este mes.' })}
        </div>
      </section>

      <button class="fab" id="fab" aria-label="Nuevo gasto">
        <svg viewBox="0 0 24 24" fill="none"><path d="M12 5v14M5 12h14" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
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
  const deviceOwner = (() => { try { return localStorage.getItem('nf-device-owner') || 'Haziel'; } catch { return 'Haziel'; } })();

  root.innerHTML = `
    <section class="page-enter page">
      <div class="page-header with-back">
        <div class="row" style="justify-content:space-between">
          <button class="btn-link btn-link-back btn-sm" id="back" style="border:none;cursor:pointer;background:transparent">Volver</button>
          <span class="t-eyebrow-mono">Nuevo</span>
          <span style="width:50px"></span>
        </div>
        <h1 class="t-display" style="margin-top:12px">Gasto</h1>
      </div>

      <div class="stack-loose">
        <div>
          <label class="label">Monto</label>
          <input class="input t-mono-lg" type="number" step="0.01" min="0" id="f-amount" placeholder="0.00" autofocus inputmode="decimal" style="font-size:32px" />
        </div>

        <div>
          <label class="label">¿Dónde?</label>
          <input class="input" id="f-place" placeholder="Starbucks, Walmart, Uber..." />
        </div>

        <div>
          <label class="label">Categoría</label>
          <div class="chip-group" id="f-cat-group">
            ${categories.map((c) => `
              <button type="button" class="chip" data-id="${c.id}">
                <span style="width:8px;height:8px;border-radius:50%;background:${c.color};display:inline-block"></span>
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
              <button type="button" class="chip" data-id="${c.id}">
                <span style="width:8px;height:8px;border-radius:50%;background:${c.color};display:inline-block"></span>
                ${c.name}
              </button>
            `).join('')}
          </div>
        </div>

        <div>
          <label class="label">¿De quién?</label>
          <div class="chip-group" id="f-owner-group">
            <button type="button" class="chip ${deviceOwner === 'Haziel' ? 'active' : ''}" data-val="Haziel">Haziel</button>
            <button type="button" class="chip ${deviceOwner === 'Areli' ? 'active' : ''}" data-val="Areli">Areli</button>
          </div>
        </div>

        <div>
          <label class="label">Fecha</label>
          <input class="input" type="date" id="f-date" value="${hoyISO()}" />
        </div>

        <button class="btn btn-ink btn-block btn-lg" id="f-save">Guardar gasto</button>
      </div>
    </section>
  `;

  let selected = { category: null, method: 'card', card: null, owner: deviceOwner };

  function updateCardVisibility() {
    root.querySelector('#f-cards-wrap').style.display = selected.method === 'card' ? 'block' : 'none';
  }

  function bindChipGroup(group, key) {
    group.addEventListener('click', (e) => {
      const b = e.target.closest('[data-id], [data-val]');
      if (!b || !group.contains(b)) return;
      e.preventDefault();
      e.stopPropagation();
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
    <div class="modal-handle"></div>
    <div class="modal-header">
      <div>
        <span class="t-eyebrow">Detalle</span>
        <h3 class="t-display-sm" style="margin-top:2px">${e.place}</h3>
      </div>
      <button class="btn btn-ghost btn-sm" data-act="close">✕</button>
    </div>
    <div class="modal-body stack">
      <div class="hero-stat grain">
        <div class="content">
          <div class="stat-label">Monto</div>
          <div class="stat-value"><span class="unit">$</span>${mxn(e.amount).replace('$','').trim()}</div>
          <div style="margin-top:6px;font-family:var(--f-mono);font-size:10.5px;letter-spacing:0.08em;text-transform:uppercase;color:var(--ink-60)">${fechaCorta(e.date)}</div>
        </div>
      </div>

      <div class="card stack-tight">
        ${cat ? `<div class="row-between"><span class="t-small">Categoría</span><span style="font-weight:500">${cat.name}</span></div>` : ''}
        <div class="row-between"><span class="t-small">Método</span><span style="font-weight:500">${e.payment_method === 'card' ? 'Tarjeta' : e.payment_method === 'cash' ? 'Efectivo' : 'Transferencia'}</span></div>
        ${card ? `<div class="row-between"><span class="t-small">Tarjeta</span><span style="font-weight:500">${card.name}</span></div>` : ''}
        ${e.owner ? `<div class="row-between"><span class="t-small">Dueño</span><span style="font-weight:500">${e.owner}</span></div>` : ''}
      </div>

      <button class="btn btn-ghost btn-block btn-sm" id="f-del" style="color:var(--clay)">Eliminar gasto</button>
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
