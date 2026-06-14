// Settlement Report Transform — CR-016
// Maps multi-day settlement API response → UI shape.
// Reuses fromAPI.waiter() from CR-015 settlementTransform.

import { fromAPI as settlementFromAPI } from './settlementTransform';

const toNum = (v) => parseFloat(v) || 0;

/** Format "YYYY-MM-DD" → "09 Jun 2026" */
const formatDisplayDate = (isoDate) => {
  if (!isoDate) return '—';
  const [y, m, d] = isoDate.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

export const fromAPI = {
  /**
   * Transform multi-day settlement response → UI shape.
   * Input: raw API response { success, totals, data[] }
   * Output: { aggregateTotals, days[] }
   */
  settlementRange: (response) => {
    const topTotals = response.totals || {};
    const days = (response.data || []).map((dayEntry) => {
      const dt = dayEntry.totals || {};
      const rawWaiters = dayEntry.waiters || [];
      const allWaiters = rawWaiters.map(settlementFromAPI.waiter);
      // Filter to active waiters only (cashCollected > 0 OR openingBalance > 0)
      const waiters = allWaiters.filter(
        (w) => w.cashCollected > 0 || w.openingBalance > 0
      );

      const totalFunds = toNum(dt.total_total_funds);
      const settled = toNum(dt.total_today_settlement);
      const pilferage = toNum(dt.total_pilferage);

      return {
        date: dayEntry.date,
        formattedDate: formatDisplayDate(dayEntry.date),
        totals: {
          openingBalance:  toNum(dt.total_opening_balance),
          cashCollected:   toNum(dt.total_today_collection),
          totalFunds,
          settled,
          expected:        totalFunds - settled - Math.abs(pilferage),
          pilferage:       pilferage,
          totalSale:       toNum(dt.total_sale),
          deliveryCharges: toNum(dt.total_today_delivery_charge),
          serviceCharges:  toNum(dt.total_today_service_charge),
          tips:            toNum(dt.total_today_tips),
        },
        waiters,
        activeWaiterCount: waiters.length,
      };
    });

    // Filter to active days only (any financial activity)
    const activeDays = days.filter((d) =>
      d.totals.cashCollected > 0 ||
      d.totals.openingBalance > 0 ||
      d.totals.settled > 0 ||
      d.totals.pilferage !== 0
    );

    // Sort descending by date (latest first)
    activeDays.sort((a, b) => (a.date > b.date ? -1 : a.date < b.date ? 1 : 0));

    // Aggregate totals from top-level response
    const aggFunds   = toNum(topTotals.total_total_funds);
    const aggSettled  = toNum(topTotals.total_today_settlement);
    const aggPilf     = toNum(topTotals.total_pilferage);

    return {
      aggregateTotals: {
        openingBalance: toNum(topTotals.total_opening_balance),
        cashCollected:  toNum(topTotals.total_today_collection),
        totalFunds:     aggFunds,
        settled:        aggSettled,
        expected:       aggFunds - aggSettled - Math.abs(aggPilf),
        pilferage:      aggPilf,
        totalSale:      toNum(topTotals.total_sale),
      },
      days: activeDays,
    };
  },
};
