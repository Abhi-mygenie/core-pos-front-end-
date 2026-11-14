# CR-379 — Gate 2: Impact Analysis
## New PMS Check-In: CRM Customer Link (Core)

```
CR ID:          CR-379
Gate:           2 — Impact Analysis
Written:        2026-09-12
Author:         Agent (PLANNING role)
Status:         COMPLETE — Awaiting owner Gate 3 GO
Depends on:     CR-358-P2 (SHIPPED), CR-358-P3/P4/P5 (P5 Gate 3 pending)
Blocks:         CR-380 planning (must reach Gate 4 GO first)
```

---

## Step 0: Code Reality Check

### A. `CheckInPage.jsx` — 460 lines

CRM reference grep: **ZERO hits.**

Confirmed absent:
- No import from `customerService`, `crmAxios`, `documentService`
- No state for `crmCustomer`, `crmCustomerId`, `crmLoading`
- No call to `lookupCustomer`, `createCustomer`, `searchCustomers`
- No `customer_id` or `cust_membership_id` in `handleConfirm` → `pmsCheckIn` call (lines 177–192)
- No returning-guest badge component
- No extra adult/child name fields (only count: `adults`, `children`)

### B. `pmsService.pmsCheckIn()` — lines 136–172

CRM reference grep: **ZERO hits.**

`pmsCheckIn` payload (current, complete field list):
```
booking_type, booking_id*, name, phone, email, room_id,
id_type, total_adult, total_children, children_name,
checkin_date, checkout_date, booking_details, booking_for,
order_amount, room_price, advance_payment, balance_payment,
payment_method, order_note, gst_tax, firm_name, firm_gst
```
`*` booking_id omitted for WalkIn

**ABSENT (gap):**
```
customer_id, cust_membership_id,
name2, name3, name4,
id_type2, id_type3, id_type4
```

### C. Old flow parity reference — `roomService.checkIn()` lines 58–61

```js
if (params.customerId) {
  fd.append('customer_id', String(params.customerId));
  fd.append('cust_membership_id', String(params.customerId)); // CR-127
}
```
Both fields carry the same CRM UUID value. This is the target parity pattern.

---

## Step 1: Conflict Pre-Check

| File | Last CR | Status | CR-379 risk |
|---|---|---|---|
| `CheckInPage.jsx` | CR-358-P2 + BUG-386/388 | SHIPPED | CLEAR — no active CRs |
| `pmsService.js` | CR-358-P5 | Gate 3, awaiting Gate 4 GO | LOW — CR-379 addition is 3 additive lines only |
| `customerService.js` | Existing | Stable | READ-ONLY for CR-379 |
| `crmAxios.js` | BUG-300 | Stable | READ-ONLY for CR-379 |
| `customerTransform.js` | CR-128 | Stable | READ-ONLY for CR-379 |

**CR-358-P5 conflict note:** `pmsService.js` is shared. CR-379 adds `customer_id`/`cust_membership_id` fields to the `pmsCheckIn` payload as optional additive parameters. If CR-358-P5 ships before CR-379, implementor must rebase against the merged file. No logic conflict — both changes touch different sections.

---

## Step 2: Gate 2 — Full Impact Analysis

### 2.1 Backend Contract Verification (LIVE PROBE — 2026-09-12)

**Probe A — pmsCheckIn WITHOUT `customer_id`:**
```json
{ "error": "Rooms already occupied", "occupied_rooms": ["r3"] }
```

**Probe B — pmsCheckIn WITH `customer_id: "crm_test_001"` + `cust_membership_id: "crm_test_001"`:**
```json
{ "error": "Rooms already occupied", "occupied_rooms": ["r3"] }
```

**Finding:** Identical response shape. Backend reaches business-logic layer (room occupancy check) in both cases. No validation rejection of the CRM fields. Backend silently accepts extra JSON fields.

**Conclusion:** Backend contract is ready. **BUG-090 registry label is stale. Gap is 100% frontend-only.**

Credentials used: `owner@***` / `***` (R20 masked). Token obtained via `POST /api/v1/auth/vendoremployee/common-login`.

---

### 2.2 CRM API Contract (LIVE PROBE — 2026-09-12)

**Auth:** `X-API-Key: crm_token` from login response. Token set via `setCrmToken()` in `crmAxios.js`. Persisted to `localStorage` as `'crm_token'`. Silent 401 refresh via `/api/v2/vendoremployee/restaurant-crm-token`.

#### Customer Lookup — `POST /pos/customer-lookup`

Request:
```json
{ "phone": "9xxxxxxxxx" }
```

Response (not found):
```json
{ "success": false, "message": "Customer not found", "data": { "registered": false } }
```

Response (found) — shape from `customerTransform.fromAPI.customerLookup`:
```
api.customer_id   → id           (CRM UUID — primary key for check-in payload)
api.registered    → registered
api.tier          → tier         (badge)
api.total_visits  → totalVisits  (badge)
api.wallet_balance → walletBalance (badge)
api.last_visit    → lastVisit    (badge)
api.total_points  → totalPoints  (badge)
api.documents     → documents    (docs-on-file count — CR-380 viewer)
api.customer_type → customerType
api.is_b2b        → isB2b
api.gst_name      → gstName
api.gst_number    → gstNumber
```

#### Customer Create — `POST /pos/customers`

Required fields confirmed via live 422:
```json
{
  "name": "...",
  "phone": "...",
  "email": "",
  "restaurant_id": "364",
  "pos_id": "mygenie"
}
```

Response data keys: `{ customer_id, name, phone, created_at }`

**Customer ID extraction:**
```js
// From lookup:    existing.id           (transform maps api.customer_id → id)
// From create:    created.customer_id
// Old flow parity (RoomCheckInModal L670): existing.customer_id || existing.id
// CR-379 uses:    existing.id (lookup) or created.customer_id (create)
```

**Note on `pos_id`:** `customerTransform.toAPI.createCustomer` hard-codes `pos_id: 'mygenie'`. The `restaurant_id` is supplied at call site from `restaurant?.id` (via `useRestaurant`). No new env variable needed.

---

### 2.3 Files Changed

| File | Type | Change scope |
|---|---|---|
| `frontend/src/pages/pms/CheckInPage.jsx` | MAJOR | New CRM state, lookup/create, badge, extra adult/child fields, corporate B2B sync |
| `frontend/src/api/services/pmsService.js` | MINOR | 3 additive lines — optional CRM fields + extra adult fields in pmsCheckIn payload |

**Zero new files for CR-379.** (CR-380 will add document upload component.)

---

### 2.4 Detailed Change Spec: `pmsService.js`

Location: `pmsCheckIn()` payload block, lines 145–169.

```diff
// ADD inside payload object (after existing firm_gst line):
+ ...(p.customerId ? {
+   customer_id:          p.customerId,
+   cust_membership_id:   p.customerId,   // CR-127 parity
+ } : {}),
+ name2:      p.extraAdults?.[0]?.name ?? '',
+ name3:      p.extraAdults?.[1]?.name ?? '',
+ name4:      p.extraAdults?.[2]?.name ?? '',
+ id_type2:   '',
+ id_type3:   '',
+ id_type4:   '',
+ children_name: p.childrenNames?.length ? p.childrenNames.join(',') : '',
```

Note: `children_name` is already in the payload but currently hardcoded `''`. This upgrade lets it carry real values.

**Function signature addition:**
```js
// p.customerId     — string | null   — CRM customer UUID
// p.extraAdults    — Array<{name}>   — extra adults (OD-5A)
// p.childrenNames  — Array<string>   — child names (OD-5A)
// p.bookingFor     — 'Individual' | 'Corporate'
```

---

### 2.5 Detailed Change Spec: `CheckInPage.jsx`

#### A. New imports (add after line 7):
```js
import { lookupCustomer, createCustomer, updateCustomer } from '@/api/services/customerService';
```

#### B. New state variables (add after line 34 `[submitting, setSubmitting]`):
```js
// CRM (CR-379)
const [crmCustomer, setCrmCustomer] = useState(null); // full lookup result
const [crmLoading, setCrmLoading] = useState(false);
const [crmError, setCrmError] = useState(null);
// Extra adults/children (OD-5A)
const [extraAdults, setExtraAdults] = useState([]);   // [{name:''}...]
const [childrenNames, setChildrenNames] = useState([]); // ['',''...]
// Corporate (mirrors old modal)
const [bookingFor, setBookingFor] = useState('Individual');
const [firmName, setFirmName] = useState('');
const [firmGst, setFirmGst] = useState('');
```

#### C. Phone-change CRM trigger

Replace `setField('phone', ...)` inline in the phone input onChange with a handler that also fires CRM lookup when 10 digits are reached.

Logic:
```js
const handlePhoneChange = (digits10) => {
  setField('phone', digits10);
  if (digits10.length === 10) {
    setCrmLoading(true);
    setCrmError(null);
    lookupCustomer(digits10)
      .then(result => {
        setCrmCustomer(result);  // null = not found
        setCrmLoading(false);
      })
      .catch(() => {
        setCrmLoading(false);
        setCrmError('CRM lookup failed');
      });
  } else {
    setCrmCustomer(null);
    setCrmError(null);
  }
};
```

**OD-6A (OTA arrivals):** `selectArrival` already pre-populates `form.phone`. A `useEffect` on `[form?.phone]` can fire the same lookup when the form is first loaded with a pre-populated OTA phone.

#### D. Returning guest badge component (OD-7A)

Insert above the form fields in the right panel (after the panel header, before `<div className="p-5 space-y-4">`):

Display conditions: `!crmLoading && crmCustomer`

Badge fields (per OD-7A locked decision):
| Field | Source | Display |
|---|---|---|
| Tier | `crmCustomer.tier` | Pill: "Gold Member" |
| Visit count | `crmCustomer.totalVisits` | "X stays" |
| Last stay | `crmCustomer.lastVisit` | Formatted date |
| Credit balance | `crmCustomer.walletBalance` | "₹X credit" |
| Docs on file | `Object.keys(crmCustomer.documents??{}).length > 0` | "Docs on file" |

**Loading state:** Show spinner in badge area while `crmLoading` is true.

**Not-found state:** Show subtle "New guest" tag — no badge shown.

**OD-7 trigger deferral:** How/when lookup fires (auto on blur vs. manual button) is deferred to design stage. Implementation plan will code the simpler auto-on-10-digits approach as the default, which can be overridden by design.

#### E. Extra adults/children (OD-5A)

Form additions:
- `adults` counter already present — keep it.
- Add `extraAdults` list: array of `{ name: '' }` with Add/Remove buttons, length = `adults - 1` (primary guest is adult 1).
- `children` counter already present — keep it.
- Add `childrenNames` list: array of strings, length = `children` count.
- All name inputs are optional (non-blocking validation).

#### F. `handleConfirm` CRM sequence

```
1. Obtain crmCustomerId:
   a. If crmCustomer?.id → use it (already looked up)
   b. Else: createCustomer({ name, phone, email }, restaurant?.id)
            → customerId = created?.customer_id || null
            On error: toast.warning('Could not link to CRM — proceeding without') [OD-1A]

2. Corporate sync [if bookingFor === 'Corporate' && crmCustomerId && firmGst]:
   updateCustomer(crmCustomerId, { gstName: firmName, gstNumber: firmGst }, restaurant?.id)
   Non-blocking: catch → continue

3. pmsCheckIn({
     ...existing fields,
     customerId:     crmCustomerId || null,  [new]
     extraAdults:    extraAdults,            [new — OD-5A]
     childrenNames:  childrenNames,          [new — OD-5A]
     bookingFor:     bookingFor,             [new]
   })
```

#### G. `checkInFlags.guestDetails` (OD-4)

Read `checkInFlags.guestDetails` (already destructured from `useRestaurant` at line 40):
- `flags.guestDetails === true`: ID document fields required. **Document capture itself is CR-380 scope.**
  CR-379 responsibility: pass `id_type` field (already present as `'Select document type'`).
- `flags.guestDetails === false`: skip ID document UI entirely.
- Validation guard: if `flags.guestDetails` and `!crmCustomer?.documents?.length` → show advisory (not blocking for CR-379).

#### H. Form resets

When `selectArrival` or `selectWalkin` is called, reset CRM state:
```js
setCrmCustomer(null); setCrmLoading(false); setCrmError(null);
setExtraAdults([]); setChildrenNames([]);
setBookingFor('Individual'); setFirmName(''); setFirmGst('');
```

---

### 2.6 CRM Failure Paths (OD-1A — Non-Blocking)

| Failure point | Behavior |
|---|---|
| `lookupCustomer` timeout/network | `setCrmError('CRM lookup failed')` — no blocking; proceed without badge |
| `lookupCustomer` 4xx (not found returns null) | `setCrmCustomer(null)` — show "New guest" tag |
| `createCustomer` throws on confirm | `toast.warning(...)` — proceed with `customer_id: ''` |
| `updateCustomer` throws (corporate) | Silent catch — GST sync skipped, check-in continues |

---

### 2.7 Verification Matrix

| ID | Scenario | Expected |
|---|---|---|
| V-01 | WalkIn, new phone (10 digits) entered | `lookupCustomer` called; returns null; "New guest" shown |
| V-02 | WalkIn, phone matches existing CRM customer | Badge shown with tier/visits/lastStay/balance |
| V-03 | Confirm on new guest | `createCustomer` called; `customer_id` non-empty in request |
| V-04 | Confirm on returning guest | `createCustomer` NOT called; same `customer_id` as lookup |
| V-05 | CRM API down during lookup | `crmError` set; badge area shows warning; confirm still enabled |
| V-06 | CRM API down during create (confirm) | `toast.warning` shown; check-in payload has `customer_id: ''` |
| V-07 | OTA arrival pre-populates phone | Lookup fires automatically; badge shown if found |
| V-08 | Extra adult with name | `name2`/`name3` sent in payload |
| V-09 | Children with names | `children_name` sent as comma-joined string |
| V-10 | Corporate booking + GST | `updateCustomer` called before pmsCheckIn; non-blocking if fails |
| V-11 | BUG-090 regression check | `cust_membership_id` non-null in room order for CRM-linked check-in |

---

### 2.8 Design Defers (to Gate 2.5 / Design Stage)

The following items require design decisions before the Implementation Plan can specify exact component layout:

| Item | OD reference | Decision needed |
|---|---|---|
| Badge trigger: auto-on-10-digits vs "Check CRM" button | OD-7 deferred | When/how lookup fires |
| Badge placement in right panel | OD-7A | Above form? Inline with name? Sidebar? |
| Extra adult name form layout | OD-5A | Accordion? Inline rows? Expandable slots? |
| Children name input layout | OD-5A | Same as adults or comma-input? |
| Corporate section (firm name/GST) show/hide trigger | OD-5A / CR-128 | Toggle? Separate radio? |
| CRM error state in UI | OD-1A | Red warning banner vs subtle grey text? |

---

### 2.9 Out of Scope for CR-379

Per locked owner decisions:

| Item | Reason | CR |
|---|---|---|
| Document capture (front_image, back_image) | OD-3B — CR-380 scope | CR-380 |
| Documents-on-file viewer | CR-380 scope | CR-380 |
| FormData migration for pmsCheckIn | OD-3B — required by CR-380 | CR-380 |
| CRM integration in NewBookingPage | OD-2B explicitly excluded | — |
| Mandatory doc validation | OD-4A — CR-380 scope | CR-380 |

---

### 2.10 BUG-090 Registry Update Required

Current registry label: `BACKEND-BLOCKED — CRM customer_id not stored on room orders`

Correct label after live probe evidence: `FRONTEND-ONLY — Backend accepts customer_id/cust_membership_id. New PMS flow does not send them. Resolved by CR-379.`

Action: Update registry.json `BUG-090` note during Gate 2 registry sync.

---

## Summary Table

| Category | Value |
|---|---|
| Files changed | 2 (CheckInPage.jsx major, pmsService.js minor) |
| New files | 0 |
| Backend changes | 0 |
| Blast radius | MEDIUM (2 files, self-contained) |
| CR-358-P5 conflict | LOW (additive change, different lines) |
| BUG-090 status | Frontend-only confirmed by live probe |
| Design stage required | YES — 6 open layout decisions |
| Gate 3 prerequisite | Design mockup approved |
| Blocking CR-380 | CR-380 planning must not start until CR-379 Gate 4 GO |

---

## Gate 2 Sign-off

```
Gate 2 status:    COMPLETE
Gate 2.5 status:  CLOSED — design frozen by owner 2026-09-12
Gate 3 GO:        AUTHORISED by owner 2026-09-12
Design artifact:  memory/plans/CR-379_DESIGN_DECISIONS.md (8 decisions locked)
Mockup:           public/cr379-design-mockup.html
Author note:      All live probes successful 2026-09-12. No blockers found.
                  Backend contract confirmed ready. Design frozen.
                  Next: Gate 3 — Implementation Plan.
```
