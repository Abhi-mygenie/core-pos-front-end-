# CR-352 — Impact Analysis: Printer Type Routing Gate

**ID:** CR-352
**Stage:** Gate 2 — Impact Analysis
**Date:** 2026-08-30
**Analyst:** PLANNING agent
**Sprint:** pos_5_x

---

## Header Checks

**Code Reality:** NONE — confirmed by grep across 4 target files.
**Conflict Pre-Check:** CLEAR — no other open CR/BUG touches any of the 4 target files.

---

## 1. Assigned Risk

**Risk: HIGH**

Reason: `RestaurantSettingsPage.jsx` is an R5 hotspot (settings wizard — 8-step, 300+ lines of JSX, all settings persist via POST `/update-settings`). The file was last modified cleanly by CR-056 (2026-07-24) and BUG-359 (2026-08-26). The edits in this CR are additive — no existing field logic changes — but the R5 flag mandates extra caution.

`profileTransform.js` maps all boot data for every component. A mismatch here affects every consumer that reads `restaurant.settings`. Addition-only change keeps risk bounded.

**Scope reduction possible:** Pieces 1 + 4 are LOW risk (1 line each). Piece 2 is LOW risk (3 lines). Piece 3 (tabbed Step 2) is the sole MEDIUM risk item.

---

## 2. API Source — Verified

Backend field: `restaurants[0].settings.printer_agent`
- Value: `"Yes"` (Printer Agent) or `"No"` (Direct Printer)
- Save via: `POST /api/v2/vendoremployee/restaurant-settings/update-settings → { basic: { printer_agent: "Yes"/"No" } }`
- **Handover §2 confirms this field is LIVE on preprod.** No curl probe needed (already curl-verified by prior session).

Confirmed test accounts:
- `owner@18march.com` / Qplazm@10 → restaurant 478, `printer_agent = "No"` (Direct Printer)
- `owner@shimlaqohfoodcourt.com` / Qplazm@10 → `printer_agent = "Yes"` (Printer Agent)

---

## 3. Data Flow Trace — Piece 1 (profileTransform)

```
Boot sequence: LoadingPage.jsx → authService.getProfile()
  → profileTransform.fromAPI.profile(api)
    → fromAPI.restaurant(api.restaurants?.[0], api.print_agent, ...)
      → fromAPI.settings(api.restaurants[0])   ← LINE 219 in profileTransform.js
```

`fromAPI.settings(apiSettings)` maps to `restaurant.settings` object, which is exposed via `RestaurantContext.settings`. The field to add:

```javascript
// CR-352: printer type routing gate — "Yes" = Printer Agent, "No" / missing = Direct Printer
printerType: apiSettings.settings?.printer_agent === 'Yes' ? 'agent' : 'direct',
```

Pattern is identical to `confirmOrderTone` (line 378) and `useToken` (line 386) — nested under `apiSettings.settings?.`.

**Result:** `restaurant.settings.printerType` becomes `'agent'` or `'direct'` in every consumer.

**Downstream consumers of `restaurant.settings`:**
- `RestaurantContext.jsx` line 66-69: exposes via `useRestaurant().settings` — no change needed
- `OrderEntry.jsx`, `CartPanel.jsx`, `CollectPaymentPanel.jsx`, `DashboardPage.jsx` — all read specific settings fields (autoKot, autoBill, etc.) — adding `printerType` is additive, zero impact
- `ListFormViews.jsx` (Piece 4) — will READ `restaurant.settings.printerType`

---

## 4. Data Flow Trace — Piece 2 (restaurantSettingsTransform)

```
Settings wizard: RestaurantSettingsPage.jsx → restaurantSettingsService.getSettings()
  → restaurantSettingsTransform.fromAPI.settingsResponse(data)
    → step2: { printKot, noOfBill, ... }        ← needs printerType added
  → RestaurantSettingsPage state: formState.step2.printerType
  → User saves: restaurantSettingsTransform.toAPI.settingsPayload(formState)
    → { basic: { printer_agent: "Yes"/"No" } }  ← needs to be emitted
```

**fromAPI — what the settings endpoint returns:**
`data.basic.printer_agent` → the settings-list API response has the same `printer_agent` field in the `basic` section.

Add to `fromAPI.settingsResponse()` → `step2`:
```javascript
printerType: basic.printer_agent === 'Yes' ? 'agent' : 'direct',
```

Add to `toAPI.settingsPayload()` → `basic`:
```javascript
printer_agent: s2.printerType === 'agent' ? 'Yes' : 'No',
```

Add to `INITIAL_FORM.step2` in `RestaurantSettingsPage.jsx`:
```javascript
printerType: 'direct',
```

**Regression risk:** ZERO — this is a new field. No existing field in step2 is renamed or removed. The `toAPI` already sends all basic fields; adding `printer_agent` is additive.

---

## 5. Data Flow Trace — Piece 3 (RestaurantSettingsPage.jsx — Step 2 tabbed)

**Current Step 2 structure** (lines 425–454):
```
Step 2 content (data-testid="step-2-content")
  └── Info banner (hardware config is managed at Settings → Printers)
  └── SectionCard "Print Behaviour" (4 toggles)
  └── SectionCard "Copies" (2 selects)
  └── SectionCard "KOT & Token Options" (1 toggle + 1 select)
```

**Proposed Step 2 structure:**
```
Step 2 content (data-testid="step-2-content")
  └── Printer Type toggle (Direct Printer / Printer Agent)
  └── Tab bar (4 tabs)
      ├── Tab 1: "Basic Settings" (the existing 3 SectionCards — always shown)
      ├── Tab 2: "Printers"
      │     IF printerType === 'direct': <StationsTab />
      │     IF printerType === 'agent':  Placeholder ("Configure via Settings → Printers")
      ├── Tab 3: "Bill Content"
      │     IF printerType === 'direct': <BillContentTab />
      │     IF printerType === 'agent':  Placeholder
      └── Tab 4: "Bill Style"
            IF printerType === 'direct': <BillStyleTab />
            IF printerType === 'agent':  Placeholder
```

**Component imports needed:**
```javascript
import { StationsTab }    from '../components/panels/settings/localPrinter/StationsTab';
import { BillContentTab } from '../components/panels/settings/localPrinter/BillContentTab';
import { BillStyleTab }   from '../components/panels/settings/localPrinter/BillStyleTab';
```

**StationsTab, BillContentTab, BillStyleTab — are they self-contained?**
- `StationsTab.jsx` — uses `restaurantSettingsService`, `stationConfigService` internally via own API calls on mount. Self-contained. ✅
- `BillContentTab.jsx` — uses `billPrinterConfigService` internally. Self-contained. ✅
- `BillStyleTab.jsx` — uses `billPrinterConfigService` internally. Self-contained. ✅

No props need to be passed from `RestaurantSettingsPage` to these tabs — they boot their own data.

**Owner decision locked (§12):** Printer Agent Tabs 2/3/4 are deferred — placeholders shown. Scope for this CR: Direct Printer tabs only.

**Tab state:** Local to the Step 2 block. Does NOT affect navigation between wizard steps. Add `const [step2Tab, setStep2Tab] = useState('basic')` inside the Step 2 conditional or as a top-level state (top-level preferred to avoid losing tab on back-navigation).

**Lines estimate:** ~60 lines added to RestaurantSettingsPage.jsx (tab bar + tab content wrapper + 3 imports). No existing lines removed.

---

## 6. Data Flow Trace — Piece 4 (ListFormViews.jsx — routing gate)

**Current state** (line 183–186):
```javascript
// CR-133: PrintersView rewritten as the full Printer Agent Config screen.
export { PrinterAgentConfigView as PrintersView } from "./printerConfig/PrinterAgentConfigView";
```

**Proposed change:**
```javascript
// CR-352: PrintersView routes to correct screen based on restaurant printer_agent setting.
import { useRestaurant } from '../../../contexts/RestaurantContext';
import { LocalPrinterSetupView } from './localPrinter/LocalPrinterSetupView';
const PrintersViewGate = () => {
  const { restaurant } = useRestaurant();
  const isAgent = restaurant?.settings?.printerType === 'agent';
  return isAgent ? <PrinterAgentConfigView /> : <LocalPrinterSetupView />;
};
export { PrintersViewGate as PrintersView };
```

**Reactivity:** `useRestaurant()` is a Context consumer — `restaurant` updates on login/profile refresh. The `SettingsPanel.jsx` renders `PrintersView` only when the Printers tile is clicked (lazy mount). By the time the user reaches the Printers tile, `restaurant` is fully loaded (boot is complete). No async risk.

**SettingsPanel.jsx change needed:** NONE. It already maps `"printers": PrintersView` at line 40 — the exported symbol name stays the same.

**Backward compat:** If `printerType` is undefined (edge case: old tenant profile not yet mapped), `isAgent` is `false` → falls back to `LocalPrinterSetupView`. Safe default (per owner decision OD-B5: Direct Printer is the simpler/default path).

---

## 7. Files WILL Change

| # | File | Lines estimate | Risk |
|---|---|---|---|
| 1 | `src/api/transforms/profileTransform.js` | +2 lines (field + comment) | LOW |
| 2 | `src/api/transforms/restaurantSettingsTransform.js` | +3 lines (fromAPI + toAPI + default) | LOW |
| 3 | `src/pages/RestaurantSettingsPage.jsx` | +3 (INITIAL_FORM) + ~60 (Step 2 tabs + toggle) | MEDIUM (R5 hotspot) |
| 4 | `src/components/panels/settings/ListFormViews.jsx` | +8 lines (gate component) | LOW |

**Total: ~76 lines added, 0 lines removed.**

---

## 8. Files Will NOT Touch

- `LocalPrinterSetupView.jsx` — imported as-is, no modifications
- `PrinterAgentConfigView.jsx` — imported as-is, no modifications
- `StationsTab.jsx`, `BillContentTab.jsx`, `BillStyleTab.jsx` — imported as-is
- `SettingsPanel.jsx` — already maps `"printers": PrintersView`, no change needed
- `orderTransform.js` — the `printer_agent[]` array field on orders is a completely separate concept (POS2-003), not touched
- `CollectPaymentPanel.jsx`, `OrderEntry.jsx`, `CartPanel.jsx` — no touch
- `profileTransform.js` `fromAPI.restaurant()` outer function — no change (only `fromAPI.settings()` inner)

---

## 9. Downstream Consumer Check

**`restaurant.settings.printerType` new consumers (none yet):**
- Only `ListFormViews.jsx` will read it (Piece 4). Zero existing consumers — purely additive.

**`restaurantSettingsTransform.js` step2.printerType new consumers:**
- Only `RestaurantSettingsPage.jsx` Step 2 render (Piece 3). Zero existing consumers.

**`basic.printer_agent` in toAPI:**
- Goes to `POST /update-settings` with all other `basic` fields — the backend ignores unknown fields, and no existing FE consumer reads what gets saved here.

---

## 10. Verification Matrix (seeds QA handover)

| # | File | Edit | How to Verify | Automated? |
|---|---|---|---|---|
| V1 | `profileTransform.js` | `printerType` in settings | Login as owner@18march.com → `window.__debugRestaurant?.settings?.printerType` in console → expect `'direct'` | NO |
| V2 | `profileTransform.js` | `printerType` for agent account | Login as food court account → expect `'agent'` | NO |
| V3 | `restaurantSettingsTransform.js` | `fromAPI.step2.printerType` | Open /restaurant-settings → Step 2 → confirm toggle shows current value from API | NO |
| V4 | `restaurantSettingsTransform.js` | `toAPI.basic.printer_agent` | Save Step 2 → Network tab → POST body → `basic.printer_agent === 'No'` (or 'Yes') | NO |
| V5 | `RestaurantSettingsPage.jsx` | Printer Type toggle renders | Navigate to Step 2 → Printer Type radio/toggle visible with "Direct Printer" / "Printer Agent" options | NO |
| V6 | `RestaurantSettingsPage.jsx` | Tab bar renders | Step 2 → tab bar shows 4 tabs (Basic Settings, Printers, Bill Content, Bill Style) | NO |
| V7 | `RestaurantSettingsPage.jsx` | Direct Printer tabs load | Step 2 → switch to "Printers" tab → StationsTab renders with no console errors | NO |
| V8 | `RestaurantSettingsPage.jsx` | Printer Agent tab shows placeholder | Food court account → Step 2 → Tabs 2/3/4 → placeholder message (not 404/error) | NO |
| V9 | `ListFormViews.jsx` | Direct Printer account opens correct screen | owner@18march.com → Settings → All Settings → Printers tile → `LocalPrinterSetupView` loads (shows 3 tabs: Printers, Bill Content, Bill Style) | NO |
| V10 | `ListFormViews.jsx` | Printer Agent account opens correct screen | Food court account → Settings → All Settings → Printers tile → `PrinterAgentConfigView` loads (shows 6 tabs) | NO |

---

## 11. Post-Code Registry Checklist (for Implementation agent)

```
- [ ] registry.json: CR-352 → status: IMPLEMENTED, sprint_key: pos_5_x
- [ ] CR_REGISTRY.md: row updated to IMPLEMENTED
- [ ] FILE_OWNERSHIP.md: add 4 files with CR-352 + date
- [ ] Code markers: // CR-352 comment in every modified file
- [ ] Compile check: webpack compiles with 0 new warnings after changes
```

---

## 12. Owner Decisions Needed

**None.** All decisions were locked in the handover session 2026-08-27:

| Decision | Locked Value |
|---|---|
| Toggle labels | "Direct Printer" / "Printer Agent" |
| API field | `basic.printer_agent = "Yes"/"No"` |
| Screen 2 tab structure | 4 tabs: Basic + Printers + Bill Content + Bill Style |
| Printer Agent Tabs 2/3/4 | Deferred after Direct Printer smoke test |
| Default (no printer_agent in profile) | Treat as Direct Printer |

**One assumption to flag for owner:** The tab for Printer Agent (Tabs 2/3/4) will show a static placeholder ("Printer hardware settings are managed via the Printers tile in Settings. Direct Printer tabs coming soon."). Owner should confirm this placeholder wording is acceptable before Gate 4.

---

## 13. Risk Register

| Risk | Probability | Impact | Mitigation |
|---|---|---|---|
| `RestaurantSettingsPage.jsx` edit breaks existing steps | LOW | HIGH | Scope lock: only add Printer Type toggle + tabbing to Step 2. All other steps (1, 3-8) untouched. Verify each step still navigates correctly. |
| StationsTab / BillContentTab / BillStyleTab fail when mounted outside LocalPrinterSetupView | LOW | MEDIUM | All 3 tabs self-contain their own API calls. No props needed from parent. Verified via code read. If mount fails → fallback to placeholder. |
| `profileTransform.js` regression (other `settings.*` fields break) | LOW | HIGH | Change is addition-only (1 field). No existing lines modified. Regression: verify `settings.autoKot`, `settings.autoBill`, `settings.useToken` still work in OrderEntry/CartPanel. |
| `ListFormViews.jsx` `useRestaurant()` called before restaurant loads | VERY LOW | LOW | `SettingsPanel` is only accessible after login + boot — `restaurant` is always loaded by the time Printers tile is clicked. `restaurant?.settings?.printerType` uses optional chaining → fallback to `'direct'`. |

---

*Impact Analysis complete. Awaiting Gate 3 (Implementation Plan).*
