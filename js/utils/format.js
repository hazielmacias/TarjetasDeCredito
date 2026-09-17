/**
 * Helpers de formato, moneda y fechas (es-MX).
 */

const fmtMXN = new Intl.NumberFormat('es-MX', {
  style: 'currency',
  currency: 'MXN',
  maximumFractionDigits: 2
});

const fmtNumber = new Intl.NumberFormat('es-MX', { maximumFractionDigits: 2 });

const MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

export function mxn(n) {
  if (n === null || n === undefined || Number.isNaN(+n)) return '$0.00';
  return fmtMXN.format(+n);
}

export function num(n) {
  if (n === null || n === undefined || Number.isNaN(+n)) return '0';
  return fmtNumber.format(+n);
}

export function mesNombre(m) {
  return MESES[Math.max(0, Math.min(11, +m - 1))];
}

export function fechaCorta(d) {
  const date = new Date(d);
  if (Number.isNaN(date.getTime())) return '';
  return `${date.getDate()} ${mesNombre(date.getMonth() + 1).slice(0, 3).toLowerCase()}`;
}

export function fechaLarga(d) {
  const date = new Date(d);
  if (Number.isNaN(date.getTime())) return '';
  return `${date.getDate()} de ${mesNombre(date.getMonth() + 1)}`;
}

export function diffDias(d) {
  const a = new Date(d);
  const hoy = new Date();
  a.setHours(0, 0, 0, 0);
  hoy.setHours(0, 0, 0, 0);
  return Math.round((a - hoy) / 86400000);
}

export function hoyISO() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/**
 * Calcula la próxima fecha de pago/corte a partir del día del mes.
 */
export function proximaFechaPorDia(dayOfMonth, fromDate = new Date()) {
  const d = new Date(fromDate);
  let year = d.getFullYear();
  let month = d.getMonth();
  const todayDay = d.getDate();

  if (todayDay >= dayOfMonth) {
    month += 1;
    if (month > 11) {
      month = 0;
      year += 1;
    }
  }
  // Ajuste para meses con menos días
  const lastDay = new Date(year, month + 1, 0).getDate();
  const day = Math.min(dayOfMonth, lastDay);
  return new Date(year, month, day);
}

export function uuid() {
  return (crypto.randomUUID && crypto.randomUUID()) ||
    'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
}
