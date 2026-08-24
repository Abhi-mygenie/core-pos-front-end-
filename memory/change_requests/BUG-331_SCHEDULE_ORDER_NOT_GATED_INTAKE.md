# BUG-331 — Schedule Order Setting Not Gated in Frontend

**ID:** BUG-331  
**Type:** BUG  
**Severity:** P1 — MEDIUM  
**Risk:** MEDIUM (order entry UI visibility)  
**Area:** Order Entry → Cart → Schedule Toggle  
**Sprint:** POS 5.x  
**Created:** 2026-08-18  
**Source:** INVESTIGATION (INV-AUG18-2026, INV-5B)  
**Related:** CR-018 (Schedule Order — CLOSED OWNER VERIFIED — initial implementation)  
**Duplicate check:** DISTINCT from CR-018 (CR-018 built the feature; BUG-331 is about missing gate)  

---

## Description

Restaurant Settings Step 5 has a **"Schedule Orders"** toggle (`scheduleOrder`). When this is turned **OFF**, the schedule date/time picker in Cart should be hidden.

However, the schedule toggle in `CartPanel` is **always rendered** regardless of this setting. Turning off "Schedule Orders" in Restaurant Settings has no effect on the frontend.

## Evidence

- `CartPanel.jsx:1284`: schedule checkbox rendered with no gate — `<toggle checked={!!isScheduled} ...>`
- `OrderEntry.jsx:155`: `const [isScheduled, setIsScheduled] = useState(false)` — no gate on setting
- `restaurantSettingsTransform.js:143`: `scheduleOrder: toBool(basic.schedule_order)` ✓ saved correctly
- `profileTransform.js`: `schedule_order` **NOT mapped anywhere** → NOT in `restaurant.features`, `restaurant.settings`, or `restaurant.cancellation`
- **Break point**: profileTransform does not expose `schedule_order` → context has no `scheduleEnabled` flag → CartPanel has nothing to gate on
- Source: AGENT-DISCOVERED
- Confidence: HIGH

## Root Cause (two-part)

1. `schedule_order` is **not mapped** in `profileTransform.fromAPI.restaurant()` → field never reaches `RestaurantContext`
2. Even if mapped, `CartPanel.jsx` and `OrderEntry.jsx` have no guard checking this setting before rendering the schedule UI

## Blast Radius

- `profileTransform.js` — add `scheduleOrderEnabled: toBoolean(api.schedule_order)` to `restaurant` or `restaurant.features` (~2 lines)
- `CartPanel.jsx` — add prop/gate on `scheduleOrderEnabled` (~2 lines)
- `OrderEntry.jsx` — pass `scheduleOrderEnabled` down to CartPanel (~1 line)
- Hotspot files: NO
- Estimated scope: SMALL (2-3 files, ~5 lines total)

## Open Questions — RESOLVED (2026-08-19)

- OQ-1 ✅ **Completely hidden** when `schedule_order = false` — owner confirmed
- OQ-2 ✅ **`restaurant.features.scheduleOrder`** — matches existing feature toggle pattern (`features.tip`, `features.serviceCharge`, etc.)

## Planning Investigation Findings (2026-08-19)

### Confirmed Code Trace
```
profileTransform.js — schedule_order NOT mapped anywhere (confirmed grep)
CartPanel.jsx:1281 — schedule checkbox renders unconditionally:
  <label data-testid="schedule-order-checkbox"> ... always visible

restaurantSettingsTransform.js:143:
  scheduleOrder: toBool(basic.schedule_order) ✅ — saved to backend
restaurantSettingsTransform.js (toAPI):
  schedule_order: toYesNo(s5.scheduleOrder) ✅ — sent to backend
```

### Fix Path (2 files)
1. `profileTransform.js` — add `scheduleOrderEnabled: toBoolean(api.schedule_order)` inside `restaurant.features` block
2. `CartPanel.jsx:1281` — wrap schedule checkbox in `{features.scheduleOrderEnabled && (...)}` gate

### Owner Decisions: NONE REMAINING
**Status: Ready for Gate 2 Impact Analysis**
