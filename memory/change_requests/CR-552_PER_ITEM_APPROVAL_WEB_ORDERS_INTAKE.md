# CR-552 — Per-item approval for web-order items (item-level Yet-to-Confirm) — WEB ORDERS ONLY

**Type:** CR (feature) · **Registered:** 2026-11-18 · **Source:** OWNER-PROVIDED
**Severity:** P1 · **Risk:** HIGH · **Area:** Menu / Order Entry
**Client:** MyGenie (restaurant 672) · **Assignee:** Abhishek (frontend; backend dependency likely)
**Sprint:** nov_cr_batch · **Status:** GATE_2_IMPACT_ANALYSIS

## Requirement (owner's words)
"Per item approval for web orders — it's only limited to web orders, not aggregator or any kind of orders."

When a customer adds/edits items on an **existing** order via **web**, each newly added line arrives as `food_status = 7` while the order stays `f_order_status = 2` (Ready/preparing). Staff must get a **per-item approve/reject** affordance plus a **visible not-confirmed marker/label** on those lines — instead of the line silently rendering as a normal orange cooking-pot item.

## Scope guard (explicit, non-negotiable)
- Applies to **WEB orders ONLY** (`isWebOrder === true` / `orderFrom === 'web'`).
- **Excludes** aggregator orders (Swiggy / Zomato / UrbanPiper — `isAggregator`).
- **Excludes** POS / dine-in / takeaway / every other order source.
- New UI and new actions must be gated on the web predicate and must be invisible/no-op for all other order types.

## Evidence
- Parent investigation: `/app/memory/INV-WEB-EDIT-NOTCONFIRM-2026-11-17_INVESTIGATION_REPORT.md`
- Live socket + REST + FCM payload: `/app/memory/evidence/INV-WEB-EDIT-NOTCONFIRM-2026-11-17/` (socket_events.jsonl, single_order_1578831_AFTER_edit5_session2.json, fcm_payload_captured.md)
- Source: OWNER-REPORTED · Confidence: CONFIRMED (owner reproduced live on Table 7 / restaurant 672)

## Duplicate check — DISTINCT
- Related: INV-WEB-EDIT-NOTCONFIRM-2026-11-17 (root cause), POS2-007 (confirm-order tone — override found DEAD vs live push), BUG-255 (item-level UI scoped by order type), CR-545 (per-item **cancel** in scan popup — adjacent, same popup/item-action theme).
- No existing CR/BUG implements per-item **approval** for web edits.

## Code reality — PARTIAL
- EXISTS: order-level web YTC (`OrderCard.jsx:1003 isWebYetToConfirm` Accept/Reject; `ScanOrderPopOut.jsx`; `TableCard.jsx:379 isWebOrder` snooze; CR-545 per-item cancel via CancelFoodModal).
- MISSING: item-level not-confirmed render/label/discovery + per-item approve for a **web edit** on an already-confirmed order.

## Blast radius (quick estimate — not full IA)
- Estimated scope: MEDIUM–LARGE (5–7 files). Hotspots touched: YES (`orderTransform.js` R5, `CartPanel.jsx` R5, active `ScanOrderPopOut.jsx` CR-545/CR-533/CR-534).

## Open owner decisions (see IA — do not guess, Rule R3)
OD-552-01 (approve semantics + backend endpoint), OD-552-02 (reject = cancel?), OD-552-03 (where it surfaces), OD-552-04 (order/table discovery badge), OD-552-05 (confirm-tone fix in/out of scope).

## Next
Gate 2 Impact Analysis at `/app/memory/CR-552_IMPACT_ANALYSIS.md` → owner review → Gate 3 plan.
