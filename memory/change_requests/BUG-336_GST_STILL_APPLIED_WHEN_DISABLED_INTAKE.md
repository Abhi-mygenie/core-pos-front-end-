# BUG-336 — GST Applied on Bills Even When Disabled in Restaurant Settings

**Type:** Bug
**ID:** BUG-336
**Date:** 2026-08-17
**Status:** INTAKE COMPLETE — awaiting Gate 2 (Planning)
**Source Investigation:** INV-GST-001
**Severity:** CRITICAL — financial overcharge

---

## Description

When the owner disables GST in Restaurant Settings (Tax & Charges → "GST Enabled" toggle OFF), GST is still calculated and shown on every bill. Customers are being charged SGST + CGST despite the restaurant having turned GST off.

There are two compounding root causes identified in investigation:
1. The profile (which carries `gstStatus`) is never re-fetched after settings save → stale in memory *(covered by BUG-337)*
2. Even if `gstStatus` were refreshed to `false`, `CollectPaymentPanel` **never checks it** — tax is computed from `item.tax.percentage` directly, with no gate on `restaurant.tax.gstStatus`

## Classification

| Field | Value |
|---|---|
| Type | BUG |
| Area | Order Entry → CollectPaymentPanel → Tax Computation |
| Priority | P0 |
| Severity | CRITICAL — financial data integrity; incorrect billing |
| Risk | CRITICAL (tax/billing — money, VAT/GST, settlement) |
| Fast Lane | NO — financial logic; full gate process mandatory |

## Evidence

- Source: OWNER-REPORTED (confirmed by INV-GST-001)
- Steps to reproduce:
  1. Go to Restaurant Settings → Tax & Charges
  2. Toggle "GST Enabled" OFF → Save
  3. Open Order Entry → add items → go to Collect Bill
  4. SGST + CGST still shown and included in the total
- Confidence: CONFIRMED (code trace)

## Code Reality

```bash
# CollectPaymentPanel.jsx — tax computation (lines 249-275):
  const taxTotals = useMemo(() => {
    billableItems.forEach(item => {
      const tax = item.tax;
      if (!tax || tax.percentage === 0) return;   // ← only exits for 0% tax
      taxAmt = linePrice * (tax.percentage / 100); // ← GST applied regardless
      // MISSING: if (!restaurant?.tax?.gstStatus) return;
    });
  });

# restaurant.tax.gstStatus:
  profileTransform.js line 183: gstStatus: api.gst_status === true
  → ONLY consumed by BulkEditor.jsx (line 213) for validation warning
  → NOT consumed by CollectPaymentPanel at all

# gstStatus gate in CollectPaymentPanel: NONE
```

- **Code reality: FULL** — bug confirmed at `CollectPaymentPanel.jsx` lines 249-275

## Blast Radius

- Primary fix: `CollectPaymentPanel.jsx` — add `restaurant.tax.gstStatus` gate to `taxTotals` useMemo
- Secondary check: `CartPanel.jsx` (if it shows tax preview, needs same gate)
- `CollectPaymentPanel` tax section: ~33 lines referencing tax computation
- Estimated scope: SMALL (1-2 files, ~3-5 lines)

## Expected Behavior

- When `restaurant.tax.gstStatus === false`:
  - `CollectPaymentPanel` computes `sgst = 0`, `cgst = 0`
  - Bill shows ₹0 for SGST/CGST
  - `effectiveTotal` = food total only (no tax)
- When `restaurant.tax.gstStatus === true`: existing behavior unchanged

## Dependency

- BUG-337 (profile staleness) must also be fixed so that `gstStatus` reflects the latest saved value after settings change

## Owner Decisions Needed

- None — fix is clear from investigation

## Duplicate Check

DISTINCT — no prior BUG for gstStatus gate in CollectPaymentPanel.

---

**Next:** Gate 4 GO required before implementation (CRITICAL financial risk)
