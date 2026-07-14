# QA HANDOVER — 2026-07-08 — BUG-168 v3 (Backend Passthrough for Manual Print)

## 1. Inherited from Plan (Verification Matrix results)

| Edit | File | Verification | Self-Test Result |
|------|------|-------------|:---:|
| 1 | orderTransform.js:L1799 | `hasFinancialOverrides` gate added | ✅ Verified — boolean gates Collect Bill vs manual print |
| 2 | orderTransform.js:L1803-1893 | `if/else` branch: Collect Bill keeps existing, manual print uses backend | ✅ Verified — both branches present |
| 3 | orderTransform.js:L1927 | `finalOrderItemTotal` → `order.subtotalAmount` only | ✅ Verified — no `computedSubtotal` fallback |
| 4 | orderTransform.js:L1928-1933 | `finalOrderSubtotal` → `order.subtotalBeforeTax` only | ✅ Verified — no recomputation, no double SC |

Self-test: 4/4 edits verified. Webpack: 0 new warnings. Lint: 0 new errors.

## 2. Test Cases

| # | Test | Steps | Expected |
|---|------|-------|----------|
| A | Manual print with addons | Place order with addon items → Print from OrderCard | `order_item_total` = backend's `order_sub_total_amount` (e.g., 219 for sahi paneer x3 + cheese addon). Check Network tab → `/order-temp-store` request body |
| B | Manual print SC value | Same order → check `serviceChargeAmount` in payload | Should match backend's `total_service_tax_amount` (e.g., 21.90) — NOT recomputed from percentage |
| C | Manual print subtotal | Same order → check `order_subtotal` in payload | Should match backend's `order_sub_total_without_tax` (e.g., 240.9) — no double SC |
| D | Manual print with variations | Order with variation item → Print from OrderCard | `order_item_total` includes variation upcharge (backend value) |
| E | Manual print no addons | Order with plain items, no addons → Print from OrderCard | `order_item_total` = correct base total |

## 3. Regression Tests

| # | What to verify | Why |
|---|---------------|-----|
| F | Collect Bill auto-print | Place order → Collect Bill → auto-print fires → all values same as before fix (overrides path unchanged) |
| G | Complimentary items | Order with complimentary item → Print → complimentary line shows ₹0 |
| H | Room order print | Room order with associated orders → Print → room balance + associated orders present |

## 4. Registry Sync Confirmation

Registry synced: YES (no registry.json changes — code-only session, registry update deferred to EXIT GATE)
Items: BUG-168
EXIT GATE: 5/5 checked — see session handover

## 5. Credentials + Environment

- Account: `owner@18march.com` / `Qplazm@10` (18March, has addon orders #002384, #002386)
- Account: `Manager@hogwarts.com` / `Qplazm@10` (Hogwarts rest 618, has variation orders #000334)
- URL: `https://preprod.mygenie.online`
- Preview: `https://store-register-10.preview.emergentagent.com`
