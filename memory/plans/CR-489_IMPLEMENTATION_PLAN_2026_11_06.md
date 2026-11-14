# CR-489 — Implementation Plan (Gate 3)

**Gate:** 3 — Implementation Plan
**Role:** PLANNING (stage = implementation_plan)
**Date:** 2026-11-06
**IA verified:** All target lines confirmed against current HEAD via view_file.
**Dependencies satisfied:** BUG-583 (GATE_5A) + CR-512 (GATE_5A) — `billPrinted` mapping + print confirmation both implemented.

---

## Live Probe Summary (2026-11-06)

| Check | API | Field | Value | Status |
|-------|-----|-------|-------|--------|
| Setting exists | GET settings-list | `basic.order_edit_access` | `"Yes"` | ✅ Present |
| Setting in profile | GET profile | `restaurants[0].settings.order_edit_access` | `"Yes"` | ✅ Present |
| Permission module exists | GET all-role-list | `role_modules.frontend[].id=104` | `role_pass_value: "order_edit_access"` | ✅ Present |
| Permission in login | POST common-login | `permissions[]` | `order_edit_access` NOT in owner@cafe103 perms | ⚠ Not assigned yet (expected — new module) |
| Permissions passthrough | profileTransform.js:80 | `permissions: api.role \|\| []` | Direct array passthrough | ✅ No transform change needed |

**Key finding:** Permissions are a straight passthrough (`api.role || []`). If backend assigns `order_edit_access` to a role, it appears in login automatically. No `profileTransform` edit needed for permissions.

---

## Scope Lock

**Files WILL change (4):**
1. `src/api/transforms/restaurantSettingsTransform.js` — map `order_edit_access` (read + write)
2. `src/api/transforms/profileTransform.js` — map `orderEditAccess` from login profile
3. `src/components/order-entry/OrderEntry.jsx` — add `isEditLocked` gate + disable actions
4. `src/components/cards/OrderCard.jsx` — disable action buttons when locked

**Files will NOT touch:**
- `TableCard.jsx` — click opens OrderEntry which handles the lock internally
- `CollectPaymentPanel.jsx` — discount gating handled via existing `canDiscount` prop threaded from OrderEntry
- `DashboardPage.jsx`, `Sidebar.jsx`, `App.js` — no route guards (lock is per-order, not per-page)
- `constants.js`, `orderService.js`, `orderTransform.js` — no API/transform changes
- No new files created

---

## Execution Sequence

```
E-1 (restaurantSettingsTransform.js) — map order_edit_access (read + write)
E-2 (profileTransform.js)            — map orderEditAccess from login profile
E-3 (OrderEntry.jsx)                 — isEditLocked const + gate mutations
E-4 (OrderCard.jsx)                  — disable/hide action buttons when locked
── webpack compile check ──
```

---

## E-1 — Map `order_edit_access` in restaurantSettingsTransform

**File:** `src/api/transforms/restaurantSettingsTransform.js`

### E-1a — Read (L98, after `roleBaseDiscount`)
**Current (L98):**
```javascript
        roleBaseDiscount:   toBool(basic.role_base_discount),
```
**After (L98-99):**
```javascript
        roleBaseDiscount:   toBool(basic.role_base_discount),
        orderEditAccess:    toBool(basic.order_edit_access), // CR-489: lock order edit after bill print
```

### E-1b — Write (L248, after `role_base_discount`)
**Current (L248):**
```javascript
        role_base_discount:  toYesNo(s3.roleBaseDiscount),
```
**After (L248-249):**
```javascript
        role_base_discount:  toYesNo(s3.roleBaseDiscount),
        order_edit_access:   toYesNo(s3.orderEditAccess), // CR-489
```

**Verification:** `grep orderEditAccess restaurantSettingsTransform.js` → 2 matches (read + write).

---

## E-2 — Map `orderEditAccess` in profileTransform (login profile)

**File:** `src/api/transforms/profileTransform.js`
**Line:** L424 (after `roleBaseDiscount`)

**Current (L424):**
```javascript
      roleBaseDiscount: toBoolean(apiSettings.settings?.role_base_discount ?? apiSettings.role_base_discount), // BUG-538
```
**After (L424-425):**
```javascript
      roleBaseDiscount: toBoolean(apiSettings.settings?.role_base_discount ?? apiSettings.role_base_discount), // BUG-538
      orderEditAccess: toBoolean(apiSettings.settings?.order_edit_access ?? apiSettings.order_edit_access), // CR-489: lock order edit after bill print
```

**Why dual-path (`settings?.X ?? X`):** Matches the existing `roleBaseDiscount` pattern. The profile API returns the field at both `restaurants[0].settings.order_edit_access` and potentially at the root level.

**Verification:** `grep orderEditAccess profileTransform.js` → 1 match.

---

## E-3 — Add `isEditLocked` gate in OrderEntry

**File:** `src/components/order-entry/OrderEntry.jsx`

### E-3a — Add `isEditLocked` const (after L360, the permission flags block)

**Current (L358-360):**
```javascript
  const canBill = hasPermission('bill');
  const canDiscount = hasPermission('discount');
  const canPrintBill = hasPermission('print_icon');
```

**After (L358-367):**
```javascript
  const canBill = hasPermission('bill');
  const canDiscount = hasPermission('discount');
  const canPrintBill = hasPermission('print_icon');

  // CR-489: Lock order editing after bill is printed (per-restaurant setting).
  // When ON + bill printed + user lacks order_edit_access → only Collect Payment + Reprint Bill allowed.
  const canEditAfterPrint = hasPermission('order_edit_access');
  const isEditLocked = !!(restaurant?.orderEditAccess)   // setting ON for this restaurant
                    && !!(orderData?.billPrinted)          // bill was printed for THIS order
                    && !canEditAfterPrint;                  // user does NOT have the override permission
```

**Data sources:**
- `restaurant` — from `useRestaurant()` at L66, includes `orderEditAccess` after E-2
- `orderData` — prop at L62, includes `billPrinted` from BUG-583 transform
- `hasPermission('order_edit_access')` — from `useAuth()` at L67, passthrough from login permissions

### E-3b — Gate mutation actions

Locate each action handler/button and add `isEditLocked` guard. The pattern is:

```javascript
// Before each action, add early return:
if (isEditLocked) return;
```

**Specific locations** (verify line numbers at implementation time — R5 file shifts frequently):

| Action | Current guard | Add |
|--------|-------------|-----|
| Add item to cart | `onAddToCart` handler | `if (isEditLocked) { toast warning; return; }` |
| Remove/cancel item | `canCancelItem` check | `const effectiveCanCancelItem = canCancelItem && !isEditLocked;` |
| Change quantity | qty +/- handlers | `if (isEditLocked) return;` |
| Apply discount | `canDiscount` check | `const effectiveCanDiscount = canDiscount && !isEditLocked;` |
| Shift table | `canShiftTable` check | `const effectiveCanShiftTable = canShiftTable && !isEditLocked;` |
| Merge order | `canMergeOrder` check | `const effectiveCanMergeOrder = canMergeOrder && !isEditLocked;` |
| Food transfer | `canFoodTransfer` check | `const effectiveCanFoodTransfer = canFoodTransfer && !isEditLocked;` |
| Cancel order | `canCancelOrder` check | `const effectiveCanCancelOrder = canCancelOrder && !isEditLocked;` |
| KOT print | KOT button | `if (isEditLocked) return;` |

**NOT locked (explicitly allowed per owner):**
- Collect Payment (the whole point — user can still pay)
- Reprint Bill

### E-3c — Pass `isEditLocked` to child components

```javascript
// Thread to CPP for discount gating:
<CollectPaymentPanel
  ...existing props...
  isEditLocked={isEditLocked}  // CR-489
/>
```

**Note on CPP:** The existing `canDiscount` prop already gates the discount section. Instead of modifying CPP, we override at source:
```javascript
const effectiveCanDiscount = canDiscount && !isEditLocked;
// Pass effectiveCanDiscount instead of canDiscount to CPP
```
This way CPP needs zero changes.

---

## E-4 — Disable OrderCard action buttons when locked

**File:** `src/components/cards/OrderCard.jsx`

OrderCard shows action buttons (Bill, Print KOT, Cancel, Shift, Merge, Snooze). When `isEditLocked`, only Bill (Collect Payment) and Reprint Bill should remain active.

### E-4a — Thread `isEditLocked` prop

OrderCard currently receives `order` as a prop (L37). Add computation:

```javascript
// CR-489: derive lock state from order + restaurant setting + permission
const isEditLocked = !!(restaurant?.orderEditAccess) && !!(order?.billPrinted) && !hasPermission('order_edit_access');
```

**Where `restaurant` comes from:** OrderCard already has `const { restaurant, ... } = useRestaurant();` — verify at implementation time. If not, add to destructuring.

### E-4b — Disable buttons

| Button | Action | Lock? |
|--------|--------|:---:|
| Print KOT (printer icon) | `handlePrintKot` | ❌ LOCKED |
| Bill (green button) | `handlePrintBill` / opens CPP | ✅ ALLOWED |
| Cancel order (X) | `handleCancelOrder` | ❌ LOCKED |
| Shift table | `handleShiftTable` | ❌ LOCKED |
| Merge | `handleMergeOrder` | ❌ LOCKED |
| Snooze | `handleSnooze` | ❌ LOCKED |
| WhatsApp | `handleWhatsApp` | ✅ ALLOWED |

For locked buttons: add `disabled={isEditLocked}` + `opacity-50 cursor-not-allowed` styles.

---

## Risk Register

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| `orderEditAccess` not in restaurant.settings on some accounts | LOW | Lock never activates (safe fallback) | `!!()` — undefined is falsy → no lock |
| `billPrinted` false because CR-512 not deployed | NONE | CR-512 is GATE_5A | Dependency satisfied |
| User with `order_edit_access` perm but setting OFF | NONE | `isEditLocked` = false → no lock | Correct per spec |
| Owner can't test because `order_edit_access` not assigned to any role yet | MEDIUM | Can't smoke test lock state | Owner must assign permission to a test role first |
| OrderCard doesn't have `useRestaurant` | LOW | Need to add hook call | Verify at implementation |

---

## Verification Matrix

| # | Check | File | How to Verify | Auto? |
|---|-------|------|---------------|:---:|
| V-1 | `orderEditAccess` mapped in settings read | restaurantSettingsTransform.js | `grep orderEditAccess` — 1+ match | YES |
| V-2 | `order_edit_access` mapped in settings write | restaurantSettingsTransform.js | `grep order_edit_access` — write line | YES |
| V-3 | `orderEditAccess` mapped in profile | profileTransform.js | `grep orderEditAccess` — 1 match | YES |
| V-4 | `isEditLocked` const exists in OrderEntry | OrderEntry.jsx | `grep isEditLocked` — definition line | YES |
| V-5 | `isEditLocked` uses `orderData?.billPrinted` | OrderEntry.jsx | Code inspect | YES |
| V-6 | `isEditLocked` uses `restaurant?.orderEditAccess` | OrderEntry.jsx | Code inspect | YES |
| V-7 | `isEditLocked` uses `hasPermission('order_edit_access')` | OrderEntry.jsx | Code inspect | YES |
| V-8 | Action buttons disabled when locked | OrderCard.jsx | `grep isEditLocked` — disable attrs | YES |
| V-9 | CR-489 markers in all 4 files | All | `grep CR-489` — 4 files | YES |
| V-10 | Webpack compiles clean | — | `webpack` | YES |
| V-11 | Login → setting ON + printed order + owner role → NOT locked (owner has all perms) | Browser | Test as owner@cafe103.com | NO |
| V-12 | Login → setting ON + printed order + restricted user → LOCKED | Browser | Need restricted test account | NO |
| V-13 | Locked state: add item blocked | Browser | Try adding | NO |
| V-14 | Locked state: Collect Payment allowed | Browser | Tap Bill/Collect | NO |
| V-15 | Unprinted order → no lock regardless | Browser | Open new order | NO |

---

## Post-Code Registry Checklist

```
- [ ] registry.json: CR-489 → status: GATE_5A_IMPLEMENTED
- [ ] CR_REGISTRY.md: CR-489 row updated
- [ ] FILE_OWNERSHIP.md: add CR-489 entry (restaurantSettingsTransform, profileTransform, OrderEntry R5, OrderCard)
- [ ] Code markers: // CR-489 in all 4 modified files
```

---

## Handover

```
Plan ready at /app/memory/plans/CR-489_IMPLEMENTATION_PLAN_2026_11_06.md
4 edits across 4 files.
Code reality: PARTIAL (permission passthrough works; settings mapping + lock logic = NONE).
Scope: restaurantSettingsTransform (read+write), profileTransform (+1 field),
       OrderEntry (isEditLocked gate), OrderCard (button disable)
       / will NOT touch: TableCard, CPP, DashboardPage, Sidebar, App.js, constants, orderService
Verification matrix: 15 checks (10 automated, 5 browser).
Owner decisions: ALL LOCKED.
Dependencies: BUG-583 ✅ + CR-512 ✅ (both GATE_5A).
⚠ Testing note: owner@cafe103.com does NOT have order_edit_access in permissions yet.
   To test the lock: assign permission to a role, create a restricted user.
Awaiting Gate 4 GO.
```
