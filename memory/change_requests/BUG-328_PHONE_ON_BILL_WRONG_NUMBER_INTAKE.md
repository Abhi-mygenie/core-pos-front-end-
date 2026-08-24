# BUG-328 — Phone on Bill: Wrong Number Prints on Receipt

**ID:** BUG-328  
**Type:** BUG  
**Severity:** P1 — HIGH  
**Risk:** HIGH (bill content — customer-facing printed output)  
**Area:** Print / Bill / Restaurant Settings  
**Sprint:** POS 5.x  
**Created:** 2026-08-18  
**Source:** INVESTIGATION (INV-AUG18-2026, INV-2)  
**Duplicate check:** DISTINCT  

---

## Description

Owner sets "Phone on Bill" in Restaurant Settings Step 1 (field shows `9990818342` in screenshot). A **different phone number** prints on actual bills. The number that prints is NOT the one saved in "Phone on Bill".

## Evidence

- Screenshot: "Phone on Bill" field shows `9990818342` in Restaurant Settings step 1
- Investigation report: `/app/memory/INV-AUG18-2026_INVESTIGATION_REPORT.md` § INV-2
- Source: OWNER-REPORTED
- Confidence: MEDIUM (root cause traced, needs backend confirmation)

## Root Cause (from investigation)

Two separate phone fields from two separate API endpoints:

| Field | API | Used For |
|---|---|---|
| `basic.phone_number_on_bill` | Restaurant Settings API | What owner sets as "Phone on Bill" |
| `settings_config.restaurant_information.phone_number` | Printer Config API (`/api/v2/…/printer-agent-config`) | What printer agent actually reads and prints |

These are independent fields. When owner updates "Phone on Bill" in Restaurant Settings, the printer config's `restaurant_information.phone_number` is **not updated**. The printer agent reads the stale/different phone value.

`BillContentTab.jsx:69` displays this read-only: `config.restaurantInfo.phone` — text says *"Printed on bill header (managed in Restaurant Info)"*.

## Blast Radius

- Frontend: `printerAgentConfigTransform.js:253`, `BillContentTab.jsx:69` — read-only display (no FE change needed)
- Backend: requires sync of `phone_number_on_bill` → `restaurant_information.phone_number`
- Hotspot files: NO

## Classification

**BACKEND_BUG** — backend must sync `basic.phone_number_on_bill` into the printer agent config endpoint's `restaurant_information.phone_number`.

## Backend Brief Required

```
Endpoint (read):  GET /api/v2/vendoremployee/restaurant-settings/printer-agent-config
Field:            settings_config.restaurant_information.phone_number

Endpoint (write): POST restaurant settings → basic.phone_number_on_bill

Problem: phone_number_on_bill change does NOT update restaurant_information.phone_number
Ask: Please sync phone_number_on_bill → restaurant_information.phone_number on save
```

## FE Action

None pending backend fix. Once backend syncs the field, `BillContentTab` read-only display will update automatically on next config load.

## Open Questions

- OQ-1: Does `restaurant_information.phone_number` currently come from `basic.phone` or a different source?

## Next: Gate 2 (Planning) — Backend Brief → Backend Team
