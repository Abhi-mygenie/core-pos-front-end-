// Settlement Transform — CR-015
// Maps between Settlement API responses and UI shapes

const toNum = (v) => parseFloat(v) || 0;

// ─── Date helpers ──────────────────────────────────────────────────
/** JS Date → "MM-DD-YYYY" (API request format) */
export const formatDateForAPI = (date) => {
  const d = date instanceof Date ? date : new Date(date);
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${dd}-${mm}-${yyyy}`;
};

/** JS Date → "YYYY-MM-DD" (for settlement/opening-balance API body) */
export const formatDateISO = (date) => {
  const d = date instanceof Date ? date : new Date(date);
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${yyyy}-${mm}-${dd}`;
};

// ─── API → Frontend ────────────────────────────────────────────────
export const fromAPI = {
  /** Transform get-settlement-report response */
  settlementReport: (response) => {
    const data = response.data || response;
    const day = (data.data || [])[0] || {};
    const totals = day.totals || data.totals || {};
    const rawWaiters = day.waiters || [];

    return {
      totals: {
        openingBalance: toNum(totals.total_opening_balance),
        cashCollected: toNum(totals.total_today_collection),
        settled: toNum(totals.total_today_settlement),
        remaining: toNum(totals.total_balance_to_settle),
        pilferage: toNum(totals.total_pilferage),
        totalSale: toNum(totals.total_sale),
        totalPaid: toNum(totals.total_paid),
        totalUnpaid: toNum(totals.total_unpaid),
        deliveryCharges: toNum(totals.total_today_delivery_charge),
        serviceCharges: toNum(totals.total_today_service_charge),
        tips: toNum(totals.total_today_tips),
        totalFunds: toNum(totals.total_total_funds),
        cashGiven: toNum(totals.total_today_given),
        lastDayPending: toNum(totals.last_day_pending),
      },
      settlementStatus: (data.totals || totals).stattlement_status ?? null,
      waiters: rawWaiters.map(fromAPI.waiter),
    };
  },

  /** Transform single waiter from report */
  waiter: (w) => ({
    waiterId: w.waiter_id,
    name: (w.full_name || '').trim(),
    restaurantId: w.restaurant_id,
    date: w.date,
    openingBalance: toNum(w.opening_balance),
    lastDayPending: toNum(w.last_day_pending),
    todayGiven: toNum(w.today_given),
    cashCollected: toNum(w.today_collection),
    deliveryCharge: toNum(w.today_delivery_charge),
    tips: toNum(w.today_tips),
    serviceCharge: toNum(w.today_service_charge),
    totalSale: toNum(w.total_sale),
    totalPaid: toNum(w.total_paid),
    totalUnpaid: toNum(w.total_unpaid),
    totalFunds: toNum(w.total_funds),
    cashDraw: toNum(w.cash_draw),
    settled: toNum(w.today_settlement),
    pilferage: toNum(w.pilferage),
    balanceToSettle: toNum(w.balance_to_settle),
    tipsByMode: {
      cash: toNum(w.tips_by_mode?.cash),
      card: toNum(w.tips_by_mode?.card),
      upi: toNum(w.tips_by_mode?.upi),
      tab: toNum(w.tips_by_mode?.TAB),
      room: toNum(w.tips_by_mode?.ROOM),
      other: toNum(w.tips_by_mode?.Other),
    },
  }),

  /** Transform waiter list response */
  waiterList: (response) => {
    const data = response.data || response;
    const list = data.data || data || [];
    if (!Array.isArray(list)) return [];
    return list.map((w) => ({
      id: w.id,
      name: (w.name || '').trim(),
    }));
  },
};

// ─── Frontend → API ────────────────────────────────────────────────
export const toAPI = {
  /** Build opening balance payload */
  openingBalance: (entries, date) =>
    entries.map((e) => ({
      waiter_id: e.waiterId,
      date: formatDateISO(date),
      last_day_pending: e.lastDayPending || 0,
      today_given: e.amount,
    })),

  /** Build settlement payload */
  settlement: (date, waiterId, amount, type, pilferage) => ({
    date: formatDateISO(date),
    waiter_id: waiterId,
    amount,
    settlement_type: type,
    pilferage,
  }),
};
