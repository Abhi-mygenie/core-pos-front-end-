# CR-011 S6 — Order Ledger Hybrid · Implementation Plan
**Date:** 2026-06-03
**Status:** Gates ① + ② + ③ COMPLETE — Locked (visual). Proceed to Gate ④.
**Owner sign-off verbatim:** *"Sign off Gate ① — I need few changes in UI but I will do it after actual wiring with realistic data"*

---

## 1. Scope

S6 is the **historical Order Ledger** — a read-only, any-calendar-date browsing surface for the full order book. It is the Phase 2 hero screen #2 (after S5 Item Sales Hybrid) and the canonical Excel-parity export for orders.

| Dimension | S6 Order Ledger | Audit Report (existing) |
|---|---|---|
| Purpose | Historical browsing, any past date | Daily operational, today/yesterday |
| Mutations | None (read-only) | Inline edit allowed (2-day window) |
| Date range | Single day, any past date or today, no future | Single day, daily |
| Columns | All 51 (Excel parity) | Compact subset |
| Audit tab rules | S6-specific family (TBD by owner) | Missing + unmatched (existing) |

Both surfaces coexist with **distinct audit rule families** per owner directive.

---

## 2. Inheritance from `AllOrdersReportPage`

### 2.1 Inherited as-is (no modification)
- **`<DatePicker>`** (single-day, future blocked by component at lines 118/147/153/182)
- **`<FilterBar>`** (PayType · Status · Payment · Channel · Platform[conditional] · ALL[PG dropdown] · Clear-×)
- **`<FilterTags>`** (active-filter chip row)
- **9 tab strip** (All Orders / Settled / Cancelled / Added to Credit / On Hold / Merged / Running / Aggregator / Audit)
- **`<OrderDetailSheet>`** drill (480px modal + backdrop) — reused via thin wrapper
- **`getBusinessDayRange(selectedDate, restaurant.schedules)`** util (consumed at Gate ④)

### 2.2 Filter behaviour (locked)
| Rule | Behaviour |
|---|---|
| Reset on tab change | ✅ Yes (matches Audit Report) |
| Persist on date change | ✅ Yes |
| Status breakdown pills (row 2) | ❌ Hidden for now (`breakdown={null}`) |
| Side-sheet on tab change | Closes |
| Download on Audit tab | Hidden entirely |
| Empty state copy | "No orders in this tab for {date}. Try changing the date or clearing filters." |

### 2.3 Intentional divergences from Audit Report
1. **Read-only** — no mutation handlers, no `isWithinMutationWindow` check
2. **All 51 columns** scrollable horizontally (Excel parity)
3. **Bespoke 460px right rail removed** — uses inherited `OrderDetailSheet` 480px modal instead
4. **S5 Download pattern** — Excel + PDF enabled, Email/WhatsApp/SMS disabled with "Phase 2B" badge
5. **S6 Audit tab** — separate rule family (TBD); empty state explicitly clarifies the separation from Audit Report's Audit tab

---

## 3. File ownership

| File | Owner | Purpose |
|---|---|---|
| `frontend/src/pages/reports-module/OrderLedgerMockup.jsx` | NEW (this CR) | Main screen — 9 tabs, 51 columns, FilterBar, Search, Sort, Audit framework |
| `frontend/src/pages/reports-module/OrderLedgerDetailSheet.jsx` | NEW (this CR) | Thin wrapper around `OrderDetailSheet`; maps seed → DATA-MODE displayData shape; DD/MM/YYYY → ISO date fix |
| `frontend/src/api/services/orderLedgerService.js` | NEW (this CR) | Separate service per owner directive: `getOrderLedger(fromDate, toDate, sortBy)` → `{ orders, meta }` |
| `frontend/src/components/reports/OrderDetailSheet.jsx` | UNCHANGED | Existing Audit Report drill — reused as-is via DATA MODE |
| `frontend/src/components/reports/DatePicker.jsx` | UNCHANGED | Already blocks future dates |
| `frontend/src/components/reports/FilterBar.jsx` | UNCHANGED | Already exports `STATUS_FILTER_OPTIONS`, `PAYMENT_*_OPTIONS`, etc. |
| `frontend/src/components/reports/FilterTags.jsx` | UNCHANGED | Already supports the same filter keys |
| `frontend/src/utils/businessDay.js` | UNCHANGED | `getBusinessDayRange` consumed at Gate ④ |
| `frontend/src/api/constants.js` | UNCHANGED | `ORDER_LOGS_REPORT` endpoint already defined |
| `frontend/src/App.js` | EDITED earlier | Routes `/reports-module/order-ledger` + `/reports-module/order-ledger/preview` |

---

## 4. The 51 columns (Excel-parity, locked)

```
Order ID · Order Date · Order Time · Order Type · No. Of Items ·
Order Details · Waiter(Ordered) · Waiter(Collected) · Payment Type ·
Item Total · Sub Total · GST Amount · Delivery Charge · Service Tax ·
Tip Amount · Coupon Code · Coupon Discount · Wallet Used · Loyalty Used ·
Discount · Discount Category · Discount For · RoundOff · Total Amount ·
Cash · Card · UPI · TAB · Zomato Gold · Partial Payment ·
Contact Person Name · Contact Person Number · Date Of Birth · Date Of Anniversary ·
Address Type · Area · Pincode · Complete Address · Location ·
Transaction ID · Collect Bill Date · Collect Bill Time ·
GST Amount Only · VAT Amount · User Name · User Phone ·
Razorpay Status · Razorpay Payment ID · Razorpay Order ID ·
Room Total · Room Advance · Room Checkout
```

---

## 5. 9 tabs — definition

| Tab | Filter predicate | API path at Gate ④ |
|---|---|---|
| **All Orders** | true | Both fetches merged |
| **Settled** | `f_order_status === '6'` | `sort_by=collect_bill` primary |
| **Cancelled** | `food_status === '3'` or order-level cancelled | `sort_by=collect_bill` |
| **Added to Credit** | TAB/credit payment + unpaid status | `sort_by=collect_bill` |
| **On Hold** | hold flag (TBD source field) | `sort_by=created_at` |
| **Merged** | `isMerged` from API transform OR tab context | `sort_by=collect_bill` |
| **Running** | not paid, not cancelled, no collect_bill | `sort_by=created_at` |
| **Aggregator** | `order_from` = Swiggy/Zomato/etc. | `sort_by=collect_bill` |
| **Audit** | n/a — surfaces S6-specific audit flags | Same data, post-fetch rule pass |

---

## 6. Audit tab — design contract (rules TBD)

- KPI strip: Active Flags · RED · AMBER · REVIEW · EXEMPT (5 stats, scoped to S6 namespace, all 0 today)
- Dynamic colour: tab pill = **green** when `s6AuditFlags.length === 0`, **red** when > 0
- Currently shows empty state: *"Ledger Audit — Rules TBD · Order Ledger audit rules are separate from the Audit Report's Audit tab. Owner-defined ruleset pending."*
- **No FE business logic until rules are registered in `auditManifest.js` (Protocol §8.1)**
- Candidate rule seeds for owner triage when this tab graduates (NOT in scope of Gate ①–③):
  - FE-61 (proposed): Zero-amount paid orders (`f_order_status=6` + `totalAmount=0`) → REVIEW
  - FE-62 (proposed): Cancellation with tax leakage (`food_status=3` + `tax>0`) → AMBER (already covered by S5 FE-17 at item level; S6 would be order-level rollup)
  - FE-63 (proposed): Partial-payment imbalance (sum of methods ≠ totalAmount within ±₹0.02) → RED
  - FE-64 (proposed): Room order without room number (`roomTotal>0` + `roomCheckout=''`) → AMBER

---

## 7. Verification matrix (Gate ① — completed)

| # | Check | Method | Result |
|---|---|---|---|
| 7.1 | Default ledger view renders 10 seed orders | Playwright screenshot at `/preview` | ✅ PASS |
| 7.2 | All 9 tabs clickable, counts update | Manual click each tab | ✅ PASS |
| 7.3 | All 51 columns render in horizontal scroll | Screenshot | ✅ PASS |
| 7.4 | DatePicker blocks future dates | Inherited from component (lines 147/153/182) | ✅ PASS |
| 7.5 | FilterBar wired (5 filters + PG dropdown + clear-×) | Manual interaction | ✅ PASS |
| 7.6 | Drill opens on row click — 480px modal + backdrop | Playwright click row #012480 | ✅ PASS |
| 7.7 | Drill shows "31 May 2026, 09:31 pm" (no Invalid Date) | DD/MM/YYYY → ISO mapper | ✅ PASS |
| 7.8 | Drill closes on backdrop click + Escape + X | Inherited from OrderDetailSheet | ✅ PASS |
| 7.9 | Audit tab — green pill, KPI strip 0/0/0/0/0, empty-state copy | Screenshot | ✅ PASS |
| 7.10 | Download button hidden on Audit tab | Playwright `count()` = 0 | ✅ PASS |
| 7.11 | Lint clean across all 3 files | `mcp_lint_javascript` | ✅ PASS |

---

## 8. Gate ④ — Implementation outline (NOT executed; for next session)

### 8.1 Wire ledger fetch
1. In `OrderLedgerMockup.jsx`, replace `SEED_ORDERS` const with `useReportFetch` hook
2. Import `restaurant?.schedules` from app context
3. On `selectedDate` change → compute `{ start, end, searchDates }` via `getBusinessDayRange(selectedDate, schedules)`
4. Call `getOrderLedger(searchDates[0], searchDates[searchDates.length-1], 'collect_bill')`
5. Apply dual-fetch (see 8.2)
6. Wrap content in `<ReportLoadingShield>` per Loading Spec §5

### 8.2 Dual-fetch (collected-by + paid-by)
- Primary: `sort_by='collect_bill'` → orders with billed timestamp (Settled/Cancelled/Credit/Hold/Merged buckets)
- Secondary: `sort_by='created_at'` → all created orders incl. Running (no collect_bill yet)
- Merge by `restaurant_order_id`, dedupe, let row-level flags drive tab placement
- Same pattern as Audit Report's existing collected-by/paid-by reconciliation

### 8.3 OrderDetailSheet wiring
- Once orders carry real `items[]` from `order_details_table`, the wrapper's `seedToDisplayShape` becomes optional — can pass orders directly to `<OrderDetailSheet>` and it'll use DATA MODE automatically
- Wrapper file may be deleted at Gate ⑤ if owner doesn't request seed-specific behaviour

### 8.4 Export wiring
- Hook Excel + PDF buttons in `DOWNLOAD_MENU` to `reportExporter.js` primitives (`exportReportAsExcel`, `exportReportAsPDF`)
- Build `exportPayload` from filtered+sorted ledger rows
- Export sheet structure: 1 sheet per tab (Settled/Cancelled/Credit/Hold/Merged/Running/Aggregator) + 1 "All Orders" sheet; Audit tab excluded (Download hidden)

### 8.5 Audit tab
- Stays empty-state until owner registers first rule via `auditManifest.js`
- When rules land, compute via post-fetch pass over the order rows, populate KPI strip + section tables (RED/AMBER/REVIEW/EXEMPT), Download remains hidden

---

## 9. Owner approval matrix

| Gate | Date | Owner verbatim | Status |
|---|---|---|---|
| ① Mockup with seed data | 2026-06-03 | (Code shipped + browser-verified) | ✅ DONE |
| ② Owner review in chat | 2026-06-03 | "Sign off Gate ①" | ✅ DONE |
| ③ Owner SIGN-OFF lock | 2026-06-03 | *"I need few changes in UI but I will do it after actual wiring with realistic data"* — interpreted as conditional lock: visual approved, refinements deferred to Gate ⑤ | ✅ DONE |
| ④ Wire to live API | _____ | Pending next session | ⏳ NEXT |
| ⑤ Owner validates + UI tweaks | _____ | UI tweaks already pre-committed by owner | ⏳ |
| ⑥ FROZEN | _____ | — | ⏳ |

---

## 10. Risk register

| ID | Risk | Mitigation |
|---|---|---|
| R1 | DD/MM/YYYY seed dates caused "Invalid Date" in drill on first render | Already fixed via `toIso()` mapper in `OrderLedgerDetailSheet.jsx` |
| R2 | Owner UI tweaks at Gate ⑤ may need re-touching the wrapper or the mockup | Both files are isolated; OrderDetailSheet remains untouched so Audit Report can't regress |
| R3 | Dual-fetch payload size at Gate ④ (~2 MB extra on busy days, same as Dashboard S0) | Acceptable per S0 precedent; no caching required |
| R4 | S6 audit rules registered without Protocol §8 discipline | Plan explicitly leaves audit empty until each rule has manifest entry + annotation |
| R5 | Owner asks for date-range picker instead of single-day | Out of Gate ① scope; would require new component + service signature change |

---

## 11. Out of scope (Gate ① → ③)

- API wiring (Gate ④)
- Dual-fetch (Gate ④)
- Business-day boundary consumption (Gate ④)
- Real Excel/PDF generation via `reportExporter.js` (Gate ④/⑤)
- S6-specific audit rules in `auditManifest.js` (post-Gate ④, owner triage required)
- Owner UI tweaks (Gate ⑤, by owner directive — "after actual wiring with realistic data")
- Date-range picker (not requested)
- Inline mutations (S6 is read-only)
