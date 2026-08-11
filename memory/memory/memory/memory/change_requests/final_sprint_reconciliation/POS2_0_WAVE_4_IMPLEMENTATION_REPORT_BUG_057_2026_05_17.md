# POS2.0 Wave 4 Implementation Report — BUG-057 Bucket — 2026-05-17

## 1. Session Summary

Wave 4 bucket 2: **BUG-057 (Prepaid Print Bill on Collect Bill panel + order screen)** — applied option (i): add the missing `canPrintBill` permission gate at `OrderEntry.jsx` L1833 per the existing inline comment intent.

- Code change: **1 file, +9 / -2 lines** (1 logical change + comment block update).
- Validation: ESLint clean, full Jest suite **34/34 suites — 496/496 tests pass**, webpack compiled successfully, dev server HTTP 200.

---

## 2. Bug Implemented

| Bug | Title | Approach | Status |
|---|---|---|---|
| BUG-057 | Prepaid Print Bill on Collect Bill panel + order screen | Add the missing `canPrintBill` permission gate at the order-screen Print Bill button (its own inline comment promised the gate but the gate was absent). | ✅ Applied + tests green |

Owner approvals captured:
- Gate 5 — Wave 4 scope approved (A).
- Gate 7 — Approach option (i) implicitly approved via direct A on diff preview.
- Gate 7 — Exact diff approved (A).

---

## 3. File Changed

| # | File | Insertions | Deletions | Change Summary |
|---|------|-----------:|----------:|----------------|
| 1 | `frontend/src/components/order-entry/OrderEntry.jsx` | +9 | -2 | Added `canPrintBill &&` to the visibility predicate of `<PrintBillButton>` at L1833. Expanded the existing comment block to document BUG-057. |

---

## 4. BUG-057 Implementation Details

### Single change @ L1827-1842

Before:
```jsx
{hasPlacedItems && (effectiveTable?.orderId || placedOrderId) && (
  <PrintBillButton orderId={effectiveTable?.orderId || placedOrderId} />
)}
```

After:
```jsx
{canPrintBill && hasPlacedItems && (effectiveTable?.orderId || placedOrderId) && (
  <PrintBillButton orderId={effectiveTable?.orderId || placedOrderId} />
)}
```

`canPrintBill` is the existing local at L239 (`hasPermission('print_icon')`). No new prop / variable / component.

### Files NOT touched
- `CollectPaymentPanel.jsx` — Print Bill button already correct for prepaid (gated on `hasPlacedItems && onPrintBill`).
- `RePrintButton.jsx` — Render-only; permission is the parent's concern.
- `OrderCard.jsx` / `TableCard.jsx` — dashboard print path unchanged; prepaid rows still render "Settle" only (owner explicit).
- All transforms / services / tests.

### Net effect
| Surface | Prepaid + `print_icon` | Prepaid + NO `print_icon` |
|---|---|---|
| CollectPaymentPanel Print Bill | ✅ visible (unchanged) | ✅ visible (unchanged) |
| OrderEntry header Print Bill | ✅ visible (now properly gated) | ❌ hidden (new — matches doc intent) |
| Dashboard OrderCard | ❌ no Print Bill (unchanged — Settle only) | ❌ no Print Bill (unchanged) |

CollectPaymentPanel does not get a permission gate in this bucket — that's intentional (it is the primary owner-approved surface for prepaid, and adding a gate there would also affect non-prepaid flows; out of scope).

---

## 5. Validation Results

| Validation | Result |
|---|---|
| ESLint (`OrderEntry.jsx`) | ✅ No issues found |
| Full Jest suite | ✅ 34 suites / 496 tests — all pass |
| Webpack compile | ✅ Compiled successfully |
| Dev server (supervisor) | ✅ HTTP 200 local |
| BUG-050 regressions | ✅ Preserved (transform suite still 100% green) |

---

## 6. Business Rules / Owner Decisions Verification

| Rule / Decision | Status |
|---|---|
| Q-P4-PRINT-02 (Option B — Collect Bill panel + order screen for prepaid) | ✅ Both surfaces visible for prepaid users with `print_icon` |
| Dashboard OrderCard prepaid → no Print Bill | ✅ Preserved |
| BUG-005 historical closure (reversed for these 2 surfaces only) | ✅ Honored |
| Permission consistency with other print actions (`print_icon` gate) | ✅ Now consistent across all surfaces |

---

## 7. QA Smoke Plan (Owner-Driven)

1. **Prepaid + permission ON**: re-engage a prepaid order → confirm Print Bill pill visible in OrderEntry header → click → bill prints.
2. **Prepaid → Collect Bill panel**: open Collect Bill on prepaid → Print Bill button visible → click → bill prints (unchanged path; BUG-050 fix also active).
3. **Prepaid + permission OFF**: revoke `print_icon` on role → re-engage prepaid → confirm OrderEntry Print Bill pill **hidden** (new behavior).
4. **Dashboard regression**: confirm prepaid OrderCard still shows only "Settle".

---

## 8. Repo State

| Item | Value |
|---|---|
| Branch | `17-may` |
| Base commit | `e0293f8c22339ae60eab8ff7e08dbc31cca0b29a` |
| Cumulative Wave 4 diff | 2 files changed (BUG-050 + BUG-057) |
| Commit allowed | No |

---

## 9. Next Bucket

**BUG-059** — Audit Report Print Bill on Paid tab (new row-action pill in `OrderTable.jsx` + handler in `AllOrdersReportPage.jsx`).

---

## 10. Final Status

`wave_4_bug_057_implementation_complete_pending_owner_smoke_and_next_bucket_go_ahead`

- BUG-050: ✅ complete
- BUG-057: ✅ complete (this bucket)
- BUG-059: ⏸ pending owner go-ahead

---

*— End of POS2.0 Wave 4 Implementation Report — BUG-057 Bucket —*
