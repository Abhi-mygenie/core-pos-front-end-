# BUG-242 — Smart Purchase: No Default Vendor + Allows Submit With Null Vendor

**Registered:** 2026-07-24
**Source:** INVESTIGATION (INVESTIGATION_SMART_PURCHASE_STOCK_DISCREPANCY_2026_07_24.md — Bug 4 / Q4)
**Classification:** BUG
**Priority:** P1
**Risk:** LOW
**Duplicate Check:** RELATED to BUG-227 (System Vendor). DISTINCT — BUG-227 added System Vendor to rankings; BUG-242 is about defaulting selection + blocking null submit.
**Owner Decision:** Q4 APPROVED — default to System Vendor when no vendor selected. Block submit for rows with null vendor.

---

## Summary
User can submit Smart Purchase with "Select vendor..." (null vendor_id). Goes through as "(unassigned)" in review. Backend records purchase with `vendor_id: null`. Owner ruling: System Vendor should be pre-selected as default; submit should be blocked if any active row has no vendor.

## Root Cause
1. `SmartPurchasePanel.jsx L56`: `vendor_id: ranking.winner?.vendor_id ?? null` — when no ranking winner, vendor stays null
2. `validate()` does not check for null vendor on active rows
3. Submit handler sends `vendorId: null` for unassigned vendor group

## Fix (owner-approved)
1. Default `vendor_id` to System Vendor ('system') when `ranking.winner` is null
2. Add validate check: `activeRows.find(r => !r.vendor_id || r.vendor_id === 'null')` → error toast
3. Ensure System Vendor is always available in vendor dropdown as fallback

## Scope
- **1 file, ~10 lines:** `SmartPurchasePanel.jsx` (initialRows default + validate + vendorNamesById)
- **Risk:** LOW
