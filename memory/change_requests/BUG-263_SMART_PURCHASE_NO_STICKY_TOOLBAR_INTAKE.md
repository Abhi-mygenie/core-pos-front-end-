# BUG-263 — Smart Purchase: No Sticky Toolbar

**ID:** BUG-263
**Type:** BUG
**Severity:** P2
**Risk:** LOW
**Source:** OWNER-REPORTED (2026-07-27)
**Duplicate Check:** DISTINCT
**Related:** CR-114, CR-115, CR-078

## Description
Smart Purchase toolbar (horizon picker + Review & Submit) is not sticky. With 100+ items, user must scroll the entire list to access controls. Submit buttons exist at top and bottom but neither sticks during scroll.

## Evidence
- `SmartPurchasePanel.jsx:198`: Toolbar div has NO `sticky` class
- Lines 206 + 265: Two submit buttons (top + bottom) but neither is fixed/sticky

## Steps to Reproduce
1. Login → Inventory → Smart Purchase
2. Scroll down through 100+ items
3. Toolbar disappears from view — no sticky header

## Blast Radius
- 1 file (`SmartPurchasePanel.jsx`), ~5 lines (CSS class addition)
- Scope: SMALL

## Fix Recommendation
Add `sticky top-0 z-10 bg-white` to toolbar div (line 198). Planning skip eligible (CSS only, LOW risk).

## Next
Planning Gate 2 (or FAST LANE if owner approves)
