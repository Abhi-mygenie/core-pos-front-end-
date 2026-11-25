# SESSION HANDOVER — 2026-09-06 — PMS TRACK (CR-358 P1–P5, CR-361…CR-367)

**Track:** PMS delivery (sprint `pos_pms_1`). Separate from the AUDIT track — see `SESSION_HANDOVER_2026_09_06_AUDIT_BASELINE_PROMPT_V08.md`.
**Role(s) since last PMS handover (2026-09-04 INTAKE):** INVESTIGATION (CR-363/364/366 API impact) + documentation (PDF reference, registry updates). **No `frontend/src` code changed.**
**Branch / code:** `PMS1` is the latest branch with full history; pod is a working copy (sync via Save to GitHub). Last code change on the PMS track = 2026-09-04 CR-358-P4 impl + regression fix.
**Environment:** preprod.mygenie.online · restaurant 69 (sandbox-pms) · owner account (alias only; values not written here) · all order-family endpoints on `/api/v2/`.

---

## 1. Where PMS stands

| Item | Status | Gate | Note |
|---|---|---|---|
| CR-358 P1 Channel Manager (OTA/Sync, Setup, Room Mapping) | QA PASS | 5b → **6 pending** | Owner smoke not done |
| CR-358 P2 Front Desk, New Booking, Check-In | QA PASS | 5b → **6 pending** | Owner smoke not done |
| CR-358 P3 Arrivals, In-House, Departures (+ checkout drawer) | QA PASS 30/31 | 5b → **6 pending** | Owner smoke not done |
| CR-358 P4 Tape Chart (`/pms/reservations`), Room Status Board (`/pms/room-status`) | QA PASS 34/34 + full regression | 5b → **6 pending** | ⚠ 2 of its 11 unit "tests" are node scripts, not Jest (audit F-QA-01) — re-verify before Gate 6 sign-off |
| CR-358-P5 Rates & Restrictions tab + Mark No-Show | INTAKE | 1 | Unblocked; `fetch-rates` live |
| CR-360 In-House KPI / View Bill | QA PASS | 5b → 6 pending | Plan deviation documented (bookingCheckin for avgNights) |
| CR-363 Night Audit Report | INTAKE · 🟡 PARTIAL | 1 | No no-show field (OG-PMS-015); balance = client-side join |
| CR-364 Guest Folio Detail | INTAKE · 🟡 PARTIAL | 1 | Read-only folio works; **Record Payment → `pos/room-payment` 403** (OG-PMS-014); F&B transfer list empty in sandbox |
| CR-366 Revenue Dashboard | INTAKE · 🟢 MOSTLY UNBLOCKED | 1 | `daily-sales-revenue-report` is single-day → N calls for N days; KPIs ≤31-day chunks |
| CR-361 Room Assignment / Tape Chart drag | INTAKE · BACKEND-BLOCKED | 1 | No assign endpoint; OG-PMS-013 soft-allocation contradiction |
| CR-362 Booking Modify / Cancel | INTAKE · BACKEND-BLOCKED · CRITICAL risk | 1 | No cancel/modify/extend endpoints |
| CR-365 Housekeeping Workflow | INTAKE · BACKEND-BLOCKED | 1 | No task/checklist model |
| CR-367 WhatsApp/SMS Notifications | INTAKE · BACKEND-BLOCKED | 1 | No messaging endpoint |
| BUG-381 Walk-in data missing | Fixed · **live preprod test deferred** | — | Owner to run |

## 2. Done on the PMS track since 2026-09-04
- **PDF design reference** `frontend/public/MyGenie_PMS_Screen_Reference.pdf` — 14 pp landscape, 13 PMS views with realistic dummy data injected via DOM (`/app/pms_dummy_data.py`, `/app/generate_pms_pdf_v2.py`), no AIOSELL/API wording. Owner-approved deliverable.
- **Investigation CR-363/364/366** → `memory/INV_CR363_CR364_CR366_API_IMPACT_ANALYSIS.md` + 5 probes in `evidence/INV-PMS-CRs-363-364-366/`. Status revisions applied to `CR_REGISTRY.md`, `registry.json` (fields `investigation_2026_09_06`, `investigation_report`), `CONTROL_DASHBOARD.md`, `OPEN_GAPS_REGISTER.md` (+OG-PMS-014 / 015 / 016), `PRD.md`.
- Plain-English descriptions of CR-361…367 + CR-358-P5 delivered to owner.

## 3. Corrections owed (found by the audit track, apply when PMS work resumes)
| What | Fix |
|---|---|
| INV report + OG-PMS-016 say "all v1 defunct → use v2 everywhere" | Reword: only `get-single-order-new`, `order-logs-report`, `pos/room-payment` moved to v2; 12/14 probed v1 routes still live. Keep "use v2 for order-family". |
| OG-PMS-014 (`room-payment` 403) | Audit shows 4 other v1/v2 routes also 403 for the owner account (`get-products-list`, `cancellation-reasons`, `employee-orders-list`, `assigned-restaurants`) → strengthens the "sandbox role permission gap" hypothesis. Add to backend brief. |
| CR-358-P4 test evidence | `pmsService.tapeChart.cr358p4.test.js`, `roomStatusTransform.cr358p4.test.js`, `bucketReservationOps.test.js` (P3) are node scripts testing inlined copies — convert to real Jest before Gate 6 sign-off is recorded. |
| `pages/pms/PmsPlaceholderPage.jsx` | Dead after P4 route swaps — delete at closure. |
| Forbidden colour `#3B82F6` | `Sidebar.jsx` L837 + `colors.js`, `statusHelpers.js`, 8 report pages (P2 closure item; PMS pages themselves are token-compliant). |

## 4. Open gaps affecting PMS (from `OPEN_GAPS_REGISTER.md`)
OG-PMS-010 (auto-HK not firing after checkout, likely backend) · OG-PMS-011 (comparison HTML skin drift, closure) · OG-PMS-013 (board soft-allocates unassigned bookings vs LR truth — blocks CR-361 contract) · OG-PMS-014 (room-payment 403) · OG-PMS-015 (no no-show field) · OG-PMS-016 (v1→v2 wording, to be corrected).

## 5. Blockers
| Blocker | Owner |
|---|---|
| Gate 6 owner smoke for CR-358 P1–P4 + CR-360 | Owner |
| Backend rulings: `room-payment` 403, no-show field, B-361-02 soft-allocation, OG-PMS-010 | Owner → backend team (briefs for CR-361/362/365/367 + these rulings **not yet written**) |
| BUG-381 live walk-in test | Owner |
| Audit track wants the regression baseline green before any new PMS Gate 4 starts (see audit handover §5 step 4.1) | Sequencing decision |

## 6. NEXT ACTIONS when PMS track resumes (owner picks order)
1. **SMOKE FACILITATOR** — walk owner through CR-358 P1–P4 + CR-360 on preprod; record Gate 6; close or spawn bugs. (Re-verify P4 tests first — §3.)
2. **Backend briefs** — one document per: CR-361 assign endpoint (+B-361-02), CR-362 cancel/modify/extend, CR-365 housekeeping model, CR-367 messaging; plus rulings for OG-PMS-014/015/010. Template: `AGENT_PROMPT_ALPHA.md` §BACKEND HANDOFF TEMPLATE; destination `memory/backend_briefs/`.
3. **PLANNING Gate 2** for unblocked items, recommended order: **CR-366** (mostly unblocked) → **CR-358-P5** → **CR-363** (decide FE-derived no-show vs wait for backend) → **CR-364** (read-only folio first; Record Payment behind OG-PMS-014). Owner decisions pending: OD-363-01/02 (day boundary, revenue basis), OD-366-01 (revenue basis R6).
4. Apply §3 corrections during the first PLANNING/CLOSURE session.

## 7. Key files (PMS)
`src/pages/pms/*` (10 pages) · `src/api/services/pmsService.js` · `src/api/services/aiosellService.js` · `src/api/transforms/aiosellTransform.js`, `roomStatusTransform.js`, `orderTransform.js` (roomInfo) · `src/components/pms/*` (incl. `PmsCheckoutDrawer.jsx`) · `App.js` `/pms/*` routes · design tokens `control/PMS_DESIGN_TOKENS.md` · intake docs `change_requests/CR-358*`, `CR-36*` · plans `plans/CR-358-P1…P4_IMPLEMENTATION_PLAN.md` · QA `reports/QA_REPORT_CR358_P3/P4_2026_09_04.md`, `QA_REGRESSION_CR358_FULL_2026_09_04.md`.

## 8. Environment notes
- `REACT_APP_API_BASE_URL` has a trailing slash → strip before concatenating in curl (`//api/...` gives false 404).
- Token TTL ≈15 min on preprod; re-login before long probe batches.
- Login: `POST /api/v1/auth/vendoremployee/common-login` with `login_type: employee` (v2 variant is 404).
- Node 20 vs `jest-dom@7` (needs 22) → `yarn install --ignore-engines`.
