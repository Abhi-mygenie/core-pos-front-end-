# QA HANDOVER — BUG-527
## Dashboard CPP: Check-In Discount Missing + Room Balance Wrong + Split Gray

**Date:** 2026-10-10
**Implementation agent:** E1 (IMPLEMENTATION role)
**Plan:** `plans/BUG-527_IMPLEMENTATION_PLAN.md`
**Risk:** HIGH (CPP = R5 hotspot)
**Sprint:** oct_bug_batch

---

## 1. Inherited from Plan — Verification Matrix Results

| Edit | File | Self-Test | Result |
|------|------|-----------|:---:|
| E1 code marker | CPP L200 | `grep -n "BUG-527"` → L200 | ✅ PASS |
| E2 code marker | CPP L1844 | `grep -n "checkout-room-checkin-discount"` → L1846 | ✅ PASS |
| E3 code marker | CPP L3318 | `grep -n "effectiveTotal - roomBalance"` → L3318 | ✅ PASS |
| E4 code marker | PmsDrawer L281 | `grep -n "BUG-527"` → L281 | ✅ PASS |
| V7 compile | webpack | 0 new warnings | ✅ PASS |

Self-test: 5/5 automated checks PASS. Browser verification (V1–V7) deferred to QA agent.

---

## 2. Test Cases

| # | Test | Steps | Expected | data-testid |
|---|---|---|---|---|
| TC-527-1 | Check-in discount line visible | bonk → OrderEntry #000361 → Checkout → expand Room ▾ | **"Check-in Discount −₹1,000" row visible** between Lodging GST and Advance Paid | `checkout-room-checkin-discount` |
| TC-527-2 | Room balance = ₹600 | Same expanded Room section | Balance row shows **₹600** (not ₹1,600) | `checkout-room-balance` (header area) |
| TC-527-3 | Grand Total = ₹848 | Same — Bill Summary header | **₹848**; Grand Total stack: Food ₹248 + Room ₹600 = ₹848 | `bill-summary-header`, `bill-grand-total` |
| TC-527-4 | Split button enabled at food total | bonk → CPP → Split → Cash=200, UPI=48 → Remaining ₹0.00 | **Checkout ₹848 button green and clickable** (not gray) | `complete-payment-btn` |
| TC-527-5 | PmsCheckoutDrawer: C/Out path | Dashboard → room tile bonk → C/Out → expand Room section | **Balance = ₹600**; check-in discount line shown | `checkout-room-checkin-discount` |
| TC-527-6 | No check-in discount: guest at full price | Guest with no check-in discount → CPP Room section | **No "Check-in Discount" line**; Balance = full rack balance | `checkout-room-checkin-discount` absent |
| TC-527-7 | Non-room split unaffected | Dashboard → non-room order → CPP → Split → enter amounts | Split must cover **full food total** (effectiveTotal, no roomBalance subtraction) | `complete-payment-btn` |

---

## 3. Regression Tests

| # | What to verify | Why |
|---|---|---|
| R1 | BUG-526 (folio path) unaffected — FolioCheckoutPanel still passes correct balance_due to CPP | E1 changes CPP's roomBalance memo; FolioCheckoutPanel overrides roomInfo.roomPaymentSummary; these are separate paths |
| R2 | BUG-428 Lodging GST line still shows correctly above check-in discount | E2 inserts after the GST closing brace — verify GST line still renders above |
| R3 | Non-room CPP checkout unaffected — `isRoom=false` path | E3 conditional: `isRoom ? effectiveTotal-roomBalance : effectiveTotal` — non-room must still validate against full effectiveTotal |

---

## 4. Registry Sync Confirmation

```
Registry synced: YES
Item: BUG-527
Status: GATE_5A_IMPLEMENTED
Sprint: oct_bug_batch
EXIT GATE: ALL 5 PASSED
```

---

## 5. Credentials + Environment

| Account | Email | Password | Context |
|---|---|---|---|
| Owner | `owner@thegoankitchen.com` | `Qplazm@10` | RID 69, The Goan Kitchen |
| bonk booking | MG-69-2C201998-53D8-4980-A6A8-B042088BFC9D | — | room r4, order #000361 |
| bonk key values | booking_charge=₹3,000 · check-in discount=₹1,000 · advance=₹1,500 · roomBalance=₹600 post-fix · effectiveTotal=₹848 · foodOnly=₹248 | — | All dashboard CPP tests |
| Dashboard URL | `/dashboard` → Room tab → bonk r4 tile → C/Out | — | TC-527-5 path |
| PMS URL | `/pms/front-desk-v2?tab=inhouse` | — | TC-527-1..4 path |

---

## 6. Files Changed

| File | Lines | Change |
|---|---|---|
| `src/components/order-entry/CollectPaymentPanel.jsx` | L200: 1 line edit · L1844-1851: 8 lines inserted · L3318: 1 line edit | E1 + E2 + E3 |
| `src/components/pms/PmsCheckoutDrawer.jsx` | L281: 1 line inserted | E4 |
