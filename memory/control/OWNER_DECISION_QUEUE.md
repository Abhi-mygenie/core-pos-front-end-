# Owner Decision Queue — Compiled from Control Layer Population

**Date:** 2026-05-29
**Last Updated:** 2026-05-29 (owner decisions captured for A, B, partial C)

---

## CATEGORY A: Business Rule Decisions — DECIDED

| # | Decision | Owner Answer | Date | Impact |
|---|---|---|---|---|
| A1 | ROUND-001 — Always ceiling | **YES — always ceiling, fix code** | 2026-05-29 | Unblocks ROUND-001 freeze + BUG-051/076 |
| A2 | TIP-003 — No tip on Takeaway/Delivery | **CONFIRMED — no tip from POS cashier. Future rule change if needed** | 2026-05-29 | Unblocks TIP-003 freeze |
| A3 | SC-004 / PAY-005 — SC GST double-count | **Owner will share payload + printed bill later** | 2026-05-29 | Deferred — owner to provide evidence |
| A4 | TOTALS-004 — Room grand total includes room balance | **YES — confirmed** | 2026-05-29 | Unblocks TOTALS-004 freeze (pending runtime capture) |
| A5 | PAY-006 — Transfer to Room payload | **CONFIRMED — payload provided** | 2026-05-29 | Unblocks PAY-006 freeze |

### A5 — Transfer to Room Payload (owner-provided, frozen):
```json
{
  "order_id": "868907",
  "payment_mode": "transferToRoom",
  "payment_amount": 103,
  "payment_status": "paid",
  "room_id": "3245",
  "order_discount": 0,
  "self_discount": 0,
  "comm_discount": 0,
  "tip_amount": 0,
  "vat_tax": 0,
  "gst_tax": 4.46,
  "service_tax": 8.9,
  "service_gst_tax_amount": 0,
  "tip_tax_amount": 0
}
```

---

## CATEGORY B: Sprint-Blocking Decisions — DECIDED

| # | Decision | Owner Answer | Date | Impact |
|---|---|---|---|---|
| B1 | BUG-097 CartPanel Collect Bill Gate | **Option A — Keep disabled for delivery at fOS=5** (cashier waits until rider picks up) | 2026-05-29 | Unblocks BUG-097 closure |
| B2 | BUG-104 Credit/Tab Module | **Full scope NOW — will integrate with Wallet in future sprint** | 2026-05-29 | Ready for scope session |
| B3 | BUG-105 Settlement Module | **Deferred — future module, not started** | 2026-05-29 | Parked |
| B4 | Phase 3 UX-LOADING-02 | **Option C — Both concerns already fixed, defer** | 2026-05-29 | Closed — no action needed |

---

## CATEGORY C: CRM 2.0 Decisions — PARTIALLY DECIDED

| # | Decision | Owner Answer | Date | Impact |
|---|---|---|---|---|
| C1 | CR-002 Regression QA | **Authorized — owner is placing real orders on R689 now** | 2026-05-29 | Can run T-28/T-29 |
| C2 | OG-08 Seed test data | **CLOSED — owner tested, working** | 2026-05-29 | — |
| C3 | OG-10 Preview gate bypass | **Retroactively approved** | 2026-05-29 | Owner accepts as-is |
| C4 | OG-11 First-time badge timing | **Deferred — pick up when working on this module** | 2026-05-29 | — |
| C5 | CRM 2.0 next sprint priorities | **All P1, none P0.** CR-005 Wallet, CR-008 Integrations, CR-009 Carryover — equal priority, after current work | 2026-05-29 | CR-003 Tab = BUG-104 Credit/Tab module (same thing) |

---

## CATEGORY D: Backend Team Escalations — PENDING OWNER ESCALATION

| # | Item | Bug/CR | Priority | Action |
|---|---|---|---|---|
| **0** | **CANCELLED-FINANCIALS: tax/discount/SC/delivery NOT reverted on cancellation** | **CR-011-AUDIT-01** | **🔴 P0 CRITICAL** | **Backend team must zero out `gst_tax_amount`, `vat_tax_amount`, `discount_amount`, `service_charge`, `order_discount`, `restaurant_discount_amount`, `coupon_discount_amount`, `delivery_charge`, `delivery_charge_gst`, `service_gst_tax_amount`, `tip_amount`, `total_*_tax_amount` when `food_status='3'` (line) or order fully cancelled. Evidence: Palm House last 60 days, 52 of 302 cancelled lines (17%) leak ₹757 tax + ₹48 order-level discount. Doc: `CR_011_BACKEND_ESCALATION_CANCELLED_FINANCIALS_2026_06_02.md`. Owner verbatim 2026-06-02: *"if order is cancelled tax, discount service charge delivery charge all has be reverted, this needs to be flagged to back end with critical priority"*. Also need backend confirmation that `cancel_type` field is universally populated across restaurants.** |
| 1 | `loyalty_idempotency_key=null` on order 869016 | BUG-108 | P1 | Backend team investigate + fix |
| 2 | PayLater settle on wrong socket channel | PROD-BUG-003 | P1 | Backend emit on `update-order-paid` |
| 3 | Rider accept/reject socket events (BQ-097-2/3/4/5) | BUG-097 | P1 | Backend define + implement |
| 4 | Menu update socket event names (BQ-CR-01/02/03) | BUG-096 | P1 | Backend define |
| 5 | `customer_id` in room check-in API (Q-090-B-1) | BUG-090 | P2 | Backend accept field |
| 6 | Phone format contract (Q-092-1) | BUG-092 | P2 | Backend clarify +91 vs raw 10 |
| 7 | `delivery-assign-order` socket payload (Q-094-1) | BUG-094 | P3 | Backend add payload |
| 8 | `room_info.checkin_date` in API response | BUG-093 | P3 | Backend add field |
| 9 | Print template `delivery_charge_gst_amount` slot (Q-101-1) | BUG-101 | P3 | Backend add template slot |
| 10 | BE-1 P1-P6 display fields on `/order-logs-report` | CR-001/CR-004 | P2 | Backend deliver |
| 11 | BE-2 Lodging payment breakdown | Room Report | P2 | Backend deliver |
| 12 | `restaurant_discount_amount=0` on discounted orders | Audit Report | P2 | Backend populate field |
| 13 | PACKAGED items missing `ready_at`/`serve_at` | Audit Report | P3 | Backend log timestamps |
| **14** | **~~MAY 9 GST COMPUTATION FAILURE~~ CLOSED — NOT A BUG (2026-06-03).** Re-investigation found the "70 zero-GST orders" were alcohol/beer (Corona, Budweiser, Kingfisher, Mojito) with `tax_rate=0%` in product config — correctly ₹0 GST. Only 1 real anomaly on May 9 (#014509, Kombucha, ₹6.50). Previous analysis misclassified tax-exempt items as bugs. | **CR-011-AUDIT-01** | **CLOSED** | **No backend action needed. Original report corrected in `CR_011_S5_PENDING_BILLING_TAB_PLAN_2026_06_03.md` §2.1.** |
| **15** | **ROOM ORDER LINE-LEVEL GST NOT DISTRIBUTED: 2 orders (#013489, #013594) where order-level total_gst_tax_amount is correct but every line has gst_tax_amount=₹0. Both RM/SRM by Counter02.** | **CR-011-AUDIT-01** | **P1** | **Backend: Room billing code path skips GST distribution to line items. Order-level GST correct (₹108, ₹25) but never written to per-line gst_tax_amount.** |
| **16** | **Backend `price` field inconsistency: sometimes includes add-ons (15/195 lines), sometimes excludes (180/195). FE works around via unit_price×qty+addon+variation.** | **CR-011-AUDIT-01** | **P2** | **Backend: Standardize `price` to always include or always exclude add-ons/variations.** |

---

## CATEGORY E: Missing Credentials / Info

### E1. kunafamahal.com Password
**Needed:** Password for `owner@kunafamahal.com` (R689) — used for CRM 2.0 QA.

### E2. Google Maps API Key
**Needed:** `REACT_APP_GOOGLE_MAPS_KEY` — required for delivery address autocomplete.

### E3. mantri.com Credentials
**Needed:** Full credentials for `owner@mantri.com` — used for Room Orders Report testing.

---

## CATEGORY F: Smoke QA Pending Owner Execution

### F1. BUG-097 Rider-on-the-Way Smoke (25 rows)
**Doc:** `POS3_0_BUG_097_RIDER_ON_THE_WAY_FOS5_OWNER_SMOKE_QA_CHECKLIST_2026_05_21.md`
**Status:** NOT EXECUTED — pending owner

### F2. PROD-BUG-002 Settle Print Guard (25 rows, 6 groups)
**Doc:** `PROD_BUG_002_SETTLE_PRINT_GUARD_RUNTIME_QA_CHECKLIST_2026_05_21.md`
**Status:** NOT EXECUTED — needs live orders + printer

### F3. POS2-005 Hold/Audit Reroute
**Status:** Awaiting owner smoke on live status-8 row

---

## Decision Summary

| Category | Total | Decided | Pending |
|---|---|---|---|
| A: Business Rules | 5 | 4 decided + 1 deferred (A3) | 0 |
| B: Sprint-Blocking | 4 | 4 decided | 0 |
| C: CRM 2.0 | 5 | 1 decided | 4 |
| D: Backend Escalations | 17 | 3 resolved (D1,D2,D14-CLOSED) + 2 docs requested (D3,D4) + 3 to check (D5,D6,D7) + 1 next sprint (D8) + 4 open P3 | 9 |
| E: Missing Credentials | 3 | 0 | 3 |
| F: Smoke QA | 3 | 0 | 3 |
| **G: CR-011-AUDIT-01 FE Business Logic — 70 manifest rules** | **70** | **70 decided (68 approved + 2 rejected). 42 outstanding REVIEW items were batch-approved by owner 2026-06-05; counters synced from `auditManifest.js` (code = truth) during 2026-06-11 baseline consolidation** | **0** |
| **Total** | **107** | **83** | **24** |

## Related Documents
- **Backend Escalation Doc:** `BACKEND_ESCALATION.md` — formatted for sharing with Laravel team
- **Owner Pending Items:** `OWNER_PENDING_ITEMS.md` — what owner needs to provide

---

## CATEGORY G: CR-011-AUDIT-01 — Frontend Business Logic REVIEW Items (pre-seeded 2026-06-02)

These 14 candidate REVIEW items will surface on the first run of the S5 Audit tab once `CR-011-AUDIT-01` ships. Each represents a piece of FE business logic that has never been explicitly approved by the owner per Protocol §8. **Approval is owner-driven**: pick each row and reply with `Approve` (rule stays as coded) or `Reject — <replacement>` (rule changes; manifest updated). The Audit tab is the runtime UI for this queue.

### G.1 — Living in `ItemSalesHybridMockup.jsx`

| # | Rule ID | Rule | Current behaviour | Owner Decision |
|---|---|---|---|---|
| G1 | FE-01 | Slow Movers definition | `qty ≤ 1 && status !== 'cancelled'` | __ pending |
| G2 | FE-02 | Top Sellers definition | Top 20 rows sorted by revenue desc | __ pending |
| G3 | FE-03 | Per-item "Comp" badge trigger | `qtyComplementary > 0` (any single comp line marks the row) | __ pending |
| G4 | FE-04 | Per-row status derivation | `qtySold > 0 → 'sold'; else qtyCancelled > 0 → 'cancelled'; else 'unsold'` | __ pending |
| G5 | FE-05 | Default active tab on page load | `'all'` | __ pending |
| G6 | FE-06 | Default preset when no URL params | `'Today'` | __ pending |
| G15 | FE-15 | **Complimentary tab audit exemption** | Comp lines exempt from expectedTax × rate audit; tax computed by backend against billable amount = ₹0. Anomaly safety-net: comp line with non-zero `gst_tax_amount` OR `vat_tax_amount` flagged RED. Comp rows render with light-green tint + `✓ exempt` chip. | **✅ APPROVED 2026-06-02** — Owner verbatim: *"so this is correct business rule no front end used in gst calculation its should be coming from backend / so complimentary rows are correct / we can make them light green and freeze this in decision"* + *"thats correct now its a business rule flag as red"* (anomaly branch confirmed) |
| G16 | FE-16 | **Audit-status group ordering (+separator)** | Rows partitioned by audit status; flagged rows render above clean rows on All/Top/Slow tabs (flagged = AMBER/RED in Sold bucket); on Cancelled tab, rows with non-zero tax render above rows with zero tax; within each group, user's column sort applies; separator row with item-count badge sits between groups; Comp tab unaffected (all EXEMPT); Audit tab unaffected (already sorted by \|Δ\| desc). | **✅ APPROVED 2026-06-02** — Owner verbatim: *"yes separator · clean = no audit flag · go"* |

### G.2 — Living in `insightsService.js`

| # | Rule ID | Rule | Current behaviour | Owner Decision |
|---|---|---|---|---|
| G7  | FE-07 | Tax aggregation | `tax = gst_tax_amount + vat_tax_amount` (additive) | __ pending — **note:** Owner's new RED-flag rule says GST + VAT cannot both be booked, so additive is moot in compliant data but suspect when both > 0 |
| G8  | FE-08 | Cancelled-line detection | `food_status === '3'` | __ pending |
| G9  | FE-09 | Complimentary-line detection | `complementary === '1' \| 1` | __ pending |
| G10 | FE-10 | revenueComplementary formula | `menuPrice × qty` (would-have-been revenue) | __ pending |
| G11 | FE-11 | menuPrice fallback chain | `product.price → line.complementary_price → line.unit_price` | __ pending |
| G12 | FE-12 | Cancel-date mode filter | Drops cancelled lines whose `cancel_at` is outside `[fromDate, toDate]` | __ pending |
| G13 | FE-13 | avgSalePrice weighting | `unitPriceSum / lineCount` — line-weighted (NOT qty-weighted) | __ pending |
| G14 | FE-14 | Per-bucket split (discount/tax/avgPrice Sold/Cancelled/Complementary) | Per `CR_011_DATA_SCOPE_FIX_IMPLEMENTATION_PLAN_2026_06_02.md` §3 | **✅ Approved 2026-06-02** ("go" directive) — surfaces in audit as 🟢 Already Approved (not REVIEW) |

### G.3 — Full disclosure batch added 2026-06-02 (FE-17..FE-47)

Per owner directive *"we should not have any front end rule unless verified and signed by me"*, a complete codebase scan was performed and **31 additional undisclosed FE business rules** were registered. Of these, **FE-17 is owner-approved as part of the same directive** (verbatim: *"In cancelled item where there is no tax field coming from the backend, we can make them light green. They are audit pass and make them in bottom of the row."*). The remaining **30 rules surface as REVIEW pending** on the S5 Audit tab.

#### G.3.1 — Approved as part of this batch

| # | Rule ID | Rule | Owner Decision |
|---|---|---|---|
| G17 | FE-17 | **Cancelled tab — tax-presence audit (cancelled should have no tax)** — Business rule: cancelled lines should not carry tax. `tax = 0` → EXEMPT (light-green, ✓ exempt chip, "no tax booked" group at bottom of Cancelled tab). `tax > 0` → AMBER (review — cancelled line carries tax, contradicts business rule; "cancelled with tax booked" group at top). `GST + VAT both > 0` → RED (top-level safety net). No FE expectedTax math — pure tax-presence check. | **✅ APPROVED 2026-06-02 (scope corrected same-day after iteration)** — Owner verbatim final: *"in audit only one who no taxes should be green, because cancelled item will not have tax"* + *"1 amber for now"* (severity) + *"2 re enable"* (FE-16 partition) + *"3 a"* (audit-trail kept in-place). Earlier same-session iterations (narrow no-tax-field-only, then broadened full-exemption) are noted in `auditManifest.js` `approvedSource` for traceability. |

#### G.3.2 — Tax / Audit core (P0 — pending REVIEW)

| # | Rule ID | Rule | Current behaviour | Owner Decision |
|---|---|---|---|---|
| G18 | FE-18 | **expectedTax formula** (the audit baseline itself) | Exclusive: `revenue × rate/100`. Inclusive: `revenue − revenue / (1 + rate/100)` | __ pending |
| G19 | FE-19 | **RED severity definition** | RED when ANY single line in a bucket has BOTH `gst_tax_amount > 0` AND `vat_tax_amount > 0` | __ pending (verbally attested 2026-06-02 Audit Summary v3 #6; needs explicit manifest sign-off) |
| G20 | FE-20 | **AMBER tolerance** | `tolerance = ₹0` (zero rupee — any non-zero `|actual − expected|` flags AMBER) | __ pending (verbally A4-approved 2026-06-02; needs explicit manifest sign-off) |
| G21 | FE-21 | **tax_type fallback chain** | `fd.tax_type → product.tax_type → (vat > 0 ? 'VAT' : 'GST')` — auto-classifies when product silent | __ pending |
| G22 | FE-22 | **tax_calc fallback chain** | `fd.tax_calc → product.tax_calc → 'Exclusive'` — assumes Exclusive when product silent | __ pending |
| G23 | FE-23 | **tax_rate fallback chain** | `parseFloat(fd.tax) → parseFloat(product.tax) → 0` — zero when missing means any actual tax > 0 flags AMBER | __ pending |
| G24 | FE-24 | **Skip-empty-bucket rule** | When `(foodId × bucket)` has `revenue = 0 && tax = 0` → no flag raised | __ pending |

#### G.3.3 — UI behaviour / thresholds (P1 — pending REVIEW)

| # | Rule ID | Rule | Current behaviour | Owner Decision |
|---|---|---|---|---|
| G25 | FE-25 | **MAX_RANGE_DAYS = 62** | User cannot query more than 62 days at a time | __ pending |
| G26 | FE-26 | **Default column sort** | Revenue ↓ on page load | __ pending |
| G27 | FE-27 | **UI currency rounding** | Was: `Math.round` to nearest whole rupee in apiRows mapper (paise truncated). Now: REJECTED — replaced with round-to-2-decimals (`Math.round(v*100)/100`). | **❌ REJECTED 2026-06-02** — Owner verbatim: *"Reject FE-27 — remove rounding entirely, show decimal values, we have to always show actual value till 2 decimals"*. Investigation confirmed 29 false positive AMBERs caused by Math.round truncating paise before audit engine comparison. Code change shipped: all 12 currency fields in apiRows mapper now use `r2()` (round to 2 decimals); `formatCurrency` updated to `minimumFractionDigits:2, maximumFractionDigits:2`. |
| G28 | FE-28 | **PDF/Excel and UI both use 2-decimal ₹** | After FE-27 rejection, UI and exports both show 2-decimal precision — parity gap resolved | __ pending |
| G29 | FE-29 | **Summary "AVG" KPI formula** | `avgRev = totalRev / totalQty` (per-unit-qty, NOT avg of avgPrices) | __ pending |
| G30 | FE-30 | **Date preset definitions** | `7D = today + last 6 days` · `30D = today + last 29 days` · `MTD = month-start → today` · `FY = disabled` | __ pending |
| G31 | FE-31 | **Context-aware sort_by API param** | `activeTab === 'cancelled' ? cancelPunchedToggle : paidPunchedToggle` | __ pending |

#### G.3.4 — Drill-down & service-side aggregation (P2 — pending REVIEW)

| # | Rule ID | Rule | Current behaviour | Owner Decision |
|---|---|---|---|---|
| G32 | FE-32 | **Drill panel cap = max 20 order lines** | Older order lines truncated from display (aggregation still includes all) | __ pending |
| G33 | FE-33 | **Addon attach-rate formula** | `round((addonCount / totalSoldLines) × 100)` where `totalSoldLines` = served-status lines of parent item | __ pending |
| G34 | FE-34 | **Addon revenue formula** | `addonPrice × qty` (parent item qty) — assumes addon sold with every parent unit | __ pending |
| G35 | FE-35 | **Cancel-scope derivation** | `scope = 'order'` iff line has no `reason_type` AND parent order has `cancellation_reason`; else `'item'` | __ pending |
| G36 | FE-36 | **Drill line status priority** | `cancelled → comp → served` (cancelled wins over comp wins over served) | __ pending |
| G37 | FE-37 | **Veg derivation (multi-form coercion)** | `veg === 1 \|\| '1' \|\| true` → all coerce to true; everything else false | __ pending |
| G38 | FE-38 | **Variation revenue aggregation** | Sum of `line.price` per variation label; if one line carries 2 variations of same label, line.price double-counts | __ pending |

#### G.3.5 — Meta / minor (P3 — pending REVIEW)

| # | Rule ID | Rule | Current behaviour | Owner Decision |
|---|---|---|---|---|
| G39 | FE-39 | **meta.totalRevenue = revenueSold only** | Excludes cancelled + comp revenue → "Net Sales" not "Gross" | __ pending |
| G40 | FE-40 | **Two different "avg" formulas coexist** | `meta.avgPerItem = totalRevenue / rows.length` (per-distinct-item); summary tile `avgRev = totalRev / totalQty` (per-unit-qty) | __ pending |
| G41 | FE-41 | **Row severity priority (RED > AMBER > EXEMPT)** | When a row has flags across multiple buckets, tinting picks RED first, then AMBER, then EXEMPT | __ pending |
| G42 | FE-42 | **"Cancelled" badge bleed** | Red "Cancelled" chip appears after item name on All/Top/Slow tabs when `row.status === 'cancelled'` (i.e. all sold qty cancelled) | __ pending |
| G43 | FE-43 | **"Comp" badge bleed onto non-comp tabs** | A purple "Comp" chip is appended after the item name on every tab when row.isComplimentary === true. | **❌ REJECTED 2026-06-02** — Owner verbatim: *"1 reject cancelled shd show cancelled and complementary shd show complementary"*. Code change shipped: Comp chip now hidden on Cancelled tab (rejected cross-tab bleed) AND on Comp tab (redundant — every row there is comp by definition); still rendered on All/Top/Slow tabs where it adds informational value. |
| G44 | FE-44 | **Audit tab badge format** | Tab pill renders `N · mR · kA · jR` (count + per-severity sub-badges) when `audit.total > 0` | __ pending |
| G45 | FE-45 | **Download menu "GATED" badge wording** | Amber "GATED" badge on Excel/PDF rows when `audit.blocksExport`; "SOON" on Email/WhatsApp/SMS rows | __ pending |
| G47 | FE-47 | **Complementary detection accepts string OR number "1"** | `String(line.complementary) === '1' \|\| line.complementary === 1` — partial duplicate of FE-09 but explicit multi-form coercion | __ pending |
| G48 | FE-48 | **Context-aware Cancelled + Comp tab column headers** — Cancelled tab → "Cancelled Qty" + "Lost Revenue"; Comp tab → "Comp Qty" + "Would-be Revenue"; All/Top/Slow unchanged. | **✅ APPROVED 2026-06-02** — Owner verbatim: *"in cancel tab we shd show header cancelled quantity and lost revenue"* + *"q3 this also u fix complementary also revenue also"* |

#### G.3.6 — Tab membership + lens fixes (added 2026-06-02, owner-directed)

| # | Rule ID | Rule | Current behaviour | Owner Decision |
|---|---|---|---|---|
| G49 | FE-49 | **All Items tab excludes cancelled-only items** | Items with qtySold=0 and only cancelled lines excluded from All Items tab. Prevents 0-qty, ₹0-revenue ghost rows. They remain on Cancelled Lines tab. | __ pending |
| G50 | FE-50 | **All/Top/Slow tabs lens Tax + AvgPrice to Sold-only** | Tax and AvgPrice columns on All/Top/Slow now show sold-only values (taxSold, avgPriceSold) instead of backward-compat ALL-bucket totals. Completes per-bucket split from FE-14. | __ pending |
| G51 | FE-51 | **Discount source = discount_on_food** | Backend allocates order-level restaurant_discount proportionally across lines into `discount_on_food`. Legacy field `discount_amount` is always ₹0. FE now reads `discount_on_food` as actual per-line discount. | __ pending |
| G52 | FE-52 | **Revenue = price − discount_on_food (actual collected)** | Revenue per line = `price − discount_on_food`. Backend computes tax on this discounted amount. Using raw `price` inflated revenue and caused audit AMBERs. Zanzibar proof: 160/160 lines match when using discounted revenue. Expected to eliminate most Sold-bucket AMBERs. Backend escalation: should send actual selling price. | __ pending |

#### G.3.7 — 7-column layout + addon/variation revenue (added 2026-06-02, owner-directed)

| # | Rule ID | Rule | Current behaviour | Owner Decision |
|---|---|---|---|---|
| G53 | FE-53 | **Item Total = unit_price × qty + addon + variation** | Full line value before discount. Uses unit_price from order log (not product API). Backend `price` field is inconsistent so we compute from components. | __ pending |
| G54 | FE-54 | **Subtotal = Item Total − Discount + Service Charge** | Taxable base. Backend computes GST on this amount. Tips and delivery excluded (order-level). | __ pending |
| G55 | FE-55 | **Total Revenue = Subtotal + Tax** | What customer actually paid for the line. Avg Price = Total Revenue / Qty. | __ pending |

### G.4 — How owner resolves these

Reply in chat per row, e.g. *"G1 approve · G2 reject use top 10 · G7 approve · G10 reject use complementary_price × qty · …"*. Each resolution writes a Sprint Status Owner Decision Log entry + an `auditManifest.js` update. No code change is implied by approval (rule stays as coded); a rejection implies a follow-up code change in the next sub-CR. Resolution may happen incrementally — owner is not required to clear all 14 at once.

### G.5 — Audit tab will compute the authoritative list at runtime

This pre-seed catalog reflects a manual scan of the two main files on 2026-06-02. The Audit tab's manifest collector will produce the authoritative list at first run by scanning `// @audit:rule` annotations across `/app/frontend/src/`. Items added later (or items I missed in the scan) will simply appear in the next run.

### G.6 — Pending Billing Tab Rules (added 2026-06-03)

| # | Rule ID | Rule | Current behaviour | Owner Decision |
|---|---|---|---|---|
| G56 | FE-56 | **Sold Items gate: f_order_status === 6** | A line counts as "sold" only if the parent order has f_order_status=6 (delivered/paid). Orders with status 2 (not served) or 5 (served not paid) are excluded from the Sold bucket and moved to Pending Billing. | ✅ **APPROVED 2026-06-03** — Owner verbatim: *"f_order_status should be 6"* + *"1 4 5 6 should not have any item in common these are mutually exclusive"* |
| G57 | FE-57 | **Pending Billing bucket: f_order_status ≠ 6** | Non-cancelled, non-comp lines from orders with f_order_status ≠ 6 go to "Pending Billing" bucket. These are orders where payment hasn't been collected and GST hasn't been billed by backend. Same audit rules apply. | ✅ **APPROVED 2026-06-03** — Owner verbatim: *"keep same rules in pending till i manually verify audit as green"* |

### G.7 — Audit Drift Investigation Feature (added 2026-06-03)

| # | Rule ID | Rule | Current behaviour | Owner Decision |
|---|---|---|---|---|
| G58 | FE-58 | **Drift investigation: retain per-line order details for drift lines** | During aggregation, when a sold/pending line has abs(actual_tax - expected_tax) > tolerance (₹0.02), save the order details (orderId, date, employee, payment, table, qty, subtotal, expectedTax, actualTax, drift) into a driftLines[] array on that food_id. Same pattern as drill.orderLines for S3. No extra API call. | ✅ **APPROVED 2026-06-03** — Owner verbatim: *"In audit tab i need order details which are responsible for drift, will detailed note this kind of investigation to run dynamically when user clicks on we need to have button to run this investigation"* |
| G59 | FE-59 | **Audit tab Investigate button: expand drift lines on click** | Each AMBER row on the Audit tab shows an "Investigate" button. Clicking reveals the driftLines[] for that item in an inline expandable table showing Order#, Date, Employee, Payment, Table, Qty, Subtotal, Expected, Actual, Drift. Collapsed by default. | ✅ **APPROVED 2026-06-03** — Same owner directive as FE-58. |


---

## CATEGORY H: Insights Audit Batch (BUG-125..129, CR-029..033) — PENDING, BLOCKS GATE 3

**Added:** 2026-06-11 · **Source:** INSIGHTS_REPORTS_AUDIT.md + INSIGHTS_REPORTS_AUDIT_PALMHOUSE.md · Gates 0-2 complete for all items.

| # | Item | Decision needed | Options | Recommendation | Owner Answer |
|---|---|---|---|---|---|
| H1 | BUG-125 | Cancel-scope match approach | a. add string `'cancel'` match · b. align to `fStatus===3` (shared transform predicate) | b (one predicate everywhere) | ✅ **DECIDED 2026-06-11: b, Merge exclusion kept ("Yes certainly")** |
| H2 | BUG-127 | Unsettled-TAB tile semantics | A. redefine "Credit Outstanding" = all TAB value · B. remove tile · C. wait for backend BUG-129 | A | ✅ **DECIDED 2026-06-11: source from Credit Management API (tap-waiter-list / paid-in-tab-order-list), NOT order-logs — "unsettled Tab comes from different API coz these orders are later settled, in credit management we use that"** |
| H3 | BUG-127 | If H2=A: tile scope | a. room-excluded (match Ledger Credit tab) · b. incl. rooms (Dashboard's current scope) | a | SUPERSEDED by H2 ruling — credit API is source of truth |
| H4 | BUG-128 | Confirm: dedupe only; wider cancel-window deferred to CR-031 | yes/no | yes | PENDING |
| H5 | BUG-129 | Backend escalation route + FE wait-or-proceed | a. owner forwards brief to backend, FE proceeds on current data · b. FE blocks on answer | a | **OWNER RULING 2026-06-11 (verbatim): "Tab is to be considered as paid only for GST purposes since this is already billed so tax needs to be paid, its never revenue."** → TAB excluded from revenue on all screens; its GST stays in tax-collected; revenue recognised on settlement. Detailed per-report TAB map shared; confirmations pending (see brief) |
| H6 | CR-029 | Default room scope | a. rooms EXCLUDED everywhere (Room Orders Report covers them) · b. INCLUDED everywhere · c. per-screen toggle | a | **OWNER DIRECTION 2026-06-11 (verbatim): "any food running in room or any thing which is transferred to room, food should be part of report. room report is specifically to see how much coming from room as room price and food price. so ideally all reports should include this food orders"** → option b (include room FOOD everywhere); Room Orders Report stays the room lens. Final confirmation pending after gap walkthrough |
| H7 | CR-029 | UI affordance | a. static badge · b. interactive toggle | a (badge) for v1 | PENDING |
| H8 | CR-029 | transferToRoom membership | a. room scope (excluded with rooms) · b. restaurant scope (today: in Sales, not in Ledger Paid — inconsistent) | a | PENDING |
| H9 | CR-029 | `payment_method='ROOM'` with `order_in=null` treated as room order? | yes/no | yes | PENDING |
| H10 | CR-029 | If rooms excluded: drop Dashboard "Room" channel slice? | yes/no | yes (link to Room Orders Report instead) | PENDING |
| H11 | CR-030 | Canonical meaning of "revenue" | a. billed (punch date) · b. collected (collection date) | owner business call | PENDING |
| H12 | CR-030 | Delivery mechanism | a. single canonical basis everywhere · b. labelled toggle per screen | b (toggle, labelled) | PENDING |
| H13 | CR-030 | TAB revenue recognition | a. at punch · b. at settlement | b (matches backend engine) | ✅ **DECIDED 2026-06-11: b — settlement day. Owner H5 rulings (verbatim): "sales report should not include tab order amount but it needs to include all settled tab amount, which is different API. Payments report we need to include tab settlement and exclude tab orders. Items & Menu — tab can be in sold for item ledger. Order Ledger — fine. Tax collected — correct (TAB GST stays)." H5-a yes (settlement-day revenue), H5-b yes (tile = credit outstanding via credit API)** |
| H14 | CR-030 | Daily bucketing of 00:00-03:00 orders | a. prior business day · b. calendar date (today's behaviour) | a (42 such orders in May @palmhouse) | PENDING |
| H15 | CR-030 | Approve Phase 1 = collection-mode correctness fixes (B1 filter mismatch + B2 to_date+1 tail fetch), no UI change | yes/no | yes | PENDING |
| H16 | CR-030 | Toggle scope: which screens | a. all 9 report screens · b. core 5 (Sales, Payments, Dashboard, Items, Ledger) | b first | PENDING |
| H17 | CR-030 | Default mode post-rollout | a. punch (today's numbers unchanged) · b. collection | a | PENDING |
| H18 | CR-031 | Canonical cancellation money basis | a. per-line subtotal+tax · b. order_amount | a | PENDING |
| H19 | CR-031 | Partially-cancelled orders: which is "loss"? | a. cancelled-line value (e.g. Rs10,680) · b. order_amount delta (Rs120) | a + flag data bug to backend | PENDING |
| H20 | CR-031 | Count basis | a. qty · b. lines | a | PENDING |
| H21 | CR-031 | Attribution + window | a. cancel_at, widen fetch so pre-range orders' cancels count · b. created_at business day (today) | a | ✅ **DECIDED 2026-06-11: Cancellations report → by cancel_at; Items & Menu cancelled bucket → by cancel_at; Order Ledger Cancelled tab → by punch date (verbatim: "by punch date first we show")** |
| H22 | CR-031 | Comp / 100%-discounted cancelled lines included in loss? | yes/no | no (zero net loss) | PENDING |
| H23 | CR-031 | cafe103 order 012612 Rs1,02,286 cancel ("Others") — genuine or test data? | genuine/test | owner to verify | ✅ **DECIDED 2026-06-11: TEST data ("test dont see any june data") — exclude from KPI baselines/QA fixtures** |
| H24 | CR-032 | transferToRoom payment bucket | a. own "Room Transfer" bucket (Dashboard style) · b. grouped under TAB (Payments style) | a | PENDING |
| H25 | CR-032 | Zero-amount paid orders | a. exclude from AOV + order counts · b. keep counted · c. badge only | a | ✅ **DECIDED 2026-06-11: b — keep counted ("this will anyways flag in discount since these must be counted order correct") — 100% discount visible in discount column, orders counted normally** |
| H26 | CR-032 | Until backend defines `pending`: keep out of all paid buckets? | yes/no | yes | PENDING |
| H27 | CR-032 | `partial` handling | a. single "Partial" bucket (FE-only) · b. backend ask for leg-split to match settlement | a now, b queued | PENDING |
| H28 | CR-032 | Bucket list sign-off: Cash, Card, UPI, TAB, Room Transfer, Partial, Zomato Gold, Other(+log) | approve/modify | approve | PENDING |
| H29 | CR-033 | Backend ask route for total_sale formula | a. owner forwards brief · b. agent drafts email-ready brief for owner | b then a | PENDING |
| H30 | CR-033 | Interim: add "definition pending" footnote on Settlement total-sale KPI now? | yes/no | yes (cheap honesty) | PENDING |
| H31 | CR-033 | Does owner know if settlement sale includes room folio/advance amounts? | info | owner input | PENDING |
| H32 | BATCH | Sprint placement: pull into active POS 4.0 now, or queue after owner smoke batch S-1..S-9? | now/after | after smoke batch unless P1 pain | PENDING |
| H33 | BATCH | Approve palmhouse+cafe103 replication harness (/app/audit_data/) as the QA acceptance fixture for this batch | yes/no | yes | PENDING |
| H34 | BATCH | Frozen screens S5-S9: blanket freeze-log amendment approval for this batch, or per-item? | blanket/per-item | per-item | ✅ **DECIDED 2026-06-11: per-screen amendment presented at each Gate 4** |

### H-Addendum — Session rulings 2026-06-11 (owner Q&A round 2)

| Ref | Ruling (owner verbatim where quoted) | Status |
|---|---|---|
| Q1 | "Its real data, tabs is not settled" — ₹4.4L+ outstanding credit at palmhouse is genuine; settled-TAB lines will read ₹0 until collections happen | ✅ CONFIRMED |
| Q2 | `room_revenue` (Room Cash/Card/UPI) in Order Summary API = **room-channel FOOD collected at checkout, by collection date** — verified to-the-rupee (Mar 15: 23 room food orders punched Feb 23–Mar 13, collected Mar 15 = Cash 137/Card 20475/UPI 1712 exactly). NOT room rent (Room advance/Checkout = 0 at palmhouse). Palm House DOES have Room Cash/Card/UPI values | ✅ VERIFIED |
| Q3 | No separate "Room" tab needed in Order Ledger — room rent never enters order-logs; room food rows simply join existing tabs | ✅ CONFIRMED |
| Q4 | **"No connection of order id to tab, tab is cumulative"** — TAB settlements are against customer's cumulative balance, never linked to orders. Items stay in "Added to Credit" permanently; settlements appear only as money-in (Credit Cash/Card/UPI) on settlement day. Items & Menu gets Order Ledger-style buckets (Sold / Added to Credit / Cancelled / Pending) | ✅ DECIDED |
| Q5 | Owner confirmed understanding: order punched Apr 28, collected May 5 → punch-dated Insights screens show it under Apr 28 (retroactively), NEVER in May; only Order Summary/Settlement show it on May 5. Follow-up R1 open: make Sales/Payments collection-dated to close this | CONFIRMED, R1 OPEN |
| R1 | **DECIDED 2026-06-11: "yes by collected date"** — Sales/Payments/Dashboard revenue counts ALL orders by collection date (collect_bill). Insights = Order Summary = Settlement basis. Resolves H11 (=collected), H12 (single canonical basis, no toggle), H17 (n/a) | ✅ DECIDED |
| R3 | **OWNER RULING 2026-06-11: "lets freeze all questions first before implementation"** — NO Gate 3/4/5 for ANY item until the full question set is frozen. Workstream A quick fixes also held | ✅ PROCESS RULE |
| CANCEL-VAL | Data finding 2026-06-11: when items are cancelled, backend REMOVES their value from order_amount (158/158 May partial-cancels: order_amount = kept items only). Cancelled value survives ONLY in item lines (unit_price/price/qty retained; gst zeroed). Fully-cancelled orders' order_amount unreliable (26/97 zero, others arbitrary: ₹1 vs ₹54). Cancelled COMP items: 0 occurrences in 4 months | ✅ VERIFIED |
| H18 | **DECIDED 2026-06-11: item-line value.** Verified: discount_on_food is ZEROED on all 823/823 cancelled lines (4 months) — owner's check confirmed. Loss formula = unit_price×qty + addons + variations (discount always 0; residual tax on 34 lines included as-is). H19 partial-cancel = same line-value rule | ✅ DECIDED |
| H22 | **OWNER DIRECTION 2026-06-11: comp cancels ARE loss** ("whatever we are giving complementary we are getting price for that id in a key so that food/revenue lost, so it cancelled"). Data: billed keys (unit_price/price) are 0 on comp lines; menu master price IS available inside line's food_details JSON. Implementation: value comp-cancels from food_details master price. 12 comp lines / 0 comp-cancels in 4 months — no current ₹ impact. Micro-confirm pending: master-price source OK | ✅ DIRECTION RECORDED |
| ORD-CANCEL-KEY | Verified: NO order-level cancelled-amount key exists (`canceled` = None on all 5,858 orders; only metadata: cancel_at/canceled_by/reason). Item-level consolidation is the only source (owner's stated fallback). Optional backend ask: add order-level cancelled_amount | ✅ VERIFIED |
| ITEMS-BASIS | **DECIDED 2026-06-11: Items & Menu stays PUNCH-DATED** ("this will be punched date, only cancelled will be at cancel, we already filtering with status correct"). Sold bucket = fs-6 items by punch date; Cancelled bucket by cancel_at; status filter is the gate. Accepted: Sold ≈ Sales only for same-day collections — by design, header label states basis | ✅ DECIDED |
| Q-B | **DECIDED 2026-06-11: yes — per-screen basis labels in headers** ("yes headers will be good"). Sales/Payments/Dashboard: "by collection date"; Items: "by punch date"; Ledger: "by punch date"; Cancellations: "by cancellation date" | ✅ DECIDED |
| H22-KEY | Comp-cancel price key: ✅ **OWNER PROVIDED 2026-06-11:** `"complementary": 1, "complementary_price": "270.00"` — item-line key `complementary_price` IS the comp valuation source (matches prior live verification; food_details fallback dropped). Locked rule: comp-cancel loss = `complementary_price × qty` | ✅ DECIDED |
| BK-OVERRIDE | **SUPERSEDED 2026-06-11 by OPS-CANCEL ruling below** | ✅ |
| OPS-CANCEL | **OWNER INFO + RULING 2026-06-11:** order payload `operations[]` block carries `{"operation":"order_cancel", "previous_order_amount":"443.00"}` — "this is the amount if its comes show else front end over ride". LIVE-VERIFIED: block exists (May: 27 order_cancel ops, also 164 item_cancel ops). **Locked rule: use `operations.order_cancel.previous_order_amount` when present, else item-level consolidation.** CAVEATS (flagged for Gate 4): (1) coverage partial — only 25/97 May full-cancels have the op; (2) value is tax-INCLUSIVE bill (263 vs item-net 250); (3) inherits header disease on edge cases (015756: prev 1.00 vs items 54; 015772: prev 210 vs items 400). Harness will cross-check both sources and flag drift (FE-58 pattern) | ✅ DECIDED |
| R2 | **DECIDED 2026-06-11: Credit-Outstanding tile = total outstanding as of LAST DAY of selected range** (owner: "no, total outstanding as of last day selected"). Implementation: derive as-of-date balance from dated credit records (tap-customer-record-list) or current balance when range end = today | ✅ DECIDED |
| Q3-val | Ledger tab rules for room orders VALIDATED against code + live data: SRM/RM collected at checkout arrive as fs=6 + real mode (card/cash/upi) → Paid tab ✅ · RM not yet collected (fs=5/2, pm=pending/COD, 12 orders ₹26,213) → Running tab ✅ (deriveOrderStatus fs≠3/6/8/9 → running) · pm='transferToRoom' literal (pre-checkout state) → Running tab ✅ (explicit rule, CR-001 Phase 2) · pm='ROOM' fs=6 (folio settled) → Paid tab ✅ · SRM+TAB → Credit tab ✅. NO new rules needed — removing the upstream room-row stripping is sufficient; existing TAB_FILTERS classify all room stages correctly | ✅ VALIDATED |
ATED |

### H-Addendum-2 — Session rulings 2026-06-11 (live-API validation session)
| ID | Decision / Finding | Status |
|---|---|---|
| TAP-SUMMARY | **LIVE-VERIFIED 2026-06-11:** backend ADDED `restaurant-tap-summary` {total_credit,total_debit,balance} to `tap-waiter-list` (Palm House: 7,16,040.50/88,612.50/6,27,428.00 · cafe103: 22,53,630.51/10,27,286.24/12,26,344.27). ALL date params (as_of_date/to_date/from+to/date, both formats) are silently IGNORED — summary is always as-of-NOW. Historical as-of-date capability still missing (brief #2 stands) | ✅ VERIFIED |
| R2-AMEND | **OWNER RULING 2026-06-11** (verbatim: "when user selects any date range it gives outstanding till date so its same right"): until backend ships as_of_date, Credit-Outstanding tile shows CURRENT outstanding (`restaurant-tap-summary.balance`) for ALL selected ranges, labeled "as of today". Supersedes the "—" placeholder for historical ranges. Upgrade to true as-of-range-end (original R2) when backend delivers brief #2. **BUG-127 is no longer backend-blocked** | ✅ DECIDED |
| CR033-FORMULA | **DERIVED + LIVE-VALIDATED 2026-06-11** (March, rid 541): settlement `total_sale = paid_revenue − TAB settled + TAB punched` (= order collected + room settled + TAB at punch). 25/31 days exact; both TAB-settlement days (Mar 25/31) exact after TAB adjustment; residue only ₹2,304 across 4 days (Mar 6: 851, 16: 935, 17: 150, 18: 368). Also: `unpaid_revenue ≡ orderTAB` daily; `paid_revenue = order_payment + tab_payment + room_revenue` exact 31/31. Owner: "we will go deeper later but for now we can move forward" — CR-033 stays parked; brief #1 sharpened to confirm-formula + explain-residue | ✅ VALIDATED, PARKED |
| SALES-VAL | **OWNER FORMULA VALIDATED 2026-06-11:** "Sales = all paid orders total from order log + tab settled for other API". Replicated from raw order-logs (fs=6, collect_bill business day 06:00→03:00, room RM/SRM/ROOM INCLUDED natively, pm='TAB' excluded despite fs=6 stamp) + daily-sales `tab_payment`: matches backend `paid_revenue` to the rupee on 5/5 test days incl. both TAB-settle days (Mar 15/18/24/25/31). Order-level proof: room orders appear ONLY in `room_revenue` bucket, never in `order_payment` — buckets disjoint, no double count. **CR-030 acceptance target = daily-sales `paid_revenue`, cross-footable per day** | ✅ VALIDATED |

### H-Addendum-3 — Batch closure + multi-restaurant validation (2026-06-11 late session)

**Owner directive (verbatim): "rest as recommded can be closed and one final doc for backend shd be made"** — all open Category-H rows closed per recommendation below. H24/H26 explained to owner, await explicit confirm. Final backend doc: `BACKEND_BRIEF_FINAL_2026_06_11.md`.

| ID | Decision / Finding | Status |
|---|---|---|
| CAFE103-VAL | **GO-2/GO-3 reconciliation cafe103 (rid 644) Mar–May 2026:** Sales identity 90/92 days exact (total drift ₹2 — two `partial` orders #012271/#012311 where backend payment legs sum ₹1 over order_amount; see N1/N3). CR-034 identity exact to the paisa all 3 months (Credit: Mar ₹3,44,687.44 · Apr ₹75,601.26 · May ₹2,30,932.11; 13–16% of item revenue — postpaid). CR-031: item-scope cancels Mar 42/₹19,317 · Apr 70/₹16,133 · May 83/₹25,656; comp-cancels 0; order-scope 25 orders all valued via line consolidation. Max punch→cancel gap 27d < 45d lookback. Test order 012612 NOT in Mar–May window. Harness: `/app/audit_data/cafe103/` | ✅ DONE (handover item 4 closed) |
| WR-VAL | **GO-2/GO-3 reconciliation Welcome Resort (rid 474, owner-provided) Mar–May 2026:** Sales identity **92/92 days exact, ₹0 total drift** — at a restaurant with real room RENT flowing (Room advance ₹4,76,500 · Room Checkout ₹2,77,255 · checkin collections ₹1,82,075). CR-034 identity exact (no TAB usage — credit ₹0). CR-031: item-scope Mar 34/₹11,240 · Apr 28/₹6,097.75 · May 28/₹5,722.50; comp-cancels 0; order-scope 4 orders via line consolidation. Harness: `/app/audit_data/welcomeresort/` | ✅ DONE |
| H31 | **ANSWERED BY DATA (Welcome Resort):** settlement `total_sale` does NOT include room folio/advance/checkout/checkin. Formula `total_sale = paid_revenue − TAB settled + TAB punched` matches **92/92 days exactly, ₹0 residue**. Adding Room advance overshoots by exactly ₹4,76,500; +checkout by ₹7,53,755; +checkin by ₹1,82,075. Settlement sale = food/order money only. Also re-confirms Q2 at a rent-charging restaurant: `paid_revenue` excludes rent (92/92 sales identity held) | ✅ ANSWERED |
| CR033-CONFIRM-2 | CR-033 formula now validated on a SECOND restaurant with ZERO residue (WR 92/92). Palm House ₹2,304/4-day residue is palmhouse-specific (suspected same-day TAB edits) — backend ask narrowed to explaining that residue only | ✅ VALIDATED |
| OPS-GAP | `operations[].order_cancel` first appears 2026-05-18 (Palm House). Historical data has none → shipped fallback (line consolidation) covers all old reports by design. **cafe103 emits NO ops blocks even post-May-18 (13 cancels May 18–26 without it)** — feature appears per-restaurant; backend ask N2. FE unaffected (fallback carries 100%) | ✅ VERIFIED |
| PARTIAL-CONFIRM | Orders #012271 / #012311 (rid 644) confirmed NOT cancelled — fs=6 paid, pm=partial, zero cancelled lines, ops trail = bill_payment+edits. The ₹1/day drift is backend leg rounding (legs ₹1,160 vs bill ₹1,159 · ₹3,601 vs ₹3,600) | ✅ VERIFIED |
| H4 | CLOSED — BUG-128 was dedupe-only; wider cancel window delivered via CR-031 (shipped) | ✅ CLOSED |
| H7 | CLOSED — **a: static badge** (shipped: header text "Revenue by collection date · incl. room food · credit counted on settlement") | ✅ CLOSED |
| H8 | CLOSED — **a: transferToRoom = room scope** (pre-checkout state; revenue recognised at checkout as pm='ROOM' → Paid/Room Bill; Q3-val matrix) | ✅ CLOSED |
| H9 | CLOSED — **yes**: pm='ROOM' with order_in=null treated as room order | ✅ CLOSED |
| H10 | CLOSED — **keep Dashboard Room channel slice** (meaningful post-H6 room-food inclusion) | ✅ CLOSED |
| H14 | CLOSED — **a: 00:00–03:00 tail → prior business day** (formalized; matches backend engine to the rupee on all 3 validated restaurants) | ✅ CLOSED |
| H15/H16/H17 | CLOSED — superseded by R1 ("yes by collected date"): single canonical collection basis, no toggle | ✅ SUPERSEDED |
| H19/H20 | CLOSED — superseded by H18 ruling: partial-cancel loss = cancelled-line value · count basis = qty | ✅ SUPERSEDED |
| H24 | Explained to owner (transferToRoom never appears in paid mix — it is a state, not a payment; money lands as pm='ROOM' → "Room Bill" bucket at checkout). Await explicit confirm | ⏳ EXPLAINED, PENDING |
| H26 | Explained to owner (`pending` = unpaid marker on fs 2/5 orders only; counting it as a paid bucket would inflate revenue; exclusion shipped as defense-in-depth, costs nothing). Await explicit confirm | ⏳ EXPLAINED, PENDING |
| H27 | CLOSED — **a now** (single Partial bucket, FE-only) + **b queued** as backend ask N1 (leg split on order record; evidence #012271/#012311) | ✅ CLOSED |
| H28 | CLOSED — bucket list APPROVED: Cash · Card · UPI · Room Bill · Partial · Zomato Gold · Other(+console log). TAB/transferToRoom/pending/Cancel/Merge → never in paid mix | ✅ CLOSED |
| H29 | CLOSED — **b done** (BACKEND_BRIEF_FINAL_2026_06_11.md compiled, email-ready) → **a: owner forwards** | ✅ CLOSED |
| H30 | CLOSED — **yes**: "definition pending" footnote on Settlement total-sale KPI APPROVED. **CODE SHIPPED 2026-06-11** (owner "go code h30"): footnote + tooltip (validated formula) on all 3 total-sale surfaces — `SettlementPage.jsx`, `SettlementPanel.jsx`, `SettlementMockup.jsx`; data-testids `settlement-*-total-sale-footnote`; screenshot-verified | ✅ SHIPPED |
| H32 | CLOSED — batch placement: after owner smoke batch | ✅ CLOSED |
| H33 | CLOSED — **yes**: `/app/audit_data/` (palmhouse + cafe103 + welcomeresort) approved as QA acceptance fixture | ✅ CLOSED |
| N1 | Backend ask: expose partial-payment leg split on order record (legs ≠ order_amount by ₹1; `payment_amount` null on partial orders) — in final brief §6 | ✅ QUEUED |
| N2 | Backend ask: enable/explain `operations.order_cancel` emission at cafe103 (0 coverage incl. 13 post-May-18 cancels) — in final brief §5 | ✅ QUEUED |
| N3 | CLOSED — ₹1/day drift on partial days accepted as known backend leg rounding; documented, no FE workaround | ✅ CLOSED |
| N4 | CLOSED — cafe103 spot-check done (CAFE103-VAL) | ✅ CLOSED |
| CR033-CLOSE | **OWNER DIRECTIVE 2026-06-11 (verbatim: "i will come back with all answers for now u can close this CR"):** CR-033 CLOSED in CR_REGISTRY. Basis: formula twice-validated (rid 474 ₹0 residue · rid 541 ₹2,304/4 days), H31 answered, H30 footnote shipped. Backend confirmation downgraded to non-blocking hygiene (final brief §1). Owner to return with answers to the full open set (H24 · H26 · Gate-6 smoke · backend brief replies) | ✅ CLOSED |
