# QA Handover — CR-379
## New PMS Check-In: CRM Customer Link (Core)
**Date:** 2026-09-14
**Implementation agent:** IMPLEMENTATION role
**Status:** Gate 5a COMPLETE — ready for Gate 5b (QA)

---

## 1. Inherited from Plan (Verification Matrix — Self-Test Results)

| Edit | File | Verification | Self-Test Result |
|------|------|-------------|:---:|
| E-P1 | pmsService.js | // CR-379 marker on line 1 | ✅ grep confirms 7 occurrences |
| E-P2 | pmsService.js | children_name/booking_for/firm_name/firm_gst upgraded; customer_id/cust_membership_id/name2/3/4 added | ✅ Verified by view |
| E-C1 | CheckInPage.jsx | // CR-379 marker on line 1 | ✅ grep confirms 19 occurrences |
| E-C2 | CheckInPage.jsx | useRef in React import | ✅ Verified line 2 |
| E-C3 | CheckInPage.jsx | BadgeCheck, FileText in lucide import | ✅ Verified line 4 |
| E-C4 | CheckInPage.jsx | customerService + documentService imported | ✅ Verified lines 8-9 |
| E-C5 | CheckInPage.jsx | 10 state vars + crmLookupPhoneRef declared | ✅ Verified after submitting state |
| E-C6 | CheckInPage.jsx | handleCrmLookup useCallback (stale-guard, docs fetch) | ✅ Verified by view |
| E-C7 | CheckInPage.jsx | selectArrival: CRM reset + OTA auto-lookup + handleCrmLookup dep | ✅ Verified |
| E-C8 | CheckInPage.jsx | selectWalkin: CRM reset + prefill auto-lookup + handleCrmLookup dep | ✅ Verified |
| E-C9 | CheckInPage.jsx | handlePhoneChange: lookup on 10 digits, cancel on edit | ✅ Verified |
| E-C10 | CheckInPage.jsx | Phone input onChange → handlePhoneChange | ✅ Verified line 340 area |
| E-C11 | CheckInPage.jsx | CRM badge JSX: 4 states with data-testid attrs | ✅ Verified by view |
| E-C12 | CheckInPage.jsx | Occupancy counter + extra adult/child inputs + corporate toggle | ✅ Verified by view |
| E-C13 | CheckInPage.jsx | handleConfirm: CRM create-if-new + corporate GST sync + expanded pmsCheckIn | ✅ Verified |

**Self-test: 15/15 edits verified. Compile: PASS (0 new warnings).**

---

## 2. Test Cases (V-01..V-13 from Plan)

| V# | Test Case | Steps | Expected |
|----|-----------|-------|----------|
| V-01 | WalkIn — new 10-digit phone | Open /pms/check-in → click Walk-in → type 10-digit phone NOT in CRM | `data-testid="ci-crm-new-guest"` div appears ("New guest — will be registered…") |
| V-02 | WalkIn — returning CRM phone | Same as V-01 but phone = `9000099013` (test customer) | `data-testid="ci-crm-badge"` appears with tier chip + 4-col stats (Stays/Last Stay/Loyalty Pts/Store Credit) |
| V-03 | Confirm — new guest payload | V-01 → fill form → Confirm | Network: `customer_id` present in pmsCheckIn request body (after createCustomer) |
| V-04 | Confirm — returning guest payload | V-02 → fill form → Confirm | Network: `customer_id` = CRM id from lookup; `createCustomer` NOT called |
| V-05 | CRM offline during lookup | Simulate timeout → type 10 digits | `data-testid="ci-crm-error"` amber banner visible; Confirm button still enabled |
| V-06 | CRM offline during confirm | V-01 → CRM create fails → Confirm | `toast.warning` fires; check-in proceeds; `customer_id` absent from payload |
| V-07 | OTA arrival auto-lookup | Select OTA arrival card with 10-digit phone | Spinner → badge (if phone known) without manual phone typing |
| V-08 | Extra adults — names in payload | Walk-in → adults=3 → fill Adult 2 name → Confirm | Network: `name2`=entered value in pmsCheckIn body |
| V-09 | Children names in payload | Walk-in → children=2 → fill "Child 1 Name & Age" → Confirm | Network: `children_name`="ChildA,ChildB" |
| V-10 | Corporate toggle + GST | Walk-in → tick Corporate → enter firm + GST → Confirm | Network: `booking_for:'Corporate'`, `firm_name`, `firm_gst` present; `updateCustomer` called |
| V-11 | BUG-090 regression | Any check-in with known CRM phone → Confirm | Network: `cust_membership_id` non-null, equals `customer_id` |
| V-12 | Docs-on-file cards | V-02 (if test customer has docs) | `data-testid="ci-doc-card-{doc_type}"` elements visible with type + `uploaded_at` date |
| V-13 | Stale-guard | Type 9 digits fast → type 10th | Single lookup fires; no double-state-set flicker |

---

## 3. Regression Tests

| # | What to verify | Why |
|---|---------------|-----|
| R-1 | Normal Walk-in check-in (no CRM) still works end-to-end | E-C13 changes handleConfirm — must not break non-CRM path |
| R-2 | OTA arrival card selection fills form correctly | E-C7 modified selectArrival |
| R-3 | CheckInPage loads without crash when no room available | E-C5/C6 add state — boot must be stable |

---

## 4. Registry Sync Confirmation

```
Registry synced: YES
Item: CR-379
Status: GATE_5A_IMPLEMENTED
Sprint: pos_pms_1
EXIT GATE: ALL 5 PASSED
  □1 Registry: PASS
  □2 CR_REGISTRY.MD: PASS (row updated to Gate 5)
  □3 FILE_OWNERSHIP.MD: PASS (CR-379 entry added 2026-09-14)
  □4 Code markers: 19 in CheckInPage.jsx, 7 in pmsService.js
  □5 Compile: webpack compiled with 1 warning (pre-existing only, 0 new)
```

---

## 5. Credentials + Environment

```
POS login URL: https://preprod.mygenie.online
Email: owner@thegoankitchen.com
Password: ***
restaurant_id: 69 (The Goan Kitchen)

Test CRM customer (phone for V-02/V-04/V-12):
  phone: 9000099013
  name: CR379 ProbeTest
  customer_id: aa397040-438b-4792-88d5-3e805a1c1798

Free rooms for check-in testing (checkout first if needed):
  r4 (table unknown): order 1232244 — "john"
  r5 (8527): order 1232314 — "poi"

IMPORTANT: Static .env CRM API keys are REVOKED (BUG-098). crm_token from login is used automatically by crmAxios.js.
```
