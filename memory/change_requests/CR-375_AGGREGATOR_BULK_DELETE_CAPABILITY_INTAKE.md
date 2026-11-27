# Intake — CR-375
## Aggregator Menu: Bulk Delete Capability in BulkEditor

**Date:** 2026-09-11  
**Registered by:** Investigation Agent (ALPHA v0.7)  
**Source:** OWNER-REPORTED UX gap + AGENT-CONFIRMED-IN-CODE + BACKEND LIMITATION  
**Sprint:** pos_7_0 (suggested) — **BLOCKED pending backend verification**  
**Related investigation:** `/app/memory/investigations/INV-MENU-BULK-FILTER-GAP_INVESTIGATION_REPORT_2026_09_11.md`

---

## Classification

| Field | Value |
|-------|-------|
| **Type** | CR (Enhancement / Missing Feature) |
| **Severity** | P2 — MEDIUM |
| **Risk** | MEDIUM |
| **Area** | Menu Management > BulkEditor.jsx + Backend (`/delete-bulk` endpoint) |
| **Fast Lane** | NOT ELIGIBLE — requires backend coordination + FE changes |
| **Status** | **BLOCKED — requires backend verification before FE work can begin** |

**Severity rationale:** Aggregator menu users cannot delete items in bulk. They must delete each item individually via the card view (ProductCard menu). For a restaurant managing 180+ aggregator items, this is a significant productivity gap.

**Risk rationale:** Touches bulk delete flow which modifies data. Requires backend to support Aggregator food type in delete endpoint. MEDIUM risk once backend confirms.

---

## Owner Requirement (verbatim)

> "In aggregator menu bulk option is not there in bulk edit."

(Interpreted as: bulk delete / checkbox selection is absent in BulkEditor when viewing Aggregator menu, per code investigation confirming `showBulkDelete = menuType !== 'Aggregator'`)

---

## Description

When the user is in Aggregator menu and opens Bulk Edit mode, the following are hidden by a hard FE guard:
- Row checkboxes
- "Select All" header checkbox
- Selection banner ("N items selected")
- "Delete Selected" button and dialog

This was an intentional decision in CR-159 because the backend `/delete-bulk` endpoint at the time only supported `food_for: Normal|Party|Premium`, not `Aggregator`.

---

## Root Cause (confirmed in code)

```jsx
// BulkEditor.jsx:395–396
// CR-159: Aggregator menu does not support delete-bulk endpoint
const showBulkDelete = menuType !== 'Aggregator';

// menuManagementService.js:106–112
/** CR-159: Bulk delete — non-Aggregator menus only.
 *  DELETE /api/v2/vendoremployee/product/delete-bulk
 *  { ids: number[], delete_reason: string, food_for: 'Normal'|'Party'|'Premium' }
 */
export const deleteFoodBulk = (ids, deleteReason, foodFor = 'Normal') =>
  api.delete(`${BASE_V2}/delete-bulk`, {
    data: { ids, delete_reason: deleteReason, food_for: foodFor },
  });
```

---

## Backend Gap (requires Backend Brief)

Two paths exist to unblock this:

### Path A — Extend `/delete-bulk` to accept `food_for: 'Aggregator'`
- Backend adds Aggregator support to the existing bulk delete endpoint
- FE change: remove the `showBulkDelete` guard and pass `food_for: 'Aggregator'`
- Clean solution, matches existing bulk delete pattern

### Path B — Use `deleteFood` single-item API in a loop (frontend workaround)
- `DELETE /v2/delete/{foodId}` — no `food_for` restriction in current service code
- FE change: implement sequential loop calling `deleteFood` for each selected ID
- Risk: UNKNOWN — this endpoint may reject aggregator food IDs at the backend layer
- **Backend must confirm** whether `DELETE /v2/delete/{foodId}` works for aggregator food IDs

---

## Frontend Scope (after backend unblock)

| Item | Detail |
|------|--------|
| **File** | `BulkEditor.jsx` (1 file only) |
| **Change** | Remove `menuType !== 'Aggregator'` guard on `showBulkDelete` |
| **Service** | If Path A: `deleteFoodBulk` already passes `foodFor` — just needs backend support |
| **Lines estimate** | ~5 lines (remove guard, possibly add Aggregator-specific warning on delete confirm) |

---

## Evidence

- **Source:** Owner-reported (2026-09-11 session)
- **Confidence:** CONFIRMED (agent verified in code)
- **Code evidence:** `BulkEditor.jsx:395–396` — `showBulkDelete = menuType !== 'Aggregator'`
- **Service evidence:** `menuManagementService.js:106–112` — endpoint comment explicitly excludes Aggregator

---

## Duplicate Check

| Check | Result |
|-------|--------|
| CR-159 (bulk delete implementation) | RELATED — this is the origin of the guard; CR-159 explicitly scoped to non-Aggregator |
| Any aggregator delete CR | DISTINCT |

**Verdict: DISTINCT. Related: CR-159 (foundation)**

---

## Blast Radius

| Metric | Value |
|--------|-------|
| Files to change (FE) | 1 (`BulkEditor.jsx`) |
| Backend work | YES (required first) |
| Lines to change (FE) | ~5 |
| Hotspot files | NO |
| Financial / billing | NO |

**Blast radius: SMALL (FE) + BACKEND DEPENDENCY**

---

## Owner Decisions (open)

| OD | Question | Default (agent suggestion) |
|----|----------|--------------------------|
| OD-375-01 | Prefer Path A (backend extends `/delete-bulk`) or Path B (FE sequential loop using `deleteFood`)? | Path A — cleaner, atomic. Path B is a workaround with unknown risks. |
| OD-375-02 | Should a warning be added on the delete confirm dialog for Aggregator items (e.g., "This will also remove the item from Swiggy/Zomato platforms")? | YES — Aggregator delete has real-world platform impact |

---

## Backend Brief Required

A backend brief should be filed to:
1. Verify whether `DELETE /v2/delete/{foodId}` accepts aggregator food IDs
2. Request either: (a) extension of `/delete-bulk` for `food_for: 'Aggregator'`, OR (b) confirmation that single-item delete works for aggregator items

**This CR is BLOCKED until the backend brief gets a response.**

---

*Intake complete. Status: BLOCKED — Backend Brief needed. Next: File backend brief, await response, then Gate 2.*
