# BUG-241 — Smart Purchase: Rate Auto-Fills From Vendor History, Making Unselected Items Active

**Registered:** 2026-07-24
**Source:** INVESTIGATION (INVESTIGATION_SMART_PURCHASE_STOCK_DISCREPANCY_2026_07_24.md — Bug 3)
**Classification:** BUG (CR-103 gap)
**Priority:** P1
**Risk:** LOW
**Duplicate Check:** RELATED to CR-103. DISTINCT — CR-103 added activeRows filter but didn't account for auto-filled rate.
**Owner Decision:** Q3 APPROVED — don't auto-fill rate, show as "suggested" hint. Owner note: "this is stock input, not actual purchase"

---

## Summary
Vendor ranking auto-fills `rate: ranking.winner?.unit_price` (SmartPurchasePanel.jsx L57), making ALL rows with purchase history pass the `activeRows = rows.filter(rate > 0)` filter. Items appear in Review & Submit screen even when user didn't opt in.

## Root Cause
`SmartPurchasePanel.jsx L57`: `rate: ranking.winner?.unit_price ?? ''` pre-fills rate from history. CR-103's `activeRows` filter uses `rate > 0` as user-intent signal — defeated by auto-fill.

## Fix (owner-approved)
- Change `rate: ''` in initialRows (don't auto-fill)
- Add `suggestedRate: ranking.winner?.unit_price ?? null` as hint-only field
- AutoShoppingList rate input shows placeholder + "suggested: ₹40" hint below (like suggest_qty pattern)

## Scope
- **2 files, ~8 lines:** `SmartPurchasePanel.jsx` (initialRows), `AutoShoppingList.jsx` (rate hint)
- **Risk:** LOW — UI-only change
