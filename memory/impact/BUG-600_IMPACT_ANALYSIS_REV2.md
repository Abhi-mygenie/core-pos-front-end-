# BUG-600 — Impact Analysis Rev 2 (Gate 2)

**ID:** BUG-600
**Date:** 2026-10-21
**Stage:** Gate 2 — Impact Analysis (Revised with live test findings)
**Supersedes:** `impact/BUG-600_IMPACT_ANALYSIS.md` (Rev 1)
**Code Reality:** NONE (no aggregator tone override exists)
**Risk:** MEDIUM — wrong sound for aggregator orders, staff may miss or confuse with POS confirm
**Conflict Pre-Check:** CLEAN — no active items touch `toneMapper.js` or `NotificationContext.jsx` sound resolution

---

## 1. Summary

Restaurant has `aggregator_order_tone` configurable in Settings UI (silent / default / buzzer). The setting **saves correctly** to the backend (confirmed via API probe: changed to "default" → API returns "default", changed to "silent" → API returns "silent"). However, **the backend FCM emitter ignores the saved setting** and always sends a hardcoded buzzer sound key (`forty_five_sec_buzzer`) in `data.sound` for aggregator order notifications.

This is the **exact same backend bug pattern** as POS2-006/POS2-007 for confirm-order notifications — backend hardcodes the sound regardless of the per-restaurant setting. POS2-007 Phase 1 shipped a frontend override for confirm-order. BUG-600 is the aggregator equivalent.

---

## 2. Live Test Evidence (2026-10-21, owner-tested)

| Test | Setting saved | API confirms | Sound file played (Network tab) | Expected |
|------|-------------|:---:|:---:|:---:|
| Test 1 | `buzzer` | ✅ `"buzzer"` | `forty_five_sec_buzzer.wav` (206, 1,928 KB) | ✅ Correct (buzzer plays buzzer) |
| Test 2 | `default` | ✅ `"default"` | `forty_five_sec_buzzer.wav` — **buzzer still plays** | ❌ Should play `new_order.wav` |
| Test 3 | `silent` | ✅ `"silent"` | (pending test) | Should play nothing |

**Conclusion:** Setting saves to DB correctly but backend FCM emitter sends `forty_five_sec_buzzer` regardless. Frontend has no override → wrong sound plays.

---

## 3. Root Cause — Backend FCM Ignores `aggregator_order_tone`

```
Owner changes setting in UI:  aggregator_order_tone = "default"
  → Frontend saves via updateOperationalSettings() → API returns 200 ✅
  → Backend DB stores "default" ✅
  
Aggregator order arrives:
  → Backend FCM emitter reads... NOTHING from aggregator_order_tone
  → Hardcodes data.sound = "forty_five_sec_buzzer" (based on tone_timing only)
  → Frontend receives FCM → soundManager.play("forty_five_sec_buzzer") → buzzer plays ❌
  
  aggregator_order_tone: "default" → NEVER READ by backend FCM emitter
```

---

## 4. Existing Fix Pattern — POS2-007 Phase 1 (Confirm-Order)

The identical backend bug was fixed on the frontend for confirm-order notifications via 3 components:

### Component A: `toneMapper.js` — Maps setting value → sound file key
```js
const TONE_TO_SOUND_KEY = {
  silent: 'silent',
  default: 'confirm_order',
  buzzer: 'five_sec_buzzer',
};
export const mapConfirmOrderTone = (tone) => {
  const normalized = tone.trim().toLowerCase();
  return TONE_TO_SOUND_KEY[normalized] || 'confirm_order';
};
```

### Component B: `restaurantRef.js` — Bridge to read restaurant settings
NotificationContext sits OUTSIDE RestaurantProvider in the context tree, so it can't call `useRestaurant()`. A module-level ref (`_restaurant`) is updated by RestaurantProvider and read lazily by NotificationContext at FCM-arrival time. **Already exists — no changes needed for BUG-600.**

### Component C: `NotificationContext.jsx` L121-132 — Override block
```js
if (isConfirmOrderNotification(data, resolvedSound)) {
  const restaurant = getRestaurantRef();
  const profileTone = restaurant?.settings?.confirmOrderTone;
  if (profileTone !== undefined) {
    const overriddenSound = mapConfirmOrderTone(profileTone);
    resolvedSound = overriddenSound;  // ← overrides backend's hardcoded sound
  }
}
```

**BUG-600 fix replicates this exact pattern for aggregator orders.**

---

## 5. Proposed Fix — Data Flow

```
FCM notification arrives (aggregator order)
  → NotificationContext.processNotification()
    → data.sound = "forty_five_sec_buzzer" (backend hardcoded)
    → resolvedSound = "forty_five_sec_buzzer"
    
    → isAggregatorOrderNotification(data, resolvedSound)?          ← NEW (before confirm-order check)
       └─ data.type/source contains aggregator/swiggy/zomato?
       └─ OR resolvedSound contains "buzzer" or "swiggy"?
       └─ YES →
          restaurant = getRestaurantRef()                          ← EXISTING bridge
          profileTone = restaurant.settings.aggregatorOrderTone    ← reads saved setting
          overriddenSound = mapAggregatorOrderTone(profileTone)    ← NEW mapper
            "silent"  → 'silent'       (no sound)
            "default" → 'new_order'    (generic new order chime)
            "buzzer"  → 'five_sec_buzzer' (5-sec buzzer)
          resolvedSound = overriddenSound                          ← OVERRIDE
    
    → isConfirmOrderNotification?  ← SKIPPED (aggregator already handled)
    → soundManager.play(resolvedSound)  ← plays correct sound per setting ✅
```

---

## 6. Files Affected

### Files WILL change

| # | File | What | Scope |
|---|------|------|-------|
| 1 | `src/utils/toneMapper.js` | Add `AGGREGATOR_TONE_MAP` + `mapAggregatorOrderTone()` export | +12 lines |
| 2 | `src/contexts/NotificationContext.jsx` | Add `isAggregatorOrderNotification()` detector + override block BEFORE confirm-order check | +20 lines |

### Files WILL NOT touch

`soundManager.js` (sound files already exist) · `restaurantRef.js` (bridge already works) · `profileTransform.js` (`aggregatorOrderTone` already mapped at L398) · `OperationalTab.jsx` (UI already works) · `aggregatorConfigService.js` (save already works) · `socketHandlers.js` · `DashboardPage.jsx` (R5) · any `.env`

---

## 7. Aggregator Notification Detection

Detect aggregator order notifications by (any one match):

1. `data.type` or `data.notification_type` contains: `aggregator`, `aggrigator`, `swiggy`, `zomato`, `urbanpiper`
2. `data.order_plateform` or `data.platform` contains: `swiggy`, `zomato`
3. `resolvedSound` is `swiggy_new_order` (from inferSoundFromContent keyword match)
4. `resolvedSound` contains `buzzer` AND notification is NOT a confirm-order type (defensive — catches the hardcoded buzzer from backend)

---

## 8. Tone Mapping

| Setting Value | → Sound Key | → File | Verified? |
|:---:|:---:|:---:|:---:|
| `"buzzer"` | `five_sec_buzzer` | `five_sec_buzzer.wav` (226 KB) | ✅ |
| `"default"` | `new_order` | `new_order.wav` (82 KB) | ✅ |
| `"silent"` | `silent` | `silent.wav` (10 KB) | ✅ |
| missing/null | `new_order` | safe default | — |

**OD-600-01 LOCKED:** `"default"` → `new_order` (generic, works for Swiggy + Zomato both).

---

## 9. Risk Assessment

| # | Risk | Level | Mitigation |
|---|------|-------|------------|
| R-1 | False positive: POS order detected as aggregator | LOW | Detection uses aggregator-specific fields (platform, type) that POS never carries |
| R-2 | Confirm-order override fires after aggregator | NONE | Aggregator block runs first; if matched, confirm-order is skipped |
| R-3 | `aggregatorOrderTone` missing from settings | LOW | Mapper defaults to `new_order` — safe fallback |
| R-4 | Sound files missing | NONE | All 3 files verified present in `/public/sounds/` |
| R-5 | Backend fixes FCM later → double override | NONE | If backend sends correct sound matching setting, override produces same result (idempotent) |

---

## 10. Owner Decisions

| ID | Question | Answer | Status |
|---|---------|--------|--------|
| OD-600-01 | `"default"` → `new_order` or `swiggy_new_order`? | `new_order` (generic) | **LOCKED** |

---

## 11. Verification Matrix

| # | What to Verify | Method | Auto? |
|---|---------------|--------|:---:|
| V-1 | `mapAggregatorOrderTone` exported from toneMapper | grep | YES |
| V-2 | `isAggregatorOrderNotification` exists in NotificationContext | grep | YES |
| V-3 | Aggregator check runs BEFORE confirm-order check | Line comparison | YES |
| V-4 | Setting `buzzer` → plays `five_sec_buzzer` | Browser test | NO |
| V-5 | Setting `default` → plays `new_order` (NOT buzzer) | Browser test | NO |
| V-6 | Setting `silent` → no sound | Browser test | NO |
| V-7 | POS confirm-order still uses `confirmOrderTone` (no regression) | Browser test | NO |
| V-8 | webpack 0 new warnings | Dev server log | YES |

---

## 12. Evidence Artifacts

- Investigation: `evidence/BUG-599-600-601/INVESTIGATION_REPORT_AGGREGATOR_2026_10_21.md`
- Intake: `change_requests/BUG-600_AGGREGATOR_BUZZER_NOT_PLAYING_INTAKE.md`
- Live test: Owner tested 2026-10-21 — Network tab shows `forty_five_sec_buzzer.wav` playing when setting is "default" (screenshot provided)
- API probe: `aggregator_order_tone` saves correctly (verified "buzzer" → "default" → "silent" all persist)
- Existing pattern: POS2-007 Phase 1 (`toneMapper.js` L22-38 + `NotificationContext.jsx` L105-132 + `restaurantRef.js`)
- Sound files: all 3 targets verified in `/app/frontend/public/sounds/`
