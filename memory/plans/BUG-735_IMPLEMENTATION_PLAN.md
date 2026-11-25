# BUG-735 — Implementation Plan (Gate 2 IA + Gate 3) — 2026-11-20

**ID:** BUG-735 · **Type:** BUG · **Priority:** P2 · **Risk:** MEDIUM
**Area:** Reports / Payments (Order Beta) · **Sprint:** nov_cr_batch · **Assignee:** Abhishek
**Author:** PLANNING agent · **Date:** 2026-11-20
**Scope:** single file, single condition. Mirrors the already-shipped Audit-report gating (OrderTable.jsx).

---

## 0. Scope note — why only BUG-735 (two sibling items excluded)
This plan was requested alongside "BUG-711 / CR-553". Both are **excluded by prior decisions** — do NOT implement:
- **BUG-711** = `GATE_5A_IMPLEMENTED` (2026-11-19). Per-row **Reprint** is already gated by `hasPermission('print_icon')` at `OrderReportBetaPage.jsx:780`. Nothing to plan.
- **CR-553** = `CLOSED — DECLINED (owner, 2026-11-19)`. Owner ruled: "Collect-flow bill print is acceptable as-is; no extra `print_icon` gate required" (`impact/BATCH_2026_11_19_IMPACT_ANALYSIS.md` L116). The ungated Collect-drawer Print-Bill button (`CollectPaymentPanel.jsx:1462`) is **intentionally left as-is**. Reopening requires a new owner decision.

---

## 1. Gate 2 — Impact Analysis

**Code Reality: PARTIAL.** The Unpaid action on Order Beta already works for split orders (correct, per BUG-671/OD-671-A). The defect is only that **Change Method is also offered on split rows**, where it is unsupported.

**Symptom:** On the Order Beta report (`/reports-module/order-report-beta`), a settled **split / partial-paid** row (`payment_method_raw === 'partial'`, badge "Split Bill") shows BOTH the **Change** payment-method picker and the **Unpaid** button.

**Why it's wrong:** Per **OD-671-A**, changing the payment method of a split order is **Phase 2 / not supported** — the change-method endpoint only accepts `cash/card/upi`, not `partial`. Offering "Change" on a split row is misleading and would fail. The **Unpaid** action, by contrast, IS supported for split orders (backend reverses every paid leg; whole bill → unpaid) and must remain.

**Reference behaviour (already correct in the sibling report):** `components/reports/OrderTable.jsx` L249-250 —
`UNPAID_ALLOWED_METHODS = ['cash','card','upi','partial']` (Unpaid incl. partial) vs
`CHANGE_METHOD_ALLOWED_METHODS = ['cash','card','upi']` (Change excludes partial).
Order Beta simply has not mirrored the Change-side exclusion yet.

**Data flow:** report row → `row.payment_method_raw` (`'partial'` for split, set by backend; used throughout Beta at L87/L184/L216-220) → row-actions `<td>` (L750-826) → **Change** gate L754 / **Unpaid** gate L764.

**Risk: MEDIUM.** UI-visibility gate only. No API/transform/state/socket/localStorage change. Not financial mutation logic (it only hides a button that currently leads to a failing action). Fast-Lane: not used (shared R5 file + owner-approval discipline; run normal gate).

---

## 2. Conflict Pre-Check
- `OrderReportBetaPage.jsx` is a shared R5 hotspot touched by BUG-711 (done), BUG-733 (planned, L553/556), and Cluster C (planned).
- **This edit is at L754 — disjoint** from BUG-733 (L553/556) and from the Unpaid gate (L764). BUG-671's FE change lives in `OrderTable.jsx` (Audit), not here.
- **Shared-file lock:** one owner-session/PR at a time on `OrderReportBetaPage.jsx`. Land BUG-735 in its own PR (or a single combined Beta PR) — do not interleave with BUG-733 in parallel sessions.

---

## 3. Gate 3 — Implementation Plan (exact edit)

### Edit 1 of 1 — hide Change Method on split rows
**File:** `frontend/src/pages/reports-module/OrderReportBetaPage.jsx`
**Line:** 754 (the Change / `PaymentMethodPicker` guard)

**Current:**
```jsx
{hasPermission('update_payment') && row.f_order_status === 6 && !row.razorpay_order_id && (
  <PaymentMethodPicker
```

**New:**
```jsx
{/* BUG-735: Change Method not offered on split/partial rows (Phase 2, matches OD-671-A + Audit OrderTable) */}
{hasPermission('update_payment') && row.f_order_status === 6 && !row.razorpay_order_id && (row.payment_method_raw || '').toLowerCase() !== 'partial' && (
  <PaymentMethodPicker
```

**Do NOT touch:** the **Unpaid** gate at L764 (must keep showing on split rows), the Reprint gate L780, the Collect gate L814, or any helper/transform.

---

## 4. Verification Matrix (seeds self-test + QA)

| # | File | Change | How to verify | Automated? |
|---|------|--------|---------------|:---:|
| 1 | OrderReportBetaPage.jsx:754 | Add `payment_method_raw !== 'partial'` to Change guard | On a **split ("Split Bill")** settled row: **Change picker is GONE**, **Unpaid button still present** | NO (browser) |
| 2 | " | Non-split rows unaffected | On a **cash/card/upi** settled row: **both** Change + Unpaid still show (unchanged) | NO (browser) |
| 3 | " | No regression to mutation window | Row older than yesterday: Unpaid shows disabled with tooltip (unchanged) | NO (browser) |
| 4 | " | Compile | `yarn build` / webpack compiles, 0 new warnings | YES |

Read-only QA (no preprod mutation) covers #1/#2/#3 — they are visibility checks, no click-through needed.

---

## 5. Post-Code Registry Checklist (Implementation agent executes)
- [ ] `registry.json`: BUG-735 → status `IMPLEMENTED`, current_gate 5, sprint_key `nov_cr_batch`
- [ ] `BUG_TRACKER.md`: BUG-735 row updated to IMPLEMENTED
- [ ] `FILE_OWNERSHIP.md`: add `OrderReportBetaPage.jsx` L754 — BUG-735 split-row Change gate + date
- [ ] Code marker: `// BUG-735` comment on the edited line (included in the edit above)

---

## 6. Scope lock
- **Files WILL change:** `frontend/src/pages/reports-module/OrderReportBetaPage.jsx` (1 line).
- **Files WILL NOT touch:** `OrderTable.jsx`, `CollectPaymentPanel.jsx`, `CollectBillPanelDrawer.jsx`, `PaymentMethodPicker.jsx`, `paymentMutationService.js`, any transform/service.
- **Owner decisions needed:** none (behaviour locked by OD-671-A). Awaiting **Gate 4 GO** only.
