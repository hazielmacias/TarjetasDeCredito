import { navigate, currentPath } from '../router.js';

const NAV = [
  { path: '/', label: 'Hoy', icon: 'home' },
  { path: '/cards', label: 'Tarjetas', icon: 'card' },
  { path: '/expenses', label: 'Gastos', icon: 'wallet' },
  { path: '/settings', label: 'Ajustes', icon: 'gear' }
];

const ICONS = {
  home: '<path d="M3 11l9-8 9 8v9a2 2 0 0 1-2 2h-4a1 1 0 0 1-1-1v-5h-4v5a1 1 0 0 1-1 1H5a2 2 0 0 1-2-2v-9z" stroke="currentColor" stroke-width="1.6" fill="none" stroke-linejoin="round" stroke-linecap="round"/>',
  card: '<rect x="3" y="6" width="18" height="13" rx="2" stroke="currentColor" stroke-width="1.6" fill="none"/><path d="M3 10h18" stroke="currentColor" stroke-width="1.6"/><path d="M7 15h3" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>',
  wallet: '<path d="M3 8a2 2 0 0 1 2-2h13a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8z" stroke="currentColor" stroke-width="1.6" fill="none"/><path d="M16 13a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3z" stroke="currentColor" stroke-width="1.6" fill="none"/>',
  gear: '<circle cx="12" cy="12" r="2.5" stroke="currentColor" stroke-width="1.6" fill="none"/><path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M5.6 18.4L7 17M17 7l1.4-1.4" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>'
};

export function renderBottomNav() {
  const wrap = document.createElement('nav');
  wrap.className = 'bottom-nav';
  const path = currentPath();
  wrap.innerHTML = NAV.map((n) => `
    <button class="nav-item ${path === n.path ? 'active' : ''}" data-path="${n.path}">
      <svg viewBox="0 0 24 24" fill="none">${ICONS[n.icon]}</svg>
      <span>${n.label}</span>
    </button>
  `).join('');
  wrap.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-path]');
    if (btn) navigate(btn.dataset.path);
  });
  return wrap;
}

export function shouldShowNav() {
  const path = currentPath();
  return NAV.some((n) => n.path === path);
}
