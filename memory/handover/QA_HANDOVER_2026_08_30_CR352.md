# QA Handover — CR-352: Printer Type Routing Gate
**Date:** 2026-08-30
**Implementation:** COMPLETE — EXIT GATE 5/5 PASS

---

## § 1. Registry Sync Confirmation

- Registry synced: **YES**
- Item: CR-352 → status: **IMPLEMENTED**, gate: 5, sprint: pos_5_x
- EXIT GATE:
  - [x] 1. Registry.json: IMPLEMENTED
  - [x] 2. CR_REGISTRY.md: row updated
  - [x] 3. FILE_OWNERSHIP.md: 4 files listed
  - [x] 4. Code markers: 13 × `// CR-352` across 4 files
  - [x] 5. Compile: webpack 0 new warnings

---

## § 2. Inherited Verification Matrix (from Implementation Plan)

| # | File | Edit | Self-Test |
|---|---|---|---|
| V1 | profileTransform.js | `printerType` in `fromAPI.settings()` | ✅ `grep -n 'printerType' profileTransform.js` → line 393 |
| V2 | restaurantSettingsTransform.js | `printerType` in `fromAPI.step1` | ✅ line 57 |
| V3 | restaurantSettingsTransform.js | `printer_agent` in `toAPI.basic` | ✅ line 253 |
| V4 | RestaurantSettingsPage.jsx | `printerType: 'direct'` in INITIAL_FORM | ✅ line 40 |
| V5 | RestaurantSettingsPage.jsx | 3 tab component imports | ✅ lines 15–17 |
| V6 | RestaurantSettingsPage.jsx | `step2Tab`, `billState`, `handleBillStateChange` state | ✅ lines 228–230 |
| V7 | RestaurantSettingsPage.jsx | Printer Type toggle in Step 1 (data-testid dynamic) | ✅ line 435 `printer-type-${opt.value}` |
| V8 | RestaurantSettingsPage.jsx | Step 2 4-tab bar + content blocks | ✅ `step2-tab-*` testids present |
| V9 | ListFormViews.jsx | `PrintersViewGate` component exported as `PrintersView` | ✅ line 193 |
| V10 | All 4 files | `// CR-352` code markers | ✅ 13 occurrences |
| V11 | All | webpack compile | ✅ 0 new warnings |

---

## § 3. QA Test Cases

### A. Step 1 — Printer Type toggle

| # | Test | Steps | Expected | data-testid |
|---|---|---|---|---|
| T1 | Toggle renders | Login → `/restaurant-settings` → navigate to Step 1 | "Printer Type" SectionCard visible with 2 pill buttons: "Direct Printer" and "Printer Agent" | `printer-type-direct`, `printer-type-agent` |
| T2 | Direct Printer selected by default | Fresh load | "Direct Printer" pill has green border | `printer-type-direct` |
| T3 | Toggle switches | Click "Printer Agent" pill | Green border moves to "Printer Agent" | `printer-type-agent` |
| T4 | Value saves | Select "Printer Agent" → click Next → reach last step → Save → reload → re-open Step 1 | "Printer Agent" still selected | — |
| T5 | API payload | Select "Printer Agent" → Save → DevTools Network → POST `/update-settings` | `basic.printer_agent === 'Yes'` in body | — |
| T6 | API payload Direct | Select "Direct Printer" → Save | `basic.printer_agent === 'No'` in body | — |

### B. Step 2 — 4-tab layout

| # | Test | Steps | Expected | data-testid |
|---|---|---|---|---|
| T7 | Tab bar visible | Step 2 | 4 tabs: Basic Settings / Printers / Bill Content / Bill Style | `step2-tab-basic`, `step2-tab-printers`, `step2-tab-billcontent`, `step2-tab-billstyle` |
| T8 | Basic Settings default | Step 2 loads | "Basic Settings" tab active, Print Behaviour + Copies + KOT sections visible | `step2-basic-content` |
| T9 | Printers tab — Direct | Step 1 = Direct Printer → Step 2 → Printers tab | StationsTab renders (station list or empty state) | `step2-printers-content` |
| T10 | Printers tab — Agent | Step 1 = Printer Agent → Step 2 → Printers tab | Placeholder text visible, no error | `step2-printers-content` |
| T11 | Bill Content tab — Direct | Step 2 → Bill Content tab, printerType=direct | BillContentTab renders (toggles visible) | `step2-billcontent-content` |
| T12 | Bill Style tab — Direct | Step 2 → Bill Style tab, printerType=direct | BillStyleTab renders (style rows visible) | `step2-billstyle-content` |
| T13 | Shared bill state | Click Bill Content → change any toggle → click Bill Style | No double-fetch flash; BillStyleTab receives same billState | — |
| T14 | Basic settings still save | Step 2 → Basic Settings tab → toggle Print KOT → Save | `advanced.print_kot` changes in API payload | `toggle-print-kot` |

### C. Settings → Printers tile routing

| # | Test | Steps | Expected | data-testid |
|---|---|---|---|---|
| T15 | Direct Printer account → correct screen | Login `owner@18march.com` (restaurant 478, `printer_agent="No"`) → Settings → All Settings → Printers tile | `LocalPrinterSetupView` opens (3-tab header: Printers / Bill Content / Bill Style) | `settings-tile-printers`, `local-printer-setup` |
| T16 | Printer Agent account → correct screen | Login `owner@shimlaqohfoodcourt.com` (`printer_agent="Yes"`) → Settings → All Settings → Printers tile | `PrinterAgentConfigView` opens (6-tab header) | `settings-tile-printers` |

### D. Regression

| # | Test | Why |
|---|---|---|
| T17 | Other Settings wizard steps (1–8) still function | RestaurantSettingsPage.jsx is R5 hotspot — verify Steps 3–8 still navigate and save correctly |
| T18 | Settings → other tiles still open (e.g. Table Management, Discount Types) | `ListFormViews.jsx` was modified — verify other exports unaffected |
| T19 | Boot: `restaurant.settings` unchanged for other consumers | profileTransform.js edit is additive — verify `settings.autoKot`, `settings.autoBill`, `settings.useToken` still work in OrderEntry/CartPanel |

---

## § 4. Credentials & Environment

| Account | Email | Password | printer_agent | Note |
|---|---|---|---|---|
| Direct Printer | owner@18march.com | Qplazm@10 | "No" | Restaurant 478 — use for T9/T15 |
| Printer Agent | owner@shimlaqohfoodcourt.com | Qplazm@10 | "Yes" | Food court — use for T10/T16 |
| App URL | https://ac7e8e21-2fea-4559-a64e-e9d302552f9d.preview.emergentagent.com | — | — | — |
| Settings path | `/restaurant-settings` | — | — | Direct URL |

---

## § 5. Files Changed

| File | Lines added | CR/BUG |
|---|---|---|
| `src/api/transforms/profileTransform.js` | +3 | CR-352 |
| `src/api/transforms/restaurantSettingsTransform.js` | +4 | CR-352 |
| `src/pages/RestaurantSettingsPage.jsx` | +80 | CR-352 |
| `src/components/panels/settings/ListFormViews.jsx` | +9 | CR-352 |
