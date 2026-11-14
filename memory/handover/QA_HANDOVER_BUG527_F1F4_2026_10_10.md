# QA HANDOVER — BUG-527 F1-F4
## DashboardPage Tile + CartPanel Room: discountAmount Subtraction

**Date:** 2026-10-10
**Implementation agent:** E1 (IMPLEMENTATION role)
**Plan:** `plans/BUG-527_IMPLEMENTATION_PLAN_F1F4_GATE3_2026_10_10.md`
**IA:** `impact/BUG-527_IMPACT_ANALYSIS_F1F4_2026_10_10.md`
**Risk:** HIGH (DashboardPage.jsx = R5)
**Sprint:** oct_bug_batch
**Prior QA:** `QA_HANDOVER_BUG527_2026_10_10.md` (E1-E4 PASS — confirmed by iteration_1.json)

---

## 1. Inherited from Plan — Verification Matrix Results

| Edit | File | Self-Test | Result |
|------|------|-----------|:---:|
| VM-F1a — BUG-527 marker | DashboardPage.jsx:56 | `grep -n "BUG-527" DashboardPage.jsx` → L56 | ✅ PASS |
| VM-F1b — discountAmount in computeRoomCardAmount | DashboardPage.jsx:56 | `grep -n "discountAmount" DashboardPage.jsx` | ✅ PASS |
| VM-F2a — BUG-527 marker | CartPanel.jsx:462 | `grep -n "BUG-527" CartPanel.jsx` → L462 | ✅ PASS |
| VM-F2b — dead `null ??` removed | CartPanel.jsx | no `null ??` in useMemo | ✅ PASS |
| VM-F3a — BUG-527 marker | CartPanel.jsx:1482 | `grep -n "BUG-527" CartPanel.jsx` → L1482 | ✅ PASS |
| VM-F3b — cart-room-balance testid intact | CartPanel.jsx:1481 | `grep -n "cart-room-balance"` → L1481 | ✅ PASS |
| VM-F4a — BUG-527 marker | CartPanel.jsx:1609 | `grep -n "BUG-527" CartPanel.jsx` → L1609 | ✅ PASS |
| VM-V5 — compile | webpack | 0 new warnings | ✅ PASS |

Self-test: 8/8 automated PASS. Browser verification deferred to QA agent.

---

## 2. Test Cases (F1-F4)

| # | Test | Steps | Expected | testid |
|---|------|-------|----------|--------|
| TC-F1 | Dashboard room tile post-discount | Login → Dashboard → Room tab → bonk r4 tile | Tile amount **~₹827** (not ₹1,827) | room tile |
| TC-F2 | Cart room balance display | Dashboard → bonk r4 → open order entry (don't open checkout) | `[data-testid=cart-room-balance]` = **₹600** (not ₹1,600) | `cart-room-balance` |
| TC-F3 | Checkout button label pre-CPP | Same order — bottom action bar | Button shows **"Checkout ₹827"** (not ₹1,827) | checkout button |
| TC-F4 | No discount guest unaffected | Open a room order with no check-in discount (`discountAmount=0`) | cart-room-balance = raw balance unchanged | `cart-room-balance` |

---

## 3. Regression Tests

| # | What to verify | Why |
|---|---|---|
| R1 | CPP still shows ₹600 balance (E1 unchanged) | F2 does not touch CPP; both should independently show ₹600 |
| R2 | CPP split button still enabled at food total (E3 unchanged) | F3/F4 are display only; E3 split logic untouched |
| R3 | PmsCheckoutDrawer C/Out balance still ₹600 (E4 unchanged) | F1-F4 don't touch PmsCheckoutDrawer |
| R4 | DashboardPage Room count / order actions unaffected | F1 only changes `computeRoomCardAmount`'s `roomBal` local variable |
| R5 | Non-room orders (dine-in/delivery) unaffected | `isRoom=false` → `roomBalance=0` in F2; F3/F4 guarded by `isRoom` |

---

## 4. Registry Sync Confirmation

```
Registry synced: YES
Item: BUG-527
Status: GATE_5A_IMPLEMENTED (full scope — E1-E4 + F1-F4)
Sprint: oct_bug_batch
EXIT GATE: ALL 5 PASSED
BUG-528: CLOSED_DUPLICATE
```

---

## 5. Credentials + Environment

| Account | Email | Password | Context |
|---|---|---|---|
| Owner | `owner@thegoankitchen.com` | `Qplazm@10` | RID 69, The Goan Kitchen |
| bonk booking | MG-69-2C201998-53D8-4980-A6A8-B042088BFC9D | — | room r4, order #000361 |
| bonk key values | booking_charge ₹3,000 · discount ₹1,000 · advance ₹1,500 · expected roomBal ₹600 · expected tile total ~₹827 | — | All F1-F4 tests |
| App URL | https://core-pos-frontend-12.preview.emergentagent.com | — | |
| Dashboard | `/dashboard` → Room tab | — | TC-F1 |
| Order entry | Dashboard → bonk r4 tile | — | TC-F2/F3 |

---

## 6. Files Changed

| File | Lines | Change |
|---|---|---|
| `src/pages/DashboardPage.jsx` | L53-56 | F1 — computeRoomCardAmount subtract discountAmount |
| `src/components/order-entry/CartPanel.jsx` | L457-463, L1482, L1609 | F2 roomBalance useMemo + F3 Room display + F4 Checkout button |
