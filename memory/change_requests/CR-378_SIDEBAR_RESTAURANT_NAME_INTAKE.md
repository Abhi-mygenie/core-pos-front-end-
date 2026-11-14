# Intake — CR-378: Sidebar Profile — Show Restaurant Name Alongside Restaurant ID

**ID:** CR-378
**Type:** CR (Change Request — additive UI display)
**Date:** 2026-09-11
**Reporter:** Owner
**Sprint:** pos_7_0
**Area:** Sidebar / Profile Section
**Priority:** P2 — MEDIUM
**Risk:** LOW
**Fast Lane eligible:** YES (owner must approve)

---

## Duplicate check: DISTINCT

No existing CR or BUG covers restaurant name display in the sidebar profile section.
Related sidebar items (CR-040, CR-041, BUG-131, BUG-358, BUG-361) all cover navigation
structure or scroll/state persistence — not the profile sub-line text.

---

## Code Reality: NONE

`restaurant.name` exists in the RestaurantContext (confirmed: `profileTransform.js:109`
maps `api.name → restaurant.name`). It is available in Sidebar.jsx via `useRestaurant()`.
It is NOT currently rendered. `Sidebar.jsx:820` only renders `#${restaurant.id}`.

---

## 1. Description / Symptom

The sidebar profile section shows:
- Line 1: `Owner (Owner)` (firstName + roleName)
- Line 2: `#541` (restaurant ID only)

The owner wants the restaurant **name** displayed alongside the ID, so it is immediately
clear which restaurant the session is operating in. This is especially relevant for
franchise/multi-restaurant owners who use the Switch Restaurant feature (CR-166).

**Owner-reported via screenshot:** Sidebar profile section showing `#541` with no name.

---

## 2. Expected Behavior

Line 2 of the profile section should display:
```
Hogwarts · #618
```
(restaurant name · #id — name-first for human readability)

Format: `{restaurant.name} · #{restaurant.id}`

Fallback: if `restaurant.name` is falsy → keep existing `#${restaurant.id}` behavior (no regression).

---

## 3. Evidence

- **Screenshot:** Provided by owner (sidebar showing `#541`, no restaurant name)
- **Source:** OWNER-REPORTED
- **Confidence:** CONFIRMED (owner reproduced, code trace complete)
- **Curl output:** N/A (UI-only change)
- **Investigation note:** `/app/memory/investigations/INV-SIDEBAR-RESTAURANT-NAME-2026-09-11.md`

---

## 4. Risk Classification

| Field | Value |
|---|---|
| Risk | **LOW** |
| Reason | 1-line cosmetic change — adds `restaurant.name` to existing sub-line text. No logic, no API, no state, no financial data, not a hotspot file. |
| Fast Lane eligible | **YES** — all conditions met (1 file, ≤10 lines, non-hotspot, non-financial, non-API) |
| Process required | Fast Lane (with owner approval) OR full gate cycle |

---

## 5. Blast Radius

```bash
grep -rn "restaurant\.id.*sidebar\|#.*restaurant" Sidebar.jsx → 1 hit (L820)
```

- Blast radius: **SMALL** — 1 file, 1 line
- Hotspot files touched: **NO**
- Estimated scope: SMALL (1 file, 1 line)

---

## 6. Implementation Sketch (for Planning agent)

**File:** `src/components/layout/Sidebar.jsx`
**Line:** L820
**Change:** 1 line

```js
// BEFORE
{restaurant?.id ? `#${restaurant.id}` : (user?.roleName || '')}

// AFTER
{restaurant?.id
  ? `${restaurant?.name ? `${restaurant.name} · ` : ''}#${restaurant.id}`
  : (user?.roleName || '')}
```

**No other files touched.**

---

## 7. Owner Decisions

| OD | Question | Status |
|---|---|---|
| OD-378-01 | Confirm display format: `{name} · #{id}` (Option A) vs `#{id} · {name}` (Option B)? | **LOCKED: Option A** (`Hogwarts · #618`) — name-first per investigation recommendation |
| OD-378-02 | Fast Lane approved? (1 line, LOW risk, non-hotspot) | OPEN — awaiting owner |

---

## 8. Open Questions

None beyond OD-378-02 (Fast Lane approval).

---

*Intake by INTAKE agent — 2026-09-11*
