import { mxn, fechaCorta, proximaFechaPorDia } from '../utils/format.js';

// Paleta editorial para tarjetas (cuando el usuario no asigna color)
const EDITORIAL_COLORS = [
  '#c5471e', // Terracota
  '#2e4a6b', // Egeo
  '#4a5d3a', // Oliva
  '#6b3e5e', // Ciruela
  '#d4a017', // Ocre
  '#1a1814', // Tinta
  '#7c2d3a', // Carmesí
  '#3d5a6c', // Pizarra
  '#5d4a2e', // Café
  '#6b5b95', // Lavanda
  '#2d6a4f', // Bosque
  '#b5651d', // Cobre
  '#5a4fcf', // Índigo
  '#8b3a62', // Vino
  '#3a6b5d', // Salvia
  '#a0522d'  // Siena
];

function colorToText(hex) {
  if (!hex) return '#fff';
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.6 ? '#1a1814' : '#faf6ee';
}

export function cardItem(card, { spent = 0 } = {}) {
  const limit = +card.credit_limit || 0;
  const disponible = Math.max(0, limit - spent);
  const uso = limit > 0 ? Math.min(100, (spent / limit) * 100) : 0;
  const proxPago = proximaFechaPorDia(card.payment_day);
  const proxCorte = proximaFechaPorDia(card.cutoff_day);
  const bg = card.color || EDITORIAL_COLORS[0];
  const invert = colorToText(bg);
  const initials = (card.name || '··').slice(0, 2).toUpperCase();
  const ownerPill = card.owner === 'Haziel' ? 'pill-haziel' : 'pill-areli';

  return `
    <article class="card-pass" data-id="${card.id}" style="--pass-bg:${bg};color:${invert}">
      <div class="card-pass-top">
        <div style="display:flex;align-items:center;gap:8px">
          <div class="card-chip-emboss" style="border-color:rgba(255,255,255,0.2);color:${invert}">${initials}</div>
          <div>
            <div class="card-pass-bank" style="color:${invert};opacity:0.75">${card.bank || 'Banco'}</div>
          </div>
        </div>
        <span class="pill ${ownerPill}" style="background:rgba(255,255,255,0.18);color:${invert}">${card.owner}</span>
      </div>

      <div class="card-pass-name" style="color:${invert}">${card.name}</div>

      <div class="card-pass-emboss">
        <div class="emboss-dot" style="background:${invert};opacity:0.45"></div>
        <div class="emboss-dot" style="background:${invert};opacity:0.45"></div>
      </div>

      <div class="card-pass-amounts">
        <div class="card-pass-stat">
          <div class="card-pass-stat-label" style="color:${invert};opacity:0.65">Límite usado</div>
          <div class="card-pass-stat-value" style="color:${invert};font-variant-numeric:tabular-nums">${mxn(spent)}</div>
        </div>
        <div class="card-pass-stat-divider" style="background:${invert};opacity:0.2"></div>
        <div class="card-pass-stat">
          <div class="card-pass-stat-label" style="color:${invert};opacity:0.65">Disponible</div>
          <div class="card-pass-stat-value" style="color:${invert};font-variant-numeric:tabular-nums">${mxn(disponible)}</div>
        </div>
      </div>

      <div class="card-pass-progress-wrap">
        <div class="card-pass-progress-row" style="color:${invert};opacity:0.75">
          <span>Uso ${uso.toFixed(0)}%</span>
          <span>Límite ${mxn(limit)}</span>
        </div>
        <div class="card-pass-progress">
          <div class="card-pass-progress-bar" style="width:${uso}%;background:${invert}"></div>
        </div>
      </div>

      <div class="card-pass-foot" style="color:${invert};opacity:0.7;border-top-color:rgba(255,255,255,0.18)">
        <div class="card-pass-foot-item">
          <span class="card-pass-foot-label">Corte</span>
          <span class="card-pass-foot-value" style="color:${invert}">Día ${card.cutoff_day}</span>
        </div>
        <div class="card-pass-foot-item" style="text-align:right">
          <span class="card-pass-foot-label">Pago</span>
          <span class="card-pass-foot-value" style="color:${invert}">${fechaCorta(proxPago)}</span>
        </div>
      </div>

      <div class="card-actions" style="border-top-color:rgba(255,255,255,0.18)">
        <button type="button" class="card-action-btn" data-act="edit" data-id="${card.id}" style="background:rgba(255,255,255,0.16);color:${invert};border-color:rgba(255,255,255,0.22)">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none"><path d="M12 20h9M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4z" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/></svg>
          Editar
        </button>
        <button type="button" class="card-action-btn" data-act="delete" data-id="${card.id}" style="background:rgba(255,255,255,0.06);color:${invert};border-color:rgba(255,255,255,0.14)">
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

export { EDITORIAL_COLORS };
