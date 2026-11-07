# CR-415 — SIDEBAR CLEANUP: REMOVE COMING SOON + DUPLICATE MODULES
**Registered:** 2026-10-12
**Type:** CR (cleanup — remove placeholder + duplicate menu entries)
**Severity:** P2 — MEDIUM
**Risk:** LOW
**Sprint:** oct_cr_batch
**Status:** GATE_1_INTAKE — DEFERRED (awaiting owner's final list)

---

## Description

The sidebar contains 4 "Coming Soon" placeholders that should be removed, and multiple duplicate entries where the same page appears twice under different sections. PMS section is now fully live (no placeholder pages) and Aggregator has an unimplemented item.

**Status:** Owner will provide the final list of links to remove or hide before Gate 2 can start.

---

## Known Items (investigation findings — pending owner confirmation)

### Coming Soon items (4 — `comingSoon: true`):
| Section | Label | ID |
|---|---|---|
| Daily Report | Item Report | `item-report` |
| Settings | Operating Hours | `operating-hours` |
| Settings | Cancellation Reasons | `cancellation-reasons` |
| Aggregator | Food Mapping | `food-mapping` |

### Duplicate items (same path or same content):
| Item | Location 1 | Location 2 | Recommendation |
|---|---|---|---|
| Expense Report | Daily Report L104 | Insights L207 | Remove from one |
| Customer Intelligence | Insights (non-beta) | Insights (Beta) | Keep Beta only |
| Guest vs Registered | Insights (non-beta) | Insights (Beta) | Keep Beta only |
| Front Desk | PMS (legacy) | PMS (Beta / CR-385) | Keep Beta only |
| Table Mgmt + Printers + All Settings | Settings | Settings | All point to `/settings` — rationalise |

---

## Duplicate Check

**DISTINCT** — no prior CR for sidebar cleanup.

---

## Code Reality

**FULL** — all items confirmed at HEAD in `Sidebar.jsx`.

---

## Risk

**LOW** — pure data change in `sidebarMenuItems` array. No logic, no API, no financial calculation.

---

## Files

**Files WILL change:** `Sidebar.jsx` only
**Files WILL NOT touch:** Any other file

---

## Status

**DEFERRED** — owner to provide final confirmed list of items to remove/hide before Gate 2 GO.
