# BUG-538 — Impact Analysis (Gate 2)
## Role-Based Discount: order_discount_json Not Read, canDiscount Not Wired, Apply Button Missing

**Date:** 2026-10-18
**Stage:** Gate 2 — Impact Analysis
**Code Reality:** NONE — order_discount_json absent from entire codebase, canDiscount never passed to CPP
**Conflict Pre-check:** NONE — no overlapping open items on the 3 target files
**Risk:** CRITICAL — 3 R5 files, discount financial logic, permission enforcement, new backend API call

---

## Locked Decisions

### OD-538-01 — LOCKED

**Owner/Manager (canDiscount = true):**
- Full discount controls (dropdown + value input) visible
- NEW: "Apply" button added — discount does NOT affect the total until Apply is clicked
- On Apply → call backend API immediately to save discount → creates/updates `order_discount_json`
- After backend success → socket fires → all connected devices update

**Cashier (canDiscount = false, roleBaseDiscount = true) — no discount applied yet:**
- Entire discount section COMPLETELY HIDDEN — no label, no dropdown, no input, nothing
- Bill shows at full price

**Cashier (canDiscount = false, roleBaseDiscount = true) — discount applied by owner (`order_discount_json` present):**
- Entire discount controls COMPLETELY HIDDEN
- Bill totals show a static read-only line: `Discount (23%): -₹115`
- Total calculated correctly from `order_discount_json`
- Cashier collects payment at the post-discount total

**Restaurant with roleBaseDiscount = false (default):**
- Zero change — discount section works exactly as today for all staff

---

### OD-538-02 — LOCKED (2026-10-18, confirmed from Flutter spec ROLE_BASED_DISCOUNT.md)

**Endpoint:** `POST /api/v1/vendoremployee/order-discount-manage`

**Request body (Apply):**
```json
{ "order_id": 1233285, "discount_amount": 10, "discount_type": "percent", "discount_note": "optional" }
```

**Request body (Unapply):**
```json
{ "order_id": 1233285, "discount_amount": 0, "discount_type": "percent", "discount_note": "" }
```

**Response:** HTTP 200, `{ "message": "..." }` — show toast. Socket broadcasts separately.

**CRITICAL field name mappings (spec §13 — never mix):**
- API response `order_discount_json.discount` = rupee/percent amount (NOT `discount_amount`)
- API request field = `discount_amount` (NOT `discount`)
- API type values = `"percent"` | `"fixed"` — CPP uses `"flat"` for ₹, must map: send `"flat"→"fixed"`, receive `"fixed"→"flat"`

**Unapply triggers:** (1) owner taps Apply again → POST `discount_amount: 0`. (2) owner edits amount field while applied → POST `discount_amount: 0` on `onChange`.

**Validation before POST:** empty/0 amount → toast, no POST. Percent > 100 → toast, no POST.

**Gate 3: UNBLOCKED.**

---

## Business Flow (confirmed by owner 2026-10-18)

```
Two-device flow:

OWNER'S DEVICE:
  Opens running order → CPP opens
  Sees discount section with Apply button
  Selects % → types 23 → clicks Apply
  → POST /api/.../apply-order-discount
  → order_discount_json created on backend
  → socket broadcasts updated order
              ↓
CASHIER'S DEVICE:
  Socket fires → order refreshes silently
  Cashier opens Collect Payment
  → discount controls completely hidden
  → bill shows:
      Sub Total      ₹500
      Discount (23%) -₹115    ← static line, read-only
      After Discount ₹385
      GST            ₹20.7
      Total          ₹405.7
  Cashier collects ₹405.7
```

---

## Data Flow Trace — Current (Broken)

```
api.order_discount_json = { discount: 23, discount_type: "percent" }
        ↓
orderTransform.js fromAPI.order:
  discount: parseFloat(api.restaurant_discount_amount || api.discount_value) = 0
  order_discount_json → NEVER READ ❌
        ↓
OrderEntry.jsx:
  const canDiscount = hasPermission('discount')  ← computed ✅ but never used
  <CollectPaymentPanel
    canDiscount={???}          ← NEVER PASSED ❌
    initialDiscount={???}      ← NEVER PASSED ❌
  />
        ↓
CollectPaymentPanel:
  Discount section always fully enabled
  No Apply button
  order_discount_json ignored
  Total wrong (discount not applied)
```

## Data Flow Trace — Fixed

```
api.order_discount_json = { discount: 23, discount_type: "percent" }
        ↓
orderTransform.js fromAPI.order — ADD:
  orderDiscountJson: api.order_discount_json || null        ← NEW E1
        ↓
OrderEntry.jsx — ADD to CPP props:
  canDiscount={canDiscount}                                  ← NEW E2a
  initialDiscount={orderData?.orderDiscountJson || null}     ← NEW E2b
        ↓
CollectPaymentPanel:
  canDiscount = false (cashier)
  initialDiscount = { discount: 23, discount_type: "percent" }
  discountAllowed = !restaurantSettings.roleBaseDiscount || canDiscount = false

  Owner path (canDiscount=true):
    → full controls rendered + Apply button       ← NEW E3d (Apply button)
    → Apply onClick → applyDiscountToBackend()    ← NEW E3e (API call)

  Cashier path (canDiscount=false):
    → discount controls block: { discountAllowed && <section>... } = hidden  ← NEW E3b
    → bill totals: if initialDiscount → show static deduction line            ← NEW E3f
```

---

## Affected Files

| # | File | R5? | Change |
|---|---|---|---|
| E1 | `src/api/transforms/orderTransform.js` | YES | Add `orderDiscountJson: api.order_discount_json \|\| null` to `fromAPI.order` |
| E2a | `src/components/order-entry/OrderEntry.jsx` | YES | Pass `canDiscount={canDiscount}` to `<CollectPaymentPanel>` |
| E2b | `src/components/order-entry/OrderEntry.jsx` | YES | Pass `initialDiscount={orderData?.orderDiscountJson \|\| null}` to `<CollectPaymentPanel>` |
| E3a | `src/components/order-entry/CollectPaymentPanel.jsx` | YES | Add `canDiscount = true, initialDiscount = null` to props signature |
| E3b | `src/components/order-entry/CollectPaymentPanel.jsx` | YES | Compute `discountAllowed` const + gate discount controls block |
| E3c | `src/components/order-entry/CollectPaymentPanel.jsx` | YES | Mount-only `useEffect` to seed discountType + discountValue from `initialDiscount` |
| E3d | `src/components/order-entry/CollectPaymentPanel.jsx` | YES | Add Apply button to discount section (owner path only) |
| E3e | `src/components/order-entry/CollectPaymentPanel.jsx` | YES | Apply onClick handler → POST to backend API (OD-538-02 endpoint) |
| E3f | `src/components/order-entry/CollectPaymentPanel.jsx` | YES | Static discount deduction line in bill totals (cashier path, when initialDiscount present) |

**Files WILL NOT touch:**
- `restaurantSettingsTransform.js` — `roleBaseDiscount` already correctly mapped
- `CartPanel.jsx`
- `socketHandlers.js` — socket uses `fromAPI.order`, E1 fix flows through automatically

---

## Backend Dependency

**RESOLVED 2026-10-18.** Flutter spec (ROLE_BASED_DISCOUNT.md) confirmed all details. See OD-538-02 above.

---

## Risk Register

| Risk | Mitigation |
|---|---|
| 3 R5 files | All changes are additive with safe defaults (`canDiscount=true`, `initialDiscount=null`) |
| Discount amount affects GST/SC/Total | initialDiscount seeds manualDiscount via existing calculation chain — no formula change needed |
| restaurants without roleBaseDiscount | `discountAllowed = !false \|\| canDiscount = true` → section always shows, zero regression |
| Apply button API failure | Show error toast, discount not applied, user can retry |
| Socket latency | Cashier's CPP stays at full price until socket fires — acceptable (owner can confirm before cashier proceeds) |

---

## Gate Status
- Gate 1: COMPLETE
- Gate 2: COMPLETE (this document) — all ODs locked, spec confirmed 2026-10-18
- Gate 3: READY — say "BUG-538 Gate 3 GO"
- Gate 4 GO: NOT given
