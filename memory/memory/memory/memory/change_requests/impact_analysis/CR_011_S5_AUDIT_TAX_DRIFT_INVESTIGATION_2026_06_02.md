# CR-011 AUDIT INVESTIGATION REPORT — S5 Item Sales Tax Drift Analysis

**Date:** 2026-06-02/03 (CORRECTED 2026-06-03)
**Restaurant:** Palm House (rid=541)
**Data Range:** April 1 – May 31, 2026
**Orders Analyzed:** 2,183 orders, 7,156 sold lines
**Prepared by:** Agent session 2026-06-02, CORRECTED 2026-06-03

---

## ⚠️ CORRECTION NOTICE (2026-06-03)

**§4.2 "May 9 Incident" was WRONG.** Re-investigation on 2026-06-03 found:
- The "70 zero-GST orders" were **alcohol/beer orders** (Corona, Budweiser, Kingfisher, Mojito, etc.) with `tax_rate=0%` in product config — correctly ₹0 GST.
- Only **1 real bug** on May 9 (order #014509, Kombucha, ₹6.50 missing).
- **ESC-1 is CLOSED — NOT A BUG.**

**Full corrected drift analysis (12 orders / ₹623.50):**
- 8 orders (₹486) are f_order_status=2/5 (pending billing) → moving to new Pending Billing tab
- 4 orders (₹137.50) are f_order_status=6 (paid) → real backend bugs remaining on Sold Items tab

**Corrected findings documented in:** `CR_011_S5_PENDING_BILLING_TAB_PLAN_2026_06_03.md` §2

---

## 1. EXECUTIVE SUMMARY

Deep-dive investigation into tax drift on S5 Item Sales Hybrid screen. Started with Zanzibar Burger (₹210 drift on 175 items) and expanded to full system analysis. Found and fixed multiple FE formula errors. Remaining AMBERs traced to 3 backend bugs affecting ~74 orders.

---

## 2. FE FORMULA FIXES SHIPPED THIS SESSION

| Fix | Before | After | Impact |
|-----|--------|-------|--------|
| **FE-27 rejected** | `Math.round` (whole rupee) | 2-decimal precision | 29 false AMBERs eliminated |
| **FE-51 discount source** | `discount_amount` (always ₹0) | `discount_on_food` (actual per-line discount) | Discount column now shows real values |
| **FE-52 revenue** | `price` (menu price) | `price − discount_on_food` | Revenue shows actual collected |
| **FE-53 Item Total** | Not shown | `unit_price × qty + addon + variation` | Full line value visible |
| **FE-54 Subtotal** | Not computed | `itemTotal − discount + serviceCharge` | Taxable base visible |
| **FE-55 Total Revenue** | Not computed | `subtotal + tax` | Actual collected per line |
| **FE-13 rejected** | `unitPriceSum / lineCount` (menu price avg) | `totalRevenue / qty` | 149 items corrected |
| **FE-02 rejected** | Included comp items | `qty > 0` only | Comp items removed from Top Sellers |
| **FE-49 approved** | Included cancelled+comp | `qty > 0` only | Sold items only on All/Top/Slow |
| **Audit engine** | Used `revenue` (old) | Uses `subtotal` as tax base | Matches backend computation |
| **Tolerance** | ₹0 (zero) | **±₹0.02** | Eliminates floating-point ghosts |
| **7-column layout** | Qty, Revenue, Discount, Tax, AvgPrice | Qty, Item Total, Discount, Subtotal, Tax, Drift, Total Revenue, Avg Price | Full financial breakdown |

---

## 3. INVESTIGATION TRAIL

### 3.1 Zanzibar Burger (V) — ₹210 Drift

- **175 sold, ₹70,000 revenue, ₹3,290 tax vs expected ₹3,500**
- **37 drift lines, 123 clean lines**
- **Root cause:** Backend computes GST on `(price − discount_on_food)`, not `price`
  - 3 lines with 100% discount → tax=₹0 (correct, ₹-100 drift with old formula)
  - 21 lines with 20% discount → GST=₹16 instead of ₹20 (₹-84 total)
  - 13 lines with ~10% discount → GST=₹18 instead of ₹20 (₹-26 total)
- **Fix:** Revenue = `price − discount_on_food`. All 160 lines now match ✅

### 3.2 Eggs Benny — ₹17.50 Drift

- **156 sold, 153 lines, only 3 drift lines**
- **Root cause:** Add-ons not included in revenue
  - Order #014693: Eggs Benny ₹350 + 2 eggs scrambled ₹100 + sauteed spinach ₹50 = ₹500 total. GST = ₹500 × 5% = ₹25. But FE showed revenue = ₹350 → expected ₹17.50 → drift +₹7.50
- **Fix:** Item Total = `unit_price × qty + total_add_on_price + total_variation_price`
- **Backend inconsistency found:** `price` field sometimes includes addons (15 lines) and sometimes excludes (180 lines). Universal formula uses components.

### 3.3 Cappuccino — ₹16 Drift + Comp Badge

- **393 sold + 1 comp + 3 cancelled**
- **Only 2 drift lines:** Both have GST=₹0 despite tax=5% config
  - #014606 (TAB payment, single Cappuccino, entire order GST=₹0)
  - #013489 (14-item room order, order-level GST=₹108 but ALL lines GST=₹0)
- **Comp badge:** 1 comp line out of 394 total → `isComplimentary=true`. Owner directive: remove badge from sold tabs.

### 3.4 Remaining 5 AMBER Items (Kombucha, Iced Latte, Carrot Cake, Lentil Stew, Yoghurt Cup)

- **All trace back to same backend bugs** — orders with ₹0 line-level GST
- Most affected by Order #013489 alone (4 of 5 items)

---

## 4. SYSTEM-WIDE ZERO-GST ANALYSIS

**138 orders total with zero line-level GST across all items.**

### 4.1 Classification

| Category | Orders | GST Missing | Bug? | Detail |
|----------|--------|-------------|------|--------|
| **100% discount** (`discount_value=100%`) | 48 | ₹0 | **NOT a bug** | `discount_on_food = price` → subtotal=₹0 → GST correctly ₹0. Our formula handles it. |
| **SRM reception daily** (`discount = revenue`, `discount_value=0`) | 18 | ₹0 | **NOT a bug** | Same as above but backend records discount differently. Our formula handles it. |
| **Tax-exempt items** (Beer, alcohol, `fd.tax=0`) | 17 | ₹0 | **NOT a bug** | Product configured with 0% tax. GST correctly ₹0. |
| **Lime Soda 100% discount** | 1 | ₹0 | **NOT a bug** | `discount_on_food = price`. |
| **May 9 incident** | **~70** | **~₹2,500** | **P0 BUG** | System-wide failure. Both prepaid+postpaid. No discount, no tax-exempt. GST simply missing. |
| **Order-level GST not distributed** | **2** | **₹133** | **P1 BUG** | Room orders by Counter02. GST computed at order level, ₹0 on every line. |
| **Cappuccino TAB + RM anomaly** | **2** | **₹19** | **P2 BUG** | #014606 (TAB, GST=₹0), #012318 (RM, amount=₹0 no discount). |

**Real backend bugs: ~74 orders, ~₹2,652 GST missing.**

### 4.2 May 9 Incident Deep Dive

- **70 out of 149 orders on May 9 (47%) had zero GST**
- Mixed payment methods (cash, upi, card) — not method-specific
- Both prepaid (50) and postpaid (20) affected
- Employee: Counter (47), Counter02 (8) — normal employees, not reception
- **Prepaid is NOT structurally broken:** 94 prepaid orders with GST work fine on other days
- **Likely cause:** Deployment, config change, or system restart on May 9 that broke GST computation for several hours

### 4.3 Room Billing GST Distribution Bug (P1)

| Order | Type | Employee | Items | Order GST | Line GST | Gap |
|-------|------|----------|-------|-----------|----------|-----|
| #013594 | SRM, Table C-04 | Counter02 | 1 (Superfood Salad) | ₹25 | ₹0 | ₹25 |
| #013489 | RM, Table 101 | Counter02 | 14 items | ₹108 | ₹0 | ₹108 |

Both are room orders by Counter02. Backend computed GST at order level but failed to write it to `gst_tax_amount` per line. The room billing code path has a GST distribution step that's skipped or broken.

---

## 5. BACKEND ESCALATION ITEMS

### ESC-1 (~~P0~~CLOSED): ~~May 9 GST Computation Failure~~ NOT A BUG
- **CORRECTED 2026-06-03:** Previous analysis misclassified 71 alcohol/beer orders (tax_rate=0%) as zero-GST bugs.
- Only 1 real anomaly on May 9: #014509 (Kombucha, ₹6.50 missing). Standalone P3 issue.
- **No backend action needed.**

### ESC-2 (P1): Room Order Line-Level GST Not Distributed
- **2 orders: #013489, #013594**
- Both RM/SRM by Counter02
- Order-level `total_gst_tax_amount` is correct but `gst_tax_amount` per line = ₹0
- **Ask backend:** Is there a missing step in the room billing flow that distributes order-level GST to line items?

### ESC-3 (P0, already filed): Cancelled Order Financials Not Reverted
- **302 cancelled lines, ₹757 tax + ₹48 discount leaked**
- Already documented in `CR_011_BACKEND_ESCALATION_CANCELLED_FINANCIALS_2026_06_02.md`

### ESC-4 (P2): Backend `price` Field Inconsistency
- `price` sometimes includes add-ons/variations (15/195 lines), sometimes excludes (180/195)
- FE works around this using `unit_price × qty + addon + variation`
- **Ask backend:** Standardize `price` to always include or always exclude add-ons

---

## 6. WHAT THE AUDIT SHOULD SHOW AFTER ALL FIXES

### 6.1 After FE formula fixes (shipped 2026-06-02)
| Metric | Before Session | After Session (Expected) |
|--------|---------------|-------------------------|
| Sold-bucket AMBER (discount drift) | ~100 | **~5-10** (only May 9 + room orders) |
| Sold-bucket AMBER (addon drift) | ~3 | **0** (addons now in Item Total) |
| False AMBER (rounding) | 29 | **0** (2-decimal precision) |
| False AMBER (floating-point) | ~50 | **0** (₹0.02 tolerance) |
| Tax-exempt false AMBER | ~365 | **0** (rate=0 → expected=₹0) |
| Cancelled-bucket AMBER | ~27 | ~27 (awaiting backend P0 fix) |
| REVIEW items | 42 | **41** (pending owner triage) |

### 6.2 After Pending Billing tab (planned 2026-06-03, not yet implemented)
| Metric | Current (all in Sold) | After Split |
|--------|----------------------|-------------|
| Sold Items tab AMBER (tax drift) | ~10 across 12 orders | **~4** (only f_order_status=6 bugs: ₹137.50) |
| Pending Billing tab AMBER | N/A | **~8** (f_order_status≠6 orders: ₹486, expected) |
| Real backend bugs on Sold Items | Mixed with pending | **Isolated: #013489, #013594, #014509, #014606** |

---

## 7. OPEN ITEMS FOR NEXT SESSION

1. **~~Verify live data~~** → DONE (2026-06-03): Full re-analysis completed. May 9 corrected.
2. **~~Remove Comp badge from All/Top/Slow tabs~~** → Already done (FE-43 rejected, chip gated)
3. **Implement Pending Billing tab** — Plan at `CR_011_S5_PENDING_BILLING_TAB_PLAN_2026_06_03.md`. FE-56 + FE-57 approved. Awaiting owner GO for code.
4. **Update `buildExportPayload`** for new 7-tab structure (add Pending Billing sheet)
5. **42 REVIEW items** — batch triage with owner
6. **Backend follow-up** — ESC-2 (Room GST, P1) + ESC-3 (Cancelled financials, P0) + ESC-4 (price field, P2). ESC-1 CLOSED.

---

## 8. FILES CHANGED THIS SESSION

| File | Changes |
|------|---------|
| `insightsService.js` | Full restructure: discount_on_food, itemTotal, subtotal, totalRevenue, per-bucket accumulators, avgPrice=revenue/qty |
| `ItemSalesHybridMockup.jsx` | 7-column layout, drift column, ±₹0.02 tolerance, comp/cancelled excluded from All/Top/Slow, Lost Revenue headers, 2-decimal formatCurrency |
| `auditEngine.js` | Uses subtotal as tax base, round2(delta) before tolerance check |
| `auditManifest.js` | 57 rules total (13 decided: 9 approved + 4 rejected). FE-48 amended. FE-49/50/51/52/53/54/55 added. |
| Governance docs | OWNER_DECISION_QUEUE, SPRINT_STATUS, CR_011_SCREEN_FREEZE_LOG, CR_REGISTRY, PRD |

---

*End of investigation report. Next agent continues from here.*
