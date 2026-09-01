# MyGenie POS — PRD & Memory

## Project
React 19 frontend POS for restaurants/hotels. Connects to Laravel backend at preprod.mygenie.online.
Deployed at: https://core-frontend-dev.preview.emergentagent.com

## Architecture
- Frontend only (React + CRACO + Tailwind + Radix/shadcn)
- Supervisor runs `yarn start` from `/app/frontend` on port 3000
- Source: https://github.com/Abhi-mygenie/core-pos-front-end-.git (branch: main)
- Control docs in `/app/memory/control/` (synced from origin/main)
- Deployed at: https://ac7e8e21-2fea-4559-a64e-e9d302552f9d.preview.emergentagent.com

## Session 2026-09-01 (part 2) — All 4 Backend Blockers Confirmed Fixed

Owner uploaded `reply_3.md` — backend claimed BUG-BE-02 and BUG-BE-04 also fixed, with full end-to-end curl evidence. Agent independently re-verified both by querying `local-reservations` directly (read-only, no new mutation):

| Bug | Booking ID | Result |
|---|---|---|
| BUG-BE-02 (OTA check-in) | `BDC8899464` | `operational_status=in_house`, `line_status=checked_in`, RM 8527 (suite), `order_id=1232181` ✅ |
| BUG-BE-04 (Direct check-in) | `MG-69-69BCC4D3-...` | `operational_status=in_house`, `line_status=checked_in`, RM 8528 (executive), `order_id=1232179` ✅ |

**All 4 backend blockers (BUG-BE-01/02/03/04) now CLOSED and agent-verified.** No remaining hard backend blockers for Phase 1-3. Updated `plans/CR-353_EXECUTION_PLAN_PHASED.md`, `impact/CR-353_PMS_CHANNEL_MANAGER_IMPACT_ANALYSIS.md`, `test_credentials.md`. Handover (`SESSION_HANDOVER_2026_09_01_CR353_PLAN_APPROVED.md`) Step B (re-probe BUG-BE-02/04) is now satisfied — next agent proceeds straight to Step A (present plan) + Step C (Gate 2 for CR-353-P1).

---

## Session 2026-09-01 — CR-353 Phased Execution Plan Approved + Backend Fixes Verified

| Milestone | Detail |
|---|---|
| **Role** | PLANNING — phasing strategy (no code written, per owner instruction) |
| **Plan** | `plans/CR-353_EXECUTION_PLAN_PHASED.md` — 5 phases (Foundation+CM+In-House / Booking+Check-In / Reservation Ops / Tape Chart+Room Status / Rates+No-Show+Regression) |
| **Owner decision** | ✅ APPROVED as-is, no phase merge/split requested |
| **Backend validation** | Agent curl-probed preprod directly (restaurant 69, `owner@thegoankitchen.com`): `GET /aiosell/local-reservations?view=arrivals` → **200** (was 500, BUG-BE-01 FIXED); `POST /aiosell/direct-reservation` → **201**, channel=Direct (was 500, BUG-BE-03 FIXED) |
| **Still unverified** | BUG-BE-02 (OTA check-in, was 422) and new BUG-BE-04 (Direct check-in, was 403) — backend claims fixed in `reply_2.md` but agent has no live `booking_id` to re-test yet; re-probe at Phase 2 QA |
| **Docs updated** | `impact/CR-353_PMS_CHANNEL_MANAGER_IMPACT_ANALYSIS.md` (§PROBE, §BUGS), `plans/CR-353_EXECUTION_PLAN_PHASED.md` (§1, Phase 2/3, §8), `registry.json` (CR-353 status), `test_credentials.md` (created) |
| **Owner's next-session instruction** | (1) Next agent re-presents the phased plan in full detail to owner. (2) Re-probe/confirm BUG-BE-02 + BUG-BE-04 with backend. (3) ONLY THEN start **Gate 2 Impact Analysis for CR-353-P1** (Phase 1 only) — explicitly NOT Gate 3 Implementation Plan yet. |
| **Handover** | `handover/SESSION_HANDOVER_2026_09_01_CR353_PLAN_APPROVED.md` — full step-by-step for next agent |

---

## Session 2026-08-28 — PMS Module Gate 2 Impact Analysis

| Milestone | Detail |
|---|---|
| **Role** | PLANNING — Gate 2 Impact Analysis |
| **CR** | CR-353 (renumbered from design-label CR-351 — collision with Printer CR) |
| **Gate** | 2 ✅ COMPLETE |
| **Code reality** | NONE — greenfield |
| **Risk** | HIGH |
| **Gaps found** | 17 (1 P0, 6 P1, 6 P2, 4 P3) |
| **Missing APIs** | 5 new backend endpoints required |
| **Owner decisions** | 8 decisions (OD-01→OD-08) — Gate 3 BLOCKED until answered |
| **Impact doc** | `impact/CR-353_PMS_CHANNEL_MANAGER_IMPACT_ANALYSIS.md` |
| **API handover read** | `handover_1.md` — AIOSELL backend API spec fully processed |

**Key discovery:** CR-351 PMS label conflicts with real CR-351 (Printer Setup, IMPLEMENTED). PMS CR renumbered to **CR-353**. All references updated.

---

## Session 2026-08-30 — Printer Routing Gate

| ID | Title | Files |
|---|---|---|
| CR-352 | Printer Type Routing Gate | profileTransform.js + restaurantSettingsTransform.js + RestaurantSettingsPage.jsx + ListFormViews.jsx |
| BUG-364 | Printer Type stale — localStorage bridge | RestaurantSettingsPage.jsx |
| BUG-363 | Android print style round-trip | CLOSED retroactively (code was in PrintStyleTab.jsx) |
| G2 | KDS in printer dropdown | RESOLVED — backend already fixed |

**Open printer gaps for next session:** G3b (employee dropdown, FE-only), Wizard Step 2 Agent tabs (deferred), BUG-362 closure, BUG-319 + printer_agent persistence (backend), CR-168 (parked).
**Handover:** `memory/handover/SESSION_HANDOVER_2026_08_30_PRINTER_ROUTING_COMPLETE.md`
- Cloned branch `main` from https://github.com/Abhi-mygenie/core-pos-front-end-.git
- Replaced `/app/frontend/` with repo's `frontend/` dir (rsync, no code edits)
- Synced `/app/memory/` from repo's `memory/` dir (full pull)
- `.env` written with all provided env vars (API base, Firebase, Socket, CRM, Maps)
- `npm install --legacy-peer-deps` run to install all 1627 packages
- Frontend compiled successfully; login screen rendering on port 3000

---

## Session 2026-08-26 — Implemented

| ID | Title | Files |
|---|---|---|
| Smart Purchase split fix | subtotal = sum(r.rate) | SmartPurchasePanel.jsx |
| Smart Purchase paymentType | sends 'Cash'/'UPI' | SmartPurchasePanel.jsx |
| BUG-351 | Room check-in CRM doc upload skipped for verified guests | RoomCheckInModal.jsx |
| BUG-352 | Amount column w-24 → w-32 | OrderTable.jsx |
| BUG-357 | Advance > room price FE guard removed | RoomCheckInModal.jsx |
| BUG-358 | Sidebar persistence Phase 1 (DashboardPage) | DashboardPage.jsx |
| BUG-359 | Settings tax cleanup: removed dead GST Mode/Tax%/GST Tax%, Inclusive option | RestaurantSettingsPage.jsx + ProductForm.jsx + BulkEditor.jsx |
| BUG-360 | Room checkout live balance (remainingRoomBalance) | CollectPaymentPanel.jsx + RoomRowCard.jsx |
| BUG-361 | Sidebar persistence Phase 2 (68 pages) | 68 files via Python script |
| CR-348 | Custom item GST % + Tax Calc field | AddCustomItemModal.jsx + orderTransform.js + OrderEntry.jsx |
| CR-349 | Change/Unpaid/Reprint on Beta Report Settled tab | OrderReportBetaPage.jsx |
| CR-350 | ID upload mandatory toggle (localStorage Phase 1) | StatusConfigPage.jsx + RoomCheckInModal.jsx |

## Pending QA (next session)
- All 10 items above need testing_agent run
- QA handover docs at /app/memory/handover/QA_HANDOVER_2026_08_26_*.md
- Need credentials in test_credentials.md first

## Open / Not Implemented
- BUG-353: Backend-blocked (Beta Report date range)
- BUG-354: Live test needed (Beta Report status column)
- BUG-355: PARKED (owner decision)
- BUG-356: Live test needed (customer data save)

## Key localStorage Keys
- `mygenie_sidebar_expanded` — sidebar state (all 69 pages)
- `mygenie_room_id_upload_required` — ID upload mandatory toggle (CR-350)
- `mygenie_walkin_name_required`, `mygenie_walkin_phone_required` — customer fields (CR-051)

## Registry State
- Total items: 576
- Last BUG: BUG-361
- Last CR: CR-350
