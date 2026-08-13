# CR-024: Channel Visibility Override — Filter by API-Enabled Channels + Save Type Fix
## Intake + Discovery + Impact Analysis + Implementation Plan
**Registered:** 2026-06-10
**Sprint:** pos_4_0
**Priority:** P1
**Status:** CLOSED — Owner QA passed 2026-06-11
**Owner:** Abhi
**Reporter:** Owner (chat + screenshots, 2026-06-10)
**Module:** StatusConfigPage (local settings) + restaurantSettingsTransform (save)
**Parent:** CR-020 B2 (reopened), CR-020 B11 (related)

---

## 1. INTAKE

### 1.1 Requirement (owner-stated)
The Channel Visibility override in StatusConfigPage should only show channels that the API says are enabled. If the backend says Takeaway is OFF, the Takeaway card should not appear in the override UI. The override can only subtract from what the API provides — never add.

### 1.2 Current behavior
- All 4 channel cards (Dine-In, TakeAway, Delivery, Room) always appear in the override UI, regardless of API state
- Default config has `enabled: true` with all 4 channels, stored in localStorage
- Additionally, `take_away` and `delivery` send raw booleans on save instead of `"Yes"`/`"No"` strings (CR-020 B2 — previously closed prematurely)

---

## 2. DISCOVERY

### 2.1 Two separate bugs contributing to the same symptom

**Bug A: CLOSED — NOT A BUG (confirmed via live API test 2026-06-11)**
Mixed types are correct per backend DB schema:
- `dine_in`/`room` → string columns → `"Yes"`/`"No"` via `toYesNo()`
- `take_away`/`delivery` → integer columns → `true`/`false` raw boolean
Sending `"No"` for `take_away` returns SQL error: `Incorrect integer value: 'No' for column 'take_away'`.
Original code comment "preserve original types" was correct. No fix needed.

| File | Line | Field | Current | Expected |
|------|------|-------|---------|----------|
| `restaurantSettingsTransform.js` | 158 | `take_away` | `s2.takeAway` (raw boolean) | `toYesNo(s2.takeAway)` → `"Yes"`/`"No"` |
| `restaurantSettingsTransform.js` | 159 | `delivery` | `s2.delivery` (raw boolean) | `toYesNo(s2.delivery)` → `"Yes"`/`"No"` |

Backend likely ignores `false` (boolean) and doesn't save the change. Toggling Takeaway or Delivery OFF in Restaurant Settings has no effect.

**Bug B: Override UI shows all channels regardless of API**

| File | Line | What happens |
|------|------|-------------|
| `StatusConfigPage.jsx` | 93-97 | `ALL_CHANNELS` is a hardcoded array of 4 channels |
| `StatusConfigPage.jsx` | 1179 | `{ALL_CHANNELS.map((channel) => ...}` — always renders all 4 cards |
| `StatusConfigPage.jsx` | 1482 | Table View layout also uses `ALL_CHANNELS` — shows all 4 |
| `StatusConfigPage.jsx` | 1536 | Order View layout also uses `ALL_CHANNELS` — shows all 4 |
| `StatusConfigPage.jsx` | 7 | Does NOT import `useRestaurant` — has no access to API features |

The StatusConfigPage never reads from the restaurant profile. It has zero awareness of which channels the API says are enabled.

### 2.2 The default that masks the problem

`DashboardPage.jsx` line 257:
```js
return { enabled: true, channels: ['dineIn', 'takeAway', 'delivery', 'room'] };
```

For users who never visit the StatusConfigPage, the default is override ON with all 4 channels. This means the override is silently forcing all channels visible — even if Bug A prevents the API from saving a channel-OFF change.

---

## 3. IMPACT ANALYSIS

### 3.1 Files affected

| File | Bug | Change needed |
|------|-----|---------------|
| `restaurantSettingsTransform.js` | A | Wrap `take_away` and `delivery` in `toYesNo()` (2 lines) |
| `StatusConfigPage.jsx` | B | Import `useRestaurant`, filter `ALL_CHANNELS` by `features`, pass filtered list to all 3 UI sections |
| `DashboardPage.jsx` | — | No change needed — already reads from localStorage correctly |

### 3.2 StatusConfigPage changes (Bug B detail)

**Change 1 — Import useRestaurant (L7)**
```js
// Before:
import { useStations, useMenu } from "../contexts";
// After:
import { useStations, useMenu, useRestaurant } from "../contexts";
```

**Change 2 — Get features inside component (after L161)**
```js
const { features } = useRestaurant();
```

**Change 3 — Derive available channels from API (new memo)**
```js
const availableChannels = useMemo(() => {
  return ALL_CHANNELS.filter(ch => {
    if (ch.id === 'dineIn') return features.dineIn !== false;
    if (ch.id === 'takeAway') return features.takeaway !== false;
    if (ch.id === 'delivery') return features.delivery !== false;
    if (ch.id === 'room') return features.room !== false;
    return true;
  });
}, [features]);
```

**Change 4 — Replace `ALL_CHANNELS` with `availableChannels` in 3 render locations:**
- L1179: Channel Visibility cards → `{availableChannels.map(...)}`
- L1482: Table View layout cards → `{availableChannels.map(...)}`
- L1536: Order View layout cards → `{availableChannels.map(...)}`

**Change 5 — Clean stale channels from config on save**

When saving, strip any channels from `channelConfig.channels` that are no longer in `availableChannels`. This prevents localStorage from holding stale channel IDs that the API has since disabled.

```js
// In saveConfiguration (L481):
const cleanedChannels = channelConfig.channels.filter(
  id => availableChannels.some(ch => ch.id === id)
);
const cleanedConfig = { ...channelConfig, channels: cleanedChannels };
localStorage.setItem(CHANNEL_VISIBILITY_STORAGE_KEY, JSON.stringify(cleanedConfig));
```

**Change 6 — Default should be override OFF**

Currently `DEFAULT_CHANNEL_CONFIG` has `enabled: true`. For new users who haven't configured anything, the override should be OFF — let the API drive visibility. Only turn ON when the user explicitly wants to hide something.

```js
const DEFAULT_CHANNEL_CONFIG = {
  enabled: false,  // ← changed from true
  channels: ALL_CHANNELS.map(c => c.id),
};
```

And in `DashboardPage.jsx` line 257:
```js
return { enabled: false, channels: ['dineIn', 'takeAway', 'delivery', 'room'] };
```

### 3.3 Risk assessment

| Change | Risk | Reason |
|--------|------|--------|
| Bug A (toYesNo wrap) | **ZERO** | Same pattern as every other toggle field |
| Bug B (filter by features) | **LOW** | Additive filter — UI shows fewer cards, not more. No data change. |
| Default override OFF | **LOW** | New users see API-driven channels. Existing users with localStorage keep their saved config unchanged. |
| Clean stale channels on save | **LOW** | Only removes IDs that the API no longer enables — prevents invisible phantom channels in localStorage |

### 3.4 Cross-refs

| Surface | Affected? |
|---------|-----------|
| Dashboard channel columns | Not directly — already reads from `channelVisibility` in localStorage. Benefits indirectly because saved config will now be accurate |
| OrderEntry dropdown (B11) | Not affected — reads from `features` directly |
| Restaurant Settings wizard (Step 2) | Bug A fix ensures save works correctly |
| Profile API / RestaurantContext | Not affected — read-only consumer |

---

## 4. TESTING PLAN

### Smoke Tests
- [ ] Restaurant Settings: toggle Takeaway OFF → Save → Reload → Takeaway stays OFF
- [ ] Restaurant Settings: toggle Delivery OFF → Save → check network payload has `take_away: "No"` and `delivery: "No"` (strings, not booleans)
- [ ] StatusConfigPage: when API has Takeaway OFF, the Channel Visibility section shows only 3 cards (no Takeaway)
- [ ] StatusConfigPage: Table View and Order View layout sections also show only 3 channel cards
- [ ] StatusConfigPage: save → check localStorage has only the API-enabled channels
- [ ] Fresh user (clear localStorage): override defaults to OFF, dashboard shows API-driven channels

### Regression
- [ ] Dine-In and Room toggles still save correctly (already using `toYesNo`)
- [ ] Payment toggles still save correctly
- [ ] Existing users with localStorage config keep their settings
- [ ] Dashboard still respects the override when ON

---

## 5. OWNER DECISION QUEUE

| ID | Decision | Recommendation |
|----|----------|----------------|
| **OD-024-1** | Default override OFF for new users? | Yes — API should drive visibility by default; override is opt-in |

---

## 6. FILES TO EDIT

| File | Changes | Lines |
|------|---------|-------|
| `src/api/transforms/restaurantSettingsTransform.js` | Bug A: wrap `take_away`/`delivery` in `toYesNo()` | 2 lines (L158-159) |
| `src/pages/StatusConfigPage.jsx` | Bug B: import `useRestaurant`, derive `availableChannels`, replace `ALL_CHANNELS` in 3 render spots, clean stale on save, default OFF | ~15 lines across 6 locations |
| `src/pages/DashboardPage.jsx` | Default `enabled: false` | 1 line (L257) |

**Total:** ~18 lines across 3 files.

---

## 7. ARTIFACT TRACKER

| # | Artifact | Status |
|---|----------|--------|
| 1 | Intake | DONE |
| 2 | Discovery | DONE |
| 3 | Impact Analysis | DONE |
| 4 | Implementation Plan | DONE |
| 5 | Owner Decision | **PENDING — 1 decision (OD-024-1)** |
| 6 | Code Implementation | PENDING |
| 7 | QA Report | DONE — iteration 9 passed, Bug A closed via live API test |
| 8 | Owner Smoke / Signoff | DONE — 2026-06-11 |
