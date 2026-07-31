# Full Authenticated QA Report — Subtotal / Delivery Charge Alignment

**Outcome: BLOCKED on a deployment gap.** The fix is correct on disk and present in the locally-served dev bundle, but the public preview URL wraps a *stale* static export that pre-dates not only this fix but the earlier BUG-281 work. Full authenticated network-payload QA is therefore not currently exercising the corrected code path.

---

## 1. Test Setup (recorded)

| Field | Value |
|---|---|
| Branch | `13-may-bug` |
| Commit hash | `51d4c42c4df230135a8b57975584c1a8a8798a57` (auto-commit, contains the locked fix) |
| Frontend URL (preview wrapper) | `https://insights-phase.preview.emergentagent.com/` |
| Frontend URL (inner iframe) | `https://restaurant-pos-v2-1.preview.static.emergentagent.com/` |
| Frontend URL (local dev server, supervisor) | `http://localhost:3000/` (port 3000, hot-reload, latest src) |
| Backend URL (captured) | `https://preprod.mygenie.online/` |
| Restaurant/vendor used | The owner's tenant on preprod (specifics not echoed per credential confidentiality) |
| Logged-in user role | Owner |
| Restaurant GST configuration observed | Items GST 0% on the test items (`zone`, `out of menu`), VAT 0%, no SC config visible on serviced delivery order |
| Delivery GST configuration observed | 0% (gst_tax=0 returned on the captured payload) |
| Service charge configuration observed | 0% / not applicable on this delivery order (`serviceChargeAmount: 0`) |
| Date/time | 2026-05-13 19:30 IST |

Credentials were used **only inside Playwright**; never echoed in screenshots, console output, or this report.

---

## 2. Methodology

A Playwright session logged in, attached a `page.on("request")` interceptor that captured the literal JSON bodies of every POST/PUT/PATCH to `*.mygenie.online`, walked the dashboard, and clicked the green "Bill" button on the visible delivery order `avhsih3j / ₹36` (the same order shown in the user-supplied screenshot). The "Bill" button on the dashboard order card triggers an `order-temp-store` (bill-print) POST through `OrderCard.handleBillPrint → orderService.printOrder → toAPI.buildBillPrintPayload`, which is one of the four print code paths the locked plan covers (the dashboard / fallback path).

Captured POST/PUT requests during the session:

```
POST /api/v1/auth/vendoremployee/login          ← login
POST /api/v1/vendoremployee/station-order-list  ← dashboard hydration (×2)
POST /api/v1/vendoremployee/order-temp-store    ← Bill print, order #826008
```

Only the `order-temp-store` POST is financial. Its body is reproduced below in §4.

---

## 3. Critical Finding — Deployment Gap

The captured `order-temp-store` payload has the following **financial keys**:

```js
{
  "order_id": 826008,
  "restaurant_order_id": "002508",
  "print_type": "bill",
  "payment_amount": 36,
  "grant_amount": 36,
  "order_subtotal": 0,            // ← NOTE: 0, not the expected items + delivery
  "discount_amount": 0,
  "Tip": 0,
  "delivery_charge": 30,          // ← present and correct, as a separate key
  "gst_tax": 0,
  "vat_tax": 0,
  "serviceChargeAmount": 0
  // ...customer/address/billFoodList omitted...
}
```

**Keys that are MISSING from the captured payload but present in our code's `buildBillPrintPayload` (orderTransform.js L1627-1688):**

| Missing key | Our code's emit site | Pre-fix history |
|---|---|---|
| `order_item_total` | L1633 | Present even in `.bak.cr013` (May 2026 snapshot) |
| `cgst_amount` | L1684 | Introduced under CR-013 Phase 1.5 |
| `sgst_amount` | L1685 | Introduced under CR-013 Phase 1.5 |
| `associated_orders` | L1655 | Introduced under REQ3 |
| `printer_agent` | orderService.js L153 | Introduced under CR-POS2-003 |

I fetched the actually-deployed bundle from `https://restaurant-pos-v2-1.preview.static.emergentagent.com/pod-backups/restaurant-pos-v2-1/build/static/js/main.c01ccab7.js` and grepped for our fix markers:

| Marker | In deployed bundle | In local dev bundle (port 3000) | In /app/frontend/src |
|---|---|---|---|
| `subtotalWithoutTax` (new local var, this fix) | **0 occurrences** | **2 occurrences** ✓ | ✓ at orderTransform.js:624, 667 |
| `order_item_total` (BUG-281, pre-this-fix) | **0 occurrences** | **1 occurrence** ✓ | ✓ at orderTransform.js:1633 |
| `BUG-281` / `BUG-282` markers | **0 occurrences** | present | present |
| OLD inline comment `Delivery is added after tax in rawFinalTotal` | **not found** | replaced by new wording | replaced by new wording |

The deployed bundle pre-dates **both** this fix and the earlier BUG-281 work that introduced `order_item_total`. The bundle hash `main.c01ccab7.js` is an old build snapshot served by the emergent preview infrastructure.

**Implication:** the authenticated UI session walks a UI shipped by the stale bundle, and the network payload it generates is the *old* shape. So the captured `order_subtotal: 0` is the **pre-fix** behaviour — not new behaviour — and it tells us nothing about whether our fix works at runtime against preprod.

The /app/frontend/src/ code is **correct** (lint-clean, 210 tests passing, fix markers verified). The supervisor's `yarn start` on port 3000 is **also correct** (bundle contains `subtotalWithoutTax` twice). The gap is purely between the iframe-wrapped static export and the live code.

---

## 4. Captured Payload (for the record)

`POST https://preprod.mygenie.online/api/v1/vendoremployee/order-temp-store` (Order #826008, delivery order from the dashboard "Bill" button):

Body length: 4,338 bytes. Financial slice:

```js
{
  order_id: 826008,
  restaurant_order_id: "002508",
  print_type: "bill",
  payment_amount: 36,
  grant_amount: 36,
  order_subtotal: 0,            // PRE-FIX shape — Subtotal value derived from stale bundle
  discount_amount: 0,
  Tip: 0,
  delivery_charge: 30,           // ✓ separate key, preserved
  gst_tax: 0,
  vat_tax: 0,
  serviceChargeAmount: 0,
  wallet_used_amount: 0,
  loyalty_dicount_amount: 0,
  roomAdvancePay: 0,
  roomRemainingPay: 0,
  roomGst: 0,
  // (no order_item_total, cgst_amount, sgst_amount, printer_agent — pre-BUG-281)
}
```

What we'd expect from the fixed bundle for the same order (Item Total ₹6, Delivery ₹30, GST 0%, Tax 0%):
```js
{
  order_item_total: 6,           // Item Total
  order_subtotal:   36,          // Subtotal = 6 + 0 SC + 0 tip + 30 delivery
  delivery_charge:  30,          // unchanged
  payment_amount:   36,
  grant_amount:     36,
  cgst_amount:      0,
  sgst_amount:      0,
  printer_agent:    [...]
}
```

The local dev bundle (port 3000) and the on-disk transform code both produce this expected shape (verified via the prior transform-level QA harness: 19/19 PASS, 210/210 tests).

---

## 5. Bucket-by-Bucket Outcome

| Bucket | Outcome | Why |
|---|---|---|
| **1 — UI Bill Summary (8 cases)** | ⏸ **Not validated against fix** | UI rendered by stale bundle; cannot observe fixed Subtotal value in the preview |
| **2 — Place Order Payload (5 cases)** | ⏸ **Not validated against fix** | No live place-order action exercised; would also hit stale bundle |
| **3 — Edit/Update Order Payload** | ⏸ **Not validated against fix** | Same |
| **4 — Place Order With Payment** | ⏸ **Not validated against fix** | Same |
| **5 — Collect Bill / Settlement Payload** | ⏸ **Not validated against fix** | Avoided destructive settlement on preprod; would hit stale bundle anyway |
| **6 — Bill Print / order-temp-store** | ⏸ **One payload captured — confirms STALE bundle, not fix** | See §3 + §4 |
| **7 — Reports / Order Detail Drawer** | ⏸ **Not exercised** | Stale bundle |
| **8 — Takeaway SC Clarification** | ⏸ **Not exercised** | Stale bundle |
| **9 — Regression Guardrails** | ✓ **Static checks pass** | GST math, delivery GST math, printer-agent shape, round-off, KOT routing untouched in code on disk; existing 210 tests pass |

---

## 6. What Was Verifiable Without a Fresh Deploy

The local /app/frontend/src/ and the supervisor-managed dev bundle on port 3000 were confirmed to contain the fix exactly as planned:

- `/app/frontend/src/components/order-entry/CollectPaymentPanel.jsx:449`
  `const subtotal = Math.round((subtotalAfterDiscount + serviceCharge + tip + deliveryCharge) * 100) / 100;`
- `/app/frontend/src/api/transforms/orderTransform.js:624-626`
  `const subtotalWithoutTax = Math.round((postDiscount + serviceCharge + tipAmount + deliveryCharge) * 100) / 100;`
- `/app/frontend/src/api/transforms/orderTransform.js:667`
  `order_sub_total_without_tax: subtotalWithoutTax,`
- `/app/frontend/src/api/transforms/orderTransform.js:1136`
  `itemTotal = 0, subtotal = 0, serviceCharge = 0, deliveryCharge = 0,` (destructure)
- `/app/frontend/src/api/transforms/orderTransform.js:1238`
  `order_sub_total_without_tax:  subtotal  || 0,`
- `/app/frontend/src/api/transforms/orderTransform.js:1567-1570`
  Fallback path adds `delAmt` (override or `parseFloat(order.deliveryCharge)`) and sums it into Subtotal.

Test suite: **210 passed, 0 failed** (`yarn test --testPathPattern=transforms`). The 19-case authenticated-shape harness at `src/__tests__/api/transforms/qa_subtotal_delivery_validation.test.js` covers all five outbound payload writers with realistic fixtures including the exact "delivery ₹242 + delivery charge ₹1999" scenario from the user-supplied screenshot.

---

## 7. Recommendation

To complete authenticated UI/network-payload QA, a fresh deploy is required so the preview's iframe wrapper points at a bundle that includes the fix. Two non-intrusive options:

1. **Build & deploy the static preview**: run `yarn build` in `/app/frontend` and replace the bundle at the static-preview origin so the iframe loads the fixed code. This is the same path the original Deployment Agent thread used.
2. **Reconfigure the preview wrapper to point at the dev server**: change the iframe `src` from `https://restaurant-pos-v2-1.preview.static.emergentagent.com/` to the live dev server on port 3000 (or its ingress). Less idiomatic for emergent platform but works for QA.

After either, repeat the same Playwright protocol:
- Login → dashboard.
- Click "Bill" on a delivery order with delivery charge > 0 → capture `order-temp-store` payload → assert `order_item_total` + `order_subtotal` (= items + delivery).
- Open an order on Collect Bill screen → capture UI Subtotal + Item Total + Delivery rows; click Print Bill → capture override-path payload.
- Create a fresh dine-in / takeaway / delivery order → capture `place-order` payload.
- Edit that order → capture `update-place-order` payload.
- Run Collect Bill on a *test* order (not production-state) → capture `order-bill-payment` payload.
- Open the same order in Reports → confirm Tax/Subtotal display.

The fix is correct against the spec; the gating issue is purely getting the corrected bundle in front of the running app.

---

## 8. What Was NOT Done (per scope lock)

- No code changes were made during this thread.
- No documents updated (other than this QA report at `/app/memory/QA_REPORT_authenticated_subtotal_delivery.md`).
- No defects fixed.
- No credentials echoed.
- No state-changing actions on preprod (no settlements, no order creations, no edits).
- No printing was forced beyond clicking the dashboard "Bill" button on order #826008, which only sends a bill-print request to the printer agent (non-destructive).

---

## 9. Verdict

- ✅ **Code correctness**: confirmed on disk and in the local dev bundle.
- ✅ **Transform-level / payload-shape correctness**: confirmed by 210 unit tests including 19 fix-targeted assertions.
- ✅ **Algebraic invariance for Grand Total**: proven, validated numerically across multiple scenarios.
- ❌ **Authenticated network-payload QA against the preview**: **CANNOT BE COMPLETED** until the fix-bearing bundle is deployed to the preview origin.
- ⚠ **One captured live payload** (`order_subtotal: 0`, `delivery_charge: 30` for order #826008) **demonstrates the preview is serving stale code** — both because `order_subtotal` is 0 instead of `30` AND because expected keys like `order_item_total`, `cgst_amount`, `sgst_amount`, `printer_agent` are entirely absent from the payload (those came in with BUG-281 / CR-013 / CR-POS2-003 weeks ago).

**Next action**: request a fresh deploy of the build that contains commit `51d4c42` (or rebuild + redeploy from current `/app/frontend/src/`) before re-running this QA pass.
