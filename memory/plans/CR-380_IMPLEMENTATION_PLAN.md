# CR-380 — Gate 3: Implementation Plan
## New PMS Check-In: Guest ID Documents

```
CR ID:          CR-380
Gate:           3 — Implementation Plan
Written:        2026-09-14
Author:         Agent (PLANNING role)
Status:         COMPLETE — Awaiting Gate 4 GO
Risk:           HIGH
Sprint:         pos_pms_1
Depends on:     CR-379 (GATE_5B_QA_PASS — met)
```

---

## Step 0 — Code Reality (Verified)

| Claim | Current File | Match? |
|---|---|---|
| `pmsCheckIn` at lines 136–188 (pmsService.js) | Confirmed | ✅ |
| `id_type: 'Select document type'` at line 152 | Confirmed | ✅ |
| `api.post(..., payload, ...)` at line 184 | Confirmed | ✅ |
| CheckInPage.jsx line 1 marker | `// CR-358-P2 | BUG-386 | CR-379: S4` | ✅ |
| documentService import at line 9 | `import { getDocuments } from '...'` | ✅ |
| lucide import at line 4 | No `Image` icon | ✅ (to be added) |
| formValid at line 230 | Long single-line expression | ✅ |
| `extraAdults` init at line 173 | `{ name: '' }` | ✅ (to change) |
| Adult counter onChange at line 616 | `prev[i] ?? { name: '' }` | ✅ (to change) |
| Adult name onChange at line 627 | `{ name: e.target.value }` | ✅ (to change) |
| Corporate section closing div → Room Amount grid | Lines 706-710 | ✅ (insertion point) |
| GuestDocsSection.jsx | Does not exist | ✅ (to create) |

---

## Scope Lock

**Files WILL change:**
- `frontend/src/api/services/pmsService.js` (MINOR — payload block rewrite)
- `frontend/src/pages/pms/CheckInPage.jsx` (MAJOR — ~80 lines added/changed)

**New file:**
- `frontend/src/components/pms/GuestDocsSection.jsx` (~110 lines)

**Files WILL NOT touch:**
- `documentService.js`, `customerService.js`, `crmAxios.js` (read-only)
- `RoomCheckInModal.jsx`, `roomService.js` (old flow scope-locked)
- `NewBookingPage.jsx` (OD-2 locked)
- All backend files

---

## Execution Sequence

```
1. Create GuestDocsSection.jsx (new file — no deps yet)
2. E-P1, E-P2          → pmsService.js (compile check)
3. E-C1..E-C5          → CheckInPage.jsx imports + state + idUploadRequired
4. E-C6                → formValid update (compile check)
5. E-C7                → selectArrival extraAdults init shape
6. E-C8                → adult counter onChange + adult name onChange + adult JSX block (combined)
7. E-C9                → handleConfirm doc params + CRM upload block
8. E-C10               → GuestDocsSection JSX (primary guest) (compile check)
9. E-C11               → selectArrival + selectWalkin doc state resets (final compile check)
```

---

## Edit Register

---

### FILE 0 — NEW `frontend/src/components/pms/GuestDocsSection.jsx`

Create this file before any edits to existing files:

```jsx
// CR-380: GuestDocsSection — ID document capture for PMS Check-In.
// Used for primary guest and each extra adult slot.
import { useRef } from 'react';
import { Image } from 'lucide-react';

export const ID_TYPES = [
  { value: 'Aadhar card', label: 'Aadhaar' },
  { value: 'Passport',    label: 'Passport' },
  { value: 'PAN card',    label: 'PAN' },
  { value: 'License',     label: 'Driving License' },
  { value: 'Voter ID',    label: 'Voter ID' },
];

// CRM doc_type map — used in CheckInPage handleConfirm for uploadDocument call
export const CRM_DOC_TYPE = {
  'Aadhar card': 'aadhaar',
  'Passport':    'passport',
  'PAN card':    'pan_card',
  'License':     'license',
  'Voter ID':    'voter_id',
};

/**
 * GuestDocsSection
 * @param {string}   label          - e.g. 'Primary Guest', 'Adult 2'
 * @param {string}   idType         - selected ID type value
 * @param {function} onIdTypeChange - (value: string) => void
 * @param {File|null} frontImage    - selected front image file
 * @param {function} onFrontChange  - (file: File|null) => void
 * @param {File|null} backImage     - selected back image file
 * @param {function} onBackChange   - (file: File|null) => void
 * @param {boolean}  required       - show Required indicator when no frontImage + no crmDocs
 * @param {boolean}  hasCrmDocs     - true = returning guest already has docs → show skip note
 * @param {string}   inputCls       - base input CSS classes from parent
 */
export default function GuestDocsSection({
  label = 'Primary Guest',
  idType,
  onIdTypeChange,
  frontImage,
  onFrontChange,
  backImage,
  onBackChange,
  required = false,
  hasCrmDocs = false,
  inputCls = '',
}) {
  const frontRef = useRef(null);
  const backRef  = useRef(null);
  const testId   = label.toLowerCase().replace(/\s+/g, '-');

  return (
    <div className="space-y-2">
      {/* Header row */}
      <div className="flex items-center justify-between">
        <label className="text-[12px] text-[#888] font-medium">
          {label} — ID Document
        </label>
        {required && !hasCrmDocs && !frontImage && (
          <span className="text-[10px] text-red-500 font-semibold">Required</span>
        )}
        {hasCrmDocs && (
          <span className="text-[10px] text-[#329937] font-medium">Docs on file — upload to update</span>
        )}
      </div>

      {/* ID type picker */}
      <select
        data-testid={`ci-id-type-${testId}`}
        value={idType}
        onChange={e => onIdTypeChange(e.target.value)}
        className={inputCls}
      >
        {ID_TYPES.map(t => (
          <option key={t.value} value={t.value}>{t.label}</option>
        ))}
      </select>

      {/* Front + Back upload tiles */}
      <div className="grid grid-cols-2 gap-2">
        {/* Front */}
        <div>
          <div
            data-testid={`ci-front-upload-${testId}`}
            onClick={() => frontRef.current?.click()}
            className={`flex items-center justify-center gap-1.5 border-2 border-dashed rounded-lg h-[52px] cursor-pointer text-[11px] transition-colors ${
              frontImage
                ? 'border-[#329937] bg-[#F0FDF4] text-[#329937]'
                : 'border-[#E5E5E5] text-[#888] hover:border-[#329937]'
            }`}
          >
            {frontImage ? (
              <span className="font-medium truncate px-1 max-w-[90%]">✓ {frontImage.name}</span>
            ) : (
              <><Image className="w-3.5 h-3.5 shrink-0" /><span>Front</span></>
            )}
          </div>
          <input
            ref={frontRef}
            type="file"
            accept="image/*,.pdf"
            className="hidden"
            onChange={e => onFrontChange(e.target.files?.[0] || null)}
          />
        </div>

        {/* Back (optional) */}
        <div>
          <div
            data-testid={`ci-back-upload-${testId}`}
            onClick={() => backRef.current?.click()}
            className={`flex items-center justify-center gap-1.5 border-2 border-dashed rounded-lg h-[52px] cursor-pointer text-[11px] transition-colors ${
              backImage
                ? 'border-[#329937] bg-[#F0FDF4] text-[#329937]'
                : 'border-[#E5E5E5] text-[#888] hover:border-[#329937]'
            }`}
          >
            {backImage ? (
              <span className="font-medium truncate px-1 max-w-[90%]">✓ {backImage.name}</span>
            ) : (
              <><Image className="w-3.5 h-3.5 shrink-0" /><span>Back (opt.)</span></>
            )}
          </div>
          <input
            ref={backRef}
            type="file"
            accept="image/*,.pdf"
            className="hidden"
            onChange={e => onBackChange(e.target.files?.[0] || null)}
          />
        </div>
      </div>
    </div>
  );
}
```

---

### FILE 1 — `frontend/src/api/services/pmsService.js`

---

**E-P1 — Line 1: Add CR-380 marker**

```
CURRENT:
// CR-358-P1 | BUG-378 | CR-358-P2 | CR-358-P3 | CR-358-P4 | CR-379: PMS aggregation + booking/check-in

NEW:
// CR-358-P1 | BUG-378 | CR-358-P2 | CR-358-P3 | CR-358-P4 | CR-379 | CR-380: PMS aggregation + booking/check-in
```

---

**E-P2 — Replace JSON payload + api.post call with FormData (lines ~147–185)**

CURRENT block (everything from `const payload = {` to `return res.data;`):
```js
  const payload = {
    booking_type:    p.bookingType,
    ...(p.bookingType !== 'WalkIn' ? { booking_id: p.bookingId } : {}),
    name:            p.name,
    phone:           p.phone,
    email:           p.email ?? '',
    room_id:         [Number(p.restaurantTableId)],
    id_type:         'Select document type',   // REQUIRED (NOT NULL) — probe P6 500 without it
    total_adult:     Number(p.adults ?? 1),
    total_children:  Number(p.children ?? 0),
    children_name:   p.childrenNames?.length ? p.childrenNames.join(',') : '',  // CR-379: real names
    checkin_date:    p.checkin,
    checkout_date:   p.checkout,
    booking_details: '',
    booking_for:     p.bookingFor ?? 'Individual',                               // CR-379: Corporate support
    order_amount:    orderAmount,
    room_price:      orderAmount,
    advance_payment: advance,
    balance_payment: to2dp(orderAmount + (p.gstTax ?? 0)), // BUG-388: advance in GST base → (orderAmount+advance+gstTax)−advance = orderAmount+gstTax
    payment_method:  p.paymentMethod ?? '',
    order_note:      p.note ?? '',
    gst_tax:         to2dp(p.gstTax ?? 0),                           // BUG-386: computed from slabs
    firm_name:       p.firmName ?? '',                                            // CR-379: Corporate
    firm_gst:        p.firmGst ?? '',                                             // CR-379: Corporate GST
    // CR-379: CRM customer link (OD-1A non-blocking — undefined when CRM fails)
    ...(p.customerId ? {
      customer_id:        p.customerId,
      cust_membership_id: p.customerId,   // CR-127 old-flow parity
    } : {}),
    // CR-379: Extra adult names (OD-5A)
    name2:    p.extraAdults?.[0]?.name ?? '',
    name3:    p.extraAdults?.[1]?.name ?? '',
    name4:    p.extraAdults?.[2]?.name ?? '',
    id_type2: '',
    id_type3: '',
    id_type4: '',
  };
  const res = await api.post(AIOSELL_ENDPOINTS.LOCAL_CHECKIN, payload, { headers: { 'X-localization': 'en' } });
  return res.data;
```

NEW block:
```js
  // CR-380: pmsCheckIn converted from JSON → FormData (OD-3-B: parity with roomService.checkIn)
  const fd = new FormData();

  // ── Identity ──────────────────────────────────────────────────────────────
  fd.append('booking_type',    p.bookingType);
  if (p.bookingType !== 'WalkIn') fd.append('booking_id', String(p.bookingId));
  fd.append('name',            p.name);
  fd.append('phone',           p.phone);
  fd.append('email',           p.email ?? '');
  // CR-379: CRM customer link
  if (p.customerId) {
    fd.append('customer_id',        String(p.customerId));
    fd.append('cust_membership_id', String(p.customerId)); // CR-127 old-flow parity
  }

  // ── Room ─────────────────────────────────────────────────────────────────
  fd.append('room_id[0]',      String(Number(p.restaurantTableId))); // bracket notation (FormData parity with roomService)

  // ── Primary guest ID (CR-380: replaces hardcoded placeholder) ────────────
  fd.append('id_type',         p.idType || 'Select document type');
  if (p.frontImage) fd.append('front_image_file',  p.frontImage);
  if (p.backImage)  fd.append('back_image_file',   p.backImage);

  // ── Counts ────────────────────────────────────────────────────────────────
  fd.append('total_adult',     String(Number(p.adults ?? 1)));
  fd.append('total_children',  String(Number(p.children ?? 0)));
  fd.append('children_name',   p.childrenNames?.length ? p.childrenNames.join(',') : ''); // CR-379

  // ── Extra adult slots 2, 3, 4 (CR-379 names + CR-380 IDs) ────────────────
  for (let i = 0; i < 3; i++) {
    const slot  = i + 2;
    const adult = p.extraAdults?.[i];
    fd.append(`name${slot}`,             adult?.name       ?? '');
    fd.append(`id_type${slot}`,          adult?.idType     ?? '');       // CR-380: real id type
    if (adult?.frontImage) fd.append(`front_image_file${slot}`, adult.frontImage);
    if (adult?.backImage)  fd.append(`back_image_file${slot}`,  adult.backImage);
  }

  // ── Dates + booking ───────────────────────────────────────────────────────
  fd.append('checkin_date',    p.checkin);
  fd.append('checkout_date',   p.checkout);
  fd.append('booking_details', '');
  fd.append('booking_for',     p.bookingFor     ?? 'Individual'); // CR-379

  // ── Money ──────────────────────────────────────────────────────────────────
  fd.append('order_amount',    String(orderAmount));
  fd.append('room_price',      String(orderAmount));
  fd.append('advance_payment', String(advance));
  fd.append('balance_payment', String(to2dp(orderAmount + (p.gstTax ?? 0)))); // BUG-388 formula preserved
  fd.append('payment_method',  p.paymentMethod  ?? '');
  fd.append('order_note',      p.note           ?? '');
  fd.append('gst_tax',         String(to2dp(p.gstTax ?? 0)));                  // BUG-386 preserved

  // ── Corporate (CR-379) ───────────────────────────────────────────────────
  fd.append('firm_name',       p.firmName ?? '');
  fd.append('firm_gst',        p.firmGst  ?? '');

  const res = await api.post(AIOSELL_ENDPOINTS.LOCAL_CHECKIN, fd, {
    headers: { 'Content-Type': 'multipart/form-data', 'X-localization': 'en' },
  });
  return res.data;
```

---

### FILE 2 — `frontend/src/pages/pms/CheckInPage.jsx`

---

**E-C1 — Line 1: Add CR-380 marker**

```
CURRENT:
// CR-358-P2 | BUG-386 | CR-379: S4 — Check-In Page. CR-379: CRM customer link, returning-guest badge, extra adults/children, corporate B2B.

NEW:
// CR-358-P2 | BUG-386 | CR-379 | CR-380: S4 — Check-In Page. CR-379: CRM customer link. CR-380: ID document capture, FormData parity.
```

---

**E-C2 — Line 4: Add `Image` to lucide import**

```
CURRENT (line 4):
import { Search, Plus, UserPlus, Loader2, AlertCircle, Check, Home, Calendar, User, Phone, Info, BedDouble, BadgeCheck, FileText } from 'lucide-react';

NEW:
import { Search, Plus, UserPlus, Loader2, AlertCircle, Check, Home, Calendar, User, Phone, Info, BedDouble, BadgeCheck, FileText, Image } from 'lucide-react';
```

*(Note: `Image` is needed by GuestDocsSection.jsx directly — but importing in CheckInPage is not required. GuestDocsSection imports its own. Skip this edit if GuestDocsSection handles its own imports — which it does. E-C2 is only needed if we inline the upload UI in CheckInPage. With GuestDocsSection, we can omit this.)*

**REVISED E-C2 — Line 9: Add `uploadDocument` to documentService import + Add GuestDocsSection import (two imports combined)**

```
CURRENT (lines 8-9):
import { lookupCustomer, createCustomer, updateCustomer } from '@/api/services/customerService'; // CR-379
import { getDocuments } from '@/api/services/documentService'; // CR-379

NEW (lines 8-10):
import { lookupCustomer, createCustomer, updateCustomer } from '@/api/services/customerService'; // CR-379
import { getDocuments, uploadDocument } from '@/api/services/documentService'; // CR-379, CR-380
import GuestDocsSection, { ID_TYPES, CRM_DOC_TYPE } from '@/components/pms/GuestDocsSection'; // CR-380
```

---

**E-C3 — After crmDocs state (line ~43): Add idUploadRequired useMemo + idType/frontImage/backImage state**

CURRENT (line 42-43):
```js
  const [crmDocs,     setCrmDocs]       = useState([]);     // docs-on-file for returning guest (DD-4)
  // CR-379: Extra guests (OD-5A, DD-5, DD-6)
```

NEW (insert after crmDocs line):
```js
  const [crmDocs,     setCrmDocs]       = useState([]);     // docs-on-file for returning guest (DD-4)
  // CR-380: Guest ID document capture (OD-3-B, OD-4-A, OD-5-A)
  const [idType,      setIdType]      = useState('Aadhar card');
  const [frontImage,  setFrontImage]  = useState(null);
  const [backImage,   setBackImage]   = useState(null);
  const idUploadRequired = useMemo(() => localStorage.getItem('mygenie_room_id_upload_required') === 'true', []);
  // CR-379: Extra guests (OD-5A, DD-5, DD-6)
```

---

**E-C4 — Line 230: Update formValid to include mandatory-doc gate (OD-4-A)**

```
CURRENT (line 230):
  const formValid = form && form.name?.trim() && /^\d{10}$/.test(form.phone) && form.restaurantTableId && form.checkin && form.checkout > form.checkin && Number(form.orderAmount) > 0 && form.adults >= 1 && Number(form.advancePayment || 0) >= 0 && Number(form.advancePayment || 0) <= Number(form.orderAmount);

NEW (line 230):
  const formValid = form && form.name?.trim() && /^\d{10}$/.test(form.phone) && form.restaurantTableId && form.checkin && form.checkout > form.checkin && Number(form.orderAmount) > 0 && form.adults >= 1 && Number(form.advancePayment || 0) >= 0 && Number(form.advancePayment || 0) <= Number(form.orderAmount) && (!idUploadRequired || crmDocs.length > 0 || !!frontImage); // CR-380: mandatory-doc gate (OD-4-A)
```

---

**E-C5 — Line 173 (inside selectArrival): Update extraAdults init shape**

```
CURRENT (line 173):
    setExtraAdults(Array.from({ length: Math.max(0, adultCount - 1) }, () => ({ name: '' })));

NEW:
    setExtraAdults(Array.from({ length: Math.max(0, adultCount - 1) }, () => ({ name: '', idType: 'Aadhar card', frontImage: null, backImage: null }))); // CR-380: include doc slots
```

---

**E-C6 — Adult counter onChange + adult name/doc JSX block (replaces lines ~608–653 in E-C12 area)**

This is a combined edit of three things in the adult JSX block:
1. Adult counter onChange `prev[i] ?? { name: '' }` → full shape
2. Extra adult name onChange `{ name: e.target.value }` → `{ ...item, name: e.target.value }` (spread fix)
3. Add `<GuestDocsSection>` per adult slot

CURRENT adult counter onChange (line 613-617):
```jsx
              onChange={e => {
                const v = Math.max(1, Number(e.target.value) || 1);
                setField('adults', v);
                setExtraAdults(prev =>
                  Array.from({ length: v - 1 }, (_, i) => prev[i] ?? { name: '' })
                );
              }}
```

NEW adult counter onChange:
```jsx
              onChange={e => {
                const v = Math.max(1, Number(e.target.value) || 1);
                setField('adults', v);
                setExtraAdults(prev =>
                  Array.from({ length: v - 1 }, (_, i) => prev[i] ?? { name: '', idType: 'Aadhar card', frontImage: null, backImage: null }) // CR-380
                );
              }}
```

CURRENT extra adult map (lines ~624–653):
```jsx
                      {/* DD-5: Extra adult name slots (Adult 2 → 4) */}
                      {extraAdults.map((adult, i) => (
                        <div key={i} className="mt-2">
                          <input
                            data-testid={`ci-adult-name-${i + 2}`}
                            value={adult.name}
                            onChange={e =>
                              setExtraAdults(prev =>
                                prev.map((item, idx) => idx === i ? { name: e.target.value } : item)
                              )
                            }
                            placeholder={`Adult ${i + 2} Name`}
                            className={inputCls}
                          />
                        </div>
                      ))}
```

NEW extra adult map (replaces the entire block above):
```jsx
                      {/* DD-5 + CR-380: Extra adult name + ID doc slots (Adult 2 → 4) */}
                      {extraAdults.map((adult, i) => (
                        <div key={i} className="mt-3 space-y-2">
                          <input
                            data-testid={`ci-adult-name-${i + 2}`}
                            value={adult.name}
                            onChange={e =>
                              setExtraAdults(prev =>
                                prev.map((item, idx) => idx === i ? { ...item, name: e.target.value } : item) // CR-380: spread to preserve idType/images
                              )
                            }
                            placeholder={`Adult ${i + 2} Name`}
                            className={inputCls}
                          />
                          <GuestDocsSection
                            label={`Adult ${i + 2}`}
                            idType={adult.idType ?? 'Aadhar card'}
                            onIdTypeChange={v => setExtraAdults(prev => prev.map((item, idx) => idx === i ? { ...item, idType: v } : item))}
                            frontImage={adult.frontImage ?? null}
                            onFrontChange={f => setExtraAdults(prev => prev.map((item, idx) => idx === i ? { ...item, frontImage: f } : item))}
                            backImage={adult.backImage ?? null}
                            onBackChange={b => setExtraAdults(prev => prev.map((item, idx) => idx === i ? { ...item, backImage: b } : item))}
                            required={false}
                            hasCrmDocs={false}
                            inputCls={inputCls}
                          />
                        </div>
                      ))}
```

---

**E-C7 — handleConfirm (line 285–309): Add idType/frontImage/backImage to pmsCheckIn + CRM upload block after success**

CURRENT pmsCheckIn call (lines 286–309):
```js
      const res = await pmsCheckIn({
        bookingType:       form.bookingType,
        bookingId:         form.bookingId,
        name:              form.name.trim(),
        phone:             form.phone,
        email:             form.email,
        restaurantTableId: form.restaurantTableId,
        checkin:           form.checkin,
        checkout:          form.checkout,
        orderAmount:       Number(form.orderAmount),
        advancePayment:    Number(form.advancePayment || 0),
        adults:            Number(form.adults),
        children:          Number(form.children),
        note:              form.note,
        gstTax,
        // CR-379: CRM + extra guest fields
        customerId:    crmCustomerId,
        extraAdults,
        childrenNames,
        bookingFor:    isCorpBooking ? 'Corporate' : 'Individual',
        firmName:      isCorpBooking ? firmName : '',
        firmGst:       isCorpBooking ? firmGst  : '',
      });
      toast.success(res?.message ?? 'Guest checked in');
      navigate('/pms/in-house'); // CR-358-P2 A-06
```

NEW (full replacement):
```js
      const res = await pmsCheckIn({
        bookingType:       form.bookingType,
        bookingId:         form.bookingId,
        name:              form.name.trim(),
        phone:             form.phone,
        email:             form.email,
        restaurantTableId: form.restaurantTableId,
        checkin:           form.checkin,
        checkout:          form.checkout,
        orderAmount:       Number(form.orderAmount),
        advancePayment:    Number(form.advancePayment || 0),
        adults:            Number(form.adults),
        children:          Number(form.children),
        note:              form.note,
        gstTax,
        // CR-379: CRM + extra guest fields
        customerId:    crmCustomerId,
        extraAdults,
        childrenNames,
        bookingFor:    isCorpBooking ? 'Corporate' : 'Individual',
        firmName:      isCorpBooking ? firmName : '',
        firmGst:       isCorpBooking ? firmGst  : '',
        // CR-380: ID documents
        idType,
        frontImage,
        backImage,
      });
      // CR-380: Step 4 — upload docs to CRM non-blocking (OD-3-B, OD-4-A)
      if (crmCustomerId && frontImage) {
        const docType = CRM_DOC_TYPE[idType] || 'other';
        uploadDocument(crmCustomerId, docType, frontImage).catch(() => {});
        if (backImage) uploadDocument(crmCustomerId, docType, backImage).catch(() => {});
      }
      toast.success(res?.message ?? 'Guest checked in');
      navigate('/pms/in-house'); // CR-358-P2 A-06
```

---

**E-C8 — After corporate section closing `</div>` (before Room Amount grid): Insert primary guest GuestDocsSection**

Insertion point: The block `{isCorpBooking && (...)}` ends with `</div>` then another `</div>` closing the corporate section. Then the Room Amount grid `<div className="grid grid-cols-2 gap-3">` begins.

Insert between corporate closing `</div>` and Room Amount `<div className="grid grid-cols-2 gap-3">`:

```jsx
                    {/* CR-380: Primary guest ID document (OD-3-B, OD-4-A) */}
                    <GuestDocsSection
                      label="Primary Guest"
                      idType={idType}
                      onIdTypeChange={setIdType}
                      frontImage={frontImage}
                      onFrontChange={setFrontImage}
                      backImage={backImage}
                      onBackChange={setBackImage}
                      required={idUploadRequired}
                      hasCrmDocs={crmDocs.length > 0}
                      inputCls={inputCls}
                    />
```

---

**E-C9 — selectArrival reset block (line ~170 area) + selectWalkin reset block (line ~199 area): Add doc state resets**

In `selectArrival` reset block (after existing CRM resets):
```js
    // CR-379: reset CRM + extra guest state
    setCrmCustomer(null); setCrmError(null); setCrmLoading(false); setCrmDocs([]);
    setIsCorpBooking(false); setFirmName(''); setFirmGst('');
```
Add after:
```js
    setIdType('Aadhar card'); setFrontImage(null); setBackImage(null); // CR-380
```

In `selectWalkin` reset block (same pattern):
```js
    setCrmCustomer(null); setCrmError(null); setCrmLoading(false); setCrmDocs([]);
    setIsCorpBooking(false); setFirmName(''); setFirmGst('');
    setExtraAdults([]);
    setChildrenNames([]);
```
Add after `setChildrenNames`:
```js
    setIdType('Aadhar card'); setFrontImage(null); setBackImage(null); // CR-380
```

---

## Edit Summary

| # | ID | File | Type | Description | Lines |
|---|---|---|---|---|---|
| — | — | `GuestDocsSection.jsx` | NEW | ID type picker + front/back file upload tiles + required/hasCrmDocs indicators | ~110 lines |
| 1 | E-P1 | `pmsService.js` | Comment | CR-380 marker | 1 |
| 2 | E-P2 | `pmsService.js` | Rewrite | JSON payload → FormData; all fields mapped; id_type/front/back/extra adult docs | ~40 lines |
| 3 | E-C1 | `CheckInPage.jsx` | Comment | CR-380 marker | 1 |
| 4 | E-C2 | `CheckInPage.jsx` | Import | `uploadDocument` + `GuestDocsSection` + `ID_TYPES` + `CRM_DOC_TYPE` | 2 lines |
| 5 | E-C3 | `CheckInPage.jsx` | State | `idType`, `frontImage`, `backImage` state + `idUploadRequired` useMemo | +5 lines |
| 6 | E-C4 | `CheckInPage.jsx` | Logic | `formValid`: add mandatory-doc gate | 1 line change |
| 7 | E-C5 | `CheckInPage.jsx` | Logic | `selectArrival` extraAdults init shape | 1 line change |
| 8 | E-C6 | `CheckInPage.jsx` | JSX | Adult counter onChange init shape + adult map spread fix + GuestDocsSection per adult | ~15 lines |
| 9 | E-C7 | `CheckInPage.jsx` | Logic | `handleConfirm`: add idType/frontImage/backImage to pmsCheckIn + CRM upload block | +8 lines |
| 10 | E-C8 | `CheckInPage.jsx` | JSX | Primary guest GuestDocsSection after corporate section | +12 lines |
| 11 | E-C9 | `CheckInPage.jsx` | Logic | selectArrival + selectWalkin doc state resets | +2 lines |

**Total: 11 edit sites across 2 files + 1 new file (~190 lines total change).**

---

## ⚠️ BUG-388 + BUG-386 Preservation Checklist (MANDATORY for impl agent)

After E-P2, verify these lines are EXACTLY preserved in the new FormData block:

| BUG | Formula | Must appear as |
|---|---|---|
| BUG-388 | `balance_payment` | `String(to2dp(orderAmount + (p.gstTax ?? 0)))` |
| BUG-386 | `gst_tax` | `String(to2dp(p.gstTax ?? 0))` |
| CR-379 | `customer_id` | Conditional: `if (p.customerId) fd.append(...)` |
| CR-379 | `cust_membership_id` | Same conditional as customer_id |

---

## Risk Register

| Risk | Likelihood | Mitigation |
|---|---|---|
| BUG-388/BUG-386 formulas lost in rewrite | MEDIUM | Explicit preservation checklist above |
| `room_id[0]` bracket notation — backend rejection | LOW | roomService already uses this; same endpoint |
| `extraAdults` name onChange clobbers idType/image | HIGH (without fix) | E-C6 explicitly uses `{ ...item, name: e.target.value }` |
| Mandatory gate blocks walk-in when toggle not set | LOW | `!idUploadRequired` = falsy unless localStorage key === 'true' |
| `uploadDocument` called with null customerId | LOW | Guard `if (crmCustomerId && frontImage)` in E-C7 |
| File size too large for FormData — API 413 | LOW | CRA default 5MB; show user error via toast.error in catch |

---

## Step 4 — Verification Matrix

| V# | Scenario | Edit(s) | How to Verify | Auto? |
|---|---|---|---|---|
| V-01 | Walk-in form shows GuestDocsSection for primary guest | E-C8 | `data-testid="ci-id-type-primary-guest"` element visible | NO |
| V-02 | ID type dropdown has 5 options (Aadhaar/Passport/PAN/DL/VoterID) | GuestDocsSection | Inspect dropdown options | NO |
| V-03 | Front image upload tile clickable, file selected → tile shows filename | GuestDocsSection | Click ci-front-upload-primary-guest, select file | NO |
| V-04 | pmsCheckIn request is multipart/form-data (not JSON) | E-P2 | Network tab: Content-Type = multipart/form-data | NO |
| V-05 | id_type field in network payload = selected value (not "Select document type") | E-P2 | Network tab: form data shows real id_type | NO |
| V-06 | front_image_file present in network payload when image selected | E-P2 | Network tab: front_image_file entry in multipart | NO |
| V-07 | Mandatory-doc gate: toggle ON + no image + no crmDocs → Confirm disabled | E-C4 | Set localStorage toggle to 'true', confirm disabled without image | NO |
| V-08 | Mandatory-doc skip: toggle ON + crmDocs.length > 0 → Confirm enabled | E-C4 | Use phone 9000099013 (has docs) → Confirm enabled without uploading | NO |
| V-09 | adults=3 → extra adult GuestDocsSection renders for Adult 2 + 3 | E-C6 | `data-testid="ci-id-type-adult-2"` and `"ci-id-type-adult-3"` present | NO |
| V-10 | Extra adult idType not wiped when adult name is typed | E-C6 | Select Passport for Adult 2 → type name → Passport still selected | NO |
| V-11 | id_type2 in network payload = Adult 2 selected value | E-P2 + E-C6 | Network tab: id_type2 field present and correct | NO |
| V-12 | front_image_file2 in network payload when Adult 2 has image | E-P2 + E-C6 | Network tab: front_image_file2 entry | NO |
| V-13 | Walk-in button click → idType resets to Aadhar card, images clear | E-C9 | Click Walk-in → GuestDocsSection shows fresh state | NO |
| V-14 | CRM upload called after success (uploadDocument) | E-C7 | Network: POST to /pos/customers/{id}/documents fired after check-in | NO |
| V-15 | room_id[0] in FormData (not JSON array) | E-P2 | Network tab multipart: key=room_id[0] | NO |

---

## Step 5 — Post-Code Registry Checklist (EXIT GATE)

```
□ 1. REGISTRY SYNC:
     python3 -c "
     import json
     with open('/app/memory/control/registry.json') as f:
         data = json.load(f)
     items = {i['id']: i for i in data['items']}
     assert 'CR-380' in items, 'CR-380 MISSING'
     s = items['CR-380'].get('status','')
     assert 'IMPLEMENTED' in s or 'GATE_5' in s, f'CR-380 not IMPLEMENTED: {s}'
     print('Registry sync PASS')
     "

□ 2. CR_REGISTRY.MD: CR-380 row updated to GATE_5A_IMPLEMENTED

□ 3. FILE_OWNERSHIP.MD: Add entries:
     CheckInPage.jsx   — CR-380 — 2026-09-xx
     pmsService.js     — CR-380 — 2026-09-xx
     GuestDocsSection.jsx — CR-380 NEW — 2026-09-xx

□ 4. CODE MARKERS: Every modified file has // CR-380 comment

□ 5. COMPILE CHECK: webpack compiled with 0 new warnings
     AND BUG-388/BUG-386 formulas verified in new FormData block
```

---

## Gate 3 Summary

```
Planning complete: CR-380
Stage:             Impact Analysis (Gate 2) + Implementation Plan (Gate 3)
Code reality:      NONE — full plan applies
Risk:              HIGH
Files WILL change: GuestDocsSection.jsx (NEW ~110 lines) + CheckInPage.jsx (MAJOR ~80 lines) + pmsService.js (MINOR ~40 lines)
Files WILL NOT:    documentService, customerService, RoomCheckInModal, roomService, NewBookingPage
Owner decisions:   All resolved (OD-3-B, OD-4-A, OD-5-A)
Edit sites:        11 (1 new file + 2 pmsService + 9 CheckInPage)
Verification:      15 manual checks (V-01..V-15)
Key risk:          BUG-388/BUG-386 formula preservation in E-P2 (checklist provided)
Next:              OWNER APPROVAL REQUIRED — Gate 4 GO before implementation
```
