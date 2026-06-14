# Layer 9 — Open Gaps Register

**Status:** POPULATED
**Last Updated:** 2026-06-13 (CLOSURE agent gap audit backfill — POS 4.0 sprint gaps added/closed)

---

## POS 3.0 Open Gaps

### Unfrozen Business Rules (7)

**Part A — Rejected (code fix required): 0 — ✅ CLEARED 2026-05-31**
- **TIP-003**, **ROUND-001** — PROMOTED to frozen baseline (code-verified + owner-reconfirmed).

**Part B — Approved-with-amendment: 5 remaining (10 PROMOTED 2026-05-31):**
- PROMOTED: TAX-004, TAX-006, SC-005, DEL-001, DEL-002, DEL-003, TOTALS-003, POLL-002 (code-verified); SCAN-002, PAY-003 (current-state freeze).
- REMAINING: TAX-007 (live-print), SCAN-003 (owner parked), PAY-009 (timeout note-only), POLL-003 (backend confirm), ROOM-002 (owner parked — will reconfirm)

**Part C — Deferred: 1 remaining (2 PROMOTED 2026-06-01):**
- PROMOTED: TOTALS-004 (code-verified), PAY-006 (code-verified against owner payload)
- REMAINING: SC-004/PAY-005 (owner evidence needed)

**Part D — Verification gates: 4 remaining (5 PROMOTED 2026-06-01):**
- PROMOTED: DASH-004, PRINT-001, PRINT-002, TOTALS-004, PAY-006 (all code-verified)
- REMAINING: ROOM-002 (owner parked), SC-004/PAY-005 (owner evidence), PAY-007 (backend), POLL-003 (backend)

Full details: see `BASELINE_INDEX.md` and `BUSINESS_RULES_PENDING_FREEZE_ITEMS_2026_05_15.md`

---

### Backend-Blocked Bugs (6)

| Bug ID | Blocker | Backend Question ID | Action Needed |
|---|---|---|---|
| BUG-090 | Check-in API doesn't accept `customer_id` | Q-090-B-1 | Backend ships acceptance |
| BUG-091 | CRM search API returns duplicates | — | CRM team dedup |
| BUG-092 | Phone format contract undefined | Q-092-1 | Backend clarifies `+91` vs raw 10 |
| BUG-093 | `room_info.checkin_date` not in API | — | Backend adds field |
| BUG-094 | `delivery-assign-order` socket missing payload | Q-094-1 | Backend adds payload |
| BUG-101 | Print template no `delivery_charge_gst_amount` slot | Q-101-1 | Backend adds template slot |

### CRM-Blocked Bugs (3)

| Bug ID | Blocker | CRM Question IDs |
|---|---|---|
| BUG-106 | CRM Notes API endpoint unknown | CQ-CR-01/02 |
| BUG-107 | CRM Insights API endpoint unknown | CQ-CR-03/04 |
| BUG-108 | CRM Coupon/Loyalty/Wallet APIs | CQ-CR-05 through CQ-CR-13; P1 backend defect: `loyalty_idempotency_key=null` on order 869016 |

### Other POS 3.0 Gaps
- **BUG-095**: Planning complete, ready for implementation (dead code cleanup after 088+089)
- **BUG-096**: Partially implemented (v1→v2 endpoint done; socket event names unknown — BQ-CR-01/02/03)
- **BUG-097**: Main VERIFIED — 25-row smoke PASSED (owner-attested 2026-05-31). RESIDUALS → POS 4.0: CartPanel Collect Bill gate PARKED (Options A/B/C/D), Bucket 5 rider socket events backend-blocked (BQ-097-2 through BQ-097-5)
- **BUG-104**: Owner scope session needed (Credit/Tab module — OQ-CR-04/05)
- **BUG-105**: Owner scope session needed (Settlement module — OQ-CR-06/07/08)

---

## CRM 2.0 Open Gaps

| ID | Severity | Status | Description | Resolution Path |
|---|---|---|---|---|
| OG-02 | P1 | CLOSED — PASS (2026-05-31) | AC-26 / T-28 / T-29 commit-payload regression | Live capture R689: order_note + food_level_notes unchanged, no stray CR-002 fields |
| OG-06 | P1 | CLOSED — PASS (2026-05-31) | Runtime-verify zero legacy GET calls | Code audit: zero `/notes/items` `/notes/orders` wiring; intel uses POST /order-suggestions |
| OG-04 | P2 | OPEN | CRM `/order-suggestions` latency 1.7-2.7s | Defended by 3s timeout + skeleton; track until production |
| OG-08 | P2 | OPEN | No populated `customer_notes` on R689 | Owner seeds order with `order_note != ''` |
| OG-11 | P2 | KNOWN_UX_GAP | First-time badge timing | Acceptable for v1 |
| OG-09 | P3 | STRUCTURAL_PASS | `filteredCrossSell` defensive filter passthrough | Monitor |
| OG-05 | P3 | OPEN | `usual_time_of_day` no timezone logic | Future enhancement |
| OG-10 | INFO | NOTED | Phase 2 Preview Approval Gate bypassed | Document retroactive sign-off |

### Missing CRM 2.0 Docs
- `POS3_0_BUG_108_COUPON_LOYALTY_FINAL_RECONCILIATION_ORDER_869016_ADDENDUM_2026_05_26.md` — MISSING
- `POS3_0_BUG_108_BACKEND_MAPPER_AUDIT_REPORT_LIVE_UPDATE_2026_05_26.md` — MISSING
- `POS3_0_BUG_108_COUPON_V2_V3_QA_REPORT_LIVE_UPDATE_2026_05_26.md` — MISSING
- `CRM2_0_BUG_108_CARRYOVER_OPEN_GAPS_*.md` — NOT_CREATED

---

## Phase 3 Gaps

| CR | Gap | Owner Action |
|---|---|---|
| UX-LOADING-02 | Needs owner decision on approach | Pick Concern A (A1/A2/A3) + Concern B (B1/B2/B3) |

---

## Backend Action Items (cross-cutting)

| Item | Owner | Status | Source |
|---|---|---|---|
| `loyalty_idempotency_key=null` on order 869016 | POS Backend (Laravel) | OPEN | BUG-108 |
| Bill-print template `coupon_discount` line render | Print-agent / Backend template | NOT_RUN | BUG-108 mapper I-3 |
| Misspelled `'sucess'` for PayLater status | Backend | Intentional — coordinated fix needed | PAY-007 |
| `restaurant_discount_amount=0` despite discount applied | Backend | OPEN | Audit Report CR |
| PACKAGED items missing `ready_at`/`serve_at` | Backend | OPEN | Audit Report CR |
| PayLater settle on wrong socket channel (`update-order` instead of `update-order-paid`) | Backend | OPEN (P1) | PROD-BUG-003 |
| BUG-097 Bucket 5: rider accept/reject socket events (BQ-097-2/3/4/5) | Backend | OPEN | BUG-097 |
| BUG-096: menu update + hold/unpaid socket event names (BQ-CR-01/02/03) | Backend | OPEN | BUG-096 |
| BE-1 P1-P6: display fields on `/order-logs-report` | Backend | NOT DELIVERED | CR-001/CR-004 |
| BE-2: Lodging payment breakdown | Backend | NOT DELIVERED | Room Orders Report |
| **Waiter cash transfer API** | **Backend** | **FLAGGED — 404** | **CR-015. Need `POST /waiter/cash-transfer` with `{from_waiter_id, to_waiter_id, amount, date}`. UI placeholder built.** |
| **CR-019: `first_login` auto-redirect** | **Backend** | **DEFERRED — BQ-019-1** | **CR-019. Owner decision 2026-06-10: No auto-redirect for now. `first_login` flag not reliable for this purpose. FE will use manual sidebar navigation only. Auto-redirect to setup wizard is a future enhancement — backend to provide a reliable signal (e.g., `setup_complete` flag) when ready.** |

---

## Baseline Gaps

| Gap | Type | Owner Action Needed |
|---|---|---|
| UI/UX Baseline | GENUINE GAP | Owner to define accepted screen flows, component patterns |
| 12 unfrozen business rules | STALLED | Each needs code fix → verification → owner re-approval (TIP-003, ROUND-001 + 10 Part B promoted 2026-05-31) |
| API contract (BE-1 P1-P6) not delivered | BACKEND-BLOCKED | Backend team must deliver |

---

## Documentation Drift (stale-doc findings per R12 — opened 2026-06-04 PM)

| ID | Severity | Status | Description | Resolution Path |
|---|---|---|---|---|
| OG-DOC-01 | P3 | OPEN | Multiple docs reference branch `2-jiune-v2` HEAD `278b256` but pod is on `4-june-v2` HEAD `a39360f`. Affected: `AGENT_HANDOVER_PROTOCOL.md` L36, `NEXT_AGENT_HANDOVER_2026_06_04_CR_011_S6_DELIVERY_GST.md` preamble + handovers dated 06-01/02/03 referencing the same branch. `CONTROL_DASHBOARD.md` updated 2026-06-04 PM — remaining docs still stale. | Owner confirmed `4-june-v2` is the new baseline carrying forward all S6 audit work (FE-89 + de-dup engine verified live in code). Update each affected doc with a footnote pointer instead of mutating historical handovers. |
| OG-DOC-02 | P3 | OPEN | `NEXT_AGENT_HANDOVER_2026_06_03_EVENING.md` + `NEXT_AGENT_HANDOVER_2026_06_04_CR_011_S6_DELIVERY_GST.md` claim `OrderLedgerDetailSheet.jsx` was shipped 2026-06-03 as a thin wrapper. File does NOT exist on disk in `4-june-v2`. S6 instead imports canonical `OrderDetailSheet` directly (`OrderLedgerMockup.jsx:21` + L988). Drill flow works correctly in DATA MODE via `row.__source`. | Either the wrapper was never created, or it was inlined. **Behaviour is correct — code uses canonical `OrderDetailSheet` directly.** Stale claim only. Add footnote to both handovers: "wrapper inlined; S6 uses `OrderDetailSheet` directly". |
| OG-DOC-03 | P3 | CLOSED 2026-06-04 PM | `auditManifest.js` FE-82 entry carried `severity: 'AMBER'` while engine had zero FE-82 branch (rejected by owner 2026-06-03, replaced by FE-82R/86/88). Stale state could mislead future agents into thinking FE-82 was active. | FIXED 2026-06-04 PM — manifest entry updated: `severity: 'REJECTED'` + `replacedBy: ['FE-82R','FE-86','FE-88']` + verbatim owner quote in `approvedSource`. No engine change. |

---

## POS 4.0 Sprint Gaps (June 12-13 Session)

### RESOLVED this sprint

| ID | Severity | Status | Description | Resolution |
|---|---|---|---|---|
| OG-FE-SETTLE-001 | P1 (money) | **RESOLVED — BUG-132** | Settlement Report "Expected" formula was subtracting pilferage (circular). Pilferage column showed ₹0 (ignoring backend value). Missing Total Funds KPI card. | BUG-132 shipped 2026-06-13: 13 formula edits in `SettlementPanel.jsx`. Expected = TotalFunds − Settled. Pilferage from backend. Total Funds KPI added. |
| OG-FE-CHECKIN-001 | P1 (money) | **RESOLVED — BUG-133** | "Check In" backend-only room marker appearing in all reports with room tariff prices (₹1,100–₹3,600). 118 items = ~₹1.5L phantom revenue on Welcome Resort alone. | BUG-133 shipped 2026-06-13: 5 filter points across 3 files. `(fd.name \|\| '').trim().toLowerCase() === 'check in'` exclusion on all 8 report surfaces. |
| OG-FE-SIDEBAR-001 | P2 | **RESOLVED — BUG-131** | Sidebar bottom section (Ringer/Refresh/User/Logout) scrolls away when nav content is long. | BUG-131 shipped 2026-06-13: `flex-shrink-0` on bottom, `min-h-0` on nav, `overflow-hidden` on aside. |

### NEW / OPEN this sprint

| ID | Severity | Status | Description | Resolution Path |
|---|---|---|---|---|
| OG-FE-CACHE-001 | P2 | **OPEN — TEMPORARY ARRANGEMENT** | CR-044/CR-045 Insights cache + field stripping are FE-side temporary measures. Backend should own: (1) `fields` query param on `order-logs-report` (strip at source), (2) server-side cache/pagination. `REACT_APP_STRIP_ORDERS` env flag controls strip (default ON). Deprecation plan in `PHASE_5_INSIGHTS_OPTIMIZATION_IMPLEMENTATION_PLAN.md`. | Backend takes over field filtering + pagination. FE strip deprecated once backend delivers. |
| OG-FE-CACHE-002 | P1 (security) | **MITIGATED** | CR-044 shared cache must clear on logout + key by restaurant ID to prevent cross-restaurant data leak. | Mitigated in code: R-8 logout clear (Sidebar logout handler), R-9 rid in cache key. Needs pre-release audit verification. |
| OG-FE-NAV-001 | P2 | **OPEN — OWNER DECISIONS PENDING** | CR-041 Navigation Consistency: 3 inconsistencies catalogued, 3 owner decisions pending (D-1: panels vs routes direction, D-2: remove Menu Mgmt dead children, D-3: remove hidden sidebar items). | Owner answers D-1/D-2/D-3, then implementation agent executes. |
| OG-FE-CHANNEL-001 | P1 | **OPEN — INVESTIGATION DEFERRED** | BUG-130: Channels enabled/disabled via Restaurant Settings API are not properly gating POS dashboard. Two-layer model (master config vs per-user localStorage). Deep investigation deferred per owner — likely backend propagation issue. | Curl-probe profile API before/after settings change. Trace: settings API → profileTransform → StatusConfigPage → DashboardPage → OrderEntry → localStorage. |
| OG-DOC-DRIFT-001 | P3 | **RESOLVED — 2026-06-13** | registry.json was missing 18 POS 4.0 items, 24 had wrong sprint_key, 10 had stale statuses. FILE_OWNERSHIP.md was 15 days stale. Smoke batch missing 10 items. | CLOSURE agent gap audit backfill 2026-06-13: registry synced (18+26+10), FILE_OWNERSHIP refreshed, smoke batch supplemented (S-10→S-19), health check script created. |

---

## Gap Resolution Rules

Per gap: track severity, owner, age (date opened), and recommended resolution path.
Gaps are closed only when code is fixed + verified OR owner explicitly accepts/defers.


---

## CR-011 S6 Gaps Identified (2026-06-04 Evening RCA Session)

### OG-BE-01 — split_order stale financial headers (BUG A)
- **Severity:** P0 (backend)
- **Opened:** 2026-06-04
- **Scope:** 19/348 split-affected orders in May (5.5%), clustered May 4-6
- **Issue:** `split_order` copies parent's `order_sub_total_amount`, `order_sub_total_without_tax`, `total_gst_tax_amount`, AND per-line `gst_tax_amount` to ALL child orders without recalculating per-child. Only `order_amount` and item assignment are correct.
- **Proof:** #010703 + #010708 (siblings) both carry parent's ₹650 subTotal and ₹32.50 GST despite having only 1 item each.
- **Resolution:** Backend must recalculate per-child financial headers after split.

### OG-BE-02 — order_edit catalog-rate recompute (BUG B)
- **Severity:** P1 (backend)
- **Opened:** 2026-06-04
- **Scope:** 5/326 edited orders in May (1.5%)
- **Issue:** `update-place-order` recomputes `order_amount` using product catalog tax rate instead of stored per-line `gst_tax_amount`. Causes: (B1) qty reduction → amount increases, (B2) ghost GST on items with line gst=₹0 but catalog tax>0, (B3) GST applied to cancelled items in total.
- **Proof:** #012099 "Top of Ice Cream" (May-22 batch, 0% rate) — stored gst=₹0, catalog=5% → ₹10.50 ghost GST.
- **Resolution:** Backend must sum stored per-line `gst_tax_amount`, not re-derive from catalog.

### OG-BE-03 — transfer_order_in GST double-count (BUG C)
- **Severity:** P2 (backend)
- **Opened:** 2026-06-04
- **Scope:** 1/24 transfers in May (rare edge case)
- **Issue:** GST double-counted on transferred items when source order was previously edited.
- **Proof:** #012130 Cappuccino ₹190 → transfer delta ₹209 instead of ₹199.50 (₹9.50 extra = GST counted twice).
- **Resolution:** Backend transfer total must not double-count GST.

### OG-FE-01 — Cancelled tab classifier misses pre-billing cancellations
- **Severity:** P1 (frontend — requires owner decision)
- **Opened:** 2026-06-04
- **Scope:** 12 orders in May
- **Issue:** TAB_FILTERS.cancelled checks `paymentMethod === 'Cancel'` only. Orders where all items were cancelled before billing have `paymentMethod = 'pending'` + `fOrderStatus = 3` → fall through all filters → "Unmatched".
- **Proposed fix:** `cancelled: (o) => o.paymentMethod === 'Cancel' || o.fOrderStatus === 3`
- **Blocker:** Owner must decide: existing Cancelled tab or new "Voided" tab?
- **Status:** RESOLVED — BUG-115 shipped (2026-06-07). Owner confirmed backend bug fixed (no more fOrderStatus=3 + pending). Lowercase 'cancelled' parity aligned with Order Ledger. 3 lines in AllOrdersReportPage.jsx.


---

### GAP: Backend Add-on Pricing Inconsistency (order_sub_total_amount)

- **ID:** BE-ADDON-001
- **Severity:** P1 (backend — affects all reports using order_sub_total_amount)
- **Opened:** 2026-06-07
- **Scope:** Older orders vs newer orders on shimla food court
- **Issue:** `order_sub_total_amount` calculation for add-ons is inconsistent between old and new orders. Old order #029483 (Chocolate scoop Qty 3 + Waffle Cone ₹15): backend stored `order_sub_total_amount = 255` (₹15 × 3 qty = ₹45 add-on). New order #029707 (same dish, same qty, same add-on): backend stored `order_sub_total_amount = 225` (₹15 flat, not multiplied by qty). The `add_ons` JSON in both cases stores `quantity: 1, price: 15` identically — but the backend's computed total differs.
- **Impact:** Any report comparing `Σ item.price` against `order_sub_total_amount` will show drift on old orders. Affects: Food Court Audit (CR-013-AUDIT), Order Ledger (S6), Item Sales (S5), Sales (S7).
- **Workaround (CR-013-AUDIT):** For Item Total metric, audit now compares station sum against `Σ item.price` (from order_details_table) instead of `order_sub_total_amount`. This eliminates false drift from the backend inconsistency.
- **Action needed:** Backend team to investigate and standardize add-on pricing logic across all orders. Cross-report audit needed once resolved.
- **Status:** FLAGGED — workaround applied to Food Court Audit only


---

### GAP: Backend Sends Cancelled Item Tax in order_details_table (TEMPORARY FE WORKAROUND)

- **ID:** BE-CANCELLED-TAX-001
- **Severity:** P1 (backend — affects all reports using per-item gst_tax_amount)
- **Opened:** 2026-06-07
- **Scope:** All orders with cancelled items across all restaurants
- **Issue:** When an item is cancelled (`food_status = 3`), the backend removes its tax from `orders_table.total_gst_tax_amount` but still sends the cancelled item in `order_details_table[]` with `gst_tax_amount` intact. Example: Order #029100 — Lacha Paratha cancelled (₹21 GST), order-level GST = ₹63.40 (excluded), but item-level GST = ₹21.00 still present. Causes `Σ item.gst_tax_amount` (₹84.40) ≠ `total_gst_tax_amount` (₹63.40).
- **Temporary FE workaround:** Food Court Audit (CR-013-AUDIT) skips `food_status === 3` items when summing per-station tax. This is a TEMPORARY fix — backend should either zero out cancelled item tax or exclude cancelled items from the response.
- **Action needed:** Backend to either (a) set `gst_tax_amount = 0` on cancelled items, or (b) exclude cancelled items from `order_details_table[]`. Cross-report audit needed once resolved.
- **Status:** FLAGGED — temporary FE workaround applied to Food Court Audit only


---

### GAP: Proportional Discount/SubTotal/Total Distribution — CLOSED (Intentional Divergence)

- **ID:** FE-PROPORTIONAL-001
- **Severity:** ~~P1~~ → **CLOSED — INTENTIONAL DESIGN**
- **Opened:** 2026-06-07
- **Audit completed:** 2026-06-07
- **Closed:** 2026-06-07 — Owner decision: both formulas frozen as-is. Different reports serve different purposes.

#### Cross-Report Audit Results

| Report | Has Gap? | Details |
|--------|----------|---------|
| **S6 Order Ledger** | No | One row per order, no station/item split — order-level pass-through is correct |
| **S5 Item Sales** | **Intentional difference** | Uses backend per-line fields — includes addons/variations in item total (full menu item cost view) |
| **S7 Sales** | No | Order-level aggregates only (daily/channel/payment/hourly), no split needed |
| **S-ROOM Room Orders** | No | Room-level entity, no station split needed |
| **CR-013 Food Court** | **Intentional difference** | Uses `item.price` base only — station revenue attribution (excludes addons/variations by design) |

#### Owner Decision: Both Formulas Frozen as Intentionally Different

The two reports serve **different purposes** and their formulas are correct for their respective contexts:

**S5 Item Sales — Full Menu Item Cost View (FROZEN):**
```
Purpose:  Show the complete cost of each menu item including customizations
itemTotal = unit_price × qty + total_add_on_price + total_variation_price   (FE-53)
discount  = discount_on_food                                                 (FE-51)
subTotal  = itemTotal − discount + service_charge                            (FE-54)
tax       = gst_tax_amount − vat_tax_amount + vat_tax_amount                (FE-07)
total     = subTotal + tax                                                   (FE-55)
```

**CR-013 Food Court — Station Revenue Attribution View (FROZEN):**
```
Purpose:  Split order revenue across kitchen stations by base item price
itemTotal = item.price (= unit_price × qty, NO addons/variations)
discount  = restaurant_discount_amount × (station_share)                     (FE proportional)
subTotal  = itemTotal − discount
tax       = Σ item.gst+vat WHERE food_status ≠ 3
total     = subTotal + tax
```

#### Why They Differ (by design)

| Metric | S5 Item Sales | CR-013 Food Court | Reason |
|--------|--------------|-------------------|--------|
| **Item Total** | Includes addons + variations | Base price only | S5 shows full item cost; CR-013 attributes revenue to the station that prepared the base dish |
| **Discount** | `discount_on_food` (backend per-line) | `orderDiscount × stationShare` (FE proportional) | S5 has per-item granularity; CR-013 distributes order-level discount proportionally across stations |
| **Sub Total** | Includes service charge | Excludes service charge | Different scope |

#### Dry-Run Validation (2026-06-07)

Cross-checked all 174 orders on June 1 (Shimla Food Court):
- **29 orders** show different numbers between S5 and CR-013 — all due to addons (18) or variations (13)
- **145 orders** (no addons/variations) show identical numbers on both reports
- This is **expected and correct** given the different formula purposes
- Validation script: `/app/scripts/compare_reports.py` + `/app/scripts/dryrun_validate.py`

#### Status: CLOSED — No Code Change Required

Both formulas frozen as intentional design choices. Future agents MUST NOT align these formulas without explicit owner approval. The divergence is documented and expected.

**Binding rule for all agents:** If a future audit flags this as a "gap," point to this entry. The formulas are different by design.

