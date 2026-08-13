# CR-129 Intake — Room Check-In: Document Preview & Selection from CRM

**ID:** CR-129
**Date:** 2026-08-05
**Source:** AGENT-DISCOVERED — INV-002 investigation report (`/app/memory/evidence/INV-001-002_INVESTIGATION_REPORT.md`)
**Confidence:** CONFIRMED — HIGH (CRM endpoints live-verified, FE UI confirmed absent)

---

## 1. Summary

The CRM backend has live, working endpoints for uploading and retrieving customer documents (`POST /pos/customers/{id}/documents`, `GET /pos/customers/{id}/documents`). `customerTransform.js` already parses the `documents` field from CRM lookup responses (shipped in CR-128 G1b). However, `RoomCheckInModal.jsx` has **zero UI** to display existing customer documents or upload new ones to CRM. This feature was intentionally deferred per owner decision Q7=B ("doc capture = separate CR"). This is that CR.

---

## 2. Classification

| Field | Value |
|---|---|
| Type | CR (Feature Gap — not a bug) |
| Severity | **P2 — MEDIUM** |
| Risk | **HIGH** |
| Risk reason | New API integration (CRM doc endpoints) + new UI component + modifies `RoomCheckInModal.jsx` (active, complex modal). Any regression in check-in flow is high-impact. |
| Fast Lane eligible | NO — new service file + new component + touches RoomCheckInModal |
| Classification | FEATURE_GAP — intentionally deferred per owner Q7=B |
| Sprint | pos_5_1 (backlog — needs Gate 2-3 before scheduling) |

**Severity rationale:** P2 — staff cannot see existing ID documents on file during check-in, forcing manual re-capture. Inconvenient but not blocking (check-in still works without documents).

---

## 3. Current State vs Required

| Component | What Exists | What's Missing |
|---|---|---|
| CRM Endpoints | `POST /pos/customers/{id}/documents` (upload) ✅ | — |
| | `GET /pos/customers/{id}/documents` (retrieve) ✅ | — |
| `customerTransform.js` | `documents` field parsed from `customerLookup` (CR-128 G1b) ✅ | — |
| `RoomCheckInModal.jsx` | `frontImage`/`backImage` state for NEW uploads to POS API ✅ | ❌ No `GET /documents` call on customer select |
| | | ❌ No preview/gallery of existing docs |
| | | ❌ No "already has docs" badge/indicator |
| | | ❌ No doc type picker for CRM upload |
| `documentService.js` | Does not exist | ❌ Needs `uploadDocument()` + `getDocuments()` |
| `DocumentPreview` component | Does not exist | ❌ Needs thumbnail grid, grouped by `doc_type` |

---

## 4. Proposed Scope

### Phase 1 — View Existing Docs (Read-Only)
- Create `documentService.js` with `getDocuments(customerId)` calling `GET /pos/customers/{id}/documents`
- On customer selected/looked up in RoomCheckInModal: fetch existing docs if `customer_id` is available
- Show thumbnail grid / badge: "X documents on file" with expandable preview
- Handle presigned URL 15-min expiry (refresh on expand)

### Phase 2 — Upload to CRM
- Wire `frontImage`/`backImage` uploads to `POST /pos/customers/{id}/documents`
- Map `idType` dropdown values → CRM `doc_type` enum:

| UI Label | CRM `doc_type` |
|---|---|
| Aadhaar | `aadhaar` |
| PAN | `pan_card` |
| Passport | `passport` |
| Driving Licence | `license` |
| Voter ID | `voter_id` |
| Other | `other` |

- Show upload progress + success confirmation
- Refresh preview after successful upload

---

## 5. Evidence

| Field | Value |
|---|---|
| Screenshot | Not provided |
| Steps to reproduce gap | 1. Open RoomCheckInModal. 2. Enter phone of existing customer with CRM documents on file. 3. Observe: no document section, no "already has docs" indicator. |
| CRM endpoint status | LIVE — both GET + POST confirmed working per INV-002 investigation |
| Source | AGENT-DISCOVERED via INV-002 investigation |
| Confidence | CONFIRMED (code grep returned 0 document UI files) |
| Evidence artifact | `/app/memory/evidence/INV-001-002_INVESTIGATION_REPORT.md` §INV-002 |

---

## 6. Duplicate Check

| Check | Result |
|---|---|
| `find /app/frontend/src -name "*document*"` | 0 results — no document UI exists |
| CR-076 | RELATED — Amazon S3 File Upload for Room Check-in docs. **PARKED/ABSORBED into CR-085** (inventory S3 scope). CR-076 was for S3 presigned URL flow; CR-129 is for CRM `/pos/customers/{id}/documents` endpoint. Different storage backend, different API contract. DISTINCT. |
| BUG-090 | RELATED — CRM customer_id not stored on room orders. Different symptom (missing ID vs missing doc UI). DISTINCT. |
| CR-128 | RELATED — B2B Customer CRM Wiring (IMPLEMENTED). CR-128 wired `documents` field parsing in transform; CR-129 builds the UI to display + upload those documents. Sequential dependency, DISTINCT scope. |
| **Verdict** | **DISTINCT** (CR-076 RELATED — different storage backend; CR-128 RELATED — upstream dependency) |

---

## 7. Blast Radius

```bash
grep -rn "frontImage\|backImage\|documents" /app/frontend/src/ → 29 references
```

| Metric | Value |
|---|---|
| New files to create | 2 (`api/services/documentService.js`, `components/modals/DocumentPreview.jsx` or inline) |
| Files to modify | 1 (`components/modals/RoomCheckInModal.jsx`) |
| Lines estimate | ~200–300 lines total (2–3 new files + ~60 lines in RoomCheckInModal) |
| Hotspot files touched | YES — RoomCheckInModal is a complex, active modal |
| Estimated scope | **MEDIUM** (2–3 new files + 1 modified hotspot) |

---

## 8. Code Reality

| Check | Result |
|---|---|
| `documentService.js` exists | NO |
| `DocumentPreview` component exists | NO |
| RoomCheckInModal doc section exists | NO (only `frontImage`/`backImage` for POS API upload) |
| CRM doc endpoints live | YES (INV-002 confirmed) |
| `customerTransform.js` parses `documents` | YES (CR-128 G1b) |
| **Code Reality** | **NONE** (zero UI built) |

---

## 9. Dependencies

| Dependency | Status |
|---|---|
| CR-128 (customerTransform `documents` field) | IMPLEMENTED ✅ |
| CRM `GET /pos/customers/{id}/documents` | LIVE ✅ |
| CRM `POST /pos/customers/{id}/documents` | LIVE ✅ |
| Customer `id` available at check-in | Conditional — requires successful CRM lookup (non-blocking per BUG-092 pattern; Phase 2 upload skipped if no `customer_id`) |
| **BUG-294** (CustomerModal non-blocking CRM) | INTAKE — recommend shipping BUG-294 first as it establishes non-blocking CRM pattern that Phase 1 of CR-129 should mirror in RoomCheckInModal |

---

## 10. Owner Decisions Needed at Planning (Gate 2)

| # | Question | Default if not answered |
|---|---|---|
| OQ-1 | Phase 1 and Phase 2 together in one CR, or Phase 1 first? | Plan for Phase 1 only; Phase 2 as follow-up CR |
| OQ-2 | Show doc preview for ALL customer lookups, or only when customer has existing docs? | Only when `documents.length > 0` |
| OQ-3 | What happens if presigned URL expires during preview session — silent re-fetch or show "Link expired" + refresh button? | Silent re-fetch on 403 |
| OQ-4 | Upload to CRM replaces or supplements the existing POS API `frontImage`/`backImage` upload? | Supplements (both paths active) |
| OQ-5 | Doc type picker: use existing `idType` dropdown values or separate picker? | Map existing idType to CRM enum |

---

## Intake Summary

```
Intake complete: CR-129
Classification: CR, Severity: P2, Risk: HIGH
Duplicate check: DISTINCT (CR-076 RELATED — different storage backend; CR-128 RELATED — upstream dependency)
Evidence: CONFIRMED via INV-002 (CRM endpoints live, FE code absence verified)
Blast radius: MEDIUM (~2–3 new files + 1 modified, ~200–300 lines, hotspot: RoomCheckInModal)
Code reality: NONE (zero document UI built)
Docs updated: change_requests/CR-129_ROOM_CHECKIN_DOCUMENT_PREVIEW_SELECTION_INTAKE.md
Next: Planning Gate 2 (owner decisions OQ-1 through OQ-5 required before plan)
```
