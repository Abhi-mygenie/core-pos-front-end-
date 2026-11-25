# CR-477 — Ingredient Movement Report (Dispatched / Received)

**ID:** CR-477  **Type:** CR  **Registered:** 2026-10-28  **Sprint:** nov_cr_batch
**Severity:** P1  **Risk:** MEDIUM  **Status:** GATE_1_INTAKE_COMPLETE
**Source:** OWNER-PROVIDED (backend API spec: `dispatch-received.md`)

## Description
New report page: **Ingredient Movement Report** — shows stock transfers between stores (franchise ↔ central ↔ master). Two views via toggle: "Received" (what this store took in) and "Dispatched" (what this store sent out). Collapsible rows per ingredient with drill-down to individual transfer lines.

Backend endpoint is **live and verified** on preprod:
```
POST /api/v2/vendoremployee/inventory-transfer/ingredient-movement-report
```

## Duplicate Check
**DISTINCT.** CR-077 (Hierarchy Stock Transfer) is the operational transfer flow (receive/dispatch/dispute actions). This CR is a read-only *report* on the same transfer data. No overlap in code or UI.

## Evidence
- API spec: `dispatch-received.md` (owner-provided)
- Probe: Palm House `received` → 19 ingredients, 52 transfer lines ✅
- Probe: Palm House `dispatched` → 0 ingredients (expected — Palm House is a receiver, Palm Central dispatches) ✅
- Probe: Filtered by `stock_title` "Blue Tokai Attikan Coffee" → 12 kg, 8 lines ✅
- Confidence: CONFIRMED (API live, data shape verified)

## Code Reality
**NONE** — endpoint not in `api/constants.js`, no page/service/transform exists.

## API Contract

### Request
```json
POST /api/v2/vendoremployee/inventory-transfer/ingredient-movement-report
{
  "movement": "received" | "dispatched",
  "from_date": "YYYY-MM-DD",
  "to_date": "YYYY-MM-DD",
  "restaurant_id": 541,         // optional — filter to one store
  "stock_title": "Ingredient"   // optional — filter to one ingredient
}
```

### Response (no wrapper — body IS the report)
```json
{
  "movement": "received",
  "from_date": "2026-07-27",
  "to_date": "2026-10-28",
  "restaurant_id": 541,
  "ingredients": [
    {
      "stock_title": "Blue Tokai Attikan Coffee",
      "unit": "kg",
      "total_qty": 12,
      "line_count": 8,
      "lines": [
        {
          "transfer_id": 2,
          "reference_code": "TRF-808-2026-0002",
          "from_restaurant_id": 808,
          "from_restaurant_name": "Palm central",
          "to_restaurant_id": 541,
          "to_restaurant_name": "The Palm House",
          "dispatched_at": "2026-07-27 17:39:08",
          "received_at": "2026-08-05 08:49:04",
          "quantity": 2,
          "unit": "kg",
          "status": "received"
        }
      ]
    }
  ]
}
```

## UI Spec (from backend doc)

### Filters
- **Movement toggle**: `received` / `dispatched` (separate API calls, never combined)
- **Date range**: `from_date` / `to_date` (date picker)
- **Ingredient search**: optional `stock_title` filter (exact match)
- **Store picker**: optional `restaurant_id` (for central/master logins seeing multiple stores)

### Table — Collapsed Row
| Ingredient | Unit | Total Qty | Transfers |
|---|---|---|---|
| Blue Tokai Attikan Coffee | kg | 12 | 8 |

### Table — Expanded Row (drill-down)
| From Store | To Store | Dispatched | Received | Qty | Unit | Status |
|---|---|---|---|---|---|---|
| Palm Central | The Palm House | 27 Jul 17:39 | 05 Aug 08:49 | 2 | kg | received |

## Business Rules
1. **Never derive dispatched from received** — different date windows (`dispatched_at` vs `received_at`)
2. Same ingredient in different units (kg vs gm) = separate blocks, do NOT sum
3. Cancelled transfers excluded by backend
4. Store hierarchy: franchise sees self, central sees self + franchises, master sees all
5. `received_at` can be `null` on dispatched view (not yet received)
6. `reference_code` can be `null`

## Blast Radius
**MEDIUM** — new page, no existing code to conflict with.
- **New files (~4):** report page, service, transform, (optional) constants entry
- **Modified files (~2):** `api/constants.js` (add endpoint), `App.js` or sidebar (add route)
- No hotspot files touched

## Open Decisions
- **OD-477-01:** Where in the sidebar? Under Inventory section, or under Reports? (Inventory seems natural since it's about stock transfers)
- **OD-477-02:** Should the page support Excel/PDF export? (Other report pages have this)
- **OD-477-03:** Ingredient search — free text with suggestions, or dropdown of known ingredients?
- **OD-477-04:** Date range defaults — today, last 7 days, last 30 days, or custom only?
