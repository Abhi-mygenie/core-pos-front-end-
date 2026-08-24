# BUG-339 — Restaurant Type Select Missing "Food Court" Option

**Type:** Bug
**ID:** BUG-339
**Date:** 2026-08-17
**Status:** INTAKE COMPLETE — awaiting Gate 2 (Planning)
**Source Investigation:** INV-BACKEND-001

---

## Description

The "Restaurant Type" select in Restaurant Settings (Step 1 → Basic Info) only shows two options: **Normal** and **Hotel**. The backend supports a third value — **food_court** — which is required to enable food court-specific features including per-station GST numbers (`station_gst` in printer config) and the Food Court Order Report.

Without this option, food court restaurants cannot correctly configure their restaurant type, and the conditional `station_gst` field in Station Management (CR-161) will never show.

## Classification

| Field | Value |
|---|---|
| Type | BUG |
| Area | Restaurant Settings → Step 1 → Restaurant Type select |
| Priority | P1 |
| Severity | HIGH — food court restaurants cannot set correct type; station_gst and food court features blocked |
| Risk | LOW (UI label change + 1 new option; no financial logic) |
| Fast Lane | **ELIGIBLE** — 1 line in 1 file, no API change |

## Evidence

- Source: OWNER-REPORTED via INV-BACKEND-001
- Confirmed in code:
  ```js
  // RestaurantSettingsPage.jsx line 376:
  options={[
    { value: 'Normal', label: 'Normal' },
    { value: 'Hotel', label: 'Hotel' }
    // ← { value: 'food_court', label: 'Food Court' } MISSING
  ]}
  ```
- `restaurantSettingsTransform.js` correctly reads/writes any string value — no transform change needed
- Confidence: CONFIRMED

## Code Reality

```bash
# Fix location (1 line):
  RestaurantSettingsPage.jsx line 376

# Transform — no change needed:
  restaurantSettingsTransform.js line 38:
    restaurantFor: basic.restaurant_for || 'Normal'  ← handles any string value
  restaurantSettingsTransform.js line 220:
    restaurant_for: s1.restaurantFor                 ← passes through as-is
```

- **Code reality: FULL** — bug confirmed, fix is additive (1 option added)

## Blast Radius

- `RestaurantSettingsPage.jsx` — 1 line (add option to array)
- Downstream (not blocking this fix): CR-161 `StationsTab.jsx` will conditionally show `station_gst` when `restaurantFor === 'food_court'`
- Estimated scope: SMALL (1 file, 1 line)

## Expected Behavior

- Restaurant Type select shows: **Normal | Hotel | Food Court**
- Selecting "Food Court" saves `restaurant_for: 'food_court'` to backend
- In Station Management (CR-161): `station_gst` field is visible only when `restaurantFor === 'food_court'`

## Owner Decisions Needed

- None — fix is unambiguous

## Planning Investigation Findings (2026-08-19)

Fast Lane confirmed — 1 file, 1 line, no logic change, no API change.

### Exact Fix Location
```js
// RestaurantSettingsPage.jsx line 376 (current):
options={[
  { value: 'Normal', label: 'Normal' },
  { value: 'Hotel',  label: 'Hotel'  }
]}

// Fix — add Food Court option:
options={[
  { value: 'Normal',     label: 'Normal'     },
  { value: 'Hotel',      label: 'Hotel'      },
  { value: 'food_court', label: 'Food Court' }  // BUG-339
]}
```

Note: `restaurantSettingsTransform.js` passes `restaurant_for` through as-is — no transform change needed.
Downstream: CR-161 `StationsTab.jsx` will use `restaurantFor === 'food_court'` to show `station_gst` field — BUG-339 unblocks that gate.

### Owner Decisions: NONE REMAINING
**Status: Fast Lane eligible — Ready for Gate 2 Impact Analysis**
