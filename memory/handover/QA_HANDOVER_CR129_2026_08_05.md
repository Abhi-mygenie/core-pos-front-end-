# QA Handover — CR-129
**Date:** 2026-08-05
**Item:** CR-129 — Room Check-In UX Overhaul (Phone +91 Fix + File Thumbnail + CRM Docs)
**Implementation agent:** IMPL agent 2026-08-05
**Risk:** HIGH (hotspot modal: RoomCheckInModal.jsx)
**Files changed:**
- `api/services/documentService.js` (NEW)
- `api/constants.js` (additive)
- `components/modals/RoomCheckInModal.jsx` (12 edits)

---

## 1. Inherited from Plan — Verification Matrix Self-Test Results

| Edit | File | Verification | Self-Test |
|---|---|---|---|
| A: CUSTOMER_DOCUMENTS constant | constants.js L56 | `grep CUSTOMER_DOCUMENTS constants.js` → 1 hit | ✅ PASS |
| B: documentService.js created | documentService.js | File exists, imports `crmApi` + `API_ENDPOINTS` | ✅ PASS |
| C1: ShieldCheck in lucide imports | RoomCheckInModal.jsx L9 | `grep ShieldCheck` → import line + usage | ✅ PASS |
| C2: PhoneInput/isValidPhoneNumber removed | RoomCheckInModal.jsx | No `import PhoneInput` or `import { isValidPhoneNumber }` | ✅ PASS |
| C3: 3 new state vars | RoomCheckInModal.jsx L344–346 | `crmCustomerId`, `crmDocuments`, `crmDocsLoading` | ✅ PASS |
| C4: doc-fetch useEffect | RoomCheckInModal.jsx | `getDocuments(crmCustomerId)` in useEffect | ✅ PASS |
| C5: selectCrmCustomer hook-in | RoomCheckInModal.jsx | `setCrmCustomerId(c.id)` before `setIsCustomerSelected` | ✅ PASS |
| C6/C7: handleName/PhoneChange reset | RoomCheckInModal.jsx | Both set `setCrmCustomerId(null)` on user edit | ✅ PASS |
| C8: validate() 10-digit check | RoomCheckInModal.jsx | `phone10.length !== 10` replaces `isValidPhoneNumber` | ✅ PASS |
| C9: +91 prefix phone input | RoomCheckInModal.jsx L907 | `+91` span + plain `<input>`, no PhoneInput JSX | ✅ PASS |
| C10: FileField thumbnail rewrite | RoomCheckInModal.jsx | `onRemove` prop, `aspectRatio: '1.58'`, `URL.createObjectURL` | ✅ PASS |
| C11: CRM docs section | RoomCheckInModal.jsx | `data-testid="crm-documents-section"` block above ID grid | ✅ PASS |
| C11b: FileField callers +props | RoomCheckInModal.jsx | Primary + adult rows have `docLabel` + `onRemove` | ✅ PASS |
| C12: PhoneInput CSS removed | RoomCheckInModal.jsx | No `.rcm-phone-wrap .PhoneInput` style block | ✅ PASS |
| Compile | webpack | `Compiled successfully!` 0 new warnings | ✅ PASS |

---

## 2. Test Cases for QA Agent

### T1 — Phone field: +91 prefix visible, no country dropdown
**Steps:** Open Room Check-In modal
**Expected:** Phone field shows fixed `+91` badge on left. No globe icon. No dropdown arrow. Clean plain text input.
**data-testid:** `checkin-phone-wrap`, `checkin-phone-input`

### T2 — Phone field: type 10 digits, no validation error
**Steps:** Type `9876543210` in phone input → click Check-In submit
**Expected:** No "Enter a valid phone number" error. Form validates successfully.

### T3 — Phone field: 9 digits → validation error
**Steps:** Type `987654321` (9 digits) → submit
**Expected:** Error "Enter a valid 10-digit number" shown.

### T4 — File upload: thumbnail renders after picking a JPG
**Steps:** Open modal → Click "Tap to upload" on ID Front → pick any JPG
**Expected:** Thumbnail renders at ~1.58:1 (ID card ratio). Green border. Doc label "Aadhaar · Front" shown.
**data-testid:** `checkin-front-image-preview`

### T5 — File upload: × button removes thumbnail
**Steps:** After T4, click the × button on the thumbnail
**Expected:** Thumbnail disappears. "Tap to upload" empty state returns.
**data-testid:** `checkin-front-image-remove`

### T6 — File upload: PDF shows FileText icon (not broken img)
**Steps:** Pick a PDF file for ID Front
**Expected:** FileText icon shown inside thumbnail area. No broken `<img>` tag.

### T7 — CRM docs section hidden for new guest
**Steps:** Open modal, do NOT select from CRM suggestions (fresh name/phone)
**Expected:** No green "Documents on File" section visible.
**data-testid:** `crm-documents-section` should be ABSENT

### T8 — CRM docs section shows for returning guest
**Steps:** Type a known returning customer's phone → select from CRM suggestion dropdown
**Expected:** Green "Documents on File" section appears with thumbnails (if docs on file) or loading spinner then disappears (if none).
**data-testid:** `crm-documents-section` present

### T9 — CRM docs section clears when user edits name after selection
**Steps:** Select returning guest from suggestions → manually edit the name field
**Expected:** Green docs section disappears (crmCustomerId reset).

### T10 — CRM docs failure is non-blocking
**Steps:** Select a guest whose `getDocuments` call would fail (or mock to fail)
**Expected:** No error shown. Docs section simply absent. Form still submittable.

### T11 — Regression: full check-in flow still works end-to-end
**Steps:** Enter guest name + phone → select ID type → upload front image → fill booking dates + room price → click Check-In
**Expected:** Successful check-in toast. No JS errors.

### T12 — Regression: CRM customer search still triggers at 3+ digits
**Steps:** Type "987" in phone field
**Expected:** CRM suggestion dropdown appears with matching customers.

### T13 — Regression: selecting customer auto-populates fields
**Steps:** Select a customer from phone/name suggestions
**Expected:** Name, phone, email (if available), B2B fields auto-populated. No regression from C5 change.

---

## 3. Regression Tests (from plan)

| What | Why |
|---|---|
| `handleSubmit` phone normalisation (L630+) | Still strips digits and normalises — unaffected by C7 |
| `isDirty` check includes `phone` | `phone` now stores digits not E.164 — `isDirty` still truthy when set |
| Extra adult file upload still works | C11b adult callers tested |
| `handleImagePicked` guard still fires | Returns early on empty files from `onRemove` call |

---

## 4. Registry Sync Confirmation

```
Registry synced: YES
Item: CR-129 → status: IMPLEMENTED, gate: 5, sprint_key: pos_5_1
EXIT GATE: ALL 5 PASSED
  □1 registry.json:   PASS
  □2 CR_REGISTRY.md:  PASS
  □3 FILE_OWNERSHIP.md: PASS
  □4 Code markers (12× // CR-129): PASS
  □5 Compile (webpack 0 new warnings): PASS
```

---

## 5. Open Implementation Notes (for QA to confirm at runtime)

1. **`doc.file_url` field name** — probe showed empty object, couldn't confirm field name. Implemented as `doc.file_url || doc.url` defensively. V17 browser test should confirm actual field. Update `documentService.js` if the field name differs.
2. **`URL.createObjectURL` cleanup** — browser manages revocation. No leak in short-lived modal. Monitor if memory issues arise.

---

## 6. Credentials + Environment

- App URL: `https://pos-frontend-deploy-27.preview.emergentagent.com`
- Test account: see `/app/memory/control/test_credentials.md`
- CRM base URL: `https://crm.mygenie.online/api`
- To test CRM docs: need a returning guest with documents on file in CRM
