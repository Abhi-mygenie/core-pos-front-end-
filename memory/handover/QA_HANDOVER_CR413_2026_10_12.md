# QA Handover — CR-413

**Date:** 2026-10-12
**From:** Implementation agent
**To:** QA agent (Role 4)
**Item:** CR-413 — Remove CR-409 `initialCoupon` Pre-load from Collect Payment Panel

---

## 1. Inherited Verification Matrix (self-test results)

| Edit | File | Lines | Change | Self-Test |
|------|------|-------|--------|-----------|
| E-CR413-1a | `CollectPaymentPanel.jsx` | 76–77 | Deleted `initialCoupon = null,` prop + comment | ✅ grep → marker only, 0 code refs |
| E-CR413-1b | `CollectPaymentPanel.jsx` | 333–342 | Deleted mount `useEffect` (10 lines) | ✅ grep → marker only, 0 code refs |
| E-CR413-2 | `OrderEntry.jsx` | 1935–1949 | Deleted `initialCoupon={…}` JSX prop (15 lines) | ✅ grep → marker only, 0 code refs |

**Unit test:** `orderTransform.cr409.test.js` — 4/4 PASS ✅ (confirms CR-409 E-1 coupon fields in orderTransform untouched)
**Compile:** webpack 1 warning (pre-existing SettlementReportMockup exhaustive-deps) — ZERO new warnings ✅

---

## 2. Test Cases (execute in order)

| # | Test | Steps | Expected | Blocker? |
|---|------|-------|---------|---------|
| TC-1 | Scan & order with coupon → CPP opens blank | Log in as owner@thegoankitchen.com → find an active scan & order that has a coupon applied (e.g. MARRY) → tap Bill / Collect Payment | CPP opens. Coupon section: **empty field, no coupon pre-applied, no discount line for MARRY**. Cashier sees blank coupon input. | YES |
| TC-2 | Regular POS dine-in → CPP unaffected | Open a regular dine-in order → Collect Payment | CPP opens with empty coupon field (same as before CR-409). No regression. | YES |
| TC-3 | Cashier manually enters coupon after fix | CPP open (any order) → type a valid coupon code into the coupon input → apply | Coupon applies correctly and discount shows. Cashier-initiated flow fully working. | YES |
| TC-4 | Order card coupon badge still visible | Open a scan & order with MARRY coupon → inspect order card (before opening CPP) | Order card still shows coupon badge / MARRY label (CR-409 E-1 in orderTransform.js kept). | NO |

---

## 3. Regression Test Cases

| # | Test | Why |
|---|------|-----|
| R1 | CR-408: no CRM auto-apply | CR-413 must not re-introduce any other auto-apply path. Open CPP for a CRM customer with loyalty coupons → coupon field blank. |
| R2 | Regular settle flow end-to-end | Open a regular dine-in → add items → Collect Payment → pay Cash → order settles. No crashes, no unexpected discount. |
| R3 | `orderTransform.cr409.test.js` 4/4 | `npx craco test --watchAll=false --testPathPattern=orderTransform.cr409` → all PASS |

---

## 4. What Changed (code diff summary)

**CollectPaymentPanel.jsx — removed prop (was L76–77, now L76 marker):**
```jsx
// BEFORE
  // CR-409: pre-loaded coupon from scan & order. Null for regular POS orders → no change.
  initialCoupon = null,

// AFTER
  // CR-413: initialCoupon removed — cashier always chooses coupon (OD-INV-01=A)
```

**CollectPaymentPanel.jsx — removed useEffect (was L333–342, now L332 marker):**
```jsx
// BEFORE
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

// AFTER
  // CR-413: initialCoupon mount useEffect removed — cashier always chooses coupon (OD-INV-01=A)
```

**OrderEntry.jsx — removed prop pass (was L1935–1949, now L1935 marker):**
```jsx
// BEFORE
              // CR-409: pre-load coupon from existing scan & order.
              // Guard: null when no coupon on order → zero regression on regular POS orders.
              initialCoupon={
                orderData?.couponCode
                  ? { valid: true, code: orderData.couponCode, ... }
                  : null
              }

// AFTER
              // CR-413: initialCoupon prop removed — cashier always chooses coupon (OD-INV-01=A)
```

**Kept unchanged:** `orderTransform.js` CR-409 E-1 coupon fields (L447–453) · `orderTransform.cr409.test.js`

---

## 5. Files Changed

| File | Lines affected | Net delta |
|------|---------------|-----------|
| `src/components/order-entry/CollectPaymentPanel.jsx` | L76–77 (−1 net) · L333–342 (−9 net) | −10 |
| `src/components/order-entry/OrderEntry.jsx` | L1935–1949 (−14 net) | −14 |

Files NOT touched: `orderTransform.js` · test file · `DashboardPage.jsx` · `CartPanel.jsx`

---

## 6. Registry Sync Confirmation

```
Registry synced:       YES
CR-413 status:         GATE_5A_IMPLEMENTED
CR-413 sprint:         oct_cr_batch
CR_REGISTRY.md:        UPDATED — GATE_5A_IMPLEMENTED row
FILE_OWNERSHIP.md:     UPDATED — CR-413 IMPL section added
Code markers:          // CR-413 on CPP L76 · CPP L332 · OE L1935
Unit test:             orderTransform.cr409.test.js 4/4 PASS
EXIT GATE:             5/5 PASS
```

---

## 7. Credentials + Environment

| Field | Value |
|-------|-------|
| Owner account | owner@thegoankitchen.com / Qplazm@10 |
| Restaurant | The Goan Kitchen (RID 69) |
| Preview URL | https://genie-core-pos.preview.emergentagent.com |
| External backend | https://preprod.mygenie.online |

---

## 8. Regression Scope

CR-413 touches 2 R5 hotspot files → apply: handover regression tests R1–R3 **plus** 2 cross-flow tests:
1. Full settle cycle: place order → collect payment → complete (no unexpected discounts)
2. Coupon manual flow: CPP → enter coupon → apply → settle (cashier-initiated still works)
