# BUG-598 — Investigation Report
## assign_food_menu value lost between login and MenuContext — menu type derived from product data instead

**ID:** BUG-598
**Date:** 2026-10-21
**Steps used:** 8/10
**Confidence:** HIGH — full chain traced with curl probes + code trace
**Classification:** FE_BUG (broken data threading)

---

## 1. Summary

**Root cause:** The backend login response includes `assign_food_menu` (e.g. `"Normal"` or `"Premium"`), and `authTransform.js:25` correctly maps it to `assignFoodMenu`. But nobody stores it — not `authService`, not `LoginPage`, not `AuthContext`. The value is discarded after the transform. `MenuContext.jsx:102` is forced to guess the menu type from the first product's `food_for` field instead of reading the authoritative assignment.

On production where `assign_food_menu` isn't deployed on the backend, the products API returns a mix of Normal + Premium products. The first product's `food_for` determines the chip — which is random and hides the other menu's products entirely.

**Steps used:** 8/10

---

## 2. Hypotheses Tested

| # | Hypothesis | Test Method | Steps | Result | Evidence |
|---|---|---|---|---|---|
| 1 | Backend doesn't send assign_food_menu | curl probe: common-login | 1 | ELIMINATED | Response includes `"assign_food_menu": "Normal"` |
| 2 | Transform doesn't map the field | grep authTransform.js | 1 | ELIMINATED | Line 25: `assignFoodMenu: api.assign_food_menu \|\| 'Normal'` |
| 3 | The value is stored somewhere after login | grep entire codebase for assignFoodMenu | 1 | CONFIRMED — only 1 hit (the transform itself) | `grep -rn "assignFoodMenu" src/` → 1 result |
| 4 | AuthContext holds the value | grep AuthContext.jsx | 1 | ELIMINATED | 0 references |
| 5 | LoginPage passes it to context | read LoginPage.jsx:83-91 | 1 | ELIMINATED | Only reads `authData.loginType`, discards rest |
| 6 | MenuContext reads it from auth | read MenuContext.jsx:99-106 | 1 | ELIMINATED | Derives from first product's foodFor |
| 7 | Products API filters by assign_food_menu on preprod | curl probe: get-products-list | 1 | CONFIRMED on preprod (313 Normal) | Backend filters correctly when feature is deployed |
| 8 | On production without the feature, products are mixed | Owner-reported | 1 | CONFIRMED | Production shows Premium chip due to first product being Premium |

---

## 3. Data Flow Trace

```
Backend login API
  └── Response: { assign_food_menu: "Normal", token: "...", ... }
        │
        ▼
authTransform.js:25
  └── assignFoodMenu: api.assign_food_menu || 'Normal'  →  "Normal"
        │
        ▼
authService.js:20-51
  └── Stores: token ✅, crmToken ✅, permissions ✅
  └── assignFoodMenu: ❌ NEVER STORED (not in localStorage, sessionStorage, or context)
  └── return authData  →  passed to LoginPage
        │
        ▼
LoginPage.jsx:83-91
  └── Reads: authData.loginType (for routing)
  └── assignFoodMenu: ❌ DISCARDED (never passed to any context)
  └── navigate('/loading')
        │
        ▼
AuthContext.jsx
  └── Holds: token, user, permissions, isAuthenticated
  └── assignFoodMenu: ❌ NO FIELD EXISTS
        │
        ▼
MenuContext.jsx:102-106  ← BREAK POINT
  └── activeMenuType = products.find(p => p.foodFor !== 'Aggregator')?.foodFor || 'Normal'
  └── ❌ DERIVES FROM FIRST PRODUCT instead of reading assign_food_menu from auth
  └── If first product is Premium → shows "Premium Menu" chip + hides Normal products
```

---

## 4. The Exact Gap

| # | Where | What happens | Correct? |
|---|-------|-------------|:---:|
| 1 | Backend login response | Returns `assign_food_menu: "Normal"` | ✅ |
| 2 | `authTransform.js:25` | Maps to `assignFoodMenu` | ✅ |
| 3 | `authService.js:20-51` | **Never stores** `assignFoodMenu` | ❌ GAP |
| 4 | `LoginPage.jsx:83` | **Discards** `authData.assignFoodMenu` | ❌ GAP |
| 5 | `AuthContext.jsx` | **No field** for `assignFoodMenu` | ❌ GAP |
| 6 | `MenuContext.jsx:102` | **Derives** menu type from first product instead of auth | ❌ GAP |

---

## 5. Impact

- **Production (assign_food_menu not deployed):** Backend returns mixed Normal + Premium products. First product's food_for drives the chip. If Premium → all Normal products hidden from cashier. Random, unpredictable.
- **Preprod (assign_food_menu deployed):** Backend filters correctly, so all products share the same food_for. The "derive from first product" approach happens to work — but only by accident.
- **Any restaurant with multiple menus:** Affected when backend doesn't filter, or when assign_food_menu assignment changes but products cache is stale.

---

## 6. Evidence Artifacts

- curl probe: `common-login` returns `assign_food_menu: "Normal"` for owner@palmhouse.com
- curl probe: `get-products-list` returns 313 products, all `food_for: Normal` (preprod)
- Owner screenshot: production shows "Premium Menu" chip for same account
- Code trace: `grep -rn "assignFoodMenu" src/` → 1 hit (transform only)

---

## 7. Recommendations

**Classification:** FE_FIX

**Fix scope:** 4 files, ~15 lines

1. **authService.js** — Store `assignFoodMenu` in sessionStorage after login
2. **AuthContext.jsx** — Add `assignFoodMenu` field, initialize from sessionStorage, expose via context
3. **MenuContext.jsx** — Read `assignFoodMenu` from AuthContext as authoritative `activeMenuType`, fallback to `'Normal'` if missing. Remove "derive from first product" as primary source.
4. **LoginPage.jsx** — No change needed if AuthContext handles storage

**Planning skip eligible:** NO — touches AuthContext (state management), MenuContext (product filtering), and the login flow. Full Gate 2-3 recommended.

---

## 8. Retroactive Candidates
NONE.
