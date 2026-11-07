# BUG-538 — ROLE-BASED DISCOUNT SETTING EXISTS BUT IS NEVER WIRED TO COLLECT PAYMENT
**Registered:** 2026-10-12
**Type:** BUG (feature partially built — infrastructure exists, gate never connected)
**Severity:** P1 — HIGH
**Risk:** CRITICAL
**Sprint:** oct_cr_batch
**Status:** GATE_1_INTAKE

---

## Description

The "Role-Based Discount" feature toggle exists in Restaurant Settings and the `discount` role permission is sent by the backend on login. However, the permission check is **never connected** to the discount UI in Collect Payment. Any staff member — regardless of role — can apply any discount at any time, making the setting completely ineffective.

**Expected:** When `restaurantSettings.roleBaseDiscount = true`, only users with the `discount` permission should be able to apply discounts. Others should see the discount section disabled/hidden with a hint.

**Actual:** Discount UI is always fully enabled. `canDiscount` and `roleBaseDiscount` are never consulted.

---

## Root Cause — Dead code: 2 variables declared, neither ever used

```javascript
// OrderEntry.jsx L334 — computed but NEVER PASSED to CollectPaymentPanel
const canDiscount = hasPermission('discount');

// restaurantSettingsTransform.js L98 — mapped from API but NEVER READ in discount flow
roleBaseDiscount: toBool(basic.role_base_discount)
```

**`CollectPaymentPanel.jsx`:** has NO `canDiscount` prop, ZERO reads of `restaurantSettings.roleBaseDiscount` in the discount section. The discount type selector and value input are always rendered and enabled.

---

## Duplicate Check

**DISTINCT** — no prior CR/BUG for this wiring gap.

---

## Evidence

- **Source:** OWNER-REPORTED (investigation 2026-10-12)
- **Confidence:** CONFIRMED — code trace: `canDiscount` declared at OrderEntry L334, not present anywhere in CPP props or discount logic
- Code reality: **FULL** (gap confirmed at HEAD)

---

## Severity

**P1 — HIGH:** Security/business rule enforcement failure. A waiter without the `discount` role can apply unlimited discounts. Any restaurant using role-based access control for discounts is fully exposed.

---

## Risk

**CRITICAL** — fix touches `CollectPaymentPanel.jsx` (R5) + `OrderEntry.jsx` (R5) + discount/financial logic.

---

## Blast Radius

- **Files WILL change:** `OrderEntry.jsx` (R5) · `CollectPaymentPanel.jsx` (R5)
- **Files WILL NOT touch:** `CartPanel.jsx` · `restaurantSettingsTransform.js` (already correct) · any other file

---

## Fix Scope (for Gate 2 planning)

1. `OrderEntry.jsx`: Pass `canDiscount` as a prop to `<CollectPaymentPanel>`
2. `CollectPaymentPanel.jsx`: Add `canDiscount = true` prop + gate the discount section:
   ```javascript
   const discountAllowed = !restaurantSettings?.roleBaseDiscount || canDiscount;
   // Discount selector + input: disabled/hidden when !discountAllowed
   // Hint: "Discount requires manager role" shown when !discountAllowed
   ```

---

## Owner Decisions — LOCKED (2026-10-18)

**OD-538-01: LOCKED**
- Owner/Manager (canDiscount=true): Full controls + NEW Apply button. Total does NOT change until Apply is clicked. Apply calls backend API immediately (Option Y).
- Cashier (canDiscount=false, roleBaseDiscount=true), no discount applied: Entire discount section HIDDEN completely.
- Cashier (canDiscount=false, roleBaseDiscount=true), `order_discount_json` present: Controls hidden. Static read-only discount line shown in bill totals (e.g. "Discount (23%): -₹115"). Total calculated correctly.
- roleBaseDiscount=false: Zero change for all staff.

**OD-538-02: OPEN — Backend API needed**
- Apply button requires a backend endpoint to save discount to an existing order before payment.
- Expected: `POST .../apply-order-discount` → creates `order_discount_json` → socket broadcasts to all devices.
- Gate 3 BLOCKED until backend confirms endpoint + contract.

---

## Gate Status

- Gate 1: COMPLETE
- Gate 2: COMPLETE → `impact/BUG-538_IMPACT_ANALYSIS_2026_10_18.md`
- Gate 3: BLOCKED — OD-538-02 (backend API endpoint) must be confirmed first
- Gate 4 GO: NOT given
