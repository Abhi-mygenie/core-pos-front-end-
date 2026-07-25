# CR-104 — Item-Level Complementary Reason (Mandatory Note per Food Item)

**ID:** CR-104
**Type:** CR
**Created:** 2026-07-25
**Severity:** P2
**Risk:** MEDIUM
**Module:** Order Entry — Collect Bill (`CollectPaymentPanel.jsx`, `OrderEntry.jsx`)
**Duplicate Check:** RELATED to CR-058 (Order-level Mark Complimentary + mandatory note — INTAKE, 2026-07-04). DISTINCT: CR-058 is bulk order-level comp. CR-104 is per-item checkbox comp requiring reason.
**Code Reality:** NONE — no reason input exists. Current toggle at `OrderEntry.jsx:793` just flips `isComplementaryRuntime` boolean, no note captured.
**Source:** OWNER-REPORTED (session 2026-07-25)
**Confidence:** CONFIRMED (code trace: toggle is a bare boolean flip, no reason field)
**Status:** INTAKE — BACKEND-BLOCKED (no API field for per-item complementary reason)

---

## Description

When marking a food item as complementary (checkbox in Collect Bill), a mandatory reason/note should be required. Currently the checkbox simply toggles `isComplementaryRuntime` without any explanation.

### Current Flow
```
User checks complementary checkbox on item
  → OrderEntry.jsx:793 flips isComplementaryRuntime = !isComplementaryRuntime
  → Item price zeroed in bill
  → No reason captured, no audit trail
```

### Expected Flow
```
User checks complementary checkbox on item
  → Prompt/input for complementary reason (e.g., "Guest complaint", "Manager discretion", "Taste issue")
  → Reason stored with the item
  → Reason sent to backend on settle/update
  → Reason visible in reports (Discount Report, Comp Detail)
```

---

## Backend Ask (BLOCKING)

The backend currently has no field for per-item complementary reason. Needs:

1. **Accept field on order update/settle:** `complementary_reason` (or `complementary_note`) per `order_details` line item
2. **Store:** persist alongside `is_complementary` flag
3. **Return:** include in order detail responses for reports/audit

### Backend Brief Amendment Needed
Append to `BACKEND_BLOCKERS_BRIEF_2026_07_22.html` with:
- Endpoint: PUT `/order-status-update` or equivalent settle endpoint
- New field: `order_details[].complementary_reason` (string, required when `is_complementary: "Yes"`)
- Return: include in GET order detail responses

---

## Evidence

- `OrderEntry.jsx:793` — bare boolean toggle: `return { ...item, isComplementaryRuntime: !item.isComplementaryRuntime }`
- `CollectPaymentPanel.jsx:32` — `onToggleComplimentary` prop, no reason param
- `CollectPaymentPanel.jsx:1838-1844` — checkbox with no reason input
- `orderTransform.js` `buildBillPrintPayload` — uses `isComplementary` flag but no reason field

---

## Blast Radius

- FE files to change: `OrderEntry.jsx` (toggle handler), `CollectPaymentPanel.jsx` (reason input UI), `orderTransform.js` (add reason to payloads)
- Scope: MEDIUM (3 files, R5 hotspot overlap)
- Hotspot: YES — OrderEntry.jsx and CollectPaymentPanel.jsx are both R5

---

## Open Questions

| # | Question | Blocking? |
|---|----------|-----------|
| OQ-1 | What UI for reason input? A) Inline text field next to checkbox. B) Small modal/popover on check. C) Dropdown with predefined reasons + "Other" free text. | YES — determines UI scope |
| OQ-2 | Should reason be mandatory (block if empty) or optional (allow empty)? | YES |
| OQ-3 | Merge with CR-058 (order-level comp)? Or keep separate (item-level)? | NO — can be separate |

---

## Next
Backend brief filed → Backend provides API field → Resolve OQ-1/OQ-2 → Planning Gate 2 → Gate 3
