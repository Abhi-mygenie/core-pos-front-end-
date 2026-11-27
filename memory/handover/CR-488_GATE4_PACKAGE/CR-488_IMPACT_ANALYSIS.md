# CR-488 — Impact Analysis
## Credit Management — Print (Reprint) button in Order Detail pop-up (SS3)

**ID:** CR-488
**Gate:** 2 — Impact Analysis
**Date:** 2026-11-05
**Code Reality:** NONE — no print/reprint logic in Credit Management or OrderDetailSheet today.
**Risk:** HIGH (touches printing pipeline, Printer Agent, shared component `OrderDetailSheet`)
**Conflict Pre-Check:** No other item currently modifies `OrderDetailSheet.jsx`. CR-489 (lock after bill print) touches order editing but not this component. SAFE.

---

## 0. Owner Claim Validation

> "No backend blocker. The Reprint button already exists in Orders (Beta) report and works. It calls `API_ENDPOINTS.SINGLE_ORDER_NEW` to fetch order data, then `printOrder()` to send it to the Printer Agent. This exact same pattern can be reused in Credit Management."

### Verdict: ✅ VALIDATED (with one caveat)

| Claim | Evidence | Result |
|---|---|---|
| Reprint exists in Orders (Beta) | `OrderReportBetaPage.jsx` L329-361: `handleReprint()` | ✅ Confirmed |
| Uses `SINGLE_ORDER_NEW` | L337: `api.post(API_ENDPOINTS.SINGLE_ORDER_NEW, { order_id: row.order_id })` | ✅ Confirmed |
| Then calls `printOrder()` | L352: `await printOrder(row.order_id, 'bill', null, order, 0, {}, printerAgents \|\| [])` | ✅ Confirmed |
| Pattern reusable in Credit | Credit SS3 (`OrderDetailSheet`) already has `order.id` (orderId) from `CreditCustomerDetailSheet` L716 `{ orderId, restaurantOrderId }` | ✅ Confirmed |
| No backend blocker (basic reprint) | `SINGLE_ORDER_NEW` + `order-temp-store` endpoints already work | ✅ Confirmed |
| **DUPLICATE mark** (OD-488-03) | `buildBillPrintPayload` has NO `isDuplicate` field. Backend brief §E filed but **UNCONFIRMED**. Printer Agent template must read it. | ⚠️ **BACKEND DEPENDENCY** — FE can pass it, backend/template must read it |

---

## 1. Frozen Owner Decisions

| OD | Decision | Locked |
|---|---|---|
| OD-488-01 | Print button in **SS3** (Order Details pop-up) | ✅ |
| OD-488-02 | Print via **Printer Agent** (2"/3" thermal) — reuse existing `printOrder()` path | ✅ |
| OD-488-03 | Reprinted bill must show **"DUPLICATE"** | ✅ — depends on backend §E |
| OD-488-04 | Statement print already exists → **out of scope** | ✅ |

---

## 2. Data Flow Trace

### Existing Reprint Flow (OrderReportBetaPage — source of truth)

```
User clicks "Reprint" on report row
  → handleReprint(row)
    → api.post(SINGLE_ORDER_NEW, { order_id })           // fetch full order
    → raw response → orderFromAPI.order(raw)              // transform to cart shape
    → printOrder(orderId, 'bill', null, order, 0, {}, printerAgents)
      → toAPI.buildBillPrintPayload(order, scPct, overrides)
        → api.post(PRINT_ORDER = '/api/v1/vendoremployee/order-temp-store', payload)
          → Printer Agent prints bill
```

### Proposed Credit SS3 Flow (new)

```
User opens Credit SS3 (OrderDetailSheet) → views order detail
User clicks "Print Bill" in SS3 footer
  → handlePrint(order.id)
    → api.post(SINGLE_ORDER_NEW, { order_id })           // SAME endpoint
    → raw → orderFromAPI.order(raw)                       // SAME transform
    → printOrder(orderId, 'bill', null, order, 0, { isDuplicate: true }, printerAgents)
      → toAPI.buildBillPrintPayload(order, 0, { isDuplicate: true })
        → payload includes is_duplicate: true             // NEW field (backend §E)
        → api.post(PRINT_ORDER, payload)
          → Printer Agent prints bill with "DUPLICATE" watermark
```

### Key Difference: Transform mismatch

`OrderDetailSheet` currently fetches via `reportService.getSingleOrderNew()` which uses `reportFromAPI.singleOrderNew()` — a **display-friendly** transform (items with timeline, amounts, no `rawOrderDetails`).

`printOrder()` needs `orderFromAPI.order()` — a **print-friendly** transform (has `rawOrderDetails`, financial fields for `buildBillPrintPayload`).

**These are DIFFERENT transforms on the SAME endpoint.** The reprint handler must make its OWN call using the `orderFromAPI.order()` path — exactly as `OrderReportBetaPage.handleReprint` does (L337-347). It CANNOT reuse the existing `details` state in `OrderDetailSheet`.

---

## 3. Affected Files

### Files WILL change

| # | File | Change | Risk |
|---|---|---|---|
| **1** | `src/components/reports/OrderDetailSheet.jsx` | Add Reprint button in footer + `handlePrint` callback with loading state. Import `api`, `API_ENDPOINTS`, `orderFromAPI`, `printOrder`, `useRestaurant`. | HIGH (shared component — 6 consumers) |

### Files will NOT touch

| File | Why |
|---|---|
| `orderTransform.js` (R5 hotspot) | `buildBillPrintPayload` already supports `overrides` object spread — `isDuplicate` passes through naturally. **However**, until backend §E is confirmed, the field is a no-op. No code change needed in this file. |
| `orderService.js` | `printOrder()` already passes `overrides` → `buildBillPrintPayload`. No change. |
| `CreditCustomerDetailSheet.jsx` | SS2 not touched per OD-488-01 (button lives in SS3). |
| `CreditManagementPage.jsx` | No change — `useRestaurant` context is available in the tree. |
| `reportService.js` | Existing `getSingleOrderNew` unchanged — the reprint handler calls the raw API separately. |
| `constants.js` | `SINGLE_ORDER_NEW` and `PRINT_ORDER` already defined. |

---

## 4. Implementation Considerations

### 4a. `printerAgents` access in OrderDetailSheet

`OrderDetailSheet` currently has zero context imports. To call `printOrder()`, it needs `printerAgents` from `useRestaurant()`.

**Options:**
- **(A) Import `useRestaurant` directly in `OrderDetailSheet`** — simplest, 1 line. All parents (Credit, Audit, Ledger, FoodCourt) already sit under the RestaurantProvider tree.
- **(B) Pass `printerAgents` as prop** — requires changes in all 6 consumer call-sites (`CreditCustomerDetailSheet`, `AllOrdersReportPage`, `OrderLedgerMockup`, `FoodCourtMockup`, `FoodCourtBetaPage`).

**Recommendation: (A)** — minimal blast radius, no prop threading needed.

### 4b. Scope: Reprint for ALL OrderDetailSheet consumers — OD-488-05 LOCKED (A)

Owner decision: **(A) Always visible** when order details are loaded and order is not cancelled/merged. Unified UX — any drill-down (Credit, Audit, Ledger, Food Court) can reprint. No `tabId` gate needed.

### 4c. DUPLICATE mark (OD-488-03) — backend-side, no FE gate — OD-488-06 LOCKED (A)

Owner decision: ship reprint now. DUPLICATE rendering is a backend/Printer Agent template concern. Backend brief §E already filed. FE sends the standard `printOrder()` call — if backend wants to mark reprints as DUPLICATE, they read `print_bill_status` (already `"Yes"` after first print) or add their own flag server-side. **No `isDuplicate` override needed in FE code.**

### 4d. Button placement — HEADER (owner-directed)

Owner directed: button goes in the **SS3 header bar**, left of the close button (not in footer).

Current header layout: `[Title + Badge] ... [Close btn]`
After: `[Title + Badge] ... [Print Bill btn] [Close btn]`

Mockup: `/cr488-reprint-placement-mockup.html` (updated to show header placement).

---

## 5. Downstream Consumers of OrderDetailSheet

Any change to `OrderDetailSheet.jsx` affects ALL consumers:

| Consumer | File | How it uses OrderDetailSheet | Impact of adding Reprint |
|---|---|---|---|
| **Credit Management SS3** | `CreditCustomerDetailSheet.jsx` L716 | Opens via `setBillOrder({ orderId, restaurantOrderId })` with `tabId="credit"` | ✅ TARGET — this is where the button is wanted |
| **All Orders Report** | `AllOrdersReportPage.jsx` L1096 | Opens via row click, multiple `tabId` values | Low — already has row-level reprint; SS3 button is redundant but harmless |
| **Order Ledger** | `OrderLedgerMockup.jsx` L1194 | Opens via row drill, `tabId="ledger"` or similar | Low — additive button, no conflict |
| **Food Court** | `FoodCourtMockup.jsx` L841 | Opens via row drill | Low — same |

If gated by `tabId === 'credit'` (Option 4b-B), downstream impact is **ZERO** for non-credit consumers.

---

## 6. Risk Register

| # | Risk | Severity | Mitigation |
|---|---|---|---|
| R-1 | **DUPLICATE mark not rendered** — backend §E unconfirmed | MEDIUM | Ship basic reprint without DUPLICATE. Add flag after backend confirms. Two-phase delivery. |
| R-2 | **OrderDetailSheet is shared** — change visible to 6 consumers | MEDIUM | Gate button with `tabId === 'credit'` (pending OD-488-05). |
| R-3 | **`useRestaurant` hook call in OrderDetailSheet** — adds a context dependency to a previously context-free component | LOW | `useRestaurant` is available in all parent trees. No SSR or test isolation concern (component is browser-only). |
| R-4 | **Double print** — user clicks while Printer Agent is processing | LOW | Loading state + disabled button during `printOrder()` call (same pattern as OrderReportBeta `printingIds`). |
| R-5 | **Credit orders with `orderId = 0`** — some credit entries have no linked order | LOW | Button only shown when `details` is loaded AND `details.paymentStatus` exists. Entries with no order detail already show "View" disabled in SS2. |

---

## 7. Owner Decisions — LOCKED

| OD | Decision | Locked |
|---|---|---|
| **OD-488-05** | **LOCKED (A):** Reprint button visible for **ALL** OrderDetailSheet consumers (not just Credit). | ✅ 2026-11-05 |
| **OD-488-06** | **LOCKED (A):** Ship reprint now. DUPLICATE mark is backend-side — backend brief §E already sent, backend handles it if needed. No FE gate on DUPLICATE. | ✅ 2026-11-05 |

---

## 8. Execution Sequence (for Gate 3 planning)

1. Add imports to `OrderDetailSheet.jsx` (`api`, `API_ENDPOINTS`, `orderFromAPI`, `printOrder`, `useRestaurant`, `Printer` icon)
2. Add `handlePrint` callback (mirrors `OrderReportBetaPage.handleReprint` exactly)
3. Add loading state (`isPrinting`)
4. Add Reprint button in footer section — visible for all consumers (OD-488-05 = A), shown when order is loaded and not cancelled/merged
5. Test: open Credit SS3 → click Print → verify `order-temp-store` call fires
6. DUPLICATE mark is backend-side (OD-488-06 = A) — no FE follow-up needed

---

## 9. Summary

The owner's claim is **validated**: the existing Reprint pattern from `OrderReportBetaPage` (SINGLE_ORDER_NEW → orderFromAPI.order → printOrder) can be reused identically in Credit Management's SS3 (`OrderDetailSheet`). The only code change is **1 file** (`OrderDetailSheet.jsx`), adding ~30 lines for the button + handler.

**All ODs locked. Gate 2 CLOSED.**

| OD | Decision |
|---|---|
| OD-488-05 | **(A)** Reprint button for ALL consumers — no `tabId` gate |
| OD-488-06 | **(A)** Ship now — DUPLICATE is backend-side (brief §E already sent) |

DUPLICATE mark rendering is entirely backend/Printer Agent scope. No R5 hotspot (`orderTransform.js`) changes needed. Zero open questions for Gate 3.
