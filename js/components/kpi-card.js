import { mxn, num } from '../utils/format.js';

export function kpiCard({ label, value, accent = 'blue', sub }) {
  const accents = {
    blue: 'border-l-4 border-notion-blue',
    coral: 'border-l-4 border-coral',
    marigold: 'border-l-4 border-marigold',
    midnight: 'border-l-4 border-midnight',
    sky: 'border-l-4 border-sky-wash'
  };
  return `
    <div class="kpi ${accents[accent] || ''}">
      <div class="kpi-label">${label}</div>
      <div class="kpi-value text-balance">${value}</div>
      ${sub ? `<div class="text-xs text-stone mt-1">${sub}</div>` : ''}
    </div>
  `;
}

export function kpiGrid(items) {
  return `
    <div class="grid grid-cols-2 gap-3">
      ${items.map(kpiCard).join('')}
    </div>
  `;
}

export { mxn, num };
