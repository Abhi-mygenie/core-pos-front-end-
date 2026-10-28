# QA Handover — BUG-534 + BUG-535

**Date:** 2026-10-11
**Written by:** IMPLEMENTATION agent
**Items:** BUG-534 (ExtendStayForm result panel discount row) + BUG-535 (FolioCheckoutPanel `* nights` GST slab)
**Sprint:** oct_bug_batch

---

## §4 Registry Sync Confirmation

```
Registry synced: YES
BUG-534: GATE_5A_IMPLEMENTED / oct_bug_batch
BUG-535: GATE_5A_IMPLEMENTED / oct_bug_batch
EXIT GATE: ALL 5 PASSED

□1 Registry: PASS (BUG-534 + BUG-535 GATE_5A_IMPLEMENTED, sprint oct_bug_batch)
□2 BUG_TRACKER.md: PASS (both rows updated to GATE_5A_IMPLEMENTED)
□3 FILE_OWNERSHIP.md: PASS (BUG-534 + BUG-535 sections added at top)
□4 Code markers: PASS (// BUG-534 on ExtendStayForm.jsx L78 · // BUG-535 on FolioCheckoutPanel.jsx L248+L253)
□5 Compile: PASS (webpack 0 new warnings — 1 pre-existing allDays warning in SettlementReportMockup.jsx unchanged)
```

---

## §5 Credentials + Environment

| Field | Value |
|---|---|
| Test account | `owner@thegoankitchen.com` / `Qplazm@10` |
| RID | 69 (The Goan Kitchen) |
| Test room | bonk r4 · originally 1 night · extended to 2 nights |
| Check-in discount | ₹1,000 |
| Advance paid | ₹2,000 |
| bp (balancePayment) | ₹10,400 |
| App URL | https://core-pos-app-5.preview.emergentagent.com |
| Path | Login → Front Desk (Beta) → InHouse tab → r4 row |

---

## §1 Inherited from Plan (Verification Matrix results — self-test)

### BUG-534

| Edit | File | Verification | Self-Test Result |
|---|---|---|---|
| E1 | ExtendStayForm.jsx L78 | `discountAmt > 0` guard present | ✅ Code verified — conditional JSX with `/* BUG-534 */` marker at L78 |
| E1 | ExtendStayForm.jsx L78 | `rc.balance_due` (L83) untouched | ✅ Code verified — L83 unchanged |
| E1 | ExtendStayForm.jsx L78 | `data-testid="extend-bill-discount"` present | ✅ Code verified — testid in inserted span |
| E1 | ExtendStayForm.jsx | Webpack compiles, 0 new warnings | ✅ PASS — "webpack compiled with 1 warning" (pre-existing allDays) |

### BUG-535

| Edit | File | Verification | Self-Test Result |
|---|---|---|---|
| E1 | FolioCheckoutPanel.jsx L248 | `discountedPrice * nights` removed | ✅ Code verified — grep returns empty |
| E2 | FolioCheckoutPanel.jsx L253 | `gstRate` denominator = `discountedPrice` | ✅ Code verified — `gst.gstTotal / discountedPrice` at L253 |
| E1+E2 | FolioCheckoutPanel.jsx | Webpack compiles, 0 new warnings | ✅ PASS |

---

## §2 Test Cases for QA Agent

### BUG-534 Test Cases

| # | Test | Steps | Expected |
|---|---|---|---|
| T534-1 | **PRIMARY: Discount row appears in result panel** | Login as TGK → Front Desk (Beta) → InHouse → expand r4 row → Extend tab → pick checkout +1 day → enter reason → Confirm | Result panel shows "Check-in discount −₹1,000" row between "Booking charge" and "SGST". `data-testid="extend-bill-discount"` present in DOM. |
| T534-2 | **Balance due correct and unchanged** | Same flow as T534-1 | "Balance due" row shows ₹11,020. NOT equal to `rc.total_with_gst − advance` (₹14,070 − ₹2,000 = ₹12,070). Server authority preserved. |
| T534-3 | **No row for non-discounted room** | Extend a room that has no check-in discount → Confirm | Result panel has NO "Check-in discount" row. All other rows present. |
| T534-4 | **Pre-confirm "Current bill" panel unchanged (regression)** | Extend r4 (before clicking Confirm, inspect left panel) | Still shows: rack crossed out ~~₹7,035~~ → Check-in discount −₹1,000 → Total ₹5,985 → Balance ₹3,985. BUG-533 display unaffected. |

### BUG-535 Test Cases

| # | Test | Steps | Expected |
|---|---|---|---|
| T535-1 | **PRIMARY: Folio shows correct balance for 2-night discounted booking** | Front Desk → InHouse → expand r4 (2 nights post-extension, discount ₹1,000) → Bill tab | Folio shows: SGST ₹310 · CGST ₹310 · Room balance ₹11,020. NOT ₹14,864 / ₹14,504. |
| T535-2 | **1-night booking unchanged (regression)** | Open Bill on any 1-night non-extended booking | Folio values unchanged vs expected for 1-night. GST slab and balance unaffected. |
| T535-3 | **Non-discounted 2-night booking (regression)** | Extend a room without check-in discount to 2 nights → open Bill | GST computed at correct slab for that room's nightly rate. No over-charging. |
| T535-4 | **InHouse balance column still correct** | InHouse panel row for r4 (2-night extended) | Balance column still shows ₹11,020. pmsService path unaffected. |

---

## §3 Regression Tests

| # | What to verify | Why |
|---|---|---|
| R1 | BUG-533 "Current bill" pre-confirm panel on r4 still correct (rack crossed out → −₹1,000 → ₹5,985 → ₹3,985) | BUG-534 edit is in the POST-confirm result panel JSX block — adjacent but separate. Verify no bleed. |
| R2 | FolioCheckoutPanel for a non-PMS order (regular F&B) | `discountAmt = 0` for non-room orders → `discountedPrice = bc − 0 = bc`. BUG-535 fix path still correct. |
| R3 | FolioCheckoutPanel split payment flows (BUG-526/BUG-527 area) | BUG-535 only touched L248+L253 in useMemo; split logic at L413-418 untouched. Verify split still works. |
