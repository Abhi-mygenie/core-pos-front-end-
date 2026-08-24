# BUG-262 — "Coming Soon" Placeholders Visible in Production

**ID:** BUG-262
**Type:** BUG
**Severity:** P0
**Risk:** MEDIUM
**Source:** OWNER-REPORTED (2026-07-27, screenshot-confirmed)
**Duplicate Check:** DISTINCT
**Related:** BUG-266 (wastage backend-blocked)

## Description
"Coming Soon" text is visible to users in production across multiple locations. This is unacceptable for a live product — development-phase placeholders must be hidden.

## Evidence
- Screenshot: Owner-provided (Wastage Insights + Top Wasted Items showing "Coming soon — awaiting backend wastage endpoint")
- Full app audit:

| Location | Text | User-Visible? |
|----------|------|:---:|
| `InventoryIntelligencePanel.jsx:61-73` | WastagePlaceholder: "Coming soon — awaiting backend wastage endpoint" | **YES — screenshot** |
| `InventorySetupPanel.jsx:269` | Import button `title="Coming soon"` | YES (tooltip) |
| `Sidebar.jsx:304,317` | "Coming Soon" sidebar items | YES |
| `LoginPage.jsx:102,109` | "Coming Soon" cards | YES |
| `CollectPaymentPanel.jsx:1341` | Code comment only | NO |
| `FilterBar.jsx:252` | Code comment only | NO |

## Steps to Reproduce
1. Login → Navigate to Inventory → Intelligence Dashboard
2. Scroll to bottom → "Wastage Insights" and "Top Wasted Items" cards show "Coming soon"
3. Also: Sidebar has "Coming Soon" items, Login page has "Coming Soon" cards

## Blast Radius
- 4 files with user-visible "Coming Soon" text
- Scope: MEDIUM

## Root Cause
Placeholder components/text left in production code from development phase. Backend wastage endpoints don't exist yet, but UI shouldn't expose this.

## Fix Recommendation
- Wastage widgets: remove entirely OR replace with hidden/collapsed state
- Sidebar: hide "Coming Soon" items
- LoginPage: remove "Coming Soon" cards
- InventorySetup: remove tooltip
Needs planning (multi-file, UX decision on what replaces the placeholders).

## Next
Planning Gate 2
