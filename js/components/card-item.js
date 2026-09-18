import { mxn, fechaCorta, proximaFechaPorDia } from '../utils/format.js';

// Paleta editorial para tarjetas (cuando el usuario no asigna color)
const EDITORIAL_COLORS = ['#c5471e', '#2e4a6b', '#4a5d3a', '#6b3e5e', '#d4a017', '#1a1814'];

function colorToText(hex) {
  // Compute luminance to decide text color
  if (!hex) return '#fff';
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.6 ? '#1a1814' : '#faf6ee';
}

export function cardItem(card, { spent = 0 } = {}) {
  const disponible = Math.max(0, +card.credit_limit - spent);
  const uso = card.credit_limit > 0 ? Math.min(100, (spent / card.credit_limit) * 100) : 0;
  const proxPago = proximaFechaPorDia(card.payment_day);
  const proxCorte = proximaFechaPorDia(card.cutoff_day);
  const bg = card.color || EDITORIAL_COLORS[0];
  const invert = colorToText(bg);
  const initials = (card.name || '··').slice(0, 2).toUpperCase();
  const ownerPill = card.owner === 'Haziel' ? 'pill-haziel' : 'pill-areli';

  return `
    <article class="card-pass" data-id="${card.id}" style="--pass-bg:${bg};color:${invert}">
      <div class="row-between" style="margin-bottom:14px">
        <div>
          <div style="font-family:var(--f-mono);font-size:10px;letter-spacing:0.18em;text-transform:uppercase;opacity:0.7">${card.bank || 'Banco'}</div>
        </div>
        <span class="pill ${ownerPill}" style="background:rgba(255,255,255,0.18);color:${invert}">${card.owner}</span>
      </div>

      <div class="pass-name" style="color:${invert}">${card.name}</div>

      <div class="pass-stripe"></div>

      <div class="row-between" style="margin-top:18px;align-items:flex-end">
        <div>
          <div class="pass-meta" style="opacity:0.7">Disponible</div>
          <div style="font-family:var(--f-mono);font-variant-numeric:tabular-nums;font-size:17px;font-weight:500;letter-spacing:-0.02em;color:${invert}">
            ${mxn(disponible)}
          </div>
        </div>
        <div style="text-align:right">
          <div class="pass-meta" style="opacity:0.7">Próximo pago</div>
          <div style="font-family:var(--f-mono);font-size:13px;font-weight:500;color:${invert}">${fechaCorta(proxPago)}</div>
        </div>
      </div>

      <div style="margin-top:14px">
        <div class="row-between" style="margin-bottom:6px;font-family:var(--f-mono);font-size:10px;letter-spacing:0.1em;text-transform:uppercase;opacity:0.7">
          <span>Uso ${uso.toFixed(0)}%</span>
          <span>${mxn(spent)} de ${mxn(card.credit_limit)}</span>
        </div>
        <div style="height:4px;background:rgba(255,255,255,0.2);border-radius:99px;overflow:hidden">
          <div style="height:100%;width:${uso}%;background:${invert};border-radius:inherit"></div>
        </div>
      </div>

      <div class="card-actions" style="margin-top:18px;border-top:1px solid rgba(255,255,255,0.16);padding-top:14px;display:flex;gap:8px;justify-content:flex-end">
        <button type="button" class="card-action-btn" data-act="edit" data-id="${card.id}"
          style="background:rgba(255,255,255,0.14);color:${invert};border:1px solid rgba(255,255,255,0.2);padding:8px 14px;border-radius:8px;font-family:var(--f-ui);font-size:12.5px;font-weight:500;cursor:pointer;display:inline-flex;align-items:center;gap:6px;letter-spacing:-0.005em">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none"><path d="M12 20h9M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4z" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/></svg>
          Editar
        </button>
        <button type="button" class="card-action-btn" data-act="delete" data-id="${card.id}"
          style="background:rgba(255,255,255,0.08);color:${invert};border:1px solid rgba(255,255,255,0.16);padding:8px 14px;border-radius:8px;font-family:var(--f-ui);font-size:12.5px;font-weight:500;cursor:pointer;display:inline-flex;align-items:center;gap:6px;letter-spacing:-0.005em">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none"><path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6M10 11v6M14 11v6" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/></svg>
          Borrar
        </button>
      </div>
    </article>
  `;
}

export function cardList(cards, { spentByCard = {} } = {}) {
  if (!cards.length) {
    return `<div class="empty">Aún no hay tarjetas. Agrega una para empezar.</div>`;
  }
  return `<div class="cards-grid">${cards.map((c) => cardItem(c, { spent: spentByCard[c.id] || 0 })).join('')}</div>`;
}
