# INV-BATCH-C-BACKEND-FEEDBACK — Investigation Report

**Date:** 2026-11-17
**Role:** INVESTIGATION
**Classification:** HIGH risk (audit/compliance contracts — wrong rules = wrong fraud detection)
**Steps Used:** 6/10
**Confidence:** HIGH — traced through code, contracts, and owner decisions

---

## 1. Summary

Backend (Gyan) raised 4 clarification questions across CR-543, CR-544, and CR-546 before coding. Each is a **legitimate gap** in the contracts we sent — not pushback, but precision questions that must be answered to avoid rework. This report provides recommended answers with reasoning for each.

---

## 2. CR-543 — Late Cancellation Audit (2 Questions)

### Q1: Tier Boundary Overlap

**Backend concern:** The tier table says `0–5 min`, `5–15 min`, `15–30 min`, `30+ min`. What happens at exactly 5.00 minutes? Both tier 1 and tier 2 claim it.

**Backend recommendation:** Use exclusive upper bounds: `0–<5`, `5–<15`, `15–<30`, `30+`. Classify using elapsed seconds internally, display as whole minutes.

**Investigation:**

This is correct — our contract was ambiguous. The original owner decision table used plain English ranges that visually overlap at boundaries:

| Original (ambiguous) | Fixed (precise) |
|---|---|
| 0–5 min | **0 ≤ d < 300s** (0:00 to 4:59) |
| 5–15 min | **300 ≤ d < 900s** (5:00 to 14:59) |
| 15–30 min | **900 ≤ d < 1800s** (15:00 to 29:59) |
| 30+ min | **d ≥ 1800s** (30:00+) |

**✅ RECOMMENDATION: Accept Gyan's proposal exactly.**

Precise rules for backend implementation:

```
elapsed_seconds = cancel_timestamp - punch_timestamp (in seconds)

if elapsed_seconds < 0:        → SKIP (data error — see Q2 edge case below)
if elapsed_seconds < 300:      → risk_level = "ok"
if elapsed_seconds < 900:      → risk_level = "doubt"
if elapsed_seconds < 1800:     → risk_level = "risk"
if elapsed_seconds >= 1800:    → risk_level = "high_risk"
```

The `duration_minutes` field in the response should be the **rounded-down whole minutes** (floor): `floor(elapsed_seconds / 60)`. This avoids confusion like "5 minutes" showing as "Doubt" vs "OK" — at exactly 300s, `floor(300/60) = 5`, and risk = "doubt". Consistent.

**Contract update needed:**

| Tier | Rule (seconds) | `risk_level` | Displayed `duration_minutes` |
|------|---------------|-------------|------------------------------|
| 1 | 0 ≤ elapsed < 300 | `"ok"` | `floor(elapsed/60)` → 0–4 |
| 2 | 300 ≤ elapsed < 900 | `"doubt"` | `floor(elapsed/60)` → 5–14 |
| 3 | 900 ≤ elapsed < 1800 | `"risk"` | `floor(elapsed/60)` → 15–29 |
| 4 | elapsed ≥ 1800 | `"high_risk"` | `floor(elapsed/60)` → 30+ |

---

### Q2: Full-Order Cancellations — One Event or Per-Item?

**Backend concern:** The detection rule says "evaluate each cancelled item" but the response allows `scope: "order"`. For a full-order cancel, should it emit:
- (A) One event with `scope: "order"` using the order-level timestamp, OR
- (B) One event per cancelled item, each with `scope: "item"` and that item's `punch_time`

Also: which `punch_time` for a full-order cancel? And what if `punch_time` is missing/invalid?

**Investigation:**

This matters because different items in the same order can have DIFFERENT punch times. Consider:

```
Order #021544:
  Item 1: Paneer Tikka  → punched 14:00 → cancelled at 14:35 → 35 min → HIGH RISK
  Item 2: Butter Naan   → punched 14:30 → cancelled at 14:35 → 5 min  → DOUBT
  Item 3: Dal Fry        → punched 14:32 → cancelled at 14:35 → 3 min  → OK
```

If we emit one `scope: "order"` event, we must pick ONE punch_time — which one? The earliest (14:00)? That would make the entire order "High Risk" even though 2 of 3 items are innocent. The latest (14:32)? That hides the High Risk item.

**✅ RECOMMENDATION: Per-item events (Option B) — always `scope: "item"`.**

Reasoning:
1. **Accuracy:** Each item has its own punch time, so each item has its own REAL risk tier. A full-order cancel is just "all items cancelled at once" — the audit value is knowing WHICH items were high risk.
2. **Consistency:** Item-cancel and order-cancel now produce the same event structure — always per-item. FE doesn't need separate rendering logic.
3. **KPI counts:** Count each item individually. An order with 3 items cancelled = 3 `late_cancel` events (possibly in different tiers). This matches how the KPI is useful — "how many HIGH RISK cancellations happened today" counts items, not orders.
4. **Existing pattern:** CR-528's `item_cancel_after_print` already works per-item. `order_cancel_after_print` is the order-level companion. For CR-543, per-item is the right grain because risk tier is per-item.

**However:** Still include `order_id` on every event so FE can GROUP BY order if needed (e.g., "these 3 items were from the same order-cancel").

**Rules for backend:**

```
On full-order cancel:
  → For EACH item in the order:
    → Compute elapsed = cancel_time - item.punch_time
    → Assign risk_level per item
    → Emit late_cancel event with scope="item", food_name=item.name, 
      punch_time=item.punch_time, duration_minutes=floor(elapsed/60)

On single-item cancel:
  → Same logic, one event
```

**Edge case — missing/invalid `punch_time`:**

```
If punch_time is NULL or missing:
  → STILL emit the event
  → Set duration_minutes = null
  → Set risk_level = "unknown"
  → FE will render: grey badge "Unknown" (no tier assigned)
  → DO NOT skip the event — the cancellation happened, we just can't classify it
  → DO NOT guess a tier

If punch_time > cancel_time (negative duration — clock skew or data bug):
  → Set duration_minutes = 0
  → Set risk_level = "ok" (benefit of doubt)
  → Log server-side warning for data quality monitoring
```

**FE impact:** Add `"unknown"` to `RISK_COLORS` map:
```javascript
unknown: { bg: 'bg-gray-100', text: 'text-gray-500', label: 'Unknown' },
```
+1 line. No other FE change needed.

**Contract update — add `risk_level: "unknown"` to allowed values:**

| `risk_level` | When |
|---|---|
| `"ok"` | 0 ≤ elapsed < 300s |
| `"doubt"` | 300 ≤ elapsed < 900s |
| `"risk"` | 900 ≤ elapsed < 1800s |
| `"high_risk"` | elapsed ≥ 1800s |
| `"unknown"` | `punch_time` is null/missing |

**KPI count rule:** `"unknown"` events are counted in `late_cancel_count` (total) but NOT in any tier-specific count. Add optional `late_cancel_unknown_count` for visibility.

---

## 3. CR-544 — Cancel After Making Unpaid (1 Question)

### Q3: Does Re-Payment Close the Window?

**Backend concern:** The brief says "cancellation must happen after `make_unpaid`" — but what if the order is re-paid before being cancelled? Sequence:

```
1. Order placed → paid ✅
2. make_unpaid → unpaid ⚠️
3. Payment received again → paid ✅  ← does this close the window?
4. Item cancelled ← should this still flag as cancel_after_unpaid?
```

**Investigation:**

Owner decision OD-544-02 (locked 2026-11-17) states:
> **"Include re-paid then cancelled? YES, flag ALL — even if re-paid. Show `unpaid_count` (how many times made unpaid) + `order_status_at_cancel`"**

This is unambiguous: **re-payment does NOT close the window.** The audit purpose is to detect the PATTERN of making orders unpaid + cancelling, regardless of intermediate re-payments. The fraud pattern is:

```
Scenario A (direct fraud): make_unpaid → cancel item → pocket the food
Scenario B (laundering): make_unpaid → re-pay (cover tracks) → cancel later → claim refund
```

Both are suspicious. The owner wants BOTH flagged.

**✅ RECOMMENDATION: Re-payment does NOT close the window. Confirm Gyan should implement as follows:**

```
Detection rule (FINAL):
  For each order in date range:
    IF make_unpaid event exists (at least once):
      → For each cancellation (item or order) on that order
        WHERE cancel_time > first make_unpaid_at:
        → Emit cancel_after_unpaid event
        → REGARDLESS of whether order was re-paid between unpaid and cancel

Fields to include per event:
  made_unpaid_at:         timestamp of the FIRST make_unpaid event on this order
  unpaid_count:           total number of times this order was made unpaid (integer)
  order_status_at_cancel: payment status AT THE MOMENT of cancellation
                          → "unpaid" if still unpaid when cancelled
                          → "paid" if re-paid before cancel (the suspicious laundering case)
  cancel_time:            when the cancellation happened
  gap_minutes:            cancel_time - made_unpaid_at (in whole minutes, floor)
```

**Why `order_status_at_cancel` matters:** It lets the audit page show TWO sub-patterns:
- `order_status_at_cancel = "unpaid"` → direct fraud (item cancelled while order is unpaid)
- `order_status_at_cancel = "paid"` → laundering (re-paid then cancelled = suspicious)

Both are flagged. Owner/manager can prioritize investigation based on which pattern they see.

**Contract update — add fields:**

```json
{
  "type": "cancel_after_unpaid",
  "order_id": "021544",
  "food_name": "Paneer Tikka",
  "amount": 200.00,
  "by": "Counter",
  "made_unpaid_at": "2026-11-16T14:30:00",
  "cancel_time": "2026-11-16T14:35:00",
  "scope": "item",
  "gap_minutes": 5,
  "unpaid_count": 2,
  "order_status_at_cancel": "paid"
}
```

**New fields (not in original contract):**
| Field | Type | Description |
|-------|------|-------------|
| `unpaid_count` | integer | How many times `make_unpaid` was done on this order |
| `order_status_at_cancel` | string | `"paid"` or `"unpaid"` — payment status at moment of cancel |

These were in OD-544-02 but NOT explicitly in the backend brief. This needs to be added.

---

## 4. CR-546 — Discount After Bill Print (1 Question)

### Q4: Discount Flows, Replace vs Separate Events, and `preset` Identification

**Backend concern:** Three sub-questions:

**4a) Which flows count as "discount changes"?**

The POS has these discount operations:
1. Apply discount (no prior discount)
2. Remove discount (discount → no discount)
3. Replace discount (change from one discount to another)

**4b) Is replacing one discount with another one event or two?**

If a manager changes a 10% discount to a ₹50 flat discount after print — is that:
- (A) 1 event: `discount_apply_after_print` with the new values, OR
- (B) 2 events: `discount_remove_after_print` (old) + `discount_apply_after_print` (new)

**4c) `discount_type` terminology mismatch:**

The current discount endpoint accepts `percent` and `fixed`. Our contract says `percent`, `flat`, and `preset`. How is `preset` identified? What's the difference between `fixed` and `flat`?

**Investigation:**

Let me trace the discount logic in the POS frontend to understand how discounts actually work:

<-- Code trace evidence -->

The POS frontend uses these discount types in the apply-discount flow:
- `percent` — percentage discount (e.g., 10%)
- `fixed` — flat rupee amount (e.g., ₹50)
- Preset discounts are saved discount templates (e.g., "Staff Meal 20%", "Manager Comp ₹100") — but when applied, they resolve to either `percent` or `fixed` with specific values

**✅ RECOMMENDATIONS:**

**4a — Which flows count:**

ALL THREE count as auditable events. Each represents a post-print change to the bill that affects the amount the customer pays:
1. **Apply** (none → discount): `discount_apply_after_print`
2. **Remove** (discount → none): `discount_remove_after_print`
3. **Replace** (discount → different discount): See 4b below

**4b — Replace = 2 events (remove old + apply new):**

Recommended: Emit **2 separate events** for a replace operation:
1. `discount_remove_after_print` with the OLD discount values
2. `discount_apply_after_print` with the NEW discount values

Reasoning:
- The audit page needs to show BOTH the old and new values for investigation
- Two events = clear timeline: "Manager removed 10% at 14:15, then applied ₹50 flat at 14:15"
- If we use 1 event, we'd need `previous_discount_type`, `previous_discount_value`, `previous_discount_amount` fields — more complex, same information, harder to query
- KPI counts stay simple: `discount_apply_after_print_count` + `discount_remove_after_print_count` both increment by 1 for a replace
- Matches the actual DB operations — a replace IS a remove + apply internally

**However:** Add a linking field so FE can show them as related:

```json
// Remove event (from replace):
{
  "type": "discount_remove_after_print",
  "order_id": "021544",
  "discount_amount": 35.00,
  "discount_type": "percent",
  "discount_value": 10,
  "operation": "replace",
  ...
}

// Apply event (from replace):
{
  "type": "discount_apply_after_print",
  "order_id": "021544",
  "discount_amount": 50.00,
  "discount_type": "fixed",
  "discount_value": 50,
  "operation": "replace",
  ...
}
```

New field:

| Field | Type | Values | Description |
|-------|------|--------|-------------|
| `operation` | string | `"apply"` / `"remove"` / `"replace"` | Whether this was a standalone apply/remove or part of a replace pair |

For standalone apply: `operation = "apply"`
For standalone remove: `operation = "remove"`
For replace: BOTH events get `operation = "replace"`

FE can then optionally show a "Replaced" badge instead of separate "Applied"/"Removed" when both events share the same `order_id` + close timestamps + `operation = "replace"`.

**4c — `discount_type` terminology:**

**ALIGN with what backend already uses.** The existing discount endpoint uses `percent` and `fixed`. Our contract should match:

| Contract value | Meaning | Current backend term |
|---|---|---|
| `"percent"` | Percentage discount | `percent` ← MATCHES |
| `"fixed"` | Flat rupee amount | `fixed` ← USE THIS (not "flat") |
| `"preset"` | Saved discount template applied | DOES NOT EXIST as a separate type |

**Key insight:** A "preset" discount is NOT a third type — it's a SAVED template that resolves to either `percent` or `fixed` when applied. The underlying discount on the order is always one of two types.

**However:** To preserve audit trail of WHERE the discount came from:

| Field | Type | Description |
|-------|------|-------------|
| `discount_type` | string | `"percent"` or `"fixed"` (the actual applied type) |
| `discount_source` | string | `"manual"` or `"preset"` (where it came from) |
| `discount_preset_name` | string/null | Name of the preset if `discount_source = "preset"` (e.g., "Staff Meal 20%"), null otherwise |

This way:
- `discount_type` is always `"percent"` or `"fixed"` — matches existing backend terminology, no confusion
- `discount_source` tells the auditor if someone typed a custom discount vs used a saved one
- `discount_preset_name` gives full traceability

**If `discount_source`/`discount_preset_name` are too complex for V1**, just use `discount_type: "percent" | "fixed"` and drop the preset tracking entirely. The audit value is knowing THAT a discount changed after print, not necessarily that it was a preset. Preset tracking can be V2.

**Contract update — revised `discount_type` values:**

```
REMOVE from contract: "flat", "preset"
USE instead: "percent", "fixed"
OPTIONAL V2: add discount_source + discount_preset_name
```

---

## 5. Summary of Contract Updates Needed

| CR | Question | Answer | Contract Change |
|---|---|---|---|
| **CR-543 Q1** | Tier boundaries | Accept Gyan's `0-<5`, `5-<15`, `15-<30`, `30+` using seconds | Update tier table with exclusive upper bounds + `floor()` rule |
| **CR-543 Q2** | Full-order cancel | Per-item events always (`scope: "item"`) + add `risk_level: "unknown"` for missing punch_time | Update scope rule + add `"unknown"` to allowed values |
| **CR-544 Q3** | Re-payment window | Does NOT close — flag ALL (per OD-544-02). Add `unpaid_count` + `order_status_at_cancel` | Add 2 fields to event schema |
| **CR-546 Q4a** | Which discount flows | Apply + Remove + Replace (all three) | Confirm in contract |
| **CR-546 Q4b** | Replace = 1 or 2 events | 2 events (remove old + apply new) with `operation: "replace"` linking | Add `operation` field |
| **CR-546 Q4c** | `discount_type` values | Use `"percent"` / `"fixed"` (match existing backend). Drop `"flat"` and `"preset"`. | Fix terminology in contract |

---

## 6. FE Impact of Contract Changes

| Change | FE File | Lines | Risk |
|--------|---------|-------|------|
| Add `"unknown"` to `RISK_COLORS` map | AuditLogMockup.jsx | +1 | LOW |
| Render `unpaid_count` + `order_status_at_cancel` columns | AuditLogMockup.jsx | +3 | LOW |
| Render `operation` badge ("Replaced" vs "Applied"/"Removed") | AuditLogMockup.jsx | +4 | LOW |
| Fix `discount_type` display: "fixed" → "₹ Fixed" (was "₹ Flat") | AuditLogMockup.jsx | +0 (naming change) | LOW |
| **Total additional FE work** | | **+8 lines** | **LOW** |

All additive. No structural FE changes needed.

---

## 7. Recommended Reply to Gyan

### CR-543 (Tier Boundaries):

> **Agreed — use exclusive upper bounds with seconds.**
> - Tier 1 (OK): `0 ≤ elapsed_seconds < 300`
> - Tier 2 (Doubt): `300 ≤ elapsed_seconds < 900`
> - Tier 3 (Risk): `900 ≤ elapsed_seconds < 1800`
> - Tier 4 (High Risk): `elapsed_seconds ≥ 1800`
> - `duration_minutes = floor(elapsed_seconds / 60)` in the response
> - Updated contract attached

### CR-543 (Full-Order Cancellations):

> **Emit per-item events, always `scope: "item"`.**
> - On full-order cancel: iterate each item, compute individual `punch_time → cancel_time`, assign risk per item
> - Include `order_id` so we can group by order if needed
> - If `punch_time` is null: set `risk_level: "unknown"`, `duration_minutes: null` — do NOT skip the event
> - If `punch_time > cancel_time` (negative duration): set `risk_level: "ok"`, `duration_minutes: 0`

### CR-544 (Re-Payment Window):

> **Re-payment does NOT close the window — flag ALL cancels after any `make_unpaid`, even if re-paid in between.**
> - Per owner decision OD-544-02 (locked 2026-11-17): "flag ALL — even if re-paid"
> - Add `unpaid_count` (integer — times made unpaid) and `order_status_at_cancel` ("paid"/"unpaid") to each event
> - Detection: `cancel_time > first_make_unpaid_at` on same order, regardless of intermediate payments

### CR-546 (Discount Flows):

> **All 3 flows count: apply, remove, replace.**
> - Replace = 2 events (remove old + apply new). Add `operation` field: `"apply"` / `"remove"` / `"replace"`
> - `discount_type` values: use existing backend terms `"percent"` / `"fixed"` only. Drop "flat" and "preset" from contract — my mistake.
> - Preset tracking (which saved template was used) is deferred to V2.

---

## 8. Artifacts

| Artifact | Path |
|----------|------|
| This investigation | `investigations/INV-BATCH-C-BACKEND-FEEDBACK-2026-11-17.md` |
| Original CR-543 contract | `backend_briefs/BACKEND_BRIEF_CR-543_2026_11_17.md` |
| Original CR-544 IA | `impact/CR-544_IMPACT_ANALYSIS.md` |
| Original CR-546 contract | `backend_briefs/BACKEND_BRIEF_CR-546_2026_11_17.md` |
| Owner decisions (OD-544-02) | `change_requests/BATCH_2_OWNER_DECISIONS_2026_11_16.md` → not here, but in CR-544 IA §6 |

---

```
Root cause: CONTRACT_GAPS — 4 legitimate ambiguities in Batch C contracts
Confidence: HIGH. Steps: 6/10.
FE fix: +8 lines (all LOW risk, additive)
Backend ask: Updated contracts needed for all 3 CRs
Planning skip eligible: N/A — this is contract clarification, not code
Retroactive candidates: NONE
Investigation report at: investigations/INV-BATCH-C-BACKEND-FEEDBACK-2026-11-17.md
```
