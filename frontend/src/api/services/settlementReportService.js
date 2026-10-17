// Settlement Report Service — CR-016
// Date-range settlement history for Insights module.
// Thin wrapper over CR-015's settlementService.getSettlementReport.

import { getSettlementReport } from './settlementService';
import { fromAPI } from '../transforms/settlementReportTransform';

/**
 * Fetch settlement data for a date range.
 * @param {string} fromDate — "DD-MM-YYYY"
 * @param {string} toDate   — "DD-MM-YYYY"
 * @returns {Promise<{ aggregateTotals, days[] }>} — transformed UI shape
 */
export const getSettlementForRange = async (fromDate, toDate) => {
  const response = await getSettlementReport(fromDate, toDate);
  const raw = response.data || response;
  return fromAPI.settlementRange(raw);
};
