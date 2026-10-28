# CR-476 — Intake: Batch Reorder Save — "Save Order" Button for Product and Category Reordering

**Date:** 2026-10-28  
**Source:** OWNER-REQUESTED (investigation recommendation accepted, Option A)  
**Duplicate check:** DISTINCT — no existing CR covers batch reorder save. CR-014 (CLOSED) built the original drag-and-drop. BUG-620 (GATE_5B_QA_PASS) fixed BulkEditor stale state after drag. This CR reworks the per-drag API call pattern.  
**Related:** BUG-620 (changes the save behaviour introduced by that fix)  
**Code Reality:** NONE — no `handleSaveOrder`, no "Save Order" button, no dirty/unsaved indicator in either file

---

## Problem Statement

Currently, every time the user drags a product or category to a new position, the API is called immediately:

```
drag → setLocalProducts() → quickReorder() API call → onRefresh() API call
```

If an owner reorders 5 items: **10 API calls** (5 quickReorder + 5 onRefresh re-fetches). If they drag quickly, concurrent calls may arrive out of order — last-write-wins could corrupt the final ordering. A "Reordered" toast fires after each individual drag, which is noisy.

The `quickReorder` API already receives the **full ordered list** in a single payload, so it's designed for one call covering everything. The per-drag save pattern is purely a FE choice.

The `localProducts` / `localCategories` state already acts as an in-memory pending buffer. It just needs to stop auto-persisting and wait for an explicit save.

---

## Proposed Change (Option A — Explicit Save)

After any drag, update `localProducts` / `localCategories` locally only (no API call). A **"Save Order"** button appears in the toolbar when unsaved changes exist. A single API call is made when the user clicks it.

```
drag → localProducts updates (instant, no API)
           ↓ [unsaved indicator appears]
drag again → localProducts updates again (still no API)
           ↓
User clicks "Save Order" → 1× quickReorder API call → 1× onRefresh → done
```

**Discard button:** Also appears alongside "Save Order" — resets `localProducts` to null (reverts to original server order).

---

## Severity & Risk

- **Severity:** P2 — UX improvement; current behaviour works, just noisy and network-heavy
- **Risk:** LOW — 2 non-hotspot files; no API change; no new service; no route change
- **Fast Lane eligible:** NO — 2 files, new state+UI, explicit owner decisions needed
- **SLA:** Next sprint when convenient

---

## Open Questions (Owner Decisions)

| OD | Question | Recommendation |
|---|---|---|
| **OD-476-01** | Where should the "Save Order" button appear in ProductList? | Inside the existing toolbar row next to the search bar — green button, only visible when `localProducts !== null` |
| **OD-476-02** | Should a "Discard" button appear alongside "Save Order"? | YES — secondary grey button that resets `localProducts` to null |
| **OD-476-03** | Should the button show a count (e.g. "Save Order · 48 items")? | Show just "Save Order" — the item count in the subtitle is enough context |
| **OD-476-04** | Same Save/Discard pattern for CategoryList? | YES — identical treatment for categories |
| **OD-476-05** | What happens if user navigates away (closes MenuManagement panel) with unsaved order? | Discard silently (no confirmation dialog) — reorder is low-stakes; panel re-open fetches from API anyway |

---

## Evidence

- **Investigation:** `investigations/INV-3ISSUES-2026-10-26.md` (BUG-620 root cause trace)
- **Current API:** `POST /api/v2/vendoremployee/menu/quick-reorder` — already sends full ordered list in one payload; no backend change needed
- **Current dirty state:** `localProducts !== null` already equals "unsaved changes" — zero new state variable needed for the indicator
- **Code confirmed absent:** grep for `handleSaveOrder` / `Save Order` in both files returns 0 hits

---

## Blast Radius

| File | Change | Risk |
|---|---|---|
| `src/components/panels/menu/ProductList.jsx` | Remove API call from `handleDragEnd`; add `handleSaveOrder()` + "Save Order" + "Discard" buttons to toolbar | LOW |
| `src/components/panels/menu/CategoryList.jsx` | Same pattern | LOW |

**Files WILL NOT change:** `menuManagementService.js` · `menuManagementTransform.js` · `MenuManagementPanel.jsx` · `BulkEditor.jsx` · any other file

---

## Gate Status

- Gate 0 (Intake): **COMPLETE** (this document)
- Gate 2 (Impact Analysis): Not started
- Gate 3 (Implementation Plan): Not started
- Gate 4 GO: Pending OD-476-01..05 + owner GO
