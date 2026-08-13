# CR-078: Smart Purchase — Item-First Planner with Velocity & Vendor Intelligence

**Type:** CR (Feature Redesign · replaces existing Purchase Entry)
**Priority:** P1 (High)
**Risk:** HIGH (financial · client-side ranking drives purchase decisions · multi-vendor submission · rewrites core Purchase surface)
**Status:** INTAKE
**Registered:** 2026-07-18
**Sprint:** pos_5_0_wave_2

---

## Summary

Redesign the current vendor-first **Purchase Entry** screen into an **item-first Smart Purchase planner** that:

1. Takes a **purchase horizon** (7 / 10 / 14 days · custom) as primary input
2. Auto-builds a shopping list from ingredients whose projected consumption within the horizon exceeds current on-hand stock
3. For each line, suggests **quantity to buy = |Gap| exactly** (owner-locked FB-6-a rule) with the number shown as help text next to a manual input
4. For each line, suggests the **most profitable vendor** — ranked by **lowest last unit_price** from `vendor-item-list` history (owner-locked Q5-a)
5. Warns operator when they **override** the suggested vendor with a materially more expensive alternative (Q6-b)
6. Allows **ad-hoc lines** (items not in the auto-list, no velocity data available) — same UX as current Purchase Entry (Q8)
7. Groups final list **by vendor** and submits as **N sequential `POST /add-stock` calls** for v1 (Q7-a) · atomic single-call endpoint filed as future backend brief (Q7-b · `BACKEND_BRIEF_MULTI_VENDOR_PURCHASE_2026_07_18.html`)
8. Requires **Payment Method** per vendor PO (mandatory · owner-locked B1)
9. Enforces **Rate > 0** on every line (owner-locked B2)

Originally scoped as CR-075 UX polish (~110 lines); scope expanded during design review to a full workflow redesign — promoted to standalone CR per owner ruling Q10-a.

---

## Owner Context

- Feedback origin: FB-1 · FB-2 · FB-3 (mock v3 review) + FB-6 (mock v4 review) — 2026-07-18
- Design phase **COMPLETE** — mock v5 Smart Purchase screen locked (`cr072-inventory-mockup-v5-full.html`)
- Split ruling: owner Q10-a "SPLIT into CR-075/CR-078/CR-079"
- Suggestion rule: owner FB-6-a "Suggest = |Gap| exactly"
- Vendor ranking: owner Q5-a "Lowest last rate wins"
- Override behavior: owner Q6-b "Warn if picked vendor materially more expensive"
- Ad-hoc: owner Q8-a "Allow ad-hoc additions freely"
- Submit: owner Q7-a "N sequential POSTs for now" + Q7-b "brief for single-call multi-vendor"

## Code Reality Check

**Code Reality: NONE for new planner logic; EXISTS for Purchase Entry surface being replaced**

- Current file: `components/inventory/PurchaseEntryPanel.jsx` (~200 lines, vendor-first form) — will be **rewritten** or superseded by `SmartPurchasePanel.jsx`
- `api/services/inventoryService.js` — `addPurchase()` call target exists · will be reused
- `api/transforms/inventoryTransform.js` — needs additive changes for the ad-hoc origin field
- No velocity-computation client-side helpers exist yet
- No vendor-ranking helpers exist yet

## Duplicate Check

- **Classification: DISTINCT** — no prior CR redesigns Purchase Entry with velocity intelligence
- Adjacent: CR-072 (built current Purchase Entry) · CR-075-A (Purchase Entry UX polish · reduced scope after CR-078 split)
- Overlap: none functional · CR-075-A's Purchase-Entry line items (batch/expiry columns, red-* validation) still apply to Smart Purchase table

## Blast Radius (preliminary · refine at impact analysis)

- **Estimated scope: LARGE** — 6-8 files, 400-500 lines
- New files (planned):
  - `pages/InventorySmartPurchasePage.jsx`
  - `components/inventory/smart/SmartPurchasePanel.jsx`
  - `components/inventory/smart/HorizonPicker.jsx`
  - `components/inventory/smart/AutoShoppingList.jsx`
  - `components/inventory/smart/VendorSuggestionCell.jsx`
  - `components/inventory/smart/GroupedVendorPreview.jsx`
  - `api/services/vendorRankingService.js` (client-side ranking over vendor-item-list)
  - `utils/purchasePlanner.js` (velocity × horizon = projected need · gap = need − on-hand)
- Modified files:
  - `Sidebar.jsx` (rename "Purchase Entry" → "Smart Purchase")
  - `App.js` (route rename)
  - `api/constants.js` (add SMART_PURCHASE_LABEL constant if needed)
  - `api/transforms/inventoryTransform.js` (support `origin: planner | ad_hoc` field)
  - `PurchaseEntryPanel.jsx` — DELETED or redirected
- Hotspot files: NONE — greenfield planner logic
- **Fast Lane eligible: NO** — financial · multi-file · replaces a core surface

## Endpoints

All existing · no new endpoints needed for v1:
- `GET /inventory/vendor-item-list` → drives vendor ranking + rate suggestion
- `POST /report/daily-consumption-report` → drives velocity/projection
- `GET /stock-inventory` → on-hand snapshot
- `POST /add-stock` → per-vendor purchase submission (N calls per submit)

**Future optimisation** (parked): `POST /purchase/bulk` — spec in `/app/memory/backend_briefs/BACKEND_BRIEF_MULTI_VENDOR_PURCHASE_2026_07_18.html`

## Evidence

- Mock v5 Smart Purchase screen: `#screen-smart-purchase` in `cr072-inventory-mockup-v5-full.html`
- Live evidence: `/app/memory/evidence/CR-075/vendor_item_list.json` (1,145 rows · shape b confirmed) · `daily_consumption_report.json` · `recipes_list.json`
- Owner rulings captured in `SESSION_HANDOVER_2026_07_18_INVENTORY_PLANNING.md`

## Open Questions (deferred to Impact Analysis · Gate 2)

| # | Question | Notes |
|---|---|---|
| OQ-1 | Velocity window — 7d, 14d, or 30d rolling avg to compute daily consumption rate? | Owner ruling needed |
| OQ-2 | If DCR returns 0 for a horizon, do we still show the row (with 0 gap) or hide it? | Design assumption: hide |
| OQ-3 | "Materially more expensive" threshold for override warning — 5%? 10%? | Owner ruling needed |
| OQ-4 | Should the planner persist across sessions (e.g. save draft) or be ephemeral per open? | Ephemeral in v1 |
| OQ-5 | Ranking tie-breakers — if 2 vendors last-priced the same, which wins? | Most recent purchase? Highest volume? Owner input needed |
| OQ-6 | Ad-hoc row rate — should it use last known rate from vendor-item-list if the ingredient exists there, or always blank? | Design: pre-fill if exists |
| OQ-7 | Bulk-clear or reset horizon button? | Design not yet decided |
| OQ-8 | Master outlet — should Smart Purchase suggest transfers from parent instead of vendors when parent has stock? Cross-CR-077 interaction | Post-CR-077 design question |

## Design Note

Design **COMPLETE** for v1 — mock v5 Smart Purchase screen locked including horizon picker, auto shopping list with 5 realistic rows (velocity + ad-hoc), grouped-by-vendor submit preview with per-vendor Payment Method, override warning, and future backend brief link.

Post-CR-077 · consider a Phase 2 where the planner surfaces "Available from parent (Central Kitchen)" as an alternative to Vendor for franchise outlets.

---

## References

- Preview: `https://react-pos-frontend-4.preview.emergentagent.com/cr072-inventory-mockup-v5-full.html#screen-smart-purchase`
- Impact Analysis (§FB Round 2 §FB-1..3, §FB-6, §FB-10): `/app/memory/impact/CR-075_CR-076_BUG-201_IMPACT_ANALYSIS.md`
- Backend Brief (future optimisation): `/app/memory/backend_briefs/BACKEND_BRIEF_MULTI_VENDOR_PURCHASE_2026_07_18.html`
- Handover: `/app/memory/handover/SESSION_HANDOVER_2026_07_18_INVENTORY_PLANNING.md`
- Parent CR: CR-075 (split origin)
