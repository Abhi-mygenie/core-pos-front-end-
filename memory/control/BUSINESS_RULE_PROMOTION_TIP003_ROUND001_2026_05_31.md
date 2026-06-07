# Business-Rule Promotion — TIP-003 & ROUND-001 (2026-05-31)

**Track:** 24 unfrozen business rules → 5-step promotion gate (independent of POS 4.0).
**Scope:** Part A of `BUSINESS_RULES_PENDING_FREEZE_ITEMS_2026_05_15.md` — the two "rejected, code-fix-required" rules.
**Directive:** Owner-directed **Option A** (actual code = final source of truth).
**Code anchor:** branch `31may-for-baseline`, commit `8f92e8c`.

---

## 5-step gate — status

| Step | TIP-003 | ROUND-001 |
|---|---|---|
| 1. Code fix implemented | ✅ tip-applicability gate | ✅ always-ceil |
| 2. Associated bug closed | ✅ owner-verified (tip on takeaway/delivery removed) | ✅ owner-verified (always-ceil + profile gate) |
| 3. Runtime / code confirmation | ✅ code-verified + logic-tested | ✅ code-verified + logic-tested |
| 4. Owner reconfirms (in writing) | ✅ this session (plain-English confirm) | ✅ this session (plain-English confirm) |
| 5. Dated diff + baseline promotion | ✅ this doc + baseline §4 | ✅ this doc + baseline §5 |

---

## TIP-003 — Tip on Takeaway / Delivery

**Frozen rule (owner-approved 2026-05-31):**
> Tip and Tip GST apply **only** to Dine-in, Walk-in and Room orders, and only when the profile tip feature
> is enabled. On **Takeaway and Delivery** the tip input is hidden and the payload `tip_amount` /
> `tip_tax_amount` = ₹0.

**Amendment vs original wording:** adds the profile tip-feature condition (the app gates tip on a settings
ON/OFF switch in addition to order type). Owner confirmed this is the desired, already-shipped behaviour.

**Code evidence (commit 8f92e8c):**
- `CollectPaymentPanel.jsx:307-310` — `tipEnabled = !!restaurant?.features?.tip`; `tipApplicable = tipEnabled && (dineIn|walkIn|room)`.
- `CollectPaymentPanel.jsx:556` — `tip = tipApplicable ? parseFloat(tipInput)||0 : 0` (forces ₹0 on takeaway/delivery).
- `CollectPaymentPanel.jsx:1551` — tip input JSX rendered only `{tipApplicable && (...)}`; display + GST rows likewise gated (`:2073,2293,2360`).

**Test lock:** `frontend/src/__tests__/components/order-entry/tip003.applicability.test.jsx`
(verbatim gate contract + RTL: input hidden for takeaway/delivery; tip forced 0; feature-off disables everywhere).

---

## ROUND-001 — Grand-Total round-off always ceiling

**Frozen rule (owner-approved 2026-05-31):**
> When round-off is enabled (profile setting `totalRound`, default ON), the Grand Total **always uses ceiling**
> (`Math.ceil`) — there is **no floor / conditional case** (₹105.05 → ₹106 and ₹105.15 → ₹106). When the
> profile disables round-off, the exact 2-decimal total is used.

**Amendment vs original wording:** adds the profile round-off on/off gate (a restaurant may turn rounding off
entirely; when on, ceiling is the only direction). Owner confirmed this is the desired, already-shipped behaviour.

**Code evidence (commit 8f92e8c):**
- `orderTransform.js:702-711` — `orderAmount = roundOffEnabled ? Math.ceil(rawTotal) : Math.round(rawTotal*100)/100` (no floor branch).
- `CollectPaymentPanel.jsx:628-634` — same predicate; `roundOffEnabled = restaurant?.totalRound !== false`.

**Test lock:** `frontend/src/__tests__/api/transforms/round001.alwaysCeil.test.js`
(real `toAPI.placeOrderWithPayment`: 105.05→106, 105.15→106, 105.00→105, 0→0, disabled keeps 2-decimal;
plus a 1-paise sweep x.01..x.99 proving no floor branch).

**Standalone logic verification (no deps, this session):** all cases PASS.

---

## Result

- Frozen business rules: **32 → 34**. Pending: **24 → 22**. Part A of the pending register is now **empty**.
- Updated: `final/BUSINESS_RULES_BASELINE_FINAL.md` (§4 TIP-003, §5 ROUND-001, counts, change-control),
  `BUSINESS_RULES_PENDING_FREEZE_ITEMS_2026_05_15.md` (Part A cleared), `control/BASELINE_INDEX.md`.
- No production code changed (rules were already implemented + owner-verified); two additive regression-lock
  test files added.

---

*End of promotion record — 2026-05-31.*
