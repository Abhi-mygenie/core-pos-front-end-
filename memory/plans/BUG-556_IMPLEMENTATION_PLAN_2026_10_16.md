# Implementation Plan — BUG-556
## Auto Bill: payment_status prints "Unpaid"

**Role:** PLANNING (Gate 3 — Implementation Plan)
**Date:** 2026-10-16
**Based on:** `impact/BUG-556_IMPACT_ANALYSIS_2026_10_16.md` (Gate 2 CLOSED)
**Code Reality:** PARTIAL
**Conflict Pre-Check:** BUG-536 (orderTransform.js L2011-2012) — CLEAN (different lines)
**R5 hotspot files:** BOTH — `orderTransform.js` + `OrderEntry.jsx` — full gate + regression required

---

## Scope Lock

**WILL change (2 files):**
- `src/api/transforms/orderTransform.js` — E1 (2 lines, root fix)
- `src/components/order-entry/OrderEntry.jsx` — E2a + E2b + E3 + E4 + E5 (2 lines each, 5 callers)

**WILL NOT touch:**
- `CollectBillPanelDrawer.jsx` (no printOrder call — backend-triggered, out of scope)
- `FolioCheckoutPanel.jsx` / `PmsCheckoutDrawer.jsx` (PMS paths — OD-556-01 deferred)
- `CollectPaymentPanel.jsx`, `DashboardPage.jsx`, any financial transform

---

## Step 0 — Entry Verification

```bash
# Confirm E1 anchor
sed -n '2225,2226p' /app/frontend/src/api/transforms/orderTransform.js
# Expected L2225: payment_status: order.paymentStatus || '',
# Expected L2226: payment_method: order.paymentMethod || '',

# Confirm E2 anchor (end of QSR fresh order overrides block)
sed -n '1525,1530p' /app/frontend/src/components/order-entry/OrderEntry.jsx
# Expected: restaurantPhone line followed by optional delivery address spread

# Confirm E3 anchor (end of existing order overrides block)
sed -n '1641,1646p' /app/frontend/src/components/order-entry/OrderEntry.jsx
# Expected: custGSTName / restaurantPhone lines

# No existing BUG-556 markers
grep -c "BUG-556" /app/frontend/src/api/transforms/orderTransform.js
# Expected: 0
```

---

## Edit E1 — orderTransform.js: accept override values for payment_status + payment_method

**File:** `src/api/transforms/orderTransform.js`
**Lines:** 2225–2226

```js
// BEFORE:
      payment_status: order.paymentStatus || '',
      payment_method: order.paymentMethod || '',

// AFTER:
      payment_status: overrides.paymentStatus || order.paymentStatus || '',  // BUG-556: collect-bill path passes resolved status; manual reprint falls through to stored value
      payment_method: overrides.paymentMethod || order.paymentMethod || '',  // BUG-556
```

**Why safe:** The existing two-path logic (`hasFinancialOverrides`) already handles this pattern — the collect bill path passes financial overrides; manual reprint passes `{}`. Adding these two fields to the override chain is purely additive. When `overrides` is empty (`{}`), behaviour is byte-identical to before.

---

## Edit E2 — OrderEntry.jsx: add payment fields to QSR fresh-order overrides (L~1526)

**File:** `src/components/order-entry/OrderEntry.jsx`
**Location:** Inside the overrides object at the QSR fresh-order auto-print block (~L1512–1528), after `restaurantPhone`

```js
// ADD after:
//   restaurantPhone: restaurant?.phone || '',
//   ...(orderType === 'delivery' && selectedAddress ? ... )
// INSERT before the closing `};`:

                paymentStatus: 'paid',                                                                // BUG-556
                paymentMethod: paymentData?.splitPayments?.length > 0 ? 'partial' : (paymentData?.method || ''), // BUG-556
```

**Two identical overrides blocks exist** (L1512–1528 and L1553–1569 — immediate vs background HTTP path). Apply E2 to **both** blocks.

---

## Edit E3 — OrderEntry.jsx: add payment fields to existing-order overrides (L~1641)

**File:** `src/components/order-entry/OrderEntry.jsx`
**Location:** Inside the overrides object at the QSR existing-order auto-print block (~L1628–1643), after `custGSTName` / `restaurantPhone`

```js
// ADD after:
//   restaurantPhone: restaurant?.phone || '',
//   ...(orderType === 'delivery' && selectedAddress ? ... )
// INSERT before the closing `};`:

                paymentStatus: 'paid',                                                                // BUG-556
                paymentMethod: paymentData?.splitPayments?.length > 0 ? 'partial' : (paymentData?.method || ''), // BUG-556
```

---

## Execution Sequence

```
1. Step 0: Entry verification (3 grep checks)
2. Apply E1  (orderTransform.js:2225-2226)
3. Apply E2a (OrderEntry.jsx QSR fresh-order immediate path ~L1528)
4. Apply E2b (OrderEntry.jsx QSR fresh-order background HTTP path ~L1568)
5. Apply E3  (OrderEntry.jsx QSR existing-order path ~L1643)
6. Apply E4  (OrderEntry.jsx autoPrintNewOrderIfEnabled ~L2080)
7. Apply E5  (OrderEntry.jsx collectBillOverrides ~L2362)
8. Compile check: webpack 1 pre-existing warning, 0 new
9. EXIT GATE (5 checkboxes)
```

**Total edits: 7 (E1 + E2a + E2b + E3 + E4 + E5) across 2 R5 files**

---

## Alignment Confirmation — Owner 2026-10-16

> "This will happen only in case where auto bill is printing, right? Because if any other bill is printing, it is never paid. And only if it is auto bill, then only a paid bill will come."

**CONFIRMED. Plan is fully aligned.** All 5 overrides blocks (E2a/E2b/E3/E4/E5) are inside auto-bill gates:
- `if (qsrAutoBill && ...)` — QSR paths (E2a, E2b, E3)
- `if (!printAllBill) return` — `autoPrintNewOrderIfEnabled` (E4)
- `if (printAllBill && ...)` — Dashboard collect-bill (E5)

All other print calls (manual reprint from OrderCard, preview before payment, audit reprint) pass **empty `{}`** overrides → `overrides.paymentStatus` is `undefined` → falls back to `order.paymentStatus` → **byte-identical to today**. No regression on any non-auto-bill path.

---

## Risk Register

| Risk | Likelihood | Mitigation |
|---|---|---|
| Manual reprint shows wrong payment_status | Very Low | `overrides.paymentStatus` undefined for manual path → `order.paymentStatus` fallback — byte-identical |
| PayLater auto-bill shows wrong status | Low | PayLater goes through CollectBillPanelDrawer (no printOrder call) — not affected by this fix |
| Split-payment method shows wrong label | Very Low | `splitPayments?.length > 0 ? 'partial' : method` mirrors L1643 of collectBillExisting exactly |
| R5 regression in OrderEntry.jsx | Low | Change is purely additive (2 extra fields in overrides object, no logic change) |

---

## Verification Matrix

| # | Edit | Verification | Method | Automated? |
|---|---|---|---|---|
| V1 | E1 | `overrides.paymentStatus` used when present | Code grep | YES |
| V2 | E2a/E2b/E3 | `paymentStatus:'paid'` in all 3 overrides blocks | Code grep | YES |
| V3 | E2/E3 | `paymentMethod: method` in all 3 overrides blocks | Code grep | YES |
| V4 (browser) | E1-E3 | QSR order + pay → auto-bill → Network tab POST /order-temp-store → `payment_status: 'paid'` | Network tab | NO |
| V5 (browser) | E1-E3 | `payment_method: 'cash'` (or chosen method) in same payload | Network tab | NO |
| V6 (regression) | E1 | Manual reprint (OrderCard print icon) → payload unchanged | Network tab | NO |
| V7 | compile | webpack 1 pre-existing warning, 0 new | supervisor log | YES |

---

## Post-Code Registry Checklist

```
- [ ] registry.json: BUG-556 → GATE_5A_IMPLEMENTED, sprint_key: oct_cr_batch
- [ ] BUG_TRACKER.md: prepend new Last Updated row
- [ ] FILE_OWNERSHIP.md: orderTransform.js + OrderEntry.jsx entries updated
- [ ] Code markers: // BUG-556 on each changed line (already in plan above)
- [ ] Compile: webpack 1 pre-existing warning, 0 new
```

---

## Alignment Confirmation — Owner Query 2026-10-16

> "This will happen only in case where auto bill is printing, right? Because if any other bill is printing, it is never paid. And only if it is auto bill, then only a paid bill will come."

**CONFIRMED. Plan is fully aligned.** All 5 overrides blocks are inside auto-bill gates:
- `if (qsrAutoBill && ...)` — QSR paths (E2a, E2b, E3)
- `if (!printAllBill) return` — autoPrintNewOrderIfEnabled (E4)
- `if (printAllBill && ...)` — Dashboard collect-bill (E5)

All other print calls (manual reprint from OrderCard, preview before payment, audit reprint) pass **empty overrides `{}`** → `overrides.paymentStatus` undefined → falls back to `order.paymentStatus` → unchanged behaviour. No regression possible on non-auto-bill paths.

---

## R5 Regression Checklist (required per AGENT_PROMPT_ALPHA.md)

Since two R5 hotspot files are touched:

| # | Test | Why |
|---|---|---|
| REG-1 | Place new order (dine-in) + pay cash → bill prints with "Cash / Paid" | Core happy path |
| REG-2 | Existing order + collect bill → auto-bill shows correct method | Existing order path |
| REG-3 | Manual reprint from OrderCard → payment_status unchanged (backend value) | Manual path must not regress |
| REG-4 | Split payment → bill shows "Partial" payment method | splitPayments logic |
