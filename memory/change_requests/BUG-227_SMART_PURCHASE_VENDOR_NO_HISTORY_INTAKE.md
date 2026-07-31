# BUG-227 — Smart Purchase: Vendor Column Shows "No History" Though Vendors Exist

**ID:** BUG-227
**Type:** BUG
**Created:** 2026-07-22
**Severity:** P1 (HIGH)
**Risk:** MEDIUM
**Module:** Inventory — Smart Purchase (SmartPurchasePanel, vendorRanking.js)
**Duplicate Check:** NONE — fresh issue on vendor ranking display in smart purchase.
**Code Reality:** CONFIRMED — `vendorRanking.js:20-48`: `rankVendors(vendorItemList, ingredientId)` filters `vendorItemList` by `ingredient_id` match in purchase history. If a vendor exists in the master but has never purchased a specific ingredient, `candidates.length === 0` → returns `{ winner: null, reason: 'No vendor history' }`. Vendor master list is irrelevant to ranking.
**Source:** OWNER-REPORTED (session 2026-07-22, verbatim: "no vendor showing in purchase thought vendor is added")
**Confidence:** CONFIRMED (code + data-flow verified)

---

## Description

The Smart Purchase panel's vendor column shows **"No History"** for ingredients even when vendors have been added in the vendor master. 

Root cause: `rankVendors()` works on `vendorItemList` — which is a **purchase history** feed (past purchases per vendor per ingredient), NOT the vendor master list. 

- Owner adds Vendor "ABC Traders" in the Vendors tab → vendor master has "ABC Traders"
- "ABC Traders" has never purchased "Ghee" before → `vendorItemList` has 0 records for Ghee × ABC Traders
- `rankVendors(vendorItemList, gheeId)` → filters by `ingredient_id` → 0 candidates → "No vendor history"
- Owner expects "ABC Traders" to appear as a selectable vendor even with no prior history

The `vendorNamesById` map at `SmartPurchasePanel.jsx:84-88` does correctly map vendor IDs from `vendorItemList`, but does NOT include vendor master items that have no history.

---

## Evidence

- Code: `vendorRanking.js:20-22` — returns `'No vendor history'` when `vendorItemList` is empty for that `ingredientId`
- Code: `vendorRanking.js:28` — `filter(r => String(r.ingredient_id) === String(ingredientId))` — history-based filter
- Code: `SmartPurchasePanel.jsx:38` — `inventoryService.getVendorItemList()` fetches purchase history feed
- Code: `SmartPurchasePanel.jsx:21` — `ingredientsMaster` fetched separately but not cross-referenced with vendors
- Owner-reported: vendor added but smart purchase shows "No History"

---

## Blast Radius

- 3 files: `SmartPurchasePanel.jsx`, `vendorRanking.js`, possibly a new `SmartPurchaseRow.jsx` or child
- ~20-30 lines change (fetch vendor master + pass to ranking; update vendor dropdown to include master vendors)
- Hotspot: NO
- Scope: MEDIUM (2-3 files, data-flow change)

---

## Fix Plan (seeding — formal plan at Gate 3)

1. In `SmartPurchasePanel.jsx`: also fetch vendor master list (`inventoryService.getVendors()`)
2. Pass vendor master to `rankVendors()` or to the row component's vendor dropdown
3. Update `vendorNamesById` map to include all master vendors (not just history vendors)
4. In the vendor dropdown on each row: show history-ranked vendors first, then remaining master vendors as unranked options
5. `rankVendors()` update: accept optional `vendorMaster` param; return master vendors as `alternatives` with `unit_price: null` when no history

---

## Next
Planning Gate 2 → Gate 3 → Implementation
