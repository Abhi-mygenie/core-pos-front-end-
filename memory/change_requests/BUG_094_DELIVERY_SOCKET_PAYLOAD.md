# BUG-094 — Delivery-Assign-Order Socket Payload

**ID:** BUG-094
**Type:** Bug
**Status:** RE-INVESTIGATE — owner believes backend now sends payload (2026-06-15)
**Priority:** P3
**Area:** Socket / Delivery
**Sprint:** POS 5.0
**Revised:** 2026-06-15

---

## Current FE State

Handler `handleDeliveryAssignOrder` (socketHandlers.js:607) is fully implemented:
- **Primary path:** reads `payload.orders[0]` from socket, transforms, updates dashboard
- **Fallback path:** if no payload → `fetchOrderWithRetry(orderId)` via API

FE works with or without payload. When payload is absent, FE logs `WARN: No payload for ${orderId}, falling back to API`.

## Investigation Needed

Owner says backend now sends the payload in the `delivery-assign-order` socket event. To confirm:
1. Check backend release notes or ask backend team
2. OR test live: trigger a delivery assign on preprod, check browser console for `delivery-assign-order: Transformed order X from socket payload` (primary path) vs `falling back to API` (fallback)

## If Backend Now Sends Payload

→ BUG-094 is **CLOSED** — both FE and backend complete. FE handler already processes it. Remove from backend-blocked list.

## If Backend Still Missing Payload

→ Keep as P3 BACKEND-BLOCKED. FE fallback works — performance-only issue.

## Routing

→ **Owner to verify** on preprod via console log, OR backend team confirms. No FE work needed either way.
