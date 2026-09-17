import { getState, subscribe } from '../store.js';
import { mxn, mesNombre, proximaFechaPorDia, diffDias } from '../utils/format.js';
import { renderBottomNav } from '../components/bottom-nav.js';
import { kpiGrid } from '../components/kpi-card.js';
import { cardItem } from '../components/card-item.js';
import { expenseList } from '../components/expense-item.js';
import { navigate } from '../router.js';
import { modal } from '../utils/ui.js';
import { setMonth } from '../store.js';
import { refreshAll } from '../api/sync.js';

export async function homeView(root) {
  let state = getState();
  const unsubscribe = subscribe((s) => {
    state = s;
    render();
  });

  function render() {
    const { room, cards, expenses, categories, payments, currentMonth } = state;
    const { year, month } = currentMonth;

    const monthExpenses = expenses.filter((e) => e.year === year && e.month === month);
    const totalMonth = monthExpenses.reduce((s, e) => s + +e.amount, 0);

    const spentByCard = {};
    monthExpenses.forEach((e) => {
      if (e.card_id) spentByCard[e.card_id] = (spentByCard[e.card_id] || 0) + +e.amount;
    });

    const proximosPagos = payments
      .filter((p) => p.status !== 'paid')
      .map((p) => ({ ...p, card: cards.find((c) => c.id === p.card_id) }))
      .filter((p) => p.card)
      .sort((a, b) => new Date(a.due_date) - new Date(b.due_date))
      .slice(0, 2);

    const disponibles = cards.reduce((acc, c) => acc + Math.max(0, +c.credit_limit - (spentByCard[c.id] || 0)), 0);

    root.innerHTML = `
      <section class="page-enter px-5 pt-6">
        <header class="mb-6">
          <div class="flex items-center justify-between mb-1">
            <span class="text-xs text-stone">Hola,</span>
            <span class="text-xs text-stone">${room?.name || 'Nuestras Finanzas'}</span>
          </div>
          <h1 class="heading-xl">${mesNombre(month)} ${year}</h1>
          <button id="month-toggle" class="text-sm text-notion-blue mt-1">Ver historial →</button>
        </header>

        ${kpiGrid([
          { label: 'Gastado este mes', value: mxn(totalMonth), accent: 'blue' },
          { label: 'Disponible total', value: mxn(disponibles), accent: 'sky' }
        ])}

        <div class="mt-4">
          ${kpiGrid([
            { label: 'Tarjetas', value: cards.length, accent: 'marigold' },
            { label: 'Gastos', value: monthExpenses.length, accent: 'coral' }
          ])}
        </div>

        ${proximosPagos.length ? `
          <div class="mt-6">
            <div class="section-title">Próximos pagos</div>
            <div class="space-y-2">
              ${proximosPagos.map((p) => {
                const dias = diffDias(p.due_date);
                const tono = dias <= 1 ? 'coral' : dias <= 3 ? 'marigold' : 'sky';
                return `
                  <div class="list-item" data-id="${p.id}">
                    <div class="w-10 h-10 rounded-card flex items-center justify-center" style="background:${p.card.color}22">
                      <span class="font-semibold text-sm" style="color:${p.card.color}">${p.card.name.slice(0, 2).toUpperCase()}</span>
                    </div>
                    <div class="flex-1 min-w-0">
                      <div class="font-medium truncate">${p.card.name}</div>
                      <div class="text-xs text-stone">${p.card.bank || '—'} · ${dias <= 0 ? 'Vence hoy' : dias === 1 ? 'Mañana' : `en ${dias} días`}</div>
                    </div>
                    <div class="text-right">
                      <div class="font-semibold text-balance">${mxn(p.amount)}</div>
                      <span class="pill pill-${tono}" style="padding:1px 8px;font-size:10px">${p.status === 'partial' ? 'Parcial' : 'Pendiente'}</span>
                    </div>
                  </div>
                `;
              }).join('')}
            </div>
          </div>
        ` : ''}

        <div class="mt-6">
          <div class="section-title">Tarjetas</div>
          <div class="space-y-3">
            ${cards.slice(0, 3).map((c) => cardItem(c, { spent: spentByCard[c.id] || 0 })).join('')}
            ${cards.length > 3 ? `<button class="btn btn-text btn-block" id="see-all-cards">Ver todas (${cards.length})</button>` : ''}
            ${!cards.length ? `<div class="empty-state">Sin tarjetas todavía</div>` : ''}
          </div>
        </div>

        <div class="mt-6">
          <div class="section-title">Últimos gastos</div>
          ${expenseList(monthExpenses.slice(0, 5), { categories, cards })}
        </div>
      </section>

      <button class="fab" id="fab">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <path d="M12 5v14M5 12h14" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        </svg>
      </button>
    `;

    root.appendChild(renderBottomNav());

    root.querySelector('#fab').addEventListener('click', () => {
      navigate('/expenses/new');
    });
    root.querySelector('#month-toggle').addEventListener('click', () => {
      navigate('/history');
    });
    const seeAll = root.querySelector('#see-all-cards');
    if (seeAll) seeAll.onclick = () => navigate('/cards');
  }

  render();

  return () => unsubscribe();
}
