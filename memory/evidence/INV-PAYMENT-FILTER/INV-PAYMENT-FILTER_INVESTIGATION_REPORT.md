# INV-PAYMENT-FILTER Investigation Report

**Date:** 2026-11-07  
**Investigator:** Agent (Investigation Role per AGENT_PROMPT_ALPHA v0.7)  
**Scope:** Payment filter bugs on two report pages  
**Status:** ROOT CAUSE FOUND — HIGH confidence  
**Steps used:** 9/10

---

## 1. Summary

**Two separate issues** across two report pages, both relating to split/partial payment handling in payment method filters.

| Issue | Page | Root Cause | Classification | Confidence |
|-------|------|-----------|----------------|------------|
| A — UPI missing from dropdown | Order Report Beta | FE_DESIGN_GAP — dynamic dropdown uses `payment_method_raw` which is never "upi" for split orders | FE_BUG | HIGH |
| B — No split-aware filtering | Order Report Beta | FE_DESIGN_GAP — exact-match filter lacks BUG-272-style partial leg matching | FE_BUG | HIGH |
| C — Cash filter includes partial orders | Audit (Daily) Report | FE_DESIGN (intentional BUG-272) — partial orders with cash leg included when filtering "Cash" | OWNER_DECISION | HIGH |

---

## 2. Hypotheses Tested

| # | Hypothesis | Test Method | Steps Used | Result | Evidence |
|---|-----------|-------------|-----------|--------|---------|
| H1 | Audit report includes partial orders under Cash filter intentionally (BUG-272) | Code trace: AllOrdersReportPage.jsx L417-430 | 1 | **CONFIRMED** | Lines 424-427: `if (fm === 'cash' && o.cashAmount > 0) return true;` |
| H2 | Beta report UPI missing because `payment_method_raw` never has value "upi" | API probe: POST daily-order-report-details-combined | 2 | **CONFIRMED** | 11 orders probed: pm_raw values = {cash, pending, partial}. No "upi". |
| H3 | Beta report lacks BUG-272-style split-payment-aware filtering | Code trace: OrderReportBetaPage.jsx L168 + L191 | 1 | **CONFIRMED** | Filter = exact match `r.payment_method_raw === filters.payment`. No partial leg check. |

---

## 3. Data Flow Traces

### Trace A: Order Report Beta — Payment Filter

```
API: POST /api/v1/vendoremployee/daily-order-report-details-combined
  → Response: Each order has:
    - payment_method_raw: "cash" | "pending" | "partial" (NEVER "upi"/"card" standalone)
    - payment: { cash: "100.00", upi: "175.00", ... }  ← breakdown object EXISTS

→ OrderReportBetaPage.jsx:
    L191: payments = unique('payment_method_raw')  → ["cash", "partial", "pending"]
    L168: filter = r.payment_method_raw === filters.payment  → exact match only
    
BREAK POINT 1: Dropdown populated from payment_method_raw → UPI never appears
BREAK POINT 2: Filter is exact match → no split-leg awareness
BREAK POINT 3: payment breakdown object (r.payment) is NEVER used for filtering
```

### Trace B: Audit Report — Payment Filter

```
API: POST /api/v2/vendoremployee/report/order-logs-report
  → Response: Each order has partial_payments[] array

→ reportTransform.js:
    L852: partialMap from partial_payments[] → { cash: 100, upi: 175 }
    L1109-1111: cashAmount, cardAmount, upiAmount populated

→ AllOrdersReportPage.jsx:
    L418-430: BUG-272 filter logic:
      - "partial" → exact match only
      - "cash" → pm === 'cash' OR (pm === 'partial' && cashAmount > 0) ← INCLUDES PARTIAL ORDERS
      - "upi" → pm === 'upi' OR (pm === 'partial' && upiAmount > 0)

→ FilterBar.jsx:
    L106-110: PAYMENT_METHOD_OPTIONS = hardcoded [Cash, Card, UPI, Partial]

BREAK POINT: When Cash selected, partial order #001424 (Cash ₹100 + UPI ₹175) 
             IS INCLUDED because cashAmount=100 > 0. User sees BOTH payment legs displayed.
```

---

## 4. Evidence Artifacts

All saved to: `/app/memory/evidence/INV-PAYMENT-FILTER/`

| File | Content |
|------|---------|
| `beta_report_raw.json` | Full Beta API response for 2026-11-07 (11 orders) |
| `payment_fields_summary.json` | Extracted payment fields for all 11 orders |

**Key data point — Order #001424:**
```json
{
  "payment_method_raw": "partial",
  "payment": {
    "cash": "100.00",
    "upi": "175.00"
  }
}
```
API returns breakdown in `payment` object, but Beta report ignores it for filtering.

---

## 5. Recommendations

### Issue A+B: Order Report Beta — Missing UPI + No split-aware filtering

**Classification: FE_FIX**

**Scope:** `OrderReportBetaPage.jsx` — 2 changes needed:

1. **Dropdown population (L180-197):** Extract payment options from BOTH `payment_method_raw` AND non-zero keys in each order's `payment` breakdown object. This would add "upi", "card" etc. when they appear as legs of partial payments.

2. **Filter logic (L168):** Add BUG-272-style partial-leg matching:
   ```
   if filters.payment selected:
     - if "partial" → exact match payment_method_raw === "partial"
     - if "cash" → pm_raw === "cash" OR (pm_raw === "partial" && payment.cash > 0)
     - if "upi" → pm_raw === "upi" OR (pm_raw === "partial" && payment.upi > 0)
     - etc.
   ```

**Planning skip eligible:** NO — touches report filter logic (Risk: HIGH per R6 reports rule). Requires full Gate 2-3.

**Files WILL change:** `OrderReportBetaPage.jsx` (1 file, ~20-30 lines)  
**Files WILL NOT touch:** All others

### Issue C: Audit Report — Cash filter includes partial orders

**Classification: OWNER_DECISION**

The current behavior (BUG-272) was intentionally designed to include partial orders when filtering by a specific payment method. Three options:

| Option | Behavior | Implication |
|--------|----------|-------------|
| **A (current)** | "Cash" includes partial orders with cash leg | User sees partial order with BOTH legs visible |
| **B** | "Cash" excludes all partial orders | User must use "Partial" filter to see split payments — cash portions invisible under Cash filter |
| **C** | "Cash" includes partial orders but shows only cash portion amount | Requires amount column change + adds complexity |

**Recommendation:** Option A is the most complete view. If the user's concern is visual confusion (seeing UPI amount when filtering Cash), a **display** fix (e.g., highlight only the matching leg, grey out non-matching) may be better than changing filter logic.

---

## 6. Retroactive Candidates

None found.

---

## Investigation Final Response

```
Investigation complete: INV-PAYMENT-FILTER
Root cause: 2 FE_DESIGN_GAP issues + 1 OWNER_DECISION
Confidence: HIGH (all 3 reproduced + traced)
Steps: 9/10

Issue A+B (Beta report): payment_method_raw is "partial" for split orders, 
  never "upi"/"card" — dropdown and filter don't use the payment breakdown object.
  FE fix: ~20-30 lines in OrderReportBetaPage.jsx.
  Planning skip eligible: NO (HIGH risk, report logic).

Issue C (Audit report): BUG-272 intentional behavior — Cash filter includes 
  partial orders with cash leg. Owner decision needed (Option A/B/C).

Investigation report at: /app/memory/evidence/INV-PAYMENT-FILTER/INV-PAYMENT-FILTER_INVESTIGATION_REPORT.md
Evidence at: /app/memory/evidence/INV-PAYMENT-FILTER/
```
