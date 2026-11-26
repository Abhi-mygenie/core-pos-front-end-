# Handover — Batch A Gate 3 Implementation Planning — 2026-11-14

**For:** the next PLANNING agent (Gate 3 — Implementation Plan)
**From:** Planning agent (Gate 2 Impact Analysis + Gate 2.5 Design)
**Repo:** `https://github.com/Abhi-mygenie/core-pos-front-end-.git` · branch `main` · app in `/app/frontend`, docs in `/app/memory`
**Code changes so far for Batch A: NONE.** Gate 3 = documents only. No coding until owner gives Gate 4 GO.

---

## 1. Where things stand

| Gate | Status |
|---|---|
| Gate 1 Intake | Closed |
| Gate 2 Impact Analysis | **CLOSED 2026-11-14** (owner rounds R1–R12 all answered) |
| Backend briefs | Written + sent (Gyan, Parth). Reply not received |
| Gate 2.5 Design approval (new gate, owner-defined) | **CLOSED 2026-11-14** — mockups M1–M10 all approved |
| **Gate 3 Implementation Plan** | **NOT STARTED — your task** |
| Gate 4 GO | Owner, after Gate 3 |

Owner instructions for Gate 3 (locked):
1. **Plan ALL P0 items together** (not only the ones free of backend).
2. **One combined plan per related group** (groups G1–G6 below).
3. Any item that changes the screen must follow its approved mockup exactly (Gate 2.5). Any new on-screen change not in M1–M10 → back to Gate 2.5 (new mockup, side-by-side Current vs Proposed) before planning it.

---

## 2. Read first (in this order)

1. `control/AGENT_PROMPT_ALPHA.md` — ROLE 2 PLANNING, stage `implementation_plan` (L515–622): Step 0 code reality, Step 1 conflict pre-check, Step 3 plan, Step 4 verification matrix, Step 5 post-code registry checklist. Also RISK CLASSIFICATION (L56) and OWNER APPROVAL MATRIX (L101).
2. `impact/BATCH-A_IMPACT_ANALYSIS_SUMMARY_2026_11_14.md` — evidence index, write-probe results, decisions log, conflict pre-check.
3. `change_requests/BATCH_A_OWNER_DECISIONS_2026_11_14.md` — final decisions R1–R12 + Gate 2.5.
4. Item IA docs in `impact/`: `BUG-670`, `BUG-674`, `CR-493`, `CR-492`, `CR-515`, `CR-494`, `CR-495`, `CR-443`, `CR-372-B` (+ `CR-071`, `CR-445`, `CR-529`, `CR-540` for P1 context) `_IMPACT_ANALYSIS.md`.
5. `design/BATCH-A_GATE2_5_MOCKUPS_2026_11_14.html` — approved screens M1–M10 (Current vs Proposed).
6. `backend_briefs/BACKEND_BRIEF_BATCH-A_2026_11_14.md` (BA-01..BA-22, R-1..R-3), `backend_briefs/BACKEND_BRIEF_CR-495_ROOM_COMP_MEAL_PACKAGE_2026_11_14.md` (B-495-1..7), `backend_briefs/BACKEND_BRIEF_TRACKER.html`.
7. `control/CONTROL_DASHBOARD.md`, `control/FILE_OWNERSHIP.md`, `control/OPEN_GAPS_REGISTER.md` (Alpha boot).
8. Check `backend_replies/` for `BACKEND_REPLY_BATCH-A_*` — none existed at handover time.

---

## 3. Scope — P0 items and plan groups

| Group | Items | Mockups | Backend needed | Can plan FE now? |
|---|---|---|---|---|
| **G1 Cancel** | BUG-674, BUG-670, CR-493, item-cancel right move (from CR-515) | M1, M2, M3, M6 | BA-01 (item note field), BA-02 (Order Beta fields), BA-03, BA-04, BA-05 (notes-mandatory key), BA-06 | YES — dialog UI, payload, gate, no-reasons block. Report/Order Beta display + notes-mandatory toggle wait on backend fields |
| **G2 Rights** | CR-492, CR-515 | M5 (part 1), M7 | BA-07 (server enforce), BA-08 (flag meaning), BA-09 (pay-later key) | YES — FE gates use existing keys; pay-later key to confirm |
| **G3 PIN & limits** | CR-494 | M1/M2 hooks, M4, M5 (PIN) | BA-11..BA-15 (all new; no endpoints today — all 404) | PARTIAL — PIN popup component + call sites; API contract placeholder until reply |
| **G4 Room comp** | CR-495 | M5 (room line), M8 | B-495-1..7 (Parth) | PARTIAL — check-in fields + room comp line; contract TBD |
| **G5 Alerts** | CR-443 | M9 | BA-19..BA-22 | PARTIAL — banner types + sidebar Notifications link + device switch; events from backend |
| **G6 Routes** | CR-372-B | M10 | none | YES — FE only |

P1 (NOT in this plan set): CR-071 (full rights wiring on HOLD), CR-445 whole-order comp (BA-17/18), CR-529 OTP (phase 2), CR-540, reprint right, separate item-cancel right (phase 2).

---

## 4. Locked decisions per group (do not re-ask)

### G1 Cancel
- Order cancel dialog: add Notes box in **all** modes (today only refund mode, `CancelOrderModal.jsx` L103–119). Blank note → saved EMPTY (OD-674-A). Today FE sends `cancellation_note: reasonNote || reasonText` (`orderTransform.js` ~L1028) → must stop duplicating reason text.
- Item cancel dialog: notes exist (`CancelFoodModal.jsx` L201–216) but `handleCancel` (L35) drops them and `orderToAPI.cancelItem` (`orderTransform.js` ~L995–1006) has no notes field → send note (field name from BA-01).
- Reason ALWAYS mandatory (order + item) — already enforced by disabled button; mark label `*`.
- One restaurant setting (key from backend, BA-05) makes notes mandatory/optional for both dialogs; default optional.
- No reasons configured → block + message (OD-493-B, M3).
- "No reason provided" cancels (5 in Nov) → investigate inside CR-493 (OD-493-A).
- Reports read `cancel_reason_text` (`reportTransform.js` ~L789, `insightsService.js` ~L301–305) which API never returns; insights `items[].notes` = kitchen note, not cancel note → fix mapping once BA-01/02 land (M6).
- Order Beta: show reason + note on cancelled orders (needs BA-02).
- Item cancel right: switch `canCancelItem = hasPermission('food')` (`OrderEntry.jsx` L353, used L378/L383, passed L2947 → `CartPanel.jsx` L68) to `order_cancel` (key exists: `constants/permissionCatalog.js` L13 "Cancel Orders"; already gates order cancel `OrderEntry.jsx` L352, `DashboardPage.jsx` L2135/2171/2201, `ChannelColumn.jsx` L355/387). Owner approved; release check R-2.

### G2 Rights
- `complementary_food` right: no right → comp checkbox HIDDEN (item + order-level); existing comp lines read-only (OD-492-A). CPP checkbox at `CollectPaymentPanel.jsx` ~L2110 and ~L2500 (two render paths).
- Hide for EVERYONE without the right (OD-492-B). Release check R-1: cafe103 (RID 644) / Palm House (RID 541) owners lack it today → backend role update before release.
- Item comp reason becomes **REQUIRED** (Gate 2.5 M5; today placeholder "Reason (optional)" CPP ~L2145).
- CR-515 uses existing rights: `update_payment` (change payment method), `order_unpaid` (make unpaid), pay-later collect (key to confirm BA-09). No right → button hidden. Pages: Orders Beta, Order Report, dashboard, order screen (M7).

### G3 PIN & limits (CR-494)
- Separate restaurant-level PIN per action: cancel before serve, cancel after serve, cancel after bill, order edit after bill, apply discount, complimentary.
- Threshold per action in ₹ **incl. tax** (OD-494-A); discount threshold = ₹ of discount (OD-494-B). Up to → no PIN; above → PIN; 0 = always.
- Edit-after-bill PIN for EVERYONE, no skip for `order_edit_access` (OD-494-D).
- Daily per-user limits for cancels AND discounts in ₹ AND count, same for all users; counters SERVER-SIDE shared across devices (OD-494-C), reset per business day; over limit → allowed with PIN.
- Whole-order comp (CR-445, P1) = right only, no PIN (OD-445-B).
- PIN popup design = M4 (subtitle names action + reason; daily usage line; wrong-PIN error; Back/Confirm).
- Cancel stage: FE sends `cancel_type` Pre-Serve/Post-Serve but backend derives its own (`Pre-Cooking`) → after-serve detection is server-side; plan must use backend's stage for PIN choice.

### G4 Room comp (CR-495)
- Meal package at check-in (walk-in too): Room only / Breakfast / Half board / Full board; OTA = channel meal plan auto. **PMS and non-PMS outlets in the same release.**
- Guest count at check-in, editable during stay.
- Limit = ₹ per guest × guests checked in, **separate per meal**, reset per **business day**.
- Above limit → PIN. Room only → comp allowed with PIN.
- UI: M8 (check-in) — CheckInForm.jsx (`components/pms/frontdesk/`), room line in M5.
- **OPEN (owner + backend):** half-board second meal (lunch or dinner); how a comp maps to a meal (time window vs cashier). Mark TBD in plan; do not guess.

### G5 Alerts (CR-443)
- 7 events: cancel before serve, cancel after serve, unpaid, payment method changed, discount above ₹X, complimentary given, cancel after bill print.
- Content: order, item, table/room, who, reason. Delivery via existing Firebase token (`LoginPage.jsx` L54–83 → `authTransform.js` L52 `fcm_token`); banner UI `components/layout/NotificationBanner.jsx` (type from title text; colours in TYPE_CONFIG).
- A right decides who CAN receive; per-device switch on a **NEW sidebar link "Notifications" under Settings** (M9). `Sidebar.jsx` is the file.
- Phase 2: read tick + tap opens order.

### G6 Routes (CR-372-B, P0)
- Delete `/settlement/preview` (`App.js` ~L244, SettlementMockup import; delete file only if unused — verify).
- `/local-printer-setup` (`App.js` L251) → wrap in ProtectedRoute. Same `LocalPrinterSetupView` also used inside Settings (`ListFormViews.jsx` L189–192) — unchanged. Release check R-3: confirm no printer device opens the URL without login.
- `/restaurant-picker` (`App.js` L160) → keep as is.
- Sequence AFTER BUG-661 (open on App.js).

---

## 5. Conflict pre-check (must re-verify at HEAD)
Line numbers above were taken 2026-11-14; re-grep before writing edits. Many open items at GATE_5A/5B touch the same hotspots: CollectPaymentPanel, OrderEntry, orderTransform, DashboardPage, OrderReportBetaPage, App.js (e.g. BUG-660/665/666, BUG-662/656/657, CR-512, BUG-652..655, BUG-626/546, CR-423, BUG-661). Declare execution order per Alpha Step 1. `CancelFoodModal.jsx` / `CancelOrderModal.jsx` had no open owners. CheckInForm/CheckInPage hold open GATE_5A items (BUG-511/512/527).
Risk: CR-492, CR-494, CR-495 = CRITICAL; CR-515, CR-493, BUG-670, BUG-674, CR-443 = HIGH; CR-372-B = LOW. CRITICAL items need owner approval + E2E regression + audit note (Alpha).

---

## 6. Expected Gate 3 output
- One plan per group: `plans/BATCH-A_G<n>_<NAME>_IMPLEMENTATION_PLAN_<date>.md` (Alpha naming: `<ID>_IMPLEMENTATION_PLAN.md`; list all item IDs in the header).
- Each plan: Code Reality, Conflict pre-check, exact edits (file, line, current → new), scope lock (WILL change / will NOT touch), risk register, execution sequence, **Verification Matrix**, **Post-Code Registry Checklist**, backend-dependency markers (which edits wait on which BA-/B-495- ID), link to the approved mockup per screen edit.
- Update `control/CR_REGISTRY.md` (Batch A table at top + item rows) and `control/registry.json` status → Gate 3 for planned items.
- Handover line per Alpha: "Plan ready … Awaiting Gate 4 GO."

---

## 7. Release checks (carry into plans)
- R-1 owners without `complementary_food` lose comp → backend role update before release.
- R-2 item cancel moves `food` → `order_cancel`.
- R-3 `/local-printer-setup` requires login.

## 8. Still open (not blocking Gate 3 writing)
- CR-495 half-board meal; meal-slot rule (owner + backend).
- Gyan: BA-08 (restaurant `complementary` flag), BA-03 (line reason overwrite).
- Backend reply not yet in → mark dependent edits "BLOCKED on BA-xx".

## 9. Environment / housekeeping notes
- Local `/app/memory` was re-pulled from `main` (commit 9b1fc198) then edited locally: registries synced to Gate 2 closed, priorities (CR-071 P1, CR-445 P1, CR-372-B P0, CR-540 P1), CR-445 BA-17/18 marked P1, Gate 2.5 docs, this handover. **Not pushed** — owner pushes via Save to GitHub.
- Local only: nested duplicate `evidence/BATCH-A-IA/BATCH-A-IA/` deleted (held UNMASKED phone/email). Still exists on GitHub `main`.
- Never print tokens/keys; probe evidence must stay masked (`***`).
- Credentials: owner said probe credentials are session-only; ask the owner before any new probe.
- Downloads served from `/app/frontend/public/downloads/` (zips + mockup copy) — not project docs.

## 10. Owner working style
"Don't assume anything." Ask open points in rounds of max 5, explain plainly when asked, summarise answers back, update docs + decisions after every round. Approval needed before any destructive step (re-pull, delete). Owner wants zip downloads of changed docs on request.
