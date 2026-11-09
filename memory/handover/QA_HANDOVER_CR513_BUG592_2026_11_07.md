# QA Handover — CR-513 + BUG-592 (2026-11-07)

**Items:** CR-513 (GATE_5A_IMPLEMENTED), BUG-592 (GATE_5A_IMPLEMENTED)
**Branch:** 7nov-1
**Sprint:** nov_cr_batch
**Risk:** CRITICAL (3 R5 files, print + discount)
**Implemented by:** E1 agent, 2026-11-07

---

## 1. Inherited from Plan (Verification Matrix results)

| Edit | File | Verification | Self-Test |
|------|------|-------------|:---------:|
| E1 | orderTransform.js L233 | `discount_value` fallback removed | ✅ PASS |
| E2 | orderTransform.js L2170-2173 | `discount_percentage` + `roundoff` conditional keys in builder | ✅ PASS |
| E3 | CollectPaymentPanel.jsx L1329-1333 | `discountPercent` + `roundoff` in handlePrintBill overrides | ✅ PASS |
| E4a | OrderEntry.jsx L1737-1738 | QSR Place&Pay sync auto-print | ✅ PASS |
| E4b | OrderEntry.jsx L1782-1783 | QSR Place&Pay background auto-print | ✅ PASS |
| E4c | OrderEntry.jsx L1861-1862 | QSR Pay auto-print | ✅ PASS |
| E4d | OrderEntry.jsx L2312-2313 | Prepaid auto-print | ✅ PASS |
| E4e | OrderEntry.jsx L2600-2601 | Postpaid collect auto-print | ✅ PASS |

Compile: webpack 0 new warnings (1 pre-existing).

---

## 2. Browser Test Cases (QA must execute)

| # | Test | Steps | Expected |
|---|------|-------|----------|
| T1 | CPP Print Bill — 30% manual discount | Open order → 30% discount → Print Bill → check Network `order-temp-store` body | `discount_percentage: 30`, `roundoff` present (signed), `discount_amount` = ₹ amount |
| T2 | CPP Print Bill — flat ₹ discount | Open order → flat ₹100 → Print Bill → check Network | `discount_percentage` ABSENT, `discount_amount` = 100 |
| T3 | CPP Print Bill — preset category % | Open order → select preset → Print Bill → check Network | `discount_percentage` = preset %, `roundoff` present |
| T4 | CPP Print Bill — no discount | Open order → no discount → Print Bill → check Network | `discount_percentage` ABSENT, `roundoff` present if non-zero |
| T5 | Round-off 0 | Order totals to exact ₹ (no paise) → Print Bill | `roundoff` ABSENT from payload |
| T6 | Round-down (negative) | Order total e.g. ₹763.77 → 764, round-off = -0.23 | `roundoff: -0.23` (negative, signed) |
| T7 | Prepaid auto-print | Place prepaid order with autoBill ON + 30% discount | Network `order-temp-store`: `discount_percentage: 30`, `roundoff` present |
| T8 | Postpaid collect auto-print | Collect payment with autoBill ON | Network: both keys present |
| T9 | QSR auto-print | QSR Place&Pay with discount | Network: both keys present |
| T10 | Reprint (dashboard OrderCard) | Click print icon on paid order | Network: `discount_percentage` ABSENT, `roundoff` ABSENT, `discount_amount` = ₹ value |
| T11 | BUG-592: discount ₹ vs % | Check paid order with 30% discount (e.g. #021113) | `order.discount` = 630 (₹ amount), NOT 30 (%) |
| T12 | Regression — existing keys | Compare order-temp-store payload with/without the fix | All pre-existing keys identical, only 2 additive keys new |

---

## 3. Regression Tests

| # | What to verify | Why |
|---|----------------|-----|
| R1 | BUG-001/002 bill amount + GST unchanged | Same payload builder |
| R2 | BUG-273 delivery charge still in payload | Adjacent keys in builder |
| R3 | BUG-281 B2B GST fields still present | Same builder region |
| R4 | BUG-556 auto-bill payment mode | Same OrderEntry auto-print sites |
| R5 | BUG-641 comp item `complementary: "Yes"` | Same builder, different region |
| R6 | CR-483 received_amount still sent | Adjacent in collectBillExisting |

---

## 4. Registry Sync Confirmation

Registry synced: YES
Items: CR-513, BUG-592
Sprint: nov_cr_batch
EXIT GATE: 4/4 PASSED (E5 unit tests deferred to QA)

---

## 5. Credentials + Environment

- Account: Owner@cafe103.com / Qplazm@10
- Preview URL: https://core-pos-front-12--3mndckun.preview.emergentagent.com
- Preprod API: https://preprod.mygenie.online
- Restaurant: cafe103 (ID 644)
- Running orders available: yes (9 dine-in + 6 room as of 2026-11-07)
- Settings: reconcile_amount=Yes, order_edit_access=Yes

---

## 6. Notes for QA

- **T7-T9 (auto-print)** require placing real orders with payment on preprod — use test/dev restaurant if available.
- **T10 (reprint)** can be tested on any paid order — just click the print icon.
- **Network inspection:** filter for `order-temp-store` in DevTools Network tab. The payload is the `data` field in the multipart form.
- **BUG-592 (T11):** verify on order #021113 (Palm House, 30% discount, ₹630 is the correct ₹ amount).
