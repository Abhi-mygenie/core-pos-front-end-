# CR-119 — Aggregator Food Mapping

**ID:** CR-119  
**Type:** CR (Feature / New Configuration Panel)  
**Priority:** P1  
**Risk:** MEDIUM  
**Area:** Settings / Aggregator → Food Mapping  
**Sprint:** pos_5_0  
**Intake Date:** 2026-07-30  
**Gate:** 0-1  
**Related:** CR-106 (Aggregator Module), CR-108 (Auto-KOT)

---

## Owner Description

> "We need to do aggregator food mapping for aggregator — attached MD file."

**⚠️ INTAKE NOTE:** The owner mentioned an attached MD file but no MD file was received. Two PNG images were attached; they appear to be BUG-271 network-tab evidence screenshots, not food mapping wireframes. **This intake is registered with known gaps. Owner must supply the MD spec and/or backend API documentation before this can move to Planning.**

---

## Problem Statement

When aggregator orders arrive from Swiggy/Zomato via UrbanPiper, each order item has a platform-specific identifier (e.g., `item_ref_title`, `ref_id`). The POS must know which of its own menu items (`food_id`) corresponds to each aggregator item.

Without a food mapping configuration:
- The kitchen doesn't know what to prepare
- The POS cannot attach costs, stations, or recipes to incoming aggregator items

A **food mapping panel** allows owners/managers to create and manage this mapping: POS item ↔ aggregator platform item.

---

## Feature Scope (Inferred — Pending Owner Spec)

### What Food Mapping Is
A lookup table: `POS food_id` ↔ `aggregator item ref_id (per platform)`.

Example mapping row:
| POS Item | POS Food ID | Platform | Platform Item Name | Platform Ref ID | Status |
|----------|------------|----------|--------------------|----------------|--------|
| Butter Chicken | 1042 | Swiggy | Butter Chicken | swg_item_8821 | Mapped |
| Paneer Tikka | 1043 | Zomato | Paneer Tikka (Full) | zt_89921 | Mapped |
| Coke | 1091 | Swiggy | — | — | Unmapped |

### Backend APIs Required (Not Yet Confirmed)

No backend endpoints confirmed as of 2026-07-30. All attempted probes returned 404:
- `GET /api/v1/urbanpiper/food-mapping` → 404
- `GET /api/v1/urbanpiper/item-mapping` → 404
- `GET /api/v1/urbanpiper/menu-mapping` → 404

**STATUS: BACKEND-BLOCKED** pending backend API documentation.

### Expected API Contract (to be confirmed)

```
GET  /api/v1/urbanpiper/food-mapping        → list all existing mappings
POST /api/v1/urbanpiper/food-mapping        → create/update a mapping
DELETE /api/v1/urbanpiper/food-mapping/{id} → remove a mapping
```

Or potentially a batch sync endpoint:
```
POST /api/v1/urbanpiper/sync-menu           → push POS menu to UrbanPiper
```

### UI Panel (Inferred)

The food mapping UI typically has:

1. **Two-column layout:**
   - Left: POS Menu Items list (from existing menu management)
   - Right: Aggregator catalog items (fetched from UrbanPiper)

2. **Mapping Actions:**
   - "Map" button to link a POS item to a platform item
   - "Unmap" button to clear a mapping
   - Search/filter in both columns

3. **Platform selector:** Swiggy / Zomato / both (if multiple platforms)

4. **Sync button:** Push/pull the mapping to/from UrbanPiper

5. **Status indicators:**
   - Mapped (green) / Unmapped (red/gray) / Mismatched (orange)

### Navigation Placement

Options:
- Under **Settings → Aggregator Settings** (new sub-section)
- Under **Menu Management → Aggregator Mapping** (tab)
- Standalone route `/aggregator/food-mapping`

---

## Open Questions (OQs)

| # | Question | Blocking? |
|---|----------|-----------|
| OQ-1 | **MD spec file was not attached** — please share the specification document | **YES** |
| OQ-2 | What are the confirmed backend API endpoints and their request/response shapes? | **YES** |
| OQ-3 | Which platforms need mapping: Swiggy only, Zomato only, or both? | YES |
| OQ-4 | Where should this UI live: Settings, Menu Management, or standalone Aggregator section? | YES |
| OQ-5 | Is this push (POS sends items to UrbanPiper) or pull (UrbanPiper sends its catalog, POS maps to it)? | YES |
| OQ-6 | Should this reuse the existing `BulkEditor` pattern or be a separate two-panel picker UI? | DESIGN |

---

## Duplicate / Related Check

| ID | Title | Verdict |
|----|-------|---------|
| CR-106 | Aggregator Module (live orders) | RELATED — CR-119 is the configuration side; CR-106 is the runtime side |
| No existing food mapping code found in codebase | DISTINCT |

**Verdict: DISTINCT**

---

## Blast Radius (Estimated — Subject to Spec)

| File | Change Type | Size Estimate |
|------|------------|---------------|
| `pages/AggrFoodMappingPage.jsx` (or panel) | NEW | ~400-600 lines |
| `api/services/aggregatorService.js` | +3-5 functions | ~60 lines |
| `api/constants.js` | +3-5 constants | ~6 lines |
| `App.js` | +1 route | ~3 lines |
| `components/layout/Sidebar.jsx` | +1 nav item | ~5 lines |
| `api/transforms/aggregatorTransform.js` | +food mapping transform | ~30 lines |

**Total: 6 files, ~500 net lines (estimated)**  
**Risk: MEDIUM** (touches menu data + aggregator configuration; misconfig could break incoming order routing)

---

## Current Status

**INTAKE — BACKEND-BLOCKED + SPEC MISSING**

Required before Planning can proceed:
1. Owner provides MD spec / wireframe
2. Backend team confirms API endpoints and response shapes
3. Answers to OQ-1 through OQ-5

---

## Acceptance Criteria (Preliminary — Pending Spec)

```
AC-1: Owner can view all POS menu items and their current aggregator mapping status
AC-2: Owner can map a POS item to an aggregator platform item
AC-3: Owner can unmap a previously mapped item
AC-4: Mapped / Unmapped status is clearly indicated
AC-5: Changes are persisted to backend
AC-6: Works for correct platform(s) as confirmed by OQ-3
```

---

## Evidence

- API probe: `/app/memory/evidence/CR-119/` — all attempted endpoint URLs returned 404 (backend not yet built or different path)
- Images attached by owner: 2× PNG screenshots related to BUG-271 (order-temp-store network tab) — NOT food mapping wireframes
- Test credentials: `owner@18march.com` / `Qplazm@10` (preprod)
