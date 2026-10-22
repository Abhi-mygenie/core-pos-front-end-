# BUG-600 — Implementation Plan (Gate 3)

**ID:** BUG-600
**Date:** 2026-10-22
**Stage:** Gate 3 — Implementation Plan
**IA:** `impact/BUG-600_IMPACT_ANALYSIS_REV2.md`
**Code Reality:** NONE
**Risk:** MEDIUM
**Conflict Pre-Check:** CLEAN

---

## 1. Execution Sequence

Two edits, executed in order. Both must land before self-test.

---

## 2. Edit 1 — `src/utils/toneMapper.js`

**What:** Add `AGGREGATOR_TONE_MAP` constant + `mapAggregatorOrderTone()` export.

**Current (L22-41):**
```js
const TONE_TO_SOUND_KEY = {
  silent: 'silent',
  default: 'confirm_order',
  buzzer: 'five_sec_buzzer',
};

// ... mapConfirmOrderTone ...

export default mapConfirmOrderTone;
```

**Insert AFTER line 39** (after `mapConfirmOrderTone` closing brace, before `export default`):

```js
// BUG-600 — Aggregator order tone override (same pattern as confirm-order above).
// Maps the per-restaurant `aggregator_order_tone` profile setting to a soundManager key.
// OD-600-01 LOCKED: "default" → 'new_order' (generic chime, covers Swiggy + Zomato).
const AGGREGATOR_TONE_MAP = {
  silent: 'silent',
  default: 'new_order',
  buzzer: 'five_sec_buzzer',
};

export const mapAggregatorOrderTone = (tone) => {
  if (!tone || typeof tone !== 'string') return 'new_order';
  const normalized = tone.trim().toLowerCase();
  return AGGREGATOR_TONE_MAP[normalized] || 'new_order';
};
```

**File after edit:** 42 → ~56 lines (+14 lines).

---

## 3. Edit 2 — `src/contexts/NotificationContext.jsx`

### Edit 2a — Import (L6)

**Current line 6:**
```js
import { mapConfirmOrderTone } from '../utils/toneMapper';
```

**Replace with:**
```js
import { mapConfirmOrderTone, mapAggregatorOrderTone } from '../utils/toneMapper';
```

### Edit 2b — Aggregator detector function (insert AFTER line 49)

Insert after `isConfirmOrderNotification` closing brace (L49), before `export const NotificationProvider`:

```js
// BUG-600 — detect aggregator order notifications.
// Checks aggregator-specific fields that POS orders never carry.
// Must run BEFORE isConfirmOrderNotification to prevent aggregator orders
// from being caught by the confirm-order override.
const AGGREGATOR_INDICATORS = ['aggregator', 'aggrigator', 'swiggy', 'zomato', 'urbanpiper'];

const isAggregatorOrderNotification = (data, resolvedSound) => {
  const type = (data?.type || '').toString().toLowerCase();
  const notifType = (data?.notification_type || '').toString().toLowerCase();
  const platform = (data?.order_plateform || data?.order_platform || data?.platform || '').toString().toLowerCase();
  const source = (data?.source || '').toString().toLowerCase();
  if (AGGREGATOR_INDICATORS.some(k => type.includes(k) || notifType.includes(k) || platform.includes(k) || source.includes(k))) return true;
  if (resolvedSound === 'swiggy_new_order') return true;
  return false;
};
```

### Edit 2c — Override block (insert BEFORE the confirm-order override at L121)

**Current L104-132 region:**
```js
    // Determine sound: explicit key > inferred from content
    const soundKey = data.sound || data.notification_sound || '';
    let resolvedSound = soundKey || inferSoundFromContent(title, body);

    // POS2-007 Phase 1 — confirm-order tone override.
    ...
    if (isConfirmOrderNotification(data, resolvedSound)) {
```

**Insert BETWEEN L103 (`let resolvedSound = ...`) and L105 (`// POS2-007 Phase 1`):**

```js
    // BUG-600 — Aggregator order tone override.
    // Runs BEFORE confirm-order check so aggregator orders don't get caught
    // by isConfirmOrderNotification. Reads aggregatorOrderTone from profile.
    // Same override pattern as POS2-007 (confirm-order).
    if (isAggregatorOrderNotification(data, resolvedSound)) {
      const restaurant = getRestaurantRef();
      const profileTone = restaurant?.settings?.aggregatorOrderTone;
      if (profileTone !== undefined) {
        const overriddenSound = mapAggregatorOrderTone(profileTone);
        if (overriddenSound !== resolvedSound) {
          console.log('[Notification] BUG-600 aggregator tone override:',
            'profile=', profileTone, '| from=', resolvedSound, '→ to=', overriddenSound);
        }
        resolvedSound = overriddenSound;
      }
    }

```

The existing `if (isConfirmOrderNotification(...))` block at (now shifted) L121+ remains untouched. Because `resolvedSound` is already overridden by the aggregator block, if the aggregator block fired, the confirm-order check will see `resolvedSound !== 'confirm_order'` (it'll be `new_order`, `five_sec_buzzer`, or `silent`) and won't match — so no double-override.

---

## 4. Verification Matrix

| # | What to Verify | Method | Auto? |
|---|---------------|--------|:---:|
| V-1 | `mapAggregatorOrderTone` exported from toneMapper.js | `grep "export const mapAggregatorOrderTone" src/utils/toneMapper.js` | YES |
| V-2 | `isAggregatorOrderNotification` function exists in NotificationContext.jsx | `grep "isAggregatorOrderNotification" src/contexts/NotificationContext.jsx` | YES |
| V-3 | Aggregator check block runs BEFORE confirm-order check block | Line number: aggregator `if` < confirm-order `if` | YES |
| V-4 | Setting `buzzer` → resolves to `five_sec_buzzer` | toneMapper unit logic | YES |
| V-5 | Setting `default` → resolves to `new_order` (NOT buzzer, NOT confirm_order) | toneMapper unit logic | YES |
| V-6 | Setting `silent` → resolves to `silent` | toneMapper unit logic | YES |
| V-7 | POS confirm-order still uses `confirmOrderTone` (no regression) | Confirm-order block unchanged | YES |
| V-8 | webpack compiles with 0 new warnings | Dev server log | YES |

---

## 5. Post-Code Registry Checklist

```
- [ ] registry.json: BUG-600 → status: GATE_5A_IMPLEMENTED, sprint_key: nov_cr_batch
- [ ] BUG_TRACKER.md: row updated
- [ ] FILE_OWNERSHIP.md: toneMapper.js + NotificationContext.jsx listed with BUG-600 + date
- [ ] Code markers: // BUG-600 comment in every modified section
- [ ] Compile check: webpack 0 new warnings from this change
```

---

## 6. Scope Lock

**Files WILL change:**
- `src/utils/toneMapper.js` — +14 lines (new map + export)
- `src/contexts/NotificationContext.jsx` — +18 lines (import, detector, override block)

**Files WILL NOT touch:**
`soundManager.js` · `restaurantRef.js` · `profileTransform.js` · `OperationalTab.jsx` · `DashboardPage.jsx` · `socketHandlers.js` · any `.env`

**Owner decisions:** OD-600-01 LOCKED (`default` → `new_order`)
**Blockers:** NONE
