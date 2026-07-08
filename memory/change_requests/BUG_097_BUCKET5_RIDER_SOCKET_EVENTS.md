# BUG-097 Bucket 5 — Rider Socket Events

**ID:** BUG-097 (Bucket 5 residual)
**Type:** Bug
**Status:** RE-INVESTIGATE — owner says backend now emits rider socket events (2026-06-15)
**Priority:** P1
**Area:** Socket / Delivery
**Sprint:** POS 5.0
**Revised:** 2026-06-15

---

## Background

BUG-097 main flow (delivery dispatch + assign rider) is **SHIPPED + OWNER VERIFIED** (25-row smoke). Two residuals were carved to POS 4.0/5.0:
1. CartPanel Collect-Bill gate (PARKED — owner A/B/C/D decision)
2. **Bucket 5: Rider socket events** — rider accept/reject/cancel socket handlers

## Current FE State

- `handleDeliveryAssignOrder` handles `delivery-assign-order` (rider assign + cancel/reject per comment at line 603)
- `AssignRiderModal.jsx` exists (86+ lines) — UI for selecting rider
- No separate handlers for rider-accept, rider-reject, rider-on-the-way, rider-delivered

## What Backend Needs to Provide (from backend.md D3)

- Rider **accept** socket event name + payload shape
- Rider **reject** socket event name + payload shape
- Does payload include `rejected_delivery_man_ids`?
- Is `delivery_man` field cleared or preserved on reject?
- Signals for: "rider picked up" → "rider on the way" → "delivered"

## Investigation Needed

Owner says backend now emits these events. To confirm:
1. Get event names from backend team / docs
2. Test live: assign rider on preprod, check console for new socket events
3. If confirmed → plan FE handlers (socketEvents.js + socketHandlers.js + useSocketEvents.js)

## Routing

→ **Owner to share backend socket event documentation**, then FE plans handlers. No FE work until event names + payload shapes confirmed.
