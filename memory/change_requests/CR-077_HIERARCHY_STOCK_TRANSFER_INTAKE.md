# CR-077: Hierarchy Stock Transfer — Receive · Dispatch · Dispute · Return

**Type:** CR (Feature Migration + New Module)
**Priority:** P1 (High)
**Risk:** HIGH (financial · atomic transfers · cross-outlet inventory ledger writes · multi-role flow)
**Status:** INTAKE
**Registered:** 2026-07-18
**Sprint:** pos_5_0_wave_2 (Wave 2 of Inventory)

---

## Summary

Build the **cross-outlet Stock Transfer module** for franchise / master hierarchies. Franchise (child) outlets **receive** dispatched stock from their master parent · master outlets initiate **dispatch** to children · both sides can raise **disputes** and initiate **returns** for eligible transfers. Nine backend endpoints already exist under `/api/v2/vendoremployee/inventory-transfer/*` (owner-supplied MD 2026-07-18 · live-verified 2026-07-18 with `owner@palmindia.com`).

Originally scoped as **CR-075 P5** ("Purchase → Receive conditional"), but scope explosion during Gate 2 (600-900 lines, 8-12 files) forced a **promotion to standalone CR-077** per owner ruling B15.

---

## Owner Context

- Owner ruling B15 (2026-07-18): "yes new CR" · promote from CR-075 into own change request
- Design already produced — full **Receive screen** exists in mock v5 (`cr072-inventory-mockup-v5-full.html#screen-receive`) with real transfer data (TRF-813-2026-0003) validated via live endpoint capture
- MD file received: `receive_by dispatch.md` (in owner uploads)
- Master-outlet credentials (Central Kitchen · restaurant #813) **not yet shared** — needed for Dispatch flow validation

---

## Code Reality Check

**Code Reality: NONE**

- No files under `/app/frontend/src` reference `inventory-transfer`, `restaurant_type_flag`, or `parent_restaurant_id` today
- `RestaurantContext.jsx` does not currently expose `restaurantTypeFlag` even though the value exists at `restaurants[0].restaurant_type_flag` in the existing `GET /profile` v1 response (evidence: `/app/memory/evidence/CR-077/profile_master.json`)
- Sidebar has no "Receive" nav item

## Duplicate Check

- **Classification: DISTINCT** — no prior CR touches inventory-transfer endpoints
- Adjacent: CR-072 (Inventory Management Phase 1) — same domain but different endpoints. CR-077 is Phase 2 of the same module family.

## Blast Radius (preliminary · refine at impact analysis)

- **Estimated scope: LARGE** — 8-12 files, 600-900 lines
- New files (planned):
  - `pages/InventoryReceivePage.jsx` (route + layout)
  - `components/inventory/receive/ReceiveQueueTabs.jsx`
  - `components/inventory/receive/ReceiveTable.jsx`
  - `components/inventory/receive/ReceiveDrawer.jsx` (per-line accept/partial/dispute/reject)
  - `components/inventory/receive/ReceiveReturnPanel.jsx`
  - `api/services/inventoryTransferService.js` (9 endpoints)
  - `api/transforms/inventoryTransferTransform.js` (fromAPI/toAPI + meta_json.segments parser)
- Modified files:
  - `contexts/RestaurantContext.jsx` (expose `restaurantTypeFlag`, `parentRestaurantId`, `isMasterOutlet`, `isFranchiseOutlet` selectors)
  - `api/transforms/authTransform.js` or profile transform (field passthrough — value already in payload)
  - `api/constants.js` (INVENTORY_TRANSFER_ENDPOINTS section)
  - `Sidebar.jsx` (conditional Receive item shown only when `restaurantTypeFlag ∈ {franchise, master}`)
  - `App.js` (new route)
- Hotspot files: NONE — greenfield module
- **Fast Lane eligible: NO** — financial + multi-file + cross-outlet ledger writes

## Endpoints (live-verified via `owner@palmindia.com` · 2026-07-18)

| Purpose | Method | Path |
|---|---|---|
| Pending queues (6 categories) | POST | `/api/v2/vendoremployee/inventory-transfer/pending-queues` |
| Transfer details + lines | GET | `/api/v2/vendoremployee/inventory-transfer/details/{id}` |
| Receive (full / partial) | POST | `/api/v2/vendoremployee/inventory-transfer/receive/{id}` |
| Reject shipment | POST | `/api/v2/vendoremployee/inventory-transfer/reject/{id}` |
| Resolve dispute (source token) | POST | `/api/v2/vendoremployee/inventory-transfer/receive-dispute/{id}/resolve` |
| Return eligibility | POST | `/api/v2/vendoremployee/inventory-transfer/return/eligible` |
| Return initiate | POST | `/api/v2/vendoremployee/inventory-transfer/return/initiate` |
| Dispatch initiate (master-only, TBD) | ? | `/api/v2/vendoremployee/inventory-transfer/dispatch` — needs master creds to validate |
| Approval endpoints (lateral / approval-pending flow) | ? | TBD — 4 queue categories exist but flow not yet mapped |

Evidence: `/app/memory/evidence/CR-077/pending_queues.json`, `transfer_details.json`, `profile_master.json`, `login_master.json`

## Evidence

- Screenshots: mock v5 Receive screen — `/app/frontend/public/cr072-inventory-mockup-v5-full.html#screen-receive`
- Owner MD: `receive_by dispatch.md` (owner-uploaded 2026-07-18)
- Live captures: `/app/memory/evidence/CR-077/*.json`
- Source: OWNER-REPORTED + LIVE-VERIFIED (partial · master flow pending)
- Confidence: HIGH for Receive · MEDIUM for Dispatch/Approval flows

## Open Questions (deferred to Impact Analysis · Gate 2)

| # | Question | Notes |
|---|---|---|
| OQ-1 | Full dispatch-side flow: which endpoint, what payload? | Need master-outlet creds (Central Kitchen · #813) to explore |
| OQ-2 | Approval workflow — what triggers `approval_pending` vs `lateral_approval_pending`? | Backend documentation needed |
| OQ-3 | Segment-level receive — the `meta_json.segments[]` model. Can a segment be partially received, or is it all-or-nothing per segment? | Live curl during impact analysis |
| OQ-4 | Dispute resolution — role gating: who can resolve? Source-side or destination-side owner? | Owner ruling needed |
| OQ-5 | Return eligibility rules — what qualifies (within X days? untouched batch?)? | Backend brief may be needed |
| OQ-6 | Should the Receive nav pill be visible for `restaurant_type_flag = "normal"` outlets? | Owner ruling: NO (per design directive) |
| OQ-7 | Confirmation UX when receiving partial vs full — one submit or per-line submits? | Design already assumes single atomic submit (mock v5) — confirm |
| OQ-8 | Print/handover receipt after receive? | Owner ruling needed |

## Design Note

Design phase **COMPLETE** for Receive flow — mock v5 Receive screen has been reviewed by owner and locked. Dispatch, Approval, and Return flows still need design when master-outlet creds land.

---

## References

- Preview: `https://react-pos-frontend-4.preview.emergentagent.com/cr072-inventory-mockup-v5-full.html#screen-receive`
- Impact Analysis (partial · addendum in CR-075 doc): `/app/memory/impact/CR-075_CR-076_BUG-201_IMPACT_ANALYSIS.md` (§FB Round 2 §FB-9)
- Handover: `/app/memory/handover/SESSION_HANDOVER_2026_07_18_INVENTORY_PLANNING.md`
- Parent CR: CR-075 (split origin)

---

## Owner Rulings (2026-07-19)

| # | Ruling | Source |
|---|--------|--------|
| R1 | **Partial receive → Phase 2.** Phase 1 = full accept or full reject only. No per-line qty overrides. | Owner 2026-07-19 |
| R2 | **Dispute → Phase 2.** No dispute flow in Phase 1. | Owner 2026-07-19 |
| R3 | **"From" column:** Use `from_restaurant_id` + restaurant_type_flag from backend. Hardcode parent name from profile context (franchise knows its parent). | Owner 2026-07-19 |
| Q1 | Resolved → R3 | |
| Q2 | Resolved → R1 (Phase 2) | |
| Q3 | Resolved → R2 (Phase 2) | |
| Q4 | Phase 1 statuses: dispatched, received, rejected. Partial/disputed → Phase 2. | |

## Phase 1 Scope (simplified)
- **Receive tab only** (no Dispute Pending, no Approval Pending tabs in Phase 1)
- **My Requests tab** (read-only history)
- **Drawer:** Show items, batch/expiry. Two buttons only: **Accept All** or **Reject All**
- **No partial qty, no per-line dispute**
