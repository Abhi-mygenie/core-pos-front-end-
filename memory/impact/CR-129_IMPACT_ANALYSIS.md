# CR-129 — Impact Analysis (Gate 2)

**ID:** CR-129
**Title:** Room Check-In — Document Preview & Selection from CRM (Phase 1: View)
**Date:** 2026-08-05
**Agent:** PLANNING (Gate 2 — Impact Analysis)
**Code Reality:** NONE — zero document UI exists; CRM endpoints live; transform parses field
**Conflict Pre-Check:** RELATED — CR-128 (IMPLEMENTED) last touched `RoomCheckInModal.jsx`; no open conflict on the file

---

## 1. Risk Classification

| Field | Value |
|---|---|
| Risk | **HIGH** |
| Trigger | New CRM API integration + new UI component + modifies `RoomCheckInModal.jsx` (1399-line hotspot modal) |
| R5 Hotspot | `RoomCheckInModal.jsx` is listed as HIGH-RISK (room workflow, advance payment) |
| Financial logic | NO — Phase 1 is read-only (document fetch only; zero payment/billing touch) |
| Fast Lane eligible | NO — new service file + hotspot modal |

---

## 2. Scope Decision (Design Freeze) — UPDATED 2026-08-05

**Owner decision OQ-1 (default applied):** Phase 1 only — read-only document view from CRM. Phase 2 (upload to CRM) is a separate follow-on CR.

**This impact analysis covers Phase 1 only.** Phase 2 scope is recorded at the bottom as a deferred note.

### Scope Expansion — Owner-directed during design review 2026-08-05

Two additional UX fixes in `RoomCheckInModal.jsx` confirmed by owner during design session and included in this CR's scope (same file, no new files required):

| Expansion | Description | Lines est. |
|---|---|---|
| **Phone field redesign** | Replace complex `react-phone-number-input` layout (globe + dropdown) with fixed `+91` prefix + plain 10-digit input | ~15 lines |
| **FileField thumbnail preview** | Replace filename-only display with ID card ratio thumbnail + `×` remove button | ~25 lines |

Both are additive changes to `RoomCheckInModal.jsx`, which is already in scope. No new files required for these two expansions.

---

## 3. What Exists Today

| Layer | State | Detail |
|---|---|---|
| CRM GET endpoint | ✅ LIVE | `GET /pos/customers/{id}/documents` — returns list of customer documents |
| CRM POST endpoint | ✅ LIVE (Phase 2 only) | `POST /pos/customers/{id}/documents` — upload new document |
| `customerTransform.js` L106 | ✅ MAPPED | `documents: api.documents \|\| {}` — parsed from customerLookup response |
| `documentService.js` | ❌ MISSING | Doesn't exist — new file required |
| `RoomCheckInModal.jsx` — doc section | ❌ MISSING | No state, no fetch, no UI for docs |
| `documentService.js` — getDocuments | ❌ MISSING | No function for `GET /pos/customers/{id}/documents` |

---

## 4. Data Flow Trace

**Current flow (no docs):**
```
RoomCheckInModal mounts
→ User types name/phone → searchCustomers → CRM lookup → isCustomerSelected = true
   [crmCustomerId available in selected customer object from searchCustomers result]
→ handleSubmit(): BUG-092 CRM try/catch → resolves customerId
→ roomService.checkIn() called → check-in succeeds
→ [ZERO document fetch anywhere]
```

**Proposed flow (Phase 1):**
```
RoomCheckInModal mounts
→ User types name/phone → searchCustomers → CRM lookup → selectCustomer(c) called
   → [NEW] crmCustomerId = c.id stored in state
→ [NEW] useEffect on [crmCustomerId]:
     if (crmCustomerId) → getDocuments(crmCustomerId, crmToken)
                        → setCrmDocuments(docs)
                        → setCrmDocsLoading(false)
→ [NEW] UI section (above ID Type / image upload):
     if (crmDocuments.length > 0):
       "X document(s) on file" badge → expandable grid
       thumbnail per doc (doc_type label + presigned_url → <img> or PDF icon)
     else if crmDocsLoading:
       skeleton spinner
     [if no docs or no crmCustomerId: section hidden]
→ handleSubmit() unchanged — doc fetch is read-only, zero submit impact
```

---

## 5. Key Architectural Finding — Customer Selection Trigger

**Critical:** `customerId` is resolved inside `handleSubmit()` (L598-615, BUG-092 block) and is **not stored as state**. It cannot be observed by a `useEffect`.

However, the customer search dropdowns DO call a `selectCustomer(c)` function when the user picks a CRM result. The selected customer object from `searchCustomers` (`fromAPI.searchResult`) includes `c.id` (the CRM customer_id). This is the correct trigger for doc fetch.

**Implementation path:**
1. Add `crmCustomerId` state (null | string) to RoomCheckInModal
2. In the existing customer-selection handler: set `crmCustomerId = c.id`
3. When `isCustomerSelected` is cleared (user edits name/phone after pick): reset `crmCustomerId = null` + `crmDocuments = []`
4. `useEffect([crmCustomerId])` → fetch docs when non-null

This requires reading the customer-selection handlers (around L400-450 in RoomCheckInModal) at Gate 3 to confirm exact hook-in points. These are not visible in the lines read during Gate 2. **Gate 3 must open the file at those lines before writing the plan.**

---

## 6. Documents Field Shape (Requires Curl-Probe at Gate 3)

**Current transform:** `documents: api.documents || {}` — typed as `{}` (object), not array.

The CRM `GET /pos/customers/{id}/documents` response shape is **not yet confirmed**. Before Gate 3 planning can specify the exact transform and rendering logic, a curl-probe is mandatory:

```bash
curl -s -X GET "https://preprod.mygenie.online/api/v2/pos/customers/{id}/documents" \
  -H "Authorization: Bearer {crm_token}" | python3 -m json.tool
```

**Expected shape (hypothesis based on CRM doc upload design):**
```json
{
  "documents": [
    {
      "id": 42,
      "doc_type": "aadhaar",
      "file_url": "https://s3.../doc.jpg?X-Amz-Expires=900",
      "created_at": "2026-07-15T10:00:00Z"
    }
  ]
}
```

**Gate 3 prerequisite:** Confirm shape before writing `documentService.js` and rendering logic.

---

## 7. Affected Files

### Files WILL change (Phase 1)

| File | Action | Estimated Lines | Risk |
|---|---|---|---|
| `api/services/documentService.js` | **NEW** — `getDocuments(customerId, crmToken)` function | ~30 lines | LOW |
| `api/constants.js` | **ADDITIVE** — add `CRM_DOCUMENT_ENDPOINTS` block | ~5 lines | LOW |
| `components/modals/RoomCheckInModal.jsx` | **MODIFY** — 5 additions (import, 3 state vars, useEffect, UI section) | ~60–80 lines added | **HIGH** (hotspot) |

### Files WILL NOT touch

| File | Reason |
|---|---|
| `customerTransform.js` | `documents` field already parsed (CR-128 G1b L106); no change needed |
| `roomService.js` | Document upload is Phase 2; Phase 1 is read-only |
| `orderTransform.js` | Zero financial / order payload touch |
| `CollectPaymentPanel.jsx` | No CRM doc integration needed in payment flow |
| `App.js` | No new route needed — docs appear inside existing modal |
| `Sidebar.jsx` | No nav change |
| `customerService.js` | CRM doc endpoints are separate from customer CRUD — isolated to new `documentService.js` |

---

## 8. RoomCheckInModal Modification Plan (Phase 1)

### 8a. Import addition (top of file)
```js
import { getDocuments } from '../../api/services/documentService';
```

### 8b. State additions (State: baseline block, ~L263)
```js
// CR-129: CRM document preview state
const [crmCustomerId, setCrmCustomerId] = useState(null);
const [crmDocuments, setCrmDocuments] = useState([]);
const [crmDocsLoading, setCrmDocsLoading] = useState(false);
```

### 8c. Reset in customer clear handler
When user edits name/phone after a pick (clears `isCustomerSelected`):
```js
setCrmCustomerId(null);
setCrmDocuments([]);
```

### 8d. Set in customer selection handler
When user selects from search dropdown:
```js
setCrmCustomerId(c.id || null);
```

### 8e. useEffect — fetch documents on customer selection
```js
// CR-129: fetch existing CRM documents when customer identified
useEffect(() => {
  if (!crmCustomerId) { setCrmDocuments([]); return; }
  setCrmDocsLoading(true);
  getDocuments(crmCustomerId, restaurant?.crmToken)
    .then(docs => setCrmDocuments(docs || []))
    .catch(() => setCrmDocuments([]))   // non-blocking — failure = no docs shown
    .finally(() => setCrmDocsLoading(false));
}, [crmCustomerId, restaurant?.crmToken]);
```

### 8f. UI section — insert above ID Type / image upload section
Exact insertion point: before the `SectionLabel` for "ID / Document" (Gate 3 must confirm exact line).

```jsx
{/* CR-129: CRM Document Preview */}
{(crmDocsLoading || crmDocuments.length > 0) && (
  <div>
    <SectionLabel>Documents on File</SectionLabel>
    {crmDocsLoading && (
      <div className="flex items-center gap-2 text-xs" style={{ color: COLORS.grayText }}>
        <Loader2 className="w-3.5 h-3.5 animate-spin" />
        Loading documents...
      </div>
    )}
    {!crmDocsLoading && crmDocuments.length > 0 && (
      <div className="flex flex-wrap gap-2">
        {crmDocuments.map(doc => (
          <a
            key={doc.id}
            href={doc.file_url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex flex-col items-center gap-1 p-2 rounded-lg border text-center"
            style={{ borderColor: COLORS.borderGray, minWidth: 72 }}
          >
            <FileText className="w-6 h-6" style={{ color: COLORS.primaryOrange }} />
            <span className="text-[10px] font-medium capitalize" style={{ color: COLORS.grayText }}>
              {doc.doc_type?.replace('_', ' ') || 'Document'}
            </span>
          </a>
        ))}
      </div>
    )}
  </div>
)}
```

*(Exact JSX to be refined at Gate 3 after curl-probe confirms `doc_type` / `file_url` field names.)*

---

## 9. documentService.js Design (Phase 1)

```js
// api/services/documentService.js
import axios from '../axios';
import { CRM_DOCUMENT_ENDPOINTS } from '../constants';

/**
 * CR-129: Fetch existing documents for a CRM customer.
 * Non-blocking — caller handles failures silently.
 */
export const getDocuments = async (customerId, crmToken) => {
  if (!customerId || !crmToken) return [];
  const url = CRM_DOCUMENT_ENDPOINTS.LIST.replace('{id}', customerId);
  const res = await axios.get(url, {
    headers: { Authorization: `Bearer ${crmToken}` },
  });
  // Shape TBD — confirmed at Gate 3 via curl-probe
  return res.data?.documents || res.data || [];
};
```

---

## 10. Owner Decisions (OQ-1 through OQ-5)

| # | Question | Recommendation | Status |
|---|---|---|---|
| **OQ-1** | Phase 1 only (read-only view) or Phase 1+2 (view + upload) in one CR? | **Phase 1 only** — Phase 2 is a separate follow-up CR | Applied (default) |
| **OQ-2** | Show doc section for ALL customer lookups, or only when docs exist? | **Only when docs exist** (`crmDocuments.length > 0`) — section hidden otherwise | Applied (default) |
| **OQ-3** | Presigned URL 15-min expiry — silent re-fetch on 403, or "Link expired" button? | **Silent re-fetch** — when user clicks a doc link that returns 403, re-call `getDocuments` and re-open | Pending owner confirm — safe to proceed with default |
| **OQ-4** | Phase 2: CRM upload supplements or replaces existing POS API `frontImage`/`backImage`? | **Supplements** — keep both paths active | Phase 2 scope — not blocking Phase 1 |
| **OQ-5** | Phase 2: doc type picker — use existing `idType` dropdown or separate picker? | **Map existing** `ID_TYPES` (L23-29) to CRM `doc_type` enum | Phase 2 scope — not blocking Phase 1 |

**OQ-1 and OQ-2 defaults are applied to this plan.** OQ-3 is safe to proceed with default. OQ-4 and OQ-5 are Phase 2 only — not blocking.

---

## 11. Gate 3 Prerequisites (MANDATORY before Implementation Plan)

The following must be done at the start of Gate 3 planning, **before writing the implementation plan**:

1. **Curl-probe** `GET /pos/customers/{id}/documents` to confirm:
   - Response shape: `documents` array vs object, field names (`file_url` vs `url`, `doc_type` vs `type`, etc.)
   - Presigned URL format (S3 vs CRM-hosted)
   - Whether `api.documents` from `customerLookup` already contains the list (same shape as GET endpoint)

2. **Read RoomCheckInModal lines ~400–480** to find the exact `selectCustomer`/`handleSelectCustomer` handler to confirm hook-in point for `setCrmCustomerId(c.id)`

3. **Confirm `restaurant?.crmToken` path** — verify `useRestaurant()` exposes `crmToken` (or check `authService.getCrmToken()`)

4. **Confirm exact insertion line** for the doc section UI (above the ID Type section in the guest_details block)

---

## 12. Verification Matrix (seeds QA handover)

| # | Edit | File | How to Verify | Automated? |
|---|---|---|---|:---:|
| V1 | documentService.js created | documentService.js | Import resolves; `getDocuments(id, token)` calls correct CRM URL | YES |
| V2 | crmCustomerId state added | RoomCheckInModal.jsx | Select customer from dropdown → state updates | YES |
| V3 | useEffect fires on selection | RoomCheckInModal.jsx | Mock `getDocuments` → verify called with customer.id | YES |
| V4 | Doc section renders when docs exist | RoomCheckInModal.jsx | Mock `getDocuments` returning 2 docs → 2 doc tiles visible | YES (browser) |
| V5 | Doc section hidden when no docs | RoomCheckInModal.jsx | Mock `getDocuments` returning [] → section absent | YES |
| V6 | Loading skeleton shown briefly | RoomCheckInModal.jsx | Mock delayed response → Loader2 spinner visible during fetch | YES (browser) |
| V7 | CRM failure is non-blocking | RoomCheckInModal.jsx | Mock `getDocuments` to throw → section absent; form still submittable | YES |
| V8 | Doc section absent for new (unselected) customer | RoomCheckInModal.jsx | Fresh name/phone typed (never selected from CRM) → no doc section | YES |
| V9 | handleSubmit unchanged | RoomCheckInModal.jsx | Check-in still works end-to-end after change | YES (browser) |
| V10 | Regression — BUG-092 non-blocking preserved | RoomCheckInModal.jsx | Full check-in flow with/without CRM available | NO (browser) |

---

## 13. Post-Code Registry Checklist (for Implementation agent)

```
□ registry.json: CR-129 → status: IMPLEMENTED, sprint_key: pos_5_1
□ CR_REGISTRY.md: CR-129 row → status IMPLEMENTED
□ FILE_OWNERSHIP.md: documentService.js (NEW) + RoomCheckInModal.jsx (MODIFIED) — CR-129 — date
□ Code markers: // CR-129 on every modified block in RoomCheckInModal + documentService.js header
□ Compile check: webpack 0 new warnings
```

---

## 13b. Design Freeze — 2026-08-05

**Visual comparison built and owner-reviewed:**
- File: `/app/frontend/public/checkin-comparison.html`
- Preview: `https://pos-frontend-deploy-27.preview.emergentagent.com/checkin-comparison.html`

Design system: `COLORS.primaryOrange` (#F4A11A), `COLORS.primaryGreen` (#22C55E), `COLORS.borderGray`, `COLORS.sectionBg`. Fonts: Inter. Icons: lucide-react only.

---

### Component Spec A — Phone Field (+91 Fixed Prefix)

**Replaces:** `react-phone-number-input` with `defaultCountry="IN"` (complex globe + dropdown layout)

**Problem it solves:** Receptionist types raw 10-digit number → validation error because country code was never selected. Two phone icons + globe + dropdown create confusion.

**Design pattern:** Fixed-Prefix Input Pattern

```jsx
{/* CR-129: Phone field — fixed +91 prefix, no country dropdown */}
<FieldLabel required>Phone</FieldLabel>
<div
  className="flex items-center border rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-orange-400/20 focus-within:border-orange-400"
  style={{ borderColor: errors.phone ? COLORS.errorText : COLORS.borderGray, backgroundColor: '#fff' }}
  data-testid="checkin-phone-wrap"
>
  <span
    className="px-3 py-[7px] text-sm font-semibold border-r flex-shrink-0"
    style={{ backgroundColor: COLORS.sectionBg, borderColor: COLORS.borderGray, color: COLORS.grayText }}
  >
    +91
  </span>
  <input
    type="tel"
    inputMode="numeric"
    maxLength={10}
    placeholder="98765 43210"
    value={phone10}
    onChange={handlePhoneChange}
    className="flex-1 outline-none px-3 py-[7px] text-sm bg-transparent min-w-0"
    style={{ color: COLORS.darkText }}
    data-testid="checkin-phone-input"
  />
</div>
```

**Behaviour:**
- `phone10` = raw 10-digit string (strip non-digits, slice to 10)
- On submit: prepend `+91` for E.164 format before CRM + POS API calls
- Remove `PhoneInput`, `isValidPhoneNumber`, and `react-phone-number-input` import from this component
- Remove `Phone` lucide icon from field (prefix replaces it)
- Phone validation: `phone10.length === 10` only
- CRM search typeahead still triggers on `phone10.length >= 3`

---

### Component Spec B — FileField Thumbnail Preview

**Replaces:** Filename-only display (`file.name` truncated string + checkmark icon)

**Problem it solves:** After picking a document, receptionist only sees `Screenshot 20...` — cannot confirm the right file was selected.

**Design pattern:** ID Card Ratio Thumbnail

```jsx
const FileField = ({ label, required, file, error, busy, onChange, testId, docLabel }) => {
  const inputRef = useRef(null);
  // CR-129: generate object URL for preview
  const previewUrl = file && file.type?.startsWith('image/') ? URL.createObjectURL(file) : null;

  return (
    <div>
      {label && <FieldLabel required={required}>{label}</FieldLabel>}
      {file ? (
        /* ── Has file: show thumbnail ── */
        <div
          className="relative rounded-lg overflow-hidden border"
          style={{ borderColor: COLORS.primaryGreen, aspectRatio: '1.58' }}
          data-testid={`${testId}-preview`}
        >
          {previewUrl ? (
            <img src={previewUrl} alt="ID document" className="w-full h-full object-cover" />
          ) : (
            /* PDF or non-image: show icon placeholder */
            <div className="w-full h-full flex items-center justify-center" style={{ backgroundColor: COLORS.sectionBg }}>
              <FileText className="w-6 h-6" style={{ color: COLORS.grayText }} />
            </div>
          )}
          {/* Overlay label */}
          <div className="absolute bottom-0 left-0 right-0 px-2 py-1.5"
            style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.7), transparent)' }}>
            <span className="text-white text-[10px] font-semibold">{docLabel || file.name}</span>
          </div>
          {/* Remove / re-upload button */}
          <button
            type="button"
            onClick={() => { onChange({ target: { files: [] } }); inputRef.current?.click(); }}
            className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full flex items-center justify-center transition-colors"
            style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
            aria-label="Remove uploaded file"
            data-testid={`${testId}-remove`}
          >
            <X className="w-3 h-3 text-white" />
          </button>
        </div>
      ) : (
        /* ── No file: upload target ── */
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="flex flex-col items-center justify-center gap-1 border rounded-lg w-full cursor-pointer hover:bg-gray-50 transition-colors"
          style={{
            borderColor: error ? COLORS.errorText : COLORS.borderGray,
            backgroundColor: error ? `${COLORS.errorBg}33` : '#fff',
            aspectRatio: '1.58',
          }}
          data-testid={testId}
        >
          {busy
            ? <Loader2 className="w-5 h-5 animate-spin" style={{ color: COLORS.primaryOrange }} />
            : <Camera className="w-5 h-5" style={{ color: COLORS.grayText }} />}
          <span className="text-[10px] text-center leading-tight" style={{ color: COLORS.grayText }}>
            {busy ? 'Processing…' : 'Tap to upload'}
          </span>
        </button>
      )}
      <input ref={inputRef} type="file" accept={FILE_ACCEPT_ATTR} onChange={onChange}
        className="hidden" data-testid={`${testId}-input`} />
      {error && <div className="text-[10px] mt-0.5 leading-tight" style={{ color: COLORS.errorText }}>{error}</div>}
    </div>
  );
};
```

**Notes:**
- `docLabel` prop passed from parent: `"Aadhaar · Front"`, `"Aadhaar · Back"`, etc.
- `URL.createObjectURL` generates in-memory preview URL — no upload needed for preview
- PDF files (non-image) show `FileText` icon instead of image thumbnail (PDF preview in browser is complex — icon is sufficient)
- `FileText` icon import must be added to lucide-react imports in the file

---

### Component Spec C — CRM Documents on File Section

**New section:** Inserted above the `ID Type / Front / Back` grid in the primary guest card.

**Trigger:** Visible only when `crmCustomerId` is set AND `crmDocuments.length > 0`

**Design pattern:** Verified Roster Bento (green tinted card, thumbnail grid)

```jsx
{/* CR-129: CRM documents on file — only for returning guests */}
{crmCustomerId && (crmDocsLoading || crmDocuments.length > 0) && (
  <div
    className="rounded-lg p-2.5 mb-2"
    style={{ background: '#F0FDF4', border: '1px solid #D1FAE5' }}
    data-testid="crm-documents-section"
  >
    <div className="flex items-center justify-between mb-2">
      <div className="flex items-center gap-1.5">
        <ShieldCheck className="w-3.5 h-3.5" style={{ color: '#059669' }} />
        <span className="text-[11px] font-bold" style={{ color: '#065F46' }}>
          Documents on File
        </span>
        {!crmDocsLoading && (
          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full text-white"
            style={{ background: '#22C55E' }}>
            {crmDocuments.length}
          </span>
        )}
      </div>
      {!crmDocsLoading && crmDocuments.length > 0 && (
        <span className="text-[10px] underline cursor-pointer" style={{ color: '#059669' }}>
          view all
        </span>
      )}
    </div>

    {crmDocsLoading ? (
      <div className="flex items-center gap-1.5 text-[11px]" style={{ color: '#059669' }}>
        <Loader2 className="w-3.5 h-3.5 animate-spin" />
        Loading documents…
      </div>
    ) : (
      <>
        <div className="grid grid-cols-3 gap-1.5">
          {crmDocuments.slice(0, 3).map((doc) => (
            <a
              key={doc.id}
              href={doc.file_url}
              target="_blank"
              rel="noopener noreferrer"
              className="relative block rounded-md overflow-hidden"
              style={{ border: '1px solid #D1FAE5', aspectRatio: '1.58' }}
              data-testid={`crm-doc-thumb-${doc.id}`}
            >
              <img
                src={doc.file_url}
                alt={doc.doc_type}
                className="w-full h-full object-cover"
                onError={(e) => { e.target.style.display = 'none'; }}
              />
              {/* Gradient overlay */}
              <div className="absolute inset-0 flex flex-col justify-end p-1"
                style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.72), transparent)' }}>
                <div className="text-white text-[9px] font-semibold capitalize mb-0.5">
                  {(doc.doc_type || 'document').replace('_', ' ')}
                </div>
                <span className="inline-flex items-center gap-0.5 text-white text-[8px] font-bold
                  px-1 py-0.5 rounded-full" style={{ background: '#22C55E', width: 'fit-content' }}>
                  <CheckCircle className="w-2 h-2" /> Verified
                </span>
              </div>
            </a>
          ))}
        </div>
        <div className="text-[10px] mt-1.5" style={{ color: '#059669' }}>
          Docs on file — no need to re-upload unless expired
        </div>
      </>
    )}
  </div>
)}
```

**Required new lucide-react imports:** `ShieldCheck`, `CheckCircle` (FileText already noted above)

---

### Updated File Scope (post design freeze)

| File | Action | Lines est. (updated) |
|---|---|---|
| `api/services/documentService.js` | NEW | ~30 lines |
| `api/constants.js` | ADDITIVE | ~5 lines |
| `components/modals/RoomCheckInModal.jsx` | MODIFY | ~140–160 lines (was 60–80) |

**RoomCheckInModal line breakdown:**
- Phone field redesign: ~15 lines net (remove PhoneInput block, add fixed-prefix block)
- FileField component rewrite: ~50 lines (local component inside modal, replace existing)
- CRM docs state + useEffect: ~20 lines
- CRM docs UI section: ~55 lines
- Import additions (ShieldCheck, CheckCircle, FileText): ~3 lines

**Total estimate: ~185–195 lines across 3 files**

---

### Updated Verification Matrix (post design freeze)

Appended to original matrix:

| # | Edit | File | How to Verify | Automated? |
|---|---|---|---|:---:|
| V11 | Phone: +91 prefix renders | RoomCheckInModal.jsx | Open modal → phone field shows "+91" badge left of input | YES (browser) |
| V12 | Phone: typing 10 digits, no error | RoomCheckInModal.jsx | Type "9876543210" → no validation error | YES |
| V13 | Phone: CRM search still triggers | RoomCheckInModal.jsx | Type "987" → CRM suggestions dropdown appears | YES (browser) |
| V14 | FileField: thumbnail renders on upload | RoomCheckInModal.jsx | Pick any JPG → thumbnail at 1.58:1 ratio replaces "Choose file" | YES (browser) |
| V15 | FileField: × button removes file | RoomCheckInModal.jsx | Click × → thumbnail gone, empty state returns | YES (browser) |
| V16 | FileField: PDF shows FileText icon | RoomCheckInModal.jsx | Pick a PDF → FileText icon shown (not broken img) | YES (browser) |
| V17 | CRM docs section hidden for new guests | RoomCheckInModal.jsx | Fresh modal (no customer selected) → section absent | YES |
| V18 | CRM docs renders for returning guest | RoomCheckInModal.jsx | Select returning guest with docs → green section with thumbnails | YES (browser) |

---

## 14. Phase 2 Deferred Scope (not part of this CR)

Registered as a follow-on CR to be created when Phase 1 ships and owner approves Phase 2:

- `documentService.uploadDocument(customerId, docType, file, crmToken)` calling `POST /pos/customers/{id}/documents`
- Map `ID_TYPES` (L23-29) → CRM `doc_type` enum (Aadhaar→aadhaar, PAN→pan_card, etc.)
- Upload progress state + success confirmation in RoomCheckInModal
- Refresh `crmDocuments` after successful upload
- Owner decision OQ-4 (supplement vs replace) resolves whether `frontImage`/`backImage` POS API upload stays

---

## Summary

```
Planning complete: CR-129
Stage: Impact Analysis (Gate 2) — CLOSED with design freeze 2026-08-05
Code reality: NONE (documentService.js absent; zero doc UI in RoomCheckInModal)
Risk: HIGH (hotspot modal + new CRM API + 3 UI components)
Scope locked: Phase 1 only (read-only view) + 2 owner-directed scope expansions:
  - Phone field: +91 fixed prefix (replaces react-phone-number-input layout)
  - FileField: thumbnail preview at 1.58:1 ratio (replaces filename-only display)
Files WILL change (updated post design freeze):
  - api/services/documentService.js        (NEW, ~30 lines)
  - api/constants.js                       (ADDITIVE, ~5 lines)
  - components/modals/RoomCheckInModal.jsx (MODIFY, ~140–160 lines)
Files WILL NOT touch:
  - customerTransform.js, roomService.js, orderTransform.js,
    CollectPaymentPanel.jsx, App.js, Sidebar.jsx, customerService.js
Owner decisions: OQ-1+OQ-2 defaults applied; OQ-3 safe default; OQ-4+OQ-5 Phase 2 only
Design freeze: CONFIRMED — 3 component specs in §13b (A/B/C)
Design comparison: /app/frontend/public/checkin-comparison.html
Conflict: CLEAR (CR-128 IMPLEMENTED, not open)
Verification matrix: 18 checks (V1–V10 original + V11–V18 design additions)
Gate 3 prerequisites:
  1. curl-probe GET /pos/customers/{id}/documents (confirm response shape)
  2. Read RoomCheckInModal L400–480 (find selectCrmCustomer hook-in point)
  3. Confirm restaurant?.crmToken path in useRestaurant()
Docs: impact/CR-129_IMPACT_ANALYSIS.md
Next: AWAITING GATE 4 GO → Gate 3 (Implementation Plan) → code
```
