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
      <section class="page-enter px-5 pt-6">
        <header class="mb-5 flex items-center justify-between">
          <div>
            <h1 class="heading-xl">Categorías</h1>
            <p class="text-sm text-stone mt-1">${categories.length} configuradas</p>
          </div>
          <button class="btn btn-primary" id="add-cat">+ Nueva</button>
        </header>

        <div class="space-y-2">
          ${categories.map((c) => `
            <div class="list-item" data-id="${c.id}">
              <span class="w-3 h-3 rounded-full" style="background:${c.color}"></span>
              <div class="flex-1">
                <div class="font-medium">${c.name}</div>
                <div class="text-xs text-stone">${used[c.id] || 0} gastos este mes${c.is_default ? ' · predeterminada' : ''}</div>
              </div>
              <button class="btn btn-text btn-sm text-coral" data-act="del">Eliminar</button>
            </div>
          `).join('')}
        </div>

        ${!categories.length ? '<div class="empty-state">Sin categorías</div>' : ''}
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
  const colors = ['#ffb110', '#f64932', '#62aef0', '#02093a', '#b18164', '#097fe8', '#e89d01', '#696969', '#e6f3fe', '#7ab800'];

  modal(`
    <div class="modal-header">
      <h3 class="heading-md">Nueva categoría</h3>
      <button class="btn btn-text btn-sm" data-act="close">Cancelar</button>
    </div>
    <div class="modal-body space-y-3">
      <div>
        <label class="label">Nombre</label>
        <input class="input" id="f-name" placeholder="Ej. Mascotas" autofocus />
      </div>
      <div>
        <label class="label">Color</label>
        <div class="chip-group" id="f-colors">
          ${colors.map((c, i) => `<button type="button" class="chip ${i === 0 ? 'active' : ''}" data-val="${c}" style="background:${c}22;border-color:${c}">
            <span class="w-3 h-3 rounded-full" style="background:${c}"></span>
          </button>`).join('')}
        </div>
      </div>
      <button class="btn btn-primary btn-block btn-lg" id="f-save">Crear categoría</button>
    </div>
  `, {
    onMount: ({ root: r, close }) => {
      let color = colors[0];
      r.querySelector('#f-colors').addEventListener('click', (e) => {
        const b = e.target.closest('[data-val]');
        if (!b) return;
        color = b.dataset.val;
        r.querySelectorAll('#f-colors .chip').forEach((c) => c.classList.remove('active'));
        b.classList.add('active');
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
