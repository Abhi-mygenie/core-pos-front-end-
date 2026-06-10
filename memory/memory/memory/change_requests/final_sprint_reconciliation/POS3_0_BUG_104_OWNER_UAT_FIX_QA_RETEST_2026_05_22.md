# BUG-104 — Owner UAT Fix QA Retest Handoff — 2026-05-22

## 1. QA Status

**`bug_104_waiting_owner_resmoke`**

All UAT fixes (F-001..F-009) implemented and live-verified by the main agent. Two post-UAT bugs (Esc behavior, SS3 stacking + scroll chaining) also fixed. SS4 unchanged per F-010. Awaiting owner re-smoke before close-out.

## 2. Test Environment / Route

| Item | Value |
|---|---|
| Preview URL | `https://insights-phase.preview.emergentagent.com` |
| Login | `owner@palmhouse.com` / `Qplazm@10` (also in `/app/memory/test_credentials.md`) |
| Restaurant | Palm House (id 541), ~40 credit customers |
| Navigation | Dashboard → Sidebar (expand) → **Credit Management** (above Menu Management) |
| Note | `/orders/credit` route was removed during UAT (Menu-Management-style panel pattern). URL stays at `/dashboard`. |
| SS3 anchor (small bill) | Salik photographer / order #000163 / ₹160 / "Cappuccino × 1" |
| SS3 anchor (large bill) | Louise Madam / order #000069 / ~119 items / ~₹23,051 (scroll regression) |

## 3. Retest Checklist (30 rows)

| # | Area | Check | Expected | Pass/Fail |
|---|---|---|---|---|
| 1 | SS0 | Sidebar panel toggle expands the rail | Full labels visible | |
| 2 | SS0 | "Credit Management" item present with Wallet icon | Visible at position 3 | |
| 3 | SS0 | Position is directly above "Menu Management" | True | |
| 4 | SS0 | Click "Credit Management" | Slide-over panel opens; sidebar stays visible; URL stays `/dashboard` | |
| 5 | SS0 | No "Orders → Credit/Tab" or "Paid/Pending/Cancelled" placeholder children appear | Hidden | |
| 6 | SS0 | No "Outstanding" counter badge next to the sidebar item | Absent | |
| 7 | SS1 | Body width is constrained (NOT full-bleed) | `max-w-7xl mx-auto` visible | |
| 8 | SS1 | KPI strip renders before the search bar | data-testid `credit-kpi-strip` present | |
| 9 | SS1 | Outstanding tile shows the full-list sum | `credit-kpi-outstanding` numeric | |
| 10 | SS1 | KPI does NOT flicker when typing in search/filter (reflects all customers, not filtered subset) | Stable | |
| 11 | SS1 | Email column is hidden | No `<th>Email</th>` | |
| 12 | SS1 | Search by name still works | Filters correctly | |
| 13 | SS1 | Search by email still works even though column hidden | Filters correctly | |
| 14 | SS1 | Filter dropdown options All / With Balance / Settled all work | Correct row sets | |
| 15 | SS2 | Click a row → right-side Sheet drawer opens | `credit-customer-detail-sheet` | |
| 16 | SS2 | First summary tile reads "First Credit" (not "First Tab") | `credit-detail-first-tab` value | |
| 17 | SS2 | Last Credit tile stacks date (primary) + time (smaller line) | Visual | |
| 18 | SS2 | Last Payment tile stacks date + time same way | Visual | |
| 19 | SS2 | Tiles' bounding-box heights did not balloon vs. other tiles | Visual | |
| 20 | SS2 | Credits column header reads exactly "Credit ( Bill )" | Visible | |
| 21 | SS2 | Credits + Payments render as TWO separate sections (no combined timeline, no tabs) | Visual | |
| 22 | SS2 | Three FIFO buckets render when applicable: Covered (collapsible, default collapsed), Partial, Open | Edge: customer with paid=₹0 shows ONLY Open bucket | |
| 23 | SS2 | Covered accordion expand state persists across customers / drawer reopen (localStorage `bug_104_covered_expanded`) | True | |
| 24 | SS3 | Click "View" on an enabled credit row | Audit `OrderDetailSheet` opens (`order-detail-sheet`) above SS2 | |
| 25 | SS3 | OrderDetailSheet shows full audit layout (timeline, items, totals) | Salik #000163 → Cappuccino × 1 → ₹160 | |
| 26 | SS3 | Background SS2 does NOT scroll when SS3 is open | Louise #000069 — scroll inside SS3 → SS3 scrolls, SS2 stays | |
| 27 | SS3 | Escape pressed → closes SS3 only; 2nd Escape closes SS2 | Two-press behavior | |
| 28 | SS4 | Click "Record Payment" → centered Dialog opens; SS2 drawer remains mounted underneath | Visual | |
| 29 | SS4 | Empty amount → Submit disabled + inline "Enter an amount." | Validated | |
| 30 | SS4 | Amount = 0 / negative → Submit disabled + inline "Amount must be greater than 0." | Validated |
| 31 | SS4 | Amount > balance → Submit disabled + inline "Amount cannot exceed outstanding balance." | Validated |
| 32 | SS4 | Valid amount + method → Submit enabled; click → spinner; modal closes on success; toast appears; SS1 + SS2 refresh; SS2 stays on same customer | (Owner choice whether to submit a real ₹X test) |
| 33 | SS4 | API error → Modal stays open; submit re-enabled; toast shows error | (Optional, only if a forced failure scenario is set up) |
| 34 | Phase 2 guard | No Download / WhatsApp / PDF / bulk settle / print icons anywhere | Absent | |
| 35 | Regression | No print is triggered anywhere in the credit module | True | |
| 36 | Regression | No settlement state mutation triggered by SS3 / SS4 | True | |
| 37 | Regression | No table-clear / order status update from credit | True | |
| 38 | Regression | No tax/service/delivery recalculation triggered by credit flows | True | |
| 39 | Regression | No socket event emitted/consumed by credit module | True | |
| 40 | Build | `yarn build` passes with 0 errors (1 pre-existing OrderEntry.jsx warning is unrelated) | Pass | |
| 41 | Regression | Audit Report (Order Reports → Audit Report) drill-down still opens its OrderDetailSheet unchanged | Pass | |
| 42 | Final | Owner explicit approval to close BUG-104 Phase 1 | Pending |

## 4. Owner Smoke Steps

1. Open `https://insights-phase.preview.emergentagent.com/` and log in as `owner@palmhouse.com / Qplazm@10`.
2. Wait for Dashboard to render.
3. Click the panel-toggle icon at the top-left of the sidebar to expand the rail.
4. Click **Orders** does NOT need to be opened — Credit Management is its own standalone item.
5. Click **Credit Management** (Wallet icon, above Menu Management).
6. Confirm: panel slides in from the right of the sidebar; sidebar stays visible.
7. Inspect SS1: KPI hero, search, filter, table without Email column.
8. Type a customer name in the search box. Try the filter dropdown.
9. Click any customer row.
10. Inspect SS2 tiles: First Credit / Last Credit / Last Payment / Total Credit / Total Paid.
11. Scroll inside the SS2 credits area. Verify three buckets if the customer has payments.
12. Click "View" on a credit row that is enabled.
13. Inspect SS3: full audit-report layout, items, totals, scroll inside the sheet.
14. Press Escape → SS3 closes. Press Escape again → SS2 closes.
15. Re-open a drawer, click **Record Payment**.
16. Validate ONLY: leave amount empty → check inline error and disabled button; type `0` and `-5` and `BIG` (greater than balance) one at a time — verify the inline error label and that the submit button remains disabled in each case.
17. Click **Cancel** → modal closes, SS2 still open.
18. **Do not submit a real payment unless you explicitly pick a test customer + small test amount.**

## 5. Real Payment Test Warning

> **Do NOT run real payment clearance unless the owner explicitly selects a test customer and a small test amount.** SS4 will fire `POST /api/v1/vendoremployee/pos/tap-waiter-order-insert` against live preprod data on submit. The action is non-reversible from the FE side and will alter the chosen customer's balance.
>
> If a real one-row test is desired, suggested protocol:
> 1. Owner selects a test customer with a small balance (e.g., ₹50).
> 2. Owner enters an amount ≤ the customer's balance.
> 3. Owner submits **once**, confirms the toast, and confirms the SS2 drawer + SS1 list refresh with the new debit row.
> 4. If the customer's balance was small, the entry is easy to reverse by recording an equivalent credit (out of scope for this CR).

## 6. Pass / Fail Recording Template

For each row in §3, record:

```
Row #     :
Result    : PASS / FAIL / N/A
Tester    :
Date/Time :
Notes / screenshot / repro steps:
```

If any row is FAIL, label severity as P0 (blocks close-out), P1 (must fix before close-out), P2 (improvement), or P3 (backlog), and link to a screenshot.

## 7. Final Gate

**`WAITING_OWNER_RESMOKE_APPROVAL`**

Once all P0/P1 rows are PASS and owner explicitly approves, status flips to `bug_104_phase_1_owner_signoff_complete`.
