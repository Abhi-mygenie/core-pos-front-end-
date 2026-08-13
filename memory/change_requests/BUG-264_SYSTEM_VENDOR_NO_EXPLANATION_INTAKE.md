# BUG-264 — System Vendor: No Explanation/Tooltip

**ID:** BUG-264
**Type:** BUG
**Severity:** P2
**Risk:** LOW
**Source:** OWNER-REPORTED (2026-07-27)
**Duplicate Check:** DISTINCT (RELATED to BUG-227 vendor history, BUG-242 null vendor — different scope)
**Related:** BUG-227, BUG-242, CR-078

## Description
When no vendor history exists for an ingredient in Smart Purchase, it defaults to "System Vendor." There is no tooltip or explanation of what this means. Users are confused — don't understand it = "no vendor assigned yet, please pick one."

## Evidence
- `SmartPurchasePanel.jsx:58`: `vendor_id: ranking.winner?.vendor_id ?? 'system'`
- Line 101: `m['system'] = 'System Vendor'`
- No tooltip, help text, or info icon anywhere
- On submit, System Vendor vendor_id → `null` (line 164) — correct backend behavior, confusing UX

## Blast Radius
- 1-2 files, ~10 lines (tooltip addition)
- Scope: SMALL

## Fix Recommendation
Add tooltip/info icon next to "System Vendor" option: "No purchase history found for this ingredient. Select a vendor before submitting." Planning skip eligible (LOW risk).

## Next
Planning Gate 2 (or FAST LANE if owner approves)
