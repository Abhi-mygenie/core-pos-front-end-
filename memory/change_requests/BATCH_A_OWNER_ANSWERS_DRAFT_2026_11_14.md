# Batch A — Owner Answers (DRAFT, round 1) — 2026-11-14

Status: DRAFT — pending owner confirmation of agent's understanding. Not yet written to registry / intake docs.

| Item | Owner answer (verbatim intent) |
|---|---|
| BUG-674 | Order-level cancel dialog has NO notes field → add it. |
| BUG-670 | Item-level cancel dialog HAS "Additional Notes (Optional)" (screenshot), but item notes never appear in any cancellation report. Re-scope: notes not shown in reports. |
| CR-493 | Reason dropdown + notes text field. Restaurant setting key (from Gyan) decides notes mandatory/optional; default = optional. |
| CR-492 | No right → comp control HIDDEN. Right key to come from Gyan. Applies to item-level AND order-level comp (order-level comp = discount type 100%). |
| CR-494 | Restaurant-level PIN per operation: cancel before serve, cancel after serve, cancel after bill, order edit after bill, apply discount. Plus separate config: max total cancellation per user per day. Owner wants suggestions to minimise revenue leakage. |
| CR-529 | Move to P1. |
| CR-515 | New rights: print (reprint), change payment method, make unpaid (if not existing). No right → button hidden. |
| CR-495 | At check-in staff pick breakfast package; room then allows comp items up to a price limit based on number of guests; beyond limit → PIN. Meal plans: breakfast + half board + full board. Walk-in: same logic (package chosen at check-in). |
| CR-496 | Alert content OK. POS + phone push. Recipients controlled by a new right. Phase 2: read/acknowledged tick + tap alert opens the order. |
| CR-058 / CR-445 | Same requirement. Button inside payment-methods list. Comp count in a report. Item-level comp already handled. |
| CR-071 | Bring into batch. |
| CR-372-B | Owner asked which pages — answered: only /settlement/preview and /local-printer-setup open without login. |
| CR-443 / CR-496 | Owner: look at together, seem same CR. |

## Round 2 answers (2026-11-14)

| # | Answer |
|---|---|
| A1 | Order-level cancel notes must show in cancellation report. |
| A2 | Notes shown in Cancellation report AND Order Beta. |
| A3 | Reason dropdown ALWAYS mandatory (order + item). |
| A4 | One setting (notes mandatory/optional) for both order and item cancel. |
| A5 | Comp right hides 100% discount automatically (fallback, not list-type dependent). |
| A6 | Different PIN per action. |
| A7 | PINs set in backend admin panel (phase 1). |
| A8 | PIN required when action's PIN is on; separate amount config: allow up to amount, then PIN; amount 0 = PIN always. |
| A9 | Daily cancel limit per user: ₹ AND count. |
| A10 | Over limit → allowed with PIN. |
| A11 | Discounts also get daily per-user limit. |
| A12 | PIN only for now; OTP phase 2 for all actions. |
| A13 | Comp needs PIN (treated like a discount). |
| A14 | Collect (pay-later) also needs a right. |
| A15 | Any food item can be comped (room package). |
| A16 | ₹ limit per guest set per package in settings. |
| A17 | Limit resets each day. |
| A18 | Half/full board lunch+dinner comp: yes, but not tracked yet — discuss at impact. |
| A19 | OTA meal plan from channel manager used automatically. |
| A20 | Right decides who CAN receive; employee can switch off on this device. |
| A21 | Merge CR-496 into CR-443. |
| A22 | Alert list as given for now; more at impact. |
| A23 | Read-tick model decided in phase 2. |
| A24 | Whole-order comp asks a reason (item-level already has one). |
| A25 | Whole-order comp PIN depends on right — detail at impact. |
| A26 | Comp count in existing Discount report (comp section). |
| A27 | Keep latest ID (CR-445). |
| A28 | CR-071 → Abhishek for now. |
| A29 | Delete /settlement/preview demo page. |
| A30 | /local-printer-setup — understand at impact. |
| A31 | Not clear — re-asked. |
| A32 | Abhishek FE, "waiting on Gyan" noted. |
| Ideas | Leakage ideas 1–8 to be registered as new intake CR(s). |

