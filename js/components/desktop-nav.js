import { navigate, currentPath } from '../router.js';

const NAV = [
  { path: '/', label: 'Inicio', icon: 'home' },
  { path: '/upcoming', label: 'Próximos pagos', icon: 'calendar' },
  { path: '/cards', label: 'Tarjetas', icon: 'card' },
  { path: '/expenses', label: 'Gastos', icon: 'wallet' },
  { path: '/payments', label: 'Historial pagos', icon: 'invoice' },
  { path: '/categories', label: 'Categorías', icon: 'tag' },
  { path: '/history', label: 'Historial', icon: 'archive' },
  { path: '/settings', label: 'Ajustes', icon: 'gear' }
];

const ICONS = {
  home: '<path d="M3 11l9-8 9 8v9a2 2 0 0 1-2 2h-4a1 1 0 0 1-1-1v-5h-4v5a1 1 0 0 1-1 1H5a2 2 0 0 1-2-2v-9z" stroke="currentColor" stroke-width="1.6" fill="none" stroke-linejoin="round" stroke-linecap="round"/>',
  card: '<rect x="3" y="6" width="18" height="13" rx="2" stroke="currentColor" stroke-width="1.6" fill="none"/><path d="M3 10h18" stroke="currentColor" stroke-width="1.6"/><path d="M7 15h3" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>',
  wallet: '<path d="M3 8a2 2 0 0 1 2-2h13a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8z" stroke="currentColor" stroke-width="1.6" fill="none"/><path d="M16 13a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3z" stroke="currentColor" stroke-width="1.6" fill="none"/>',
  calendar: '<rect x="3" y="5" width="18" height="16" rx="2" stroke="currentColor" stroke-width="1.6" fill="none"/><path d="M3 10h18M8 3v4M16 3v4" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>',
  invoice: '<path d="M6 3h9l3 3v15a0 0 0 0 1 0 0H6a0 0 0 0 1 0 0V3z" stroke="currentColor" stroke-width="1.6" fill="none" stroke-linejoin="round"/><path d="M15 3v3h3" stroke="currentColor" stroke-width="1.6" fill="none" stroke-linejoin="round"/><path d="M9 11h6M9 14h6M9 17h4" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>',
  tag: '<path d="M3 12V5a2 2 0 0 1 2-2h7l9 9-9 9-9-9z" stroke="currentColor" stroke-width="1.6" fill="none" stroke-linejoin="round"/><circle cx="8" cy="8" r="1.5" stroke="currentColor" stroke-width="1.6" fill="none"/>',
  archive: '<path d="M3 4h18v4H3z" stroke="currentColor" stroke-width="1.6" fill="none" stroke-linejoin="round"/><path d="M5 8v11a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8" stroke="currentColor" stroke-width="1.6" fill="none"/><path d="M10 12h4" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>',
  gear: '<circle cx="12" cy="12" r="2.5" stroke="currentColor" stroke-width="1.6" fill="none"/><path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M5.6 18.4L7 17M17 7l1.4-1.4" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>'
};

function rootSegment(p) {
  const segs = p.split('/').filter(Boolean);
  if (segs.length === 0) return '/';
  return '/' + segs[0];
}

function isActive(itemPath, current) {
  if (itemPath === '/') return current === '/';
  return rootSegment(current) === itemPath;
}

export function renderDesktopNav() {
  const wrap = document.createElement('aside');
  wrap.className = 'desktop-nav';
  const path = currentPath();

  wrap.innerHTML = `
    <div class="desktop-nav-brand">
      <div class="brand-mark"><span class="dot"></span></div>
      <div class="desktop-nav-title">
        <div class="t-display-italic" style="font-size:18px;line-height:1;font-family:var(--f-display)">Nuestras</div>
        <div class="t-display" style="font-size:22px;line-height:1;margin-top:2px;font-family:var(--f-display);font-weight:500">finanzas</div>
      </div>
    </div>

    <nav class="desktop-nav-list">
      ${NAV.map((n) => `
        <button class="desktop-nav-item ${isActive(n.path, path) ? 'active' : ''}" data-path="${n.path}">
          <svg viewBox="0 0 24 24" fill="none">${ICONS[n.icon]}</svg>
          <span>${n.label}</span>
        </button>
      `).join('')}
    </nav>

    <div class="desktop-nav-footer">
      <div class="t-small" style="font-size:11px;line-height:1.4">Edición compartida<br>para dos</div>
    </div>
  `;

  wrap.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-path]');
    if (btn) navigate(btn.dataset.path);
  });

  return wrap;
}

export function refreshDesktopActive() {
  const nav = document.querySelector('.desktop-nav');
  if (!nav) return;
  const path = currentPath();
  nav.querySelectorAll('.desktop-nav-item').forEach((btn) => {
    if (isActive(btn.dataset.path, path)) btn.classList.add('active');
    else btn.classList.remove('active');
  });
}

export function shouldShowNav() {
  const path = currentPath();
  return NAV.some((n) => n.path === path);
}
