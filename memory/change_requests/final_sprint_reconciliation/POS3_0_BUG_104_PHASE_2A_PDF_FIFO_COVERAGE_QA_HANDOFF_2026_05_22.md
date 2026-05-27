# POS 3.0 BUG-104 Phase 2A — PDF FIFO Coverage QA Handoff

**Date:** 2026-05-22
**Prepared by:** Continuation Agent (previous agent died during handover)

---

## 1. QA Status

```
bug_104_phase_2a_pdf_fifo_waiting_qa
```

---

## 2. QA Scope

Verify that Quick Statement PDF and Detailed Statement PDF both render FIFO coverage buckets (Covered / Partial / Open) matching the SS2 drawer behavior.

**In scope:**
- Quick Statement PDF: bucketed layout, status badges, no item details
- Detailed Statement PDF: bucketed layout, status badges, nested item details
- FIFO math correctness (oldest bills covered first)
- Date filter reflected in PDF output
- Print Statement with FIFO buckets
- Download Statement with FIFO buckets
- Regression: disabled actions remain disabled, no mutations

**Out of scope:**
- WhatsApp sharing (Phase 2C)
- Bulk PDF export (Phase 2C)
- Settlement flow (Phase 2C)
- Payment receipt print
- Backend changes
- Any data mutation

---

## 3. Test Route / Access

Use the current BUG-104 preview deployment. Access Credit Management from the sidebar navigation panel.

**Preview URL:** Use the current Emergent preview URL for this fork.

**Flow:**
1. Log in to POS
2. Open Credit Management panel (sidebar)
3. Select a customer with credit history
4. Use Quick Statement / Detailed Statement buttons in the SS2 drawer

---

## 4. QA Checklist

| # | Test Case | Area | Expected Result | Pass/Fail |
|---|-----------|------|-----------------|-----------|
| 1 | Quick PDF — Covered section renders | Quick PDF | Green header with "Covered (N)" label and count | |
| 2 | Quick PDF — Covered section shows amount summary | Quick PDF | Right-aligned text showing "X of Y settled (Z%)" | |
| 3 | Quick PDF — Partial section renders when applicable | Quick PDF | Amber header with "Partial (N)" label when a bill is partially covered | |
| 4 | Quick PDF — Partial section shows remaining amount | Quick PDF | Right-aligned text showing "X remaining" | |
| 5 | Quick PDF — Open section renders | Quick PDF | Red header with "Open (N)" label for uncovered bills | |
| 6 | Quick PDF — Open section shows due amount | Quick PDF | Right-aligned text showing "X due" | |
| 7 | Quick PDF — Each credit row has status badge | Quick PDF | Green "Covered", amber "Partial X/Y", or red "Open" badge per row | |
| 8 | Quick PDF — No item details visible | Quick PDF | No bill line items (name, qty, price) appear under any row | |
| 9 | Quick PDF — Mode badge shows "Quick" | Quick PDF | Blue badge in header: "Quick — transaction summary" | |
| 10 | Quick PDF — FIFO disclaimer present | Quick PDF | Footer text: "Status is estimated using FIFO..." | |
| 11 | Detailed PDF — Covered section renders | Detailed PDF | Green header with "Covered (N)" label and count | |
| 12 | Detailed PDF — Covered section shows amount summary | Detailed PDF | Right-aligned text showing "X of Y settled (Z%)" | |
| 13 | Detailed PDF — Partial section renders when applicable | Detailed PDF | Amber header with "Partial (N)" label | |
| 14 | Detailed PDF — Partial section shows remaining amount | Detailed PDF | Right-aligned text showing "X remaining" | |
| 15 | Detailed PDF — Open section renders | Detailed PDF | Red header with "Open (N)" label | |
| 16 | Detailed PDF — Open section shows due amount | Detailed PDF | Right-aligned text showing "X due" | |
| 17 | Detailed PDF — Each credit row has status badge | Detailed PDF | Green/amber/red badge per row matching bucket | |
| 18 | Detailed PDF — Item details present under rows | Detailed PDF | Bill items (name, qty, price) + subtotal/tax/total nested under credit rows with order details | |
| 19 | Detailed PDF — Missing item details show fallback | Detailed PDF | "Bill details not available" italic text for orders without fetchable details | |
| 20 | Detailed PDF — Mode badge shows "Detailed" | Detailed PDF | Amber badge in header: "Detailed — includes bill items" | |
| 21 | Detailed PDF — Progress page shown during fetch | Detailed PDF | Progress bar with "Fetching bill details..." and count (N/M) while loading | |
| 22 | Bucket counts correct | Both PDFs | Sum of Covered + Partial + Open counts = total credit transaction count | |
| 23 | Amount summaries correct | Both PDFs | Covered settled amount + Partial covered amount = totalPaid; Open due = totalCredit - totalPaid - partial remaining | |
| 24 | Partial coverage amount correct | Both PDFs | Partial badge shows exact split: covered portion / total bill amount | |
| 25 | Open due amount correct | Both PDFs | Open bucket due = sum of fully uncovered bill amounts | |
| 26 | Date filter reflected in PDF | Both PDFs | Applying date range in SS2 drawer produces a PDF with only transactions in that range | |
| 27 | Print Statement with FIFO buckets | Both PDFs | Browser print dialog opens; printed output includes bucket sections and badges | |
| 28 | Download Statement with FIFO buckets | SS1 Row | Per-row download button generates Quick Statement with FIFO buckets | |
| 29 | SS2 drawer unchanged | SS2 Drawer | Covered accordion, Partial section, Open section still render correctly in drawer | |
| 30 | SS2 drawer badges match PDF badges | Cross-check | Badge labels and colors in SS2 match those in generated PDF | |
| 31 | Disabled WhatsApp — not present | Regression | No WhatsApp share button exists | |
| 32 | Disabled Bulk Download — not present | Regression | No bulk download button exists | |
| 33 | Disabled Settle All unchanged | Regression | "Settle All" button remains disabled with Phase 2C tooltip | |
| 34 | Disabled Print Receipt — not present | Regression | No print receipt button exists | |
| 35 | No payment API invoked | Regression | Network tab shows no POST/PUT to payment or settlement endpoints during PDF generation | |
| 36 | Build passed | Build | `CI=false yarn build` completes without errors | |
| 37 | Customer with zero payments | Edge Case | All credits show as "Open" — no Covered or Partial sections | |
| 38 | Customer fully paid | Edge Case | All credits show as "Covered" — no Open section | |
| 39 | Customer with single partial credit | Edge Case | Exactly one Partial row with correct covered/total split | |
| 40 | Empty date range (no matching txns) | Edge Case | Toast: "No transactions in the selected date range" — no PDF generated | |

---

## 5. Owner QA Steps

### Prerequisites
- Access to POS application with Credit Management enabled
- At least one customer with mixed credit history (some covered, some open)
- Popups allowed in browser for statement generation

### Step-by-step

1. **Open Credit Management**
   - Click Credit Management in the sidebar navigation
   - Verify the customer list (SS1) loads

2. **Select a customer with mixed covered/partial/open credits**
   - Click on a customer who has both credits and payments
   - Verify the SS2 drawer opens

3. **Confirm SS2 drawer badges**
   - Verify Covered accordion (green), Partial section (amber), Open section (red) appear in SS2
   - Note the counts and amounts for comparison

4. **Generate Quick Statement**
   - Click "Quick Statement" button in SS2 action bar
   - A new window/tab should open with the statement
   - Verify:
     - Covered / Partial / Open bucket sections present
     - Counts and amounts match SS2
     - Status badges on each row
     - NO bill item details
     - "Quick — transaction summary" badge in header
     - FIFO disclaimer at bottom of credits section

5. **Generate Detailed Statement**
   - Click "Detailed Statement" button in SS2 action bar
   - A progress page should appear ("Fetching bill details...")
   - After loading, verify:
     - Same bucket sections as Quick Statement
     - Bill item details nested under credit rows (name, qty, price, subtotal, tax, total)
     - "Detailed — includes bill items" badge in header
     - Missing details show "Bill details not available"

6. **Compare PDF buckets to SS2**
   - Verify that bucket counts, amounts, and badge labels are consistent between SS2 drawer and both PDF types

7. **Test with date filter**
   - Set a date range in SS2 date filter
   - Generate Quick or Detailed Statement
   - Verify only transactions within the date range appear in PDF

8. **Do NOT submit payment**
   - Do not click "Record Payment" during this QA pass
   - This is a read-only verification

---

## 6. Pass/Fail Template

```
QA Result: [PASS / FAIL]
Tested by: [Name]
Date: [YYYY-MM-DD]
Environment: [Preview URL]

Quick PDF: [PASS / FAIL]
Detailed PDF: [PASS / FAIL]
FIFO math: [PASS / FAIL]
Regression: [PASS / FAIL]
Build: [PASS / FAIL]

Notes:
[Any observations, edge cases found, or issues]
```

---

## 7. Final Gate

```
WAITING_OWNER_PDF_FIFO_QA_APPROVAL
```

This add-on is complete from an implementation standpoint. Owner QA approval is required before marking Phase 2A PDF FIFO coverage as fully closed.

Next steps after QA approval:
- Phase 2B: Backend date-range opening balance (BG-02)
- Phase 2C: WhatsApp sharing, Bulk PDF export, Settle All
