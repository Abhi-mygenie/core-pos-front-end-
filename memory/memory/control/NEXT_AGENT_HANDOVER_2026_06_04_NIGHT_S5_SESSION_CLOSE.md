# NEXT AGENT — S5 Item Sales Hybrid Handover (2026-06-04 Night Session)

**Created:** 2026-06-04 (session close)
**Branch:** `4-june-v3`
**Preview URL:** https://insights-phase.preview.emergentagent.com
**Active CR:** CR-011-AUDIT-01 — S5 Item Sales Hybrid
**S5 Status:** 🟠 PARKED (backend GST bugs + 42 REVIEW items pending)
**Test account:** owner@cafe103.com / Qplazm@10

---

## 0. WHAT WAS DONE THIS SESSION

### Code Changes (3 files)

| File | Change |
|------|--------|
| `api/services/insightsService.js` | FE-58: skip cancelled items from drift collector (`if (!isCancelled)`). Added `rootCause` + `foodId` fields to drift lines. FE-61: GST_NOT_CONFIGURED exemption for 11 May-22 food_ids. |
| `pages/reports-module/ItemSalesHybridMockup.jsx` | Replaced single "Last Seen Ambiguity" table with 3 classified blocks: OVER TAXED (red), TAX NOT COMPUTED (amber), GST NOT CONFIGURED (green/exempt). Each block sorted latest-first. Orders appear in multiple blocks if they have mixed drift types. |
| `utils/auditManifest.js` | FE-61 registered (APPROVED, EXEMPT severity). |

### Investigation Findings

**111 drift orders → classified:**

| Root Cause | Badge | Orders | Lines | Status |
|------------|-------|--------|-------|--------|
| Cancelled false positives | — | 64 | 83 | FIXED (FE-58 skip) — backend correctly zeroed tax |
| GST NOT CONFIGURED | Green exempt | 36 | 37 | EXEMPT (FE-61 policy) — May-22 items added without GST |
| OVER TAXED | Red | 11 | 35 | Backend bug — per-line GST inflated 2x–6x |
| TAX NOT COMPUTED | Amber | 4 | 20 | Backend bug — per-line gst_tax_amount=₹0 despite fd_tax=5 |

**Net actionable: 111 → 15 orders**

### Key Investigation Conclusions

1. **OVER TAXED (11 orders):** All before May 25, zero after. API shows no `split_order_id` or `transfer_order_in/out` on any of them — so backend doesn't tag them as splits/transfers. But the pattern (3x–6x multiplier, sibling orders on same table) strongly suggests split-like behavior. High `order_edit_count` correlates (2–5) on most, but 2 orders have edit_count=0.

2. **TAX NOT COMPUTED (4 orders):** Regular menu items with fd_tax=5 but gst_tax_amount=₹0. Orders #010366 (May 2), #010469 (May 3) are early May. Orders #011713, #011714 (May 23) are later — backend intermittently fails to compute per-line GST.

3. **GST NOT CONFIGURED (36 orders):** 11 food_ids added ~May 22 with tax=0 in catalog. All orders are CLEAN (no other drift). Includes items that still drift after May 22 because catalog update was gradual (fd_tax=0 until ~May 26, then fd_tax=5 but backend still intermittently writes gst=₹0 — last seen Jun 1 on Top of Ice Cream #012503).

---

## 1. OVER TAXED ORDERS (complete list for backend team)

| Order | Date | Table | Waiter | Edits | Key Item | Multiplier |
|-------|------|-------|--------|-------|----------|------------|
| #010591 | May 4 | 34 | Pankaj | 5 | Paneer Lababdar, Garlic Naan | 3x–4x |
| #010594 | May 4 | 34 | Pankaj | 5 | Dal Mughlai, Paneer Lababdar | 3x–6x |
| #010595 | May 4 | 34 | Pankaj | 2 | Dal Mughlai, Garlic Naan | 3x–4x |
| #010596 | May 4 | 34 | Pankaj | 5 | Dal Mughlai, Garlic Naan | 3x–4x |
| #010735 | May 7 | 31 | Pankaj | 0 | Cold Coffee Shake | 1.5x |
| #010736 | May 7 | 33 | Pankaj | 3 | Cold Coffee Shake | 3x |
| #011507 | May 19 | 51 | Counter | 3 | Masala Tea | 3x |
| #011509 | May 19 | None | Counter | 0 | Masala Tea | 3x |
| #011512 | May 19 | 32 | Counter | 4 | Masala Tea | 3x |
| #011846 | May 24 | 15 | Counter | 2 | Masala Tea ×5 | 5x |
| #011877 | May 24 | 43 | Pankaj | 2 | Garlic Naan | 2x |

## 2. TAX NOT COMPUTED ORDERS

| Order | Date | Lines | Key Items |
|-------|------|-------|-----------|
| #010366 | May 2 | 6 | Nutella Waffle, Masala Tea ×4, Veg. Grilled Sandwich ×2, Veg. Biryani |
| #010469 | May 3 | 5 | Bournvita Milk, Masala Tea, Sunny Side Up, Cheese Omelette ×2 |
| #011713 | May 23 | 7 | Aloo Pyaz Paratha, Cold Coffee Shake, Fresh Lime Water, Cappuccino ×2, Veg. Grilled Sandwich, Puri Bhaji |
| #011714 | May 23 | 2 | Darjeeling Tea, Aloo Paratha |

## 3. GST NOT CONFIGURED — May-22 Food IDs (FE-61)

```
176906  Extra Vegges
177448  Extra Chicken.
181573  Top of Ice Cream
181574  Extra Paneer
181622  Cream Of Brocoli
182021  Extra Egg
187051  Extra Nuttella
189443  Ice Cube
190676  Extra Puri
190677  Extra Bhatura
```

---

## 4. S5→S6 CROSS-REFERENCE

14 of 15 S5 drift orders also appear in S6 Ledger Audit (51 flags). Badges added to S6:
- **Over Taxed** badge on 10 orders in S6
- **Tax Not Computed** badge on 4 orders in S6
- **Critical** badge on 13 orders flagged in both FE-86 + FE-88
- Only #010594 doesn't appear in S6 (per-line GST coincidentally matches header)
- May-22 item exemption does NOT apply to S6 (only 1/47 FE-86 orders has a May-22 item)

---

## 5. S5 REMAINING BLOCKERS

| # | Blocker | Status |
|---|---------|--------|
| 1 | 42 REVIEW items pending owner triage | Owner must approve/reject |
| 2 | Pending Billing tab dual-fetch | Shows 0 — needs second API call with sort_by=created_at |
| 3 | Backend ESC-3 (cancelled financials) | P0 — still open with backend team |
| 4 | Sold-bucket AMBER tolerance decision | Owner must pick: escalate / widen / downgrade |

## 6. DO NOT TOUCH

- `auditManifest.js` — adding entries requires §8 protocol
- No FE compensating logic for backend bugs
- Any FROZEN screen in `CR_011_SCREEN_FREEZE_LOG.md`

---

*End of S5 handover. S5 is PARKED. Next work: S6 Order Ledger.*
