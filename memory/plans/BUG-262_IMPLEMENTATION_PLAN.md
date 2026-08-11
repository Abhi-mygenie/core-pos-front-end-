# Implementation Plan — BUG-262 ("Coming Soon" Removal)

**ID:** BUG-262
**Gate:** 3 (Implementation Plan)
**Date:** 2026-07-27
**Owner Decisions:** OD-4 (Sidebar: keep as-is) ✅, OD-5 (Forgot Pwd: change toast, future SMS CR) ✅, OD-6 (Remove Demo btn) ✅

---

## Scope Lock
**Files WILL change:** `InventoryIntelligencePanel.jsx`, `InventorySetupPanel.jsx`, `LoginPage.jsx`
**Files will NOT touch:** `Sidebar.jsx` (owner: keep Coming Soon items), `CollectPaymentPanel.jsx` (code comment only), `FilterBar.jsx` (code comment only)

---

## Edit 1: InventoryIntelligencePanel.jsx — Remove WastagePlaceholder

**Delete lines 61-73** (WastagePlaceholder component definition).
**Delete lines 315-316** (two `<WastagePlaceholder>` usages).

Result: Widget grid renders 6 widgets instead of 8. `grid-cols-2` auto-adjusts.

Also remove `Trash2` from import if no longer used elsewhere in file (check: line 276 KPI card still uses Trash2 → keep import).

---

## Edit 2: InventorySetupPanel.jsx — Remove Import Tooltip

**Current (line 269):**
```jsx
data-testid="ingredient-import-btn" title="Coming soon">
```

**New:**
```jsx
data-testid="ingredient-import-btn">
```

Remove `title="Coming soon"` only.

---

## Edit 3: LoginPage.jsx — Change Forgot Password Toast + Remove Demo

**Current (lines 100-112):**
```js
  const handleForgotPassword = () => {
    toast({
      title: "Coming Soon",
      description: "Forgot password functionality will be available soon.",
    });
  };

  const handleRequestDemo = () => {
    toast({
      title: "Coming Soon", 
      description: "Demo request functionality will be available soon.",
    });
  };
```

**New:**
```js
  // BUG-262: Changed from "Coming Soon" to production-appropriate message
  const handleForgotPassword = () => {
    toast({
      title: "Reset Password",
      description: "Please contact your administrator to reset your password.",
    });
  };
  // BUG-262: handleRequestDemo removed — button deleted from UI
```

**Also in JSX:** Find and remove the "Request Demo" button. Search for `handleRequestDemo` or "Request Demo" in the render section and delete that button element.

---

## Verification Matrix

| Edit # | File | Change | How to Verify |
|:---:|------|--------|---------------|
| 1 | InventoryIntelligencePanel.jsx | Remove WastagePlaceholder | Browser: Inventory Dashboard → no "Coming soon" cards at bottom |
| 2 | InventorySetupPanel.jsx | Remove tooltip | Browser: hover import btn → no tooltip |
| 3 | LoginPage.jsx | Forgot pwd toast + remove demo | Browser: login page → click "Forgot Password" → toast says "Contact administrator". No demo button visible. |

## Post-Code Registry Checklist
- [ ] registry.json: BUG-262 → IMPLEMENTED
- [ ] BUG_TRACKER.md: row updated
- [ ] FILE_OWNERSHIP.md: 3 files listed
- [ ] Code markers: `// BUG-262` in every modified file
