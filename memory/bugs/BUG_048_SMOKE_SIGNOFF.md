# BUG-048 — Smoke Sign-off

> **Sprint:** pos_final_1.0
> **Bug ID:** BUG-048
> **Title:** Room Orders Report wrongly shows Discount column/value and inflated Total after room payment
> **Date:** 2026-05-12 (current session)
> **Smoked by:** Owner
> **Final status:** `smoke_pass_ready_to_close` ✅

> **References**
> - Plan: `/app/memory/bugs/BUG_048_IMPLEMENTATION_PLAN.md` (v2, owner-locked)
> - Code gate: `/app/memory/bugs/BUG_048_PRE_IMPLEMENTATION_CODE_GATE.md`
> - Implementation summary: `/app/memory/bugs/BUG_048_IMPLEMENTATION_SUMMARY.md`
> - QA report: `/app/memory/bugs/BUG_048_QA_REPORT.md`
> - Backend fixture: order `825882` (room `r1` / guest `abhsihek`, settled)

---

## 1. Smoke Checklist Results

| # | Check | Expected | Observed | Result |
|---|---|---|---|---|
| 1 | Room `r1` / guest `abhsihek` row — **Total** column | ₹9,999 | ₹9,999 | ✅ PASS |
| 2 | Same row — **Paid** column | ₹9,999 | ₹9,999 | ✅ PASS |
| 3 | Same row — **Discount** column | `—` / 0 (no phantom ₹6,666) | `—` | ✅ PASS |
| 4 | Same row — **Outstanding** column | ₹0 | ₹0 | ✅ PASS |
| 5 | Total no longer inflates to ₹16,665 | Total stays at ₹9,999 | Total stays at ₹9,999 | ✅ PASS |
| 6 | Row values match summary/header pills | Identical numbers across the row strip and the summary-header `Rooms / Total / Paid / Discount / Outstanding` pills | Match — header pills mirror the row | ✅ PASS |
| 7 | No regression in associated orders panel, payment flow, fetch path, filter pills | All untouched paths behave exactly as before the fix | Unchanged behaviour observed | ✅ PASS |

**Smoke result: 7/7 PASS.**

---

## 2. Visible Behaviour Before vs. After

| Column | Before fix | After fix |
|---|---|---|
| Total | **₹16,665** (inflated by `order_amount`) | **₹9,999** ✅ |
| Paid | ₹9,999 | ₹9,999 (unchanged) |
| Discount | **₹6,666** (FE-derived phantom) | **`—`** ✅ |
| Outstanding | ₹0 | ₹0 (unchanged) |
| Summary header pills | Mirrored the wrong row values | Mirror the corrected row values ✅ |

---

## 3. Untouched Surfaces — Confirmed by Owner Smoke

- **Associated orders panel** in the expanded view — renders as before.
- **Payment / collect-bill flow** — unaffected.
- **`/get-room-list` / `/order-logs-report` initial-fetch path** — unaffected.
- **All / Paid / Unpaid filter pills** — function as before.
- **Remove-from-Room pill** (in-house rows, operator permission, mutation window) — unaffected.
- **Check-in / check-out flows** — unaffected.
- **Order transform / report service / report transform** — unaffected (no code change there).
- **Backend / any API** — unaffected (no change).
- **`/app/memory/final/*`** — not modified.
- **`BUG_TEMPLATE.md`** — not modified.

---

## 4. Deferred Follow-Ups (Remain Open as Separate Tickets)

These were explicitly out of BUG-048 scope per the owner-locked plan and are confirmed still deferred after smoke:

1. **Expanded "Room service items ₹6,666" line** in `TransferredOrdersTable` (`RoomRowCard.jsx:157–170`) — cosmetic; reads `roomOrderAmount` directly and continues to display today's value. Separate cosmetic ticket.
2. **Red Balance styling** on settled rooms in `RoomBillingCard` (`RoomRowCard.jsx:106`) — cosmetic; balance amount is shown in red even after settlement. Separate cosmetic ticket.
3. **Real-discount Outstanding nuance** (flagged in QA §6 / Implementation Summary §7) — when backend ships an explicit `discount_amount > 0`, current formula yields Outstanding equal to the discount value. Owner decision required only if real-discount handling needs adjustment. BUG-048 fixture is unaffected (no real discount in payload).

---

## 5. Files Touched (Final Record)

| File | Edit scope |
|---|---|
| `frontend/src/components/reports/RoomRowCard.jsx` | File-header doc-block (locked-formulas note) + `numbers` memo body inside `useMemo` |
| `frontend/src/pages/RoomOrdersReportPage.jsx` | `summaryTotals` per-row body (line-for-line mirror) |

Three edits total. Both files passed ESLint clean. Memo return shape preserved.

---

## 6. Validation Trail (Cumulative)

- ✅ Static QA (lint) — clean on both files.
- ✅ Six-scenario formula harness — 6/6 passed (settled no-food / in-house advance-only / settled with explicit discount / settled assoc rolled into `order_amount` / settled assoc paid separately / in-house room-service).
- ✅ `welcomeresort` regression set — equivalence proven in QA §5.2.
- ✅ Owner smoke — 7/7 PASS (this document).

---

## 7. Final Status

**`smoke_pass_ready_to_close`** ✅

BUG-048 is ready to be marked **Closed** in the bug tracker.

- Implementation complete.
- QA passed.
- Owner smoke passed.
- No code changes pending.
- No documentation sweep pending (`/app/memory/final/` and `BUG_TEMPLATE.md` were intentionally not modified per task directives across all phases).
- Deferred follow-ups (§4) are tracked as separate items.

---

## 8. Confirmation

- ❌ No code modified in this sign-off step.
- ❌ No `/app/memory/final/` updates.
- ❌ No `BUG_TEMPLATE.md` updates.
- ✅ Smoke sign-off doc created at `/app/memory/bugs/BUG_048_SMOKE_SIGNOFF.md`.

---

*End of BUG-048 Smoke Sign-off. Ready to close.*
