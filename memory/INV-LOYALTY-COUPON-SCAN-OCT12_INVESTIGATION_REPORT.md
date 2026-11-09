# INVESTIGATION REPORT — Loyalty Pre-tick + Coupon Pre-load (Scan & Order)
**ID:** INV-LOYALTY-COUPON-SCAN-OCT12
**Date:** 2026-10-12
**Status:** OPEN — ODs locked, socket validation pending
**Steps used:** 9/10
**Confidence:** HIGH (gaps confirmed in code + live API)

---

## 1. Summary

Two gaps in Collect Payment Panel for scan & order flows:

1. **GAP-1 (Loyalty):** `loyalty_info.redeemed = true` on the API/socket order is never read by `fromAPI.order`. CPP always starts with `useLoyalty = false`. Loyalty checkbox never pre-ticked even when customer redeemed loyalty in scan & order.

2. **GAP-2 (Coupon pre-load):** CR-409 pre-loads coupon from `orderData.couponCode` via `initialCoupon` mount effect. This causes coupon to appear auto-applied on CPP open. CR-408 removed CRM auto-apply ✓, but CR-409 introduced a new form of auto-loading which is also unwanted. OD-INV-01 = A: remove CR-409 pre-load entirely.

**Additional open item:** Socket update events (order edits in scan & order) — do they carry `loyalty_info`? If not, the `loyalty_info.redeemed = true` from initial load gets wiped when order is edited, meaning loyalty would not be pre-ticked at CPP open. **Pending validation.**

---

## 2. Decisions — LOCKED (2026-10-12)

| Decision | Choice | Notes |
|---|---|---|
| **OD-INV-01** CR-409 coupon pre-load | **A — Remove entirely** | Cashier must always choose coupon. Empty coupon field on CPP open even for scan & order. |
| **OD-INV-02** Loyalty pre-tick condition | **B — Always when `redeemed = true`** | Pre-tick regardless of `redeemed_amount` value (even 0). Owner-confirmed. |

---

## 3. Gap Details

### GAP-1: Loyalty not pre-ticked

**Root cause — 2-layer gap:**

**Layer A** — `fromAPI.order` (orderTransform.js L196–449) does NOT read `loyalty_info`:
```javascript
couponCode: api.coupon_code || ''     // added by CR-409 ✓
// loyalty_info: NOT READ             // ← missing ✗
```

**Layer B** — CPP has no `initialLoyalty` prop, `useLoyalty` always starts `false`:
```javascript
const [useLoyalty, setUseLoyalty] = useState(false);  // no initialLoyalty prop
```

**Live evidence — RID 689:**
| Order | `loyalty_info.redeemed` | `redeemed_amount` | CPP useLoyalty |
|---|---|---|---|
| 1233149 | `true` | `7` | `false` (should be `true`) |
| 1233147 | `true` | `0` | `false` (should be `true` per OD-INV-02=B) |
| 1233148 | `false` | `0` | `false` (correct) |

**Fix scope:**
- `orderTransform.js` (R5) — add `loyaltyRedeemed: api.loyalty_info?.redeemed === true` to `fromAPI.order`
- `CollectPaymentPanel.jsx` (R5) — add `initialLoyalty = null` prop + mount useEffect: `if (initialLoyalty?.redeemed) setUseLoyalty(true)`
- `OrderEntry.jsx` (R5) — build `initialLoyalty` from `orderData.loyaltyRedeemed` + pass to CPP

---

### GAP-2: Coupon pre-load (CR-409 conflict)

**CRM auto-apply (CR-408): CONFIRMED REMOVED** — `grep -c "Auto-apply best order-scope coupon" CPP.jsx → 0` ✓

**Source of coupon appearing:** CR-409 `initialCoupon` mount effect (CPP L338):
```javascript
useEffect(() => {
  if (initialCoupon?.code && !selectedCoupon) {
    setSelectedCoupon(initialCoupon);     ← sets MARRY without cashier action
    setCouponCode(initialCoupon.code || '');
  }
}, []);
```

**OD-INV-01 = A:** Remove CR-409 entirely — delete `initialCoupon` prop from CPP + guard in OrderEntry. Cashier always starts with empty coupon field.

**Fix scope (when approved):**
- `CollectPaymentPanel.jsx` — remove `initialCoupon = null` prop + delete L333-342 mount effect
- `OrderEntry.jsx` — remove `initialCoupon={...}` prop pass
- `orderTransform.cr409.test.jsx` — keep (tests `couponCode/couponDiscount` in `fromAPI.order` still valid; those fields stay for other consumers like `AggregatorOrderPopOut`, `OrderDetailSheet`)
- `orderTransform.js` — keep CR-409 E-1 coupon fields (downstream read by other components)

---

### GAP-3 (CONFIRMED 2026-10-12) — Socket `update-order` does NOT carry `loyalty_info`

**User-provided socket payload for order 1233149 (post-edit):**

| Field | Socket value | List API value | Match? |
|---|---|---|---|
| `loyalty_info` | **ABSENT — key not present** | `{redeemed:true, redeemed_amount:7}` | ✗ |
| `loyalty_points` | `0` | `7` | ✗ |
| `coupon_code` | `""` | `""` | ✓ |
| `coupon_discount` | `0` | `0` | ✓ |

**Impact chain:**
```
1. List API (boot): loyalty_info.redeemed=true → orderData.loyaltyRedeemed=true ✓
2. Order edited → socket 'update-order' fires
   → handleOrderDataEvent L270: fromAPI.order(socketPayload)
   → socketPayload.loyalty_info = undefined → loyaltyRedeemed = false (wiped) ✗
   → updateOrder(orderId, order) L343 → context: loyaltyRedeemed=false
3. Cashier opens CPP after edit
   → initialLoyalty reads orderData.loyaltyRedeemed=false → useLoyalty=false ✗
```

**FE guard fix (Option A — no backend change):**
In `handleOrderDataEvent` (socketHandlers.js), before `updateOrder()` at L343:
```javascript
const existingOrder = getOrderById ? getOrderById(orderId) : null;
if (existingOrder?.loyaltyRedeemed && !order.loyaltyRedeemed) {
  order.loyaltyRedeemed = existingOrder.loyaltyRedeemed; // preserve
}
```

**DECISION (2026-10-12): Option B — Backend fix.**
Backend will include `loyalty_info` in `update-order` socket payload. No FE guard needed.
Once backend ships this, `fromAPI.order` will naturally read `loyalty_info.redeemed` (via GAP-1 fix) and `loyaltyRedeemed` will be correct on every socket update.
`socketHandlers.js` requires NO change for this gap.

**Evidence:** `/app/memory/evidence/INV-LOYALTY-COUPON-SCAN-OCT12/gap3_socket_validation.json`

---

## 4. Owner Decisions — LOCKED (2026-10-12)

| Decision | Choice | Notes |
|---|---|---|
| **OD-INV-01** CR-409 coupon pre-load | **A — Remove entirely** | CPP E-2/E-3 rolled back; E-1 (fromAPI.order coupon fields) kept for other consumers |
| **OD-INV-02** Loyalty pre-tick condition | **B — Always when `redeemed = true`** | Pre-tick regardless of `redeemed_amount` (even 0) |

---

## 5. Fix Scope — All 3 Gaps (joint CR recommended)

| Gap | File(s) | Change |
|---|---|---|
| GAP-1 Loyalty pre-tick | `orderTransform.js` (R5) + `CollectPaymentPanel.jsx` (R5) + `OrderEntry.jsx` (R5) | Add `loyaltyRedeemed` to `fromAPI.order` + `initialLoyalty` prop + mount effect |
| GAP-2 CR-409 rollback | `CollectPaymentPanel.jsx` (R5) + `OrderEntry.jsx` (R5) | Remove `initialCoupon` prop + L333-342 mount effect |
| GAP-3 Socket wipe | `socketHandlers.js` | **BACKEND FIX** — backend will include `loyalty_info` in `update-order` socket payload. No FE file change needed. `fromAPI.order` reads it automatically via GAP-1 fix. |

All 3 touch overlapping R5 files — **one combined CR recommended**.

---

## 6. Evidence

- `/app/memory/evidence/BUG-SCAN-COUPON-INV-OCT11/order_1233112_raw.json`
- `/app/memory/evidence/INV-LOYALTY-COUPON-SCAN-OCT12/gap3_socket_validation.json`


---

## 5. Next Steps

1. **Validate GAP-3** — probe socket payload for `update-order` event to confirm `loyalty_info` presence/absence
2. **Register CRs** when owner approves gate:
   - New CR for GAP-1 (Loyalty pre-tick) — `orderTransform.js` + CPP + OrderEntry
   - New CR for GAP-2 (CR-409 rollback) — CPP + OrderEntry
3. Both CRs touch same 3 R5 files — recommend joint gate cycle
