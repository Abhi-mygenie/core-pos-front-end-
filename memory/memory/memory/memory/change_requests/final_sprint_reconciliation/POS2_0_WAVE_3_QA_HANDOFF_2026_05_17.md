# POS2.0 Wave 3 QA Handoff — 2026-05-17

## 1. Purpose

QA handoff document for Wave 3 (BUG-080 + BUG-056). Owner smoke tests have passed. This document defines the full QA regression checklist.

---

## 2. Bugs Implemented

| Bug | Title | Owner Smoke | Files Changed |
|---|---|---|---|
| BUG-080 | partial_payments UI enforcement | ✅ PASS | `CollectPaymentPanel.jsx` |
| BUG-056 | Preset discount dropdown | ✅ PASS | `CollectPaymentPanel.jsx`, `profileTransform.js` |

---

## 3. BUG-080 QA Checklist

### Primary Tests

| # | Test | Steps | Expected | Priority |
|---|------|-------|----------|----------|
| 1 | Cash-only restaurant | Login as restaurant with only `pay_cash=Yes` | Only Cash button in Row 1; split shows only Cash row | P0 |
| 2 | Cash+UPI restaurant | Login with `pay_cash=Yes`, `pay_upi=Yes`, `pay_cc=No` | Cash + UPI buttons; Card hidden; split shows 2 rows | P0 |
| 3 | All 3 enabled | Login with all 3 enabled | Cash, Card, UPI all visible; split shows 3 rows | P0 |
| 4 | Default payment method | Open Collect Bill on cash-disabled restaurant | Defaults to first enabled (UPI or Card), not cash | P0 |
| 5 | Split auto-fill (2 methods) | Split mode, type 500 in Cash | UPI auto-fills with `total - 500` | P1 |
| 6 | Split auto-fill reverse | Type in UPI field instead | Cash auto-fills with remainder | P1 |
| 7 | Split auto-fill clear | Clear Cash field | UPI also clears | P1 |
| 8 | Split validation (3 methods) | Cash=500, UPI=500, type 9999 in Card | Card capped at `total - 1000` | P0 |
| 9 | Split validation (2 methods) | Type amount > total in Cash | Capped at total; UPI shows 0 or empty | P0 |
| 10 | Card Txn ID | Split with Card enabled | Card row shows Txn ID field | P1 |
| 11 | Payload 3-entry | Place+Pay with split | `partial_payments` still has 3 entries; disabled modes at zero | P0 |
| 12 | Tab NOT in partial_payments | Place+Pay with tab enabled | No `tab` entry in `partial_payments` | P1 |

### Regression Tests

| # | Test | Expected | Priority |
|---|------|----------|----------|
| R1 | Hold-Collect context (Audit → Hold tab) | Row 1 filters correctly; Row 2 hidden; default method works | P0 |
| R2 | Single payment (non-split) | Cash/Card/UPI single payment still works | P0 |
| R3 | Split by Station | Bar/Kitchen dropdowns UNCHANGED (still show all 3 — separate CR) | P1 |
| R4 | Credit/Tab payment | Tab settlement path unchanged | P1 |
| R5 | To Room transfer | Transfer to Room still works | P1 |

---

## 4. BUG-056 QA Checklist

### Primary Tests

| # | Test | Steps | Expected | Priority |
|---|------|-------|----------|----------|
| 1 | Dropdown shows presets | Open Collect Bill for restaurant with discount categories | Dropdown: None, %, ₹, then preset names with percentages | P0 |
| 2 | Select preset | Select "Thrive — 20%" | Discount applied; input hidden; green `-₹` amount shown | P0 |
| 3 | Preset → manual | Select preset, then switch to "%" | Preset clears; input appears; manual mode active | P0 |
| 4 | Manual → preset | Enter 5%, then select preset | Manual clears; preset applies | P0 |
| 5 | Select None | Select "None" from dropdown | Both manual and preset cleared; no discount | P0 |
| 6 | No presets restaurant | Login as restaurant WITHOUT discount categories | Only None, %, ₹ in dropdown (same as before) | P0 |
| 7 | Preset + Coupon combo | Apply preset, then apply coupon | Both apply (preset replaces manual only, not coupon) | P1 |
| 8 | Payload — `comm_discount` | Collect bill with preset selected | `comm_discount` in payload has correct value | P0 |
| 9 | Preset 100% (Complementary) | Select "Complementary — 100%" | Full item total as discount; grand total = 0 (+ tax/SC if any) | P1 |

### Regression Tests

| # | Test | Expected | Priority |
|---|------|----------|----------|
| R1 | Manual % discount | Manual % still works same as before | P0 |
| R2 | Manual ₹ discount | Manual flat ₹ still works same as before | P0 |
| R3 | Coupon section | Coupon apply/remove unaffected | P1 |
| R4 | Loyalty section | Loyalty toggle unaffected | P1 |
| R5 | Bill summary totals | Total discount reflects preset correctly | P0 |
| R6 | Print bill with preset | Printed bill shows correct discount amount | P1 |

---

## 5. Test Restaurants

| Restaurant | Credentials | Key Config | Use For |
|---|---|---|---|
| Palm House (id=541) | owner@palmhouse.com / Qplazm@10 | `pay_cc=Yes`, `pay_upi=Yes`, `pay_cash=Yes`, 3 preset discounts | BUG-056 presets, BUG-080 all methods |
| 18 March (id=?) | owner@18march.com / Qplazm@10 | Card disabled | BUG-080 2-method filtering |

---

## 6. Business Rules To Verify Post-QA

| Rule | Check |
|---|---|
| PAY-001/002/004 | Payload structure unchanged |
| PAY-008 | Tab settlement path untouched |
| TOTALS-001/002 | Item Total and Subtotal formulas unchanged |
| SC-001/002/003/006 | SC calculation unchanged |
| TIP-001/002 | Tip calculation unchanged |
| ROUND-002 | Round-off applies to Grand Total only |

---

## 7. Final Status

`wave_3_qa_handoff_created`

---

*— End of POS2.0 Wave 3 QA Handoff —*
