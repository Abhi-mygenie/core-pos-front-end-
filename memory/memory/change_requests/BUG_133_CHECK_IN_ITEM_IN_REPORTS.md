# BUG-133 — "Check In" Item Appearing in Reports — Should Be Excluded (Backend-Only Marker)

**Status:** REGISTERED — INTAKE COMPLETE
**Created:** 2026-06-12
**Type:** Bug
**Area:** Reports / Data Filtering
**Priority:** P2 (data quality — internal backend marker leaking into user-facing reports)
**Sprint:** POS 4.0

---

## 1. Symptom

An item called **"Check In"** (or similar) appears in reports. This item is **not a real menu item** — it's a backend-only marker that denotes a room has been checked in. It should never appear in any user-facing report (Item Sales, Order Ledger, Audit Report, Food Court, etc.).

---

## 2. Known Prior Defence

There is already a partial defence in `productTransform.js` (L48):
```js
.filter(p => p.productName.toLowerCase() !== 'check in');
```
This filters "check in" from the **products list** (menu context). However, reports fetch data from **order-logs-report API** directly — they don't go through `productTransform`. So the "Check In" item can still appear in report data where it's part of an order's items array.

---

## 3. Investigation Scope (deferred)

When investigation begins, trace everywhere "Check In" could surface:
1. **Item Sales / Item Ledger** (`ItemSalesHybridMockup.jsx`, `insightsService.js`) — aggregated by food_id
2. **Order Ledger** (`OrderLedgerMockup.jsx`, `orderLedgerService.js`) — order items list
3. **Audit Report** (`AllOrdersReportPage.jsx`, `reportTransform.js`) — order detail sheet items
4. **Food Court** (`FoodCourtMockup.jsx`, `foodCourtService.js`) — station-wise items
5. **Room Orders** (`RoomOrdersMockup.jsx`) — room order items
6. **Dashboard order cards** — item list on OrderCard/TableCard
7. **Exports (Excel/PDF)** — all report exports
8. **Credit statements** — if a "Check In" item is in a credit order

## Owner Decisions (received 2026-06-12)

| # | Decision | Answer |
|---|----------|--------|
| OD-1 | Exclude from Room Orders Report too? | **YES — exclude everywhere, no exceptions** |
| OD-2 | Filter method | **String match on "check in"** — case-insensitive, **trimmed** (handle leading/trailing spaces, mixed case). Pattern: `(name || '').trim().toLowerCase() === 'check in'` |

Note: Owner specified "all cases, trim possibilities" — the filter must handle `"Check In"`, `"check in"`, `" Check In "`, `"CHECK IN"`, `"check in "`, etc.

Note: The existing `productTransform.js` filter already excludes `food_for !== 'Normal'` items AND items named "check in" — but this only applies to the menu/product list, not to report data transforms.

---

## 4. Impact (preliminary)

- **Files:** Multiple report services/transforms — wherever order items are rendered
- **Regression risk:** LOW — additive filter, no data mutation
- **Money/payload impact:** Could inflate revenue/tax numbers in reports if "Check In" has a price attached

---

## 5. Gate Status

| Gate | Status |
|------|--------|
| 0 — Registration | ✅ COMPLETE |
| 1 — Intake | ✅ COMPLETE (this document) |
| 2 — Impact Analysis | PENDING (investigation deferred) |
| 3 — Implementation Plan | PENDING |
| 4 — Code Gate | PENDING |
| 5 — Implementation + QA | PENDING |
| 6 — Owner Smoke | PENDING |

---

*BUG-133 Intake — 2026-06-12*
