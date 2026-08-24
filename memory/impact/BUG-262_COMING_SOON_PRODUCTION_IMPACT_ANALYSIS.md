# Impact Analysis — BUG-262 ("Coming Soon" in Production)

**ID:** BUG-262
**Gate:** 2 (Impact Analysis)
**Date:** 2026-07-27
**Code Reality:** NONE (no fixes applied yet)
**Conflict Pre-Check:** Sidebar.jsx has 5+ active CRs (CR-041, CR-052, BUG-136, BUG-196) all at QA PASS / AWAITING SMOKE. Changes must be compatible. LoginPage has no conflicts.
**Risk:** MEDIUM (Sidebar is a hotspot file — R5)

---

## Scope

Remove or hide all user-visible "Coming Soon" text/placeholders from production UI. 4 files affected.

---

## Full Audit — All Locations

### Location 1: InventoryIntelligencePanel.jsx (lines 61-73, 315-316)

**What:** `WastagePlaceholder` component renders 2 cards: "Wastage Insights" and "Top Wasted Items" with text "Coming soon — awaiting backend wastage endpoint."

**Fix:** Remove both `<WastagePlaceholder>` calls from the widget grid (lines 315-316). Delete the `WastagePlaceholder` component (lines 61-73). The wastage widgets return when BUG-266 is unblocked.

**Impact:** Grid changes from 8 widgets to 6. Layout auto-adjusts (grid-cols-2).

### Location 2: InventorySetupPanel.jsx (line 269)

**What:** Import button has `title="Coming soon"` tooltip.

**Fix:** Remove the `title` attribute entirely. Button already has `disabled` styling.

**Impact:** None — button remains disabled, just loses the tooltip text.

### Location 3: Sidebar.jsx (lines 51-52, 99, 111-113, 304-306, 349-374)

**What:**
- `COMING_SOON_ITEMS` set (currently empty — line 52)
- 3 sidebar items with `comingSoon: true`: "Item Report" (line 99), "Printers" (line 111), "Operating Hours" (line 112), "Cancellation Reasons" (line 113)
- `showComingSoon()` function (line 304) shows toast "Coming Soon"
- 3 click handlers check `child.comingSoon` (lines 349, 361, 373)

**Fix options:**
- **Option A (Recommended):** Hide `comingSoon` items entirely — don't render them in the sidebar. Add filter: `if (child.comingSoon) return null;` in the render loop.
- **Option B:** Remove the `comingSoon` items from the menu array entirely.

**Impact:** 4 sidebar items disappear. Users won't see features that don't exist yet. When features ship, re-add items.

**Sidebar conflict note:** This is a hotspot file. Fix is additive (adding a filter), not restructuring. Compatible with CR-041/CR-052 changes.

### Location 4: LoginPage.jsx (lines 100-112)

**What:** `handleForgotPassword()` and `handleRequestDemo()` show toast with title "Coming Soon".

**Fix options:**
- **Option A:** Change toast message to something production-appropriate: "Contact your administrator" for forgot password, remove demo button entirely.
- **Option B:** Keep buttons but change toast to "This feature is not available. Please contact support."

**Impact:** Low — login page UX only. No auth/flow changes.

---

## Affected Files

| File | Change | Lines Est. | Risk |
|------|--------|:---:|:---:|
| `InventoryIntelligencePanel.jsx` | Remove WastagePlaceholder component + 2 usages | ~15 deleted | LOW |
| `InventorySetupPanel.jsx` | Remove `title="Coming soon"` from import button | 1 line | LOW |
| `Sidebar.jsx` | Hide `comingSoon: true` items from render | ~3 lines added | MEDIUM (hotspot) |
| `LoginPage.jsx` | Change toast messages from "Coming Soon" to production-appropriate text | ~4 lines | LOW |

## Files NOT Touched
- CollectPaymentPanel.jsx (code comment only — not user-visible)
- FilterBar.jsx (code comment only — not user-visible)
- API services, transforms, contexts

---

## Owner Decisions Needed

| # | Question | Options |
|---|----------|---------|
| OD-4 | **Sidebar "Coming Soon" items:** Hide from sidebar or remove entirely? | A: Hide (filter out, keep in code for later). B: Delete from array. |
| OD-5 | **LoginPage "Forgot Password":** What should it say? | A: "Contact your administrator to reset your password." B: Remove button entirely. C: Keep "Coming Soon" (owner accepts). |
| OD-6 | **LoginPage "Request Demo":** Keep or remove button? | A: Remove entirely. B: Change to link to website. |

---

## Risk Register
- **Sidebar (MEDIUM):** Hotspot file with multiple active CRs. Fix is a render filter — additive, not destructive. Low interaction risk.
- **All others (LOW):** Simple text/component removal, no logic changes.
