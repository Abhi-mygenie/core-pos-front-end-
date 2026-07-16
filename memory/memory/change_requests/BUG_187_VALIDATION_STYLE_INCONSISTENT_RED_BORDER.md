# BUG-187: Validation Style Inconsistency — Red Border Missing on Customer Name

**Registered:** 2026-07-11
**Updated:** 2026-07-11 (Investigation complete)
**Source:** OWNER-REPORTED
**Confidence:** HIGH
**Duplicate check:** DISTINCT
**Risk:** LOW
**Severity:** P2
**Classification:** FE_BUG (CSS missing)

## Description
When customer name is mandatory for takeaway orders, the input field doesn't show a red border on validation failure. Only a toast/banner appears.

## Investigation Findings

**Code trace:**
- `CartPanel.jsx:818`: `const nameMissing = isNameRequired && !customerName.trim()` — flag EXISTS
- `CartPanel.jsx:1024`: placeholder changes to "Customer name *" when required
- **NO red border class** applied to the input when `nameMissing` is true
- The `nameMissing` flag is used for blocking submission but not for CSS styling

## Fix Required
- **FE ONLY** — add conditional className on the customer name input at ~L1024:
  `${nameMissing ? 'ring-2 ring-red-500 border-red-500' : ''}`
- ~5 lines, 1 file. Fast Lane eligible.

## Files
- `CartPanel.jsx` ~L1024
