# BUG-236 — Impact Analysis (Gate 2)
# Smart Purchase — Ad-hoc Typeahead Dropdown Clipped by overflow-hidden

**Date:** 2026-08-14
**Role:** PLANNING AGENT
**Code Reality:** PARTIAL — bug confirmed at current line numbers; investigation line numbers are stale (BUG-247 extracted AdHocTypeahead post-investigation)
**Conflict Pre-Check:** NO CONFLICTS — last touch on AutoShoppingList.jsx was CR-105 (2026-07-25), no active items
**Risk:** LOW — 1 non-hotspot file, 3 lines, display-only, no API/state/financial logic
**Related:** BUG-311 L1 (same pattern, InventorySetupPanel), BUG-322 (same pattern, RecipeFormPanel)

---

## 1. Problem Statement

When a user clicks "+ Add Item" on the Smart Purchase screen and types a search query,
the matching ingredient dropdown opens but is **clipped/invisible** — hidden behind the
card's `overflow-hidden` boundary.

The `AdHocTypeahead` component (extracted by BUG-247) renders at the TOP of the
Purchase List card. Its dropdown uses `position: absolute`, but the card container
applies `overflow-hidden`, clipping any absolutely-positioned children that extend
beyond the card boundary.

---

## 2. Code Reality Check

Investigation was written 2026-07-24. BUG-247 (2026-07-25) extracted `AdHocTypeahead`
into its own component — line numbers shifted. All 3 target locations confirmed in
current code at new line numbers:

| Edit | Investigation said | Current line | Current code | Confirmed? |
|---|---|---|---|---|
| 1 | L67: `overflow-hidden` on card | **L130** | `<div class="... overflow-hidden">` | ✅ |
| 2+3 | L164: `absolute z-10` dropdown | **L42, L47** (inside `AdHocTypeahead`) | `<div class="absolute z-10 ...">` | ✅ |

Investigation line L85 (`overflow-y-visible` on table wrapper) is **NOT needed** — the
`AdHocTypeahead` renders ABOVE the table wrapper (L162 `overflow-x-auto`), not inside it.

Code reality: **PARTIAL** (issue confirmed, lines changed).

---

## 3. Data Flow Trace

```
User clicks "+ Add Item" button (AutoShoppingList.jsx:246)
  → setShowTypeahead(true) (L93 state)
  → AdHocTypeahead renders inside Section 1 card (L152-154)
      <div class="bg-white rounded-xl ... overflow-hidden">   ← L130: CLIPS children
        <AdHocTypeahead ...>                                  ← L152
          <div class="relative max-w-md">                    ← L37: positioning context
            <Input ... />                                    ← L38
            <div class="absolute z-10 mt-1 ...">             ← L42/47: CLIPPED by L130
```

**BREAK POINT:** `AutoShoppingList.jsx:130` — `overflow-hidden` clips the absolutely-positioned
dropdown at `AdHocTypeahead:42/47`.

**Why Section 2 card (`overflow-hidden` at L230) is NOT affected:**
`AdHocTypeahead` renders inside Section 1 only. Section 2's `overflow-hidden` is irrelevant.

---

## 4. Fix Approach

**Option A (selected — consistent with investigation + simpler):**
Remove `overflow-hidden` from the Section 1 card container (L130). Increase dropdown
z-index from `z-10` → `z-50` as safety margin.

**Why Option A over position:fixed (BUG-311/322 approach):**
The dropdown is inside `<div class="relative max-w-md">` which correctly bounds its
width. Removing `overflow-hidden` from the card is simpler (2 targets, 3 lines) and
carries zero risk of getBoundingClientRect sync issues on scroll. `overflow-x-auto` on
the inner table wrapper (L162) already handles horizontal scroll.

---

## 5. Affected Components

| File | Lines | Affected how |
|---|---|---|
| `AutoShoppingList.jsx:130` | Card container | Remove `overflow-hidden` |
| `AutoShoppingList.jsx:42` | "No match" div | `z-10` → `z-50` |
| `AutoShoppingList.jsx:47` | Match dropdown | `z-10` → `z-50` |

**NOT touching:**
- `SmartPurchasePanel.jsx` — orchestrator, no overflow/layout issue
- `VendorSuggestionCell.jsx` — separate combobox (uses Popover/shadcn, unaffected)
- `purchasePlanner.js` — no UI
- Any service/transform/context

---

## 6. Downstream Impact

| Area | Impact | Notes |
|---|---|---|
| Table horizontal scroll | NONE | L162 `overflow-x-auto` wrapper unchanged |
| Card rounded corners | COSMETIC-ONLY | Without `overflow-hidden`, table content may slightly poke outside rounded corners at edges — visual only, no functional impact |
| VendorSuggestionCell combobox | NONE | Separate component, uses shadcn Popover (portal-based) |
| Purchase list functionality | NONE | No state/API change |
| Other screens | NONE | AutoShoppingList is only mounted from SmartPurchasePage |

---

## 7. Risk Register

| # | Risk | Mitigation | Residual |
|---|---|---|---|
| R1 | Table corners lose perfect clipping | `overflow-x-auto` on table wrapper retains containment for wide tables | LOW — cosmetic only |
| R2 | Dropdown behind other z-index layers | Increased to `z-50` (consistent with rest of codebase dropdowns) | NONE |
| R3 | BUG-247 structural change invalidating fix | Verified current structure — AdHocTypeahead render location confirmed at L152 | NONE |

---

```
Impact Analysis complete: BUG-236
Code reality: PARTIAL (issue confirmed, line numbers updated from investigation)
Conflict: NONE
Risk: LOW
Files WILL change: AutoShoppingList.jsx (1 file, 3 lines)
Files will NOT touch: SmartPurchasePanel.jsx, VendorSuggestionCell.jsx, all services
Owner decisions: NONE — fix approach clear
Next: Gate 3 Implementation Plan
```
