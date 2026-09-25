# Intake — CR-376
## POS Order Entry: Menu Switch (Normal / Party / Premium)

**Date:** 2026-09-11  
**Registered by:** Investigation Agent (ALPHA v0.7)  
**Source:** OWNER-REQUESTED feature + AGENT-CONFIRMED-IN-CODE  
**Sprint:** pos_7_0 (suggested)  
**Related investigation:** `/app/memory/investigations/INV-MENU-SWITCH-ORDER-ENTRY_INVESTIGATION_REPORT_2026_09_11.md`

---

## Classification

| Field | Value |
|-------|-------|
| **Type** | CR — New Feature (Phase 3 implementation) |
| **Severity** | P2 — MEDIUM |
| **Risk** | MEDIUM — OrderEntry.jsx is a complex 2936-line component |
| **Area** | Order Entry > `MenuContext.jsx`, `productTransform.js`, `OrderEntry.jsx` |
| **Fast Lane** | NOT ELIGIBLE — multiple files, complex component, needs Gate 2–3 |
| **Backend changes** | **ZERO** — confirmed in code and by owner |

**Severity rationale:** Currently, POS can only take orders from the Normal menu. Restaurants with Party packages or Premium offerings cannot ring up those items — staff must work around it. This is a capability gap that limits revenue at special events.

---

## Owner Requirement (verbatim)

> "Apart from the aggregator, there should be a facility to switch menu. Right now we are only able to take the order from the normal menu. But if I want to take the order from another menu, there should be a facility to switch menu. I don't think any blocker is there from backend."

---

## What Exists vs What's Missing

| Layer | Current State | Missing |
|-------|-------------|---------|
| Backend API | Returns **all** food_for types in a single call | Nothing — already works |
| `productTransform.js` | **Filters out** everything except `foodFor === 'Normal'` | Change filter to exclude only Aggregator |
| `MenuContext.jsx` | Single flat `products` array, no menu type state | `selectedMenuType`, `activeProducts`, `availableMenuTypes` |
| `OrderEntry.jsx` | Uses `products` (Normal only) | Use `activeProducts`; add menu tab selector UI |
| `CategoryPanel.jsx` | No change needed — categories are shared | Nothing |

---

## Root Cause (code evidence)

```js
// productTransform.js:40–48
// "Transform products array — filters to Normal food_for only"
// "Phase 3: will support multiple menus (Buffet, HappyHour, etc.)"
productList: (apiProducts) => {
  return apiProducts
    .map(fromAPI.product)
    .filter(p => p.foodFor === 'Normal')   // ← this is THE blocker
    .filter(p => p.productName.toLowerCase() !== 'check in');
}

// MenuContext.jsx — no selectedMenuType anywhere
const [products, setProductsData] = useState([]);   // single flat array, no type

// OrderEntry.jsx:56
const { categories, products, popularProducts } = useMenu();   // reads products directly
```

---

## Desired State

```
POS Order Entry screen:

[ Normal ● ]  [ Party ]  [ Premium ]   ← tab strip (hidden if only 1 menu type exists)
─────────────────────────────────────
Category    │  Item grid — shows only items from selected menu type
panel       │  (category panel auto-adjusts, cart preserved on switch)
```

### Behaviour rules:
1. Only show menu types that have at least 1 active, non-out-of-stock item
2. Default menu type on entering order: **Normal**
3. On tab switch: reset active category to "All", show items from new menu type
4. Cart is **preserved** on switch (items from multiple menu types can coexist in one order)
5. Aggregator menu items are **EXCLUDED** from the switch (separate order flow)
6. If only Normal menu has items → tab strip is hidden entirely → zero UX change for these restaurants

---

## Implementation Scope

| File | Change | Lines |
|------|--------|:-----:|
| `productTransform.js` | `.filter(p => p.foodFor === 'Normal')` → `.filter(p => p.foodFor !== 'Aggregator')` | 1 |
| `MenuContext.jsx` | Add `selectedMenuType` state, `activeProducts` memo, `availableMenuTypes` memo, `setSelectedMenuType` action | ~15 |
| `OrderEntry.jsx` | Use `activeProducts` instead of `products`; add menu tab UI above CategoryPanel | ~20 |
| `LoadingPage.jsx` | `calculateItemCounts` → use `activeProducts` for correct per-category counts | ~5 |
| **TOTAL** | | **~41** |

---

## Owner Decisions

| OD | Question | Decision | Locked by |
|----|----------|----------|----------|
| OD-376-01 | Allow mixing menu types in one order? | **No — lock after first item** — once first item is added, menu type is locked for that order | Owner (2026-09-11) |
| OD-376-02 | UI approach? | **Design A — Pure local setting. No tab strip in Order Entry.** Manager selects active menu in StatusConfigPage (Local Settings). Whatever is set there automatically shows in Order Entry. Waiter sees no tab, no decision. | Owner (2026-09-10) — REVISED from "tab strip" |
| OD-376-03 | Reset category on switch? | **Moot under Design A** — no per-order switching. On local setting change, next order open resets to "All" naturally. | Resolved by Design A |
| OD-376-04 | Labels? | **Dynamic from DB** — menu type names displayed as-is from API response | Owner (2026-09-11) |
| OD-376-05 | Where does the setting live? | **StatusConfigPage (Local Settings page) only.** No dashboard header selector — one place, one truth. Whatever is set there reflects in Order Entry. | Owner (2026-09-10) |
| OD-376-06 | Fallback: if active menu has 0 items configured, what happens? | **No fallback — Option B. Show empty-state in Order Entry: "Party menu has no items configured. Please update in Local Settings."** Waiter cannot proceed until manager fixes the setting. | Owner (2026-09-10) |
| **OD-376-07** | CustomerModal Favourites / Smart Suggestions (`OrderEntry.jsx:2844`, CR-002 path) receive the full `products` list. After CR-376 E1 that list contains all menus → a Party/Premium station could add a Normal-menu item via one tap in the customer modal (contradicts OD-376-01). Options: **(a)** scope `menuItems` to `activeMenuProducts` (1 line, same file; off-menu suggestions become inert — agent recommended) · **(b)** leave as-is, document as exception to OD-376-01 · **(c)** park, decide later, exclude from this Gate 4. | **OPEN** — raised by PLANNING revalidation 2026-09-25. Owner asked for walk-through (delivered), then: "update docs and decision, don't jump gate". Awaiting a/b/c. | — |

| **OD-376-08** | Visual style of the Active Menu selector in Local Settings. Live screenshot 2026-09-25 shows neighbouring settings as toggle-cards (title + ON/OFF badge + description + switch). Plan E5h uses pills under a heading. | (a) pills under heading as planned · **(b) card row matching neighbouring toggle cards, pills on the right (agent recommended)** — same file, same behaviour | **OPEN** (2026-09-25) |
| **OD-376-09** | R11 probe + grep 2026-09-25: category `itemCount` produced by `calculateItemCounts` is **not rendered anywhere** in Order Entry (`CategoryPanel.jsx` shows names only). Plan E6 (`LoadingPage.jsx` hotspot) + E7 (`useRefreshAllData.js`) scope a value nobody displays. | **(a) drop E6 + E7 → 5 files, 2 hotspots (agent recommended)** · (b) keep for data correctness | **OPEN** (2026-09-25) |
| **OD-376-10** | Probe: 45 categories = 25 Premium-only · 18 Normal-only · 2 shared. `CategoryPanel` does not hide empty categories, so today a Normal station already lists 25 Premium-only categories (empty grid on click); after CR-376 a Premium station lists 18 empty Normal-only categories. | **(a) accept for CR-376, log follow-up CR (agent recommended)** · (b) hide categories with 0 items in active menu → expands scope to `CategoryPanel.jsx` (currently "will NOT touch"), re-plan needed | **OPEN** (2026-09-25) |

**ODs 01–06 locked. OD-376-07/08/09/10 OPEN (2026-09-25). Gate 3 revalidated + R11 probe done; Gate 4 NOT given.**
**HTML mockup:** `frontend/public/cr376-menu-switch-mockup.html` (open at `<preview>/cr376-menu-switch-mockup.html`).
**Visual walkthrough of OD-07…10:** mockup section "★ Highlighted for owner" (`#findings`) — each decision shown as option (a) vs (b).

## Gate 4 Preconditions (to be answered by owner — see handover `SESSION_HANDOVER_2026_09_25_CR376_GATE3_FINAL_OWNER_REVIEW.md` §5)
| # | Question | Owner answer | Date |
|---|---|---|---|
| P1 | Implement CR-376 in parallel with the 7 `OrderEntry.jsx` items awaiting Gate 6, or after? | — | — |
| P2 | Wait for `sep_bug_closure` Gate 6 smoke, or run alongside? | — | — |
| P3 | Smoke restaurant: QA_OWNER (Normal+Premium) only, or also a Normal-only restaurant for zero-change proof? | — | — |
| P4 | Re-confirm: setting applies on next Order Entry open, not live (Design A) | — | — |
| P5 | Register follow-ups now (hide inert suggestions · hide empty categories · server-side active menu) or after ship? | — | — |

**Sprint:** moved `pos_7_0` → `sep_bug_closure` (owner 2026-09-25).

---

## Evidence

- **Source:** Owner-requested (2026-09-11)
- **Confidence:** HIGH — confirmed in code
- **Phase 3 comment:** `productTransform.js:41` — `"Phase 3: will support multiple menus"` — this CR IS Phase 3

---

## Duplicate Check

No existing CR covers menu switch in OrderEntry. **DISTINCT.**

---

*Intake CLOSED. All 6 ODs locked. Ready for Gate 2 Impact Analysis.*
