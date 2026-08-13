# BUG-296 — Food Court Report vs Item-Wise Report Data Mismatch

**ID:** BUG-296  
**Type:** BUG  
**Priority:** P1 — HIGH  
**Risk:** HIGH (report data integrity, two screens show different numbers for same date range)  
**Status:** INTAKE  
**Gate:** 1  
**Sprint:** pos_5_1  
**Registered:** 2026-08-05  
**Source:** OWNER-REPORTED  

---

## Description

Food Court report and Item-Wise (Item Sales Hybrid) report show mismatched data for the same date range. Owner identified discrepancy when checking June data on `owner@shimlaqohfoodcourt.com`.

## Evidence
- Screenshot: not provided
- Steps to reproduce: Login as `owner@shimlaqohfoodcourt.com` → Food Court report (June) → Item-Wise report (June) → compare totals/line items
- Curl output: not applicable (FE comparison)
- Source: OWNER-REPORTED
- Confidence: CONFIRMED (owner reproduced)
- Test credentials: `owner@shimlaqohfoodcourt.com` (password: owner to provide)

## Area
Reports — Food Court (`/reports-module/food-court`) vs Item Sales Hybrid (`/reports-module/items`)

## Code Reality Check
- `FoodCourtMockup.jsx` — exists, uses `getFoodCourtForRange()` from `foodCourtService.js`
- `ItemSalesHybridMockup.jsx` — exists, uses `getItemSalesAggregated()` + `fetchInsightsItems()` from `insightsService.js`
- Both reports pull from `order-logs-report` backend endpoint but apply DIFFERENT filters/grouping
- **Code Reality: FULL — both reports exist. Mismatch is likely in data aggregation logic or filter differences.**

## Duplicate Check
- `DISTINCT` — no prior bug registered for food-court vs item-wise cross-report mismatch
- RELATED: CR-013 (Food Court Report build), CR-013-AUDIT (Audit tab), CR-011 Phase 3 (S5 Item Sales)

## Blast Radius
- `foodCourtService.js` — aggregation logic
- `insightsService.js` — item sales aggregation
- Possibly `orderTransform.js` (filter differences)
- ~2-3 files, MEDIUM blast radius
- Hotspot files: NO

## Severity Rubric
P1 — Feature broken (reports show inconsistent data, no workaround, financial data integrity at risk)

## Risk Classification
- **Risk: HIGH**
- Trigger: Reports, data integrity, financial figures
- Fast Lane eligible: NO

## Open Questions
- OQ-1: Which specific metrics differ? (item totals, quantities, revenue?)
- OQ-2: Is it all dates or only June?
- OQ-3: Login credentials for `owner@shimlaqohfoodcourt.com`?

## Next Step
INVESTIGATION recommended — curl-probe both report APIs with same date range and compare raw responses before writing plan.
