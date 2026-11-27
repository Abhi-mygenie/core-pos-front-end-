# BUG-610 — Intake (Gate 1)
## Menu Management: Bulk Editor + Card View slow to load (424 items, 616KB payload)

**ID:** BUG-610
**Type:** BUG
**Date:** 2026-10-22
**Sprint:** backlog
**Area:** Menu / Order Entry
**Priority:** P2
**Risk:** LOW
**Source:** OWNER-REPORTED + INVESTIGATION
**Duplicate check:** DISTINCT
**Status:** GATE_1_INTAKE_BACKEND_BLOCKED

---

## Description
Menu Management (both Bulk Editor and Card View) takes 3+ seconds to load for restaurants with large menus. Cafe103 has 424 items — the `foods-list` API returns 616 KB in 2.8s. The FE then renders all 424 items into the DOM at once.

## Evidence (API probe, Cafe103, 2026-10-22)
| API | Time | Size |
|-----|:---:|:---:|
| `foods-list?food_for=Normal` | **2.84s** | **616 KB** |
| `categories` | 1.12s | 12 KB |
| `addon-list` | 1.10s | 1 KB |

Each item averages ~1.5 KB including full variation arrays, addon details, and image URLs.

## Root Cause
**Backend:** Response payload too large — returns full item details (variations, addons, images) for all items in one call. No pagination or lightweight list mode.
**FE:** Renders all items into DOM. BulkEditor has no virtual scrolling.

## Fix Needed
**Backend (primary):** Lighter list endpoint — omit variations/addons for list view, return only id/name/price/category/status/tax. Load full details on item expand/edit.
**FE (secondary):** Virtual scrolling in BulkEditor for DOM performance with 400+ items.

## Blast Radius
SMALL-MEDIUM — BulkEditor.jsx (virtual scroll), backend foods-list endpoint
