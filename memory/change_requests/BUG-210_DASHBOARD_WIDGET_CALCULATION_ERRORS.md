# BUG-210: Dashboard Widget Data Calculation Errors (4 Fixes)

**ID:** BUG-210
**Type:** BUG (logic errors in data computation)
**Priority:** P1 (HIGH — dashboard shows empty/misleading data for active restaurants)
**Risk:** MEDIUM (widget display logic only, no API/financial/auth changes)
**Sprint:** POS 5.0
**Reported by:** Owner (2026-07-20 — "why there is no data in kunafa mahal")
**Source:** OWNER-REPORTED + AGENT-INVESTIGATED
**Date:** 2026-07-20
**Related:** CR-081 (design alignment), CR-072 (inventory Phase 1)

---

## Description

4 calculation/display bugs in dashboard widgets cause empty states and wrong data even when the backend APIs return valid data. Investigated with Kunafa Mahal (RID 689) which has 116 stock items, 1,146 VIL records, and active consumption data — yet Reorder Forecast and Cost Trend show empty.

---

## Code Reality: PARTIAL — widgets exist, computation logic is wrong

---

## Duplicate Check: DISTINCT
- BUG-207 covered Recipe Cost=₹0 (fixed via VIL cross-join) — different root cause
- CR-081 was design-only (table structure) — didn't touch computation logic
- These 4 bugs are NEW findings from data investigation

---

## Evidence

- **Screenshots:** Owner-provided 2026-07-20 (dashboard with Reorder Forecast empty, Cost Trend empty, KPI=0)
- **API probes:** Confirmed stock-inventory has 116 items (67 with calQuantity, many negative), VIL has 1,146 records (date range Feb-Jul), DCR has 2 items with consumption
- **Steps to reproduce:** Login as owner@kunafamahal.com → navigate to Inventory Dashboard
- **Source:** OWNER-REPORTED
- **Confidence:** CONFIRMED (agent reproduced via API curl + code trace)

---

## 4 Fixes

### Fix 1: Reorder Forecast — negative-stock items filtered out (P0)

**File:** `widgets/ReorderForecastWidget.jsx` ~line 42
**Current:** `.filter(r => Number.isFinite(r.daysLeft) && r.daysLeft >= 0)`
**Problem:** Items with negative `calQuantity` (out of stock) get negative `daysLeft` → excluded. These are the MOST urgent items.
**Fix:** Remove `>= 0` check. Clamp `daysLeft = Math.max(0, daysLeft)` so out-of-stock items show as "0d" red badge.
**Impact:** Reorder Forecast table populates with real data. For Kunafa Mahal: ~50 out-of-stock items will show.

### Fix 2: Cost Trend — comparison window too narrow (P0)

**File:** `widgets/CostTrendWidget.jsx` ~line 18-22
**Current:** Compares last 7 days vs 7-14 days ago. Same ingredient must have purchases in BOTH windows.
**Problem:** Kunafa Mahal has 3 ingredients in this-week and 3 DIFFERENT ingredients in prior-week → 0 overlap → "No purchase history."
**Fix:** Widen to 30d vs prior 30d (consistent with KPI "Cost Change · 30D" which already uses 30d windows). Also append ingredient unit to rate display (e.g., "₹650 / kg" per mockup).
**Impact:** Cost Trend table populates. For Kunafa Mahal: many ingredients have purchases in both 30d windows.

### Fix 3: KPI Reorder Alerts ignores out-of-stock items without velocity (P1)

**File:** `InventoryIntelligencePanel.jsx` ~line 141
**Current:** Only counts items where `daysLeft <= 7`. Items with `avgDaily = 0` → `daysLeft = Infinity` → not counted. Out-of-stock items with no consumption history are invisible.
**Fix:** Also count items where `onHand <= 0` as reorder alerts (out-of-stock = 0 days left by definition, regardless of velocity).
**Impact:** KPI jumps from 0 to real count (Kunafa Mahal: ~50 out-of-stock items).

### Fix 4: Cost Trend — rate display missing units (P2)

**File:** `widgets/CostTrendWidget.jsx` — rate column
**Current:** Shows `₹123.45`
**Mockup:** Shows `₹650 / kg`
**Fix:** Append ingredient's unit from VIL data to the rate display.
**Impact:** Visual match with mockup.

---

## Blast Radius

- **Files:** 3 (ReorderForecastWidget.jsx, CostTrendWidget.jsx, InventoryIntelligencePanel.jsx)
- **Hotspot files:** NONE
- **Lines changed:** ~20 total
- **Scope:** SMALL — widget computation logic only, no API changes

---

## Fast Lane Eligibility: NO (3 files, MEDIUM risk)

---

## Next: Planning Gate 2 → Gate 3 → Implementation
