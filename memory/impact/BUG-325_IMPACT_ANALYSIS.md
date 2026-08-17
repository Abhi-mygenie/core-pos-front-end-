# BUG-325 — Impact Analysis (Gate 2)

**Date:** 2026-08-17
**Role:** PLANNING (Gate 2)
**Code Reality:** PARTIAL — `VariationStockTab.jsx` exists; `val.available` field from API is present but not rendered
**Conflict Pre-Check:** Last touch on `VariationStockTab.jsx` was CR-143 (2026-08-15). No other open item touches this file. CLEAR.
**Risk:** LOW

---

## 1. Problem Statement

`aggregator-sync/variations` API returns `available: true/false` per variation value. `VariationStockTab.jsx` renders each value as a chip with `En` / `Dis` buttons, but **never reads `val.available`**. The user has no visual signal of current enabled/disabled state — both buttons are always shown with equal styling regardless of current status.

**Owner constraint:** Additive only — both `En` and `Dis` buttons must remain.

---

## 2. API Contract (confirmed 2026-08-17)

```
GET /api/v2/vendoremployee/aggregator-sync/variations
→ items[].variations[].values[]:
  { "label": "salsa",  "optionPrice": "0",  "available": false }
  { "label": "gogo",   "optionPrice": "10", "available": false }
```

`available: false` = Inactive on UrbanPiper. `available: true` = Active.

---

## 3. Affected File + Line-level Analysis

**File:** `src/components/settings/aggregatorSetup/VariationStockTab.jsx`
- **Lines 121–138** — values map (the pill/chip row)
- Currently reads: `val.label`, `val.optionPrice`
- Missing: `val.available` status badge

**No other files affected.** The `available` field arrives raw from the API through `getVariations()` → `setItems(res.items)` with no transform layer. The component receives the raw API shape, so `val.available` is already present in state.

---

## 4. Downstream Impact

| Component | Impact |
|---|---|
| `aggregatorConfigService.getVariations()` | No change — already passes `available` through |
| `AggregatorSetupView.jsx` | No change — tab mounting unchanged |
| `toggleVariation()` / `handleToggle()` | No change — toggle logic unchanged |
| `groupToggleAll()` | No change — bulk toggle logic unchanged |
| En/Dis buttons | No change — both kept per owner constraint |

**Zero regression risk** — additive render only.

---

## 5. Risk Classification

| Dimension | Assessment |
|---|---|
| API change | NONE |
| State change | NONE |
| Financial logic | NONE |
| Hotspot file (R5) | NO |
| Lines changed | ~10 added, 0 removed |
| Overall | **LOW** |

---

## 6. Verification Plan (seeds Gate 3)

| # | Check | Method |
|---|---|---|
| V1 | Badge shows "Inactive" (red) when `val.available = false` | Browser: load Variation Stock tab |
| V2 | Badge shows "Active" (green) when `val.available = true` | Browser: toggle En → reload |
| V3 | `En` button still present and clickable | Browser: verify both buttons exist |
| V4 | `Dis` button still present and clickable | Browser: verify both buttons exist |
| V5 | Chip layout not broken (flex row intact, no overflow) | Browser: visual check |
