# Session Handover — Remaining P0 items (BUG-705, 708, 709, 712)

**Date:** 2026-11-19 · **Sprint:** nov_cr_batch · **Assignee:** Abhishek · **Priority:** P0 · **Release:** 2026-11-17 · **Client:** ALL
**Backend:** external Laravel (`preprod.mygenie.online`) — some items need backend confirmation, not FE code.
**Reference docs:**
- IA (Gate 2): `memory/impact/BATCH_2026_11_19_IMPACT_ANALYSIS.md`
- Plan (Gate 3): `memory/plans/BATCH_2026_11_19_IMPLEMENTATION_PLAN.md`
- Probe evidence: `memory/evidence/BATCH_2026_11_19_IA/` (login, profile_beanmeup, ruby_orderlogs, ruby_dashboard, cancellations, single_*)

## Test accounts (all password `Qplazm@10`)
- `owner@cafe103.com` — GST restaurant (gst_status=true), 50 perms (has print_icon + clear_payment). Has 65 cancellations (8 with `notes`).
- `owner@beanmeup.com` — VAT restaurant (gst_status=false, vat_info.status=true).
- `owner@ruby.com` — has order 000802 (make_unpaid→cancel) and 000803 (after-print discount).
- `T@t.com` — Cashier, **print_icon=false, clear_payment=false** (no-print repro account).

---

## Already DONE this session (context, not to re-do)
- **Implemented + pushed to main** (`a5ec83ea..6bebb0fb`): BUG-711, BUG-704, BUG-706, BUG-707 → status `GATE_5A_IMPLEMENTED`, awaiting Gate 5B QA.
- **Closed:** BUG-710 (NO DEFECT — field works; ruby 000803 stored restaurant_discount_amount=59.9), CR-553 (DECLINED by owner — Collect-flow print acceptable, no print_icon gate).

---

## REMAINING — needs owner discussion before proceeding

### BUG-705 — PayLater Collect shows only Cash/UPI/Card  — status `GATE_3_PLAN_COMPLETE`
- **Owner decision already given:** Option A — show ALL configured payment methods on OrderBeta PayLater Collect.
- **Gate status:** Plan done; **Gate 4 GO was explicitly WITHHELD** by owner in this session ("gate 4 go except BUG-705"). Needs owner GO to implement.
- **Why it was held / the risk:** `CollectBillPanelDrawer.jsx` is SHARED by two callers:
  - `OrderReportBetaPage.jsx` (L921) — OrderBeta PayLater → wants ALL methods.
  - `AllOrdersReportPage.jsx` (L1151) — Audit→Hold Collect → **owner-locked to Cash/Card/UPI (BUG-042-A)**.
  The restriction is hardcoded inside the shared drawer at `CollectBillPanelDrawer.jsx` **L300** `allowedMethods={['cash','card','upi']}`.
- **Planned fix (caller-driven prop, preserves BUG-042-A):**
  1. `CollectBillPanelDrawer.jsx`: accept `allowedMethods` prop (sig ~L79-100) and forward to `<CollectPaymentPanel allowedMethods={allowedMethods}/>` at L300.
  2. `AllOrdersReportPage.jsx` L1151: pass `allowedMethods={['cash','card','upi']}`.
  3. `OrderReportBetaPage.jsx` L921: pass NO allowedMethods (→ all configured).
  `CollectPaymentPanel.jsx` already consumes `allowedMethods` (isHoldContext = non-empty array; L505).
- **Risk:** MEDIUM (shared, owner-locked component). **Mandatory regression:** Audit→Hold Collect still shows ONLY Cash/Card/UPI; OrderBeta PayLater now shows Split/Credit-TAB/To-Room/dynamic.
- **Ask owner:** confirm Gate 4 GO for BUG-705 as a standalone (de-risked) batch.

### BUG-708 — Cancellation Report "staff cancel note" column always "—"  — status `GATE_2_IA_AWAITING_OWNER`
- **Report:** Cancellation Report (`/reports-module/cancellations`), "Cancellation Details" table.
- **Finding (live probe, cafe103, 65 rows):** there are TWO note columns — "Notes" (reads `notes`, WORKS, 8/65 populated) and an unlabelled staff-note column (BUG-674 B2, reads unmapped `r.cancelNote` → always "—"). API field `cancel_item_note` is EMPTY in all 65 rows; `cancel_note` does not exist. Only `notes` carries text.
- **Code anchors:** transform `CancellationsMockup.jsx` ~L275 maps `notes: i.notes` (no `cancelNote` mapping). Render L971-977 reads `r.cancelNote`.
- **OPEN QUESTION for owner:** what should the staff-note column show vs the working "Notes" column?
  - (a) same note → point it at `notes` (or drop the redundant column), OR
  - (b) a distinct staff cancel-note → backend must start populating `cancel_item_note` (backend brief).
- **Owner said:** "will check and get back." A UI screenshot was requested but headless login didn't pass the SPA login — offer to retry a UI capture.

### BUG-709 — "Make Unpaid" audit event missing after cancel  — status `GATE_2_IA_AWAITING_OWNER`
- **Finding (live probe, ruby order 000802):** dashboard `audits.orders[]` **DOES contain** the `make_unpaid` event for the cancelled order (+ a new `cancel_after_unpaid` event). Operations trail: bill_print → paid(upi) → make_unpaid → order_cancel. So **the event is NOT dropped** — overturns the original backend-drop theory. FE (`AuditLogMockup.jsx`, filter `type==='make_unpaid'`) reads it correctly.
- **OPEN:** owner to confirm whether the UI still *shows* it missing (may already be fixed backend-side, or a FE display/bucketing issue once an order is also `cancel_after_unpaid`/`late_cancel`). If still visibly missing, investigate FE bucketing of multi-event cancelled orders.
- **Owner said:** "I will check and confirm."

### BUG-712 — Customer name not attached to order  — status `GATE_2_IA_AWAITING_OWNER`
- **Findings:**
  - Read-back works: `get-single-order-new` returns `user_name`/`user.f_name` for linked orders.
  - Contract ALIGNED with the mobile brief: endpoint `/api/v1/vendoremployee/pos/user-check-create` (`LINK_CUSTOMER_ORDER`), payload fields match, `membership_id` = CRM id, `order_id` sent, headers incl. `X-localization: en`. Web also does CRM lookup + silent create (BUG-183 L1079-1086).
  - **Suspected gap (orchestration):** on blur, `CartPanel.handleFieldBlur` emits the customer IMMEDIATELY (id possibly null) → `saveCustomerToServer` fires `user-check-create` with **empty `membership_id`**, THEN the async CRM lookup/create resolves and fires a SECOND call with the real `crmId`. Brief wants CRM-first → a SINGLE call with `crmId`. Also `saveCustomerToServer` early-returns if order not yet placed (`if (!orderId) return`) — pre-placement typing relies on place-order payload `cust_name` (which IS sent, orderTransform L1109).
- **Code anchors:** `OrderEntry.jsx` saveCustomerToServer L1109-1131 + onCustomerChange L2966; `CartPanel.jsx` handleFieldBlur L1048-1094.
- **OPEN QUESTIONS for owner:**
  1. Does the backend require a non-empty `membership_id` (crmId) to actually attach the customer to the order? (decides whether the race is the root cause)
  2. Share the specific failing order (e.g. #015925) and how the name was entered (typed-in-cart vs selected).
  3. Approval needed to run a **write** probe of `user-check-create` (empty vs populated membership_id) on a throwaway order to confirm backend behaviour — not done (read-only rule).
- **Likely fix (pending answers):** mirror the mobile brief — await CRM sync, then fire ONE `user-check-create` with the resolved `crmId`; decouple from the eager blur emission.
- **Owner said:** "will share."

---

## Suggested next-agent flow
1. **BUG-705:** get Gate 4 GO → implement caller-prop fix as a standalone batch → focused regression on both Collect flows → Gate 5B QA.
2. **BUG-708:** get owner answer (a/b) → either FE 1-line (point column at `notes` / drop it) or backend brief.
3. **BUG-709:** owner UI confirm → likely close as fixed, or FE bucketing investigation.
4. **BUG-712:** owner answers Q1/Q2 (+ Q3 write-probe approval) → IA finalise → plan the CRM-first single-call fix.

## Registry
- BUG-705 `GATE_3_PLAN_COMPLETE`; BUG-708/709/712 `GATE_2_IA_AWAITING_OWNER`. All four now P0, release 2026-11-17, assignee Abhishek, sprint nov_cr_batch.

*No code written in this handover. No gates skipped. Probes read-only. BUG-705 not yet given Gate 4 GO.*
