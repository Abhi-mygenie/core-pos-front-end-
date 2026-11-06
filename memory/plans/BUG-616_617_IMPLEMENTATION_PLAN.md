# BUG-616 + BUG-617 — Implementation Plan

**Items:** BUG-616 (Pie Tooltip ₹0) + BUG-617 (6 Insights Pages Data Path Mismatch)
**Stage:** Gate 3 — Implementation Plan
**Code Reality:** PARTIAL (PaymentsMockup has BUG-194 fix, 6 others don't)
**Risk:** MEDIUM
**Scope Lock:** 7 files in `pages/reports-module/`. No service, API, constant, or structural changes.

---

## Execution Sequence

**All edits are independent — batch all 7 files in parallel.**

---

## BUG-616: A1 — ChannelPivotMockup.jsx Tooltip Fix

**File:** `src/pages/reports-module/ChannelPivotMockup.jsx`
**Line 56. Current:**
```js
      <div>{fmtINR(d.revenue)} · {d.orders} orders</div>
```
**New:**
```js
      <div>{fmtINR(d.value || d.revenue)} · {d.orders} orders</div>
```

---

## BUG-617: B1 — ChannelPivotMockup.jsx Data Path

**File:** `src/pages/reports-module/ChannelPivotMockup.jsx`
**L129. Current:** `const s = salesData.summary || {};`
**New:** `const s = salesData.data?.summary || salesData.summary || {};`

**L133. Current:** `const channels = (salesData.channels || []).map(c => ({`
**New:** `const channels = (salesData.data?.channels || salesData.channels || []).map(c => ({`

**L141. Current:** `const payments = (salesData.payments || []).map(p => ({`
**New:** `const payments = (salesData.data?.payments || salesData.payments || []).map(p => ({`

---

## BUG-617: B2 — SalesMockup.jsx Data Path

**File:** `src/pages/reports-module/SalesMockup.jsx`
**L177. Current:** `const s = salesData.summary || {};`
**New:** `const s = salesData.data?.summary || salesData.summary || {};`

**L178. Current:** `const daily = (salesData.daily || []).map(d => ({`
**New:** `const daily = (salesData.data?.daily || salesData.daily || []).map(d => ({`

**L191. Current:** `const channels = (salesData.channels || []).map(c => ...`
**New:** `const channels = (salesData.data?.channels || salesData.channels || []).map(c => ...`

**L192. Current:** `const payments = (salesData.payments || []).map(p => ...`
**New:** `const payments = (salesData.data?.payments || salesData.payments || []).map(p => ...`

**L193. Current:** `const hourly = (salesData.hourly || []).map(h => ...`
**New:** `const hourly = (salesData.data?.hourly || salesData.hourly || []).map(h => ...`

---

## BUG-617: B3 — DailySalesMockup.jsx Data Path

**File:** `src/pages/reports-module/DailySalesMockup.jsx`
**L128. Current:** `const s = salesData.summary || {};`
**New:** `const s = salesData.data?.summary || salesData.summary || {};`

**L129. Current:** `const rawDaily = (salesData.daily || []).map(d => ({`
**New:** `const rawDaily = (salesData.data?.daily || salesData.daily || []).map(d => ({`

---

## BUG-617: B4 — HourlySalesMockup.jsx Data Path

**File:** `src/pages/reports-module/HourlySalesMockup.jsx`
**L118. Current:** `const s = salesData.summary || {};`
**New:** `const s = salesData.data?.summary || salesData.summary || {};`

**L120. Current:** `(salesData.hourly || []).forEach(h => {`
**New:** `(salesData.data?.hourly || salesData.hourly || []).forEach(h => {`

---

## BUG-617: B5 — DayOfWeekMockup.jsx Data Path

**File:** `src/pages/reports-module/DayOfWeekMockup.jsx`
**L114. Current:** `const s = salesData.summary || {};`
**New:** `const s = salesData.data?.summary || salesData.summary || {};`

**L117. Current:** `(salesData.daily || []).forEach(d => {`
**New:** `(salesData.data?.daily || salesData.daily || []).forEach(d => {`

---

## BUG-617: B6 — RoundOffMockup.jsx Data Path

**File:** `src/pages/reports-module/RoundOffMockup.jsx`
**L69. Current:** `salesData.summary?.total_revenue`
**New:** `(salesData.data?.summary || salesData.summary)?.total_revenue`

**L70. Current:** `salesData.summary?.total_orders`
**New:** `(salesData.data?.summary || salesData.summary)?.total_orders`

---

## Verification Matrix

| # | Bug | File | Verification | Method |
|---|---|---|---|---|
| V1 | 616 | ChannelPivotMockup | Hover pie slice → tooltip shows ₹ value (not ₹0) | Browser |
| V2 | 617 | ChannelPivotMockup | Pie slices + KPIs show real revenue data | Browser |
| V3 | 617 | SalesMockup | Daily bars + channel/payment pies + KPIs populated | Browser |
| V4 | 617 | DailySalesMockup | Daily trend bars render with revenue | Browser |
| V5 | 617 | HourlySalesMockup | Hourly bars render | Browser |
| V6 | 617 | DayOfWeekMockup | Day-of-week bars render | Browser |
| V7 | 617 | RoundOffMockup | Revenue + Orders KPIs show values | Browser |
| V8 | ALL | — | webpack compiles, 0 new warnings | CLI |

---

## Post-Code Registry Checklist

```
- [ ] registry.json: BUG-616 + BUG-617 → GATE_5A_IMPLEMENTED
- [ ] FILE_OWNERSHIP.md: 7 files listed
- [ ] Code markers: // BUG-616 and // BUG-617 in modified lines
- [ ] Compile check: webpack 0 new warnings
```

---

## Gate Status

- Gate 2: COMPLETE (Impact Analysis)
- Gate 3: **COMPLETE** (this document)
- Gate 4: Awaiting owner "Gate 4 GO" → Implementation
