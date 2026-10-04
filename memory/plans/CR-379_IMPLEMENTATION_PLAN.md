# CR-379 — Gate 3: Implementation Plan
## New PMS Check-In: CRM Customer Link (Core)

```
CR ID:          CR-379
Gate:           3 — Implementation Plan
Written:        2026-09-13
Author:         Agent (PLANNING role)
Status:         COMPLETE — Awaiting Gate 4 GO
Risk:           HIGH
Sprint:         pos_pms_1
Depends on:     Gate 2 (DONE) · Gate 2.5 Design Freeze (DONE, 8 decisions DD-1..DD-8)
Blocks:         CR-380 planning (must not start until CR-379 Gate 4 GO)
Prerequisite:   CR-358-P5 must merge pmsService.js before this — rebasing note in §Conflicts
```

---

## Step 0 — Code Reality Verification (MANDATORY before coding)

Lines verified against current file state (2026-09-13):

| IA Claim | Current File | Match? |
|---|---|---|
| IA §2.4: `pmsCheckIn` at lines 136–172 | Confirmed: lines 136–172 | ✅ |
| IA §2.4: `children_name: ''` at line 155 | Confirmed: line 155 | ✅ |
| IA §2.4: `booking_for: 'Individual'` at line 159 | Confirmed: line 159 | ✅ |
| IA §2.4: `firm_name: ''` at line 167 | Confirmed: line 167 | ✅ |
| IA §2.4: `firm_gst: ''` at line 168 | Confirmed: line 168 | ✅ |
| IA §2.5A: CheckInPage.jsx imports at lines 1–9 | Confirmed (no CRM import) | ✅ |
| IA §2.5B: `submitting` state at line 34 | Confirmed: line 34 | ✅ |
| IA §2.5C: phone input onChange at line 340 | Confirmed: inline setField call | ✅ |
| IA §2.5D: panel header ends before line 330 | Confirmed: header `</div>` at line 327 | ✅ |
| IA §2.5E: GST strip ends, note block starts at ~line 436 | Confirmed: line 436 | ✅ |

Code Reality: **NONE** — no CRM code exists in either file. Full plan applies.

---

## Step 1 — Conflict Pre-Check

| File | Last modifier | Active CRs on same file | Safe? |
|---|---|---|---|
| `CheckInPage.jsx` | CR-358-P2, BUG-386/388 | None active | ✅ |
| `pmsService.js` | CR-358-P5 (Gate 3, pending) | CR-358-P5 | ⚠ Rebase risk |

**CR-358-P5 conflict note:** CR-358-P5 also modifies `pmsService.js`. If CR-358-P5 merges before CR-379 implementation begins, the implementation agent MUST:
1. `git log -- frontend/src/api/services/pmsService.js` to find what changed
2. Re-verify that `pmsCheckIn` payload lines still match this plan's line numbers
3. Apply edits against the merged file (no logic conflict expected — different sections)

---

## Gate 3 — Implementation Plan

### Scope Lock

**Files WILL change:**
- `frontend/src/pages/pms/CheckInPage.jsx` (MAJOR — ~130 lines added/changed)
- `frontend/src/api/services/pmsService.js` (MINOR — ~15 lines changed/added)

**Files WILL NOT touch:**
- `frontend/src/api/services/customerService.js` (read-only — used as-is)
- `frontend/src/api/services/documentService.js` (read-only — used as-is)
- `frontend/src/api/services/roomService.js` (old flow — R14 scope-lock)
- `frontend/src/components/modals/RoomCheckInModal.jsx` (old flow — R14 scope-lock)
- `frontend/src/pages/pms/NewBookingPage.jsx` (OD-2 explicitly excluded)
- Any backend file
- Any other file

---

### Edit Register

#### FILE 1 — `frontend/src/api/services/pmsService.js`

---

**E-P1 — Line 1: Add CR-379 marker comment**

```
CURRENT (line 1):
// CR-358-P1 | BUG-378 | CR-358-P2 | CR-358-P3 | CR-358-P4: PMS aggregation + booking/check-in...

NEW (line 1):
// CR-358-P1 | BUG-378 | CR-358-P2 | CR-358-P3 | CR-358-P4 | CR-379: PMS aggregation + booking/check-in...
```

---

**E-P2 — Lines 155, 159, 167–169: Upgrade 4 hardcoded fields + add 7 CRM/extra-guest fields**

Current `pmsCheckIn` payload (lines 145–169):
```js
const payload = {
  booking_type:    p.bookingType,
  ...(p.bookingType !== 'WalkIn' ? { booking_id: p.bookingId } : {}),
  name:            p.name,
  phone:           p.phone,
  email:           p.email ?? '',
  room_id:         [Number(p.restaurantTableId)],
  id_type:         'Select document type',
  total_adult:     Number(p.adults ?? 1),
  total_children:  Number(p.children ?? 0),
  children_name:   '',                              // ← line 155: upgrade
  checkin_date:    p.checkin,
  checkout_date:   p.checkout,
  booking_details: '',
  booking_for:     'Individual',                    // ← line 159: upgrade
  order_amount:    orderAmount,
  room_price:      orderAmount,
  advance_payment: advance,
  balance_payment: to2dp(orderAmount + (p.gstTax ?? 0)),
  payment_method:  p.paymentMethod ?? '',
  order_note:      p.note ?? '',
  gst_tax:         to2dp(p.gstTax ?? 0),
  firm_name:       '',                              // ← line 167: upgrade
  firm_gst:        '',                              // ← line 168: upgrade + add below
};
```

After edit — changed lines highlighted:
```js
const payload = {
  booking_type:    p.bookingType,
  ...(p.bookingType !== 'WalkIn' ? { booking_id: p.bookingId } : {}),
  name:            p.name,
  phone:           p.phone,
  email:           p.email ?? '',
  room_id:         [Number(p.restaurantTableId)],
  id_type:         'Select document type',
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
  balance_payment: to2dp(orderAmount + (p.gstTax ?? 0)),
  payment_method:  p.paymentMethod ?? '',
  order_note:      p.note ?? '',
  gst_tax:         to2dp(p.gstTax ?? 0),
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
```

**New `pmsCheckIn` parameter contract (add as JSDoc before function):**
```js
// CR-379 additions:
// p.customerId     — string | null     — CRM customer UUID (optional, non-blocking)
// p.extraAdults    — Array<{name}>     — extra adults beyond primary (OD-5A)
// p.childrenNames  — Array<string>     — child names (OD-5A)
// p.bookingFor     — 'Individual' | 'Corporate'
// p.firmName       — string            — corporate firm name (DD-7)
// p.firmGst        — string            — corporate GST number (DD-7)
```

---

#### FILE 2 — `frontend/src/pages/pms/CheckInPage.jsx`

---

**E-C1 — Line 1: Add CR-379 marker**

```
CURRENT:
// CR-358-P2 | BUG-386: S4 — Check-In Page.

NEW:
// CR-358-P2 | BUG-386 | CR-379: S4 — Check-In Page. CR-379: CRM customer link, returning-guest badge, extra adults/children, corporate B2B.
```

---

**E-C2 — Line 2: Add `useRef` to React import**

```
CURRENT:
import { useState, useEffect, useCallback, useMemo } from 'react';

NEW:
import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
```

---

**E-C3 — Line 4: Add lucide icons (`BadgeCheck`, `FileText`)**

```
CURRENT:
import { Search, Plus, UserPlus, Loader2, AlertCircle, Check, Home, Calendar, User, Phone, Info, BedDouble } from 'lucide-react';

NEW:
import { Search, Plus, UserPlus, Loader2, AlertCircle, Check, Home, Calendar, User, Phone, Info, BedDouble, BadgeCheck, FileText } from 'lucide-react';
```

---

**E-C4 — Lines 7–9: Add customerService and documentService imports**

```
CURRENT (lines 7–9):
import { getPmsReservations, getBookableRooms, pmsCheckIn } from '@/api/services/pmsService';
import { useRestaurant } from '@/contexts'; // BUG-386
import { computeRoomGst } from '@/utils/roomGstCalculator'; // BUG-386

NEW (lines 7–12):
import { getPmsReservations, getBookableRooms, pmsCheckIn } from '@/api/services/pmsService';
import { lookupCustomer, createCustomer, updateCustomer } from '@/api/services/customerService'; // CR-379
import { getDocuments } from '@/api/services/documentService'; // CR-379
import { useRestaurant } from '@/contexts'; // BUG-386
import { computeRoomGst } from '@/utils/roomGstCalculator'; // BUG-386
```

---

**E-C5 — After line 34 (`[submitting, setSubmitting]`): Add CRM + extra guest + corporate state + lookup ref**

Insert after line 34:

```js
  // CR-379: CRM customer link state
  const [crmCustomer, setCrmCustomer]   = useState(null);  // null = no match / not searched; object = returning guest
  const [crmLoading,  setCrmLoading]    = useState(false);
  const [crmError,    setCrmError]      = useState(null);   // string = timeout/offline message
  const [crmDocs,     setCrmDocs]       = useState([]);     // docs-on-file for returning guest (DD-4)
  // CR-379: Extra guests (OD-5A, DD-5, DD-6)
  const [extraAdults,   setExtraAdults]   = useState([]);   // [{name:''}] length = adults - 1
  const [childrenNames, setChildrenNames] = useState([]);   // [''] length = children
  // CR-379: Corporate B2B (DD-7)
  const [isCorpBooking, setIsCorpBooking] = useState(false);
  const [firmName,      setFirmName]      = useState('');
  const [firmGst,       setFirmGst]       = useState('');
  // CR-379: stale-lookup guard — prevents race condition when phone changes mid-request
  const crmLookupPhoneRef = useRef(null);
```

---

**E-C6 — After line 99 (`defaultRoomForType` closing brace), before line 101 (`selectArrival`): Insert `handleCrmLookup`**

Insert between lines 99 and 101:

```js
  // CR-379: CRM lookup + docs-on-file fetch. Non-blocking (OD-1A). Stale-guard: crmLookupPhoneRef.
  const handleCrmLookup = useCallback(async (phone) => {
    crmLookupPhoneRef.current = phone;
    setCrmLoading(true);
    setCrmError(null);
    setCrmCustomer(null);
    setCrmDocs([]);
    try {
      const result = await lookupCustomer(phone);
      if (crmLookupPhoneRef.current !== phone) return; // stale — phone changed while request was in-flight
      setCrmCustomer(result); // null = not found; object = returning guest
      if (result?.id) {
        // DD-4: fetch docs immediately after successful lookup (read-only display in CR-379)
        try {
          const docs = await getDocuments(result.id);
          if (crmLookupPhoneRef.current !== phone) return;
          setCrmDocs(docs);
        } catch {
          // Silent — docs-on-file display is informational only
        }
      }
    } catch (err) {
      if (crmLookupPhoneRef.current !== phone) return;
      // lookupCustomer throws only for CRM_TIMEOUT; 4xx = null returned (no throw)
      if (err?.type === 'CRM_TIMEOUT') {
        setCrmError(err.message || 'CRM lookup failed (Timeout / Offline)');
      }
    } finally {
      if (crmLookupPhoneRef.current === phone) setCrmLoading(false);
    }
  }, []); // deps: [] — only uses stable state setters and module-level service functions
```

---

**E-C7 — Lines 101–120 (`selectArrival`): Add CRM/extra-guest reset + OTA auto-lookup**

```
CURRENT signature end of selectArrival (inside the callback, after setForm({...})):
  }, [defaultRoomForType, today]);

NEW — insert the following block between setForm({...}) and `}, [defaultRoomForType, today]);`:
    // CR-379: reset CRM + extra guest state for this selection
    setCrmCustomer(null); setCrmError(null); setCrmLoading(false); setCrmDocs([]);
    setIsCorpBooking(false); setFirmName(''); setFirmGst('');
    const adultCount = a.adults ?? 1;
    setExtraAdults(Array.from({ length: Math.max(0, adultCount - 1) }, () => ({ name: '' })));
    setChildrenNames(Array.from({ length: a.children ?? 0 }, () => ''));
    // OD-6A: OTA phone auto-lookup (DD-1)
    if ((a.phone ?? '').length === 10) handleCrmLookup(a.phone);

AND update deps array:
  }, [defaultRoomForType, today, handleCrmLookup]);
```

Full replacement of `selectArrival` (for implementation agent — exact current→new):

```js
// CURRENT (lines 101–120):
  const selectArrival = useCallback((a, roomsList) => {
    setIsWalkin(false);
    setSelected(a);
    setForm({
      bookingType: a.bookingType,
      bookingId: a.bookingId,
      name: a.guestName,
      phone: a.phone,
      email: a.email,
      restaurantTableId: a.restaurantTableId ?? defaultRoomForType(a.roomCode, roomsList),
      checkin: a.checkin ?? today,
      checkout: a.checkout ?? addDays(today, 1),
      orderAmount: a.amount ?? '',
      advancePayment: '',
      adults: a.adults,
      children: a.children,
      note: a.specialRequests,
      _arrivalRoomCode: a.roomCode,
    });
  }, [defaultRoomForType, today]);

// NEW:
  const selectArrival = useCallback((a, roomsList) => {
    setIsWalkin(false);
    setSelected(a);
    setForm({
      bookingType: a.bookingType,
      bookingId: a.bookingId,
      name: a.guestName,
      phone: a.phone,
      email: a.email,
      restaurantTableId: a.restaurantTableId ?? defaultRoomForType(a.roomCode, roomsList),
      checkin: a.checkin ?? today,
      checkout: a.checkout ?? addDays(today, 1),
      orderAmount: a.amount ?? '',
      advancePayment: '',
      adults: a.adults,
      children: a.children,
      note: a.specialRequests,
      _arrivalRoomCode: a.roomCode,
    });
    // CR-379: reset CRM + extra guest state
    setCrmCustomer(null); setCrmError(null); setCrmLoading(false); setCrmDocs([]);
    setIsCorpBooking(false); setFirmName(''); setFirmGst('');
    const adultCount = a.adults ?? 1;
    setExtraAdults(Array.from({ length: Math.max(0, adultCount - 1) }, () => ({ name: '' })));
    setChildrenNames(Array.from({ length: a.children ?? 0 }, () => ''));
    // OD-6A: OTA arrival phone auto-lookup (DD-1)
    if ((a.phone ?? '').length === 10) handleCrmLookup(a.phone);
  }, [defaultRoomForType, today, handleCrmLookup]);
```

---

**E-C8 — Lines 122–142 (`selectWalkin`): Add CRM/extra-guest reset**

```
// NEW selectWalkin (adds reset block after setForm):
  const selectWalkin = useCallback((prefill, roomsList) => {
    const rs = roomsList || rooms;
    setIsWalkin(true);
    setSelected({ bookingType: 'WalkIn' });
    setForm({
      bookingType: 'WalkIn',
      bookingId: null,
      name: prefill?.name ?? '',
      phone: prefill?.phone ?? '',
      email: prefill?.email ?? '',
      restaurantTableId: prefill?.restaurantTableId ?? rs[0]?.id ?? null,
      checkin: prefill?.checkin ?? today,
      checkout: prefill?.checkout ?? addDays(today, 1),
      orderAmount: prefill?.orderAmount ?? '',
      advancePayment: '',
      adults: prefill?.adults ?? 1,
      children: prefill?.children ?? 0,
      note: prefill?.note ?? '',
      _arrivalRoomCode: null,
    });
    // CR-379: reset CRM + extra guest state
    setCrmCustomer(null); setCrmError(null); setCrmLoading(false); setCrmDocs([]);
    setIsCorpBooking(false); setFirmName(''); setFirmGst('');
    setExtraAdults([]);
    setChildrenNames([]);
    // Auto-lookup if prefill has a 10-digit phone (walk-in from FrontDesk)
    if ((prefill?.phone ?? '').length === 10) handleCrmLookup(prefill.phone);
  }, [rooms, today, handleCrmLookup]);
```

---

**E-C9 — After line 144 (`const setField = ...`): Add `handlePhoneChange`**

Insert after line 144:

```js
  // CR-379: phone change handler — triggers CRM lookup on 10 digits (DD-1)
  const handlePhoneChange = (digits) => {
    setField('phone', digits);
    if (digits.length === 10) {
      handleCrmLookup(digits);
    } else {
      // Cancel any in-flight lookup immediately when user edits phone
      crmLookupPhoneRef.current = null;
      setCrmLoading(false);
      setCrmCustomer(null);
      setCrmError(null);
      setCrmDocs([]);
    }
  };
```

---

**E-C10 — Line 340: Replace inline `setField` call in phone input onChange**

```
CURRENT (line 340):
  onChange={e => setField('phone', e.target.value.replace(/\D/g, '').slice(0, 10))}

NEW:
  onChange={e => handlePhoneChange(e.target.value.replace(/\D/g, '').slice(0, 10))}
```

---

**E-C11 — Between lines 327 (`</div>` end of panel header) and 330 (`<div className="p-5 space-y-4">`): Insert CRM badge block (4 states — DD-2, DD-3, DD-4, DD-8)**

Insert between the panel header closing `</div>` and the form `<div className="p-5 space-y-4">`:

```jsx
                  {/* CR-379: CRM badge — 4 states: loading / returning / new / failed (DD-2, DD-8) */}
                  {form.phone?.length === 10 && (
                    <div className="px-5 pt-3 pb-0">
                      {/* State 1: loading */}
                      {crmLoading && (
                        <div data-testid="ci-crm-loading"
                          className="flex items-center gap-2 text-[12px] text-[#888] bg-gray-50 rounded-lg px-3 py-2">
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span>Looking up CRM…</span>
                        </div>
                      )}
                      {/* State 4: failed / CRM offline (DD-8 — amber non-blocking) */}
                      {!crmLoading && crmError && (
                        <div data-testid="ci-crm-error"
                          className="flex items-center gap-2 text-[12px] text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                          <div>
                            <div className="font-medium">CRM lookup failed (Timeout / Offline)</div>
                            <div className="text-[11px] text-amber-600">Check-in will proceed without loyalty link.</div>
                          </div>
                        </div>
                      )}
                      {/* State 2: returning guest (DD-3 — 4-column stats + docs) */}
                      {!crmLoading && !crmError && crmCustomer && (
                        <div data-testid="ci-crm-badge"
                          className="rounded-xl border border-[#BBF7D0] bg-[#F0FDF4] p-3">
                          <div className="flex items-center gap-2 mb-2.5">
                            <BadgeCheck className="w-4 h-4 text-[#329937]" />
                            <span className="text-[12px] font-semibold text-[#329937]">Returning Guest</span>
                            {crmCustomer.tier && (
                              <span className="ml-auto text-[10px] px-2 py-0.5 rounded-full bg-[#329937]/10 text-[#329937] font-medium">
                                {crmCustomer.tier}
                              </span>
                            )}
                          </div>
                          {/* DD-3: 4-column stats row */}
                          <div className="grid grid-cols-4 gap-2 mb-1">
                            {[
                              {
                                label: 'Stays',
                                value: crmCustomer.totalVisits ?? '—',
                                sub: null,
                              },
                              {
                                label: 'Last Stay',
                                value: crmCustomer.lastVisit
                                  ? new Date(crmCustomer.lastVisit).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })
                                  : '—',
                                sub: null,
                              },
                              {
                                label: 'Loyalty Pts',
                                // pointsValue (api.points_value) = ₹ equivalent — mapped directly in
                                // customerTransform.fromAPI.customerLookup line 93. No rate calculation needed.
                                value: crmCustomer.totalPoints != null ? String(crmCustomer.totalPoints) : '0',
                                sub: crmCustomer.pointsValue
                                  ? `≈ ₹${Number(crmCustomer.pointsValue).toLocaleString('en-IN')}`
                                  : null,
                              },
                              {
                                label: 'Store Credit',
                                value: crmCustomer.walletBalance != null
                                  ? `₹${Number(crmCustomer.walletBalance).toLocaleString('en-IN')}`
                                  : '₹0',
                                sub: 'Prepaid balance',
                              },
                            ].map((stat, i) => (
                              <div key={i} className="text-center">
                                <div className="text-[13px] font-bold text-[#1A1A1A]">{stat.value}</div>
                                <div className="text-[10px] text-[#888] mt-0.5">{stat.label}</div>
                                {stat.sub && <div className="text-[9px] text-[#329937] font-medium">{stat.sub}</div>}
                              </div>
                            ))}
                          </div>
                          {/* DD-4: Documents on file — read-only cards (CR-380 owns upload) */}
                          {crmDocs.length > 0 && (
                            <div className="mt-2 pt-2 border-t border-[#BBF7D0]">
                              <div className="text-[10px] text-[#888] font-medium uppercase tracking-wide mb-1.5">
                                Documents on file
                              </div>
                              <div className="flex flex-wrap gap-1.5">
                                {crmDocs.map((doc, i) => (
                                  <div key={i} data-testid={`ci-doc-card-${doc.doc_type}`}
                                    className="flex items-center gap-1.5 text-[10px] bg-white border border-[#BBF7D0] rounded-lg px-2 py-1">
                                    <FileText className="w-3 h-3 text-[#329937] shrink-0" />
                                    <span className="font-medium capitalize">{(doc.doc_type ?? '').replace(/_/g, ' ')}</span>
                                    {doc.uploaded_at && (
                                      <span className="text-[#888]">
                                        · {new Date(doc.uploaded_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' })}
                                      </span>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                      {/* State 3: new guest (no badge needed, subtle indicator) */}
                      {!crmLoading && !crmError && !crmCustomer && (
                        <div data-testid="ci-crm-new-guest"
                          className="flex items-center gap-2 text-[12px] text-[#888] bg-gray-50 rounded-lg px-3 py-2">
                          <User className="w-3.5 h-3.5 shrink-0" />
                          <span>New guest — will be registered in CRM on check-in</span>
                        </div>
                      )}
                    </div>
                  )}
```

---

**E-C12 — Between lines 375 (`</div>` end of date grid) and 377 (`<div className="grid grid-cols-2 gap-3">` start of amount grid): Insert occupancy counter + extra names + corporate toggle (DD-5, DD-6, DD-7)**

Insert between the closing `</div>` of the dates section and the opening of the amounts section:

```jsx
                    {/* CR-379: Occupancy & Guest Name Register (DD-5, DD-6) */}
                    <div>
                      <label className="text-[12px] text-[#888] mb-1.5 block font-medium">
                        Occupancy & Guest Register
                      </label>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-[11px] text-[#888] mb-1 block">Adults</label>
                          <input
                            data-testid="ci-adults"
                            type="number" min="1" max="10"
                            value={form.adults}
                            onChange={e => {
                              const v = Math.max(1, Number(e.target.value) || 1);
                              setField('adults', v);
                              setExtraAdults(prev =>
                                Array.from({ length: v - 1 }, (_, i) => prev[i] ?? { name: '' })
                              );
                            }}
                            className={inputCls}
                          />
                        </div>
                        <div>
                          <label className="text-[11px] text-[#888] mb-1 block">Children</label>
                          <input
                            data-testid="ci-children"
                            type="number" min="0" max="10"
                            value={form.children}
                            onChange={e => {
                              const v = Math.max(0, Number(e.target.value) || 0);
                              setField('children', v);
                              setChildrenNames(prev =>
                                Array.from({ length: v }, (_, i) => prev[i] ?? '')
                              );
                            }}
                            className={inputCls}
                          />
                        </div>
                      </div>
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
                      {/* DD-6: Children name inputs — one per child */}
                      {childrenNames.map((name, i) => (
                        <div key={i} className="mt-2">
                          <input
                            data-testid={`ci-child-name-${i + 1}`}
                            value={name}
                            onChange={e =>
                              setChildrenNames(prev =>
                                prev.map((item, idx) => idx === i ? e.target.value : item)
                              )
                            }
                            placeholder={`Child ${i + 1} Name & Age`}
                            className={`${inputCls} border-purple-200 focus:border-purple-400`}
                          />
                        </div>
                      ))}
                    </div>

                    {/* CR-379: Corporate / B2B toggle (DD-7) */}
                    <div>
                      <label className="flex items-center gap-2 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          data-testid="ci-corp-toggle"
                          checked={isCorpBooking}
                          onChange={e => setIsCorpBooking(e.target.checked)}
                          className="rounded border-[#E5E5E5] text-[#329937] focus:ring-[#329937]"
                        />
                        <span className="text-[13px] text-[#1A1A1A] font-medium">Corporate / B2B Billing</span>
                      </label>
                      <p className="text-[11px] text-[#888] mt-0.5 ml-5">
                        Check if invoice is raised to company GSTIN
                      </p>
                      {isCorpBooking && (
                        <div className="mt-2 space-y-2 ml-5">
                          <input
                            data-testid="ci-firm-name"
                            value={firmName}
                            onChange={e => setFirmName(e.target.value)}
                            placeholder="Company / Firm Name"
                            className={inputCls}
                          />
                          <input
                            data-testid="ci-firm-gst"
                            value={firmGst}
                            onChange={e => setFirmGst(e.target.value)}
                            placeholder="GST Number (e.g. 29XXXXX1234N1Z5)"
                            className={inputCls}
                          />
                        </div>
                      )}
                    </div>
```

---

**E-C13 — Lines 164–200 (`handleConfirm`): Add CRM create-if-new + corporate sync before `pmsCheckIn` call**

```
CURRENT (lines 164–200):
  const handleConfirm = async () => {
    if (!formValid || submitting) return;
    setSubmitting(true);
    try {
      // BUG-386: compute GST before submit
      const gstBase = Number(form.orderAmount) + Number(form.advancePayment || 0);
      const { gstTotal: gstTax } = computeRoomGst(
        roomGstApplicable,
        roomGstSlabs,
        gstBase,
        formNights ?? 1,
        1
      );
      const res = await pmsCheckIn({
        bookingType: form.bookingType,
        bookingId: form.bookingId,
        name: form.name.trim(),
        phone: form.phone,
        email: form.email,
        restaurantTableId: form.restaurantTableId,
        checkin: form.checkin,
        checkout: form.checkout,
        orderAmount: Number(form.orderAmount),
        advancePayment: Number(form.advancePayment || 0),
        adults: Number(form.adults),
        children: Number(form.children),
        note: form.note,
        gstTax,
      });
      toast.success(res?.message ?? 'Guest checked in');
      navigate('/pms/in-house');
    } catch (err) {
      toast.error(err?.response?.data?.message ?? 'Check-in failed');
    } finally {
      setSubmitting(false);
    }
  };

NEW (full replacement):
  const handleConfirm = async () => {
    if (!formValid || submitting) return;
    setSubmitting(true);
    try {
      // BUG-386: compute GST before submit — BUG-388: gstBase includes advance
      const gstBase = Number(form.orderAmount) + Number(form.advancePayment || 0);
      const { gstTotal: gstTax } = computeRoomGst(
        roomGstApplicable,
        roomGstSlabs,
        gstBase,
        formNights ?? 1,
        1
      );

      // CR-379: Step 1 — resolve CRM customer ID (OD-1A: non-blocking)
      let crmCustomerId = crmCustomer?.id ?? null;
      if (!crmCustomerId) {
        try {
          const created = await createCustomer(
            { name: form.name.trim(), phone: form.phone, email: form.email ?? '' },
            restaurant?.id
          );
          crmCustomerId = created?.customer_id ?? null;
        } catch {
          toast.warning('Could not link to CRM — proceeding without loyalty link.');
          // Non-blocking: check-in continues with crmCustomerId = null
        }
      }

      // CR-379: Step 2 — corporate GST sync (DD-7, non-blocking)
      if (isCorpBooking && crmCustomerId && firmGst) {
        try {
          await updateCustomer(
            crmCustomerId,
            { gstName: firmName, gstNumber: firmGst },
            restaurant?.id
          );
        } catch {
          // Non-blocking: corporate GST sync failure does not block check-in
        }
      }

      // CR-379: Step 3 — pmsCheckIn with CRM + extra guest params
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
      navigate('/pms/in-house');
    } catch (err) {
      toast.error(err?.response?.data?.message ?? 'Check-in failed');
    } finally {
      setSubmitting(false);
    }
  };
```

---

### Edit Summary

| # | ID | File | Type | Description | Lines affected |
|---|---|---|---|---|---|
| 1 | E-P1 | `pmsService.js` | Comment | Add CR-379 marker | 1 |
| 2 | E-P2 | `pmsService.js` | Change+Add | Upgrade 4 payload fields + add 8 CRM/extra-adult fields | 155, 159, 167–168 + 7 new |
| 3 | E-C1 | `CheckInPage.jsx` | Comment | Add CR-379 marker | 1 |
| 4 | E-C2 | `CheckInPage.jsx` | Import | Add `useRef` | 2 |
| 5 | E-C3 | `CheckInPage.jsx` | Import | Add `BadgeCheck`, `FileText` icons | 4 |
| 6 | E-C4 | `CheckInPage.jsx` | Import | Add customerService + documentService | 7–9 |
| 7 | E-C5 | `CheckInPage.jsx` | State | Add 10 new state vars + 1 ref | after 34 |
| 8 | E-C6 | `CheckInPage.jsx` | New fn | `handleCrmLookup` useCallback | after 99 |
| 9 | E-C7 | `CheckInPage.jsx` | Existing fn | `selectArrival` — add reset + OTA lookup | 101–120 |
| 10 | E-C8 | `CheckInPage.jsx` | Existing fn | `selectWalkin` — add reset + prefill lookup | 122–142 |
| 11 | E-C9 | `CheckInPage.jsx` | New fn | `handlePhoneChange` | after 144 |
| 12 | E-C10 | `CheckInPage.jsx` | JSX | Phone input onChange → `handlePhoneChange` | 340 |
| 13 | E-C11 | `CheckInPage.jsx` | JSX | CRM badge block (4 states) | after 327 |
| 14 | E-C12 | `CheckInPage.jsx` | JSX | Occupancy counter + extra names + corporate toggle | 375–377 |
| 15 | E-C13 | `CheckInPage.jsx` | Existing fn | `handleConfirm` — CRM sequence + updated payload | 164–200 |

**Total:** 15 edit sites across 2 files. No new files. No backend changes.

---

### Risk Register

| Risk | Likelihood | Mitigation |
|---|---|---|
| CRM lookup fires on every OTA load (double-trigger from selectArrival + useEffect) | LOW | No useEffect dependency — only explicit calls in selectArrival/handlePhoneChange |
| Stale lookup overwrites fresh result | LOW | `crmLookupPhoneRef` stale-guard cancels in-flight result on phone change |
| `createCustomer` fails for returning guest who changed phone | LOW | CRM UUID from lookup used; create only called when lookup returns null |
| CR-358-P5 pmsService.js merge conflict | MEDIUM | Rebasing note in Conflict section; additive changes, no logic overlap |
| `customerTransform.toAPI.updateCustomer` doesn't accept `gstName`/`gstNumber` | LOW | Impl agent must verify field names in `customerTransform.js` before coding E-C13 |
| Points-to-rupee rate incorrect | LOW | Impl agent to verify rate from `loyaltyTransform.js:remainingPointsValue` (see §Notes) |
| Extra adult inputs not resizing form correctly on mobile | LOW | Form is right-panel only (desktop PMS); no mobile viewport requirement |

---

### Implementation Notes for Agent

1. **Loyalty points rate:** `loyaltyTransform.js` has `remaining_points_value` — verify the conversion factor before setting the `≈ ₹` subtitle. Current plan uses 1:1 (1 pt = ₹1). If the transform uses a different rate, update the subtitle calculation in E-C11.

2. **`updateCustomer` field names:** The plan passes `{ gstName: firmName, gstNumber: firmGst }`. Before coding E-C13, check `customerTransform.toAPI.updateCustomer` in `customerTransform.js` to confirm these field keys map correctly to the CRM API fields (`gst_name` / `gst_number` expected).

3. **`useCallback` deps for `selectArrival`/`selectWalkin`:** Add `handleCrmLookup` to the deps arrays. ESLint exhaustive-deps will otherwise warn. Since `handleCrmLookup` has `[]` deps it is stable — no loop risk.

4. **`crmLookupPhoneRef.current = null` in selectArrival/selectWalkin resets:** The reset block sets `setCrmLoading(false)` explicitly before potentially triggering a new lookup. This prevents the spinner from lingering if a previous search was in-flight.

5. **Form validity unchanged:** `formValid` at line 151 already checks `form.adults >= 1`. No change needed. Extra adult names are optional (non-blocking).

6. **CR-380 boundary:** The `uploadDocument` function from `documentService.js` is NOT called anywhere in this CR. The "Add new doc (CR-380)" CTA mentioned in DD-4 is deferred to CR-380. Doc cards in E-C11 are read-only display only.

7. **`id_type` field (E-P2):** The existing `id_type: 'Select document type'` remains hardcoded. Extra adult ID types (`id_type2`, `id_type3`, `id_type4`) are sent as `''` for now. CR-380 will add the document type selector UI and real values.

---

### Execution Sequence

For the Implementation agent, apply edits in this order to minimise mid-edit compile errors:

```
1. E-P1, E-P2          → pmsService.js (commit: "CR-379: pmsCheckIn CRM + extra guest fields")
2. E-C1, E-C2, E-C3, E-C4  → CheckInPage.jsx imports + state (compile check after)
3. E-C6                → add handleCrmLookup (compile check)
4. E-C7, E-C8          → update selectArrival, selectWalkin (compile check)
5. E-C9, E-C10         → add handlePhoneChange + update phone input (compile check)
6. E-C11               → CRM badge block JSX (compile check)
7. E-C12               → Occupancy + corporate JSX (compile check)
8. E-C13               → handleConfirm CRM sequence (compile check — FINAL)
```

---

## Step 4 — Verification Matrix

| V# | Scenario | Edit(s) | How to Verify | Auto? |
|---|---|---|---|---|
| V-01 | WalkIn: type 10-digit new phone | E-C9, E-C10, E-C6 | `ci-crm-new-guest` div appears, no badge | NO |
| V-02 | WalkIn: type 10-digit known CRM phone | E-C9, E-C10, E-C6 | `ci-crm-badge` appears with tier + 4 stats | NO |
| V-03 | Confirm on new guest | E-C13, E-P2 | Network: `customer_id` field present in pmsCheckIn request body | NO |
| V-04 | Confirm on returning guest | E-C13, E-P2 | Network: `customer_id` = CRM id from lookup; `createCustomer` NOT called | NO |
| V-05 | CRM API down during lookup | E-C6, E-C11 | `ci-crm-error` amber banner appears; Confirm button still enabled | NO |
| V-06 | CRM API down during create (confirm) | E-C13 | `toast.warning` toast fires; check-in proceeds; `customer_id` absent from payload | NO |
| V-07 | OTA arrival pre-populated phone (10 digits) | E-C7, E-C6 | On arrival card selection: `ci-crm-loading` → `ci-crm-badge` (if found) | NO |
| V-08 | Adults = 3, enter Adult 2 + Adult 3 names | E-C12, E-P2 | Network: `name2`, `name3` fields non-empty in payload | NO |
| V-09 | Children = 2, enter child names | E-C12, E-P2 | Network: `children_name` = "ChildA,ChildB" in payload | NO |
| V-10 | Corporate toggle + GST filled, confirm | E-C12, E-C13, E-P2 | Network: `booking_for: 'Corporate'`, `firm_name`, `firm_gst` present; `updateCustomer` called before `pmsCheckIn` | NO |
| V-11 | BUG-090 regression — CRM-linked check-in | E-P2, E-C13 | Network: `cust_membership_id` non-null = same value as `customer_id` | NO |
| V-12 | Returning guest has docs on file | E-C6, E-C11 | `ci-doc-card-{doc_type}` elements visible with type label and date | NO |
| V-13 | Stale-guard: type 9 digits, quickly type 10th | E-C6, E-C9 | Only ONE lookup fires; no double-state-set in React DevTools | NO |

---

## Step 5 — Post-Code Registry Checklist (for Implementation agent — EXIT GATE)

```
□ 1. REGISTRY SYNC:
     python3 -c "
     import json
     with open('/app/memory/control/registry.json') as f:
         data = json.load(f)
     items = {i['id']: i for i in data['items']}
     assert 'CR-379' in items, 'CR-379 MISSING'
     s = items['CR-379'].get('status','')
     assert 'IMPLEMENTED' in s or 'GATE_5' in s, f'CR-379 not IMPLEMENTED: {s}'
     print('Registry sync PASS')
     "

□ 2. CR_REGISTRY.MD: CR-379 row updated to IMPLEMENTED / Gate 5a

□ 3. FILE_OWNERSHIP.MD: Add entries:
     CheckInPage.jsx   — CR-379 — 2026-09-xx
     pmsService.js     — CR-379 — 2026-09-xx

□ 4. CODE MARKERS:
     CheckInPage.jsx: // CR-379 in line 1 comment (E-C1) ✓
     pmsService.js:   // CR-379 in line 1 comment (E-P1) ✓
     Inline CR-379 comment in payload block (E-P2) ✓

□ 5. COMPILE CHECK: yarn build produces 0 new warnings
```

---

## Scope Lock (final)

**Files WILL change:** `CheckInPage.jsx`, `pmsService.js`

**Files WILL NOT touch (enforced):**
- `customerService.js` — used read-only
- `documentService.js` — used read-only
- `customerTransform.js` — used read-only (verify field names only)
- `loyaltyTransform.js` — read reference only
- `RoomCheckInModal.jsx` — old flow, untouched
- `roomService.js` — old flow, untouched
- `NewBookingPage.jsx` — OD-2 locked exclusion
- All backend files
- All other frontend files

---

## Gate 3 Summary

```
Planning complete: CR-379
Stage:             Implementation Plan
Code reality:      NONE (confirmed 2026-09-13)
Risk:              HIGH
Files WILL change: CheckInPage.jsx (MAJOR ~130 lines), pmsService.js (MINOR ~15 lines)
Files WILL NOT:    customerService, documentService, roomService, RoomCheckInModal, NewBookingPage
Owner decisions:   All resolved (DD-1..DD-8 frozen, OD-1..OD-7 locked)
Open items:        (a) RESOLVED — pointsValue (api.points_value) maps directly from API; use crmCustomer.pointsValue for badge ₹ subtitle (customerTransform.js L93).
                   (b) Impl agent: verify gstName/gstNumber field names in customerTransform.toAPI.updateCustomer before coding E-C13.
                   (c) PROBE GAP — successful pmsCheckIn with CRM IDs on a free room remains unverified (persistence). Must be confirmed post-implementation (V-11).
Edit sites:        15 (2 in pmsService.js, 13 in CheckInPage.jsx)
Verification:      13 manual browser/network checks (V-01..V-13)
Docs:              /app/memory/plans/CR-379_IMPLEMENTATION_PLAN.md (this file)
Next:              OWNER APPROVAL REQUIRED — Gate 4 GO before implementation
```
