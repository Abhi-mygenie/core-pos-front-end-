# BUG-680 — Implementation Plan (Gate 3)

**Role:** PLANNING (Gate 3 — Implementation Plan; no code written)
**Date:** 2026-11-22 · **Author:** E1
**Item:** BUG-680 — Order discount not reflected on Dashboard / Order Entry / Cart
**Priority:** P0 · **Risk:** CRITICAL (upgraded at Gate 2) · **Sprint:** `nov_cr_batch` · **Assignee:** Abhishek
**Impact Analysis:** `impact/BUG-680_IMPACT_ANALYSIS.md`
**Backend:** DONE & live-verified (`handover/CR-527_BUG-680_BACKEND_HANDOVER.md` Part B)

---

## 0. Pre-plan — IA re-validation at HEAD (2026-11-22)

All anchors re-verified this session, unchanged:
- `api/constants.js:259` `MANAGE: '/api/v1/vendoremployee/order-discount-manage'` — sole v1 path string; sole consumer `orderService.js:241`.
- `orderService.js:240-248` body `{order_id, discount_amount, discount_type('flat'→'fixed'), discount_note}` — matches v2 contract.
- `orderTransform.js:228/239/241/242` expose `amount`, `discount`, `discountValue`, `discountType` — no change needed.
- `OrderCard.jsx:531-533` amount span; next sibling = prepaid badge L536.
- `COLORS` imported in OrderCard (L3).

**Code Reality: PARTIAL** (apply on v1; display + v2 switch NOT STARTED).

---

## 1. OD resolution used for this plan (RECOMMENDED defaults — owner-confirmable at Gate 4)

| OD | Decision applied | Note |
|----|------------------|------|
| OD-680-02 (display format) | **(a) compact badge** next to amount: percent → `−{discountValue}%`, amount → `−₹{discount}` | owner may switch to (b)/(c) |
| OD-680-03 (refresh after apply) | **(a) rely on existing socket/polling** (`useOrderPollingReconciliation` + BUG-595 reactive re-seed) — no extra code | |
| OD-680-04 (remove-path guardrail) | **(b) send currently-applied `discount_type`** on unapply (defensive; backend B1 already clears any type) | Edit E3 below |
| OD-680-05 (CRITICAL regression) | E2E money regression MANDATORY before Gate 4 (see §4 REG rows) | owner approval required |

> These are assumptions for planning only. **Gate 4 GO + owner approval + E2E money regression are still required** before any code (CRITICAL item).

---

## 2. Exact Edits (file · anchor · current → new)

### Edit E1 — switch apply endpoint v1 → v2  *(REQUIRED, CRITICAL)*
**File:** `src/api/constants.js` · **Line 259**
```
current:  MANAGE: '/api/v1/vendoremployee/order-discount-manage',
new:      MANAGE: '/api/v2/vendoremployee/order/order-discount-manage', // BUG-680: v2 recalculates order_amount + restaurant_discount_amount
```
Single switch point — propagates to all 5 `applyOrderDiscount` call sites in CollectPaymentPanel. No body change (orderService L242-245 already matches v2 contract; `'flat'→'fixed'` send-map correct).

### Edit E2 — OrderCard post-discount badge  *(REQUIRED)*
**File:** `src/components/cards/OrderCard.jsx` · **after the amount span (insert after L533, before the prepaid-badge comment at L535)**
```jsx
{/* BUG-680: order-level discount badge (shown once v2 recalculates order_amount) */}
{(order.discount || 0) > 0 && (
  <span
    data-testid={`order-discount-badge-${orderId}`}
    className="text-[10px] font-bold px-1.5 py-0.5 rounded flex-shrink-0"
    style={{ backgroundColor: '#E8F5E9', color: COLORS.primaryGreen }}
  >
    {String(order.discountType).toLowerCase() === 'percent' && (order.discountValue || 0) > 0
      ? `−${order.discountValue}%`
      : `−₹${(order.discount || 0).toLocaleString()}`}
  </span>
)}
```
- Uses only already-parsed fields (`order.discount`, `order.discountValue`, `order.discountType`). No transform change.
- `discountType` from running-orders is `'Percent'`/`'Amount'`/null (BUG-659) → `.toLowerCase()` guard handles both shapes; amount/unknown falls back to `−₹`.
- The amount span itself (L532 `₹{order.amount}`) already shows the discounted total once E1 lands — no edit to the amount span.

### Edit E3 — remove-path type guardrail (OD-680-04=b)  *(RECOMMENDED)*
**File:** `src/components/order-entry/CollectPaymentPanel.jsx`
Ensure unapply sends the **currently-applied** type rather than a defaulted `'percent'`. The applied type is known from `initialDiscount.discountType` (seeded at L411) / local `discountType`. Concretely:
- **L449** (manual unapply) — currently `discountType: discountType || 'percent'`. Change the fallback to the applied type: `discountType: (discountType || initialDiscount?.discountType || 'percent')`. (`initialDiscount.discountType` is already `'percent'|'flat'` — maps to `fixed` in orderService.)
- **L1603** (inline auto-unapply) — same substitution.
- **L429** (preset unapply) — leave `'percent'` (presets are always %; correct).

> E3 is a safety net; backend B1 makes it non-blocking. If owner picks OD-680-04=(a), **drop E3 entirely** (E1+E2 only).

### Edit E4 — unit test  *(REQUIRED)*
**File (new):** `src/components/cards/__tests__/OrderCard.bug680.test.jsx` (or co-located pattern used by repo)
- Renders OrderCard with `order.discount=171.7, discountType='Percent', discountValue=10` → badge `−10%` present with `data-testid=order-discount-badge-<id>`.
- `order.discount=20, discountType='Amount'` → badge `−₹20`.
- `order.discount=0` → **no** badge.
- Constant test: assert `ORDER_DISCOUNT_ENDPOINTS.MANAGE` contains `/api/v2/` (guards against v1 regression).

---

## 3. Files touched / NOT touched (scope lock)

**WILL change:** `api/constants.js` (E1), `components/cards/OrderCard.jsx` (E2), `components/order-entry/CollectPaymentPanel.jsx` (E3, if OD-680-04=b), new test (E4).
**WILL NOT touch:** `orderTransform.js`, `OrderEntry.jsx`, `CartPanel.jsx` (VERIFY-ONLY — auto-correct via `order.amount`), `orderService.js` (body already correct), socket handlers, OrderContext, settlement/print builders, CPP discount capture/validation (BUG-614/615/619/595).

**Shared-file lock:** `OrderCard.jsx` also carries CR-527 (diner chip) + CR-525 (Bill block), both GATE_5A/QA-pending. E2 inserts at the amount span (L533-534) — **line-disjoint** from both. Single PR; re-verify anchors at HEAD immediately before editing.

---

## 4. Verification Matrix (seeds QA + Implementation self-test)

| # | File·Edit | Change | How to verify | Automated? |
|---|-----------|--------|---------------|:---:|
| V1 | constants.js E1 | MANAGE→v2 | Unit: `ORDER_DISCOUNT_ENDPOINTS.MANAGE` matches `/api/v2/.../order-discount-manage` | YES |
| V2 | OrderCard E2 | badge % | Unit (E4): discount=171.7/Percent/10 → `−10%` badge | YES |
| V3 | OrderCard E2 | badge ₹ | Unit (E4): discount=20/Amount → `−₹20` | YES |
| V4 | OrderCard E2 | no badge | Unit (E4): discount=0 → badge absent | YES |
| V5 | E1 e2e | tile amount | Browser (preprod RID 69, Owner): apply 10% in CPP → dashboard OrderCard shows discounted ₹ + badge after poll/socket | NO |
| V6 | E1 parity | Collect-Bill button | Browser: `OrderEntry.jsx:1227` Collect-Bill label shows discounted total | NO |
| V7 | E1 parity | Cart total | Browser: CartPanel placed-order total shows discounted total | NO |
| V8 | E1 role parity | Manager | Browser: repeat V5 as role_name=Manager (backend verified both roles) | NO |
| V9 | E3 | remove path | Browser: apply %, unapply → order fully reverts (order_amount + badge gone); apply fixed, unapply → reverts | NO |
| REG-1 | E1 CRITICAL | fixed pro-rata | Browser+curl: fixed ₹20 on ₹100 item, add ₹100 item → per-line 10/10, total 180, line GST on 90/90; CPP summary == OrderCard == bill | NO |
| REG-2 | E1 CRITICAL | print | Browser: apply discount → **print bill** → printed total == discounted total | NO |
| REG-3 | E1 CRITICAL | settle | Browser: apply discount → **settle/collect** → settled amount == discounted total; audit/report reflect discount | NO |
| REG-4 | E1 | coupon/loyalty coexist | Browser: discount + coupon path still blocked/handled per BUG-108 (no double-count) | NO |

**Automated:** 4 (V1-V4). **Manual/E2E:** 9 (V5-V9 + REG-1..4). REG-1..3 = the CRITICAL money regression gate (OD-680-05).

---

## 5. Post-Code Registry Checklist (Implementation agent executes AFTER coding)

- [ ] `registry.json`: BUG-680 → `status: GATE_5A_IMPLEMENTED`, `sprint_key: nov_cr_batch`
- [ ] `BUG_TRACKER.md`: row/CURRENT updated to IMPLEMENTED
- [ ] `FILE_OWNERSHIP.md`: add `api/constants.js` (E1), `OrderCard.jsx` (E2), `CollectPaymentPanel.jsx` (E3 if used), new test (E4) with `// BUG-680`
- [ ] Code markers: `// BUG-680` in every modified file
- [ ] Compile: webpack 0 new warnings
- [ ] Self-test: V1-V4 unit pass; ≥1 screenshot for V5

---

## 6. Risk Register

| ID | Risk | Mitigation |
|----|------|-----------|
| R1 | v1→v2 switch changes discount allocation for ALL callers (fixed pro-rata, line GST) | REG-1..3 E2E money regression mandatory; owner approval before Gate 4 |
| R2 | CPP local bill summary diverges from backend v2 recalc | V5/REG-1 compare CPP summary vs OrderCard vs bill |
| R3 | Shared `OrderCard.jsx` with CR-527/CR-525 | Line-disjoint insert; single PR; re-verify anchors at HEAD |
| R4 | `discountType` shape `'Percent'/'Amount'` vs `'percent'/'flat'` | E2 uses `.toLowerCase()` + ₹ fallback |
| R5 | Dashboard tile not instant (relies on poll/socket) | OD-680-03=(a) accepted; if unacceptable, owner picks (b) explicit refetch |

---

## 7. Execution Sequence

1. E1 (constants) → 2. E2 (OrderCard badge) → 3. E3 (CPP remove-path, if OD-680-04=b) → 4. E4 (tests) → 5. webpack + V1-V4 → 6. QA Gate 5b (V5-V9) → 7. **CRITICAL E2E money regression REG-1..4 (owner smoke)** → Gate 6.

---

## 8. Gate 3 Exit

```
Planning complete (Gate 3 — Implementation Plan): BUG-680
Code reality: PARTIAL
Risk: CRITICAL (owner approval + E2E money regression before Gate 4)
Edits: E1 constants v1→v2 (required), E2 OrderCard badge (required), E3 CPP remove-path guardrail (if OD-680-04=b), E4 tests
Files WILL change: constants.js, OrderCard.jsx, CollectPaymentPanel.jsx (E3), + new test
Files WILL NOT touch: orderTransform.js, OrderEntry.jsx, CartPanel.jsx (verify-only), orderService.js, sockets, settlement/print
Verification matrix: 13 checks (4 automated, 9 manual incl. REG-1..3 money gate)
Owner decisions: OD-680-02..05 — planned on recommended defaults, owner-confirmable
Next: owner "Gate 4 GO" (+ approval for CRITICAL) → IMPLEMENTATION
```
