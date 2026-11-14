# CR-494 — Cancellation Rights: Minimum Amount Threshold + PIN for Higher Values

**Registered:** 2026-11-06
**Classification:** CR
**Severity:** P1 — HIGH (money loss prevention: high-value cancellations need authorization)
**Risk:** CRITICAL (touches order cancel flow, permissions, billing — R5 hotspots)
**Process required:** Full gate flow + regression. FAST LANE eligible? **NO**
**Sprint:** TBD

---

## Description

Cancellation should be tiered based on order amount:
1. **Below a configurable minimum amount:** Staff with `order_cancel` permission can cancel freely (current behavior).
2. **Above the minimum amount:** A manager/owner PIN is required to authorize the cancellation.

This prevents unauthorized high-value cancellations by junior staff. The threshold amount and PIN mechanism need to be configurable per restaurant.

**Expected behavior:**
- Staff cancels order worth <= threshold → normal cancel flow (with reason per CR-493)
- Staff cancels order worth > threshold → PIN entry dialog appears → only proceeds with valid manager PIN
- PIN is verified against backend (not stored in frontend)

**Current behavior:** Any staff with `order_cancel` permission can cancel any order regardless of amount. No PIN or amount-based gating exists.

---

## Evidence

- **Source:** OWNER-REPORTED
- **Steps to reproduce:** Staff cancels a high-value order → no additional authorization required
- **Confidence:** CONFIRMED (code-traced: `hasPermission('order_cancel')` is the only gate — no amount check, no PIN flow)

---

## Code Reality Check

**Code reality: NONE** — No amount threshold check, no PIN verification, no manager authorization flow exists in the cancellation path. The only gate is `hasPermission('order_cancel')` boolean.

---

## Duplicate Check

**DISTINCT.** No existing CR/BUG covers amount-based cancellation gating or PIN authorization for cancellations.

---

## Blast Radius

- Cancel flow: `DashboardPage.jsx` (L1359 cancelOrder handler), `ChannelColumn.jsx`, `OrderCard.jsx`
- Hotspot files touched: YES — `DashboardPage.jsx`, `OrderEntry.jsx` (R5)
- New component needed: PIN entry dialog
- Backend dependency: PIN verification endpoint + threshold config in settings
- Estimated scope: LARGE (5+ files, ~60-80 lines + new PIN dialog component)

---

## Open Questions

- **OD-494-01:** What is the default minimum amount threshold? (e.g., Rs 500, Rs 1000?)
- **OD-494-02:** Is the PIN a restaurant-level PIN (shared) or per-manager individual PINs?
- **OD-494-03:** Should the PIN verification happen against the backend API, or is it a locally-stored settings value?
- **OD-494-04:** Does this apply to item-level cancellations too, or only full order cancellations?
- **OD-494-05:** BACKEND DEPENDENCY — Does a PIN verification endpoint exist? Does the threshold setting exist in restaurant settings?
