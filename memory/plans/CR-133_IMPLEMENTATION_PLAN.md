# CR-133 — Implementation Plan (Gate 3)

**ID:** CR-133
**Title:** Printer Agent Config — Full Settings Screen (Complete Rewrite of PrintersView)
**Gate:** 3 — Implementation Plan
**Date:** 2026-08-07 (Gate 3 session)
**Risk:** HIGH (API contract, full-replace POST, printing config)
**Code Reality:** NONE — re-verified this session (`grep PRINTER_AGENT_CONFIG src/ → 0 hits`; `PrintersView` stub still at ListFormViews.jsx L183-258, save = no-op `handleBack`)
**Conflict Pre-Check:** CLEAN — re-verified. `PrintersView` referenced only by `components/panels/SettingsPanel.jsx:11,40`. No other CR touches these files.
**Plan-Stale Check:** PASS — ListFormViews.jsx is 321 lines; PrintersView occupies exactly L183-258 as Gate 2 recorded.

---

## 0. Gate 3 Probe Validation (R11 — executed this session, nothing assumed)

Fresh login → live `GET /api/v2/vendoremployee/restaurant-settings/printer-agent-config` (restaurant 478).
Evidence: `/app/memory/evidence/CR-133/get_response_gate3_probe.json`

### Re-verified (all 9 Gate 2 audit corrections hold on live data)

| # | Check | Live result |
|---|---|---|
| 1 | `api_authentication` present | ✅ `{ api_token: "" }` — passthrough hidden |
| 2 | `auto_printing.auto_settle` | ✅ `"No"` (str) — needs toggle |
| 3 | `qr_codes.upi_dynamic_enabled` | ✅ `"No"` (str) — needs toggle |
| 4/5 | Every style row has `windows{}` + `android{}` | ✅ 24 bill rows + 9 KOT rows, all carry core triple + both platform objects |
| 6/7 | `global_settings.windows{}` / `.android{}` | ✅ present — passthrough |
| 8 | Float font sizes | ✅ `amount_section.paid_by = 5.5 / 6.5` — `parseFloat` mandatory |
| 9 | `restaurant_id` typing | ✅ top-level `int 478`, `restaurant_configuration.restaurant_id` `str "478"` |
| — | `handles_bill` bool, `print_copies` int, auto_printing all `"Yes"/"No"` strings | ✅ |
| — | `printer_configuration` server-derived | ✅ present on GET — MUST be omitted from POST |

### NEW probe findings (Gate 3)

| # | Finding | Consequence |
|---|---|---|
| P1 | **Leftover test keys on preprod 478**: `settings_config.field_visibility{bill,kot}`, `bill_information.row_1.{content,visible}`, `restaurant_header.restaurant_name.alignment` — residue of the Gate 2 audit POST. **OD-6 clean attempted 2026-08-07 (agent-executed POST) — FINDING: backend uses deep-merge semantics; keys absent from POST body are preserved from stored state, not deleted. Client-side POST cannot remove stored keys. Keys remain on preprod 478. Backend/DB-level cleanup required to truly remove them. Functional impact on CR-133: none — merge-onto-raw transform already preserves all unknown keys losslessly.** | Transform must tolerate + preserve unknown keys — already guaranteed by merge-onto-raw (§1) |
| P2 | `printers[].lan_port` is a **string** (`"9100"`) | Transform keeps it as string — NO parseInt |
| P3 | Nullable strings: `upi_id`, `feedback_qr_url`, `vendor_id`, `product_id`, `lan_ip_address`, `bluetooth_mac_address`, `android_device_ip_address`, and most `restaurant_information` fields are `null` | `fromAPI`: `?? ''` for editable text inputs; `toAPI`: send `''` (audit POST with `''` accepted) |
| P4 | Coverage walk: **0 unaccounted `settings_config` sections**, **0 unaccounted `global_settings` keys**, all 33 style rows conform to core-triple shape (only P1 leftovers deviate) | Field contract below is complete |

---

## 1. Transform Architecture — MERGE-ONTO-RAW (data-loss-proof)

The single biggest HIGH risk is the full-replace POST. Instead of reconstructing the POST body from enumerated keys (fragile — any future backend key would be silently dropped), the transform uses **merge-onto-raw**:

```
fromAPI(data):
  state._raw = deepClone(data)            // entire GET payload retained
  + flat editable fields extracted (contract below)

toAPI(state):
  body = deepClone(state._raw)
  delete body.settings_config.printer_configuration   // server-derived, never send
  ...overwrite ONLY the editable leaves from state...
  body.settings_config.restaurant_configuration.restaurant_id =
      String(body.settings_config.restaurant_configuration.restaurant_id)
  return { employee_id, settings_config, style_config }   // top-level restaurant_id NOT sent (matches known-good POST)
```

Guarantees: `server_configuration`, `api_authentication`, `restaurant_configuration`, `restaurant_information`, every `available_options`/`available_fonts` list, every `windows{}`/`android{}` platform object, and any unknown/future key (incl. P1 leftovers) are preserved bit-for-bit. No enumeration to forget.

### Editable Field Contract (validated leaf-by-leaf against live GET)

| FE state key | API path | Type rule |
|---|---|---|
| `printers[]` | `settings_config.printers` | FULL CRUD — see §2 |
| `paperSize` | `paper_settings.paper_size` | str, one of `available_options` (`"58 mm"`/`"80 mm"` — note space) |
| `printerType` | `printer_type.selected` | str, one of `available_options` |
| `footerText` | `bill_footer.footer_text` | str |
| `billCopyCount` / `kotCopyCount` | `print_copies.*` | **int** |
| `autoPrintBill` / `autoPrintKot` / `autoSettle` / `scanOrderAutoPrint` / `aggregatorAutoKot` / `aggregatorAutoBill` | `auto_printing.*` | `toBool()` ↔ `toYesNo()` |
| `aggregatorAutoBillStage` | `auto_printing.aggregator_auto_bill_stage` | str, from `_stage_options` |
| `showItemDateOn80mm` | `bill_display_options.show_item_date_on_80mm` | `toBool()` ↔ `toYesNo()` |
| `upiQrEnabled` / `upiDynamicEnabled` / `feedbackQrEnabled` | `qr_codes.*` | `toBool()` ↔ `toYesNo()` |
| `upiId` / `feedbackQrUrl` | `qr_codes.*` | str, null→`''` |
| `usePdfOnWindows` / `usePdfForBillsOnly` | `windows_options.*` | `toBool()` ↔ `toYesNo()` |
| `fontFamily` | `global_settings.font_family` | str, from `available_fonts` (20) |
| `dividerLineStyle` | `global_settings.divider_line_style` | str, from `divider_line_options` |
| `pageMargins{top,bottom,left,right}` | `global_settings.page_margins_mm` | int/float ≥0 |
| `logoSize{width,height}` | `global_settings.logo_size_mm` | int/float |
| `qrSize{upi,feedback}` | `global_settings.qr_size_mm` | int/float |
| `billStyle` / `kotStyle` (nested) | `style_config.{bill,kot}_print_style.<section>.<row>` | Edit ONLY top-level `font_size_58mm`/`font_size_80mm` (**parseFloat**) + `bold` (`toYesNo`). `windows{}`/`android{}` untouched via merge |
| READ-ONLY display | `restaurant_information.restaurant_name/phone_number` | render only, never write |

### Printer normalize / denormalize

```
normalizePrinter (fromAPI):
  { id, label, type, usbPrinterName: usb_printer_name ?? '',
    vendorId: vendor_id ?? '', productId: product_id ?? '',
    lanIpAddress: lan_ip_address ?? '', lanPort: lan_port ?? '9100',   // STRING (P2)
    bluetoothMacAddress: bluetooth_mac_address ?? '',
    androidDeviceIp: android_device_ip_address ?? '',
    paperSize: paper_size, handledStations: [...handled_stations],
    handlesBill: handles_bill === true }

denormalizePrinter (toAPI): exact snake_case inverse; '' → null for
  hardware fields NOT relevant to selected type (matches GET shape);
  lan_port stays string; handles_bill stays bool.
  New printers: id = `printer_new_${Date.now()}` (backend re-keys on save).
```

`toBool`/`toYesNo` helpers: copy the proven pattern from `restaurantSettingsTransform.js` (do not import across transforms — each transform is self-contained per codebase convention).

---

## 2. UI Architecture

**Decision (pending OD-7):** 4-tab layout per the final iterated mockup (`/cr133-printer-mockup.html`): `[Printers] [Auto Print] [Bill Content] [Print Style]` — supersedes the 3-tab sketch in the Gate 2 doc body.

New directory `components/panels/settings/printerConfig/` (keeps ListFormViews.jsx small; `SettingsPanel.jsx` untouched — `PrintersView` in ListFormViews becomes a thin re-export):

| File | Purpose | ~Lines |
|---|---|---|
| `PrinterAgentConfigView.jsx` | Container: fetch → `fromAPI` → unified state, 4 tabs, dirty tracking, sticky Save (all tabs share ONE state; save posts full config), loading/error/retry states | ~180 |
| `PrintersTab.jsx` | Global defaults strip (paper size, printer type) + printer cards + add/edit wizard (3 steps: connection type → identity/hardware → routing) + delete confirm; conditional fields per USB/LAN/BT; vendor/product id behind "Advanced" disclosure; dynamic station tag input (free text, no hardcoded list); bill-printer warnings (none configured / deleting the bill printer) | ~260 |
| `AutoPrintTab.jsx` | Copies (int steppers) + in-house toggles (incl **Auto Settle**) + aggregator toggles + stage select (visible only when aggregator_auto_bill = ON) | ~110 |
| `BillContentTab.jsx` | Read-only restaurant info banner + footer text + QR section (UPI toggle → UPI ID input, **Dynamic UPI QR** toggle, Feedback toggle → URL input) + `show_item_date_on_80mm` + Windows PDF options (`use_pdf_for_bills_only` visible only when parent ON) | ~120 |
| `PrintStyleTab.jsx` | Global controls (font, divider, margins, logo/QR size) + accordion per section with per-row `58mm / 80mm / Bold` inputs (values via parseFloat, step 0.5) | ~180 |

Reuses `shared.jsx` primitives (`TextInput`, `NumberInput`, `SelectInput`, `ToggleSwitch`, `SectionTitle`). All interactive elements get `data-testid` (kebab-case, e.g. `printer-config-save-btn`, `printer-add-btn`, `auto-settle-toggle`, `upi-dynamic-toggle`, `style-row-restaurant_name-58mm`).

**Phase 1 validation rules (client-side):**
- Label required; USB → `usb_printer_name` required; LAN → valid IPv4 + port; BT → MAC format
- Warning banner when no printer has `handles_bill: true`
- Orphan warning (printer with no stations AND no bill role) — non-blocking
- Save failure → toast with retry; unsaved-changes indicator; refetch after successful save

**Explicitly NOT in Phase 1 (print-agent dependent — no UI claims of printed-output control):** live receipt preview, test print, printer online/offline status, field visibility/alignment/row-content controls, section reordering. (OD-8 decides whether these appear as disabled "Coming soon" affordances or are fully hidden.)

---

## 3. Exact Edits + Execution Sequence

| E# | File | Action | Detail |
|---|---|---|---|
| E1 | `api/constants.js` | EDIT (+1 line) | After L102 `RESTAURANT_SETTINGS_UPDATE`: add `PRINTER_AGENT_CONFIG: '/api/v2/vendoremployee/restaurant-settings/printer-agent-config',` |
| E2 | `api/transforms/printerAgentConfigTransform.js` | NEW (~200) | §1 merge-onto-raw `fromAPI`/`toAPI` + `normalizePrinter`/`denormalizePrinter` + helpers. Marker `// CR-133` |
| E3 | `api/services/printerAgentConfigService.js` | NEW (~30) | `getConfig()` → GET + `fromAPI(response.data.data)`; `saveConfig(state)` → POST `toAPI(state)`, returns `response.data`. Pattern: `restaurantSettingsService.js` |
| E4 | `components/panels/settings/printerConfig/*` | NEW (5 files) | §2 |
| E5 | `components/panels/settings/ListFormViews.jsx` | REPLACE L183-258 | Delete stub; `export { PrinterAgentConfigView as PrintersView } from "./printerConfig/PrinterAgentConfigView";` — also drop now-unused `useRestaurant` printers pull if unreferenced |
| E6 | `api/transforms/__tests__/printerAgentConfigTransform.test.js` | NEW | Fixture = `get_response_gate3_probe.json`. Tests in §4 |
| E7 | — | Registry sync | §6 checklist |

**Sequence:** E1 → E2 → E6 (unit tests green BEFORE UI) → E3 → E4 → E5 → compile check → browser self-test → E7.

---

## 4. Verification Matrix (seeds QA handover)

| # | Check | How | Auto? |
|---|---|---|---|
| V1 | Endpoint key exists | `grep PRINTER_AGENT_CONFIG src/api/constants.js` | YES |
| V2 | `fromAPI` maps all editable fields from live fixture | unit | YES |
| V3 | **Round-trip integrity:** `toAPI(fromAPI(fixture))` deep-equals fixture minus `printer_configuration` and minus top-level `restaurant_id` (zero data loss incl. `windows{}`/`android{}`/`api_authentication`/P1 leftover keys) | unit | YES |
| V4 | `paid_by` 5.5 survives round-trip as float | unit | YES |
| V5 | Edited fields land at right API path with right type (`toYesNo` strings, int copies, str lan_port, `String()` restaurant_id) | unit | YES |
| V6 | `printer_configuration` absent from POST body | unit | YES |
| V7 | New printer id `printer_new_*`; delete removes from array | unit | YES |
| V8 | GET renders: 2 printers cards + all 4 tabs populate from live values | browser | NO |
| V9 | Add USB printer (wizard) → Save → POST 200 → refetch shows backend-assigned id | browser+network | NO |
| V10 | Edit printer label / toggle `auto_settle` / toggle `upi_dynamic` / change font → Save → fresh GET reflects all | browser+curl | NO |
| V11 | Delete bill printer shows warning; no-bill-printer banner appears | browser | NO |
| V12 | Regression: place order → KOT/bill print flow unchanged (`orderTransform`, `printerAgentSelector` untouched) | browser | NO |
| V13 | Webpack compiles, 0 new warnings | log | YES |

---

## 5. Risk Register (delta from Gate 2)

| Risk | Level | Mitigation |
|---|---|---|
| Full-replace POST wipes data | HIGH | Merge-onto-raw (§1) + round-trip unit test V3 (hard gate) |
| Self-test POSTs mutate preprod 478 | MEDIUM | Capture pre-test GET; restore config after self-test. Note: OD-6 clean attempted — deep-merge finding means POST cannot delete keys; backend/DB cleanup needed if true removal required |
| `"58 mm"` (with space) mismatch in UI toggles | LOW | Options always sourced from `_raw.available_options`, never hardcoded |
| ListFormViews re-export breaks SettingsPanel import | LOW | Named re-export keeps `PrintersView` symbol identical; V8 |

---

## 6. Post-Code Registry Checklist (Implementation agent MUST run)

```
□ registry.json: CR-133 → status IMPLEMENTED, sprint_key pos_5_1
□ CR_REGISTRY.md row updated
□ FILE_OWNERSHIP.md: add all §3 files with CR-133 + date
□ // CR-133 marker in every created/modified file
□ webpack compiles, 0 new warnings (EXIT GATE 5/5)
```

---

## 7. Scope Lock

**WILL change:** `api/constants.js` · `api/transforms/printerAgentConfigTransform.js` (NEW) · `api/services/printerAgentConfigService.js` (NEW) · `components/panels/settings/printerConfig/` (5 NEW files) · `components/panels/settings/ListFormViews.jsx` (L183-258 only) · `api/transforms/__tests__/printerAgentConfigTransform.test.js` (NEW)

**WILL NOT touch:** `SettingsPanel.jsx` · `orderTransform.js` (R5) · `printerAgentSelector.js` · `RestaurantContext.jsx` · `profileTransform.js` · `api/axios.js` · any other file.

---

## 8. Owner Decisions (resolved 2026-08-07 — Gate 4 GO)

| OD | Question | Owner Decision | Source |
|---|---|---|---|
| **OD-6** | Preprod 478 carries leftover audit-test keys (P1). Clean now via one corrective POST, or leave? | **Clean attempted 2026-08-07** — POST executed, success=true. Finding: backend deep-merge keeps absent keys; keys remain. Backend/DB cleanup needed for true removal. No impact on CR-133 implementation. | Owner (1a) + agent evidence |
| **OD-7** | Tab layout: 4 tabs per final mockup (Printers / Auto Print / Bill Content / Print Style) or 3 tabs per Gate 2 doc body? | **4 tabs** — Printers / Auto Print / Bill Content / Print Style | Owner (2a) |
| **OD-8** | Phase 2/3 print-agent-dependent controls (preview, test print, visibility/alignment, reorder): fully hidden in Phase 1, or visible-disabled "Coming soon"? | **Visible-disabled "Coming soon"** affordances | Owner (3b) — overrides recommendation of fully hidden |
| **OD-9** | In-browser bill/KOT preview from the mockup: include in Phase 1 (sample-data-driven, cosmetic only) or defer? | **Defer to follow-up CR** | Owner (4 — explicit directive) |

---

**Gate 3 status:** PLAN COMPLETE — OD-6..9 RESOLVED — **Gate 4: GO (2026-08-07)**. No code has been written.

---

## 9. Implementation Addendum (2026-08-07 — post-QA)

**Status: IMPLEMENTED.** E1-E7 executed per plan; 20/20 unit tests pass; webpack clean; QA (testing agent, live 478) passed V8/V9/V9-validation/V10 (round-trip + hidden-field integrity)/V11/OD-8 affordances/regression.

**NEW CRITICAL BACKEND FINDING (P1):** preprod deep-merges `settings_config.printers[]` **by id** — printer ADD persists, but a printer omitted from the POSTed array is **silently re-injected** by the server (200 success; response body + fresh GET both show the deleted printer restored). Confirmed via UI network capture AND direct curl bypassing the UI. This supersedes the §1 assumption that the printers array is replaced wholesale. **Do not retry omission-based printer deletion.**

**Frontend mitigation shipped:** `findReinjectedPrinters()` in the transform + post-save reconciliation in `PrinterAgentConfigView.handleSave` — after the post-save refetch, any locally-deleted printer that survived server-side triggers a destructive toast ("Printer deletion not applied … requires backend support") instead of a false success. New-printer re-keying does not false-positive (unit-tested).

**Backend follow-up required:** true printer deletion needs server support (literal array replace, explicit delete endpoint, or soft-delete flag). Same class of blocker as OD-6 deep-merge cleanup.

**Live residue on preprod 478:** `printer_new_1786121623349` "QA Test Printer" (LAN 192.168.1.99:9100, station QA) from QA's V9 run — cannot be removed client-side; needs backend/DB cleanup alongside the OD-6 leftover keys.

**Minor plan deviation (documented):** P3 said `toAPI` sends `''` for cleared nullable text; implemented as `'' → null` instead, because V3 (round-trip deep-equal, the hard gate) requires reproducing the GET shape exactly. Backend accepts both; null matches stored state.

