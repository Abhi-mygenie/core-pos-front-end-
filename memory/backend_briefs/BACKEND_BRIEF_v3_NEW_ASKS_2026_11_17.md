# Backend Brief Changes — v3 Audit Report Revisions

**Date:** 2026-11-17
**Status:** AWAITING OWNER APPROVAL before sending to Gyan
**Context:** Owner review revised the 3-card structure, added ₹ leakage, expanded Card 2 scope

---

## Already Delivered (v2 briefs — NO changes needed)

| # | Brief | Endpoint | Events | KPIs | Status |
|---|-------|----------|--------|------|--------|
| 1 | **CR-543 v2** | `POST /api/v2/vendoremployee/report/insights-dashboard` | `late_cancel` with `risk_level` (5 values), `punch_time`, `cancel_time`, `duration_minutes`, `scope` | `late_cancel_count` + 5 tier counts | ✅ DELIVERED on preprod |
| 2 | **CR-544 v2** | Same endpoint | `cancel_after_unpaid` with `made_unpaid_at`, `cancel_time`, `gap_minutes`, `unpaid_count`, `order_status_at_cancel` | `cancel_after_unpaid_count` | ✅ DELIVERED on preprod |
| 3 | **CR-546 v2** | Same endpoint | `discount_apply_after_print` + `discount_remove_after_print` with `discount_amount`, `discount_type`, `discount_value`, `bill_printed_at`, `discount_time`, `operation` | `discount_apply_after_print_count` + `discount_remove_after_print_count` | ✅ DELIVERED on preprod |

**These 3 briefs remain valid — zero changes to existing asks.**

---

## NEW Asks (from owner review — need new brief to Gyan)

### NEW-1: Discount After Unpaid Events

**Why:** Card 2 ("Leakage After Unpaid") now covers discounts applied/removed on orders after they were marked unpaid — not just cancellations. Same fraud logic as CR-546 (discount after print), but triggered by unpaid status instead of print timestamp.

**Endpoint:** Same — `POST /api/v2/vendoremployee/report/insights-dashboard` → `audits.orders[]`

**New event types:**

```json
// discount_apply_after_unpaid
{
  "type": "discount_apply_after_unpaid",
  "order_id": "021544",
  "amount": 680.00,
  "discount_amount": 68.00,
  "discount_type": "percent",
  "discount_value": 10,
  "by": "Manager",
  "made_unpaid_at": "2026-11-16T14:30:00",
  "discount_time": "2026-11-16T15:00:00",
  "gap_minutes": 30,
  "unpaid_count": 2,
  "order_status_at_cancel": "unpaid",
  "operation": "apply"
}

// discount_remove_after_unpaid
{
  "type": "discount_remove_after_unpaid",
  "order_id": "021544",
  "amount": 680.00,
  "discount_amount": 68.00,
  "discount_type": "percent",
  "discount_value": 10,
  "by": "Manager",
  "made_unpaid_at": "2026-11-16T14:30:00",
  "discount_time": "2026-11-16T15:30:00",
  "gap_minutes": 60,
  "unpaid_count": 2,
  "order_status_at_cancel": "unpaid",
  "operation": "remove"
}
```

**Detection rule:** Same as CR-544 logic but for discount operations:
```
For each order with make_unpaid history:
  For each discount apply/remove WHERE discount_time > first_make_unpaid_at:
    → Emit discount_apply_after_unpaid or discount_remove_after_unpaid
```

**New KPIs:**
- `discount_apply_after_unpaid_count` (integer)
- `discount_remove_after_unpaid_count` (integer)

---

### NEW-2: Re-pay Money Gap

**Why:** Card 2 ("Leakage After Unpaid") needs to show the ₹ difference when a customer paid, order was made unpaid, items cancelled/discounted, then re-collected at a lower amount. The gap = theft.

**Endpoint:** Same endpoint → `audits` section (or new sub-section)

**Option A — Per-order summary:**
```json
{
  "type": "repay_gap",
  "order_id": "021544",
  "original_amount": 680.00,
  "repaid_amount": 500.00,
  "gap_amount": 180.00,
  "made_unpaid_at": "2026-11-16T14:30:00",
  "repaid_at": "2026-11-18T10:00:00",
  "unpaid_count": 3
}
```

**Option B — Fields added to existing `cancel_after_unpaid` events:**
Add `original_order_amount` and `current_order_amount` to each `cancel_after_unpaid` event so FE can compute the gap.

**Recommendation:** Option A — separate `repay_gap` event per order. Cleaner, doesn't bloat existing events.

**New KPI:**
- `repay_gap_total` (sum of all `gap_amount` values, in ₹)

---

### NEW-3: Post-Unpaid Edits Count (KPI bar)

**Why:** KPI bar now shows "Post-Unpaid Edits" count — total of all edits (cancels + discounts) on orders after they were marked unpaid.

**Endpoint:** Same endpoint → `audits` section

**New KPI:**
- `post_unpaid_edits_count` (integer) = `cancel_after_unpaid_count` + `discount_apply_after_unpaid_count` + `discount_remove_after_unpaid_count`

---

## Summary for Gyan

| # | Ask | Type | Effort Estimate | Priority |
|---|-----|------|-----------------|----------|
| NEW-1 | `discount_apply/remove_after_unpaid` events | 2 new event types | MEDIUM — same detection pattern as CR-544 but for discounts | P0 |
| NEW-2 | `repay_gap` event (money difference on re-pay) | 1 new event type | SMALL-MEDIUM — query payment history per unpaid order | P1 |
| NEW-3 | `post_unpaid_edits_count` KPI | 1 new counter | TRIVIAL — sum of existing + new counts | P0 |

**Total: 3 new event types + 3 new KPI counts, all on the same endpoint.**

---

## Questions for Owner Before Sending to Gyan

1. **NEW-1 (Discount after unpaid):** Should "replace" (discount A → discount B) also emit 2 events like CR-546? (Recommended: YES, same pattern)
2. **NEW-2 (Re-pay gap):** Option A (separate event) or Option B (fields on existing events)? (Recommended: Option A)
3. **NEW-2 timing:** Is this P0 (must have this sprint) or P1 (can ship without it initially)?
4. **Should NEW-1 and NEW-2 be registered as a new CR** (e.g., CR-550) or added to CR-544's scope?

---

*Awaiting owner approval to proceed with backend brief to Gyan.*

---

## Owner Answers to Approval Questions (2026-11-17)

| # | Question | Owner Answer |
|---|----------|-------------|
| 1 | Discount replace after unpaid: 2 events? | YES — same pattern as CR-546 |
| 2 | Re-pay gap format? | Option A (separate event) WITH reason breakdown: `gap_from_cancellations` + `gap_from_discounts` |
| 3 | Re-pay gap priority? | Design + plan now. Implement when backend ships. Don't block other work. |
| 4 | Registration? | Expand CR-544 scope. No new CR number. |

### Revised Re-pay Gap Event Schema:

```json
{
  "type": "repay_gap",
  "order_id": "000680",
  "original_amount": 680.00,
  "repaid_amount": 463.00,
  "gap_amount": 217.00,
  "gap_from_cancellations": 149.00,
  "gap_from_discounts": 68.00,
  "made_unpaid_at": "2026-11-10T21:08:00",
  "repaid_at": "2026-11-13T10:00:00",
  "unpaid_count": 3
}
```

**Invariant:** `gap_amount = gap_from_cancellations + gap_from_discounts` (no other leak sources).

**STATUS: APPROVED — Ready to send to Gyan.**

---

## UPDATE: NEW-3 Deferred (Owner directive 2026-11-17)

**`post_unpaid_edits_count` → DEFERRED to Phase 2 (logs).**

Not required for current sprint. KPI bar stays at 4 items (no "Post-Unpaid Edits").

Revised asks for Gyan:

| # | Ask | Priority | Status |
|---|-----|----------|--------|
| NEW-1 | `discount_apply/remove_after_unpaid` events | P0 | ACTIVE |
| NEW-2 | `repay_gap` with breakdown | Design now, ship later | ACTIVE |
| ~~NEW-3~~ | ~~`post_unpaid_edits_count`~~ | ~~P0~~ | **DEFERRED — Phase 2** |
