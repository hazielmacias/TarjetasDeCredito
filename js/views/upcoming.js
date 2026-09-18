import { getState, subscribe } from '../store.js';
import { mxn, fechaCorta, fechaLarga, diffDias, mesNombre } from '../utils/format.js';
import { resumenProximosPagos } from '../utils/billing.js';
import { renderBottomNav } from '../components/bottom-nav.js';
import { createPayment } from '../api/payments.js';
import { refreshAll } from '../api/sync.js';
import { modal, toast } from '../utils/ui.js';
import { navigate } from '../router.js';

export async function upcomingView(root) {
  let state = getState();
  const unsubscribe = subscribe((s) => { state = s; render(); });

  function render() {
    const { cards, expenses, payments } = state;
    const resumen = resumenProximosPagos(cards, expenses, payments);

    // Agregados
    const totalAPagar = resumen.reduce((s, r) => s + r.toPay, 0);
    const urgentes = resumen.filter((r) => r.status === 'urgent').length;
    const proximos = resumen.filter((r) => r.status === 'soon').length;

    root.innerHTML = `
      <section class="page-enter page">
        <div class="page-header row-between">
          <div>
            <span class="t-eyebrow">Calendario</span>
            <h1 class="t-display" style="margin-top:4px">Próximos pagos</h1>
            <div class="t-small" style="margin-top:4px">${cards.length} tarjeta${cards.length === 1 ? '' : 's'} activa${cards.length === 1 ? '' : 's'}</div>
          </div>
        </div>

        ${cards.length === 0 ? `
          <div class="card" style="text-align:center;padding:48px 24px">
            <div class="t-display-sm" style="margin-bottom:8px">No hay tarjetas aún</div>
            <p class="t-serif-body" style="margin-bottom:24px">Agrega una tarjeta para ver los pagos próximos.</p>
            <button class="btn btn-ink btn-lg" id="go-cards">Ir a Tarjetas</button>
          </div>
        ` : ''}

        ${cards.length > 0 ? `
          <!-- KPIs resumen -->
          <div class="hero-stat grain" style="margin-bottom:24px">
            <div class="content">
              <div class="row-between" style="margin-bottom:8px">
                <div class="t-eyebrow-mono">Total a pagar en próximos ciclos</div>
                <span class="pill pill-clay">${urgentes + proximos} pronto${(urgentes + proximos) === 1 ? '' : 's'}</span>
              </div>
              <div class="stat-value">
                <span class="unit">$</span>${mxn(totalAPagar).replace('$', '').trim()}
              </div>
              <div class="row-between" style="margin-top:14px;font-family:var(--f-mono);font-size:10.5px;letter-spacing:0.08em;text-transform:uppercase;color:var(--ink-60)">
                <span>${urgentes} vencen esta semana</span>
                <span style="font-family:var(--f-mono);font-weight:500;color:var(--ink)">${proximos} próxima semana</span>
              </div>
            </div>
          </div>

          ${urgentes > 0 ? `
            <div class="alert alert-urgent" style="margin-bottom:24px">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" style="flex-shrink:0"><circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="1.7"/><path d="M12 8v4M12 16h.01" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg>
              <div>
                <div style="font-weight:600">${urgentes} pago${urgentes === 1 ? '' : 's'} vence${urgentes === 1 ? '' : 'n'} en los próximos 2 días</div>
                <div class="t-small" style="margin-top:2px">Revisa abajo los detalles y registra los pagos a tiempo.</div>
              </div>
            </div>
          ` : ''}

          <!-- Lista de tarjetas con su próximo pago -->
          <div class="upcoming-list">
            ${resumen.map((r) => renderUpcomingCard(r)).join('')}
          </div>
        ` : ''}
      </section>

      <button class="fab" id="fab" aria-label="Registrar pago">
        <svg viewBox="0 0 24 24" fill="none"><path d="M12 5v14M5 12h14" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
      </button>
    `;

    root.appendChild(renderBottomNav());

    const goCards = root.querySelector('#go-cards');
    if (goCards) goCards.onclick = () => navigate('/cards');

    const fab = root.querySelector('#fab');
    if (fab) fab.onclick = () => navigate('/payments/new');

    // Botones "Pagar ahora" — registran el pago automático
    root.querySelectorAll('[data-act="pay-now"]').forEach((btn) => {
      btn.onclick = async () => {
        const cardId = btn.dataset.cardId;
        const amount = +btn.dataset.amount;
        const dueDate = btn.dataset.dueDate;
        const card = cards.find((c) => c.id === cardId);
        if (!card) return;
        try {
          const { room } = state;
          await createPayment({
            room_id: room.id,
            card_id: cardId,
            amount,
            due_date: dueDate,
            status: 'paid',
            paid_date: new Date().toISOString().slice(0, 10),
            month: new Date(dueDate).getMonth() + 1,
            year: new Date(dueDate).getFullYear(),
            notes: `Pago automático generado (${card.name})`
          });
          await refreshAll();
          toast(`Pago de ${mxn(amount)} registrado`);
        } catch (e) {
          toast('Error: ' + e.message);
        }
      };
    });

    // Botones "Ver detalle" — abren modal con desglose
    root.querySelectorAll('[data-act="view-detail"]').forEach((btn) => {
      btn.onclick = () => {
        const cardId = btn.dataset.cardId;
        const resumenItem = resumen.find((r) => r.card.id === cardId);
        if (resumenItem) openUpcomingDetail(resumenItem, expenses, payments);
      };
    });
  }

  render();
  return () => unsubscribe();
}

function renderUpcomingCard(r) {
  const { card, nextPayment, daysUntilPayment, totalSpent, alreadyPaid, toPay, status, gastosCount } = r;

  const statusLabel = {
    urgent: 'Vence pronto',
    soon: 'Esta semana',
    ok: 'A tiempo',
    'no-expenses': 'Sin gastos'
  }[status];

  const statusClass = {
    urgent: 'pill-clay',
    soon: 'pill-ochre',
    ok: 'pill-haziel',
    'no-expenses': 'pill-ink'
  }[status];

  const fechaStr = fechaLarga(nextPayment);
  const diasStr = daysUntilPayment <= 0
    ? '<strong style="color:var(--clay)">Vence hoy</strong>'
    : daysUntilPayment === 1
      ? 'Mañana'
      : `en ${daysUntilPayment} días`;

  return `
    <article class="upcoming-card ${status}" style="--card-color:${card.color}">
      <div class="upcoming-card-head">
        <div class="upcoming-card-id">
          <div class="upcoming-card-dot" style="background:${card.color}"></div>
          <div>
            <div class="upcoming-card-bank">${card.bank || 'Tarjeta'}</div>
            <div class="upcoming-card-name">${card.name}</div>
          </div>
        </div>
        <span class="pill ${statusClass}">${statusLabel}</span>
      </div>

      <div class="upcoming-card-amount">
        <div class="upcoming-card-amount-label">A pagar este ciclo</div>
        <div class="upcoming-card-amount-value">${mxn(toPay)}</div>
        ${alreadyPaid > 0 ? `<div class="upcoming-card-amount-paid">Ya pagado: ${mxn(alreadyPaid)}</div>` : ''}
      </div>

      <div class="upcoming-card-meta">
        <div class="upcoming-card-meta-item">
          <span class="upcoming-card-meta-label">Fecha límite</span>
          <span class="upcoming-card-meta-value">${fechaStr}</span>
        </div>
        <div class="upcoming-card-meta-item" style="text-align:right">
          <span class="upcoming-card-meta-label">Faltan</span>
          <span class="upcoming-card-meta-value">${diasStr}</span>
        </div>
      </div>

      <div class="upcoming-card-progress-wrap">
        <div class="upcoming-card-progress-row">
          <span>Gastos del ciclo: ${gastosCount}</span>
          <span>${mxn(totalSpent)} de ${mxn(card.credit_limit)}</span>
        </div>
        <div class="upcoming-card-progress">
          <div class="upcoming-card-progress-bar" style="width:${card.credit_limit > 0 ? Math.min(100, (totalSpent / card.credit_limit) * 100) : 0}%;background:${card.color}"></div>
        </div>
      </div>

      <div class="upcoming-card-actions">
        ${toPay > 0 ? `
          <button class="btn btn-ink btn-block" data-act="pay-now"
            data-card-id="${card.id}"
            data-amount="${toPay}"
            data-due-date="${nextPayment.toISOString().slice(0, 10)}">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M5 12l5 5L20 7" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
            Pagar ${mxn(toPay)}
          </button>
        ` : ''}
        <button class="btn btn-ghost btn-block" data-act="view-detail" data-card-id="${card.id}">
          Ver detalle
        </button>
      </div>
    </article>
  `;
}

function openUpcomingDetail(r, expenses, payments) {
  const { card, lastCutoff, nextPayment, gastosCount, totalSpent, alreadyPaid, toPay } = r;

  // Gastos del ciclo
  const gastosCiclo = expenses
    .filter((e) => {
      if (e.card_id !== card.id) return false;
      if (!e.date) return false;
      const d = new Date(e.date);
      return d >= lastCutoff && d <= new Date();
    })
    .sort((a, b) => new Date(b.date) - new Date(a.date));

  // Pagos hechos en este ciclo
  const pagosCiclo = payments.filter((p) => {
    if (p.card_id !== card.id) return false;
    if (p.status !== 'paid') return false;
    const fecha = p.paid_date || p.due_date;
    if (!fecha) return false;
    return new Date(fecha) >= lastCutoff;
  });

  modal(`
    <div class="modal-handle"></div>
    <div class="modal-header">
      <div>
        <span class="t-eyebrow">${card.bank || 'Tarjeta'} · ${fechaCorta(lastCutoff)} → ${fechaCorta(nextPayment)}</span>
        <h3 class="t-display-sm" style="margin-top:2px">${card.name}</h3>
      </div>
      <button class="btn btn-ghost btn-sm" data-act="close">✕</button>
    </div>
    <div class="modal-body stack">
      <div class="hero-stat grain" style="padding:20px">
        <div class="content">
          <div class="stat-label">A pagar</div>
          <div class="stat-value" style="font-size:36px"><span class="unit">$</span>${mxn(toPay).replace('$', '').trim()}</div>
          <div style="margin-top:6px;font-family:var(--f-mono);font-size:10.5px;letter-spacing:0.08em;text-transform:uppercase;color:var(--ink-60)">
            Límite ${mxn(toPay).replace('$', '').trim()} de ${mxn(card.credit_limit)} · ciclo ${fechaCorta(lastCutoff)} → ${fechaCorta(nextPayment)}
          </div>
        </div>
      </div>

      <div class="grid-2">
        <div class="card card-tinted">
          <div class="stat-label">Corte</div>
          <div class="t-display-sm" style="margin-top:4px;font-family:var(--f-display);font-weight:500;font-size:24px">Día ${card.cutoff_day}</div>
        </div>
        <div class="card card-tinted">
          <div class="stat-label">Pago</div>
          <div class="t-display-sm" style="margin-top:4px;font-family:var(--f-display);font-weight:500;font-size:24px">Día ${card.payment_day}</div>
        </div>
      </div>

      <div>
        <div class="section-header">
          <span class="t-eyebrow">Resumen del ciclo</span>
        </div>
        <div class="card stack-tight" style="padding:16px">
          <div class="row-between"><span class="t-small">Total gastado</span><span style="font-weight:500;font-family:var(--f-mono)">${mxn(totalSpent)}</span></div>
          <div class="row-between"><span class="t-small">Gastos del ciclo</span><span style="font-weight:500">${gastosCount}</span></div>
          <div class="row-between"><span class="t-small">Ya pagado</span><span style="font-weight:500;font-family:var(--f-mono)">${mxn(alreadyPaid)}</span></div>
          <div class="row-between" style="border-top:1px solid var(--ink-08);padding-top:8px;margin-top:4px"><span style="font-weight:600">Saldo a pagar</span><span style="font-weight:600;font-family:var(--f-mono);color:var(--clay)">${mxn(toPay)}</span></div>
        </div>
      </div>

      ${gastosCiclo.length ? `
        <div>
          <div class="section-header">
            <span class="t-eyebrow">Gastos del ciclo</span>
          </div>
          <div class="list">
            ${gastosCiclo.slice(0, 12).map((e) => `
              <div class="list-row" style="cursor:default">
                <div style="flex:1;min-width:0">
                  <div class="name" style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${e.place || 'Sin lugar'}</div>
                  <div class="meta">${fechaCorta(e.date)}${e.owner ? ' · ' + e.owner : ''}</div>
                </div>
                <div class="amount">${mxn(e.amount)}</div>
              </div>
            `).join('')}
            ${gastosCiclo.length > 12 ? `<div class="empty" style="padding:12px;font-size:13px">+${gastosCiclo.length - 12} más</div>` : ''}
          </div>
        </div>
      ` : ''}

      ${pagosCiclo.length ? `
        <div>
          <div class="section-header">
            <span class="t-eyebrow">Pagos realizados</span>
          </div>
          <div class="list">
            ${pagosCiclo.map((p) => `
              <div class="list-row" style="cursor:default">
                <div style="flex:1;min-width:0">
                  <div class="name">${p.notes || 'Pago'}</div>
                  <div class="meta">${fechaCorta(p.paid_date || p.due_date)}</div>
                </div>
                <div class="amount" style="color:var(--olive)">−${mxn(p.amount)}</div>
              </div>
            `).join('')}
          </div>
        </div>
      ` : ''}
    </div>
  `, {
    onMount: ({ root: r, close }) => {
      r.querySelector('[data-act="close"]').onclick = close;
    }
  });
}
