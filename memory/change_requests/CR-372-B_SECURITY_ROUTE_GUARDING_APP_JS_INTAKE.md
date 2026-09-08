# CR-372-B — Security: Add ProtectedRoute to 23 Unguarded Routes (App.js)

**ID:** CR-372-B  
**Type:** CR  
**Parent:** CR-372 (SPLIT 2026-09-08)  
**Date:** 2026-09-08  
**Registered by:** INTAKE agent (AUDIT track)  
**Sprint:** pos_audit_1  

---

## 1. Summary

Wrap 23 unguarded React routes in `App.js` with `<ProtectedRoute>`. This is the only fix from CR-372 that touches `frontend/src/`. Separated into its own gate cycle because it is a source code change requiring Gate 2 → Gate 4 GO → Implementation → QA.

---

## 2. Scope — F-SEC-03

**File:** `src/App.js` — the only file that changes.

### Routes to wrap with `<ProtectedRoute>` (23 routes)

| Route | Current | Action |
|---|---|---|
| `/restaurant-picker` | bare | wrap |
| `reports-module/order-ledger/preview` | bare | wrap |
| `reports-module/kitchen-ops/preview` | bare | wrap |
| `reports-module/room-orders/preview` | bare | wrap |
| `reports-module/food-court/preview` | bare | wrap |
| `reports-module/item-sales/preview` | bare | wrap |
| `reports-module/variation-addon-sales/preview` | bare | wrap |
| `reports-module/preview` | bare | wrap |
| `reports-module/items-hybrid/preview` | bare | wrap |
| `/settlement/preview` | bare | wrap |
| `/settings-preview` | bare | wrap |
| `/aggregator-preview` | bare | wrap |
| `/printer-config-preview` | bare | wrap |
| `/screen1-compare` | bare | wrap |
| `/screen2-compare` | bare | wrap |
| `/screen3-compare` | bare | wrap |
| `/screen4-compare` | bare | wrap |
| `/screen5-compare` | bare | wrap |
| `/screen6-compare` | bare | wrap |
| `/screen7-compare` | bare | wrap |
| `/screen8-compare` | bare | wrap |
| `/screen9-compare` | bare | wrap |
| `/cr132-print` | bare | wrap |

### Routes confirmed to STAY public (do NOT wrap)

| Route | Reason |
|---|---|
| `/` (LoginPage) | Must be public — login entry point |
| `/local-printer-setup` | Printer agent needs local access without login |

### Also add to each wrapped route in App.js:
```jsx
{/* PUBLIC: see PUBLIC_ROUTES.md */}  ← only on the 2 kept-public routes
// CR-372-B  ← code marker on every wrapped route
```

---

## 3. Classification

- **Type:** CR
- **Area:** Security / Routing
- **Priority:** P1
- **Risk:** MEDIUM
- **Risk reason:** Touches `src/App.js` (routing). Not financial. Not a hotspot R5 file. Pattern is mechanical (wrap existing routes). Risk of accidentally locking out a legitimate use case if wrong route is wrapped.
- **Fast Lane eligible:** NO (23 lines across 1 file — exceeds ≤10 line limit)

---

## 4. Evidence

- **Source:** Split from CR-372. OD-CR372-01 locked.
- Route list verified from `App.js` grep (2026-09-08)
- `PUBLIC_ROUTES.md` created at `control/PUBLIC_ROUTES.md`
- **Confidence:** CONFIRMED

---

## 5. Duplicate Check

- Split from CR-372.
- **Result: DISTINCT** (sub-scope of split parent)

---

## 6. Code Reality Check

```bash
grep -n "Route path" /app/frontend/src/App.js | grep -v ProtectedRoute → 25 unprotected routes
Minus 2 intentionally public = 23 to wrap
```

- **Code reality: NONE** (no routes wrapped yet)

---

## 7. Blast Radius

- Files: `src/App.js` (23 line-level wraps)
- Hotspot files: NO (App.js is routing; not in R5 financial list)
- Scope: SMALL (1 file, mechanical pattern)
- Downstream: users on those 23 routes will be redirected to login if not authenticated

---

## 8. Owner Decisions

All answered via OD-CR372-01. Route list locked. No new decisions needed.

---

## 9. Related

- **Parent:** CR-372 (SPLIT)
- **Sibling:** CR-372-A (file moves, no src/ — can run first)
- **Reference:** `control/PUBLIC_ROUTES.md` (authoritative list of public routes)
- **Gate 2 note:** Planning agent should verify each of the 23 routes still exists at the expected line in App.js before writing the implementation plan
