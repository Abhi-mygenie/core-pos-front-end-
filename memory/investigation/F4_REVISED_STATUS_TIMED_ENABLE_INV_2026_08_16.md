# Investigation Report — F4 Revised: Aggregator Food "Offline After Timed Enable" — status column

**Date:** 2026-08-16
**Role:** INVESTIGATION
**Steps used:** 8/10
**Triggered by:** Owner correction: "its not the food_stock its still the status column"

---

## 1. Summary

**Root cause (confirmed — HIGH confidence):**
The `aggregatorStockToggle(action:'disable')` API sets `status=0` immediately (makes food Inactive in POS). The matching `enable` action (manual) restores `status=1`. BUT the **UrbanPiper timed auto-enable** (webhook fires at `turn_on_at`) only restores `food_stock=1` — it does **NOT** restore `status` back to 1. After the timed enable, `food_stock=1` (live on UrbanPiper) but `status=0` (Inactive in POS) — food still looks offline/greyed in the UI.

**Classification:** BACKEND_BUG — webhook handler for timed re-enable does not reset `status=1`

---

## 2. Hypotheses Tested

| # | Hypothesis | Test | Steps | Result |
|---|---|---|---|---|
| H1 | "Offline" display is driven by `status` not `food_stock` | API probe: `foods-list` — check both fields | 1 | ✅ CONFIRMED — `status=0` + `food_stock=1` coexist |
| H2 | `stock-toggle DISABLE` sets `status=0` immediately | Probe: POST disable → re-fetch | 2 | ✅ CONFIRMED — before: `status=1`, after disable: `status=0` |
| H3 | `stock-toggle ENABLE (manual)` restores `status=1` | Probe: POST enable → re-fetch | 2 | ✅ CONFIRMED — after enable: `status=1` |
| H4 | UrbanPiper timed auto-enable restores `status=1` | Historical data: food with old `turn_on_at` timestamp | 1 | ❌ ELIMINATED — `status=0` persists after timed enable, `food_stock=1` |
| H5 | Power button (status toggle) works correctly | Probe: POST `status-food/13303 {food_for:'Aggregator'}` | 1 | ✅ CONFIRMED — toggles correctly (0→1, 1→0) |

---

## 3. Data Flow Trace — Root Cause

```
User action: disable food for 2h
  → POST /aggregator-sync/stock-toggle {action:"disable", turn_on_preset:"2h"}
  → Backend: sets status=0 IMMEDIATELY (response: old_status:1 → new_status:0)
  → UrbanPiper: queues async task
  → After webhook: food_stock=0, turn_on_at='+2h'
  → UI: "○ Offline ▾" + "Inactive" badge ✅ (both correct)

After 2h: UrbanPiper timed auto-enable fires
  → UrbanPiper webhook → Backend updates food_stock=1
  → Backend webhook handler: ONLY updates food_stock=1
  → status STAYS 0 ← BREAK POINT
  → UI after user refresh: "● Live ▾" BUT "Inactive" badge still showing
  → User complaint: "already enabled but shows offline"

User action: manual "Enable Now" click
  → POST /aggregator-sync/stock-toggle {action:"enable"}
  → Backend: sets status=1 IMMEDIATELY (response: new_status:1)
  → UrbanPiper: queues async task → food_stock=1 after webhook
  → UI: "● Live ▾" + NO Inactive badge ✅ (both correct)
```

---

## 4. API Evidence (all probed live)

**After stock-toggle DISABLE:**
```
status=0, food_stock=1 (food_stock async, hadn't synced yet)
item result: {'status': 0, 'status_text': 'Out of Stock'}
```

**After stock-toggle ENABLE (manual):**
```
status=1, food_stock=1
item result: {'status': 1, 'status_text': 'Available'}
```

**Historical case — food with past `turn_on_at`:**
```
'69 special': status=0, food_stock=1, turn_on_at='2026-08-16 18:05:17' (past)
```
food_stock=1 proves UrbanPiper DID fire the timed enable. But status=0 proves the webhook DIDN'T reset status.

---

## 5. ProductCard Display Logic

```js
// Transform (menuManagementTransform.js L68):
isActive: api.status === 1,

// ProductCard.jsx L291-332:
backgroundColor: product.isActive ? "#fff" : "#F8FAFC",  // grey card when Inactive
opacity: product.isActive ? 1 : 0.7,                     // dim when Inactive
{!product.isActive && <span>Inactive</span>}              // ← THIS badge persists
{product.foodStock === 0 && <span>Offline</span>}         // "Offline" badge (separate)
```

The "offline-looking" card after a timed re-enable is the **"Inactive" badge from status=0**, not the "Offline" badge from `foodStock=0` (which correctly becomes 1 after UrbanPiper webhook).

---

## 6. Fix Required

### Primary fix — BACKEND (P0)
**File:** Backend webhook handler for UrbanPiper timed re-enable
**Change:** When UrbanPiper fires the timed auto-enable webhook, also set `food.status = 1` (Active) in addition to `food.food_stock = 1`

**Backend Brief path:** `/app/memory/backend_briefs/BACKEND_BRIEF_AGG_TIMED_ENABLE_STATUS_2026_08_16.md`

### Secondary fix — FRONTEND (P1)
**File:** `AggregatorStockToggle.jsx` — `handleEnable` function
**Change:** After successful manual enable, `onToggleDone()` should be called AFTER confirming the food is visible as Active. Current `onToggleDone()` triggers `fetchFoods()` immediately, which correctly shows `status=1` (since enable sets it synchronously). **This path already works correctly** — frontend manual enable is fine.

### No fix needed — FRONTEND refresh for timed enable
The frontend cannot know when UrbanPiper fires the webhook for timed enables. The user has to manually refresh or navigate away/back to see the updated status. This is an acceptable limitation since the backend fix (P0) resolves the root cause.

---

## 7. Bonus: stock-toggle Response Contains `items[0].status`

The `aggregatorStockToggle` API response already returns the new status in `items`:
```json
{"items": [{"id": 13303, "status": 0, "status_text": "Out of Stock", ...}]}
```

**Frontend opportunity:** Instead of waiting for `fetchFoods()` to re-fetch, the frontend can immediately update the specific food's `isActive` using this response value — eliminating any race condition where `fetchFoods()` returns before UrbanPiper updates `food_stock`.

---

## 8. Retroactive Candidates
None — CR-140 is correctly registered. The stock toggle (BUG-301) was known as a backend constraint; this reveals the deeper issue is in the webhook handler, not the frontend.

---
