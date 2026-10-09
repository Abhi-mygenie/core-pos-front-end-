/**
 * Credit / Tab Management Transforms — BUG-104 Phase 1
 *
 * Normalizes raw API payloads into clean shapes for the credit module.
 * Pure functions only — no React, no API calls.
 */

const toNumber = (v) => {
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : 0;
};

const capitalize = (s) => {
  if (!s || typeof s !== 'string') return s || '';
  return s.charAt(0).toUpperCase() + s.slice(1);
};

/**
 * Capitalize a customer name. Leaves the rest of the string unchanged.
 */
export const formatCustomerName = (name) => capitalize(name || '');

/**
 * Format payment method label for the debits table.
 * API stores raw values like "cash" / "card" / "upi".
 * Returns "Cash", "Card", "UPI" — display-only.
 */
export const formatPaymentMethod = (raw) => {
  if (!raw) return '—';
  const v = String(raw).toLowerCase();
  if (v === 'upi') return 'UPI';
  return capitalize(v);
};

/**
 * Format a date string to DD/MM/YY for compact tables.
 * Returns '—' on invalid input.
 */
export const formatDateShort = (input) => {
  if (!input) return '—';
  const d = new Date(input);
  if (Number.isNaN(d.getTime())) return '—';
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yy = String(d.getFullYear()).slice(-2);
  return `${dd}/${mm}/${yy}`;
};

/**
 * Format an INR amount: "₹4,400.20" / negative "-₹144.90".
 */
export const formatINR = (n) => {
  const v = toNumber(n);
  const sign = v < 0 ? '-' : '';
  const abs = Math.abs(v).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return `${sign}₹${abs}`;
};

/**
 * Format an input date string to a short time (e.g., "8:34 PM").
 * Returns '' if input is empty/invalid so callers can hide the line cleanly.
 */
export const formatTimeShort = (input) => {
  if (!input) return '';
  const d = new Date(input);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true });
};

/**
 * Transform a single customer row from API 1.
 */
const customerFromAPI = (raw) => ({
  id: raw?.id,
  name: formatCustomerName(raw?.name),
  mobile: raw?.mobile || '',
  email: raw?.email || null,
  balance: toNumber(raw?.balance),
});

/**
 * Transform the full customer list response.
 */
export const customerListFromAPI = (data) => {
  const list = data?.['employee-tap-list'];
  if (!Array.isArray(list)) return [];
  return list.map(customerFromAPI);
};

/**
 * Transform a credit entry (tab opened).
 */
const creditEntryFromAPI = (raw) => ({
  id: raw?.id,
  orderId: Number(raw?.order_id) || 0,
  restaurantOrderId: raw?.restaurant_order_id ?? null,
  customerId: raw?.customer_id,
  amount: toNumber(raw?.credit_order_amount),
  currentBalance: toNumber(raw?.current_balance),
  paymentStatus: raw?.payment_status || '',
  createdAt: raw?.created_at || null,
  orderCreatedAt: raw?.order_created_at || null,
  hasOrderDetail: Number(raw?.order_id) > 0,
});

/**
 * Transform a debit entry (payment received).
 */
const debitEntryFromAPI = (raw) => ({
  id: raw?.id,
  orderId: Number(raw?.order_id) || 0,
  customerId: raw?.customer_id,
  amount: toNumber(raw?.debit_order_amount),
  currentBalance: toNumber(raw?.current_balance),
  paymentMethod: raw?.payment_status || '',
  createdAt: raw?.created_at || null,
});

/**
 * Transform the full customer transaction detail response (API 2).
 */
export const customerDetailFromAPI = (data) => {
  const credits = Array.isArray(data?.['customer-transaction-list'])
    ? data['customer-transaction-list'].map(creditEntryFromAPI)
    : [];
  const debits = Array.isArray(data?.['customer-transaction-list-debit'])
    ? data['customer-transaction-list-debit'].map(debitEntryFromAPI)
    : [];

  const totalCredit = credits.reduce((s, c) => s + c.amount, 0);
  const totalPaid = debits.reduce((s, d) => s + d.amount, 0);

  return {
    credits,
    debits,
    summary: {
      totalCredit,
      totalPaid,
      balance: totalCredit - totalPaid,
      tapStartDate: data?.tap_start_date || null,
      lastCreditDate: data?.last_tap_credit_date || null,
      lastCreditAmount: toNumber(data?.last_tap_credit_amount),
      lastDebitDate: data?.last_tap_debit_date || null,
      lastDebitAmount: toNumber(data?.last_tap_debit_amount),
    },
  };
};

const creditTransform = {
  fromAPI: {
    customerList: customerListFromAPI,
    customerDetail: customerDetailFromAPI,
  },
  format: {
    inr: formatINR,
    dateShort: formatDateShort,
    paymentMethod: formatPaymentMethod,
    customerName: formatCustomerName,
  },
};

export default creditTransform;
