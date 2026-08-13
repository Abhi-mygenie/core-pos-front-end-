# BUG-135: Bulk Editor — Save Errors: Inactive Status Not Persisting + Error Messages Not Surfacing Backend Description

**ID:** BUG-135
**Type:** Bug
**Status:** INTAKE COMPLETE
**Priority:** P1 (HIGH) — staff can't manage menu items effectively; error messages hide the real problem
**Area:** Menu Management → Bulk Editor
**Sprint:** POS 5.0
**Created:** 2026-06-15
**Source:** OWNER-REPORTED
**Confidence:** CONFIRMED (3 screenshots with evidence)

---

## Sub-Items

### A: Setting item inactive (Status → Off) and saving fails

**Symptom:** In Bulk Editor, changing an item's Status to "Off" (inactive) and clicking Save → fails with "Partial Save: 0 saved, 6 failed. Failed items remain editable."

**Evidence:** Screenshot 1 — "Bhaji" row 1 set to Off. 6 "Bombil fry" rows below also show red error indicators (⚠), category shows `—`. Toast: "Partial Save: 0 saved, 6 failed."

**Hypothesis:**
1. The `status` field payload may not be mapping correctly for the inactive toggle (e.g., sending wrong value like `0` vs `"Inactive"` vs the API-expected format)
2. The 6 "Bombil fry" rows have no category (`—`) which may be a required field causing validation failure — the inactive toggle failure may be a side-effect of batch save where ALL items fail if any one fails

**Investigation needed:** Check `BulkEditor.jsx` save handler — what payload does it build for status changes? What does the API expect for `status` field?

---

### B: Import error shows generic "Import failed" instead of backend error description

**Symptom:** When importing an Excel file with duplicate rows, backend returns a clear error:
```json
{ "errors": "Duplicate row in file: Fish Amritsari (8 pcs) Non-Veg (Normal) appears more than once in the uploaded file." }
```
But FE toast shows only: **"Error: Import failed."**

**Evidence:** Screenshot 2 — Network tab shows `errors` field with descriptive message. Toast shows generic "Import failed."

**Root cause (likely):** Import error handler catches the error but doesn't extract `response.data.errors` or `response.data.message` — uses a hardcoded fallback string instead.

**Fix scope:** Import handler in `BulkEditor.jsx` — extract backend error message from response and show in toast.

---

### C: Duplicate item save shows generic 422 error instead of backend description

**Symptom:** When saving an item that duplicates an existing item name, backend returns 422 with a validation error. FE shows: **"Error: Request failed with status code 422"** — the raw Axios error message, not the backend's description.

**Evidence:** Screenshot 3 — Red toast "Request failed with status code 422" on pos-uat.mygenie.online.

**Root cause (likely):** The save handler's error catch block uses `err.message` (Axios default) instead of `err.response?.data?.message` or `err.response?.data?.errors` — the backend's actual error text.

**Fix scope:** Save error handler in `BulkEditor.jsx` — extract backend error/message from 422 response.

---

## Duplicate Check

- **DISTINCT** — no existing bug covers these specific symptoms
- **RELATED to:** BUG-120 (CR-014 post-delivery, CLOSED), CR-036/FU-01 (validation UX, CLOSED), CR-036-FU-03 (tax validation, Gate 3)
- Same file (`BulkEditor.jsx`) but different code paths (save handler, import handler, error extraction)

## Blast Radius

- **Estimated scope:** SMALL (1 file — `BulkEditor.jsx`)
- **Hotspot files touched:** NO (BulkEditor is not on R5 hotspot list)
- **Key code paths:**
  - Save handler: `handleSave` function
  - Import handler: import file upload logic
  - Error extraction: catch blocks in both handlers

## Open Questions

None — screenshots provide clear evidence. Backend error messages are visible in network tab.

## Routing

→ **INVESTIGATION** (trace save handler + import handler error extraction in BulkEditor.jsx) → then **PLANNING** if code change needed.
