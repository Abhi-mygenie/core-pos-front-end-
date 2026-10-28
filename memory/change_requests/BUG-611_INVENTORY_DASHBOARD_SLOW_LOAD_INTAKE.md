# BUG-611 — Intake (Gate 1)
## Inventory Dashboard (Stock Intelligence) stuck on loading skeletons

**ID:** BUG-611
**Type:** BUG
**Date:** 2026-10-22
**Sprint:** backlog
**Area:** Inventory
**Priority:** P2
**Risk:** LOW
**Source:** OWNER-REPORTED + INVESTIGATION
**Duplicate check:** DISTINCT
**Status:** GATE_1_INTAKE_BACKEND_BLOCKED

---

## Description
The Inventory Dashboard (`/inventory-dashboard`) Stock Intelligence page shows skeleton loading placeholders for extended periods. The `stock-inventory` API takes 2+ seconds to respond.

## Evidence (API probe, Cafe103, 2026-10-22)
| API | Time | Size |
|-----|:---:|:---:|
| `get-inventory-master` | 0.98s | 28 KB |
| `stock-inventory` | **2.07s** | 36 KB |

FE shows loading skeletons correctly — it's waiting for backend data.

## Root Cause
**Backend:** `stock-inventory` endpoint takes 2s+ for a modest 36 KB response — likely a complex join/aggregation query that needs optimization.
**FE:** No issue — loading states display correctly.

## Fix Needed
**Backend:** Query optimization on `stock-inventory` endpoint.

## Blast Radius
NONE on FE — purely backend query performance.
