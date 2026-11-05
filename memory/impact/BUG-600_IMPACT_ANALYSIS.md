# BUG-600 — Impact Analysis (Gate 2)

**ID:** BUG-600
**Date:** 2026-10-21
**Stage:** Gate 2 — Impact Analysis
**Code Reality:** NONE (no aggregator tone mapping exists)
**Risk:** MEDIUM — wrong sound for aggregator orders, staff may miss or confuse with POS confirm
**Conflict Pre-Check:** CLEAN — no active items touch `toneMapper.js` or `NotificationContext.jsx` sound resolution

---

## 1. Summary

Restaurant has `aggregator_order_tone: "buzzer"` configured in settings. When an aggregator order (Swiggy/Zomato) arrives via FCM, it plays `confirm_order` sound instead of the five-second buzzer. The `aggregatorOrderTone` setting is mapped in `profileTransform.js:398` and displayed in the Settings UI (`OperationalTab.jsx`), but **no consumer reads it** when determining notification sound. The `toneMapper.js` explicitly excludes it (L18). The fix: add an aggregator-specific tone override in `NotificationContext.processNotification()`, mirroring the existing confirm-order override pattern (POS2-007).

---

## 2. Data Flow Trace — Current (Broken)

```
FCM notification arrives (aggregator order)
  → NotificationContext.processNotification(payload)
    → data.sound || data.notification_sound             ← from backend FCM emitter
    → if empty: inferSoundFromContent(title, body)
       └─ title contains "swiggy" → 'swiggy_new_order'
       └─ title contains "confirm" → 'confirm_order'
       └─ fallback → 'new_order'
    → isConfirmOrderNotification(data, resolvedSound)?  ← CATCHES aggregator orders too
       └─ data.type matches confirm set? OR resolvedSound === 'confirm_order'?
       └─ YES → mapConfirmOrderTone(confirmOrderTone: "default") → 'confirm_order'  ← WRONG
    → soundManager.play('confirm_order')                ← plays wrong sound

    ❌ aggregatorOrderTone: "buzzer" → NEVER CHECKED
```

### Why aggregator orders get caught by the confirm-order override

The backend FCM emitter likely stamps aggregator order notifications with `data.sound = "buzzer"` or a type that triggers the confirm-order detector. Alternatively, `inferSoundFromContent` matches "confirm" in the notification text and `resolvedSound` becomes `'confirm_order'`, which triggers `isConfirmOrderNotification` → overrides with `confirm_order` sound.

---

## 3. Data Flow Trace — Proposed (Fixed)

```
FCM notification arrives (aggregator order)
  → NotificationContext.processNotification(payload)
    → data.sound / inferSoundFromContent → resolvedSound
    → isAggregatorOrderNotification(data, resolvedSound)?    ← NEW CHECK (before confirm-order)
       └─ data.type/source contains aggregator/swiggy/zomato?
       └─ OR resolvedSound is swiggy_new_order?
       └─ YES → mapAggregatorOrderTone(aggregatorOrderTone)  ← NEW MAPPER
          └─ "buzzer" → 'five_sec_buzzer'
          └─ "default" → 'new_order'
          └─ "silent" → 'silent'
          └─ missing → 'new_order' (safe default)
       └─ resolvedSound = overridden value
    → isConfirmOrderNotification?                            ← SKIPPED (aggregator already handled)
    → soundManager.play(resolvedSound)                       ← plays correct buzzer
```

Key: the aggregator check runs **BEFORE** the confirm-order check to prevent aggregator orders from being caught by the confirm-order override.

---

## 4. Existing Pattern — POS2-007 Confirm-Order Override

The fix follows the **exact same pattern** already shipped for confirm-order (POS2-007 Phase 1):

| Component | Confirm-Order (existing) | Aggregator (proposed) |
|-----------|-------------------------|----------------------|
| Detector | `isConfirmOrderNotification()` L43-52 | `isAggregatorOrderNotification()` — NEW |
| Mapper | `mapConfirmOrderTone()` in `toneMapper.js` | `mapAggregatorOrderTone()` in `toneMapper.js` — NEW |
| Settings source | `restaurant.settings.confirmOrderTone` | `restaurant.settings.aggregatorOrderTone` |
| Bridge | `getRestaurantRef()` | Same `getRestaurantRef()` — already exists |
| Override block | L121-132 in NotificationContext | NEW block inserted BEFORE L121 |
| Mapping | `silent→silent, default→confirm_order, buzzer→five_sec_buzzer` | `silent→silent, default→new_order, buzzer→five_sec_buzzer` |

---

## 5. Files Affected

### Files WILL change

| # | File | What | Scope |
|---|------|------|-------|
| 1 | `src/utils/toneMapper.js` | Add `mapAggregatorOrderTone()` export + `AGGREGATOR_TONE_MAP` const | +12 lines |
| 2 | `src/contexts/NotificationContext.jsx` | Add `isAggregatorOrderNotification()` detector + override block before confirm-order check | +20 lines |

### Files WILL NOT touch

`soundManager.js` · `restaurantRef.js` · `profileTransform.js` · `socketHandlers.js` · `useSocketEvents.js` · `DashboardPage.jsx` (R5) · `OperationalTab.jsx` · `LoadingPage.jsx` · any test file · any `.env`

---

## 6. Aggregator Detection — `isAggregatorOrderNotification()`

Detect aggregator order notifications by checking (any one match):

1. `data.type` or `data.notification_type` contains `aggregator`, `aggrigator`, `swiggy`, `zomato`, `urbanpiper`
2. `data.order_plateform` or `data.order_platform` contains `swiggy`, `zomato`
3. `resolvedSound` is `swiggy_new_order` (from `inferSoundFromContent` keyword match)
4. `data.source` contains `aggregator`

Conservative approach — only match unambiguous aggregator indicators to avoid false positives with POS orders.

---

## 7. Tone Mapping — `mapAggregatorOrderTone()`

| Setting Value | Sound Key | Sound File |
|:---:|:---:|:---:|
| `"buzzer"` | `five_sec_buzzer` | `five_sec_buzzer.wav` ✅ exists |
| `"default"` | `new_order` | `new_order.wav` ✅ exists |
| `"silent"` | `silent` | `silent.wav` ✅ exists |
| missing/null | `new_order` | safe default |

OD-600-01 (from intake): **Confirm mapping above?** Owner needs to confirm `default → new_order` vs `default → swiggy_new_order`.

---

## 8. Risk Assessment

| # | Risk | Level | Mitigation |
|---|------|-------|------------|
| R-1 | Aggregator detector false-positive on POS orders | LOW | Detection checks aggregator-specific fields (type, platform, source) that POS orders never carry. `resolvedSound === 'swiggy_new_order'` only triggers from explicit content match. |
| R-2 | Confirm-order override still fires after aggregator override | NONE | Aggregator block runs first + early-returns (same pattern as BUG-453 mute check). If aggregator matched, confirm-order block is skipped. |
| R-3 | `aggregatorOrderTone` missing from restaurant settings | LOW | Mapper defaults to `new_order` on null/undefined — same safe-default pattern as confirm-order mapper. |
| R-4 | Sound file missing | NONE | All 3 target files verified present: `five_sec_buzzer.wav`, `new_order.wav`, `silent.wav` |

---

## 9. Owner Decisions

| ID | Question | Recommended | Status |
|---|---------|-------------|--------|
| OD-600-01 | Mapping: `"default"` → `new_order` or `swiggy_new_order`? | `new_order` (generic, works for both Swiggy + Zomato) | OPEN |

---

## 10. Verification Matrix (seeds Gate 3 + QA)

| # | What to Verify | Method | Auto? |
|---|---------------|--------|:---:|
| V-1 | `mapAggregatorOrderTone` exported from toneMapper | grep | YES |
| V-2 | `isAggregatorOrderNotification` function exists in NotificationContext | grep | YES |
| V-3 | Aggregator check block runs BEFORE confirm-order check block | Code review: line number comparison | YES |
| V-4 | Aggregator order with `aggregatorOrderTone: "buzzer"` → plays `five_sec_buzzer` | Browser: trigger aggregator notification | NO |
| V-5 | POS confirm-order still uses `confirmOrderTone` (no regression) | Browser: trigger POS notification | NO |
| V-6 | `aggregatorOrderTone: "silent"` → no sound | Browser | NO |
| V-7 | `aggregatorOrderTone: "default"` → plays `new_order` | Browser | NO |
| V-8 | webpack compiles with 0 new warnings | Dev server log | YES |

---

## 11. Evidence Artifacts

- Investigation: `evidence/BUG-599-600-601/INVESTIGATION_REPORT_AGGREGATOR_2026_10_21.md`
- Intake: `change_requests/BUG-600_AGGREGATOR_BUZZER_NOT_PLAYING_INTAKE.md`
- Existing pattern: POS2-007 Phase 1 in `toneMapper.js` + `NotificationContext.jsx` L106-132
- Sound files: `/app/frontend/public/sounds/` — all target files confirmed present
- Restaurant settings: `aggregatorOrderTone` mapped at `profileTransform.js:398`
