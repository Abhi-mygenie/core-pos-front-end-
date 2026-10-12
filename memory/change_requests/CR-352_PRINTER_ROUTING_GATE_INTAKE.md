# CR-352 — Printer Type Routing Gate (Direct Printer / Printer Agent)

**ID:** CR-352
**Date Registered:** 2026-08-30
**Registered by:** INTAKE agent (source: SESSION_HANDOVER_2026_08_27_PRINTER_ARCHITECTURE.md §6)
**Type:** CR
**Sprint:** pos_5_x

---

## Summary

The app has two fully built printer configuration paths (Direct Printer and Printer Agent), but the frontend **never reads the `printer_agent` toggle** from the restaurant profile. As a result:

1. All restaurants always open `PrinterAgentConfigView` regardless of their printer type.
2. There is no way to switch printer type from the UI (no toggle in Settings Screen 1).
3. Settings Screen 2 is not tabbed — the existing Direct Printer tabs (built in BATCH-09) are not surfaced.
4. The Settings → All Settings → Printers tile always opens Printer Agent, never Direct Printer.

This CR implements the **routing gate**: read `printer_agent` from profile, show the correct toggle in Screen 1, make Screen 2 tabbed and conditional, and route the Printers tile to the correct screen.

---

## Classification

- **Type:** CR
- **Severity:** P1 — High (all Direct Printer restaurants see the wrong settings screen; no workaround)
- **Risk:** HIGH — touches `profileTransform.js` (restaurant profile data flow), `restaurantSettingsTransform.js` (settings wizard), `RestaurantSettingsPage.jsx` (settings wizard UI), and `ListFormViews.jsx` (Settings panel routing)
- **Area:** Settings → Restaurant Settings (Screen 1 + Screen 2) + Settings Panel Printers tile
- **Fast Lane eligible:** NO (4 files, HIGH risk)

---

## Code Reality Check (MANDATORY — Step 0a)

```
Code Reality: NONE
```

Verified:
- `grep -n "printer_agent" /app/frontend/src/api/transforms/restaurantSettingsTransform.js` → 0 results
- `grep -n "printer_agent" /app/frontend/src/api/transforms/profileTransform.js | grep -v "printerAgents\|POS2-003"` → 0 results (only `printerAgents` array for order printing exists, NOT the `printer_agent = "Yes/No"` routing flag)
- `ListFormViews.jsx` line 186: `export { PrinterAgentConfigView as PrintersView }` → unconditional, no gate

---

## Duplicate Detection (Step 0b)

- Searched `registry.json` and `CR_REGISTRY.md` for "routing gate", "printer_agent toggle", "Direct Printer toggle", "printer type" — **no existing ID**.
- **Classification: DISTINCT**
- Related: CR-133 (Printer Agent Config — built the screens), CR-161 (Stations tab shared component), CR-351 (Bill Content/Style tabs for Direct Printer), BATCH-09 (built LocalPrinterSetupView)

---

## Owner Decisions Locked (from handover §7)

| Decision | Value |
|---|---|
| Toggle labels | "Direct Printer" / "Printer Agent" (OD-B5) |
| API field | `restaurants[0].settings.printer_agent` → `"Yes"` (Printer Agent) / `"No"` (Direct Printer) |
| Save endpoint | `POST /api/v2/vendoremployee/restaurant-settings/update-settings` → `{ basic: { printer_agent: "Yes"/"No" } }` |
| Screen 2 structure | Tab 1 (Basic Print Settings) always visible; Tabs 2/3/4 conditional on printer_agent |
| Printer Agent tabs 2/3/4 | Deferred — plan for Direct Printer first (smoke test required) |

---

## Scope — 4 Pieces

### Piece 1: `restaurantSettingsTransform.js`
- Map `printer_agent` from profile API response: `printerType: api.printer_agent === 'Yes' ? 'agent' : 'direct'`
- Round-trip on save: `basic.printer_agent = state.printerType === 'agent' ? 'Yes' : 'No'`

### Piece 2: `RestaurantSettingsPage.jsx` — Step 1 toggle
- Add "Printer Type" field to Step 1 (Basic Settings)
- Two-option radio/toggle: **"Direct Printer"** / **"Printer Agent"**
- Reads from `s1.printerType`, saves via `updateStep('step1', 'printerType', val)`

### Piece 3: `RestaurantSettingsPage.jsx` — Step 2 tabbed layout
- Make Step 2 a 4-tab container:
  - Tab 1 — Basic Print Settings (always shown): Print KOT, Auto Print Bill, Bill Copies, KOT Copies, Token on Bill/KOT, KOT Language
  - Tab 2 — Printers: `StationsTab` (Direct Printer) | placeholder (Printer Agent, deferred)
  - Tab 3 — Bill Content: `BillContentTab` (Direct Printer) | placeholder (Printer Agent, deferred)
  - Tab 4 — Bill Style: `BillStyleTab` (Direct Printer) | placeholder (Printer Agent, deferred)
- Tabs 2/3/4 content determined by `s1.printerType` value

### Piece 4: `ListFormViews.jsx` line 186 — routing gate
- Read `printer_agent` from restaurant context (or localStorage)
- If `"No"` → export `LocalPrinterSetupView as PrintersView`
- If `"Yes"` → export `PrinterAgentConfigView as PrintersView`
- Must be reactive (if user changes printer type in Screen 1 → tile should open correct screen)

---

## Evidence

- **Screenshot:** not provided
- **Steps to reproduce (gap):** Login as `owner@18march.com` (restaurant 478, printer_agent="No") → Settings → All Settings → Printers tile → opens Printer Agent Config instead of Local Printer Setup
- **Curl for printer_agent field:**
  ```
  GET https://preprod.mygenie.online/api/v2/vendoremployee/profile
  → restaurants[0].settings.printer_agent = "No" (for restaurant 478)
  → restaurants[0].settings.printer_agent = "Yes" (for food court restaurant 675)
  ```
- **Source:** AGENT-DISCOVERED (from handover §6, confirmed via `grep`)
- **Confidence:** CONFIRMED

---

## Blast Radius

- Files WILL change:
  1. `src/api/transforms/restaurantSettingsTransform.js`
  2. `src/pages/RestaurantSettingsPage.jsx` (R5 hotspot — caution)
  3. `src/components/panels/settings/ListFormViews.jsx`
- Files will NOT touch: `LocalPrinterSetupView.jsx`, `PrinterAgentConfigView.jsx`, `StationsTab.jsx`, `BillContentTab.jsx`, `BillStyleTab.jsx`, `orderTransform.js`, `CollectPaymentPanel.jsx`
- Hotspot files: **RestaurantSettingsPage.jsx** (R5 — high-risk, settings wizard)
- Blast radius: **MEDIUM** (3 files, 1 hotspot)

---

## Risk Register

| Risk | Mitigation |
|---|---|
| `RestaurantSettingsPage.jsx` is a hotspot — wrong edit could break Settings wizard | Scope lock: only add Piece 2 (toggle) to Step 1 and Piece 3 (tabs) to Step 2. No changes to other steps or API calls. |
| `ListFormViews.jsx` routing depends on context load order | Must read `printer_agent` from `useRestaurant()` or `AuthContext` — both boot before Settings Panel opens |
| Backward compat: restaurants without `printer_agent` in profile | Default to `"No"` (Direct Printer) — aligns with existing restaurants that have no printer agent device |

---

## Open Questions for Planning

1. Should `ListFormViews.jsx` read `printer_agent` from context or localStorage? Context is safer but requires `useRestaurant()` to be available at that render point. Needs tracing.
2. Should Step 2 tabs be mounted lazily (each tab unmounts when inactive) or all mounted (preserve state)? Recommend lazy for performance.

---

## Next

Planning Gate 2 (Impact Analysis) → Gate 3 (Implementation Plan) → Gate 4 GO → IMPLEMENTATION
