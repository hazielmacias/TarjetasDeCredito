import { mxn, fechaCorta } from '../utils/format.js';

const METHOD_LABELS = {
  card: 'Tarjeta',
  cash: 'Efectivo',
  transfer: 'Transferencia'
};

export function expenseItem(e, { category, card }) {
  const dot = category ? `<span class="inline-block w-2 h-2 rounded-full" style="background:${category.color}"></span>` : '';
  const methodLabel = METHOD_LABELS[e.payment_method] || '—';
  const cardLabel = card ? card.name : methodLabel;
  const ownerPill = e.owner ? `
    <span class="pill ${e.owner === 'Haziel' ? 'pill-sky' : 'pill-coral'}" style="padding:2px 8px;font-size:11px">${e.owner}</span>
  ` : '';
  return `
    <div class="list-item" data-id="${e.id}">
      <div class="flex-1 min-w-0">
        <div class="flex items-center gap-2 mb-1">
          ${dot}
          <span class="font-medium text-ink-black truncate">${e.place}</span>
          ${ownerPill}
        </div>
        <div class="text-xs text-stone flex items-center gap-2">
          <span>${cardLabel}</span>
          <span>·</span>
          <span>${fechaCorta(e.date)}</span>
        </div>
      </div>
      <div class="font-semibold text-balance">${mxn(e.amount)}</div>
    </div>
  `;
}

export function expenseList(expenses, { categories, cards, emptyText = 'Sin gastos este mes' } = {}) {
  if (!expenses.length) {
    return `<div class="empty-state">${emptyText}</div>`;
  }
  return `<div class="divide-hairline">${expenses.map((e) => expenseItem(e, {
    category: categories?.find((c) => c.id === e.category_id),
    card: e.card_id ? cards?.find((c) => c.id === e.card_id) : null
  })).join('')}</div>`;
}
