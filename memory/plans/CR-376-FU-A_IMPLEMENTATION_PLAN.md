# Implementation Plan — CR-376-FU-A
## CustomerModal: Hide Off-Menu Suggestion Rows

**Date:** 2026-09-25
**Planning agent:** ALPHA v0.7 Role 2
**Risk:** LOW
**Sprint:** sep_bug_closure
**Fast Lane:** ELIGIBLE — owner must approve at Gate 4 GO

---

## Scope Lock

**Files WILL change:**
- `src/components/order-entry/CustomerModal.jsx` — 3 edit sites

**Files will NOT touch:**
- `OrderEntry.jsx` — CR-376 E4e already correct (`menuItems={activeMenuProducts...}`)
- `customerIntelTransform.js` — no field to add
- `customerIntelService.js`, `useCustomerIntel.js` — no change
- Any context, hook, service, transform, localStorage, API

---

## Execution Sequence

### E1 — Add ID guard to `filteredCrossSell` (L241)

**File:** `src/components/order-entry/CustomerModal.jsx`
**Lines:** 240–243 (add 1 line inside existing `.filter()` body)

**Current (L240–243):**
```javascript
  const filteredCrossSell = intel?.crossSellItems?.filter(xs => {
    // menuItems passed from OrderEntry already have cart context
    return true; // server already filters; keeping for structural completeness
  }) || [];
```

**New:**
```javascript
  const filteredCrossSell = intel?.crossSellItems?.filter(xs => {
    if (!menuItems.some(f => String(f.id) === String(xs.itemId))) return false; // CR-376-FU-A: hide off-menu suggestions
    // menuItems passed from OrderEntry already have cart context
    return true; // server already filters; keeping for structural completeness
  }) || [];
```

**Verification:** `filteredCrossSell` for a Premium station with Normal-history customer returns only items whose IDs exist in `menuItems`.

---

### E2 — Add `filteredTopItems` const after `filteredCrossSell` (after L243)

**File:** `src/components/order-entry/CustomerModal.jsx`
**Position:** Insert after the `filteredCrossSell` block (after L243 / before L245 collapsible state comment)

**Insert:**
```javascript
  // CR-376-FU-A: filter Past Favourites to only items in the active menu
  const filteredTopItems = intel?.orderPatterns?.topItems?.filter(item =>
    menuItems.some(f => String(f.id) === String(item.itemId))
  ) || [];
```

**Verification:** `filteredTopItems` for a Premium station with Normal-history customer contains only items whose IDs exist in `menuItems`.

---

### E3 — Swap render condition + map for Past Favourites (L550, L554)

**File:** `src/components/order-entry/CustomerModal.jsx`

**Current L550:**
```javascript
          {isExistingCustomer && intel && !intel.isFirstTimeCustomer && intel.orderPatterns.topItems.length > 0 && (
```

**New L550:**
```javascript
          {isExistingCustomer && intel && !intel.isFirstTimeCustomer && filteredTopItems.length > 0 && ( // CR-376-FU-A
```

**Current L554:**
```javascript
                {intel.orderPatterns.topItems.map(item => (
```

**New L554:**
```javascript
                {filteredTopItems.map(item => ( // CR-376-FU-A
```

**Verification:**
- Normal-only station: `filteredTopItems` = all CRM favourites (all in `menuItems`) → section shows normally
- Premium station with Normal-history customer: `filteredTopItems` = [] (Normal items not in `menuItems`) → section hides entirely ✅

---

## Verification Matrix

| V# | Edit | How to verify | Automated? |
|---|---|---|---|
| V1 | E1 `filteredCrossSell` guard | grep: `menuItems.some.*xs.itemId` in CustomerModal.jsx | YES (grep) |
| V2 | E2 `filteredTopItems` const | grep: `filteredTopItems` in CustomerModal.jsx | YES (grep) |
| V3 | E3 render condition | grep: `filteredTopItems.length > 0` in CustomerModal.jsx | YES (grep) |
| V4 | E3 render map | grep: `filteredTopItems.map` in CustomerModal.jsx | YES (grep) |
| V5 | Compile | `webpack compiled with 1 warning` (pre-existing only) | YES (log) |
| V6 | Normal station: section intact | Login as Normal station → open CustomerModal → Past Favourites visible | NO (browser) |
| V7 | Non-Normal station: off-menu items hidden | Login as QA_HYATT with any menu active → open CustomerModal → off-menu suggestions absent | NO (browser) |

---

## Post-Code Registry Checklist

```
□ 1. registry.json: CR-376-FU-A → status: GATE_5A_IMPLEMENTED, sprint_key: sep_bug_closure
□ 2. CR_REGISTRY.md: row updated → IMPLEMENTED
□ 3. FILE_OWNERSHIP.md: CustomerModal.jsx added with CR-376-FU-A + date
□ 4. Code markers: // CR-376-FU-A comment in every modified hunk (E1, E2, E3 — already in plan)
□ 5. Compile: webpack 0 new warnings
```

---

## Risk Register

| Risk | Likelihood | Mitigation |
|---|---|---|
| `menuItems` is empty → both sections disappear | LOW — only happens on first-boot empty-state (already handled by T10/BUG-462) | Expected behaviour: no suggestions when no menu configured |
| Customer has cross-menu history → fewer suggestions shown | INTENDED — this is the feature | OQ-A1 = HIDE locked by owner |
| `String(f.id)` type coercion mismatch | LOW — same pattern as existing `handleIntelItemClick` L229 | Mirrors existing guard, consistent |

---

## Fast Lane Summary (for Gate 4 GO)

```
FAST LANE SUMMARY
ID: CR-376-FU-A
Risk: LOW
Owner approval: REQUIRED at Gate 4 GO (OQ-A1 locked = Option A)
File changed: src/components/order-entry/CustomerModal.jsx
Lines changed: ~6 (E1: +1 line, E2: +3 lines, E3: 2 line changes)
Self-test: V1-V5 automated (grep + compile)
Registry/file ownership/code marker: included in checklist
Next: QA spot-check V6 + V7 (browser) or owner smoke
```

---

```
Planning complete: CR-376-FU-A
Stage: Impact Analysis + Implementation Plan
Code reality: NONE
Risk: LOW
Files WILL change: CustomerModal.jsx (3 edit sites, ~6 lines)
Files WILL NOT touch: OrderEntry.jsx, transforms, services, context, localStorage
Owner decisions: NONE open (OQ-A1 LOCKED HIDE, OQ-A2 RESOLVED match-by-ID)
Fast Lane: ELIGIBLE — confirm at Gate 4 GO
Docs: impact/CR-376-FU-A_IMPACT_ANALYSIS.md · plans/CR-376-FU-A_IMPLEMENTATION_PLAN.md
Next: Gate 4 GO → Implementation
```
