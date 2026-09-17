import { getState, subscribe, setMonth } from '../store.js';
import { mxn, mesNombre, fechaCorta } from '../utils/format.js';
import { renderBottomNav } from '../components/bottom-nav.js';
import { expenseList } from '../components/expense-item.js';

export async function historyView(root) {
  let state = getState();
  const unsubscribe = subscribe((s) => { state = s; render(); });

  function render() {
    const { expenses, categories, cards, payments, currentMonth } = state;
    const { year, month } = currentMonth;

    const monthExpenses = expenses.filter((e) => e.year === year && e.month === month);
    const monthPayments = payments.filter((p) => p.year === year && p.month === month);
    const total = monthExpenses.reduce((s, e) => s + +e.amount, 0);

    const years = [...new Set(expenses.map((e) => e.year))].sort((a, b) => b - a);
    if (!years.includes(year)) years.unshift(year);

    root.innerHTML = `
      <section class="page-enter page">
        <div class="page-header with-back">
          <button class="btn-link btn-link-back btn-sm" id="back" style="border:none;cursor:pointer;background:transparent;padding:0">Volver</button>
          <h1 class="t-display" style="margin-top:12px">Historial</h1>
        </div>

        <div class="card" style="margin-bottom:24px">
          <div class="row" style="justify-content:space-between;align-items:center">
            <button class="btn btn-ghost btn-sm" id="prev-month" style="width:36px;padding:8px">←</button>
            <div class="t-display-sm" style="font-family:var(--f-display);font-weight:500">${mesNombre(month)} ${year}</div>
            <button class="btn btn-ghost btn-sm" id="next-month" style="width:36px;padding:8px">→</button>
          </div>
          <div class="grid-2" style="margin-top:16px">
            <select class="select" id="sel-month">
              ${[1,2,3,4,5,6,7,8,9,10,11,12].map((m) => `<option value="${m}" ${m === month ? 'selected' : ''}>${mesNombre(m)}</option>`).join('')}
            </select>
            <select class="select" id="sel-year">
              ${years.map((y) => `<option value="${y}" ${y === year ? 'selected' : ''}>${y}</option>`).join('')}
            </select>
          </div>
        </div>

        <div class="grid-3" style="margin-bottom:32px">
          <div class="card card-tinted">
            <div class="stat-label">Movimientos</div>
            <div class="stat-value t-mono" style="font-size:24px;margin-top:6px">${monthExpenses.length}</div>
          </div>
          <div class="card card-tinted">
            <div class="stat-label">Total</div>
            <div class="stat-value t-mono" style="font-size:18px;margin-top:6px">${mxn(total)}</div>
          </div>
          <div class="card card-tinted">
            <div class="stat-label">Pagos</div>
            <div class="stat-value t-mono" style="font-size:24px;margin-top:6px">${monthPayments.length}</div>
          </div>
        </div>

        <div>
          <div class="section-header">
            <span class="t-eyebrow">Gastos del mes</span>
          </div>
          ${expenseList(monthExpenses, { categories, cards, emptyText: 'Sin gastos en este mes.' })}
        </div>
      </section>
    `;

    root.appendChild(renderBottomNav());

    function changeMonth(delta) {
      let m = month + delta;
      let y = year;
      if (m < 1) { m = 12; y -= 1; }
      if (m > 12) { m = 1; y += 1; }
      setMonth(y, m);
    }

    root.querySelector('#prev-month').onclick = () => changeMonth(-1);
    root.querySelector('#next-month').onclick = () => changeMonth(1);
    root.querySelector('#sel-month').onchange = (e) => setMonth(year, +e.target.value);
    root.querySelector('#sel-year').onchange = (e) => setMonth(+e.target.value, month);
    root.querySelector('#back').onclick = () => history.back();
  }

  render();
  return () => unsubscribe();
}
