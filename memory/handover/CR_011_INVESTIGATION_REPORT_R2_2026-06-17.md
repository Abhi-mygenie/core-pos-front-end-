# Investigation Round 2 — Contract Deep-Dive (F-1, F-6, F-7, F-9 + F-2 + F-8 update)

**Role:** INVESTIGATION AGENT (continued, read-only)
**Date:** 2026-06-17 (afternoon)
**Steps used:** 9 / 10
**Confidence:** HIGH
**Trigger:** Owner asked for further investigation on F-1 (contract spec), F-6 (how it was missed), F-7 (RFM cutoffs), F-9 (how room vs table is distinguished). Also locked F-2 (08–10:30) and F-8 (CRM endpoint, separate CR).

---

## 0. Owner answers received this round

| # | Owner answer |
|---|---|
| F-2 | Breakfast bucket = **08:00 → 10:30** (will need sub-hour handling — see §F-2 below) |
| F-8 | **Out of scope for CR-011 — separate CR.** Customer data must come from CRM endpoint, not insights-customers. Will flag to backend. |

---

## F-1 — Contract spec for `insights-items.variations[].label`

### What contract v2.0 says (line 254-266 of `BACKEND_API_CONTRACT_INSIGHTS_CONSOLIDATED_V2.md`)

```
items: [{
  food_id, name, category_id, category_name, station,
  sold:          { qty, revenue, item_total, discount, service_charge, tax },
  cancelled:     { qty, revenue },
  complementary: { qty, revenue },
  pending:       { qty, revenue },
  credit:        { qty, revenue },
  order_charges_distributed, menu_price, avg_price_sold,
  variations:    [{ label, qty, revenue }],
  addons:        [{ name, count, rate_pct }],
  cancel_reasons: [{ reason, scope, count }]
}]
```

### Contract gap identified

The contract specifies the **shape** `[{label, qty, revenue}]` but does NOT specify:

| Question | Contract answer |
|---|---|
| What `label` should be for an item that has **no variations**? | ❌ Not specified |
| What `label` should be for an item with variations but a quantity tracked under "no variation chosen"? | ❌ Not specified |
| Are empty arrays allowed (`variations: []`)? Or always at least one entry? | ❌ Not specified |
| Is `label: null` valid? | ❌ Not specified |
| Are special sentinel labels (`"default"`, `"-"`, `"none"`) standardized? | ❌ Not specified |

### Observed backend behavior (palmhouse, May 2026)

The backend currently sends `label: "[]"` — the **literal Python/PHP stringified empty array** — for items with no variation. e.g., Cappuccino:

```json
"variations": [
  { "label": "single", "qty": 250, "revenue": 41017.20 },
  { "label": "[]",     "qty":   2, "revenue":   336.00 }
]
```

This is **almost certainly a backend serialization mistake** — somewhere the code does `label = str(variation_list)` on an empty list and gets `"[]"` instead of an explicit sentinel.

### Verdict for F-1

- **Contract:** GAP — does not specify the no-variation label behavior.
- **Backend:** DEFECT (relative to common sense) — emits stringified empty array.
- **FE:** Display defect (renders `"[]"` literally).

### What should be done

1. **Amend contract** to specify:
   - When an item has variations, return `variations: [{label, qty, revenue}, ...]` with `label` being a non-empty human string (e.g., `"single"`, `"multi"`, `"500ml"`, `"Large"`).
   - When an item has **no variation chosen**, use the sentinel **`label: "default"`** (NOT `"[]"`, NOT `null`, NOT empty string).
   - When an item has zero qty for a variation, omit the row entirely (don't send `qty:0`).
2. **Backend** to fix serialization: replace `"[]"` → `"default"` in `insights-items` aggregation.
3. **FE** defensive: remap any value of `label` that is `"[]"`, `null`, `""`, `undefined` → `"No Variation"` in the Variations sub-tab aggregation.

### Effort
- Contract amendment: 5 lines.
- Backend fix: 1-line code change.
- FE defensive remap: 2 lines in `ItemSalesHybridMockup.jsx`.

**Priority:** P2 (cosmetic but visible — 82% of revenue currently bucketed under `"[]"` for palmhouse).

---

## F-2 — Breakfast 08:00–10:30 (owner-confirmed)

### Implementation impact — hourly data is INTEGER hour, not sub-hour

Current backend `hourly[]` schema (contract v2.0, line 245):
```
hourly: [{ hour, revenue, orders }]
```

Each row is a **single integer hour** (0..23). There is no granularity below 1 hour.

### Problem
Owner wants `08:00 → 10:30`, which is **2.5 hours**, crossing a half-hour boundary. The hourly array doesn't have a row for "10:00–10:30" separately from "10:30–11:00."

### Options (need owner decision)

| Option | What it means | Pros | Cons |
|---|---|---|---|
| **A — Round to 08:00–10:00** | Breakfast = `[08, 10]` inclusive = 3 hours (08, 09, 10) | No backend change. Matches existing data granularity. Clean integer hour buckets. | Doesn't include 10:00–10:30 — loses ~half-hour of breakfast revenue |
| **B — Round to 08:00–11:00** | Breakfast = `[08, 11]` inclusive = 4 hours (08, 09, 10, 11). Lunch shifts to `[12, 15]` | Captures full window. | Overlaps with owner-stated 10:30. Shifts Lunch. |
| **C — Backend amendment: half-hour granularity** | Backend returns `hourly: [{slot, revenue, orders}]` with `slot = "08:00" / "08:30" / "09:00" ...` | Exactly matches owner intent. | LARGE backend change. Affects every hourly chart. |
| **D — Hybrid** | Approximate: take hourly[08] + hourly[09] + hourly[10] * 0.5 | Approximates 10:30 cutoff. | Math hack. Not auditable. |

**Recommendation:** **Option A (08:00–10:00)** for now, with a Definitions tooltip explaining the cutoff. Reserve Option C for a future "Insights v2" if the half-hour granularity becomes a recurring need.

Owner to confirm.

---

## F-6 — Why was the Daily Payment Trends chart missed despite contract validation?

### What contract v2.0 says (line 237-246)

```
4.2 insights-sales — Response Keys

summary:  { total_revenue, total_orders, total_tax, total_gst, total_vat, total_discount,
            avg_order_value, tab_settlement_total, best_day, worst_day, peak_hour, active_days }
daily:    [{ date, revenue, orders, tax, discount, tab_settlement }]
channels: [{ channel, orders, revenue }]
payments: [{ method, orders, revenue }]
hourly:   [{ hour, revenue, orders }]
```

### What was validated (validation report 2026-06-15)

The validation report confirms `insights-sales` was validated as `200 OK` with `summary + daily + channels + payments + hourly`. **It validated SHAPE.** It did NOT validate that the FE screen designs were achievable with that shape.

### Root cause of the miss

The contract was authored for the **Phase 2 hero screens**. At Phase 2:
- S7 Sales had period totals → uses `summary` + `daily` + `channels` ✅
- S8 Payments had period totals → uses `payments` ✅ + `daily.revenue` for an *overall* daily trend ✅

The **DAILY PAYMENT TRENDS chart** (per-day cash/card/UPI series) was an **FE design decision made AFTER the contract was finalized**, when the mockup was elaborated during Phase 2 implementation.

Cross-checking the mockup file `PaymentsMockup.jsx` line 18 (`import { fetchInsightsSales }` — NOT a separate payments endpoint), the screen relies on:
- `salesData.payments[]` for the period-total breakdown (donut/table) — present ✅
- An implied per-day per-method series for the chart — **missing in contract** ❌

The FE component code at line 219 reads `salesData.payments` which is the period-total array (not per-day). So the chart binding must be **synthesizing** the daily-per-method series from somewhere — or simply rendering empty when nothing matches.

### Verdict for F-6

- **Contract:** Did NOT promise per-day per-method split.
- **Validation:** Tested only what the contract promised — so the chart's empty state did not appear in validation logs (validation was field-shape-only, not visual-fidelity).
- **Process gap:** No step in the workflow cross-checked Phase 2 FE designs against the contract before declaring contract validation. The "screen-freeze" gate verified the screen looked correct on seed data; the contract-validation gate verified API shape on real data. Both passed independently — nobody cross-checked.

### Recommended actions (in priority order)

1. **Decide chart fate (owner):**
   - **A (fastest):** Remove the "DAILY PAYMENT TRENDS" chart. Show only period totals (donut + by-method table). FE-only, ~30 lines.
   - **B (best UX):** Backend amends `insights-sales.daily[]` to include `{cash, card, upi, partial, credit}` per day. ~1-2 days of backend work.
2. **Process hardening:** Add a "FE-Contract cross-check" step to the screen freeze protocol — before Gate ④ (API wired), confirm that EVERY chart on the screen has a contract-promised data source. This prevents future "design ahead of contract" gaps.
3. **Backend brief if Option B chosen.**

### Why this is a process issue, not a backend failure
The backend delivered exactly what was contracted. The FE designed a chart that wasn't in the contract. Validation was scope-correct but missed the FE-design drift. **The fix is process discipline, not backend rework.** That said, the user-facing defect is real (empty chart on a FROZEN screen — P1).

---

## F-7 — RFM band cutoffs: confirmed contract gap

### What contract v2.0 says (line 462)

> **Source data:** `user_id` + `cust_mobile` from order records. Guest = no `user_id` AND no `cust_mobile`. RFM = recency (days since last order), frequency (order count in range), monetary (total spend). Scope: fs=6 orders, `collect_bill` business day.

### What the contract does NOT say

| Question | Contract answer |
|---|---|
| What are the cutoff values that assign a customer to "Champions" vs "Loyal" vs "At Risk" vs "Dormant"? | ❌ Not specified |
| Are cutoffs **fixed** (e.g., "Champion = last visit ≤ 14d AND visits ≥ 5 AND spend ≥ ₹5,000") or **dynamic per period** (quintile / quartile based)? | ❌ Not specified |
| Why only 4 bands? Standard RFM uses 8-11 bands (Champions, Loyal, Potential Loyalists, New, Promising, Need Attention, About-to-Sleep, At Risk, Can't Lose, Hibernating, Lost) | ❌ Not specified — backend chose 4 bands without owner approval |
| Are guests (no user_id, no phone) included in the bands or excluded? | ❌ Not specified |
| What's the minimum number of orders to be eligible for any band? | ❌ Not specified (could be 1, could be a higher floor) |

### Verdict for F-7

**Contract gap confirmed.** Backend made implementation choices (4 bands + cutoff rules) that are NOT documented anywhere visible to FE or owner. The FE simply renders what backend sends, so neither side can answer the owner's question authoritatively.

### Recommended actions

1. **Backend brief — REQUIRED before owner can sign off S36:**
   - Document the exact band rules (cutoff values OR algorithm)
   - Justify the 4-band choice (vs the standard 8-11 band RFM scheme)
   - Confirm whether cutoffs are fixed or dynamic-per-period
   - Confirm guest inclusion/exclusion behavior
2. **Contract amendment:** Add a new section `5.4.1 RFM Band Definition` with the locked rules.
3. **FE follow-up:** Once rules are published, surface them on tooltips per band card + the Definitions panel. Optionally let backend return the actual cutoff values used per period (`rfm_thresholds: {R5: 14, F5: 5, M5: 4237}`).

**Priority:** P2 (S36 cannot be Gate-②-signed until owner understands what makes someone a Champion).

---

## F-9 — "How are you identifying table transfer vs room activity?" 🔴 BIG FINDING

### What contract v2.0 says (line 488-498)

```
room_transfers: [
  {
    "order_id": "015823",
    "from_room": "Room 101",      ← contract shows STRING room names
    "to_room": "Room 205",
    "items_count": 3,
    "transfer_date": "2026-05-15",
    "transfer_time": "14:30"
  }
]
```

The contract shows `from_room` / `to_room` as **strings** with human room names like `"Room 101"`.

### What backend actually returns

#### Palmhouse (room=Yes):
Numeric room IDs in the 5xxx range — looks like internal room_id values, NOT string room names. Probably acceptable (the FE could resolve to names if needed).

#### Cafe103 (room=No) — 🚨 THE PROBLEM:

```json
room_transfers (61 entries):
  { order_id: 011588, from_room: 0,    to_room: 5518, items_count: 0 }
  { order_id: 011599, from_room: 5535, to_room: 5527, items_count: 0 }
  { order_id: 011615, from_room: 0,    to_room: 5519, items_count: 0 }
```

Distinct `to_room` / `from_room` values for cafe103: `5500, 5501, 5502, 5505, 5506, 5507, 5512–5535` etc.

**Now look at cafe103's `by_table` from the SAME API response:**

```json
by_table:
  { table_id: 5567, table_name: "305", orders: 5,  revenue: 2191 }
  { table_id: 5500, table_name: "1",   orders: 70, revenue: 63128 }
  { table_id: 5522, table_name: "34",  orders: 92, revenue: 108242 }
  { table_id: 5521, table_name: "33",  orders: 60, revenue: 66496 }
  { table_id: 5564, table_name: "302", orders: 4,  revenue: 4085 }
```

**🎯 SMOKING GUN:** The `to_room: 5518, 5519, 5521, 5522, 5527, 5535` values in `room_transfers[]` are **the same numeric IDs as `table_id` in `by_table[]`** — they are **TABLE IDs, not room IDs**.

### Root cause

The backend's `transferToRoom` operation enum is fired by BOTH events at the POS:
1. A **table-to-table move** at a restaurant (e.g., guest changes from table 33 to table 34 mid-meal at cafe103)
2. A **room-to-room transfer** at a hotel (e.g., room service order originally for Room 101 reassigned to Room 205 at palmhouse)

Backend currently dumps **all** of these events into `room_transfers[]` regardless of the restaurant's room/table topology.

For palmhouse (room=Yes), this happens to be correct.
For cafe103 (room=No), every entry in `room_transfers[]` is actually a **TABLE-to-TABLE move** that has been mis-labeled as a "room transfer."

### Evidence chain

| | cafe103 (room=No) | palmhouse (room=Yes) |
|---|---|---|
| Has rooms? | ❌ No | ✅ Yes |
| `room_transfers[]` count | 61 | 126 |
| Are the room_ids actually table_ids? | ✅ YES (verified — match `by_table.table_id`) | Unknown — needs separate probe |

### Recommended actions

#### Immediate (FE-only, P1)
- Gate the *Room Transfer Trail* sidebar/route by `features.room === true`. Cafe103 won't see it. (This was already F-10 recommendation.)
- For restaurants with `room=Yes`, the FE just renders what backend sends — accept the noise for now.

#### Backend brief (REQUIRED — P1)
The endpoint needs to split into 2 arrays:

```json
"data": {
  "by_table": [...],
  "delivery_charges": {...},
  "table_transfers": [   ← NEW: for table-to-table moves (cafe103 case)
    { order_id, from_table_id, from_table_name, to_table_id, to_table_name, items_count, ... }
  ],
  "room_transfers": [    ← Only true room-to-room moves (palmhouse case)
    { order_id, from_room_id, from_room_name, to_room_id, to_room_name, items_count, ... }
  ]
}
```

The discriminator on the backend side: at the moment of the `transferToRoom` event, look at the **source order's location type**:
- If `source.table_id` was set → log to `table_transfers`
- If `source.room_id` was set → log to `room_transfers`

#### Contract amendment (P1)
Add `table_transfers[]` to the `insights-locations` contract (sub-section 5.5). Also clarify: `from_room` / `to_room` should be the **room_name** (string) not the numeric id, per the contract example. Backend should return both `id` and `name` to be safe.

#### Future FE addition
Once backend ships `table_transfers[]`, add a new screen / tab — `Table Transfer Trail` (S31.B) — alongside the existing `Room Transfer Trail` (S31.A). Restaurants see one or both depending on features.

### Open product question for owner
- Is `table_transfers[]` useful enough to be a separate report on cafe103-style restaurants? Or is this purely an operations/audit log not surfaced as an Insight?

---

## F-8 — Customer data must come from CRM (out of scope CR-011)

**Owner ruling:** customer data (including phone) must come from the CRM endpoint, not `insights-customers`. This will be a **separate CR**.

### Action items
1. Flag to backend that `insights-customers.top_customers[].phone` is currently null — they should be aware (no fix required as part of CR-011).
2. **Spawn new CR (let's call it CR-011.C / CR-NEW):** *"Wire S36 Customer Intelligence to CRM endpoint"* — investigation + integration + replace current data source.
3. For CR-011 closure: S36 stays at 🟠 awaiting Gate ② — but the unblocking action is moved to the new CR, not to CR-011. Owner needs to acknowledge that S36's freeze depends on the new CR landing.

### Open question for owner
- Should we **immediately stub S36 with a "Coming Soon — CRM integration"** banner so it doesn't surface misleading partial data? Or leave it visible during the CR transition?

---

## Updated tracking matrix (post-round-2) — UPDATED 2026-06-17 with ALL owner decisions

| # | Item | Verdict | What's needed | Owner decision |
|---|---|---|---|---|
| F-1 | Variation `[]` label | **Contract gap** — backend defect | Amend contract + backend 1-line fix + FE defensive remap | ✅ Proceed with all 3 |
| F-2 | Breakfast bucket | **Granularity constraint** | FE-only: BREAKFAST KPI for hours `[06, 10)` — 4 integer hours | ✅ Owner chose 06:00–10:00 |
| F-3 | ₹0 revenue / 28.7% Partial Payment | **BE-1 gap confirmed** — partial payments not decomposed into legs | Backend: decompose partial payment legs. FE: optional relabel after | ✅ Confirmed via screenshot — Partial segment on S14 donut |
| F-4 | Kitchen Ops logic + 0min handover | FE doc + tracking question | **DEFERRED** — owner will revisit later | ✅ Parked |
| F-5 | Remove By Station | Pure UI removal | FE: remove from **ALL tabs** in Item Ledger | ✅ Owner chose ALL tabs |
| F-6 | Payments empty chart | **FE-Contract drift**, not BE bug | **Option A — remove chart.** FE-only ~30 lines | ✅ Owner chose Option A |
| F-7 | RFM cutoffs | **Contract gap** — backend rules undocumented | Backend brief to publish band rules + contract amendment | ✅ Proceed with brief |
| F-8 | Phone null + Table-named customers | **Moved out of CR-011** | New CR for CRM wiring (CR-011.C) | ✅ Separate CR |
| F-9 | from_room=0 + table-vs-room confusion | 🚨 **Backend has `type: tb/rm` internally** | Contract amendment: expose `type` field in `room_transfers[]` response | ✅ Owner confirmed `type` discriminator exists |
| F-9b | items_count = 0 | Backend hygiene | Backend brief | ✅ Proceed |
| F-10 | Cafe103 sees Room Transfer menu | FE gating | FE 5-line fix — gate by `features.room` | ✅ Proceed |

---

## Backend briefs to be written — FINAL LIST (7 items, updated 2026-06-17 with owner decisions)

| # | Brief | Trigger | Severity | Effort | Status |
|---|---|---|---|---|---|
| **B-130-1** | **Decompose partial payments into cash/card/UPI legs in `insights-sales.payments[]`** | **F-3 (was F-6, but chart removed — core issue is partial payment ₹0)** | **P1** | **M** | 🟢 READY TO WRITE |
| B-130-2 | Publish RFM band rules in contract + (optionally) in response payload | F-7 | P2 | S–M | 🟢 READY TO WRITE |
| B-130-3 | (Separate CR-011.C) Wire S36 to CRM endpoint; fix phone field | F-8 | P1 | M | 🔵 SPAWNED TO CR-011.C |
| B-130-4 | Stop emitting `variations[].label = "[]"`; standardize on `"default"` | F-1 | P2 | S (1 line) | 🟢 READY TO WRITE |
| B-130-5 | Populate `room_transfers[].items_count` correctly (currently always 0) | F-9b | P2 | S | 🟢 READY TO WRITE |
| ~~B-130-6~~ | ~~Decide & implement `handover_at` timestamp for takeaway~~ | ~~F-4~~ | ~~P2~~ | ~~M~~ | ⏸️ DEFERRED (owner: take later) |
| **B-130-7** | **Expose `type: "tb"/"rm"` field in `room_transfers[]` response** (owner confirmed discriminator exists internally — just needs to be included in API response) | **F-9** | **P1** | **S** (simplified from M — no array split needed) | 🟢 READY TO WRITE |
| **B-130-8** | **Contract amendment for `insights-locations`: document `type` field semantics + clarify room_id vs room_name** | **F-9** | **P1** | **S** | 🟢 READY TO WRITE |

---

## Contract amendments to be written — FINAL LIST (3 items, updated 2026-06-17)

| # | Amendment | Trigger | Effort | Status |
|---|---|---|---|---|
| C-V2.1-1 | `insights-items.variations[].label` — sentinel `"default"` for no-variation; never `"[]"` | F-1 | 5 lines | 🟢 READY |
| ~~C-V2.1-2~~ | ~~`insights-sales.daily[]` — add per-method fields~~ | ~~F-6~~ | ~~10 lines~~ | ❌ CANCELLED (F-6: chart removed, not needed) |
| C-V2.1-3 | `insights-customers.rfm_bands[]` — publish band rules (cutoff schema) | F-7 | 20-30 lines | 🟢 READY |
| C-V2.1-4 | `insights-locations.room_transfers[]` — add `type: "tb"/"rm"` field, clarify room/table id semantics | F-9 | 15 lines (simplified — add field, not split arrays) | 🟢 READY |

---

## Final response (per v0.7 INVESTIGATION format, round 2 — UPDATED 2026-06-17 with ALL owner decisions)

```
Investigation Round 2 complete: F-1 through F-10 — ALL OWNER DECISIONS RESOLVED
Steps used: 9 / 10
Confidence: HIGH

=== OWNER DECISIONS RECEIVED (2026-06-17) ===

  F-1: ✅ Contract amendment + BE fix + FE defensive remap (proceed)
  F-2: ✅ Breakfast 06:00–10:00 → FE KPI for hours [06, 10)
  F-3: ✅ Confirmed: Partial Payment segment ₹0 / 684 orders / 28.7%
       on S14 donut. Known BE-1 partial-payment-leg gap. Backend brief.
  F-4: ⏸️ DEFERRED — owner: "let it be, will take later"
  F-5: ✅ Remove By Station from ALL tabs in Item Ledger
  F-6: ✅ Option A — remove DAILY PAYMENT TRENDS chart (FE-only)
  F-7: ✅ Contract amendment + BE brief (proceed)
  F-9: ✅ Contract amendment — backend to expose existing `type: tb/rm`
       field in room_transfers[] response (simplified from array split)

=== WORK PACKAGES (ready for planning) ===

  FE-only fixes (5 items — no backend dependency):
    F-1:  Defensive remap []/""/null → "No Variation" in S15
    F-2:  Add BREAKFAST KPI [06, 10) to S12 Hourly
    F-5:  Remove By Station from ALL tabs in S5 Item Ledger
    F-6:  Delete DAILY PAYMENT TRENDS chart from S8 Payments
    F-10: Gate Room Transfer sidebar by features.room

  Backend briefs (6 active, 1 deferred):
    B-130-1: Decompose partial payments into legs (F-3) — P1
    B-130-2: Publish RFM band rules (F-7) — P2
    B-130-4: Fix variations label "[]" → "default" (F-1) — P2
    B-130-5: Fix room_transfers items_count = 0 (F-9b) — P2
    B-130-7: Expose type: tb/rm in room_transfers[] (F-9) — P1
    B-130-8: Contract amend: document type field (F-9) — P1

  Contract amendments (3 active, 1 cancelled):
    C-V2.1-1: variations[].label sentinel (F-1)
    C-V2.1-3: RFM band rules (F-7)
    C-V2.1-4: insights-locations type field (F-9) — simplified

  Spawned CRs:
    CR-011.C: CRM wiring for S36 customer data (F-8) — separate intake

  Deferred:
    F-4: Takeaway HANDOVER=0min — owner will revisit later
    B-130-6: handover_at timestamp — parked with F-4

Artifacts updated:
  /app/memory/handover/CR_011_INVESTIGATION_REPORT_R2_2026-06-17.md (this file)
  /app/memory/handover/CR_011_OWNER_FEEDBACK_LOG_2026-06-17.md (log CLOSED)

Next step: PLANNING agent drafts sub-CRs for the 5 FE-only fixes
  and writes the 6 backend briefs + 3 contract amendments.
  All owner decisions are resolved — no blockers.
```
