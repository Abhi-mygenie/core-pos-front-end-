# Session Handover — 2026-09-14 (CR-380)
## CR-380 Gate 5a Implementation COMPLETE

```
Session date:     2026-09-14
Status at close:  CR-380 GATE 5A COMPLETE — QA handover written — Awaiting Gate 5b
Next agent role:  QA agent (V-01..V-15 + R-1..R-4)
Workspace:        /app
```

---

## 1. What Was Built

### New file: `components/pms/GuestDocsSection.jsx` (~115 lines)
- ID type dropdown: Aadhaar / Passport / PAN / Driving License / Voter ID
- Front + back file upload tiles (click-to-pick, shows filename on selection)
- Required indicator (red) when `idUploadRequired=true` + no docs on file + no image
- "Docs on file — upload to update" note (green) for returning guests
- data-testid: `ci-id-type-{label}`, `ci-front-upload-{label}`, `ci-back-upload-{label}`
- Exports: default component, `ID_TYPES` array, `CRM_DOC_TYPE` map

### `pmsService.js` — E-P1..E-P2
- `pmsCheckIn` converted JSON → **FormData** (OD-3-B)
- `id_type` now from `p.idType` (real value, not hardcoded placeholder) — fixes OG-PMS-007
- `room_id[0]` bracket notation (FormData parity with roomService)
- `front_image_file` / `back_image_file` for primary guest
- Per-adult: `id_type2/3/4` + `front_image_file2/3/4` + `back_image_file2/3/4` (OD-5-A)
- BUG-388 `balance_payment` and BUG-886 `gst_tax` formulas preserved exactly
- `Content-Type: multipart/form-data` header

### `CheckInPage.jsx` — E-C1..E-C9
- `idType`, `frontImage`, `backImage` state + `idUploadRequired` useMemo
- `formValid` now includes mandatory-doc gate: `(!idUploadRequired || crmDocs.length > 0 || !!frontImage)` (OD-4-A)
- `extraAdults` init shape extended: `{ name:'', idType:'Aadhar card', frontImage:null, backImage:null }`
- Adult name onChange uses `{ ...item, name }` spread (prevents wiping idType/images)
- Per-adult GuestDocsSection in the adult map JSX
- Primary guest GuestDocsSection inserted between corporate section and Room Amount grid
- `handleConfirm`: passes `idType/frontImage/backImage` to pmsCheckIn + non-blocking CRM upload after success
- `selectArrival` + `selectWalkin` reset `idType/frontImage/backImage` on new guest selection

---

## 2. Files Changed

| File | Type | Change |
|------|------|--------|
| `components/pms/GuestDocsSection.jsx` | NEW | ~115 lines |
| `pages/pms/CheckInPage.jsx` | MAJOR | ~80 lines added/changed |
| `api/services/pmsService.js` | MINOR | ~45 lines changed |

Files NOT touched: documentService, customerService, RoomCheckInModal, roomService, NewBookingPage

---

## 3. EXIT GATE — 5/5 PASS

```
□1 REGISTRY:          PASS — CR-380 → GATE_5A_IMPLEMENTED
□2 CR_REGISTRY.MD:    PASS — Gate 5 row
□3 FILE_OWNERSHIP.MD: PASS — 3 entries (GuestDocsSection NEW, CheckInPage, pmsService)
□4 CODE MARKERS:      PASS — 15+5+1
□5 COMPILE:           PASS — 0 new warnings
```

---

## 4. Next Agent: QA Gate 5b

Read `QA_HANDOVER_CR380_2026_09_14.md`. Execute V-01..V-15 + R-1..R-4.

Key tests:
- V-04/V-05: Network tab — Content-Type multipart + id_type = real value
- V-07: Mandatory gate (set localStorage first)
- V-08: Skip for returning guest (phone 9000099013)
- V-10: Spread fix — adult idType not wiped on name edit
- V-15: room_id[0] in FormData

Do-Not-Retry (carry forward from CR-379 + new):
1. Static .env CRM keys REVOKED — use crm_token
2. doc.uploaded_at (not created_at)
3. crmCustomer.pointsValue direct
4. get-single-order-new doesn't return customer_id
5. **Do NOT use JSON for pmsCheckIn** — now FormData (CR-380)
6. **Do NOT revert room_id to array** — bracket notation is correct

---

*Handover written: 2026-09-14. CR-380 Gate 5a complete. Next: QA Gate 5b.*
