# SESSION HANDOVER — 2026-10-16 — Intake Session Close (nov_cr_batch)
**Role:** INVESTIGATION → INTAKE (closed)
**Date:** 2026-10-16
**Code changed:** NONE
**All 12 items:** P0 · GATE_1_INTAKE_COMPLETE or GATE_1_INTAKE_BACKEND_BLOCKED

---

## Items Registered — nov_cr_batch

| ID | Title | Status | ODs |
|---|---|---|---|
| **CR-429** | Active table toggle — show active first | GATE_1_INTAKE_COMPLETE · P0 | LOCKED |
| **BUG-571** | Order view card gaps | GATE_1_INTAKE_COMPLETE · P0 | LOCKED |
| **BUG-572** | WhatsApp icon shown to all restaurants | GATE_1_INTAKE_COMPLETE · P0 | OPEN — key pending |
| **BUG-573** | Variation selected option not shown | GATE_1_INTAKE_BACKEND_BLOCKED · P0 | Backend blocked |
| **BUG-574** | Serve timing 0m — ready_at/serve_at null | GATE_1_INTAKE_BACKEND_BLOCKED · P0 | Backend blocked |
| **BUG-575** | Header click doesn't open order screen | GATE_1_INTAKE_COMPLETE · P0 | NONE — fast lane |
| **BUG-576** | Room number search not working | GATE_1_INTAKE_COMPLETE · P0 | LOCKED — item.roomNumber |
| **BUG-577** | Cancelled items on print bill | GATE_1_INTAKE_COMPLETE · P0 | OPEN — print path TBD |
| **CR-430** | Served card height reduction + collapse | GATE_1_INTAKE_COMPLETE · P0 | LOCKED |
| **BUG-578** | Room transfer items not printing | GATE_1_INTAKE_BACKEND_BLOCKED · P0 | Backend blocked |
| **BUG-579** | Cancellation report ₹ values missing | GATE_1_INTAKE_BACKEND_BLOCKED · P0 | Backend blocked |
| **BUG-580** | Discount types missing from report | GATE_1_INTAKE_BACKEND_BLOCKED · P0 | Backend blocked |

---

## Locked Decisions

| ID | Decision |
|---|---|
| BUG-576 | Room "106" = `item.roomNumber` from `t.table_no` in roomListTransform.js. Search was checking `item.id` (DB internal id). Fix: add `item.roomNumber` to room search. |
| BUG-575 | `OrderCard.jsx:L468` header div `stopPropagation` blocks `onEdit`. Remove from header, keep on individual action buttons inside. |
| BUG-571 | Hide empty status group containers. Cards tile consecutively. |
| CR-429 | Sort active/occupied tables first. Session-state toggle. |
| CR-430 | (1) Remove `min-h-[44px]` from static served checkmark div (L858) — each row drops from 44px → ~20px. (2) Default collapsed. |

## Open Decisions (unblocks next)

| ID | What unblocks it |
|---|---|
| BUG-572 | Owner provides restaurant settings key for WhatsApp feature gate |
| BUG-577 | Owner identifies which print path shows cancelled items |
| BUG-573/574/578/579/580 | Backend team fixes missing data fields |

---

## Next Session Entry

1. Read this handover
2. Read `/app/memory/control/AGENT_PROMPT_ALPHA.md`
3. **If owner provides BUG-572 key** → Planning Gate 2 IA for BUG-572
4. **Fast lane batch (BUG-575, BUG-576, BUG-571, CR-429, CR-430)** → Planning Gate 2 IA → Gate 3 → Implementation
5. Do NOT implement anything from this session without Gate 4 GO

---

## Intake docs (all in change_requests/)
`CR-429_ACTIVE_TABLE_TOGGLE_INTAKE.md` · `BUG-571_ORDER_VIEW_CARD_GAPS_INTAKE.md` · `BUG-572_WHATSAPP_ICON_NO_FEATURE_GATE_INTAKE.md` · `BUG-573_VARIATION_SELECTED_OPTION_NOT_SHOWN_INTAKE.md` · `BUG-574_ITEM_TIMING_SERVE_ZERO_INTAKE.md` · `BUG-575_ORDER_CARD_HEADER_CLICK_NO_OPEN_INTAKE.md` · `BUG-576_ROOM_NUMBER_SEARCH_NOT_WORKING_INTAKE.md` · `BUG-577_CANCELLED_ITEMS_ON_PRINT_BILL_INTAKE.md` · `CR-430_SERVED_ITEMS_COLLAPSIBLE_PREFERENCE_INTAKE.md` · `BUG-578_ROOM_TRANSFER_NOT_PRINTING_INTAKE.md` · `BUG-579_CANCELLATION_REPORT_VALUES_MISSING_INTAKE.md` · `BUG-580_DISCOUNT_REPORT_TYPES_MISSING_INTAKE.md`
