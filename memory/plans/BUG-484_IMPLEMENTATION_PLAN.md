# BUG-484 — Implementation Plan (Gate 3)

**ID:** BUG-484
**Title:** Room bill-pay `payment_amount` / `order_amount` / `grant_amount` includes room rent — must be F&B-only
**Date:** 2026-10-01
**Gate:** 3 — Implementation Plan
**Based on:** `impact/BUG-484_IMPACT_ANALYSIS.md`
**IA line-number verify:** PASS — L1630/L1646/L1653 exact at HEAD

---

## Entry Verification (Pre-Code Gate)

Before writing a single line of code, the Implementation agent MUST confirm:

| Check | Expected | Verify command |
|---|---|---|
| L1484 reads | `finalTotal = 0,` (destructured from paymentData) | View `orderTransform.js` L1481–1501 |
| L1487 reads | `roomBalance = 0,  // ROOM_CHECKIN_GAP3` | Same view |
| L1503 reads | `const gstTax = Math.round((sgst + cgst) * 100) / 100;` | Same view |
| L1630 reads | `payment_amount:               finalTotal \|\| 0,` | View L1624–1655 |
| L1646 reads | `grant_amount:                 finalTotal \|\| 0,` | Same view |
| L1653 reads | `...(roomBalance > 0 ? { order_amount: finalTotal \|\| 0 } : {}),` | Same view |

If any line does not match → **STOP. Return to Planning agent.**

---

## Scope Lock

**Files WILL change:**
- `src/api/transforms/orderTransform.js`

**Files will NOT touch:**
- `CollectPaymentPanel.jsx` — roomBalance already passed via paymentData; no change needed
- `PmsCheckoutDrawer.jsx` — calls collectBillExisting; fix propagates automatically
- `FolioCheckoutPanel.jsx` — calls collectBillExisting; fix propagates automatically
- Any other file

---

## Edit Plan — 4 edits, 1 file

### E1 — Insert `fbOnlyTotal` variable (after L1503)

**Location:** `src/api/transforms/orderTransform.js`, after line 1503

**Current state (lines 1503–1505):**
```javascript
    const gstTax = Math.round((sgst + cgst) * 100) / 100;

    // BUG-252: Detect TAB payment
```

**After edit (insert 4 lines between L1503 and L1505):**
```javascript
    const gstTax = Math.round((sgst + cgst) * 100) / 100;

    // BUG-484: handover_5 §2 — payment_amount / grant_amount / order_amount must be
    // F&B-only on room stays. `roomBalance` (passed via CollectPaymentPanel L1115) is
    // the room-rent carve-out. Non-room orders: roomBalance===0 → fbOnlyTotal===finalTotal
    // (byte-identical to pre-fix behavior).
    const fbOnlyTotal = Math.max(0, (finalTotal || 0) - (roomBalance || 0));

    // BUG-252: Detect TAB payment
```

---

### E2 — Fix `payment_amount` (L1630)

**Location:** `src/api/transforms/orderTransform.js`, line 1630

**Current:**
```javascript
      payment_amount:               finalTotal || 0,
```

**After:**
```javascript
      payment_amount:               fbOnlyTotal,   // BUG-484: F&B-only (room rent via paid_room)
```

---

### E3 — Fix `grant_amount` (L1646)

**Location:** `src/api/transforms/orderTransform.js`, line 1646

**Current:**
```javascript
      grant_amount:                 finalTotal || 0,
```

**After:**
```javascript
      grant_amount:                 fbOnlyTotal,   // BUG-484: F&B-only
```

---

### E4 — Fix `order_amount` (L1653)

**Location:** `src/api/transforms/orderTransform.js`, line 1653

**Current:**
```javascript
      ...(roomBalance > 0 ? { order_amount: finalTotal || 0 } : {}),
```

**After:**
```javascript
      ...(roomBalance > 0 ? { order_amount: fbOnlyTotal } : {}),  // BUG-484: F&B-only
```

---

## Full Diff (for review before applying)

```diff
--- a/src/api/transforms/orderTransform.js
+++ b/src/api/transforms/orderTransform.js
@@ -1503,6 +1503,12 @@
     const gstTax = Math.round((sgst + cgst) * 100) / 100;
 
+    // BUG-484: handover_5 §2 — payment_amount / grant_amount / order_amount must be
+    // F&B-only on room stays. `roomBalance` (passed via CollectPaymentPanel L1115) is
+    // the room-rent carve-out. Non-room orders: roomBalance===0 → fbOnlyTotal===finalTotal
+    // (byte-identical to pre-fix behavior).
+    const fbOnlyTotal = Math.max(0, (finalTotal || 0) - (roomBalance || 0));
+
     // BUG-252: Detect TAB payment
@@ -1630,7 +1636,7 @@
-      payment_amount:               finalTotal || 0,
+      payment_amount:               fbOnlyTotal,   // BUG-484: F&B-only (room rent via paid_room)
@@ -1646,7 +1652,7 @@
-      grant_amount:                 finalTotal || 0,
+      grant_amount:                 fbOnlyTotal,   // BUG-484: F&B-only
@@ -1653,7 +1659,7 @@
-      ...(roomBalance > 0 ? { order_amount: finalTotal || 0 } : {}),
+      ...(roomBalance > 0 ? { order_amount: fbOnlyTotal } : {}),  // BUG-484: F&B-only
```

---

## Verification Matrix (Step 4)

| # | Edit | Verification | Automated? |
|---|---|---|:---:|
| V1 | E1 — `fbOnlyTotal` declared after L1503 | View file: `const fbOnlyTotal = Math.max(0` exists after gstTax line | NO (code read) |
| V2 | E2 — `payment_amount` uses `fbOnlyTotal` | View L1630 (new): `payment_amount: fbOnlyTotal` | NO (code read) |
| V3 | E3 — `grant_amount` uses `fbOnlyTotal` | View L1646 (new): `grant_amount: fbOnlyTotal` | NO (code read) |
| V4 | E4 — `order_amount` uses `fbOnlyTotal` | View L1653 (new): `order_amount: fbOnlyTotal` | NO (code read) |
| V5 | Non-room: `fbOnlyTotal === finalTotal` | `roomBalance=0` → `fbOnlyTotal = finalTotal` (Math proof) | YES (unit test) |
| V6 | Room settle (F&B + room): `payment_amount = F&B only` | Curl probe: room order, `payment_amount` = F&B total only | NO (curl) |
| V7 | Room-only settle (no F&B): `payment_amount = 0` | Curl probe: room-only, `payment_amount=0` | NO (curl) |
| V8 | `order_amount` not emitted for non-room | `roomBalance=0` → spread empty → no `order_amount` key | YES (unit test) |
| V9 | `order_amount` = fbOnlyTotal for room | `roomBalance > 0` → `order_amount = finalTotal - roomBalance` | YES (unit test) |
| V10 | `fbOnlyTotal` never negative | `Math.max(0,…)` guards against edge cases | YES (unit test) |
| V11 | Webpack compiles | 0 new warnings | YES (`yarn build`) |
| V12 | BUG-484 marker comment present | `// BUG-484` in E1 line | NO (code read) |

---

## Unit Test Plan

Create or add to existing `orderTransform` test file. Test cases for `collectBillExisting`:

```javascript
// BUG-484 — payment_amount / grant_amount / order_amount must be F&B-only

describe('collectBillExisting — BUG-484 F&B-only payment fields', () => {

  const basePaymentData = {
    method: 'cash', finalTotal: 228, splitPayments: [],
    sgst: 0, cgst: 0, vatAmount: 0, itemTotal: 200, subtotal: 200,
  };
  const baseTable = { orderId: '9999', isRoom: true, tableId: 1, tableNumber: 'Rr1', tableSection: 'Rooms' };
  const baseItems = [];
  const baseCustomer = {};

  it('V5/V8: non-room order — payment_amount equals finalTotal, no order_amount', () => {
    const data = { ...basePaymentData, roomBalance: 0 };
    const payload = orderToAPI.collectBillExisting(
      { ...baseTable, isRoom: false }, baseItems, baseCustomer, data
    );
    expect(payload.payment_amount).toBe(228);
    expect(payload.grant_amount).toBe(228);
    expect(payload.order_amount).toBeUndefined();
  });

  it('V6/V9: room order with F&B 228 + room 950 — payment_amount = 228 only', () => {
    const data = { ...basePaymentData, finalTotal: 1178, roomBalance: 950 };
    const payload = orderToAPI.collectBillExisting(
      baseTable, baseItems, baseCustomer, data
    );
    expect(payload.payment_amount).toBe(228);     // F&B only
    expect(payload.grant_amount).toBe(228);       // F&B only
    expect(payload.order_amount).toBe(228);       // F&B only (roomBalance > 0 → emitted)
  });

  it('V7: room-only settle (no F&B) — payment_amount = 0', () => {
    const data = { ...basePaymentData, finalTotal: 950, roomBalance: 950 };
    const payload = orderToAPI.collectBillExisting(
      baseTable, baseItems, baseCustomer, data
    );
    expect(payload.payment_amount).toBe(0);
    expect(payload.grant_amount).toBe(0);
    expect(payload.order_amount).toBe(0);
  });

  it('V10: fbOnlyTotal never negative (roomBalance > finalTotal edge)', () => {
    const data = { ...basePaymentData, finalTotal: 100, roomBalance: 200 };
    const payload = orderToAPI.collectBillExisting(
      baseTable, baseItems, baseCustomer, data
    );
    expect(payload.payment_amount).toBe(0);       // Math.max(0,…) clamps to 0
    expect(payload.payment_amount).toBeGreaterThanOrEqual(0);
  });

});
```

---

## Post-Code Registry Checklist (Step 5)

After implementation, the Implementation agent MUST complete ALL before writing the handover:

```
□ 1. registry.json: BUG-484 → status: GATE_5A_IMPLEMENTED, sprint_key: oct_cr_batch
□ 2. BUG_TRACKER.md: BUG-484 row updated with GATE_5A_IMPLEMENTED status
□ 3. FILE_OWNERSHIP.md: orderTransform.js entry added — BUG-484, date 2026-10-01, L1503+4 lines + L1630 + L1646 + L1653
□ 4. Code markers: // BUG-484 comment present in every modified location (E1 marker comment, E2/E3/E4 inline comments)
□ 5. Compile check: yarn build exits 0, 0 new warnings
```

---

## Risk Register

| Risk | Likelihood | Mitigation |
|---|---|---|
| `roomBalance` undefined in some callers | LOW | `(roomBalance \|\| 0)` default handles undefined/null |
| Associated orders total (F&B) accidentally excluded | NONE | `associatedTotal` is in `finalTotal` (F&B), not in `roomBalance`; fbOnlyTotal keeps it |
| Non-room flows broken | VERY LOW | `roomBalance=0` → `fbOnlyTotal=finalTotal` — mathematically identical |
| Historical DB data (pre-fix orders) | N/A | Forward-only fix; pre-existing orders unaffected |

---

## Execution Sequence

```
1. View orderTransform.js L1481–1503 → confirm entry verification (6 checks)
2. View orderTransform.js L1624–1655 → confirm E2/E3/E4 targets
3. Apply E1 (insert_text after L1503)
4. Apply E2 (search_replace L1630)
5. Apply E3 (search_replace L1646)
6. Apply E4 (search_replace L1653)
7. View modified lines to self-verify all 4 edits
8. Run unit tests (npx craco test --watchAll=false --testPathPattern=orderTransform)
9. Run yarn build → confirm 0 new warnings
10. Complete Post-Code Registry Checklist (5 boxes)
11. Write QA Handover + Session Handover
```

---

## Awaiting Gate 4 GO

```
Plan ready. 4 edits / 1 file.
Code reality: CONFIRMED (root cause traced, lines verified).
Scope: orderTransform.js ONLY.
Files will NOT touch: CollectPaymentPanel, PmsCheckoutDrawer, FolioCheckoutPanel.
Verification matrix: 12 checks (5 automated unit tests, 1 build, 6 code/curl).
Owner decisions needed: NONE.
Awaiting Gate 4 GO.
```
