# CR-492 — Complimentary Rights-Based (`complementary_food`) — Impact Analysis (Gate 2) — 2026-11-14

Code Reality: NONE — no `hasPermission('complementary_food')` anywhere. Key exists only in `constants/permissionCatalog.js` L29 (role editor).
Conflict: CollectPaymentPanel.jsx / OrderEntry.jsx / orderTransform.js (R5) — many open GATE_5A items.
Risk: CRITICAL (comp affects bill totals; R6). Backend-blocked: PARTIAL.

## Owner decision (locked)
Right key `complementary_food`. No right → comp HIDDEN. Covers item + order comp; order comp = 100% discount, hidden automatically as fallback (not list-type dependent).

## Probe findings (R11)
- Key exists in backend catalogue: module id 102 `complementary_food` "For show option of complementary food apply" (probe 07). Role-master defaults include it for Owner + Billing User (probe 04).
- **cafe103 Owner login role[] does NOT contain it** (probe 01) → after this CR the owner at cafe103 would lose comp until the role is updated.
- **Backend does not enforce it:** comp line placed by a user without the right was saved (`complementary=1`, reason saved) (probe 31/32).
- Order-level "comp" today = discount preset "Complementary 100%" from `restaurant_discount_type` (profile) rendered in CPP discount select L1525-1530.
- Profile `restaurants[0].complementary = "No"` — meaning unknown (not read by FE comp UI).

## Comp entry points (all must be gated)
| Where | File:line |
|---|---|
| Collect Bill comp checkbox (2 layouts) | CollectPaymentPanel.jsx L2100-2115, L2499-2515 |
| MarkCompModal (qty>1) | OrderEntry.jsx L1090, L3124; CollectPaymentPanel onSetCompItem |
| Toggle handler | OrderEntry.jsx L1068-1078 |
| 100% discount preset | CollectPaymentPanel.jsx L1525-1530 (filter presets with 100%) |
| Collect-Bill drawer (reports) | components/reports/CollectBillPanelDrawer.jsx (reuses CPP) |
| Room check-in comp? | components/pms/frontdesk/CheckInForm.jsx (1 ref — verify Gate 3) |
Catalog-complimentary items (`isComplementary`, menu setting) are NOT runtime comp — stay unchanged.

## Open owner decisions
- OD-492-A: existing comp lines on a running order (already marked) when a user without the right opens Collect Bill — show read-only, or hide the checkbox but keep the comp? OPEN.
- OD-492-B: cafe103 Owner (and any role missing the key) loses comp after release — OK to update roles in backend admin first? OPEN.
- OD-492-C: what does profile `complementary = "No"` mean (restaurant-level comp switch)? Ask Gyan; should it also hide comp? OPEN.

## Owner review 2026-11-14 (round 2)
- Owner: "complementary_food gating is missing, this gate should be in front end" → FE gate confirmed in scope.
- Palmhouse (RID 541) Owner login also lacks `complementary_food` (51 keys) → OD-492-B affects at least 2 restaurants.

- Owner screenshot: role editor already shows "Mark Complimentary — Mark items or orders as complimentary" (`complementary_food`) → owner can assign it per role; FE only needs to consume it.

- Owner 2026-11-14 round 4: **OD-492-A = existing comp lines shown READ-ONLY** to staff without the right (visible, cannot change).

## Backend asks
- B-492-1: enforce `complementary_food` server-side on place/update/bill (currently accepted).
- B-492-2: meaning of restaurant `complementary` flag.
