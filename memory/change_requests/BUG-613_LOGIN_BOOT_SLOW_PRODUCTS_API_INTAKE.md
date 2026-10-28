# BUG-613 — Intake (Gate 1)
## Login boot slow — Products API bottleneck (2.4s / 616KB)

**ID:** BUG-613
**Type:** BUG
**Date:** 2026-10-22
**Sprint:** backlog
**Area:** Other
**Priority:** P2
**Risk:** LOW
**Source:** OWNER-REPORTED + INVESTIGATION
**Duplicate check:** DISTINCT (related BUG-610 — same products endpoint, different context)
**Status:** GATE_1_INTAKE_BACKEND_BLOCKED

---

## Description
When a restaurant logs in, the boot/loading screen takes 5+ seconds. The Products API (`foods-list`) is the bottleneck in the 8-API boot sequence, taking 2.4s and returning 616 KB for Cafe103's 424 items.

## Evidence (Boot sequence timing, Cafe103, 2026-10-22)
| API | Time | Size |
|-----|:---:|:---:|
| Login | 0.69s | 1 KB |
| Profile | 1.23s | 14 KB |
| Tables | 0.76s | 32 KB |
| Running Orders | 1.09s | 84 KB |
| **Products (Normal)** | **2.36s** | **616 KB** |
| Products (Aggregator) | 0.87s | 65 B |
| Popular Foods | 0.53s | — |

Products is the slowest API in the boot sequence. All 8 APIs run in Phase 1.

## Root Cause
**Backend:** Products endpoint returns full item details (variations, addons, images) for all items. For boot, only id/name/price/category/station are needed for the order-entry grid.
**FE:** Boot loads all 8 APIs in Phase 1. Products could potentially be deferred or loaded with a lighter endpoint.

## Fix Needed
**Backend (primary):** Lighter products endpoint for boot — return only fields needed for order-entry (id, name, price, category, station, tax, status). Full details loaded on-demand when editing.
**FE (secondary):** Consider lazy-loading full product details after dashboard renders. Boot only needs minimal product data for the order grid.

## Blast Radius
Backend endpoint + FE LoadingPage.jsx / product transform.
