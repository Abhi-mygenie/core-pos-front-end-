# QA Handover — CR-380
## New PMS Check-In: Guest ID Documents
**Date:** 2026-09-14
**Implementation agent:** IMPLEMENTATION role
**Status:** Gate 5a COMPLETE — ready for Gate 5b (QA)

---

## 1. Self-Test Results

| Edit | File | Verification | Result |
|------|------|-------------|:---:|
| E-P1 | pmsService.js | CR-380 marker line 1 | ✅ 5 occurrences |
| E-P2 | pmsService.js | JSON→FormData, all fields mapped, BUG-888/886 preserved | ✅ Verified by view |
| E-C1 | CheckInPage.jsx | CR-380 marker line 1 | ✅ 15 occurrences |
| E-C2 | CheckInPage.jsx | uploadDocument + GuestDocsSection imports | ✅ Verified |
| E-C3 | CheckInPage.jsx | idType/frontImage/backImage state + idUploadRequired useMemo | ✅ Verified |
| E-C4 | CheckInPage.jsx | formValid mandatory-doc gate added | ✅ Verified |
| E-C5 | CheckInPage.jsx | selectArrival extraAdults init includes idType/frontImage/backImage | ✅ Verified |
| E-C6 | CheckInPage.jsx | Adult counter onChange init + adult map spread fix + GuestDocsSection per adult | ✅ Verified |
| E-C7 | CheckInPage.jsx | handleConfirm: idType/frontImage/backImage passed + CRM upload block | ✅ Verified |
| E-C8 | CheckInPage.jsx | Primary GuestDocsSection JSX after corporate section | ✅ Verified |
| E-C9 | CheckInPage.jsx | selectArrival + selectWalkin doc state resets | ✅ Verified |
| NEW | GuestDocsSection.jsx | ~115 lines: ID_TYPES, CRM_DOC_TYPE, upload tiles, data-testid attrs | ✅ Created |

**Self-test: 11/11 edits verified. Compile: PASS (0 new warnings).**

---

## 2. Test Cases (V-01..V-15)

| V# | Test Case | Steps | Expected |
|----|-----------|-------|----------|
| V-01 | GuestDocsSection renders for primary guest | Walk-in → check form area after dates/corporate | `data-testid="ci-id-type-primary-guest"` select visible |
| V-02 | ID type dropdown has 5 options | Inspect dropdown | Aadhaar / Passport / PAN / Driving License / Voter ID |
| V-03 | Front image upload tile interactive | Click `ci-front-upload-primary-guest`, select any image | Tile shows "✓ filename" in green |
| V-04 | pmsCheckIn is multipart/form-data | Fill form + Confirm → Network tab | Content-Type = multipart/form-data |
| V-05 | id_type field = selected value | Select Passport → Confirm | Network: id_type=Passport (not 'Select document type') |
| V-06 | front_image_file in payload when image selected | Upload front image → Confirm | Network: front_image_file entry in multipart body |
| V-07 | Mandatory-doc gate blocks Confirm | Set localStorage mygenie_room_id_upload_required=true, no image, no crmDocs | Confirm button disabled |
| V-08 | Mandatory-doc skip for returning guest | Phone 9000099013 (has docs) + idUploadRequired=true | Confirm enabled without uploading |
| V-09 | Extra adult GuestDocsSection | Adults=3 → adult map renders | `ci-id-type-adult-2` and `ci-id-type-adult-3` visible |
| V-10 | Adult idType not wiped on name edit | Adult 2: select Passport → type name | Passport still selected after name input |
| V-11 | id_type2 in network payload | Adult 2 = Passport → Confirm | Network: id_type2=Passport |
| V-12 | front_image_file2 in network payload | Adult 2: upload front image → Confirm | Network: front_image_file2 entry |
| V-13 | Doc state resets on Walk-in click | Upload image → click Walk-in button again | GuestDocsSection shows fresh empty state |
| V-14 | CRM upload called after success | Check-in with phone 9000099013 + front image | Network: POST /pos/customers/{id}/documents fires |
| V-15 | room_id[0] in FormData | Network tab multipart | Key = room_id[0] (not JSON array) |

---

## 3. Regression Tests

| # | What to verify | Why |
|---|---------------|-----|
| R-1 | CR-379 returning guest badge still shows | E-C3 added state near crmDocs |
| R-2 | CR-379 extra adult name inputs still work | E-C6 changed spread pattern |
| R-3 | Corporate toggle + firm/GST still works | E-C8 inserted above Room Amount grid |
| R-4 | Normal walk-in check-in still completes | E-P2 rewrote pmsCheckIn payload |

---

## 4. Registry Sync Confirmation

```
Registry synced: YES
Item: CR-380
Status: GATE_5A_IMPLEMENTED
Sprint: pos_pms_1
EXIT GATE: ALL 5 PASSED
  □1 Registry: PASS
  □2 CR_REGISTRY.MD: PASS (Gate 5)
  □3 FILE_OWNERSHIP.MD: PASS (3 entries added)
  □4 Code markers: 15 CheckInPage + 5 pmsService + 1 GuestDocsSection
  □5 Compile: webpack 1 warning (pre-existing only)
```

---

## 5. Credentials + Environment

```
POS URL:  https://preprod.mygenie.online
Email:    owner@thegoankitchen.com  Password: ***
restaurant_id: 69 (The Goan Kitchen)

Test returning guest (V-08, V-14): phone 9000099013 — 'CR379 ProbeTest', has Aadhaar doc on file

For V-07 (mandatory gate): run in browser console before testing:
  localStorage.setItem('mygenie_room_id_upload_required', 'true')
Clean up after: localStorage.removeItem('mygenie_room_id_upload_required')

Free rooms: r4 (order 1232244), r5 (order 1232314) — checkout first if occupied
```
