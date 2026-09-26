# Session Handover — 2026-09-13
## CR-379 Gate 3 Implementation Plan + All Pre-Implementation Probes Closed

```
Session date:     2026-09-13
Status at close:  CR-379 GATE 3 COMPLETE — ZERO open gaps — Awaiting Gate 4 GO
Next agent role:  IMPLEMENTATION agent (Gate 4 GO received → write code)
Workspace:        /app
```

---

## 1. What Was Accomplished This Session

### 1a. Gate 3 Implementation Plan Written
File: `/app/memory/plans/CR-379_IMPLEMENTATION_PLAN.md` (958 lines)

Contains:
- **15 exact edit sites** with verbatim current → new code for every change
- **2 files only:** `CheckInPage.jsx` (13 edits, MAJOR ~130 lines) + `pmsService.js` (2 edits, MINOR ~15 lines)
- **13 verification scenarios** (V-01..V-13) seeded as QA handover
- **Execution sequence** (numbered order to minimise compile errors)
- **Risk register** (5 risks, all MEDIUM or LOW)
- **Post-code registry checklist** (5 EXIT GATE items)
- **Scope lock** (files WILL / WILL NOT touch)

### 1b. Full Live Probe Cycle Completed
File: `/app/memory/evidence/PROBE_CR379_2026_09_13.md` (333 lines)

Probes run:
- **PROBE A:** Login + crm_token confirmed (static .env keys are dead — BUG-098)
- **PROBE B:** CRM customer create — shape `{ customer_id, name, phone, created_at }` confirmed
- **PROBE C:** CRM lookup **"found" path** — FULL response shape confirmed live (all 10 badge fields)
- **PROBE D/E/F:** `getDocuments` — empty + upload + re-fetch — flat array shape confirmed
- **PROBE H:** pmsCheckIn with full 15-field CR-379 payload — accepted, no field rejection
- **PROBE V-11:** Free room checkout (order 1232243 r2) → fresh pmsCheckIn → SUCCESS response includes `cust_membership_id` confirming backend stores it

### 1c. Two Critical Plan Corrections Applied
Both applied to `/app/memory/plans/CR-379_IMPLEMENTATION_PLAN.md` E-C11:

| Field | Plan had | Correct | Source |
|---|---|---|---|
| Doc card date | `doc.created_at` | **`doc.uploaded_at`** | PROBE F live response |
| Loyalty ₹ subtitle | `Math.floor(pts * 1)` | **`crmCustomer.pointsValue`** (direct from API) | PROBE C + customerTransform.js L93 |

### 1d. Registry / Control Docs Updated
- `registry.json` — CR-379 status updated, completeness 4/7, probe evidence artifact added
- `CR_REGISTRY.md` — CR-379 row updated to Gate 3 COMPLETE
- `CONTROL_DASHBOARD.md` — latest session entry prepended
- `test_credentials.md` — created/updated with POS + CRM credentials

---

## 2. Current State of CR-379

```
CR ID:          CR-379
Title:          New PMS Check-In: CRM Customer Link (Core)
Priority:       P1
Risk:           HIGH
Sprint:         pos_pms_1
Gate:           3 COMPLETE
Completeness:   4/7
Blocker:        NONE
```

**Gate history:**
- Gate 1 (Intake): ✅ DONE
- Gate 2 (Impact Analysis): ✅ DONE — `/app/memory/impact/CR-379_IMPACT_ANALYSIS.md`
- Gate 2.5 (Design freeze): ✅ DONE — 8 decisions DD-1..DD-8 locked — `/app/memory/plans/CR-379_DESIGN_DECISIONS.md`
- Gate 3 (Implementation Plan): ✅ DONE — `/app/memory/plans/CR-379_IMPLEMENTATION_PLAN.md`
- **Gate 4 (Owner GO for implementation): ⬜ PENDING — owner has NOT yet given GO this session**
- Gate 5a (Implementation): ⬜ BLOCKED pending Gate 4 GO
- Gate 5b (QA): ⬜ BLOCKED
- Gate 6 (Merge): ⬜ BLOCKED

**CR-380 status:** INTAKE only. Explicitly blocked until CR-379 Gate 4 GO minimum.

---

## 3. Immediate Next Task for Next Agent

### If user says "Gate 4 GO" (or equivalent):

Switch to **IMPLEMENTATION role**. Apply all 15 edit sites in the sequence specified in the plan.

**Execution order (from plan §Execution Sequence):**
```
1. E-P1, E-P2          → pmsService.js
2. E-C1, E-C2, E-C3, E-C4  → CheckInPage.jsx imports + state
3. E-C6                → add handleCrmLookup
4. E-C7, E-C8          → update selectArrival, selectWalkin
5. E-C9, E-C10         → handlePhoneChange + phone input onChange
6. E-C11               → CRM badge block JSX
7. E-C12               → Occupancy + corporate JSX
8. E-C13               → handleConfirm CRM sequence
```

After implementation: take one smoke-test screenshot, then call `testing_agent` with V-01..V-13 as the test matrix.

**V-11 post-implementation verification** (only verification needing a live API call):
- Do a pmsCheckIn on a free room, check response includes `cust_membership_id` = UUID
- Free room by checking out any of: r3 (1232329 — the probe order from this session), r4, r5

### If user asks anything other than Gate 4:
Read `AGENT_PROMPT_ALPHA.md` and confirm role before proceeding.

---

## 4. All Files Relevant to Next Agent

### Governance / Control
```
/app/memory/control/AGENT_PROMPT_ALPHA.md     — Gate rules, roles, enforcement
/app/memory/control/FILE_OWNERSHIP.md         — per-file change ownership
/app/memory/control/registry.json             — machine-readable CR registry
/app/memory/control/CR_REGISTRY.md            — human-readable CR table
/app/memory/control/CONTROL_DASHBOARD.md      — session log + latest status
```

### CR-379 Artifacts (all complete)
```
/app/memory/change_requests/CR-379_PMS_CHECKIN_CRM_CUSTOMER_LINK_INTAKE.md
/app/memory/impact/CR-379_IMPACT_ANALYSIS.md
/app/memory/plans/CR-379_DESIGN_DECISIONS.md      ← 8 frozen design decisions
/app/memory/plans/CR-379_DESIGN_MOCKUP.html        ← reference mockup
/app/frontend/public/cr379-design-mockup.html      ← live preview copy
/app/memory/plans/CR-379_IMPLEMENTATION_PLAN.md   ← 15 edit sites (THE plan)
/app/memory/evidence/PROBE_CR379_2026_09_13.md    ← all probe results + V-11 closure
```

### CR-380 Artifacts (intake only — do not start until CR-379 Gate 4 GO)
```
/app/memory/change_requests/CR-380_PMS_CHECKIN_GUEST_ID_DOCUMENTS_INTAKE.md
```

### Application Source Files (DO NOT touch until Gate 4 GO)
```
/app/frontend/src/pages/pms/CheckInPage.jsx           ← WILL change (CR-379)
/app/frontend/src/api/services/pmsService.js           ← WILL change (CR-379)

/app/frontend/src/api/services/customerService.js      ← read-only, used as-is
/app/frontend/src/api/services/documentService.js      ← read-only, used as-is
/app/frontend/src/api/crmAxios.js                      ← read-only
/app/frontend/src/api/transforms/customerTransform.js  ← read-only (verify gstName/gstNumber field names in toAPI.updateCustomer before E-C13)
/app/frontend/src/components/modals/RoomCheckInModal.jsx ← MUST NOT TOUCH (old flow)
/app/frontend/src/api/services/roomService.js           ← MUST NOT TOUCH (old flow)
/app/frontend/src/pages/pms/NewBookingPage.jsx          ← MUST NOT TOUCH (OD-2 locked)
```

### Test / Memory
```
/app/memory/test_credentials.md         ← POS + CRM login, test customer ID
/app/memory/PRD.md                      ← product overview (may be stale — check)
```

---

## 5. Implementation Plan Summary (for quick reference)

### pmsService.js — 2 edit sites
| # | Edit | What changes |
|---|---|---|
| E-P1 | Line 1 comment | Add `\| CR-379` marker |
| E-P2 | Lines 155,159,167-169 + add | `children_name` → uses `p.childrenNames.join(',')` · `booking_for` → `p.bookingFor ?? 'Individual'` · `firm_name/gst` → from params · add `customer_id`, `cust_membership_id`, `name2/3/4`, `id_type2/3/4` |

### CheckInPage.jsx — 13 edit sites
| # | Edit | What changes |
|---|---|---|
| E-C1 | Line 1 | Marker comment |
| E-C2 | Line 2 | Add `useRef` to React import |
| E-C3 | Line 4 | Add `BadgeCheck, FileText` to lucide import |
| E-C4 | Lines 7–9 | Add `customerService` + `documentService` imports |
| E-C5 | After line 34 | 9 new state vars + `crmLookupPhoneRef` |
| E-C6 | After line 99 | Add `handleCrmLookup` useCallback (stale-guard) |
| E-C7 | Lines 101–120 | `selectArrival` — CRM reset + OTA lookup on 10-digit phone |
| E-C8 | Lines 122–142 | `selectWalkin` — CRM reset + prefill lookup |
| E-C9 | After line 144 | Add `handlePhoneChange` (lookup on 10 digits, cancel on edit) |
| E-C10 | Line 340 | Phone input `onChange` → `handlePhoneChange` |
| E-C11 | After line 327 | CRM badge block: 4 states (loading/returning/new/failed). Stats: Stays/LastStay/LoyaltyPts/StoreCredit. Doc cards use `doc.uploaded_at` |
| E-C12 | After line 375 | Occupancy counter (adults/children) + extra adult name inputs + per-child name inputs + corporate B2B toggle + firm/GST fields |
| E-C13 | Lines 164–200 | `handleConfirm` — CRM create-if-new (non-blocking) + corporate GST sync (non-blocking) + updated `pmsCheckIn` call with 6 new params |

---

## 6. Key Probe Findings (facts confirmed in this session)

### CRM API — confirmed live shapes

**Lookup "found" response fields (via `customerTransform.fromAPI.customerLookup`):**
```
api.customer_id    → id          (UUID string)
api.tier           → tier        (string, default "Bronze", never null)
api.total_points   → totalPoints (number)
api.points_value   → pointsValue (float — direct ₹ equivalent, no rate calculation needed)
api.wallet_balance → walletBalance (float)
api.total_visits   → totalVisits (number, 0 for new customer)
api.last_visit     → lastVisit   (ISO string | null)
api.gst_name       → gstName     (string | null)
api.gst_number     → gstNumber   (string | null)
api.is_b2b         → isB2b       (null for normal, not false)
api.documents      → documents   ({} — metadata object, NOT the docs array)
```

**getDocuments normalized flat array item fields:**
```
id, file_name, content_type, file_size, url, uploaded_at, doc_type
```
⚠️ Date field = `uploaded_at` NOT `created_at`

**CRM create response fields:** `customer_id, name, phone, created_at`

**pmsCheckIn success response (JSON path):**
```json
{ "message": "Group check-in completed successfully", "user_id": 42641, "cust_membership_id": "uuid" }
```
⚠️ Persistence verification: check `cust_membership_id` in the check-in response, NOT in `get-single-order-new` (that endpoint does not surface CRM fields)

### Known non-behaviours (not bugs)
- `total_visits` does NOT auto-increment at check-in — visit count updates at checkout (out of CR-379 scope)
- `get-single-order-new` does NOT return `customer_id`/`cust_membership_id` — endpoint gap, not storage gap
- Static `REACT_APP_CRM_API_KEYS` in `.env` are REVOKED (401) — must use `crm_token` from login response

---

## 7. Owner Decisions (all locked — do not re-open)

| # | Decision | Locked choice |
|---|---|---|
| OD-1 | CRM failure behavior | Non-blocking — toast warning, check-in proceeds |
| OD-2 | CRM timing | Check-in ONLY — `NewBookingPage` gets NOTHING |
| OD-3 | Doc storage/API | Follow old pattern: CRM + POS FormData alignment |
| OD-4 | Mandatory doc rule | Reuse CR-350 toggle; returning guests with docs may skip |
| OD-5 | Extra adults/children | Include names + IDs in future doc work (CR-380) |
| OD-6 | OTA guest handling | Auto-lookup + silent CRM create for OTA arrivals |
| OD-7 | Returning guest CRM details | Show visits, tier, loyalty pts, store credit, docs-on-file |

### Design Decisions (all frozen DD-1..DD-8)
| # | Decision |
|---|---|
| DD-1 | CRM auto-lookup triggers on 10-digit phone input |
| DD-2 | Returning-guest badge below name/phone row |
| DD-3 | 4 stats: Stays · Last Stay · Loyalty Pts (with ₹ subtitle) · Store Credit |
| DD-4 | Docs-on-file as doc-type cards (read-only CR-379). Upload = CR-380 |
| DD-5 | Extra adults inline counter-driven name inputs |
| DD-6 | Children individual name inputs |
| DD-7 | Corporate checkbox with expandable firm/GST fields |
| DD-8 | Amber non-blocking CRM failure banner |

---

## 8. Test Credentials

```
POS login:
  URL:      https://preprod.mygenie.online
  Email:    owner@thegoankitchen.com
  Password: Qplazm@10
  restaurant_id: 69 (The Goan Kitchen)

CRM auth:
  URL:      https://crm.mygenie.online/api
  Method:   POST /api/v1/auth/vendoremployee/common-login → crm_token field → X-API-Key header
  Static .env CRM API keys: REVOKED (return 401)

Test CRM customer (created this session for probes):
  customer_id: aa397040-438b-4792-88d5-3e805a1c1798
  phone:       9000099013
  name:        CR379 ProbeTest

PMS rooms (as of session close):
  r2 (8526): order 1232329 — "CR379 V11 Persistence Test" (probe check-in, can be checked out)
  r3 (8524): order 1232245 — "CR379 NoCustomer Test"
  r4 (table unknown): order 1232244 — "john"
  r5 (8527): order 1232314 — "poi"
```

---

## 9. Do-Not-Retry Ledger

Carry forward from previous session plus new entries:

1. **Do NOT use static CRM API keys from .env** — `dp_live_*` keys return 401 (BUG-098). Always use `crm_token` from login response.
2. **Do NOT use `doc.created_at` for document date** — field is `doc.uploaded_at` (proven PROBE F)
3. **Do NOT calculate points ₹ value** — use `crmCustomer.pointsValue` directly from API (proven PROBE C)
4. **Do NOT expect `get-single-order-new` to return `customer_id`** — it doesn't surface CRM fields, this is an endpoint limitation not a storage failure
5. **Do NOT expect `total_visits` to increment at check-in** — visit count is a checkout-time event, out of CR-379 scope
6. **Do NOT touch `NewBookingPage.jsx`** — OD-2 locked
7. **Do NOT touch `RoomCheckInModal.jsx` or `roomService.js`** — old flow scope-locked
8. **Do NOT start CR-380 planning** until CR-379 Gate 4 GO confirmed
9. **Do NOT re-open any of OD-1..OD-7 or DD-1..DD-8** — all owner-frozen
10. **Do NOT declare BUG-090 as backend-blocked** — it is a frontend wiring gap, backend stores `cust_membership_id` correctly (V-11 CLOSED)

---

## 10. Upcoming Work Beyond CR-379

### Immediate next (this sprint: pos_pms_1)
- CR-379 Gate 4 GO → Gate 5a (implementation, ~130 lines across 2 files) → Gate 5b (QA, V-01..V-13)
- CR-380 Gate 2 (Impact Analysis) — unlocks AFTER CR-379 Gate 4 GO

### After CR-379 ships
- **CR-380:** PMS Guest ID Documents — document upload, mandatory-doc rules, extra adults/children ID. Intake at `memory/change_requests/CR-380_PMS_CHECKIN_GUEST_ID_DOCUMENTS_INTAKE.md`
- **CRM visit sync at checkout** — `total_visits` / `last_visit` / loyalty points accrual triggered at PMS checkout. Separate CR needed.

---

## 11. Architecture Notes (stable, no changes this session)

```
Old check-in path:
  Dashboard → RoomCheckInModal.jsx → roomService.checkIn() → FormData → /api/v1/vendoremployee/pos/user-group-check-in

New check-in path (CR-379 target):
  /pms/check-in → CheckInPage.jsx → pmsService.pmsCheckIn() → JSON → same endpoint

CRM path:
  crmAxios.js → X-API-Key: crm_token → crm.mygenie.online/api
  customerService.js: lookupCustomer / createCustomer / updateCustomer
  documentService.js: getDocuments (read-only for CR-379)

Backend: FastAPI + MongoDB at preprod.mygenie.online
No backend changes in CR-379 — frontend wiring only.
```

---

*Handover written: 2026-09-13. Session closed. Next: Gate 4 GO → CR-379 implementation.*
