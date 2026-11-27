# CR-381 — INTAKE
## PMS — Laundry Management (linen queue, stock levels, dirty→clean processing, settings)

**ID:** CR-381
**Date:** 2026-09-13
**Registered by:** INTAKE agent (ALPHA v0.7)
**Source:** AGENT-DISCOVERED — backend reply 2026-09-13 shipped full laundry sub-module endpoints outside original CR-365 scope
**Related:** CR-365 (HK Workflow — checklist `laundry_issue`/`laundry_collect` actions push items into laundry queue; CR-381 is the downstream processor of that queue)
**Type:** CR (new capability)
**Owner confirmation:** YES — 2026-09-13

---

## Classification

| Field | Value |
|---|---|
| **Type** | CR |
| **Area** | PMS → Housekeeping → Laundry sub-module |
| **Priority** | **P2** |
| **Risk** | **MEDIUM** — new data model, stock levels, inventory counts; no money, no auth, no socket |
| **Sprint** | pos_pms_1 |
| **Fast Lane eligible** | NO — new files, new service, 6 files total |
| **Duplicate check** | **DISTINCT** — CR-365 covers HK tasks/checklist only. No laundry item in registry. |
| **Code reality** | **NONE** — zero laundry code in FE (`grep laundry /app/frontend/src/` → 0 results) |
| **Blast radius** | **MEDIUM** — 3 NEW files + 3 existing files. No hotspots (R5). |
| **Backend blocked** | **NO** — all 4 endpoints live (confirmed in BE reply 2026-09-13) |

---

## Severity Rationale

> **P2:** New capability within HK workflow. Staff currently have no way to track or process dirty linen after room cleaning. Not blocking any existing flow. Enhances the CR-365 HK ecosystem by closing the loop on `laundry_issue`/`laundry_collect` checklist actions.

---

## Description

When housekeeping completes a room checklist with `laundry_issue` or `laundry_collect` actions, those linen items enter a **laundry queue** on the backend. Currently there is no FE screen to:
- See what dirty linen is waiting to be processed
- Know current clean stock levels
- Mark dirty items as cleaned and returned to stock
- Configure laundry settings (default assignee)

Backend has fully shipped the laundry model as part of the HK backend brief reply.

### Expected behaviour

| Capability | Detail |
|---|---|
| **Laundry queue** `/pms/laundry` | List of dirty items pending processing (per room, item type, qty). Filter by status (`pending`, `processed`). |
| **Stock view** | Current clean linen stock levels (item, count, unit). |
| **Process action** | Select queue items → mark dirty→clean (updates stock). Bulk: process all pending in one tap. |
| **Settings** | Default laundry assignee (staff member who processes laundry). |

### Current behaviour

No FE laundry screen exists. Checklist `laundry_issue`/`laundry_collect` actions post to backend but result is invisible to POS staff.

---

## Evidence

- **Backend endpoints confirmed live** in `evidence/INV-BE-REPLY-2026-09-13/be_reply_raw_2026_09_13.md`:

```
GET  /api/v2/vendoremployee/aiosell/laundry/settings       → laundry config
PUT  /api/v2/vendoremployee/aiosell/laundry/settings       → update (default_assignee_id)
GET  /api/v2/vendoremployee/aiosell/laundry/queue?status=  → dirty items pending
GET  /api/v2/vendoremployee/aiosell/laundry/stock          → clean stock levels
POST /api/v2/vendoremployee/aiosell/laundry/process        → mark dirty → clean
     body: { queue_item_ids: [1,2], assignee_id: 15 }
     (omit queue_item_ids to process all pending)
```

- **Assignees:** `GET /employee/employees-list` (filter client-side, same as CR-365)
- **Source:** AGENT-DISCOVERED from BE reply · **Confidence:** CONFIRMED

---

## Blast Radius

### New files (3)

| File | Purpose |
|---|---|
| `src/pages/pms/LaundryPage.jsx` | Main laundry page — queue + stock + process action |
| `src/api/services/laundryService.js` | 4 service functions: getSettings, updateSettings, getQueue, getStock, processLaundry |
| `src/api/transforms/laundryTransform.js` | fromAPI transforms for settings, queue item, stock item |

### Modified files (3)

| File | Change | Lines |
|---|---|---|
| `src/api/constants.js` | +`LAUNDRY_ENDPOINTS` block (~8 constants) | ~10 |
| `src/components/layout/Sidebar.jsx` | +`pms-laundry` child under PMS section | ~5 |
| `src/App.js` | +`LaundryPage` import + `/pms/laundry` route | ~3 |

- **Hotspot files (R5):** NONE — `App.js` and `Sidebar.jsx` are additive-only changes (new import + new route/child)
- **Conflict check:** CR-365 plans to modify `Sidebar.jsx` (add `/pms/housekeeping` child) — **parallel-safe** (different child entries). Must coordinate execution order.

---

## Open Owner Decisions

| OD | Question | Options |
|---|---|---|
| **OD-381-01** | Route placement: standalone `/pms/laundry` page OR sub-tab inside CR-365 HK page `/pms/housekeeping`? | a) Standalone page (own sidebar child) · b) Sub-tab inside HK page |
| **OD-381-02** | Process action permission: all staff or manager/owner only? | all POS users / owner+manager only |
| **OD-381-03** | Should `process` action require selecting specific queue items, or always process all pending in one tap? | a) Select items (granular) · b) Process all (quick) · c) Both |

> **Note:** OD-381-01 determines whether `Sidebar.jsx` and `App.js` changes are needed (standalone) or this is absorbed into CR-365's HK page scope (sub-tab). Gate 2 can start once OD-381-01 is answered.

---

## Dependency Map

| Depends on | Reason |
|---|---|
| CR-365 Gate 2+ | HK checklist `laundry_issue`/`laundry_collect` populates the queue. CR-381 is meaningless without CR-365 in place. Plan CR-381 after CR-365 Gate 2 is done. |
| BUG-397 | Not a direct dependency but BUG-397 + CR-365 + CR-381 all touch PMS / Room Status area. Recommended execution order: BUG-397 → CR-365 → CR-381. |

---

## Gate Status

- [x] Gate 0/1 — Intake (owner confirmed 2026-09-13)
- [ ] Gate 2 — Impact Analysis (pending OD-381-01 answer + CR-365 Gate 2 completion)
- [ ] Gate 3 / 4

*Intake: 2026-09-13 | Code reality: NONE | Duplicate: DISTINCT | Blast radius: MEDIUM (3 new + 3 modified) | Risk: MEDIUM | Backend: UNBLOCKED*
