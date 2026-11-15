# Batch A — Owner Decisions (FINAL) — 2026-11-14

Source: owner Q&A rounds 1–3 (2026-11-14). Supersedes `BATCH_A_OWNER_ANSWERS_DRAFT_2026_11_14.md`.
Client for all Batch A items: **ALL**. Assignment rule (A32): Abhishek on frontend, "waiting on Gyan" where backend keys/rights are needed.

## Code findings (agent, 2026-11-14, code-traced — not yet probed on preprod)
- **BUG-670:** `CancelFoodModal.jsx` collects `additionalNotes` (L201-216) but `handleCancel` (L35) never passes it to `onCancel`; `orderToAPI.cancelItem` (orderTransform.js L995-1006) has no notes field. Notes are dropped in the FE → can never reach reports. Reports read `cancel_reason_text` per line (reportTransform.js L789, insightsService.js L301-305). **Backend Q (Gyan):** which field does `cancel-food-item` accept for item notes (`cancel_reason_text`?) and is it returned in cancel-order-list?
- **BUG-674:** `CancelOrderModal.jsx` notes textarea renders only in refund mode (L103). Payload already sends `cancellation_note: reasonNote || reasonText` (orderTransform.js L1028) → backend field exists. **Backend Q (Gyan):** is `cancellation_note` returned in cancel-order-list / Order Beta APIs?

## Decisions by item

| Item | Decision |
|---|---|
| BUG-674 | Add notes box to order-level cancel dialog (all modes). Notes must show in Cancellation report + Order Beta. |
| BUG-670 | Re-scoped: item notes exist in dialog but are not sent/saved → fix payload; show in Cancellation report + Order Beta. |
| CR-493 | Reason dropdown ALWAYS mandatory (order + item). One restaurant setting (key from Gyan) makes notes mandatory/optional for both; default optional. |
| CR-492 | Right key `complementary_food` (from Gyan). No right → comp HIDDEN. Covers item + order-level comp; order-level comp = 100% discount, hidden automatically as fallback (not list-type dependent). |
| CR-494 | Restaurant-level PIN, **separate PIN per action**: cancel before serve, cancel after serve, cancel after bill, order edit after bill, apply discount, complimentary. Each action has its own amount threshold: up to amount → no PIN, above → PIN; amount 0 = PIN always. Daily per-user limits for cancels AND discounts, measured in ₹ AND count, **same limit for all users** in the restaurant; over limit → allowed with PIN. PINs, thresholds, limits set in **backend admin** (phase 1); keys delivered by backend. |
| CR-529 | P1. Becomes **OTP for all PIN actions — phase 2**. Phase 1 = PIN only (CR-494). |
| CR-515 | 4 new rights: reprint, change payment method, make unpaid, collect pay-later. No right → button hidden. |
| CR-495 | Meal package chosen at check-in (walk-in too): breakfast / half board / full board. OTA bookings: use channel-manager meal plan automatically. Room may comp any food item up to ₹ limit per guest × guests checked in, per day (resets daily). Limit set per package in settings (backend key). Above limit → PIN. Half/full board lunch+dinner comp: yes, but tracking not built yet — discuss at impact. |
| CR-445 (+CR-058) | CR-058 merged into CR-445. Whole-order Complimentary option inside payment-methods list. Reason required (same as item comp). PIN depends on right — detail at impact. Comp count in existing Discount report (comp section). Item-level comp already exists. |
| CR-443 (+CR-496) | CR-496 merged into CR-443. Alerts: cancel before serve, cancel after serve, unpaid, payment method changed (more at impact). Content: order, item, table/room, who, reason. Delivery: POS + phone push. A right decides who CAN receive; employee can switch off on this device. Phase 2: read tick (model TBD) + tap opens order. |
| CR-071 | Into Batch A. Abhishek. |
| CR-372-B | Delete `/settlement/preview` demo page. `/local-printer-setup` (unguarded) — decide at impact. Report preview routes already guarded by PermissionRoute. |
| CR-540 (NEW) | Revenue leakage controls (ideas 1–8). Priority TBD by owner. |

## Round 5 answers (2026-11-14, Gate 2 IA)
- **OD-515-A:** item cancel uses the existing cancellation right already in use (option a). If not found, owner shares screenshot; fallback a.
  - Code check (agent): right key `order_cancel` ("Cancel Orders", permissionCatalog.js L13) exists and gates order cancel (OrderEntry.jsx L352, DashboardPage, ChannelColumn). Item cancel today uses `food` (OrderEntry.jsx L353) → Gate 3 switches item cancel to `order_cancel`. No screenshot needed.
- **OD-494-B:** discount threshold in ₹.
- **OD-494-C:** daily counters in backend (shared across devices).
- **OD-494-D:** edit-after-bill PIN for everyone.
- **OD-445-B:** whole-order comp = right only, no PIN (note: differs from item comp, which keeps PIN per CR-494).

- **OD-515-A amend (owner):** Separate rights for item cancel and order cancel are the target. New backend item-cancel key = PHASE 2 (not now). Phase 1 uses existing `order_cancel` for item cancel.

## Round 6 answers (2026-11-14)
- **OD-493-A:** "No reason provided" cancels investigated inside CR-493.
- **OD-492-B:** Owner rule: all changes ADDITIVE, present system not affected. Conflict with CR-492 hide rule → clarification pending (R7).
- **OD-445-C:** Whole-order comp on normal orders only; not room / credit-tab.
- **OD-495-A:** Room comp limit resets per business day.
- **OD-495-B:** Separate comp limit per meal (half/full board).

## Round 7 answers (2026-11-14)
- **OD-492-B:** Hide comp for everyone without `complementary_food`. Release impact (owners losing comp) to be noted and confirmed with backend before release.
- **OD-495-C:** Room-only booking → comp allowed with PIN.
- **OD-443-A:** Extra alerts: discount above set ₹, complimentary given, cancel after bill print.
- **OD-443-B:** Alerts via Firebase token, same as existing notifications.
- **OD-372B-A:** `/local-printer-setup` requires login. Same screen is used inside Settings (in use); standalone route has no in-app link found. Live usage to be confirmed.

## Round 8 answers (2026-11-14)
- **OD-372B-B:** `/restaurant-picker` (admin restaurant chooser) — keep as it is, no change.
- **CR-540:** P1 (not P0).
- **CR-529:** all OTP-related work moves to P1 (phase 2). PIN (CR-494) stays P0.

## Round 9 answers (2026-11-14)
- **CR-495:** non-PMS outlets lack meal package + guest count → backend brief written (`backend_briefs/BACKEND_BRIEF_CR-495_ROOM_COMP_MEAL_PACKAGE_2026_11_14.md`).
- **Item cancel → `order_cancel`:** owner OK. Code today gates item cancel with `food` (OrderEntry.jsx L353); Gate 3 changes it.

## Round 10 answers (2026-11-14)
- **CR-495:** non-PMS and PMS outlets in the same release. Half-board meal + meal-slot rule → discuss with backend.
- **GO:** Batch A backend brief written (`backend_briefs/BACKEND_BRIEF_BATCH-A_2026_11_14.md`). Tracker: `backend_briefs/BACKEND_BRIEF_TRACKER.html`. Gate 2 closed.

## Round 11 — priorities (2026-11-14)
- **CR-071:** P1.
- **CR-445 (+CR-058):** P1.
- **CR-372-B:** P0.
- **CR-540:** P1 (from R8).
Both registries (`control/CR_REGISTRY.md`, `control/registry.json`) updated; Gate 2 closed for all 13 Batch A items.

## Round 12 — Gate 2 close (2026-11-14)
- CR-445 backend asks BA-17 / BA-18 marked **P1** in the Batch A brief and tracker (deliver after P0 asks).
- Owner instruction: "update docs and decision and close IA" → **Batch A Gate 2 Impact Analysis CLOSED 2026-11-14.**
- Next: backend reply (`backend_replies/BACKEND_REPLY_BATCH-A_<date>.md`) → Gate 3.

## Gate 2.5 — Design approval (opened 2026-11-14)
- Owner: plan ALL P0 items together; one combined plan per related group; every on-screen change needs design approval first (Gate 2.5) via side-by-side Current vs Proposed mockups.
- Mockups: `design/BATCH-A_GATE2_5_MOCKUPS_2026_11_14.html` (M1–M10). Status: **ALL M1–M10 APPROVED 2026-11-14 → GATE 2.5 CLOSED.**
- M5 (approved after explanation): no right → comp checkbox hidden, existing comp lines read-only; item comp reason now REQUIRED (today optional, CPP L2145 placeholder "Reason (optional)"); room orders show comp left for the meal, above limit → PIN.
- M9: device alert switch lives on a NEW sidebar link "Notifications" under Settings.
- Plan groups (Gate 3, after approval): G1 Cancel (BUG-674, BUG-670, CR-493 + item-cancel right) · G2 Rights (CR-492, CR-515) · G3 PIN & limits (CR-494) · G4 Room comp (CR-495) · G5 Alerts (CR-443) · G6 Routes (CR-372-B).

## Impact-analysis order
1. Rights: CR-071, CR-492, CR-515
2. Cancel: CR-493, BUG-674, BUG-670
3. PIN + limits: CR-494
4. Comp: CR-445, CR-495
5. Alerts: CR-443
6. Phase 2: CR-529 · Track: CR-540, CR-372-B

## Gate 3 rounds — 2026-11-15 (PLANNING role)
### R13
- Plan only backend-free groups now (G6 full; FE parts of G1, G2). G3/G4/G5 wait for backend reply.
- Plan on today's code; build after QA of open items on the same files.
- Collect pay-later right: wait for BA-09.
- Plans delivered together.
- Read-only preprod probes allowed (creds via secure window; done, token deleted).
### R14
- Q1 Refund Note: also saved as the order cancel note (same box). Owner to recheck key with backend → BA-24.
- Q2 Order-level comp: discounts are independent; NO preset hidden. Comp right hides the future "Complimentary" payment button (CR-445, P1). Batch A CR-492 = item comp checkbox only.
- Q3 Comp reason required for full AND part comp. Owner believes part comp doesn't exist → to revalidate (code: MarkCompModal, BUG-298/299). Location of reason → M5b (Option A popup / Option B line box) pending.
- Q4 Missing comp reason blocks Pay only (bill never prints the reason).
- Q5 Existing comp on an order opened by a user without the right → read-only.
- "No reason provided" cancels = backend auto-cancel after last item cancelled → BA-23 added to Gyan's brief.
- M5b drawn 2026-11-15.
### R15
- M5b **Option B approved**: reason box under every comp line (full + part); label "Reason (required)"; Pay disabled while any comp reason is empty; Print Bill unchanged. (Owner: box already exists — change = label, box on part-comp lines, Pay check.)
- Comp line without reason + cashier without the comp right → **Pay stays blocked** (box read-only; a user with the right adds the reason).
