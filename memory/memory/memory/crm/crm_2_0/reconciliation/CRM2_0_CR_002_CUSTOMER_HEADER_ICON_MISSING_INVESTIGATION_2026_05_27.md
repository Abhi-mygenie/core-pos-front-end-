# CRM 2.0 — CR-002 — Customer Header Icon Missing — Investigation Report

**Date:** 2026-05-27
**Sprint:** CRM 2.0
**Type:** Investigation (read-only)
**Issue:** Customer icon (UserPlus) reported missing from Order Entry header action icon row
**Agent:** Investigation Agent
**Trigger:** Owner report — "customer icon that used to appear in Order Entry header is no longer visible"

---

## 1. Final Verdict

**The customer icon IS present in both code and rendered DOM.** At 1920×800 viewport, Playwright confirms `data-testid="customer-info-btn"` is `count=1, visible=True` alongside all other header icons. The icon has NOT been removed, hidden by conditional logic, or broken by CR-002.

**Most likely root cause: viewport-dependent `overflow-hidden` clipping on narrower screens**, where the customer icon (the last/rightmost element in the flex row) gets clipped by the middle panel's `overflow-hidden` container at viewport widths below ~1280px.

---

## 2. Exact File/Component Where Header Icons Render

**File:** `src/components/order-entry/OrderEntry.jsx`
**Lines:** 1368–1431
**Container:** Lines 1326–1432 (middle panel with `overflow-hidden`)

```
L1326: <div className="flex-1 flex flex-col overflow-hidden">       ← MIDDLE PANEL (overflow-hidden)
L1328:   <div className="px-4 py-3 flex-shrink-0 flex items-center gap-3">  ← HEADER ROW
L1330:     Search input (flex-1 max-w-xs)
L1350:     Spacer (flex-1)
L1358:     Order ID chip (conditional, flex-shrink-0)
L1369:     <div className="flex items-center gap-3">                  ← ICON GROUP
L1371:       Plus (Add Custom Item) — UNCONDITIONAL
L1382:       ArrowRightLeft (Shift Table) — conditional: canShiftTable && !takeAway && !delivery && !isPrepaid
L1394:       GitMerge (Merge Tables) — conditional: canMergeOrder && !takeAway && !delivery && !isPrepaid
L1406:       StickyNote (Order Notes) — UNCONDITIONAL
L1420:       UserPlus (Customer Info) — conditional: canCustomerManage   ← THE ICON IN QUESTION
L1431:     </div>
L1432:   </div>
```

---

## 3. Expected Customer Icon Render Path

1. `useAuth()` → `hasPermission('customer_management')` → `canCustomerManage` (L276)
2. If `canCustomerManage === true` → render `<button data-testid="customer-info-btn">` containing `<UserPlus>` icon (L1420-1430)
3. Click → `setShowCustomerModal(true)` (L1425)
4. `showCustomerModal` → renders `<CustomerModal>` (L2357-2369)

---

## 4. Current Actual Render Path

**Identical to expected.** No deviation detected.

**Live API verification:** `POST /api/v1/auth/vendoremployee/login` for `owner@kunafamahal.com` returns 50 permissions including `customer_management: true`. Also includes `transfer_table`, `merge_table`, `bill`, `print_icon` — all gates pass.

**Playwright DOM verification (1920×800):**
```
add-custom-item-btn: count=1, visible=True
shift-table-btn:     count=1, visible=True
merge-tables-btn:    count=1, visible=True
order-notes-btn:     count=1, visible=True
customer-info-btn:   count=1, visible=True    ← PRESENT AND VISIBLE
```

---

## 5. Root Cause Analysis

### Primary hypothesis: `overflow-hidden` clipping at narrow viewports

**Layout structure:**
- LEFT PANEL: `w-44` (176px, fixed)
- MIDDLE PANEL: `flex-1 flex flex-col overflow-hidden` (flexible, clips overflow)
- RIGHT PANEL: `w-96` (384px, fixed)

**At 1920px:** middle panel = 1920 − 176 − 384 = **1360px** → all icons fit comfortably.

**At 1280px:** middle panel = 1280 − 176 − 384 = **720px** → header row content:
- 32px (px-4 padding) + 320px (search max-w-xs) + ~80px (order chip) + ~248px (5 icons × ~40px + gaps) = **680px** → barely fits.

**At 1024px or iPad:** middle panel = 1024 − 176 − 384 = **464px** → header row minimum content **exceeds container width**. The `overflow-hidden` on the `flex-col` parent clips the rightmost content (the customer icon).

The customer icon is the **last element** in the flex row — it's the first to be clipped when horizontal space runs out.

### Why the user sees other icons but not the customer icon

The user reports seeing: Plus, Shift, Merge, Notes — but NOT Customer. These are rendered **left-to-right** in the icon group. The customer icon is the **rightmost** element. At constrained widths, it overflows and is clipped by `overflow-hidden` while the other 4 remain visible.

### Why a "spacing fix" didn't help

A spacing fix (e.g., reducing `gap-3`) addresses the flex gap but not the fundamental issue: the `overflow-hidden` on the parent container clips any content that extends beyond its bounds. The fix must address the overflow strategy, not the spacing.

---

## 6. Whether CR-002 Phase 2 Caused This

**NO.** CR-002 did **not** modify the header icon area.

Evidence:
- Line-by-line diff of `OrderEntry.jsx` backup (pre-CR-002) vs current shows **zero changes** to lines 1368-1431 (the icon group)
- The customer icon JSX, `canCustomerManage` gate, `setShowCustomerModal` handler, and `UserPlus` import are **identical** to all 4 backup versions
- CR-002 Phase 1 only added: import of `useCustomerIntel` hook (L18) + hook call (L159-164) — no visual changes
- CR-002 Phase 2 modified: `CustomerModal.jsx`, `ItemNotesModal.jsx`, `OrderNotesModal.jsx`, and prop-wiring in OrderEntry L2357-2369 — **none in the header icon area**
- The only header-adjacent change in the diff is search input `max-w-sm → max-w-xs` (L1330), which makes the search **smaller** (gives MORE room, not less)

---

## 7. Whether CustomerModal Is Still Reachable

**YES.** Two confirmed paths:
1. **Header icon click** (L1425): `onClick={() => setShowCustomerModal(true)}` — renders `<CustomerModal>` at L2357-2369 with CR-002 props (`customerIntel`, `customerIntelLoading`, `onAddToCart`, `onCustomizeItem`, `menuItems`)
2. **CartPanel customer name/phone fields** — CartPanel.jsx receives `customer` prop and `onCustomerChange` callback, but this is for inline name/phone entry, not the full CustomerModal

---

## 8. Evidence Summary

| # | Check | Result |
|---|---|---|
| 1 | Customer icon JSX exists at OrderEntry.jsx L1420-1430 | CONFIRMED |
| 2 | `UserPlus` imported from lucide-react at L2 | CONFIRMED |
| 3 | `canCustomerManage` = `hasPermission('customer_management')` at L276 | CONFIRMED |
| 4 | `customer_management` in login API permissions for owner@ | CONFIRMED (50 perms, includes `customer_management`) |
| 5 | Playwright DOM: `customer-info-btn count=1, visible=True` at 1920×800 | CONFIRMED |
| 6 | Screenshot: all 5 header icons visible at 1920×800 | CONFIRMED |
| 7 | Code diff: header icon area unchanged from pre-CR-002 backups | CONFIRMED (4 backups compared) |
| 8 | `showCustomerModal` state + `CustomerModal` render at L2357 | CONFIRMED, with new CR-002 props |
| 9 | Build passes (exit 0, no new errors) | CONFIRMED |
| 10 | Middle panel has `overflow-hidden` (L1326) | CONFIRMED |

---

## 9. Minimal Fix Recommendation (DO NOT IMPLEMENT — for future fix agent)

**Option A (recommended): Add `overflow-x-auto` or `flex-wrap` to the header row**

Change L1328 from:
```jsx
<div className="px-4 py-3 flex-shrink-0 flex items-center gap-3" ...>
```
to:
```jsx
<div className="px-4 py-3 flex-shrink-0 flex items-center gap-3 overflow-x-auto" ...>
```

Or alternatively, add `flex-shrink-0` to the icon group container (L1369):
```jsx
<div className="flex items-center gap-3 flex-shrink-0">
```

**Option B: Remove `overflow-hidden` from the middle panel and use `overflow-y-hidden overflow-x-visible`**

Change L1326 from:
```jsx
<div className="flex-1 flex flex-col overflow-hidden" ...>
```
to:
```jsx
<div className="flex-1 flex flex-col overflow-y-hidden" ...>
```

This allows horizontal content to remain visible while still clipping vertical overflow (the menu items scroll area handles its own vertical overflow).

**Option C: Make the icon group non-shrinkable and reduce search input max-width further**

Add `flex-shrink-0` to the icon group (L1369) to prevent the icon row from being compressed.

---

## 10. Risk of Fix

| Option | Risk | Notes |
|---|---|---|
| A (`overflow-x-auto`) | LOW | Adds horizontal scroll to header on very narrow viewports. Minimal visual impact at normal widths. |
| A (`flex-shrink-0` on icon group) | LOW | Forces icon group to maintain full width; search/spacer absorb compression. May cause search input to become very small on narrow viewports. |
| B (remove `overflow-hidden`) | MEDIUM | Could expose horizontal overflow in the menu items area below the header. Needs verification that menu pill layout handles its own overflow. |
| C | LOW | Same as A-flex-shrink-0; safest option. |

---

## 11. QA Checklist for Future Fix Agent

| # | Test | Expected |
|---|---|---|
| 1 | Open Order Entry at 1920×800 — all 5 header icons visible | PASS |
| 2 | Open Order Entry at 1280×800 — all 5 header icons visible | PASS (this is the fix target) |
| 3 | Open Order Entry at 1024×768 (iPad) — all 5 header icons visible or scrollable | PASS |
| 4 | Click customer icon → CustomerModal opens with CR-002 profile banner (existing customer) | PASS |
| 5 | Click customer icon → CustomerModal opens in new-customer form mode (walk-in, no customer) | PASS |
| 6 | Menu items below header still scroll vertically | PASS (no vertical overflow regression) |
| 7 | Search input still usable at narrow viewports | PASS |
| 8 | Order ID chip still visible when order is placed | PASS |
| 9 | Build clean (`CI=false yarn build`) | PASS |
| 10 | No regression to cart panel / payment panel | PASS |

---

## 12. Confirmations

| # | Confirmation | Status |
|---|---|---|
| 1 | No code changed | CONFIRMED |
| 2 | No data mutated | CONFIRMED |
| 3 | `/app/memory/final/` untouched | CONFIRMED |
| 4 | `/app/memory/crm/crm_1_0/` untouched | CONFIRMED |
| 5 | No CRM 1.0 docs touched | CONFIRMED |
| 6 | No broad UI refactor performed | CONFIRMED |
| 7 | Investigation only — no fix implemented | CONFIRMED |

---

**End of Investigation Report.**
