# BATCH-A — Impact Analysis Summary (Gate 2) — 2026-11-14

> **STATUS: GATE 2 CLOSED 2026-11-14 (owner instruction "close IA").** All owner questions answered (R1–R12). Briefs: `backend_briefs/BACKEND_BRIEF_BATCH-A_2026_11_14.md` (Gyan), `backend_briefs/BACKEND_BRIEF_CR-495_ROOM_COMP_MEAL_PACKAGE_2026_11_14.md` (Parth). Tracker: `backend_briefs/BACKEND_BRIEF_TRACKER.html`. Registries synced. Next: backend reply → Gate 3.

Role: PLANNING (Gate 2 only). Owner GO: "planning role for impact analysis of batch A, do every probe, don't assume anything".
Scope: all 13 items in one go (owner choice). Zero source code changes. Gate 3 NOT started.
Probe account: cafe103 owner alias (RID 644). Credentials NOT stored (owner: session only). Tokens masked `***` in all evidence.
Write probes owner-approved on test orders only: #021537 (id 1578756) and #021538 (id 1578757), both cancelled (clean).

## Evidence index — `/app/memory/evidence/BATCH-A-IA/probes_2026_11_14/`
| File | What it proves |
|---|---|
| 01_login_masked.json | Login `role[]` for Owner = 52 keys; NO `complementary_food`, no reprint / pay-later / PIN keys |
| 02_profile.json | `restaurants[0].complementary="No"`, `cancel_order_time=5`, `cancel_food_timings=5`, `allow_cancel_post_server="Yes"`, `restaurant_discount_type[0]` = "Complementary" 100% |
| 03_settings_list.json | No PIN / threshold / daily-limit / notes-mandatory / meal-package keys |
| 04/05/07 role lists | Backend module catalogue (55 keys). `complementary_food` (id 102) EXISTS; Owner role-master default includes it but this owner login does not have it. `update_payment` (23), `order_unpaid` (22), `print_icon` (96), `clear_payment` (26), `printer` (11, backend) exist |
| 06_cancellation_reasons.json | Needs `limit`+`offset` (403 without). 12 reasons, `item_type` Order / Food |
| 08_cancel_order_list_*.json | Order row returns `cancellation_reason`, `cancellation_note`, `cancel_state`; line returns `reason_type`, `reason`, `cancel_type`; NO line note field |
| 09_order_beta_combined.json | Order Beta row has NO cancellation reason / note / comp fields |
| 10_insights_cancellations.json | Items carry `reason` + `notes`; "No reason provided" = 5 cancels in Nov 1–14 (reason not always enforced at source) |
| 20–26 (write probe) | See below |
| 30_missing_endpoint_probes.txt | Guessed PIN / notification-pref / cancel-config endpoints → all 404 |
| 31/32 comp probe | Backend ACCEPTED `is_complementary=Yes` + `complementary_reason` from a user WITHOUT `complementary_food` |
| batch_a_write_probe.py | Re-runnable probe script |

## Write-probe results (R11)
1. **Item cancel note (BUG-670):** sent `cancel_reason_text`, `notes`, `cancellation_note`, `cancel_note` on `PUT cancel-food-item` → 200, **none stored or returned**. Backend has no item cancel-note field.
2. **Order cancel note (BUG-674):** `PUT order-status-update` `cancellation_note:"custom"` → stored, returned in cancel-order-list. FE today sends `reasonNote || reasonText` and no UI ever sets `reasonNote` → note = reason text duplicate.
3. **Quirk:** on full-order cancel, backend overwrites each remaining line's `reason` with the order `cancellation_note` text (line 3969231 reason = note, not reason).
4. **Cancel stage:** FE sends `cancel_type: 'Pre-Serve'|'Post-Serve'`; backend stores its own `Pre-Cooking` (server-derived). After-serve detection is server-side.
5. **Cancellation report "notes":** insights `items[].notes` = `food_level_notes` (kitchen note "BATCH-A IA PROBE"), NOT a cancel note. FE `reportTransform.js:789` / `insightsService.js:305` read `cancel_reason_text`, which the API never returns.
6. **Comp without right (CR-492):** accepted and saved (`complementary=1`, reason saved). FE gate alone is bypassable → backend enforcement needed.

## Conflict pre-check (R16)
Many open items at GATE_5A/5B touch the same hotspots (CollectPaymentPanel, OrderEntry, orderTransform, DashboardPage, OrderReportBetaPage, App.js) — e.g. BUG-660/665/666 (CPP+orderTransform), BUG-662/656/657, CR-512 (OrderEntry), BUG-652..655 (DashboardPage), BUG-626/546, CR-423 (OrderReportBetaPage), BUG-661 (App.js). Gate 3 must re-verify line anchors at HEAD; no parallel edits on these files until those pass QA.
`CancelFoodModal.jsx` / `CancelOrderModal.jsx`: no open owners.

## Item docs
| Stage | Item | Doc | Risk | Backend-blocked? |
|---|---|---|---|---|
| 1 | CR-071 | CR-071_IMPACT_ANALYSIS.md | HIGH | NO (scope OD open) |
| 1 | CR-492 | CR-492_IMPACT_ANALYSIS.md | CRITICAL | PARTIAL (enforcement + owner key) |
| 1 | CR-515 | CR-515_IMPACT_ANALYSIS.md | HIGH | NO for item-cancel gate (OD-515-A = reuse existing cancel right; owner to send screenshot if key missing) |
| 2 | CR-493 | CR-493_IMPACT_ANALYSIS.md | HIGH | YES (notes setting key) |
| 2 | BUG-674 | BUG-674_IMPACT_ANALYSIS.md | HIGH | PARTIAL (Order Beta fields) |
| 2 | BUG-670 | BUG-670_IMPACT_ANALYSIS.md | HIGH | YES (item note field) |
| 3 | CR-494 | CR-494_IMPACT_ANALYSIS.md | CRITICAL | YES (all; counters server-side per OD-494-C) |
| 4 | CR-445 | CR-445_IMPACT_ANALYSIS.md | CRITICAL | PARTIAL (contract OD) |
| 4 | CR-495 | CR-495_IMPACT_ANALYSIS.md | CRITICAL | YES + probe blocked (no PMS on cafe103) |
| 5 | CR-443 | CR-443_IMPACT_ANALYSIS.md | HIGH | YES (events, right key) |
| 6 | CR-529 | CR-529_IMPACT_ANALYSIS.md | CRITICAL | Phase 2 — not analysed beyond dependency |
| 6 | CR-540 | CR-540_IMPACT_ANALYSIS.md | HIGH | Scope OD open |
| 6 | CR-372-B | CR-372-B_IMPACT_ANALYSIS.md | LOW | NO |

## Owner decisions log (rounds 1–4, 2026-11-14)
| OD | Decision |
|---|---|
| Scope | All 13 items in one go; write probes allowed on test orders; credentials session-only |
| BUG-670 | Owner confirmed (screenshots): item notes not shown. FE drops notes + backend has no field |
| BUG-674 | No order-notes UI today → add. Items must get order cancel reason/note (backend). Order Beta must show reason/note (backend). OD-674-A = save note EMPTY when blank |
| CR-493 | OD-493-B = block cancel + message when no reasons configured |
| CR-492 | FE gate on `complementary_food` confirmed. OD-492-A = existing comp lines read-only |
| CR-515 | FE gating confirmed missing. Reuse existing rights (role editor screenshot). Pages = c (Orders Beta + Order Report + dashboard + order screen). Reprint right → moved to P1 |
| CR-071 | Only rights Batch A needs; full wiring on HOLD until all batches done |
| CR-494 | All-new build inside CR-494 (no separate CR). OD-494-A = amount incl. tax |
| CR-445 | Whole-order comp saved as the 100% discount preset |
| CR-495 | Probed on The Palm House (RID 541): no meal plan / guest count anywhere |
| Brief | Backend brief WAITS until all Batch A answers are in |
| OD-515-A (R5) | Item cancel gated by the EXISTING cancellation right already used today (= option a, Cancel Orders). If the key is not found in code/login, owner will share role-editor screenshot to validate; fallback = option a |
| OD-494-B (R5) | Discount threshold = ₹ amount of discount (not % of bill) |
| OD-494-C (R5) | Daily per-user cancel/discount counters kept in BACKEND (shared across devices) → backend must expose counter/limit check |
| OD-494-D (R5) | Edit-after-bill PIN required for EVERYONE (no skip for `order_edit_access`) |
| OD-445-B (R5) | Whole-order comp = `complementary_food` right only, NO PIN |
| OD-515-A (amend) | Owner: target = SEPARATE rights for item cancel and order cancel. If backend needs a new item-cancel key → PHASE 2, not now. Phase 1 = item cancel on existing `order_cancel` (fallback a). Note: today item cancel is gated by `food`; moving it to `order_cancel` changes who can cancel items → check against additive rule (OD-492-B) at brief review |
| OD-493-A (R6) | Investigate 5 "No reason provided" cancels inside CR-493 |
| OD-492-B (R6) | Owner: all Batch A changes must be ADDITIVE; present system must not be affected. CONFLICT flagged: CR-492 "no right → comp hidden" would remove comp from cafe103/Palm House owners today → clarification asked in R7 |
| OD-445-C (R6) | Whole-order comp on normal orders only (NOT room / credit-tab) |
| OD-495-A (R6) | Room comp limit resets per BUSINESS day |
| OD-540-01 (R8) | CR-540 priority = P1 (NOT P0). Phase-1 idea selection (OD-540-02) deferred with P1 |
| CR-495 brief (R9) | Owner: non-PMS outlets have no meal package / guest data → CR-495 backend brief WRITTEN: `backend_briefs/BACKEND_BRIEF_CR-495_ROOM_COMP_MEAL_PACKAGE_2026_11_14.md` (Parth) |
| OD-515-A (R9, locked) | Owner OK with item cancel on `order_cancel`. Owner believes it is already gated so; CODE FACT: OrderEntry.jsx L353 `canCancelItem = hasPermission('food')` → CartPanel.jsx L68 hides item cancel button. Gate 3 = one-line gate change to `order_cancel` |
| CR-495 (R10) | Non-PMS AND PMS together; half-board second meal + meal-slot rule = discuss with backend (OPEN, tracked as BLOCKED in tracker) |
| Priorities (R11) | CR-071 = P1 · CR-445 = P1 · CR-372-B = P0 · CR-540 = P1. Both registries synced, Gate 2 CLOSED for all 13 items |
| R12 | BA-17/BA-18 (CR-445) marked P1 in brief + tracker. Owner: close IA → GATE 2 CLOSED |
| Gate 2.5 | Design mockups `design/BATCH-A_GATE2_5_MOCKUPS_2026_11_14.html` M1–M10 ALL APPROVED 2026-11-14. Item comp reason REQUIRED; alert switch on new sidebar link Notifications under Settings. Next: Gate 3 plans G1–G6 |
| OD-529-P (R8) | Owner meant CR-529: ALL OTP-related work = P1 (phase 2). CR_REGISTRY.md row updated P0→P1 (registry.json already P1). PIN (CR-494) stays P0. OD-529-A (OTP channel) deferred with P1 |
| OD-372B-B (R8, info) | `/restaurant-picker` (CR-166) = screen shown after an ADMIN login (LoginPage.jsx L90) to choose which restaurant to open; also reached from Sidebar switch (L487, L901). Route App.js L160 has no ProtectedRoute; page uses auth token helpers. Owner decision (R8): KEEP AS IT IS (no login guard added) |
| OD-495-B (R6) | Half/full board: SEPARATE limit per meal (backend needs per-meal limit keys + per-meal tracking) |
| OD-492-B (R7, resolved) | Hide comp for EVERYONE without `complementary_food` (CR-492 rule wins). RELEASE IMPACT: owners lacking the right today (cafe103 RID 644, Palm House RID 541, likely others) lose comp → note in release notes and confirm with backend (role defaults / admin update) BEFORE release |
| OD-495-C (R7) | Room-only booking: comp allowed WITH PIN |
| OD-443-A (R7) | Extra alert events: discount above set ₹ amount, complimentary given, cancel after bill print (7 events total) |
| OD-443-B (R7) | Delivery via Firebase (FCM) token, same as existing notifications (token sent at login: LoginPage.jsx L54-83 → authTransform.js L52 `fcm_token`) |
| OD-372B-A (R7) | `/local-printer-setup` must require login. Code check: route App.js L251 has NO ProtectedRoute; same `LocalPrinterSetupView` also used inside Settings (ListFormViews.jsx L189-192, printerType 'direct') → in use there; standalone route has no in-app link found (direct URL only). Live-device usage NOT verified |

## Pending owner questions (next IA agent asks these, 5 per round)
Round 5: ANSWERED 2026-11-14 (see decisions log).
Round 6: ANSWERED 2026-11-14 (items 6–10 resolved, see log).
Round 7: ANSWERED 2026-11-14 (OD-492-B, 495-C, 443-A, 443-B, 372B-A).
Round 8: ANSWERED 2026-11-14 (OD-372B-B keep, CR-540 P1, CR-529/all OTP P1).
Remaining before brief: CR-515 reprint right P1 confirm (already recorded P1 in R1–4); CR-529 + CR-540 IA docs stay dependency-level (P1). Missing-backend list shown to owner 2026-11-14. CR-495 brief written (R9). Owner GO (R10) → `backend_briefs/BACKEND_BRIEF_BATCH-A_2026_11_14.md` (Gyan, BA-01..22 + R-1..3) WRITTEN. Tracker: `backend_briefs/BACKEND_BRIEF_TRACKER.html` (batch-wise status).
**GATE 2 CLOSED 2026-11-14** — owner confirmed close; CR_REGISTRY.md updated (Batch A table at top + 13 rows) (open discussion items: CR-495 half-board meal + meal-slot rule, owner + backend). Next: Gate 3 after backend reply.
Former items 6–16: ALL ANSWERED R6–R8 (see decisions log).
Item 17 (Gyan): IN BRIEF — OD-492-C = BA-08, B-674-3 = BA-03; awaiting backend reply.
Still open (not blocking Gate 2):
- CR-495 half-board second meal (lunch/dinner) — owner + backend discussion.
- CR-495 meal-slot rule (time window vs cashier) — owner + backend discussion.
- OD-540-02 which CR-540 ideas in phase 1 — deferred with CR-540 (P1).
- OD-529-A OTP channel — deferred with CR-529 (P1, phase 2).

## Backend gaps
Confirmed by owner 2026-11-14 and written into `backend_briefs/BACKEND_BRIEF_BATCH-A_2026_11_14.md` and `backend_briefs/BACKEND_BRIEF_CR-495_ROOM_COMP_MEAL_PACKAGE_2026_11_14.md`.
