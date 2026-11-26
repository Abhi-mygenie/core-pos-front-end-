# Audit Report — Consolidated Design Decisions (LOCKED)

**Date:** 2026-11-17 (Session 4, Owner review)
**Status:** OWNER APPROVED
**Applies to:** CR-543, CR-544, CR-546, CR-528 (combined Audit Report redesign)

---

## 1. Page Name

**"Audit Report"** (renamed from "Order Edit Audit")

---

## 2. Top-Level KPI Bar (always visible, deduplicated counts)

| # | KPI | What it counts |
|---|-----|---------------|
| 1 | **Total Events** | Deduplicated sum of all audit events (each event counted once regardless of card overlap) |
| 2 | **Made Unpaid** | Orders marked unpaid |
| 3 | **Pay Method Changed** | Payment method swapped after settlement |
| 4 | **Post-Print Edits** | Count of all edits after bill print (cancels + discounts) |
| 5 | **Post-Unpaid Edits** | Count of all edits after making unpaid (cancels + discounts) |

**Dropped from KPI bar:** `order_edit_after_print` — owner directive, not needed.

---

## 3. Three Alert Cards (Level 1 — "What's Wrong")

### Card 1 — High Risk Cancellations

| Attribute | Value |
|-----------|-------|
| **Headline** | Count of cancellations ≥ 5 minutes |
| **₹ Leakage** | Sum of cancelled item amounts where duration ≥ 5 min |
| **Risk Bar** | Full horizontal bar: Doubt (5–15 min) → Risk (15–30 min) → High Risk (30+ min) |
| **Click** | → Cancellation Report (`/reports-module/cancellations?filter=high_risk`) |
| **Source CR** | CR-543 |

Note: Shows the **complete risk bar** on this card (not just 30+ min). Everything ≥5 min is suspicious.

### Card 2 — Leakage After Unpaid

| Attribute | Value |
|-----------|-------|
| **Headline** | Count of all events on orders that were marked unpaid |
| **₹ Leakage** | Sum of cancel amounts + discount amounts + money gap on re-pay |
| **Sub-events** | Cancellations after unpaid, Discounts applied after unpaid, Money difference when re-paid |
| **Click** | → In-page drill-down table |
| **Source CR** | CR-544 (expanded scope) |

**Money gap = customer paid ₹X → made unpaid → items cancelled/discounted → re-collected at ₹Y → gap = ₹X − ₹Y**

### Card 3 — Leakage After Print

| Attribute | Value |
|-----------|-------|
| **Headline** | Count of all events on orders where bill was already printed |
| **₹ Leakage** | Sum of cancel amounts + discount amounts on post-print orders |
| **Sub-events** | Item cancel after print, Order cancel after print, Discount applied after print, Discount removed after print |
| **Click** | → In-page drill-down table |
| **Source CRs** | CR-528 (cancels) + CR-546 (discounts) |

---

## 4. Overlap Handling — Approach C (Hybrid)

**LOCKED DECISION: Approach C — Count everywhere, with overlap visibility.**

### Rules:

1. **Each card counts ALL events that match its condition** — an item can appear in multiple cards.
2. **Top KPI bar Total Events is DEDUPLICATED** — each event counted once regardless of how many cards it appears in.
3. **Per-card overlap indicator:**
   > "44 High Risk Cancellations (₹12,400) — *3 also in Unpaid, 5 also in Post-Print*"
4. **Drill-down tables: multi-category tags** — each row shows pills/badges for all categories it belongs to:
   > `Order #021544 — Paneer Tikka — ₹350` → 🔴 High Risk · 🔓 After Unpaid · 🖨️ After Print
5. **Items appearing in all 3 cards = highest priority** for investigation.

### Overlap scenarios:

| Scenario | Card 1 | Card 2 | Card 3 |
|----------|:------:|:------:|:------:|
| Cancel at 35 min, order was unpaid, bill was printed | ✅ | ✅ | ✅ |
| Cancel at 35 min, bill was printed (not unpaid) | ✅ | — | ✅ |
| Cancel at 35 min (not unpaid, not after print) | ✅ | — | — |
| Cancel after unpaid, 2 min after punch, bill printed | — | ✅ | ✅ |
| Discount applied after print (not unpaid) | — | — | ✅ |
| Discount applied after unpaid (not after print) | — | ✅ | — |
| Cancel after unpaid, after print, at 10 min | ✅ | ✅ | ✅ |

### Why Approach C:
- Each card is a **complete, self-contained risk lens** — owner doesn't miss anything
- ₹ leakage per card is accurate for that risk category
- Multi-tagged items in drill-down surface the **most dangerous events**
- Top-level Total remains clean/deduplicated — no double-counting confusion at page level

---

## 5. Money Leakage on All 3 Cards

| Card | ₹ Leakage formula |
|------|-------------------|
| **High Risk Cancellations** | Sum of cancelled item amounts where `duration_minutes ≥ 5` |
| **Leakage After Unpaid** | Sum of (cancel amounts + discount amounts + re-pay gap) on unpaid orders |
| **Leakage After Print** | Sum of (cancel amounts + discount amounts) on post-print orders |

Every card headline: **count + ₹ total leakage**

---

## 6. Cross-Linking

| Card/KPI | Click action |
|----------|-------------|
| High Risk Cancellations | → Cancellation Report (`?filter=high_risk`) — timing details live there |
| Leakage After Unpaid | → In-page drill-down table |
| Leakage After Print | → In-page drill-down table |
| Made Unpaid (KPI bar) | → Related report or in-page drill-down |
| Pay Method Changed (KPI bar) | → In-page drill-down |

**Timing tier details (OK/Doubt/Risk/High Risk breakdown, punch_time, duration_minutes)** belong on the **Cancellation Report**, not duplicated on the Audit Report. Card 1 shows the risk bar summary and links out.

---

## 7. New Backend Requirements (beyond original CR scope)

| # | Ask | For Card | Status |
|---|-----|----------|--------|
| 1 | `discount_after_unpaid` events (discount applied on order after it was marked unpaid) | Card 2 | **NEW — needs backend brief to Gyan** |
| 2 | Money gap on re-pay (`original_amount`, `repaid_amount`, `gap_amount`) | Card 2 | **NEW — needs backend brief to Gyan** |
| 3 | `post_unpaid_edits_count` KPI in insights-dashboard | KPI bar | **NEW — needs backend addition** |

---

## 8. Event Types — Final List (8 types)

| # | Event Type | Card 1 | Card 2 | Card 3 | KPI Bar |
|---|-----------|:------:|:------:|:------:|---------|
| 1 | `make_unpaid` | — | context | — | Made Unpaid |
| 2 | `payment_method_change` | — | — | — | Pay Method Changed |
| 3 | `item_cancel_after_print` | maybe* | maybe* | ✅ | Post-Print Edits |
| 4 | `order_cancel_after_print` | maybe* | maybe* | ✅ | Post-Print Edits |
| 5 | `discount_apply_after_print` | — | maybe* | ✅ | Post-Print Edits |
| 6 | `discount_remove_after_print` | — | maybe* | ✅ | Post-Print Edits |
| 7 | `late_cancel` | ✅ | maybe* | maybe* | — |
| 8 | `cancel_after_unpaid` | maybe* | ✅ | maybe* | Post-Unpaid Edits |
| NEW | `discount_after_unpaid` | — | ✅ | maybe* | Post-Unpaid Edits |

*"maybe" = appears in that card when the event also matches that card's condition (overlap per Approach C)

**Dropped:** `order_edit_after_print` — removed per owner directive.

---

## 9. Decision History

| # | Decision | Answer | Date | By |
|---|----------|--------|------|-----|
| D1 | 3-level UX (alerts → breakdown → drill-down) | APPROVED | 2026-11-17 | Owner |
| D2 | Rename to "Audit Report" | APPROVED | 2026-11-17 | Owner |
| D3 | Drop `order_edit_after_print` | APPROVED | 2026-11-17 | Owner |
| D4 | CR-543: Fixed 4-tier risk (no settings) | LOCKED | 2026-11-17 | Owner |
| D5 | CR-544: No time limit, flag all cancels after unpaid | LOCKED | 2026-11-17 | Owner |
| D6 | CR-546: Track both apply & remove, all clients | LOCKED | 2026-11-17 | Owner |
| D7 | Card 1 shows full risk bar (5+ min, not just 30+) | LOCKED | 2026-11-17 | Owner |
| D8 | Card naming: High Risk Cancellations / Leakage After Unpaid / Leakage After Print | LOCKED | 2026-11-17 | Owner |
| D9 | Overlap handling: Approach C (hybrid — count everywhere + overlap tags) | LOCKED | 2026-11-17 | Owner |
| D10 | ₹ Money leakage on all 3 cards | LOCKED | 2026-11-17 | Owner |
| D11 | Timing details → Cancellation Report (Card 1 links there) | LOCKED | 2026-11-17 | Owner |
| D12 | Card 2 expanded: discount-after-unpaid + money gap on re-pay | LOCKED | 2026-11-17 | Owner |
| D13 | KPI bar: add Post-Unpaid Edits count | LOCKED | 2026-11-17 | Owner |

---

*End of consolidated design decisions.*

---

## 10. Additional Decisions (Owner Review Round 2 — 2026-11-17)

| # | Decision | Answer | Date |
|---|----------|--------|------|
| D14 | Discount events (after-unpaid AND after-print): what to show? | Total count + ₹ revenue loss. Same pattern for both triggers. | 2026-11-17 |
| D15 | Discount replace (A→B) after unpaid | YES — 2 events, same as CR-546 pattern | 2026-11-17 |
| D16 | Re-pay gap: include reason breakdown? | YES — gap must show how much is from cancellations vs how much from discounts. No other reasons possible. | 2026-11-17 |
| D17 | Re-pay gap: priority | Design + plan now. Implement when backend ships. Don't block. | 2026-11-17 |
| D18 | New asks registration | Expand CR-544 scope (no new CR number) | 2026-11-17 |

### D16 Detail — Re-pay Gap Breakdown

When a customer paid ₹680, order was made unpaid, then items cancelled (₹149) and discount applied (₹68), and re-collected at ₹463:

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

**Rule:** `gap_amount = gap_from_cancellations + gap_from_discounts` (always — no other leak sources exist).


## 11. Deferred to Phase 2

| # | Item | Reason |
|---|------|--------|
| D19 | `post_unpaid_edits_count` KPI in top bar | Owner: not required now, move to phase 2 logs |

**KPI bar stays at 4 items:** Total Events | Made Unpaid | Pay Method Changed | Post-Print Edits

"Post-Unpaid Edits" count removed from KPI bar.
