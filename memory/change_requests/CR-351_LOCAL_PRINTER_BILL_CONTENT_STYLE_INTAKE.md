# CR-351 — Local Printer Setup: Bill Content + Bill Style Tabs

**Type:** Change Request (New Tabs — API Contract Confirmed + Evidence Saved)
**ID:** CR-351
**Date:** 2026-08-27
**Status:** INTAKE COMPLETE — awaiting Gate 2 (Planning)
**Sprint:** pos_5_x — BATCH-09

---

## Description

The Local Printer Setup screen (`printer_agent = "No"` path) has 3 tabs: Printers, Bill Content, Bill Style.

The **Printers tab** is covered by CR-161/CR-167.

This CR covers the remaining two tabs:

### Tab 2 — Bill Content
Settings that control what appears on the printed bill:
- **Print Options (6 toggles):** Print Phone Number, Print Email, Dotted Line Between Items, Total Amount Bold, Total Amount Centred, Total Amount in Words
- **Bill Text:** Footer Text (free input)
- **Physical Dimensions:** Show Address on Bill (toggle), Padding, Margin, Paper Width
- Save → POST `/bill-printer-config` (same toggle values to all 3 configs: 58mm + 80mm + windows) + POST `/update-settings` (for show_address + footer_text)

### Tab 3 — Bill Style
Font size and visibility per bill section, split by paper type:
- Sub-tabs: **2-inch (58mm)**, **3-inch (80mm)**, **Windows**
- Per section row (27 sections): Height, Width (android only), Bold toggle
- Android (58mm/80mm): `[height, width, bold]`
- Windows: `[height, bold]`
- Save → POST `/bill-printer-config` with `{ "configs": { "58mm":{...}, "80mm":{...}, "windows":{...} } }`

Both tabs are completely absent from the frontend. Backend APIs are confirmed live.

---

## API Contract (Confirmed Live — 2026-08-27)

### GET /bill-printer-config
```
Response:
{
  "data": {
    "configs": {
      "58mm": {
        "id": 122, "bill_size": "58mm", "plateform": "android",
        // 27 section fields — each: [height, width, bold]
        "restaurant_logo": ["1","1","false"],
        "restaurant_title": ["1","1","true"],
        ... (see evidence file)
        // Bill Content fields:
        "print_phone": "Yes",
        "print_email": "Yes",
        "dotted_line_between_item": "Yes",
        "total_amount_bold": "Yes",
        "total_amount_placed_center": "Yes",
        "total_amount_in_word": "Yes",
        "padding": 0,
        "margin": 0,
        "paperwidth": 72
      },
      "80mm": { ...same shape, plateform: "android" },
      "windows": {
        // 27 section fields — each: [height, bold]  ← 2 elements not 3
        "restaurant_logo": ["7","false"],
        ...
        // same Bill Content toggle fields
      }
    }
  }
}
```

### POST /bill-printer-config — CONFIRMED batch format
```json
{
  "configs": {
    "58mm":    { "print_phone": "Yes", "print_email": "No", ... all section fields },
    "80mm":    { "print_phone": "Yes", "print_email": "No", ... all section fields },
    "windows": { "print_phone": "Yes", "print_email": "No", ... all section fields }
  }
}
```
One POST saves all 3 configs. Array format `[{bill_size:"58mm",...},...]` FAILS validation.

### POST /update-settings — for show_address + footer_text
```
Content-Type: multipart/form-data
data="{\"basic\":{\"show_address_on_bill\":\"Yes\",\"footer_text\":\"Thank you visit again\"}}"
```
Confirmed live ✅ — returns success + updated basic settings.

---

## Owner Decisions (All Locked — 2026-08-27)

| # | Decision |
|---|---|
| OD-1 | Bill Content toggles → POST same values to all 3 configs simultaneously |
| OD-2 | POST format: `{ "configs": { "58mm":{...}, "80mm":{...}, "windows":{...} } }` in one call |
| OD-3 | `show_address_on_bill` + `footer_text` → global (not per paper size) |

### Open Question (deferred by owner)
| OQ-1 | `show_address_on_bill` + `footer_text` GET source — which endpoint returns current values? `/update-settings` is POST-only. Deferred — implementation agent to resolve at Gate 3. |

---

## Classification

| Field | Value |
|---|---|
| Type | CR |
| Area | Settings → Local Printer Setup → Bill Content tab + Bill Style tab |
| Priority | **P1** — without these tabs, local printer restaurants cannot configure bill formatting |
| Severity | HIGH — affects print output on every order for `printer_agent = "No"` restaurants |
| Risk | **HIGH** — bill formatting is print-critical, touches bill output on every order |
| Fast Lane | NO — 5+ new files, new endpoint, new transform |

**Risk reason:** Incorrect bill style settings (font sizes, section visibility) corrupt the print output on every bill. OD-1/OD-2/OD-3 locked by owner — no guessing needed.

---

## Code Reality Check

```bash
grep -rn "bill.printer.config\|BILL_PRINTER_CONFIG\|BillContentTab\|BillStyleTab" \
  /app/frontend/src/ --include="*.js" --include="*.jsx"
```

**Findings:**
- `BillContentTab.jsx` EXISTS at `printerConfig/BillContentTab.jsx` — **BUT** this is for the Printer Agent path, uses `/printer-agent-config` data shape. Different endpoint, different data contract. Cannot reuse.
- `PrintStyleTab.jsx` EXISTS — also Printer Agent path only.
- No component, service, constants, or transform for `/bill-printer-config` endpoint.

**Code Reality: PARTIAL** — related components exist for the printer agent path (CR-133). Nothing exists for the local printer path (`/bill-printer-config`). Both tabs must be built fresh with the new data contract.

---

## Duplicate Check

- Searched `registry.json`, `CR_REGISTRY.md`, `BUG_TRACKER.md` for: "bill-printer-config", "bill content local", "bill style local", "BillContentTab local"
- **No duplicate found.**
- **RELATED to CR-133** — CR-133 built the printer agent version of bill content + print style tabs. This CR builds the local printer version with a different endpoint + data shape.
- **RELATED to CR-161/CR-167** — Same BATCH-09 sprint. Same Local Printer Setup host component.
- **Duplicate check: DISTINCT (RELATED to CR-133, CR-161, CR-167)**

---

## Blast Radius

**New files (5):**
- `components/panels/settings/localPrinter/BillContentTab.jsx` (~120 lines)
- `components/panels/settings/localPrinter/BillStyleTab.jsx` (~180 lines)
- `api/services/billPrinterConfigService.js` (~40 lines)
- `api/transforms/billPrinterConfigTransform.js` (~80 lines)
- `api/__tests__/billPrinterConfigTransform.test.js` (~50 tests)

**Modified files (2):**
- `api/constants.js` — +1 constant: `BILL_PRINTER_CONFIG`
- `LocalPrinterSetupView.jsx` — host component (will be created by BATCH-09 CR-161/167 batch; this CR adds its 2 tabs)

**Hotspot files touched:** NO — no `orderTransform.js`, `CollectPaymentPanel.jsx`, or other R5 files.

**Blast radius: LARGE** (5 new files + 2 modified)

---

## Evidence

- **Curl output (GET):** `/app/memory/evidence/CR-LOCAL-PRINTER/bill_printer_config_response.json`
- **Owner decisions:** `/app/memory/evidence/CR-LOCAL-PRINTER/OWNER_DECISIONS.md`
- **Design mockup:** `/app/frontend/public/local-printer-final.html` (Bill Content tab + Bill Style tab)
- **Source:** OWNER-REPORTED + AGENT-INVESTIGATED (API probed live 2026-08-27)
- **Confidence:** CONFIRMED — GET response verified, POST format verified, owner decisions locked

---

## Expected Behaviour

### Bill Content Tab
On open: GET `/bill-printer-config` → load toggles from `configs.58mm` as primary.
Also load `show_address_on_bill` + `footer_text` from profile/login (GET source TBD — OQ-1).

Left panel:
- Print Phone Number toggle
- Print Email toggle
- Show Address on Bill toggle  ← saved via `/update-settings`
- Dotted Line Between Items toggle
- Total Amount Bold toggle
- Total Amount Centred toggle
- Total Amount in Words toggle

Right panel:
- Footer Text input ← saved via `/update-settings`
- Physical Dimensions: Padding (number), Margin (number), Paper Width (number)

Save Bill Content → POST `/bill-printer-config` with `{ configs: { 58mm, 80mm, windows } }` all same toggle values + POST `/update-settings` for show_address + footer_text → success toast.

### Bill Style Tab
On open: GET `/bill-printer-config` (already loaded from Bill Content if same mount).
Sub-tabs: 2-inch (58mm), 3-inch (80mm), Windows.

Per sub-tab: table of 27 section rows.
- Android (58mm/80mm): Section | Height (input) | Width (input) | Bold (toggle)
- Windows: Section | Height (input) | Bold (toggle) — no Width column

Save Bill Style → POST `/bill-printer-config` `{ configs: { 58mm:{...}, 80mm:{...}, windows:{...} } }` with updated arrays → success toast.

---

## Execution Order (BATCH-09)

```
CR-167 → CR-160 → CR-161 → CR-351 → CR-169
```

CR-351 must come after CR-161 because `LocalPrinterSetupView.jsx` (host) is created by CR-161's batch. CR-351 adds its 2 tabs to that host.

---

**Backend:** API READY — GET + POST confirmed live ✅
**Frontend:** NONE for local printer path — build fresh
**Owner Decisions:** OD-1/2/3 LOCKED. OQ-1 deferred.
**Intake Status:** COMPLETE
**Next:** Gate 2 (Planning — Impact Analysis)
