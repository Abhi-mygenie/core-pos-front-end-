# Owner Decisions — Local Printer Setup (Bill Content + Bill Style)

**Context:** CR for Local Printer Setup — Bill Content tab + Bill Style tab
**Endpoint:** `GET/POST /api/v2/vendoremployee/restaurant-settings/bill-printer-config`
**Session:** 2026-08-27

---

## Confirmed API Contract

### GET response shape
```
{
  "data": {
    "configs": {
      "58mm":    { ...fields... }   // plateform: "android"
      "80mm":    { ...fields... }   // plateform: "android"
      "windows": { ...fields... }   // plateform: "windows"
    }
  }
}
```

### Bill Content toggles (stored inside EACH config)
| API field | UI label | Type |
|---|---|---|
| `print_phone` | Print Phone Number | "Yes"/"No" |
| `print_email` | Print Email | "Yes"/"No" |
| `dotted_line_between_item` | Dotted Line Between Items | "Yes"/"No" |
| `total_amount_bold` | Total Amount Bold | "Yes"/"No" |
| `total_amount_placed_center` | Total Amount Centred | "Yes"/"No" |
| `total_amount_in_word` | Total Amount in Words | "Yes"/"No" |
| `padding` | Padding | number |
| `margin` | Margin | number |
| `paperwidth` | Paper Width | number |

### Bill Style section fields (per paper size)
- Android (58mm + 80mm): `[height, width, bold]` — 3 elements
- Windows: `[height, bold]` — 2 elements
- 27 sections per config (restaurant_logo, restaurant_title, ... powered_by_mygenie)

### Fields NOT in /bill-printer-config (go via /update-settings)
| UI field | API field | Endpoint |
|---|---|---|
| Show Address on Bill | `show_address_on_bill` | POST /update-settings → `{"basic":{"show_address_on_bill":"Yes"}}` |
| Footer Text | `footer_text` | POST /update-settings → `{"basic":{"footer_text":"..."}}` (multipart form) |

---

## OWNER DECISIONS (confirmed 2026-08-27)

### OD-1 — Bill Content toggles: save to all 3 configs simultaneously ✅ CONFIRMED
**Question:** The Bill Content tab shows one global set of toggles (Print Phone, Print Email, etc.)
but the API stores them inside each of the 3 configs (58mm, 80mm, windows). When user saves,
which config(s) get updated?

**Owner answer:** **Option A — Save same value to ALL 3 configs (58mm + 80mm + windows) in one go.**

**Implementation note:**
On "Save Bill Content":
- POST /bill-printer-config 3 times (one per bill_size), each with the same toggle values
- OR: send one POST with all 3 configs in body if API supports batch (confirm at Gate 3)
- Single set of toggles in UI state — no per-paper-size split for Bill Content

---

---

## OD-4 — Fixed Mode: show employee picker ✅ CONFIRMED (owner 2026-08-27)

**Decision:** When "Fixed" mode card is selected, an employee picker appears below the 3 mode cards.
When "Waiter" or "Station" is selected, the picker is hidden.

**Employee picker behaviour:**
- Section title: "FIXED STATION EMPLOYEE"
- Subtitle: "Which employee handles all fixed station orders?"
- Employee chips from `employees[]` in GET response
- Chip where `fixed_station: "Yes"` = pre-highlighted on load
- Click chip → immediate POST `{ printing_option:"Fixed", employee_id: empId, restaurant_id }`
- Toast: "Fixed station updated"

**Design mockup updated:** `/app/frontend/public/local-printer-final.html`

**Impact Analysis updated:** `/app/memory/impact/CR-161_IMPACT_ANALYSIS.md` — §1 Part B, §2 Part B, §7, §10 verification matrix

---: single call with all 3 configs ✅ CONFIRMED (curl 2026-08-27)

**Question:** Does POST accept all 3 bill_sizes in one request or 3 separate calls?

**Curl result:**
- Array of 3 objects → FAILS ("bill_size field is required")
- `{ "configs": { "58mm": {...}, "80mm": {...}, "windows": {...} } }` → **SUCCESS** ✅

**Confirmed POST shape:**
```json
{
  "configs": {
    "58mm":    { "print_phone": "Yes", "print_email": "No", ... },
    "80mm":    { "print_phone": "Yes", "print_email": "No", ... },
    "windows": { "print_phone": "Yes", "print_email": "No", ... }
  }
}
```
All 3 configs returned in response — one call saves all. No need for 3 separate POSTs.

---

## OD-3 — show_address_on_bill + footer_text: global ✅ CONFIRMED (owner 2026-08-27)

**Q3 confirmed:** `show_address_on_bill` and `footer_text` are **global** — same value for all paper sizes.
Displayed once in Bill Content tab, no paper-size sub-tabs for these fields.

---

## DEFERRED — Q2: Where to READ show_address_on_bill + footer_text from

**Owner decision (2026-08-27):** Deferred — do not block Gate 2/3 on this.
**Note for implementation agent:** Source GET endpoint unknown. Use whatever is available at implementation time (login response / profile API). Do not block on this.
