# Implementation Plan — CR-128: B2B Customer CRM Wiring

**ID:** CR-128
**Gate:** 3 (Implementation Plan)
**Date:** 2026-08-04
**Impact Analysis verified:** ✅ — All target lines unchanged from Gate 2. CRM endpoints re-validated live.

---

## Scope Lock

**Files WILL change:**
- `api/transforms/customerTransform.js` (G1 + G2)
- `components/modals/RoomCheckInModal.jsx` (G3 + G4)

**Files WILL NOT touch:**
- `orderTransform.js` (Q6=B — backend pulls GST)
- `CollectPaymentPanel.jsx` (CR-116 handles print GST)
- `customerService.js` (no API changes — existing `updateCustomer` accepts arbitrary data)
- CRM endpoints (already live)
- Document upload UI (separate CR per Q7=B)

---

## Execution Order

```
1. Edit 1-3  → customerTransform.js (G1: read B2B from 3 transforms)
2. Edit 4-5  → customerTransform.js (G2: write B2B in 2 transforms)
3. Edit 6    → RoomCheckInModal.jsx  (import updateCustomer)
4. Edit 7    → RoomCheckInModal.jsx  (G4: auto-populate on customer select)
5. Edit 8    → RoomCheckInModal.jsx  (G3: CRM B2B sync on Corporate check-in)
```

Rationale: Transform edits first (no UI risk), then component edits. G4 before G3 because G4 is simpler and validates the B2B field flow.

---

## Edit Sequence

### Edit 1 (G1a): Add B2B fields to `fromAPI.searchResult`

**File:** `/app/frontend/src/api/transforms/customerTransform.js`
**Line:** After L62 (after `lastVisit` line, before closing `};`)
**Risk:** LOW

**Current (L53-63):**
```js
    return {
      id:            api.id || '',
      name:          (api.name || '').trim(),
      phone:         api.phone || '',
      tier,
      totalPoints,
      pointsValue,
      walletBalance: api.wallet_balance || 0,
      lastVisit:     api.last_visit || null,
      loyalty:       buildSyntheticLoyalty({ tier, totalPoints, pointsValue }),
    };
```

**New (L53-67):**
```js
    return {
      id:            api.id || '',
      name:          (api.name || '').trim(),
      phone:         api.phone || '',
      tier,
      totalPoints,
      pointsValue,
      walletBalance: api.wallet_balance || 0,
      lastVisit:     api.last_visit || null,
      loyalty:       buildSyntheticLoyalty({ tier, totalPoints, pointsValue }),
      // CR-128 G1a: B2B fields from CRM search (CRM-4 verified)
      customerType:  api.customer_type || 'normal',
      isB2b:         api.is_b2b || false,
      gstName:       api.gst_name || null,
      gstNumber:     api.gst_number || null,
    };
```

**CRM validation:** `GET /pos/customers?search=kumar` returns `customer_type`, `is_b2b`, `gst_name`, `gst_number` ✅

---

### Edit 2 (G1b): Add B2B fields to `fromAPI.customerLookup`

**File:** `/app/frontend/src/api/transforms/customerTransform.js`
**Line:** After L95 (after `addresses` line, before `loyalty` line)
**Risk:** LOW

**Current (L81-105):**
```js
  customerLookup: (api) => ({
    id:            api.customer_id || '',
    registered:    api.registered || false,
    ...
    addresses:     (api.addresses || []).map(fromAPI.address),
    // BUG-108 Phase B + Loyalty Pipeline Fix ...
    loyalty: buildSyntheticLoyalty({
      ...
    }),
  }),
```

**Insert after L95 (`addresses` line):**
```js
    // CR-128 G1b: B2B fields from CRM customer-lookup (validated live)
    customerType:  api.customer_type || 'normal',
    isB2b:         api.is_b2b || false,
    gstName:       api.gst_name || null,
    gstNumber:     api.gst_number || null,
    documents:     api.documents || {},
```

**CRM validation:** `POST /pos/customer-lookup` returns all 5 fields ✅

---

### Edit 3 (G1c): Add B2B fields to `fromAPI.customerDetail`

**File:** `/app/frontend/src/api/transforms/customerTransform.js`
**Line:** After L131 (after `recentOrders` line, before closing `}`/`)`)
**Risk:** LOW

**Current (L112-132):**
```js
  customerDetail: (api) => ({
    id:            api.id || '',
    ...
    recentOrders:  api.recent_orders || [],
  }),
```

**Insert after L131 (`recentOrders` line):**
```js
    // CR-128 G1c: B2B fields (defensive — may not be present on detail endpoint yet)
    customerType:  api.customer_type || 'normal',
    isB2b:         api.is_b2b || false,
    gstName:       api.gst_name || null,
    gstNumber:     api.gst_number || null,
```

---

### Edit 4 (G2a): Add B2B fields to `toAPI.createCustomer`

**File:** `/app/frontend/src/api/transforms/customerTransform.js`
**Line:** After L216 (after `customerType` conditional, before `addresses`)
**Risk:** LOW

**Current (L204-218):**
```js
  createCustomer: ({ name, phone, email, dob, anniversary, gender, countryCode, customerType, addresses }) => {
    ...
    if (customerType) payload.customer_type = customerType;
    if (addresses?.length) payload.addresses = addresses;
    return payload;
  },
```

**New (L204-221):**
```js
  createCustomer: ({ name, phone, email, dob, anniversary, gender, countryCode, customerType, addresses, gstName, gstNumber, isB2b }) => {
    ...
    if (customerType) payload.customer_type = customerType;
    // CR-128 G2a: B2B fields to CRM (validated: PUT /pos/customers accepts these)
    if (gstName) payload.gst_name = gstName;
    if (gstNumber) payload.gst_number = gstNumber;
    if (isB2b != null) payload.is_b2b = isB2b;
    if (addresses?.length) payload.addresses = addresses;
    return payload;
  },
```

**CRM validation:** `PUT /pos/customers/{id}` with `gst_name`, `gst_number`, `is_b2b` → 200 OK ✅

---

### Edit 5 (G2b): Add B2B fields to `toAPI.updateCustomer`

**File:** `/app/frontend/src/api/transforms/customerTransform.js`
**Line:** After L234 (after `anniversary` conditional, before `return payload`)
**Risk:** LOW

**Current (L225-236):**
```js
  updateCustomer: ({ phone, name, email, dob, anniversary }) => {
    const payload = {
      pos_id: 'mygenie',
      restaurant_id: '',  // Set at call site
      phone,
    };
    if (name) payload.name = name;
    if (email) payload.email = email;
    if (dob) payload.dob = dob;
    if (anniversary) payload.anniversary = anniversary;
    return payload;
  },
```

**New (L225-240):**
```js
  updateCustomer: ({ phone, name, email, dob, anniversary, gstName, gstNumber, isB2b }) => {
    const payload = {
      pos_id: 'mygenie',
      restaurant_id: '',  // Set at call site
      phone,
    };
    if (name) payload.name = name;
    if (email) payload.email = email;
    if (dob) payload.dob = dob;
    if (anniversary) payload.anniversary = anniversary;
    // CR-128 G2b: B2B fields to CRM (validated: PUT /pos/customers/{id} accepts these)
    if (gstName) payload.gst_name = gstName;
    if (gstNumber) payload.gst_number = gstNumber;
    if (isB2b != null) payload.is_b2b = isB2b;
    return payload;
  },
```

**CRM validation:** `PUT /pos/customers/{id}` with B2B fields → 200 OK, re-lookup confirms `customer_type: "corporate"` ✅

---

### Edit 6 (G3 prep): Import `updateCustomer` in RoomCheckInModal

**File:** `/app/frontend/src/components/modals/RoomCheckInModal.jsx`
**Line:** L18 (existing import from customerService)
**Risk:** LOW

**Current (L18):**
```js
import { searchCustomers, lookupCustomer, createCustomer } from '../../api/services/customerService';
```

**New (L18):**
```js
import { searchCustomers, lookupCustomer, createCustomer, updateCustomer } from '../../api/services/customerService';
```

---

### Edit 7 (G4): Auto-populate B2B fields on customer typeahead select

**File:** `/app/frontend/src/components/modals/RoomCheckInModal.jsx`
**Line:** Inside `selectCrmCustomer` callback, after L440 (`clearErr('phone')`)
**Risk:** MEDIUM (touches form state — must not override manual entry)

**Current (L431-443):**
```js
  const selectCrmCustomer = useCallback((c) => {
    setName(c.name || '');
    const rawPhone = (c.phone || '').replace(/\D/g, '');
    setPhone(rawPhone.length === 10 ? rawPhone : c.phone || '');
    if (c.email) setEmail(c.email);
    setShowNameSuggestions(false);
    setShowPhoneSuggestions(false);
    setIsCustomerSelected(true);
    clearErr('name');
    clearErr('phone');
  }, []);
```

**New (L431-451):**
```js
  const selectCrmCustomer = useCallback((c) => {
    setName(c.name || '');
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

**Why after email, before suggestions-close:** B2B state must be set before `setIsCustomerSelected(true)` to avoid effect race. `gstBlockVisible` depends on `bookingFor === 'Corporate'` AND `flags.showUserGst`.

---

### Edit 8 (G3): CRM B2B sync on Corporate check-in

**File:** `/app/frontend/src/components/modals/RoomCheckInModal.jsx`
**Line:** After the CRM lookup/create block (after L607 catch block close, before L611 `roomService.checkIn`)
**Risk:** MEDIUM (CRM write — non-blocking)

**Current (L592-611):**
```js
      // BUG-092: CRM customer lookup/create (non-blocking — proceed even if CRM fails)
      let customerId = null;
      if (phone10.length === 10) {
        try {
          const existing = await lookupCustomer(phone10);
          if (existing?.registered) {
            customerId = existing.customer_id || existing.id;
          } else {
            const created = await createCustomer(
              { name: name.trim(), phone: phone10 },
              restaurant?.id
            );
            customerId = created?.customer_id || created?.id || null;
          }
        } catch (crmErr) {
          console.warn('[RoomCheckIn] BUG-092: CRM lookup/create failed, proceeding without customer_id:', crmErr);
        }
      }

      await roomService.checkIn({
```

**New (insert between L609 closing `}` and L611 `await roomService.checkIn`):**
```js
      // CR-128 G3: Sync B2B fields to CRM on Corporate check-in (Q5=A: auto-silent)
      if (customerId && bookingFor === 'Corporate' && firmGst.trim()) {
        try {
          await updateCustomer(customerId, {
            phone: phone10,
            gstName: firmName.trim(),
            gstNumber: firmGst.trim(),
            isB2b: true,
          }, restaurant?.id);
        } catch (crmB2bErr) {
          console.warn('[RoomCheckIn] CR-128: CRM B2B sync failed, proceeding:', crmB2bErr);
        }
      }
```

**Why condition `firmGst.trim()`:** Only sync B2B when GST number is actually filled. Prevents sending `is_b2b: true` with empty GST which is meaningless.
**Non-blocking:** Matches BUG-092 pattern — `try/catch` with `console.warn`, check-in proceeds regardless.

---

## Verification Matrix

| Edit # | File | Change | How to Verify | Automated? |
|--------|------|--------|---------------|:---:|
| 1 | `customerTransform.js` | G1a: searchResult B2B fields | Curl: `GET /pos/customers?search=` → verify FE transform adds `isB2b`, `gstName`, etc. | YES (unit test) |
| 2 | `customerTransform.js` | G1b: customerLookup B2B fields | Curl: `POST /pos/customer-lookup` → verify FE transform adds fields | YES (unit test) |
| 3 | `customerTransform.js` | G1c: customerDetail B2B fields | Code review: defensive defaults (`|| 'normal'`, `|| false`) | YES (grep) |
| 4 | `customerTransform.js` | G2a: createCustomer B2B params | Curl: `POST /pos/customers` with B2B → verify payload includes `gst_name`, `gst_number`, `is_b2b` | YES (unit test) |
| 5 | `customerTransform.js` | G2b: updateCustomer B2B params | Curl: `PUT /pos/customers/{id}` → verify payload | YES (unit test) |
| 6 | `RoomCheckInModal.jsx` | Import updateCustomer | Compile check: webpack 0 new errors | YES (compile) |
| 7 | `RoomCheckInModal.jsx` | G4: auto-populate on CRM select | Browser: select B2B customer from typeahead → bookingFor changes to "Corporate", GST fields pre-filled | NO |
| 8 | `RoomCheckInModal.jsx` | G3: CRM B2B sync on submit | Browser: complete Corporate check-in → re-lookup customer via curl → verify `is_b2b: true`, `customer_type: "corporate"` | NO |
| 8b | `RoomCheckInModal.jsx` | G3: non-blocking on CRM failure | Code review: try/catch pattern matches BUG-092 | YES (grep) |
| 8c | `RoomCheckInModal.jsx` | G3: Individual check-in skips CRM B2B | Browser: complete Individual check-in → no CRM B2B call | NO |

---

## Post-Code Registry Checklist

```
- [ ] registry.json: CR-128 → status: IMPLEMENTED, sprint_key: pos_5_1
- [ ] CR_REGISTRY.md: CR-128 row updated to IMPLEMENTED
- [ ] FILE_OWNERSHIP.md: add customerTransform.js + RoomCheckInModal.jsx → CR-128
- [ ] Code markers: // CR-128 comment in every modified file
```

---

```
Plan ready: CR-128. 8 edits across 2 files.
Code reality: PARTIAL (createCustomer has customerType only).
Scope: customerTransform.js + RoomCheckInModal.jsx WILL change / orderTransform.js + CollectPaymentPanel.jsx WILL NOT touch.
Verification matrix: 11 checks (6 automated, 5 manual).
Owner decisions needed: none (all locked).
CRM re-validated: all endpoints still PASS.
Awaiting Gate 4 GO.
```
