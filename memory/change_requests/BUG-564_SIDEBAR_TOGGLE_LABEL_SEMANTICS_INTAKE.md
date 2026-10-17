# BUG-564 — Sidebar View-Toggle Labels Show Current State, Appear as Dual Active Selections

**ID:** BUG-564
**Date:** 2026-10-15
**Type:** BUG (UX / label semantics)
**Severity:** P3 — LOW
**Risk:** LOW
**Sprint:** oct_cr_batch
**Source:** OWNER-REPORTED — smoke test 2026-10-15 (Screenshot 2)
**Duplicate check:** DISTINCT (no prior registration)
**Related:** BUG-555 WP-B (WP-B created the tablet drawer; toggles were pre-existing but now more prominent in drawer)
**Code Reality:** NONE (labels still show current state, not action)
**Fast Lane eligible:** YES — 1 file, 2 lines, not R5, not financial

---

## Description

The sidebar drawer contains two view-toggle buttons:

**Button 1 — Layout Toggle:**
```jsx
{activeView === 'table' ? 'Table View' : 'Order View'}
```
→ When you ARE in Table View, label shows "Table View" (orange bg)
→ Clicking switches you TO Order View

**Button 2 — Channel/Status Toggle:**
```jsx
{dashboardView === 'channel' ? 'By Channel' : 'By Status'}
```
→ When you ARE in Status View, label shows "By Status" (green bg)
→ Clicking switches you TO Channel View

**The problem:**
1. **Both buttons have colored backgrounds simultaneously** (one orange, one green) — looks like TWO things are "selected" at the same time
2. **Labels describe current mode, not the action** — "Table View" doesn't tell you that clicking will switch you to Order View
3. **Visually indistinguishable from active nav items** — "By Status" with green background looks identical to an active navigation link
4. On first use inside the drawer, new users are confused about what these buttons do and why two items appear "active"

**Note:** The collapsed sidebar (rail mode) has a `title` attribute that correctly says "Switch to Order View" / "Switch to Status View" — only the expanded drawer label is wrong.

---

## Evidence

- **Screenshot:** Owner smoke test 2026-10-15 (Screenshot 2 — sidebar drawer open, both toggles highlighted orange + green)
- **Code:** `Sidebar.jsx:599` — `{activeView === 'table' ? 'Table View' : 'Order View'}`
- **Code:** `Sidebar.jsx:625` — `{dashboardView === 'channel' ? 'By Channel' : 'By Status'}`
- **Code:** `Sidebar.jsx:590,616` — `title` attr on collapsed state correctly says "Switch to..."
- **Confidence:** CONFIRMED — code shows current-state labels; screenshot shows visual confusion

---

## Root Cause

`Sidebar.jsx:597-601` and `Sidebar.jsx:622-628` — labels show descriptive current state (`'Table View'`, `'By Status'`) rather than imperative action (`'Switch to Order View'`, `'Switch to Channel View'`). The collapsed `title` attr already has the correct action phrasing — the expanded labels need to match.

**Fix (Fast Lane):**
- L599: `'Table View'` → `'Switch to Order View'` (when `activeView === 'table'`)
- L599: `'Order View'` → `'Switch to Table View'` (when `activeView !== 'table'`)
- L625: `'By Channel'` → `'Switch to Status View'` (when `dashboardView === 'channel'`)
- L625: `'By Status'` → `'Switch to Channel View'` (when `dashboardView !== 'channel'`)

This makes the label describe the ACTION on click, consistent with the collapsed `title` attr.

Alternatively — simpler 2-string-change fix: swap what each state shows so the label always shows the TARGET:
- L599: `activeView === 'table' ? 'Order View' : 'Table View'`
- L625: `dashboardView === 'channel' ? 'Status View' : 'Channel View'`

---

## Blast Radius

- **Files:** 1 (`src/components/layout/Sidebar.jsx`)
- **Lines:** 2
- **Hotspots:** NO
- **Financial:** NO
- **Scope:** SMALL (1 file, 2 label strings)

---

## Owner Decisions Required

**OD-564-01:** Label style preference:
- **(a)** Imperative: "Switch to Order View" / "Switch to Channel View" (descriptive what happens on click)
- **(b)** Target-state: "Order View" / "Channel View" (shows what you'll switch TO — simpler, shorter)

Agent recommendation: **(b)** — shorter, cleaner. Consistent with iOS toggle pattern.

Fast Lane eligible once OD-564-01 is locked.
