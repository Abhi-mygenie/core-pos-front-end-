// Payment Mutation Service — CR-003
// Financial mutation wrappers for the Audit Report row actions:
//   - Change Payment Method (Endpoint A)
//   - Mark Paid Order As Unpaid (Endpoint B)
//
// IMPORTANT:
//   - Endpoint A `payment_method` MUST be lowercase: 'cash' | 'card' | 'upi'.
//   - Endpoint A/B `order_id` MUST be the numeric DB id (NOT the human display
//     order_no / displayOrderNo).
//   - The shared axios client already attaches the Bearer token via the auth
//     interceptor — do NOT re-add Authorization headers here.
//   - This file is the canonical home for CR-003 financial mutation wrappers.
//     The legacy `paymentService.js` (stale `CLEAR_BILL` path) was deleted
//     2026-05-04 as part of Batch 3B hygiene. Keep these wrappers side-effect
//     free; UI orchestration (toasts, optimistic updates, refresh) belongs to
//     the page layer.

import api from '../axios';
import { API_ENDPOINTS } from '../constants';

/**
 * Allowed values for the Endpoint A payload's `payment_method` field.
 * Lowercased on purpose to match the backend contract.
 */
export const ALLOWED_PAYMENT_METHODS = Object.freeze(['cash', 'card', 'upi']);

/**
 * Validate & normalize a payment-method value to the lowercase form expected
 * by Endpoint A. Throws synchronously for unsupported values so callers fail
 * fast before issuing a network call.
 *
 * @param {string} method
 * @returns {'cash' | 'card' | 'upi'}
 */
const normalizePaymentMethod = (method) => {
  if (typeof method !== 'string') {
    throw new Error('payment_method must be a string');
  }
  const normalized = method.trim().toLowerCase();
  if (!ALLOWED_PAYMENT_METHODS.includes(normalized)) {
    throw new Error(
      `Unsupported payment_method "${method}". Allowed: ${ALLOWED_PAYMENT_METHODS.join(', ')}.`
    );
  }
  return normalized;
};

/**
 * Validate that an `order_id` is the numeric DB id expected by Endpoints
 * A and B. Accepts a number or a string of digits; returns a number.
 * Throws synchronously on bad input so the network call is never attempted.
 *
 * @param {number | string} orderId
 * @returns {number}
 */
const normalizeOrderId = (orderId) => {
  if (orderId === null || orderId === undefined || orderId === '') {
    throw new Error('order_id is required');
  }
  const asNumber = typeof orderId === 'number' ? orderId : Number(orderId);
  if (!Number.isFinite(asNumber) || asNumber <= 0 || !Number.isInteger(asNumber)) {
    throw new Error(`Invalid order_id "${orderId}". Expected positive integer DB id.`);
  }
  return asNumber;
};

/**
 * Endpoint A — Change the payment method recorded on an existing paid order.
 *
 *   POST /api/v2/vendoremployee/change-order-payment-method
 *   body: { order_id: <numeric DB id>, payment_method: 'cash' | 'card' | 'upi' }
 *
 * @param {number | string} orderId       Numeric DB id of the order
 * @param {string} paymentMethod          'cash' | 'card' | 'upi' (case-insensitive in)
 * @returns {Promise<Object>}             Raw response data (shape TBD by backend)
 */
export const changeOrderPaymentMethod = async (orderId, paymentMethod) => {
  const order_id = normalizeOrderId(orderId);
  const payment_method = normalizePaymentMethod(paymentMethod);
  const response = await api.post(
    API_ENDPOINTS.CHANGE_ORDER_PAYMENT_METHOD,
    { order_id, payment_method }
  );
  return response.data;
};

/**
 * Endpoint B — Flip a paid order back to unpaid. The backend will (per
 * CR-003) emit a socket event on the existing order channel so other
 * terminals re-surface the order as running. Frontend should still treat
 * an explicit refetch as a fallback.
 *
 *   POST /api/v2/vendoremployee/make-order-unpaid
 *   body: { order_id: <numeric DB id> }
 *
 * @param {number | string} orderId
 * @returns {Promise<Object>}             Raw response data (shape TBD by backend)
 */
export const makeOrderUnpaid = async (orderId) => {
  const order_id = normalizeOrderId(orderId);
  const response = await api.post(
    API_ENDPOINTS.MAKE_ORDER_UNPAID,
    { order_id }
  );
  return response.data;
};
