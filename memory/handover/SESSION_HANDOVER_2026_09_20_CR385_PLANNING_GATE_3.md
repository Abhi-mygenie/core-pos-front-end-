# CR-385 · PLANNING handover (Gate 3) — written 2026-09-20, for the next PLANNING agent

```
Item:        CR-385 PMS Front Desk — Unified Tabbed Workstation · P1 · HIGH · code_reality NONE · blast LARGE · sprint_key pos_pms_2
Gate:        2.6 CLOSED by owner 2026-09-20 (D54)  →  **3 OPEN** (Implementation Plan). registry.json: gate 3, gate_2_6_closed 2026-09-20.
             Gate 3 milestone A (D5 spike) **DONE** 2026-09-20 (D57/D58) — Q6 = (a) settled. Milestone B = YOUR job: write the plan. Gate 3 closes only with the plan + owner "close Gate 3" (D58).
Your role:   PLANNING (AGENT_PROMPT_ALPHA Role 2, stage = "implementation_plan": Step 3 + Step 4 + Step 5). NO application code in src/ until owner says "close Gate 3" AND "Gate 4 GO".
Owner style: short imperative messages; decides with option letters ("08 a 04 ok"); wants nothing missed → everything is a ticked checklist with evidence. Never flip a gate yourself (R4).
Entry point: this file. Older handover of the same day (…_GATE_2_6_CLOSED.md) is superseded but still accurate.
```

## 0. Boot order (read in this order, ~20 min)
| # | Read | Why |
|---|---|---|
| 1 | `control/AGENT_PROMPT_ALPHA.md` → Role 2 (L480–588), rules R0–R25 (L1475+), R17 registry sync | governance you are bound by |
| 2 | `control/CONTROL_DASHBOARD.md` (top lines) · `control/CR_REGISTRY.md` row CR-385 · `control/registry.json` item CR-385 (`files`, `owner_decisions_locked`, `gate_4_preconditions`, `status_history`) | current state of record |
| 3 | `plans/CR-385_DESIGN_DECISIONS.md` — **D1…D56**; binding. Skim all, read D1/D2/D5 (bill layout, inline prop, spike), D23 (check-in), D37–D39, D44 (terminology), D46 (DEC-1…9), D48 (N1–N5), D50 (money contract), D52–D56 (N7/N8/N9, settings, gate close, N11 rules, Gate-4 preconditions) | the rules you plan against |
| 4 | `impact/CR-385_IMPACT_ANALYSIS_REV4_GATE_2_6_FINAL.md` — Gate 2.6 closure evidence: gap register G-01…G-56, backend gaps B-1…B-10, blockers B-1…B-9, risks R15–R26, AC coverage, §7 + post-closure addendum | your Step 3 input; verify its file/line refs still hold (Step 0 of stage dispatch) |
| 5 | `plans/CR-385_IMPLEMENTATION_ACCEPTANCE_CRITERIA.md` AC-01…AC-22 (+ `public/cr385-acceptance-criteria.html`) | what QA will test; your verification matrix must cover every AC |
| 6 | `backend_briefs/BACKEND_BRIEF_CR-385_MASTER.md` **v1.9** — §1 tracker BQ-385-01…19, one section per BQ with inline backend answers + our verification, §6 change log, §10 build-3 re-check + N7/N8/N11/D14 | the API contract; every payload/response shape you need |
| 7 | `public/cr385-master-checklist.html` (open in the preview: `<REACT_APP_BACKEND_URL>/cr385-master-checklist.html`) — sections P, X, M0…M7, R, **G4**, O, S | the tick-list; ticks persist in localStorage, HTML `checked` = defaults |
| 8 | `public/cr385-frontdesk-mockup.html` **v2.28** (owner-accepted, LOCKED) — views: `?view=arrivals|departures|inhouse|rooms`, `?bill=103`, `?checkin=…`, `?extend=…`, `?booking=1`, `?noshow=…`, `?cancel=…` | the design you implement; do not change without owner |
| 9 | Blueprints: `plans/CR-385_BOOKING_V2_17_BLUEPRINT.md`, `plans/CR-385_EXTEND_STAY_V2_19_BLUEPRINT.md`, `plans/CR-385_NOSHOW_CANCEL_V2_22_BLUEPRINT.md`, `plans/CR-385_UX_FLOW_GATE_2_4.md`, `plans/CR-385_DESIGN_GAP_CHECKLIST.md` | per-surface field/flow detail |
| 10 | `impact/CR-385_DATA_INVENTORY.md` · `control/OPEN_GAPS_REGISTER.md` (OG-PMS-001…027) · `control/FILE_OWNERSHIP.md` (hotspots) | data contract + conflict pre-check |
| 10b | **`evidence/CR-385/spike/MEASUREMENTS.md`** + 10 screenshots — the D5 spike result (container numbers, Q6, scroll-on-expand, sticky rule). Read before planning M6/M0 | frozen inputs to the plan (D57/D58) |
| 11 | Evidence: `evidence/CR-385/probes_2026_09_20_gate4/PROBE_REPORT.md` (+ `build3/`), `probes_2026_09_20_n7n8/PROBE_REPORT.md`, `probes_2026_09_20_n11/PROBE_REPORT.md`, backend replies in `evidence/CR-385/backend_replies/` | real payloads/responses — copy shapes from here, not from memory |
| 12 | Intake: `change_requests/CR-385_PMS_FRONTDESK_UNIFIED_WORKSTATION_UX_REVAMP_INTAKE.md` (footer = gate history) | original scope + owner intent |

## 1. What is settled (do not re-open)
- **Design:** mockup v2.28 owner-accepted; Gate 2.5 closed 2026-09-19. Terminology D44 (Arrivals / Departures / In-House / Rooms; "Bill" not "Checkout" on rows).
- **Money contract (D50 / AC-22, frozen):** display only `charge.*` from `local-reservations` / check-in / extend responses: `rate_per_night, nights, upgrade_amount, booking_charge, sgst, cgst, total_with_gst, prepaid_amount, advance_payment (cumulative), balance_due`. Cleared ⇔ `payment_status == 'paid' && balance_due == 0`. **Never** `balance_payment`, folio `remaining_room_balance`, client GST or client pricing. GST = two lines from `charge.sgst/cgst`.
- **Backend:** build 3 verified end-to-end (D1–D13 fixed, BQ-16 server pricing, BQ-15 TAB checkout). N7/N8 shipped as property settings (`allow_early_checkin` default false → 422; `extend_rate_mode` calendar|held, default calendar) — BQ-17/18 verified. **N11 fixed** (per-night GST slab, `nights_detail[]` on calendar extend). **No open backend blocker.** Open P2 only: **D14** (calendar extend *response* `charge.advance_payment/balance_due` omit the same-call payment — LR correct), **BQ-385-19** (`nights_detail` on LR list), N10 (`received_by null`).
- **Owner decisions (all answered):** DEC-1…9 (D46), N1–N5 (D48), N7 block early check-in / N8 rate table / N9 allow HK-room check-in with warning (D52/D53), O-4 BUG-384/404/413 closed by decision, O-5 BUG-418 folded into **M6**, O-6 additive `roomStatusTransform` fields OK, **O-8 = (a)** settings toggles on the existing settings page → **module M7** (D54).
- **Spike outcomes (D57/D58, frozen):** unmodified `CollectPaymentPanel` fits the RIGHT box 440 × 560 px (`overflow:hidden`, panel `h-full`): header 62 px pinned, scroll body **353 px**, Pay block 91 px pinned; Checkout visible at 1920×800 and 1366×768; Payment Method visible without scroll in default state. **Q6 = (a) host CSS** hides `[data-testid="checkout-room-booking-toggle"|"checkout-transferred-toggle"|"checkout-room-service-toggle"]` inside `.frontdesk-bill` — owner: "we don't need duplicate" (regression guard M6-09). Split state N/A in room mode (`onOpenSplitBill={null}`). **Scroll-on-expand** (`scrollIntoView({block:'nearest'})`) for low rows at 768 — no height clamping (M6-11). Sticky `<th>` pins to the scroll container's padding edge → no top padding (M0-03). Panel money input from `charge.balance_due / total_with_gst` (LR), retire the BUG-425 override (M6-10). Live shapes to verify in M6: room-service lines, transferred orders (M6-12).
- **OD-385-12 exceptions granted (existing files that MAY be edited, wrapper/additive only):** `inline` prop on `ExtendStayDialog / ModifyBookingDialog / CancelBookingDialog / NoShowDialog` (~5 L each, D2) · `api/transforms/roomStatusTransform.js` additive fields (`hk_assignee`, `guest.phone/email`, `meta`) (O-6) · `App.js` +1 import +1 route · `Sidebar.jsx` +1 item "Front Desk (Beta)" (OD-385-14 a) · **M7:** `pages/RestaurantSettingsPage.jsx` (Step 2 → `basic` tab) + `api/services/restaurantSettingsService.js` / `api/transforms/restaurantSettingsTransform.js` additive keys. Everything else is NEW files under `components/pms/frontdesk/` + `pages/pms/FrontDeskWorkstationPage.jsx` + `api/services/frontDeskService.js` (see registry `files`).
- **Files you must NOT touch:** `components/order-entry/CollectPaymentPanel.jsx` (3,331 L, hotspot — imported, never edited; Q6 hide-sections mechanism decided by the spike), `api/transforms/orderTransform.js`, old PMS pages (`ArrivalsPage`, `DeparturesPage`, `InHouseGuestsPage`, `RoomStatusPage`, `CheckInPage`, `NewBookingPage`, `GuestFolioPage`, `PmsCheckoutDrawer`) — they stay live until FU-385-C retires them.

## 2. Gate 3 work — exact sequence
| Step | Task | Output | Owner touch-point |
|---|---|---|---|
| 3.0 | ~~Ask owner go-ahead to start the spike~~ | **DONE** — owner: "ok go ahead only for d5 spike test…" | ✓ |
| 3.1 | ~~**P-02 D5 spike (½ day):**~~ **DONE 2026-09-20** → scratch route, dummy `GuestTable`, one `ExpandableRow`, real `CollectPaymentPanel` (room mode) in a 560 px box. Measure at 1920×800 and 1366×768: expand/collapse, inner scroll, pinned Settle/Checkout visible, sticky `<th>`, `↑↓ Enter`, Split-state height (v2.27: 352–395 px), OG-PMS-021 (Payment Method lives inside the scroll body L1321–3297; only Pay button pinned). | `evidence/CR-385/spike/MEASUREMENTS.md` + A1…H1 screenshots; scratch deleted, `App.js` reverted, `git status` 0 src changes | P-02 ✓ G4-05 ✓ |
| 3.2 | ~~**P-03 Q6 mechanism**~~ **DONE** — (a) host CSS, owner confirmed | D57 | P-03 ✓ |
| **3.3 ← START HERE** | **Step 0 Code Reality + Step 1 Conflict Pre-Check** (`grep -rn "CR-385" src/` → must be NONE; FILE_OWNERSHIP last modifiers of the OD-385-12 files; registry items ≠ CLOSED touching them, e.g. BUG-402/410/411/425/428 on CheckInPage / ExtendStayDialog / CollectPaymentPanel) | header of the plan | — |
| 3.4 | **P-04 `plans/CR-385_IMPLEMENTATION_PLAN.md`** — modules **M0 shell → M1 Booking → M2 No-Show/Cancel/Modify → M3 Check-In → M4 Extend → M5 In-House/Departures → M6 Bill/Checkout → M7 Settings**; per module: exact edits (file · line · current → new), verification steps, AC mapping, data-testids; **Step 4 verification matrix** (automated vs manual; seeds QA); **Step 5 post-code registry checklist**; risk register R15–R26; execution sequence (M0–M2 first — independent of B-7; M3–M6 gated on §S smoke); **scope lock** (files WILL change / will NOT touch — list above) | the plan + `public/cr385-master-checklist.html` P-04…P-09 ticked | — |
| 3.5 | **P-08 data-contract sheet** inside the plan (see §4 below — G4-08 lists the mandatory entries) | plan §Data contract | tick P-08, G4-08 |
| 3.6 | **G4-09** pull real Rooms › Area `sections[].title` from `room-status-board` (only "patal lok" confirmed) | plan M0 fixture | tick G4-09 |
| 3.7 | Sync registries (R17): registry.json CR-385 `implementation_plan` path + status "GATE 3 — plan ready, awaiting owner close"; CR_REGISTRY row; CONTROL_DASHBOARD header; handover | — | — |
| 3.8 | Owner: **"close Gate 3"** → record quote (P-12, G4-06) → then owner **"Gate 4 GO"** only after **every G4 row** is ticked or waived (D56) | — | owner |

## 3. Gate 4 GO preconditions — HARD (D56; `public/cr385-master-checklist.html#g4`)
| # | Precondition | How to satisfy |
|---|---|---|
| G4-01 | Full regression on the **final** backend build | re-run `probes_2026_09_20_gate4/run_gate4.py`, `probes_2026_09_20_n7n8/run_n7n8.py`, `probes_2026_09_20_n11/run_n11.py` in one sitting → new `evidence/CR-385/probes_<date>_final/PROBE_REPORT.md`, all green |
| G4-02 | D14 fixed + verified **or** owner waiver + D55 mitigation in the matrix | expect calendar extend response `advance_payment 1500 / balance_due 18188` on the 17,500 sample |
| G4-03 | N11 boundary probes: cheap night (< 7,500), `held_fallback`, room-type change on extension, shorten stay | ask backend for a sandbox date/rate that makes them reachable; extend `run_n11.py` |
| G4-04 | B-7 smoke §S complete (402 · 410 · 411 · 421 · 425 · 426 · 428 · 429/430) or waived per bug | owner/QA on preprod; evidence per row |
| G4-05 | ~~D5 spike evidence + Q6 decision, no `src/` leftovers~~ **✓ DONE 2026-09-20** | `evidence/CR-385/spike/MEASUREMENTS.md`, D57 |
| G4-06 | Implementation Plan complete + owner "close Gate 3" quote | §2 step 3.4 / 3.8 |
| G4-07 | BQ-385-19 answered or FE fallback (room total + nights + "avg. rate / night" after reload) accepted in the plan | MASTER BQ-19 |
| G4-08 | Data-contract sheet carries the 2026-09-20 learnings | §4 |
| G4-09 | Real Rooms › Area section titles | §2 step 3.6 |
| G4-10 | Owner "Gate 4 GO" quote + date in DESIGN_DECISIONS + registry `gate_4_go` | owner |

## 4. Data-contract facts you must carry into the plan (verified on preprod 2026-09-20)
- **Auth:** `POST /api/v1/auth/vendoremployee/common-login` `{email, password}` header `X-localization: en` → `token`; single-session (re-login per run). Creds: `memory/test_credentials.md` (owner@thegoankitchen.com, RID 69, hotel_code sandbox-pms).
- **Snapshot:** `GET /api/v2/vendoremployee/aiosell/local-reservations?start_date&end_date&view=all` → `data.reservations[]` each with `charge{…}`, `status`, `order_id`, `room`; `meta.business_date` (**only** date source for guards — never browser clock). `GET …/aiosell/room-status-board` → `data.rooms[]` (`display_status`: available|occupied|occupied_hk|hk|blocked…, `guest`, `hk_assignee`, `hk_since`), `data.sections[]`, `meta`. `GET …/aiosell/dashboard-kpis`.
- **Create:** `POST …/aiosell/direct-reservation` `{guest{name,phone}, checkin, checkout, adults, children, rooms[{room_code, rateplan_code, rooms_count}], advance{amount, method, reference}}` → 201 `data.reservation{ id, booking_id, charge }` (server prices when FE omits rate — BQ-16; 422 when no rate).
- **Check-in:** `POST /api/v1/vendoremployee/pos/user-group-check-in` **multipart** (fields listed in `run_n7n8.py::checkin`, incl. `room_id[]`, `booking_id`, `aiosell_reservation_id`, `upgrade_type paid|complimentary`, `upgrade_amount`, `upgrade_reason`, `checkin_date/checkout_date`) → 200 `data.order_id`, `data.charge`; **422** with message when `allow_early_checkin=false` and `checkin > business_date` (surface verbatim). HK-room check-in allowed (N9).
- **Extend:** `POST /api/v2/vendoremployee/pos/room-extend-stay` `{order_id, new_checkout_date, reason, payment{amount, method}, discount?, new_restaurant_table_id?}` → `data.charge` (+ `nights_detail[]` in calendar mode), `data.payment_record_id`, 409 on conflict. **D14:** refetch LR after; do not update the row from the response.
- **Checkout/TAB:** `POST /api/v2/vendoremployee/order/order-bill-payment` with the full FE body (`run_n7n8.py::tab`, `payment_mode: "TAB"`, `paid_room: "yes"`, `waiter_id`) at `charge.balance_due` from LR; server clamps over-amounts but FE must send the right figure. Room → `hk` after.
- **Settings (M7):** read `GET /api/v1/vendoremployee/profile` → `restaurants[0].settings.allow_early_checkin | extend_rate_mode` (aliases `pms.*`; also `restaurant-settings/settings-list` → `data.basic`). Write `POST …/restaurant-settings/update-settings` **multipart `data={"basic":{…}}` only** — raw JSON body returns 200 and changes nothing. Invalid `extend_rate_mode` → 422. Existing service already does this: `api/services/restaurantSettingsService.js` L26–31.
- **No-Show / Cancel / Modify / Reasons / Rates / Rooms:** see `probes_2026_09_19/PROBE_REPORT.md` (p2 PATCH dates, p7 no-show, p8 cancel, `reasons.json`, `rates.json`, `rooms.json`); Laravel uses **PUT** for updates (R25).
- **Display rules:** rate on extended stays = average → label "avg. rate / night", never multiply back; per-night lines only from `nights_detail` (room nights only — never sum its `gst`); GST two lines from `charge.sgst/cgst`; prepaid badge from `charge.prepaid_amount / advance_payment` (D48-b, not `pah`).

## 5. Module map (what each module builds, owner-locked surfaces)
| Module | Surfaces (mockup views) | Key decisions | Backend | Gated on |
|---|---|---|---|---|
| M0 shell | `FrontDeskWorkstationPage`, `KpiTabStrip`, `AlertBar`, `GlobalSearch`, route + sidebar "Front Desk (Beta)", `frontDeskService` (LR + board + KPIs, refresh-on-focus + after action) | D44, D46 DEC-1..3, X-rules, section titles G4-09 | verified | — |
| M1 Booking | `NewBookingForm` (v2.17 blueprint, B2B removed v2.28, server pricing) | D34, D48 N1–N5 | BQ-16 ✓ | — |
| M2 No-Show / Cancel / Modify | inline dialogs via `inline` prop (v2.22 blueprint) | D2, D46 | ✓ | — |
| M3 Check-In | `CheckInForm` (copy of CheckInPage form; v2.10/2.11 layout), room chooser (HK rooms selectable + badge, N9), upgrade paid/comp, early check-in guard (N7 setting) | D23, D52/D53 | BQ-18 ✓ | §S 410/411 |
| M4 Extend Stay | inline `ExtendStayDialog`; RIGHT panel from `data.charge` + `nights_detail` lines; refetch LR (D14) | D37, D55 | BQ-14/17 ✓ | §S 402 |
| M5 In-House / Departures | tables, chips, counts from `charge` | D50 | ✓ | §S 421/426/429 |
| M6 Bill / Checkout | `FolioCheckoutPanel` (GuestFolio cards LEFT + `CollectPaymentPanel` RIGHT 440 × 560, Layout B), `.frontdesk-bill` CSS hides the 3 section rows (Q6 a), scroll-on-expand, `charge`-fed balance, BUG-418 GST lines, TAB settle; checklist M6-01…M6-12 | D1, D57, AC-04 | BQ-15 ✓ | §S 425/428 |
| **M7 Settings** | two controls in `RestaurantSettingsPage` Step 2 `basic` tab: "Allow early check-in" (checkbox) + "Extension pricing" (radio Rate table / Held rate) | D53/D54 O-8 (a) | BQ-17/18 ✓ | — |

## 6. Parallel tracks / parked (do not block planning)
- B-7 smoke (owner/QA) — checklist §S; CR-368 failing suites triage before M5/M6 (P-11).
- Backend P2: D14, BQ-385-19, N10 — MASTER v1.9 §10; re-verify with the runners when they reply.
- Phase 2 / follow-ups: BQ-385-02 aggregation, BQ-385-13 refund preview, BQ-385-07 room discount (control ships disabled), sockets, multi-room check-in (§K on hold), FU-385-A/C/D/E/F/G/H (retire old pages after adoption).

## 7. Gotchas
- Preview URL = `frontend/.env` `REACT_APP_BACKEND_URL` only; older URLs in PRD are stale.
- Sandbox is shared: 8524/8526 held by other testers on 2026-09-20; pick rooms from the live board; always settle test stays with TAB and restore settings (`allow_early_checkin=false`, `extend_rate_mode=calendar`, `auto_print_checkin_receipt=false`).
- Every Aiosell sandbox date is ≥ 7,500 → N11 cheap-night case needs backend help (G4-03).
- Checklist ticks live in localStorage; when you add rows, keep the `data-testid` pattern `mc-<id>-check` and the loader honours HTML `checked` defaults.
- `?bill=103` grand total is ₹6,152 since v2.26.
- `git diff` does not work on this platform — use `git log` / `git status`; the platform commits after each step.
- Never write code for CR-385 in `src/` before "Gate 4 GO". The spike is already deleted — `grep -rn "spike-cr385\|SpikeCr385" src/` must return nothing; if it does, `git checkout -- frontend/src/App.js` and remove `src/spike/`.
- "Close the gate" from the owner while the plan does not exist = record the quote, keep Gate 3 OPEN, explain the Step 3 rule (D58 precedent). Gate 3 closes only after the plan is written and the owner approves it.
