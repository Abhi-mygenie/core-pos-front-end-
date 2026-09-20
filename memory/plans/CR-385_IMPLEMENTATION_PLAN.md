# CR-385 · Implementation Plan (Gate 3 · P-04) — PMS Front Desk Unified Tabbed Workstation

```
Written:      2026-09-20 (server business_date 2026-09-20) · PLANNING role (AGENT_PROMPT_ALPHA v0.7 Role 2, stage = implementation_plan: Step 3 + Step 4 + Step 5)
Item:         CR-385 · P1 · Risk HIGH (contains CRITICAL surfaces: M3 check-in money, M4 extend money, M6 checkout/TAB, M7 settings that change server pricing)
Code Reality: NONE — `grep -rn "CR-385" frontend/src/` = 0 hits · `grep -rn "spike-cr385\|SpikeCr385" frontend/src/` = 0 hits · no `src/spike/` · `git status` shows no src/ change (2026-09-20)
Conflict Pre-Check: see §0.2 (no blocking conflict; 3 ordering notes)
Inputs (binding): DESIGN_DECISIONS D1–D58 · IA Rev 4 (G-01…G-56, R15–R26) · AC-01…AC-22 · MASTER brief v1.9 · spike MEASUREMENTS.md (D57/D58) · handover 2026-09-20 §1/§4/§5 · mockup v2.28 (LOCKED) · blueprints v2.17/v2.19/v2.22 · master checklist (P, X, M0–M7, S, R, G4)
Gate status:  Gate 3 OPEN. This plan is milestone B. Gate 3 closes only when the owner says "close Gate 3" (D58). Nothing in `frontend/src/` before owner "Gate 4 GO" (G4-10).
Design reference: `frontend/public/cr385-frontdesk-mockup.html` v2.28 — the visual spec; this plan does not restate pixel layout, it maps mockup views → files, data, edits, tests.
```

---

## 0. Pre-plan checks (Stage dispatch Step 0 + Step 1)

### 0.1 Code Reality — NONE
| Check | Command | Result |
|---|---|---|
| CR marker | `grep -rn "CR-385" frontend/src/ --include=*.js --include=*.jsx` | 0 hits |
| Spike residue | `grep -rn "spike-cr385\|SpikeCr385" frontend/src/` · `ls frontend/src/spike` | 0 hits · dir absent |
| Feature keywords | `grep -rn "front-desk-v2\|FrontDeskWorkstation\|frontDeskService\|components/pms/frontdesk" frontend/src/` | 0 hits |
| IA Rev 4 line refs still valid | `App.js` imports L98–109, routes L259–270 · `Sidebar.jsx` PMS group L226–246 · `PmsCheckoutDrawer.jsx` panel props L260–297 (BUG-425 override L271–285) · `roomStatusTransform.js` L6–37 · `restaurantSettingsService.js` L24–33 · `RestaurantSettingsPage.jsx` Step 8 L762–784 · 4 dialogs root `div.fixed.inset-0` at Extend L78 / Modify L69 / Cancel L48 / NoShow L38–39 | all re-verified 2026-09-20 |

### 0.2 Conflict Pre-Check (FILE_OWNERSHIP.md + registry.json items ≠ CLOSED on the shared files)
| Shared file (edit allowed by OD-385-12 exception) | Last modifier (FILE_OWNERSHIP) | Open registry items on it | Verdict |
|---|---|---|---|
| `App.js` | CR-364 2026-09-14 (+import L109, +route L270) | CR-117 (GATE_5 pending QA), CR-365 (unblocked, not coded), CR-372-B (intake) | **parallel-safe** — CR-385 adds 1 import after L109 + 1 route after L270; other items add their own lines |
| `components/layout/Sidebar.jsx` | CR-363/366 2026-09-14 (L243–244) | CR-052/CR-122/CR-355/BUG-136 (QA PASS, await smoke), CR-117, CR-365 | **parallel-safe** — +1 child row after L244 inside the existing PMS group |
| `components/pms/CancelBookingDialog.jsx` · `NoShowDialog.jsx` | CR-358-P5 2026-09-08 (NoShow NEW) · CR-362 2026-09-13 (Cancel NEW) | none open | **clear** — `inline` wrapper edit (D2) |
| `components/pms/ExtendStayDialog.jsx` | BUG-402 GATE_5A_IMPLEMENTED 2026-09-15 (dateRateMap read) | **BUG-402** awaiting QA/smoke (§S-402) | **ORDER:** M4 after S-402 smoke. See **OD-385-16** (§9) — recommended route leaves this file untouched |
| `components/pms/ModifyBookingDialog.jsx` | CR-362 2026-09-13 | none open | see **OD-385-16** (§9) |
| `api/transforms/roomStatusTransform.js` | BUG-383 2026-09-09 (L28–34) | **CR-368** (test-suite triage, Gate 2) | **parallel-safe** — additive fields only; CR-368 touches tests. P-11: triage CR-368 before M5/M6 |
| `pages/RestaurantSettingsPage.jsx` · `api/transforms/restaurantSettingsTransform.js` · `api/services/restaurantSettingsService.js` | CR-132 / BUG-337 / BUG-339 / CR-352 | CR-056, CR-352, BUG-289, BUG-364 (all QA PASS await smoke), CR-134 (HOLD backend) | **parallel-safe** — M7 adds 2 Step-8 toggles + 2 transform keys; no shared lines with those items |
| `components/order-entry/CollectPaymentPanel.jsx` (hotspot, READ-ONLY here) | BUG-373/374 2026-09-01 | CR-058 (parked), CR-116/CR-137 (QA PASS), CR-358-P3 | **NOT EDITED** — imported only (P-07) |
| `api/services/pmsService.js` (READ-ONLY here — `pmsCheckIn`, `getInHouseGuests`, `getRoomStatusBoard`, `patchRoomStatus`, `bulkMarkClean`, `getRatesData`, `cancelReservation`, `markNoShowBooking` are *called*, not edited) | BUG-421/429 2026-09-16 | BUG-421/426/429/430 GATE_5A (§S smoke), CR-368, CR-384 (backend-blocked) | **ORDER:** M5 after S-421/426/429/430 smoke |
| `pages/pms/CheckInPage.jsx` (source of the copy, NOT edited) | BUG-419/420 2026-09-16 | BUG-411 GATE_5A (§S-411), BUG-414, CR-384 blocked | **ORDER:** M3 copy taken *after* S-411 smoke so the copy inherits the verified BUG-411 code |

Declared: **no CONFLICT requiring a code-level merge.** Three ordering dependencies (M3 ← S-411, M4 ← S-402, M5 ← S-421/426/429/430) are already the B-7 rule (handover §5 "Gated on").

### 0.3 Risk label — HIGH (item) · per module
M0 MEDIUM · M1 HIGH (creates reservations + advance) · M2 HIGH (cancel/no-show mutate inventory) · M3 **CRITICAL** (check-in money, upgrade, advance) · M4 **CRITICAL** (extend money) · M5 HIGH (balance display) · M6 **CRITICAL** (TAB settlement; hotspot import) · M7 HIGH (settings that switch server pricing/acceptance). Per the v0.7 matrix every CRITICAL module needs owner approval (Gate 4 GO covers it) + E2E money test in §6 + audit note in the QA handover.

---

## 1. Scope lock (R14)

### 1.1 Files that WILL change (existing) — every edit is wrapper/additive, marked `// CR-385 <module>`
| # | File | Module | Edit size | Authority |
|---|---|---|---|---|
| E1 | `frontend/src/App.js` | M0 | +1 import (after L109) +1 route (after L270) | OD-385-12/13 |
| E2 | `frontend/src/components/layout/Sidebar.jsx` | M0 | +1 child `{ id:'pms-front-desk-v2', label:'Front Desk (Beta)', path:'/pms/front-desk-v2' }` after L244 | OD-385-14 (a) |
| E3 | `frontend/src/api/transforms/roomStatusTransform.js` | M0 | additive: `hkAssignee`, `isOccupied`, `guest.phone/email`, `meta` passthrough (L11–22, L36) | O-6 (D54) |
| E4 | `frontend/src/components/pms/CancelBookingDialog.jsx` | M2 | `inline` prop wrapper (~5 L around L48) | D2 |
| E5 | `frontend/src/components/pms/NoShowDialog.jsx` | M2 | `inline` prop wrapper (~5 L around L38–39) | D2 |
| E6* | `frontend/src/components/pms/ExtendStayDialog.jsx` | M4 | **only if OD-385-16 = (b)** — `inline` wrapper (~5 L around L78) | D2 / OD-385-16 |
| E7* | `frontend/src/components/pms/ModifyBookingDialog.jsx` | M2 | **only if OD-385-16 = (b)** — `inline` wrapper (~5 L around L69) | D2 / OD-385-16 |
| E8 | `frontend/src/api/transforms/restaurantSettingsTransform.js` | M7 | +2 keys in `fromAPI.settingsResponse().step8` (after L187) and `toAPI.settingsPayload().basic` (after L285) | O-8 (a) |
| E9 | `frontend/src/pages/RestaurantSettingsPage.jsx` | M7 | +2 defaults in `step8` initial state (L86–87) · +1 `SectionCard` with 2 controls in Step 8 (after L777) | O-8 (a) |
| E10 | `frontend/src/api/services/restaurantSettingsService.js` | M7 | **no edit expected** — `updateSettings` already posts multipart `data=` (L26–31). Listed so the scope lock is explicit; touched only if the transform needs a new export | O-8 (a) |

\* E6/E7 exist only on route (b) of OD-385-16. Recommended route (a) leaves both files untouched (see §9).

### 1.2 Files that WILL be created (all NEW; owner-locked list = registry `files` + M7/M2/M4 forms)
```
frontend/src/pages/pms/FrontDeskWorkstationPage.jsx
frontend/src/components/pms/frontdesk/KpiTabStrip.jsx
frontend/src/components/pms/frontdesk/AlertBar.jsx
frontend/src/components/pms/frontdesk/GlobalSearch.jsx
frontend/src/components/pms/frontdesk/WorkstationHeader.jsx          (greeting · date · sync pill · + New Booking)
frontend/src/components/pms/frontdesk/GuestTable.jsx                 (common 9-col row, sticky th, sort, ↑↓ Enter Esc, ExpandableRow)
frontend/src/components/pms/frontdesk/ArrivalsPanel.jsx
frontend/src/components/pms/frontdesk/DeparturesPanel.jsx
frontend/src/components/pms/frontdesk/InHousePanel.jsx
frontend/src/components/pms/frontdesk/RoomsPanel.jsx
frontend/src/components/pms/frontdesk/RoomTile.jsx                   (copy of RoomStatusPage tile — mirror rule)
frontend/src/components/pms/frontdesk/RoomDetail.jsx                 (tile expansion, 6 states)
frontend/src/components/pms/frontdesk/NewBookingForm.jsx             (M1)
frontend/src/components/pms/frontdesk/CheckInForm.jsx                (M3 copy of CheckInPage form body — mirror rule)
frontend/src/components/pms/frontdesk/ExtendStayForm.jsx             (M4, OD-385-16 route a)
frontend/src/components/pms/frontdesk/ModifyBookingForm.jsx          (M2, OD-385-16 route a)
frontend/src/components/pms/frontdesk/FolioCheckoutPanel.jsx         (M6: LEFT statement + RIGHT CollectPaymentPanel)
frontend/src/components/pms/frontdesk/frontdesk.css                  (`.frontdesk-bill` Q6 rule + sticky/scroll rules)
frontend/src/components/pms/frontdesk/money.js                       (charge → display helpers: isCleared, badge, fmtINR, fmtDate, plural)
frontend/src/api/services/frontDeskService.js
frontend/src/api/transforms/frontDeskTransform.js
frontend/src/api/services/__tests__/frontDeskService.cr385.test.js
frontend/src/api/transforms/__tests__/frontDeskTransform.cr385.test.js
frontend/src/components/pms/frontdesk/__tests__/money.cr385.test.js
frontend/src/components/pms/frontdesk/__tests__/hideSectionRows.cr385.test.js   (M6-09 testid regression guard)
```

### 1.3 Files that will NOT be touched (hard)
`components/order-entry/CollectPaymentPanel.jsx` (3,331 L hotspot — **imported only**) · `api/transforms/orderTransform.js` · `api/services/pmsService.js` (called, not edited) · `pages/pms/FrontDeskPage.jsx` · `ArrivalsPage.jsx` · `DeparturesPage.jsx` · `InHouseGuestsPage.jsx` · `RoomStatusPage.jsx` · `CheckInPage.jsx` · `NewBookingPage.jsx` · `GuestFolioPage.jsx` · `components/pms/PmsCheckoutDrawer.jsx` · `components/pms/GuestDocsSection.jsx` (imported by CheckInForm) · `api/transforms/aiosellTransform.js` · `api/transforms/folioTransform.js` (imported) · `AppProviders.jsx` (R7) · any localStorage key (R8; new keys only: `mygenie_frontdesk_tab`, `mygenie_frontdesk_groupby`) · `.env` · `memory/final/*` (R2) · `public/cr385-frontdesk-mockup.html` (LOCKED v2.28).
`ExtendStayDialog.jsx` / `ModifyBookingDialog.jsx` join this list under OD-385-16 route (a).
**Rollback:** remove E1 route + E2 sidebar item → the Beta page is unreachable; new files are inert; E3/E8/E9 are additive keys that no other consumer reads. No feature flag needed (owner: sidebar item removal = rollback, P-04).

---

## 2. Architecture (one page)

```
FrontDeskWorkstationPage  (route /pms/front-desk-v2, ?tab=arrivals|departures|inhouse|rooms, landing Arrivals — OD-385-10)
 ├─ useFrontDeskSnapshot()  →  frontDeskService.getSnapshot({start,end})  =  LR(view=all) ‖ board ‖ kpis   (Promise.allSettled)
 │      state: { reservations[], counts{}, meta{business_date}, rooms[], boardMeta, boardError, kpis, loadedAt, error }
 │      refresh: on mount · window 'focus' · manual ↻ · after EVERY mutating action (X-14, P-09)
 │      LR failure  → whole-page error + Retry (F14)          board failure → Rooms tile "—", HK badges hidden, RoomsPanel retry only (OD-385-11)
 ├─ WorkstationHeader (greeting · meta.business_date · ● synced X min ago ↻ · + New Booking)  · GlobalSearch (client-side over snapshot)
 ├─ KpiTabStrip (4 tiles = tabs; numbers = counts.* / board counts / kpis.today.occupancy_percent_physical)
 ├─ AlertBar (max 3 + "+N" popover; derived from snapshot; D37 priority)
 ├─ NewBookingForm expansion (top of current tab; M1)
 └─ <TabPanel>
      ArrivalsPanel   → GuestTable rows = reservations.filter(operational_status==='pending')  · chips Late/Today/Tomorrow/Upcoming (server dates vs meta.business_date)
                        expansions: CheckInForm (M3) · ModifyBookingForm (M2) · CancelBookingDialog inline / NoShowDialog inline (M2, nsOrCancel)
      DeparturesPanel → in_house rows due-out (checkout ≤ business_date+…) · chips Overdue/Today/Tomorrow/Upcoming · expansions: FolioCheckoutPanel (M6) · ExtendStayForm (M4)
      InHousePanel    → in_house rows · chips All/Arrived today/Leaving today/Stayover · same expansions + Request HK / Mark Clean (patchRoomStatus)
      RoomsPanel      → board rooms · group Room no./Type/Area(title) · chips All/Available/Occupied/Booked/HK/OOO/Turns today · RoomTile → RoomDetail (6 states) → routes to the same expansions
```
- **One expansion open at a time** (F1); `ExpandableRow` calls `el.scrollIntoView({block:'nearest'})` on open (D57/M6-11); `Esc` closes; `↑↓` move focus, `Enter` toggles (spike verdict).
- **All dates**: compare ISO strings against `meta.business_date` — no `new Date()` day logic in `components/pms/frontdesk/**` (X-06). `fmtDate()` only formats.
- **All money**: `money.js` reads `charge.*` only (X-01). Lint guard: `grep -rn "balance_payment\|remaining_room_balance\|\* 0.05\|\* 0.18\|toISOString" frontend/src/components/pms/frontdesk frontend/src/api/services/frontDeskService.js` must be empty (X-01/X-06, added to Step 5 checklist).

---

## 3. Data contract sheet (P-08 / G4-08) — verified on preprod 2026-09-20

Legend: **READ** = FE displays · **SEND** = FE sends · **FORBIDDEN** = never read (D50/AC-22/G-47).

| # | Call | Shape (verbatim from handover §4 + probes) | Read / send | Evidence |
|---|---|---|---|---|
| C1 | `POST /api/v1/auth/vendoremployee/common-login` `{email,password}` header `X-localization: en` → `token` | single-session (re-login per run, R26); 401 → existing re-login flow (X-15) | existing axios | `probes_2026_09_20_*/` |
| C2 | `GET /api/v2/vendoremployee/aiosell/local-reservations?start_date&end_date&view=all` | **422 without `start_date`/`end_date` even with `view=all`** (probe 2026-09-20) → FE always sends a window (business_date −30 … +60; the server does the bucketing, FE does no ±60 client filter — G-51). Response `data{ meta{business_date, server_time, timezone}, counts{arrivals_today, arrivals_late, arrivals_tomorrow, departures_today, departures_overdue, in_house, leaving_today, arrived_today}, reservations[] }`. Reservation: `id, booking_id, cm_booking_id, channel (Direct|WalkIn|booking.com|…), status (confirmed), operational_status (pending|in_house|departed), checkin, checkout, pah, special_requests, booked_on, cancel_reason, cancelled_at, cancelled_by, guest{first_name,last_name,phone,email,address_*}, rooms[]{id, room_code, rateplan_code, restaurant_table_id, table_no, table_title, adults, children, line_status, order_id, order_payment_status (unpaid|paid), order_f_order_status, checked_in_at, checked_out_at, user_id_document_id}, charge{rate_per_night, nights, rateplan_code, rateplan_name, upgrade_amount, booking_charge, sgst, cgst, total_with_gst, prepaid_amount, advance_payment, balance_due}` | READ `meta.business_date` (**only** date source for guards — never browser clock), `counts.*` (tab numbers, AC-12), `charge.*` (every ₹), `rooms[0].order_id` (folio/TAB), `rooms[0].order_payment_status` (cleared rule), `rooms[0].restaurant_table_id/table_no/table_title`, `guest.*`, `channel`, `pah`, `operational_status`, `checkin/checkout` | `probes_2026_09_20_g4_09/local_reservations_view_all.json` |
| C2-F | **FORBIDDEN on C2:** `balance_payment`, `advance_payment` (top-level legacy), `amount_after_tax`, `amount_before_tax` — sample id 155 shows legacy 900 vs `charge.balance_due` 950 | never read | same file |
| C2-R | **Cleared rule (X-02):** `rooms[0].order_payment_status === 'paid' && charge.balance_due === 0`. (Handover §1 says `payment_status == 'paid'`; the probe shows the field is per room line — recorded as **OG-PMS-028**, no contract change, only the path.) | helper `isCleared(res)` unit-tested | probe |
| C3 | `GET …/aiosell/room-status-board` → `data{ meta{business_date, server_time, timezone}, auto_hk_on_rm_checkout, rooms[]{restaurant_table_id, table_no, title, aiosell_room_code, manual_status, display_status (available|occupied|occupied_hk|booked|hk|ooo…), is_occupied, hk_assignee, room_operational_status_at, guest{name, phone, email, booking_id, order_id}, reservation{…}} }` — **no `sections[]` array exists**; Area = per-room `title` | READ via `fromRoomStatusBoard` (+E3 additive fields); Area groups = `normaliseTitle(title)` (trim, collapse whitespace, title-case; null → "No section") | `room_status_board.json` |
| C3-T | **Real Area titles (G4-09):** raw `"ground floor"`, `"first  floor"` (double space), `"2nd floor"`, `"3rd floor"`, `"patal lok"` → display `Ground Floor · First Floor · 2nd Floor · 3rd Floor · Patal Lok`. M0 fixture (`frontDeskTransform.cr385.test.js`) uses exactly these raw strings incl. the double space. | — | same |
| C4 | `GET …/aiosell/dashboard-kpis?start_date&end_date` (422 without dates) → `data{as_of_date, today{arrivals_count, departures_count, in_house_count, no_show_count, occupancy_percent_physical}, physical{total_rooms, by_room_code, days[]}, channel, range}` | READ `today.occupancy_percent_physical` (Rooms tile, MV-06), `today.no_show_count` (Arrivals footer) | `dashboard_kpis.json` |
| C5 | `POST …/aiosell/direct-reservation` `{guest{name,phone}, checkin, checkout, adults, children, rooms[{room_code, rateplan_code, rooms_count}], advance{amount, method, reference}}` → **201** `data.reservation{ id, booking_id, charge }` | SEND: **never `rate_per_night`** (server prices — BQ-16; 422 "no rate configured" when none → friendly error); `rooms_count: 1` (G-56); advance omitted when 0. READ `data.reservation.charge` for the confirmation | gate4 runner |
| C6 | `POST /api/v1/vendoremployee/pos/user-group-check-in` **multipart** (fields exactly as `pmsService.pmsCheckIn` L218–292 + `run_n7n8.py::checkin`: `booking_type, booking_id, aiosell_reservation_id, name, phone, email, customer_id, room_id[0], id_type, front/back_image_file, total_adult, total_children, children_name, name2..4/id_type2..4, checkin_date, checkout_date, booking_details, booking_for=Individual, order_amount, room_price, advance_payment, balance_payment, payment_method, order_note, gst_tax, firm_name, firm_gst, upgrade_type paid|complimentary, upgrade_amount, upgrade_reason`) → 200 `data.order_id`, `data.charge`; **422** with message when `allow_early_checkin=false` and `checkin > business_date` → **surface verbatim** | SEND via existing `pmsCheckIn` (+ the 3 upgrade fields, + `aiosell_reservation_id`) — the copy `CheckInForm` builds the same object. READ `data.charge`, `data.order_id` (M3-05) then refetch LR (X-14) | n7n8 runner |
| C7 | `POST /api/v2/vendoremployee/pos/room-extend-stay` `{order_id, new_checkout_date, reason, payment{amount, method}, discount?, new_restaurant_table_id?}` → `data.charge` (+ `nights_detail[] {date, rate, source held|calendar|held_fallback, gst_percent, gst}` in calendar mode), `data.payment_record_id`; **409** on conflict | SEND (new `frontDeskService.extendStay`, NOT the legacy `pmsService.extendStay` which sends `new_room_price`). READ `data.charge` for the RIGHT panel + `nights_detail` for the toast. **D14:** refetch LR after; never update the row from the extend response (`advance_payment/balance_due` omit the same-call payment on the calendar path). **Never sum `nights_detail[].gst`** (room nights only) | n11 runner |
| C8 | `POST /api/v2/vendoremployee/order/order-bill-payment` full FE body (`payment_mode:"TAB"`, `payment_status:"success"`, `paid_room:"yes"`, `waiter_id`, zero-filled discount/loyalty/coupon/tip, `cust_name/cust_mobile/name/mobile`) at `payment_amount = charge.balance_due` from LR | SEND **through the unmodified `CollectPaymentPanel`** (no new payload code, M6-03); server clamps over-amounts but FE must feed the right figure (M6-10). After 200: room → `hk`, LR line `departed`, `counts.in_house` −1 | `probes_2026_09_20/` G1–G4 |
| C9 | `GET /api/v1/vendoremployee/profile` → `restaurants[0].settings.allow_early_checkin | extend_rate_mode | auto_print_checkin_receipt` (aliases `pms.*`); also `GET …/restaurant-settings/settings-list` → `data.basic.*` | READ (M3-09, M4-05, M3-06, M7) | `probes_2026_09_20_n7n8/` |
| C10 | `POST …/restaurant-settings/update-settings` **multipart `data={"basic":{…}}` only** — raw JSON body returns 200 and changes nothing; invalid `extend_rate_mode` → 422 | SEND via existing `restaurantSettingsService.updateSettings` (already multipart, L26–31). POST is correct here: this endpoint is an existing create-style "update" — **documented exception to R25**, already used by the wizard | same |
| C11 | Cancel `POST …/local-reservations/{id}/cancel` `{reason, cancelled_by, notify_cm:true}` (409 if checked in) · No-Show `POST …/aiosell/mark-no-show` (OTA only) · Modify `PATCH …/local-reservations/{id}` `{checkin?, checkout?, rateplan_code?, reason, preview?:true}` — **server recomputes charge; FE never sends `amount_after_tax`** (G-02) · reasons `GET /api/v1/vendoremployee/cancellation-reasons` · rates `fetch-rates` · rooms `getBookableRooms` / `room-availability?checkin&checkout` | R25: PATCH for modify (Laravel update verb); cancel/no-show are backend-defined POST actions (existing `pmsService` calls reused) | `probes_2026_09_19/PROBE_REPORT.md` p2/p7/p8 |
| C12 | Room status `PATCH …/aiosell/room-status/{id}` `{status}` (hk|ooo|available) via existing `patchRoomStatus` / `bulkMarkClean` | reuse | CR-358-P4 |
| D-rules | Display: rate on extended stays = average → label **"avg. rate / night"**, never multiply back · per-night lines only from `nights_detail` (response) — on reload (LR has no `nights_detail`, **BQ-385-19 open → FE fallback accepted by this plan (G4-07): room total + nights + "avg. rate / night"**) · GST = two lines `charge.sgst` then `charge.cgst` · prepaid badge from `charge.prepaid_amount / advance_payment` (D48-b), not `pah` alone · `charge.advance_payment` = cumulative → "Advance ₹X" chip only on pending/in-house rows, "Paid so far ₹X" wording in-house | AC-04, AC-22, D55 | — |

---

## 4. Module plans (exact edits · verification · AC · data-testids)

Execution order (handover §2 step 3.4): **M0 → M1 → M2 → M3 → M4 → M5 → M6 → M7**; M0–M2 independent of B-7; M3 gated on S-411/S-410, M4 on S-402, M5 on S-421/426/429/430, M6 on S-425/428 (+ P-11 CR-368 triage before M5/M6). M7 is independent and small — may be built any time after M0 (it is placed last only because its effect is server-side).

### M0 · Shell (route, snapshot, tabs, tables, Rooms, search, alerts) — MEDIUM
**Existing-file edits**
| Edit | File · line | Current → New |
|---|---|---|
| E1a | `App.js` L109 (`import GuestFolioPage …// CR-364`) | append L110: `import FrontDeskWorkstationPage from './pages/pms/FrontDeskWorkstationPage'; // CR-385` |
| E1b | `App.js` L270 (`<Route path="/pms/folio/:orderId" …/>`) | append L271: `<Route path="/pms/front-desk-v2" element={<ProtectedRoute><FrontDeskWorkstationPage /></ProtectedRoute>} /> {/* CR-385 */}` |
| E2 | `Sidebar.jsx` L244 (`{ id: 'pms-revenue', … }`) | append L245: `{ id: 'pms-front-desk-v2', label: 'Front Desk (Beta)', path: '/pms/front-desk-v2' }, // CR-385 OD-385-14` |
| E3a | `roomStatusTransform.js` L18 `guest: g ? { name…, bookingId…, orderId… } : null,` | `guest: g ? { name: g.name ?? '', phone: g.phone ?? null, email: g.email ?? null, bookingId: g.booking_id ?? null, orderId: g.order_id ?? null } : null, // CR-385 O-6` |
| E3b | `roomStatusTransform.js` L17 (after `statusSince`) | insert `hkAssignee: x.hk_assignee ?? null, isOccupied: Boolean(x.is_occupied), // CR-385 O-6` |
| E3c | `roomStatusTransform.js` L36 `return { autoHkOnRmCheckout: …, rooms, counts };` | `return { autoHkOnRmCheckout: …, rooms, counts, meta: d.meta ?? null }; // CR-385 G-52` |
| E3d | `api/transforms/__tests__/roomStatusTransform.cr358p4.test.js` | +1 assertion block: old payload (no `meta`) → `meta === null`; new payload → `meta.business_date` present; existing assertions unchanged (D48-d) |

**New files (M0)**: `FrontDeskWorkstationPage.jsx`, `frontDeskService.js` (`getSnapshot`, `getLocalReservationsAll({start,end})`, `getBoard`, `getKpis`), `frontDeskTransform.js` (`fromReservation` → row model `{id, bookingId, guestName, phone, email, channel, isOta, checkin, checkout, nights, adults, children, roomNo, roomTitle, roomType, orderId, tableId, paymentStatus, operationalStatus, pah, charge, specialRequests}`; `bucketArrivals/bucketDepartures(rows, businessDate)`; `normaliseTitle`; `groupRooms`; `isTurn`), `money.js`, `WorkstationHeader.jsx`, `KpiTabStrip.jsx`, `AlertBar.jsx`, `GlobalSearch.jsx`, `GuestTable.jsx` (+`ExpandableRow`), `ArrivalsPanel.jsx`, `DeparturesPanel.jsx`, `InHousePanel.jsx` (rows only in M0; actions in M2–M6), `RoomsPanel.jsx`, `RoomTile.jsx` (copy of `RoomStatusPage.jsx` tile markup — record source line range in the file header for FU-385-C diff), `RoomDetail.jsx` (6 states, actions dispatch to the workstation), `frontdesk.css`.

**Rules baked in**: tabs = tiles (OD-385-01+07), Rooms 2× wide, `N free` always visible, red edge when `counts.arrivals_late | departures_overdue | board ooo > 0`; no trend hint (D4); chips per F6; Arrivals = `pending` only, Departures = `in_house` due-out (`checkout ≤ business_date` = Today/Overdue, `= +1` Tomorrow, else Upcoming); common 9-cell row (F3); ₹ column = `charge.total_with_gst` (Arrivals) / Balance (Departures/In-House, M5 helper — M0 shows `charge.balance_due` until M5 lands); badge rule D48-b; sticky `<th class="sticky top-0">` in a scroll container with **no top padding** (M0-03); sort ▲▼ (F16); `?tab=` deep link + `localStorage mygenie_frontdesk_tab`; density toggle **removed** (D41 v2.24 — always Comfortable; OD-385-05 superseded by D41); group-by segmented control Room no. · Type · Area (`title`, "No section"); Turns today chip (D42); alert bar priority (D37): overdue check-outs → HK > 2 h → OOO ≥ 1 d → expired arrivals; alert links open tab + chip + row expanded via `nsOrCancel` for expired arrivals; global search `/` focus, `Esc` clear, grouped In-house · Arriving · Departing · Rooms; header never says "Channel Manager" (ui_naming_rule); greeting from profile first name; no BETA badge, no property name (F9).

**Verification (M0)**: V-M0-01 route renders, sidebar item present, old `/pms/front-desk` unchanged (screenshot diff) · V-M0-02 tile numbers === `counts.*` from the same response (unit: transform on the saved `local_reservations_view_all.json` → arrivals_late 10, in_house 2, arrived_today 2) · V-M0-03 sticky header offset 0 at scroll (Playwright `getBoundingClientRect().top === container.top`) · V-M0-04 Area groups from the 5 raw titles → 5 groups, `"first  floor"` → "First Floor" (unit) · V-M0-05 board 500 → Rooms tile "—", other tabs work (mock) · V-M0-06 LR 500 → page error + Retry · V-M0-07 `↑↓ Enter Esc`, one expansion open, `scrollIntoView` called (unit on `ExpandableRow`) · V-M0-08 grep guard X-01/X-06 empty · V-M0-09 search "r3" → Rooms group + in-house row; `/` focuses · V-M0-10 a11y: focus ring, SVG icons, ≥ 32 px targets (testing agent) · V-M0-11 1366×768 + 1920×800 zero console errors.
**AC**: AC-03 (badge), AC-12 (counts), AC-14 (late chip from `arrivals_late` bucket), AC-16 (Area = title, Turns), AC-17/18 (glossary via `money.js`/copy), AC-19/20.
**data-testids**: `fd-page`, `fd-header-greeting`, `fd-header-date`, `fd-sync-pill`, `fd-refresh-btn`, `fd-new-booking-btn`, `fd-search-input`, `fd-search-result-<group>-<i>`, `fd-tab-arrivals|departures|inhouse|rooms`, `fd-tab-<t>-count`, `fd-alert-bar`, `fd-alert-item-<i>`, `fd-alert-more`, `fd-chip-<tab>-<key>`, `fd-table-<tab>`, `fd-row-<reservationId>`, `fd-row-<id>-balance`, `fd-row-<id>-badge`, `fd-row-<id>-expand`, `fd-th-<col>`, `fd-rooms-groupby-<mode>`, `fd-room-tile-<tableId>`, `fd-room-detail-<tableId>`, `fd-room-action-<action>`, `fd-page-error`, `fd-retry-btn`, `fd-rooms-retry-btn`.

### M1 · New Booking (`NewBookingForm.jsx`) — HIGH
No existing-file edits. Source of truth: `plans/CR-385_BOOKING_V2_17_BLUEPRINT.md` + D34/D35/D36/D48-c (v2.28: **no B2B**), D47-h Split at advance.
- Data: `getRatesData({startDate:checkin,endDate:checkout})` (types × plans grid; cell = server rate/night for display only) + `room-availability?checkin&checkout` (free per type; sold-out greys row) — both via `frontDeskService`.
- SEND C5 exactly; **never `rate_per_night`**; `rooms_count: 1`; `advance{amount, method, reference}` only when amount > 0 (+ `split_payments[]` when Split — verify field name against MASTER BQ-10 before wiring; if absent → Split at advance points parks to a follow-up, owner informed).
- Guards (AC-07/G-11/M1-05): `checkin ≥ meta.business_date`, `checkout ≥ checkin + 1` (`min` attrs), `adults ≥ 1`, 10-digit phone, `advance ≤ charge.total_with_gst` (from server preview after create? → no preview endpoint: guard against the grid cell × nights **for the input max only**, the stored figure is the 201 `charge` — documented so nobody mistakes it for pricing), Card/UPI need Txn/UTR (AC-09).
- Save booking → toast → refetch LR → Arrivals row expanded. Save & check in now → open `CheckInForm` for the new reservation with `advance_payment` shown as "already paid" (D35-R3 via `charge.advance_payment`).
- **Verification**: V-M1-01 grid renders from rates + availability fixture; sold-out row disabled · V-M1-02 payload snapshot has no `rate_per_night`, `rooms_count 1` (unit) · V-M1-03 422 "no rate configured" → friendly inline error · V-M1-04 guards (unit) · V-M1-05 E2E preprod: create with ₹1,000 advance → 201; LR row `charge.balance_due = total_with_gst − 1000`; cancel the reservation afterwards (settle what you create) · V-M1-06 B2B note present, no GST inputs.
- **AC**: AC-01, AC-07, AC-09, AC-22. **data-testids**: `booking-form`, `booking-guest-name`, `booking-guest-phone`, `booking-checkin`, `booking-checkout`, `booking-adults`, `booking-children`, `booking-rate-grid`, `booking-cell-<type>-<plan>`, `booking-advance-toggle`, `booking-advance-amount`, `booking-pay-<method>`, `booking-pay-ref`, `booking-b2b-note`, `booking-bill-total`, `booking-bill-sgst`, `booking-bill-cgst`, `booking-ready-pill`, `booking-save-btn`, `booking-save-checkin-btn`, `booking-error`.

### M2 · No-Show / Cancel / Modify — HIGH
**Existing-file edits (D2 inline wrapper — wrapper lines only, zero logic lines)**
| Edit | File · line | Current → New |
|---|---|---|
| E4 | `CancelBookingDialog.jsx` L10 signature `({ target, onClose, onSuccess })` → `({ target, onClose, onSuccess, inline = false })` · L48 `<div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" data-testid="cancel-booking-dialog">` → `<div className={inline ? 'w-full' : 'fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4'} data-testid="cancel-booking-dialog"> {/* CR-385 D2 inline */}` | overlay omitted when `inline`; body unchanged |
| E5 | `NoShowDialog.jsx` L12 signature +`inline = false` · L38–39 root `className="fixed inset-0 z-50 flex items-center justify-center"` → conditional as above | same |
| E7* | `ModifyBookingDialog.jsx` L6 + L69 — **only on OD-385-16 (b)** | same pattern |

Behaviour: `nsOrCancel(row) = row.isOta ? 'noshow' : 'cancel'` (single helper in `frontDeskTransform.js`; OTA = channel ∉ {Direct, WalkIn}) applied at row button, kebab, alert links, search, RoomDetail (AC-13). Money-outcome card read-only from `charge.prepaid_amount / advance_payment`, "Phase 2" ribbon, no penalty maths (DEC-2, G-07). Cancel reasons from `cancellation-reasons` (existing dialog already does). After success → refetch LR + board (X-14).
**Modify (route a — recommended)**: `ModifyBookingForm.jsx` (new) — dates/type/plan/guests + reason; `PATCH …/{id}` with `preview:true` drives "Change vs current" from the server `charge`; final PATCH sends dates/plan only — **no `amount_after_tax`** (G-02, D46-h); browser `today` replaced by `meta.business_date`; guards AC-07/AC-11 (`checkout > checkin`, probe X-05 expects 422 on equal dates — Implementation agent runs it once and records). Existing `ModifyBookingDialog.jsx` untouched (its dead rate code is retired with the page at FU-385-C, not edited here — deviation from D46-h wording, see OD-385-16).
**Verification**: V-M2-01 unit `nsOrCancel` (Direct/WalkIn → cancel; booking.com/makemytrip → noshow) · V-M2-02 inline dialogs render without overlay inside the row; old ArrivalsPage still shows the overlay (screenshot) · V-M2-03 Cancel E2E on a probe booking → LR row gone, counts refetched · V-M2-04 Modify preview payload has `preview:true`, final payload has no `amount_after_tax` (unit + network) · V-M2-05 zero-night guard blocks; server 422 text surfaced · V-M2-06 No-Show button only on OTA rows.
**AC**: AC-05 (read-only card), AC-07, AC-11, AC-13, AC-17 (danger red). **data-testids**: `cancel-booking-dialog` (existing), `noshow-dialog` (existing), `fd-row-<id>-noshow-btn`, `fd-row-<id>-cancel-btn`, `fd-row-<id>-kebab`, `fd-kebab-modify`, `modify-form`, `modify-checkin`, `modify-checkout`, `modify-plan-<code>`, `modify-preview-total`, `modify-preview-delta`, `modify-reason`, `modify-confirm-btn`, `outcome-card`, `outcome-phase2-ribbon`.

### M3 · Check-In (`CheckInForm.jsx`) — CRITICAL · gated on S-411/S-410
No existing-file edits. `CheckInForm` = copy of the **form body** of `CheckInPage.jsx` (state L26–57, `handleCrmLookup` L137, `formValid` L250, `handleConfirm` L263–345 minus `navigate('/pms/in-house')` L341, JSX from the right-panel form L619–897) re-laid out per Check-In v2.17 (D29 two columns: LEFT facts + room/upgrade + ID cards; RIGHT bill + collection, no inner scroll). File header records `// CR-385 M3 — copy of pages/pms/CheckInPage.jsx @<commit> L26–57,137–345,619–897; mirror rule: bug fixes land in both until FU-385-C`. Imports `GuestDocsSection` (unchanged) and `pmsCheckIn` (unchanged; the 3 upgrade fields + `aiosell_reservation_id` are appended by `frontDeskService.checkIn(p)` which wraps `pmsCheckIn`'s FormData — **if `pmsCheckIn` cannot accept extra keys without an edit, the Implementation agent copies the 75-line FormData builder into `frontDeskService.checkIn` rather than editing `pmsService.js`**).
Rules: RIGHT bill = server `charge` from the LR row (rate, upgrade line, SGST, CGST, total, "already paid" = `charge.advance_payment`, collect now Cash/Card/UPI/Split + ref, balance after) — no client maths (M3-03); room chooser lists booked-type rooms + "Show higher categories (upgrade)" (D23) — upgrade Paid → `upgrade_type=paid, upgrade_amount` (server recomputes charge; FE shows the 200 `data.charge`), Complimentary → reason required; **HK rooms selectable** with HK badge + duration (`hkAssignee`, `statusSince`) + amber note, Confirm enabled (N9/D52); **early check-in guard** (N7/D53): read `settings.allow_early_checkin` from profile — when `false` and `row.checkin > meta.business_date` the row's `Check In` is disabled with tooltip "Arrives <date> — modify the booking dates to check in today"; server 422 text always surfaced verbatim; body keeps `booking_for=Individual`, `firm_name/firm_gst` (B2B here, D48-c), `payment_method` when advance > 0 (BUG-411); auto-print toggle default from `settings.auto_print_checkin_receipt` (D32); completion strip + "Ready to check in" pill (D30); on 200 use `data.order_id` + `data.charge` to update the row immediately (M3-05) then refetch LR (X-14).
**Verification**: V-M3-01 FormData snapshot equals `pmsCheckIn` field set + `upgrade_type/upgrade_amount/upgrade_reason/aiosell_reservation_id` (unit) · V-M3-02 `allow_early_checkin=false` + future row → button disabled + tooltip; `=true` → enabled (unit with mocked profile) · V-M3-03 HK room selectable, badge + warning shown (fixture) · V-M3-04 RIGHT pane `scrollHeight === clientHeight` at 1366×768 (Playwright) · V-M3-05 E2E preprod (sandbox, settle after): Direct booking + ₹500 Card advance → check-in with paid upgrade → `data.charge.booking_charge = rate + upgrade`, SGST=CGST, `advance_payment` carried, folio has `Room upgrade: <reason>` line, board tile `occupied` · V-M3-06 early check-in attempt with setting off → 422 message shown verbatim · V-M3-07 CheckInPage (old) unchanged — screenshot diff.
**AC**: AC-01, AC-03, AC-04, AC-09, AC-22 (+ AC-14 late chip "full booking charged"). **data-testids**: `checkin-form`, `checkin-facts-*`, `checkin-room-select`, `checkin-room-option-<tableId>`, `checkin-room-hk-badge`, `checkin-room-hk-warning`, `checkin-upgrade-toggle`, `checkin-upgrade-paid|comp`, `checkin-upgrade-reason`, `checkin-id-card-<i>`, `checkin-id-front|back-<i>`, `checkin-b2b-toggle`, `checkin-gst-name`, `checkin-gst-number`, `checkin-bill-rate`, `checkin-bill-upgrade`, `checkin-bill-sgst`, `checkin-bill-cgst`, `checkin-bill-total`, `checkin-bill-paid`, `checkin-collect-amount`, `checkin-pay-<method>`, `checkin-pay-ref`, `checkin-balance-after`, `checkin-autoprint`, `checkin-progress-ids|room|balance|ready`, `checkin-confirm-btn`, `checkin-early-tooltip`, `checkin-server-error`.

### M4 · Extend Stay (`ExtendStayForm.jsx`, route a) — CRITICAL · gated on S-402
No existing-file edits on route (a). SEND C7 via new `frontDeskService.extendStay({orderId, newCheckoutDate, reason, payment?, discount?, newRestaurantTableId?})`. RIGHT panel (D39 vocabulary): pending balance (`charge.balance_due` from LR) → extension figures **from the server** → total payable → collect now (Cash/Card/UPI/Split + UTR, amount ≤ payable, AC-06) → balance remaining. Preview: none exists → the RIGHT shows *current* `charge` + "Extension priced by the server on confirm; rate table (calendar) / held rate per property setting" until the 200 arrives; then `data.charge` + `nights_detail` lines (`date · ₹rate · chip held/calendar/held_fallback · GST %`) in the confirmation state (D55). If `nights_detail` absent → `nights × ₹avg` labelled **"avg. rate / night"**; `rate_per_night` never multiplied back. 409 → show blocker booking + free same-type rooms from `room-availability` → require `new_restaurant_table_id` before Confirm (M4-02). After 200: toast with `nights_detail` → **refetch LR** (D14) → row/strip from LR only.
**Verification**: V-M4-01 payload snapshot has `payment{}`/`discount{}`/`new_restaurant_table_id` and **no `new_room_price`** (unit) · V-M4-02 `nights_detail` renderer never sums `gst`; totals from `charge` (unit on `probes_2026_09_20_n11` fixture: 8,600 @18 % + 7,400 @5 % → GST 2,188, `total_with_gst 19,688`) · V-M4-03 held-mode fixture → "avg. rate / night" label · V-M4-04 409 fixture → move required, Confirm disabled until a room picked · V-M4-05 **D14 mitigation (G4-02)**: after extend the row balance equals LR `charge.balance_due` (1,500 / 18,188 on the 17,500 sample), not the response · V-M4-06 collect > payable blocked with reason · V-M4-07 E2E preprod extend +1 night on a probe stay (settle with TAB after; restore settings).
**AC**: AC-04, AC-06, AC-09, AC-22. **data-testids**: `extend-form`, `extend-new-checkout`, `extend-reason`, `extend-discount-toggle`, `extend-discount-type|value|reason`, `extend-collect-amount`, `extend-pay-<method>`, `extend-pay-ref`, `extend-pending-balance`, `extend-night-<i>`, `extend-night-<i>-source`, `extend-sgst`, `extend-cgst`, `extend-total-payable`, `extend-balance-remaining`, `extend-avg-rate-label`, `extend-conflict`, `extend-move-room-<tableId>`, `extend-confirm-btn`.

### M5 · In-House / Departures balances + row actions — HIGH · gated on S-421/426/429/430 (+ P-11)
No existing-file edits. `frontDeskService.getRowBalance(row)` = `charge.balance_due` (room) + F&B room orders + transferred orders incl. GST/add-ons — the F&B/transferred part **reuses the verified `pmsService.getInHouseGuests` Step-3 path** (BUG-421/426/429/430) by calling `getInHouseGuests({roomGstApplicable})` once per refresh and joining by `orderId`; one helper → Departures/In-House Balance === Bill Grand Total for the same guest (AC-02/M5-01). "Cleared" pill + disabled Bill when `isCleared(row)` (X-02). Leaving today = `checkout === business_date` and not overdue; overdue days chip; arrived today chip; row actions `Bill · Request HK / Mark Clean · Extend` (F4) — HK via `patchRoomStatus(tableId,'hk'|'available')`. Departed rows disappear on refresh.
**Verification**: V-M5-01 unit: helper on the saved LR + a mocked in-house F&B set → sum to the rupee · V-M5-02 Leaving-today excludes overdue (fixture with `checkout < business_date`) · V-M5-03 cleared fixture (`order_payment_status paid`, `balance_due 0`) → pill + Bill disabled · V-M5-04 E2E: room-service order + transferred F&B on a sandbox stay → In-House balance == Bill grand total (M5-04) · V-M5-05 Request HK → tile `hk`, Mark Clean → `available`, no navigation.
**AC**: AC-02, AC-12, AC-22. **data-testids**: `fd-row-<id>-bill-btn`, `fd-row-<id>-hk-btn`, `fd-row-<id>-extend-btn`, `fd-row-<id>-cleared-pill`, `fd-row-<id>-overdue-chip`, `fd-row-<id>-arrived-chip`, `fd-departures-footer-checked-out`.

### M6 · Bill / Checkout (`FolioCheckoutPanel.jsx`) — CRITICAL · gated on S-425/428 (+ BUG-418 folded in, O-5)
No existing-file edits. Layout B (D1/D14/D15) frozen by the spike (D57/D58):
- Container: expansion row grid `[1fr | 440px]` × **560 px**; RIGHT box `overflow:hidden` with class **`frontdesk-bill`**; `<CollectPaymentPanel … isRoom onOpenSplitBill={null} onToggleComplimentary={null} hasPlacedItems isProcessingPayment orderType orderNumber customer={buildCustomer(detail)} associatedOrders orderFinancials />` with the **same prop mapping as `PmsCheckoutDrawer.jsx` L260–297** (copied into the new file — drawer not edited), panel root `h-full` → header 62 px pinned · body 353 px · Pay 91 px pinned.
- **M6-10 money input**: `roomInfo.roomPaymentSummary.remainingRoomBalance = row.charge.balance_due` and `roomInfo.roomPrice/gstTax/advancePayment` from `charge.booking_charge / (sgst+cgst) / advance_payment` — the BUG-425 hand-override (drawer L271–285) is **not** copied; the panel's displayed room balance must equal the row balance to the rupee (D50). Data per expand = 2 calls: `getGuestFolio(orderId)` (`get-single-order-new` → `orderTransform.fromAPI.order` for items/associatedOrders/orderFinancials) + the LR row already in the snapshot (M6-12).
- **Q6 = (a)**: `frontdesk.css` → `.frontdesk-bill [data-testid="checkout-room-booking-toggle"], .frontdesk-bill [data-testid="checkout-transferred-toggle"], .frontdesk-bill [data-testid="checkout-room-service-toggle"] { display: none; }` (M6-09). **Regression guard test** `hideSectionRows.cr385.test.js`: reads `CollectPaymentPanel.jsx` source and asserts the three testid strings exist (if renamed the rows would silently reappear).
- LEFT statement (own scroll): Guest & stay → ROOM (collapsed heading with total; expanded: booking amount `charge.booking_charge`, `Room upgrade: <reason>` folio line if any, room-discount control **disabled + tooltip "needs BQ-385-07"** (G-09 parked), SGST `charge.sgst`, CGST `charge.cgst` — **two lines, never merged = BUG-418 fix (M6-06)**, already paid `charge.advance_payment`, room balance `charge.balance_due`) → ROOM ORDERS (F&B) from folio `roomOrders` → TRANSFERRED from `associatedOrders`; D12 order on the RIGHT settle rows is the panel's own (F&B → Transferred → Room balance → Grand Total).
- Methods: Cash / Card / UPI / Split / Credit=TAB are the panel's own room-mode tiles (D47/D49) — no new payload code (M6-03); two-step checkout + idempotency = panel's `isProcessingPayment` + server refusing a second payment (M6-04, probe expects 4xx). Zero-balance: Checkout enabled directly (M6-05). Print Bill = panel's `onPrintBill` (existing `handlePrintBill` logic copied from drawer L~200); Print Folio disabled until CR-364-PRINT (OD-385-15). Toast `Checked out · Room N · [Print bill]`, no Undo (D1). On expand: `scrollIntoView({block:'nearest'})` (M6-11). After 200: refetch LR + board → row leaves Departures, tile → `hk`.
**Verification**: V-M6-01 Playwright: box 560, body 353, `Checkout ₹X` inside viewport at 1920×800 and 1366×768, last row too (M6-11) · V-M6-02 three toggles `display:none` inside `.frontdesk-bill`; restaurant checkout drawer (`/dashboard` dine-in) still shows them (M6-09) · V-M6-03 testid regression guard test green · V-M6-04 panel room balance === row balance (fixture + live stay before TAB, M6-10) · V-M6-05 SGST/CGST two lines from `charge` (BUG-418) · V-M6-06 live shapes (i) bare room order (ii) room-service lines (iii) transferred orders — both calls succeed, strip refreshes (M6-12) · V-M6-07 E2E TAB full balance → 200, LR `departed`, `balance_due 0`, ledger row = amount sent, room `hk`, Departures row gone (M6-07); second submit → 4xx not 500 (M6-04) · V-M6-08 POS F&B regression: dine-in bill, split, TAB, coupon/loyalty unchanged (R-02, testing agent + cashier run) · V-M6-09 `PmsCheckoutDrawer` on `/pms/departures` unchanged (screenshot).
**AC**: AC-02, AC-04, AC-08, AC-10, AC-15, AC-19, AC-22. **data-testids**: `bill-panel`, `bill-left`, `bill-right` (class `frontdesk-bill`), `bill-guest-stay`, `bill-room-section`, `bill-room-total`, `bill-room-charge`, `bill-room-upgrade`, `bill-room-discount` (disabled), `bill-room-sgst`, `bill-room-cgst`, `bill-room-paid`, `bill-room-balance`, `bill-fnb-section`, `bill-fnb-total`, `bill-transferred-section`, `bill-transferred-total`, `bill-print-folio-btn` (disabled), `bill-error`, `bill-retry-btn` + the panel's existing testids (`checkout-*`, `pay-btn`).

### M7 · Settings toggles (`RestaurantSettingsPage.jsx` Step 8 "Room & Hospitality") — HIGH (server pricing switch) · owner O-8 (a)
Placement note: the handover says "Step 2 → `basic` tab"; `basic` is the **API payload key** (`data.basic`) — the wizard's Room settings live in **Step 8** (`RestaurantSettingsPage.jsx` L762–784, `step8` → `basic.room_*`). `auto_print_checkin_receipt` is **not** wired in the FE today (grep 0 hits) → the two new controls form their own card. Step 8 is `conditional: true` (shown when room billing is on) — same visibility as the existing room toggles.
| Edit | File · line | Current → New |
|---|---|---|
| E8a | `restaurantSettingsTransform.js` L184–187 `step8: { roomGstApplicable: toBool(basic.room_gst_applicable), … roomOtpRequire: toBool(basic.room_otp_require),` | append inside `step8`: `allowEarlyCheckin: toBool(basic.allow_early_checkin ?? basic['pms.allow_early_checkin']), extendRateMode: (basic.extend_rate_mode ?? basic['pms.extend_rate_mode']) === 'held' ? 'held' : 'calendar', // CR-385 M7` |
| E8b | `restaurantSettingsTransform.js` L283–285 `room_gst_applicable: toYesNo(s8.roomGstApplicable), …` | append inside `basic`: `allow_early_checkin: s8.allowEarlyCheckin ? 1 : 0, extend_rate_mode: s8.extendRateMode === 'held' ? 'held' : 'calendar', // CR-385 M7` (**verify the boolean encoding the backend accepts — `run_n7n8.py::settings_set` used JSON `true/false`; the Implementation agent probes `1/0` vs `true/false` once and records in the QA handover**) |
| E9a | `RestaurantSettingsPage.jsx` L86–87 `step8: { roomGstApplicable: false, …, billingEmployee: false, }` | `+ allowEarlyCheckin: false, extendRateMode: 'calendar', // CR-385 M7` |
| E9b | `RestaurantSettingsPage.jsx` after L777 (`</SectionCard>` of "Guest & Booking Options") | insert `<SectionCard title="Front Desk rules" desc="Check-in and extension pricing policy"> {/* CR-385 M7 */}` with `<Toggle label="Allow early check-in" hint="Let staff check a guest in before the booked arrival date. Off = check-in blocked until the business date reaches the booking." checked={s8.allowEarlyCheckin} onChange={v => updateStep('step8','allowEarlyCheckin',v)} testId="toggle-allow-early-checkin" />` and a two-option radio `Extension pricing`: **Rate table (calendar)** — help "Extra nights are priced from the rate calendar for each date; GST is applied per night." (D55) / **Held rate** — help "Extra nights keep the rate held at check-in." (`testId` `radio-extend-rate-mode-calendar|held`) |
Write path unchanged: `updateSettings` → multipart `data=` (C10). After save the page already re-reads profile (BUG-337 L285–292) → Front Desk reads the new values on its next snapshot (M7-03). 422 on bad value → existing error toast.
**Verification**: V-M7-01 unit: `fromAPI` maps `allow_early_checkin`/`pms.*` alias; `toAPI` emits both keys (transform test) · V-M7-02 Playwright: toggles render in Step 8, Save → network request is multipart with `data` containing both keys · V-M7-03 E2E preprod: set early=on → profile shows `true` → set back to `false`; set mode=held → profile `held` → back to `calendar` (**restore defaults every run**, R25 sandbox rule) · V-M7-04 regression: existing Step 8 toggles + wizard save still work (`toggle-room-gst-applicable` round-trip) · V-M7-05 Front Desk consumes the setting (V-M3-02 with real profile).
**AC**: AC-17 (copy), AC-20. **data-testids**: `toggle-allow-early-checkin`, `radio-extend-rate-mode-calendar`, `radio-extend-rate-mode-held`, `frontdesk-rules-card`.

---

## 5. Gap mapping G-01…G-56 (P-05) and AC → test (P-06)

| Gap(s) | Module / task | Gap(s) | Module / task |
|---|---|---|---|
| G-01 charge single source | M0 `money.js`, M1/M3 display | G-29 Booking v2.28 | M1 |
| G-02 Modify amount | M2 ModifyBookingForm (`preview:true`, no amount) | G-30 Extend v2.20 | M4 |
| G-03 extend base | M4 server `charge` | G-31 Modify v2.21 | M2 |
| G-04 row balance | M5 helper | G-32 No-Show/Cancel v2.22 | M2 inline dialogs |
| G-05 badge | M0 `badgeFor(charge, pah, status)` | G-33 Bill Layout B | M6 |
| G-06 SGST/CGST | M6 LEFT ROOM + M3/M4 bills | G-34 error/retry | M0 |
| **G-07 refund arithmetic** | **PARKED Phase 2** (BQ-13/DEC-2) — M2 shows ribbon | G-35 sortable sticky | M0 GuestTable |
| G-08 D15 ROOM order | M6 LEFT | G-36…G-43 terminology/dates/money | M0 `money.js` + copy sweep, X-07/X-08 |
| **G-09 room discount** | **PARKED Phase 2** (BQ-07) — M6 disabled stub | G-44 a11y | all (X-11) |
| G-10 extend collect ≤ payable | M4 guard | G-45 Split tile | M6 (panel's own) |
| G-11 booking/modify guards | M1/M2 | G-46 cumulative advance | M0 chip rule, M3 "already paid", M6 "Paid so far" |
| G-12 split + credit | M6 (panel room mode) | G-47 forbidden fields | Step-5 grep guard + code review |
| G-13 card/UPI reference | M1/M3/M4 | G-48 early check-in | M3-09 + M7 |
| G-14 two-step idempotent | M6-04 | G-49 extension pricing | M4-05 + M7 |
| G-15 no default method | M1/M3/M4 pills (no Cash default, D24) | G-50 HK-room check-in | M3-02 |
| G-16 zero-night | M1/M2 guard + X-05 probe | G-51 LR window/view=all | M0 service |
| G-17 leaving-today/counts | M0 counts, M5 chips | G-52 board meta | E3c |
| G-18 EITHER/OR | M2 `nsOrCancel` | G-53 BUG-418 | M6-06 |
| G-19 late chip | M0 bucket (checkin < business_date, pending) | G-54 booking_for | M3 (kept) |
| G-20 per-folio state | M6 (panel state per expansion mount) | G-55 server GST slab | all (no client GST) — tests assert display = `charge.sgst/cgst` |
| G-21 Turns / Area | M0 RoomsPanel | **G-56 multi-room** | **PARKED** (K1 ON HOLD) — M1 `rooms_count 1` |
| G-22 Room Detail + transform | M0 RoomDetail + E3 | G-23 alert bar | M0 |
| G-24 one workstation | M0 | G-25 common row | M0 |
| G-26 search | M0 | G-27 header | M0 |
| G-28 Check-In v2.17 | M3 | | |

Parked explicitly: **G-07, G-09, G-56** (as the checklist P-05 anticipates).

| AC | Test (matrix ref) | AC | Test |
|---|---|---|---|
| AC-01 | V-M1-02, V-M3-01/05 (server `charge` only) | AC-12 | V-M0-02, V-M5-02 |
| AC-02 | V-M5-01/04, V-M6-04 | AC-13 | V-M2-01/06 |
| AC-03 | V-M0 badge unit (`badgeFor` on fixture: prepaid_amount>0 → Prepaid; pah → PAY AT HOTEL; advance_payment>0 → chip) | AC-14 | V-M0 late-bucket unit + chip copy |
| AC-04 | V-M6-05, V-M3-05, V-M4-02 | AC-15 | V-M6 open bill A → close → open bill B → panel state reset (Playwright) |
| AC-05 | V-M2 outcome card read-only + ribbon | AC-16 | V-M0-04 + Turns fixture |
| AC-06 | V-M4-06 | AC-17/18 | copy sweep + testing-agent glossary check |
| AC-07 | V-M1-04, V-M2-05 | AC-19 | V-M3-04, V-M6-01 |
| AC-08 | V-M6-07 (TAB) + panel Split rows sum (existing panel behaviour, R-02) | AC-20 | V-M0-10 |
| AC-09 | V-M1-04, V-M3-01, V-M4-01 (ref required for card/UPI) | AC-22 | grep guard X-01 + V-M5-03 cleared helper unit + V-M6-04 |
| AC-10 | V-M6-07 second submit 4xx | AC-11 | V-M2-05 + X-05 probe | 

---

## 6. Step 4 — Verification matrix (seeds the QA handover)

| # | Module | File(s) | Change | How to verify | Automated? |
|---|---|---|---|---|---|
| 1 | M0 | `App.js` L110/L271, `Sidebar.jsx` L245 | route + item | Browser: item visible, `/pms/front-desk-v2` renders; `/pms/front-desk` unchanged | NO (screenshot) |
| 2 | M0 | `roomStatusTransform.js` E3a–c + test E3d | additive fields | `craco test roomStatusTransform` — old + new payload | YES |
| 3 | M0 | `frontDeskTransform.js` | row model, buckets, `normaliseTitle`, `nsOrCancel`, `isTurn` | `frontDeskTransform.cr385.test.js` on the saved probe JSON (counts 10/2/2; 5 titles; double-space) | YES |
| 4 | M0 | `money.js` | `isCleared`, `badgeFor`, `fmtINR` (en-IN, 2 dp when fractional, `−₹X`), `fmtDate`, `plural` | `money.cr385.test.js` | YES |
| 5 | M0 | `frontDeskService.js` | `getSnapshot` allSettled; LR window always sent | `frontDeskService.cr385.test.js` (axios mock: board reject → `boardError`, LR ok) | YES |
| 6 | M0 | `GuestTable.jsx` | sticky th, sort, keyboard, one-open, scrollIntoView | Playwright at 1366×768: header top === container top; `↑↓ Enter Esc` | NO (testing agent) |
| 7 | M0 | page | LR fail → error+Retry; board fail → Rooms degrade | mocked 500s (msw / axios mock in test) | YES |
| 8 | M0 | all new | grep guard `balance_payment|remaining_room_balance|\* 0.05|\* 0.18|toISOString|new Date\(\)\.get` in `components/pms/frontdesk` + `frontDeskService.js` → empty | bash | YES |
| 9 | M1 | `NewBookingForm.jsx` | payload has no `rate_per_night`, `rooms_count 1`, advance only when > 0 | unit snapshot | YES |
| 10 | M1 | same | guards + 422 friendly error + B2B note | unit + Playwright | YES/NO |
| 11 | M1 | preprod | create → LR `balance_due = total − advance` → cancel | curl/runner (settle) | YES (script) |
| 12 | M2 | `CancelBookingDialog.jsx` E4, `NoShowDialog.jsx` E5 | `inline` wrapper | old ArrivalsPage overlay unchanged (screenshot) + inline render in row | NO |
| 13 | M2 | `ModifyBookingForm.jsx` | `preview:true`; final PATCH without `amount_after_tax`; **verb PATCH (R25)** | unit snapshot + network tab | YES/NO |
| 14 | M2 | probe | X-05 zero-night → 422 | curl once, record | YES (script) |
| 15 | M3 | `CheckInForm.jsx`, `frontDeskService.checkIn` | FormData superset of `pmsCheckIn` | unit snapshot | YES |
| 16 | M3 | same | early-check-in guard from profile setting; HK badge/warning | unit with mocked profile/board | YES |
| 17 | M3 | same | RIGHT no inner scroll 1366×768 | Playwright | NO |
| 18 | M3 | preprod | booking + advance → check-in + paid upgrade → `charge` & folio line; 422 verbatim when early off | runner (`run_n7n8.py::checkin` pattern) + UI | YES/NO |
| 19 | M4 | `ExtendStayForm.jsx`, `frontDeskService.extendStay` | payload (no `new_room_price`) ; **POST** (backend-defined action, verified) | unit | YES |
| 20 | M4 | same | `nights_detail` renderer (never sums gst), avg label, 409 move flow | unit on n11 fixture | YES |
| 21 | M4 | same | **D14 mitigation (G4-02)**: row from LR refetch, not response | unit (mock response ≠ LR) + preprod 1,500/18,188 | YES/NO |
| 22 | M5 | `frontDeskService.getRowBalance` | balance = charge + F&B + transferred | unit + preprod M5-04 | YES/NO |
| 23 | M5 | panels | leaving-today/overdue/cleared/HK actions | unit + Playwright | YES/NO |
| 24 | M6 | `FolioCheckoutPanel.jsx`, `frontdesk.css` | 440×560 box, body 353, Checkout visible both viewports incl. last row | Playwright metrics | NO |
| 25 | M6 | `frontdesk.css` + `hideSectionRows.cr385.test.js` | 3 toggles hidden; testids still exist in panel source; restaurant drawer shows them | unit (source grep) + Playwright | YES/NO |
| 26 | M6 | `FolioCheckoutPanel.jsx` | `roomInfo` from `charge` (no BUG-425 override); panel balance === row balance | unit + live stay | YES/NO |
| 27 | M6 | LEFT | SGST + CGST two lines (BUG-418) | Playwright | NO |
| 28 | M6 | preprod | TAB E2E (M6-07) + second submit 4xx (M6-04) + shapes (i)(ii)(iii) (M6-12) | runner + UI | YES/NO |
| 29 | M6 | POS | F&B checkout regression (dine-in, split, TAB, coupon) — panel shared | testing agent + cashier | NO |
| 30 | M7 | `restaurantSettingsTransform.js` E8a/b | mapping both ways (+ alias) | transform unit test | YES |
| 31 | M7 | `RestaurantSettingsPage.jsx` E9a/b | controls render; Save is multipart `data=` with both keys; existing Step 8 toggles unaffected | Playwright + network | NO |
| 32 | M7 | preprod | profile flips on save; **restore `allow_early_checkin=false`, `extend_rate_mode=calendar`** | runner (`run_n7n8.py::settings_set`) | YES (script) |
| 33 | all | all | zero console errors at 1920×800 + 1366×768; every interactive element has a unique `data-testid` | testing agent | NO |
| 34 | all | registry | Step 5 checklist executed | python assert (AGENT_PROMPT EXIT GATE) | YES |

Update-endpoint verbs (R25 mandatory line): Modify = **PATCH** `local-reservations/{id}` · room status = **PATCH** `room-status/{id}` · settings = **POST** multipart `update-settings` (documented backend quirk, existing wizard path) · check-in / extend / cancel / no-show / TAB / direct-reservation = **POST** actions (create or backend-defined action endpoints, all curl-verified 2026-09-20).

---

## 7. Step 5 — Post-code registry checklist (Implementation agent executes after coding, per module and at the end)
```
- [ ] registry.json: CR-385 → status "GATE_5A_IMPLEMENTED (M0…Mn)", sprint_key pos_pms_2, files[] = actual list, status_history entry per module
- [ ] registry.json: BUG-418 → status "IMPLEMENTED via CR-385 M6" when M6 lands (O-5)
- [ ] CR_REGISTRY.md row CR-385 updated (module progress) · BUG_TRACKER.md row BUG-418 updated
- [ ] FILE_OWNERSHIP.md: every NEW file + E1…E9 listed with "CR-385 <module> IMPL <date>"
- [ ] Code markers: `// CR-385 <module>` in every new file header and at every E-edit line (R18)
- [ ] Copy headers: RoomTile.jsx / CheckInForm.jsx record source file + line range + commit (mirror rule, FU-385-C diff)
- [ ] Grep guards empty: `grep -rn "balance_payment\|remaining_room_balance\|\* 0.05\|\* 0.18\|toISOString" frontend/src/components/pms/frontdesk frontend/src/api/services/frontDeskService.js frontend/src/api/transforms/frontDeskTransform.js`
- [ ] Hotspot guard: `git log -1 --format=%H -- frontend/src/components/order-entry/CollectPaymentPanel.jsx frontend/src/api/transforms/orderTransform.js frontend/src/api/services/pmsService.js` unchanged since Gate 4 GO
- [ ] Locked design untouched: `sha256sum frontend/public/cr385-frontdesk-mockup.html` unchanged
- [ ] `yarn test --watchAll=false --testPathPattern=cr385` green; `yarn build` 0 new warnings
- [ ] Sandbox restored: settings defaults (allow_early_checkin=false, extend_rate_mode=calendar, auto_print_checkin_receipt=false); every test stay settled with TAB; test reservations cancelled
- [ ] QA handover written from §6 (Verification Matrix inherited) + audit note for CRITICAL modules (M3/M4/M6/M7)
- [ ] Master checklist rows M0-01…M7-04, X-01…X-15, R-01…R-08 ticked with evidence (only what was done)
```

---

## 8. Risk register (R15–R26 carried from IA Rev 4 + plan-level)

| R | Risk | Status / mitigation in this plan | Owner |
|---|---|---|---|
| R15 | `CollectPaymentPanel` regression from embedding | **RETIRED by spike (D57)** — zero edits; host CSS only; guard test M6-09; POS regression matrix #29 | FE/QA |
| R16/R17 | closed at Rev 3.1 | — | — |
| R18 | Copy drift (`RoomTile`, `CheckInForm`) vs sources | copy headers with source line ranges; mirror rule until FU-385-C; Cancel/No-Show use `inline` (no copy) | FE |
| R19 | Shared-file bugs leak into new page | B-7 smoke gates M3/M4/M5/M6 (§0.2 ordering); copies taken after smoke | QA |
| R20 | Business date / timezone | `meta.business_date` only; grep guard #8 | FE |
| R21 | Refresh-on-focus staleness | focus + manual ↻ + after-action refetch (P-09); `loadedAt` shown in the sync pill | FE |
| R22 | Split state height in 560 px | **RETIRED** — N/A in room mode (`onOpenSplitBill={null}`), D57 | — |
| R23 | Money from two sources | `money.js` single entry; forbidden-field grep; M6-10 feeds `charge` into the panel | FE |
| R24 | Backend build drift before prod | G4-01 full re-run on the final build; R-01 before each module's Gate 5 | FE |
| R25 | Shared sandbox | pick rooms from the live board / `room-availability`; settle + restore every run (§7) | FE/QA |
| R26 | Single-session preprod token | re-login per probe run; UI 401 → existing re-login | FE |
| **R27** NEW | `payment_status` path (per room line, not top-level) mis-read → wrong "Cleared" | `isCleared` reads `rooms[0].order_payment_status`; unit test on probe JSON; OG-PMS-028 | FE |
| **R28** NEW | Legacy Extend/Modify dialogs re-used with client maths (violates D50) | OD-385-16 — recommended new forms; either way no `new_room_price` / `amount_after_tax` leaves the Front Desk | Owner/FE |
| **R29** NEW | Settings boolean encoding (`1/0` vs `true/false`) on multipart write | probe once at M7 start; record in QA handover (#30/#32) | FE |
| **R30** NEW | Step 8 is `conditional` — M7 controls invisible when room billing off | acceptable (PMS-only setting); note in help text; owner informed | Owner |

---

## 9. Owner Decision Queue (R3 — not guessed)

| # | Decision | Options | Recommendation / default if silent |
|---|---|---|---|
| **OD-385-16** | Extend Stay + Modify Booking: reuse the existing dialogs with `inline` (D2) **or** new Front-Desk forms? The existing `ExtendStayDialog` (L13 browser `today`, L19–47 client `rate × nights`, L63 `new_room_price`) and `ModifyBookingDialog` (L28–32 client totals, L50 `amount_after_tax`) contradict D50/G-02/G-03/C7; an `inline` wrapper cannot fix that without logic edits (beyond D2's "wrapper-only, ~5 L" grant). | **(a)** new `ExtendStayForm.jsx` + `ModifyBookingForm.jsx` under `components/pms/frontdesk/`, new-contract service calls; the 2 legacy dialogs stay untouched for the old pages (retire at FU-385-C). Net: **fewer** existing-file edits. **(b)** keep D2: `inline` wrapper **plus** logic edits inside the 2 dialogs (new payload, server figures, business date) → old pages change behaviour too (OD-385-12 breach) → needs BUG-402 re-QA. | **(a)**. Default if silent: (a). Cancel + No-Show keep D2 `inline` (their logic is contract-compliant). |
| OD-385-17 | M7 placement: Step 8 "Room & Hospitality" (where `room_*` settings live) vs Step 2 "Printer" `basic` tab (handover wording) | (a) Step 8 new card "Front Desk rules" · (b) Step 2 | **(a)** — `basic` in the handover is the payload key, not the tab. Default: (a). |
| OD-385-18 | Split at advance points (M1/M3/M4, D47-h) — payload field for split legs not yet in MASTER for `direct-reservation.advance` / check-in / extend `payment` | (a) probe backend; if unsupported, ship single-method advance now and park Split-at-advance to a follow-up · (b) block M1/M3/M4 until answered | **(a)**. Default: (a). |

---

## 10. Execution order & gating summary
```
M0 (shell)  → M1 (booking) → M2 (no-show/cancel/modify)      — independent of B-7; start right after Gate 4 GO
M3 (check-in)  after S-411 · S-410                              — CRITICAL
M4 (extend)    after S-402 (+ OD-385-16)                        — CRITICAL
M5 (balances)  after S-421/426 · S-429/430 · P-11 CR-368 triage
M6 (bill)      after S-425/428 · P-11                           — CRITICAL · BUG-418 closes here
M7 (settings)  any time after M0 (small, independent)           — restore defaults after every test
Each module: code → §6 rows → Step 5 checklist → QA handover section → testing-agent pass at 1920×800 + 1366×768.
```

## 11. Gate status after this plan
- **Gate 3 remains OPEN.** Closes only on the owner's words **"close Gate 3"** (quote + date → P-12, G4-06, DESIGN_DECISIONS, registry).
- Checklist rows ticked by this plan with evidence: P-04, P-05, P-06, P-07, P-08, P-09, G4-08, G4-09 (evidence `evidence/CR-385/probes_2026_09_20_g4_09/`).
- **G4 rows still open** (needed before "Gate 4 GO"): G4-01 (final regression re-run), G4-02 (D14 fix or owner waiver — mitigation present in matrix #21), G4-03 (N11 boundary probes — backend sandbox help), G4-04 (B-7 smoke §S), G4-06 (owner "close Gate 3"), G4-07 (BQ-385-19 — **FE fallback accepted in §3 D-rules; owner to confirm acceptance**), G4-10 (owner "Gate 4 GO").
