# Investigation Report — turn_on_at Full Flow: AggregatorStockToggle Response Not Captured

**Date:** 2026-08-16
**Role:** INVESTIGATION (continuation of F4 revised)
**Steps used:** 8/10
**Triggered by:** Owner pointing to `turn_on_at='2026-08-16 18:05:17'` on "69 special"

---

## 1. Summary

Four gaps identified in the `aggregatorStockToggle` + `turn_on_at` handling:

| # | Gap | Type | Impact |
|---|---|---|---|
| G1 | `aggregatorStockToggle` API response (`items[]`) discarded — never used | FE_GAP | No optimistic update of `isActive`/`turnOnAt` after toggle |
| G2 | UrbanPiper timed auto-enable does NOT reset `status=1` | BACKEND_BUG | Food stays "Inactive" after timed re-enable |
| G3 | `turn_on_at` from `foods-list` has no timezone marker | FE_GAP (minor) | "Back at" time ambiguous in non-IST environments |
| G4 | `food_stock` async lag after disable → UI shows contradictory "● Live ▾" briefly | UI_GAP | Confusing UI for ~5-10s after disable |

---

## 2. Full Timeline Traced (30m preset disable)

```
T+0s: User clicks "Disable → 30 minutes"
  → POST /aggregator-sync/stock-toggle {action:"disable", turn_on_preset:"30m"}
  → API response (IMMEDIATELY available, CURRENTLY DISCARDED):
      {
        action: "disable",
        turn_on_at_iso: "2026-08-16T18:27:28+05:30",   ← explicit IST timezone ✅
        items: [{
          id: 13303,
          name: "69 special",
          status: 0,                                    ← Inactive, set immediately
          status_text: "Out of Stock",
          turn_on_at: "2026-08-16T18:27:28+05:30"       ← ISO with TZ ✅
        }]
      }
  → Current code: response discarded, onToggleDone() called
  → fetchFoods() triggered immediately
  → foods-list returns: status=0, food_stock=1 (async lag!), turn_on_at='2026-08-16 18:27:28'
  → UI shows: "Inactive" badge + "● Live ▾" ← CONTRADICTORY (food_stock not updated yet)

T+5-30s: UrbanPiper processes the task
  → Backend webhook fires → food_stock=0 set
  → UI (only after user refreshes): "Inactive" + "○ Offline ▾" + "Back at 06:27 PM"

T+30m: UrbanPiper timed re-enable fires
  → Backend webhook: food_stock=1 set
  → status STAYS 0 ← BACKEND BUG (already documented in backend brief)
  → UI (only after user refreshes): "● Live ▾" + "Inactive" badge ← persistent bug
  → User: "already enabled but shows offline"

Manual "Enable Now":
  → POST /aggregator-sync/stock-toggle {action:"enable"}
  → API response: items[0].status=1, items[0].turn_on_at=null
  → Response DISCARDED. fetchFoods() called.
  → foods-list: status=1 (correct), food_stock=1 (correct)
  → UI shows correctly: "● Live ▾", no Inactive badge ✅
```

---

## 3. Gap G1 — Response Not Captured (Primary Frontend Fix)

### Current code (AggregatorStockToggle.jsx L57-61 disable, L70-77 enable)
```js
// DISABLE:
await menuService.aggregatorStockToggle(payload);  // ← response DISCARDED
toast({ title: 'Disabled', ... });
setOpen(false);
if (onToggleDone) onToggleDone();

// ENABLE:
await menuService.aggregatorStockToggle({ action:'enable', ... });  // ← response DISCARDED
toast({ title: 'Enabled', ... });
setOpen(false);
if (onToggleDone) onToggleDone();
```

### What the response contains (probed live)
```json
{
  "action": "disable",
  "turn_on_at_iso": "2026-08-16T18:27:28+05:30",
  "items": [{
    "id": 13303,
    "name": "69 special",
    "status": 0,
    "status_text": "Out of Stock",
    "turn_on_at": "2026-08-16T18:27:28+05:30"
  }]
}
```

### Optimistic update available
```js
// IMPROVED:
const res = await menuService.aggregatorStockToggle(payload);
const updatedItem = res?.data?.items?.[0];
// updatedItem = { id, status, turn_on_at }
if (onToggleDone) onToggleDone(updatedItem);
```

Then `MenuManagementPanel` can immediately update the specific food in state:
```js
const handleStockToggleDone = (updatedItem) => {
  if (updatedItem) {
    setFoods(prev => prev.map(f =>
      f.productId === updatedItem.id
        ? { ...f, isActive: updatedItem.status === 1, turnOnAt: updatedItem.turn_on_at || null }
        : f
    ));
  }
  fetchFoods();  // full sync in background
};
```

**Effect:** After disable, card IMMEDIATELY shows "○ Offline ▾" + "Back at 6:27 PM" without waiting for UrbanPiper webhook. After enable, card immediately shows "● Live ▾" with no Inactive badge.

---

## 4. Gap G2 — Backend: Timed Re-enable Doesn't Reset status (Already Filed)

See: `/app/memory/backend_briefs/BACKEND_BRIEF_AGG_TIMED_ENABLE_STATUS_2026_08_16.md`

UrbanPiper timed enable webhook: updates `food_stock=1` but NOT `status=1`.
Confirmed: `status=0` persists after `turn_on_at` time passes.

---

## 5. Gap G3 — turn_on_at Timezone Format

**foods-list returns:** `'2026-08-16 18:27:28'` (no timezone — `YYYY-MM-DD HH:MM:SS`)
**stock-toggle response returns:** `'2026-08-16T18:27:28+05:30'` (ISO + IST timezone — unambiguous)

`formatTurnOnAt(iso)` uses `new Date(iso).toLocaleTimeString(...)`.
- `'2026-08-16 18:27:28'` → treated as local time → correct if browser is in IST, wrong by 5:30h in UTC environments
- `'2026-08-16T18:27:28+05:30'` → always correct

**Fix:** Use `turn_on_at` from the stock-toggle response (ISO format) instead of relying on foods-list format.

---

## 6. Gap G4 — Contradictory UI After Disable (Async lag)

Immediately after disable:
- `status=0` (sync, immediate) → "Inactive" badge
- `food_stock=1` (async lag) → `isLive=true` → "● Live ▾" shows

This contradicts — food was just set offline but button shows "Live". Lasts until UrbanPiper processes.

**Fix:** The optimistic update in G1 resolves this. Set `isLive=false` immediately from response before UrbanPiper processes.

---

## 7. Affected Files for Fix (1B-Planning)

| File | Change | Risk |
|---|---|---|
| `AggregatorStockToggle.jsx` | Capture `res.data.items[0]` from both disable/enable → pass to `onToggleDone(updatedItem)` | LOW |
| `MenuManagementPanel.jsx` | `onStockToggleDone(updatedItem)` → optimistic `setFoods` update before `fetchFoods()` | LOW |

**Files NOT touched:** all other files.
**Risk:** LOW — 2 files, no API change, no financial logic, no hotspot files.
**Planning-skip eligible:** YES — ≤10 lines per file, 2 files, LOW risk, owner approval needed.

---

## 8. Data Summary — Full Probe Results

| Scenario | status | food_stock | turn_on_at |
|---|---|---|---|
| Before disable | 1 | 1 | None |
| Right after disable (30m) | 0 | 1 (async lag) | '2026-08-16 18:27:28' |
| After UrbanPiper webhook (~30s) | 0 | 0 | '2026-08-16 18:27:28' |
| At turn_on_at time (UrbanPiper auto-enable) | **0 (not reset)** | 1 | '2026-08-16 18:27:28' (not cleared) |
| After manual "Enable Now" | 1 | 1 | None (cleared) |

---
