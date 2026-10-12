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

## Open Questions for Planning

**OD-538-01:** When `roleBaseDiscount=true` and cashier has no `discount` role, should the discount section be:
- **(A) Fully hidden** — section not shown at all
- **(B) Visible but disabled** — greyed out with "requires manager role" hint
- **Agent recommendation: B** — cashier can see that discounts are possible but locked; manager can take over

---

## Next

→ Owner answers OD-538-01 → Gate 2 GO → Impact Analysis
