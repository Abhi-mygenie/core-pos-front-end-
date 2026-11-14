# BUG-526 — Implementation Plan (Gate 3)
## Folio Checkout Button Gray When Room Split + CPP Split Both Active

**Date:** 2026-10-09
**Risk:** HIGH
**Impact Analysis:** `impact/BUG-526_IMPACT_ANALYSIS.md`
**OD-BUG526-01 LOCKED:** backend safe with `room_balance=0` when `partial_payments_room` present
**OD-BUG526-02 LOCKED:** CPP "Remaining" display stays food-only (no change needed)

---

## Scope Lock

**Files WILL change:**
- `src/components/pms/frontdesk/FolioCheckoutPanel.jsx` — 1 edit

**Files WILL NOT touch:**
- `CollectPaymentPanel.jsx` (R5) — NOT needed; confirmed in IA
- `orderTransform.js` (R5) — NOT needed; `payment_amount` unchanged (BUG-484 formula)
- `frontDeskService.js` — NOT needed
- `frontdesk.css` — NOT needed
- Any test files

---

## Edit

### E1 — `FolioCheckoutPanel.jsx` L413: conditional `balance_due` when room split fully covers room

**Current L413:**
```js
                balance_due: Math.max(0, (baseBalance ?? Number(row.charge?.balance_due || 0)) - roomDiscountInfoRs) // BUG-498: roomDiscountInfoRs now baseBalance-based
```

**New L413–416:**
```js
                // BUG-526: when room split legs exactly cover the room balance, pass balance_due=0
                // so CPP's effectiveTotal = food-only and CPP split/cash disabled checks
                // compare against food total (not food+room). CPP display = food-only per OD-INV2-01.
                // !roomSplitOverBalance = legs total equals effectiveRoomBalance (BUG-525-FIX contract).
                balance_due: (roomSplitEnabled && !roomSplitOverBalance && effectiveRoomBalance > 0)
                  ? 0
                  : Math.max(0, (baseBalance ?? Number(row.charge?.balance_due || 0)) - roomDiscountInfoRs) // BUG-498
```

**Why `!roomSplitOverBalance`:**
`roomSplitOverBalance` (L293-298) is `true` when `roomSplitTotal !== effectiveRoomBalance` (over OR under). So `!roomSplitOverBalance` is `true` only when legs exactly equal the room balance — exactly the condition we need. Reuses existing BUG-525-FIX logic. No new variables.

**All variables in scope at L413:**
- `roomSplitEnabled` — state (L219) ✓
- `roomSplitOverBalance` — useMemo (L293) ✓
- `effectiveRoomBalance` — useMemo (L289) ✓

---

## Condition Truth Table

| roomSplitEnabled | roomSplitOverBalance | effectiveRoomBalance | balance_due result | Behavior |
|---|---|---|---|---|
| false | — | — | original formula | Split OFF → normal checkout ✓ |
| true | true (legs≠balance) | any | original formula | Legs wrong → room balance stays in CPP (user must fix legs alert first) ✓ |
| true | false (legs=balance) | >0 | **0** | Legs match room → CPP food-only ✓ |
| true | false (legs=balance) | 0 | 0 (original=0 too) | No room balance → same result ✓ |
| true | false (empty legs=0) | 0 | 0 (original=0 too) | Zero balance → fine ✓ |

Edge case when split OFF + legs empty (roomSplitTotal=0):
- `roomSplitEnabled=false` → condition false → original formula ✓

Edge case when split ON, legs=0 (not yet filled):
- `roomSplitOverBalance = (0 !== effectiveRoomBalance) = true` → condition false → original formula ✓

---

## Verification Matrix

| Edit | File | How to verify | Automated? |
|---|---|---|---|
| E1 (code) | FolioCheckoutPanel.jsx | `grep -n "BUG-526" FolioCheckoutPanel.jsx` → 1 hit at L413 region | YES |
| E1 (logic) | FolioCheckoutPanel.jsx | `grep -n "roomSplitEnabled && !roomSplitOverBalance" FolioCheckoutPanel.jsx` → found | YES |
| V1 (button enabled) | Browser | Bonk guest → room split ON, legs=400+100=500 (=balance) → CPP split Cash+UPI for food → Checkout button enabled | NO |
| V2 (button stays gray) | Browser | Bonk guest → room split ON, legs=300+100=400 (≠balance=500) → CPP food split → Checkout button still gray | NO |
| V3 (split OFF unaffected) | Browser | Bonk guest → room split OFF → full CPP checkout works normally | NO |
| V4 (CPP grand total) | Browser | With fix active (legs=balance): CPP shows "Grand Total ₹191" (food-only) and "Checkout ₹191" | NO |
| V5 (compile) | webpack | 0 new warnings from this edit | YES |

---

## Post-Code Registry Checklist

```
□ 1. registry.json: BUG-526 → status: GATE_5A_IMPLEMENTED, sprint_key: oct_bug_batch
□ 2. BUG_TRACKER.md: BUG-526 row → GATE_5A_IMPLEMENTED
□ 3. FILE_OWNERSHIP.md: FolioCheckoutPanel.jsx → BUG-526, 2026-10-09
□ 4. Code markers: // BUG-526 comment in the 1 edited location ✓ (in plan above)
□ 5. Compile check: webpack 0 new warnings
```

---

## QA Handover Seed

| # | Test | Steps | Expected | data-testid |
|---|---|---|---|---|
| TC-526-1 | Checkout enabled when room+food both split | Bonk → enable room split (400+100=500) → CPP By Payment (Cash 100+UPI 91) → Remaining ₹0.00 | **Checkout button enabled, not gray** | `complete-payment-btn` |
| TC-526-2 | CPP shows food-only total | Same state as TC-526-1 | Bill Summary header = ₹191; Grand Total Stack shows Food=191, Room Balance hidden, Grand Total=191 | `bill-summary-header`, `bill-grand-total`, `bill-stack-food`, `bill-stack-room-balance` |
| TC-526-3 | Checkout still gray when legs wrong | Room split ON, legs=300+100=400 (≠500 balance) → CPP split | Checkout still gray (roomSplitOverBalance=true, balance_due stays non-zero) | `complete-payment-btn` |
| TC-526-4 | No regression: room split OFF | Split OFF → CPP single cash/card/UPI → normal checkout | Checkout enabled when amount entered; Bill Summary shows ₹691 | `complete-payment-btn`, `bill-summary-header` |
| TC-526-5 | No regression: 23% food discount | 23% CPP discount + ₹100 room discount + room split (400+100) → CPP split food (100+91) | Checkout enabled at exact food total ₹191 | `complete-payment-btn` |
