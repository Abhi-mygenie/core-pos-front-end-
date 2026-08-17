# Investigation Report — INV-001 + INV-002

**Date:** 2026-08-05
**Items:**
- INV-001: CRM token null → check-in / order flow blocked
- INV-002: No document preview / existing doc selection at check-in

---

## INV-001: CRM Token Handling When Missing

### Hypothesis Testing

| # | Hypothesis | Status | Evidence |
|---|-----------|--------|---------|
| H1 | Palmhouse login never includes `crm_token` | **ELIMINATED** | Login now returns `dp_live_goNzoZGoDaeP5Cvb...` (provisioned by owner). Saved: `evidence/INV-001-CRM-TOKEN/palmhouse_login_response.json` |
| H2 | FE drops/mishandles `crm_token` | **ELIMINATED** | `authTransform.js:21` maps `api.crm_token` → `authData.crmToken`. `authService.js:24` calls `setCrmToken(authData.crmToken)`. `sessionStorage` persists across refresh. Code is correct. |
| H3 | CRM 401 blocks user in order flow (CustomerModal) | **CONFIRMED** | See root cause below |

### Root Cause — CONFIRMED (HIGH confidence)

**Two different CRM error handling patterns exist in the codebase:**

| Flow | File | CRM Error Handling | User Impact |
|------|------|--------------------|-------------|
| **Room Check-In** | `RoomCheckInModal.jsx:612` | ✅ Non-blocking `try/catch` + `console.warn` → proceeds without `customer_id` | **No block** — check-in succeeds |
| **Order Flow** | `CustomerModal.jsx:285,307,352` | ❌ **BLOCKING** — CRM errors throw to outer catch → `setError('Failed to save customer')` | **USER BLOCKED** — cannot save customer |

**3 unprotected CRM calls in CustomerModal.jsx:**

| Line | Call | Protection | 401 Behavior |
|------|------|-----------|-------------|
| L285 | `await updateCustomer(...)` | NONE | Throws → outer catch L379 → "Failed to save customer" |
| L307 | `await lookupCustomer(...)` | Partial (CRM_TIMEOUT only) | 401 re-thrown at L319 → outer catch L379 → "Failed to save customer" |
| L352 | `await createCustomer(...)` | NONE | Throws → outer catch L379 → "Failed to save customer" |

**Compare with RoomCheckInModal (correct pattern, BUG-092):**
```js
try {
  const existing = await lookupCustomer(phone10);
  ...
} catch (crmErr) {
  console.warn('[RoomCheckIn] BUG-092: CRM lookup/create failed, proceeding without customer_id:', crmErr);
  // Check-in proceeds with customerId = null
}
```

### Proposed Fix (CustomerModal.jsx)

Wrap CRM calls in non-blocking try/catch matching the BUG-092 pattern. When CRM fails, generate a local `CUST-{timestamp}` ID and proceed. The customer data still reaches the POS backend (order payload), CRM sync is degraded but non-blocking.

**Classification:** CODE_ERROR (CustomerModal doesn't follow BUG-092 non-blocking pattern)
**Risk:** HIGH (order flow blocking)
**Scope:** 1 file (`CustomerModal.jsx`), ~15 lines changed
**Touches hotspot:** YES (order flow)
**Recommendation:** Full Planning gate cycle (Gate 2-3) — touches order flow + hotspot file

---

## INV-002: No Document Preview / Existing Doc Selection

### Hypothesis Testing

| # | Hypothesis | Status | Evidence |
|---|-----------|--------|---------|
| H1 | Document preview UI exists but is hidden | **ELIMINATED** | `grep -rn "documents" RoomCheckInModal.jsx` returns 0 hits for customer documents. No preview/gallery/thumbnail code anywhere in the file. |
| H2 | A separate DocumentViewer component exists | **ELIMINATED** | `find /app/frontend/src -name "*document*"` returns 0 results. No `documentService.js` exists. |
| H3 | The feature simply doesn't exist yet | **CONFIRMED** | See gap analysis below |

### Root Cause — CONFIRMED (HIGH confidence)

**The CRM CR-072 document endpoints are live** (validated: upload + retrieve both work), **but POS FE has ZERO UI for viewing/selecting existing documents.** This was explicitly scoped out per owner decision Q7=B ("doc capture = separate CR").

### Current State

| Component | What Exists | What's Missing |
|-----------|------------|----------------|
| **CRM Endpoints** | ✅ `POST /pos/customers/{id}/documents` (upload)<br>✅ `GET /pos/customers/{id}/documents` (retrieve) | — |
| **customerTransform.js** | ✅ `documents` field parsed from `customerLookup` (CR-128 G1b) | — |
| **RoomCheckInModal** | `frontImage`/`backImage` state for NEW uploads (existing, pre-CR) | ❌ No `GET /documents` call<br>❌ No preview/gallery of existing docs<br>❌ No "already has docs" indicator<br>❌ No doc type picker for CRM upload |
| **documentService.js** | — | ❌ Doesn't exist. Need new service file with `uploadDocument()` + `getDocuments()` |
| **DocumentPreview component** | — | ❌ Doesn't exist. Need thumbnail grid showing existing docs grouped by type |

### Gap Analysis — What's Needed

| # | Gap | Description | Files |
|---|-----|-------------|-------|
| D1 | **Document Service** | New `documentService.js` with `uploadDocument(customerId, docType, file)` + `getDocuments(customerId)` using CRM endpoints | NEW `api/services/documentService.js` |
| D2 | **Document Preview** | Thumbnail grid showing existing docs from CRM. Grouped by `doc_type` (aadhaar, pan_card, etc). Click to view full. Presigned URL refresh (15-min expiry). | NEW component |
| D3 | **Check-In Integration** | On check-in modal open + customer selected, fetch existing docs. Show "Already has X documents" badge. Option to view or add more. | `RoomCheckInModal.jsx` |
| D4 | **Upload to CRM** | Replace/augment current `frontImage`/`backImage` local upload with CRM doc upload. Capture `doc_type` from ID Type dropdown, upload file to CRM via `POST /documents`. | `RoomCheckInModal.jsx` + `documentService.js` |
| D5 | **Doc Type Mapping** | Map existing `idType` dropdown values (Aadhaar, PAN, Passport, etc) to CRM `doc_type` enum (`aadhaar`, `pan_card`, `passport`, `license`, `voter_id`, `other`) | Constants or transform |

### Proposed Approach

**Phase 1 — View existing docs (read-only):**
- Create `documentService.js` (D1)
- Add document preview section in RoomCheckInModal (D2 + D3)
- When customer is selected/looked up and has `documents` in CRM response, show thumbnail grid
- Badge: "3 documents on file" with expandable preview

**Phase 2 — Upload to CRM:**
- Wire `frontImage`/`backImage` uploads to CRM `POST /documents` endpoint (D4)
- Map ID type to CRM `doc_type` enum (D5)
- Show upload progress + success confirmation
- Refresh preview after upload

**Classification:** FEATURE_GAP (not a bug — intentionally deferred per Q7=B)
**Risk:** HIGH (new API integration + new UI component + touches RoomCheckInModal)
**Scope:** 2-3 NEW files + 1 modified file, ~200-300 lines
**Recommendation:** Register as new CR → Full Planning gate cycle

---

## Summary

| Item | Root Cause | Classification | Confidence | Recommendation |
|------|-----------|---------------|-----------|----------------|
| INV-001 | CustomerModal CRM calls block user on 401 (no non-blocking pattern like RoomCheckInModal BUG-092) | CODE_ERROR | HIGH | Register as BUG → Planning (touches order flow hotspot) |
| INV-002 | Document preview/selection UI doesn't exist (CRM endpoints live, FE has zero UI) | FEATURE_GAP | HIGH | Register as CR → Planning (new service + component + integration) |

---

**Steps used: 10/10. Both items root-caused with HIGH confidence.**
