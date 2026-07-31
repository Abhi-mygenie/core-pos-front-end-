# Investigation Report — Smart Purchase Stock Discrepancy (2 Bugs)

**Date:** 2026-07-24
**Classification:** DATA_ISSUE + FE_DISPLAY_INCONSISTENCY
**Confidence:** HIGH
**Steps used:** 10/10

---

## 1. Summary

Two related bugs stem from the same root cause: **the backend returns 3 different stock quantity fields** (`quantity`, `cal_quantity`, `display_qty`) that represent the same stock in **different units** — and Smart Purchase and Current Stock read DIFFERENT fields.

| Page | Field Used | Unit Domain | Example |
|------|-----------|-------------|---------|
| **Smart Purchase** | `calQuantity` (from `cal_quantity`) | Small unit (gm/ml/piece) | **4604 gm** |
| **Current Stock** | `displayQty \|\| quantity` | Display unit (kg/ltr) | **4.60 kg** |

Additionally, `display_qty` doesn't always match `quantity`:
- Biscoff Biscuit: `quantity=6.843`, `display_qty=6.91`, `cal_quantity=6843` — **display_qty is 0.07 off from quantity**

---

## 2. Bug 1: Stock Added > Suggested → Stock Not Updating

**Root cause: BACKEND_TIMING + FE_RE-FETCH**

### Data Flow:
```
User fills Smart Purchase → clicks Submit
  → POST /add-purchase (per vendor)
  → On success → fetchPlan() → getStockInventory()
  → computePlan() re-runs → on_hand = item.calQuantity
```

### Findings:
1. **FE does re-fetch** after submit (`fetchPlan()` at SmartPurchasePanel.jsx L182) — ✅ correct
2. **No FE caching** — `getStockInventory()` makes a fresh API call every time — ✅ correct
3. **Probable cause:** Backend doesn't immediately update `cal_quantity` / `quantity` / `display_qty` after `add-purchase`. There may be a queue/batch process that recalculates stock. This creates a window where:
   - The purchase is recorded (so order status changes — "submitted")
   - But stock quantities are not yet recalculated
   - The re-fetch returns stale quantities
4. **"Status updates but stock doesn't"** — Could also be: after adding more than suggested, the item's `gap` becomes ≥ 0, so it DISAPPEARS from Smart Purchase list (B2 filter). User sees it gone (interprets as "status changed") but navigating to Current Stock still shows old stock number (because Current Stock reads `displayQty` which is also stale).

### Classification: **BACKEND_TIMING** — FE re-fetch is correct, but backend stock recalculation is not immediate.

---

## 3. Bug 2: Stock Difference Between Smart Purchase and Current Stock

**Root cause: FE_DISPLAY_INCONSISTENCY — different fields used**

### Evidence (live curl):
```
Base Cream:
  quantity    = 4.604 (kg-scale)
  cal_quantity = 4604.00 (gm — small unit)
  display_qty  = 4.60 (kg — display unit)

Biscoff Biscuit:
  quantity    = 6.843
  cal_quantity = 6843.00
  display_qty  = 6.91  ← DOES NOT MATCH quantity (0.07 off)
```

### Why they differ:
| Smart Purchase | Current Stock | Result |
|---|---|---|
| Shows `4604 gm` (calQuantity) | Shows `4.60 kg` (displayQty) | Same stock, different unit — looks like mismatch |
| Shows raw small-unit precision | Shows rounded display-unit | Rounding differences compound |
| Uses `item.smallUnit \|\| item.unit` | Uses `item.displayUnit \|\| item.unit` | Different unit labels |

### Classification: **FE_DISPLAY_INCONSISTENCY** — both pages show the same stock but using different backend fields with different precision/units.

---

## 4. Hypotheses Tested

| # | Hypothesis | Result | Evidence |
|---|-----------|--------|---------|
| H1 | Smart Purchase reads cached data | **ELIMINATED** | No cache layer. `getStockInventory()` is a direct API call. |
| H2 | Different API endpoints for each page | **ELIMINATED** | Both use `STOCK_INVENTORY` endpoint via `getStockInventory()` |
| H3 | Different FIELDS used from same response | **CONFIRMED** | Smart Purchase: `calQuantity`. Current Stock: `displayQty \|\| quantity`. |
| H4 | Backend doesn't immediately update stock after purchase | **SUSPECTED (HIGH)** | Can't confirm without backend access, but timing gap is the only explanation for Bug 1 |

---

## 5. Recommendations

### Fix for Bug 2 (FE — display consistency):

**Option A: Smart Purchase shows display units (like Current Stock)**
- Change `purchasePlanner.js:127`: `onHand = Number(item.displayQty) || Number(item.calQuantity) || 0`
- Change `purchasePlanner.js:126`: `unit = item.displayUnit || item.smallUnit || item.unit`
- **Risk:** Breaks planner math — calQuantity is the precise small-unit value used for velocity/gap calculations
- **NOT recommended**

**Option B: Smart Purchase shows calQuantity BUT converts to display units for UI**
- In `purchasePlanner.js`, keep math in small units (calQuantity)
- Add `display_on_hand` field: convert calQuantity back to display units for the UI
- AutoShoppingList shows `display_on_hand` + `display_unit` instead of raw `on_hand` + `unit`
- **Recommended** — keeps math correct, UI matches Current Stock

**Option C: Both pages use the same field**
- Change Current Stock to also use `calQuantity` for display — would show "4604 gm" everywhere
- **Not recommended** — users expect kg/ltr in Current Stock

### Fix for Bug 1 (Backend timing):

**FE workaround:** Add a 2-3 second delay before re-fetch after submit, or show a "Stock is updating..." message and re-fetch after a timeout.

**Proper fix:** Backend should update `quantity`/`cal_quantity`/`display_qty` synchronously on `add-purchase` before returning 200. **This is a BACKEND issue.**

---

## 6. Owner Decision Required

| # | Question | Options |
|---|----------|---------|
| Q1 | Bug 2 display fix approach? | Option B (recommended) — convert calQuantity to display units in planner output |
| Q2 | Bug 1 — should FE add a delayed re-fetch or is this a backend fix? | FE workaround (delay) / Backend fix (sync recalc) / Both |

---

## 7. Evidence Artifacts

- Curl: stock-inventory response showing 3 different qty fields (step 7)
- Code: `purchasePlanner.js:127` — `onHand = calQuantity`
- Code: `CurrentStockPanel.jsx:322` — `displayQty || quantity`
- Code: `SmartPurchasePanel.jsx:182` — `fetchPlan()` after submit

---

## BUG 3: Unselected Items Appear in Purchase Review Screen

**Date:** 2026-07-24
**Classification:** FE_BUG (CR-103 gap)
**Confidence:** HIGH
**Steps used:** 3/10

### Summary

User didn't want "Morzella cheese" but it appears in the Review & Submit screen showing "System Vendor · 1 item · Morzella cheese · 10 gm @ ₹80 = ₹800.00". The user never opted into purchasing this item.

### Root Cause: AUTO-FILLED RATE DEFEATS CR-103 ACTIVE ROWS FILTER

Data flow:
```
1. computePlan() generates row: Morzella cheese, on_hand=0, gap=-10, suggest_qty=10
2. rankVendors() finds historical purchase → winner = System Vendor, unit_price=80
3. initialRows build (SmartPurchasePanel.jsx L55-57):
     rate: ranking.winner?.unit_price ?? ''  →  rate = 80  (AUTO-FILLED!)
     qty: r.suggest_qty                      →  qty = 10
4. CR-103 activeRows filter (L104):
     activeRows = rows.filter(r => Number(r.rate) > 0)
     → rate=80 > 0 → row is ACTIVE even though user never touched it
5. groupedByVendor includes it → Review screen shows it → submit would purchase it
```

**The gap:** CR-103 used `rate > 0` as the signal for "user wants to buy this". But vendor ranking auto-fills rate from purchase history, making ALL rows with vendor history "active" by default. This defeats the purpose of CR-103's "skip unfilled rows" logic.

### Evidence

- Screenshot 1: "Morzella cheese" row with rate=80 auto-filled, vendor="System Vendor · ₹80"
- Screenshot 2: Review screen shows "System Vendor 1 item · Morzella cheese · 10 gm @ ₹80 = ₹800.00"
- Code: `SmartPurchasePanel.jsx L57`: `rate: ranking.winner?.unit_price ?? ''` — auto-fills rate
- Code: `SmartPurchasePanel.jsx L104`: `activeRows = rows.filter(r => Number(r.rate) > 0)` — rate=80 passes

### Recommended Fix

**Option A (Minimal — recommended): Don't auto-fill `rate` in initialRows. Show as suggestion hint instead.**

Change SmartPurchasePanel.jsx L57:
```diff
- rate: ranking.winner?.unit_price ?? '',
+ rate: '',                                           // CR-103 fix: don't auto-fill; user must enter
+ suggestedRate: ranking.winner?.unit_price ?? null,   // hint only
```

Change AutoShoppingList.jsx rate input to show suggestion below:
```jsx
<Input value={r.rate ?? ''} ... placeholder={r.suggestedRate ? `₹${r.suggestedRate}` : '₹'} />
{r.suggestedRate && !r.rate && (
  <div className="text-[10px] text-blue-500 font-medium mt-0.5">
    last: ₹{r.suggestedRate}
  </div>
)}
```

**Impact:** User must explicitly enter rate for each item they want. Rows without rate are truly "not selected". Suggested rate shown as hint (like suggest qty).

**Option B: Track `userModified` boolean per row**
- Add `touched: false` to each initialRow
- Set `touched: true` on any `onRowChange`
- `activeRows = rows.filter(r => r.touched && Number(r.rate) > 0)`
- More complex but preserves auto-fill convenience

### Owner Decision Required

| # | Question | Options |
|---|----------|---------|
| Q3 | Should rate auto-fill from vendor history? | A: No (show as hint) / B: Yes but track user touch |

### Scope (if Option A approved)
- **2 files, ~6 lines:** SmartPurchasePanel.jsx (initialRows), AutoShoppingList.jsx (rate hint)
- Risk: LOW — UI-only change, no API/transform impact

---

## BUG 4: Stock Not Credited After Successful Purchase (Transaction Evidence)

**Date:** 2026-07-24
**Classification:** BACKEND_BUG
**Confidence:** HIGH (curl-verified)
**Account:** owner@cafe103.com

### Transaction Evidence

1. **Before:** Tandoori Chicken Indian — on_hand=0, gap=-332, suggest=332
2. **User action:** Entered qty=332, rate=40, no vendor selected → submitted as "(unassigned)"
3. **Submit succeeded:** Review showed "332 piece @ ₹40 = ₹13280.00"
4. **Purchase recorded:** `vendor-item-list` confirms purchase ID=13857, qty=332, amount=13280, vendor_id=null ✅
5. **Stock STILL ZERO after purchase:**
   ```
   curl /stock-inventory → Tandoori Chicken Indian:
     quantity: 0.000
     cal_quantity: 0.00
     display_qty: 0.00
   ```
6. **Smart Purchase re-fetched:** Item reappears with gap=-10 (stock_alert origin, threshold=10, on_hand=0)
7. **Rate auto-filled from new purchase history:** "System Vendor · ₹40" → appears in review again (Bug 3 compounds)

### Root Cause Chain:
```
Purchase submitted → backend records purchase (vendor-item-list: ✅)
                   → backend does NOT update stock quantities (quantity/cal_quantity/display_qty: ❌)
                   → FE re-fetches → gets on_hand=0 → item persists in list
                   → vendor ranking finds new purchase history → auto-fills rate=40
                   → row becomes "active" → appears in review again
```

### Classification: **BACKEND_BUG** — purchase recorded but stock not credited. FE is correct.

---

## CONSOLIDATED OWNER DECISIONS

| # | Question | Context | Decision |
|---|----------|---------|----------|
| Q1 | Bug 2: How should Smart Purchase show stock? | SP shows 4604 gm, Current Stock shows 4.60 kg | **A: Convert to display units in SP UI** ✅ APPROVED |
| Q2 | Bug 1+4: Backend doesn't credit stock after purchase | Purchase recorded but quantity unchanged | **Backend brief filed** at `BACKEND_BLOCKERS_BRIEF_2026_07_22.html` — P0 CRITICAL. No FE workaround possible. |
| Q3 | Bug 3: Should rate auto-fill from vendor history? | Auto-filled rate makes items "active" without user intent | **A: Don't auto-fill, show as "suggested"** ✅ APPROVED. Owner note: "this is stock input, not actual purchase" |
| Q4 | Bug 4: Should FE block submit when vendor is unselected? | User submitted with null vendor_id | **Block submit + default to System Vendor** ✅ APPROVED. If no vendor is selected, System Vendor should be pre-selected by default. |

### Action Items from Decisions:

**FE fixes to implement (3 items):**
1. **Q1 → CR/BUG:** Convert Smart Purchase on-hand to display units (purchasePlanner.js + AutoShoppingList.jsx)
2. **Q3 → CR-103 amendment:** Don't auto-fill rate; show as "suggested: ₹40" hint. User must enter rate to opt in.
3. **Q4 → CR-103 amendment:** Default vendor selection to System Vendor when no history exists. Block submit for rows with no vendor.

**Backend fix (filed):**
- Q2 → Backend brief appended to `BACKEND_BLOCKERS_BRIEF_2026_07_22.html` — `add-purchase` must sync-update `quantity`/`cal_quantity`/`display_qty`
