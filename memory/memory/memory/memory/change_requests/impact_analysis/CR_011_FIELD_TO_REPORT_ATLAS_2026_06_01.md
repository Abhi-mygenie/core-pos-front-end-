# CR-011 — Field-to-Report Atlas (Deep Discovery, OD-1 Companion)

**CR:** CR-011 — Complete Reports Module
**Sprint:** POS 4.0
**Owner Decision being supported:** OD-1 (final report catalog) + OD-6 (information architecture / dashboard shape)
**Source endpoint:** `/api/v2/vendoremployee/report/order-logs-report` (POST)
**Date:** 2026-06-01

---

## 0. Why this doc exists

Before we lock the report catalog (OD-1) and the module's information architecture (OD-6), we need an evidence-based, **field-grounded** map of:

1. **What `order-logs-report` actually returns** — every group, every field, every nested array.
2. **Every report we can compute from those fields** — not opinions, derivations.
3. **For each report:** the persona who consumes it, the business question it answers, the cadence (daily / weekly / monthly), and the criticality.
4. **A Persona × Report matrix** — which user role lives in which set of reports.
5. **A dashboard hypothesis** — what the top-level Reports landing page should show before the user drills into any specific report, derived from the matrix above (not invented).
6. **Gaps** — fields backend doesn't yet return but a report needs (these become Bucket-C blockers).

The output here is the *raw material* the owner needs to make a defensible OD-1 + OD-6 call. No catalog is locked in this doc — that's the next step in the chat session.

---

## 1. Endpoint field inventory — `order-logs-report`

Source of truth: `reportTransform.js → orderLogsReportRow` (lines 818–1054) + `AUDIT_REPORT_CONTRACT_FREEZE_2026_05_28.md`.

The endpoint returns an array of **OrderWrapper** objects. Each wrapper has three groups.

### 1.1 Group A — `orders_table` (order-level, 42+ fields)

| Bucket | Fields available | Useful for |
|---|---|---|
| **Identity** | `id`, `restaurant_order_id`, `parent_order_id`, `order_in` (RM/SRM/null) | Order-wise reports, room-transfer trails |
| **Customer** | `user_name`, `cust_mobile`, `cust_email`, `user_id` (guest vs registered) | Customer reports, repeat-customer analysis |
| **Staff** | `waiter_name`, `waiter_id`, `employee_name`, `cashier_name`, `collect_by_name`, `cancel_by_name`, `merge_by_name` | Server/cashier sales, accountability reports |
| **Location** | `table_id`, `table_name`, `parent_order_id`(→ room) | Table-wise, area/section, room transfers |
| **Channel** | `order_type` (dinein/takeaway/delivery/home_delivery), `order_from` (pos/web), `order_in` (RM) | Channel mix, platform mix |
| **Amounts** | `order_amount`, `order_sub_total_amount`, `order_sub_total_without_tax`, `restaurant_discount_amount`, `discount_value`, `coupon_discount_amount`, `coupon_code`, `tip_amount`, `tip_tax_amount`, `round_up`, `delivery_charge`, `delivery_charge_gst` | Sales summaries, P&L pieces, discount / coupon / tip / delivery reports |
| **Taxes** | `gst_tax`, `vat_tax`, `service_tax`, `total_gst_tax_amount`, `total_vat_tax_amount`, `total_service_tax_amount` | Tax reports, GST filing |
| **Payment** | `payment_method` (cash/card/upi/TAB/transferToRoom/Merge/Cancel/paylater), `payment_status` (paid/unpaid/credit/Merge), `payment_type` (Prepaid/Postpaid), `transection_id`, `razorpay_order_id`, `snapshot_razorpay_status`, `payment_amount` | Payment-method mix, settlement, gateway recon |
| **Status / lifecycle** | `f_order_status` (1/2/3/5/6/8/9), `order_status` | Status-wise pivots |
| **Timestamps** | `created_at`, `updated_at`, `collect_bill` (= paid_at), `ready_at`, `serve_at` | Hourly sales, prep & serve, lifecycle |
| **Notes** | `order_note`, `cancellation_reason` | Cancel report reasons |
| **Aggregator (when applicable)** | `urban_order_id`, `store_id`, `order_plateform` [sic — Zomato/Swiggy] | Aggregator-only reports |

### 1.2 Group B — `order_details_table[]` (item-level, 47 fields per item)

| Bucket | Fields available | Useful for |
|---|---|---|
| **Item identity** | `food_id`, `food_details.name`, `item_type`, `station` | Item-wise reports, station reports |
| **Qty / pricing** | `quantity`, `unit_price`, `price`, `gst_tax_amount`, `vat_tax_amount`, `discount_amount`, `service_charge` | Item revenue, station revenue, item-level discount |
| **Customisation** | `variation` (parsed JSON: group/label/optionPrice), `add_ons` (parsed JSON: name/price), `food_level_notes` | Variation report, Addon/Modifier report |
| **Diet flags** | `food_details.veg`, `food_details.egg` | Veg vs non-veg mix |
| **Tax meta** | `food_details.tax` (rate %), `food_details.tax_type`, `food_details.tax_calc` (Inclusive/Exclusive) | Tax category reports |
| **Status / timestamps** | `food_status` (1=Preparing, 2=Ready, 3=Cancelled, 5=Served, 6=Paid), `ready_at`, `serve_at`, `cancel_at`, `cancel_type` (Pre-Serve / Post-Serve / Order / full), `cancel_reason_text`, `cancel_by_name`, `ready_by`, `serve_by` | Prep & Serve, item cancel report, station latency |
| **Complementary flag** | `complementary` | Complementary items report |
| **Image** | `food_details.image` | Visual reports |

### 1.3 Group C — `operations[]` (event-level log)

Each operation is a structured event with `operation` (string), `created_at`, `food_id` (optional), actor fields, etc. The transform classifies:

| Detected event | Source string substring | Used today for |
|---|---|---|
| `bill_payment` / `payment` | timeline.paid | Audit Report timeline |
| `cancel` | timeline.cancelled | — |
| `confirm` / `accept` | timeline.confirmed | — |
| (others) — every operation also carries `created_at` | — | **Order Activity Log report (per-event row view)** |

**This array is the under-utilised gem.** It enables a true event-level audit trail (Order Activity Log A9) and behavioural metrics (re-prints, status flips, multi-cashier handoffs).

### 1.4 Group D — Wrapper-level extras

| Field | Useful for |
|---|---|
| `room_info` (room_no, etc. — when order_in=RM) | Room reports |
| `order_details_table[0].cancel_type` | Pre-Serve vs Post-Serve cancel classification |

---

## 2. Personas (who consumes which reports)

These are the operating roles in a typical MyGenie venue. Final role names + permission keys are owner's call in OD-3 — these are the *functional* personas.

| Persona | Primary concern | Decision they make |
|---|---|---|
| **P1 — Owner / Director** | Top-line revenue, channel mix, profitability hints, anomalies | Strategy, pricing, channel investment, staffing budget |
| **P2 — Manager / Floor Manager** | Day-to-day operations, staff performance, table utilisation, cancellations | Shift planning, server allocation, kitchen issues |
| **P3 — Accountant / Finance** | Settlement, tax filing, reconciliation with bank/aggregator, audit trail | Daily close-out, GST filing, ledger entries |
| **P4 — Cashier** | Their shift's payments, settlements, end-of-shift close-out | Tally cash drawer, settle credit |
| **P5 — Captain / Server** | Their own orders, tips, table coverage | (mostly read-only metrics, sometimes hidden from them) |
| **P6 — Chef / Kitchen Manager** | Item mix, station throughput, prep latency, wastage | Menu prep planning, station staffing, sunset items |
| **P7 — Auditor / Compliance / Outside Accountant** | Append-only event log, reason codes, who did what when | Internal audit, statutory audit, dispute resolution |
| **P8 — Marketing / CRM** | Coupon ROI, customer repeat rate, channel acquisition | Promotion design, loyalty program |

---

## 3. The Atlas — Reports derivable from `order-logs-report`

Each entry: **what it computes**, **fields used** (validated against §1), **persona(s)**, **cadence**, **criticality**, **gaps**.

### Section S — Sales (revenue lens)

#### S-1. Daily Sales Summary
- **Computes:** orders count + revenue (gross, discount, net), broken down by status (paid/credit/hold/cancelled/merged) and by payment method.
- **Fields:** `f_order_status`, `payment_method`, `payment_status`, `order_amount`, `restaurant_discount_amount`, `created_at` (business-day window).
- **Personas:** P1, P2, P3
- **Cadence:** Daily (end-of-day close-out)
- **Criticality:** ★★★★★ — the spine of every other report
- **Gaps:** None — overlaps with existing `/reports/summary`. Decision OD-1: keep, replace, or both?

#### S-2. Sales by Channel
- **Computes:** revenue + order count by `channel` (dine-in / takeaway / delivery / room) and by `platform` (POS / Web / Zomato / Swiggy).
- **Fields:** `order_type`, `order_from`, `order_in`, `urban_order_id`, `order_plateform`, `order_amount`.
- **Personas:** P1, P2
- **Cadence:** Daily, Weekly
- **Criticality:** ★★★★★
- **Gaps:** Channel inference is robust today (transform §1.1 has the mapping); aggregator orders need to come in via the existing aggregator endpoint OR be present in order-logs (verify in OD-4).

#### S-3. Hourly Sales Curve
- **Computes:** revenue + order count bucketed by hour of `created_at` (and optionally `collect_bill`).
- **Personas:** P1, P2, P6 (kitchen prep planning)
- **Cadence:** Daily / Weekly
- **Criticality:** ★★★★ — staffing & production planning
- **Gaps:** None.

#### S-4. Day-of-Week Sales Trend
- **Computes:** average revenue/orders per day-of-week across a date range.
- **Personas:** P1, P2
- **Cadence:** Weekly / Monthly
- **Criticality:** ★★★ — strategic, not operational
- **Gaps:** Needs multi-day query — verify backend supports a date range, not just `from_date == to_date` (verify in OD-4; current FE calls with same date both sides).

#### S-5. Channel × Status Pivot ("Report Summary" replacement)
- **Computes:** rows = channel, cols = status. Cell = (count, revenue).
- **Personas:** P2, P3
- **Cadence:** Daily
- **Criticality:** ★★★★
- **Gaps:** None.

---

### Section I — Item / Menu (what's selling)

#### I-1. Item-wise Sales Report (★ flagship)
- **Computes:** per `food_id`: qty sold, revenue, % of total, # of orders containing it, last-sold time.
- **Fields:** flatten `order_details_table[]` across all orders; keys are `food_id`/`food_details.name`/`quantity`/`price`.
- **Personas:** P1, P2, P6, P8
- **Cadence:** Daily, Weekly, Monthly
- **Criticality:** ★★★★★ — single most-requested operational report in F&B
- **Gaps:** Cancelled lines (`food_status === 3`) must be excluded from sold qty but available as a "Lost Items" slice.

#### I-2. Item Variation Report
- **Computes:** per item × variation combo (e.g., "Veg Biryani — Half / Full"): qty, revenue, mix %.
- **Fields:** `order_details_table[].variation` JSON.
- **Personas:** P6, P1
- **Cadence:** Weekly
- **Criticality:** ★★★ — menu engineering
- **Gaps:** None — JSON already parsed by transform.

#### I-3. Addon / Modifier Report
- **Computes:** per addon: attach rate (% of orders containing item X also adding addon Y), qty, revenue contribution.
- **Fields:** `order_details_table[].add_ons` JSON.
- **Personas:** P6, P1, P8
- **Cadence:** Weekly
- **Criticality:** ★★★
- **Gaps:** None.

#### I-4. Station Performance Report
- **Computes:** per `station`: qty produced, revenue, avg prep latency (ready_at − created_at), avg serve latency (serve_at − ready_at).
- **Fields:** `order_details_table[].station`, `created_at`, `ready_at`, `serve_at`.
- **Personas:** P6, P2
- **Cadence:** Daily, Weekly
- **Criticality:** ★★★★ — kitchen ops
- **Gaps:** **BE-1 P5/P6** — `ready_at`/`serve_at` missing for PACKAGED items. Documented in `OPEN_GAPS_REGISTER.md`. Affects accuracy ~ depends on PACKAGED item share.

#### I-5. Veg vs Non-Veg Mix
- **Computes:** qty + revenue split by `food_details.veg` / `egg`.
- **Personas:** P6, P1
- **Cadence:** Weekly
- **Criticality:** ★★ — diet planning, marketing
- **Gaps:** None.

#### I-6. Complementary Items Report
- **Computes:** count + value of `complementary === 1` items, by waiter / channel.
- **Personas:** P1, P3 (revenue leakage), P2
- **Cadence:** Daily
- **Criticality:** ★★★ — leakage control
- **Gaps:** None.

---

### Section P — Payments (how we got paid)

#### P-1. Payment Method Mix
- **Computes:** revenue split by `payment_method` (cash / card / upi / TAB / wallet / room / aggregator-collected).
- **Personas:** P1, P3, P4
- **Cadence:** Daily
- **Criticality:** ★★★★★ — drives daily close-out
- **Gaps:** None.

#### P-2. Cashier Settlement Report
- **Computes:** per cashier shift (`employee_name` / `collect_by_name`): orders settled count, cash collected, card collected, UPI collected, total; variance from running total of `order_amount`.
- **Personas:** P3, P4
- **Cadence:** Per-shift / Daily
- **Criticality:** ★★★★ — end-of-shift cash tally
- **Gaps:** Shift boundaries — does backend tag shifts? If not, derive by cashier × business-day. Confirm in OD-4.

#### P-3. Payment Gateway Reconciliation
- **Computes:** orders where `razorpay_order_id` is non-null, with `snapshot_razorpay_status` and `payment_amount` vs `order_amount`. Flag mismatches.
- **Personas:** P3
- **Cadence:** Daily
- **Criticality:** ★★★★ — financial integrity
- **Gaps:** None.

#### P-4. Tip Report
- **Computes:** total `tip_amount` + `tip_tax_amount` by server / channel / day.
- **Personas:** P3, P5
- **Cadence:** Daily / Per shift
- **Criticality:** ★★★ — server-pool distribution
- **Gaps:** None.

#### P-5. Round-Off Report
- **Computes:** total round-off impact (`round_up` sum). Helps validate fiscal compliance.
- **Personas:** P3
- **Cadence:** Daily
- **Criticality:** ★★ — compliance + tally
- **Gaps:** None.

---

### Section T — Tax / Compliance

#### T-1. GST / VAT Detail Report
- **Computes:** taxable value × tax rate × tax amount, by tax rate slab; broken to GST/VAT/Service.
- **Fields:** `total_gst_tax_amount`, `total_vat_tax_amount`, `total_service_tax_amount`, and item-level `food_details.tax` for slab breakdown.
- **Personas:** P3, P7
- **Cadence:** Daily, Monthly (filing)
- **Criticality:** ★★★★★ — statutory
- **Gaps:** None.

#### T-2. Tax Summary by Slab
- **Computes:** revenue + tax bucketed by GST slab (0%, 5%, 12%, 18%, 28%).
- **Fields:** item-level `food_details.tax` × `gst_tax_amount`.
- **Personas:** P3, P7
- **Cadence:** Monthly
- **Criticality:** ★★★★ — GSTR-1 prep
- **Gaps:** None — slab inferable from item-level `tax` field.

#### T-3. Inclusive vs Exclusive Tax Breakdown
- **Computes:** mix of items where `tax_calc === 'Inclusive'` vs `'Exclusive'`. Helps audit if menu is mis-priced.
- **Personas:** P3, P1
- **Cadence:** Monthly
- **Criticality:** ★★ — diagnostic
- **Gaps:** None.

---

### Section D — Discounts / Promotions

#### D-1. Discount Report
- **Computes:** orders with `restaurant_discount_amount > 0`, by reason (if backend ships reason) / by waiter who authorised / channel.
- **Personas:** P1 (leakage), P2 (control), P3
- **Cadence:** Daily
- **Criticality:** ★★★★ — margin control
- **Gaps:** Discount reason / authorised-by — verify backend ships these in `orders_table` (OD-4 lookup).

#### D-2. Coupon Usage Report
- **Computes:** orders with `coupon_code` set: code, qty redeemed, total value, average ticket size.
- **Fields:** `coupon_code`, `coupon_discount_amount`.
- **Personas:** P8, P1
- **Cadence:** Weekly, per-campaign
- **Criticality:** ★★★★ — promo ROI
- **Gaps:** None.

#### D-3. Loyalty / Wallet Report
- **Computes:** orders that consumed loyalty points / wallet (today not in order-logs scalar fields — present in `singleOrderNew`).
- **Fields:** `loyalty_points_used`, `wallet_amount` — confirm presence in order-logs (likely missing; needs drill).
- **Personas:** P8, P3
- **Cadence:** Weekly
- **Criticality:** ★★★ — CRM ROI
- **Gaps:** Likely needs backend addition to order-logs, OR a separate report leveraging `/get-single-order-new`. Flag in OD-4.

---

### Section C — Cancellations / Waste

#### C-1. Cancellation Report (order-wise)
- **Computes:** cancelled orders with `cancellation_reason`, `cancellation_type` (Pre-Serve / Post-Serve / Order / full), `cancel_by_name`, value lost.
- **Personas:** P2, P1, P3
- **Cadence:** Daily
- **Criticality:** ★★★★★ — operational pain signal
- **Gaps:** None — BE-1 P3/P4 already shipped (2026-05-01).

#### C-2. Cancellation Report (item-wise)
- **Computes:** items cancelled at line level (`food_status === 3`), with station, reason, who cancelled, time.
- **Fields:** `order_details_table[].food_status`, `cancel_at`, `cancel_type`, `cancel_reason_text`, `cancel_by_name`, `station`.
- **Personas:** P6, P2
- **Cadence:** Daily
- **Criticality:** ★★★★ — kitchen quality + waste
- **Gaps:** None.

#### C-3. Re-Print / Bill Modification Audit (NEW)
- **Computes:** Mining `operations[]` for `reprint`, `edit`, `modify`, `update` events on already-served / paid orders.
- **Fields:** `operations[]`
- **Personas:** P7, P3, P1
- **Cadence:** Daily
- **Criticality:** ★★★★ — fraud / compliance
- **Gaps:** Confirm operation strings backend emits (the transform only classifies bill_payment/payment/cancel/confirm/accept today — others pass through but aren't typed). Needs an OD-4 lookup on the operation enum.

---

### Section L — Location / Room / Delivery

#### L-1. Table-wise Sales Report
- **Computes:** revenue + orders + avg ticket per `table_id` / `table_name`.
- **Personas:** P2, P1
- **Cadence:** Daily, Weekly
- **Criticality:** ★★★★ — capacity utilisation
- **Gaps:** None.

#### L-2. Room Orders Report (existing, covered)
- Already at `/reports/rooms`. OUT of scope per owner ("existing remain untouched").

#### L-3. Delivery Charge Report
- **Computes:** total `delivery_charge` + `delivery_charge_gst` by channel, by rider (rider names only on aggregator endpoint, not in order-logs — verify if order-logs carries rider info for in-house delivery).
- **Personas:** P3, P2
- **Cadence:** Daily
- **Criticality:** ★★★
- **Gaps:** Rider info for in-house delivery may need separate endpoint join. OD-4 lookup.

#### L-4. Room-Transfer Trail
- **Computes:** SRM (shifted-to-room) orders trail: which orders moved to which room, when, by whom.
- **Fields:** `order_in === 'SRM'`, `parent_order_id`, `operations[]`.
- **Personas:** P3, P2
- **Cadence:** Daily
- **Criticality:** ★★★
- **Gaps:** None.

---

### Section H — Human / Staff Performance

#### H-1. Server / Captain Sales Report
- **Computes:** per `waiter_id`: orders punched, revenue, avg ticket, items per order, tip ratio, cancellations.
- **Personas:** P2, P1, P5 (their own only)
- **Cadence:** Per shift, Daily, Monthly
- **Criticality:** ★★★★ — performance + commissions
- **Gaps:** None.

#### H-2. Cashier Activity Report
- **Computes:** per `cashier` / `collect_by_name`: bills settled, revenue, refunds (re-prints from C-3).
- **Personas:** P3, P4
- **Cadence:** Per shift
- **Criticality:** ★★★★ — same data as P-2 but staff-lens
- **Gaps:** None.

---

### Section A — Audit / Compliance (event-level)

#### A-1. Order Activity Log (per-event view)
- **Computes:** flatten `operations[]` across all orders into a chronological event stream: timestamp, order, operation, actor.
- **Personas:** P7, P3, P1
- **Cadence:** On-demand
- **Criticality:** ★★★★★ — statutory + internal audit
- **Gaps:** Operation enum is not fully documented — need OD-4 list to label events nicely. Also there's a **standalone intake `Order_Activity_Log_INTAKE_2026_05_30.md`** — decide whether to absorb into CR-011 or keep separate.

#### A-2. Order Edit Audit
- **Computes:** orders whose `operations[]` contain `edit`/`modify` post-`bill_payment`. Flags potential fraud.
- **Personas:** P7, P1
- **Cadence:** Weekly
- **Criticality:** ★★★★ — fraud detection
- **Gaps:** Confirm event strings (see C-3 / OD-4).

#### A-3. Order Note Audit
- **Computes:** orders with non-empty `order_note` — visibility for owner over server-side narratives.
- **Personas:** P1, P2
- **Cadence:** Weekly
- **Criticality:** ★★ — soft signal
- **Gaps:** None.

---

### Section X — Customer / CRM

#### X-1. Repeat Customer Report
- **Computes:** group by `user_id` (registered) / `cust_mobile` (guest with phone): visit count, total spend, avg ticket, last visit. Excludes pure walk-ins where neither is present.
- **Personas:** P8, P1
- **Cadence:** Weekly, Monthly
- **Criticality:** ★★★★ — CRM ROI
- **Gaps:** None at order-logs level. Deeper insights (RFM, churn) live with CRM module.

#### X-2. Guest vs Registered Mix
- **Computes:** orders without `user_id` vs with — share of total revenue + count.
- **Personas:** P8
- **Cadence:** Monthly
- **Criticality:** ★★★ — CRM acquisition KPI
- **Gaps:** None.

---

### Section O — Operational Latency (KOT lifecycle)

#### O-1. Prep & Serve Time Report
- **Computes:** per item & station: prep latency (created_at → ready_at), serve latency (ready_at → serve_at), total.
- **Personas:** P6, P2, P1
- **Cadence:** Daily, Weekly
- **Criticality:** ★★★★ — kitchen ops
- **Gaps:** **BE-1 P5/P6 still pending** for PACKAGED items. → Bucket-C blocked.

#### O-2. KOT-vs-Bill Variance
- **Computes:** orders where `order_details_table[]` item count or sum-of-prices ≠ `order_amount` (sanity check for downstream edits not reflected in bill).
- **Personas:** P7, P3
- **Cadence:** Daily
- **Criticality:** ★★★ — data quality probe
- **Gaps:** None.

---

## 4. Persona × Report matrix

|Persona | S-1 | S-2 | S-3 | S-4 | S-5 | I-1 | I-2 | I-3 | I-4 | I-5 | I-6 | P-1 | P-2 | P-3 | P-4 | P-5 | T-1 | T-2 | T-3 | D-1 | D-2 | D-3 | C-1 | C-2 | C-3 | L-1 | L-3 | L-4 | H-1 | H-2 | A-1 | A-2 | A-3 | X-1 | X-2 | O-1 | O-2 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
|**P1 Owner**       | ★ | ★ | ★ | ★ | ★ | ★ | ★ | ★ |   | ★ | ★ | ★ |   |   | ★ |   |   |   |   | ★ | ★ |   | ★ |   | ★ | ★ | ★ |   | ★ |   | ★ | ★ | ★ | ★ | ★ | ★ |   |
|**P2 Manager**     | ★ | ★ | ★ |   | ★ | ★ |   |   | ★ |   | ★ |   |   |   | ★ |   |   |   |   | ★ |   |   | ★ | ★ | ★ | ★ | ★ | ★ | ★ |   | ★ |   | ★ |   |   | ★ |   |
|**P3 Accountant**  | ★ | ★ |   |   | ★ |   |   |   |   |   | ★ | ★ | ★ | ★ | ★ | ★ | ★ | ★ | ★ | ★ |   | ★ | ★ |   |   |   | ★ | ★ |   | ★ | ★ |   |   |   |   |   | ★ |
|**P4 Cashier**     | ★ |   |   |   |   |   |   |   |   |   |   | ★ | ★ | ★ |   |   |   |   |   |   |   |   |   |   |   |   |   |   |   | ★ |   |   |   |   |   |   |   |
|**P5 Server**      |   |   |   |   |   |   |   |   |   |   |   |   |   |   | ★ |   |   |   |   |   |   |   |   |   |   |   |   |   | ★ |   |   |   |   |   |   |   |   |
|**P6 Chef/Kitchen**|   |   | ★ |   |   | ★ | ★ | ★ | ★ | ★ |   |   |   |   |   |   |   |   |   |   |   |   |   | ★ |   |   |   |   |   |   |   |   |   |   |   | ★ |   |
|**P7 Auditor**     |   |   |   |   |   |   |   |   |   |   | ★ |   |   |   |   |   | ★ |   |   |   |   |   | ★ |   | ★ |   |   |   |   |   | ★ | ★ | ★ |   |   |   | ★ |
|**P8 Marketing**   |   | ★ |   | ★ |   | ★ |   | ★ |   |   |   |   |   |   |   |   |   |   |   |   | ★ | ★ |   |   |   |   |   |   |   |   |   |   |   | ★ | ★ |   |   |

### 4.1 Read-outs from the matrix

- **P1 Owner** lives in: S-*, channel + item top-line, audit. **High-density landing.**
- **P3 Accountant** lives in: payments + tax + cancel + discount + room — **transactional close-out lens**.
- **P6 Chef** lives entirely in **Section I + O** — needs a dedicated **Kitchen Reports** group.
- **P7 Auditor** lives in Section A + cross-cutting reason fields — needs **Audit / Compliance** group.
- **P5 Server** and **P4 Cashier** see very few reports — these are *narrowed views* of H-1 / P-2 respectively (self-only). Could be done via permission scoping rather than separate reports.

---

## 5. Dashboard hypothesis (input for OD-6)

Based on §4, the Reports module **shouldn't be a flat list of 30+ reports**. Recommend the following IA, derived from the persona matrix, not invented:

```
/reports-module/                        ← Landing
  ├─ Dashboard (default)                ← KPI tiles per persona-relevant area
  ├─ Sales/                             ← S-1 to S-5
  ├─ Items & Menu/                      ← I-1 to I-6
  ├─ Payments & Settlement/             ← P-1 to P-5
  ├─ Tax & Compliance/                  ← T-1 to T-3
  ├─ Discounts & Promos/                ← D-1 to D-3
  ├─ Cancellations/                     ← C-1 to C-3
  ├─ Locations & Channels/              ← L-1 to L-4
  ├─ Staff Performance/                 ← H-1, H-2
  ├─ Audit Log/                         ← A-1 to A-3 (and the Order_Activity_Log intake)
  ├─ Kitchen Ops/                       ← I-4, O-1, O-2
  └─ Customers/                         ← X-1, X-2
```

### 5.1 Landing Dashboard widgets (proposal — owner refines in OD-6)

Six tiles, role-filtered. Each tile is a clickable summary that drills into the corresponding section:

| Tile | Always shows | Sub-line | Drills to |
|---|---|---|---|
| **Today's Sales** | net revenue + paid order count | vs same DoW last week (Δ%) | Sales |
| **Channel Mix** | mini bar: DI / TA / DL / RM | top channel + share | Sales → S-2 |
| **Top Items Today** | top 5 by revenue (mini list) | total items sold | Items & Menu |
| **Payment Mix** | donut: cash / card / upi / TAB | unsettled credit ₹ | Payments |
| **Cancellations** | cancelled order count + ₹ lost | top reason | Cancellations |
| **Open Audit Items** | count of re-prints, post-pay edits, large discounts | risk score (0–3 stars) | Audit Log |

Optional second row (P6 + P8 personas):

| Tile | Always shows | Drills to |
|---|---|---|
| **Kitchen Throughput** | avg prep + avg serve time today | Kitchen Ops |
| **Customer Mix** | repeat-customer % today | Customers |

### 5.2 Why a dashboard (and not just a list)

- Cuts a 30-report wall into a **5-second answer to "how was today?"** before any drill-down.
- Role-filtering is **per-tile** rather than per-report — same module visible to all roles, but each role's tiles are gated.
- Drill-down preserves filters (date range, channel, station) — every chart on the dashboard is a saved query into the section page.
- Mirrors the proven pattern from `frontend/public/__dev/` (the dev dashboard) and the existing Order Summary page — owner is already familiar with the metaphor.

---

## 6. Field gaps that block specific reports (Bucket-C candidates)

| Gap | Affects | Today's state | Source |
|---|---|---|---|
| `ready_at` / `serve_at` missing for PACKAGED items | I-4, O-1, O-2 | Inaccurate latencies for packaged share | BE-1 P5/P6, `OPEN_GAPS_REGISTER.md` |
| Discount **reason** + authorised-by | D-1 | Discounts visible, reason absent | Confirm in OD-4 |
| Operation enum coverage (re-print, modify, edit) | A-1, A-2, C-3 | Operations array present, enum not fully documented | OD-4 lookup |
| `loyalty_points_used` / `wallet_amount` in order-logs | D-3 | Available in `singleOrderNew`, not confirmed in order-logs | OD-4 lookup |
| Multi-date range support | S-4, X-1, weekly/monthly views | FE today calls with `from_date == to_date` | OD-4 — confirm backend accepts ranges |
| Rider info for **in-house** delivery | L-3 | Present only on aggregator endpoint | OD-4 — may need join with another endpoint |
| Shift boundaries | P-2, H-2 | Derived today by cashier × business-day | Acceptable, document the derivation |

None of these are blockers for the **module shell** (CR-011-A). They block specific sub-CRs and are scheduled at Gate 3.

---

## 7. Reports the module will NOT cover (out of scope of order-logs)

| Report | Reason | Recommendation |
|---|---|---|
| Expense / Purchase / Consumption / Wastage | Non-order domain (inventory + accounting) | Separate module if/when those domains are built (currently "Coming Soon" in sidebar) |
| Profit / Loss | Needs expense + COGS, depends on above | Out of CR-011 |
| Stock movement | Inventory domain | Out |
| Employee payroll / commissions calc | HR domain (H-1 is a *report*; payroll math is a *system*) | Out |

---

## 8. Decisions the owner needs to make on top of this Atlas

The Atlas is read-only data — none of it is locked. The following are the explicit questions:

1. **OD-1a — IN/OUT vote** on each of the 31 reports listed in §3. (Atlas is a menu; owner cuts the catalog.) Recommend defaulting to ★★★★+ as IN and parking lower stars to a "Phase 2" backlog.
2. **OD-1b — Replacement vs. coexistence:** for S-1 (Daily Sales Summary), L-2 (Room Orders), and Audit Report — replace existing screens, link to them from new module, or build parallel?
3. **OD-1c — Order Activity Log intake (2026-05-30)** — absorb into A-1, or keep as a standalone CR?
4. **OD-6 — Dashboard tiles:** confirm or edit the 6+2 tile proposal in §5.1.
5. **OD-3 (already pending) — Role matrix** can now be drawn directly from §4 (Persona × Report).
6. **OD-4 — Backend confirmations** needed for the gaps in §6 (discount reason, operation enum, multi-date range, loyalty in order-logs).

---

## 9. Next concrete step in the chat

Once we agree on the Atlas, the natural next move is:

- **Walk the §3 list IN/OUT together** (this is OD-1a). I'll re-flag any "★★★★ IN but blocked" items into Bucket C.
- **Lock the §5 dashboard tiles** (OD-6).
- **Derive the §4 Persona × Report cells into a permission matrix** (OD-3) — this gives us the exact permission keys we need for sidebar gating.
- Move to **Gate 3 (Plan) for CR-011-A** — module shell + landing dashboard + role gate + empty Sales section as the first sub-CR.

Everything in this Atlas is field-grounded; nothing here is invented. Once OD-1 is locked, every sub-CR maps 1:1 to a Section in §3 with the exact field list it needs.

---

*Generated 2026-06-01 — Companion to CR-011 Gate 2 (Impact Analysis). Lives at `memory/memory/change_requests/impact_analysis/` for canonical discoverability.*
