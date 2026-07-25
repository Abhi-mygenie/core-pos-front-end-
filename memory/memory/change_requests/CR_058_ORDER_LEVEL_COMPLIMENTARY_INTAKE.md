# CR-058 — Intake Document (Gate 0 + Gate 1)

**Status:** REGISTERED · **Priority:** P1 · **Risk:** HIGH (R6 — money/discount) · **Sprint:** POS 5.0 · **Date:** 2026-07-04
**Source:** OWNER-REPORTED (2026-07-04 planning session)
**Type:** CR (new feature) — Frontend (Order Entry → Collect Payment / Order Card action)
**Duplicate check:** SUBSUMES BUG-145 (owner ruling 2026-07-04). RELATED to legacy BUG-018 / BUG-021 (per-item Collect-Bill comp — closed, different scope).
**Financial flag:** R6 CRITICAL — full order value becomes Comp bucket; mandatory E2E money regression at Planning + QA.

---

## 1. Requirement

Today, if an operator wants to give the whole order on the house, they must mark each item complimentary one-by-one via the per-item runtime flag (`isComplementaryRuntime` in `CollectPaymentPanel.jsx`). Tedious and error-prone.

Add a single **"Mark Order Complimentary"** action that:
1. Sets every active item in the order to complimentary (`is_complementary = 'Yes'` on all order-detail rows in one call).
2. Prompts the operator for a **mandatory discount note** (reason / authorising manager) before applying.
3. Rolls up into the existing **Comp** bucket in Discount Report — no new bucket, same reporting shape as today's per-item comp.
4. Reflects on bill / KOT print exactly as today's per-item comp does — ₹0 line totals with a "Complimentary" indicator.

## 2. Code Reality

- Per-item runtime comp already exists: `CollectPaymentPanel.jsx:139` (`item.isComplementary === true || item.isComplementaryRuntime === true`), `L1158` (filter), `L1824` (catalog-lock check).
- Menu-level `complementary` flag exists on items (BulkEditor.jsx:45, ProductForm.jsx:501) — catalog-locked comp items.
- Transform maps `is_complementary` from API to `isComplementaryRuntime` on each item (orderTransform.js:152).
- ScanOrderPopOut.jsx:454 already reads `isComplementary || isComplementaryRuntime`.
- Comp bucket exists in `DiscountReportMockup.jsx` (aggregated view) — no schema change needed.
- **What is NOT present:** any order-level "flip all items to comp" action, no `discount_note` field capture on order-level comp.

## 3. Blast Radius

MEDIUM overall. Contained to:
- Collect Payment screen — new action button + mandatory-note modal.
- Order Card — optional button (owner ruling required).
- `orderTransform.js` outbound — bulk-set path (may loop over per-item update or new endpoint if backend adds one).
- Print / bill template — no change (per-item comp path already handles ₹0).
- Reports — no change (Comp bucket already exists).
- **Hotspots touched:** R5 (transform + Collect Payment), R6 (financial).

## 4. Evidence

- Owner verbal report only. Confidence: REPORTED.
- Screenshot / mockup of desired UX: NOT PROVIDED — request during Planning.

## 5. Open Questions (for Planning Gate 2 — owner rulings required per R3)

1. **Cancelled items** — leave as cancelled or flip to comp too?
2. **Already-served items** — allowed to flip to comp, or only active + ready items?
3. **Reversibility** — can operator un-comp the order, or one-way action?
4. **Permission gate** — reuse `order_cancel` permission, or new `order_comp` role permission?
5. **Where does the button live** — Collect Payment screen only, or also Order Card action?
6. **Where is the discount note stored** — on the order (`discount_note` / `order_note`) or per-item (`comp_reason`)?
7. **Bill print for comp order** — should the bill show item lines with ₹0, or a single "Complimentary — <note>" total? Backward compat check.
8. **Aggregator orders (Swiggy/Zomato/Scan)** — is the button available on these, or own-orders only? (Aggregator financial reconciliation R6 concern.)

## 6. Duplicate / Subsumption

**Subsumes BUG-145** — owner ruling 2026-07-04. BUG-145 requested "add Complimentary to the Discount Type dropdown"; CR-058 replaces that approach with a dedicated order-level action + mandatory note (cleaner UX, avoids dropdown-based flow which mixes comp with % / ₹ discounts).

## 7. Next

Planning Gate 2 — owner rulings on §5 (8 questions) required before Gate 3. Full E2E money regression per R6. Cannot batch with LOW-risk clusters; plan separately.

---

**End of CR-058 Intake — 2026-07-04**
