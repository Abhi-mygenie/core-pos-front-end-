# QA Handover — CR-552 (Per-item approval for web-edit order items) — 2026-11-18

**Role:** IMPLEMENTATION → QA (Gate 5a → 5b) · **Severity:** P1 · **Risk:** HIGH (R5 hotspots: ScanOrderPopOut, DashboardPage)
**Scope:** WEB ORDERS ONLY (not aggregator, not POS). FE-only — no backend, no new endpoint.
**Plan:** `CR-552_IMPLEMENTATION_PLAN.md` · **IA:** `CR-552_IMPACT_ANALYSIS.md`

## 1. Inherited from Plan — Verification Matrix (self-test results)
| # | File | Change | How to verify | Self-test |
|---|------|--------|---------------|:--:|
| 1 | orderTransform.js | `isNotConfirmed`/`foodStatus` on item | food_status 7 → isNotConfirmed true; 1/2/3 → false | ✅ code-traced |
| 2 | ScanOrderPopOut.jsx | Mode-B order enters queue | web order fOS≠7 + one status-7 line → banner shows; aggregator/POS → does NOT | ⬜ needs live data (QA) |
| 3 | ScanOrderPopOut.jsx | Two-section render | new items actionable at top; prev items greyed inside expandable "Previously ordered items (N)" dropdown, no cancel btn | ⬜ QA |
| 4 | ScanOrderPopOut.jsx | Reject routing | edit-mode Reject → reason modal → only new lines cancelled; prev lines + order intact | ⬜ QA |
| 5 | DashboardPage.jsx | reject loop | Network: N× `cancel-food-item` (one per new item), 0 whole-order cancel | ⬜ QA |
| 6 | Accept (reused) | confirm new lines | Accept → 1× `waiter-dinein-order-status-update`; status-7 → 1; f_order_status stays 2; popup auto-dismisses | ⬜ QA |
| 7 | reportTransform.js | label 7 | getFoodStatusLabel(7) === 'Yet to Confirm' | ✅ code-traced |
| 8 | Scope guard | web-only | aggregator edit + POS edit → NO banner, NO new actions | ⬜ QA |

Implementation self-test done by agent: webpack **Compiled successfully** (0 new errors), both edited JSX files pass Babel parse, app renders (no console errors). Items 1 & 7 are deterministic one-liners (confirmed in source). Items 2–6 & 8 need a live web-edit order (QA).

## 2. How to reproduce Mode B (for QA)
1. Log in to restaurant 672 (creds in `memory/test_credentials.md`).
2. Place/open a web (Scan & Order) dine-in order; confirm it (it starts cooking, f_order_status=2).
3. From the web/customer side, EDIT the order to append a new item → it arrives `food_status=7`.
4. Expect: the ScanOrderPopOut banner "New Web Order — Awaiting Confirmation" pops with the NEW item(s) actionable at top and the already-ordered items collapsed under "Previously ordered items (N)" (greyed, no × cancel).
5. **Accept** → new lines confirmed, order stays open, popup dismisses.
6. **Reject** → reason modal → only the new lines get `cancel-food-item`; previously-ordered lines and the order remain intact.

## 3. Regression tests (must stay green)
- **Mode A (normal unconfirmed scan order, f_order_status=7):** flat item list unchanged; CR-545 APS badge/sort, "Price TBD", per-item cancel ×, KOT, Reject(full-order cancel modal), Accept all behave exactly as before.
- Aggregator (Swiggy/Zomato) popup and POS orders: no change, no banner from CR-552.
- BUG-679 cancelled-item display (strikethrough/greyed, hidden price/cancel) still correct.

## 4. Registry Sync Confirmation
Registry synced: YES · Item: CR-552 → `GATE_5A_IMPLEMENTED 2026-11-18` · Sprint: nov_cr_batch · EXIT GATE: 5/5 PASSED.

## 5. Credentials + Environment
Account: restaurant-672 (OWNER_RUBY) — see `memory/test_credentials.md` (gitignored). URL: preview `pos-edit-orders--5zrpleu1.preview.emergentagent.com`. Backend: external `preprod.mygenie.online` (live data required for Mode B).

## 6. Files changed (markers `// CR-552`)
- `src/api/transforms/orderTransform.js` · `src/api/transforms/reportTransform.js` · `src/components/dashboard/ScanOrderPopOut.jsx` · `src/pages/DashboardPage.jsx`
