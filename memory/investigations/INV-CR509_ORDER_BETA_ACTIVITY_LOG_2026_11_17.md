# Investigation Report: CR-509 — Order Report Beta Missing Activity Log / Order Lifecycle

**Date:** 2026-11-17
**Investigator:** Agent (Investigation Role)
**Confidence:** HIGH
**Steps used:** 4/10

---

## 1. Summary

**Root cause:** `OrderReportBetaPage.jsx` does NOT use `OrderDetailSheet` at all. The regular Order Report (`AllOrdersReportPage.jsx`) renders `OrderDetailSheet` as a right sidebar on row click — this sheet contains the Timeline (order lifecycle) and Activity Log (operations). Order Report Beta has no equivalent row-click → detail sheet integration.

**Classification:** FE_FEATURE_GAP — The feature was never implemented in the Beta report.

---

## 2. Hypotheses Tested

| # | Hypothesis | Test Method | Steps | Result | Evidence |
|---|-----------|-------------|-------|--------|----------|
| H1 | OrderDetailSheet exists but is hidden in Beta | Grep: OrderReportBetaPage for OrderDetailSheet | 1 | ELIMINATED | Zero references to OrderDetailSheet in the file |
| H2 | Activity log data is fetched but not rendered | Grep: OrderReportBetaPage for activity/operations | 1 | ELIMINATED | No activity log, operations, or timeline references |
| H3 | Regular Order Report has the feature for reference | Code trace: AllOrdersReportPage | 2 | CONFIRMED | Uses OrderDetailSheet (line 1120) with full Timeline + Activity Log |

---

## 3. Data Flow Trace

### Regular Order Report (AllOrdersReportPage.jsx) — HAS activity log:
```
OrderTable row click → handleRowClick (line 595)
  → setSelectedOrder(order) + setIsSheetOpen(true)
  ↓
<OrderDetailSheet isOpen={isSheetOpen} order={selectedOrder} />
  ↓
OrderDetailSheet.jsx:
  - Header: Order #, status badge, Print Bill button (line 600+)
  - Items: ItemTimeline with KDS status dots (line 258+)
  - Activity Log: operations[] rendered (lines 804-852)
  - Footer: Bill summary (lines 858+)
```

### Order Report Beta (OrderReportBetaPage.jsx) — MISSING:
```
No OrderDetailSheet import
No row click → detail sheet
No activity log section
No order lifecycle/timeline
Row clicks: only action buttons (Reprint, Mark Unpaid, Collect Payment, etc.)
```

### What OrderDetailSheet Activity Log shows:
- Each operation: timestamp, operation name (e.g., "bill print", "order bill payment", "order status update")
- Actor: who performed it ("by Owner")
- Payment method changes: previous → current
- Amount changes: ₹275 → ₹143 (₹-132) with color coding

---

## 4. Evidence Artifacts

- Screenshot: User-provided — shows AllOrdersReportPage with Activity Log sidebar at `/reports/audit`
- Code: `AllOrdersReportPage.jsx:1120` (has OrderDetailSheet), `OrderReportBetaPage.jsx` (no OrderDetailSheet)
- Component: `OrderDetailSheet.jsx:804-852` (Activity Log section)

---

## 5. Recommendations

**Classification:** FE_FEATURE_IMPLEMENTATION

### Option A: Reuse OrderDetailSheet in Beta (Faster)
- Import `OrderDetailSheet` in `OrderReportBetaPage.jsx`
- Add `selectedOrder` / `isSheetOpen` state
- Wire row click to open sheet
- Requires the Beta report's order data to include `rawOrderDetails` and `operations` arrays (may need API data check)

### Option B: Build revamped Activity Log for Beta (User-requested revamp)
The user specifically asked for the activity log to be "revamped" so cashiers/managers can understand easily. This suggests:
- Cleaner, more readable format than the current compact log
- Possibly grouped by action type or chronological with better visual hierarchy
- Simpler language ("Bill printed" vs "bill print")
- Clear amount change visualization

**Planning skip eligible:** NO — 6+ files estimated, MEDIUM risk, needs design decisions.

**Registry status:** CR-509 is at GATE_1_INTAKE_COMPLETE with 5 open owner decisions. Full planning gate cycle recommended.

---

## 6. Retroactive Candidates
None.
