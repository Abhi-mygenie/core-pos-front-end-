// Settlement Service — CR-015
// Day-closing / Cash Settlement APIs

import api from '../axios';

const BASE = '/api/v1/vendoremployee/waiter';

/** Get settlement report for a date range */
export const getSettlementReport = (dateFrom, dateTo) =>
  api.post(`${BASE}/get-settlement-report`, {
    date_from: dateFrom,
    date_to: dateTo,
  });

/** Get list of all waiters */
export const getWaiterList = () =>
  api.get(`${BASE}/get-waiter-list`);

/** Set opening balance for one or more waiters */
export const setOpeningBalance = (openings) =>
  api.post(`${BASE}/opening-balance`, { openings });

/** Settle a waiter (partial or full) */
export const settleWaiter = (date, waiterId, amount, settlementType, pilferage) =>
  api.post(`${BASE}/settlement`, {
    date,
    waiter_id: waiterId,
    amount,
    settlement_type: settlementType,
    pilferage,
  });

/** Self-settlement for logged-in user */
export const selfSettle = (date) =>
  api.post(`${BASE}/self-settlement`, { date });
