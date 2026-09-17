import { mxn, fechaCorta } from '../utils/format.js';

const METHOD_LABELS = {
  card: 'Tarjeta',
  cash: 'Efectivo',
  transfer: 'Transferencia'
};

function avatarFromPlace(place, color) {
  const letter = (place || '·').trim().slice(0, 1).toUpperCase();
  return `<div class="avatar" style="background:${color || 'var(--ink)'}">${letter}</div>`;
}

export function expenseItem(e, { category, card }) {
  const color = category?.color || 'var(--ink-40)';
  const methodLabel = card ? card.name : METHOD_LABELS[e.payment_method] || '—';
  const ownerClass = e.owner === 'Haziel' ? 'pill-haziel' : e.owner === 'Areli' ? 'pill-areli' : '';

  return `
    <div class="list-row" data-id="${e.id}">
      ${avatarFromPlace(e.place, color)}
      <div style="flex:1;min-width:0">
        <div class="name" style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${e.place}</div>
        <div class="meta" style="margin-top:2px">
          ${category ? category.name : 'Sin categoría'} · ${methodLabel} · ${fechaCorta(e.date)}
        </div>
      </div>
      <div class="right">
        <div class="amount">${mxn(e.amount)}</div>
        ${e.owner ? `<div style="margin-top:4px"><span class="pill ${ownerClass}">${e.owner}</span></div>` : ''}
      </div>
    </div>
  `;
}

export function expenseList(expenses, { categories, cards, emptyText = 'Sin movimientos este mes' } = {}) {
  if (!expenses.length) {
    return `<div class="empty">${emptyText}</div>`;
  }
  return `<div class="list">${expenses.map((e) => expenseItem(e, {
    category: categories?.find((c) => c.id === e.category_id),
    card: e.card_id ? cards?.find((c) => c.id === e.card_id) : null
  })).join('')}</div>`;
}
