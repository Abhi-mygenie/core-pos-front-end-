# BUG-330 — Payment Methods Not Visible Until Activated from Admin Panel

**Type:** Bug
**ID:** BUG-330
**Date:** 2026-08-17
**Status:** INTAKE COMPLETE — awaiting Gate 2 (Planning)

---

## Description

Payment methods in the POS (Settings → Payment Methods, or at checkout) are not visible/selectable until they have been explicitly activated from an admin panel (backend). Owner expects all configured payment methods to be listed (possibly with an enable/disable toggle in the POS itself), not hidden entirely.

## Classification

| Field | Value |
|---|---|
| Type | BUG |
| Area | Settings → Payment Methods / Order Entry → Collect Bill |
| Priority | P1 |
| Severity | HIGH — if payment methods are hidden, staff cannot see or select valid payment options |
| Risk | HIGH (payment flow directly affects order completion and financial recording) |
| Fast Lane | NO — needs investigation to confirm filter logic |

## Evidence

- Source: OWNER-REPORTED
- Steps to reproduce: Go to Settings → Payment Methods → observe that methods not pre-activated by admin do not appear
- Confidence: REPORTED (unverified — filter logic location needs investigation)

## Code Reality Check

```bash
grep -rn "is_active\|isActive\|enabled\|activated" src/components/panels/settings/ → 0 results
grep -rn "PaymentMethod\|payment.*method" src/ → 463 matches across services, transforms, order entry
```

- **Code reality: PARTIAL** — PaymentMethods component exists and is mapped in SettingsPanel; filter logic (if any) is in service/transform layer
- Relevant files:
  - `src/components/panels/settings/ListFormViews.jsx` (PaymentMethodsView)
  - `src/api/services/paymentMutationService.js`
  - `src/api/transforms/` (payment method transform — filtering may happen here)
  - `src/contexts/RestaurantContext.jsx` (paymentMethods data source)

## Blast Radius

- ~463 lines touch payment methods (LARGE — many references)
- Core change likely in 1-2 files (transform or context filter)
- Estimated scope: MEDIUM (3-5 files)

## Expected Behavior

- Settings → Payment Methods shows ALL payment methods configured for the restaurant
- Each method should have an enable/disable toggle that works FROM the POS settings
- Methods should not require backend admin activation to appear in the list

## Owner Decisions Needed

1. Should ALL payment methods show (including inactive ones with a toggle to enable)?
2. Or should only admin-activated ones show but the toggle should be visible in the POS?

## Duplicate Check

DISTINCT

---

**Next:** Planning Gate 2 (Investigation → confirm filter location → fix)
