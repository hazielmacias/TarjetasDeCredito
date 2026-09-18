/**
 * Router minimalista basado en hash (#/path).
 */
import { renderDesktopNav, refreshDesktopActive } from './components/desktop-nav.js';
import { refreshActive as refreshBottomActive } from './components/bottom-nav.js';

const routes = new Map();
let currentRoute = null;
let cleanup = null;
let desktopNavEl = null;

function ensureDesktopNav() {
  if (desktopNavEl && document.body.contains(desktopNavEl)) return;
  desktopNavEl = renderDesktopNav();
  document.body.appendChild(desktopNavEl);
}

export function route(path, handler) {
  routes.set(path, handler);
}

export function navigate(path) {
  const [basePath, queryString] = path.split('?');
  if (window.location.hash !== `#${basePath}` || window.location.search.replace(/^\?/, '') !== (queryString || '')) {
    const newUrl = queryString
      ? `#${basePath}?${queryString}`
      : `#${basePath}`;
    window.location.hash = newUrl;
  } else {
    render();
  }
  refreshDesktopActive();
  refreshBottomActive();
}

window.addEventListener('hashchange', render);

export function currentPath() {
  const h = window.location.hash.replace(/^#/, '') || '/';
  // Quitar query string y dejar solo el path
  return h.split('?')[0] || '/';
}

export function refreshDesktopNav() {
  if (desktopNavEl && document.body.contains(desktopNavEl)) {
    desktopNavEl.remove();
  }
  desktopNavEl = null;
  ensureDesktopNav();
}

export async function render() {
  const path = currentPath();
  const handler = routes.get(path) || routes.get('/');

  if (cleanup && typeof cleanup === 'function') {
    try {
      cleanup();
    } catch (_) {}
    cleanup = null;
  }

  const root = document.getElementById('app');
  if (!root) return;
  root.innerHTML = '';

  if (handler) {
    try {
      const result = await handler(root);
      if (typeof result === 'function') cleanup = result;
    } catch (e) {
      console.error('Render error:', e);
      root.innerHTML = `
        <section class="page page-enter" style="padding-top:48px;text-align:center">
          <div class="t-display" style="margin-bottom:16px">Algo salió mal</div>
          <p class="t-serif-body">${(e && e.message) || 'Error desconocido'}</p>
          <button class="btn btn-ink btn-block" style="margin-top:24px" onclick="window.location.reload()">Recargar</button>
        </section>
      `;
    }
  }

  ensureDesktopNav();
  refreshDesktopActive();
  refreshBottomActive();
}

// Inicializar la nav al cargar
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', ensureDesktopNav);
} else {
  ensureDesktopNav();
}
