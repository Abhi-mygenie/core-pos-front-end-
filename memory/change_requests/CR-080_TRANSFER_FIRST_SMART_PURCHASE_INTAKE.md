# CR-080: Transfer-First Smart Purchase — Franchise Cross-Flow Optimisation

**Type:** CR (Feature Enhancement · builds on CR-077 + CR-078)
**Priority:** P3 (Future / Deferred)
**Risk:** MEDIUM (financial · adds a decision branch inside Smart Purchase · touches transfer initiation from franchise side)
**Status:** INTAKE · DEFERRED (Phase 2)
**Registered:** 2026-07-18
**Sprint:** pos_5_0_wave_3 (or later · post-CR-077 + CR-078 ship)

---

## Summary

Once **CR-077 (Hierarchy Stock Transfer)** and **CR-078 (Smart Purchase)** have both shipped, enhance the Smart Purchase planner so that for **franchise outlets**, every auto-suggested line first checks the **parent restaurant's stock**. When the parent has surplus of the same ingredient, the planner offers *"Available from parent (Central Kitchen)"* as a **zero-cost alternative** to vendor purchase.

Converts the planner from a **vendor-first, transfer-blind** decision tool into a **transfer-first, purchase-second** decision engine — the natural saving lever for multi-outlet chains where a Central Kitchen already holds inventory.

---

## Owner Context

- Idea origin: agent proposal at end of CR-077/078/079 intake session (2026-07-18)
- Owner ruling 2026-07-18: **"intake separate CR for this for future"**
- Deliberately queued as Phase 2 — must NOT block or expand CR-077/CR-078 ship dates
- Only valuable once both parent modules exist in production

---

## User Value

- **For franchise operator:** obvious zero-cost source visible in the same planner they already use for vendor purchase · no need to open a separate "Request Transfer" workflow
- **For master (Central Kitchen):** demand signal · they see aggregated franchise requests coming through the transfer queue instead of vendor invoices piling up externally
- **For chain owner:** structural saving on ingredient duplication across outlets · surfaces the real cost of NOT using central inventory

---

## Code Reality Check

**Code Reality: NONE — depends on CR-077 + CR-078 shipping first**

- Requires `inventoryTransferService.dispatchInitiate()` (part of CR-077) to be live
- Requires `SmartPurchasePanel.jsx` (CR-078) to exist as the host surface
- Requires a new **parent-stock lookup endpoint** OR reuse of an existing cross-outlet stock query
- Requires `restaurantTypeFlag = "franchise"` context flag (added by CR-077's RestaurantContext work)

## Duplicate Check

- **Classification: DISTINCT** — no prior CR combines transfer-request initiation with the purchase planner
- Adjacent: CR-077 (transfer flows) · CR-078 (purchase planner) — both are prerequisites, not overlaps

## Blast Radius (preliminary · refine at future impact analysis)

- **Estimated scope: SMALL** — ~50-80 lines in existing CR-078 files
- New surface (planned):
  - Extension to `VendorSuggestionCell.jsx` (CR-078) — adds a "From parent · free" chip as a peer to the vendor options
  - Extension to `GroupedVendorPreview.jsx` — adds a new "Transfer request from parent" panel above the vendor POs
  - New `api/services/parentStockService.js` (or reuse from CR-077) — checks parent stock levels for the ingredients in the planner
  - `SmartPurchasePanel.jsx` — decision-branch logic when a parent-available option is selected
- New endpoint (probable):
  - `POST /api/v2/vendoremployee/inventory-transfer/dispatch-request/initiate` OR
  - A cross-outlet variant: `GET /stock-inventory?restaurant_id={parent_id}` (needs role/permission review)
- Modified files:
  - CR-078 files listed above
- Hotspot files: NONE (all greenfield or additive)
- **Fast Lane eligible: NO** — financial + adds a new submit path

## Endpoints

**Depends on backend answering:**
1. Can a franchise outlet **query** the parent's stock levels? (Likely needs a new permission + endpoint.)
2. Can a franchise outlet **initiate a transfer request** from itself? (Currently CR-077's flow is master-initiated dispatch. This CR needs the reverse: franchise-initiated pull.)

Both questions belong to the **Impact Analysis** phase — will file backend briefs at that point if needed.

## Evidence

- No new endpoint evidence yet — captured during future impact analysis
- Existing dependencies validated in:
  - `/app/memory/evidence/CR-077/pending_queues.json` (has `my_requests[]` category — hints at franchise-initiated request flow already existing)
  - `/app/memory/evidence/CR-075/vendor_item_list.json` (per-ingredient rates for cost-comparison logic)

## Open Questions (deferred to future Impact Analysis)

| # | Question | Notes |
|---|---|---|
| OQ-1 | Does backend already support franchise-initiated transfer requests? | The `my_requests` queue category in `pending-queues` suggests YES — validate before designing new endpoint |
| OQ-2 | Should the planner show parent stock in real-time (extra network call per line) or as a batched pre-fetch at horizon change? | Design decision · trade UX freshness vs performance |
| OQ-3 | If parent has partial stock (e.g. only 1kg of 2kg gap), how does the UI present the mixed option? | E.g. "1kg from parent + 1kg from Vendor X" split · needs UX design |
| OQ-4 | Cost basis — does parent charge the child (internal transfer price), or is it truly zero-cost? | Chain accounting policy question — owner ruling |
| OQ-5 | Should there be a **preference default** at outlet level ("prefer parent stock" toggle) so the planner auto-picks parent when available? | Nice-to-have for UX polish |
| OQ-6 | Master outlets don't need this feature (they ARE the parent) — visibility gate on `restaurant_type_flag === "franchise"` | Design principle · confirm |

## Design Note

Design **NOT STARTED** — do NOT design or plan until CR-077 + CR-078 have both landed in production. Any premature design will likely need rework based on final shipped shapes of the prerequisite CRs.

**When both prerequisites ship:** produce a **CR-080 mock v1** that overlays on top of the CR-078 Smart Purchase mock, showing the parent-available chip inline with vendor options.

---

## References

- Prerequisite CR: **CR-077** Hierarchy Stock Transfer (`change_requests/CR-077_HIERARCHY_STOCK_TRANSFER_INTAKE.md`)
- Prerequisite CR: **CR-078** Smart Purchase (`change_requests/CR-078_SMART_PURCHASE_INTAKE.md`)
- Related CR: CR-079 Inventory IA Restructure (host page for the planner)
- Origin note: last "Potential Improvement" section of `SESSION_HANDOVER_2026_07_18_INTAKE_CR077_CR078_CR079.md`
- Handover updates: `SESSION_HANDOVER_2026_07_18_INTAKE_CR077_CR078_CR079.md` (this session appends CR-080 registration to that file)
