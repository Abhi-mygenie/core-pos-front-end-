# CR-380 — New PMS Check-In: Guest ID Documents

**ID:** CR-380
**Type:** CR (Change Request)
**Date registered:** 2026-09-12
**Role:** INTAKE (AGENT_PROMPT_ALPHA v0.7 §ROLE 1)
**Sprint:** pos_pms_1
**Gate:** 1 — INTAKE COMPLETE
**Depends on:** CR-379 (needs `customerId` from CRM link)

---

## Classification

| Field | Value |
|---|---|
| Type | CR — Feature Gap / Parity |
| Severity | **P1 — HIGH** (Document capture absent from new PMS flow; mandatory-doc rule cannot be enforced; CR-358 §7 document step never built) |
| Risk | **HIGH** — touches API contract (`pmsCheckIn` JSON → FormData change), customer data (ID document images to CRM), mandatory-doc logic, `pmsService.js` hotspot-adjacent file |
| Fast Lane eligible | NO (HIGH risk, API contract change, 3+ files, customer data) |
| Duplicate check | **DISTINCT** — CR-129 (docs-on-file viewer) and BUG-351 (skip rule) cover OLD `RoomCheckInModal` only. **RELATED to:** CR-129, BUG-351, CR-350 (source of the mandatory-doc toggle being reused), CR-379 (hard dependency) |
| Code reality | **NONE** — no document UI, no upload call, no FormData in `CheckInPage.jsx` or `pmsService.js` |
| Source | AGENT-DISCOVERED (Investigation `INV-PMS-CHECKIN-CRM-GAP_INVESTIGATION_REPORT_2026_09_12.md`) |
| Confidence | CONFIRMED |

---

## Description

The new PMS check-in sends `id_type: 'Select document type'` as a hard-coded placeholder and no document images. The old `RoomCheckInModal` captures front/back ID images, uploads them to CRM (`/pos/customers/{id}/documents`), sends them as FormData to the POS backend, shows a "docs on file" viewer for returning guests (CR-129), and respects a mandatory-upload toggle (CR-350/BUG-351).

None of this exists in the new flow. CR-358 intake §7 defined a document step that was explicitly deferred from P2 but never registered as a gap.

**Fix (this CR):**
1. Change `pmsCheckIn` from JSON → FormData (OD-3-B: same as old model).
2. Add guest ID capture UI to `CheckInPage`: id_type picker, front/back image upload.
3. Add CRM docs-on-file viewer (CR-129 pattern): if returning guest has docs in CRM → show them and allow skip.
4. Reuse CR-350 mandatory-doc toggle (`mygenie_room_id_upload_required`) for the PMS flow (OD-4-A).
5. Extra adults / children ID document images (OD-5-A carried from CR-379 scope for IDs specifically).

---

## Scope

### In scope
- `pmsService.pmsCheckIn`: JSON → FormData (OD-3-B). Add `id_type`, `front_image_file`, `back_image_file` fields. Parity with `roomService.checkIn` FormData shape.
- `CheckInPage.jsx`: id_type dropdown, front/back image upload inputs, upload preview.
- CRM docs-on-file viewer: `getDocuments(customerId)` on CRM customer match → show existing docs → allow skip (BUG-351 pattern).
- After check-in: `uploadDocument(customerId, docType, frontFile, backFile)` → CRM.
- Mandatory-doc rule: reuse `localStorage` key `mygenie_room_id_upload_required` (OD-4-A, CR-350 toggle). If toggle ON and no docs on file and no upload → block submit.
- Extra adult / child ID document capture (extension of OD-5-A).

### Out of scope
- CR-358 nationality-specific rules (OD-4-C was not chosen).
- Separate PMS mandatory-doc toggle (OD-4-B was not chosen).
- Badge / CRM lookup / `customer_id` propagation (→ CR-379).

### Files WILL change
| File | Change |
|---|---|
| `api/services/pmsService.js` | `pmsCheckIn`: JSON → FormData; add `id_type`, `front_image_file`, `back_image_file`, per-adult doc slots |
| `pages/pms/CheckInPage.jsx` | ID capture UI, docs-on-file viewer section, mandatory-doc validation, upload-after-checkin call |

### New files (likely 1)
| File | Purpose |
|---|---|
| `components/pms/GuestDocsSection.jsx` | Reusable docs-on-file + upload component (CR-129 pattern, PMS-specific props) |

### Files WILL NOT touch
`RoomCheckInModal.jsx` · `roomService.js` · `customerService.js` · `documentService.js` · `crmAxios.js` · `NewBookingPage.jsx`

---

## Owner Decisions — ALL LOCKED

| OD | Decision |
|---|---|
| OD-3 | **B — CRM + POS backend (FormData), same as old model.** `pmsCheckIn` changes from JSON → FormData. ID images go to CRM via `uploadDocument` AND as FormData files in the check-in request. |
| OD-4 | **A — Reuse existing CR-350 toggle.** Same `localStorage` key `mygenie_room_id_upload_required`. Returning guest with docs on file in CRM → skip upload (BUG-351 behavior). |
| OD-5 | **A — Include extra adult/child IDs now** (document images for extra adults; name capture is in CR-379). |

---

## Evidence

| Item | Path |
|---|---|
| Investigation report | `/app/memory/investigations/INV-PMS-CHECKIN-CRM-GAP_INVESTIGATION_REPORT_2026_09_12.md` |
| Hard-coded id_type evidence | `pmsService.js:152` — `id_type: 'Select document type'` |
| No FormData in new flow | `pmsService.js:133` comment — "Separate from roomService.checkIn() (FormData)" |
| Source | AGENT-DISCOVERED |
| Confidence | CONFIRMED |

---

## Blast Radius

| Metric | Value |
|---|---|
| Files WILL change | 2 (`CheckInPage.jsx`, `pmsService.js`) |
| New files | 1 (`GuestDocsSection.jsx`) |
| Hotspot files touched | YES — `pmsService.js` shared by CR-358-P3/P4/P5 |
| Estimated scope | **MEDIUM** (3 files total, ~100–150 lines) |

---

## Dependency

**Hard dependency on CR-379.** `uploadDocument(customerId, ...)` and the docs-on-file viewer both require a resolved `customerId` from CRM, which CR-379 provides. CR-380 cannot be implemented or planned until CR-379 is at Gate 4 GO minimum.

---

## Related Items

| ID | Relation |
|---|---|
| CR-379 | Hard dependency — must be Gate 4 GO before CR-380 planning starts |
| CR-129 | Implements same docs-on-file viewer for OLD flow. Pattern to reuse. |
| BUG-351 | Implements docs-on-file skip rule for OLD flow. Logic to reuse. |
| CR-350 | Source of `mygenie_room_id_upload_required` localStorage toggle (reused per OD-4-A). |
| CR-358 §7 | Original deferred document step spec — this CR delivers it for the new PMS flow. |

---

## Next Step

**→ Planning Gate 2 AFTER CR-379 reaches Gate 4 GO.**
Cannot begin impact analysis until CR-379 has an approved implementation plan (to know exact `customerId` prop shape passed to `CheckInPage`).
