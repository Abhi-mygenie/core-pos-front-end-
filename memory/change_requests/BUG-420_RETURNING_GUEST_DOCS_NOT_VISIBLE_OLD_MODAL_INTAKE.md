# BUG-420 — Returning Guest ID Document Not Visible in Old Check-In Module (CR-129 Gap)
**ID:** BUG-420
**Date:** 2026-09-16
**Source:** OWNER-REPORTED (ss3 screenshot + verbal description)
**Confidence:** REPORTED (gap confirmed by owner; exact code gap TBD at Gate 2)

## Description
When a returning guest checks in via the OLD check-in module (`RoomCheckInModal`), their previously uploaded ID document should be visible/prefilled so staff can see and verify it. Currently, documents are NOT visible even when a matching CRM guest is found.

Owner notes: "if old guest comes back the document should be visible(prefilled) for recheck, currently i cannot see actual document its already happening in old check in module. if additional document is needed user can select additional or also overwrite but its not mandatory since doc is already there"

CR-129 was implemented (GATE_5B_QA_PASS) and was supposed to cover "Document Preview & Selection from CRM." Gap is present — exact cause to be determined in Gate 2 Impact Analysis.

## Classification
- **Type:** BUG (gap in implemented CR)
- **Severity:** P1 — HIGH (security/compliance — staff cannot verify guest ID without re-uploading)
- **Risk:** HIGH (customer data, ID documents, CRM integration)
- **Related:** CR-129 (GATE_5B_QA_PASS — implemented but gap found), CR-380 (new CheckInPage docs)
- **Duplicate check:** RELATED to CR-129. DISTINCT — CR-129 was supposed to fix this but a gap remains in the OLD modal.
- **Fast Lane:** NO (CRM integration, customer data)

## Evidence
- Screenshot: ss3 (owner, 2026-09-16) — old check-in module, returning guest, documents not visible
- Owner statement: "already happening in old check in module"
- Code reality: CR-129 code exists in `RoomCheckInModal.jsx` (lines 347, 468, 994) — but gap present
- Source: OWNER-REPORTED | Confidence: REPORTED

## Code Reality
**PARTIAL** — CR-129 markers exist in `RoomCheckInModal.jsx`. The exact gap (wrong field, API not returning URL, rendering condition) to be identified at Gate 2.

## Blast Radius
- `RoomCheckInModal.jsx` — primary (CR-129 implementation lives here)
- Possibly `documentService.js` (if URL field mapping is the gap)
- Estimated scope: SMALL (1–2 files)

## Owner Decisions Needed
- OD-420-01: Should existing documents be shown as image thumbnails, or just as a "verified" badge with doc type + date?
- OD-420-02: Is uploading a new doc OPTIONAL when docs are on file (confirms owner's statement above)?

## Next
Gate 2 — Impact Analysis (investigate CR-129 gap in RoomCheckInModal)
