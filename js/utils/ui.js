/**
 * UI helpers: toasts y modales.
 */

export function toast(message, ms = 2400) {
  const host = document.getElementById('toast-host');
  if (!host) return;
  const el = document.createElement('div');
  el.className = 'toast';
  el.textContent = message;
  host.appendChild(el);
  setTimeout(() => {
    el.style.opacity = '0';
    el.style.transform = 'translateY(8px)';
    el.style.transition = 'all 200ms ease';
    setTimeout(() => el.remove(), 220);
  }, ms);
}

export function modal(contentHTML, { onMount, dismissible = true } = {}) {
  const host = document.getElementById('modal-host');
  if (!host) return null;

  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `<div class="modal-sheet">${contentHTML}</div>`;
  host.appendChild(overlay);

  function close() {
    overlay.style.animation = 'fade-in 180ms ease reverse';
    setTimeout(() => overlay.remove(), 180);
  }

  if (dismissible) {
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) close();
    });
  }

  if (typeof onMount === 'function') {
    onMount({ root: overlay.querySelector('.modal-sheet'), close });
  }

  return { overlay, close };
}

export function confirm({ title = '¿Estás seguro?', message = '', confirmText = 'Confirmar', cancelText = 'Cancelar', danger = false } = {}) {
  return new Promise((resolve) => {
    modal(`
      <div class="p-6">
        <h3 class="heading-lg mb-2">${title}</h3>
        <p class="text-graphite mb-5">${message}</p>
        <div class="flex gap-2 justify-end">
          <button class="btn btn-text" data-act="cancel">${cancelText}</button>
          <button class="btn ${danger ? 'btn-danger' : 'btn-primary'}" data-act="ok">${confirmText}</button>
        </div>
      </div>
    `, {
      onMount: ({ root, close }) => {
        root.querySelector('[data-act="cancel"]').onclick = () => { close(); resolve(false); };
        root.querySelector('[data-act="ok"]').onclick = () => { close(); resolve(true); };
      }
    });
  });
}
