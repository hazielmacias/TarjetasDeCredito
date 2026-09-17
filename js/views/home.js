import { getState, subscribe } from '../store.js';
import { mxn, mesNombre, diffDias } from '../utils/format.js';
import { renderBottomNav } from '../components/bottom-nav.js';
import { kpiGrid } from '../components/kpi-card.js';
import { cardItem } from '../components/card-item.js';
import { expenseList } from '../components/expense-item.js';
import { navigate } from '../router.js';

export async function homeView(root) {
  let state = getState();
  const unsubscribe = subscribe((s) => {
    state = s;
    render();
  });

  function render() {
    const { room, cards, expenses, payments, currentMonth } = state;
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
      .slice(0, 3);

    const disponibles = cards.reduce((acc, c) => acc + Math.max(0, +c.credit_limit - (spentByCard[c.id] || 0)), 0);

    const ownerName = room?.owner_name || 'Haziel';

    root.innerHTML = `
      <section class="page-enter page">
        <div class="page-header">
          <div class="row-between" style="margin-bottom:32px">
            <div class="brand-mark"><span class="dot"></span>N · F</div>
            <span class="folio">Folio · ${String(new Date().getDate()).padStart(2,'0')}.${String(month).padStart(2,'0')}</span>
          </div>

          <div style="margin-bottom:6px">
            <span class="t-eyebrow">Hola, ${ownerName}</span>
          </div>

          <h1 class="t-display-xl">
            <span class="t-display-italic" style="color:var(--ink-60)">${mesNombre(month)}</span><br>
            ${year}.
          </h1>

          <p class="t-serif-body" style="margin-top:16px">
            <span class="hl-pill">${monthExpenses.length}</span> movimientos este mes —
            ${totalMonth === 0 ? 'un lienzo en blanco.' : `acumulando ${mxn(totalMonth)}.`}
          </p>
        </div>

        <div class="hero-stat grain" style="margin-bottom:24px">
          <div class="content">
            <div class="row-between" style="margin-bottom:8px">
              <div class="t-eyebrow-mono">Gastado este mes</div>
              <span class="pill pill-ochre">${monthExpenses.length} mov.</span>
            </div>
            <div class="stat-value">
              <span class="unit">$</span>${formatNum(totalMonth)}
            </div>
            <div class="row-between" style="margin-top:14px;font-family:var(--f-mono);font-size:10.5px;letter-spacing:0.08em;text-transform:uppercase;color:var(--ink-60)">
              <span>Disponible</span>
              <span style="font-family:var(--f-mono);font-weight:500;color:var(--ink)">${mxn(disponibles)}</span>
            </div>
          </div>
        </div>

        ${kpiGrid([
          { label: 'Tarjetas', value: cards.length, accent: 'ink' },
          { label: 'Pagos pend.', value: proximosPagos.length, accent: 'ink' }
        ])}

        ${proximosPagos.length ? `
          <div style="margin-top:32px">
            <div class="section-header">
              <span class="t-eyebrow">Próximos pagos</span>
              <button class="btn-link btn-sm" id="go-payments" style="border:none;cursor:pointer">Ver todos</button>
            </div>
            <div class="list">
              ${proximosPagos.map((p) => {
                const dias = diffDias(p.due_date);
                const tono = dias <= 1 ? 'pill-clay' : dias <= 3 ? 'pill-ochre' : '';
                const fecha = dias <= 0 ? 'Vence hoy' : dias === 1 ? 'Mañana' : `en ${dias} días`;
                return `
                  <div class="list-row" data-id="${p.id}">
                    <div class="avatar" style="background:${p.card.color}">${p.card.name.slice(0, 2).toUpperCase()}</div>
                    <div style="flex:1;min-width:0">
                      <div class="name" style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${p.card.name}</div>
                      <div class="meta">${p.card.bank || ''} · ${fecha}</div>
                    </div>
                    <div class="right">
                      <div class="amount">${mxn(p.amount)}</div>
                      <div style="margin-top:4px"><span class="pill ${tono}">${p.status === 'partial' ? 'Parcial' : 'Pendiente'}</span></div>
                    </div>
                  </div>
                `;
              }).join('')}
            </div>
          </div>
        ` : ''}

        ${cards.length ? `
          <div style="margin-top:32px">
            <div class="section-header">
              <span class="t-eyebrow">Tarjetas</span>
              <button class="btn-link btn-sm" id="see-all-cards" style="border:none;cursor:pointer">${cards.length > 3 ? `Ver todas (${cards.length})` : 'Administrar'}</button>
            </div>
            <div class="stack">
              ${cards.slice(0, 3).map((c) => cardItem(c, { spent: spentByCard[c.id] || 0 })).join('')}
            </div>
          </div>
        ` : ''}

        ${monthExpenses.length ? `
          <div style="margin-top:32px">
            <div class="section-header">
              <span class="t-eyebrow">Últimos movimientos</span>
              <button class="btn-link btn-sm" id="see-all-exp" style="border:none;cursor:pointer">Ver todos</button>
            </div>
            ${expenseList(monthExpenses.slice(0, 5), { categories, cards })}
          </div>
        ` : ''}

        ${!cards.length ? `
          <div class="empty" style="margin-top:32px">
            Comienza por aquí →<br>agrega tu primera tarjeta.
          </div>
        ` : ''}
      </section>

      <button class="fab" id="fab" aria-label="Nuevo gasto">
        <svg viewBox="0 0 24 24" fill="none">
          <path d="M12 5v14M5 12h14" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
        </svg>
      </button>
    `;

    root.appendChild(renderBottomNav());

    root.querySelector('#fab').addEventListener('click', () => navigate('/expenses/new'));
    const goAll = root.querySelector('#see-all-cards');
    if (goAll) goAll.onclick = () => navigate('/cards');
    const goExp = root.querySelector('#see-all-exp');
    if (goExp) goExp.onclick = () => navigate('/expenses');
    const goPay = root.querySelector('#go-payments');
    if (goPay) goPay.onclick = () => navigate('/payments');
    root.querySelectorAll('[data-id]').forEach((el) => {
      if (el.closest('button')) return;
      el.style.cursor = 'pointer';
      el.onclick = () => {
        const id = el.dataset.id;
        const p = payments.find((x) => x.id === id);
        if (p) navigate(`/payments/new?card=${p.card_id}`);
      };
    });
  }

  render();
  return () => unsubscribe();
}

function formatNum(n) {
  return mxn(n).replace('$', '').trim();
}
