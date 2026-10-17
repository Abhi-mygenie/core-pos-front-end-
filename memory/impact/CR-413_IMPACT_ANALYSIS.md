# CR-413 — Impact Analysis (Gate 2)

**Date:** 2026-10-12
**Role:** PLANNING (Gate 2 — Impact Analysis only)
**Item:** CR-413 — Remove CR-409 `initialCoupon` Pre-load from Collect Payment Panel
**Risk:** CRITICAL
**Sprint:** oct_cr_batch
**Intake doc:** `change_requests/CR-413_REMOVE_CR409_COUPON_PRELOAD_CPP_INTAKE.md`
**Investigation:** `INV-LOYALTY-COUPON-SCAN-OCT12_INVESTIGATION_REPORT.md`

---

## Header

**Code Reality:** FULL — all 3 target blocks confirmed at HEAD (grep + sed verified 2026-10-12).
**Conflict Pre-Check:** CR-412 (same files, backend-blocked, different lines — PARALLEL-SAFE, CR-413 executes first) · BUG-538 (same files, different lines — PARALLEL-SAFE).
**Open Owner Decisions:** NONE — OD-INV-01 = A locked. Fix is fully scoped.
**Gate 2 Status:** COMPLETE.

---

## 1. What This CR Does

CR-409 (2026-10-11) added a mount-only `useEffect` in `CollectPaymentPanel` that seeds `selectedCoupon` from an `initialCoupon` prop passed by `OrderEntry`. For scan & order arrivals with a coupon (`coupon_code = 'MARRY'`), CPP opened with the coupon already applied — cashier had no choice.

**CR-408 had already removed CRM auto-apply** (confirmed by code audit: grep of removed block = 0 hits). CR-409 then introduced a new form of auto-loading through a different path.

**OD-INV-01 = A (locked):** Remove CR-409 E-2 + E-3 entirely. CPP must always open with an empty coupon field. Cashier always chooses. This applies to all order types — regular POS, scan & order, re-engaged orders.

---

## 2. Scope — What Is Removed, What Is Kept

| CR-409 edit | Action | Reason |
|---|---|---|
| **E-1** `orderTransform.js` L447–453 — coupon fields in `fromAPI.order` | **KEEP** | `AggregatorOrderPopOut`, `OrderDetailSheet`, `orderLedgerService` all read `couponCode/couponDiscount` from order data for display. Removing would break downstream consumers. |
| **E-2** `CollectPaymentPanel.jsx` — `initialCoupon = null` prop + mount `useEffect` | **REMOVE** | This is the auto-loading path. Owner decision OD-INV-01=A. |
| **E-3** `OrderEntry.jsx` — `initialCoupon={…}` prop build + pass to CPP | **REMOVE** | No prop needed once E-2 is gone. The prop pass becomes dead code. |
| Test `orderTransform.cr409.test.jsx` | **KEEP** | Tests E-1 only (transform coupon fields). Still valid after CR-413. |

---

## 3. Code Reality — Exact Blocks at HEAD

### Block A — `CollectPaymentPanel.jsx` prop declaration (L76–77)

```jsx
// L76 — comment to remove
  // CR-409: pre-loaded coupon from scan & order. Null for regular POS orders → no change.
// L77 — prop to remove
  initialCoupon = null,
```

**Lines:** 76–77 (2 lines)
**Context:** Inside the CPP destructured props list. `allowedMethods,` remains on L78 — no structural gap.

---

### Block B — `CollectPaymentPanel.jsx` mount `useEffect` (L333–342)

```jsx
// L333 — comment to remove
  // CR-409: seed selectedCoupon from pre-loaded scan & order coupon on mount.
// L334
  // Fires once at panel open. initialCoupon = null for regular POS orders → no-op.
// L335
  // OD-409-01 (B): cashier can remove this coupon — Remove button works as normal.
// L336
  useEffect(() => {
// L337
    if (initialCoupon?.code && !selectedCoupon) {
// L338
      setSelectedCoupon(initialCoupon);
// L339
      setCouponCode(initialCoupon.code || '');
// L340
    }
// L341
    // eslint-disable-next-line react-hooks/exhaustive-deps
// L342
  }, []); // mount-only — initialCoupon is frozen at panel open
```

**Lines:** 333–342 (10 lines)
**Context:** Sits between `useState` declarations and `// BUG-276` comment (L344+). Removing the block leaves a clean blank line gap — no structural issue.

**After removal:** `initialCoupon` is no longer referenced anywhere in CPP. The `useEffect` import is used by many other effects in CPP — it stays.

---

### Block C — `OrderEntry.jsx` prop pass (L1935–1949)

```jsx
// L1935 — comment to remove
              // CR-409: pre-load coupon from existing scan & order.
// L1936
              // Guard: null when no coupon on order → zero regression on regular POS orders.
// L1937–1949 — JSX prop to remove
              initialCoupon={
                orderData?.couponCode
                  ? {
                      valid:                true,
                      code:                 orderData.couponCode,
                      title:                orderData.couponTitle || orderData.couponCode,
                      computedDiscount:     orderData.couponDiscount || 0,
                      couponType:           orderData.couponType   || 'order',
                      stackableWithLoyalty: true,
                      fromExistingOrder:    true,
                    }
                  : null
              }
```

**Lines:** 1935–1949 (15 lines: 2 comment + 13 JSX)
**Context:** Inside the `<CollectPaymentPanel ... />` JSX prop list in OrderEntry. The prop before it (`initialDeliveryCharge={...}`) and the prop after it (`// BUG-004 onOpenSplitBill`) are unaffected. JSX structure intact.

**After removal:** `orderData.couponCode/couponTitle/couponDiscount/couponType` are still read by `orderTransform.js` E-1 (for display in other components). The `orderData.couponCode` reference in OrderEntry only existed to build `initialCoupon` — no other usage in this file.

---

## 4. Data Flow Trace — Before and After

### BEFORE (current behaviour — broken)
```
Scan & order arrives with coupon_code='MARRY'
  → handleOrderDataEvent → fromAPI.order → orderData.couponCode = 'MARRY'  [CR-409 E-1, kept]
  → OrderEntry builds initialCoupon = { code:'MARRY', computedDiscount:197, ... }  [CR-409 E-3, removed]
  → CPP mounts with initialCoupon prop
  → mount useEffect fires → setSelectedCoupon(initialCoupon)  [CR-409 E-2, removed]
  → CPP shows MARRY coupon already applied (-₹197)  ← CASHIER HAS NO CHOICE
```

### AFTER (CR-413 applied)
```
Scan & order arrives with coupon_code='MARRY'
  → handleOrderDataEvent → fromAPI.order → orderData.couponCode = 'MARRY'  [CR-409 E-1, kept — display only]
  → OrderEntry passes NO initialCoupon to CPP  [E-3 removed]
  → CPP mounts with no initialCoupon prop (default null)
  → mount useEffect GONE  [E-2 removed]
  → CPP shows empty coupon field  ← CASHIER CHOOSES
```

**Downstream display consumers unaffected (E-1 kept):**
- `AggregatorOrderPopOut` — reads `order.couponCode` to display coupon badge ✓
- `OrderDetailSheet` — reads `order.couponCode/couponDiscount` for bill display ✓
- `orderLedgerService` — reads `order.couponDiscount` for ledger totals ✓

---

## 5. Conflict Pre-Check

| Item | Status | Files overlap | Lines overlap | Verdict |
|---|---|---|---|---|
| **CR-412** | GATE_1_INTAKE (backend-blocked) | CPP + OE (same files) | Different lines (CPP: +`initialLoyalty` prop at ~L78; OE: +`initialLoyalty` pass at ~L1937) | **PARALLEL-SAFE.** CR-413 removes L76-77 + L333-342 + OE L1935-1949. CR-412 adds at adjacent lines. **Execution order: CR-413 BEFORE CR-412** — so CR-412's implementation agent must re-verify its anchor lines after CR-413 ships (line numbers will shift by −27 in OE). |
| **BUG-538** | GATE_1_INTAKE (OD open) | CPP + OE | OE L334 (`canDiscount`); CPP (no current lines — fix not yet coded) | **PARALLEL-SAFE.** OE L334 is 1,601 lines away from CR-413's OE target (L1935). CPP target is different section. |
| **CR-116** | QA PASS Gate 5b | CPP + orderTransform | Old sprint (pos_5_0), already shipped | Not an active conflict. |
| **CR-137** | QA_PASS | CPP + orderTransform | Old sprint (pos_5_1), already shipped | Not an active conflict. |
| **BUG-281** | Awaiting owner smoke | OE | Old sprint (pos_5_0) | Not an active conflict. |

**Execution order recommendation:** CR-413 → (backend ships loyalty_info) → CR-412 → BUG-538

---

## 6. Risk Classification

| Attribute | Value |
|---|---|
| Risk | **CRITICAL** |
| Trigger | R5 hotspot files (CPP + OE) + coupon/discount financial logic path |
| R5 hotspots? | **YES** — both files on R5 list |
| R6 financial? | **YES** — coupon discount reduces `effectiveTotal` in CPP. Removing the pre-load path ensures no unexpected discount is applied. Removing code = safer direction (cannot over-discount), but still requires R6 verification. |
| Planning-skip eligible? | **NO** — R5 hotspots + CRITICAL risk |
| Files WILL change | `src/components/order-entry/CollectPaymentPanel.jsx` · `src/components/order-entry/OrderEntry.jsx` |
| Files WILL NOT touch | `orderTransform.js` (E-1 kept) · `orderTransform.cr409.test.jsx` (kept) · `DashboardPage.jsx` (R5) · `CartPanel.jsx` · any service/context |

---

## 7. Edit Summary

| # | File | Lines | Operation | Net line delta |
|---|---|---|---|---|
| E-CR413-1a | `CollectPaymentPanel.jsx` | L76–77 | Delete comment + prop declaration | −2 |
| E-CR413-1b | `CollectPaymentPanel.jsx` | L333–342 | Delete comment block + useEffect body | −10 |
| E-CR413-2 | `OrderEntry.jsx` | L1935–1949 | Delete comment + initialCoupon JSX prop | −15 |

**Total:** 2 files · 27 lines deleted · 0 lines added · 0 lines changed.

---

## 8. Regression Risks

| Risk | Assessment |
|---|---|
| CPP `useEffect` import becomes unused | NO — `useEffect` is used by many other effects in CPP. Only this one instance is removed. |
| `orderData.couponCode` reference broken | NO — E-1 in orderTransform.js keeps the field; other consumers (AggregatorOrderPopOut etc.) read it directly from `order`. The only call site in OrderEntry was the deleted `initialCoupon` build. |
| `selectedCoupon` state in CPP broken | NO — `selectedCoupon` is initialised as `null` (existing code before CR-409). All existing coupon flows (cashier-initiated scan, manual entry) still work through the existing CouponInput component. |
| CPP props destructuring gap after removing `initialCoupon = null,` | NO — `allowedMethods,` follows on the next line (L78). Removing L77 leaves a clean list. |
| Regular POS orders (non-scan) regress | NO — `initialCoupon` was already `null` for regular POS orders (OE guard: `orderData?.couponCode ? {...} : null`). Removing the prop means CPP receives the same effective `null` — behaviour is identical. |
| `fromExistingOrder: true` flag consumers | NO — this flag was only consumed by the mount useEffect being deleted. No other code checks `initialCoupon.fromExistingOrder`. |

---

## 9. Verification Matrix (seeds Gate 3 + QA)

| # | What to verify | Method | Automated? |
|---|---|---|:---:|
| V1 | CPP opens with empty coupon field for a scan & order with coupon | Browser: open scan & order with MARRY coupon → open CPP → confirm empty coupon field | NO |
| V2 | CPP opens with empty coupon field for regular POS order | Browser: open regular dine-in → open CPP → confirm empty coupon field | NO |
| V3 | Cashier can still manually scan/enter coupon after CR-413 | Browser: open CPP → enter/scan coupon manually → coupon applies correctly | NO |
| V4 | AggregatorOrderPopOut still shows coupon badge | Browser: scan & order → Order card → coupon badge still visible (E-1 kept) | NO |
| V5 | `orderData.couponCode` not referenced in OrderEntry after edit | Code: `grep -n "initialCoupon" OrderEntry.jsx` → 0 results | YES |
| V6 | `initialCoupon` not referenced in CPP after edit | Code: `grep -n "initialCoupon" CollectPaymentPanel.jsx` → 0 results | YES |
| V7 | `orderTransform.cr409.test.jsx` still passes | `npx craco test --watchAll=false --testPathPattern=orderTransform.cr409` | YES |
| V8 | webpack: 0 new warnings | `yarn build` exit 0 | YES |

---

## 10. Post-Code Registry Checklist (for Implementation agent)

```
□ 1. REGISTRY SYNC
     python3 -c "
     import json
     with open('/app/memory/control/registry.json') as f:
         data = json.load(f)
     items = {i['id']: i for i in data['items']}
     assert 'CR-413' in items
     assert 'IMPLEMENTED' in items['CR-413'].get('status','').upper()
     assert items['CR-413'].get('sprint_key') == 'oct_cr_batch'
     print('CR-413 Registry sync PASS')
     "

□ 2. CR_REGISTRY.md: CR-413 row → GATE_5A_IMPLEMENTED

□ 3. FILE_OWNERSHIP.md: add section for CR-413 with
     - CollectPaymentPanel.jsx — E-CR413-1a L76-77 + E-CR413-1b L333-342 deleted
     - OrderEntry.jsx — E-CR413-2 L1935-1949 deleted

□ 4. CODE MARKERS
     Add // CR-413: removed initialCoupon prop (see CR-413 IA) immediately
     after the deleted blocks (on the line that follows, as a one-line comment)
     — or on a retained adjacent line. Must reference CR-413.

□ 5. COMPILE CHECK + UNIT TEST
     yarn build exit 0, 0 new warnings
     npx craco test --watchAll=false --testPathPattern=orderTransform.cr409 → PASS
```

---

## 11. Open Owner Decisions

**NONE.** OD-INV-01 = A fully scoped. Implementation agent has everything needed.

---

## 12. Summary

- **2 files · 27 lines deleted · 0 added · full gate required (R5 + CRITICAL)**
- **What goes:** CPP prop L76-77 + CPP mount useEffect L333-342 + OE prop build L1935-1949
- **What stays:** `orderTransform.js` CR-409 E-1 + `orderTransform.cr409.test.jsx`
- **Conflicts:** CR-412 (same files, backend-blocked, adjacent lines — parallel-safe, CR-413 first) · BUG-538 (different lines — parallel-safe)
- **After fix:** CPP always opens with empty coupon field. Cashier always chooses. Consistent with CR-408.

**Next:** "Gate 3 GO" → Implementation Plan → Gate 4 GO → Implementation.
