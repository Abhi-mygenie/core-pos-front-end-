# BUG-301 — Aggregator Menu Status Toggle Sends Wrong Payload (Silent Failure)

**ID:** BUG-301
**Type:** BUG
**Priority:** P1 — HIGH
**Risk:** HIGH (API contract mismatch, silent failure — user sees success toast but nothing changes)
**Status:** INTAKE
**Gate:** 1
**Sprint:** pos_5_1
**Registered:** 2026-08-06
**Source:** OWNER-REPORTED + INVESTIGATION-CONFIRMED

---

## Description

In Menu Management → Aggregator tab, toggling a food item's status (active/inactive) appears to succeed (success toast fires) but the change is **never actually applied**. The backend silently rejects the call.

**Root cause confirmed via curl (2026-08-06):**

The FE's `toggleFoodStatus` always sends `{ status: 0|1 }` regardless of menu type.
When in Aggregator mode, the `status-food` endpoint requires `{ food_for: "Aggregator" }` — not `{ status }`.

The backend returns **HTTP 200** with an error body `{ errors: [{ code: "not_found" }] }`.
The FE `try/catch` only catches 4xx/5xx — a 200 with error body passes silently.
The UI shows a success toast. The status is unchanged.

### Before (broken):
```json
POST /status-food/{foodId}
Body: { "status": 1 }
Response: { "errors": [{ "code": "not_found", "message": "Food not found" }] }
```

### After (correct):
```json
POST /status-food/{foodId}
Body: { "food_for": "Aggregator" }
Response: { "message": "food status updated successfully", "action": "enable" }
```

---

## Evidence

- **Steps to reproduce:** Menu Management → switch to Aggregator tab → toggle any item's status → observe success toast → verify item status unchanged on refresh
- **Curl output (confirmed 2026-08-06):** saved at `/app/memory/evidence/BUG-STATUS-FOOD-AGG/api_contract_gap.json`
- **Live preprod account:** owner@18march.com / food_id 462 ("Veg Momos Full")
- **Source:** OWNER-REPORTED (screenshot + curl) + INVESTIGATION-CONFIRMED (live API probes)
- **Confidence:** CONFIRMED — both failure (wrong payload) and success (correct payload) verified live

---

## Area

Menu Management → Aggregator tab → Food status toggle (ProductList + BulkEditor)

---

## Code Reality Check — FULL

Three call sites, all missing `food_for`:

| File | Line | Current (broken) | Required |
|---|---|---|---|
| `menuManagementService.js` | L52-53 | `toggleFoodStatus(foodId, status)` → sends `{ status }` | must send `{ food_for: 'Aggregator' }` when in aggregator mode |
| `ProductList.jsx` | L109 | `menuService.toggleFoodStatus(product.productId, newStatus)` — no `menuType` passed | must pass `menuType` |
| `BulkEditor.jsx` | L510 | `menuService.toggleFoodStatus(row._id, row.status)` — no `menuType` passed | must pass `menuType` |

`menuType` is available as a prop in both `ProductList` and `BulkEditor` — it just isn't threaded through to `toggleFoodStatus`.

---

## Duplicate Check

- **DISTINCT** — no prior bug for this payload gap
- RELATED: BUG-255 (item-level serve/ready dots for aggregator — different feature, same module)
- RELATED: CR-119 (Aggregator Food Mapping tab — different feature entirely)

---

## Blast Radius

```bash
grep -rn "toggleFoodStatus" src/ → 3 hits (service def + 2 call sites)
```

- Files affected: **3** (menuManagementService.js, ProductList.jsx, BulkEditor.jsx)
- None are R5 hotspot files
- Scope: SMALL — surgical change to one function + 2 call sites
- No financial logic, no R6 concern

---

## Risk Classification

- **Risk: HIGH**
- Trigger: API contract mismatch + silent failure (user-facing: feature appears to work but doesn't)
- Fast Lane eligible: **NO** — 3 files (Fast Lane max = 1 file)
- Full gate flow required

---

## Open Questions

- **OQ-1:** Does the `status-food` endpoint for `food_for: "Normal"` also require a `food_for` field, or does `{ status: 0|1 }` work correctly for Normal mode? (Need to verify Normal path is not also broken)
- **OQ-2:** Is the toggle for aggregator a simple toggle (backend decides enable/disable) or does it need an explicit target state? The curl evidence shows backend derives `action: "enable"` from current state — confirms it's a pure toggle.

---

## Severity Rubric

**P1 — HIGH:** Feature broken (aggregator menu status management non-functional), no workaround, all restaurants using aggregator integration affected.

---

## Next Step

PLANNING (Gate 2 Impact Analysis) — trace both Normal and Aggregator paths in `toggleFoodStatus`, confirm OQ-1, write exact edits.
