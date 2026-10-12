# QA Handover — CR-411
**Date:** 2026-10-12
**Stage:** GATE_5A_IMPLEMENTED → QA (Gate 5b)
**Self-test:** 15/15 structural tests PASS · yarn build PASS

---

## 1. Inherited from Plan (Verification Matrix)

| Check | Self-Test |
|-------|:---:|
| V-1: nonce count = 1 (only stay-on-order) | ✅ PASS |
| V-2: CR-411 markers ≥3 in DashboardPage, ≥2 in OrderEntry | ✅ PASS |
| V-3: E-3 cart clear in handleCloseOrderEntry | ✅ PASS |
| V-4: E-4 `onCartChange?.(oldKey,[])` | ✅ PASS |
| V-5: E-5 CR-411 in carry-forward branch | ✅ PASS |
| V-6: 15/15 structural tests PASS | ✅ PASS |
| V-7: yarn build exit 0 | ✅ PASS |

---

## 2. Full Test Cases for QA Agent

| # | Test | Steps | Expected |
|---|------|-------|----------|
| V-1..V-7 | Automated (grep + Jest + build) | Run per plan | All PASS |
| V-8 | **Type switch keeps cart** | Open POS → Add Order (Walk-In) → add 2+ items → tap Walk-In header badge → switch to TakeAway | Items stay in cart; no wipe |
| V-9 | **Table switch keeps cart** | Open POS → Add Order (Walk-In) → add 2+ items → header dropdown → pick a table | Items stay in cart; table changes |
| V-10 | **Cancel → dashboard clears cart** | Open POS → Add Order → add items → press Cancel/X back to dashboard → Add Order again (Walk-In) | Cart is EMPTY on re-open |
| V-11 | **Stay-on-order after collect-bill** | Complete an order with collect-bill + stay-on-order toggle ON | New session starts empty (nonce bump still fires at L1560) |
| V-12 | **Re-engage placed order** | Click an occupied table on dashboard | Placed items (placed=true) restored from orderData, not from stale cartsByTable |

---

## 3. Regression Tests

| # | What | Why |
|---|------|-----|
| R-1 | R13 Walk-in: close Walk-In → re-open → empty | handleCloseOrderEntry clears `cartsByTable['walkIn']` |
| R-2 | PROD-004 stay-on-order: nonce at L1560 still fires | V-1 confirms exactly 1 nonce bump remaining |
| R-3 | CR-408 auto-apply still removed | `grep -c "Auto-apply best order-scope coupon" CollectPaymentPanel.jsx` → 0 |

---

## 4. Registry Sync Confirmation

```
Registry synced:      YES
Item:                 CR-411
Status:               GATE_5A_IMPLEMENTED
Sprint:               oct_cr_batch
CR_REGISTRY.md:       GATE_5A_IMPLEMENTED row updated
FILE_OWNERSHIP.md:    CR-411 entries added
Code markers:         // CR-411 in DashboardPage.jsx (×3) + OrderEntry.jsx (×2)
Structural tests:     DashboardPage.bug452.test.jsx — 15/15 PASS
EXIT GATE:            5/5 PASS
```

---

## 5. Credentials + Environment

| | |
|---|---|
| Account | owner@kunafamahal.com / Qplazm@10 |
| Preview | https://mygenie-pos-app-3.preview.emergentagent.com |
| UAT reference | pos-uat.mygenie.online (original screenshot) |
