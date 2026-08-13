# CR-059: Expense Module — Discovery Session Closure

**Date:** 2026-07-06
**Session:** Discovery (pre-Gate 2)
**Status:** DISCOVERY COMPLETE → Ready for Gate 2 (Impact Analysis)

---

## 1. Summary

Comprehensive API discovery completed for the Expense Module migration from old POS to new POS. 19 API endpoints mapped, full data model documented, real data stats analyzed (kunafamahal, 765 transactions, ₹4.83L). Old POS screenshots reviewed for reference only — owner confirmed **complete UI revamp**, no design carryover.

---

## 2. Architecture Decisions (Owner-Confirmed)

| # | Decision | Owner Ruling |
|---|---|---|
| D1 | Module split into 2 phases | **Phase 1:** Expense Management (entry + setup). **Phase 2:** Reporting (daily report + Insights). |
| D2 | Two separate routes | `/expenses` (daily entry) and `/expense-setup` (master management) |
| D3 | Route separation enables future role gating | Setup restricted to owner/manager; entry open to all with module role |
| D4 | Expense Setup follows Menu Management pattern | Bulk Editor + Excel Import/Export + inline edit — single unified view |
| D5 | No tabs combining entry + setup | Different user mindsets, different access levels — keep apart |
| D6 | Report NOT inside expense module | Phase 2: (a) Daily Report line item, (b) Insights → Expense Report |
| D7 | Settlement tie-in | Today's expense total feeds into Day Closure |
| D8 | `physical_quantity` dropped | Never used (0/765 txns) — remove from new UI |
| D9 | Unit Prices inline with items | Not a separate page — integrated into Expense Setup |
| D10 | Complete UI revamp | Old POS design is reference only. Fresh, modern UX. |

---

## 3. Phase 1 Scope (to be built)

### Route A: `/expenses` — Daily Expense Entry
- KPI strip: Today's total by payment method
- Quick-add form (date, category→item search, amount, payment method, qty+unit optional)
- Multi-line entry support (API supports `details[]` array)
- Today's expense log table (edit/delete inline)
- Auto-fill from unit prices when available
- Smart suggestions (recent entries for same item)

### Route B: `/expense-setup` — Expense Master Setup
- Menu Management-style unified view
- Category management (create/edit/delete)
- Items table grouped by category (search, filter, inline edit)
- Bulk Editor mode (spreadsheet grid for mass edits)
- Unit Price management (inline column, not separate page)
- Excel Import/Export (stock master)

### Sidebar
```
💰 Expenses
   ├── Add Expenses        → /expenses
   └── Expense Setup       → /expense-setup
```

### Phase 2 (PARKED — separate session)
- Daily Report → expense summary line item
- Insights → Expense Report (full date-range, charts, P&L, export)

---

## 4. API Endpoints Mapped (19 total)

### A. Master (Category + Stock Items)
| # | Method | Endpoint | Purpose |
|---|---|---|---|
| A1 | GET | `/expense/category-list` | List categories |
| A2 | GET | `/expense/expenses-list` | List all stock items |
| A3 | POST | `/expense/store_expense` | Create category + items |
| A4 | PUT | `/expense/expenses/{category_id}` | Update category + items |
| A5 | DELETE | `/expense/expenses/{item_id}` | Delete stock item |
| A6 | POST | `/expense/bulk-export-expense` | Export stock as Excel |
| A7 | POST | `/expense/bulk-import-expense` | Import stock from Excel |
| A8 | GET | `/bulk_upload_sample/expense/expense_stock_sample.xlsx` | Blank import template |

### B. Transactions (Daily Entry)
| # | Method | Endpoint | Purpose |
|---|---|---|---|
| B1 | GET | `/expense/expenses-report?from=&to=&payment_method=` | List transactions |
| B2 | POST | `/expense/store-expense-details` | Add expense entry |
| B3 | PUT | `/expense/edit-expense/{id}` | Edit transaction |
| B4 | DELETE | (TBD — need curl) | Delete transaction |
| B5 | POST | `/expense/expenses-export-report` | Export transactions Excel |
| B6 | GET | `/expense/download-semple` | Transaction import template |
| B7 | POST | `/expense/import-expense` | Import transactions Excel |

### C. Unit Prices
| # | Method | Endpoint | Purpose |
|---|---|---|---|
| C1 | GET | `/expense/stock-unit-prices` | Items with prices |
| C2 | GET | `/expense/expenses-without-unit-prices` | Items without prices |
| C3 | POST | `/expense/stock-unit-price` | Add unit price |
| C4 | PUT | `/expense/stock-unit-price/{id}` | Edit unit price |
| C5 | DELETE | `/expense/stock-unit-price/{id}` | Delete unit price |

### D. Reference Data
| # | Method | Endpoint | Purpose |
|---|---|---|---|
| D1 | GET | `/expense/payment-method` | Payment methods |
| D2 | GET | `/expense/get-unit` | Measurement units |

---

## 5. API Quirks (implementation must handle)

1. **Field name inconsistency** — create uses `expense`/`amount`/`e_date`, update uses `exp_name`/`d_amount`/`e_dates`
2. **stock_title format differs** — create: flat array `["a","b"]`, update: object array `[{"title":"a"}]`
3. **Date format varies** — `DD/MM/YYYY` (most), `YYYY-MM-DD` (export report body)
4. **Amounts are strings** in responses — need `parseFloat()`
5. **URL inconsistency** — `store_expense` (underscore) vs `store-expense-details` (hyphen)

---

## 6. Real Data Stats (kunafamahal, Jan–Jul 2026)

| Metric | Value |
|---|---|
| Stock items (master) | 308 |
| Categories | 2 (misc: 307, Salary: 1) |
| Transactions | 765 |
| Total spend | ₹4,83,067 |
| Avg transaction | ₹631 |
| Payment split | Cash 54%, Cash Draw 45%, Bank Transfer <1% |
| Quantity usage | 2% (15/765) — rarely used |
| Unit price usage | 0% — never set up |

---

## 7. Evidence Artifacts

All saved to `/app/memory/evidence/CR-059/`:
- `category_list.json` — category API response
- `expenses_list_full.json` — full 308-item master
- `expenses_report_full.json` — 765 transactions (Jan–Jul 2026)
- `payment_methods.json` — payment method list
- `unit_list.json` — measurement units
- `stock_unit_prices.json` — unit prices (empty)
- `expenses_without_unit_prices.json` — 308 items without prices
- `bulk_export.json` — export response with download URL
- `export_report_detail.json` — detailed transaction export format
- `API_DISCOVERY_REPORT.md` — this document

---

## 8. Next Steps

```
Discovery COMPLETE → Gate 2 (Impact Analysis) → Gate 3 (Implementation Plan) → Gate 4 GO → Implementation
```

**Next agent role:** PLANNING (Gate 2)
**Scope:** Phase 1 only (expense entry + setup)
**Phase 2 (reporting) parked** — separate session after Phase 1 ships
