# BUG-333 — New Order Always Opens as Walk-In (handleAddOrder Hardcoded)

**Type:** Bug
**ID:** BUG-333
**Date:** 2026-08-17
**Status:** INTAKE COMPLETE — awaiting Gate 2 (Planning)
**Source Investigation:** INV-OE-001

---

## Description

When staff taps the "Add Order" / new-order FAB, the Order Entry always opens with **Walk-In** as the default order type — regardless of the restaurant's primary service mode or what the staff member was doing last. This forces an extra tap to switch to Table, Takeaway, or Delivery on every new order for restaurants that are not primarily walk-in.

## Classification

| Field | Value |
|---|---|
| Type | BUG (hardcoded default — should be configurable/contextual) |
| Area | Dashboard → New Order → Order Entry |
| Priority | P1 |
| Severity | HIGH — every new dine-in/delivery order requires an extra unnecessary step |
| Risk | LOW (localStorage preference; no financial/API change) |
| Fast Lane | ELIGIBLE — 1-2 files, ≤10 lines, no financial logic |

## Evidence

- Source: OWNER-REPORTED (confirmed by INV-OE-001)
- Confirmed in code:
  ```js
  // DashboardPage.jsx line 1463-1465:
  const handleAddOrder = () => {
    setOrderEntryTable(null);
    setOrderEntryType("walkIn");   // ← hardcoded, always Walk-In
  };
  // Also line 1504: setOrderEntryType('walkIn') on collect-bill stay-on-order
  ```
- Confidence: CONFIRMED

## Code Reality

```bash
# Hardcoded location (CONFIRMED):
  DashboardPage.jsx line 1465: setOrderEntryType("walkIn")
  DashboardPage.jsx line 1504: setOrderEntryType('walkIn')

# Existing localStorage preference pattern (for reuse):
  utils/qsrModePrefs.js    ← QSR mode preference
  utils/autoSettlePrefs.js ← auto-settle preference
  utils/orderEntryPrefs.js ← order entry preferences (already exists!)
  utils/weightEntryPrefs.js
```

- **Code reality: FULL** — bug confirmed, fix pattern exists (`orderEntryPrefs.js`)

## Blast Radius

- Primary: `DashboardPage.jsx` (2 lines)
- Secondary: `utils/orderEntryPrefs.js` (add defaultOrderType read/write — may already have hooks)
- Estimated scope: SMALL (1-2 files, ~5-10 lines)

## Expected Behavior

- `handleAddOrder()` reads a persisted `defaultOrderType` preference (localStorage)
- If no preference set: falls back to `"walkIn"` (current behavior — no regression)
- When staff changes order type in OrderEntry, the new type is persisted for next time
- **Optional (owner decision):** Multi-button FAB showing Table / Walk-In / Takeaway / Delivery icons (Option D from investigation) — one tap goes directly to correct type

## Owner Decisions Needed

1. Fix with **remember-last-used** (Option A — quick) or **multi-button FAB** (Option D — better UX) or both?
2. Should a restaurant-level default be configurable in General Settings?

## Duplicate Check

DISTINCT

---

**Next:** Planning Gate 2 — Fast Lane eligible (say `FAST LANE APPROVED for BUG-333`)
