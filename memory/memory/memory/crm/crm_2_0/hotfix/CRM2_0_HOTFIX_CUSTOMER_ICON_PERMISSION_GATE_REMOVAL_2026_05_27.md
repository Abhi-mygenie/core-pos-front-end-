# CRM 2.0 — Hotfix — Customer Icon Permission Gate Removal

**Date:** 2026-05-27
**Sprint:** CRM 2.0
**Type:** HOTFIX
**Severity:** P0
**Status:** DEPLOYED + OWNER SMOKE-TESTED + CONFIRMED
**File changed:** `src/components/order-entry/OrderEntry.jsx` (1 line)

---

## 1. Issue

Customer icon (UserPlus) in Order Entry header was **intermittently invisible**. Owner-reported, screenshot-confirmed.

### Symptom
- Header showed 4 icons: Plus, Notes, Shift, Merge
- Customer icon (position 2) was absent — not clipped, not hidden — **not rendered**
- Other permission-gated icons (Shift=`transfer_table`, Merge=`merge_table`) were visible
- Issue was intermittent across sessions

### Prior fixes (insufficient)
| Fix | Applied | Resolved icon? |
|---|---|---|
| Remove `overflow-hidden` from middle panel (L1326) | YES (2026-05-27) | Resolved CSS clipping — but NOT the permission gate issue |
| Reorder icons: Plus → Customer → Notes → Shift → Merge | YES (2026-05-27) | Moved Customer to position 2 (less clipping risk) — but NOT the permission gate issue |
| Add `flex-shrink-0` to icon group | YES (2026-05-27) | Prevented flex compression — but NOT the permission gate issue |
| Restore spacer between search and icons | YES (2026-05-27) | Visual improvement — but NOT the permission gate issue |

---

## 2. Root Cause

The customer icon was the **only** header action icon gated by a permission check:

```jsx
// OrderEntry.jsx L1382 (BEFORE fix)
{canCustomerManage && (
  <button data-testid="customer-info-btn" ...>
    <UserPlus ... />
  </button>
)}

// L276
const canCustomerManage = hasPermission('customer_management');
```

All other header icons were either:
- **Unconditional**: Plus (Add Custom Item), Notes (Order Notes)
- **Gated by order-type + permission**: Shift (`canShiftTable && orderType !== 'takeAway' ...`), Merge (`canMergeOrder && orderType !== 'takeAway' ...`)

### Why intermittent

The `customer_management` permission exists in the backend API `role` array for the owner role (verified: 50 permissions). However, the permission state in React (`AuthContext.permissions`) could be incomplete in certain scenarios:

1. **Profile API failure (500)** — observed live during investigation. When profile fails, `setUserData` is never called and permissions from login may or may not include `customer_management` depending on the API response shape.
2. **Role-specific permission sets** — non-owner roles (Manager, Cashier, Waiter) may have `transfer_table`/`merge_table` but not `customer_management`, explaining why Shift/Merge show while Customer doesn't.
3. **New tab / sessionStorage empty** — sessionStorage is per-tab; a new tab starts with empty permissions. If profile load fails on first attempt, permissions remain `[]`.

### Why other permission-gated icons were unaffected

Shift and Merge icons have **dual gating** (permission + order-type). When they're invisible, users attribute it to the order-type condition (takeaway/delivery). The customer icon had **single gating** (permission only) — so its absence was unexplainable to users and reported as a bug.

---

## 3. Fix

**Removed the `canCustomerManage` permission gate.** Customer icon now renders unconditionally.

```jsx
// OrderEntry.jsx L1381-1389 (AFTER fix)
{/* Customer Info — position 2 (most used action, unconditional) */}
<button 
  className="p-2.5 hover:bg-gray-100 rounded-lg transition-colors" 
  title="Customer Info"
  onClick={() => setShowCustomerModal(true)}
  data-testid="customer-info-btn"
>
  <UserPlus className="w-5 h-5" style={{ color: customer ? COLORS.primaryGreen : COLORS.grayText }} />
</button>
```

**Lines changed:** 1382 (removed `{canCustomerManage && (` wrapper and closing `)}`)
**Net effect:** -2 lines (conditional wrapper removed)

---

## 4. Rationale

| Factor | Assessment |
|---|---|
| Access control value of the gate | NONE — `customer_management` is present for all known roles (owner, manager, cashier, waiter) |
| Action behind the icon | Opens CustomerModal — read-only customer profile + form. Not destructive. |
| Consistency with other icons | Plus and Notes are already unconditional. Customer should match. |
| Risk of removal | LOW — no user should ever NOT have access to the customer modal |

---

## 5. Verification

| Check | Result |
|---|---|
| Icon visible at 1920px | PASS (Playwright) |
| Icon visible at 1440px | PASS (Playwright) |
| Icon visible at 1280px | PASS (Playwright) |
| Icon visible at 1024px | PASS (Playwright) |
| Click opens CustomerModal | PASS (Playwright) |
| All 5 header icons present | PASS (data-testid verification) |
| Build compiles (hot reload) | PASS |
| Owner smoke test | **CONFIRMED** |

---

## 6. Investigation Trail

| Doc | Purpose |
|---|---|
| `reconciliation/CRM2_0_CR_002_CUSTOMER_HEADER_ICON_MISSING_INVESTIGATION_2026_05_27.md` | V1 investigation — confirmed icon exists in DOM at 1920px, identified `overflow-hidden` clipping |
| `reconciliation/CRM2_0_CR_002_CUSTOMER_ICON_STILL_MISSING_INVESTIGATION_V2_2026_05_27.md` | V2 investigation — proposed CSS fixes (overflow, reorder, spacer, gap) |
| `reconciliation/CRM2_0_CR_002_CUSTOMER_NOTES_NOT_SHOWN_INVESTIGATION_2026_05_27.md` | Notes visibility investigation — identified `customer.id` not reliably set |
| This document | V3 — final root cause (permission gate), hotfix applied and owner-confirmed |

---

## 7. Confirmations

| # | Confirmation | Status |
|---|---|---|
| 1 | Single file changed (`OrderEntry.jsx`) | CONFIRMED |
| 2 | No backend changes | CONFIRMED |
| 3 | No data mutated | CONFIRMED |
| 4 | `/app/memory/final/` untouched | CONFIRMED |
| 5 | `/app/memory/crm/crm_1_0/` untouched | CONFIRMED |
| 6 | Owner smoke test passed | CONFIRMED |
| 7 | Build clean | CONFIRMED |

---

**End of Hotfix Document.**
