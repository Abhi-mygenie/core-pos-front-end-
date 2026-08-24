# BUG-332 — Printer Agent: Station Input Is Free-Text Instead of Dropdown from Restaurant Stations

**Type:** Bug (UX Gap — data exists in context, not wired to printer wizard)
**ID:** BUG-332
**Date:** 2026-08-17
**Investigation Status:** COMPLETE — root cause confirmed
**Screenshot:** Provided — shows Step 3 of 3 with free-text "Kitchen Stations (KOT routing)" input

---

## Symptom (Owner-Reported)

When adding a printer in the Printer Agent Config, Step 3 asks for "Kitchen Stations (KOT routing)" via a **free-text input** (type station name, press Enter/Add). Owner expects a **dropdown of the restaurant's existing stations** instead — so staff don't need to type names manually or guess station names.

---

## Investigation Findings

### Data Flow Traced

```
products (menu items, each has a .station field)
  └─► stationService.extractUniqueStations(products)   ← stationService.js
        └─► LoadingPage.jsx (Line 116)                  ← populates on app load
              └─► StationContext.setAvailableStations()  ← StationContext.jsx L15
                    └─► availableStations: string[]      ← e.g. ["Bar", "KDS", "Main Kitchen"]
                          └─► useStations() hook         ← exported from StationContext.jsx
```

### Current Printer Wizard Data Flow

```
PrinterAgentConfigView.jsx
  └─► getConfig()                                       ← printerAgentConfigService.js
        └─► printerAgentConfigTransform.fromAPI()
              └─► config.options = {
                    paperSizes: [...],                   ← ✅ available_options from API
                    printerTypes: [...],                 ← ✅ available_options from API
                    aggregatorStages: [...],             ← ✅ from API
                    dividerStyles: [...]                 ← ✅ from API
                    // stations: []                      ← ❌ MISSING — not in options
                  }
  └─► <PrintersTab config={config} />
        └─► <PrinterWizard options={config.options} />  ← options has NO stations
              └─► Step 3: free-text <input>             ← ❌ no dropdown source
```

### Root Cause

**`config.options` does not include a `stations` list.** The printer wizard receives `options` as its only prop for dropdown data, but station data was never added to this options object.

The station list **already exists in the app** — it lives in `StationContext.availableStations`, populated at app load from the menu products' `.station` fields. It is accessible via `useStations()` anywhere in the component tree.

**No API change is needed.** The data is already present in React context — it just needs to be wired into the printer wizard's Step 3.

---

## Files Involved

| File | Role | Change Needed |
|------|------|---------------|
| `components/panels/settings/printerConfig/PrintersTab.jsx` | Step 3 station UI | Replace free-text with dropdown from `useStations()` |
| `contexts/StationContext.jsx` | Holds `availableStations` | **No change** — already works |
| `api/transforms/printerAgentConfigTransform.js` | Builds `config.options` | **No change** — stations come from context, not API |
| `api/services/printerAgentConfigService.js` | Fetches printer config | **No change** |

---

## Proposed Fix Approach

**Inside `PrinterWizard` (Step 3 of `PrintersTab.jsx`):**

```jsx
// 1. Add at top of PrinterWizard component:
import { useStations } from '../../../../contexts/StationContext';
const { availableStations } = useStations();

// 2. In Step 3 UI — replace free-text input with:
//    Show available stations as clickable chips (click to add/remove)
//    Keep text input as fallback for custom station names not in the list
```

**Recommended UX (hybrid approach):**
- **Clickable suggestion chips** for each item in `availableStations` — click to add to `form.handledStations`
- **Free-text input retained** as fallback (for restaurants that have stations not yet in the list or for custom entries)
- Chips already selected (in `form.handledStations`) appear in the active orange chip style

This is additive — the existing add/remove chip logic is untouched. We only add a suggestion row above the input.

---

## Confidence

- **Root cause: CONFIRMED** — code tracing complete, no API probe needed
- **Fix location: CONFIRMED** — `PrinterWizard` Step 3 in `PrintersTab.jsx`
- **Data source: CONFIRMED** — `useStations().availableStations` is correct and populated at app load
- **Scope: SMALL** — ~15-20 lines in 1 file

---

## Risk

| Field | Value |
|---|---|
| Risk | LOW-MEDIUM |
| Reason | UI-only change in printer wizard step 3; no API, no financial, no order flow |
| Save behavior | Unchanged — `handledStations` array save logic is untouched |
| Regression | Minimal — free-text fallback preserved, existing station chips unaffected |

---

## Classification

| Field | Value |
|---|---|
| Type | BUG (data available in context, not wired to wizard) |
| Severity | P1 — without this, staff must type exact station names manually; typos cause KOT routing failures |
| Area | Settings → Printer Agent Config → Add Printer → Step 3 |
| Fast Lane | ELIGIBLE — 1 file, ~15-20 lines, LOW-MEDIUM risk, no API/financial change |

---

## Next Steps

**Option A — Fast Lane (recommended):** If owner approves `FAST LANE`, implement directly:
- File: `PrintersTab.jsx` Step 3
- Add `useStations()` hook
- Add suggestion chips row using `availableStations`
- Keep existing free-text input as fallback

**Option B — Full Gate:** Register as BUG-332, proceed to Planning Gate 2 → Gate 3 → Implementation.

---

*Investigation complete. No code written. Root cause confirmed.*
