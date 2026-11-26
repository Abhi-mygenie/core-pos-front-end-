# BUG-669 — Add-On Creation Requires Price: Cannot Create Without Entering Amount

**Registered:** 2026-11-12
**Type:** BUG
**Sprint:** nov_cr_batch
**Status:** GATE_1_INTAKE_COMPLETE

---

## 1. Description

When adding a new add-on in Menu Management, the system **requires a price to be entered** before the add-on can be saved. Users cannot create an add-on with ₹0 or no price — they must enter a non-zero amount on initial creation, then edit it afterwards to change the price.

**Current behaviour:** Add-on creation form requires a price amount before save. Attempting to save without a price (or with ₹0) is blocked.

**Expected behaviour:** Price should be optional during add-on creation. Users should be able to create an add-on without entering a price (default to ₹0 or null), and set/edit the price later.

---

## 2. Classification

- **Type:** BUG
- **Severity:** P2 — Medium (workaround: enter dummy price then edit; annoying but not blocking)
- **Risk:** MEDIUM — menu management, add-on creation form, validation logic
- **Area:** Menu / Order Entry
- **Fast Lane:** NOT eligible (validation logic change)

---

## 3. Duplicate Check

- **Result: DISTINCT** — no prior registration for mandatory price on add-on creation

---

## 4. Evidence

- **Source:** OWNER-REPORTED (2026-11-12 batch)
- **Confidence:** CONFIRMED

---

## 5. Root Cause (preliminary)

Add-on creation form has a `required` or `min > 0` validation on the price field that prevents saving with an empty/zero price. The fix likely involves making the price field optional (remove required validator, allow 0 as a valid initial value).

---

## 6. Blast Radius

- Menu Management add-on creation component (likely `MenuManagementPage.jsx` or add-on form sub-component)
- Validation logic for add-on price field (~2–5 lines)
- **Estimated scope:** SMALL (1–2 files)

---

## 7. Code Reality

- **Status:** NONE (bug — mandatory validation needs to be relaxed)

---

## 8. Related

- BUG-457 (Recipe/addon delete error — GATE_5A_IMPLEMENTED)
