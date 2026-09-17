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
      <section class="page-enter px-5 pt-6">
        <header class="mb-5">
          <button class="btn btn-text btn-sm mb-2" id="back">← Volver</button>
          <h1 class="heading-xl">Historial</h1>
        </header>

        <div class="card mb-5">
          <div class="flex items-center gap-2">
            <button class="btn btn-text" id="prev-month">←</button>
            <div class="flex-1 text-center">
              <div class="heading-md">${mesNombre(month)} ${year}</div>
            </div>
            <button class="btn btn-text" id="next-month">→</button>
          </div>
          <div class="flex gap-2 mt-3 justify-center">
            <select class="select" id="sel-month" style="max-width:140px">
              ${[1,2,3,4,5,6,7,8,9,10,11,12].map((m) => `<option value="${m}" ${m === month ? 'selected' : ''}>${mesNombre(m)}</option>`).join('')}
            </select>
            <select class="select" id="sel-year" style="max-width:100px">
              ${years.map((y) => `<option value="${y}" ${y === year ? 'selected' : ''}>${y}</option>`).join('')}
            </select>
          </div>
        </div>

        <div class="card mb-5">
          <div class="grid grid-cols-3 gap-3 text-center">
            <div>
              <div class="text-xs text-stone">Gastos</div>
              <div class="font-semibold text-balance">${monthExpenses.length}</div>
            </div>
            <div>
              <div class="text-xs text-stone">Total</div>
              <div class="font-semibold text-balance">${mxn(total)}</div>
            </div>
            <div>
              <div class="text-xs text-stone">Pagos</div>
              <div class="font-semibold text-balance">${monthPayments.length}</div>
            </div>
          </div>
        </div>

        <div class="section-title">Gastos del mes</div>
        ${expenseList(monthExpenses, { categories, cards, emptyText: 'Sin gastos en este mes' })}
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
