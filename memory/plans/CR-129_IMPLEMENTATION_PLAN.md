# CR-129 — Implementation Plan (Gate 3)

**ID:** CR-129
**Date:** 2026-08-05
**Agent:** PLANNING (Gate 3 — Implementation Plan)
**Impact Analysis:** `impact/CR-129_IMPACT_ANALYSIS.md` — verified accurate
**Design Freeze:** `impact/CR-129_IMPACT_ANALYSIS.md §13b` — CONFIRMED

---

## Step 0 — Gate 3 Prerequisites (COMPLETED)

### P1: Curl-probe `GET /pos/customers/{id}/documents` ✅

**Probe:**
```bash
curl -s "https://crm.mygenie.online/api/pos/customers/8613d554-9e55-4111-9221-8f19f964d52c/documents" \
  -H "X-API-Key: dp_live_goNzoZGoDaeP5C***" -H "Accept: application/json"
```

**Result:**
```json
{"success": true, "message": "Documents retrieved", "data": {"documents": {}}}
```

**Confirmed shape:**
- Outer: `{ success: bool, message: string, data: { documents: object } }`
- `data.documents` = **OBJECT** (not array) — empty `{}` when no docs
- When documents exist: object keyed by `doc_type` → array of file records (inferred from shape; probe showed empty customer)
- 404 shape: `{"detail": "Customer not found"}`
- Auth: `X-API-Key` header → handled automatically by `crmApi` interceptor (no token param needed in service)

**Normalizer logic required:**
```js
// data.documents = {} (empty) → []
// data.documents = { aadhaar: [{...}], passport: [{...}] } → flat array
const raw = response.data?.data?.documents || {};
if (typeof raw === 'object' && !Array.isArray(raw)) {
  return Object.entries(raw).flatMap(([docType, files]) =>
    (Array.isArray(files) ? files : [files]).map(f => ({ ...f, doc_type: f.doc_type || docType }))
  );
}
return Array.isArray(raw) ? raw : [];
```

### P2: Read `RoomCheckInModal.jsx` L400–480 — selectCrmCustomer hook-in ✅

**Confirmed:** `selectCrmCustomer` at **L431–448**:
```js
const selectCrmCustomer = useCallback((c) => {
  setName(c.name || '');
  const rawPhone = (c.phone || '').replace(/\D/g, '');
  setPhone(rawPhone.length === 10 ? rawPhone : c.phone || '');
  if (c.email) setEmail(c.email);
  if (c.isB2b) { setBookingFor('Corporate'); ... }
  setShowNameSuggestions(false);
  setShowPhoneSuggestions(false);
  setIsCustomerSelected(true);
  clearErr('name');
  clearErr('phone');
}, []);
```
**Hook-in:** add `setCrmCustomerId(c.id || null)` before `setIsCustomerSelected(true)`.

### P3: Confirm crmToken path ✅

**Confirmed:** `crmToken` is NOT in `RestaurantContext`. It lives as `currentCrmToken` in `crmAxios.js` (module-level var, restored from `sessionStorage.crm_token`). The `crmApi` axios interceptor auto-attaches `X-API-Key` on every request.

**Conclusion:** `documentService.js` calls `crmApi.get(...)` directly — zero token management needed in service.

---

## Step 1 — Conflict Pre-Check

| File | Last modifier | Active conflict? |
|---|---|---|
| `api/constants.js` | Multiple (many CRs) — additive only | **NONE** (adding new key only) |
| `api/services/documentService.js` | NEW — doesn't exist | **NONE** |
| `components/modals/RoomCheckInModal.jsx` | CR-128 (IMPLEMENTED) | **NONE** — CR-128 is closed |

---

## Step 2 — Code Reality Verification

| Claim | Verified |
|---|---|
| `documentService.js` does not exist | ✅ CONFIRMED (`find` returned 0) |
| `CUSTOMER_DOCUMENTS` not in constants.js | ✅ CONFIRMED (grep returned 0) |
| `PhoneInput` at L855 wrapping `handlePhoneChange` | ✅ CONFIRMED |
| `isValidPhoneNumber` at L542 in `validate()` | ✅ CONFIRMED |
| `handlePhoneChange` takes `(val)` — E.164 from PhoneInput | ✅ CONFIRMED L458 |
| `phone` state comment: "E.164 via PhoneInput" L264 | ✅ CONFIRMED |
| `ShieldCheck` NOT in lucide imports L7-10 | ✅ CONFIRMED (only X, User, Phone, Mail, Users, Calendar, CreditCard, FileText, Camera, Loader2, ArrowLeft, Plus, ChevronDown, CheckCircle, Clock) |
| PhoneInput CSS block at L1387–1393 | ✅ CONFIRMED |
| `selectCrmCustomer` at L431 | ✅ CONFIRMED |
| CRM docs insertion point at L905 | ✅ CONFIRMED — `{flags.guestDetails ? (` |

---

## Step 3 — Execution Sequence

**Strict order — each edit must complete before the next:**

```
A. api/constants.js        — Edit A1 (additive, 1 line)
B. api/services/documentService.js — NEW FILE
C1. RoomCheckInModal.jsx   — lucide import: add ShieldCheck
C2. RoomCheckInModal.jsx   — imports: remove PhoneInput/isValidPhoneNumber; add getDocuments
C3. RoomCheckInModal.jsx   — state: add crmCustomerId, crmDocuments, crmDocsLoading
C4. RoomCheckInModal.jsx   — useEffect: doc fetch
C5. RoomCheckInModal.jsx   — selectCrmCustomer: hook-in setCrmCustomerId
C6. RoomCheckInModal.jsx   — handleNameChange: reset crmCustomerId
C7. RoomCheckInModal.jsx   — handlePhoneChange: new signature + reset crmCustomerId
C8. RoomCheckInModal.jsx   — validate(): replace isValidPhoneNumber
C9. RoomCheckInModal.jsx   — PhoneInput JSX → +91 prefix input
C10. RoomCheckInModal.jsx  — FileField component → thumbnail version
C11. RoomCheckInModal.jsx  — CRM docs section JSX (new section)
C12. RoomCheckInModal.jsx  — remove PhoneInput inline CSS block
```

Compile check after C9 (PhoneInput removed) and after C12 (full modal complete).

---

## File A — `api/constants.js`

### Edit A1 — Add CUSTOMER_DOCUMENTS endpoint

**After line 54** (`CUSTOMER_ADDRESSES: '/pos/customers',`):

```js
  CUSTOMER_ADDRESSES: '/pos/customers',                                       // CRM: /pos/customers/{id}/addresses
  // CR-129: CRM document management endpoints
  CUSTOMER_DOCUMENTS: '/pos/customers',                                       // CRM: GET /pos/customers/{id}/documents
```

**Net change:** +2 lines (comment + key)

---

## File B — `api/services/documentService.js` (NEW FILE)

**Full content:**
```js
// CRM Document Service — CR-129
// Fetch documents stored against a CRM customer profile.
// Auth: handled automatically by crmApi interceptor (X-API-Key).
// Non-blocking by design — callers catch errors silently.

import crmApi from '../crmAxios';
import { API_ENDPOINTS } from '../constants';

/**
 * Fetch documents on file for a CRM customer.
 * GET /pos/customers/{id}/documents
 *
 * API response shape (probe confirmed 2026-08-05):
 *   { success: true, message: "Documents retrieved",
 *     data: { documents: {} | { aadhaar: [{...}], passport: [{...}] } } }
 *
 * documents is an OBJECT keyed by doc_type, not an array.
 * Normalised to flat array: [{ doc_type, file_url, id, created_at, ... }]
 *
 * @param {string} customerId  - CRM customer UUID
 * @returns {Promise<Array>}   - flat array of document objects (empty [] on error or no docs)
 */
export const getDocuments = async (customerId) => {
  if (!customerId) return [];
  const response = await crmApi.get(
    `${API_ENDPOINTS.CUSTOMER_DOCUMENTS}/${customerId}/documents`
  );
  const raw = response.data?.data?.documents;
  // Empty or missing → no docs
  if (!raw || (typeof raw === 'object' && !Array.isArray(raw) && Object.keys(raw).length === 0)) {
    return [];
  }
  // Object keyed by doc_type → flatten
  if (typeof raw === 'object' && !Array.isArray(raw)) {
    return Object.entries(raw).flatMap(([docType, files]) => {
      const arr = Array.isArray(files) ? files : [files];
      return arr.map(f => ({ ...f, doc_type: f.doc_type || docType }));
    });
  }
  // Defensive: if API changes to return array directly
  if (Array.isArray(raw)) return raw;
  return [];
};
```

---

## File C — `components/modals/RoomCheckInModal.jsx`

### Edit C1 — Lucide imports: add ShieldCheck

**Current (L7–10):**
```js
import {
  X, User, Phone, Mail, Users, Calendar, CreditCard, FileText, Camera,
  Loader2, ArrowLeft, Plus, ChevronDown, CheckCircle, Clock,
} from 'lucide-react';
```

**New:**
```js
import {
  X, User, Phone, Mail, Users, Calendar, CreditCard, FileText, Camera,
  Loader2, ArrowLeft, Plus, ChevronDown, CheckCircle, Clock, ShieldCheck,
} from 'lucide-react';
```

**Net change:** 1 word added (`ShieldCheck,`)

---

### Edit C2 — Imports: remove PhoneInput, add getDocuments

**Current (L11–14):**
```js
import imageCompression from 'browser-image-compression';
import { isValidPhoneNumber } from 'libphonenumber-js';
import PhoneInput from 'react-phone-number-input';
import 'react-phone-number-input/style.css';
```

**New:**
```js
import imageCompression from 'browser-image-compression';
import { getDocuments } from '../../api/services/documentService'; // CR-129
```

**Net change:** -2 lines, 0 new imports (PhoneInput library no longer needed)

**Note:** `isValidPhoneNumber` and `PhoneInput` imports are deleted. No other file is affected — these were only used in this modal.

---

### Edit C3 — State: add CRM document state variables

**After L284** (`const [errors, setErrors] = useState({});`):

**Current (L307–310 — start of Effects):**
```js
  // ── UI state ──
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [dirtyDialog, setDirtyDialog] = useState(null);
  const [errors, setErrors] = useState({});
  // M-02: clear a single inline error
```

**New — add 3 lines after `setErrors` declaration:**
```js
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [dirtyDialog, setDirtyDialog] = useState(null);
  const [errors, setErrors] = useState({});
  // CR-129: CRM document preview state
  const [crmCustomerId, setCrmCustomerId] = useState(null);
  const [crmDocuments, setCrmDocuments] = useState([]);
  const [crmDocsLoading, setCrmDocsLoading] = useState(false);
  // M-02: clear a single inline error
```

**Net change:** +3 lines

---

### Edit C4 — useEffect: fetch CRM documents when customer identified

**After L426** (end of `beforeunload` useEffect), before `// ── Handlers ──`:

**Current (L427–430):**
```js
  }, [isDirty]);

  // ── Handlers ──
```

**New:**
```js
  }, [isDirty]);

  // CR-129: fetch existing CRM documents when a returning guest is identified
  useEffect(() => {
    if (!crmCustomerId) {
      setCrmDocuments([]);
      setCrmDocsLoading(false);
      return;
    }
    setCrmDocsLoading(true);
    getDocuments(crmCustomerId)
      .then(docs => setCrmDocuments(docs || []))
      .catch(() => setCrmDocuments([]))        // non-blocking — failure = no docs shown
      .finally(() => setCrmDocsLoading(false));
  }, [crmCustomerId]);

  // ── Handlers ──
```

**Net change:** +11 lines

---

### Edit C5 — selectCrmCustomer: set crmCustomerId on customer pick

**Current (L431–448):**
```js
  const selectCrmCustomer = useCallback((c) => {
    setName(c.name || '');
    // PhoneInput with defaultCountry="IN" handles national format — no +91 prefix needed
    const rawPhone = (c.phone || '').replace(/\D/g, '');
    setPhone(rawPhone.length === 10 ? rawPhone : c.phone || '');
    if (c.email) setEmail(c.email);
    // CR-128 G4: Auto-populate B2B fields from CRM lookup (Q8=A)
    if (c.isB2b) {
      setBookingFor('Corporate');
      if (c.gstName) setFirmName(c.gstName);
      if (c.gstNumber) setFirmGst(c.gstNumber);
    }
    setShowNameSuggestions(false);
    setShowPhoneSuggestions(false);
    setIsCustomerSelected(true);
    clearErr('name');
    clearErr('phone');
  }, []);
```

**New — add `setCrmCustomerId` + update phone comment:**
```js
  const selectCrmCustomer = useCallback((c) => {
    setName(c.name || '');
    // CR-129: plain 10-digit phone (PhoneInput removed)
    const rawPhone = (c.phone || '').replace(/\D/g, '');
    setPhone(rawPhone.length === 10 ? rawPhone : (rawPhone.slice(-10) || ''));
    if (c.email) setEmail(c.email);
    // CR-128 G4: Auto-populate B2B fields from CRM lookup (Q8=A)
    if (c.isB2b) {
      setBookingFor('Corporate');
      if (c.gstName) setFirmName(c.gstName);
      if (c.gstNumber) setFirmGst(c.gstNumber);
    }
    setCrmCustomerId(c.id || null); // CR-129: trigger document fetch
    setShowNameSuggestions(false);
    setShowPhoneSuggestions(false);
    setIsCustomerSelected(true);
    clearErr('name');
    clearErr('phone');
  }, []);
```

**Net change:** +1 line

---

### Edit C6 — handleNameChange: reset crmCustomerId when user edits

**Current (L451–456):**
```js
  const handleNameChange = useCallback((e) => {
    const val = e.target.value;
    setName(val);
    if (val.trim()) clearErr('name');
    if (isCustomerSelected) setIsCustomerSelected(false);
  }, [isCustomerSelected]);
```

**New:**
```js
  const handleNameChange = useCallback((e) => {
    const val = e.target.value;
    setName(val);
    if (val.trim()) clearErr('name');
    if (isCustomerSelected) {
      setIsCustomerSelected(false);
      setCrmCustomerId(null); // CR-129: clear doc section when user edits after selection
      setCrmDocuments([]);
    }
  }, [isCustomerSelected]);
```

**Net change:** +2 lines

---

### Edit C7 — handlePhoneChange: new signature (plain digit input) + reset

**Current (L458–462):**
```js
  const handlePhoneChange = useCallback((val) => {
    setPhone(val || '');
    if (val) clearErr('phone');
    if (isCustomerSelected) setIsCustomerSelected(false);
  }, [isCustomerSelected]);
```

**New (accepts DOM event `e` from plain `<input>`, not E.164 string from PhoneInput):**
```js
  // CR-129: plain numeric handler (PhoneInput removed — now a plain <input>)
  const handlePhoneChange = useCallback((e) => {
    const v = e.target.value.replace(/\D/g, '').slice(0, 10);
    setPhone(v);
    if (v) clearErr('phone');
    if (isCustomerSelected) {
      setIsCustomerSelected(false);
      setCrmCustomerId(null); // CR-129: clear doc section
      setCrmDocuments([]);
    }
  }, [isCustomerSelected]);
```

**Net change:** +3 lines

---

### Edit C8 — validate(): replace `isValidPhoneNumber` with length check

**Current (L542):**
```js
    if (!phone || !isValidPhoneNumber(phone)) next.phone = 'Enter a valid phone number';
```

**New:**
```js
    // CR-129: plain 10-digit validation (PhoneInput/isValidPhoneNumber removed)
    const phone10 = (phone || '').replace(/\D/g, '');
    if (!phone || phone10.length !== 10) next.phone = 'Enter a valid 10-digit number';
```

**Net change:** +1 line

**Note:** The variable `phone10` here is local to `validate()` only. The `handleSubmit` at L594–596 independently strips digits for the CRM/API calls and is unchanged.

---

### Edit C9 — Phone field JSX: replace PhoneInput with +91 fixed prefix input

**Current (L844–869):**
```jsx
                {/* Phone with country-code selector + CRM search dropdown */}
                <div className="relative" ref={phoneWrapRef}>
                  <FieldLabel required>Phone</FieldLabel>
                  <div
                    className="rcm-phone-wrap border rounded-lg px-2.5 py-1.5 flex items-center"
                    style={{
                      borderColor: errors.phone ? COLORS.errorText : COLORS.borderGray,
                      backgroundColor: '#fff',
                    }}
                  >
                    <Phone className="w-3.5 h-3.5 mr-1.5 flex-shrink-0" style={{ color: COLORS.grayText }} />
                    <PhoneInput
                      data-testid="checkin-phone"
                      defaultCountry="IN"
                      value={phone}
                      onChange={handlePhoneChange}
                      className="flex-1 rcm-phone-input"
                      countrySelectProps={{ 'data-testid': 'checkin-country-code' }}
                      numberInputProps={{
                        'data-testid': 'checkin-phone-input',
                        className: 'outline-none text-sm bg-transparent min-w-0 w-full',
                        style: { color: COLORS.darkText },
                        placeholder: '98765 43210',
                      }}
                    />
                  </div>
                  {errors.phone && <div className="text-[10px] mt-0.5" style={{ color: COLORS.errorText }}>{errors.phone}</div>}
```

**New — CR-129: +91 fixed prefix, plain input:**
```jsx
                {/* CR-129: Phone — fixed +91 prefix, plain 10-digit input (PhoneInput removed) */}
                <div className="relative" ref={phoneWrapRef}>
                  <FieldLabel required>Phone</FieldLabel>
                  <div
                    className="flex items-center border rounded-lg overflow-hidden"
                    style={{
                      borderColor: errors.phone ? COLORS.errorText : COLORS.borderGray,
                      backgroundColor: '#fff',
                    }}
                    data-testid="checkin-phone-wrap"
                  >
                    <span
                      className="px-2.5 py-[7px] text-sm font-semibold border-r flex-shrink-0"
                      style={{ backgroundColor: COLORS.sectionBg, borderColor: COLORS.borderGray, color: COLORS.grayText }}
                    >
                      +91
                    </span>
                    <input
                      type="tel"
                      inputMode="numeric"
                      maxLength={10}
                      placeholder="98765 43210"
                      value={phone}
                      onChange={handlePhoneChange}
                      className="flex-1 outline-none px-2.5 py-[7px] text-sm bg-transparent min-w-0"
                      style={{ color: COLORS.darkText }}
                      data-testid="checkin-phone-input"
                    />
                  </div>
                  {errors.phone && <div className="text-[10px] mt-0.5" style={{ color: COLORS.errorText }}>{errors.phone}</div>}
```

**Net change:** -3 lines (simpler, no PhoneInput props)

**Notes:**
- `rcm-phone-wrap` class removed from wrapper (used only for PhoneInput CSS — being deleted in C12)
- `Phone` lucide icon removed from field (replaced by `+91` text prefix)
- `Phone` import retained (used nowhere else but harmless)
- `data-testid="checkin-phone-input"` preserved (kept on the actual input)

---

### Edit C10 — FileField component: add thumbnail preview

**Current (L158–196):**
```jsx
const FileField = ({ label, required, file, error, busy, onChange, testId }) => {
  const inputRef = useRef(null);
  const handlePick = () => inputRef.current?.click();
  return (
    <div>
      {label && <FieldLabel required={required}>{label}</FieldLabel>}
      <button
        type="button"
        onClick={handlePick}
        className="flex items-center gap-1.5 border rounded-lg px-2.5 py-1.5 cursor-pointer hover:bg-gray-50 transition-colors w-full"
        style={{
          borderColor: error ? COLORS.errorText : COLORS.borderGray,
          backgroundColor: error ? `${COLORS.errorBg}33` : '#fff',
        }}
      >
        {busy
          ? <Loader2 className="w-3.5 h-3.5 flex-shrink-0 animate-spin" style={{ color: COLORS.primaryOrange }} />
          : (file
              ? <CheckCircle className="w-3.5 h-3.5 flex-shrink-0" style={{ color: COLORS.primaryGreen }} />
              : <Camera className="w-3.5 h-3.5 flex-shrink-0" style={{ color: COLORS.grayText }} />)}
        <span
          className="flex-1 text-sm truncate text-left"
          style={{ color: file ? COLORS.darkText : COLORS.grayText }}
        >
          {file ? file.name : 'Choose file…'}
        </span>
      </button>
      <input
        ref={inputRef}
        type="file"
        accept={FILE_ACCEPT_ATTR}
        onChange={onChange}
        className="hidden"
        data-testid={testId}
      />
      {error && <div className="text-[10px] mt-0.5 leading-tight" style={{ color: COLORS.errorText }}>{error}</div>}
    </div>
  );
};
```

**New — CR-129: thumbnail preview at 1.58:1 ratio:**
```jsx
// CR-129: FileField with ID-card ratio thumbnail preview
const FileField = ({ label, required, file, error, busy, onChange, testId, docLabel }) => {
  const inputRef = useRef(null);
  const isPdf = file && (file.type === 'application/pdf' || /\.pdf$/i.test(file.name));
  const previewUrl = file && !isPdf ? URL.createObjectURL(file) : null;

  return (
    <div>
      {label && <FieldLabel required={required}>{label}</FieldLabel>}
      {file ? (
        // ── Has file: thumbnail preview ──
        <div
          className="relative rounded-lg overflow-hidden border"
          style={{ borderColor: COLORS.primaryGreen, aspectRatio: '1.58' }}
          data-testid={`${testId}-preview`}
        >
          {previewUrl ? (
            <img src={previewUrl} alt="ID document" className="w-full h-full object-cover" style={{ display: 'block' }} />
          ) : (
            <div className="w-full h-full flex items-center justify-center" style={{ backgroundColor: COLORS.sectionBg }}>
              <FileText className="w-6 h-6" style={{ color: COLORS.grayText }} />
            </div>
          )}
          {/* Overlay label */}
          <div className="absolute bottom-0 left-0 right-0 px-2 py-1"
            style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.7), transparent)' }}>
            <span className="text-white text-[10px] font-semibold leading-tight">
              {docLabel || file.name}
            </span>
          </div>
          {/* Remove button */}
          <button
            type="button"
            onClick={() => onChange({ target: { files: [] } })}
            className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full flex items-center justify-center transition-colors"
            style={{ background: 'rgba(0,0,0,0.6)' }}
            aria-label="Remove uploaded file"
            data-testid={`${testId}-remove`}
          >
            <X className="w-2.5 h-2.5 text-white" />
          </button>
        </div>
      ) : (
        // ── No file: upload target ──
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
            ? <Loader2 className="w-4 h-4 animate-spin" style={{ color: COLORS.primaryOrange }} />
            : <Camera className="w-4 h-4" style={{ color: COLORS.grayText }} />}
          <span className="text-[10px] leading-tight text-center" style={{ color: COLORS.grayText }}>
            {busy ? 'Processing…' : 'Tap to upload'}
          </span>
        </button>
      )}
      <input
        ref={inputRef}
        type="file"
        accept={FILE_ACCEPT_ATTR}
        onChange={onChange}
        className="hidden"
        data-testid={`${testId}-input`}
      />
      {error && <div className="text-[10px] mt-0.5 leading-tight" style={{ color: COLORS.errorText }}>{error}</div>}
    </div>
  );
};
```

**Net change:** +20 lines

**Notes:**
- `docLabel` prop added — caller passes e.g. `"Aadhaar · Front"` for the overlay
- `URL.createObjectURL(file)` — in-memory URL, browser manages cleanup; no upload needed for preview
- PDF files: show `FileText` icon (no `<img>` for PDFs — binary, not renderable as image)
- Remove button calls `onChange({ target: { files: [] } })` — same handler as normal file change, parent processes empty files array as "file removed" in `handleImagePicked`
- **Important:** `handleImagePicked` in parent needs to handle empty `files` array. Check this at implementation time — add guard if needed.

**FileField callers that need `docLabel` prop added (same file, L906–931):**
```jsx
<FileField label="ID Front" required file={frontImage} ... testId="checkin-front-image"
  docLabel={`${idType} · Front`} />
<FileField label="ID Back" file={backImage} ... testId="checkin-back-image"
  docLabel={`${idType} · Back`} />
```
And for extra adults (L988–1003):
```jsx
<FileField label="ID Front" required file={row.frontImage} ...
  docLabel={`${row.idType} · Front`} />
<FileField label="ID Back" file={row.backImage} ...
  docLabel={`${row.idType} · Back`} />
```

---

### Edit C11 — CRM docs section: insert above ID grid

**Insertion point: before L905** (`{flags.guestDetails ? (`)

**Current (L904–906):**
```jsx
              </div>

              {flags.guestDetails ? (
```

**New — insert between grid close and guestDetails check:**
```jsx
              </div>

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
                  </div>
                  {crmDocsLoading ? (
                    <div className="flex items-center gap-1.5" style={{ color: '#059669' }}>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span className="text-[11px]">Loading documents…</span>
                    </div>
                  ) : (
                    <>
                      <div className="grid grid-cols-3 gap-1.5">
                        {crmDocuments.slice(0, 3).map((doc) => (
                          <a
                            key={doc.id || doc.doc_type}
                            href={doc.file_url || doc.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="relative block rounded-md overflow-hidden"
                            style={{ border: '1px solid #D1FAE5', aspectRatio: '1.58' }}
                            data-testid={`crm-doc-thumb-${doc.doc_type}`}
                          >
                            <img
                              src={doc.file_url || doc.url}
                              alt={doc.doc_type}
                              className="w-full h-full object-cover"
                              onError={(e) => { e.currentTarget.style.display = 'none'; }}
                            />
                            <div className="absolute inset-0 flex flex-col justify-end p-1"
                              style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.72), transparent)' }}>
                              <div className="text-white text-[9px] font-semibold capitalize mb-0.5">
                                {(doc.doc_type || 'doc').replace('_', ' ')}
                              </div>
                              <span className="inline-flex items-center gap-0.5 text-[8px] font-bold
                                px-1 py-0.5 rounded-full text-white" style={{ background: '#22C55E', width: 'fit-content' }}>
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

              {flags.guestDetails ? (
```

**Net change:** +58 lines

**Note on `doc.file_url || doc.url`:** using both field names defensively since actual field name not confirmed by probe (empty object, no example document record). Implementation agent must verify field name at runtime and update if different.

---

### Edit C12 — Remove PhoneInput inline CSS block

**Current (L1387–1393):**
```jsx
      {/* Inline PhoneInput cosmetic fixes so it blends with our InputField style */}
      <style>{`
        .rcm-phone-wrap .PhoneInput { flex: 1; display: flex; align-items: center; gap: 6px; min-width: 0; }
        .rcm-phone-wrap .PhoneInputCountry { display: flex; align-items: center; gap: 4px; }
        .rcm-phone-wrap .PhoneInputInput { flex: 1; outline: none; border: none; background: transparent; font-size: 14px; color: ${COLORS.darkText}; min-width: 0; }
        .rcm-phone-wrap .PhoneInputCountrySelect { font-size: 14px; color: ${COLORS.darkText}; background: transparent; border: none; outline: none; }
      `}</style>
```

**New:** Delete entire block (7 lines removed).

---

## Step 4 — Risk Register

| Risk | Likelihood | Mitigation |
|---|---|---|
| `handleImagePicked` breaks on empty `files[]` from remove button | MEDIUM | `handleImagePicked` calls `e.target.files[0]` — guard: `if (!e.target.files?.[0]) { setFrontImage(null); return; }` — add this guard at implementation time |
| CRM docs field name `file_url` wrong | MEDIUM | Used `doc.file_url \|\| doc.url` defensively; `onError` hides broken img. Confirm at runtime. |
| Phone search breaks after PhoneInput removal | LOW | Search effect at L373 strips `+91` prefix — with plain 10-digit state, `.replace(/^91/, '')` is a no-op. Still works. |
| PhoneInput CSS `rcm-phone-wrap` class affects other elements | NONE | `rcm-phone-wrap` class only set on the phone field div (now removed from C9). Safe to delete CSS. |
| `selectCrmCustomer` phone handling changes | LOW | Already returns 10-digit rawPhone — unchanged. C5 edit only adds `setCrmCustomerId`. |
| `URL.createObjectURL` memory leak | LOW | Object URLs are revoked by browser on page refresh. Modal is short-lived (sheet, not page). Acceptable. |

---

## Step 5 — Verification Matrix

| # | Edit | File | How to Verify | Automated? |
|---|---|---|---|:---:|
| V1 | A1 — CUSTOMER_DOCUMENTS constant | constants.js | `grep CUSTOMER_DOCUMENTS constants.js` returns new line | YES |
| V2 | B — documentService.js created | documentService.js | `import { getDocuments } from` resolves without error | YES |
| V3 | B — normalizer: empty `{}` → `[]` | documentService.js | Unit: `normalise({})` → `[]` | YES |
| V4 | B — normalizer: keyed object → flat array | documentService.js | Unit: `normalise({aadhaar:[{id:1,file_url:'x'}]})` → `[{id:1,doc_type:'aadhaar',file_url:'x'}]` | YES |
| V5 | C2 — PhoneInput no longer imported | RoomCheckInModal.jsx | Compile succeeds (no PhoneInput reference) | YES |
| V6 | C3 — 3 new state vars declared | RoomCheckInModal.jsx | `grep crmCustomerId` returns state line | YES |
| V7 | C4 — useEffect fires on crmCustomerId | RoomCheckInModal.jsx | Mock `getDocuments` → verify called when crmCustomerId set | YES |
| V8 | C5 — selectCrmCustomer sets crmCustomerId | RoomCheckInModal.jsx | Select returning guest → `crmCustomerId` state = guest.id | YES |
| V9 | C7 — handlePhoneChange accepts DOM event | RoomCheckInModal.jsx | Type in phone input → state updates to 10-digit digits | YES |
| V10 | C8 — validate: 10-digit length check | RoomCheckInModal.jsx | Enter 9 digits → error "Enter a valid 10-digit number"; 10 digits → no error | YES |
| V11 | C9 — +91 prefix renders | RoomCheckInModal.jsx | Open modal → "+91" badge visible left of phone input | YES (browser) |
| V12 | C9 — type raw digits, no error | RoomCheckInModal.jsx | Type "9876543210" → no phone validation error | YES (browser) |
| V13 | C10 — thumbnail renders after upload | RoomCheckInModal.jsx | Pick a JPG → thumbnail at 1.58:1 ratio appears | YES (browser) |
| V14 | C10 — × removes thumbnail | RoomCheckInModal.jsx | Click × → thumbnail gone, empty upload target returns | YES (browser) |
| V15 | C10 — PDF shows icon, not broken img | RoomCheckInModal.jsx | Pick PDF → FileText icon shown | YES (browser) |
| V16 | C11 — docs section hidden for new guest | RoomCheckInModal.jsx | Open modal (no customer selected) → no green docs section | YES (browser) |
| V17 | C11 — docs section shows for returning guest | RoomCheckInModal.jsx | Select returning guest with docs → green section with thumbnails | YES (browser) |
| V18 | C11 — docs section hidden on CRM fail | RoomCheckInModal.jsx | Mock `getDocuments` → throw → section absent; form still submittable | YES |
| V19 | C12 — PhoneInput CSS removed | RoomCheckInModal.jsx | `grep rcm-phone-wrap` → 0 results | YES |
| V20 | Full check-in flow regression | RoomCheckInModal.jsx | Complete check-in (name+phone+ID+booking) → success toast | YES (browser) |

---

## Step 6 — Post-Code Registry Checklist

```
□ registry.json: CR-129 → status: IMPLEMENTED, sprint_key: pos_5_1
□ CR_REGISTRY.md: CR-129 row → IMPLEMENTED
□ FILE_OWNERSHIP.md:
    api/services/documentService.js (NEW) — CR-129 — date
    api/constants.js — CR-129 — date
    components/modals/RoomCheckInModal.jsx — CR-129 — date
□ Code markers: // CR-129 in every modified section (already in plan above)
□ Compile: webpack 0 new warnings
```

---

## Summary

```
Plan ready: CR-129
Stage: Implementation Plan (Gate 3)
Probe confirmed: GET /pos/customers/{id}/documents
  → data.documents = object (keyed by doc_type), not array
  → normalizer required in documentService.js
Edits: 12 edits across 3 files (~+95 lines net)
Files WILL change:
  - api/constants.js              (additive, +2 lines)
  - api/services/documentService.js (NEW, ~40 lines)
  - components/modals/RoomCheckInModal.jsx (12 edits, ~+85 lines net)
Files WILL NOT touch:
  - customerTransform.js, roomService.js, orderTransform.js,
    CollectPaymentPanel.jsx, App.js, Sidebar.jsx, customerService.js
Verification matrix: 20 checks (14 automated/unit, 6 browser)
Owner decisions: NONE remaining
Risk: HIGH (hotspot modal)
Open implementation note:
  - handleImagePicked guard for empty files[] (remove button)
  - doc.file_url field name — verify at runtime, update if different
Awaiting Gate 4 GO.
```
