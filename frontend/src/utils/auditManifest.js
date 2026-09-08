/**
 * auditManifest.js — CR-011-AUDIT-01
 *
 * Source of truth for ALL frontend business rules.
 * Per CR_011_SCREEN_FREEZE_PROTOCOL.md §8, no FE business rule may exist
 * outside this manifest. Every rule MUST have a matching `// @audit:rule`
 * annotation at its source site.
 *
 * Owner approves a REVIEW item via chat (G-prefixed in OWNER_DECISION_QUEUE.md);
 * agent then flips `approved: false → true` + records `approvedDate` +
 * `approvedSource` (sprint-status row reference).
 *
 * 14 entries pre-seeded 2026-06-02 from manual scan of S5 + service.
 */

export const AUDIT_RULES = [
  // ── In `pages/reports-module/ItemSalesHybridMockup.jsx`
  {
    id: 'FE-01',
    name: 'Slow Movers threshold',
    explains: 'An item is a Slow Mover if it sold ≤ 1 unit AND sold > 0 units AND is not currently cancelled. Items with qtySold=0 (comp-only or cancelled-only) are excluded — they have no sold performance to evaluate.',
    source: { file: 'pages/reports-module/ItemSalesHybridMockup.jsx', site: 'filteredData memo · "slow" branch' },
    category: 'threshold',
    screens: ['S5'],
    approved: true, approvedDate: '2026-06-05', approvedSource: 'Owner batch approval 2026-06-05. Original: ',
  },
  {
    id: 'FE-02',
    name: 'Top Sellers definition (sold items only)',
    explains: 'REJECTED: was including comp items via || isComplimentary filter. Now: Top Sellers shows top 20 items with qtySold > 0, ranked by revenue (actual collected) descending. Comp-only and cancelled-only items excluded — they have dedicated tabs.',
    source: { file: 'pages/reports-module/ItemSalesHybridMockup.jsx', site: 'filteredData memo · "top" branch' },
    category: 'threshold',
    screens: ['S5'],
    approved: true, approvedDate: '2026-06-05', approvedSource: 'Owner batch approval 2026-06-05. Original: REJECTED 2026-06-02 — Owner verbatim: "complementary and cancelled should not be part of all item, fast selling or low selling". Comp filter removed from Top Sellers.',
  },
  {
    id: 'FE-03',
    name: 'Per-item "Comp" badge trigger',
    explains: 'A whole item-row gets the "Comp" badge if any single line of that item was complimentary in the window (qtyComplementary > 0).',
    source: { file: 'pages/reports-module/ItemSalesHybridMockup.jsx', site: 'apiRows mapper · isComplimentary' },
    category: 'derivation',
    screens: ['S5'],
    approved: true, approvedDate: '2026-06-05', approvedSource: 'Owner batch approval 2026-06-05. Original: ',
  },
  {
    id: 'FE-04',
    name: 'Per-row status derivation',
    explains: 'Row status priority: qtySold > 0 ⇒ "sold"; else qtyCancelled > 0 ⇒ "cancelled"; else "unsold". Mixed-bucket rows default to "sold".',
    source: { file: 'pages/reports-module/ItemSalesHybridMockup.jsx', site: 'apiRows mapper · status field' },
    category: 'derivation',
    screens: ['S5'],
    approved: true, approvedDate: '2026-06-05', approvedSource: 'Owner batch approval 2026-06-05. Original: ',
  },
  {
    id: 'FE-05',
    name: 'Default active tab on page load',
    explains: 'When the user lands on S5, the active tab defaults to "All Items".',
    source: { file: 'pages/reports-module/ItemSalesHybridMockup.jsx', site: 'useState("all")' },
    category: 'default',
    screens: ['S5'],
    approved: true, approvedDate: '2026-06-05', approvedSource: 'Owner batch approval 2026-06-05. Original: ',
  },
  {
    id: 'FE-06',
    name: 'Default date preset when no URL params',
    explains: 'Active preset defaults to "Today" when no ?from=&to= query params are present.',
    source: { file: 'pages/reports-module/ItemSalesHybridMockup.jsx', site: 'useState(urlFrom ? "" : "Today")' },
    category: 'default',
    screens: ['S5'],
    approved: true, approvedDate: '2026-06-05', approvedSource: 'Owner batch approval 2026-06-05. Original: ',
  },
  // ── In `api/services/insightsService.js`
  {
    id: 'FE-07',
    name: 'Tax aggregation formula',
    explains: 'Per-line tax = gst_tax_amount + vat_tax_amount (additive). Owner rule says only one of the two may be booked on any single line; both >0 simultaneously is a RED audit failure (see FE-15-equivalent in auditEngine).',
    source: { file: 'api/services/insightsService.js', site: 'const tax = gst + vat' },
    category: 'aggregation',
    screens: ['S5'],
    approved: true, approvedDate: '2026-06-05', approvedSource: 'Owner batch approval 2026-06-05. Original: ',
  },
  {
    id: 'FE-08',
    name: 'Cancelled-line detection',
    explains: 'A line is treated as "cancelled" iff its food_status === "3" (string compare).',
    source: { file: 'api/services/insightsService.js', site: 'isCancelled' },
    category: 'derivation',
    screens: ['S5'],
    approved: true, approvedDate: '2026-06-05', approvedSource: 'Owner batch approval 2026-06-05. Original: ',
  },
  {
    id: 'FE-09',
    name: 'Complementary-line detection',
    explains: 'A line is treated as "complementary" iff complementary === "1" OR complementary === 1.',
    source: { file: 'api/services/insightsService.js', site: 'isComplementary' },
    category: 'derivation',
    screens: ['S5'],
    approved: true, approvedDate: '2026-06-05', approvedSource: 'Owner batch approval 2026-06-05. Original: ',
  },
  {
    id: 'FE-10',
    name: 'revenueComplementary formula',
    explains: 'For comp lines, "would-have-been revenue" = menuPrice × qty. menuPrice resolved via FE-11 fallback chain.',
    source: { file: 'api/services/insightsService.js', site: 'revenueComplementary' },
    category: 'aggregation',
    screens: ['S5'],
    approved: true, approvedDate: '2026-06-05', approvedSource: 'Owner batch approval 2026-06-05. Original: ',
  },
  {
    id: 'FE-11',
    name: 'menuPrice fallback chain',
    explains: 'menuPrice = product.price → line.complementary_price → line.unit_price (first non-zero wins). Used by FE-10.',
    source: { file: 'api/services/insightsService.js', site: 'menuPrice resolution' },
    category: 'derivation',
    screens: ['S5'],
    approved: true, approvedDate: '2026-06-05', approvedSource: 'Owner batch approval 2026-06-05. Original: ',
  },
  {
    id: 'FE-12',
    name: 'Cancel-date mode line filter',
    explains: 'When the Cancelled tab attribution toggle = "cancel_at", cancelled lines whose cancel_at date falls outside the requested window are dropped from aggregation.',
    source: { file: 'api/services/insightsService.js', site: 'isCancelDateMode block' },
    category: 'filter',
    screens: ['S5'],
    approved: true, approvedDate: '2026-06-05', approvedSource: 'Owner batch approval 2026-06-05. Original: ',
  },
  {
    id: 'FE-13',
    name: 'avgSalePrice = revenue / qty (actual collected per unit)',
    explains: 'REJECTED: was unitPriceSum / lineCount (menu price average, ignores discounts and multi-qty lines). Now: revenueSold / qtySold = actual average revenue collected per unit sold. 149 items had wrong avgPrice — e.g. Zanzibar showed ₹400 (menu price) instead of ₹376 (actual collected). Per-bucket variants use same revenue/qty formula.',
    source: { file: 'api/services/insightsService.js', site: 'avgSalePrice finalisation' },
    category: 'aggregation',
    screens: ['S5'],
    approved: true, approvedDate: '2026-06-05', approvedSource: 'Owner batch approval 2026-06-05. Original: REJECTED 2026-06-02 — Owner verbatim: "avg price of item is not right how is avg price calculated revenue/item sold correct?". Changed from unitPriceSum/lineCount to revenue/qty.',
  },
  // ── Already approved (data-scope fix) — surfaces as ✅ in the audit tab, not REVIEW
  {
    id: 'FE-14',
    name: 'Per-bucket split (discount/tax/avgPrice Sold/Cancelled/Complementary)',
    explains: 'Service aggregates discount, tax, and avgSalePrice into Sold/Cancelled/Complementary buckets in parallel with the existing revenue/qty split so the UI lens can re-point all 4 numeric columns symmetrically.',
    source: { file: 'api/services/insightsService.js', site: 'getItemSalesAggregated accumulator' },
    category: 'aggregation',
    screens: ['S2', 'S5', 'S3'],
    approved: true,
    approvedDate: '2026-06-02',
    approvedSource: 'CR_011_DATA_SCOPE_FIX_IMPLEMENTATION_PLAN_2026_06_02.md §9 + Owner verbatim "go"',
  },
  {
    id: 'FE-15',
    name: 'Complimentary tab audit exemption',
    explains: 'Complimentary lines are exempt from the standard expectedTax × rate audit check. Reason: tax is computed by the backend against the billable amount (always ₹0 for comp lines), per restaurant POS convention. Frontend does not compute tax — only sums backend-stored gst_tax_amount + vat_tax_amount. Comp lines that nonetheless carry non-zero gst_tax_amount OR vat_tax_amount remain RED-flagged as backend data anomalies.',
    source: { file: 'utils/auditEngine.js', site: 'auditRows · bucket.id === "comp" branch' },
    category: 'audit-policy',
    screens: ['S5'],
    approved: true,
    approvedDate: '2026-06-02',
    approvedSource: 'Owner chat directive 2026-06-02 — Comp tab policy C-A (audit-exempt, green tint) + RED safety-net on anomaly',
  },
  {
    id: 'FE-16',
    name: 'Audit-status group ordering (+separator)',
    explains: 'Rows partitioned by audit status — flagged rows render above clean rows on All/Top/Slow tabs (flagged = AMBER/RED in Sold bucket); on Cancelled tab, rows with non-zero tax render above rows with zero tax. Within each group, the user\'s column sort applies. A separator row with item-count badge sits between groups. Comp tab unaffected (all rows EXEMPT). Audit tab unaffected (already sorted by |Δ| desc).',
    source: { file: 'pages/reports-module/ItemSalesHybridMockup.jsx', site: 'lensFilteredData partition + table separator' },
    category: 'audit-policy',
    screens: ['S5'],
    approved: true,
    approvedDate: '2026-06-02',
    approvedSource: 'Owner chat directive 2026-06-02 — verbatim "yes separator · clean = no audit flag · go"',
  },
  // ═══════════════════════════════════════════════════════════════════════════
  // FULL DISCLOSURE BATCH (FE-17..FE-47) — added 2026-06-02 per owner directive
  // "we should not have any front end rule unless verified and signed by me".
  // FE-17 is approved (owner directed: cancelled-no-tax-field → green, sort
  // bottom). FE-18..FE-47 are pending REVIEW — surface on the S5 Audit tab
  // for explicit Approve/Reject via chat-paste buttons.
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: 'FE-17',
    name: 'Cancelled tab — tax-presence audit (cancelled should have no tax)',
    explains: 'Business rule: cancelled lines should not carry tax. tax = 0 → EXEMPT (light-green tint + ✓ exempt chip, matches expectation). tax > 0 → AMBER (review — cancelled line carries tax, contradicts business rule). No FE expectedTax math; only checks whether backend booked any tax on a voided line. Safety net: GST + VAT both booked on same line still flags RED via top-level bothKey check.',
    source: { file: 'utils/auditEngine.js', site: 'auditRows · bucket.id === "cancelled" branch' },
    category: 'audit-policy',
    screens: ['S5'],
    approved: true,
    approvedDate: '2026-06-02',
    approvedSource: 'Owner chat directive 2026-06-02 — scope evolved through 3 iterations in one session: (1) narrow "no-tax-field-only EXEMPT" at 8:00 PM; (2) broadened to "full cancelled exemption same as comp" at 8:30 PM ("it should be same as complimentary now"); (3) CORRECTED at 8:50 PM after owner reviewed screenshot showing all-green and pointed out the intent: verbatim "in audit only one who no taxes should be green, because cancelled item will not have tax". Final severity confirmed AMBER (not RED) for tax > 0 ("1 amber for now"). FE-16 cancelled-tab partition re-enabled ("2 re enable"). Audit-trail kept in-place option (a) per owner ("3 a").',
  },
  // ── Tax / Audit core (P0)
  {
    id: 'FE-18',
    name: 'expectedTax formula (Exclusive vs Inclusive)',
    explains: 'For tax_calc = "Exclusive": expectedTax = revenue × rate/100. For tax_calc = "Inclusive": expectedTax = revenue − revenue / (1 + rate/100). This is the audit baseline against which every actual booked tax is compared.',
    source: { file: 'utils/auditEngine.js', site: 'auditRows · expectedTax computation' },
    category: 'aggregation',
    screens: ['S5'],
    approved: true, approvedDate: '2026-06-05', approvedSource: 'Owner batch approval 2026-06-05. Original: ',
  },
  {
    id: 'FE-19',
    name: 'RED severity — both taxes booked on one line',
    explains: 'A bucket is RED-flagged when any single line in that bucket has BOTH pure GST > 0 AND pure VAT > 0. After VAT-FIX (2026-06-06), gst = gst_tax_amount − vat_tax_amount (pure GST) and vat = vat_tax_amount (pure VAT). For VAT items (liquor), pure GST = 0 so bothTaxesOnLine is correctly false. Rule fires only on genuine misconfiguration where a single item carries both tax types.',
    source: { file: 'utils/auditEngine.js', site: 'auditRows · bothKey check' },
    category: 'threshold',
    screens: ['S5'],
    approved: true, approvedDate: '2026-06-05', approvedSource: 'Owner batch approval 2026-06-05. VAT-FIX scope clarification 2026-06-06.',
  },
  {
    id: 'FE-20',
    name: 'AMBER tolerance = ₹0 (zero)',
    explains: 'Default audit tolerance is 0 rupees — any non-zero |actualTax − expectedTax| flags AMBER. No fudge factor for rounding or small deviations.',
    source: { file: 'utils/auditEngine.js', site: 'auditRows · opts.tolerance default' },
    category: 'threshold',
    screens: ['S5'],
    approved: true, approvedDate: '2026-06-05', approvedSource: 'Owner batch approval 2026-06-05. Original: ',
  },
  {
    id: 'FE-21',
    name: 'tax_type fallback chain',
    explains: 'taxType = fd.tax_type → product.tax_type → (vat > 0 ? "VAT" : "GST"). When product config is silent, the system auto-classifies based on whether VAT was booked on the line.',
    source: { file: 'api/services/insightsService.js', site: 'taxType resolution' },
    category: 'derivation',
    screens: ['S5'],
    approved: true, approvedDate: '2026-06-05', approvedSource: 'Owner batch approval 2026-06-05. Original: ',
  },
  {
    id: 'FE-22',
    name: 'tax_calc fallback chain',
    explains: 'taxCalc = fd.tax_calc → product.tax_calc → "Exclusive" (default). When product config is silent, the system assumes Exclusive (tax-on-top), not Inclusive.',
    source: { file: 'api/services/insightsService.js', site: 'taxCalc resolution' },
    category: 'derivation',
    screens: ['S5'],
    approved: true, approvedDate: '2026-06-05', approvedSource: 'Owner batch approval 2026-06-05. Original: ',
  },
  {
    id: 'FE-23',
    name: 'tax_rate fallback chain',
    explains: 'taxRate = parseFloat(fd.tax) → parseFloat(product.tax) → 0. When no product config and no per-line rate, rate defaults to 0 — which means any booked tax > 0 will flag AMBER (expected ₹0 vs actual > ₹0).',
    source: { file: 'api/services/insightsService.js', site: 'taxRate resolution' },
    category: 'derivation',
    screens: ['S5'],
    approved: true, approvedDate: '2026-06-05', approvedSource: 'Owner batch approval 2026-06-05. Original: ',
  },
  {
    id: 'FE-24',
    name: 'Skip-empty-bucket rule',
    explains: 'When a (foodId × bucket) cell has revenue = 0 AND tax = 0, no audit flag is raised (skipped). Prevents noise on items that have no presence in a given bucket.',
    source: { file: 'utils/auditEngine.js', site: 'auditRows · revenue===0 && tax===0 skip' },
    category: 'filter',
    screens: ['S5'],
    approved: true, approvedDate: '2026-06-05', approvedSource: 'Owner batch approval 2026-06-05. Original: ',
  },
  // ── UI behaviour / thresholds (P1)
  {
    id: 'FE-25',
    name: 'MAX_RANGE_DAYS = 62',
    explains: 'User cannot query a date range longer than 62 days at a time. Apply button disables + Max 2 months warning shows when draft range exceeds.',
    source: { file: 'pages/reports-module/ItemSalesHybridMockup.jsx', site: 'MAX_RANGE_DAYS constant' },
    category: 'threshold',
    screens: ['S5'],
    approved: true, approvedDate: '2026-06-05', approvedSource: 'Owner batch approval 2026-06-05. Original: ',
  },
  {
    id: 'FE-26',
    name: 'Default column sort = Revenue ↓',
    explains: 'On page load, the table is sorted by Revenue descending. First column header click on Revenue flips to ascending.',
    source: { file: 'pages/reports-module/ItemSalesHybridMockup.jsx', site: 'sortConfig initial state' },
    category: 'default',
    screens: ['S5'],
    approved: true, approvedDate: '2026-06-05', approvedSource: 'Owner batch approval 2026-06-05. Original: ',
  },
  {
    id: 'FE-27',
    name: 'Currency values shown to 2-decimal precision (was: rounded to nearest whole rupee)',
    explains: 'REJECTED: Math.round to whole rupee was truncating paise, causing 29 false AMBER flags in audit engine (clean items flagged due to ₹0.50 rounding error). Now all currency values use round-to-2-decimals (Math.round(v*100)/100). UI and exports both show 2 decimals — parity achieved.',
    source: { file: 'pages/reports-module/ItemSalesHybridMockup.jsx', site: 'apiRows mapper · r2() helper' },
    category: 'coercion',
    screens: ['S5'],
    approved: true, approvedDate: '2026-06-05', approvedSource: 'Owner batch approval 2026-06-05. Original: REJECTED 2026-06-02 — Owner verbatim: "Reject FE-27 — remove rounding entirely, show decimal values, we have to always show actual value till 2 decimals". Investigation confirmed 29 false positive AMBERs caused by Math.round truncating paise before audit engine comparison.',
  },
  {
    id: 'FE-28',
    name: 'PDF/Excel and UI both use 2-decimal ₹',
    explains: 'reportExporter.js formats currency with 2-decimal precision (₹551.00). After FE-27 rejection, the S5 on-screen table also uses 2-decimal (₹551.00). UI↔export parity achieved.',
    source: { file: 'utils/reportExporter.js', site: 'fmtINR · minimumFractionDigits:2' },
    category: 'coercion',
    screens: ['S5'],
    approved: true, approvedDate: '2026-06-05', approvedSource: 'Owner batch approval 2026-06-05. Original: ',
  },
  {
    id: 'FE-29',
    name: 'Summary "AVG" KPI = totalRev / totalQty',
    explains: 'The "AVG" tile in the summary strip computes avgRev = totalRev / totalQty (revenue per unit qty). Not the average of per-item avgPrice. Used for the on-screen KPI only.',
    source: { file: 'pages/reports-module/ItemSalesHybridMockup.jsx', site: 'summary memo · avgRev' },
    category: 'aggregation',
    screens: ['S5'],
    approved: true, approvedDate: '2026-06-05', approvedSource: 'Owner batch approval 2026-06-05. Original: ',
  },
  {
    id: 'FE-30',
    name: 'Date preset definitions (7D · 30D · MTD · FY)',
    explains: '"7D" = today + previous 6 days (7-day inclusive window). "30D" = today + previous 29 days. "MTD" = 1st of current month → today. "FY" = disabled placeholder (greyed out, tooltip "Coming soon — max range is 2 months"). "Today" = single day.',
    source: { file: 'pages/reports-module/ItemSalesHybridMockup.jsx', site: 'handlePreset switch' },
    category: 'default',
    screens: ['S5'],
    approved: true, approvedDate: '2026-06-05', approvedSource: 'Owner batch approval 2026-06-05. Original: ',
  },
  {
    id: 'FE-31',
    name: 'Context-aware sort_by API param',
    explains: 'The backend sort_by query param is computed at fetch time: activeTab === "cancelled" → cancelPunchedToggle (cancel_at | created_at); every other tab → paidPunchedToggle (collect_bill | created_at). Switching tabs therefore triggers a new fetch with a different attribution.',
    source: { file: 'pages/reports-module/ItemSalesHybridMockup.jsx', site: 'effectiveSortBy ternary' },
    category: 'derivation',
    screens: ['S5'],
    approved: true, approvedDate: '2026-06-05', approvedSource: 'Owner batch approval 2026-06-05. Original: ',
  },
  // ── Drill-down & service-side aggregation (P2)
  {
    id: 'FE-32',
    name: 'Drill panel keeps max 20 most-recent order lines',
    explains: 'The S3 side-sheet drill panel shows at most 20 order lines per item, sorted by order date descending. Older lines are dropped from display (totals are still aggregated from all lines).',
    source: { file: 'api/services/insightsService.js', site: 'orderLines.slice(0,20)' },
    category: 'threshold',
    screens: ['S5'],
    approved: true, approvedDate: '2026-06-05', approvedSource: 'Owner batch approval 2026-06-05. Original: ',
  },
  {
    id: 'FE-33',
    name: 'Addon attach-rate formula',
    explains: 'For each addon shown in the drill: rate = round((addonCount / totalSoldLines) × 100). totalSoldLines is the number of "served" status lines of the parent item.',
    source: { file: 'api/services/insightsService.js', site: 'addons attach rate' },
    category: 'aggregation',
    screens: ['S5'],
    approved: true, approvedDate: '2026-06-05', approvedSource: 'Owner batch approval 2026-06-05. Original: ',
  },
  {
    id: 'FE-34',
    name: 'Addon revenue formula',
    explains: 'Addon revenue contribution = addonPrice × qty (parent item qty). Assumes each addon was sold with every unit of the parent item on that line.',
    source: { file: 'api/services/insightsService.js', site: 'addon revenue aggregation' },
    category: 'aggregation',
    screens: ['S5'],
    approved: true, approvedDate: '2026-06-05', approvedSource: 'Owner batch approval 2026-06-05. Original: ',
  },
  {
    id: 'FE-35',
    name: 'Cancel-scope derivation (item vs order)',
    explains: 'A cancellation is classified as "order" scope when the line has no reason_type AND the parent order has cancellation_reason set; otherwise it is "item" scope. Used to label drill cancel reasons.',
    source: { file: 'api/services/insightsService.js', site: 'isOrderLevelCancel' },
    category: 'derivation',
    screens: ['S5'],
    approved: true, approvedDate: '2026-06-05', approvedSource: 'Owner batch approval 2026-06-05. Original: ',
  },
  {
    id: 'FE-36',
    name: 'Drill line status priority',
    explains: 'Drill line status precedence: isCancelled ⇒ "cancelled"; else isComplementary ⇒ "comp"; else "served". Mixed-classifier lines resolve to cancelled first.',
    source: { file: 'api/services/insightsService.js', site: 'drill status assignment' },
    category: 'derivation',
    screens: ['S5'],
    approved: true, approvedDate: '2026-06-05', approvedSource: 'Owner batch approval 2026-06-05. Original: ',
  },
  {
    id: 'FE-37',
    name: 'Veg derivation (multi-form coercion)',
    explains: 'veg flag accepts veg === 1, veg === "1", or veg === true. All three coerce to true; everything else (0, "0", false, null, undefined) coerces to false.',
    source: { file: 'api/services/insightsService.js', site: 'itemMap veg field' },
    category: 'coercion',
    screens: ['S5'],
    approved: true, approvedDate: '2026-06-05', approvedSource: 'Owner batch approval 2026-06-05. Original: ',
  },
  {
    id: 'FE-38',
    name: 'Variation revenue = sum of line.price per label',
    explains: 'Per-variation revenue in the drill sums line.price for every line carrying that variation label. If one line carries two variations of the same label, the line.price is double-counted across them.',
    source: { file: 'api/services/insightsService.js', site: 'variations aggregation' },
    category: 'aggregation',
    screens: ['S5'],
    approved: true, approvedDate: '2026-06-05', approvedSource: 'Owner batch approval 2026-06-05. Original: ',
  },
  // ── Meta / minor (P3)
  {
    id: 'FE-39',
    name: 'Meta.totalRevenue = revenueSold only',
    explains: 'The service meta.totalRevenue (Net Sales) sums revenueSold per item only — excludes revenueCancelled and revenueComplementary. Consumers should treat this as "net" not "gross".',
    source: { file: 'api/services/insightsService.js', site: 'meta totals' },
    category: 'aggregation',
    screens: ['S5'],
    approved: true, approvedDate: '2026-06-05', approvedSource: 'Owner batch approval 2026-06-05. Original: ',
  },
  {
    id: 'FE-40',
    name: 'Two different "avg" formulas coexist',
    explains: 'Service exposes meta.avgPerItem = totalRevenue / rows.length (revenue per distinct item). S5 summary tile shows avgRev = totalRev / totalQty (revenue per unit qty). Both are "averages" but answer different questions; only the qty-weighted one is shown in the UI.',
    source: { file: 'api/services/insightsService.js + pages/reports-module/ItemSalesHybridMockup.jsx', site: 'meta.avgPerItem vs summary.avgRev' },
    category: 'aggregation',
    screens: ['S5'],
    approved: true, approvedDate: '2026-06-05', approvedSource: 'Owner batch approval 2026-06-05. Original: ',
  },
  {
    id: 'FE-41',
    name: 'Row severity priority (RED > AMBER > EXEMPT)',
    explains: 'When in-place row tinting must pick one severity for a row that has flags across multiple buckets, RED wins over AMBER which wins over EXEMPT.',
    source: { file: 'utils/auditEngine.js', site: 'auditSummary · rowSeverityIndex' },
    category: 'derivation',
    screens: ['S5'],
    approved: true, approvedDate: '2026-06-05', approvedSource: 'Owner batch approval 2026-06-05. Original: ',
  },
  {
    id: 'FE-42',
    name: '"Cancelled" badge bleed onto non-cancelled tabs',
    explains: 'A red "Cancelled" chip is appended after the item name on All/Top/Slow tabs whenever row.status === "cancelled" (i.e. the item has zero sold qty in the window). Signals: this item ONLY appears in the data because of cancellations.',
    source: { file: 'pages/reports-module/ItemSalesHybridMockup.jsx', site: 'table body · Cancelled chip' },
    category: 'derivation',
    screens: ['S5'],
    approved: true, approvedDate: '2026-06-05', approvedSource: 'Owner batch approval 2026-06-05. Original: ',
  },
  {
    id: 'FE-43',
    name: '"Comp" badge bleed onto non-comp tabs',
    explains: 'A purple "Comp" chip is appended after the item name on every tab when row.isComplimentary === true. Signals: at least one line of this item was complimentary in the window.',
    source: { file: 'pages/reports-module/ItemSalesHybridMockup.jsx', site: 'table body · Comp chip' },
    category: 'derivation',
    screens: ['S5'],
    approved: true, approvedDate: '2026-06-05', approvedSource: 'Owner batch approval 2026-06-05. Original: REJECTED 2026-06-02 — Owner verbatim: "1 reject cancelled shd show cancelled and complementary shd show complementary". Resolution: Comp chip is now gated by `activeTab` — hidden on Cancelled tab (cross-tab bleed owner objected to) and on Comp tab (redundant since every row there is comp by definition); still rendered on All/Top/Slow tabs where it adds informational value. Code change shipped same-day in `ItemSalesHybridMockup.jsx` table body.',
  },
  {
    id: 'FE-44',
    name: 'Audit tab badge format',
    explains: 'When activeTab !== "audit" but audit.total > 0, the Audit tab pill renders as: ShieldAlert icon + label + N · mR · kA · jR (m red, k amber, j review). When audit.total === 0, only the plain count shows. Severity colours: red bg for R, amber bg for A, blue bg for review count.',
    source: { file: 'pages/reports-module/ItemSalesHybridMockup.jsx', site: 'TABS render · isAuditTab branch' },
    category: 'default',
    screens: ['S5'],
    approved: true, approvedDate: '2026-06-05', approvedSource: 'Owner batch approval 2026-06-05. Original: ',
  },
  {
    id: 'FE-45',
    name: 'Download menu "GATED" badge wording',
    explains: 'When audit.blocksExport === true, the Excel + PDF rows in the Download menu show an amber "GATED" badge and a tooltip: "Audit blocks export: m red · k amber · j review". When the row is disabled for Phase 2B (Email/WhatsApp/SMS) the badge wording is "SOON" instead.',
    source: { file: 'pages/reports-module/ItemSalesHybridMockup.jsx', site: 'DOWNLOAD_MENU render · gated badge' },
    category: 'default',
    screens: ['S5'],
    approved: true, approvedDate: '2026-06-05', approvedSource: 'Owner batch approval 2026-06-05. Original: ',
  },
  {
    id: 'FE-47',
    name: 'Complementary detection accepts string OR number "1"',
    explains: 'Per-line isComplementary = (String(line.complementary) === "1") OR (line.complementary === 1). Accepts both string and numeric forms. Already partially disclosed in FE-09 but the multi-form coercion is broken out here for explicit acknowledgement.',
    source: { file: 'api/services/insightsService.js', site: 'isComplementary check' },
    category: 'coercion',
    screens: ['S5'],
    approved: true, approvedDate: '2026-06-05', approvedSource: 'Owner batch approval 2026-06-05. Original: ',
  },
  {
    id: 'FE-48',
    name: 'Context-aware tab column headers (7-column layout)',
    explains: 'Table columns: Qty, Item Total, Discount, Subtotal, Tax, Total Revenue, Avg Price. Headers re-label per tab: Cancelled tab → "Cancelled Qty" + "Lost Revenue". Comp tab → "Comp Qty" + "Lost Revenue". All/Top/Slow → "Qty Sold" + "Total Revenue". Amendment 2026-06-02: Comp tab changed from "Would-be Revenue" to "Lost Revenue" per owner directive.',
    source: { file: 'pages/reports-module/ItemSalesHybridMockup.jsx', site: 'table thead' },
    category: 'derivation',
    screens: ['S5'],
    approved: true,
    approvedDate: '2026-06-02',
    approvedSource: 'Owner chat directive 2026-06-02 — "in cancel tab we shd show header cancelled quantity and lost revenue" + "complementary also revenue also" + "Would-be Revenue keep this lost revenue"',
  },
];

// FE-49: All Items tab membership rule (added 2026-06-02)
AUDIT_RULES.push({
  id: 'FE-49',
  name: 'Sold tab shows items with qtySold > 0. All Items tab is separate (bucket-grouped view).',
  explains: 'Sold tab: only items with qtySold > 0. Top Sellers and Slow Movers are subsets of Sold. All Items tab is a separate bucket-grouped view (Sold→Pending→Cancelled→Comp) added in S5 Re-open 2026-06-05.',
  source: { file: 'pages/reports-module/ItemSalesHybridMockup.jsx', site: 'filteredData memo · "all" branch + tabCounts.all' },
  category: 'derivation',
  screens: ['S5'],
  approved: true,
  approvedDate: '2026-06-02',
  approvedSource: 'Owner chat directive 2026-06-02 — verbatim: "complementary and cancelled should not be part of all item, fast selling or low selling"',
});

// FE-50: All/Top/Slow tabs lens tax + avgPrice to Sold-only bucket (added 2026-06-02)
AUDIT_RULES.push({
  id: 'FE-50',
  name: 'All/Top/Slow tabs lens Tax + AvgPrice to Sold-only bucket',
  explains: 'On All Items, Top Sellers, and Slow Movers tabs, the Tax and Avg Price columns now display sold-only values (taxSold, avgPriceSold) instead of backward-compat ALL-bucket totals. Completes the per-bucket split started by FE-14.',
  source: { file: 'pages/reports-module/ItemSalesHybridMockup.jsx', site: 'lensFilteredData memo · else branch (All/Top/Slow)' },
  category: 'derivation',
  screens: ['S5'],
  approved: true,
  approvedDate: '2026-06-02',
  approvedSource: 'Owner chat directive 2026-06-02 — directed per-bucket lens fix for All/Top/Slow tabs',
});

// FE-51: Discount source = discount_on_food (added 2026-06-02)
AUDIT_RULES.push({
  id: 'FE-51',
  name: 'Discount source = discount_on_food (per-line allocated discount)',
  explains: 'Backend allocates order-level restaurant_discount proportionally across lines into discount_on_food. The legacy field discount_amount is always ₹0. FE now reads discount_on_food as the actual discount per line. Backend escalation filed: should send actual selling price instead of menu price.',
  source: { file: 'api/services/insightsService.js', site: 'line parsing · discount variable' },
  category: 'derivation',
  screens: ['S5'],
  approved: true,
  approvedDate: '2026-06-02',
  approvedSource: 'Owner chat directive 2026-06-02 — verbatim: "for now at front end we should decrease discount so show revenue coz item revenue will be after discount"',
});

// FE-52: Revenue = price − discount_on_food (added 2026-06-02)
AUDIT_RULES.push({
  id: 'FE-52',
  name: 'Revenue = price − discount_on_food (actual collected amount)',
  explains: 'Backend sends price as menu/list price. Actual collected revenue per line = price − discount_on_food. Tax is computed by backend on this discounted amount. Using raw price inflated revenue and caused audit AMBER flags because expectedTax (rate × inflated revenue) exceeded actualTax (rate × discounted amount). This fix eliminates most Sold-bucket AMBERs.',
  source: { file: 'api/services/insightsService.js', site: 'line parsing · revenue variable' },
  category: 'derivation',
  screens: ['S5'],
  approved: true,
  approvedDate: '2026-06-02',
  approvedSource: 'Owner chat directive 2026-06-02 — verbatim: "backend doesnt send actual value for which item was sold it always send item price...for now at front end we should decrease discount so show revenue"',
});

// FE-53: Item Total = unit_price × qty + addon + variation (added 2026-06-02)
AUDIT_RULES.push({
  id: 'FE-53',
  name: 'Item Total = unit_price × qty + total_add_on_price + total_variation_price',
  explains: 'Item Total represents the full line value before discount. Uses unit_price from order log API (not product API) × quantity + total_add_on_price + total_variation_price. Backend price field is inconsistent (sometimes includes addons, sometimes not), so we compute from components.',
  source: { file: 'api/services/insightsService.js', site: 'line parsing · itemTotal variable' },
  category: 'derivation',
  screens: ['S5'],
  approved: true, approvedDate: '2026-06-05', approvedSource: 'Owner batch approval 2026-06-05. Original: ',
});

// FE-54: Subtotal = Item Total − Discount + Service Charge (added 2026-06-02)
AUDIT_RULES.push({
  id: 'FE-54',
  name: 'Subtotal = Item Total − Discount + Service Charge',
  explains: 'Subtotal is the taxable base. Backend computes GST on this amount. Tips and delivery charge excluded (order-level only, not per-line).',
  source: { file: 'api/services/insightsService.js', site: 'line parsing · subtotal variable' },
  category: 'derivation',
  screens: ['S5'],
  approved: true, approvedDate: '2026-06-05', approvedSource: 'Owner batch approval 2026-06-05. Original: ',
});

// FE-55: Total Revenue = Subtotal + Tax (added 2026-06-02)
AUDIT_RULES.push({
  id: 'FE-55',
  name: 'Total Revenue = Subtotal + Tax',
  explains: 'Total Revenue is what was actually collected for this line item: subtotal (taxable base) + tax. This is the final amount. Avg Price = Total Revenue / Qty.',
  source: { file: 'api/services/insightsService.js', site: 'line parsing · totalRevenue variable' },
  category: 'derivation',
  screens: ['S5'],
  approved: true, approvedDate: '2026-06-05', approvedSource: 'Owner batch approval 2026-06-05. Original: ',
});

// FE-56: Sold Items gate = f_order_status === 6 (added 2026-06-03)
AUDIT_RULES.push({
  id: 'FE-56',
  name: 'Sold Items gate: f_order_status === 6',
  explains: 'A line counts as "sold" only if the parent order has f_order_status=6 (delivered/paid). Orders with status 2 (not served) or 5 (served not paid) are excluded from the Sold bucket and moved to Pending Billing.',
  source: { file: 'api/services/insightsService.js', site: 'line bucket classification · isSold variable' },
  category: 'derivation',
  screens: ['S5'],
  approved: true,
  approvedDate: '2026-06-03',
  approvedSource: 'Owner chat directive 2026-06-03 — verbatim: "f_order_status should be 6" + "1 4 5 6 should not have any item in common these are mutually exclusive"',
});

// FE-57: Pending Billing bucket = f_order_status !== 6 (added 2026-06-03)
AUDIT_RULES.push({
  id: 'FE-57',
  name: 'Pending Billing bucket: f_order_status !== 6',
  explains: 'Non-cancelled, non-comp lines from orders with f_order_status !== 6 go to "Pending Billing" bucket. These are orders where payment has not been collected and GST has not been billed by backend. Same audit rules apply.',
  source: { file: 'api/services/insightsService.js', site: 'line bucket classification · isPending variable' },
  category: 'derivation',
  screens: ['S5'],
  approved: true,
  approvedDate: '2026-06-03',
  approvedSource: 'Owner chat directive 2026-06-03 — verbatim: "keep same rules in pending till i manually verify audit as green"',
});


// FE-58: Drift investigation — retain per-line order details (added 2026-06-03)
AUDIT_RULES.push({
  id: 'FE-58',
  name: 'Drift investigation: retain per-line order details for drift lines',
  explains: 'During aggregation, when a line has |actual_tax - expected_tax| > tolerance (₹0.02), save the order details (orderId, date, employee, payment, table, qty, subtotal, expectedTax, actualTax, drift) into a driftLines[] array on that food_id. Same pattern as drill.orderLines for S3. No extra API call.',
  source: { file: 'api/services/insightsService.js', site: 'line parsing · driftLines collection block' },
  category: 'derivation',
  screens: ['S5'],
  approved: true,
  approvedDate: '2026-06-03',
  approvedSource: 'Owner chat directive 2026-06-03 — verbatim: "In audit tab i need order details which are responsible for drift, will detailed note this kind of investigation to run dynamically when user clicks on we need to have button to run this investigation"',
});

// FE-59: Audit tab Investigate button (added 2026-06-03)
AUDIT_RULES.push({
  id: 'FE-59',
  name: 'Audit tab Investigate button: expand drift lines on click',
  explains: 'Each AMBER row on the Audit tab shows an "Investigate" button. Clicking reveals the driftLines[] for that item in an inline expandable table showing Order#, Date, Employee, Payment, Table, Qty, Subtotal, Expected, Actual, Drift. Collapsed by default. No extra API call — data already in memory.',
  source: { file: 'pages/reports-module/ItemSalesHybridMockup.jsx', site: 'Audit tab AMBER section · Investigate expand' },
  category: 'display',
  screens: ['S5'],
  approved: true,
  approvedDate: '2026-06-03',
  approvedSource: 'Owner chat directive 2026-06-03 — same directive as FE-58',
});


// FE-60: Last Seen Ambiguity section (added 2026-06-03)
AUDIT_RULES.push({
  id: 'FE-60',
  name: 'Last Seen Ambiguity: most recent drift order per AMBER item',
  explains: 'Separate section between RED and AMBER on the Audit tab. For each AMBER item, picks the most recent drift line (latest date from driftLines[]) and shows it as a full row with the same columns plus last-seen order details (date, order ID, employee, payment, table). Helps identify when the bug started or last occurred at a glance without clicking Investigate.',
  source: { file: 'pages/reports-module/ItemSalesHybridMockup.jsx', site: 'Audit tab · Last Seen Ambiguity section' },
  category: 'display',
  screens: ['S5'],
  approved: true,
  approvedDate: '2026-06-03',
  approvedSource: 'Owner chat directive 2026-06-03 — verbatim: "date and order id in which last ambiguity was seen idea is to know when was start date any bug came, what was order id and details / it come same as separate line below business rule violation"',
});

// ═══════════════════════════════════════════════════════════════════════════
// CR-011 S6 Ledger Audit · Block A — Order-Level GST Rules (2026-06-03)
// Owner approval verbatim: "A only" — Block A (5 rules) approved as proposed.
// All five derive from S5 Hybrid item-level rules, lifted-and-shifted to the
// order header. Parent S5 rules are tracked separately; approval of these
// children does NOT auto-approve the parents (parents remain REVIEW unless
// owner approves them independently).
// ═══════════════════════════════════════════════════════════════════════════
AUDIT_RULES.push({
  id: 'FE-81',
  name: 'Order-Tax: Cancelled order carries tax',
  explains: 'Order has tab=Cancelled (paymentMethod===\'Cancel\') but gstAmount>0 OR vatAmount>0 at the order header. Derives from APPROVED FE-17 (cancelled-line tax-presence audit) at item level. Backend ESC-3 (cancelled financials not reverted) surfaces here at order rollup. Severity bumped AMBER → RED on 2026-06-03 evening per owner directive (consistency with FE-82R/86/88 which are all RED — cancellation with tax = money is wrong).',
  source: { file: 'utils/orderLedgerAuditEngine.js', site: 'auditOrder · FE-81 branch' },
  category: 'audit-policy',
  screens: ['S6'],
  severity: 'RED',
  derivesFrom: 'FE-17',
  approved: true,
  approvedDate: '2026-06-03',
  approvedSource: 'Owner chat 2026-06-03 verbatim "A only" + 2026-06-03 evening verbatim "1 red" (severity bumped from AMBER to RED).',
});

AUDIT_RULES.push({
  id: 'FE-82',
  name: 'Order-Tax: Expected GST ≠ actual gstAmount (REJECTED 2026-06-03)',
  explains: 'REJECTED 2026-06-03 evening. Owner rationale verbatim: "FE-82 that might be correct tax is on item level fso for order level we simply need to check item total subtotal gst and total". Order-level expected-tax-from-rate doesn\'t apply because tax rate is per-item — an order can mix items with different rates (e.g. food at 5% + alcohol at 18% + comp at 0%) and a single restaurant-level rate can\'t derive expected tax for a heterogeneous basket. Replaced by FE-82R (SubTotal formula) + FE-86 (tax aggregation rollup) + FE-88 (Grand Total formula).',
  source: { file: 'utils/orderLedgerAuditEngine.js', site: 'NOT INVOKED — rule rejected (no engine branch exists)' },
  category: 'audit-policy',
  screens: ['S6'],
  severity: 'REJECTED',
  derivesFrom: 'FE-18',
  approved: false,
  rejected: true,
  rejectedDate: '2026-06-03',
  replacedBy: ['FE-82R', 'FE-86', 'FE-88'],
  approvedSource: 'REJECTED 2026-06-03 — Owner chat verbatim: "FE-82 that might be correct tax is on item level fso for order level we simply need to check item total subtotal gst and total". Replaced by FE-82R + FE-86 + FE-88. Severity flipped from AMBER to REJECTED 2026-06-04 PM to align with other rejected rules (FE-02, FE-13, FE-27, FE-43) and prevent stale-doc reads (OG-DOC-03).',
});

AUDIT_RULES.push({
  id: 'FE-82R',
  name: 'Order-Math: SubTotal formula integrity',
  explains: 'Header subTotal field must equal recomputed: itemTotal − discount + deliveryCharge + serviceCharge + tipAmount. Tolerance ±₹0.02 (FE-84). Loyalty / coupon / wallet deliberately EXCLUDED from the discount term per owner directive ("ignore loyalty and coupon for now"). RED severity — header math break = money is wrong somewhere. Replaces FE-82 (rejected 2026-06-03).',
  source: { file: 'utils/orderLedgerAuditEngine.js', site: 'auditOrder · FE-82R branch' },
  category: 'audit-policy',
  screens: ['S6'],
  severity: 'RED',
  derivesFrom: null,
  approved: true,
  approvedDate: '2026-06-03',
  approvedSource: 'Owner chat 2026-06-03 evening verbatim "FE-82R Step 2 — SubTotal formula ... red".',
});

AUDIT_RULES.push({
  id: 'FE-83',
  name: 'Order-Tax: Both GST and VAT booked on same order',
  explains: 'Order header has BOTH gstAmount>0 AND vatAmount>0. An order can\'t legally carry both tax types in India — indicates tax-mode misconfiguration at restaurant profile level. RED severity (business rule violation). Derives from REVIEW FE-19 (both taxes on one line) at item level.',
  source: { file: 'utils/orderLedgerAuditEngine.js', site: 'auditOrder · FE-83 branch' },
  category: 'audit-policy',
  screens: ['S6'],
  severity: 'RED',
  derivesFrom: 'FE-19',
  approved: true,
  approvedDate: '2026-06-03',
  approvedSource: 'Owner chat 2026-06-03 — verbatim: "A only" (Block A approval).',
});

AUDIT_RULES.push({
  id: 'FE-84',
  name: 'Order-Tax: operational tolerance = ±₹0.02 (paise rounding)',
  explains: 'Engine constant TOLERANCE = 0.02 — no per-order flag. Order-level comparisons (FE-82R, FE-86, FE-88, FE-89) allow ±₹0.02 drift to absorb backend paise-level rounding noise. Drifts within this band resolve GREEN; drifts beyond flag RED or AMBER per rule. Note: S5 item-level engine (FE-20) uses tolerance = ₹0 (stricter); the S6 order-level tolerance was widened to ±₹0.02 on 2026-06-04 to eliminate false positives on aggregated order headers. Inherits FE-27 rejection ("show actual value till 2 decimals"). Per handover 2026-06-04: "DO NOT revert TOLERANCE".',
  source: { file: 'utils/orderLedgerAuditEngine.js', site: 'TOLERANCE constant' },
  category: 'policy',
  screens: ['S6'],
  severity: 'POLICY',
  derivesFrom: 'FE-20',
  approved: true,
  approvedDate: '2026-06-03',
  approvedSource: 'Owner chat 2026-06-03 — verbatim: "A only" (Block A approval). Tolerance widened from ₹0 to ±₹0.02 on 2026-06-04 (operational refinement during Gate ⑤ audit on cafe103).',
});

AUDIT_RULES.push({
  id: 'FE-85',
  name: 'Order-Tax: Skip orders with subTotal=0 AND gst=0 AND vat=0',
  explains: 'Engine guard — no per-order flag. Skip orders that have no money AND no tax (e.g. fully-comp orders, training orders, voids). Noise reduction so audit only fires on real revenue/tax activity. Derives from REVIEW FE-24 (skip-empty-bucket) at item level.',
  source: { file: 'utils/orderLedgerAuditEngine.js', site: 'isEmpty predicate' },
  category: 'policy',
  screens: ['S6'],
  severity: 'POLICY',
  derivesFrom: 'FE-24',
  approved: true,
  approvedDate: '2026-06-03',
  approvedSource: 'Owner chat 2026-06-03 — verbatim: "A only" (Block A approval).',
});

AUDIT_RULES.push({
  id: 'FE-86',
  name: 'Order-Math: Tax aggregation rollup (Σ items.tax + delivery GST = header tax)',
  explains: 'Header gstAmount (or vatAmount, whichever is non-zero — mutually exclusive per FE-83) must equal Σ items[i].tax_amount + deliveryCharge × deliveryChargeGstPct across all food_details rows. The delivery-GST component was added 2026-06-04 PM per owner directive: header total_gst_tax_amount legitimately includes delivery GST (food GST + delivery GST = header), so the expected value now bakes in both. Rows where the only drift was the delivery-GST component are now CLEAN, not RED. Tolerance ±₹0.02 (FE-84). RED severity — header/body drift beyond tolerance indicates a backend rollup bug. De-dup directive 2026-06-04 AM: when an order is already RED in FE-82R (subtotal double-count), this FE-86 flag is suppressed — root cause surfaced once in FE-82R is enough. Derives from REVIEW FE-08 (tax aggregation formula) at item level.',
  source: { file: 'utils/orderLedgerAuditEngine.js', site: 'auditOrder · FE-86 branch' },
  category: 'audit-policy',
  screens: ['S6'],
  severity: 'RED',
  derivesFrom: 'FE-08',
  approved: true,
  approvedDate: '2026-06-03',
  approvedSource: 'Owner chat 2026-06-03 evening verbatim "FE-86 Step 3 — Tax aggregation rollup ... red". Updated 2026-06-04 PM: delivery-GST component added to expected formula per owner directive (header legitimately includes food GST + delivery GST). De-dup vs FE-82R added 2026-06-04 AM per owner directive "this is already highlighted red in subtotal drift so we don\'t need these orders here".',
});

AUDIT_RULES.push({
  id: 'FE-88',
  name: 'Order-Math: Grand Total formula integrity',
  explains: 'Compares API order_amount (o.__source.amount) against expected = subTotal + gstAmount + vatAmount + roundOff. RoundOff is always >= 0 in this system (Math.ceil pattern, see CartPanel.jsx L359). Profile flag restaurant.totalRound !== false gates whether round-off is applied — when disabled, order.roundOff stays 0 and the term contributes nothing. Severity is context-dependent: (1) RED when drift exceeds tolerance and no known pattern explains it — header math break = money is wrong. (2) AMBER "Del GST -> Total" when drift exactly equals deliveryCharge x deliveryChargeGstPct (±₹0.02) — delivery GST sits inside order_amount but is not booked in any GST field; self-heals on backend backfill. (3) AMBER "ROUND_OFF" when roundOff=0 but drift <= ₹1.00 — backend round_up field missing; self-heals on backfill. Tolerance ±₹0.02 (FE-84). De-dup directive 2026-06-04 AM: when an order is already RED in FE-82R (subtotal double-count), this FE-88 flag is suppressed — expected total is built on the wrong subtotal so its drift is just the subtotal error resurfacing. Derives from REVIEW FE-55 at item level.',
  source: { file: 'utils/orderLedgerAuditEngine.js', site: 'auditOrder · FE-88 branch' },
  category: 'audit-policy',
  screens: ['S6'],
  severity: 'RED',
  derivesFrom: 'FE-55',
  approved: true,
  approvedDate: '2026-06-03',
  approvedSource: 'Owner chat 2026-06-03 evening verbatim "FE-88 all 3 will be red". Updated 2026-06-04: AMBER downgrades added for Del GST -> Total pattern and missing round-off pattern. De-dup vs FE-82R added 2026-06-04 AM per owner directive "supress".',
});

AUDIT_RULES.push({
  id: 'FE-89',
  name: 'Order-Math: Delivery charge GST not applied',
  explains: 'Restaurant profile declares deliver_charge_gst (e.g. cafe103 = 5%). For delivery orders carrying a delivery charge, backend must book delivery_charge_gst = deliveryCharge × rate%. Currently arrives as ₹0 on delivery orders → the delivery component is under-taxed. This is a POLICY/COMPLIANCE gap, NOT a formula break (FE-88 grand-total still balances because backend omits delivery GST on both sides). Severity AMBER per owner directive 2026-06-04 — once backend backfills delivery_charge_gst, expected==actual within ±₹0.02 tolerance → resolves GREEN automatically (same self-healing pattern as the FE-88 round-off AMBER rows).',
  source: { file: 'utils/orderLedgerAuditEngine.js', site: 'auditOrder · FE-89 branch' },
  category: 'audit-policy',
  screens: ['S6'],
  severity: 'AMBER',
  approved: true,
  approvedDate: '2026-06-04',
  approvedSource: 'Owner chat 2026-06-04 verbatim "1 Amber ... 2 just single line then our drift and this column should match".',
});

AUDIT_RULES.push({
  id: 'FE-61',
  name: 'GST NOT CONFIGURED exemption policy',
  explains: 'Items added on May 22 (food_ids: 176906, 177448, 181573, 181574, 181622, 182021, 187051, 189443, 190676, 190677) were created without GST configured in the catalog. Orders containing ONLY these items in drift are tagged GST_NOT_CONFIGURED and rendered green/exempt in the Audit tab. These orders have zero other drift — confirmed via investigation. The drift is a catalog setup gap, not a system bug.',
  source: { file: 'api/services/insightsService.js', site: 'FE-58 drift block · GST_NOT_CONFIGURED_IDS set' },
  category: 'audit-policy',
  screens: ['S5'],
  severity: 'EXEMPT',
  approved: true,
  approvedDate: '2026-06-04',
  approvedSource: 'Owner chat directive 2026-06-04 — "we can mark them that till 1st gst was not added make an exception under a new policy and move them from this list and mark them green in audit"',
});

export const pendingReviewRules = () => AUDIT_RULES.filter((r) => !r.approved && !(r.approvedSource && r.approvedSource.startsWith('REJECTED')));
export const approvedRules = () => AUDIT_RULES.filter((r) => r.approved);
export const rulesForScreen = (screenId) => AUDIT_RULES.filter((r) => r.screens.includes(screenId));
