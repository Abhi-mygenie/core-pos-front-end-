# CR-146 — Multiple Menu: Frontend UI Not Implemented

**ID:** CR-146  
**Type:** CR (Feature / Architecture Gap)  
**Severity:** P2  
**Risk:** MEDIUM  
**Area:** Settings → Channels → Multiple Menus; Menu Management  
**Sprint:** POS 5.x  
**Created:** 2026-08-18  
**Source:** INVESTIGATION (INV-AUG18-2026, INV-4)  
**Duplicate check:** DISTINCT  

---

## Description

Restaurant Settings Step 3 has a **"Multiple Menus"** toggle. This toggle can be enabled and saved (`basic.multiple_menu = "Yes"`), but the **frontend has zero consumers** of this setting — no UI component reads it, and there is no menu-switching UI.

**Owner question (investigation):** "How does multiple menu work?"

## Code Reality

- `restaurantSettingsTransform.js:78,242`: setting correctly mapped to/from `basic.multiple_menu` ✓
- `profileTransform.js:features`: `multipleMenu` is **NOT present** — not exposed in `restaurant.features`
- **Codebase-wide grep** for `multipleMenu` / `multiple_menu` outside settings files: **ZERO consumers**
- `MenuContext.jsx`: no reference to `multiple_menu`
- Code reality: **PARTIAL** (setting saves, but FE feature not built)

## What "Multiple Menu" Likely Means

When `multiple_menu = Yes`, the backend may serve multiple menu versions (e.g. Lunch, Dinner, Happy Hour). The frontend `MenuContext` fetches menus from backend — but has no UI to:
- Display which menu version is active
- Allow staff to switch between menu versions
- Show a menu version selector on the dashboard or order entry

## Owner Decision Required

1. **OQ-1:** What is the expected frontend behaviour when `multiple_menu = Yes`?
   - (a) Staff sees a menu version picker before/during order entry
   - (b) A menu switcher appears in the sidebar/header
   - (c) Something else — owner to describe
2. **OQ-2:** Does the backend already return multiple menus when this flag is on? (API shape needed)
3. **OQ-3:** Is the menu switching per-table, per-order, or restaurant-wide?

## Next: Owner Decision → Gate 2 Impact Analysis (pending OQ-1/2/3)

**Agent will NOT proceed to planning without owner answers to OQ-1, OQ-2, OQ-3.**
