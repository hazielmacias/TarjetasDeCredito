import { getState, subscribe } from '../store.js';
import { renderBottomNav } from '../components/bottom-nav.js';
import { modal, toast, confirm } from '../utils/ui.js';
import { createCategory, deleteCategory } from '../api/categories.js';
import { refreshAll } from '../api/sync.js';

export async function categoriesView(root) {
  let state = getState();
  const unsubscribe = subscribe((s) => { state = s; render(); });

  function render() {
    const { categories, expenses, currentMonth } = state;
    const { year, month } = currentMonth;
    const used = {};
    expenses.filter((e) => e.year === year && e.month === month).forEach((e) => {
      if (e.category_id) used[e.category_id] = (used[e.category_id] || 0) + 1;
    });

    root.innerHTML = `
      <section class="page-enter page">
        <div class="page-header row-between">
          <div>
            <span class="t-eyebrow">Taxonomía</span>
            <h1 class="t-display" style="margin-top:4px">Categorías</h1>
            <div class="t-small" style="margin-top:4px">${categories.length} configuradas</div>
          </div>
          <button class="btn btn-ink btn-sm" id="add-cat">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M12 5v14M5 12h14" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
            Nueva
          </button>
        </div>

        ${categories.length ? `
          <div class="list">
            ${categories.map((c) => `
              <div class="list-row" data-id="${c.id}" style="cursor:default">
                <div class="avatar" style="background:${c.color};font-family:var(--f-display);font-size:14px">${c.name.slice(0,1).toUpperCase()}</div>
                <div style="flex:1">
                  <div class="name">${c.name}</div>
                  <div class="meta">${used[c.id] || 0} este mes${c.is_default ? ' · predeterminada' : ''}</div>
                </div>
                <button class="btn btn-ghost btn-sm" data-act="del" style="color:var(--clay)">Eliminar</button>
              </div>
            `).join('')}
          </div>
        ` : `<div class="empty">Sin categorías.</div>`}
      </section>
    `;

    root.appendChild(renderBottomNav());

    root.querySelector('#add-cat').onclick = () => openCategoryForm();
    root.querySelectorAll('[data-act="del"]').forEach((b) => {
      b.onclick = async (e) => {
        e.stopPropagation();
        const id = b.closest('[data-id]').dataset.id;
        const cat = categories.find((c) => c.id === id);
        if (!cat) return;
        const ok = await confirm({
          title: '¿Eliminar categoría?',
          message: `Los gastos registrados con "${cat.name}" quedarán sin categoría.`,
          danger: true
        });
        if (!ok) return;
        try {
          await deleteCategory(id);
          await refreshAll();
          toast('Categoría eliminada');
        } catch (e) {
          toast('Error: ' + e.message);
        }
      };
    });
  }

  render();
  return () => unsubscribe();
}

function openCategoryForm() {
  const colors = ['#c5471e', '#d4a017', '#2e4a6b', '#4a5d3a', '#6b3e5e', '#b18164', '#1a1814', '#696969'];

  modal(`
    <div class="modal-handle"></div>
    <div class="modal-header">
      <div>
        <span class="t-eyebrow">Nueva</span>
        <h3 class="t-display-sm" style="margin-top:2px">Categoría</h3>
      </div>
      <button class="btn btn-ghost btn-sm" data-act="close">Cancelar</button>
    </div>
    <div class="modal-body stack">
      <div>
        <label class="label">Nombre</label>
        <input class="input" id="f-name" placeholder="Ej. Mascotas" autofocus />
      </div>
      <div>
        <label class="label">Color</label>
        <div class="chip-group" id="f-colors" style="gap:10px">
          ${colors.map((c, i) => `
            <button type="button" class="chip ${i === 0 ? 'active' : ''}" data-val="${c}" style="padding:10px;background:${c};border-color:${c};${i === 0 ? 'color:#fff' : ''}">
            </button>
          `).join('')}
        </div>
      </div>
      <button class="btn btn-ink btn-block btn-lg" id="f-save">Crear categoría</button>
    </div>
  `, {
    onMount: ({ root: r, close }) => {
      let color = colors[0];
      r.querySelector('#f-colors').addEventListener('click', (e) => {
        const b = e.target.closest('[data-val]');
        if (!b) return;
        e.preventDefault();
        e.stopPropagation();
        color = b.dataset.val;
        r.querySelectorAll('#f-colors .chip').forEach((c) => {
          c.classList.remove('active');
          c.style.background = c.dataset.val;
          c.style.color = '';
        });
        b.classList.add('active');
        b.style.background = color;
        b.style.color = '#fff';
      });
      r.querySelector('[data-act="close"]').onclick = close;
      r.querySelector('#f-save').onclick = async () => {
        const name = r.querySelector('#f-name').value.trim();
        if (!name) return toast('Ingresa un nombre');
        try {
          const { room } = getState();
          await createCategory({ name, color, room_id: room.id, is_default: false });
          await refreshAll();
          close();
          toast('Categoría creada');
        } catch (e) {
          toast('Error: ' + e.message);
        }
      };
    }
  });
}
