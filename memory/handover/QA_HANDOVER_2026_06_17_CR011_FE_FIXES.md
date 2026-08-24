# QA HANDOVER — 2026-06-17 — CR-011 FE-Only Fixes (F-1, F-2, F-5, F-6, F-10)

## 1. Inherited from Plan (Verification Matrix results)

| Edit | File | Verification | Self-Test Result |
|------|------|-------------|:---:|
| F-1 | ItemSalesHybridMockup.jsx:301 | Variation label `[]`/null/`""`/`"default"` → "No Variation" | PASS |
| F-2 | HourlySalesMockup.jsx:128-134, 218-225 | BREAKFAST KPI [06–10) card added, grid-cols-6 | PASS |
| F-5 | ItemSalesHybridMockup.jsx:1120-1148 | By Station block removed from All Items tab | PASS |
| F-6 | PaymentsMockup.jsx:254-268, 520-560 | Daily Payment Trends + Cash vs Digital charts removed | PASS |
| F-10 | Sidebar.jsx:147, 495 | Room Transfers gated by `features.room` | PASS |

Compile: **webpack compiled with 1 warning** (pre-existing, 0 new from this session)

## 2. Test Cases

### TC-1: F-1 — Variation label defensive remap
**Steps:**
1. Login as palmhouse (owner@palmhouse.com)
2. Navigate to Insights → Sales Ledger → Item Ledger → Variations tab
3. Check variation table

**Expected:**
- No row shows `[]` as variation label
- Items without variations should show **"No Variation"** instead of `[]`
- Items with named variations (e.g., "single", "multi") should show their real names unchanged

---

### TC-2: F-2 — Breakfast KPI on Hourly Sales
**Steps:**
1. Navigate to Insights → Sales → Hourly Sales
2. Check KPI strip at the top

**Expected:**
- KPI strip now shows **6 cards** (was 5): Peak Hour · **Breakfast (06–10)** · Lunch (11–15) · Dinner (18–23) · Active Hours · Avg / Active Hour
- Breakfast card shows revenue for hours 06, 07, 08, 09
- Breakfast card shows percentage of total revenue
- Sunrise icon on the Breakfast card

---

### TC-3: F-5 — By Station block removed
**Steps:**
1. Navigate to Insights → Sales Ledger → Item Ledger → All Items tab
2. Look between the KPI strip and the item table

**Expected:**
- **No "By Station (Sold)" table** visible between KPI strip and the main item table
- The dedicated "By Station" **tab** (S18) should still exist and work normally
- No console errors

---

### TC-4: F-6 — Payment charts removed
**Steps:**
1. Navigate to Insights → Payments → Payments page
2. Scroll down past the donut chart

**Expected:**
- **No "Daily Payment Trends" stacked bar chart** visible
- **No "Cash vs Digital Trend" area chart** visible
- The Revenue by Payment Method **donut chart** should still render normally
- The Method Performance **table** should still render normally
- The "Daily Payment Breakdown" **table** should still render normally (if it existed before)
- No console errors

---

### TC-5: F-10 — Room Transfer sidebar gating
**Steps (cafe103 — no rooms):**
1. Login as cafe103 (owner@cafe103.com / Qplazm@10 — RID 644)
2. Navigate to Insights → expand sidebar
3. Look under "Locations" group

**Expected:**
- "Table-wise Sales" visible
- "Delivery Charges" visible
- **"Room Transfers" NOT visible** (hidden because cafe103 has `features.room = false`)

**Steps (palmhouse — has rooms):**
1. Login as palmhouse
2. Navigate to Insights → expand sidebar
3. Look under "Locations" group

**Expected:**
- "Room Transfers" **IS visible** (palmhouse has `features.room = true`)

---

## 3. Regression Tests

| # | What to verify | Why |
|---|---|---|
| R-1 | Item Ledger All Items tab loads without errors | F-5 removed JSX from this tab |
| R-2 | Item Ledger By Station **tab** (S18) still works | F-5 only removed the summary block, not the tab |
| R-3 | Item Ledger Variations tab data is correct | F-1 changed label logic |
| R-4 | Payments page loads without errors | F-6 removed chart components |
| R-5 | Hourly Sales page loads without errors | F-2 added new KPI |
| R-6 | Sidebar navigation still works for all Insights sub-items | F-10 added filter logic |

## 4. Registry Sync Confirmation
- Registry sync: PENDING (will be updated after QA pass)
- Items: F-1, F-2, F-5, F-6, F-10 (all under CR-011)
- Sprint: pos_5_0

## 5. Credentials + Environment
- URL: https://pos-frontend-deploy-23.preview.emergentagent.com
- cafe103: owner@cafe103.com / Qplazm@10 (RID 644)
- palmhouse: owner@palmhouse.com (check test_credentials.md for password)
