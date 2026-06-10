# Handover Note — Next Agent

## Session Summary (June 10, 2026)
Deployed MyGenie POS frontend from GitHub (branch `10-june`). Found 15 bugs in Restaurant Settings wizard (CR-020), fixed 13, registered 1 as backend gap. Registered CR-021 (Collect Bill split payment, P0 money-impacting) with full implementation plan — not yet implemented.

## Immediate Actions for Next Agent

### 1. Owner Smoke Tests Pending
Ask owner to verify:

**CR-020 Phase 4 (B11):**
- [ ] Turn off Delivery + TakeAway in settings → Dashboard order type dropdown → only Walk-In should appear
- [ ] Turn Delivery back ON → dropdown shows Delivery + Walk-In

**CR-020 B12-B15:**
- [ ] GST Mode dropdown shows "Item Level" / "Restaurant Level" labels
- [ ] GST Mode hint changes when switching between modes
- [ ] "Default GST %" field is no longer visible in Tax Configuration
- [ ] Short Code is now a toggle switch (not a text input)

### 2. Ask Owner: Any Other Bugs in Restaurant Settings?
Owner has been actively testing the settings wizard. Ask if they found anything else before moving on.

### 3. CR-021: Collect Bill Split Payment — READY FOR IMPLEMENTATION
- **Priority:** P0 (money-impacting — cashier can collect mismatched amounts)
- **Doc:** `/app/memory/change_requests/CR_021_COLLECT_BILL_SPLIT_PAYMENT_CR.md`
- **All 5 owner decisions locked** (Section 6 of the doc)
- **Execution order:** B3 → B4 → B2 → B1
- **Files:** `CollectPaymentPanel.jsx` (B2, B3, B4) + `orderTransform.js` (B1)
- **Critical:** Read Section 6.1 (locked behaviour summary) and 6.2 (non-negotiables) before coding

### 4. CR-018: Schedule Order — Phase 2 Pending
- **Doc:** `/app/memory/change_requests/CR_018_SCHEDULE_ORDER_CR.md`
- **Phase 2 gaps:** G5 (TableCard badge), G6 (OrderEntry header), G7 (status column order), G8 (re-enable status pills), G9 (Schedule filter pill), G10 (fix broken filter)
- **Independent of CR-020/021** — can be done in parallel

### 5. Backend Gap: VAT Tax %
- Settings API has no `vat_tax` or `vat_percentage` field
- Only `vat.status` (on/off) and `vat.code` (registration number) exist
- Backend team needs to add the field before frontend can show VAT Tax % input
- Owner is aware

## Environment
- **Preview URL:** `https://fd0d7a78-dba5-450a-bd04-4a3f3b1267d5.preview.emergentagent.com`
- **Frontend:** Port 3000, craco + React 19
- **Backend:** Port 8001, FastAPI (placeholder — app uses external APIs)
- **External APIs:** `preprod.mygenie.online`, `presocket.mygenie.online`, `crm.mygenie.online`
- **No login credentials available** — all testing was code-level + structural verification

## Key Docs
| Doc | Purpose |
|-----|---------|
| `/app/memory/PRD.md` | Full PRD with implementation history |
| `/app/memory/change_requests/CR_020_RESTAURANT_SETTINGS_BUG_SWEEP.md` | 15 bugs, phase-by-phase plan, line-by-line diffs |
| `/app/memory/change_requests/CR_021_COLLECT_BILL_SPLIT_PAYMENT_CR.md` | Split payment P0 bugs, owner decisions locked, ready for code |
| `/app/memory/change_requests/CR_018_SCHEDULE_ORDER_CR.md` | Schedule order gaps, Phase 2 pending |
| `/app/test_reports/iteration_*.json` | 6 test iterations, all passed |
