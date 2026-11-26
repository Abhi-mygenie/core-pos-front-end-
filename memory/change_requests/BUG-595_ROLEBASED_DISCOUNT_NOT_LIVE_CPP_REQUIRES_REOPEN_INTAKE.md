# BUG-595 — Role-Based Discount Not Live in Cashier CPP — Requires Reopen After Owner Applies

**Registered:** 2026-10-19
**Type:** BUG
**Severity:** P2 — MEDIUM
**Risk:** MEDIUM
**Area:** Dashboard / CollectPaymentPanel / Role-Based Discount
**Sprint:** oct_cr_batch
**Status:** GATE_1_INTAKE_COMPLETE
**Related:** BUG-538 (parent — role-based discount gate + Apply button)

---

## Symptom

When the owner applies a role-based discount on a running order:

1. **Socket fires** — order updates with `order_discount_json` on all connected devices
2. **If cashier has CPP already open** — discount does NOT appear. Cashier sees the bill at full price.
3. **Cashier must close CPP and reopen it** — only then does the discount appear pre-filled
4. **After re-login** — also works (fresh order fetch includes `order_discount_json`)

Expected: discount appears live in cashier's open CPP without needing to reopen.

---

## Duplicate Check

**DISTINCT** — no prior bug for CPP mount-effect not reacting to socket-driven `initialDiscount` update.
**RELATED** to BUG-538 (which added the `initialDiscount` mount effect — this bug is a gap in that implementation).

---

## Root Cause (confirmed by investigation 2026-10-19)

`CollectPaymentPanel.jsx` L354-362 — `initialDiscount` seeding effect has **empty dependency array** (`[]`):

```js
// BUG-538: seed discount controls from role-base pre-applied discount on mount.
useEffect(() => {
  if (!initialDiscount) return;
  setDiscountType(initialDiscount.discountType);
  setDiscountValue(String(initialDiscount.discount));
  setDiscountFor(initialDiscount.discountNote || '');
  setIsDiscountApplied(true);
}, []); // mount-only ← PROBLEM: fires once, frozen at panel open
```

**What happens:**
1. Cashier opens CPP → `initialDiscount = null` at mount → effect fires → no-op (null guard)
2. Owner applies discount → socket fires → `orderData.orderDiscountJson` updates
3. `initialDiscount` prop changes from `null` to `{ discount: 100, discountType: 'flat' }`
4. Effect does NOT re-run (empty deps `[]`)
5. Discount state stays empty → cashier sees no discount

**Why re-opening works:**
CPP remounts → effect fires fresh with `initialDiscount = { discount: 100, ... }` → discount seeded ✅

---

## Evidence

- **Source:** OWNER-REPORTED (live test 2026-10-19, orders #015103 and #015104)
- **Confidence:** CONFIRMED — code traced + API probed
- **Order confirmed:** #015104 (`order_type: dinein`, `table_id: 0`)
  - `employee-orders-list` returns `order_discount_json: { id: 303, discount: 100, discount_type: "fixed" }` ✅
  - `get-single-order-new` (socket re-fetch endpoint) also confirmed socket carries `order_discount_json` ✅
  - Socket `update-order` event carries `order_discount_json` in payload ✅
  - `handleOrderDataEvent` uses socket payload directly → `updateOrder()` fires ✅
  - `orderItemsByTableId` (for dine-in table orders) does NOT whitelist `orderDiscountJson` — SEPARATE gap noted (see OD-595-01)
- **Investigation report:** This session (2026-10-19) — full socket trace in conversation

---

## Open Decisions

**OD-595-01:** `orderItemsByTableId` in `OrderContext.jsx` does NOT include `orderDiscountJson` in its field whitelist. For dine-in TABLE orders (with `tableId` set), `getOrderDataForEntry` returns from this whitelist — so `orderData.orderDiscountJson` is always `undefined` for table orders regardless of socket.

Options:
- **(A — recommended):** Add `orderDiscountJson: order.orderDiscountJson || null` to the `orderItemsByTableId` whitelist (1 line, `OrderContext.jsx`)
- **(B):** Defer — focus only on the CPP mount-effect for walk-in/delivery/takeaway orders for now

Note: The confirmed test order (#015104) is `table_id: 0` (walk-in/no-table), so it goes through the `walkInOrders` path which DOES return the full order object. OD-595-01 is a SEPARATE gap for table-assigned dine-in orders.

---

## Blast Radius

- **Files WILL change:** `src/components/order-entry/CollectPaymentPanel.jsx` (R5) — ~5 lines
- **Files MAY change (OD-595-01):** `src/contexts/OrderContext.jsx` — 1 line
- **Files WILL NOT touch:** `orderTransform.js` · `OrderEntry.jsx` · `socketHandlers.js`
- **Scope:** SMALL (1–2 files)
- **Hotspot:** YES (CPP is R5)
- **Fast Lane eligible:** NO (R5 file, financial — full gate flow required)

---

## Risk Classification

| Attribute | Value |
|---|---|
| Risk | MEDIUM |
| Financial touch? | YES — discount affects bill total |
| R5? | YES (CPP) |
| Fast Lane | NO |
| Regression risk | LOW — guard (`if (isDiscountApplied) return`) prevents overwriting owner's apply state |

---

## Gate Status

- Gate 1: **COMPLETE** (this document)
- Gate 2: Ready — awaiting "BUG-595 Gate 2 GO"
- Gate 3: Not started
- Gate 4 GO: Not given
