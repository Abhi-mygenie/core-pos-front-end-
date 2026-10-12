# QA HANDOVER — BUG-526
## Folio Checkout Button Gray When Room Split + CPP Split Both Active

**Date:** 2026-10-10
**Implementation agent:** E1 (IMPLEMENTATION role)
**Plan:** `plans/BUG-526_IMPLEMENTATION_PLAN.md`
**Risk:** HIGH
**Sprint:** oct_bug_batch

---

## 1. Inherited from Plan — Verification Matrix Results

| Edit | File | Change | Self-Test Result |
|------|------|--------|:---:|
| E1 code marker | FolioCheckoutPanel.jsx | `grep -n "BUG-526"` → L413 | ✅ PASS |
| E1 condition | FolioCheckoutPanel.jsx | `grep -n "roomSplitEnabled && !roomSplitOverBalance"` → L417 | ✅ PASS |
| V5 compile | webpack | 0 new warnings | ✅ PASS |

Self-test: 3/3 automated checks PASS. Browser verification (V1–V4) deferred to QA agent.

---

## 2. Test Cases

| # | Test | Steps | Expected | data-testid |
|---|---|---|---|---|
| TC-526-1 | Checkout button enabled when room+food both split | Folio → bonk guest → enable room split → enter legs (400+100=500, matching effectiveRoomBalance=500) → CPP By Payment → Cash 100, UPI 91 → Remaining ₹0.00 | **Checkout button green and clickable (not gray)** | `complete-payment-btn` |
| TC-526-2 | CPP shows food-only total | Same state as TC-526-1 | Bill Summary header = ₹191; Grand Total stack Food=191, Room Balance hidden or 0, Grand Total=191 | `bill-summary-header`, `bill-grand-total`, `bill-stack-food`, `bill-stack-room-balance` |
| TC-526-3 | Checkout stays gray when legs wrong | Room split ON, legs=300+100=400 (≠500 balance) → CPP split → Cash+UPI | Checkout still gray (roomSplitOverBalance=true → condition false → balance_due stays non-zero) | `complete-payment-btn` |
| TC-526-4 | No regression: room split OFF | Bonk → room split OFF → full CPP checkout (Cash/Card/UPI) | Checkout enabled when amount entered; Bill Summary shows ₹691 (food+room) | `complete-payment-btn`, `bill-summary-header` |
| TC-526-5 | No regression: room discount + room split | bonk: apply 23% CPP food discount + ₹100 room discount via room section → room split (400+100=500 legs) → CPP split food (100+91=191 for discounted food total) | Checkout enabled at exact discounted food total | `complete-payment-btn` |

---

## 3. Regression Tests

| # | What to verify | Why |
|---|---|---|
| R1 | BUG-525-FIX still works — over-balance alert shows when legs > effectiveRoomBalance | BUG-526 uses `!roomSplitOverBalance`; must not break the BUG-525 alert trigger |
| R2 | BUG-525-FIX under-balance alert shows when legs < effectiveRoomBalance | Same contract dependency |
| R3 | Non-folio (dashboard CPP) unaffected — CPP `roomBalance` memo is independent of FolioCheckoutPanel changes | FolioCheckoutPanel passes `balance_due` → roomInfo → CPP reads `remainingRoomBalance`; separate code path |

---

## 4. Registry Sync Confirmation

```
Registry synced: YES
Item: BUG-526
Status: GATE_5A_IMPLEMENTED
Sprint: oct_bug_batch
EXIT GATE: ALL 5 PASSED
```

---

## 5. Credentials + Environment

| Account | Email | Password | Context |
|---|---|---|---|
| Owner | `owner@thegoankitchen.com` | `Qplazm@10` | RID 69, The Goan Kitchen |
| Folio path | `/pms/front-desk-v2?tab=inhouse` | — | Leaving today tab → Bill (bonk) |
| bonk key values | booking_charge=₹3,000 · check-in discount=₹1,000 · advance=₹1,500 · effectiveRoomBalance=₹500 (baseBalance=₹1,000, minus ₹500 room discount legs) | — | Confirm exact values in browser before TC-526-1 |

**Note:** effectiveRoomBalance in the bonk scenario = baseBalance − roomDiscountInfoRs. Verify the actual value shown in the room split UI before entering legs for TC-526-1.

---

## 6. File Changed

| File | Lines | Change |
|---|---|---|
| `src/components/pms/frontdesk/FolioCheckoutPanel.jsx` | L413→L418 (1 line → 6 lines) | BUG-526 conditional `balance_due` |
