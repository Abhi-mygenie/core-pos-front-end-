# POS 3.0 BUG-108 — Coupon V1B Step 1 QA Handoff

**Date:** 2026-05-25
**Status:** `bug_108_coupon_v1b_step1_qa_handoff_ready_for_owner_smoke`
**Phase:** V1B Step 1 (couponLive=true live in build)

---

## 1. What's Live

Coupon flow on Collect Bill is fully wired and **active** as of this PR:
- Cashier focuses the coupon input → POS calls CRM `GET /api/pos/coupons/available` (max 3 times per panel session).
- Dropdown shows max 5 eligible coupons sorted by highest expected discount; outside-window coupons appear greyed with their "Available from HH:MM" label.
- Cashier types a prefix → 500ms after last keystroke, POS auto-applies the highest-`expectedDiscount` match via `POST /api/pos/coupons/validate`.
- Cashier clicks a dropdown row → POS validates silently (input field not populated).
- Cashier types an unknown code + clicks Apply → manual `/validate` call.
- Loyalty + non-stackable coupon → coupon auto-removed with toast.
- All 4 commit flows now carry `coupon_code`, `coupon_discount`, `coupon_title`, `coupon_type`.
- Print payload carries `coupon_discount` for the bill template.

---

## 2. Test Matrix (from V1B Plan §9)

Run all tests with `couponLive=true` (current production state).

### 2.1 Functional — Main coupon section
| ID | Test | Expected |
|----|------|----------|
| T-1 | Pick a customer with 3 eligible coupons → focus coupon input | Dropdown shows 3 rows sorted by discount desc |
| T-2 | Pick a customer with 0 eligible coupons → focus coupon input | `coupon-empty-hint` shows "No coupons available for this customer" |
| T-3 | Type "SU" with SUMMER10/SUMMER20 eligible | Dropdown filters to SU* (defensive — display still shows full list since dropdown isn't filter-on-type; auto-apply will pick best) |
| T-4 | Type "SUMMER" + pause 500ms | Highest-discount match auto-applies + applied chip shows |
| T-5 | Type "RANDOM123" + Apply | `INVALID_CODE` → error text "Invalid coupon code" |
| T-6 | Customer has SUMMER20 (outside window) + SUMMER10 (in window) → type "SUMMER" | Auto-apply picks SUMMER10 (in window) |
| T-7 | Two coupons tie on `expectedDiscount` | API order preserved (CRM-sorted, defensive POS re-sort stable) |
| T-8 | Remove applied coupon | Bill recomputes (loyalty/wallet caps refresh); coupon section returns to type-ahead state |
| T-9 | Outside-window coupon in dropdown | Row at `opacity 0.5`, shows `"Available from HH:MM"` |
| T-10 | Click outside-window row | No action (pointer-events default; cursor `not-allowed`) |
| T-11 | Type outside-window code + Apply | `OUTSIDE_TIME_WINDOW` error + `pos_instruction` (if CRM returns one) |
| T-12 | Apply non-stackable coupon + then tick Loyalty | Coupon auto-removed + toast "Coupon removed — incompatible with loyalty" |
| T-13 | Apply stackable coupon + tick Loyalty | Both apply (CRM accepted both at /validate time) |

### 2.2 Payload (DevTools Network — Collect Bill → Pay)
| ID | Test | What to verify |
|----|------|----------------|
| T-14 | Flow 4 (postpaid + cash) — apply coupon + Pay | Request to `…/order-bill-payment` shows `coupon_code: <CODE>`, `coupon_discount: <₹>`, `coupon_title: <TITLE>`, `coupon_type: 'order'`. CRM dashboard shows `coupon_usage.recorded=true`. |
| **T-15** | **Flow 3 (prepaid + UPI) — apply coupon + Pay** | **Request to `…/place-order` (prepaid variant) shows non-zero `coupon_discount` — this is the Flow 3 key-mismatch fix verification (E-13). Previously was always 0 due to `discounts.coupon` vs `discounts.couponDiscount` key bug.** |
| T-16 | Split payment (cash + UPI) + coupon | CRM commit OK on both partial payments |
| T-17 | Apply coupon → close panel without Pay | NO commit; NO additional `/validate` calls beyond focus + apply; CRM `coupon_usage` unchanged |
| T-18 | Post-commit cancel order (with applied coupon) | **DEFERRED to V1B Step 1.5** — toast warning not yet implemented (B-1 deferred per Implementation Report §4.1) |
| T-19 | Apply + manual Print Bill (before Pay) | Print payload `coupon_discount` field present and non-zero; bill template renders "Coupon `<CODE>` −₹X" line (requires POS BE template update — see I-3) |
| T-20 | Flow 4 payload `coupon_code` populated | DevTools — confirm field present in request body |
| T-21 | Flow 3 payload `coupon_code` populated + `coupon_discount` non-zero | DevTools — Flow 3 KEY-MISMATCH FIX verification |
| T-22 | POS BE logs show all `coupon_*` fields forwarded to CRM | POS BE team confirms |

### 2.3 Regression (existing flows must remain byte-identical)
Run each of these BOTH with no coupon applied AND with a coupon applied (where applicable):

| Area | Verification |
|------|--------------|
| Manual discount (% / ₹) | Apply 10% → coupon section blocks; helper text "Remove the manual discount to apply a coupon" shows |
| Preset discount | Apply preset → coupon section blocks |
| Loyalty (Phase C) | Max-redeemable + redemption unchanged; coupon + loyalty stacking respects `stackableWithLoyalty` |
| Wallet | Read-only display unchanged (`walletDebitLive=false`) |
| Service charge toggle | Unchanged |
| Tip input | Unchanged |
| Delivery charge | Unchanged |
| Round-off | Unchanged |
| Cash quick-pills + change calculator | Unchanged |
| Split payment modal | Unchanged + coupon flows through (T-16) |
| TAB/Credit/PayLater branches | Unchanged |
| transferToRoom | NO coupon fields emitted (V1 scope: room-service Collect Bill path supports coupon via Flow 4, but transferToRoom Flow 6 stays coupon-free) |
| Hold-Tab → Collect Bill (BUG-042-A) | Coupon flows through Flow 4 inheritance |
| QSR Full View → Collect Bill | Coupon flows through Flow 4 inheritance |
| QSR fresh Place+Pay (CartPanel) | NO coupon UI (Owner Q4 = A); CartPanel hardcoded zeros preserved |
| All existing `data-testid`s | Present + unchanged (no rename) |

### 2.4 Negative / safety
| Test | Expected |
|------|----------|
| Apply coupon then manually toggle `couponLive=false` (rollback simulation) + reload | Coupon UI returns to "Coming soon"; all 5 payloads force-zero coupon fields |
| No customer selected → coupon section | Hidden (existing guard at L1049) |
| Restaurant has `isCoupon=false` | Section hidden |
| Spam Apply button | Disabled during `couponLoading`; no double-fire |
| Type very fast → debounce 500ms | Only the final keystroke triggers `/validate` |

---

## 3. Pre-Existing Items (Carry-Forward)
- ESLint warning at `OrderEntry.jsx:1297` (`useCallback`/`printOrder`) — unrelated to V1B, pre-existing on `25-may` branch.

---

## 4. Known Coordination Items (External Teams)

These don't block QA but should be tracked for Step 2 production readiness:

| # | Item | Owner | Status |
|---|------|-------|--------|
| I-1 | POS BE (Laravel) forwards `coupon_code` field to CRM on `…/order-bill-payment` and `…/place-order` | POS BE team | **PENDING smoke** — verify with `coupon_code='TEST_DRY'`, `coupon_discount=0.01` and CRM logs |
| I-2 | POS BE handles `coupon_type` field omission for future V3 (BOGO/BXG/Nth) | POS BE team | V3 prereq — not blocking V1 |
| I-3 | Bill print template renders `coupon_discount` line | POS BE template | **PENDING** — T-19 will fail until BE template added (frontend payload is correct) |
| I-4 | Preprod restaurant has `is_coupon=true` profile flag | Restaurant onboarding | **PRE-FLIGHT** — verify via Profile API |
| I-5 | Preprod customer has ≥1 V1 coupon assigned in CRM admin | CRM admin user | **PRE-FLIGHT** for T-1..T-13 |
| I-6 | Cashier-cancel warning toast (B-1) — OrderEntry.jsx edits | Next V1B continuation pass | **DEFERRED** — see Implementation Report §4.1 |

---

## 4.5 Live Session Outcomes (2026-05-25)

### Session timeline
| Time (UTC) | Event |
|------------|-------|
| 08:16 | `couponLive` flipped to `true`; transform-layer edits applied |
| 08:25 | CollectPaymentPanel UI rewrite landed (initial parallel batch — H-1 latent) |
| ~08:30 | Owner reports `ReferenceError: availableCoupons is not defined` error boundary |
| ~08:35 | H-1 hotfix: missing `useState` declarations restored at L277–280 |
| ~08:40 | Owner reports Coupon section header not rendering on kunafamahal (Loyalty IS rendering) |
| ~08:45 | CRM smoke S-1 — production CRM endpoint reachable + auth valid |

### S-1 production CRM smoke
```bash
curl 'https://crm.mygenie.online/api/pos/coupons/available?customer_id=&order_total=1728&channel=dine_in' \
  -H 'X-API-Key: dp_live_-…'
# HTTP 200 — { "success": true, "data": { "count": 0, "coupons": [] } }
```
Verified: ✅ URL reachable, ✅ X-API-Key auth valid, ✅ response envelope matches `couponTransform.fromAPI.availableCoupons` contract.

### Open carry-forward items for owner verification
1. **Hard-refresh the POS browser tab** (`Cmd+Shift+R` / `Ctrl+Shift+R`) to clear the post-error-boundary state and any cached pre-H-1 JS chunk. Then re-open Collect Bill on kunafamahal and check whether the Coupon section header appears.
2. If section still hidden after hard-refresh: open DevTools Network tab → inspect the profile API response → confirm exact JSON path of `is_coupon` (expected: `restaurants[0].is_coupon`, NOT `restaurants[0].settings.is_coupon`).
3. Retrieve the customer_id of the test customer (Gold, 4619 pts) and ping `/api/pos/coupons/available` with that ID + the production X-API-Key to confirm whether THIS customer has eligible coupons configured in CRM. Empty result is NOT the same bug as the section-hidden bug — empty coupons should still render the section header with an empty-hint.

---

## 5. Sign-Off Criteria

QA may sign off V1B Step 1 when:
- [ ] T-1..T-22 all pass (excluding T-18 deferred + T-19 conditional on BE template)
- [ ] Owner smoke: minimum 10 orders across cash/UPI/card/split with coupon applied
- [ ] CRM dashboard shows `coupon_usage.recorded=true` rows for those orders
- [ ] Zero P0/P1 regressions across §2.3 (regression matrix)
- [ ] No new console errors in browser DevTools (apart from intentional `console.warn` for coupon-network failures)
- [ ] Backend smoke from POS BE team confirms `coupon_*` field forwarding (I-1)

---

## 6. Rollback

```js
// /app/frontend/src/utils/BUG108_FLAGS.js line 35
couponLive: false,
```

Frontend hot-reload picks it up. Manual rollback policy active per Owner directive (2026-05-25).

Note: Rollback does NOT reverse CRM-side `coupon_usage` rows committed during the live window. CRM reversal endpoint is a Phase 2 deliverable. Manual CRM-side rollback would require admin intervention.

---

**End of BUG-108 Coupon V1B Step 1 QA Handoff.**
