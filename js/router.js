/**
 * Router minimalista basado en hash (#/path).
 */
const routes = new Map();
let currentRoute = null;
let cleanup = null;

export function route(path, handler) {
  routes.set(path, handler);
}

export function navigate(path) {
  if (window.location.hash !== `#${path}`) {
    window.location.hash = `#${path}`;
  } else {
    render();
  }
}

window.addEventListener('hashchange', render);

export function currentPath() {
  const h = window.location.hash.replace(/^#/, '') || '/';
  return h;
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
  root.innerHTML = '';

  if (handler) {
    const result = await handler(root);
    if (typeof result === 'function') cleanup = result;
  }
}
