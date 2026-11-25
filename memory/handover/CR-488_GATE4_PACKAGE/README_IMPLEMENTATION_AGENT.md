# CR-488 — Implementation Agent Instructions

## Before you start
1. Read all 3 docs in this package (IA → Plan → Mockup).
2. **Check the intake doc** at `memory/change_requests/CR-488_CREDIT_PRINT_EACH_BILL_INTAKE.md` — a Gate 2 close block was appended at the bottom with final locked ODs:
   - OD-488-05 LOCKED (A): Print button for ALL OrderDetailSheet consumers
   - OD-488-06 LOCKED (A): Ship now, DUPLICATE is backend-side
3. Update `registry.json` CR-488 → status `GATE_4_IMPLEMENTATION` before writing code.
4. Present the plan to owner for **Gate 4 GO** approval before implementing.

## What to implement
**1 file, 3 edits, ~35 additive lines** in `src/components/reports/OrderDetailSheet.jsx`:
- **E-1:** Add imports (useCallback, Printer, Loader2, api, API_ENDPOINTS, orderFromAPI, printOrder, useRestaurant)
- **E-2:** Add `isPrinting` state + `handlePrintBill` callback (exact copy of OrderReportBetaPage.handleReprint L329-361)
- **E-3:** Add Print Bill button in **header** (left of close button) — orange outline, spinner while printing, hidden for cancelled/merged/missing

## Key reuse
The handler is a **direct copy** of `OrderReportBetaPage.handleReprint` (L329-361). Same endpoint (`SINGLE_ORDER_NEW`), same response parsing (including BUG-368 empty array guard), same `orderFromAPI.order()` transform, same `printOrder()` call. Zero deviation.

## Package contents
| File | Purpose |
|---|---|
| `CR-488_IMPACT_ANALYSIS.md` | Gate 2 — data flow trace, risk register, all ODs locked |
| `CR-488_IMPLEMENTATION_PLAN.md` | Gate 3 — exact edits with line numbers, verification matrix, registry checklist |
| `cr488-reprint-placement-mockup.html` | Visual mockup — header placement, before/after, hidden states |
| `README_IMPLEMENTATION_AGENT.md` | This file |
