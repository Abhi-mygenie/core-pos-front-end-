# INV-POS-3BUGS — Investigation Report (3 issues)

**Date:** 2026-11-18 · **Role:** INVESTIGATION (no code edits, gate-only)
**Account:** pms@macha.com (restaurant 69) · **Confidence:** HIGH on all three
**Evidence:** `/app/memory/evidence/INV-POS-3BUGS/`

---

## Issue 1 — Table View: cannot open / expand an aggregator order

**Classification:** FE_BUG · **Confidence:** HIGH

**Root cause:** In Table View the aggregator card's click is **explicitly disabled**, and the only aggregator
detail view auto-shows for *new* orders only — so an **accepted** aggregator order has no open/expand path.

- `src/components/cards/TableCard.jsx` **L312**:
  ```jsx
  onClick={isEngaged || isAggregator ? undefined : handleCardClick} // CR-106: no-op for aggregator
  ```
  `isAggregator` (L65) ⇒ the card body `onClick` is `undefined`. Tapping the tile does nothing. The only
  aggregator controls are the inline action buttons (KOT / Ready / Bill, L486-539) — no "view order" action.
- `src/components/dashboard/AggregatorOrderPopOut.jsx` **L15-18, L44-53**: the popup queue is
  `isAggregator === true && (fOrderStatus === 0 || fOrderStatus === 7)` — i.e. **only new/unconfirmed**
  orders. Once accepted (status 1/2/5) it is never shown again.
- Net effect: there is **no route** to reopen/expand an accepted aggregator order in Table View.
  (`handleTableClick` in `DashboardPage.jsx` L1490 is never reached for aggregator tiles because of L312.)

**Fix direction:** give aggregator tiles a read-only detail view — either allow `handleCardClick` to open a
read-only `AggregatorOrderPopOut` (add a "view" mode not gated on status 0/7), or add an explicit expand
affordance on the aggregator `TableCard`. Risk: MEDIUM (touches dashboard card + popup gating).

---

## Issue 2 — Confirmation popup does not show the FULL variation

**Classification:** FE_BUG · **Confidence:** HIGH

**Root cause:** `ScanOrderPopOut` renders only the variation **group name** (`v.name`) and a non-existent
`v.price`. The backend response nests the **selected option labels and prices** under
`v.values = [{label, optionPrice}]`, which the popup never reads — so the chosen variation (e.g. the size/
option the customer picked) and its price are missing.

- Backend response shape (documented in code) `src/api/transforms/orderTransform.js` **L705-737**:
  ```
  variation: [{ name, type, min, max, required, values: [{ label, optionPrice }, ...] }]
  ```
- Display transform stores it raw: `orderTransform.js` **L136** `variation: detail.variation`.
- Popup renders WRONG fields: `src/components/dashboard/ScanOrderPopOut.jsx`
  - **L475-482** (collapsed "previously ordered" summary): `variations.map(v => v.name).join(', ')` — group name only.
  - **L609-631** (expanded list): prints `v?.name || v?.label` and `Number(v?.price)` — never reads
    `v.values[].label` or `v.values[].optionPrice`. Result: shows the group name (or blank) and no price.
- **Correct reference implementation** (same data, rendered right): `src/components/order-entry/CartPanel.jsx`
  **L111-124** reads `v.values` → `v.values.map(val => val.label)`; **L213-216 / L417-419** sum
  `v.values[].optionPrice`. The popup should mirror this.

**Fix direction:** in `ScanOrderPopOut`, read `v.values[].label` (join) for the display text and
`v.values[].optionPrice` for price, with fallback to `v.name`/`v.price` — reuse the CartPanel logic.
Risk: LOW (display-only, single component).

---

## Issue 3 — "Print KOT" on the banner is not selective per item (unlike item-cancel)

**Classification:** FEATURE_GAP (works as built, but not as the user expects) · **Confidence:** HIGH

**Root cause:** The banner's item-cancel is **per item** (one button per row), but KOT is **order-level** —
it prints every station for the whole order with no per-item selection.

- Per-item cancel: `ScanOrderPopOut.jsx` **L596-606** renders a cancel button *inside each item row*
  (`onCancelItem(activeOrder, it)`), so cancel is item-granular.
- KOT button: `ScanOrderPopOut.jsx` **L737-749** is a *single footer button* → `onPrintKOT(activeOrder)`
  (passes the whole order, no item set).
- Handler: `DashboardPage.jsx` **L1737-1747** `handleScanPrintKOT` →
  `getStationsFromOrderItems(order.items, …)` → `printOrder(orderId,'kot',allStations,…)` — **all items**.
- There is **no per-item selection state** for KOT anywhere in the popup. So KOT cannot be selective by design.

**Fix direction (feature):** add per-item checkboxes (or a per-item KOT action) in the popup, thread the
selected item IDs into `handleScanPrintKOT` → `printOrder`, and confirm the KOT print endpoint accepts an
item/station subset. Risk: MEDIUM-HIGH (touches print payload + popup state; needs print-path validation).

---

## Probes run (live, read-only unless noted)
- `POST /api/v1/auth/vendoremployee/common-login` → token (200).
- `GET /api/v1/vendoremployee/pos/employee-orders-list?role_name=Manager` → 1 running order (room a1, 1578881).
- `POST /api/v2/vendoremployee/get-single-order-new {order_id}` on 1578881 + ~10 recent ids → all 0 items /
  closed, so the live variation shape could not be dumped from current data; Issue 2 shape is taken from the
  in-code contract (`orderTransform.js` L705-737) and cross-checked against `CartPanel.jsx` (correct renderer).

## Gate note
No application code changed (INVESTIGATION role, "stay in gate"). No testing_agent run — there is no fix to
verify this session. Next step: owner decision → PLANNING (Issue 2 is the cheapest/lowest-risk; Issues 1 and 3
are small features).
