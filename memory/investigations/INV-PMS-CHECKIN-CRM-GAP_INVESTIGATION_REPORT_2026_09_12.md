# INV-PMS-CHECKIN-CRM-GAP — Investigation Report

**Date:** 2026-09-12
**Role:** INVESTIGATION (AGENT_PROMPT_ALPHA v0.7 §ROLE 6)
**Owner ask:** "CRM is not integrated into the new PMS check-in flow. Old Check-In module has CRM customer lookup/create + document upload; new flow appears to skip it. Investigate in detail."
**Registration status (R0):** **UNREGISTERED** — no CR/BUG ID exists for this gap. Recommend INTAKE as a new CR (proposed title: *PMS Check-In — CRM Customer Link Parity*). Related: BUG-090, BUG-092, CR-128, CR-129, CR-350, BUG-351, CR-358-P2, CR-364.
**Code edits:** NONE (read-only investigation).

---

## 1. Summary

| Field | Value |
|---|---|
| Root cause | The new PMS check-in flow (`CR-358-P2`: `NewBookingPage.jsx` → `CheckInPage.jsx` → `pmsService.pmsCheckIn()`) was built as a **standalone function (OD-P2-01 Option B)** with "FormData parity **minus file fields**" to the old `roomService.checkIn()`. The CRM layer that lives in the old **UI component** (`RoomCheckInModal.jsx` — lookup/create/B2B-sync/doc-fetch/doc-upload) was never part of `roomService.checkIn()` and therefore was **not carried across**. The new flow makes **zero CRM calls** and sends **no `customer_id` / `cust_membership_id`** to the POS backend. |
| Classification | **FE_FEATURE_GAP** — frontend only. (Revalidated 2026-09-12: BUG-090 backend side is **fixed** — see H4. Registry status `BACKEND-BLOCKED` is stale → R1 flag.) |
| Confidence | **HIGH**. FE gap: grep = 0 CRM references in the 3 new-flow files. Backend readiness: check-in response echoes `cust_membership_id` (probe P8) and `order-logs` v2 rows carry a `cust_membership_id` column (evidence INV-PMS-CRs-363-364-366) — both `null` only because the new FE flow never sends it. |
| Risk | **HIGH** (customer data, API contract, reports dependency) — per v0.7 Risk table. |
| Steps used | 9/10 |

---

## 2. Hypotheses Tested

| # | Hypothesis | Test Method | Steps | Result | Evidence |
|---|---|---|---|---|---|
| H1 | New flow calls CRM but silently fails (env/config) | grep new-flow files for `customerService`/`documentService`/`crmApi`/`customer_id` | 1 | **ELIMINATED** — 0 hits | `evidence/INV-PMS-CHECKIN-CRM-GAP/grep_new_flow_crm_refs.txt` (empty) |
| H2 | New flow never wired CRM (feature gap from CR-358-P2 scope) | Code trace `CheckInPage.jsx:164-200` → `pmsService.js:136-172`; read IA/plan OD-P2-01 | 3 | **CONFIRMED** — `pmsCheckIn` payload has no `customer_id`; IA/plan for P2 never mention CRM | `pmsService.js:145-169`; `impact/CR-358-P2_IMPACT_ANALYSIS.md:58`; `plans/CR-358-P2_IMPLEMENTATION_PLAN.md:142` |
| H3 | Backend auto-links to CRM server-side (so FE omission is harmless) | Inspect prior probe P8 response for the JSON check-in | 1 | **ELIMINATED** — response `{ user_id: 42619, cust_membership_id: null }`: backend created a **POS-side user**, no CRM membership link | `evidence/INV-PMS-CHECKIN-CRM-GAP/checkin_response_no_crm_link.json` |
| H4 | Backend does not persist `customer_id` on room orders (BUG-090 still open) | Owner statement + evidence re-read: check-in response shape, `order-logs` v2 room-order rows, old-flow code | 1 | **ELIMINATED (revalidated)** — backend **accepts and stores** the link: (a) `user-group-check-in` response returns `cust_membership_id` (P8), (b) room orders in `order-logs` v2 expose `cust_membership_id` per order, (c) old FE already sends `customer_id` + `cust_membership_id` (`roomService.js:57-61`). Values are `null` in evidence because those probes used the **new JSON flow which omits the field**. Registry/OPEN_GAPS still say BACKEND-BLOCKED → **stale (R1)**; recommend CLOSURE to move BUG-090 → RESOLVED (backend) and note FE old-flow parity exists. | `evidence/INV-PMS-CHECKIN-CRM-GAP/checkin_response_no_crm_link.json`; `evidence/INV-PMS-CRs-363-364-366/probe_order_logs_v2.json` (`cust_membership_id` key present); `roomService.js:57-61` |
| H5 | Documents in new flow are captured somewhere else (OCR step per CR-358 intake §7) | grep `pages/pms`, `components/pms` for upload/document | 1 | **ELIMINATED** — no document UI/upload in any new PMS page; `pmsCheckIn` hard-codes `id_type: 'Select document type'` | `pmsService.js:152` |
| H6 | Reservation record carries a CRM id we could reuse | Inspect `local-reservations` shape | 1 | **ELIMINATED** — reservation `guest{first_name,last_name,email,phone,...}` + `user_id_document_id` (POS-internal). No CRM `customer_id` field | `evidence/INV-PMS-CHECKIN-CRM-GAP/reservation_guest_shape_masked.json` |

---

## 3. Data Flow Trace — OLD vs NEW

### 3a. OLD flow (Dashboard → `RoomCheckInModal.jsx`) — CRM-aware ✅

```
Name/phone typed
  → searchCustomers(q)                     CRM GET  /pos/customers?search=          (L391-419, BUG-065)
  → selectCrmCustomer(c) → crmCustomerId   → getDocuments(id)  CRM GET /pos/customers/{id}/documents (L464-476, CR-129)
  → docs on file → hide upload row, skip "front image required" validation             (L611-616, L1052 — CR-350/BUG-351)
Submit
  → phone normalised to 10 digits                                                      (L660-662, BUG-092)
  → lookupCustomer(phone10)                CRM POST /pos/customer-lookup               (L668)
     ├─ registered → customerId = existing.customer_id || existing.id
     └─ not found  → createCustomer({name, phone}, restaurant.id)  CRM POST /pos/customers (L672-676)
  → Corporate + firmGst → updateCustomer(customerId,{gstName,gstNumber,isB2b})  CRM PUT /pos/customers/{id} (L686-697, CR-128)
  → roomService.checkIn({... customerId, idType, frontImage, backImage, extraAdults[], childNames ...})
       FormData → POST /api/v1/vendoremployee/pos/user-group-check-in
       fd.customer_id + fd.cust_membership_id = customerId                             (roomService.js:57-61, BUG-092/CR-127)
       fd.id_type, front_image_file, back_image_file (+ per-adult slots)               (roomService.js:73-93)
  → uploadDocument(customerId, docType, front/back)  CRM POST /pos/customers/{id}/documents (L731-738, INV-003)
```
All CRM calls are **non-blocking** (try/catch + `console.warn`, check-in proceeds with `customerId = null`).

### 3b. NEW flow (`/pms/new-booking` → `/pms/check-in`) — CRM-blind ❌

```
NewBookingPage.jsx
  name/phone/email typed → NO searchCustomers, NO lookupCustomer
  "Save as Booking"  → createDirectReservation()  POST /aiosell/direct-reservation  guest{name,phone,email}   (pmsService.js:114-127)
  "Check In Now"     → navigate('/pms/check-in', { state: { walkin: {...} } })                                (L102)

CheckInPage.jsx
  selectArrival / selectWalkin → form {name, phone, email, ...}  (L101-142)  → NO CRM search, NO doc fetch
  handleConfirm (L164-200)
    → computeRoomGst → pmsCheckIn({bookingType, bookingId, name, phone, email, room, dates, amounts, adults, children, note, gstTax})

pmsService.pmsCheckIn (L136-172)
    JSON → POST /api/v1/vendoremployee/pos/user-group-check-in
    payload: booking_type, booking_id, name, phone, email, room_id[], id_type:'Select document type' (hard-coded),
             total_adult, total_children, children_name:'', dates, booking_details:'', booking_for:'Individual',
             order_amount, room_price, advance_payment, balance_payment, payment_method, order_note, gst_tax, firm_name:'', firm_gst:''
    ❌ NO customer_id      ❌ NO cust_membership_id      ❌ NO id document files      ❌ NO firm GST (always '')
    Response (probe P8): { message, user_id: 42619, cust_membership_id: null }
```

**BREAK POINT:** `CheckInPage.handleConfirm` → `pmsService.pmsCheckIn`. The CRM identify-or-create step and the CRM document step that sit *around* `roomService.checkIn()` in the old modal have no equivalent in the new page. Backend responds with a POS-internal `user_id` and `cust_membership_id: null`.

---

## 4. Answers to Owner Questions

| # | Question | Finding |
|---|---|---|
| 1 | How does customer creation/identification happen during check-in today? | **New flow:** none on the CRM side. FE sends raw `name/phone/email`; POS backend creates/re-uses its **own** `users` row (`user_id`). **Old flow:** CRM `lookupCustomer(phone10)` → else `createCustomer`, then passes `customer_id` to backend. |
| 2 | Is an existing CRM customer searched & linked? | **New flow: NO** (no `searchCustomers`/`lookupCustomer` anywhere in `pages/pms/*`). **Old flow: YES** (typeahead on name & phone + lookup on submit). |
| 3 | Is a new CRM customer created if absent? | **New flow: NO.** **Old flow: YES** via `createCustomer({name, phone}, restaurantId)` (`CUSTOMER_CREATE = POST /pos/customers`). |
| 4 | How should documents/other details from the old module be handled? | Old module: `id_type` + front/back image per guest → POS backend (FormData) **and** `uploadDocument()` → CRM (`aadhaar/passport/pan_card/license/voter_id/other`), plus CR-129 "Documents on File" viewer and CR-350 mandatory toggle (`localStorage mygenie_room_id_upload_required`) and BUG-351 skip-when-CRM-has-docs. New flow has **none of these** and sends `id_type: 'Select document type'` as a placeholder. Also lost: `booking_for` (Corporate), `firm_name/firm_gst` (always `''`), extra adult names/IDs, `children_name`, `payment_method` for advance. Note CR-358 intake §7 defines a document step (OCR/upload, toggle-gated) that was **never built** in P2. |
| 5 | How will payment history, stay history, customer reports link to CRM? | Every link hangs off a **single CRM `customer_id`** propagated onto the POS order: order flow already sends `cust_membership_id = customer.id` (`orderTransform.js:1067,1196,1359,1714`) and TAB sends `crm_customer_id` (L1718). CRM aggregates (`total_visits`, `total_spent`, `recent_orders`, tier, wallet, loyalty — `customerTransform.customerDetail`) and CR-131 reports (`/pos/reports/*`) are computed **CRM-side** from linked orders. Room stays created by the new flow with `cust_membership_id: null` are **invisible to CRM** → no stay history, no room revenue in `total_spent`, no loyalty accrual, no folio→CRM link for CR-364. |
| 6 | Which CRM APIs / integration points are missing from the new flow? | (a) `GET /pos/customers?search=` typeahead on New Booking + Check-In forms; (b) `POST /pos/customer-lookup` on confirm; (c) `POST /pos/customers` create-if-absent; (d) `customer_id` + `cust_membership_id` in the `pmsCheckIn` JSON payload; (e) `GET /pos/customers/{id}/documents` (docs on file); (f) `POST /pos/customers/{id}/documents` upload; (g) `PUT /pos/customers/{id}` B2B/GST sync for Corporate; (h) optionally `GET /pos/customers/{id}` for returning-guest badge (tier/visits). All service functions **already exist** in `customerService.js` / `documentService.js` — the gap is wiring, not new services. |
| 7 | Duplication risk between PMS/check-in customer data and CRM? | **YES — three-way divergence today:** (i) AIOSELL/PMS reservation `guest{}` block (per booking, free text), (ii) POS backend `users` row (`user_id` returned by check-in; `user_id_document_id` on reservation), (iii) CRM `customers` (only if FE calls it). New flow populates (i)+(ii) and never (iii). Same phone can become a POS user with no CRM record, or a CRM record (from a dine-in order) with room stays not attached. Phone format is the only natural join key; old flow normalises to 10 digits (BUG-092) — new flow already validates `^\d{10}$` so the key is compatible. |
| 8 | What changes make CRM the central customer record? | See §5 — FE parity wire (HIGH, ~4 files) + backend acceptance of `customer_id` on the JSON check-in (BUG-090 dependency) + policy decisions (§5c). |

---

## 5. Recommendations

### 5a. Classification
**FE_FIX (feature-gap parity) + BACKEND_ASK.** Not Fast-Lane / planning-skip eligible: HIGH risk, customer data, 3–4 files, hotspot-adjacent (`pmsService.js` shared by CR-358-P3/P4/P5).

### 5b. Frontend scope (for PLANNING Gate 2/3 — indicative, not a plan)

| Area | File | Change (indicative) | Reuse |
|---|---|---|---|
| Identify | `pages/pms/CheckInPage.jsx` | Name/phone typeahead via `searchCustomers`; on select → set `crmCustomerId`, prefill name/email/GST; on confirm → `lookupCustomer(phone)` else `createCustomer`; pass `customerId` to `pmsCheckIn`; non-blocking try/catch (BUG-092 pattern) | `RoomCheckInModal.jsx:391-523, 660-683` |
| Identify (early) | `pages/pms/NewBookingPage.jsx` | Same typeahead so a booking is already attached to a CRM guest; carry `customerId` in `state.walkin` and (backend-permitting) into `direct-reservation` | `CartPanel.jsx:892-1022` |
| Payload | `api/services/pmsService.js` `pmsCheckIn` | Add `customer_id` + `cust_membership_id` (parity with `roomService.js:57-61`); accept real `id_type`, `booking_for`, `firm_name/firm_gst`, `payment_method` | `roomService.checkIn` |
| Documents | `pages/pms/CheckInPage.jsx` (+ small `components/pms/GuestDocsSection.jsx`) | CR-129 docs-on-file viewer (`getDocuments`) + upload (`uploadDocument`) + CR-350 toggle + BUG-351 skip rule. **Constraint:** `pmsCheckIn` is JSON; ID images must go to CRM only (already the CR-129 pattern) unless the endpoint is switched back to FormData — owner decision OD-3 |
| B2B | `pages/pms/CheckInPage.jsx` | Corporate → `updateCustomer(customerId, {gstName, gstNumber, isB2b})` (CR-128 G3) | `RoomCheckInModal.jsx:686-697` |

Files WILL NOT be touched by such a CR: `RoomCheckInModal.jsx`, `roomService.js`, `customerService.js`, `documentService.js`, `crmAxios.js`, `orderTransform.js`.

### 5c. Owner decisions needed before Planning (R3 — do not invent policy)

| OD | Question | Options |
|---|---|---|
| OD-1 | Should CRM link be **blocking** at check-in (fail if CRM down) or **non-blocking** like the old modal (BUG-092)? | A) non-blocking + warning toast B) blocking |
| OD-2 | Create the CRM customer at **New Booking** time (reservation already linked) or only at **Check-In**? | A) both (create at booking, re-use at check-in) B) check-in only |
| OD-3 | Where do ID document images live for PMS check-ins? | A) CRM only (`/pos/customers/{id}/documents`, keep JSON check-in) B) both CRM + POS backend (requires FormData variant of `pmsCheckIn` or a follow-up upload endpoint) |
| OD-4 | Does the CR-350 mandatory-ID toggle apply to the new PMS flow too? | A) yes (same localStorage key) B) separate PMS setting C) CR-358 §7 rules (nationality-based) |
| OD-5 | Extra adults / children names & IDs — in scope for the new flow (old modal supports them; new form has counts only)? | A) yes B) later CR |
| OD-6 | OTA (Online) arrivals: auto-create CRM customer from the AIOSELL `guest{}` block at check-in without staff confirmation? | A) yes (auto) B) staff confirms match/create |

### 5d. Backend — NO blocker (revalidated)

BUG-090 backend acceptance of `customer_id` / `cust_membership_id` on `user-group-check-in` is **done** (owner-confirmed; evidence in H4). The fix is **frontend-only**: send the CRM id from the new flow. One R11 confirmation probe during Planning is still advised (JSON variant returns non-null `cust_membership_id` when the field is sent) — but it is a verification step, not a dependency.

Optional (non-blocking) backend asks to raise only if OD-2 = A or CR-364 needs it:
- `direct-reservation` accepting `customer_id` on `guest{}` (CRM-linked pre-arrival).
- Reservation / in-house payloads exposing `cust_membership_id` for CRM deep-links on Folio (CR-364).

### 5e. Suggested gate path
INTAKE (register CR, Risk HIGH, P1) → PLANNING Gate 2 with OD-1..6 answered (includes R11 probe: JSON check-in **with** `cust_membership_id`) → Gate 3 plan → Gate 4 GO. Also: CLOSURE to un-stale BUG-090 (registry, BUG_TRACKER, OPEN_GAPS BB-1).

---

## 6. Evidence Artifacts

`/app/memory/evidence/INV-PMS-CHECKIN-CRM-GAP/`
- `grep_new_flow_crm_refs.txt` — 0 CRM references across `CheckInPage.jsx`, `NewBookingPage.jsx`, `pmsService.js`
- `checkin_response_no_crm_link.json` — probe P8 (2026-09-03) response: `cust_membership_id: null`
- `reservation_guest_shape_masked.json` — `local-reservations` guest block has no CRM id (PII masked)

- `../INV-PMS-CRs-363-364-366/probe_order_logs_v2.json` — room-order rows expose `cust_membership_id` (backend stores the link; `null` for PMS-JSON-created orders)

Live re-probe **not executed**: `test_credentials.md` is missing/empty in this workspace. Backend acceptance is owner-confirmed + evidence-consistent (H4); a confirmation probe is scheduled for Planning (R11).

---

## 7. Retroactive Candidates
NONE. (CR-129, CR-350, BUG-351 are correctly registered as IMPLEMENTED for the **old** modal only.)

---

## 8. Stale-doc flags (R1)
- **BUG-090** in `registry.json`, `BUG_TRACKER.md:372`, `CR_REGISTRY.md:137`, `OPEN_GAPS_REGISTER.md:70 (BB-1)`, `SPRINT_STATUS.md` still `BACKEND-BLOCKED / Q-090-B-1 OPEN`. Owner confirms backend fixed; code (`roomService.js:57-61`) already sends the id; evidence shows backend echoes/stores `cust_membership_id`. → CLOSURE should mark BUG-090 resolved for the old flow; the **new PMS flow** gap is tracked by the new CR proposed here.
- `CR-358_PMS_CHANNEL_MANAGER_CHECKIN_REDESIGN_INTAKE.md §7 Document Verification Rules` describes a document step that P2 did not deliver — should be marked "deferred/not built" in OPEN_GAPS_REGISTER when this CR is registered.
- `CR-358-P2_IMPLEMENTATION_PLAN.md:142` "full FormData parity … minus file fields" — parity claim excludes `customer_id`/`cust_membership_id` as well (those are conditional appends in `roomService.js:58-61`); worth a one-line correction.
