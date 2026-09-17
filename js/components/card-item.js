import { mxn, fechaCorta, proximaFechaPorDia } from '../utils/format.js';

export function cardItem(card, { spent = 0 } = {}) {
  const disponible = Math.max(0, +card.credit_limit - spent);
  const uso = card.credit_limit > 0 ? Math.min(100, (spent / card.credit_limit) * 100) : 0;
  const proxCorte = proximaFechaPorDia(card.cutoff_day);
  const proxPago = proximaFechaPorDia(card.payment_day);

  return `
    <div class="card" data-id="${card.id}" style="border-left:4px solid ${card.color}">
      <div class="flex items-start justify-between mb-3">
        <div>
          <div class="flex items-center gap-2">
            <h3 class="heading-md">${card.name}</h3>
            <span class="pill ${card.owner === 'Haziel' ? 'pill-sky' : 'pill-coral'}" style="padding:2px 10px;font-size:11px">${card.owner}</span>
          </div>
          <p class="text-sm text-stone mt-1">${card.bank || '—'}</p>
        </div>
        <div class="text-right">
          <div class="text-xs text-stone">Disponible</div>
          <div class="font-semibold text-balance">${mxn(disponible)}</div>
        </div>
      </div>

      <div class="mb-3">
        <div class="flex justify-between text-xs text-stone mb-1">
          <span>Uso ${uso.toFixed(0)}%</span>
          <span>${mxn(spent)} / ${mxn(card.credit_limit)}</span>
        </div>
        <div class="h-1.5 rounded-pill bg-paper-warmth overflow-hidden">
          <div class="h-full rounded-pill" style="width:${uso}%;background:${card.color}"></div>
        </div>
      </div>

      <div class="grid grid-cols-2 gap-3 text-xs">
        <div>
          <div class="text-stone">Próximo corte</div>
          <div class="font-medium">${fechaCorta(proxCorte)}</div>
        </div>
        <div>
          <div class="text-stone">Próximo pago</div>
          <div class="font-medium">${fechaCorta(proxPago)}</div>
        </div>
      </div>
    </div>
  `;
}

export function cardList(cards, { spentByCard = {} } = {}) {
  if (!cards.length) {
    return `<div class="empty-state">Aún no tienes tarjetas. Agrega una para empezar.</div>`;
  }
  return `<div class="space-y-3">${cards.map((c) => cardItem(c, { spent: spentByCard[c.id] || 0 })).join('')}</div>`;
}
