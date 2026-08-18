# POS 4.0 — Sprint-End Baseline Consolidation Report
## Document ⇄ Code Reconciliation + Open Gaps Register (Pre-Freeze)

**Date:** 2026-06-11
**Prepared per:** Control Layer rules (`CONTROL_DASHBOARD.md`, `INTAKE_WORKFLOW.md`, 6-Artifact Closure Rule, `CODE_GATE_POLICY.md`)
**Method:** Every CR/BUG opened or touched in POS 4.0 since the 2026-05-31 baseline was cross-checked against the **code on disk (branch `main`, commit `1f05d05`) — code is the source of truth**. Doc claims that contradict code are flagged as drift; doc claims confirmed by code are marked VERIFIED.
**Compile state at audit time:** webpack **compiled clean** (1 pre-existing ESLint warning in `SettlementReportMockup.jsx:138`). App renders (login page verified via screenshot).

---

## 1. Executive Summary

| Metric | Count |
|---|---|
| Items code-validated this audit | 23 (CR-014…CR-025 family + BUG-112…BUG-122 + Session-3 fixes) |
| Code matches docs (VERIFIED) | 21 |
| Code contradicts docs (DRIFT — doc must be corrected) | 6 doc-level drifts (no code defects found from drift) |
| **Gate-6 items (owner smoke PENDING) — FREEZE BLOCKERS** | **8** |
| Registry sync gaps (control-layer hygiene) | 7 |
| ID collisions in tracker | 3 (CR-025 ×2, BUG-120 ×2, BUG-121 ×2) |
| Code hygiene items before freeze | 2 (DEBUG-B11 logs ×2 files, ESLint warning) |
| Backend-blocked carry-forwards (record, not blockers) | 14 |
| Open intake / not-started (carry into next sprint) | 7 |

**Verdict: The baseline CANNOT be frozen yet.** Code quality is good (all implemented claims verified against source), but 8 items sit at Gate 6 (Owner Smoke) which the 6-Artifact Rule requires before closure, the CR Registry is 6 CRs behind the change_requests folder, and 3 ID collisions will corrupt traceability if frozen as-is.

---

## 2. Code-Validation Matrix (Doc claim vs Code on disk)

Legend: ✅ VERIFIED = code matches the doc claim · ⚠ = verified with a finding · Gate = current position in the 6-Artifact pipeline.

### 2.1 CRs

| ID | Title | Doc status | Code verdict | Evidence (file:line) | Gate position |
|---|---|---|---|---|---|
| CR-014 (+P2) | Menu Mgmt API migration + Bulk Editor | CLOSED — OWNER VERIFIED (06-09) | Closed pre-audit; Phase 2B (Excel import/export) DEFERRED | `BulkEditor.jsx` present | CLOSED · 2B carried |
| CR-015 | Settlement Module | CLOSED — OWNER VERIFIED (06-09) | Closed; **backend `POST /waiter/cash-transfer` still 404** | `SettlementPanel.jsx` present | CLOSED · BE ask open |
| CR-016 | Settlement History (Insights) | CLOSED — OWNER VERIFIED (06-09) | Closed | `SettlementReportMockup.jsx` present | CLOSED |
| CR-017 | WhatsApp Payment Link | IMPLEMENTED, Gates 0–5 done | ✅ VERIFIED — both new files exist, OrderCard wired | `components/cards/WhatsAppPaymentModal.jsx`, `api/services/paymentLinkService.js` | **Gate 6 PENDING** |
| CR-018 | Schedule Order (G1–G10 + schedule_at fix) | DONE per CR doc; QA "needs live creds" | ✅ VERIFIED — visibility `orderType !== 'dineIn'` (CartPanel:1215), `schedule_at: scheduleAt \|\| null` no trailing space (orderTransform:909/1167), Place-Order + Collect-Bill guards require time `includes(':')` (CartPanel:1443/1469) | — | **Gate 6 PENDING** (live QA never run) |
| CR-019 | Restaurant Settings Wizard | Gate 5 complete, QA 18/18 | ✅ VERIFIED — page + service + transform + route `/restaurant-settings` (App.js:92) | `RestaurantSettingsPage.jsx` et al. | **Gate 6 PENDING** · BQ-019-1 (first_login) deferred to backend |
| CR-020 P1–P3 | Settings bug sweep B1,B9,B10 / B3,B5,B6 / B7,B8,B4 | SIGNED OFF (iterations 2–4, 100%) | ✅ VERIFIED — e.g. `online_payment: toYesNo(...)` (restaurantSettingsTransform:167) | — | CLOSED |
| CR-020 P4 + B12–B15 | B11 dropdown filter; GST field hidden; labels; Short Code toggle | Code done; B11 PARKED; B12–15 awaiting smoke | ✅ VERIFIED — B11 filter live (OrderEntry:2125-2127), B12 "Default GST %" removed, B13/B14 dynamic hint + "Item Level / Restaurant Level" (RestaurantSettingsPage:435), B15 `toBool`/`toYesNo` short_code (transform:44/153). ⚠ **DEBUG-B11 console.logs left in OrderEntry:2124 + profileTransform:119-127** | — | **Gate 6 PENDING (B12–B15)** · B11 PARKED (needs live profile API) |
| CR-021 | Collect Bill split/partial payment B1–B4 + prepaid parity | IMPLEMENTED; tracker says smoke DONE 06-11, but `HANDOVER.md` says smoke pending | ✅ VERIFIED — B1: `payment_mode: splitPayments?.length ? 'partial' : method` (orderTransform:1364) + conditional `partial_payments` (1440); prepaid parity `payment_method` (1155) + conditional array (1222-1223); B2 clear-on-total-change effect (CollectPaymentPanel:668); B3 amount-gated TxnID (3082, 2714); B4 sum≥total rule (3083) | — | ⚠ **CONFLICT: smoke status disputed** — owner must confirm (prepaid split portion was added 06-11 AFTER the postpaid smoke) |
| CR-022 | Menu food type filters | CLOSED — owner QA passed 06-10 | ✅ VERIFIED — enum filter `p.itemType === 0/1/2/3` (ProductList:58-61) | — | CLOSED |
| CR-023 | Bulk Editor typing lag | Header says "GATE 3 awaiting go-ahead"; tracker says signoff DONE 06-11 | ✅ VERIFIED — `LocalTextInput` (BulkEditor:676), `React.memo(CellRenderer)` (688), save auto-blur (337) | — | ⚠ Doc self-contradiction; code complete. Owner to confirm smoke, then fix header status |
| CR-024 | Channel visibility override | CLOSED — owner QA 06-11 | ✅ VERIFIED — `useRestaurant` + `availableChannels` filter (StatusConfigPage:7/146/149) used in all 3 renders (1197/1500/1554), stale-channel clean (497), default `enabled:false` (StatusConfigPage:102, DashboardPage:257). **Bug A final ruling honoured: `take_away`/`delivery` stay RAW BOOLEAN (transform:159-160) — backend int columns** | — | CLOSED ⚠ tracker rows 5–6 still read "PENDING" (drift) |
| CR-025 (a) | Discount payload fix | IMPLEMENTED — awaiting smoke | ✅ VERIFIED — all `self_discount: 0`, `order_discount: discounts.manual` ×3 paths (orderTransform:1177/1194, 1403/1411, 1474-1475), prepaid `comm_discount`/`discount_value`/`discount_type` added | — | **Gate 6 PENDING (P0 — money-impacting)** |
| CR-025 (b) | Unified Toast error surfacing | READY FOR GATE 6 (Code) — phased plan locked, **not started** | ✅ Confirmed not started (interceptor still 4-branch chain) | `api/axios.js` | NOT STARTED — carry to next sprint |

### 2.2 Bugs

| ID | Title | Doc status | Code verdict | Gate position |
|---|---|---|---|---|
| BUG-112 | Auto-print parallel (waitForOrderReady 500ms + early HTTP check) | IMPLEMENTED Phase 1 | ✅ VERIFIED (OrderEntry:1278-1283) | Phase 2 (socket-first table-matching) deferred. **No owner smoke recorded** |
| BUG-113 | Partial payment field lock → onBlur clamp | IMPLEMENTED | ✅ VERIFIED (CollectPaymentPanel:2655 contract comment; CR-021 B2 respects it) | **No owner smoke recorded** |
| BUG-114 | discount_type / member_category empty in payload | IMPLEMENTED | ✅ VERIFIED — threaded in both payment paths (orderTransform:1193/1218-1219, 1409/1414-1415) | **No owner smoke recorded** |
| BUG-115 | Audit Report cancelled filter | CLOSED — OWNER VERIFIED | Closed | CLOSED |
| BUG-116 | `food_update_${rid}` realtime menu refresh | IMPLEMENTED — AWAITING OWNER SMOKE | ✅ VERIFIED — `getFoodUpdateChannel` (socketEvents:59), `handleFoodUpdate` (socketHandlers:878), `addOrUpdateProduct` (MenuContext:25) | **Gate 6 PENDING** |
| BUG-117 | Negative GST on VAT orders | CLOSED — OWNER VERIFIED | Closed | CLOSED |
| BUG-118 | Nth-item / BOGO coupon defects | **INTAKE** | No code change (correct) | OPEN INTAKE — investigation not started |
| BUG-119 | Negative round_up | CLOSED — backend fixed | Closed, no FE change | CLOSED |
| BUG-120 (tracker) | Place Order 401 silent redirect | **INTAKE** | No code change (correct) — fire-and-forget + `window.location.href` pattern still present | OPEN INTAKE (P1) |
| BUG-120 (registry) | CR-014 post-delivery 5 sub-bugs | ALL CLOSED 06-09 | Closed | CLOSED — **ID COLLISION with above** |
| BUG-121 (tracker) | Backend socket payload incomplete | INTAKE — FE DEFENDED (`SOCKET_FOOD_DEFAULTS`) | ✅ FE defence in code | Backend ask open — **ID COLLISION with below** |
| BUG-121 (registry) | Category count + post-save refresh | CLOSED — OWNER VERIFIED | Closed | CLOSED |
| BUG-122 | POS fOrderStatus=7 popup | CLOSED — OWNER VERIFIED 06-10 | ✅ VERIFIED — predicate `&& order.isWebOrder` (ScanOrderPopOut:56) | CLOSED |
| BUG-122 post-delivery | 3 FE fixes (POS YTC ✗+✓, snooze web-only, schedule_at) | IMPLEMENTED — awaiting owner smoke | ✅ VERIFIED — POS YTC Cancel+Confirm buttons (OrderCard:871-893), snooze gated `table.isWebOrder === true` (TableCard:326), schedule_at fix (see CR-018) | **Gate 6 PENDING** |

### 2.3 Session-3 (2026-06-11) unregistered fixes — all code-verified

| Fix | Code verdict | CR registration status |
|---|---|---|
| Display rounding (12 report files, `hasDecimals` pattern) | ✅ VERIFIED (OrderDetailSheet:18-19, OrderLedgerMockup:191, …) | **NOT REGISTERED as CR** — gap |
| orderLogsReportRow gaps 1/2/3/5 (customerPhone, transactionRef, deliveryAddress, room*) | ✅ VERIFIED (reportTransform:190/312/323/359/1012; wired in orderLedgerService:92/101) | **NOT REGISTERED** — gap |
| singleOrderNew 12 financial fields (Fix A) | ✅ VERIFIED | **NOT REGISTERED** — gap |
| Credit service totals from API (Fix B) | ✅ VERIFIED (creditService:40-42) | **NOT REGISTERED** — gap |
| `customerDetails` crash fix | ✅ VERIFIED (reportTransform:323) | **NOT REGISTERED** — gap |
| OrderDetailSheet bill-summary sequence fix | Claimed in `REPORT_ROUNDING_HANDOVER.md`; code present | **NOT REGISTERED, no owner smoke** — gap |

---

## 3. OPEN GAPS REGISTER — pre-freeze (the actionable list)

### CATEGORY A — Gate-6 / Owner-Smoke pending (FREEZE BLOCKERS per 6-Artifact Rule)

| # | Item | Priority | What the owner must smoke |
|---|---|---|---|
| A1 | **CR-025 Discount payload** | **P0 (money)** | 20% on ₹1000 → payload `order_discount: 200`, `self_discount: 0` (all 3 paths) |
| A2 | **CR-021 prepaid split parity** | **P0 (money)** | Place+Pay split Cash ₹50 + UPI ₹100 → `payment_method: "partial"` + `partial_payments[]`. (Postpaid portion may already be signed — owner to confirm the disputed 06-11 sign-off and whether it covered the prepaid fix added the same day) |
| A3 | CR-018 Schedule Order | P1 | Live QA of G1–G10 + schedule_at on preprod (creds available) |
| A4 | CR-019 Settings Wizard | P1 | Full 6-step wizard walkthrough → Save & Launch |
| A5 | CR-020 Phase 4 (B11) + B12–B15 | P1 | Disabled channels hidden in order-type dropdown (B11, then remove debug logs); GST mode labels/hint; Short Code toggle |
| A6 | CR-017 WhatsApp Payment Link | P1 | Send payment link on unpaid order → WhatsApp received |
| A7 | BUG-116 realtime menu socket | P1 | Out-of-kitchen item add → menu refreshes without reload |
| A8 | BUG-122 post-delivery 3 FE fixes | P1 | POS YTC card shows ✗+✓; snooze only on web orders |
| A9 | BUG-112 / BUG-113 / BUG-114 | P1 | No owner-smoke artifact exists for any of the three (implemented 06-07/08). Batch-smoke or owner-attest |
| A10 | Report fixes batch (Session 3: rounding, ledger fields, credit totals, bill-summary sequence) | P1 | One pass over Audit Report + Order Ledger + Credit Panel drill-down |

### CATEGORY B — Registry / control-layer sync gaps (must fix before freeze snapshot)

| # | Gap | Fix |
|---|---|---|
| B1 | **CR-020…CR-025 absent from `CR_REGISTRY.md`** (registry stops at CR-019/BUG-122) | Append 6 rows + statuses |
| B2 | **`BUG_TRACKER.md` last updated 06-08** — missing BUG-122 (+post-delivery), missing CR-02x bug-sweep linkage | Append rows |
| B3 | **`CONTROL_DASHBOARD.md` last updated 06-10** — unaware of CR-020…025 and the entire 06-11 session; "Current Deployment" still points at branch `8-june` / old pod | Refresh deployment block + Active-CR table |
| B4 | **`OWNER_DECISION_QUEUE.md` Category G says "42 REVIEW pending"** but code `auditManifest.js` has **68 approved / 2 rejected** (the 06-05 batch-approval was never synced) | Update G-counters to match manifest (code is truth) |
| B5 | **`ENV_REGISTRY.md` last updated 06-02** — stale pod URL, stale CRM URL history end-state | Refresh to current pod (see §5) |
| B6 | `SPRINT_STATUS.md` POS 4.0 block still shows S5 "Gate ⑤ in-flight" top-blocker text from 06-04; S5 was FROZEN 06-05 | Refresh sprint block |
| B7 | Session-3 fixes (6 items, §2.3) have **no CR/bug registration** — violates Registration Gate | Register retro CR (suggest CR-026 "Report Data & Rounding Sweep") |

### CATEGORY C — ID collisions (traceability corruption — resolve before freeze)

| # | Collision | Recommendation |
|---|---|---|
| C1 | **CR-025 ×2**: "Discount Payload Fix" AND "Unified Toast Error Surfacing" | Renumber Toast CR → **CR-027** (026 reserved for B7 retro-registration); update doc filename + cross-refs |
| C2 | **BUG-120 ×2**: "Place Order 401 silent redirect" (INTAKE) vs "CR-014 post-delivery 5 sub-bugs" (CLOSED) | Renumber the open 401 bug → **BUG-123** |
| C3 | **BUG-121 ×2**: "socket payload incomplete" (INTAKE/BE) vs "category count refresh" (CLOSED) | Renumber the open socket bug → **BUG-124** |

### CATEGORY D — Code hygiene before freeze

| # | Item | Location |
|---|---|---|
| D1 | **DEBUG-B11 console.log statements** shipped in production code | `OrderEntry.jsx:2124` (IIFE inside render), `profileTransform.js:119-127`. Remove after B11 live validation (PRD P3 #9 already tracks this) |
| D2 | ESLint warning (pre-existing) | `SettlementReportMockup.jsx:138` (`allDays` useMemo dep) |

### CATEGORY E — Doc self-contradictions to correct (no code impact)

| # | Doc | Contradiction |
|---|---|---|
| E1 | `CR_023_BULK_EDITOR_TYPING_LAG.md` | Header `Status: GATE 3 — awaiting owner go-ahead` vs Artifact Tracker `Owner Smoke DONE 2026-06-11`. Code is fully implemented. Pick one truth (owner confirm) |
| E2 | `CR_024_CHANNEL_VISIBILITY_OVERRIDE.md` | Header CLOSED 06-11 vs tracker rows "Owner Decision PENDING / Code PENDING" |
| E3 | `QA_HANDOVER_CR023_024_025.md` | Instructs verifying `take_away/delivery` use `toYesNo()` — **OBSOLETE**: final ruling (CR-024 §2.1, live API test) is raw booleans are correct (backend int columns). Code correctly keeps booleans. Add superseded banner |
| E4 | `HANDOVER.md` vs CR-021/CR-023 trackers | Smoke "pending" vs "DONE 06-11" (see A2/E1) |
| E5 | `OG-DOC-01/02` (already open) | Stale branch references in older handovers — still open, P3 |
| E6 | `CONTROL_DASHBOARD.md` says `REACT_APP_SHOW_AUDIT_TAB=true` was set — was missing from this pod's `.env` until restored this audit (see §5) |

### CATEGORY F — Backend-blocked carry-forwards (record in freeze, not FE-blockable)

| # | Item | Source | Priority |
|---|---|---|---|
| F1 | Cancelled order financials not reverted (tax/discount/SC/delivery) | OWNER_DECISION_QUEUE D#0 / `CR_011_BACKEND_ESCALATION_CANCELLED_FINANCIALS` | **P0** |
| F2 | `POST /waiter/cash-transfer` 404 | CR-015 | P1 |
| F3 | Scheduled orders missing from running-orders API | CR-018 escalation | P1 |
| F4 | `order-logs-report` no cash/card/upi breakup for partial orders (Gap 4) | Session 3 | P1 |
| F5 | `tap-waiter-list` missing top-level credit/paid totals | Session 3 | P1 |
| F6 | split_order stale financial headers (OG-BE-01) | S6 RCA | P0 (backend) |
| F7 | order_edit catalog-rate recompute (OG-BE-02) | S6 RCA | P1 |
| F8 | transfer GST double-count (OG-BE-03) | S6 RCA | P2 |
| F9 | Add-on pricing inconsistency (BE-ADDON-001) | CR-013 audit | P1 |
| F10 | Cancelled item tax in order_details_table (BE-CANCELLED-TAX-001 — FE workaround live) | CR-013 audit | P1 |
| F11 | `food_update_${rid}` payload incomplete (FE defended via SOCKET_FOOD_DEFAULTS) | BUG-121(tracker)→BUG-124 | P2 |
| F12 | Room order line-level GST not distributed (D#15) · price field inconsistency (D#16) | CR-011 audit | P1/P2 |
| F13 | POS 3.0 legacy backend-blocked set: BUG-090/091/092/093/094/101, loyalty_idempotency_key, PayLater socket channel, rider socket events (BQ-097), menu socket names (BQ-CR-01/02/03), BE-1 P1-P6, BE-2 | OPEN_GAPS_REGISTER | P2-P3 |
| F14 | `first_login` reliable signal for wizard auto-redirect (BQ-019-1) | CR-019 | P2 |

### CATEGORY G — Open intake / not started (carry into next sprint backlog)

| # | Item | Status |
|---|---|---|
| G1 | BUG-118 Nth-item / BOGO coupon | INTAKE — investigation not started |
| G2 | BUG-120(tracker)→BUG-123 Place Order 401 silent redirect | INTAKE (P1 — affects Place/Collect/Transfer/Update) |
| G3 | CR-025(b)→CR-027 Unified Toast surfacing | Plan locked, Phase 1 (interceptor) not started |
| G4 | CR-014 Phase 2B Excel import/export | DEFERRED |
| G5 | Menu Management FE gaps triage — 10 flags, 7 testable, 4 high-value (#1 QuickEdit data-loss, #6 DnD reorder, #8 discount-clear, #9 tax None) | Pending preprod validation, none registered |
| G6 | CR-011 track: S5 PARKED (backend GST drift), S6 Gate ⑤ in-flight (FE-86 investigation, tab renames, Aggregator predicate, Block B/C), S8 Payments next, 28 Phase-3 screens unfrozen | Parked per owner directive 06-03/06-05 |
| G7 | POS 4.0 Bucket B/C/D legacy backlog (POS2-001, POS2-006, BUG-095/096/104/105 scope sessions, CRM CR-003/005/008, BUG-040/041, UX-LOADING-02) + 7 unfrozen business rules (TAX-007, SCAN-003, PAY-009, POLL-003, ROOM-002, SC-004/PAY-005, PAY-007) | Unchanged from 05-31 baseline |

---

## 4. Owner rulings — RESOLVED 2026-06-11

| # | Question | **Owner ruling (2026-06-11)** | Action taken |
|---|---|---|---|
| R1 | CR-021 smoke scope (prepaid included?) | **(a) Covered both** | CR-021 marked CLOSED — OWNER VERIFIED; removed from smoke batch |
| R2 | CR-023 smoke done or pending? | **(a) Smoke done** | CR-023 marked CLOSED; doc header fixed |
| R3 | Renumbering plan | **Approved: CR-027 / BUG-123 / BUG-124** | Files renamed, IDs rewritten in docs + registry.json + code comment (socketHandlers.js:847); registers updated |
| R4 | Retro-register Session-3 fixes? | **(a) Yes — CR-026** | `CR_026_REPORT_DATA_ROUNDING_SWEEP.md` created; in smoke batch S-9 |
| R5 | BUG-112/113/114 attestation vs smoke | **(b) Formal smoke batch** | Added as smoke batch S-8; BUG_TRACKER statuses updated |

**Smoke batch issued:** `control/POS4_0_OWNER_SMOKE_BATCH_2026_06_11.md` (S-1…S-9).

---

## 5. Environment reconciliation (this pod — done during audit)

| Item | State |
|---|---|
| Repo pulled | `main` @ `1f05d05` → `/app` (1,484 files) |
| `.env` | Was missing 13 runtime vars (gitignored). **Restored from `ENV_REGISTRY.md`**: API/Socket/Firebase(8)/`REACT_APP_SHOW_AUDIT_TAB=true`; CRM set to production-stable `https://crm.mygenie.online/api` per latest handover. `REACT_APP_BACKEND_URL=https://pos-front-pull.preview.emergentagent.com` (this pod) |
| `REACT_APP_GOOGLE_MAPS_KEY` | **STILL MISSING** (known gap — Owner Decision Queue E2) |
| node_modules | Repo-committed copy was incomplete (firebase submodules missing → 9 webpack errors). `yarn install` run; **compiles clean** (1 pre-existing warning) |
| Services | frontend RUNNING (3000), backend placeholder RUNNING (8001), app renders login |
| Test creds on file | cafe103 + kunafamahal (`Qplazm@10`) — `mantri.com` creds still missing (E3) |

---

## 6. Freeze checklist (recommended sequence)

1. **Owner rulings R1–R5** (5 chat answers).
2. **Owner smoke batch** A1–A10 (creds available; A1/A2 first — money-impacting P0s).
3. Renumber collisions (C1–C3) + retro-register Session-3 work (B7/R4).
4. Sync registers: CR_REGISTRY, BUG_TRACKER, CONTROL_DASHBOARD, SPRINT_STATUS, OWNER_DECISION_QUEUE Category G, ENV_REGISTRY (B1–B6).
5. Remove DEBUG-B11 logs after B11 live validation (D1).
6. Re-run compile + lint; capture closing screenshots.
7. Cut `BASELINE_INDEX.md` entry: **POS 4.0 BASELINE — FROZEN <date>**, carrying Categories F + G as the opening backlog of the next sprint.

---

*Prepared by: consolidation agent, 2026-06-11. All code citations refer to `/app/frontend/src` at commit `1f05d05`.*
