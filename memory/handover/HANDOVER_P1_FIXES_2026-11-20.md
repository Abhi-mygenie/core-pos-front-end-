# HANDOVER — P1 FIX AGENT — 2026-11-20

You own the P1 set: broken features / silently-disabled controls / misleading money + two verify-first CRs. Gate 2→4 each, then route to QA. Do NOT self-verify — testing_agent confirms.

Test accounts (pw `Qplazm@10`): owner@palmhouse.com, owner@thegoankitchen.com (#1578881).

---

## BUG-682 (P1, was P0) — CR-493 cancel-note mandatory always false  [SILENT CONTROL FAILURE]
`cancelNoteMandatory` is mapped onto the wrong transform object → always `false`, so the CR-493 "cancellation reason mandatory" control (a revenue-leakage guard the owner prioritised) is silently OFF. Find the correct transform object (profile/settings transform) and map the flag to the real source field. Pair with CR-493 QA in Batch 4.

## BUG-681 (P1, was P0) — CR-526 Remove button never renders  [DEAD FEATURE]
`coverage.status` is checked where it should be `coverage.type`, so the Remove/void-unpaid button in Credit never renders → the shipped CR-526 feature is unusable. One-field fix; then verify the void-unpaid flow end-to-end. Pair with CR-526 QA in Batch 3.

## BUG-738 (P1, was P0) — Channel/amount mismatch in popup  [MISLEADING MONEY]
Order #1578881 has `order_in=RM` (table 9239). Dashboard places it under the Room column at ₹8,622, but ScanOrderPopOut labels it Dine-In at ₹411 and OrderEntry shows the raw table id 9239. Reconcile channel + amount source across dashboard/popout/OrderEntry so all three agree. Repro on owner@thegoankitchen.com.

## BUG-734 (P1, was P0) — Credit remove: [null] names + silent failure  [DATA/UX]
Credit remove flow shows `[null]` item names; a Remove failure is not surfaced (no toast). Also: split-payment inputs overflow; card txn-id field (4-digit) has no hint. Map item names correctly, surface failures via toast, fix input overflow + add hint. Credit screen, owner@palmhouse.com.

## CR-505 (P1, was P0) — Order Beta partial-payment split + payment-wise totals  [VERIFY FIRST]
Owner believes this is largely covered by BUG-645 (QA-passed): any cash part shows under Cash; Cash total = cash part only; no double-counting. ACTION: validate against code + a real split/partial order FIRST; only build the delta if a gap is found. Do not re-implement what BUG-645 already did.

## CR-510 (P1, was P0) — Aggregator item details in drill-down  [VERIFY FIRST]
`OrderDetailSheet` should render aggregator item variations/add-ons. BUG-601 (QA-passed) was about menu SAVE, not order display — so this is unconfirmed. ACTION: verify on a REAL Swiggy/Zomato order (owner@thegoankitchen.com) whether variations/add-ons appear; build only the gap. Depends on CR-509. Confirm the aggregator order payload actually carries them (see BACKEND handover).
## BUG-721 (P1, was P0) — Dashboard Print-KOT / YTC-Cancel not permission-gated  [CONTROL]
On the dashboard, TableCard `print-btn-*` (Print KOT) and `cancel-btn-*` (YTC Cancel) are ungated — a captain can print/cancel. `ChannelColumn.jsx` L321 does not pass `canPrintBill` / `canCancelOrder` down to `TableCard` (OrderCard IS already gated).
Fix direction: thread the two permission props ChannelColumn→TableCard and gate the buttons, mirroring OrderCard. Verify HIDDEN for captain, VISIBLE for owner.

---
NOTE: BUG-719 (audit 50-day timeout) was re-graded P1 but the real fix is BACKEND latency — it is on the BACKEND handover, not here (FE can only add a timeout/pagination mitigation if owner asks).
