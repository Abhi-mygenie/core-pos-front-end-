# Investigation Report — 11 Issues Batch
## 2026-08-26

**Role:** INVESTIGATION
**Steps used:** 10/10
**Confidence:** HIGH on 9 issues, MEDIUM on 2 (need live test)

---

## ISSUE 1 — Redundant document upload for verified customers

**Root cause: CODE_ERROR — `RoomCheckInModal.jsx` line 610**
```js
if (flags.guestDetails) {
  if (!frontImage) next.front = 'Front image required';  // no crmDocuments.length check
}
```
`crmDocuments.length > 0` (verified docs on file) is never checked. Upload always required.
**Fix:** `if (!frontImage && crmDocuments.length === 0) next.front = 'Front image required';`

---

## ISSUE 2 — Custom Item GST field missing

**Root cause: MISSING_FEATURE — `AddCustomItemModal.jsx` has no tax state/field**
State only has: `name`, `categoryId`, `price`, `qty`, `notes`. No `gst`/`taxType`/`taxCalc`.
`addCustomItem` payload sends no tax fields → custom items always have 0% tax.
**Fix:** Add GST % input + tax type selector to modal and wire to API payload.

---

## ISSUE 3 — Amount overlapping Change button

**Root cause: LAYOUT_BUG — amount column `w-24` (96px) too narrow**
`OrderTable.jsx` column: `{ id: 'amount', width: 'w-24', align: 'right' }`.
For larger amounts like ₹270, ₹140, ₹1400 the text overflows into the adjacent actions cell.
**Fix:** Increase to `w-28` or `w-32` for the amount column.

---

## ISSUE 4 — OrderReportBetaPage: 3 sub-issues

**4a — >1 month data:** No FE date limit found. Likely backend enforces 1-month cap on `ORDER_REPORT_BETA_COMBINED`. Needs backend confirmation.

**4b — Status missing:** Status column IS implemented (lines 467/487). Likely `deriveStatus()` returning null for some order types. Needs live test to confirm rows.

**4c — Settled tab: Change/Unpaid/Reprint missing:** `OrderReportBetaPage` uses its own custom table — no `actionsConfig` system, no `OrderTable` component. The settled tab has zero action buttons (only Refund from CR-165). Unlike `AllOrdersReportPage` which uses `OrderTable` with full Change/Unpaid/Print wiring.
**Fix:** Wire action buttons for settled/paid rows in `OrderReportBetaPage`.

---

## ISSUE 5 — ID required but not mandatory (Satkar hotel)

**Root cause: No backend settings key exists for ID upload mandatory/optional**
Settings API returned no ID-related keys. `flags.guestDetails` gates the section but no toggle exists.
**Backend needs:** New settings key e.g. `id_upload_required: true/false`.
**FE needs:** Read flag + wrap frontImage validation.

---

## ISSUE 6 — Payment type missing in purchase report (Cash/UPI/Bank Transfer ₹0)

**Root cause: CODE_ERROR — `PurchaseReportPage.jsx` line 197**
```js
const p = r.Payment_Type || 'Cash';
```
API returns `Payment_Type: 'paid'` (confirmed from screenshot). `'paid'` ∉ `['Cash', 'UPI', 'Bank Transfer']` → accumulates under key `'paid'` → all 3 cards show ₹0.
**Fix:** Map 'paid' → 'Cash' (or whatever default) OR make cards dynamic from actual `Payment_Type` values.

---

## ISSUE 7 — Customer data not saved

**Root cause: NEEDS LIVE TEST**
`CartPanel` has `customerName`/`customerPhone` local state wired via `onCustomerChange`. `placeOrder` payload uses `customer?.name`. Hypothesis: stale `customer` prop when user types directly. Needs live test to confirm exact failure path (CRM lookup vs manual entry).

---

## ISSUE 8 / 10 — Advance payment > room price blocked (DUPLICATE — same issue)

**Root cause: CODE_ERROR — explicit FE validation `RoomCheckInModal.jsx` line 630**
```js
else if (advancePayment !== '' && adv > ord) next.advance = 'Advance cannot be greater than Room Price';
```
Backend probe: HTTP 403 from invalid room_id, NOT from amount validation → **backend allows advance > room_price**.
**Fix:** Remove this FE validation (or convert to warning).

---

## ISSUE 9 — Sidebar not persisted / unlocked state lost

**Root cause: CODE_ERROR — `DashboardPage.jsx` line 448**
```js
const [sidebarExpanded, setSidebarExpanded] = useState(false); // plain useState, no localStorage
```
Every page load resets to `false` (collapsed). No localStorage read/write.
**Fix:**
```js
const [sidebarExpanded, setSidebarExpanded] = useState(
  () => localStorage.getItem('mygenie_sidebar_expanded') === 'true'
);
// on toggle: localStorage.setItem('mygenie_sidebar_expanded', String(newValue))
```

---

## ISSUE 11 — Item-level tax from restaurant setup not changing

**Root cause: NEEDS MORE TRACE**
Settings API has keys: `gst_tax`, `tax`, `service_charge_tax`, `service_chrg_taxt`. Need to verify: (a) which key controls item-level vs order-level tax, (b) whether FE sends the correct key in the update payload, (c) whether profile API refreshes after settings save. Intermediate investigation step needed.

---

## Summary

| # | Issue | File | Type | Side | Conf |
|---|---|---|---|---|---|
| 1 | Doc upload for verified guests | `RoomCheckInModal.jsx:610` | CODE_ERROR | FE | HIGH |
| 2 | Custom item GST missing | `AddCustomItemModal.jsx` | MISSING_FEATURE | FE | HIGH |
| 3 | Amount overlaps Change btn | `OrderTable.jsx:143` | LAYOUT_BUG | FE | HIGH |
| 4a | Beta report >1 month | Backend | BACKEND_ASK | BE | MEDIUM |
| 4b | Status missing | `OrderReportBetaPage` | DATA_EDGE | FE | MEDIUM |
| 4c | Settled tab no actions | `OrderReportBetaPage` | MISSING_FEATURE | FE | HIGH |
| 5 | ID mandatory toggle | No settings key | BACKEND_ASK+FE | BOTH | HIGH |
| 6 | Purchase Payment_Type ₹0 | `PurchaseReportPage.jsx:197` | CODE_ERROR | FE | HIGH |
| 7 | Customer data not saved | `OrderEntry` customer state | NEEDS_LIVE_TEST | FE | MEDIUM |
| 8/10 | Advance > room price blocked | `RoomCheckInModal.jsx:630` | CODE_ERROR | FE | HIGH |
| 9 | Sidebar state not persisted | `DashboardPage.jsx:448` | CODE_ERROR | FE | HIGH |
| 11 | Tax level not syncing | Settings key TBD | NEEDS_MORE_TRACE | TBD | MEDIUM |
