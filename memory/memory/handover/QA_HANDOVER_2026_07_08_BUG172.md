# QA HANDOVER — 2026-07-08 — BUG-172 (Interim Tax Fix)

## 1. Verification Matrix Results

| # | File | Change | Self-Test |
|---|------|--------|:---------:|
| 1 | orderTransform.js L1875-1913 | Replaced item-level tax loop with backend-derived `totalTax = order.amount - order.subtotalBeforeTax`, split by item tax type | ✅ Verified — code present, webpack clean, lint clean |

Self-test: 1/1 edit verified. Webpack: 0 new warnings. Lint: 0 new errors.

## 2. Test Cases

| # | Test | Steps | Expected |
|---|------|-------|----------|
| 1 | VAT-only + addons | Login `owner@18march.com` → find order with sahi paneer + addon → Print from OrderCard → Network tab `/order-temp-store` | `vat_tax` = `order_amount - order_sub_total_without_tax` (e.g., 333-321.2=11.8). NOT 3.68. `gst_tax = 0` |
| 2 | No-addon order | Print a plain item order → check payload | Tax derived correctly (same formula) |
| 3 | Zero-tax scenario | If available, order with 0% tax items | `gst_tax = 0`, `vat_tax = 0` |
| 4 | Collect Bill regression | Place order → Collect Bill → auto-print | Uses overrides path (unchanged). Tax values from live UI. |
| 5 | Complimentary | Order with comp item → Print | Comp items excluded from tax type check |

## 3. Regression Tests

| # | What | Why |
|---|------|-----|
| 6 | Subtotal/SC still correct | BUG-168 v3 fix not regressed by BUG-172 |

## 4. Registry Sync
EXIT GATE: 5/5 — code marker present, webpack clean, lint clean, scope locked, single file

## 5. Credentials
- `owner@18march.com` / `Qplazm@10` (18March, VAT restaurant, addon orders)
- Preview: `https://store-register-10.preview.emergentagent.com`
