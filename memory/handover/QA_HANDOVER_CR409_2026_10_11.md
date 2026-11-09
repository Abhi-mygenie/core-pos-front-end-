# QA Handover — CR-409
**Date:** 2026-10-11
**Stage:** GATE_5A_IMPLEMENTED → QA (Gate 5b)
**Implementation self-test:** 4/4 unit PASS + build PASS

---

## 1. Inherited from Plan (Verification Matrix)

| Edit | File | Verification | Self-Test |
|------|------|-------------|:---:|
| E-1 | `orderTransform.js` L447-453 | 4 coupon fields in `fromAPI.order` | ✅ grep + 4/4 Jest PASS |
| E-2a | `CollectPaymentPanel.jsx` L76-77 | `initialCoupon=null` prop | ✅ grep |
| E-2b | `CollectPaymentPanel.jsx` L333-343 | mount useEffect present | ✅ grep |
| E-3 | `OrderEntry.jsx` L1936-1953 | `initialCoupon=` prop passed | ✅ grep |
| Compile | All | `yarn build` exit 0 | ✅ PASS |

---

## 2. Full Test Cases

| # | Test | Steps | Expected |
|---|------|-------|----------|
| V-1 | E-1 coupon fields present | `grep -c "couponCode.*api.coupon_code" orderTransform.js` | 1 |
| V-2 | No-coupon order → empty | Jest: `fromAPI.order({id:1,...})` | `couponCode:'', couponDiscount:0` |
| V-3 | Coupon order → populated | Jest: `fromAPI.order({coupon_code:'MARRY',coupon_discount:197,...})` | `couponCode:'MARRY', couponDiscount:197` |
| V-4 | `initialCoupon` prop exists | `grep -c "initialCoupon = null" CollectPaymentPanel.jsx` | 1 |
| V-5 | Mount useEffect marker | `grep -c "CR-409" CollectPaymentPanel.jsx` | ≥2 |
| V-6 | Prop passed in OrderEntry | `grep -c "initialCoupon=" OrderEntry.jsx` | 1 |
| V-7 | Regular POS order — no regression | Open Collect Payment on dine-in order with no coupon | Coupon section blank — "Enter code or pick…" |
| V-8 | Scan order — coupon pre-loaded | Open web/QR order with coupon (e.g. order 1233112) → Collect Payment | "✓ MARRY (−₹197)" badge pre-loaded without cashier action |
| V-9 | Pay total correct | Same scan order (items ₹1,379, coupon −₹197) | Pay button = ₹1,242 |
| V-10 | Cashier can remove coupon | Click Remove on pre-loaded badge | Badge clears, total reverts |
| V-11 | Build clean | `yarn build` | exit 0, 0 new warnings |

---

## 3. Regression Tests

| # | What | Why |
|---|------|-----|
| R-1 | Regular dine-in order: open CPP → no coupon pre-loaded | `orderData.couponCode=''` → guard → `initialCoupon=null` → no-op |
| R-2 | Cashier manually types coupon on regular order | Type-ahead still works (E-2b useEffect only fires on mount with non-null `initialCoupon`) |
| R-3 | CR-408: CPP still has no auto-apply (deleted L880-887) | Confirm auto-apply is still gone after CR-409 changes |
| R-4 | Loyalty checkbox on scan order with pre-loaded coupon | `stackableWithLoyalty:true` → tick loyalty → coupon stays (B-2 guard won't fire) |

---

## 4. Registry Sync Confirmation

```
Registry synced:      YES
Item:                 CR-409
Status:               GATE_5A_IMPLEMENTED
Sprint:               oct_cr_batch
CR_REGISTRY.md:       GATE_5A_IMPLEMENTED row updated
FILE_OWNERSHIP.md:    CR-409 entries added (4 files)
Code markers:         // CR-409 in orderTransform.js + CPP + OrderEntry
Unit tests:           orderTransform.cr409.test.js — 4/4 PASS
EXIT GATE:            5/5 PASS
```

---

## 5. Credentials + Environment

| | |
|---|---|
| Account | owner@kunafamahal.com / Qplazm@10 |
| RID | 689 (Kunafa Mahal) |
| Preprod | https://preprod.mygenie.online |
| Preview | https://mygenie-pos-app-3.preview.emergentagent.com |
| Live scan order with coupon | Order 1233112 — customer phone 9653078028 — coupon MARRY (−₹197) |
