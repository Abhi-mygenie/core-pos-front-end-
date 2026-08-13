# Impact Analysis — CR-128: B2B Customer CRM Wiring

**ID:** CR-128
**Gate:** 2 (Impact Analysis)
**Date:** 2026-08-04
**Code Reality:** PARTIAL — `toAPI.createCustomer` has `customerType` param (L216) but does NOT send `gst_name`, `gst_number`, `is_b2b`. `toAPI.updateCustomer` has zero B2B fields. `fromAPI.customerLookup` and `fromAPI.searchResult` do not parse B2B fields.
**Conflict Pre-Check:** NO CONFLICTS — no other open item touches `customerTransform.js` or `RoomCheckInModal.jsx` (except CR-127 on `roomService.js` — parallel-safe, different file)
**Risk:** HIGH (CRM API contract, customer data, room + order flow touch)

---

## 1. Data Flow Trace — Full B2B Lifecycle

### 1a. READ: CRM → POS FE (currently broken)

```
CRM Database (customer record with is_b2b, gst_name, gst_number, customer_type)
  ↓
POST /pos/customer-lookup {"phone":"..."}
  → Response includes: customer_type, gst_name, gst_number, is_b2b, documents  ← CRM LIVE ✅
  ↓
customerService.lookupCustomer(phone)
  → crmApi.post(CUSTOMER_LOOKUP, {phone})
  → fromAPI.customerLookup(response.data.data)                                ← TRANSFORM
  ↓
customerTransform.js:fromAPI.customerLookup (L77-106)
  → Currently parses: id, registered, name, phone, tier, totalPoints, ...
  → ❌ MISSING: customer_type, gst_name, gst_number, is_b2b, documents        ← GAP G1
  ↓
RoomCheckInModal / CollectPaymentPanel / CustomerModal
  → customer.customerType → undefined (field never parsed)
  → customer.isB2b → undefined
  → customer.gstName → undefined
  → customer.gstNumber → undefined
```

### 1b. READ: CRM Search → POS FE (currently broken)

```
GET /pos/customers?search=...
  → Response NOW includes: customer_type, is_b2b, gst_name, gst_number       ← CRM-4 FIX ✅
  ↓
customerService.searchCustomers(query)
  → fromAPI.searchResults(response.data.data.customers)
  → fromAPI.searchResult(api)                                                 ← TRANSFORM
  ↓
customerTransform.js:fromAPI.searchResult (L48-63)
  → Currently parses: id, name, phone, tier, totalPoints, pointsValue, walletBalance, lastVisit, loyalty
  → ❌ MISSING: customer_type, gst_name, gst_number, is_b2b                   ← GAP G1
  ↓
RoomCheckInModal.selectCrmCustomer (L431)
  → Sets name, phone, email from customer
  → ❌ Does NOT set bookingFor, firmName, firmGst from B2B fields              ← GAP G4
```

### 1c. WRITE: POS FE → CRM (currently broken)

```
RoomCheckInModal: bookingFor="Corporate", firmName="ABC Corp", firmGst="27AABCT1234F1ZP"
  ↓
handleSubmit (L585):
  → lookupCustomer(phone) → gets customerId
  → ❌ Does NOT call updateCustomer with B2B fields                            ← GAP G3
  → roomService.checkIn({...firmName, firmGst, bookingFor...})
    → POST to POS backend (firm_name, firm_gst go to POS backend only, NOT CRM)
  ↓
CRM customer record: is_b2b stays false, gst_name stays null                   ← DATA LOSS

Expected flow (after fix):
  → lookupCustomer(phone) → customerId
  → IF bookingFor === 'Corporate':
      → updateCustomer(customerId, { gst_name: firmName, gst_number: firmGst, is_b2b: true })
      → CRM auto-derives customer_type → "corporate"                           ← CRM-1 FIX ✅
  → roomService.checkIn({...})
```

### 1d. WRITE: CustomerModal → CRM (currently broken)

```
CustomerModal: updateCustomer(customerId, { name, phone, dob, anniversary })
  ↓
toAPI.updateCustomer (L225-236)
  → Sends: pos_id, restaurant_id, phone, name, email, dob, anniversary
  → ❌ MISSING: gst_name, gst_number, is_b2b                                  ← GAP G2
```

---

## 2. Curl Validation — CRM Endpoints (Live)

All validated against `https://preprod-crm-deploy.preview.emergentagent.com/api`:

### 2a. Customer Lookup — B2B Fields in Response

```bash
POST /pos/customer-lookup {"phone":"9876543210"}
→ 200 OK
{
  "customer_type": "normal",    ← NEW ✅ (or "corporate" for B2B)
  "gst_name": null,             ← NEW ✅
  "gst_number": null,           ← NEW ✅
  "is_b2b": false,              ← NEW ✅
  "documents": {},              ← NEW ✅
  ... (existing fields)
}
```

### 2b. Customer Search — B2B Fields in Response

```bash
GET /pos/customers?search=kumar&limit=1
→ 200 OK
{
  "customer_type": "normal",    ← NEW (CRM-4 fix) ✅
  "is_b2b": false,              ← NEW ✅
  "gst_name": null,             ← NEW ✅
  "gst_number": null,           ← NEW ✅
  ... (existing fields)
}
```

### 2c. Customer Update — B2B Write

```bash
PUT /pos/customers/{id}
{"pos_id":"mygenie","restaurant_id":"689","phone":"9876543210",
 "gst_name":"ReTest Corp","gst_number":"27AABCT1234F1ZP","is_b2b":true}
→ 200 OK {"success":true,"message":"Customer updated successfully"}

Re-lookup confirms:
  customer_type: "corporate"    ← Auto-derived (CRM-1 fix) ✅
  is_b2b: true                  ✅
  gst_name: "ReTest Corp"      ✅
  gst_number: "27AABCT1234F1ZP" ✅
```

### 2d. Customer Create — B2B Fields

```bash
POST /pos/customers
{"pos_id":"mygenie","restaurant_id":"689","name":"Test","phone":"...",
 "gst_name":"New Corp","gst_number":"27XYZAB1234C1D5","is_b2b":true}
→ Expected: 200 OK (same auto-derive on create — CRM-1 confirmed)
```

---

## 3. Gap-by-Gap Analysis

### G1: Read B2B from CRM (customerTransform.js)

**File:** `api/transforms/customerTransform.js`

**3 transforms affected:**

| Transform | Line Range | Current Fields | Missing Fields |
|-----------|-----------|----------------|----------------|
| `fromAPI.searchResult` | L48-63 | id, name, phone, tier, totalPoints, pointsValue, walletBalance, lastVisit, loyalty | `customerType`, `isB2b`, `gstName`, `gstNumber` |
| `fromAPI.customerLookup` | L77-106 | id, registered, name, phone, tier, totalPoints, pointsValue, walletBalance, totalVisits, totalSpent, allergies, favorites, lastVisit, addresses, loyalty | `customerType`, `isB2b`, `gstName`, `gstNumber`, `documents` |
| `fromAPI.customerDetail` | L112-135 | id, name, phone, email, tier, totalPoints, walletBalance, totalVisits, totalSpent, allergies, favorites, dob, anniversary, addresses, loyalty, loyaltyEnabled, recentOrders | `customerType`, `isB2b`, `gstName`, `gstNumber` |

**Proposed field mapping (snake_case API → camelCase FE):**

| API Field | FE Field | Type | Default |
|-----------|----------|------|---------|
| `customer_type` | `customerType` | string | `'normal'` |
| `is_b2b` | `isB2b` | boolean | `false` |
| `gst_name` | `gstName` | string\|null | `null` |
| `gst_number` | `gstNumber` | string\|null | `null` |
| `documents` | `documents` | object | `{}` |

### G2: Write B2B to CRM (customerTransform.js)

**File:** `api/transforms/customerTransform.js`

**2 transforms affected:**

| Transform | Line | Current Params | New Params |
|-----------|------|---------------|------------|
| `toAPI.createCustomer` | L204 | name, phone, email, dob, anniversary, gender, countryCode, customerType, addresses | + `gstName`, `gstNumber`, `isB2b` |
| `toAPI.updateCustomer` | L225 | phone, name, email, dob, anniversary | + `gstName`, `gstNumber`, `isB2b` |

**Payload mapping (camelCase FE → snake_case API):**

| FE Param | API Key | Condition |
|----------|---------|-----------|
| `gstName` | `gst_name` | if truthy |
| `gstNumber` | `gst_number` | if truthy |
| `isB2b` | `is_b2b` | if not null/undefined |

### G3: Room Check-In → CRM Sync (RoomCheckInModal.jsx)

**File:** `components/modals/RoomCheckInModal.jsx`

**Current flow (L592-610):**
```
lookupCustomer(phone10) → customerId
OR createCustomer({name, phone}, restaurantId) → customerId
```

**Required addition (after lookup/create, before roomService.checkIn):**
```
IF bookingFor === 'Corporate' AND customerId:
  → updateCustomer(customerId, {
      gstName: firmName,
      gstNumber: firmGst,
      isB2b: true
    }, restaurant?.id)
  → Non-blocking (try/catch, warn on failure, proceed with check-in)
```

**Key decisions:**
- Auto-silent (Q5=A) — no user prompt
- Non-blocking — CRM failure doesn't block room check-in (matches existing BUG-092 pattern)
- Only when `bookingFor === 'Corporate'` — no CRM update for Individual check-ins

### G4: Auto-Populate from CRM Lookup (RoomCheckInModal.jsx)

**File:** `components/modals/RoomCheckInModal.jsx`

**Current `selectCrmCustomer` handler (L431-443):**
```js
setName(c.name || '');
setPhone(...);
if (c.email) setEmail(c.email);
// ❌ No B2B field population
```

**Required addition:**
```js
// CR-128 G4: Auto-populate B2B fields from CRM
if (c.isB2b) {
  setBookingFor('Corporate');
  if (c.gstName) setFirmName(c.gstName);
  if (c.gstNumber) setFirmGst(c.gstNumber);
}
```

**Also applies to handleSubmit lookup path (L595-598):**
When `lookupCustomer` returns `existing` with `isB2b: true`, auto-populate before check-in submission. However, at submit time the form is already filled — so G4 only applies to the typeahead selection path (L431).

---

## 4. Downstream Consumers

| Consumer | Reads | Impact |
|----------|-------|--------|
| `RoomCheckInModal.selectCrmCustomer` | `c.isB2b`, `c.gstName`, `c.gstNumber` | NEW — auto-populate (G4) |
| `RoomCheckInModal.handleSubmit` | `bookingFor`, `firmName`, `firmGst` | EXISTING — already sends to POS backend; NEW CRM sync (G3) |
| `CollectPaymentPanel` | `customer?.loyalty`, customer fields | NO CHANGE — B2B fields in Collect Bill handled by CR-116 |
| `CustomerModal.updateCustomer` | customer fields | FUTURE — could wire B2B fields later, but NOT in this CR scope |
| `OrderEntry/CartPanel` | `customer` object | NO CHANGE — order GST wiring is backend (Q6=B) |

## 5. Risk Register

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|-----------|
| CRM update fails during check-in | MEDIUM | LOW | Non-blocking try/catch (matches BUG-092 pattern). Check-in proceeds. |
| B2B fields overwrite manual form entry | LOW | MEDIUM | G4 only runs on `selectCrmCustomer` (typeahead pick). If user manually types, no auto-populate. |
| `gstBlockVisible` flag clears auto-populated GST | LOW | LOW | `gstBlockVisible` depends on `bookingFor === 'Corporate'` AND `flags.showUserGst`. G4 sets `bookingFor → Corporate` first, so GST block opens, fields are set. |
| Search result missing B2B fields (old CRM) | LOW | ZERO | Defensive defaults: `customerType: api.customer_type \|\| 'normal'`, `isB2b: api.is_b2b \|\| false` |
| Q6 recheck changes scope | LOW | MEDIUM | Owner confirmed Q6=B (backend pulls). If reversed, adds 2 fields to `orderTransform.js` — scoped as follow-up, not blocking. |

## 6. Owner Decisions (All Locked)

| # | Decision | Impact on Implementation |
|---|----------|------------------------|
| Q5=A | Auto-silent CRM sync | G3: no confirmation dialog, just try/catch |
| Q6=B | Backend pulls GST for orders | No `orderTransform.js` changes |
| Q7=B | Doc capture = separate CR | No document UI in this CR |
| Q8=A | Auto-populate from lookup | G4: set bookingFor + firmName + firmGst from CRM |

---

```
Impact Analysis complete: CR-128
Code Reality: PARTIAL (createCustomer has customerType, nothing else)
Conflict: NONE
Risk: HIGH (CRM API contract, customer data, room flow)
Files WILL change: customerTransform.js (G1 + G2), RoomCheckInModal.jsx (G3 + G4)
Files WILL NOT touch: orderTransform.js (Q6=B), CollectPaymentPanel.jsx (CR-116), CRM endpoints, document UI
Owner decisions: all locked (Q5=A, Q6=B, Q7=B, Q8=A)
CRM validation: 12 probes all PASS on preprod-crm-deploy
Next: Gate 3 (Implementation Plan)
```
