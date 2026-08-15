# Investigation Report — CR-011 Insights Feedback Items (F-1 → F-10)

**Role:** INVESTIGATION AGENT (read-only)
**Date:** 2026-06-17
**Steps used:** 7 / 10
**Confidence:** HIGH (live API probes + code reads on 16-june branch)
**Accounts probed:** `owner@palmhouse.com` (rid 541), `owner@cafe103.com` (rid 644)
**Evidence:** `/app/memory/evidence/INSIGHTS_2026_06_17/`

---

## TL;DR — root causes per item

| # | Item | Where it lives | Verdict |
|---|---|---|---|
| F-1 | Variation row labeled `[]` | **BACKEND data** (`insights-items` returns `variations[].label = "[]"`) | Backend hygiene OR FE remap |
| F-2 | Add Breakfast 08–11 | **FE** (HourlySalesMockup line 129) — trivial code change | FE-only |
| F-3 | "Zero revenue / 68%" | **BACKEND** — partial-payment legs not split (BE-1 already known) | Needs clarification + BE-1 |
| F-4 | Kitchen Ops logic explainer | **FE** — logic is in code (CHANNEL_CONFIG + perfBadge) | Doc-only + 1 FE fix for "0 min Handover" |
| F-5 | Remove "By Station" from Item Ledger | **FE** — UI removal | FE-only |
| F-6 | Payments page empty chart | **BACKEND missing field** — `insights-sales.daily[]` has no per-method split | Backend brief OR remove chart |
| F-7 | "Champions = 7" logic unclear | **BACKEND** computes — FE just displays. No cutoffs in FE code. | Explainer + backend exposes cutoffs |
| F-8 | Phone column always "—" | **BACKEND** — returns `phone: null` for ALL rows | Backend brief |
| F-9 | "FROM ROOM = 0" rows | **BACKEND** — returns `from_room: 0` for orders that started without a room. FE renders literally. | FE display fix |
| F-10 | Cafe103 sees Room Transfers despite `room=No` | **FE gating gap** (NOT a tenant leak) | FE-only — gate by `features.room` |

**4 issues are FE-only fixes. 5 issues need a backend brief. 1 needs owner clarification.**

---

## F-10 — 🚨 CRITICAL CLARIFICATION (resolved)

**Owner question:** *"cafe 103 doesn't have rooms — what are these reports coming in room transfer?"*

### Evidence

```
cafe103 (rid 644)  /api/v1/vendoremployee/profile
  dine_in   : Yes
  take_away : False
  delivery  : False
  room      : No        ← rooms feature is disabled
```

Yet `POST /api/v2/vendoremployee/report/insights-locations` with cafe103's token returns:

```
room_transfers : 61 entries
delivery_charges: 2 entries
by_table        : 69 rows
```

### Is it a cross-tenant leak? **NO.**

| | cafe103 | palmhouse | Overlap |
|---|---:|---:|---:|
| Total transfers in May | 61 | 126 | — |
| Order_id overlap | — | — | **0** |
| Sample order_ids | 011588, 011599, 011615, 011620, 011689 | 008036, 013313, 013378, 013739, 013884 | — |

Each restaurant gets its own data. **No data leak.** Cafe103 legitimately has historical room-transfer records in its DB even though the rooms feature is now off (likely from earlier configuration, or because the `transferToRoom` enum is also used for non-room transfers per the handover doc).

### Real issue
The **sidebar item + route for Room Transfer Trail are not gated by `features.room`**. So cafe103 sees a Room Transfer Trail menu it shouldn't see, and clicking it shows historical data that's confusing.

### Fix (FE-only, no backend)
Gate the sidebar entry + route by `features.room === true`. Same pattern we used in BUG-130 for channel visibility.

**Severity:** P1 (UX defect, not data leak). Not a release-blocker, but should ship before next preprod cut.

---

## F-1 — Variation row labeled `[]`

**Evidence:** `POST insights-items` palmhouse May returns:

```json
items[].variations[]
  { label: "single",  qty: 222, revenue: 88179 }
  { label: "multi",   qty:   2, revenue:   840 }
  { label: "[]",      qty:   2, revenue:   336 }   ← literal string "[]"
  { label: "single",  qty: 250, revenue: 41017.2 }
```

For Cappuccino specifically, the backend returns `label: "[]"`. When the FE aggregates across all items by variation label (to populate the *Variation Sales Breakdown* table), it produces a `[]` bucket with 157 items / 2,409 qty / ₹9,49,783.61.

### Root cause
**Backend hygiene.** When an item has no variations array (or carries `variations: []`), the backend should send a sentinel like `"default"`, `"-"`, or omit the row entirely. Sending the literal string `"[]"` is a serialization mistake.

### Fix paths
1. **Backend** rewrite `"[]"` → `"default"` in `insights-items` aggregation → 1-line.
2. **FE defensive remap** in `ItemSalesHybridMockup.jsx` Variations sub-tab — when aggregating, normalize label `"[]"` / `""` / `null` → "No Variation" → 2 lines.

Recommend **FE remap** (faster ship, no backend coordination). Backend cleanup can follow.

---

## F-2 — Add Breakfast 08–11 bucket

**Evidence:** `HourlySalesMockup.jsx` lines 129–130:

```js
const lunch  = hourly.filter(h => h.hour >= 11 && h.hour <= 15);   // [11, 15] — 5 hours, inclusive
const dinner = hourly.filter(h => h.hour >= 18 && h.hour <= 23);   // [18, 23] — 6 hours
```

**Note:** Current Lunch is `[11, 15]` (5 hours), Dinner is `[18, 23]` (6 hours). Lunch includes hour 11.

**Owner ask:** Add Breakfast 08–11.

**Boundary recommendation (to avoid double-counting hour 11):**
- Breakfast: `[08, 10]` — 3 hours (08, 09, 10)
- Lunch: `[11, 15]` — keep as is
- Dinner: `[18, 23]` — keep as is

Alternative if owner wants 8–11 literally INCLUDING 11:
- Breakfast: `[08, 11]`, Lunch: `[12, 15]` — both shift

### Effort
Trivial. Add 1 KPI card + 1 derived sum in HourlySalesMockup.jsx. No backend change.

### Open question still
Owner: confirm `[08, 10]` (no overlap) OR `[08, 11]` + shift Lunch to `[12, 15]`.

---

## F-3 — "Zero revenue / 68%" — still needs owner clarification

**Likely meaning** (from screenshot 3 — Channel & Payment Analysis):
- Tooltip on Partial-payment donut segment: `₹0 · 684 orders · 28.7% of total`
- That's 684 partial-payment orders contributing ₹0 revenue (because backend doesn't split partial-payment legs into cash/card/UPI → known **BE-1** gap, already in backlog)

**The "68%"** doesn't match any number on screenshots 2, 3, or 5. Possibilities:
- Owner typo for 96% (Dine-In channel donut)
- Owner typo for 28.7%
- Different screen not in screenshots

**Action needed:** owner to confirm which number / screen.

If F-3 = partial-payment legs → it's **BE-1 (already known, parked)**. FE shows "₹0 · 28.7% of total" because backend sums partial-payment orders into a `partial` bucket with revenue=0 (since the cash/card legs are reported separately elsewhere). Cannot be fully fixed FE-only.

---

## F-4 — Kitchen Ops complete logic explainer

### Stage definitions (from `CHANNEL_CONFIG` line 43–47)

| Channel | Stage 1 ("Prep") | Stage 2 (label varies) | What "Total" means |
|---|---|---|---|
| **Dine-In / POS** | `created_at` → kitchen ready | **Serve to Table** (ready → server delivered) | `created_at` → final settle |
| **Delivery** | `created_at` → kitchen ready | **Dispatch** (ready → rider pickup) | `created_at` → dispatch |
| **Takeaway** | `created_at` → kitchen ready | **Handover** (ready → customer collected) | `created_at` → handover |

### Status badge thresholds (from `perfBadge` line 116–122)

| Avg time (mins) | Badge | Color |
|---:|---|---|
| 0 or null | "No Data" | grey |
| ≤ 10 | "Excellent" | green |
| ≤ 15 | "Good" | blue |
| ≤ 20 | "Needs Attention" | amber |
| > 20 | "Critical" | red |

Badge uses **avgPrep** if available, else falls back to **avgServe**.

### Why screenshot 4 shows
- POS PREP 35 → > 20 → **Critical** 🔴 ✓
- Delivery PREP 39 → > 20 → **Critical** 🔴 ✓
- Takeaway PREP 18 → ≤ 20 → **Needs Attention** 🟠 ✓

### Why TOTAL ≠ PREP + SERVE
POS: PREP 35 + SERVE 23 = 58 but TOTAL = 40.

The three values are **three INDEPENDENT averages** over the order set:
- `avgPrep` = mean of `(ready_at − created_at)` across orders
- `avgServe` = mean of `(served_at − ready_at)` across orders
- `avgTotal` = mean of `(served_at − created_at)` across orders

Each average is computed independently. The mean of sums ≠ sum of means when each subcomponent has different missing-data patterns (e.g., not every order has both timestamps). That's why TOTAL is lower than PREP+SERVE: orders with missing `served_at` get excluded from `avgServe` and `avgTotal` differently. **This is statistically correct, not a bug — but it IS unintuitive.**

### Why Takeaway HANDOVER = 0 min (owner circled)

Backend returns `avgServe = 0` for Takeaway. Likely cause: takeaway orders don't have a separate "handover" timestamp captured. The cashier marks the order as completed in a single click, collapsing prep_done → handover → bill_settled into one event. So `served_at − ready_at ≈ 0`.

**Is it a bug?**
- **If by design:** FE should render `—` / `N/A` instead of `0 min`. (Display bug — FE one-liner.)
- **If a tracking defect:** Backend should capture `handover_at` (could be when the print/receipt happens or when the order goes to "complete"). That's a product decision.

### Recommended Action for F-4
1. **FE:** When `avgServe === 0 && avgTotal > 0`, render "—" instead of "0 min" + tooltip "No separate handover timestamp captured for this channel." → 2-line fix.
2. **DOCS:** Add the above thresholds + stage definitions to `ReportDefinitionsMockup.jsx` so Definitions panel surfaces it.
3. **PRODUCT:** Owner decides whether takeaway needs a real handover timestamp (separate CR if yes).

---

## F-5 — Remove "By Station (Sold)" from Item Ledger All Items

Pure FE removal. ~20-30 lines in `ItemSalesHybridMockup.jsx` All Items tab. No backend dependency. Confirmed S18 *By Station* sub-tab covers the same data.

**Open question:** Only the All Items tab, or also similar blocks on Sold / Cancelled / Pending tabs (if any)? Will inspect during planning.

---

## F-6 — Payments page empty

### Evidence (palmhouse, 19-05 → 17-06, the failing window)

`POST insights-sales` returns:

```
Top-level keys: ['summary', 'daily', 'channels', 'channel_mix_note', 'payments', 'hourly', 'tab_settlements']

payments[] — 6 entries (PERIOD TOTALS, not per-day):
  { method: "UPI",   orders: 462, revenue: 409730 }
  { method: "Cash",  orders: ..., revenue: ... }
  ...

daily[] — 30 entries (per-day, NO method split):
  { date: "2026-05-19", revenue: 50025, orders: 41, tax: 1307.95, discount: 1226, tab_settlement: 0 }
  { date: "2026-05-20", revenue: 19783, orders: 27, tax: 778.5, discount: 720, tab_settlement: 0 }
  ...
```

### Root cause
The **"DAILY PAYMENT TRENDS" chart** on the Payments page expects per-day Cash/Card/UPI series. Backend `daily[]` has `{date, revenue, orders, tax, discount, tab_settlement}` only — **no per-day-per-method split**.

So the chart's data binding produces empty series → chart renders blank (just x-axis showing `2026-` labels).

Period totals ARE available (`payments[]`), but they're aggregated for the whole window — not a time-series.

### Fix paths (need owner decision)
1. **Remove the chart** — show only period total breakdown by method (donut/bar). FE-only, 30-min change.
2. **Backend brief** — add per-day-per-method split to `insights-sales.daily[]`:
   ```
   daily[i] += { cash: …, card: …, upi: …, partial: …, credit: … }
   ```
   That's a backend aggregation change. ~1 day of backend work.
3. **Hybrid** — show period totals NOW (FE-only), defer the trend chart until backend lands.

Recommend **option 3** — ship clarity now, evolve later.

**Severity:** P1 (visible defect on a FROZEN screen).

---

## F-7 — Champions / RFM logic — where it actually lives

### Finding: NO RFM rules in FE codebase

`CustomersRfmMockup.jsx` reads `rawData.rfm_bands` directly (line 70):
```js
const rfmBands = rawData.rfm_bands || [];
```

Backend response for palmhouse May:
```json
"rfm_bands": [
  { "band": "Champions", "count": 43, "revenue": 812955 },
  { "band": "Loyal",     "count": 53, "revenue": 176378 },
  { "band": "At Risk",   "count": 234, "revenue": 195546 },
  { "band": "Dormant",   "count": 16, "revenue": 0 }
]
```

The 4-band classification (Champions / Loyal / At Risk / Dormant) is **computed by backend**. The exact rules (recency/frequency/monetary cutoffs) are NOT in FE source.

### Backend contract doc (line 462 of `BACKEND_API_CONTRACT_INSIGHTS_CONSOLIDATED_V2.md`)

> **Source data:** `user_id` + `cust_mobile` from order records. Guest = no `user_id` AND no `cust_mobile`. RFM = recency (days since last order), frequency (order count in range), monetary (total spend). **Scope: fs=6 orders, `collect_bill` business day.**

So the contract documents the inputs (recency, frequency, monetary from user_id + cust_mobile) but **does NOT document the band cutoffs** (when does someone become Champion vs Loyal vs At Risk vs Dormant).

### What we can tell owner today
- **Champions** = top-tier customers (high R, high F, high M — exact cutoffs computed by backend, not visible in FE or contract spec)
- For palmhouse May, 43 customers were Champions contributing ₹8.13L revenue (~70% of `top_customers` revenue)
- Cafe103 showed Champions = 7, scaled to that restaurant's smaller customer base

### Action needed
1. **Get backend to publish the exact cutoff rules** (e.g., "Champions: R-percentile ≥ 80 AND F-percentile ≥ 80 AND M-percentile ≥ 80" OR fixed thresholds like "last visit ≤ 14 days AND visits ≥ 5 AND spend ≥ ₹5,000").
2. Once known, surface them on a tooltip on each band card + add them to the Definitions panel.
3. Optionally: backend could return the actual numeric cutoff used per period as part of the response so the FE can display "Champions = R ≤ 14d, F ≥ 5, M ≥ ₹4,237 in this period."

**FE work needed:** ~0 lines. **Backend brief needed:** YES.

---

## F-8 — Phone column always "—"

### Evidence
Backend `top_customers` for palmhouse May:
```json
{
  "customer_id": "name_table 9",
  "name": "Table 9",
  "phone": null,            ← null for ALL 25 rows
  "visits": 71,
  "total_spend": 85852,
  "last_visit": "2026-05-31",
  "avg_order": 1209.18
}
```

**0 / 25 rows have a non-null phone.** Field exists in schema, never populated.

### Bigger concern surfaced
The top customer is `name: "Table 9"`. That's **not a person — it's a table name**. The backend appears to be aggregating customers by **table name** when `cust_mobile` is missing, not by a real customer identity.

So the entire "Top Customers" table is mixing:
- Real customers (whose phone _should_ be there but is null) — e.g., "Mr. Manjeet Sharma"
- Aggregation buckets that look like customers but aren't — e.g., "Table 9", "HPASCS OFFICE", "Hotel Firhill"

### Fix paths
1. **Backend brief (mandatory):** populate `phone` for rows that have a real `cust_mobile`. For pseudo-customer buckets (tables, B2B partners), explicitly send `null` or omit phone entirely.
2. **FE display improvement:** when `phone === null`, render `—` (already happens) AND add a row-type chip like `Walk-in` / `B2B` / `Room Guest` / `Customer` to disambiguate.

**Severity:** P1 — PII column always blank is an owner-confidence killer.
**FE-only effort:** ~10 lines for the row-type chip. **Backend brief:** required.

---

## F-9 — "FROM ROOM = 0" rows in Room Transfer Trail

### Evidence
Backend response for cafe103 + palmhouse both show:

```json
{ "order_id": "011588", "from_room": 0,    "to_room": 5518, ... }
{ "order_id": "011599", "from_room": 5535, "to_room": 5527, ... }
{ "order_id": "011615", "from_room": 0,    "to_room": 5519, ... }
```

`from_room` is a number — `0` means "no source room" (order originated without a room assignment, then was later assigned to room 5518). `5535 → 5527` is a true room-to-room transfer.

So `from_room: 0` IS valid backend data — semantically it means **"this is an order being assigned to a room for the first time, not a transfer between two rooms"**.

### Fix (FE-only, ~3 lines)
In `RoomTransfersMockup.jsx`, when `from_room === 0`:
- Render the cell as `—` OR a label like `(unassigned)` / `Walk-in` / `New`

**Companion finding:** `items_count: 0` on every row also looks like a backend hygiene issue. Possibly `items` aren't being counted per transfer (the count is taken at transfer time, but the relevant field is on the OrderDetails not the transfer event). Worth flagging separately as **F-9b**.

### Open question
Owner: when `from_room = 0`, render as `—` (minimal) or `Walk-in` / `Unassigned` (semantic)?

---

## Updated tracking matrix (post-investigation)

| # | Item | Backend / FE / Both | Effort | Priority | Re-opens freeze? |
|---|---|---|---|:---:|:---:|
| F-1 | Variation `[]` label | FE remap (preferred) OR Backend hygiene | 2 lines | P2 | YES |
| F-2 | Breakfast bucket | FE | 5 lines | P2 | NO |
| F-3 | Partial = ₹0 / 68% | BE-1 (already known) + clarification | — | P2 | NO |
| F-4 | Kitchen Ops logic + 0min handover | FE doc + FE display fix | 10 lines + Definitions doc | P2 | YES (Definitions) |
| F-5 | Remove By Station | FE | 20-30 lines | P2 | YES |
| F-6 | Payments empty chart | Backend brief + FE remove chart for now | FE: 30 lines, BE: ~1d | **P1** | YES |
| F-7 | RFM logic explainer | Backend brief (cutoffs) + FE tooltip | Backend: small, FE: ~15 lines | P2 | NO |
| F-8 | Phone null + Table-named customers | Backend brief + FE row-type chip | Backend: medium, FE: ~10 lines | **P1** | NO |
| F-9 | from_room = 0 display | FE | 3 lines | P2 | NO |
| F-9b | items_count = 0 on transfers | Backend brief | — | P2 | NO |
| F-10 | Cafe103 sees Room Transfer menu | FE gating by features.room | ~5 lines | P1 | NO |

---

## Owner decisions / questions still open

1. **F-2:** Breakfast boundary — `[08, 10]` (no overlap) OR `[08, 11]` with Lunch shifted to `[12, 15]`?
2. **F-3:** What did "68%" refer to? (Or was it 96% Dine-In / 28.7% Partial?)
3. **F-4:** Is Takeaway HANDOVER = 0 by design (no separate event) or a tracking defect we need backend to fix?
4. **F-5:** Remove By Station from ALL tabs of Item Ledger, or only All Items tab?
5. **F-6:** Do you want a backend brief for per-day-per-method split (proper fix), or just remove the Daily Payment Trends chart for now?
6. **F-7:** Do you want backend to publish RFM cutoffs as part of the API response, or just document them once and surface as tooltip?
7. **F-8:** Should we also flag pseudo-customers (Table 9, HPASCS OFFICE, Hotel Firhill) with a row-type chip so the empty phone is contextually understandable?
8. **F-9:** Label for `from_room = 0` — `—` OR `Walk-in` OR `Unassigned`?
9. **F-1 / F-4 / F-5 / F-10:** re-freeze approval needed once shipped.

---

## Backend briefs to be written (after owner answers above)

| # | Owner | Need | Severity |
|---|---|---|---|
| B-130-1 | F-6 | Add per-day-per-method split in `insights-sales.daily[]` | P1 |
| B-130-2 | F-7 | Publish RFM cutoffs in `insights-customers` response or contract doc | P2 |
| B-130-3 | F-8 | Populate `top_customers[].phone` for real customers; flag pseudo-customer rows | P1 |
| B-130-4 | F-1 | Stop returning `variations[].label = "[]"` — send `"default"` or omit row | P2 (FE workaround possible) |
| B-130-5 | F-9b | Populate `room_transfers[].items_count` correctly | P2 |
| B-130-6 | F-4 | Decide whether takeaway needs a `handover_at` timestamp | P2 (PRODUCT decision) |

---

## Final response (per v0.7 INVESTIGATION format)

```
Investigation complete: 10 items (F-1 → F-10)
Steps used: 7 / 10
Confidence: HIGH
```

Root causes
  • 4 FE-only fixes (F-2, F-5, F-9, F-10)
  • 5 require a backend brief (F-1 with FE workaround, F-6, F-7, F-8, F-9b)
  • 1 needs clarification (F-3)
  • 1 hybrid: FE display + backend product call (F-4)

CRITICAL clarification (F-10): NOT a tenant leak. cafe103 has its own
  historical room-transfer data (0 order_id overlap with palmhouse). Issue is
  pure FE — sidebar/route not gated by features.room. P1.

Highest priority
  • F-6 Payments empty: P1, backend missing field
  • F-8 Phone null: P1, backend never populates
  • F-10 Cafe103 sees Room Transfers: P1, FE gating

Artifacts
  /app/memory/handover/CR_011_OWNER_FEEDBACK_LOG_2026-06-17.md (running log)
  /app/memory/handover/CR_011_INVESTIGATION_REPORT_2026-06-17.md (this file)
  /app/memory/evidence/INSIGHTS_2026_06_17/ (7 JSON probes)

Next step: owner to answer 8 open decisions; then Planning agent drafts
  per-item Impact Analyses + Implementation Plans, OR groups them into a
  single CR-011-followup sub-CR.

No code, no docs in /app/frontend, no registry edits performed.
```
