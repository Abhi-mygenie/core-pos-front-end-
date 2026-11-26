# Session Handover — 2026-11-16 — CR-528 Contract Cleanup + Batch 2 IA Prep

**For:** Next PLANNING agent (Impact Analysis for BUG-678, BUG-677, CR-545)
**From:** Planning agent (2026-11-16 session)
**Repo:** `https://github.com/Abhi-mygenie/core-pos-front-end-.git` · branch `main` · commit `954c4770`
**App:** `/app/frontend` (React 19 + CRACO + Tailwind + Radix/shadcn) · backend at `preprod.mygenie.online` (Laravel)

---

## 1. Session Summary

1. Deployed app from GitHub repo — `yarn install`, `.env` created, webpack compiles successfully, login page renders.
2. Validated backend reply for CR-528 (`order-logs-report` endpoint) — 6/6 items PASS but targets wrong endpoint. The Audit page uses `insights-dashboard`, not `order-logs-report`. Created validation doc.
3. CR-528 contract cleanup — v1 marked SUPERSEDED, v2 contract created (HTML+MD) targeting correct `insights-dashboard` endpoint, tracker HTML split ASK 2 into 2a (DONE) / 2b (NOT SENT). All public dashboard files updated.
4. Validated Batch 1 code — all 5 items (CR-521, CR-493 B5, BUG-639, CR-526 Part 1+2, BUG-647) confirmed in codebase with correct markers. Production build passes (`yarn build` clean).
5. Batch 2 owner decisions locked for BUG-678, BUG-677, CR-545. All questions answered.
6. All changes pushed to `main`.

---

## 2. IMMEDIATE NEXT TASK — Write Impact Analysis (Gate 2) for 3 items

**Role:** PLANNING (Gate 2 — Impact Analysis only)
**Decisions doc:** `change_requests/BATCH_2_OWNER_DECISIONS_2026_11_16.md`
**Execution order:** BUG-678 → BUG-677 → CR-545

### Item 1: BUG-678 — Service Charge in Payload Despite UI Toggle OFF

**Priority:** P0 | **Risk:** CRITICAL (money)
**Intake:** `change_requests/BUG-678_SC_PREPAID_PAYLOAD_INTAKE.md`
**Investigation:** `investigations/INV-SC-PREPAID-2026-11-16.md`
**No open questions.** Fix is clear.

**Root cause:** BUG-662 regression. `OrderEntry.jsx` L1708-1709 and L2492-2493:
```javascript
const scApplicable = (orderType === 'dineIn' || ...)
  && (!!restaurant?.autoServiceCharge || paymentData?.serviceCharge > 0);
```
When `autoServiceCharge=true`, the `||` short-circuits — cashier's toggle-OFF is ignored. Backend records ₹275, cash collected = ₹250.

**Fix:** Remove `!!restaurant?.autoServiceCharge ||` from both locations. 2 lines, 1 file.
**CRITICAL:** Verify line numbers at HEAD — Batch 1 BUG-647 also modified OrderEntry.jsx, lines may have shifted.

**IA scope:** Trace the 2 affected paths (QSR prepaid L1708, Scenario 2 prepaid L2492), confirm `collectBillExisting` and `placeOrder`/`updateOrder` are NOT affected, document downstream consumers.

---

### Item 2: BUG-677 — Socket Disconnection in PWA

**Priority:** P0 | **Risk:** HIGH
**Intake:** `change_requests/BUG-677_SOCKET_PWA_DISCONNECT_INTAKE.md`
**Investigation:** `investigations/INV-SOCKET-PWA-2026-11-16.md` (has full architecture map, 5 socket layers, all line numbers)
**Owner decision OD-677-01:** F1 through F6 included. F7 deferred (P2).

**Why PWA only:** Phone OS suspends background apps → JavaScript stops → socket goes silent → server drops connection after 85s → reconnection attempts fail during suspension → permanent disconnect.

**6 fixes to plan:**

| # | Fix | Files | Lines |
|---|-----|-------|-------|
| F1 | `RECONNECTION_ATTEMPTS: Infinity` | `socketEvents.js` L14 | ~1 |
| F2 | Periodic heartbeat health check (30s when visible) | `SocketContext.jsx` | ~15 |
| F3 | Explicit `disconnect()` before new `connect()` | `socketService.js` | ~5 |
| F4 | Aggregator order polling reconciliation (safety net) | New hook or extend `useOrderPollingReconciliation.js` | ~40 |
| F5 | Auto-retry on `reconnect_failed` with backoff | `socketService.js` | ~10 |
| F6 | Listen for `joined_restaurant` ACK, re-emit on timeout | `socketService.js` + `useSocketEvents.js` | ~20 |

**IA scope:** Read the full investigation (has the architecture map). Verify line numbers at HEAD. Trace each fix's impact on socket lifecycle. Document file conflicts (SocketContext is not R5 but is shared). F4 is the largest — trace existing `useOrderPollingReconciliation` and plan the extension.

---

### Item 3: CR-545 — APS (₹1) Web Order: Tag + Cancel + Price Edit

**Priority:** P1 | **Risk:** HIGH
**Intake:** `change_requests/CR-545_APS_WEB_ORDER_PRICE_ENTRY_INTAKE.md`
**Investigation:** `investigations/INV-APS-PHASE1-PHASE2-2026-11-16.md`
**Owner decisions (OD-545-01 through OD-545-04):** See `change_requests/BATCH_2_OWNER_DECISIONS_2026_11_16.md`

**IMPORTANT CORRECTION:** This is for QR code / scanner web orders, NOT Swiggy/Zomato aggregator orders. The popup is ScanOrderPopOut which handles scanner orders.

**Phase 1 (FE-only, ~40 lines) — full IA:**

| Feature | File | Approach |
|---------|------|----------|
| APS "₹1" tag | `ScanOrderPopOut.jsx` | Badge next to price when `price === 1` |
| Item-level cancel | `ScanOrderPopOut.jsx` + `DashboardPage.jsx` | `onCancelItem` prop → parent opens CancelFoodModal |

- Cancel via props approved (OD-545-02)
- Assume `cancel-food-item` API works on scanner orders (OD-545-03) — probe before QA
- Accept button NOT gated (OD-545-04)
- ScanOrderPopOut has 5 anti-rules (L22-36) — cancel via props stays within spirit

**Phase 2 (backend-blocked, ~135 lines) — outline only:**

| Feature | Blocker |
|---------|---------|
| Price edit in CartPanel for placed ₹1 items | Backend B3/B4: `update-food-price` endpoint needed |
| Price edit in ScanOrderPopOut before accept | Same backend dependency |

**Backend brief:** `backend_briefs/BACKEND_BRIEF_APS_PRICE_EDIT_2026-11-16.md`

**IA scope:** Read the Phase 1+2 investigation. Verify ScanOrderPopOut anti-rules. Trace `onCancelItem` prop path through DashboardPage. Document Phase 2 outline for backend awareness.

---

## 3. CR-528 Contract Status (for reference — NOT an IA task)

| What | Status | File |
|------|--------|------|
| v1 contract (order-logs-report) | SUPERSEDED — backend delivered 6/6 | `contracts/BATCH-C_CR-528_API_CONTRACT_2026_11_15.md` |
| v2 contract (insights-dashboard) | READY TO SEND — not sent yet | `contracts/BATCH-C_CR-528_API_CONTRACT_2026_11_16_v2.md` |
| Backend reply validation | Complete | `backend_replies/CR-528_BACKEND_REPLY_VALIDATION_2026_11_16.md` |
| Tracker HTML (public) | Updated — ASK 2a DONE / 2b NOT SENT | `frontend/public/backend-tracker.html` |
| Tracker HTML (memory) | Updated | `backend_briefs/BACKEND_BRIEF_TRACKER.html` |
| v2 HTML (public) | Created | `frontend/public/briefs/BATCH-C_CR-528_API_CONTRACT_2026_11_16_v2.html` |

**Next for CR-528:** Owner sends v2 contract to Gyan. No agent action needed until backend replies.

---

## 4. Batch 1 Status (for reference — already coded)

All 5 items confirmed in codebase with markers. Production build clean.

| # | ID | Status | Verified |
|---|-----|--------|----------|
| 1 | CR-521 | CODED | `colors.js` L18: `billPrintedBg: "#FFEDD5"` |
| 2 | CR-493 B5 | CODED | 6 files, all `cancelNoteMandatory` markers present |
| 3 | BUG-639 | CODED | `expandCompItems` at L1323 in updateOrder |
| 4a | CR-526 Part 1 | CODED | `OrderReportBetaPage.jsx` L909-915 fixed |
| 4b | CR-526 Part 2 | CODED | `CreditCustomerDetailSheet.jsx` Remove button + permission |
| 5 | BUG-647 | CODED | `applyTaxFlags` + `taxFlags` threaded through 6 call sites |

**Batch 2 items (BUG-678, BUG-677, CR-545) are NOT coded yet.** They need IA → Gate 3 Plan → Gate 4 GO → Implementation.

---

## 5. Items Waiting on Backend (DO NOT attempt)

| ID | Waiting on | Tracker |
|----|-----------|---------|
| CR-528 (audit page) | v2 contract NOT SENT — `insights-dashboard` audit events | Batch C ASK 2b |
| CR-493 B6 (BA-23) | `cancel_source` + comma reasons + backfill | Batch A/C ASK 5 |
| CR-543 | Threshold setting + `late_cancel` events | Batch C ASK 3 |
| CR-544 | `cancel_after_unpaid` events | Batch C ASK 4 |
| CR-525 | BD-01 (reset bill_print on edit) — RELEASE BLOCKER | Batch D |
| CR-545 Phase 2 | `update-food-price` endpoint | Backend brief filed |
| CR-526 Part 3 | BB-02/03 (settlement lock) | Batch B |
| CR-527 | BB-09 (`diner_name`) | Batch B |
| CR-536 | BB-10 (`custGSTAddress`) | Batch B |
| CR-514 | BB-06/07 (payment ref fields) | Batch B |
| CR-522 | BB-08 (`reconcile_tolerance_pct`) | Batch B |
| BUG-607 | BB-11/12 (item-level GST) | Batch B |

---

## 6. Credentials

| Account | RID | Use |
|---------|-----|-----|
| `owner@cafe103.com` / `Qplazm@10` | 644 | General testing |
| `owner@ruby.com` / `Qplazm@10` | 672 | Socket probes, APS testing |
| Login endpoint | — | `POST /api/v1/auth/vendoremployee/login` |

---

## 7. Files to Read (boot sequence for next agent)

| Priority | File | Why |
|----------|------|-----|
| 1 | `control/AGENT_PROMPT_ALPHA.md` | Role system, gate flow |
| 2 | This handover | Current state + what to do |
| 3 | `change_requests/BATCH_2_OWNER_DECISIONS_2026_11_16.md` | All owner decisions for the 3 items |
| 4 | `change_requests/BUG-678_SC_PREPAID_PAYLOAD_INTAKE.md` | BUG-678 intake |
| 5 | `investigations/INV-SC-PREPAID-2026-11-16.md` | BUG-678 full trace |
| 6 | `investigations/INV-SOCKET-PWA-2026-11-16.md` | BUG-677 architecture + all fixes |
| 7 | `investigations/INV-APS-PHASE1-PHASE2-2026-11-16.md` | CR-545 phase plan |
| 8 | `control/FILE_OWNERSHIP.md` | Conflict check before coding |
| 9 | `handover/SESSION_HANDOVER_2026_11_16_BATCH2_BUG677_BUG678_CR545.md` | Original Batch 2 handover with exact edits |

---

## 8. What NOT to do

- **Do not code anything** — this session is IA (Gate 2) only, no implementation
- **Do not send v2 contract to Gyan** — owner will decide when/how to send
- **Do not modify Batch 1 code** — already coded, verified, pushed
- **Do not plan CR-528 Audit page** — blocked on v2 backend reply
- **Do not assume ScanOrderPopOut is for aggregator orders** — it's for QR/scanner web orders
- **Do not start BUG-677 fixes without reading the full investigation** — it has the architecture map of all 5 socket layers

---

## 9. Environment

- Frontend: port 3000, supervisor-managed, hot reload, webpack compiled successfully
- Backend: port 8001, FastAPI stub (not the real Laravel backend)
- Real backend: `preprod.mygenie.online`
- Git remote: `https://github.com/Abhi-mygenie/core-pos-front-end-.git` (branch `main`)
- Firebase keys: placeholder values in preview (real keys set in live slots)
- Production build: `yarn build` passes clean (1.35 MB main bundle)

---

*End of handover. Ref: Emergent session 2026-11-16.*
