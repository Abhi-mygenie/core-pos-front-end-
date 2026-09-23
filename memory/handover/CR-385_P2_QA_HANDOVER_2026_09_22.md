# QA HANDOVER (v0.7) — CR-385 Phase 2 · M1 New Booking · M3 Check-In — 2026-09-22
Implementation → QA (Role 4). Owner "Phase 2 GO" 2026-09-22 (D81/D82). Owner QA answers: 1=a (logged out, go), 2=a full run with **Executive booking → upgraded at check-in to Suite r4/r5/r1**, 3 = leave nothing in place, settle everything.

## 1. Inherited from Plan (Verification Matrix — phased plan §2.3/§2.4, companion §4 M1/M3)
| # | Case | How to verify | Automated |
|---|---|---|---|
| V-M1-02 | booking payload has no `rate_per_night`/`room_price`/`amount_after_tax`, `rooms_count 1`, `advance` only when > 0 | unit + Network tab wire-shape | YES + browser |
| V-M1-01/04 | grid from rates + availability; sold-out row disabled; guards (10-digit phone, dates ≥ business date, adults ≥ 1, Card/UPI need ref) | browser | partly |
| V-M1-03 | 422 "no rate configured" verbatim; HTTP 200 `skipped:true` → `booking-error`, no toast (BQ-385-26) | unit | YES |
| V-M1-05 | E2E: create Suite booking ₹1,000 UPI advance → 201; Arrivals row shows ₹1,000 advance chip (`fd-row-<id>-badge`); LR `charge.balance_due = total_with_gst − 1000` | live | NO |
| D82 | pre-save RIGHT pane = Stay summary: `booking-summary-rate`, `-nights`, `booking-bill-pending`; **no** `booking-bill-total/sgst/cgst` before 201; post-201 confirmation strip from `charge.*` | unit + browser | YES |
| V-M3-01 | check-in FormData = legacy field set + `aiosell_reservation_id`, `upgrade_type/amount/reason`; `room_price/order_amount/gst_tax/balance_payment = 0`; header `multipart/form-data` | unit + Network tab | YES + browser |
| V-M3-02 | `allow_early_checkin=false` + future row → `fd-row-<id>-checkin-btn` disabled, title "Arrives <d> — modify the booking dates to check in today"; `=true` → enabled | unit + live toggle (restore OFF) | YES + live |
| V-M3-03 | HK room selectable (`checkin-room-hk-badge`, `checkin-room-hk-warning`), Confirm enabled | unit + live | YES + live |
| V-M3-05 | E2E: **Executive** booking → Check In → "Show higher categories" → Suite r4/r5/r1 → Paid ₹1,500 reason "qa" + Collect now ₹500 Card + ref → 200 `data.charge.upgrade_amount 1500`, `advance_payment` = booking advance + 500; In-House row "Paid so far"; folio (old `/pms/folio/<orderId>`) shows both ledger rows + "Room upgrade: qa" line | live | NO |
| V-M3-06 | early check-in attempt with setting OFF → server 422 verbatim in `checkin-server-error` (only reachable if the FE guard is bypassed — verify the guard instead, plus the unit test) | unit | YES |
| V-M3-07 | legacy `/pms/check-in` + `/pms/new-booking` unchanged (byte-identical: git diff empty; sha256 pmsService b5f139c7…, CheckInPage 5d266e5c…, NewBookingPage b18ce78a…) | screenshot-diff | NO |
| V-M3-04 | RIGHT pane `scrollHeight === clientHeight` @1366×768: New Booking collapsed + advance open, Check-In | Playwright | NO |
| X-10 | duplicate-testid audit with New Booking open, Check-In open, RoomDetail open, alerts popover | DOM | NO |
| X-14 | toast → close → refetch after every mutation (Save booking, Check-in) | Network | NO |
| C7 | availability/rates reads debounce ≥500 ms, one batch in flight, LR row count unchanged after date toggling | Network + LR read-back | NO |
| F1 | opening New Booking collapses row/room expansions and vice-versa | browser | NO |
| E13 | Rooms tab → booked tile → Check In → Arrivals row expands as check-in | browser | NO |
| BUG-431/432 | re-verify by construction: the new forms never send/compute a price (wire shape) | Network | NO |
| End-state | LR in-house = r2/r3 only; r4/r5/r1 free (board + `room-availability`); `allow_early_checkin=false`, `extend_rate_mode=calendar`, `auto_print_checkin_receipt=false`; no No-Show confirmed | curl read-back | NO |

## 2. Additional test cases (discovered during implementation)
- "Save & check in now" disabled unless check-in date === business date (tooltip); when enabled → refetch → Arrivals row opens as `checkin`.
- Booked RoomDetail with no linked pending arrival → toast "No pending arrival is linked to this room" (no crash).
- `useFrontDeskRules` failure (settings-list 500 via route intercept) → page still renders, Check In treated as early-blocked only for future rows (defaults).

## 3. Regression tests
All 33 Phase 1 Role-4 cases (`QA_REPORT_2026_09_22_CR385_P1_ROLE4.md`) still apply — at minimum: Modify preview/confirm, Cancel inline (Direct), No-Show button on OTA rows (never confirm), M7 tab save ON→OFF, chips/tiles/search/keyboard, legacy `/pms/arrivals` overlay dialogs. Unit: `--testPathPattern=cr385` 81/81.

## 4. Registry Sync Confirmation
Registry synced: **YES** (CR-385 `GATE_5A_IMPLEMENTED (P2)`, sprint_key `pos_pms_2`) · CR_REGISTRY row updated · FILE_OWNERSHIP section added · code markers `// CR-385 M1/M3` on all 11 files · webpack "Compiled successfully", `yarn build` exit 0, 0 new warnings. **EXIT GATE: 5/5 PASS.**

## 5. Credentials + Environment
`memory/test_credentials.md` (OWNER_TGK; single-session — owner confirmed logged out). Preview URL = `REACT_APP_BACKEND_URL` in `frontend/.env`; login page is `/` (not `/login`); route `/pms/front-desk-v2`. Sandbox rules in §5 of the session handover. Evidence → `evidence/CR-385/phase2_qa/`. Report → `test_reports/QA_REPORT_2026_09_22_CR385_P2_ROLE4.md` + `/app/test_reports/iteration_N.json`.
