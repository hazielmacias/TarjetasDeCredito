/**
 * Estado global reactivo (mini store estilo signal).
 * Suscripción simple para re-renderizar vistas.
 */
const listeners = new Set();
let state = {
  session: null,
  room: null,
  cards: [],
  payments: [],
  expenses: [],
  categories: [],
  currentMonth: currentYM(),
  loading: false
};

function currentYM() {
  const d = new Date();
  return { year: d.getFullYear(), month: d.getMonth() + 1 };
}

export function getState() {
  return state;
}

export function setState(patch) {
  state = typeof patch === 'function' ? { ...state, ...patch(state) } : { ...state, ...patch };
  for (const fn of listeners) fn(state);
}

export function subscribe(fn) {
  listeners.add(fn);
  fn(state);
  return () => listeners.delete(fn);
}

export function setMonth(year, month) {
  setState({ currentMonth: { year, month } });
}

export function resetState() {
  state = {
    session: null,
    room: null,
    cards: [],
    payments: [],
    expenses: [],
    categories: [],
    currentMonth: currentYM(),
    loading: false
  };
  for (const fn of listeners) fn(state);
}
