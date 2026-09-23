# CR-379 — New PMS Check-In: CRM Customer Link (Core)

**ID:** CR-379
**Type:** CR (Change Request)
**Date registered:** 2026-09-12
**Role:** INTAKE (AGENT_PROMPT_ALPHA v0.7 §ROLE 1)
**Sprint:** pos_pms_1
**Gate:** 1 — INTAKE COMPLETE

---

## Classification

| Field | Value |
|---|---|
| Type | CR — Feature Gap / Parity |
| Severity | **P1 — HIGH** (Feature broken: CRM customer link absent from new PMS flow; no workaround; room stay history invisible to CRM) |
| Risk | **HIGH** — touches customer data, API contract (`pmsService.pmsCheckIn`), reporting linkage (`cust_membership_id` on room orders), hotspot-adjacent file (`pmsService.js` shared by CR-358-P3/P4/P5) |
| Fast Lane eligible | NO (HIGH risk, 3+ files, API contract change, customer data) |
| Duplicate check | **DISTINCT** — CR-127/CR-128/CR-129/CR-350/BUG-351 all cover the OLD `RoomCheckInModal` flow only. No existing CR covers `CheckInPage.jsx` CRM wiring. **RELATED to:** BUG-090 (same topic — FE gap on new flow), CR-358-P2 (builds on top of shipped Check-In page) |
| Code reality | **NONE** — grep of `CheckInPage.jsx` + `NewBookingPage.jsx` + `pmsService.js` returns 0 CRM references |
| Source | AGENT-DISCOVERED (Investigation `INV-PMS-CHECKIN-CRM-GAP_INVESTIGATION_REPORT_2026_09_12.md`) |
| Confidence | CONFIRMED (static code trace + stored probe evidence, owner-approved) |

---

## Description

The new PMS check-in flow (`CR-358-P2`: `NewBookingPage.jsx` → `CheckInPage.jsx` → `pmsService.pmsCheckIn()`) was built as a standalone path. It makes **zero CRM calls** and sends **no `customer_id` / `cust_membership_id`** to the POS backend. Every room stay created by this flow has `cust_membership_id: null`, making it invisible to CRM.

**Consequence:** No stay history, no room revenue in `total_spent`, no loyalty accrual, no folio→CRM link (CR-364), duplicate guest identities across AIOSELL / POS users / CRM customers.

**Fix (this CR):** Wire CRM identify-or-create at `CheckInPage` and propagate `customer_id` / `cust_membership_id` into the `pmsCheckIn` payload. Add returning guest badge. Include extra adults/children names.

---

## Scope

### In scope
- CRM typeahead search on name/phone field at `CheckInPage.jsx`
- On confirm: `lookupCustomer(phone10)` → else `createCustomer(name, phone, restaurantId)` — **non-blocking** (OD-1-A: try/catch + warning toast, check-in proceeds with `customerId = null` if CRM fails)
- CRM search/lookup fires at **Check-In only** (OD-2-B: `NewBookingPage` does NOT touch CRM)
- OTA arrivals (AIOSELL): auto-lookup by phone, **silent create** if no match — no staff confirmation (OD-6-A)
- Send `customer_id` + `cust_membership_id` in `pmsService.pmsCheckIn` payload (parity with `roomService.js:57-61`)
- Corporate/B2B: `updateCustomer(customerId, {gstName, gstNumber, isB2b})` when `firm_gst` present (CR-128 pattern)
- Extra adults names + count; children names + count (OD-5-A: include in this CR)
- **Returning guest badge** at CheckInPage when phone matched in CRM (OD-7-A): visit count, CRM tier/membership, docs-on-file indicator, last stay date, outstanding credit balance. Badge trigger (auto vs manual) **deferred to design stage**.

### Out of scope (→ CR-380)
- ID document upload to CRM
- Docs-on-file viewer
- Mandatory document toggle (CR-350 reuse)
- FormData change to `pmsCheckIn`
- Extra adult/child ID document images

### Files WILL change
| File | Change |
|---|---|
| `pages/pms/CheckInPage.jsx` | CRM typeahead, badge, lookup/create on confirm, corporate GST sync, extra adults/children names |
| `api/services/pmsService.js` | Add `customer_id`, `cust_membership_id`, `booking_for`, `firm_name`, `firm_gst`, extra adult names, children names to `pmsCheckIn` payload |

### Files WILL NOT touch
`RoomCheckInModal.jsx` · `roomService.js` · `customerService.js` · `documentService.js` · `crmAxios.js` · `orderTransform.js` · `NewBookingPage.jsx` · `CheckInPage.jsx` (FormData changes — CR-380 only)

---

## Owner Decisions — ALL LOCKED

| OD | Decision |
|---|---|
| OD-1 | **A — Non-blocking.** CRM fail → warning toast, `customerId = null`, check-in proceeds. |
| OD-2 | **B — Check-In only.** `NewBookingPage` does NOT call CRM. |
| OD-5 | **A — Include now.** Extra adult names + children names in this CR. |
| OD-6 | **A — Auto-lookup, silent create.** No staff confirmation for OTA arrivals. |
| OD-7 | **A — Badge with all fields:** visit count, tier, docs-on-file, last stay date, credit balance. Trigger (auto vs manual) deferred to design stage. |

---

## Evidence

| Item | Path |
|---|---|
| Investigation report | `/app/memory/investigations/INV-PMS-CHECKIN-CRM-GAP_INVESTIGATION_REPORT_2026_09_12.md` |
| CRM grep (0 hits) | `/app/memory/evidence/INV-PMS-CHECKIN-CRM-GAP/grep_new_flow_crm_refs.txt` |
| Check-in probe (cust_membership_id: null) | `/app/memory/evidence/INV-PMS-CHECKIN-CRM-GAP/checkin_response_no_crm_link.json` |
| Old flow code reference | `roomService.js:57-61` — `customer_id` + `cust_membership_id` appended |
| Source | AGENT-DISCOVERED |
| Confidence | CONFIRMED |

---

## Blast Radius

| Metric | Value |
|---|---|
| Files WILL change | 2 (`CheckInPage.jsx`, `pmsService.js`) |
| New files | 0 (badge is inline in CheckInPage) |
| Hotspot files touched | YES — `pmsService.js` shared by CR-358-P3/P4/P5 |
| Estimated scope | **MEDIUM** (2 files, ~80–120 lines) |

---

## Related Items

| ID | Relation |
|---|---|
| BUG-090 | Related — same topic (CRM customer_id on room orders); backend fixed; new PMS FE gap is distinct. BUG-090 registry status stale → CLOSURE action needed. |
| CR-358-P2 | Parent flow — Check-In page shipped under this CR; CRM layer was out of P2 scope. |
| CR-127 | Implemented same CRM link for OLD flow (`roomService.js`). Pattern to reuse. |
| CR-128 | Implemented B2B/GST CRM sync for OLD flow. Pattern to reuse. |
| CR-380 | Successor — Guest ID Documents. Depends on CR-379 (needs `customerId`). |

---

## Next Step

**→ Planning Gate 2 (Impact Analysis)**
Requires: R11 confirmation probe — JSON/FormData check-in **with** `cust_membership_id` sent → verify non-null in response and in `order-logs` v2 row. (Owner confirms backend accepts the field; probe is a verification step, not a dependency.)
