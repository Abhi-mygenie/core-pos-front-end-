# BUG-584 — Search: exact match fires on DB ID instead of display label

**ID:** BUG-584
**Type:** BUG
**Registered:** 2026-10-17
**Sprint:** nov_cr_batch
**Status:** GATE_1_INTAKE
**Priority:** P1
**Risk:** MEDIUM
**Area:** Dashboard — Search

---

## Description

Typing an exact table number like **"2"** or exact room number like **"109"** in the search bar never triggers the "Exact Match" (highlighted) result — it always falls into partial matches and competes with all other labels that contain those digits.

**Owner directive (2026-10-17):** "Internal database number is never used in search."

---

## Root Cause

`searchItems` function in `DashboardPage.jsx` (L97):
```javascript
const idMatch = (fields.id || '').toLowerCase();
if (idMatch === query) { exact.push(item); }  // ← checks DB ID only
```

Every bucket passes `id: item.id` (the invisible DB primary key, e.g. "4563") as `fields.id`. The exact match check compares this DB ID against the query — never the display label.

Result: typing "2" → DB ID "4563" !== "2" → no exact match → falls to partial → competes with 12, 20, 21, 22, 32… → may be cut off.

**Also:** Table search `all[]` includes `item.label || item.id` as fallback — the `|| item.id` means DB ID enters search when label is missing. Owner says DB ID should never be used in any search path.

---

## Expected Behaviour

- Typing "2" exactly → Table 2 appears as **Exact Match** at top
- Typing "109" exactly → Room 109 appears as **Exact Match** at top
- DB ID ("4563", "4796") is never matched, never displayed as a search field

---

## Blast Radius

- **File:** `DashboardPage.jsx` (R5 hotspot)
- **Lines:** `searchItems` L97-98 (exact match logic) + table search `getFields` (remove `|| item.id` fallback)
- **Scope:** MEDIUM — R5 hotspot, search-only logic
- **Fast Lane:** NO — R5 hotspot

---

## Duplicate Check

- BUG-332: searchOptions gating — DISTINCT (different problem, different fix)
- BUG-576: room label — RELATED (same root cause for rooms; BUG-576 plan to be updated per owner note)
- **Result: DISTINCT**

---

## Evidence

- **Source:** OWNER-REPORTED + screenshot + code trace (2026-10-17)
- **Confidence:** CONFIRMED — code verified at DashboardPage.jsx L91-104
- **Steps:** Dashboard → type "2" in search → Table 2 not in Exact Match section
