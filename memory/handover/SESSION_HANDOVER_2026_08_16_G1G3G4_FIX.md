# Session Handover — 2026-08-16 (G1/G3/G4 Stock Toggle Fix)

**Session type:** BUG FIX
**Items:** G1 + G3 + G4 (AggregatorStockToggle optimistic update + IST + status-dependent)
**Compile:** PASS (1 pre-existing warning) ✅
**Testing agent:** Code review PASS (G1/G3/G4 all confirmed correct). TC-4 Normal regression PASS. TC-1/2/3 blocked by CORS on external API (infrastructure limit for headless tests, not a code issue).

---

## What Was Fixed

### G1 — Optimistic update after stock toggle
**Files:** `AggregatorStockToggle.jsx` + `ProductList.jsx` + `MenuManagementPanel.jsx`
- `aggregatorStockToggle()` response captured: `items[0].{id, status, turn_on_at}`
- Passed up chain: `onToggleDone(item)` → `onStockToggleDone(item)` → `handleStockToggleDone(item)`
- `MenuManagementPanel.handleStockToggleDone`: immediately updates food's `isActive` and `turnOnAt` in state before `fetchFoods()` runs
- Effect: card reflects new state INSTANTLY (no UrbanPiper webhook lag)

### G3 — IST timezone fix for "Back at" time
**File:** `AggregatorStockToggle.jsx` (formatTurnOnAt) + `ProductCard.jsx` (inline)
- `'YYYY-MM-DD HH:MM:SS'` (no TZ from foods-list) → treated as IST by appending `+05:30`
- ISO format with TZ already works → no change
- Effect: "Back at" always shows correct IST time

### G4 — Status-dependent display (instant, not async)
**Files:** `AggregatorStockToggle.jsx` + `ProductCard.jsx`
- `isLive = product.isActive !== false` (was `food_stock === 1`)
- ProductCard "Offline · Back at X" badge: `!product.isActive` (was `food_stock === 0`)
- Effect: toggle button + badge change IMMEDIATELY after disable/enable (status=0/1 is sync, food_stock is async)

---

## Pending Owner Actions
1. Manual smoke on preprod for G1/G3/G4 (TC-1: disable→instant Offline · Back at; TC-2: enable→instant Live; TC-3: Back at IST time correct)
2. Backend team: share `/app/memory/backend_briefs/BACKEND_BRIEF_AGG_TIMED_ENABLE_STATUS_2026_08_16.md` for G2 (timed auto-enable webhook not resetting status=1)
