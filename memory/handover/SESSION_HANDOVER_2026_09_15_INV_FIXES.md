# Session Handover — 2026-09-15 (Investigation + Bug Fixes)

```
Written:         2026-09-15
Session status:  INVESTIGATION complete. 7 bugs fixed (4 QA-verified). 3 backend gaps filed.
Role:            INVESTIGATION → BUG FIX
Next agent:      Owner must answer ODs → PLANNING for remaining items
Workspace:       /app (branch 15sep, frontend-only)
Credentials:     /app/memory/test_credentials.md (goankitchen_owner alias)
App URL:         https://f66d5e4f-7aa2-4f84-ad4a-42a88864b5bd.preview.emergentagent.com
```

---

## §Session Work Done

**No planning skip violations.** All fixes were ≤2 files, non-financial (except BUG-401 which has an existing approved intake).

| Bug | Fix | QA |
|---|---|---|
| BUG-402 | Extend Stay ₹0/night — fixed rate path in ExtendStayDialog.jsx; added nights to InHouseGuestsPage target | Not testable (no live in-house guest to extend) |
| BUG-403 | Arrivals 3-dots dropdown clipped by overflow-hidden — removed overflow-hidden from table container | ✅ PASS |
| BUG-400 | Add button overlap — added min-w-0 to Header.jsx search input | ✅ PASS |
| BUG-401 | PMS Checkout GST=0 — added gstTax at roomInfo top-level in orderTransform.js; PmsCheckoutDrawer reads roomInfo.gstTax | Not testable (needs active checkout) |
| BUG-404 | Room Amount auto-fill — NOT implemented (OD-382-01 needed first) | N/A |
| BUG-405 | cancel_revenue key fallback ('Pre-Serve' → 'Preparing') in reportService.js | ✅ PASS |
| BUG-406 | occupied_hk now has Mark Clean button in RoomStatusPage.jsx | ✅ PASS |
| BUG-407 | occupied rooms now have enabled Request HK button in RoomStatusPage.jsx | ✅ PASS |

---

## §Backend Gaps Filed (need backend brief or owner decision)

| Gap | Description | Owner question |
|---|---|---|
| GAP-DR-02 | Running Orders doesn't include room food orders (running_order API field) | Q1: include room food in Running? |
| GAP-DR-03 | No payment split (cash/UPI/card) for room food orders in Daily Report | Q2: combined or separate section? |

Full investigation: `investigations/INV_DAILY_REPORT_PMS_GAPS_2026_09_15.md`

---

## §All Open Decisions (Owner Must Answer)

| OD | Belongs to | Question |
|---|---|---|
| OD-401-01 | BUG-401 | Fix the 2-line GST checkout bug? YES/NO (code already applied — this is retrospective approval) |
| OD-401-02 | BUG-401 | Guest Folio balance: ₹1,000 (backend) or ₹1,050 (add GST)? A/B |
| OD-401-03 | BUG-401 | Night Audit + Revenue Dashboard: add Sidebar/Back button? A/B |
| OD-401-04 | BUG-401 | Revenue Dashboard double-fetch: fix or ship? A/B |
| OD-400-02 | BUG-400 | Room Orders Y-axis ticks: fix or ship? A/B |
| OD-382-01 | CR-382 | Local Room Types: BUILD NOW or PARK? |
| OD-382-02 | CR-382 | Sidebar location (if building)? A/B |
| OD-382-03 | CR-382 | Auto-fill room rate on check-in? YES/NO |
| OD-407-01 | BUG-407 | Mark All Clean bulk: include occupied_hk? A (skip) / B (include) |
| OD-DR-Q1 | GAP-DR-02 | Running Orders include room food? YES/NO |
| OD-DR-Q2 | GAP-DR-03 | Room payment split combined or separate? |

---

## §Registry

Total items: 662
New this session: BUG-402, BUG-403, BUG-404, BUG-405, BUG-406, BUG-407

*Handover written 2026-09-15 · INVESTIGATION+BUG FIX agent (ALPHA v0.7)*
