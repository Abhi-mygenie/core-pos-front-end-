# NEXT AGENT — Complete Handover for CR-011-AUDIT-01 / S5 Item Sales Hybrid

**Created:** 2026-06-02 (final session-close)
**Session number:** This is the 4th session on CR-011 Phase 2 / S5 / Audit CR.
**Status of S5:** 🟠 Gate ⑤ (owner data-validation) — Re-validation pending
**Mission you inherit:** **Make every row on S5 GREEN via the audit CR. That is the gate condition for S5 ✅ FROZEN.**

---

## 🎯 0. THE MISSION (read first, do not skip)

**Owner verbatim directive 2026-06-02:**
> *"OBJECT TO MAKE ALL ROWS GREEN USING THIS AUDIT CR"*

**What this means concretely:**
The S5 Audit tab shows a KPI strip: `Total | RED | AMBER | EXEMPT | REVIEW`. Today the badge reads roughly `~250+ · few R · ~200 A · 41?`. The objective is to drive RED, AMBER, and REVIEW counts all to **zero**. EXEMPT count can be any number — those are owner-approved exemptions and stay green.

When RED + AMBER + REVIEW all hit zero:
1. The export gate auto-unblocks (XLSX + PDF buttons enable, GATED badges disappear).
2. All rows on every tab render with the audit-clean visual treatment.
3. Owner can verbatim "freeze it" S5 → flip `CR_011_SCREEN_FREEZE_LOG.md` to ✅ FROZEN.
4. You're cleared to start S6 Order Ledger Hybrid.

**The 3 paths to drive each severity to zero:**
| Severity | Cause | Path to zero |
|---|---|---|
| 🔴 RED | Structural anomalies (GST+VAT both booked on same line — FE-19) | Backend fix OR rule amendment (extremely rare; current data may have 0) |
| 🟠 AMBER | (a) Sold-bucket: FE-18 expectedTax mismatches (rate × revenue ≠ actual tax). (b) Cancelled-bucket: FE-17 tax-presence (tax > 0 on cancelled line). | (a) Owner picks: escalate-to-backend / widen tolerance / downgrade severity. (b) **Backend fix already escalated** (`CR_011_BACKEND_ESCALATION_CANCELLED_FINANCIALS_2026_06_02.md` P0) — when backend ships, leakage = 0, AMBER = 0 automatically. |
| 🔵 REVIEW | 41 FE business rules pending owner Approve/Reject. | Owner triages via S5 Audit tab chat-paste Approve/Reject buttons; you flip manifest entries + log decisions. |

---

## 📋 1. EXHAUSTIVE LIST OF BLOCKERS (everything between you and a frozen S5)

### 🔴 BLOCKER #1 — Backend escalation P0 (CRITICAL)
**Owner objective:** *"if order is cancelled tax, discount service charge delivery charge all has be reverted, this needs to be flagged to back end with critical priority"*

**Doc:** `/app/memory/memory/change_requests/impact_analysis/CR_011_BACKEND_ESCALATION_CANCELLED_FINANCIALS_2026_06_02.md`

**Status update (2026-06-03):** ESC-3 (Cancelled financials) remains P0. ESC-1 (May 9 incident) has been **CLOSED — NOT A BUG** (alcohol orders with tax_rate=0%, not a system failure). ESC-2 (Room GST distribution) remains P1.

**The business rule (FROZEN):**
When any line transitions to `food_status='3'` OR an order is fully cancelled, **ALL of these MUST be zeroed by backend:**
- Per line: `gst_tax_amount`, `vat_tax_amount`, `discount_amount`, `service_charge`, `tax_amount`, `item_gst`, `item_vat`
- Per order (when fully cancelled): `order_discount`, `restaurant_discount_amount`, `coupon_discount_amount`, `delivery_charge`, `delivery_charge_gst`, `service_gst_tax_amount`, `tip_amount`, `total_gst_tax_amount`, `total_vat_tax_amount`, `total_service_tax_amount`, `total_tax_amount`, `tip_tax_amount`

**Evidence (from raw `/api/v2/.../order-logs-report` payload, Palm House, 2026-04-03 to 2026-06-02):**

| `cancel_type` | Lines | With-tax | Tax leaked | Verdict |
|---|---|---|---|---|
| `Order` (whole order voided) | 46 | 5 (11%) | ₹62 | ⚠ MUST be ₹0 |
| `Pre-Serve` | 110 | 25 (23%) | ₹380 | ⚠ MUST be ₹0 |
| `Post-Serve` | 146 | 22 (15%) | ₹314 | per owner: also ₹0 |
| **TOTAL** | **302** | **52 (17%)** | **₹757** | |

Plus ₹48 of order-level discount leaked across 78 fully-cancelled orders.

**`cancel_type` field is 100% populated** — can be relied upon by backend logic. No FE fallback needed.

**Your action:**
1. **Share the escalation doc with backend team.** Do this first thing in next session.
2. **Track ETA + acknowledgement.** Add follow-up rows to `OWNER_DECISION_QUEUE.md` Category D row #0 with status.
3. **DO NOT add FE compensating logic** to mask the bug. Owner explicit on this.
4. When backend ships fix → re-pull payload → verify leakage = 0 → AMBER count on Cancelled bucket drops to 0 automatically (FE-17 already correctly detects it).

**Reference samples for backend:**
- Order #013575 — Zanzibar Burger Post-Serve cancellation, ₹20 GST leaked
- Order #012714 — Zanzibar Burger order-level cancellation (qty 2), ₹40 GST leaked, parent `cancellation_reason="Before serving"`

### 🔵 BLOCKER #2 — 41 REVIEW items pending owner triage

The disclosure batch surfaced 47 FE business rules. Owner has decided on 6 (5 approved + 1 rejected). **41 remain pending.**

**How owner triages:** Opens S5 Audit tab → REVIEW section → for each rule, types `G<n> approve` or `G<n> reject` (with optional explanation) in chat. You flip the manifest entry + add SPRINT_STATUS row + update OWNER_DECISION_QUEUE.md.

**The 41 pending entries:** G1–G13 (legacy rules from before disclosure) + G18–G45 (new disclosure batch, minus G46) + G47.

**Categories** (for batch-approve shortlist if owner asks):
- **Defaults** (5): G18 (expectedTax formula), G20 (AMBER tolerance), G25 (MAX_RANGE_DAYS), G26 (default sort), G30 (date preset definitions)
- **Coercions** (5): G7 (tax additive), G8 (food_status='3'), G9 (comp detection), G37 (veg coercion), G47 (comp multi-form)
- **Threshold/Caps** (4): G19 (RED defn), G24 (skip-empty), G32 (drill 20-line cap), G33 (addon attach rate)
- **Aggregations** (8): G10 (revenueComplementary), G11 (menuPrice fallback), G13 (avgSalePrice weighting), G29 (summary AVG), G34 (addon revenue), G38 (variation revenue), G39 (Net Sales), G40 (two-avg-formulas)
- **Derivations** (8): G21 (tax_type fallback), G22 (tax_calc fallback), G23 (tax_rate fallback), G31 (sort_by ctx), G35 (cancel scope), G36 (drill status priority), G41 (severity priority), G42 (Cancelled badge bleed)
- **Display strings/UI** (6): G27 (UI rounding), G28 (PDF/Excel decimals), G44 (Audit tab badge format), G45 (GATED wording)
- **Other** (5): G12 (cancel-date filter)

**Your action:** Wait for owner trigger. When owner pastes `G<n> approve/reject` lines:
1. Open `/app/frontend/src/utils/auditManifest.js`
2. Find the FE-<n> entry
3. Approve: flip `approved: true`, set `approvedDate: '<today>'`, set `approvedSource: 'Owner chat directive <date> — verbatim <quote>'`
4. Reject: keep `approved: false`, set `approvedSource: 'REJECTED <date> — Owner verbatim <quote>'`
5. Add a row to `OWNER_DECISION_QUEUE.md` Category G with the same date + status
6. Add 1-line entry to `SPRINT_STATUS.md` Owner Decision Log
7. If rejection requires code change, ship it same session (e.g. FE-43 rejection removed Comp chip from Cancelled+Comp tabs)

### 🟠 BLOCKER #3 — Sold-bucket AMBER (FE-18 expectedTax mismatches)
Independent of the backend escalation (which fixes Cancelled-bucket AMBER). Sold-bucket has its own AMBER count from rate × revenue ≠ actual tax mismatches.

**Owner needs to decide:**
- (a) Escalate to backend (same bucket of "backend booking inconsistency" issues)
- (b) Widen tolerance from ₹0 to ₹1 (FE-20 amendment) — accepts rounding deltas
- (c) Downgrade severity to "warning-only" (doesn't block exports)

**Your action:** Surface this to owner with sample data (top 5 Sold-bucket AMBER rows, each showing food name, revenue, expected tax, actual tax, delta). Owner picks; you implement.

### 🟢 NON-BLOCKER (informational) — EXEMPT counts grow as approvals happen
EXEMPT rows stay green and don't block exports. Comp tab is all-EXEMPT (FE-15). Cancelled tab with `tax = 0` rows are EXEMPT (FE-17 same-day correction). When backend fix ships, ALL cancelled rows become EXEMPT.

---

## 📦 2. WHAT EXISTS TODAY (state inventory)

### 2.1 Approved + Live FE Rules (5 ✅)

| Rule | Name | Owner verbatim quote |
|---|---|---|
| FE-14 | Per-bucket split (discount/tax/avgPrice Sold/Cancelled/Comp) | *"go"* 2026-06-02 |
| FE-15 | Comp audit-exempt + light-green tint + RED safety net for comp-with-tax anomaly | *"so this is correct business rule no front end used in gst calculation its should be coming from backend / complimentary rows are correct / we can make them light green and freeze this in decision"* |
| FE-16 | Audit-status group ordering (flagged top / clean bottom + separator) | *"yes separator · clean = no audit flag · go"* |
| FE-17 | Cancelled tab tax-presence audit (`tax = 0` → EXEMPT, `tax > 0` → AMBER, both-taxes → RED) **— went through 3 scope iterations same day; full trail in manifest `approvedSource`** | *"in audit only one who no taxes should be green, because cancelled item will not have tax"* + *"1 amber for now"* + *"2 re enable"* + *"3 a"* |
| FE-48 | Context-aware Cancelled + Comp column headers (Cancelled tab → "Cancelled Qty" + "Lost Revenue"; Comp tab → "Comp Qty" + "Would-be Revenue") | *"in cancel tab we shd show header cancelled quantity and lost revenue"* + *"complementary also revenue also"* |

### 2.2 Rejected FE Rules (2 ❌)

| Rule | Name | Owner verbatim quote |
|---|---|---|
| FE-27 | Math.round to whole rupee → 2-decimal precision. Investigation confirmed 29 false AMBER flags caused by paise truncation before audit engine. Replaced with `r2()` (round to 2 decimals). `formatCurrency` updated to show 2 decimals. FE-28 parity gap resolved. | *"Reject FE-27 — remove rounding entirely, show decimal values, we have to always show actual value till 2 decimals"* |
| FE-43 | Comp badge bleed onto non-comp tabs — chip now hidden on Cancelled + Comp tabs; visible only on All/Top/Slow | *"1 reject cancelled shd show cancelled and complementary shd show complementary"* |

### 2.3 Pending REVIEW (40 🔵)

FE-01..FE-13 (legacy pre-disclosure) + FE-18..FE-26 + FE-28..FE-42 + FE-44..FE-45 + FE-47 (new disclosure batch, minus FE-27, FE-43, FE-46).

Full list with explanations in `/app/frontend/src/utils/auditManifest.js`. Decision queue rows in `/app/memory/control/OWNER_DECISION_QUEUE.md` Category G §G.1–§G.3.5.

### 2.4 Backend Escalations (1 🔴 CRITICAL, 1 CLOSED)

| # | Bug/CR | Priority | Status |
|---|---|---|---|
| 0 | CANCELLED-FINANCIALS: tax/discount/SC/delivery NOT reverted on cancellation | P0 CRITICAL | Awaiting backend ack |
| 1 | `loyalty_idempotency_key=null` on order 869016 (BUG-108) | P1 | Pre-existing |
| ~~14~~ | ~~May 9 GST computation failure~~ | ~~P0~~ **CLOSED** | **NOT A BUG (2026-06-03)** — alcohol orders with tax_rate=0% misclassified |

---

## 🗂️ 3. FILES OF REFERENCE (complete list)

### 3.1 Source code — read these first

| File | Purpose | Last touched |
|---|---|---|
| `/app/frontend/src/utils/auditManifest.js` | Manifest of all 48 FE business rules. **DO NOT add an entry without §8 disclosure protocol.** | 2026-06-02 |
| `/app/frontend/src/utils/auditEngine.js` | Engine that produces RED/AMBER/EXEMPT flags per row. Cancelled-bucket branch implements FE-17. | 2026-06-02 |
| `/app/frontend/src/api/services/insightsService.js` | Service-layer aggregation (per-bucket totals, drill-down, fallbacks). Carries `hasTaxField_*` flags + `bothTaxesBooked_*` flags. | 2026-06-02 |
| `/app/frontend/src/pages/reports-module/ItemSalesHybridMockup.jsx` | S5 main component. 6 tabs (All / Top / Slow / Cancelled / Comp / Audit). Partition logic, separator rows, FE-48 headers, FE-43 chip gating. | 2026-06-02 |
| `/app/frontend/src/utils/reportExporter.js` | XLSX (SpreadsheetML) + PDF (HTML→Blob) generator. Format parity with Credit module. | 2026-06-02 (prior session) |
| `/app/frontend/src/components/reports/useReportFetch.js` | API fetch hook used by S5. | 2026-06-01 (prior) |
| `/app/frontend/src/api/constants.js` | API endpoints. `ORDER_LOGS_REPORT = '/api/v2/vendoremployee/report/order-logs-report'`. | (untouched) |
| `/app/frontend/src/api/services/authService.js` | Login endpoint. | (untouched) |

### 3.2 Control layer / governance docs

| File | Purpose | Last touched |
|---|---|---|
| `/app/memory/control/CR_011_SCREEN_FREEZE_PROTOCOL.md` | **Binding rules. Especially §8 (Frontend Business Logic Disclosure).** Read before any code change. | 2026-06-02 (prior) |
| `/app/memory/control/CR_011_SCREEN_FREEZE_LOG.md` | Per-screen freeze gate. S5 row carries history of every approval. | 2026-06-02 |
| `/app/memory/control/OWNER_DECISION_QUEUE.md` | Triage queue. Category D = backend escalations. Category G = FE business rules (47 rows, 6 decided, 41 pending). | 2026-06-02 |
| `/app/memory/control/SPRINT_STATUS.md` | Owner Decision Log (append-only, dated). | 2026-06-02 |
| `/app/memory/control/CR_REGISTRY.md` | Master CR list. CR-011-AUDIT-01 entry. | 2026-06-02 |
| `/app/memory/control/AGENT_HANDOVER_PROTOCOL.md` | How to write handovers (this file follows that template). | (binding) |
| `/app/memory/control/ACCESS_REGISTRY.md` | Test credentials for preprod (Palm House owner@palmhouse.com). | (binding) |
| **THIS FILE** | Next-agent handover. | 2026-06-02 |

### 3.3 Impact analysis docs

| File | Purpose | Last touched |
|---|---|---|
| `/app/memory/memory/change_requests/impact_analysis/CR_011_S5_SCOPE_ADDENDUM_2026_06_02.md` | S5 scope (5 tabs, Download menu, Email/WhatsApp/SMS Phase 2B) | 2026-06-02 (prior) |
| `/app/memory/memory/change_requests/impact_analysis/CR_011_DATA_SCOPE_FIX_IMPLEMENTATION_PLAN_2026_06_02.md` | Per-bucket data split fix | 2026-06-02 (prior) |
| `/app/memory/memory/change_requests/impact_analysis/CR_011_S5_AUDIT_TAB_PLAN_2026_06_02.md` | Audit CR architecture + manifest design | 2026-06-02 (prior) |
| `/app/memory/memory/change_requests/impact_analysis/CR_011_BACKEND_ESCALATION_CANCELLED_FINANCIALS_2026_06_02.md` | **P0 CRITICAL backend escalation** | 2026-06-02 (this session) |

### 3.4 Ephemeral / debug

| File | Purpose |
|---|---|
| `/tmp/orders_created.json` | Raw API payload from this session (~38 MB, 2173 orders, Palm House, 2026-04-03 to 2026-06-02). Used for Q2 evidence. Re-fetch with the bash recipe in §6 if needed. |
| `/tmp/login_resp.json` | Login response from Palm House auth |

---

## 🔧 4. CODE ARCHITECTURE (mental model)

```
RAW PAYLOAD (/api/v2/.../order-logs-report)
    ↓
useReportFetch.js (fetches, caches)
    ↓
insightsService.js getItemSalesAggregated()
    ├─ per-line: parses food_details JSON, gets tax, isCancelled, isComplimentary, hasTaxField
    ├─ per-item aggregation: sums into qtySold/Cancelled/Comp, revenueSold/Cancelled/Comp, tax/discount/avgPrice per bucket
    ├─ carries flags: bothTaxesBooked_<bucket>, hasTaxField_<bucket>
    └─ returns: rows[] + meta{} + drill detail
    ↓
ItemSalesHybridMockup.jsx
    ├─ apiRows mapper: per-tab lens (Sold/Cancelled/Comp swap) + Math.round (FE-27)
    ├─ auditSummary = auditRows(apiRows) from auditEngine.js
    │       (FE-17 Cancelled branch · FE-15 Comp branch · FE-18 Sold rate-comparison · FE-19 RED both-taxes)
    ├─ lensFilteredData (FE-16): partitions flagged/clean (Cancelled tab keys on AMBER; All/Top/Slow keys on Sold AMBER+RED)
    ├─ thead (FE-48): context-aware "Cancelled Qty" / "Lost Revenue" etc.
    └─ rendered table + Audit tab + Download menu gated by audit.blocksExport
```

**Key invariant:** The audit is **read-only** over the service output. It NEVER mutates aggregated values. Frontend's job is purely classification + display.

**Key data the engine consumes per row** (from service):
- `revenueSold`, `taxSold`, `revenueCancelled`, `taxCancelled`, `revenueComplementary`, `taxComplementary`
- `taxRate`, `taxType` (GST/VAT), `taxCalc` (Inclusive/Exclusive)
- `bothTaxesBooked_<sold|cancelled|comp>` boolean
- `hasTaxField_<sold|cancelled|comp>` boolean

---

## 📜 5. ALL OWNER VERBATIM QUOTES (chronological, this session)

For attribution by you in future logging:

1. *"Audit Tab built with grouping/separator rows (FE-16) — ✅ implemented, awaiting your sign-off we will continue working on it. In cancelled item where there is no tax field coming from the backend, we can make them light green. They are audit pass and make them in bottom of the row. don't write any decision yet summarize task before implementing"*
2. *"1 rule we are auditing is we have product api in which tax for item is coming that is what against which whole audit is designed, 2. only cancelled tab first, 3 not clear on question, 4 same visuals whoever is passing audit. may be u should quickly read what is audit cr is all about"*
3. *"there is some front end business rules also due audit go through them. we should not have any front end rule unless verified and signed by me. is this there in that audit list attached for reference confirm"*
4. *"c"* (find all undisclosed rules first)
5. *"a"* (ship full disclosure + FE-17 runtime in one go)
6. *"Owner decides on remaining AMBER tax-mismatch flags: escalate to backend / widen tolerance / downgrade severity wait for my next feedback"*
7. *"mo canclled item with non tx make with light green and freeze a business decisoon, cancel item should have no front end logic for tax calculation, before freezing and tell if there is any fromt end business rule conflicting this rule. do we do any calulation for showing tax in front end fro cancelled item"*
8. *"Option C"* (narrow scope — keep FE-18 applying to cancelled-with-tax)
9. *"same as we have in complimenatry, what net we have there"*
10. *"go with this"* (safety-net option ii)
11. *"all cancelled rows are green, what logic u put, ?? dont edit code. tell logic which rows in cancel shoudl be grren and whcih amber"*
12. *"in audit only one who no taxes should be green, because cancelled item will not have tax. what business logic decision u frooze ??"*
13. *"1 amber for now / 2 re enable / 3 a"* (FE-17 final scope decisions)
14. *"juts note questions which next answer need to answer: 1. why complimentary items are showing in cancelled tab. 2. is there any possiblity items whcih were cancelled at order level in those tax is coming, from api log. taking an example of Zanzibar Burger (V) which in top row in alst 2 months selection in calendar it shows quality sold 12 for 4800 and tax is 60 so at 5 percent its 3 items and i see 3 items were cancelled on order level. 3. in cancel tab we shd show header cancelled quantity and lost revenue. update documents and agent handover as per control layer and close the session do include agnet should answer these 3 questions as next task when next agent comes .. summarize ur task first dont execute"*
15. *"Q1 u complete investigation and share ur learning / q2 u investigate and share no other action / q3 this also u fix complementary also revenue also / then we will decide next step"*
16. *"1 reject cancelled shd show cancelled and complementary shd show complementary / 2 yes confirm the hypo thesis need to find when is tax coming when item is cancelled / 3. its fine / first finish these"*
17. *"what is cancel type order level cancel means whole order was cancelled thats why items was counted as cancelled. what logic did u put to find order level or item level cancellation"*
18. *"B"* (re-classify using only `cancel_type`, drop FE-35 fallback)
19. *"continue with ur task, dont deviate be in scope"*
20. *"this calls for new business decision if order is cancelled tax, discount service charge delivery charge all has be reverted, this needs to be flagged to back end with critical priority"*
21. *"UPDATE ALL DOCS AS PER CONTROL LAYER AND FOR NEXT AGENT IS COMPULSORY TO STRAT WHERE U LEAVING SO GIVE COMPLETE HANDOVER WITHIUT MISSING ANY DETAIL OBJECT TO AMKE ALL ROWS GREEN USING THSI AUDIT CR"*

---

## 🔬 6. REPRODUCIBLE EVIDENCE GATHERING

If you need to re-pull raw payload for further analysis:

```bash
# 1. Login
BASE="https://preprod.mygenie.online"
curl -s -X POST "$BASE/api/v1/auth/vendoremployee/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"owner@palmhouse.com","password":"Qplazm@10"}' > /tmp/login.json
TOKEN=$(python3 -c "import json;print(json.load(open('/tmp/login.json'))['token'])")

# 2. Fetch payload (last 60 days)
FROM=$(python3 -c "from datetime import date, timedelta; print((date.today()-timedelta(days=60)).strftime('%Y-%m-%d'))")
TO=$(python3 -c "from datetime import date; print(date.today().strftime('%Y-%m-%d'))")
curl -s -X POST "$BASE/api/v2/vendoremployee/report/order-logs-report" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"sort_by\":\"created_at\",\"from_date\":\"$FROM\",\"to_date\":\"$TO\"}" \
  > /tmp/orders.json

# 3. Analyze with python3
python3 <<'PY'
import json
d = json.load(open('/tmp/orders.json'))
orders = d['order']
# ... your analysis
PY
```

**Endpoints reference:**
- Login: `POST /api/v1/auth/vendoremployee/login` (email/password)
- Orders report: `POST /api/v2/vendoremployee/report/order-logs-report` (sort_by, from_date, to_date)

**Sample order references for Zanzibar Burger reproduction:**
- food_id: `107739`
- #013575 (Post-Serve, qty 1, ₹20 GST leaked)
- #012714 (Order-level, qty 2, ₹40 GST leaked, parent `cancellation_reason="Before serving"`)

---

## 🛑 7. DO-NOT-TOUCH LIST

Per Protocol §8 + this session's additions:

- `/app/memory/final/*` — frozen baseline
- `/app/frontend/public/__dev/*` — Dev Dashboard CR
- `orderTransform.js` outbound payload contracts
- `DeliveryCard.jsx` (legacy)
- Any FROZEN screen in `CR_011_SCREEN_FREEZE_LOG.md` — re-open requires owner verbatim per Protocol §7
- **`auditManifest.js`** — adding a new entry requires: (a) `// @audit:rule` annotation at source site, (b) decision-queue row in `OWNER_DECISION_QUEUE.md` Category G, (c) Sprint Status Owner Decision Log entry, (d) explicit owner directive captured verbatim in `approvedSource`. **No exceptions.**
- **No FE compensating logic** for the backend escalation. Owner explicit: don't mask the bug. (FE-49 candidate exists but is on hold.)

---

## 🚦 8. WHEN OWNER RETURNS — RECOMMENDED FIRST 3 ACTIONS

1. **Acknowledge the mission:** *"Mission: drive RED/AMBER/REVIEW to zero so S5 can freeze. Current state: 0 R · ~200 A · 41?. Plan: (1) you triage 41 REVIEW items, (2) you decide Sold AMBER (escalate/widen/downgrade), (3) backend ships Cancelled-financials fix → Cancelled AMBER → 0."*
2. **Offer batch-approve shortlist** for the 41 REVIEW items (grouped by category per §1 BLOCKER #2). E.g. *"Want to approve all 5 Defaults in one go? Type `approve G18 G20 G25 G26 G30`."*
3. **Surface top 5 Sold-bucket AMBER rows** (food name + revenue + expected tax + actual tax + delta) so owner can quickly decide escalate/widen/downgrade.

---

## 📊 9. SESSION HISTORY (this session, in order)

For context on what was iterated and why:

1. **Started:** FE-17 narrow scope (no-tax-field only) shipped + 30 FE rules disclosed (full disclosure batch FE-18..FE-47 minus FE-46)
2. **Iterated:** FE-17 broadened to "full Cancelled exemption FE-15-style" — shipped, then owner reviewed screenshot showing all-green and rejected
3. **Corrected same-day:** FE-17 final form = "tax-presence audit" (`tax = 0` → EXEMPT, `tax > 0` → AMBER, both-taxes → RED). Audit trail preserved in manifest `approvedSource`.
4. **Investigated Q1:** Comp items on Cancelled tab — finding: independent predicates, behaviour correct; visible "Comp" chip rendered by FE-43 → owner rejected FE-43, chip now hidden on Cancelled + Comp tabs
5. **Investigated Q2:** Zanzibar Burger ₹60 tax — confirmed via raw API: ₹40 from order-level cancel + ₹20 from post-serve. Broader pattern: 17% of cancellations leak tax across all 3 cancel_types.
6. **Implemented Q3:** FE-48 context-aware column headers (Cancelled tab → "Cancelled Qty" + "Lost Revenue"; Comp tab → "Comp Qty" + "Would-be Revenue")
7. **Re-classified Q2** using only `cancel_type` (no FE-35 fallback): confirmed 100% populated.
8. **Owner escalated:** "if order cancelled, all financials must be reverted — backend critical priority"
9. **Extended Q2 analysis** to all financial fields (tax + discount + service charge + delivery charge): ₹757 tax + ₹48 order-discount leaked across 78 fully-cancelled orders.
10. **Filed P0 backend escalation:** `CR_011_BACKEND_ESCALATION_CANCELLED_FINANCIALS_2026_06_02.md` with full evidence + sample orders + backend asks.
11. **Updated all control docs.** Wrote this comprehensive handover.

---

## ✅ 10. EXIT CHECKLIST (this session)

- [x] FE-17 final scope implemented + manifest synced
- [x] FE-48 column headers shipped + manifest synced
- [x] FE-43 rejected + chip gated in JSX + manifest synced
- [x] Q1 investigation finding documented (FE-43 driven)
- [x] Q2 hypothesis confirmed via raw payload + sample orders captured
- [x] Q2 extended to all-financials → P0 backend escalation doc filed
- [x] Backend escalation tracked in `OWNER_DECISION_QUEUE.md` Category D row #0
- [x] `SPRINT_STATUS.md` Owner Decision Log appended (4 rows this session: FE-17 scope correction · session-close batch · FE-43 rejection / Q1 / Q2 / Q3 / FE-48 · 🔴 P0 backend escalation)
- [x] `CR_011_SCREEN_FREEZE_LOG.md` S5 row note updated with full history + gate condition
- [x] `CR_REGISTRY.md` CR-011-AUDIT-01 row reflects current state (5 approved / 1 rejected / 41 pending + backend escalation filed)
- [x] Lint clean across all touched files
- [x] This handover doc fully exhaustive — mission stated, blockers listed, files indexed, recipes documented, quotes preserved

---

*End of handover. Next agent picks up here.*
