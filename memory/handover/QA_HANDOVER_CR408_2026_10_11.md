# QA Handover — CR-408
**Date:** 2026-10-11
**Stage:** GATE_5A_IMPLEMENTED → QA (Gate 5b)
**Implementation agent self-test:** 2/2 automated PASS, build PASS

---

## 1. Inherited from Plan (Verification Matrix results)

| Edit | File | Verification | Self-Test Result |
|------|------|-------------|:---:|
| E-1 | `CollectPaymentPanel.jsx` L880–887 | `grep -c "Auto-apply best order-scope coupon" CPP.jsx` → 0 | ✅ PASS |
| E-1 marker | `CollectPaymentPanel.jsx` L880 | `grep -n "CR-408" CPP.jsx` → 1 hit at L880 | ✅ PASS |
| E-1 compile | `CollectPaymentPanel.jsx` | `yarn build` exit 0, 0 new warnings | ✅ PASS |

---

## 2. Full Test Cases for QA Agent

| # | Test | Steps | Expected | Automated? |
|---|------|-------|----------|:---:|
| V-1 | Auto-apply comment deleted | `grep -c "Auto-apply best order-scope coupon" src/components/order-entry/CollectPaymentPanel.jsx` | `0` | YES |
| V-2 | CR-408 marker present | `grep -n "CR-408" src/components/order-entry/CollectPaymentPanel.jsx` | ≥1 hit at ~L880 | YES |
| V-3 | No coupon auto-applied on panel open | Login kunafamahal.com → open any scan/web order with CRM customer (phone 9653078028) → tap Collect Payment | Coupon section shows "Enter code or pick…" — NO pre-filled coupon badge, no "MARRY (-₹197)" | NO |
| V-4 | Dropdown populates on input focus | On Collect Payment → click/tap inside the coupon input field | Dropdown appears showing available CRM coupons (MARRY etc.) | NO |
| V-5 | Type-ahead auto-complete still works | Type "MA" in coupon input | Within 500ms — MARRY coupon validates and badge appears | NO |
| V-6 | Manual dropdown pick still works | Open dropdown → click MARRY coupon row | Coupon validates → "✓ MARRY (−₹197)" badge appears → bill total reduces | NO |
| V-7 | Pay payload — no coupon selected | Open panel, do NOT apply coupon → inspect network on Pay | `coupon_code: ""`, `coupon_discount: 0` | NO |
| V-8 | Pay payload — cashier-chosen coupon | Apply MARRY via dropdown → inspect network on Pay | `coupon_code: "MARRY"`, `coupon_discount: 197` | NO |

---

## 3. Regression Tests

| # | What to verify | Why |
|---|---|---|
| R-1 | Loyalty auto-remove still works | B-2 useEffect directly follows CR-408 marker — verify: tick loyalty checkbox while MARRY is applied → coupon removed + toast shown | Non-stackable coupon removal still fires |
| R-2 | Existing order with no CRM customer — coupon section absent | Open order with no phone/customer → confirm coupon section stays hidden (no CRM customer, no fetch) | Fetch guard `customer?.id` still intact |
| R-3 | Manual discount unaffected | Apply manual discount → confirm "Remove the coupon to apply a manual discount" copy unchanged | Unrelated coupon UX path |

---

## 4. Registry Sync Confirmation

```
Registry synced:        YES
Item:                   CR-408
Status:                 GATE_5A_IMPLEMENTED
Sprint:                 oct_cr_batch
CR_REGISTRY.md:         GATE_5A_IMPLEMENTED row updated
FILE_OWNERSHIP.md:      CR-408 entry added
Code marker:            // CR-408 at CollectPaymentPanel.jsx L880
EXIT GATE:              5/5 PASS
```

---

## 5. Credentials + Environment

| | |
|---|---|
| Account | owner@kunafamahal.com / Qplazm@10 |
| RID | 689 (Kunafa Mahal) |
| Preprod | https://preprod.mygenie.online |
| Preview | https://mygenie-pos-app-3.preview.emergentagent.com |
| Live scan order with coupon | Order 1233112 — customer phone 9653078028 — coupon MARRY |

---

## 6. What Changed (plain language for QA)

The Collect Payment panel used to silently auto-apply the best available CRM coupon the moment it fetched the available coupon list — no cashier action required. That auto-apply `useEffect` has been deleted. The panel now opens with the coupon section blank. The cashier must explicitly click the coupon input, pick from the dropdown, or type a code for a coupon to apply. All other coupon functionality (dropdown, type-ahead, manual Apply button, coupon removal) is unchanged.
