# CR-137 — Impact Analysis: Optional `discount_for` Field
**Gate:** 2 — Impact Analysis
**Date:** 2026-08-12
**Agent:** Planning (Impact Analysis only)
**Code Reality:** NONE — `discount_for` is absent from all 4 payload builders (grep confirmed 0 hits)
**Risk:** HIGH (R5 hotspot files + R6 financial payload)

---

## Conflict Pre-Check

| File | Last Modified By | Date | Open Conflict? |
|---|---|---|---|
| `orderTransform.js` | BUG-305 (E1 buildCartItem _giveDiscount; E2 calcOrderTotals discountable buckets; E3 buildBillPrintPayload discountableRatio) | **2026-08-11 (yesterday)** | ⚠ LIVE CONFLICT — read BUG-305 changes before editing |
| `CollectPaymentPanel.jsx` | BUG-304 (E1 taxTotals dSgst/dCgst/dVat split; E2 discountableRatio; itemGstPostDiscount; vat fix) | **2026-08-11 (yesterday)** | ⚠ LIVE CONFLICT — read BUG-304 changes before editing |
| `CartPanel.jsx` | BUG-304 (E3 taxTotals split; E4 discountableRatio; itemGstPostDiscount; vatAmount) | **2026-08-11 (yesterday)** | ⚠ LIVE CONFLICT — read BUG-304 changes before editing |
| `orderLedgerService.js` | CR-026 / CR-045 (2026-06-11/17) | older | No conflict |

**Ruling:** This CR is PARALLEL-SAFE with BUG-304/305 because:
- BUG-304 touched tax split buckets and discountable ratios — distinct concern from adding a new payload field.
- BUG-305 touched buildCartItem and buildBillPrintPayload print path — no overlap with the discount_for field location.
- CR-137 inserts 1-line additions; it does NOT modify any existing BUG-304/305 logic.

**Execution order:** Implement CR-137 **AFTER** reading current line numbers (BUG-304/305 may have shifted lines). Do NOT rely on intake line numbers — re-verify before edit.

Other open CRs touching same files:
- CR-058 (Order Complimentary): INTAKE only, not implemented → no conflict yet, but agent must check again at Gate 4.
- CR-071 (Role Gating): DEFERRED → no conflict.

---

## Data Flow Trace

```
FLOW 3 + FLOW 4 (CollectPaymentPanel path):
CollectPaymentPanel.jsx
  └─ discountFor state (NEW) ← optional text input (NEW)
  └─ discounts object assembly (L~1078):
       discounts.discountFor: discountFor     ← ADD
  └─ paymentData passed to:
       ├─ placeOrderWithPayment() [Flow 3] ← discounts.discountFor → discount_for field
       └─ collectBillExisting()   [Flow 4] ← discounts.discountFor → discount_for field

FLOW 1 + FLOW 2 (OrderEntry direct path):
OrderEntry.jsx → placeOrder(options)     [Flow 1] ← discount_for: null (hardcoded, always null)
OrderEntry.jsx → updateOrder(options)    [Flow 2] ← discount_for: null (hardcoded, always null)
(Reason: placeOrder/updateOrder are pre-payment placements — no discount is applied at this stage)

QSR path (CartPanel):
CartPanel.jsx handleCollectBill() → paymentData.discounts → onQsrCollectBill
  └─ discounts.discountFor: null (pass-through placeholder — no discount reason UI in QSR quick-bill)

DISPLAY (Order Ledger):
orderLedgerService.js L85:
  discountFor: o.discountAmount > 0 ? 'Customer' : ''   ← CURRENT (hardcoded)
  discountFor: o.discount_for || (o.discountAmount > 0 ? 'Customer' : '')   ← AFTER
```

---

## Affected Files

### Files WILL Change

| # | File | Path | Change Type | Lines | Hotspot? |
|---|---|---|---|---|---|
| E1 | `orderTransform.js` | `src/api/transforms/orderTransform.js` | +1 line in Flow 1 | After current L1065 | YES (R5) |
| E2 | `orderTransform.js` | same | +1 line in Flow 2 | After current L1188 | YES (R5) |
| E3 | `orderTransform.js` | same | +1 line in Flow 3 | After current L1356 | YES (R5) |
| E4 | `orderTransform.js` | same | +1 line in Flow 4 | After current L1641 | YES (R5) |
| E5 | `CollectPaymentPanel.jsx` | `src/components/order-entry/CollectPaymentPanel.jsx` | +state + discounts wire + 2× UI inputs | ~15 lines total | YES (R5) |
| E6 | `CartPanel.jsx` | `src/components/order-entry/CartPanel.jsx` | +1 line in QSR paymentData.discounts | 1 line | NO |
| E7 | `orderLedgerService.js` | `src/api/services/orderLedgerService.js` | 1 line change (L85) | 1 line | NO |

**Total: 4 files, ~20 lines, 2 hotspot files.**

### Files WILL NOT Touch

- `OrderEntry.jsx` — Flows 1/2 call placeOrder/updateOrder with `discount_for: null`. No state threading needed (owner confirmed OQ-1: always null for these flows).
- `AppProviders.jsx` — no provider changes.
- `reportTransform.js`, `reportService.js` — display layer unchanged (orderLedgerService handles the display field).
- Any other report/service file.

---

## Edit-by-Edit Specification (verified against current code)

### E1 — orderTransform.js Flow 1 `placeOrder` (VERIFY line before editing)

**Current code at ~L1063-1065:**
```javascript
      // Discount
      discount_type:              null,
      self_discount:              0,
```
**Insert after `self_discount: 0,`:**
```javascript
      discount_for:               null,                   // CR-137: optional reason — always null on placement (no discount at this stage)
```

---

### E2 — orderTransform.js Flow 2 `updateOrder` (VERIFY line before editing)

**Current code at ~L1186-1188:**
```javascript
      // Discount
      discount_type:              null,
      self_discount:              0,
```
**Insert after `self_discount: 0,`:**
```javascript
      discount_for:               null,                   // CR-137: optional reason — always null on update path (owner OQ-1 confirmed)
```

---

### E3 — orderTransform.js Flow 3 `placeOrderWithPayment` (VERIFY line before editing)

**Current code at ~L1355-1356:**
```javascript
      // Discount — BUG-138: self_discount = manual + preset only (old POS parity)
      self_discount:              (discounts.manual || 0) + (discounts.preset || 0),
```
**Insert after `self_discount:` line:**
```javascript
      discount_for:               discounts.discountFor || null,  // CR-137
```

---

### E4 — orderTransform.js Flow 4 `collectBillExisting` (VERIFY line before editing)

**Current code at ~L1640-1641:**
```javascript
      // BUG-138: self_discount = manual + preset only (old POS parity). Coupon/loyalty/wallet have own fields.
      self_discount:                (discounts.manual || 0) + (discounts.preset || 0),
```
**Insert after `self_discount:` line:**
```javascript
      discount_for:                 discounts.discountFor || null,  // CR-137
```

> ⚠ **5th self_discount at ~L1731**: There is a 5th `self_discount` in a room payment path. The intake scopes to 4 flows only. **See Owner Decision OD-1 below.**

---

### E5 — CollectPaymentPanel.jsx (3 sub-edits)

**E5a — Add state variable** near L304 (where `discountType` and `discountValue` are declared):
```javascript
const [discountFor, setDiscountFor] = useState('');          // CR-137
```

**E5b — Add to discounts object assembly** (near L1078, inside the `discounts: {` block):
```javascript
        discountFor:          discountFor,                    // CR-137
```

**E5c — Reset in "None" clear handler** (near L1305-1310 and also at L1318-1319 — wherever `setDiscountType(null); setDiscountValue('')` is called):
```javascript
        setDiscountFor('');                                   // CR-137
```
*(Two reset sites: manual clear + preset clear; both need this line)*

**E5d — Add optional UI input** after the `(manualDiscount > 0 || presetDiscount > 0)` display block (there are 2 render paths in CollectPaymentPanel — main drawer mode ~L1360 area and inline mode ~L1997 area; BOTH need the input):

```jsx
{/* CR-137: Optional discount reason */}
{(manualDiscount > 0 || presetDiscount > 0) && (
  <input
    type="text"
    placeholder="Reason (optional)"
    value={discountFor}
    onChange={(e) => setDiscountFor(e.target.value.slice(0, 50))}
    className="mt-1.5 w-full px-2 py-1.5 rounded-lg border text-sm outline-none"
    style={{ borderColor: COLORS.borderGray }}
    data-testid="discount-for-input"
  />
)}
```

---

### E6 — CartPanel.jsx (+1 line in QSR `handleCollectBill` paymentData)

Find the `discounts:` block inside `handleCollectBill` (near L473). Add:
```javascript
          discountFor: null,                               // CR-137 pass-through placeholder (QSR quick-bill has no discount reason UI)
```

---

### E7 — orderLedgerService.js L85

**Current:**
```javascript
    discountFor: o.discountAmount > 0 ? 'Customer' : '',
```
**Replace with:**
```javascript
    discountFor: o.discount_for || (o.discountAmount > 0 ? 'Customer' : ''),  // CR-137: prefer API field when sent
```

---

## Risk Analysis

| Risk | Severity | Mitigation |
|---|---|---|
| Inserting after wrong `self_discount` (5 exist in file) | HIGH | Re-grep line numbers before each edit. Use 3-line context for `search_replace`. |
| BUG-304/305 shifted line numbers | MEDIUM | Re-grep at implementation time — never trust intake line numbers. |
| `discountFor` not reset on coupon apply/remove | LOW | The `discounts` object is assembled fresh on each payment submission. Reset on discount clear is sufficient. |
| Duplicate `discount_for` field if BUG-305 silently added it | LOW | Code reality grep confirmed 0 hits — confirmed safe. |
| 5th `self_discount` at L1731 (room path) | MEDIUM | Owner decision needed (OD-1 below). |
| CollectPaymentPanel has 2 render paths | MEDIUM | Both must receive the input (E5d has 2 sites). |

---

## Owner Decisions Needed

| # | Decision | Default if not answered | Risk of default |
|---|---|---|---|
| **OD-1** | The room payment path (`~L1731`) also has `self_discount`. Should `discount_for` be added there too? | Exclude (not in original scope) | LOW — room discount flow not commonly used; can add in follow-up |

---

## Verification Matrix (seeds QA handover)

| Edit | File | Verification Method | Automated? |
|---|---|---|---|
| E1 | orderTransform.js | `grep -n "discount_for" orderTransform.js` → 4 hits | YES (grep) |
| E2 | orderTransform.js | same grep | YES |
| E3 | orderTransform.js | same grep | YES |
| E4 | orderTransform.js | same grep | YES |
| E5a | CollectPaymentPanel.jsx | Browser: open Collect Bill → apply discount → type reason | NO |
| E5b | CollectPaymentPanel.jsx | Network tab: collect bill payload → `discount_for` field present | NO |
| E5c | CollectPaymentPanel.jsx | Browser: apply discount → type reason → clear discount → reason clears | NO |
| E5d | CollectPaymentPanel.jsx (×2) | Browser: both drawer + inline mode show reason input when discount > 0 | NO |
| E6 | CartPanel.jsx | grep `discountFor` in CartPanel | YES (grep) |
| E7 | orderLedgerService.js | Browser: Order Ledger → discount_for column shows API value when available | NO |
| E4-network | All 4 flows | Place order with discount+reason → check 4 API calls each carry `discount_for` | NO (manual) |
| E-null | Flow 1+2 | Place order without payment → verify `discount_for: null` in network payload | NO (manual) |

---

## Post-Code Registry Checklist (for Implementation agent)

```
- [ ] registry.json: CR-137 → status: IMPLEMENTED, sprint_key: pos_5_1
- [ ] CR_REGISTRY.md: CR-137 row updated to IMPLEMENTED
- [ ] FILE_OWNERSHIP.md: add orderTransform.js, CollectPaymentPanel.jsx, CartPanel.jsx, orderLedgerService.js with CR-137 + date
- [ ] Code markers: // CR-137 comment in every modified file
- [ ] Compile check: webpack 0 new warnings
```

---

## Scope Lock

**Files WILL change:** `orderTransform.js`, `CollectPaymentPanel.jsx`, `CartPanel.jsx`, `orderLedgerService.js`

**Files will NOT touch:** `OrderEntry.jsx`, `AppProviders.jsx`, `reportTransform.js`, `reportService.js`, `couponService.js`, `loyaltyTransform.js`, `SplitBillModal.jsx`, any report page.

---

*Impact Analysis complete. Awaiting Gate 3 (Implementation Plan) and Gate 4 GO.*
