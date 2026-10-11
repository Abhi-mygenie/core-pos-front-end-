# Investigation Note — Sidebar Restaurant Name Display

**Date:** 2026-09-11
**Role:** INVESTIGATION
**Reported by:** Owner (screenshot — sidebar profile section shows #541 only, wants name too)
**New item — no registered ID yet**

---

## 1. Summary

The sidebar profile section currently shows `#<restaurant_id>` (e.g. `#541`) in the sub-line under the user's name. The owner wants the restaurant name displayed alongside or instead of just the ID.

**Root cause:** Not a bug — `restaurant.name` is available in context but not rendered. This is a **missing display field (UI CR)**.

**Classification:** FE_FIX (additive UI change)
**Confidence:** HIGH
**Steps used:** 2 / 10

---

## 2. Code Trace

```
Sidebar.jsx:268 → const { restaurant } = useRestaurant()
  restaurant.id   = 618  (e.g.)
  restaurant.name = "Hogwarts"  ← available, not rendered

Sidebar.jsx:819–821 (current):
  <div className="text-xs" style={{ color: COLORS.grayText }}>
    {restaurant?.id ? `#${restaurant.id}` : (user?.roleName || '')}
  </div>

profileTransform.js:108–109:
  restaurant: (api) => ({
    id:   api.id,
    name: api.name,   ← always populated from profile API
    ...
  })
```

**Data confirmed live:** Profile API returns `name: "Hogwarts"` for RID 618.

---

## 3. Proposed Display

Two reasonable options for the sub-line:

| Option | Rendered output | Lines changed |
|---|---|---|
| A | `Hogwarts · #618` (name · id) | 1 line in Sidebar.jsx |
| B | `#618 · Hogwarts` (id · name) | 1 line in Sidebar.jsx |

Recommended: **Option A** (`Hogwarts · #618`) — name is more human-readable as the primary identifier.

---

## 4. Fix Scope

**File:** `src/components/layout/Sidebar.jsx`
**Line:** L820
**Change:** 1 line

Current:
```js
{restaurant?.id ? `#${restaurant.id}` : (user?.roleName || '')}
```
Proposed:
```js
{restaurant?.id
  ? `${restaurant?.name ? `${restaurant.name} · ` : ''}#${restaurant.id}`
  : (user?.roleName || '')}
```

**Planning skip eligibility:**
- ≤10 lines: ✅ (1 line)
- 1 file only: ✅ (`Sidebar.jsx`)
- Not R5 hotspot: ✅
- Not financial: ✅
- No API change: ✅

**Planning skip eligible: YES — but requires INTAKE (new ID) + owner approval first.**

---

## 5. Next Step

This item has no registered ID. Per R0 (Registration Gate): must go through INTAKE before implementation.

Recommended flow:
1. Owner approves → INTAKE agent registers new ID (e.g. CR-XXX or BUG-396)
2. Owner approves planning skip → BUG FIX agent applies 1-line change directly
3. QA spot-check → DONE

---

*Investigation note — 2026-09-11*
