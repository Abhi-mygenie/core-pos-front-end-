# CR-148 — Popular Food Category
## Gate 2: Impact Analysis

**Date:** 2026-08-21
**Role:** PLANNING agent
**Stage:** Impact Analysis (Gate 2)
**Code Reality:** NONE (Popular tab actively removed by CR-037 — see conflict below)
**Risk:** HIGH — OrderEntry.jsx is R5 hotspot; also reverses a closed, owner-verified CR
**Endpoint confirmed:** `GET /api/v2/vendoremployee/popular-food?type=all`
**Evidence:** `/app/memory/evidence/CR-148/popular_food_response.json`

---

## ⚠️ STEP 1 — Conflict Pre-Check: CR-037 COLLISION

**CR-037 (CLOSED — OWNER VERIFIED 2026-06-13)** explicitly removed Popular Items from Order Entry and Boot flow.

Files it touched: `LoadingPage.jsx`, `MenuContext.jsx`, `OrderEntry.jsx`, `CategoryPanel.jsx`, `productService.js`, `productTransform.js`, `constants.js`, `useRefreshAllData.js`

**This CR reverses that decision.** Owner must explicitly acknowledge this before Gate 3.

**Key difference — old vs new approach:**
- CR-037 removed: Popular tab seeded at boot via `getPopularFood()` in LoadingPage — pre-fetched into MenuContext
- CR-148 proposes: Popular tab fetched on-demand via `GET /api/v2/vendoremployee/popular-food?type=all` — separate API call, not in boot flow, not in MenuContext

The new approach is cleaner (no boot overhead), but the concept is the same. Owner must confirm approval to re-introduce.

---

## Step 2 — Endpoint Analysis

**Response shape (confirmed probe 2026-08-21):**
```json
{
  "total_size": 20,
  "products": [
    {
      "id": 116723,
      "name": "Tandoori Roti",
      "order_count": 41,
      "status": 1,
      "is_disable": "N",
      "stock_out": "N",
      "food_status": 0,
      "live_web": "Y",
      "price": 40,
      "food_for": "Normal",
      "veg": 1,
      "category_id": 2464,
      "variations": [],
      "add_ons": [],
      "tax": 5,
      "tax_type": "GST"
    }
  ]
}
```

**Compatibility:** Full product schema — directly compatible with `productTransform.js` and `adaptProduct()` in OrderEntry. `order_count` is the popularity signal.

**Settings gate:** `show_popular_category` flag already mapped in `restaurantSettingsTransform.js:45` and flows into restaurant settings. Already available via `useRestaurant()` as `restaurant.settings.showPopularCategory`.

---

## Data Flow (Target)

```
OrderEntry.jsx boot:
  restaurant.settings.showPopularCategory === true   ← gate
    → fetch GET /popular-food?type=all
    → setPopularProducts([...]) — local state, NOT MenuContext
    → CategoryPanel gets "Popular" as first special tab
  
  user clicks "Popular" tab:
    activeCategory = "popular"   ← new special value
    getFilteredItems() returns popularProducts (not MenuContext filter)
  
  user clicks a regular category:
    activeCategory = categoryId
    getFilteredItems() returns MenuContext products filtered by categoryId (unchanged)
```

---

## Files WILL Change (4 files)

| File | Change | Risk |
|---|---|---|
| `src/api/constants.js` | Add `POPULAR_FOOD: '/api/v2/vendoremployee/popular-food'` | LOW |
| `src/api/services/menuManagementService.js` | Add `getPopularFoods(type='all')` — `GET POPULAR_FOOD?type=all` | LOW |
| `src/components/order-entry/CategoryPanel.jsx` | Add "Popular" as first special category (after "All") — gated by `showPopularCategory` prop | MEDIUM |
| `src/components/order-entry/OrderEntry.jsx` | Add `popularProducts` state + fetch on mount (gated) + handle `activeCategory === "popular"` in `getFilteredItems()` | **HIGH — R5 hotspot** |

## Files Will NOT Touch
`LoadingPage.jsx`, `MenuContext.jsx`, `productTransform.js`, `useRefreshAllData.js` (these were affected by CR-037 — not needed for new on-demand approach).

---

## Risk Register

| Risk | Severity | Mitigation |
|---|---|---|
| CR-037 reversal — owner must re-approve | HIGH | Flag as owner decision OQ-1 before Gate 3 |
| OrderEntry.jsx R5 hotspot | HIGH | Additive only — new state + new branch in getFilteredItems. No existing logic touched |
| `showPopularCategory` not in current settings context | MEDIUM | Check if `restaurant.settings.showPopularCategory` is accessible via `useRestaurant()` — verify at Gate 3 |
| Popular API returns all `food_for` types — need filtering for Aggregator | LOW | `type=Normal` / `type=Aggregator` params may exist — confirm with backend |

---

## Owner Decisions Needed (blocking Gate 3)

| # | Question | Blocking? |
|---|---|---|
| OQ-1 | **CR-037 explicitly removed Popular. Owner must confirm: approved to re-add?** | **YES — must approve** |
| OQ-2 | Popular tab position: first (before "All") or after "All"? | YES |
| OQ-3 | Tab label: "Popular", "Popular Items", or "Trending"? | NO |
| OQ-4 | Does `type` param filter by menu type (Normal/Aggregator)? Confirm with backend | YES |

---

## Verification Matrix (seeds QA)

| # | Check | How to verify |
|---|---|---|
| 1 | Popular tab hidden when `showPopularCategory=false` | Settings → disable flag → reopen order entry → Popular tab absent |
| 2 | Popular tab visible when `showPopularCategory=true` | Enable flag → Popular tab appears |
| 3 | Popular tab shows top-20 items by order frequency | Click Popular → 20 items shown |
| 4 | Regular category tabs still work | Click any other category → correct items |
| 5 | Popular items can be added to cart | Tap item → added to cart normally |

---

**Next:** Owner confirms OQ-1 (CR-037 reversal approval) → Gate 3 → Gate 4 GO → Implementation
