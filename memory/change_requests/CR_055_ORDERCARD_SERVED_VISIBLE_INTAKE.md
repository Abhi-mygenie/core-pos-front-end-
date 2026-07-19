# CR-055 — Intake Document (Gate 0 + Gate 1)

**Status:** REGISTERED · **Priority:** P2 · **Risk:** MEDIUM · **Sprint:** POS 5.0 · **Date:** 2026-07-04
**Source:** OWNER-REPORTED (batch intake 2026-07-04)
**Type:** CR (behavior change) — Frontend (Dashboard → OrderCard collapse behavior)
**Duplicate check:** DISTINCT

---

## 1. Requirement
In the order card, the current collapse behavior is: **served items are hidden until the card is expanded, pending items are visible by default**. Owner wants this **inverted**: served items should be visible by default; the operator focus should be on completed line items with an option to expand for pending detail (or the reverse per Planning ruling).

Owner phrasing (verbatim in intake): "In order cards, served items are hidden until expanded — before should be opposite."

## 2. Expected Behavior (Planning to confirm)
- Default collapsed state of an OrderCard shows served (completed) items.
- Pending / unserved items appear on expansion (or via a separate toggle) — exact split needs owner confirmation.
- Applies to which channels? Dine-in / Delivery / Scan / Walk-in — open question.

## 3. Suspected Area
- Order card renderer under `frontend/src/components/order-cards/` (variant per channel).
- Related to BUG-146 (item-level time) and BUG-149 (order ID visibility) — all touch the same OrderCard render surface. Planning should batch-analyze together.

## 4. Blast Radius
1–3 files (card renderer + local state). Blast: SMALL–MEDIUM. Hotspots: NO.

## 5. Evidence & Reference
- Owner verbal report only. Confidence: REPORTED.
- Screenshot / mockup of desired state: NOT PROVIDED — useful for Planning.

## 6. Open Questions (for Planning)
1. Confirm inverted mode: default = served visible / pending hidden? OR served visible + pending also visible but grouped?
2. Applies to all card variants or a specific one?
3. Any impact on the sidebar/summary counts?

## 7. Next
Planning Gate 2 — Impact Analysis; owner decision on exact behavior before Gate 3.

---

## Owner rulings recorded during Gate 2 → Gate 3 (2026-07-04)

- **CR-055 UX mockup approved 2026-07-04** — remove both toggles (Served + Cancelled), keep DOM order Active → Served → Cancelled, add small non-clickable "Served" and "Cancelled" section labels.
- **BUG-025 collapse pattern SUPERSEDED** by CR-055 owner ruling 2026-07-04. BUG-025 (2026-05-11) previously required the Cancelled items block to render behind a `▼ Cancelled (N)` toggle; that behavior is now replaced by always-visible rendering. Historic BUG-025 remains CLOSED-SUBSUMED in archived tracker — not reopened.
- Related items batched with CR-055 in Gate 3 plan: BUG-146 (per-item timeline) + BUG-149 (diagnostic log only, no fix).
- Gate 3 plan: `/app/memory/plans/ORDERCARD_CLUSTER_IMPLEMENTATION_PLAN_2026_07_04.md`
