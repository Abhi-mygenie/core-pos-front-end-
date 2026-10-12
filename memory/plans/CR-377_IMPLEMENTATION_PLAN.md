# Gate 3 — Implementation Plan: CR-377
## Sales Report Complete Redesign (OrderSummaryPage)

**Date:** 2026-09-11
**Agent Role:** PLANNING (Gate 3)
**Protocol:** AGENT_PROMPT_ALPHA v0.7
**IA doc:** `impact/CR-377_IMPACT_ANALYSIS.md`
**Entry verification:** All target lines confirmed current (2026-09-11 re-check)
**BUG-393 absorbed:** to: field added in F1-E1

---

## Scope Lock

**Files WILL change:**
- `src/api/services/reportService.js` — 1 edit (transform expansion, L396-473)
- `src/pages/OrderSummaryPage.jsx` — 9 edits across the file

**Files WILL NOT touch:**
- `src/api/constants.js`, any context, router, App.js, socket file, transform, other service

---

## Standard Reference Patterns

**Non-zero row pattern (OD-377-05 / OD-377-02):**
```jsx
{summaryData.fieldName > 0 && (
  <div className="flex items-center gap-3">...</div>
)}
```

**Existing breakdown row pattern (reused for new rows):**
```jsx
<div className="flex items-center gap-3">
  <div className="p-2 bg-{color}-500/20 rounded-lg">
    <Icon className="w-4 h-4 text-{color}-400" />
  </div>
  <div className="flex-1">
    <div className="flex justify-between mb-1">
      <span className="text-sm text-slate-300">{label}</span>
      <span className="text-sm text-white font-medium">
        {formatCurrency(value)}
        <span className="text-slate-500 text-xs ml-1">({pct}%)</span>
      </span>
    </div>
    <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
      <div className="h-full bg-{color}-500 rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
    </div>
  </div>
</div>
```

**Simple list row pattern (for Galla/Expense/Purchase breakdowns):**
```jsx
<div className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg">
  <span className="text-sm text-slate-300">{label}</span>
  <span className="text-sm text-white font-medium">{formatCurrency(value)}</span>
</div>
```

---

## FILE 1 — `src/api/services/reportService.js`

### F1-E1 — Expand `getDailySalesReport` transform (L396-473)

**Includes BUG-393 fix (to: field).**

**Find (exact):**
```js
export const getDailySalesReport = async (date) => {
  const dateStr = formatDateParam(date);
  const response = await api.post(API_ENDPOINTS.DAILY_SALES_REPORT, {
    from: dateStr,
  });
  const data = response.data || {};
  
  // Parse helper
  const toNum = (val) => parseFloat(val) || 0;
  
  return {
    // Top Cards (Key Metrics)
    sales: toNum(data.total_sales),
    paidRevenue: toNum(data.paid_revenue),
    runningOrders: toNum(data.running_order),
    orderTAB: toNum(data.orderTAB),
    unpaidRevenue: toNum(data.unpaid_revenue),
    cancelled: toNum(data.cancel_revenue?.['Pre-Serve']) + toNum(data.cancel_revenue?.['Post-Serve']),
    
    // Payment Breakdown
    paymentBreakdown: {
      cash: toNum(data.Cash),
      card: toNum(data.Card),
      upi: toNum(data.UPI),
      room: toNum(data.paid_revenue_method?.order_payment?.Room),
    },
    
    // Station Revenue (raw object for dynamic rendering)
    stationRevenue: data.station_revenue || {},
    
    // TAB (Credit)
    tabSettled: {
      total: toNum(data.total_tab_payment),
      cash: toNum(data.tab_cash),
      card: toNum(data.tab_card),
      upi: toNum(data.tab_upi),
    },
    
    // Room
    room: {
      orders: toNum(data.orderRoom),
      settledCash: toNum(data.room_revenue?.['Room Cash']),
      settledCard: toNum(data.room_revenue?.['Room Card']),
      settledUPI: toNum(data.room_revenue?.['Room UPI']),
      settledTotal: toNum(data.room_revenue?.['Room Cash']) + toNum(data.room_revenue?.['Room Card']) + toNum(data.room_revenue?.['Room UPI']),
    },
    
    // Aggregators
    aggregators: {
      zomato: toNum(data.aggrigator_order?.Zomato),
      swiggy: toNum(data.aggrigator_order?.swiggy),
    },
    
    // Cancellations
    cancellations: {
      preServe: toNum(data.cancel_revenue?.['Pre-Serve']),
      postServe: toNum(data.cancel_revenue?.['Post-Serve']),
    },
    
    // Deductions & Extras
    deductions: {
      discount: toNum(data.discount),
      tax: toNum(data.tax),
      tips: toNum(data.tips),
      serviceCharge: toNum(data.service_charge),
      roundOff: toNum(data.round_off),
    },
    
    // Date Range (business hours)
    dateRange: {
      from: data.from || null,
      to: data.to || null,
    },
    
    // Raw data for any additional needs
    ...(process.env.NODE_ENV === 'development' ? { _raw: data } : {}),
  };
};
```

**Replace with:**
```js
export const getDailySalesReport = async (date) => {
  const dateStr = formatDateParam(date);
  const response = await api.post(API_ENDPOINTS.DAILY_SALES_REPORT, {
    from: dateStr,
    to: dateStr, // BUG-393: was missing — backend ignores it but contract requires it
  });
  const data = response.data || {};

  // Parse helper
  const toNum = (val) => parseFloat(val) || 0;

  return {
    // Top Cards (Key Metrics)
    sales:        toNum(data.total_sales),
    paidRevenue:  toNum(data.paid_revenue),
    runningOrders:toNum(data.running_order),
    orderTAB:     toNum(data.orderTAB),
    unpaidRevenue:toNum(data.unpaid_revenue),
    cancelled:    toNum(data.cancel_revenue?.['Pre-Serve']) + toNum(data.cancel_revenue?.['Post-Serve']),
    profitLoss:   toNum(data.total_profit_loss), // CR-377: new KPI card

    // Payment Breakdown — CR-377: +zomatoGold, +partial, +roomCheckin
    paymentBreakdown: {
      cash:        toNum(data.Cash),
      card:        toNum(data.Card),
      upi:         toNum(data.UPI),
      room:        toNum(data.paid_revenue_method?.order_payment?.Room),
      zomatoGold:  toNum(data.paid_revenue_method?.order_payment?.Zomato_gold),     // CR-377
      partial:     toNum(data.paid_revenue_method?.order_payment?.Partial),          // CR-377
      roomCheckin: toNum(data.paid_revenue_method?.order_payment?.['Room Checkin']), // CR-377
    },

    // Station Revenue (raw object for dynamic rendering)
    stationRevenue: data.station_revenue || {},

    // TAB (Credit) — CR-377: +creditCash, +creditCard, +creditUpi
    tabSettled: {
      total:      toNum(data.total_tab_payment),
      cash:       toNum(data.tab_cash),
      card:       toNum(data.tab_card),
      upi:        toNum(data.tab_upi),
      creditCash: toNum(data.paid_revenue_method?.tab_payment?.['Credit Cash']), // CR-377
      creditCard: toNum(data.paid_revenue_method?.tab_payment?.['Credit Card']), // CR-377
      creditUpi:  toNum(data.paid_revenue_method?.tab_payment?.['Credit UPI']),  // CR-377
    },

    // Room — CR-377: +advance, +checkout, +checkin sub-object; settledTotal from API
    room: {
      orders:       toNum(data.orderRoom),
      settledCash:  toNum(data.room_revenue?.['Room Cash']),
      settledCard:  toNum(data.room_revenue?.['Room Card']),
      settledUPI:   toNum(data.room_revenue?.['Room UPI']),
      settledTotal: toNum(data.room_revenue?.['Room Total']),      // CR-377: from API (was computed sum)
      advance:      toNum(data.room_revenue?.['Room advance']),    // CR-377
      checkout:     toNum(data.room_revenue?.['Room Checkout']),   // CR-377
      checkinCash:  toNum(data.room_checkin_revenue?.['Room Cash']),  // CR-377
      checkinCard:  toNum(data.room_checkin_revenue?.['Room Card']),  // CR-377
      checkinUpi:   toNum(data.room_checkin_revenue?.['Room UPI']),   // CR-377
      checkinTab:   toNum(data.room_checkin_revenue?.['Room TAB']),   // CR-377
    },

    // Aggregators
    aggregators: {
      zomato: toNum(data.aggrigator_order?.Zomato),
      swiggy: toNum(data.aggrigator_order?.swiggy),
    },

    // Cancellations
    cancellations: {
      preServe:  toNum(data.cancel_revenue?.['Pre-Serve']),
      postServe: toNum(data.cancel_revenue?.['Post-Serve']),
    },

    // Deductions & Extras
    deductions: {
      discount:      toNum(data.discount),
      tax:           toNum(data.tax),
      tips:          toNum(data.tips),
      serviceCharge: toNum(data.service_charge),
      roundOff:      toNum(data.round_off),
    },

    // Expense — CR-377: entirely new section (10 fields)
    expense: {
      total:        toNum(data.total_expense),
      cash:         toNum(data.expense_cash),
      card:         toNum(data.expense_card),
      upi:          toNum(data.expense_upi),
      cashDraw:     toNum(data.expense_cash_draw),
      upiDrawer:    toNum(data.expense_upi_drawer),
      bankTransfer: toNum(data.expense_bank_transfer),
      store:        toNum(data.expense_store),
      unpaid:       toNum(data.expense_unpaid),
      others:       toNum(data.expense_others),
    },

    // Purchase — CR-377: entirely new section (10 fields)
    purchase: {
      total:         toNum(data.total_purchase),
      cash:          toNum(data.purchase_cash),
      card:          toNum(data.purchase_card),
      upi:           toNum(data.purchase_upi),
      cashDraw:      toNum(data.purchase_cash_draw),
      upiDrawer:     toNum(data.purchase_upi_drawer),
      bankTransfer:  toNum(data.purchase_bank_transfer),
      unpaid:        toNum(data.purchase_unpaid),
      others:        toNum(data.purchase_others),
      combinedTotal: toNum(data.total_purchase_and_expense),
    },

    // Galla / Cash Drawer — CR-377: entirely new section (8 fields)
    galla: {
      openingBalance:  toNum(data.total_opening_balance),
      todaySettlement: toNum(data.total_today_settlement),
      lastDayPending:  toNum(data.last_day_pending),
      balanceToSettle: toNum(data.total_balance_to_settle),
      todayGalla:      parseInt(data.today_galla) || 0, // INTEGER confirmed in API
      totalPaidCash:   toNum(data.total_paid_cash),
      pilferage:       toNum(data.total_pilferage),
      profitLoss:      toNum(data.total_profit_loss),
    },

    // Date Range (business hours)
    dateRange: {
      from: data.from || null,
      to:   data.to   || null,
    },

    // Raw data for development
    ...(process.env.NODE_ENV === 'development' ? { _raw: data } : {}),
  };
};
```

---

## FILE 2 — `src/pages/OrderSummaryPage.jsx`

### P2-E1 — Import: add TrendingDown, Receipt, ShoppingCart, Wallet (L3-6)

**Find:**
```jsx
import { 
  ArrowLeft, TrendingUp, Banknote, Clock, CreditCard as CreditCardIcon, XCircle,
  Smartphone, Building, ChefHat, Wine
} from "lucide-react";
```
**Replace:**
```jsx
import {
  ArrowLeft, TrendingUp, TrendingDown, Banknote, Clock, CreditCard as CreditCardIcon, XCircle,
  Smartphone, Building, ChefHat, Wine, Receipt, ShoppingCart, Wallet
} from "lucide-react"; // CR-377: TrendingDown, Receipt, ShoppingCart, Wallet added
```

---

### P2-E2 — paymentPercentages useMemo: include new methods (L60-68)

**Find:**
```jsx
  const paymentPercentages = useMemo(() => {
    if (!summaryData?.paymentBreakdown) return { cash: 0, card: 0, upi: 0 };
    const total = summaryData.sales || 1;
    return {
      cash: Math.round((summaryData.paymentBreakdown.cash / total) * 100),
      card: Math.round((summaryData.paymentBreakdown.card / total) * 100),
      upi: Math.round((summaryData.paymentBreakdown.upi / total) * 100),
    };
  }, [summaryData]);
```
**Replace:**
```jsx
  const paymentPercentages = useMemo(() => { // CR-377: extended for new payment methods
    if (!summaryData?.paymentBreakdown) return { cash: 0, card: 0, upi: 0, zomatoGold: 0, partial: 0, roomCheckin: 0 };
    const total = summaryData.sales || 1;
    return {
      cash:        Math.round((summaryData.paymentBreakdown.cash        / total) * 100),
      card:        Math.round((summaryData.paymentBreakdown.card        / total) * 100),
      upi:         Math.round((summaryData.paymentBreakdown.upi         / total) * 100),
      zomatoGold:  Math.round((summaryData.paymentBreakdown.zomatoGold  / total) * 100),
      partial:     Math.round((summaryData.paymentBreakdown.partial     / total) * 100),
      roomCheckin: Math.round((summaryData.paymentBreakdown.roomCheckin / total) * 100),
    };
  }, [summaryData]);
```

---

### P2-E3 — KPI strip grid: 5 → 6 columns + add P&L card (L158-261)

**Find:**
```jsx
              {/* ROW 1: KEY METRICS - 5 Cards */}
              <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-2 lg:gap-3 mb-4 lg:mb-6" data-testid="summary-cards">
```
**Replace:**
```jsx
              {/* ROW 1: KEY METRICS - 6 Cards (CR-377: +P&L) */}
              <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-2 lg:gap-3 mb-4 lg:mb-6" data-testid="summary-cards">
```

**Then find (closing of Cancelled card, end of grid):**
```jsx
                </div>
              </div>

              {/* ROW 2: REVENUE BREAKDOWN */}
```
**Replace:**
```jsx
                </div>

                {/* Profit / Loss Card — CR-377 */}
                <div className="bg-gradient-to-br from-amber-500/20 to-amber-600/10 border border-amber-500/30 rounded-xl p-4" data-testid="profit-loss-card">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="p-1.5 bg-amber-500/20 rounded-lg">
                      {(summaryData.profitLoss || 0) >= 0
                        ? <TrendingUp className="w-4 h-4 text-amber-400" />
                        : <TrendingDown className="w-4 h-4 text-red-400" />}
                    </div>
                    <span className="text-xs font-medium text-amber-300 uppercase">P&L</span>
                  </div>
                  <div className={`text-2xl font-bold mb-1 ${(summaryData.profitLoss || 0) >= 0 ? 'text-white' : 'text-red-400'}`}>
                    {formatCurrency(summaryData.profitLoss)}
                  </div>
                  <div className="text-xs text-slate-400">{(summaryData.profitLoss || 0) >= 0 ? 'Profit today' : 'Loss today'}</div>
                </div>
              </div>

              {/* ROW 2: REVENUE BREAKDOWN */}
```

---

### P2-E4 — Title rename (L128)

**Find:**
```jsx
                <h1 className="text-xl font-semibold text-white">Daily Summary</h1>
```
**Replace:**
```jsx
                <h1 className="text-xl font-semibold text-white">Sales Report</h1>{/* CR-377: OD-377-01 */}
```

---

### P2-E5 — Payment Breakdown: add 3 new rows + update Total (L323-336)

**Find:**
```jsx
                    {/* Total */}
                    <div className="pt-3 border-t border-slate-700">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-slate-400 font-medium">Total</span>
                        <span className="text-sm text-white font-semibold">
                          {(() => {
                            const payTotal = (summaryData.paymentBreakdown.cash || 0) + (summaryData.paymentBreakdown.card || 0) + (summaryData.paymentBreakdown.upi || 0);
                            return formatCurrency(payTotal);
                          })()}
                        </span>
                      </div>
                    </div>
```
**Replace:**
```jsx
                    {/* CR-377: Zomato Gold (OD-377-02) */}
                    {summaryData.paymentBreakdown.zomatoGold > 0 && (
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-red-500/20 rounded-lg">
                        <div className="w-4 h-4 rounded-full bg-red-500" />
                      </div>
                      <div className="flex-1">
                        <div className="flex justify-between mb-1">
                          <span className="text-sm text-slate-300">Zomato Gold</span>
                          <span className="text-sm text-white font-medium">
                            {formatCurrency(summaryData.paymentBreakdown.zomatoGold)}
                            <span className="text-slate-500 text-xs ml-1">({paymentPercentages.zomatoGold}%)</span>
                          </span>
                        </div>
                        <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                          <div className="h-full bg-red-500 rounded-full transition-all duration-500" style={{ width: `${paymentPercentages.zomatoGold}%` }} />
                        </div>
                      </div>
                    </div>
                    )}
                    {/* CR-377: Partial (OD-377-02) */}
                    {summaryData.paymentBreakdown.partial > 0 && (
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-yellow-500/20 rounded-lg">
                        <div className="w-4 h-4 rounded-full bg-yellow-500" />
                      </div>
                      <div className="flex-1">
                        <div className="flex justify-between mb-1">
                          <span className="text-sm text-slate-300">Partial</span>
                          <span className="text-sm text-white font-medium">
                            {formatCurrency(summaryData.paymentBreakdown.partial)}
                            <span className="text-slate-500 text-xs ml-1">({paymentPercentages.partial}%)</span>
                          </span>
                        </div>
                        <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                          <div className="h-full bg-yellow-500 rounded-full transition-all duration-500" style={{ width: `${paymentPercentages.partial}%` }} />
                        </div>
                      </div>
                    </div>
                    )}
                    {/* CR-377: Room Checkin (OD-377-02) */}
                    {summaryData.paymentBreakdown.roomCheckin > 0 && (
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-pink-500/20 rounded-lg">
                        <div className="w-4 h-4 rounded-full bg-pink-500" />
                      </div>
                      <div className="flex-1">
                        <div className="flex justify-between mb-1">
                          <span className="text-sm text-slate-300">Room Checkin</span>
                          <span className="text-sm text-white font-medium">
                            {formatCurrency(summaryData.paymentBreakdown.roomCheckin)}
                            <span className="text-slate-500 text-xs ml-1">({paymentPercentages.roomCheckin}%)</span>
                          </span>
                        </div>
                        <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                          <div className="h-full bg-pink-500 rounded-full transition-all duration-500" style={{ width: `${paymentPercentages.roomCheckin}%` }} />
                        </div>
                      </div>
                    </div>
                    )}
                    {/* Total — CR-377: updated to include new methods */}
                    <div className="pt-3 border-t border-slate-700">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-slate-400 font-medium">Total</span>
                        <span className="text-sm text-white font-semibold">
                          {(() => {
                            const pb = summaryData.paymentBreakdown;
                            const payTotal = (pb.cash||0) + (pb.card||0) + (pb.upi||0) + (pb.room||0) + (pb.zomatoGold||0) + (pb.partial||0) + (pb.roomCheckin||0); // CR-377
                            return formatCurrency(payTotal);
                          })()}
                        </span>
                      </div>
                    </div>
```

---

### P2-E6 — TAB section: add Credit Cash/Card/UPI breakdown (L355-369)

**Find:**
```jsx
                      <div className="space-y-1 text-xs text-slate-500">
                        <div className="flex justify-between">
                          <span>Cash</span>
                          <span>{formatCurrency(summaryData.tabSettled.cash)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Card</span>
                          <span>{formatCurrency(summaryData.tabSettled.card)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>UPI</span>
                          <span>{formatCurrency(summaryData.tabSettled.upi)}</span>
                        </div>
                      </div>
```
**Replace:**
```jsx
                      <div className="space-y-1 text-xs text-slate-500">
                        <div className="flex justify-between">
                          <span>Cash</span>
                          <span>{formatCurrency(summaryData.tabSettled.cash)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Card</span>
                          <span>{formatCurrency(summaryData.tabSettled.card)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>UPI</span>
                          <span>{formatCurrency(summaryData.tabSettled.upi)}</span>
                        </div>
                        {/* CR-377: Credit Cash/Card/UPI (OD-377-03) */}
                        {(summaryData.tabSettled.creditCash > 0 || summaryData.tabSettled.creditCard > 0 || summaryData.tabSettled.creditUpi > 0) && (
                          <>
                            <div className="pt-2 mt-1 border-t border-slate-700/60">
                              <div className="text-slate-500 mb-1 font-medium uppercase tracking-wide text-xs">Credit Collections</div>
                            </div>
                            {summaryData.tabSettled.creditCash > 0 && <div className="flex justify-between"><span>Credit Cash</span><span>{formatCurrency(summaryData.tabSettled.creditCash)}</span></div>}
                            {summaryData.tabSettled.creditCard > 0 && <div className="flex justify-between"><span>Credit Card</span><span>{formatCurrency(summaryData.tabSettled.creditCard)}</span></div>}
                            {summaryData.tabSettled.creditUpi > 0  && <div className="flex justify-between"><span>Credit UPI</span><span>{formatCurrency(summaryData.tabSettled.creditUpi)}</span></div>}
                          </>
                        )}
                      </div>
```

---

### P2-E7 — Room section: add advance, checkout + Check-In Revenue block (L452-489)

**Find:**
```jsx
              {/* ROW 4: OTHER PAYMENT TYPES (Room + future dynamic types) */}
              {features.room && (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3 lg:gap-4 mb-4 lg:mb-6">
                {/* Room - only if restaurant has Room enabled */}
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-5" data-testid="room-section">
                  <h3 className="text-base font-semibold text-white mb-4">Room</h3>
                  <div className="space-y-4">
                    <div className="p-4 bg-pink-500/10 border border-pink-500/20 rounded-lg">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-sm text-slate-300">Room Orders</span>
                        <span className="text-lg font-bold text-white">{formatCurrency(summaryData.room.orders)}</span>
                      </div>
                      <div className="text-xs text-slate-500">Pending checkout</div>
                    </div>
                    <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-lg">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm text-slate-300">Settled</span>
                        <span className="text-lg font-bold text-green-400">{formatCurrency(summaryData.room.settledTotal)}</span>
                      </div>
                      <div className="space-y-1 text-xs text-slate-500">
                        <div className="flex justify-between">
                          <span>Cash</span>
                          <span>{formatCurrency(summaryData.room.settledCash)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Card</span>
                          <span>{formatCurrency(summaryData.room.settledCard)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>UPI</span>
                          <span>{formatCurrency(summaryData.room.settledUPI)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              )}
```
**Replace:**
```jsx
              {/* ROW 4: ROOM — CR-377: +advance, +checkout, +checkin sub-section */}
              {features.room && (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3 lg:gap-4 mb-4 lg:mb-6">
                {/* Room Orders + Settled */}
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-5" data-testid="room-section">
                  <h3 className="text-base font-semibold text-white mb-4">Room</h3>
                  <div className="space-y-3">
                    <div className="p-4 bg-pink-500/10 border border-pink-500/20 rounded-lg">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-sm text-slate-300">Room Orders</span>
                        <span className="text-lg font-bold text-white">{formatCurrency(summaryData.room.orders)}</span>
                      </div>
                      <div className="text-xs text-slate-500">Pending checkout</div>
                    </div>
                    <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-lg">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm text-slate-300">Settled</span>
                        <span className="text-lg font-bold text-green-400">{formatCurrency(summaryData.room.settledTotal)}</span>
                      </div>
                      <div className="space-y-1 text-xs text-slate-500">
                        <div className="flex justify-between"><span>Cash</span><span>{formatCurrency(summaryData.room.settledCash)}</span></div>
                        <div className="flex justify-between"><span>Card</span><span>{formatCurrency(summaryData.room.settledCard)}</span></div>
                        <div className="flex justify-between"><span>UPI</span><span>{formatCurrency(summaryData.room.settledUPI)}</span></div>
                      </div>
                    </div>
                    {/* CR-377: Room Advance + Checkout */}
                    {summaryData.room.advance > 0 && (
                      <div className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg">
                        <span className="text-sm text-slate-300">Room Advance</span>
                        <span className="text-sm text-white font-medium">{formatCurrency(summaryData.room.advance)}</span>
                      </div>
                    )}
                    {summaryData.room.checkout > 0 && (
                      <div className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg">
                        <span className="text-sm text-slate-300">Room Checkout</span>
                        <span className="text-sm text-white font-medium">{formatCurrency(summaryData.room.checkout)}</span>
                      </div>
                    )}
                  </div>
                </div>
                {/* CR-377: Check-In Revenue sub-section (OD-377-04) */}
                {(summaryData.room.checkinCash > 0 || summaryData.room.checkinCard > 0 || summaryData.room.checkinUpi > 0 || summaryData.room.checkinTab > 0) && (
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-5" data-testid="room-checkin-section">
                  <h3 className="text-base font-semibold text-white mb-4">Check-In Revenue</h3>
                  <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-lg">
                    <div className="text-xs text-slate-500 uppercase tracking-wide font-semibold mb-3">Collected at check-in</div>
                    <div className="space-y-2 text-sm">
                      {summaryData.room.checkinCash > 0 && <div className="flex justify-between text-slate-300"><span>Cash</span><span className="text-white font-medium">{formatCurrency(summaryData.room.checkinCash)}</span></div>}
                      {summaryData.room.checkinCard > 0 && <div className="flex justify-between text-slate-300"><span>Card</span><span className="text-white font-medium">{formatCurrency(summaryData.room.checkinCard)}</span></div>}
                      {summaryData.room.checkinUpi > 0  && <div className="flex justify-between text-slate-300"><span>UPI</span><span className="text-white font-medium">{formatCurrency(summaryData.room.checkinUpi)}</span></div>}
                      {summaryData.room.checkinTab > 0  && <div className="flex justify-between text-slate-300"><span>TAB</span><span className="text-white font-medium">{formatCurrency(summaryData.room.checkinTab)}</span></div>}
                    </div>
                  </div>
                </div>
                )}
              </div>
              )}
```

---

### P2-E8 — Insert Galla + Expense + Purchase sections before ROW 5 Aggregators

**Find:**
```jsx
              {/* ROW 5: AGGREGATORS */}
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3 lg:gap-4">
```
**Replace:**
```jsx
              {/* ROW 5: GALLA / CASH DRAWER — CR-377: entirely new */}
              {(summaryData.galla?.todayGalla > 0 || summaryData.galla?.openingBalance > 0 || summaryData.galla?.profitLoss !== 0) && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 lg:gap-4 mb-4 lg:mb-6" data-testid="galla-section">
                {/* Today's Galla highlight */}
                <div className="bg-gradient-to-br from-amber-500/20 to-amber-600/10 border border-amber-500/30 rounded-xl p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="p-2 bg-amber-500/20 rounded-lg">
                      <Wallet className="w-5 h-5 text-amber-400" />
                    </div>
                    <h3 className="text-sm font-semibold text-amber-300">Galla / Cash Drawer</h3>
                  </div>
                  <div className="text-3xl font-bold text-white mb-1">{summaryData.galla.todayGalla}</div>
                  <div className="text-xs text-slate-400">Cash drawer count today</div>
                </div>
                {/* Cash Position */}
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
                  <h3 className="text-sm font-semibold text-white mb-3">Cash Position</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center justify-between p-2 bg-slate-800/50 rounded-lg">
                      <span className="text-slate-400">Opening Balance</span>
                      <span className="text-white font-medium">{formatCurrency(summaryData.galla.openingBalance)}</span>
                    </div>
                    <div className="flex items-center justify-between p-2 bg-slate-800/50 rounded-lg">
                      <span className="text-slate-400">Today Settlement</span>
                      <span className="text-white font-medium">{formatCurrency(summaryData.galla.todaySettlement)}</span>
                    </div>
                    <div className="flex items-center justify-between p-2 bg-slate-800/50 rounded-lg">
                      <span className="text-slate-400">Total Paid Cash</span>
                      <span className="text-white font-medium">{formatCurrency(summaryData.galla.totalPaidCash)}</span>
                    </div>
                    {summaryData.galla.pilferage > 0 && (
                    <div className="flex items-center justify-between p-2 bg-red-500/10 border border-red-500/20 rounded-lg">
                      <span className="text-slate-400">Pilferage</span>
                      <span className="text-red-400 font-medium">{formatCurrency(summaryData.galla.pilferage)}</span>
                    </div>
                    )}
                  </div>
                </div>
                {/* Settlement + P&L */}
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
                  <h3 className="text-sm font-semibold text-white mb-3">Settlement</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center justify-between p-2 bg-slate-800/50 rounded-lg">
                      <span className="text-slate-400">Last Day Pending</span>
                      <span className="text-white font-medium">{formatCurrency(summaryData.galla.lastDayPending)}</span>
                    </div>
                    <div className="flex items-center justify-between p-2 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                      <span className="text-slate-400">Balance to Settle</span>
                      <span className="text-amber-400 font-medium">{formatCurrency(summaryData.galla.balanceToSettle)}</span>
                    </div>
                    <div className={`flex items-center justify-between p-2 rounded-lg mt-2 ${summaryData.galla.profitLoss >= 0 ? 'bg-green-500/10 border border-green-500/20' : 'bg-red-500/10 border border-red-500/20'}`}>
                      <span className="text-slate-400 font-medium">Profit / Loss</span>
                      <span className={`font-semibold ${summaryData.galla.profitLoss >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {summaryData.galla.profitLoss >= 0 ? '+' : ''}{formatCurrency(summaryData.galla.profitLoss)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
              )}

              {/* ROW 6: EXPENSE + PURCHASE — CR-377: entirely new (OD-377-05: non-zero rows only) */}
              {(summaryData.expense?.total > 0 || summaryData.purchase?.total > 0) && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 lg:gap-4 mb-4 lg:mb-6" data-testid="expense-purchase-section">
                {/* Expense */}
                {summaryData.expense?.total > 0 && (
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-5" data-testid="expense-section">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <div className="p-2 bg-rose-500/20 rounded-lg">
                        <Receipt className="w-5 h-5 text-rose-400" />
                      </div>
                      <h3 className="text-base font-semibold text-white">Expense</h3>
                    </div>
                    <div className="px-3 py-1 bg-rose-500/15 border border-rose-500/30 rounded-full">
                      <span className="text-sm font-bold text-rose-400">{formatCurrency(summaryData.expense.total)} total</span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    {summaryData.expense.cash         > 0 && <div className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg"><span className="text-sm text-slate-300">Cash</span><span className="text-sm text-white font-medium">{formatCurrency(summaryData.expense.cash)}</span></div>}
                    {summaryData.expense.card         > 0 && <div className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg"><span className="text-sm text-slate-300">Card</span><span className="text-sm text-white font-medium">{formatCurrency(summaryData.expense.card)}</span></div>}
                    {summaryData.expense.upi          > 0 && <div className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg"><span className="text-sm text-slate-300">UPI</span><span className="text-sm text-white font-medium">{formatCurrency(summaryData.expense.upi)}</span></div>}
                    {summaryData.expense.cashDraw     > 0 && <div className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg"><span className="text-sm text-slate-300">Cash Drawer</span><span className="text-sm text-white font-medium">{formatCurrency(summaryData.expense.cashDraw)}</span></div>}
                    {summaryData.expense.upiDrawer    > 0 && <div className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg"><span className="text-sm text-slate-300">UPI Drawer</span><span className="text-sm text-white font-medium">{formatCurrency(summaryData.expense.upiDrawer)}</span></div>}
                    {summaryData.expense.bankTransfer > 0 && <div className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg"><span className="text-sm text-slate-300">Bank Transfer</span><span className="text-sm text-white font-medium">{formatCurrency(summaryData.expense.bankTransfer)}</span></div>}
                    {summaryData.expense.store        > 0 && <div className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg"><span className="text-sm text-slate-300">Store</span><span className="text-sm text-white font-medium">{formatCurrency(summaryData.expense.store)}</span></div>}
                    {summaryData.expense.unpaid       > 0 && <div className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg"><span className="text-sm text-slate-300">Unpaid</span><span className="text-sm text-white font-medium">{formatCurrency(summaryData.expense.unpaid)}</span></div>}
                    {summaryData.expense.others       > 0 && <div className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg"><span className="text-sm text-slate-300">Others</span><span className="text-sm text-white font-medium">{formatCurrency(summaryData.expense.others)}</span></div>}
                    {summaryData.purchase?.combinedTotal > 0 && (
                    <div className="pt-2 border-t border-slate-700 flex justify-between">
                      <span className="text-sm text-slate-400 font-medium">Combined (Exp + Purchase)</span>
                      <span className="text-sm text-white font-semibold">{formatCurrency(summaryData.purchase.combinedTotal)}</span>
                    </div>
                    )}
                  </div>
                </div>
                )}
                {/* Purchase */}
                {summaryData.purchase?.total > 0 && (
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-5" data-testid="purchase-section">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <div className="p-2 bg-cyan-500/20 rounded-lg">
                        <ShoppingCart className="w-5 h-5 text-cyan-400" />
                      </div>
                      <h3 className="text-base font-semibold text-white">Purchase</h3>
                    </div>
                    <div className="px-3 py-1 bg-cyan-500/15 border border-cyan-500/30 rounded-full">
                      <span className="text-sm font-bold text-cyan-400">{formatCurrency(summaryData.purchase.total)} total</span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    {summaryData.purchase.cash         > 0 && <div className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg"><span className="text-sm text-slate-300">Cash</span><span className="text-sm text-white font-medium">{formatCurrency(summaryData.purchase.cash)}</span></div>}
                    {summaryData.purchase.card         > 0 && <div className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg"><span className="text-sm text-slate-300">Card</span><span className="text-sm text-white font-medium">{formatCurrency(summaryData.purchase.card)}</span></div>}
                    {summaryData.purchase.upi          > 0 && <div className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg"><span className="text-sm text-slate-300">UPI</span><span className="text-sm text-white font-medium">{formatCurrency(summaryData.purchase.upi)}</span></div>}
                    {summaryData.purchase.cashDraw     > 0 && <div className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg"><span className="text-sm text-slate-300">Cash Drawer</span><span className="text-sm text-white font-medium">{formatCurrency(summaryData.purchase.cashDraw)}</span></div>}
                    {summaryData.purchase.upiDrawer    > 0 && <div className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg"><span className="text-sm text-slate-300">UPI Drawer</span><span className="text-sm text-white font-medium">{formatCurrency(summaryData.purchase.upiDrawer)}</span></div>}
                    {summaryData.purchase.bankTransfer > 0 && <div className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg"><span className="text-sm text-slate-300">Bank Transfer</span><span className="text-sm text-white font-medium">{formatCurrency(summaryData.purchase.bankTransfer)}</span></div>}
                    {summaryData.purchase.unpaid       > 0 && <div className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg"><span className="text-sm text-slate-300">Unpaid</span><span className="text-sm text-white font-medium">{formatCurrency(summaryData.purchase.unpaid)}</span></div>}
                    {summaryData.purchase.others       > 0 && <div className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg"><span className="text-sm text-slate-300">Others</span><span className="text-sm text-white font-medium">{formatCurrency(summaryData.purchase.others)}</span></div>}
                    <div className="pt-2 border-t border-slate-700 flex justify-between">
                      <span className="text-sm text-slate-400 font-medium">Purchase Total</span>
                      <span className="text-sm text-white font-semibold">{formatCurrency(summaryData.purchase.total)}</span>
                    </div>
                  </div>
                </div>
                )}
              </div>
              )}

              {/* ROW 7: AGGREGATORS */}
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3 lg:gap-4">
```

---

## Execution Order

```
1. reportService.js  → F1-E1 (expand transform + BUG-393 fix)     — compile check
2. OrderSummaryPage.jsx:
   a. P2-E1 (imports)
   b. P2-E2 (paymentPercentages useMemo)
   c. P2-E4 (title rename)                                          — compile check
   d. P2-E3 (KPI grid 5→6 + P&L card)
   e. P2-E5 (payment breakdown: 3 new rows + total update)
   f. P2-E6 (TAB credit breakdown)                                  — compile check
   g. P2-E7 (room: advance/checkout/checkin)
   h. P2-E8 (Galla + Expense + Purchase new sections)               — final compile check
```

---

## Verification Matrix

| # | Edit | Verify | Method |
|---|---|---|---|
| V1 | F1-E1 BUG-393 | `to:` present in POST payload | Network → daily-sales-revenue-report |
| V2 | P2-E4 | Title shows "Sales Report" | Visual |
| V3 | P2-E3 | 6th KPI card (P&L) renders with correct value + colour | Visual |
| V4 | P2-E5 | Zomato Gold / Partial appear when > 0 (test with thegoankitchen) | Network + Visual |
| V5 | P2-E5 | Payment total updated (includes new methods) | Check total row |
| V6 | P2-E6 | Credit Cash/Card/UPI appear in TAB when > 0 | Visual (TAB account) |
| V7 | P2-E7 | Room Advance + Checkout rows appear when > 0 | Visual (room account) |
| V8 | P2-E7 | Check-In Revenue block appears when any checkin > 0 | Visual |
| V9 | P2-E8 | Galla section renders with amber theme | Visual (account with galla data) |
| V10 | P2-E8 | Expense section renders non-zero rows only (OD-377-05) | Visual |
| V11 | P2-E8 | Purchase section renders non-zero rows only | Visual |
| V12 | P2-E8 | Combined (Exp + Purchase) total shows in Expense footer | Visual |
| V13 | Regression | All existing 32 fields still correct | Value spot-check vs Network response |
| V14 | Regression | Zero sections absent (Galla/Expense/Purchase hidden on zero-data day) | Check with account with no expense |
| V15 | Compile | webpack 0 new warnings | `tail frontend.out.log` |

---

## Post-Code Registry Checklist (for Implementation agent)

```
- [ ] registry.json: CR-377 → status: IMPLEMENTED, gate: 5, sprint_key: pos_7_0
- [ ] registry.json: BUG-393 → status: CLOSED (absorbed by CR-377)
- [ ] CR_REGISTRY.md: CR-377 row → IMPLEMENTED
- [ ] BUG_TRACKER.md: BUG-393 → CLOSED (absorbed)
- [ ] FILE_OWNERSHIP.md: reportService.js + OrderSummaryPage.jsx → CR-377 entry
- [ ] Code markers: // CR-377 on every added/modified block (already in plan above)
- [ ] Compile: webpack 0 new warnings
```

---

*Gate 3 complete. 2 files, 9 edits (1 in reportService.js + 8 in OrderSummaryPage.jsx). BUG-393 absorbed. Entry verification: PASS (all target lines current). Awaiting Gate 4 GO → Implementation.*
*PLANNING Agent — ALPHA v0.7 — 2026-09-11*
