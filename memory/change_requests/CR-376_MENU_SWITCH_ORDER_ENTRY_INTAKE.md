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

**All 6 ODs locked. Intake CLOSED. Ready for Gate 2.**

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
