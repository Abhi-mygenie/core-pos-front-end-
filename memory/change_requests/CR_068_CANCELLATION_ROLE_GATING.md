# CR-068: Cancellation Role-Gating — Make Cancellation Rights Role-Based

**Registered:** 2026-07-11
**Source:** OWNER-REPORTED
**Confidence:** N/A (new feature request)
**Duplicate check:** DISTINCT
**Risk:** HIGH (touches order flow, permissions, cancellation — R5/R6 adjacent)
**Severity:** P1 — HIGH (security/business control feature)
**Blast radius:** LARGE (~6+ files — cancel buttons, permission checks, role config)

## Description
Currently there are no role-based restrictions on cancellation — any user/role can cancel orders/items. This needs to be a new feature where cancellation rights are controlled by user roles/permissions, so only authorized roles (e.g., Owner, Manager) can perform cancellations.

## Scope (estimated)
1. Define cancellation permission in role/permission model
2. Gate cancel buttons/actions behind permission check
3. Settings UI for configuring which roles can cancel
4. Apply to both order-level and item-level cancellation

## Affected Area
- Module: Order Entry, Dashboard, Settings, Permissions
- Files likely: `OrderCard.jsx`, `CartPanel.jsx`, `CollectPaymentPanel.jsx`, `OrderEntry.jsx`, permissions context, settings page
- Rule R5 (hotspot files) applies
- Rule R6 (financial logic) adjacent — cancellation affects billing

## Open Questions
- OQ-1: Which roles should have cancel rights by default? (Owner, Manager only?)
- OQ-2: Should this be configurable per restaurant or system-wide?
- OQ-3: Should item-level and order-level cancellation have separate permissions?
- OQ-4: Does the backend already have a permission field for this, or is it a new field?

## Next
Planning Gate 2 (Impact Analysis) — needs owner answers on OQs first
