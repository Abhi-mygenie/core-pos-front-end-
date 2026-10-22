# BUG-609 — Intake (Gate 1)
## CRM search dropdown flashes on order re-open (edit/collect-bill)

**ID:** BUG-609
**Type:** BUG
**Date:** 2026-10-22
**Sprint:** nov_cr_batch
**Area:** CRM / Customer
**Priority:** P2
**Risk:** LOW
**Source:** INVESTIGATION (BUG-593 session)
**Duplicate check:** DISTINCT (related BUG-593)
**Status:** GATE_1_INTAKE_COMPLETE

---

## Description
When a cashier re-opens an existing order (edit or collect-bill), the CRM customer search dropdown flashes briefly showing the customer as a suggestion. This happens because `isCustomerSelected` evaluates to `false` when the customer state is restored from order data with no `id` and empty `name` — triggering the search effect. The dropdown auto-closes once the async CRM enrichment completes (~1-2s).

## Root Cause
CartPanel.jsx L879: `isCustomerSelected = !!(customer.id || (customer.name && customer.phone))`
- On order re-open: `customer = { name: "", phone: "7505242126" }` (no `id`, empty `name`)
- `"" && "7505242126"` = `""` (falsy) → `isCustomerSelected = false`
- Search fires at L891 → dropdown appears
- After CRM enrichment sets `id` → `isCustomerSelected` flips → dropdown closes

## Evidence
- Owner screenshot: dropdown showing "abhishek jain / 7505242126" on order re-open
- Reproduced during BUG-593 investigation

## Blast Radius
SMALL — CartPanel.jsx L879, 1 line

## Proposed Fix
Change L879 to: `setIsCustomerSelected(!!(customer.id || customer.phone || (customer.name && customer.phone)))`
Or: treat any customer restored with a phone as "selected" to suppress search.
