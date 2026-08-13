# CR-116 — B2B Customer GST & Name Capture

**ID:** CR-116
**Type:** CR (New Feature)
**Created:** 2026-07-28
**Severity:** P1 (HIGH)
**Risk:** MEDIUM
**Module:** Collect Payment / Order Transform / Print
**Duplicate Check:** DISTINCT
**Code Reality:** NONE — `custGST: ''` and `custGSTName: ''` hardcoded empty at `orderTransform.js:2067-2068`. Zero input fields exist.
**Source:** OWNER-REPORTED (with screenshot showing empty fields in payload)
**Confidence:** CONFIRMED (grep verified 0 input fields)

---

## Description

For B2B customers, the system needs to capture:
- **Customer GST Number** (`custGST`)
- **Customer GST Registered Name** (`custGSTName`)

These fields already exist in the print payload (`orderTransform.js:2067-2068`) but are hardcoded to empty strings. No UI input fields exist anywhere in the collect bill or order flow.

Screenshots show the payload with `custGST: ""` and `custGSTName: ""`.

## Evidence

- Code: `orderTransform.js:2067-2068` — hardcoded empty
- Screenshots: Owner-provided showing empty custGST/custGSTName in payload
- Grep: 0 input/form fields for custGST anywhere in `src/components/`

## Blast Radius

- 2 files: `CollectPaymentPanel.jsx` (new input fields) + `orderTransform.js` (wire values)
- ~40-60 new lines
- Hotspot: YES — CollectPaymentPanel is part of order flow
- Scope: MEDIUM

## Owner Decisions Needed

1. Where should the B2B GST fields appear? On the Collect Bill panel? Customer selection?
2. Always visible or only when a B2B toggle is enabled?
3. Should custGST also be sent in the settle/collect-bill API payload (not just print)?
