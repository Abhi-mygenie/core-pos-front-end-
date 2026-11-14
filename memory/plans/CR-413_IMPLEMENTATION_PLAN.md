# CR-413 — Implementation Plan (Gate 3)

**Date:** 2026-10-12
**Role:** PLANNING (Gate 3 — Implementation Plan only)
**Item:** CR-413 — Remove CR-409 `initialCoupon` Pre-load from Collect Payment Panel
**Risk:** CRITICAL
**Sprint:** oct_cr_batch
**Gate 2 IA:** `impact/CR-413_IMPACT_ANALYSIS.md`

---

## Entry Verification (MANDATORY — run before touching any code)

For each anchor, run the command. If the output does not match exactly → **STOP. Return to Planning agent.**

### Anchor A — CollectPaymentPanel.jsx L76–77
```bash
sed -n '76,77p' /app/frontend/src/components/order-entry/CollectPaymentPanel.jsx
```
**Expected:**
```
  // CR-409: pre-loaded coupon from scan & order. Null for regular POS orders → no change.
  initialCoupon = null,
```

### Anchor B — CollectPaymentPanel.jsx L333–342
```bash
sed -n '333,342p' /app/frontend/src/components/order-entry/CollectPaymentPanel.jsx
```
**Expected:**
```
  // CR-409: seed selectedCoupon from pre-loaded scan & order coupon on mount.
  // Fires once at panel open. initialCoupon = null for regular POS orders → no-op.
  // OD-409-01 (B): cashier can remove this coupon — Remove button works as normal.
  useEffect(() => {
    if (initialCoupon?.code && !selectedCoupon) {
      setSelectedCoupon(initialCoupon);
      setCouponCode(initialCoupon.code || '');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // mount-only — initialCoupon is frozen at panel open
```

### Anchor C — OrderEntry.jsx L1935–1949
```bash
sed -n '1935,1949p' /app/frontend/src/components/order-entry/OrderEntry.jsx
```
**Expected:**
```
              // CR-409: pre-load coupon from existing scan & order.
              // Guard: null when no coupon on order → zero regression on regular POS orders.
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

### Anchor D — orderTransform.js E-1 (MUST NOT be touched)
```bash
sed -n '447,453p' /app/frontend/src/api/transforms/orderTransform.js
```
**Expected (verify present, do NOT edit):**
```
      couponCode:     api.coupon_code     || '',
      couponDiscount: parseFloat(api.coupon_discount) || 0,
      couponTitle:    api.coupon_title    || '',
      couponType:     api.coupon_type     || 'order',
```

**Anchor verification confirmed at plan-write time (2026-10-12, same session):** ✅ A PASS · ✅ B PASS · ✅ C PASS · ✅ D PASS

---

## Scope Lock

**Files WILL change:**
- `src/components/order-entry/CollectPaymentPanel.jsx` — E-CR413-1a (L76–77) + E-CR413-1b (L333–342)
- `src/components/order-entry/OrderEntry.jsx` — E-CR413-2 (L1935–1949)

**Files WILL NOT touch:**
- `src/api/transforms/orderTransform.js` — CR-409 E-1 kept (coupon fields for display consumers)
- `src/__tests__/api/transforms/orderTransform.cr409.test.js` — kept (tests E-1 only)
- `src/pages/DashboardPage.jsx` (R5 hotspot)
- `src/components/order-entry/CartPanel.jsx` (R5 hotspot)
- Any service / context / other transform

**If scope expands beyond 2 files → STOP. Re-declare. Get owner confirmation.**

---

## Edits

### E-CR413-1a — `CollectPaymentPanel.jsx`: remove `initialCoupon` prop declaration

| Field | Value |
|-------|-------|
| File | `src/components/order-entry/CollectPaymentPanel.jsx` |
| Lines | **76–77** |
| Operation | Replace 2 lines (comment + prop) with 1 marker line |
| Net delta | −1 line |

**Before:**
```jsx
  // CR-409: pre-loaded coupon from scan & order. Null for regular POS orders → no change.
  initialCoupon = null,
```

**After:**
```jsx
  // CR-413: initialCoupon removed — cashier always chooses coupon (OD-INV-01=A)
```

**Context (preserved, not touched):**
```jsx
  // by the restaurant. When undefined (dashboard caller) → existing
  // behaviour is preserved verbatim.
  // CR-413: initialCoupon removed — cashier always chooses coupon (OD-INV-01=A)  ← NEW
  allowedMethods,
}) => {
```

**search_replace `old_str`:**
```
  // CR-409: pre-loaded coupon from scan & order. Null for regular POS orders → no change.
  initialCoupon = null,
```
**search_replace `new_str`:**
```
  // CR-413: initialCoupon removed — cashier always chooses coupon (OD-INV-01=A)
```

---

### E-CR413-1b — `CollectPaymentPanel.jsx`: remove mount `useEffect`

| Field | Value |
|-------|-------|
| File | `src/components/order-entry/CollectPaymentPanel.jsx` |
| Lines | **333–342** |
| Operation | Replace 10 lines (3 comment + 7 useEffect body) with 1 marker line |
| Net delta | −9 lines |

**Before:**
```jsx
  // CR-409: seed selectedCoupon from pre-loaded scan & order coupon on mount.
  // Fires once at panel open. initialCoupon = null for regular POS orders → no-op.
  // OD-409-01 (B): cashier can remove this coupon — Remove button works as normal.
  useEffect(() => {
    if (initialCoupon?.code && !selectedCoupon) {
      setSelectedCoupon(initialCoupon);
      setCouponCode(initialCoupon.code || '');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // mount-only — initialCoupon is frozen at panel open
```

**After:**
```jsx
  // CR-413: initialCoupon mount useEffect removed — cashier always chooses coupon (OD-INV-01=A)
```

**Context (preserved, not touched):**
```jsx
  const [discountFor, setDiscountFor] = useState('');     // CR-137: optional discount reason (max 50 chars)

  // CR-413: initialCoupon mount useEffect removed — cashier always chooses coupon (OD-INV-01=A)  ← NEW

  // BUG-276: Service charge toggle — default ON, staff can uncheck per order
```

**search_replace `old_str`:**
```
  // CR-409: seed selectedCoupon from pre-loaded scan & order coupon on mount.
  // Fires once at panel open. initialCoupon = null for regular POS orders → no-op.
  // OD-409-01 (B): cashier can remove this coupon — Remove button works as normal.
  useEffect(() => {
    if (initialCoupon?.code && !selectedCoupon) {
      setSelectedCoupon(initialCoupon);
      setCouponCode(initialCoupon.code || '');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // mount-only — initialCoupon is frozen at panel open
```
**search_replace `new_str`:**
```
  // CR-413: initialCoupon mount useEffect removed — cashier always chooses coupon (OD-INV-01=A)
```

---

### E-CR413-2 — `OrderEntry.jsx`: remove `initialCoupon` prop pass

| Field | Value |
|-------|-------|
| File | `src/components/order-entry/OrderEntry.jsx` |
| Lines | **1935–1949** |
| Operation | Replace 15 lines (2 comment + 13 JSX prop) with 1 marker line |
| Net delta | −14 lines |

**Before:**
```jsx
              // CR-409: pre-load coupon from existing scan & order.
              // Guard: null when no coupon on order → zero regression on regular POS orders.
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

**After:**
```jsx
              // CR-413: initialCoupon prop removed — cashier always chooses coupon (OD-INV-01=A)
```

**Context (preserved, not touched):**
```jsx
              initialDeliveryCharge={...}
              }
              // CR-413: initialCoupon prop removed — cashier always chooses coupon (OD-INV-01=A)  ← NEW
              // BUG-004 (QA, Apr 2026): expose Split Bill trigger...
              onOpenSplitBill={...}
```

**search_replace `old_str`:**
```
              // CR-409: pre-load coupon from existing scan & order.
              // Guard: null when no coupon on order → zero regression on regular POS orders.
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
**search_replace `new_str`:**
```
              // CR-413: initialCoupon prop removed — cashier always chooses coupon (OD-INV-01=A)
```

---

## Execution Sequence

```
1. Run Entry Verification (Anchors A–D) — abort on ANY mismatch
2. Apply E-CR413-1a (CPP L76–77) via search_replace
3. Apply E-CR413-1b (CPP L333–342) via search_replace
   → E-CR413-1a and E-CR413-1b can be applied in parallel (different line ranges, same file — use separate search_replace calls)
4. Apply E-CR413-2 (OE L1935–1949) via search_replace
5. Compile check — wait for hot-reload: "Compiled successfully" OR "0 new warnings"
   → If lint error on `initialCoupon`: grep to confirm it's truly gone from both files
6. Run Self-Verification (Verification Matrix V5–V8: code checks + unit test)
7. Run EXIT GATE (5 checkboxes)
8. Write QA Handover
9. Write Session Handover
```

**Can E-CR413-1a, E-CR413-1b, E-CR413-2 be applied together?**
E-CR413-1a and E-CR413-1b are in the same file (CPP) at non-overlapping ranges. Apply both to CPP, then E-CR413-2 to OE. All three `search_replace` calls can be issued in one parallel tool-call block.

---

## Verification Matrix (Step 4 — seeds QA handover)

| # | Edit | What to verify | Method | Automated? |
|---|------|---------------|--------|:---:|
| V1 | E-CR413-2 | CPP opens with empty coupon for a scan & order with coupon (MARRY) | Browser: open scan & order → open CPP → coupon field blank | NO |
| V2 | All | CPP opens with empty coupon for a regular POS dine-in order | Browser: open dine-in → open CPP → coupon field blank | NO |
| V3 | All | Cashier can manually enter/scan coupon after fix | Browser: open CPP → manually enter coupon code → applies correctly | NO |
| V4 | E-CR413-1a | No `initialCoupon` prop reference remains in CPP | `grep -n "initialCoupon" /app/frontend/src/components/order-entry/CollectPaymentPanel.jsx` → 0 hits | YES |
| V5 | E-CR413-2 | No `initialCoupon` prop reference remains in OE | `grep -n "initialCoupon" /app/frontend/src/components/order-entry/OrderEntry.jsx` → 0 hits | YES |
| V6 | None | orderTransform.js E-1 untouched — couponCode/couponDiscount still present | `grep -n "couponCode" /app/frontend/src/api/transforms/orderTransform.js \| grep "447\|450"` → present | YES |
| V7 | None | orderTransform.cr409.test still passes | `npx craco test --watchAll=false --testPathPattern=orderTransform.cr409` → PASS | YES |
| V8 | All | webpack: 0 new warnings | `yarn build` exit 0 | YES |

---

## Risk Register

| Risk | Likelihood | Mitigation |
|------|-----------|-----------|
| `useEffect` import becomes unused | NONE | Many other `useEffect` calls remain in CPP (BUG-276, discount timer, etc.) |
| `selectedCoupon` starts non-null without initialCoupon | NONE | `selectedCoupon` is initialised `useState(null)` — unchanged by this edit |
| Regular POS orders regress | NONE | `initialCoupon` was already `null` for regular orders. CPP behaviour identical. |
| CPP props destructuring breaks | NONE | `allowedMethods,` on L78 (after old L77) is untouched. Clean list. |
| `orderData.couponCode` in OE becomes dead code | NONE | `orderData.couponCode` is still read elsewhere by `fromAPI.order` transform. The only OE reference was in the deleted `initialCoupon` build — gone cleanly. |
| Lint warning: `initialCoupon` was used by deleted useEffect | NONE | Both prop and useEffect are deleted together. No dangling reference. |
| CR-412 line anchors shift | LOW (not blocker for CR-413) | CR-412 implementation agent must re-verify CPP + OE anchors after this ships. Net delta: CPP −10 lines (L76-77 net −1 + L333-342 net −9). OE −14 lines. Noted in conflict register. |

---

## Post-Code Registry Checklist (Step 5 — EXIT GATE prerequisite)

```
□ 1. REGISTRY SYNC
     python3 -c "
     import json
     with open('/app/memory/control/registry.json') as f:
         d = json.load(f)
     items = {i['id']: i for i in d['items']}
     assert 'CR-413' in items, 'CR-413 MISSING'
     assert 'IMPLEMENTED' in items['CR-413'].get('status','').upper(), \
         f'Wrong status: {items[\"CR-413\"][\"status\"]}'
     assert items['CR-413'].get('sprint_key') == 'oct_cr_batch'
     print('CR-413 registry PASS —', items['CR-413']['status'])
     "
     If FAIL → update registry.json NOW.

□ 2. CR_REGISTRY.md
     CR-413 row → GATE_5A_IMPLEMENTED
     Note: plan_doc added, files_changed listed, edits listed.

□ 3. FILE_OWNERSHIP.md
     Add section:
       ## FILE_OWNERSHIP — CR-413 IMPL (2026-10-12)
       | CollectPaymentPanel.jsx | E-CR413-1a L76-77: initialCoupon prop deleted.
                                   E-CR413-1b L333-342: mount useEffect deleted. | CR-413 IMPL 2026-10-12 |
       | OrderEntry.jsx          | E-CR413-2 L1935-1949: initialCoupon prop pass deleted. | CR-413 IMPL 2026-10-12 |
       NOT touched: orderTransform.js · orderTransform.cr409.test.js · DashboardPage.jsx

□ 4. CODE MARKERS
     All 3 replacement marker lines carry // CR-413 comment.
     Verify:
       grep -n "CR-413" /app/frontend/src/components/order-entry/CollectPaymentPanel.jsx
         → must show 2 lines (E-CR413-1a marker + E-CR413-1b marker)
       grep -n "CR-413" /app/frontend/src/components/order-entry/OrderEntry.jsx
         → must show 1 line (E-CR413-2 marker)

□ 5. COMPILE + UNIT TEST
     yarn build → exit 0, 0 new warnings beyond pre-existing allDays warning
     npx craco test --watchAll=false --testPathPattern=orderTransform.cr409 → PASS
     (unit test confirms E-1 in orderTransform.js is intact)
```

**Do NOT write SESSION_HANDOVER or QA handover until all 5 pass.**

---

## QA Handover Template (pre-filled)

```markdown
## QA Handover — CR-413

### 1. Inherited Verification Matrix
| Edit | File | Lines | Change | Self-Test |
|------|------|-------|--------|-----------|
| E-CR413-1a | CollectPaymentPanel.jsx | 76-77 | Deleted prop + comment | V4: grep → 0 ✅ |
| E-CR413-1b | CollectPaymentPanel.jsx | 333-342 | Deleted mount useEffect | V4: grep → 0 ✅ |
| E-CR413-2 | OrderEntry.jsx | 1935-1949 | Deleted initialCoupon JSX prop | V5: grep → 0 ✅ |

### 2. Test cases
| # | Test | Steps | Expected |
|---|------|-------|---------|
| TC-1 | Scan & order with coupon → CPP opens blank | Open scan & order (MARRY coupon) → bill → CPP opens | Coupon field: empty. Discount line: absent. |
| TC-2 | Regular POS order → CPP unchanged | Regular dine-in → bill → CPP opens | Coupon field: empty (same as before). |
| TC-3 | Cashier manually applies coupon | CPP → type/scan coupon → apply | Coupon applied correctly, discount shown. |
| TC-4 | Coupon badge still shown on order card | Scan & order card for order with MARRY | Order card shows MARRY badge (E-1 kept). |

### 3. Regression
| # | Test | Why |
|---|------|-----|
| R1 | CR-408: no auto-apply from CRM | CR-413 must not re-introduce any auto-apply path |
| R2 | Settle regular dine-in order | No regression on CPP core payment flow |

### 4. Registry Sync Confirmation
Registry synced: [ ] YES
EXIT GATE: [ ] 5/5 PASS

### 5. Credentials
- Owner: owner@thegoankitchen.com / Qplazm@10 (RID 69)
- Preview: https://genie-core-pos.preview.emergentagent.com
- Backend: https://preprod.mygenie.online
```

---

## Note to Implementation Agent re CR-412

After CR-413 ships, **CR-412's implementation agent must re-verify its CPP and OE anchor line numbers** before coding:
- CPP net delta: −10 lines (E-CR413-1a: −1, E-CR413-1b: −9). Any CR-412 CPP target at L > 77 shifts by −1; any target at L > 342 shifts by −9.
- OE net delta: −14 lines. Any CR-412 OE target at L > 1935 shifts by −14.
- CR-412 adds `initialLoyalty` prop (~L78 in CPP, ~L1937 in OE at current HEAD). After CR-413: ~L77 CPP, ~L1923 OE.

---

## Summary

| Field | Value |
|-------|-------|
| Edits | 3 (E-CR413-1a · E-CR413-1b · E-CR413-2) |
| Files | 2 (CollectPaymentPanel.jsx · OrderEntry.jsx) |
| Lines deleted | 27 |
| Lines added | 0 (3 marker comment replacements = net −24) |
| Risk | CRITICAL |
| Owner decisions | NONE |
| Planning-skip | NOT eligible (R5 + CRITICAL) |
| Awaiting | Gate 4 GO |
