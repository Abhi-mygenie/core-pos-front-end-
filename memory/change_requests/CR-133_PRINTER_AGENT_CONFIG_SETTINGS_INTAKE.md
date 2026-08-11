# CR-133 — Printer Agent Config — Full Settings Screen (Complete Rewrite)

**ID:** CR-133
**Type:** CR
**Priority:** P1 — HIGH
**Risk:** HIGH (printing, order flow, KOT/bill, R5-adjacent service files)
**Status:** INTAKE
**Gate:** 1
**Sprint:** pos_5_1
**Registered:** 2026-08-07
**Source:** OWNER-REPORTED

---

## Owner Answers (confirmed 2026-08-07)

| Question | Answer |
|---|---|
| Scope | Full settings screen — all sections. UI to be designed during Impact Analysis. UX is priority. |
| POST endpoint? | CONFIRMED — same endpoint `POST /api/v2/vendoremployee/restaurant-settings/printer-agent-config` handles save |
| Replace vs new tile? | FULL REWRITE — existing `PrintersView` is dead stub code, completely replace with fresh build |

---

## Description

The Settings panel has a **Printers** tile (Settings → Printers) that opens `PrintersView` in `ListFormViews.jsx`. This is currently a **complete UI stub** — it reads from a stale `restaurant.printers` profile array and has zero real API calls (save/delete are `onSave={handleBack}` no-ops).

A new rich backend endpoint now exists:
- **GET** `printer-agent-config` → returns full printer + print config
- **POST** `printer-agent-config` → saves full config (single payload replace)

The existing `PrintersView` must be **completely discarded** and replaced with a fresh, UX-first settings screen wired to this endpoint.

---

## API Contract (curl-verified 2026-08-07, restaurant 478)

### Endpoint
```
GET  /api/v2/vendoremployee/restaurant-settings/printer-agent-config
POST /api/v2/vendoremployee/restaurant-settings/printer-agent-config
```

### POST Body top-level keys
```json
{
  "employee_id": "3631",
  "settings_config": { ... },
  "style_config": { ... }
}
```

### `settings_config` — 11 sections

| Section | Fields |
|---|---|
| `server_configuration` | `socket_base_url`, `api_base_url` |
| `restaurant_configuration` | `restaurant_id`, `employee_id` |
| `restaurant_information` | `restaurant_name`, `phone_number`, `email_address`, `gst_number`, `fssai_number`, `restaurant_logo`, `restaurant_address_bill_details` |
| `bill_footer` | `footer_text` |
| `paper_settings` | `paper_size` ("58 mm"/"80 mm"), `available_options[]` |
| `printer_type` | `selected` ("USB Printer"/"Bluetooth (BLE) Printer"/"LAN Printer"), `available_options[]` |
| `printers[]` | `id`, `label`, `type`, `usb_printer_name`, `vendor_id`, `product_id`, `lan_ip_address`, `lan_port`, `bluetooth_mac_address`, `android_device_ip_address`, `paper_size`, `handled_stations[]`, `handles_bill` (bool) |
| `print_copies` | `bill_copy_count` (int), `kot_copy_count` (int) |
| `auto_printing` | `auto_print_bill`, `auto_print_kot`, `scan_order_auto_print`, `aggregator_auto_kot`, `aggregator_auto_bill`, `aggregator_auto_bill_stage` ("Acknowledged"/"Food Ready"), `aggregator_auto_bill_stage_options[]` |
| `bill_display_options` | `show_item_date_on_80mm` ("Yes"/"No") |
| `qr_codes` | `upi_qr_enabled`, `upi_id`, `feedback_qr_enabled`, `feedback_qr_url` |
| `windows_options` | `use_pdf_printing_on_windows`, `use_pdf_for_bills_only` ("Yes"/"No") |

### `style_config` — 3 sections

| Section | Fields |
|---|---|
| `global_settings` | `font_family` (20 options), `available_fonts[]`, `divider_line_style` ("Solid"/"Dashed"), `divider_line_options[]`, `page_margins_mm` {top,bottom,left,right}, `logo_size_mm` {width,height}, `qr_size_mm` {upi,feedback} |
| `bill_print_style` | Per-section font sizes: `restaurant_header` (restaurant_name, address, phone, email, gst_number, fssai_number), `bill_information` (row_1..4), `item_table` (table_header, table_content, table_qty, table_meta, notes), `amount_section` (amount_breakdown, total, grand_total, paid_by), `delivery_section`, `room_section`, `footer`. Each field: `{font_size_58mm, font_size_80mm, bold: "Yes"/"No"}` |
| `kot_print_style` | `kot_header` (kot_title, cancel_kot_title), `kot_information` (row_1..4), `item_table` (table_header, table_content), `notes`. Same per-field shape as bill_print_style. |

### GET Response extras (server-added, NOT sent in POST)
- `value_source: "stored"` — indicates config is saved (not default)
- `is_default: false`
- `printer_configuration` — server adds back `{usb_printer_name, lan_printer_ip_address, lan_printer_port, android_device_ip_address}` (derived from printers[])
- `available_fonts[]` and `divider_line_options[]` inside style_config.global_settings

---

## Evidence
- GET response: `/app/memory/evidence/CR-133/get_response.json`
- POST response: `"success": true, "message": "Printer agent configuration saved successfully"` (curl-verified live)
- Source: OWNER-REPORTED + AGENT-VERIFIED
- Confidence: CONFIRMED

---

## Duplicate Check
- **DISTINCT**
- RELATED: CR-130 (BILL printer in place-order payload — order flow side, not settings)
- RELATED: BUG-297 (category restaurant_printer_id NULL — menu mgmt side, not this endpoint)
- RELATED: POS2-003 family (profile-based print_agent read-only — separate from this writable config)

---

## Code Reality Check
```
grep "printer-agent-config" /app/frontend/src/ → NOT FOUND
grep "PRINTER_AGENT" constants.js             → NOT FOUND
PrintersView ListFormViews.jsx L183-258       → EXISTS but full UI stub (zero API, save=handleBack no-op)
restaurant.printers                           → stale profile field, different from printer-agent-config
printerAgents (RestaurantContext)             → read from profile print_agent, separate concern — do NOT touch
printerAgentSelector.js                       → order flow, do NOT touch
```
**Code Reality: NONE** — endpoint unwired, existing view is dead code.

---

## Blast Radius
| File | Action |
|---|---|
| `components/panels/settings/ListFormViews.jsx` | REWRITE `PrintersView` export (L183-258) — full replacement |
| `api/services/printerAgentConfigService.js` | NEW — `getConfig()` + `saveConfig()` |
| `api/transforms/printerAgentConfigTransform.js` | NEW — `fromAPI()` + `toAPI()` |
| `api/constants.js` | ADD `PRINTER_AGENT_CONFIG` endpoint key |
| `SettingsPanel.jsx` | POSSIBLY — tile label/icon update if needed |

**Hotspot files: NO** (`orderTransform.js`, `printerAgentSelector.js`, `RestaurantContext.jsx` are NOT touched)
**Blast radius: MEDIUM** (~5 files, all isolated to settings layer)

---

## Risk Classification
- **Risk: HIGH**
- Trigger: Printing settings affect KOT + bill print flow for all orders. Wrong config → silent print failure.
- Fast Lane eligible: NO (multi-file, HIGH risk)
- Financial logic: NO
- R5 hotspot: NO (isolated to settings layer)

---

## Owner Decisions — LOCKED 2026-08-07

| OD | Question | Owner Answer |
|---|---|---|
| OD-1 | Which sections in Phase 1? | **ALL 14 sections together** — full scope in one CR |
| OD-2 | `printers[]` CRUD scope? | **Complete CRUD** — add new printer + edit + delete |
| OD-3 | `style_config` included? | **YES — include here.** May spawn sub-CR later if scope too large |
| OD-4 | `restaurant_information` editable? | **READ-ONLY** — mirrors Restaurant Info settings, display only |
| OD-5 | `server_configuration` visible? | **TBD — check during Impact Analysis** |

---

## Next Step
PLANNING (Gate 2 — Impact Analysis).
- All owner decisions OD-1..4 locked. OD-5 to be resolved during impact.
- UI/UX design to be led during Impact Analysis — owner confirmed UX is priority.
- `style_config` included in scope; sub-CR option open if size warrants split.
