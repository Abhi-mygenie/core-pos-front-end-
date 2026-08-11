# BACKEND_BRIEF_CR133_PRINTER_FIELD_CONFIG
## Printer Agent Config — Field Visibility / Alignment / Dynamic Row Content

**ID:** BACKEND_BRIEF_CR133_PRINTER_FIELD_CONFIG_2026_08_07
**Filed by:** FE Agent (E1)
**Date:** 2026-08-07
**Related CR:** CR-133 (Printer Agent Config Settings Screen)
**Priority:** P1 — HIGH
**Classification:** CONTRACT_EXTENSION
**Frontend Impact:** Field visibility, alignment, row-content UI already built in FE. Print agent must read new config keys to make actual prints reflect user settings.

---

## 1. Summary

The `printer-agent-config` endpoint (`GET + POST /api/v2/vendoremployee/restaurant-settings/printer-agent-config`) currently stores and returns font-size + bold configuration for bill/KOT print sections. Three new configuration capabilities are required so the print agent template can dynamically control what it renders.

| Capability | Config Key | Priority | Breaking? |
|---|---|---|---|
| **Field visibility** — show/hide specific fields on bill/KOT | `field_visibility` | P1 | NO — additive |
| **Alignment** — left/center/right per section row | `alignment` on each style row | P1 | NO — additive |
| **Row content** — which data field maps to bill_info row_1..4 | `content` on each info row | P2 | NO — additive |

All three are **additive** — existing print agent behaviour must not change until the print agent explicitly reads these new keys.

---

## 2. Architecture Context

```
FE (React POS)
  │
  │  POST /api/v2/vendoremployee/restaurant-settings/printer-agent-config
  │  { employee_id, settings_config, style_config }
  ▼
Backend (Laravel)
  │  Stores full JSON blob per restaurant
  │  Returns stored blob on GET
  ▼
Print Agent (Android / Windows native app)
  │  Reads stored printer-agent-config from backend
  │  Applies ESC-POS template using config values
  ▼
Thermal Printer (USB / LAN / Bluetooth)
```

**Current contract:**
- `style_config.bill_print_style.*` — font_size_58mm, font_size_80mm, bold only
- `style_config.kot_print_style.*` — same
- Print agent template layout is **hardcoded** — only sizes/bold are dynamic

**Required change:**
- Print agent must read new optional keys when present
- Fallback to current hardcoded behaviour when keys are absent (backwards-compatible)

---

## 3. Contract Addition A — Field Visibility

### 3.1 New key location
Inside `settings_config` (top-level, alongside `auto_printing`, `printers`, etc.):

```json
"field_visibility": {
  "bill": {
    "show_waiter_name":      true,
    "show_customer_name":    true,
    "show_customer_phone":   false,
    "show_order_note":       true,
    "show_token_number":     true,
    "show_gst_breakdown":    true,
    "show_cgst_sgst_split":  true,
    "show_service_charge_line": true,
    "show_discount_line":    true,
    "show_coupon_line":      false,
    "show_tip_line":         true,
    "show_delivery_address": true,
    "show_upi_qr":           false,
    "show_feedback_qr":      false,
    "show_bill_footer":      true
  },
  "kot": {
    "show_waiter_name":   true,
    "show_customer_name": false,
    "show_order_note":    true,
    "show_station":       true,
    "show_item_notes":    true,
    "show_token_number":  true,
    "show_date_time":     true
  }
}
```

### 3.2 Field definitions

**Bill fields:**

| Key | Corresponding print payload field | Default |
|---|---|---|
| `show_waiter_name` | `waiterName` | true |
| `show_customer_name` | `custName` | true |
| `show_customer_phone` | `custPhone` | false |
| `show_order_note` | `orderNote` | true |
| `show_token_number` | `daily_token` | true |
| `show_gst_breakdown` | `gst_tax`, `cgst_amount`, `sgst_amount`, `vat_tax` line | true |
| `show_cgst_sgst_split` | Show CGST + SGST as two lines vs single GST line | true |
| `show_service_charge_line` | `serviceChargeAmount` line | true |
| `show_discount_line` | `discount_amount` line | true |
| `show_coupon_line` | `coupon_code` + `coupon_discount` lines | false |
| `show_tip_line` | `Tip` line | true |
| `show_delivery_address` | `deliveryCustAddress/Name/Phone/Pincode` block | true |
| `show_upi_qr` | UPI QR code at bottom | false |
| `show_feedback_qr` | Feedback QR code at bottom | false |
| `show_bill_footer` | Footer text line | true |

**KOT fields:**

| Key | What it hides | Default |
|---|---|---|
| `show_waiter_name` | Waiter name header row | true |
| `show_customer_name` | Customer name on KOT | false |
| `show_order_note` | Order-level note | true |
| `show_station` | Station name in header | true |
| `show_item_notes` | Per-item food_level_notes | true |
| `show_token_number` | Daily token number | true |
| `show_date_time` | Date/time in KOT header | true |

### 3.3 Print agent behaviour
- If key is **absent** from config → treat as `true` (backwards-compatible default)
- If key is `false` → omit that element from ESC-POS output entirely (no blank line, no label)
- Keys that are `true` but data is empty (e.g., `waiterName: ''`) → still omit (existing behaviour)

---

## 4. Contract Addition B — Alignment per style row

### 4.1 Current structure (unchanged)
```json
"restaurant_name": {
  "font_size_58mm": 11,
  "font_size_80mm": 17,
  "bold": "Yes"
}
```

### 4.2 New structure (additive — add `alignment` key)
```json
"restaurant_name": {
  "font_size_58mm": 11,
  "font_size_80mm": 17,
  "bold": "Yes",
  "alignment": "center"
}
```

### 4.3 Valid values
`"left"` | `"center"` | `"right"`

### 4.4 Applies to ALL style rows in both bill and KOT
Every entry in `bill_print_style.*` and `kot_print_style.*` may carry an `alignment` key.

### 4.5 Default values per section (if key absent)

| Section | Default alignment |
|---|---|
| `restaurant_header.*` | `"center"` |
| `bill_information.*` | `"left"` |
| `item_table.table_header` | `"center"` |
| `item_table.table_content` | `"left"` |
| `amount_section.*` | `"right"` |
| `footer.*` | `"center"` |
| `kot_header.kot_title` | `"center"` |
| `kot_information.*` | `"left"` |
| `kot_item_table.*` | `"left"` |

### 4.6 ESC-POS alignment commands
```
left:   ESC a 0  (or \x1Ba\x00)
center: ESC a 1  (or \x1Ba\x01)
right:  ESC a 2  (or \x1Ba\x02)
```
Must reset to left (`ESC a 0`) after each section to avoid carry-over.

---

## 5. Contract Addition C — Dynamic row content for bill_information / kot_information

### 5.1 Problem
`bill_information.row_1..4` and `kot_information.row_1..4` currently only store font/bold. What content appears in each row is **hardcoded** in the print agent template. This prevents FE from configuring which data field goes in which info row.

### 5.2 New structure (additive — add `content` + `visible` keys)
```json
"bill_information": {
  "row_1": {
    "content":       "order_number_date",
    "visible":        true,
    "font_size_58mm": 6,
    "font_size_80mm": 7,
    "bold":           "No",
    "alignment":      "left"
  },
  "row_2": {
    "content":        "table_waiter",
    "visible":        true,
    "font_size_58mm": 6,
    "font_size_80mm": 7,
    "bold":           "No",
    "alignment":      "left"
  },
  "row_3": {
    "content":        "customer_name",
    "visible":        true,
    "font_size_58mm": 6,
    "font_size_80mm": 7,
    "bold":           "No",
    "alignment":      "left"
  },
  "row_4": {
    "content":        "order_note",
    "visible":        false,
    "font_size_58mm": 6,
    "font_size_80mm": 7,
    "bold":           "No",
    "alignment":      "left"
  }
}
```

### 5.3 Valid content values for bill_information rows

| Value | Renders |
|---|---|
| `"order_number_date"` | `#00142  12/Aug/2026 7:30 PM` |
| `"table_waiter"` | `Table: T-5  Waiter: Ravi` |
| `"customer_name"` | `Customer: John Doe` |
| `"customer_phone"` | `Phone: 9876543210` |
| `"order_note"` | `Note: <order_note>` |
| `"order_type"` | `Dine In / Takeaway / Delivery / Room` |
| `"payment_method"` | `Payment: UPI` |
| `"token_number"` | `Token: #42` |
| `"empty"` | Blank line (intentional spacer) |

### 5.4 Valid content values for kot_information rows

| Value | Renders |
|---|---|
| `"order_number"` | `Order #: 00142` |
| `"table_channel"` | `Table: T-5 (Dine In)` |
| `"waiter"` | `Waiter: Ravi Kumar` |
| `"station"` | `Station: KDS` |
| `"date_time"` | `12/Aug/2026 7:30 PM` |
| `"customer_name"` | `Customer: John Doe` |
| `"order_note"` | `Note: Extra napkins please` |
| `"token_number"` | `Token: #42` |
| `"empty"` | Blank line |

### 5.5 Backwards compatibility
- If `content` key is absent → print agent uses current hardcoded content for that row
- If `visible: false` → skip the row entirely (no blank line)
- If `visible` key is absent → treat as `true`

---

## 6. GET Response Contract (what backend must return)

Backend must return all new keys in the GET response. If the restaurant has not yet saved these settings, return safe defaults:

```json
"field_visibility": {
  "bill": {
    "show_waiter_name": true,
    "show_customer_name": true,
    "show_customer_phone": false,
    "show_order_note": true,
    "show_token_number": true,
    "show_gst_breakdown": true,
    "show_cgst_sgst_split": true,
    "show_service_charge_line": true,
    "show_discount_line": true,
    "show_coupon_line": false,
    "show_tip_line": true,
    "show_delivery_address": true,
    "show_upi_qr": false,
    "show_feedback_qr": false,
    "show_bill_footer": true
  },
  "kot": {
    "show_waiter_name": true,
    "show_customer_name": false,
    "show_order_note": true,
    "show_station": true,
    "show_item_notes": true,
    "show_token_number": true,
    "show_date_time": true
  }
}
```

Style rows must return `alignment` key with defaults as specified in §4.5.
Info rows must return `content` and `visible` keys with defaults as specified in §5.5.

---

## 7. Phase 4 — Section Order (file separately when Phase 3 is scoped)

The following key is reserved for a future Phase 3 CR. Do NOT implement yet — document only.

```json
"bill_section_order": [
  "restaurant_header",
  "bill_info_rows",
  "item_table",
  "amount_section",
  "delivery_section",
  "room_section",
  "footer"
]
```

When implemented, print agent renders sections in the array order instead of hardcoded order.

---

## 8. Frontend Status

- FE UI for field_visibility, alignment, row content is **built and ready**
- All config keys are included in POST body from the FE side
- `printer-agent-config` API already stores and returns arbitrary JSON
- Live preview in FE already respects field_visibility, alignment, row content
- Actual printed receipts will only reflect these settings **after print agent is updated**

---

## 9. Testing Scenarios (for backend + print agent QA)

| # | Scenario | Expected |
|---|---|---|
| T1 | Set `show_waiter_name: false`, save, print bill | Waiter row must not appear on printed receipt |
| T2 | Set `show_cgst_sgst_split: false`, save, print bill | Single "GST: ₹26" line instead of CGST + SGST split |
| T3 | Set `restaurant_name.alignment: "left"`, print | Restaurant name left-aligned instead of centered |
| T4 | Set `bill_information.row_1.content: "customer_name"`, print | Row 1 shows customer name instead of order number |
| T5 | Set `bill_information.row_4.visible: false`, print | Row 4 absent from receipt — no blank line |
| T6 | Old print agent (no new keys) loads new config | Falls back to hardcoded defaults — no crash |
| T7 | GET on restaurant with no saved config | Returns all defaults with all new keys present |

---

## 10. Endpoint Reference

```
GET  /api/v2/vendoremployee/restaurant-settings/printer-agent-config
POST /api/v2/vendoremployee/restaurant-settings/printer-agent-config
```

Auth: `Bearer <token>` (vendoremployee auth)
Content-Type: `application/json`

No new endpoints required — all changes are additive fields to existing payload.


---

## 11. Audit Corrections (2026-08-07 — Post-Gate-2 Curl Probe)

After a full end-to-end curl probe of the live endpoint, the following fields were found missing from the original design. These corrections are documented here for the backend/print-agent team.

### Newly Discovered Fields in API Response

| Field | Location | Behaviour |
|---|---|---|
| `api_authentication.api_token` | `settings_config` | Empty string currently — FE passes through unchanged, never user-editable |
| `auto_printing.auto_settle` | `settings_config.auto_printing` | `"Yes"/"No"` string — FE now exposes as a toggle in Auto Print settings |
| `qr_codes.upi_dynamic_enabled` | `settings_config.qr_codes` | `"Yes"/"No"` string — FE now exposes as a toggle in Bill Content settings |
| `style_row.windows{}` | Every row in `bill_print_style` + `kot_print_style` | Platform-specific font sizes for Windows print agent — FE passes through unchanged |
| `style_row.android{}` | Every row in `bill_print_style` + `kot_print_style` | Platform-specific font sizes for Android print agent (1-2pt scale) — FE passes through unchanged |
| `global_settings.windows{}` | `style_config.global_settings` | Windows-specific margin/logo/QR sizes — FE passes through unchanged |
| `global_settings.android{}` | `style_config.global_settings` | Android-specific sizing including `size_scale_range:[1,8]` — FE passes through unchanged |

### Platform Sub-Object Shape (confirmed live)

```json
// Every style row has this 3-part shape:
"restaurant_name": {
  "windows": { "font_size_58mm": 11, "font_size_80mm": 14, "bold": "Yes" },
  "android": { "font_size_58mm": 2,  "font_size_80mm": 2,  "bold": "Yes" },
  "font_size_58mm": 11,
  "font_size_80mm": 17,
  "bold": "Yes"
}
// FE only edits top-level values. windows/android are platform-specific and passed through.
```

### Confirmed: New Phase 2 Keys Are Stored

Verified via POST → GET cycle:
- `field_visibility` (with `show_waiter_name`, `show_customer_phone` etc.) — **stored and returned** ✅
- `alignment` on style rows — **stored and returned** ✅  
- `content` + `visible` on info rows — **stored and returned** ✅

Backend stores arbitrary new keys in the JSON blob — Phase 2 print agent only needs to read them.
