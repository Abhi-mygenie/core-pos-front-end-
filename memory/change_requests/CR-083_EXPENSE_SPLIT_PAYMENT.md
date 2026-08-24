# CR-083: Expense Split/Partial Payment

**ID:** CR-083
**Type:** CR (New Feature)
**Priority:** P1 (HIGH — owner requested, backend already supports)
**Risk:** MEDIUM (touches expense entry flow, no financial calculation changes — amounts are user-entered)
**Sprint:** POS 5.0
**Reported by:** Owner (2026-07-20)
**Source:** OWNER-REPORTED
**Date:** 2026-07-20

---

## Description

Currently, each expense line item has ONE payment method. Users cannot split a single expense across multiple payment methods (e.g., ₹500 Cash + ₹500 UPI for a ₹1000 purchase). This is needed for real-world scenarios:

1. **Half Cash, Half UPI** — vendor accepts partial cash + partial digital
2. **Half Paid, Half Unpaid** — pay vendor partially now, remainder later
3. **Multi-method** — part from Cash Draw + part from Bank Transfer

---

## Backend Evidence (API Probed 2026-07-20)

**Backend FULLY SUPPORTS split payment today.** The FE just doesn't expose it.

### Probe 1: UPI + Unpaid split
```
POST /store-expense-details
Body: { total_amount: 100, details: [
  {expense:"ITEM", amount:60, payment_method:"UPI"},
  {expense:"ITEM", amount:40, payment_method:"Unpaid"}
]}
→ Response: 200 OK, id=9904. Both lines stored with correct amounts.
```

### Probe 2: Cash Draw + Unpaid split  
```
→ Response: 400 — "Insufficient Cash Draw balance. Available balance: 0"
```
Cash Draw has balance validation — backend enforces available balance per line. Non-drawer methods (UPI, Cash, Bank Transfer, Unpaid) have no balance gate.

### Unpaid Behavior
- "Unpaid" is a valid `payment_method` value accepted by the backend
- Payment methods are **restaurant-specific** (Cafe103 has 9 methods incl. Unpaid; Kunafa Mahal has 4)
- "Unpaid" lines show in expense report with `payment_method: "Unpaid"` — trackable/filterable
- No settlement/resolve workflow exists yet — once marked Unpaid, it stays Unpaid in the report

---

## Code Reality: NONE

No split payment code exists in `ExpenseEntryPanel.jsx`. Currently:
- Each `EntryLine` has one `paymentMethod` dropdown (line 268-279)
- Users can add multiple lines (`addLine` at line 480), each with different items
- But no "Split Payment" button or flow to split a SINGLE item across methods

---

## Duplicate Check: DISTINCT

- CR-021 = Order Collect Bill split payment (different module entirely)
- No existing CR covers expense split payment

---

## Evidence
- API probe: inline in this document
- Screenshots: user's original request
- Payment methods list: restaurant-specific (4-9 options)

---

## Blast Radius

```
grep -rn "paymentMethod\|payment_method" ExpenseEntryPanel.jsx → 12 hits
```
- **Files impacted:** 1 (`ExpenseEntryPanel.jsx`)
- **Hotspot files:** NO
- **Estimated scope:** MEDIUM (new UI component + entry logic, ~50-80 lines)

---

## Open Questions for Impact Analysis

| # | Question | Owner Ruling (2026-07-20) |
|---|---|---|
| OQ-1 | **UX: Split button per line or per entry?** | **Per line item** — "Split" button on each line |
| OQ-2 | **Unpaid settlement workflow?** | **Tracking only for now** — no settlement workflow (Phase 2) |
| OQ-3 | **Must split amounts sum to line total?** | **YES — must sum exactly** |
| OQ-4 | **Cash Draw balance hint?** | **YES — show available balance when Cash Draw selected** |

---

## Design Mockup — FROZEN (2026-07-20)

**Mockup file:** `/app/frontend/public/cr083-expense-split-payment-mockup.html`
**Status:** OWNER REVIEWED + FROZEN

### 6 Screens:
| # | Screen | Key Element |
|---|---|---|
| 01 | Current state (before) | Single payment per line |
| 02 | Split button appears | Dashed orange "Split" button next to payment dropdown |
| 03 | Split expanded (Cash + UPI) | 2 payment rows + green validation bar "✓ Split amounts match total" |
| 04 | Half Paid + Half Unpaid | UPI ₹600 + Unpaid ₹400, red warning "⚠ Will be tracked as outstanding" |
| 05 | Validation error | Red bar "✗ Amounts don't match — ₹100 remaining", Save disabled |
| 06 | Cash Draw balance hint | "Available: ₹2,450" green hint, insufficient = red warning |

### Flow:
1. User adds line → single payment (current behavior unchanged)
2. Clicks "Split" → line expands, original method becomes Row 1
3. Row 2 auto-fills: remainder amount, empty method dropdown
4. User picks method + adjusts amounts → must sum exactly to total
5. Save → FE sends 2 detail lines to backend (same item, different methods)
6. "Unpaid" lines tracked in reports — no settlement workflow (Phase 2)

---

## Next: Planning Gate 2 → Gate 3 (Implementation Plan)
