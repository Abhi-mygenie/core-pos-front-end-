# Security Documentation Gap Handover

**Date:** 2026-07-XX  
**Purpose:** Gaps between baseline docs, handover docs, and current code — security-relevant items  
**For:** Documentation Update Agent  
**Code Changes Made:** NONE

---

## Gap Summary

| Total Gaps Found | Security-Relevant | Functional Only | Priority Critical/High |
|---|---|---|---|
| 6 | 4 | 2 | 3 |

---

## GAP-001: CRM API Key Architecture Not Documented in Baseline

**Gap ID:** GAP-001  
**Related Module:** Authentication & Integration  
**Baseline Doc Reference:** `/app/memory/final/ARCHITECTURE_DECISIONS_FINAL.md` — Section "Application architecture summary"  
**Handover Doc Reference:** None (no handover covers CRM architecture)  
**Code File Proving Current Behavior:** `/app/frontend/src/api/crmAxios.js` (lines 8-16)

**What Baseline Currently Says:**
- Architecture doc mentions "service + transform API integration pattern" but does NOT document:
  - CRM as a separate service with its own base URL
  - Per-restaurant API key resolution
  - Client-side key storage via `REACT_APP_CRM_API_KEYS`

**What Code Actually Does:**
- `crmAxios.js` creates a separate Axios instance pointing to `REACT_APP_CRM_BASE_URL`
- API keys are parsed from `REACT_APP_CRM_API_KEYS` (JSON map of restaurantId → key)
- Keys are resolved dynamically per restaurant via `getCrmApiKey()`
- Keys are baked into the client-side JavaScript bundle (REACT_APP_ prefix)

**Gap Classification:** Security-relevant gap  
**Security Impact:** CRITICAL — CRM API keys in client bundle enables cross-tenant data access (SEC-002)  
**Recommended Update:** Add CRM integration architecture section documenting the dual-API pattern, key management, and the required migration to backend proxy  
**Priority:** Critical

---

## GAP-002: Socket Security Architecture Not Documented

**Gap ID:** GAP-002  
**Related Module:** Real-time / Socket  
**Baseline Doc Reference:** `/app/memory/final/ARCHITECTURE_DECISIONS_FINAL.md` — mentions "socket-driven runtime updates" but NO security posture  
**Handover Doc Reference:** None  
**Code File Proving Current Behavior:** `/app/frontend/src/api/socket/socketService.js` (line 65), `/app/frontend/src/api/socket/socketEvents.js` (lines 7-18)

**What Baseline Currently Says:**
- "socket-driven runtime updates" (one line)
- Module decisions mention socket provider ordering
- No discussion of socket authentication, channel isolation, or event trust model

**What Code Actually Does:**
- Socket connects to `REACT_APP_SOCKET_URL` with NO authentication token
- Channel names are predictable: `new_order_{restaurantId}`
- No validation that connected client owns the subscribed restaurant
- Event payloads are trusted without restaurant ID cross-check

**Gap Classification:** Security-relevant gap  
**Security Impact:** CRITICAL — unauthenticated socket access to any restaurant's real-time data (SEC-003)  
**Recommended Update:** Add "Socket Security Architecture" section documenting: auth mechanism (current: none), channel isolation model, event trust assumptions, and required production hardening  
**Priority:** Critical

---

## GAP-003: Payment Amount Trust Model Not Documented

**Gap ID:** GAP-003  
**Related Module:** Order Entry & Payment  
**Baseline Doc Reference:** `/app/memory/final/MODULE_DECISIONS_FINAL.md` — Section "7. Order Entry & Payment Collection Module"  
**Handover Doc Reference:** None (multiple bug-fix handovers modify payment logic but none document the trust model)  
**Code File Proving Current Behavior:** `/app/frontend/src/api/transforms/orderTransform.js` (lines 885-1040), `/app/frontend/src/components/order-entry/CollectPaymentPanel.jsx` (lines 468-519)

**What Baseline Currently Says:**
- Module decisions document UI responsibility and API endpoints
- No statement about whether financial values are client-authoritative or server-validated
- "Common bug/change impact areas" mentions "discount calculation" but not security implications

**What Code Actually Does:**
- ALL financial values (total, tax, discount, service charge, tip, round-off) computed entirely client-side
- Values sent as-is in the `collectBillExisting` payload
- No visible mechanism for backend to reject mismatched amounts
- `transferToRoom` also sends client-computed financials

**Gap Classification:** Security-relevant gap  
**Security Impact:** HIGH — if backend trusts frontend values, direct financial manipulation is possible (SEC-004)  
**Recommended Update:** Add explicit trust model statement: "Financial values are [client-authoritative / server-validated]. Backend [does / must] recalculate totals from order items."  
**Priority:** High

---

## GAP-004: Report Module Security and CR-001/CR-003/CR-004 Changes

**Gap ID:** GAP-004  
**Related Module:** Reports  
**Baseline Doc Reference:** `/app/memory/final/MODULE_DECISIONS_FINAL.md` — Section on Reports  
**Handover Doc Reference:**
- `/app/memory/handover/CR_001_IMPLEMENTATION_HANDOVER.md`
- `/app/memory/handover/CR_003_IMPLEMENTATION_HANDOVER.md`
- `/app/memory/handover/CR_004_IMPLEMENTATION_HANDOVER.md`
- `/app/memory/handover/REPORTS_FIELD_MAPPING_IMPLEMENTATION_HANDOVER.md`

**What Baseline Currently Says:**
- Report module exists with paid/cancelled/credit/hold/aggregator tabs
- No security considerations documented for report access
- No mention of room orders report, audit tab, or payment mutations

**What Code Actually Does:**
- New routes: `/reports/audit`, `/reports/rooms` (CR-001, CR-004)
- New payment mutation endpoints: `change-order-payment-method`, `make-order-unpaid` (CR-003)
- `getOrderLogsReport` has complex status derivation with `activeSrmIds` cross-referencing
- Report has diagnostic logging that leaks data (SEC-007)
- No permission-based access control on report routes (any authenticated user sees all)

**Gap Classification:** Recent report-module change + Security-relevant gap  
**Security Impact:** MEDIUM — report data accessible to any authenticated user; payment mutation endpoints lack visible permission guards  
**Recommended Update:**
1. Update Module Decisions to include CR-001/CR-003/CR-004 scope
2. Add access control requirements for reports and payment mutations
3. Document the new audit tab, room orders report, and payment method change flows
**Priority:** High

---

## GAP-005: Room Module V2 Changes Not Reflected in Baseline

**Gap ID:** GAP-005  
**Related Module:** Room Management  
**Baseline Doc Reference:** `/app/memory/final/MODULE_DECISIONS_FINAL.md` — Section on Room module  
**Handover Doc Reference:**
- `/app/memory/handover/CR_004_IMPLEMENTATION_HANDOVER.md`
- Multiple archived room docs

**What Baseline Currently Says:**
- Room check-in, room transfer, and room billing flows documented
- No mention of `/get-room-list` endpoint
- No mention of Room Orders Report page
- No mention of `transformRoomListToRows`

**What Code Actually Does:**
- New `GET /api/v2/vendoremployee/get-room-list` endpoint used
- New `RoomOrdersReportPage` at `/reports/rooms`
- `roomListTransform.js` transforms room data for report display
- `getSingleOrderRoom` fetches folio details for room report expansion
- Associated orders and room balance logic significantly expanded

**Gap Classification:** Recent room-module change  
**Security Impact:** LOW (no additional security risk, but documentation gap exists)  
**Recommended Update:** Update module decisions to reflect current room module architecture including the report view and new endpoints  
**Priority:** Medium

---

## GAP-006: Credentials in Documentation (Security Hygiene)

**Gap ID:** GAP-006  
**Related Module:** All (documentation practices)  
**Baseline Doc Reference:** N/A (not a code-vs-doc gap per se)  
**Handover Doc Reference:**
- `/app/memory/handover/REPORTS_QA_HANDOVER_2026-05-01.md` (lines 14-16)
- `/app/memory/handover/REPORTS_FIELD_MAPPING_IMPLEMENTATION_HANDOVER.md` (line 25)
- `/app/memory/handover/REPORTS_BACKEND_NOTE_2026-05-01.md` (line 182)
- `/app/memory/change_requests/qa_handover/QA_HANDOVER_INDEX.md` (lines 59-60)
- Multiple `archived/` files

**What Should Exist:** Documentation should reference credentials via a secrets manager reference or placeholder, never plaintext.

**What Actually Exists:** Real preprod credentials in plaintext across 15+ files:
```
owner@welcomeresort.com / Qplazm@10
owner@18march.com / Qplazm@10
owner@mantri.com / Qplazm#10
```

**Gap Classification:** Security-relevant gap  
**Security Impact:** CRITICAL — active credential exposure in repository (SEC-001)  
**Recommended Update:**
1. IMMEDIATELY remove all credentials from all documentation files
2. Replace with: "See secrets vault / `test_credentials.md` (gitignored)"
3. Ensure `memory/test_credentials.md` remains in `.gitignore`
4. Add documentation guidelines that credentials must NEVER appear in committed files
**Priority:** Critical

---

## Summary for Documentation Update Agent

**Action Required:**
1. **GAP-001, GAP-002, GAP-006:** Security-critical gaps — coordinate with Security team before updating (credentials must be rotated FIRST)
2. **GAP-003, GAP-004:** Architecture documentation gaps — can be updated once backend confirms trust model
3. **GAP-005:** Functional documentation gap — can be updated independently

**Do NOT update baseline docs yourself for:**
- Credential removal (Security team owns this)
- Architecture changes that haven't been implemented yet (SEC-002, SEC-003 fixes)

**CAN update baseline docs for:**
- GAP-005 (room module changes are already in code)
- GAP-004 (report module changes are already in code) — functional parts only
- Adding security considerations sections once fixes are confirmed

---

## No Additional Gaps Found

All identified gaps are documented above. No further discrepancies between baseline, handover, and current code were found that carry security implications beyond what is listed.
