# QA Handover — BUG-711 (Order Report Beta — Reprint without print_icon permission)

**Date:** 2026-11-25 · **Risk:** HIGH/CRITICAL · **Sprint:** nov_cr_batch
**File:** `src/pages/reports-module/OrderReportBetaPage.jsx`

---

## 1. Verification Matrix

| Edit | File | Change | Self-Test |
|---|---|---|---|
| E1 | OrderReportBetaPage.jsx:790-791 | `{hasPermission('print_icon') && row.f_order_status === 6 && (` — Reprint now gated by print_icon right — BUG-711 | ✅ confirmed L790-791 |

Compile: webpack clean.

---

## 2. Browser Test Cases

**Account constraint:** `testwait@thepalmhouse.com` does NOT have `report` permission — cannot access Order Beta.
**Required:** A Palmhouse staff account that has `report` permission but does NOT have `print_icon`.

> **ACTION NEEDED:** Owner to provision a palmhouse staff account with `report` right but without `print_icon`. Until then, T2 is CANNOT_VERIFY via browser. Code is verified ✅.

| # | Test | Steps | Expected |
|---|---|---|---|
| T1 | Owner sees Reprint | Login as owner@palmhouse.com → Orders (Beta) → Settled tab → settled row | "Reprint" button **visible** (owner has print_icon) |
| T2 | Staff without print_icon — no Reprint | Login as [staff-with-report-no-print_icon] → Orders (Beta) → Settled tab | "Reprint" button **hidden** ⚠ NEEDS ACCOUNT |
| T3 | Staff without print_icon — Change still visible if update_payment | Same staff (if has update_payment) | "Change" button still visible (gated separately) |
| T4 | Reprint actually prints when clicked | Owner → click Reprint on settled row | Print dialog appears / printer fires |

---

## 3. Regression Tests

| # | What | Why |
|---|---|---|
| R1 | Owner can still Reprint | hasPermission('print_icon') returns true for owners |
| R2 | Other action buttons (Change, Unpaid, Collect) unaffected | Only Reprint gate changed |

---

## 4. Registry Sync Confirmation

Registry: BUG-711 → GATE_5A_IMPLEMENTED · Sprint: nov_cr_batch ✅

---

## 5. Credentials + Environment

| Account | Password | Use |
|---|---|---|
| owner@palmhouse.com | Qplazm@10 | T1 baseline — Reprint visible |
| [MISSING] Staff on palmhouse with `report` but no `print_icon` | Qplazm@10 | T2 — Reprint hidden ⚠ |

**Blocker note:** testwait@thepalmhouse.com lacks `report` permission → redirected from Order Beta. T2 currently CANNOT_VERIFY until a suitable staff account is provisioned.
Suggested permissions for new account: `['Manager', 'report', 'report_summery', 'revenue_report', 'order', 'pos']` — with `print_icon` EXCLUDED.
