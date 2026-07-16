# NEXT AGENT — S5 Item Sales Frozen + Post-Freeze Handover (2026-06-05)

**Created:** 2026-06-05 (session close)
**Branch:** `5-june`
**Preview URL:** https://insights-phase.preview.emergentagent.com
**Active CR:** CR-011-AUDIT-01 — S5 Item Sales Hybrid
**S5 Status:** ✅ FROZEN (2026-06-05) + 17 post-freeze amendments shipped
**Test account:** owner@cafe103.com / Qplazm@10

---

## 0. WHAT WAS DONE THIS SESSION

### S5 Core (6 frozen business rules)
1. New "All Items" tab at index 0 — 4-bucket grouped view (Sold→Pending→Cancelled→Comp) with color-coded separators
2. Default: Punched Date (`created_at`), All Items tab, Revenue desc sort within each bucket
3. Revenue = ₹0 for Cancelled/Comp in All Items tab
4. Tab count = sum of all 4 bucket counts
5. Bucket group separators with item counts

### Post-Freeze Amendments (R1–R17)

| # | Change | File(s) |
|---|--------|---------|
| R1 | Tab order: All→Sold→Cancelled→Comp→Pending→Top→Slow→Audit | ItemSalesHybridMockup.jsx |
| R2 | Attribution toggle removed entirely | ItemSalesHybridMockup.jsx |
| R3 | All audit badges/tinting/separators removed from data tabs | ItemSalesHybridMockup.jsx |
| R4 | Tab renames: "Sold Items"→"Sold", "Cancelled Lines"→"Cancelled" | ItemSalesHybridMockup.jsx |
| R5 | Re-fetch fix: hardcoded `created_at`, removed from deps — instant tab switching | ItemSalesHybridMockup.jsx |
| R6 | Hybrid · S5 chip removed from title | ItemSalesHybridMockup.jsx |
| R7 | Audit tab env-gated: `REACT_APP_SHOW_AUDIT_TAB` (true=preprod, false=production) | ItemSalesHybridMockup.jsx, .env |
| R8 | Cancelled + Comp tabs: "REVENUE LOSS" label + red numbers in summary strip + table | ItemSalesHybridMockup.jsx |
| R9 | 42 REVIEW rules batch-approved in auditManifest.js | auditManifest.js |
| R10 | Route swap: `/reports-module/items` → S5 (replaces old S2) | App.js |
| R11 | Future date cap: `max={today}` on From + To date inputs | ItemSalesHybridMockup.jsx |
| R12 | Bucket summary bar (4 cards) — moved to header area | ItemSalesHybridMockup.jsx |
| R13 | Station summary table (Sold bucket, alphabetical) — header area | ItemSalesHybridMockup.jsx |
| R14 | Excel/PDF: "By Station" + "By Category" summary sheets | ItemSalesHybridMockup.jsx |
| R15 | Export gate: AMBER no longer blocks (only RED + REVIEW) | auditEngine.js |
| R16 | Export field fix: `revenueCancelled` → `totalRevenueCancelled`, `revenueComplementary` → `totalRevenueComplementary` | ItemSalesHybridMockup.jsx |
| R17 | Production cleanup: removed all dev messages ("Coming soon", "Phase 2B", "Soon" badges, footer text), export sheet names aligned to tab names | ItemSalesHybridMockup.jsx |

### Investigations (no code)
- Order #012482 (TAB/Credit): f_order_status=6, correctly in Sold bucket
- 69 merged orders: empty shells (0 items, ₹0) — correctly invisible on S5
- OVER TAXED 11 orders: API still returns old inflated gst_tax_amount — backend fix not propagated
- FE-51 future CR noted: item-level discount field coming from backend
- FE-54 confirmed: service charge = tip (same field at order level), delivery excluded from subtotal

### 42 Audit Rules — All Approved
Owner batch-approved all 42 REVIEW rules on 2026-06-05. REVIEW count: 42 → 0.
Notable decisions:
- FE-49 scope amended: "Sold tab = qtySold > 0, All Items = separate bucket-grouped view"
- FE-54 confirmed as-is: subtotal = itemTotal − discount + serviceCharge (delivery excluded)
- FE-51 future CR: item-level discount coming from backend

---

## 1. ENV VARIABLES

| Variable | Value | Purpose |
|----------|-------|---------|
| `REACT_APP_SHOW_AUDIT_TAB` | `true` | Show Audit tab (preprod). Set `false` for production. |

---

## 2. FILES MODIFIED

| File | Changes |
|------|---------|
| `frontend/src/pages/reports-module/ItemSalesHybridMockup.jsx` | All S5 UI changes (tabs, bucket view, summaries, export, cleanup) |
| `frontend/src/utils/auditManifest.js` | 42 rules → approved=true, FE-49 scope amended |
| `frontend/src/utils/auditEngine.js` | blocksExport = RED + REVIEW only (AMBER excluded) |
| `frontend/src/utils/reportExporter.js` | summaryTables support on PDF first page |
| `frontend/src/App.js` | Route swap: `/reports-module/items` → ItemSalesHybridMockup |
| `frontend/.env` | Added `REACT_APP_SHOW_AUDIT_TAB=true` |
| `memory/control/CR_011_SCREEN_FREEZE_LOG.md` | S5 → FROZEN, 17 amendments logged |

---

## 3. S5 REMAINING (deferred, not blocking freeze)

| # | Item | Priority | Status |
|---|------|----------|--------|
| 1 | Pending Billing dual-fetch (shows 0 — needs second API call with sort_by=created_at) | P1 | Deferred |
| 2 | 11 OVER TAXED + 4 TAX NOT COMPUTED orders | P2 | Backend-blocked |
| 3 | FE-51 CR: item-level discount field | P1 | Future CR when backend ships |
| 4 | On-screen category summary | P3 | Deferred to Phase 3 (30-60+ rows, needs drawer UX) |
| 5 | Bucket summary footer enhancement (per-bucket totals) | P3 | Parked (bucket cards in header now) |

---

## 4. NEXT WORK

1. **S6 Order Ledger** — Gate ⑤ still in-flight (Block B/C, tab rename, Aggregator predicate, unmatched orders classifier)
2. **S7–S10** — Phase 2 hero screens (Payment Mix, Cancellation Report, Order Activity Log, Prep & Serve Time)

---

## 5. DO NOT TOUCH

- `auditManifest.js` — all 42 rules approved, do not re-open without owner directive
- Any FROZEN screen in `CR_011_SCREEN_FREEZE_LOG.md`
- `REACT_APP_SHOW_AUDIT_TAB` env variable behavior (strict `=== 'true'` check, default hidden)
- Export gate logic in `auditEngine.js` (AMBER excluded per owner directive)

---

*End of S5 handover. S5 is FROZEN. Next work: S6 Order Ledger Gate ⑤.*
