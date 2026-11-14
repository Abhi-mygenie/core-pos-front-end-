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

## Impact-analysis order
1. Rights: CR-071, CR-492, CR-515
2. Cancel: CR-493, BUG-674, BUG-670
3. PIN + limits: CR-494
4. Comp: CR-445, CR-495
5. Alerts: CR-443
6. Phase 2: CR-529 · Track: CR-540, CR-372-B
