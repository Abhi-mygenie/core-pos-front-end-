# CR-385 · Phase 2 Entry Verification — probe report (2026-09-22, PLANNING role, READ-ONLY)
Account OWNER_TGK (RID 69 `sandbox-pms`, token masked). Script `run_entry.py`. **No booking created, no settings written, no room touched.**

| # | Probe | Result | File |
|---|---|---|---|
| 1 | `GET restaurant-settings/settings-list` → `basic.*` | `allow_early_checkin=false` · **`extend_rate_mode="held"` (NOT the documented default `calendar`)** · `auto_print_checkin_receipt=false` (+ `pms.*` aliases identical) | `s1_settings_list.json` |
| 2 | `GET local-reservations?view=all` (−30/+60) | `meta.business_date=2026-09-22`; counts arrivals_late 10 · in_house 2 (ids 155 r3, 174 r2 = owner's forbidden rooms) · 112 rows | `s2_lr.json` |
| 3 | `GET room-availability?checkin=2026-09-22&checkout=2026-09-23` | r4 / r5 / r1 (suite) `available:true`; r3 (suite) + r2 (executive) `blocked_by:in_house` | `s3_room_availability.json` |
| 4 | `POST direct-reservation` with deliberately incomplete body `{rooms:[]}` | **HTTP 200** `{status:true, skipped:true, message:"Direct reservation skipped: incomplete stay dates.", data:null}` — not a 422. Nothing created (`data:null`, `skipped`). | `s4_direct_reservation_422.json` |
| 5 | `GET room-status-board` | r3, r2 `is_occupied:true`; r4, r5, r1 free | `s5_board.json` |

## Token & before/after (owner ask, 2026-09-22)
- **Token:** `POST /api/v1/auth/vendoremployee/common-login` (header `X-localization: en`) with the OWNER_TGK email/password supplied in chat → `token` → `Authorization: Bearer …` on a `requests.Session`. Same path as `run_gate4.py`. Token never written to disk; not present in any JSON here. Single-session account: this login may have invalidated an open browser session.
- **LR before → probe → LR after** (`run_before_after.py`): **112 rows / max id 235** → `POST direct-reservation {rooms:[]}` → 200 `skipped:true, data:null` → **112 rows / max id 235** — unchanged ✅ (`s6_lr_before.json`, `s7_direct_reservation_skipped.json`, `s8_lr_after.json`). Filed as **BQ-385-26** (MASTER v2.3).

## Code anchors (grep, current tree) — see phased plan §2.1 (amended)
`ArrivalsPanel.jsx` L63 props · L74 Check-In PhaseButton · L89–106 renderExpansion · `FrontDeskWorkstationPage.jsx` L74 kind · L80 openExpansion · L81 afterAction · L116/117 panels · L125 `onNewBooking={null}` · L140 KpiTabStrip · `RoomDetail.jsx` L73 · `RoomsPanel.jsx` L81 · `frontDeskService.js` L40 (last export) · `constants.js` L581 (`ROOM_AVAILABILITY` **missing**) · `restaurantSettingsService.js` L36–43 `getFrontDeskRules` · `GuestTable.jsx` L147 PhaseButton · `pmsService.js` L195 (`createDirectReservation`, OD-P2-07) · L218–283 (`pmsCheckIn` FormData) · L440 `getRatesData`.

## Unit baseline
`craco test --testPathPattern=cr385` → **10 suites · 66/66 · 2 snapshots** (P1 tests in `components/pms/frontdesk/__tests__/`, P1.5/1.5c in `src/tests/cr385/`).

## Flags for the owner
1. **Sandbox not at defaults:** `extend_rate_mode=held` (expected `calendar`). Not changed by this session (read-only). Needs a restore via Channel Manager › Front Desk Rules before P2 QA (affects P3 pricing, not P2).
2. `direct-reservation` silently "skips" on bad input with HTTP 200 → M1 must check `data.reservation`, not the status code.
