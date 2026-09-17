import { mxn } from '../utils/format.js';

export function kpiCard({ label, value, accent = 'ink', sub }) {
  return `
    <div class="stat-block">
      <div class="stat-label">${label}</div>
      <div class="stat-value t-mono">${value}</div>
      ${sub ? `<div class="t-small">${sub}</div>` : ''}
    </div>
  `;
}

export function kpiGrid(items) {
  return `<div class="grid-2">${items.map(kpiCard).join('')}</div>`;
}

export { mxn };
