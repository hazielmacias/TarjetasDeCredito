/**
 * Helpers para calcular el ciclo de facturación de una tarjeta.
 *
 * Conceptos:
 *  - cutoff_day: día del mes en que cierra el ciclo (facturación)
 *  - payment_day: día del mes en que se paga lo facturado en el ciclo anterior
 *
 * Lógica:
 *  El ciclo N se factura en el `cutoff_day` del mes actual.
 *  Los gastos desde el cutoff anterior (mes pasado) hasta el cutoff actual
 *  se pagan en el `payment_day` del mes actual.
 *
 * Para calcular "lo que hay que pagar en el próximo pago":
 *  1. Encontrar el último cutoff que ya pasó
 *  2. Sumar gastos de esa tarjeta desde ese cutoff hasta hoy
 *  3. Restar pagos ya registrados para ese ciclo
 */

import { proximaFechaPorDia } from './format.js';

/**
 * Devuelve la fecha del último cutoff (día de facturación) que ya pasó.
 * Si el cutoff de este mes aún no llega, devuelve el del mes pasado.
 */
export function ultimoCutoff(cutoffDay, fromDate = new Date()) {
  const hoy = new Date(fromDate);
  const cutoffEsteMes = new Date(hoy.getFullYear(), hoy.getMonth(), cutoffDay);
  if (hoy >= cutoffEsteMes) {
    return cutoffEsteMes;
  }
  // Aún no llega el cutoff de este mes → usar el del mes pasado
  return new Date(hoy.getFullYear(), hoy.getMonth() - 1, cutoffDay);
}

/**
 * Devuelve la fecha del próximo pago a partir del payment_day.
 * Wrapper sobre proximaFechaPorDia.
 */
export function proximoPago(paymentDay, fromDate = new Date()) {
  return proximaFechaPorDia(paymentDay, fromDate);
}

/**
 * Calcula el monto a pagar en el próximo ciclo para una tarjeta.
 *
 * @param {Object} card - {id, cutoff_day, payment_day, credit_limit, name, color, owner}
 * @param {Array} expenses - Todos los expenses del room
 * @param {Array} payments - Todos los payments del room
 * @returns {Object} {
 *   card,
 *   lastCutoff: Date,
 *   nextPayment: Date,
 *   daysUntilPayment: number,
 *   periodStart: Date,
 *   periodEnd: Date,
 *   totalSpent: number,
 *   alreadyPaid: number,
 *   toPay: number,
 *   status: 'urgent' | 'soon' | 'ok' | 'no-expenses'
 * }
 */
export function calcularProximoPago(card, expenses, payments, fromDate = new Date()) {
  const lastCut = ultimoCutoff(card.cutoff_day, fromDate);
  const nextPay = proximoPago(card.payment_day, fromDate);
  const daysUntil = Math.round((nextPay - fromDate) / 86400000);

  // Gastos del ciclo actual: desde el último cutoff hasta hoy
  const gastosCiclo = expenses.filter((e) => {
    if (e.card_id !== card.id) return false;
    if (!e.date) return false;
    const d = new Date(e.date);
    return d >= lastCut && d <= fromDate;
  });
  const totalSpent = gastosCiclo.reduce((s, e) => s + +e.amount, 0);

  // Pagos ya hechos DESPUÉS del último cutoff (que aplican a este ciclo)
  const pagosCiclo = payments.filter((p) => {
    if (p.card_id !== card.id) return false;
    if (p.status !== 'paid') return false;
    if (!p.paid_date && !p.due_date) return false;
    const fecha = p.paid_date || p.due_date;
    const d = new Date(fecha);
    return d >= lastCut;
  });
  const alreadyPaid = pagosCiclo.reduce((s, p) => s + +p.amount, 0);

  const toPay = Math.max(0, totalSpent - alreadyPaid);

  // Status visual según urgencia
  let status;
  if (totalSpent === 0) {
    status = 'no-expenses';
  } else if (daysUntil <= 2) {
    status = 'urgent';
  } else if (daysUntil <= 7) {
    status = 'soon';
  } else {
    status = 'ok';
  }

  return {
    card,
    lastCutoff: lastCut,
    nextPayment: nextPay,
    daysUntilPayment: daysUntil,
    periodStart: lastCut,
    periodEnd: nextPay,
    totalSpent,
    alreadyPaid,
    toPay,
    gastosCount: gastosCiclo.length,
    status
  };
}

/**
 * Calcula los próximos pagos para todas las tarjetas y los ordena
 * por urgencia (más urgente primero).
 */
export function resumenProximosPagos(cards, expenses, payments, fromDate = new Date()) {
  return cards
    .map((c) => calcularProximoPago(c, expenses, payments, fromDate))
    .sort((a, b) => {
      // Primero por status (urgent > soon > ok > no-expenses)
      const order = { urgent: 0, soon: 1, ok: 2, 'no-expenses': 3 };
      if (order[a.status] !== order[b.status]) return order[a.status] - order[b.status];
      // Luego por días hasta el pago (más cercano primero)
      return a.daysUntilPayment - b.daysUntilPayment;
    });
}
