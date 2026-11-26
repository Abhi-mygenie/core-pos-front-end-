# SESSION HANDOVER — P0 Unblock Sequence (BUG-711 → BUG-671 → BUG-733) — 2026-11-20

**From:** PLANNING (E1) · **Status:** PROPOSED — owner to approve the order + 2 decisions below, then next agent works in THIS order.
**Why:** These three are the P0s + the shared-file blocker standing in front of Cluster C. Clearing them first de-risks Clusters C, E, G and makes BUG-735 trivial.
**Rule:** Verify each finding before coding. No remote push without owner say-so. One owner-session per shared file.

---

## Context already done
- **Cluster B** (BUG-714/715/716/717/718/729) IMPLEMENTED + pushed to `main` (`bed121c`). Live screen QA still pending (preprod login needed).
- **Cluster C IA** written: `impact/CLUSTER_C_IMPACT_ANALYSIS_2026_11_19.md`. Cluster C is FE-safe EXCEPT it depends on the three items below.

## Verified findings (re-confirm at Step 0, do not trust blindly)
1. **BUG-711 (P0/CRITICAL) — mostly already gated.** Visible Reprint button IS gated today: `OrderReportBetaPage.jsx:780` → `hasPermission('print_icon') && f_order_status===6`. Remaining exposure = the **Collect-drawer print path**: `handlePrintBillFromBeta` (L423) passed as `onPrintBill` to `CollectBillPanelDrawer` (L929) has **no `print_icon` check**. This is the CR-553 "gate Collect-flow bill print" gap. → **verify + likely 1-line gate**, not a big fix.
2. **BUG-733 (P3) — much bigger than filed.** Native `type="date"` inputs exist in **~65 files** across the reports module (not just Credit + Order Beta). A blanket shadcn-calendar swap is a cross-cutting refactor. → build ONE reusable picker, migrate ONLY the 2 flagged screens now.
3. **BUG-671 (P0/HIGH) — the long pole.** Financial, Fast-Lane ineligible, Gate-1, intake `25_BUG-671_UNPAID_PARTIAL_PAYMENT_ORDER_REPORT_INTAKE.md`. Fix almost certainly needs a **backend answer** (can a partial/split order be reversed-to-unpaid via API, and what happens to the paid leg?).

---

## APPROVED-PENDING work order (do in this sequence)

### Step 1 — BUG-711 (quick P0 win)
- VERIFY the Collect-drawer print path is the only ungated print. Probe `CollectBillPanelDrawer` + `handlePrintBillFromBeta`.
- If confirmed: add `hasPermission('print_icon')` gate on the Collect/print action (align with CR-553). If already gated → close as no-op with evidence.
- File: `pages/reports-module/OrderReportBetaPage.jsx` (+ maybe `components/reports/CollectBillPanelDrawer.jsx`). Shares file with Cluster C/671/733 → coordinate session.

### Step 2 — BUG-671 (start backend immediately; runs in parallel)
- PLANNING: write Gate-2 IA + raise the **backend brief/probe** on day one (longest lead time).
- Do NOT claim fixed until backend confirms partial-order reversal semantics.
- Files: payment mutation path (`paymentMutationService.makeOrderUnpaid`) + wherever the Unpaid gate lives (`OrderReportBetaPage.jsx` L764, Credit page).

### Step 3 — BUG-733 (OD-P0-1 = (a), RESOLVED)
- **REUSE the existing `components/reports/DatePicker.jsx`** (shadcn Calendar; already used by AllOrders/RoomOrders/OrderSummary). Do NOT build a new component.
- Migrate ONLY Credit + `OrderReportBetaPage.jsx` L553/556 now. Leave the other ~63 screens (native input + CalendarIcon style) as a separate tracked UI-consistency rollout.

### Then (fall-out, not in the three)
- **BUG-735** → trivial: hide Change/Unpaid on split rows (`payment_method_raw !== 'partial'` on L754/L764), consistent with BUG-671.
- **Cluster C** → clean FE batch (724/725/726/727/728/737 + 735) per its IA.
- **Cluster G** → reference the new `<DateRangePicker>` instead of re-fixing the control.

---

## DECISIONS NEEDED FROM OWNER (block Step 2 & 3)
- **D1 (BUG-733 scope): RESOLVED = (a)** — reuse existing `components/reports/DatePicker.jsx`, migrate ONLY Credit + Order Beta now; full ~65-screen rollout is a separate effort.
- **D2 (BUG-671 backend):** confirm partial/split order → unpaid is supported server-side and the expected effect on the already-paid leg. FE cannot finish without this.

## Shared-file lock
`OrderReportBetaPage.jsx` is touched by BUG-711, BUG-671 (Unpaid gate), BUG-733 (L553/556), BUG-735 and all of Cluster C. Line-ranges are disjoint, but **one owner-session/PR at a time** on this file.

## Artifacts
- Cluster C IA: `impact/CLUSTER_C_IMPACT_ANALYSIS_2026_11_19.md`
- Cluster B impl handover: `handover/SESSION_HANDOVER_2026-11-20_CLUSTER_B_IMPL.md`
- Owner decisions log: `control/OWNER_DECISIONS_2026_11_20.md` (D1/D2 appended, status PROPOSED)
