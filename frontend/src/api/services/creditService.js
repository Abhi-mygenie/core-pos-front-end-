/**
 * Credit/Tab Management Service — BUG-104 Phase 1
 *
 * Three endpoints:
 *   1. tap-waiter-list          → list all credit customers + balances
 *   2. tap-customer-record-list → transaction history for one customer
 *   3. tap-waiter-order-insert  → record a credit payment (clearance)
 */
import api from '../axios';
import { API_ENDPOINTS } from '../constants';

/**
 * Fetch all credit/tab customers with outstanding balances.
 * @returns {Promise<Array<{id,name,mobile,email,balance}>>}
 */
export const getTabCustomerList = async () => {
  const res = await api.post(API_ENDPOINTS.CREDIT_CUSTOMER_LIST, {});
  return res.data?.['employee-tap-list'] || [];
};

/**
 * Fetch transaction history for a single customer.
 * @param {number} customerId — the `id` from tap-waiter-list
 * @returns {Promise<{credits:Array, debits:Array, meta:Object}>}
 */
export const getTabCustomerRecords = async (customerId) => {
  const res = await api.get(API_ENDPOINTS.CREDIT_CUSTOMER_DETAIL, {
    params: { customer_id: customerId },
  });
  const d = res.data || {};
  return {
    credits: d['customer-transaction-list'] || [],
    debits: d['customer-transaction-list-debit'] || [],
    meta: {
      tapStartDate: d.tap_start_date || null,
      lastCreditDate: d.last_tap_credit_date || null,
      lastCreditAmount: d.last_tap_credit_amount || null,
      lastDebitDate: d.last_tap_debit_date || null,
      lastDebitAmount: d.last_tap_debit_amount || null,
    },
  };
};

/**
 * Record a credit payment / clearance.
 * @param {{mobile:string, name:string, email:string, debitAmount:number, paymentMethod:string, orderId:string}} params
 * @returns {Promise<Object>}
 */
export const insertTabPayment = async ({ mobile, name, email = '', debitAmount, paymentMethod, orderId = '' }) => {
  const res = await api.post(API_ENDPOINTS.CREDIT_PAYMENT_INSERT, {
    mobile,
    name,
    email,
    credit_order_amount: 0,
    debit_order_amount: debitAmount,
    payment_status: paymentMethod,
    order_id: orderId,
  });
  return res.data;
};
