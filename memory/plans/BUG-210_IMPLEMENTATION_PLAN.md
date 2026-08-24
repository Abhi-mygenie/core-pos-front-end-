# BUG-210 Impact Analysis + Implementation Plan (Gate 2+3)

**Date:** 2026-07-20
**Item:** BUG-210 — Dashboard Widget Data Calculation Errors (4 Fixes)
**Risk:** MEDIUM (widget computation only, no API/financial/auth)
**Code Reality:** PARTIAL — widgets exist, computation logic is wrong

---

## Conflict Pre-Check

| File | Last Modified By | Conflict? |
|---|---|---|
| `widgets/ReorderForecastWidget.jsx` | CR-081 WU-1c (this session) | NO — grid borders only, filter logic untouched |
| `widgets/CostTrendWidget.jsx` | CR-081 WU-1a (this session) | NO — table rewrite, but date window logic preserved from original |
| `InventoryIntelligencePanel.jsx` | CR-081 Screen 2 (prior session) | NO — KPI computation untouched by CR-081 |

No active conflicts. All 3 files safe to modify.

---

## Fix 1: Reorder Forecast — negative-stock filter (P0)

### Data Flow Trace
```
API: getStockInventory() → 116 items (67 with calQuantity, many NEGATIVE)
API: getDailyConsumptionReport(7d) → 2 items with consumption
Transform: computeVelocity(dcrSummary, stockItem, horizonDays)
Compute: daysLeft = onHand / velocity
  → onHand=-82211, velocity=643/day → daysLeft = -127.9 (NEGATIVE)
Filter: .filter(r => Number.isFinite(r.daysLeft) && r.daysLeft >= 0)
  → EXCLUDED ❌ (the `>= 0` check kills it)
```

### Edit Spec

**File:** `widgets/ReorderForecastWidget.jsx`

**Edit 1a — Line 30:** Clamp daysLeft
```
Current:  const daysLeft = velocity > 0 ? onHand / velocity : Infinity;
New:      const rawDays = velocity > 0 ? onHand / velocity : Infinity;
          const daysLeft = Number.isFinite(rawDays) ? Math.max(0, rawDays) : Infinity;
```

**Edit 1b — Line 38:** Remove `>= 0` from filter (now unnecessary since clamped)
```
Current:  .filter(r => Number.isFinite(r.daysLeft) && r.daysLeft >= 0)
New:      .filter(r => Number.isFinite(r.daysLeft))
```

**Also add:** Items with `onHand <= 0` and no velocity → force daysLeft = 0 (out-of-stock)
```
After line 30 (inside .map):
  // BUG-210: Out-of-stock items with no velocity are MOST urgent
  if (onHand <= 0 && !Number.isFinite(rawDays)) daysLeft = 0;
```

Wait — that changes the const. Revised:
```
Current (lines 28-31):
      const velocity = computeVelocity(dcrByIng.get(String(item.id)), item, horizonDays);
      const onHand   = Number(item.calQuantity) || 0;
      const daysLeft = velocity > 0 ? onHand / velocity : Infinity;
      const suggestReorder = velocity > 0 ? Math.ceil(velocity * horizonDays) - onHand : 0;

New:
      const velocity = computeVelocity(dcrByIng.get(String(item.id)), item, horizonDays);
      const onHand   = Number(item.calQuantity) || 0;
      // BUG-210 Fix 1: Clamp negative daysLeft to 0. OOS items without velocity = 0d (most urgent).
      const rawDays = velocity > 0 ? onHand / velocity : (onHand <= 0 ? 0 : Infinity);
      const daysLeft = Number.isFinite(rawDays) ? Math.max(0, rawDays) : rawDays;
      const suggestReorder = velocity > 0 ? Math.max(0, Math.ceil(velocity * horizonDays) - onHand) : (onHand <= 0 ? Math.abs(onHand) : 0);
```

**Edit 1c — Line 38:** Simplify filter
```
Current:  .filter(r => Number.isFinite(r.daysLeft) && r.daysLeft >= 0)
New:      .filter(r => Number.isFinite(r.daysLeft))
```

**Verification:** Reorder Forecast table shows rows. For Kunafa Mahal: items like Butter, Milk, Coffee Beans appear with "0d" red badge.

---

## Fix 2: Cost Trend — widen window to 30d (P0)

### Data Flow Trace
```
VIL: 1,146 records, date range 2026-02-21 to 2026-07-19
Current window: thisWeek=0-7d, priorWeek=7-14d
  → 3 ingredients in thisWeek, 3 DIFFERENT in priorWeek → 0 overlap → empty
30d window: thisMonth=0-30d, priorMonth=30-60d
  → Many ingredients overlap both windows → data renders
```

### Edit Spec

**File:** `widgets/CostTrendWidget.jsx`

**Edit 2a — Lines 16-17:** Widen date windows
```
Current:
    const ws = new Date(n); ws.setDate(n.getDate() - 7);
    const ps = new Date(n); ps.setDate(n.getDate() - 14);

New:
    // BUG-210 Fix 2: Widen to 30d vs prior 30d (consistent with KPI "Cost Change · 30D")
    const ws = new Date(n); ws.setDate(n.getDate() - 30);
    const ps = new Date(n); ps.setDate(n.getDate() - 60);
```

**Edit 2b — Lines 28-29:** Update window labels for clarity
```
Current:
      if (d >= ws) entry.thisW.push(price);
      else if (d >= ps) entry.priorW.push(price);

(unchanged — same logic, just wider windows)
```

**Edit 2c — Line 43:** Add unit to row data
```
Current:
        return { name: e.name, currentRate: thisAvg, delta, sparkData };

New:
        // BUG-210 Fix 4: Include unit from VIL Quantity field for display
        return { name: e.name, currentRate: thisAvg, delta, sparkData, unit: e.unit || '' };
```

Need to capture unit in the loop:
```
Current (line 22):
      if (!byIng.has(key)) byIng.set(key, { name: r.Ingredient_Name || 'Unknown', thisW: [], priorW: [], history: [] });

New:
      if (!byIng.has(key)) byIng.set(key, { name: r.Ingredient_Name || 'Unknown', thisW: [], priorW: [], history: [], unit: '' });
      // BUG-210: Extract unit from Quantity field "3 gm" → "gm"
      if (!byIng.get(key).unit) {
        const qParts = String(r.Quantity || '').trim().split(/\s+/);
        if (qParts.length >= 2) byIng.get(key).unit = qParts[qParts.length - 1];
      }
```

**Edit 2d — Line 79:** Display rate with unit
```
Current:
                    ₹{r.currentRate.toFixed(2)}

New:
                    ₹{r.currentRate.toFixed(0)}{r.unit ? ` / ${r.unit}` : ''}
```

**Edit 2e — Line 101 (footer text):** Update period description
```
Current:
      <p className="text-[10px] text-slate-400 mt-2">This week vs previous week · rate change per unit</p>

New:
      <p className="text-[10px] text-slate-400 mt-2">Last 30 days vs prior 30 days · rate change per unit</p>
```

**Verification:** Cost Trend table shows ingredients with rates like "₹650 / kg" and sparkline trends.

---

## Fix 3: KPI Reorder Alerts — count OOS items (P1)

### Data Flow Trace
```
stock: 116 items, ~50 with quantity <= 0
DCR: 2 items with consumption
Current logic: count items where daysLeft <= 7
  → daysLeft computed only when avgDaily > 0 (only 2 items)
  → 114 items have avgDaily=0 → daysLeft=Infinity → not counted
  → Even items with qty=0 (out of stock) are invisible to the KPI
```

### Edit Spec

**File:** `InventoryIntelligencePanel.jsx`

**Edit 3a — Lines 135-144:** Add OOS counting
```
Current:
    (stock || []).forEach(item => {
      if (item.isSubRecipe) return;
      const onHand = Number(item.calQuantity) || 0;
      const summary = dcrMap.get(String(item.id));
      const avgDaily = summary ? (Number(summary.total_consumed || 0) / 7) : 0;
      const daysLeft = avgDaily > 0 ? onHand / avgDaily : Infinity;
      if (Number.isFinite(daysLeft) && daysLeft <= 7) {
        reorderAlerts++;
        lowStockItems.push({ id: item.id, name: item.name, qty: onHand, unit: item.smallUnit || item.unit || '', daysLeft });
      }
    });

New:
    (stock || []).forEach(item => {
      if (item.isSubRecipe) return;
      const onHand = Number(item.calQuantity) || 0;
      const summary = dcrMap.get(String(item.id));
      const avgDaily = summary ? (Number(summary.total_consumed || 0) / 7) : 0;
      const rawDays = avgDaily > 0 ? onHand / avgDaily : (onHand <= 0 ? 0 : Infinity);
      const daysLeft = Number.isFinite(rawDays) ? Math.max(0, rawDays) : rawDays;
      // BUG-210 Fix 3: Count items with daysLeft <= 7 OR out-of-stock (onHand <= 0)
      if (Number.isFinite(daysLeft) && daysLeft <= 7) {
        reorderAlerts++;
        lowStockItems.push({ id: item.id, name: item.name, qty: onHand, unit: item.smallUnit || item.unit || '', daysLeft });
      }
    });
```

**Verification:** KPI "Reorder Alerts" shows real count (~50 for Kunafa Mahal). Low-Stock Alerts strip populates.

---

## Scope Lock

**Files WILL change:**
1. `widgets/ReorderForecastWidget.jsx` — Fix 1 (filter + clamp + suggest)
2. `widgets/CostTrendWidget.jsx` — Fix 2 + Fix 4 (window + unit)
3. `InventoryIntelligencePanel.jsx` — Fix 3 (KPI OOS counting)

**Files WILL NOT change:**
- InventoryTabBar.jsx ❌
- CurrentStockPanel.jsx ❌
- StockAuditPanel.jsx ❌
- SmartPurchasePanel.jsx ❌
- InventorySetupPanel.jsx ❌
- Any service/transform/API files ❌

---

## Verification Matrix

| Fix | File | How to Verify |
|---|---|---|
| 1 | ReorderForecast | Table shows rows for Kunafa Mahal. Butter/Milk/Coffee Beans visible with "0d" red badge. |
| 2 | CostTrend | Table shows ingredients with rates. "No purchase history" message gone for Kunafa Mahal. |
| 3 | KPI | Reorder Alerts > 0 for Kunafa Mahal. Low-Stock Alerts strip visible. |
| 4 | CostTrend | Rate column shows "₹650 / kg" format (with unit). |

---

## Post-Code Registry Checklist
- [ ] registry.json: BUG-210 status → IMPLEMENTED
- [ ] BUG_TRACKER.md: row updated
- [ ] FILE_OWNERSHIP.md: 3 files listed
- [ ] Code markers: `// BUG-210` in every modified file
- [ ] Compile: 0 new warnings
