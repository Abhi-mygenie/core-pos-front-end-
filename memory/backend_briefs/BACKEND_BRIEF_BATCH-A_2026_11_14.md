# Backend Brief — Batch A (Cancellation · Complimentary · Rights · PIN · Alerts) — 2026-11-14

To: Gyan (backend) · FE: Abhishek · Room/meal items: see separate brief `BACKEND_BRIEF_CR-495_ROOM_COMP_MEAL_PACKAGE_2026_11_14.md` (Parth)
Client: ALL · Gate 2 closed on this brief.
Sources: `impact/BATCH-A_IMPACT_ANALYSIS_SUMMARY_2026_11_14.md`, `change_requests/BATCH_A_OWNER_DECISIONS_2026_11_14.md`, evidence `evidence/BATCH-A-IA/probes_2026_11_14/`.
Owner rule: all changes ADDITIVE — existing behaviour must keep working (exceptions noted under "Release impact").

## 1. Cancel notes & reasons (BUG-670, BUG-674, CR-493)
| ID | Ask | Evidence / detail |
|---|---|---|
| BA-01 | Item cancel note: accept + store a note on `PUT cancel-food-item`; return it per line in cancel-order-list and insights cancellations. Propose field name (FE will send it). | Probe: `cancel_reason_text`, `notes`, `cancellation_note`, `cancel_note` all → 200 but none stored (files 20–26). |
| BA-02 | Order Beta: return order `cancellation_reason`, `cancellation_note`, and per-line cancel reason/note. | File 09: Order Beta row has no cancel fields. |
| BA-03 | Full-order cancel must NOT overwrite each line's `reason` with the order note. | Probe: line 3969231 `reason` = order note. |
| BA-04 | Order cancel note: save EMPTY when blank (FE stops sending reason text as note). | OD-674-A. |
| BA-05 | Restaurant setting: cancel notes mandatory / optional (one key for order + item), default optional. | CR-493; settings-list has no key (file 03). |
| BA-06 | Confirm the cancellation-reasons list keeps `item_type` Order / Food; FE blocks cancel when none configured. | File 06; OD-493-B. Info only. |
| BA-23 (added 2026-11-15) | When the last item is cancelled, backend auto-cancels the order with `cancellation_reason` = null and `canceled_by` = null. Insights cancellations then counts those lines again as ORDER cancels "No reason provided". Ask: (a) on auto-cancel, store the reason (e.g. last item's reason) + who; (b) Insights must not double count item cancels as order cancels. Same for merge cancels (`cancel_state: Merge`). | Orders 021028, 021319, 021432 (RID 644): items have `reason_type` 332/337/333 + `cancel_by` 3092; order reason null. Insights Nov 1–14: 5 rows / ₹1,360 "No reason provided". `evidence/BATCH-A-G3/05_*, 07_*`. |
| BA-24 (added 2026-11-15) | Razorpay refund-cancel: FE will send the Refund Note also as `cancellation_note` on `order-status-update` (same note on refund call). Confirm this key is correct for refund cancels. | Owner R14-Q1 (owner rechecking with backend). |

## 2. Rights (CR-492, CR-515)
| ID | Ask | Detail |
|---|---|---|
| BA-07 | Enforce `complementary_food` server-side: reject `is_complementary=Yes` (item and whole-order) from users without the right. | Files 31/32: backend accepted comp from a user without the right. |
| BA-08 | Explain restaurant-level `complementary` flag ("No" on cafe103 / Palm House) — does it interact with the right? | Question. |
| BA-09 | CR-515 uses EXISTING rights (no new keys phase 1): `update_payment` (change payment method), `order_unpaid` (make unpaid), pay-later collect right — confirm the key for collect pay-later. Server-side enforcement on these endpoints requested. | Role list files 04/05/07. |
| BA-10 | Phase 2 (NOT now): separate item-cancel right key. Phase 1 FE uses `order_cancel` for item cancel. | Owner R9. |

## 3. PIN, thresholds, daily limits (CR-494) — all new
| ID | Ask | Detail |
|---|---|---|
| BA-11 | Restaurant-level PIN, SEPARATE per action: cancel before serve, cancel after serve, cancel after bill, order edit after bill, apply discount, complimentary. Set in backend admin (phase 1). | No endpoints today — guessed paths all 404 (file 30). |
| BA-12 | Threshold per action in ₹ (incl. tax). Up to threshold → no PIN; above → PIN; 0 = PIN always. Discount threshold = ₹ of discount (not %). | OD-494-A/B. |
| BA-13 | Edit-after-bill PIN applies to EVERYONE (no skip for `order_edit_access`). | OD-494-D. |
| BA-14 | Daily per-user limits for cancels AND discounts, in ₹ AND count, same for all users in the restaurant. Counters kept SERVER-SIDE (shared across devices), reset per business day. Over limit → allowed with PIN. | OD-494-C. |
| BA-15 | APIs: (a) read PIN config/thresholds/limits for POS, (b) verify PIN for an action (never return PIN value), (c) read current user's used counters, (d) reject protected actions without a valid PIN when required. | — |
| BA-16 | Phase 2 (NOT now): OTP for all PIN actions (CR-529, P1). | Owner R8. |

## 4. Whole-order complimentary (CR-445 + CR-058) — **P1** (owner 2026-11-14; can follow after P0 asks)
| ID | Ask | Detail |
|---|---|---|
| BA-17 (P1) | Whole-order comp saved as the existing 100% "Complementary" discount preset, with required reason; counted in Discount report comp section. | `restaurant_discount_type[0]` (file 02). |
| BA-18 (P1) | Rules: `complementary_food` right required, NO PIN; normal orders only — reject on room and credit (TAB) orders. | OD-445-B / OD-445-C. |

## 5. Alerts (CR-443 + CR-496)
| ID | Ask | Detail |
|---|---|---|
| BA-19 | Push events (7): cancel before serve, cancel after serve, unpaid, payment method changed, discount above set ₹, complimentary given, cancel after bill print. Content: order, item, table/room, who, reason. | OD-443-A. |
| BA-20 | Delivery via existing Firebase token flow (`fcm_token` sent at login), same as current notifications; POS + phone. | OD-443-B. |
| BA-21 | New right deciding who CAN receive alerts; per-device opt-out handled FE. | CR-443. Phase 2: read tick + tap to open. |
| BA-22 | Setting key for the "discount above ₹X" alert amount. | — |

## Release impact (must be confirmed before release)
- R-1: Comp hidden for everyone without `complementary_food`. Owners lacking it today (cafe103 RID 644, Palm House RID 541, likely more) lose comp → backend to update role defaults / admin before release. (OD-492-B)
- R-2: Item cancel moves from `food` to `order_cancel` (OrderEntry.jsx L353) → users with `food` but not `order_cancel` lose item cancel. Owner approved.
- R-3: `/local-printer-setup` will require login (FE only). Confirm no printer device opens it without login.

## No backend work
CR-372-B (delete `/settlement/preview`, guard `/local-printer-setup`), CR-071 (FE rights wiring; full wiring on hold), `/restaurant-picker` unchanged.

## Out of scope (P1 / later)
CR-529 OTP, CR-540 revenue-leakage controls, reprint right, separate item-cancel right.
P1 but still in this brief: BA-17, BA-18 (CR-445) — deliver after the P0 asks.

## Please reply with
Field names / endpoints per BA-ID, ETA, and anything not feasible. Reply file: `backend_replies/BACKEND_REPLY_BATCH-A_<date>.md`.
