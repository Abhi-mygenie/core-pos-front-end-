# CR-380 — Gate 2: Impact Analysis
## New PMS Check-In: Guest ID Documents

```
CR ID:          CR-380
Gate:           2 — Impact Analysis
Written:        2026-09-14
Author:         Agent (PLANNING role)
Risk:           HIGH
Sprint:         pos_pms_1
Depends on:     CR-379 (GATE_5B_QA_PASS — dependency met)
```

---

## Code Reality: NONE

grep confirms:
- `pmsCheckIn` in `pmsService.js`: still JSON, `id_type: 'Select document type'` hardcoded (line 152)
- `CheckInPage.jsx`: only reference is comment `// CR-380 owns upload` (line 517)
- `GuestDocsSection.jsx`: does not exist

Full plan applies. No retroactive registration needed.

---

## Conflict Pre-Check

| File | Last modifier | Active CRs on same file | Safe? |
|---|---|---|---|
| `pmsService.js` | CR-379 (Gate 5b PASS 2026-09-14) | None active | ✅ |
| `CheckInPage.jsx` | CR-379 (Gate 5b PASS 2026-09-14) | None active | ✅ |
| `GuestDocsSection.jsx` | N/A (new file) | — | ✅ |

BUG-388 is at Gate 5a (code already applied, QA pending). Its changes to pmsService.js (lines 159/162) are in the payload block we will replace — implementation agent MUST verify BUG-388's edits are preserved in the new FormData block.

---

## 1. Data Flow Trace

### Current (pre CR-380)
```
CheckInPage.jsx handleConfirm()
  → pmsCheckIn({ name, phone, ..., gstTax, customerId, extraAdults, childrenNames, ... })
    → JSON payload { id_type: 'Select document type', name2: '', id_type2: '', ... }
    → api.post(LOCAL_CHECKIN, JSON, { 'X-localization': 'en' })
    → POST /api/v1/vendoremployee/pos/user-group-check-in
```
No image upload. No CRM document upload. `id_type` hardcoded placeholder.

### Target (post CR-380)
```
CheckInPage.jsx handleConfirm()
  Step 1: CRM customer resolve (CR-379 — unchanged)
  Step 2: Corporate GST sync (CR-379 — unchanged)
  Step 3: pmsCheckIn({ ..., idType, frontImage, backImage, extraAdults[{name,idType,frontImage,backImage}] })
    → FormData { id_type=idType, front_image_file=File?, back_image_file=File?,
                 id_type2=adult[0].idType, front_image_file2=File?, back_image_file2=File?,
                 id_type3=adult[1].idType, ... id_type4=adult[2].idType, ...
                 + all existing scalar fields appended as FormData entries }
    → api.post(LOCAL_CHECKIN, FormData, { 'Content-Type': 'multipart/form-data', 'X-localization': 'en' })
    → POST /api/v1/vendoremployee/pos/user-group-check-in
  Step 4 (after success, non-blocking):
    uploadDocument(crmCustomerId, docType, frontImage)  ← CRM: /pos/customers/{id}/documents
    uploadDocument(crmCustomerId, docType, backImage)
```

---

## 2. Affected Files

### Files WILL change

#### `api/services/pmsService.js`
- **What:** `pmsCheckIn` body — replace JSON `payload` object + `api.post(..., payload)` with FormData `fd` + `api.post(..., fd, { 'Content-Type': 'multipart/form-data' })`.
- **Field mapping (JSON → FormData key):**

| JSON key | FormData key | Notes |
|---|---|---|
| `booking_type` | `booking_type` | unchanged |
| `booking_id` | `booking_id` | conditional, unchanged |
| `name` | `name` | unchanged |
| `phone` | `phone` | unchanged |
| `email` | `email` | unchanged |
| `customer_id` | `customer_id` | conditional (CR-379) |
| `cust_membership_id` | `cust_membership_id` | conditional (CR-379) |
| `room_id: [N]` | `room_id[0]=N` | **BREAKING CHANGE** — JSON array → bracket notation |
| `id_type: 'Select...'` | `id_type=p.idType` | **CR-380 core fix** |
| *(none)* | `front_image_file=File?` | **CR-380 new** |
| *(none)* | `back_image_file=File?` | **CR-380 new** |
| `total_adult` | `total_adult` | unchanged |
| `total_children` | `total_children` | unchanged |
| `children_name` | `children_name` | unchanged |
| `name2/3/4` | `name2/3/4` | unchanged (CR-379) |
| `id_type2/3/4: ''` | `id_type2=adult[0].idType` | **CR-380 upgrade** |
| *(none)* | `front_image_file2/3/4=File?` | **CR-380 new** |
| *(none)* | `back_image_file2/3/4=File?` | **CR-380 new** |
| `checkin_date` | `checkin_date` | unchanged |
| `checkout_date` | `checkout_date` | unchanged |
| `booking_details: ''` | `booking_details=''` | unchanged |
| `booking_for` | `booking_for` | unchanged (CR-379) |
| `order_amount` | `order_amount` | unchanged |
| `room_price` | `room_price` | unchanged |
| `advance_payment` | `advance_payment` | unchanged |
| `balance_payment` | `balance_payment` | unchanged (BUG-388 formula preserved) |
| `payment_method` | `payment_method` | unchanged |
| `order_note` | `order_note` | unchanged |
| `gst_tax` | `gst_tax` | unchanged (BUG-386/888) |
| `firm_name` | `firm_name` | unchanged (CR-379) |
| `firm_gst` | `firm_gst` | unchanged (CR-379) |

**⚠️ BUG-388 PRESERVATION**: `balance_payment = to2dp(orderAmount + gstTax)` and `gst_tax = to2dp(p.gstTax ?? 0)` must survive the JSON→FormData rewrite exactly.

#### `pages/pms/CheckInPage.jsx`
Changes overview:
- Import `uploadDocument` from documentService (already imported `getDocuments`)
- Import `Image` from lucide-react (new icon for upload UI)
- Import `GuestDocsSection` from `@/components/pms/GuestDocsSection`
- Add state: `idType` (string), `frontImage` (File|null), `backImage` (File|null)
- Add computed: `idUploadRequired` (useMemo from localStorage)
- Update `formValid`: add mandatory-doc gate `(!idUploadRequired || crmDocs.length > 0 || !!frontImage)`
- Update `extraAdults` initial shape: `{ name:'', idType:'Aadhar card', frontImage:null, backImage:null }`
- Update `extraAdults` name onChange to spread: `{ ...item, name: e.target.value }` (prevents wiping idType/image)
- Update `handleConfirm`: pass `idType/frontImage/backImage` to `pmsCheckIn`; add non-blocking CRM upload after success
- Add doc reset in `selectArrival` and `selectWalkin`: `setIdType('Aadhar card'); setFrontImage(null); setBackImage(null);`
- Add `<GuestDocsSection>` JSX for primary guest (after Corporate section, before Room Amount)
- Update extra adult map JSX to include `<GuestDocsSection>` per adult slot

### New file: `components/pms/GuestDocsSection.jsx`
- Reusable ID doc capture component (~110 lines)
- Props: `label`, `idType`, `onIdTypeChange`, `frontImage`, `onFrontChange`, `backImage`, `onBackChange`, `required`, `hasCrmDocs`, `inputCls`
- Exports: default component + `ID_TYPES` constant (reused in CheckInPage for CRM_DOC_TYPE map)
- ID_TYPES enum: `['Aadhar card', 'Passport', 'PAN card', 'License', 'Voter ID']` — parity with RoomCheckInModal
- CRM_DOC_TYPE map: `{ 'Aadhar card':'aadhaar', 'Passport':'passport', 'PAN card':'pan_card', 'License':'license', 'Voter ID':'voter_id' }` — exported for use in handleConfirm

### Files WILL NOT touch
- `documentService.js` — `uploadDocument(customerId, docType, file)` used as-is; `getDocuments` used as-is (already in CR-379)
- `customerService.js` — used as-is (CR-379)
- `RoomCheckInModal.jsx` — old flow scope-locked
- `roomService.js` — old flow scope-locked (read as FormData reference only)
- `NewBookingPage.jsx` — OD-2 locked
- `crmAxios.js` — read-only

---

## 3. Risk Assessment

**Risk: HIGH** — confirmed from intake

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| `room_id[0]` FormData bracket notation rejected by backend | LOW | HIGH | roomService.checkIn uses same pattern → already proven. Same endpoint. |
| BUG-388 `balance_payment` formula lost in rewrite | MEDIUM | HIGH | Impl agent must verify line-by-line. Include in EXIT GATE. |
| BUG-386 `gst_tax` lost | MEDIUM | HIGH | Explicit check in plan. |
| `uploadDocument` called with null `crmCustomerId` | LOW | LOW | Guard: `if (crmCustomerId && frontImage)` |
| FormData `Content-Type` header conflict with axios defaults | LOW | MEDIUM | Explicitly set `'Content-Type': 'multipart/form-data'` matching roomService.checkIn pattern |
| `extraAdults` name onChange wiping `idType`/`frontImage` | HIGH (without fix) | MEDIUM | Change `{ name: v }` → `{ ...item, name: v }` — explicit edit site |
| Mandatory-doc gate too strict — blocks walk-in when toggle not set | LOW | HIGH | Gate is `idUploadRequired === true` (localStorage default null/undefined = NOT required) |

---

## 4. Downstream Consumers

| Consumer | Impact |
|---|---|
| `pmsCheckIn` callers | Only `CheckInPage.jsx` calls it. No other callers. |
| `documentService.uploadDocument` | Called non-blocking. Already used by `RoomCheckInModal.jsx` — pattern proven. |
| `GuestDocsSection.jsx` | New component, only mounted in `CheckInPage.jsx`. |
| `formValid` gate | Already drives Confirm button `disabled` prop (line 777). Adding `docValid` condition extends existing gate. |

---

## 5. Open Gap Note

**OG-PMS-007** (OPEN_GAPS_REGISTER): `user-group-check-in` without `id_type` → 500 (orphan order). CR-380 resolves this by always sending a real `id_type` (no longer hardcoded placeholder).

---

## 6. Owner Decisions — All Locked (from intake)

| OD | Decision | Implication |
|---|---|---|
| OD-3-B | FormData, same as old model | `pmsCheckIn` converts to FormData |
| OD-4-A | Reuse CR-350 toggle | `mygenie_room_id_upload_required` localStorage key; skip if crmDocs.length > 0 |
| OD-5-A | Extra adult IDs now | Each extra adult slot gets idType + front/back images |

No open owner decisions. Full implementation can proceed.

---

## Gate 2 Summary

```
Impact Analysis complete: CR-380
Code reality:    NONE — full plan applies
Conflict check:  CLEAR — no active CRs on same files
Risk:            HIGH (API contract change + customer data)
Files WILL:      pmsService.js (MINOR) + CheckInPage.jsx (MAJOR) + GuestDocsSection.jsx (NEW)
Files WILL NOT:  documentService, customerService, RoomCheckInModal, roomService, NewBookingPage
Owner decisions: ALL LOCKED (OD-3-B, OD-4-A, OD-5-A)
Blockers:        NONE
Next:            Gate 3 — Implementation Plan
```
