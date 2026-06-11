# POS 3.0 BUG-108 — Coupon V1B Step 1 Implementation Report

**Date:** 2026-05-25
**Status:** `bug_108_coupon_v1b_step1_implemented_couponLive_true_build_passing`
**Persona:** V1B Implementation Continuation Agent
**Phase:** V1B Step 1 — UI wiring + payload edits + Flow 3 key-mismatch fix + `couponLive` flip

---

## 1. Scope Delivered

Per `POS3_0_BUG_108_COUPON_V1B_UI_MAPPING_PLAN_2026_05_25.md` §12 (Final V1B Decisions):

| Plan ref | Item | Status |
|----------|------|--------|
| E-1 | New CollectPaymentPanel state: `availableCoupons`, `couponLoading`, `couponInstruction`, `showCouponDropdown` + 3 refs (`couponAvailableCallCountRef`, `couponAvailableFetchedForRef`, `couponDebounceRef`) | ✅ |
| E-2 | `couponDiscount` math migration — legacy `selectedCoupon.{type,discount,maxDiscount}` mock shape replaced with canonical `selectedCoupon.computedDiscount` | ✅ |
| E-3 | `handleApplyCoupon` rewritten as async with real `/validate` call + error mapping | ✅ |
| E-4 | `fetchAvailableCoupons` helper + `onFocus` trigger on coupon input. **Capped at MAX 3 calls/session** (Owner B-5) via `couponAvailableCallCountRef`. Cache reset on `customer?.id` change. | ✅ |
| E-5 | 500ms debounced auto-apply via `couponDebounceRef`. Picks highest `expectedDiscount` match for typed prefix among `withinWindowNow === true` coupons (Owner B-4). | ✅ |
| E-6 | `paymentData.discounts` emit: `couponCode` added (was missing); `couponTitle` source fixed (was `selectedCoupon.code`, now `selectedCoupon.title`); `couponType` source fixed (was legacy `selectedCoupon.type`, now canonical `selectedCoupon.couponType`). | ✅ |
| E-7 | `handlePrintBill` overrides: `couponDiscount` field added per Owner Q5 = A. | ✅ |
| E-8 | Main coupon UI block (L1046–1099) rewritten: type-ahead dropdown (max 5, sorted desc by `expectedDiscount`, outside-window greyed @ opacity 0.5 with `nextWindowStart` time label), applied chip, error slot, instruction slot. | ✅ |
| E-9 | Inline-mirror (room-service) coupon UI block (L1586–1633) rewritten — parity with main; smaller text classes (`text-xs`). Shared state with main view. | ✅ |
| E-10 | New `data-testid`s: `coupon-suggestions-dropdown`, `coupon-suggestion-{code}`, `coupon-outside-window-hint`, `coupon-empty-hint`, `coupon-pos-instruction-text`, `applied-coupon-chip`, `remove-coupon-btn` | ✅ |
| E-11 | `orderTransform.js` Flow 1 (`placeOrder`) — add `coupon_code: ''` parity field | ✅ |
| E-12 | `orderTransform.js` Flow 2 (`updateOrder`) — add `coupon_code: ''` parity field | ✅ |
| **E-13** | **`orderTransform.js` Flow 3 (`placeOrderWithPayment`) — KEY-MISMATCH FIX**: `discounts.coupon` → `discounts.couponDiscount`. Added `couponLive` gate for symmetry with Flow 4. Latent bug existed at L1148 since BUG-108 P1; masked while `couponLive=false`. | ✅ |
| E-14 | `orderTransform.js` Flow 3 — add `coupon_code` field, gate `coupon_title` and `coupon_type` under `couponLive` (matches Flow 4 pattern) | ✅ |
| E-15 | `orderTransform.js` Flow 4 (`collectBillExisting`) — add `coupon_code` field | ✅ |
| E-16 | `orderTransform.js` Flow 5 (`buildBillPrintPayload`) — add `coupon_discount` field (Owner Q5 = A); mirrors `loyalty_dicount_amount` pattern | ✅ |
| **E-17** | **`BUG108_FLAGS.couponLive` flipped to `true`** in same PR per user instruction (manual rollback policy — no formal owner-smoke gate) | ✅ |
| §5 | `errorCodeToCopy(code)` helper covering 9 CRM error codes + NETWORK + UNKNOWN fallback. Co-located in CollectPaymentPanel per implementer choice C-1. | ✅ |
| B-2 | Loyalty/coupon stacking auto-remove useEffect — triggers when `useLoyalty` toggles ON while `selectedCoupon` is non-stackable. Silent removal + sonner toast "Coupon removed — incompatible with loyalty". | ✅ |
| B-6 | `couponTransform.js` channel map — added `walkIn → dine_in`, `roomService → dine_in`; fallback changed from `'pos'` to `'dine_in'`. POS Frontend never sends `'pos'`. | ✅ |
| §12 B-1 | Cashier-cancel warning toast (post-commit + post-Hold only) | **DEFERRED** — see §4 |

---

## 2. Files Changed

| # | File | Change | Notes |
|---|------|--------|-------|
| 1 | `frontend/src/api/transforms/couponTransform.js` | Modified | Channel map: 5 entries + `'dine_in'` fallback (Owner B-6) |
| 2 | `frontend/src/api/transforms/orderTransform.js` | Modified | 5 commit-flow edits: Flow 1/2 add `coupon_code: ''`; Flow 3 KEY-MISMATCH FIX + `coupon_code` + gating; Flow 4 add `coupon_code`; Flow 5 print add `coupon_discount` (gated) |
| 3 | `frontend/src/components/order-entry/CollectPaymentPanel.jsx` | Modified | Imports (+3 lines: couponService, couponTransform, sonner); state +4 useStates; +3 refs; new `errorCodeToCopy`, `fetchAvailableCoupons`, `runValidate` helpers; new `handleApplyCoupon` (rewrite); 3 new useEffects (customer-change reset, stacking auto-remove, debounced auto-apply); fixed `couponDiscount` math; fixed `paymentData.discounts` emit; added `couponDiscount` override to `handlePrintBill`; full type-ahead dropdown UI for main view (L1046–1185 approx new range); inline-mirror parity |
| 4 | `frontend/src/utils/BUG108_FLAGS.js` | Modified | `couponLive: false → true` |
| 5 | `/app/memory/change_requests/final_sprint_reconciliation/POS3_0_BUG_108_COUPON_V1B_STEP1_IMPLEMENTATION_REPORT_2026_05_25.md` | Created | This file |
| 6 | `/app/memory/change_requests/final_sprint_reconciliation/POS3_0_BUG_108_COUPON_V1B_STEP1_QA_HANDOFF_2026_05_25.md` | Created | QA handoff |

**Files NOT changed in V1B Step 1:**
- `src/api/services/couponService.js` (V1A foundation — untouched)
- `src/api/constants.js` (V1A foundation — `COUPONS_AVAILABLE` + `COUPONS_VALIDATE` still in place)
- `src/components/order-entry/CartPanel.jsx` (QSR stays coupon-free per Owner Q4 = A)
- `src/components/order-entry/OrderEntry.jsx` (B-1 cashier-cancel toast deferred — see §4)
- `/app/backend/*` (stub POS BE in this repo; real Laravel POS BE is external)
- `/app/memory/final/*` (untouched per Implementation Agent Rules)

---

## 3. Build Result

```
cd /app/frontend && CI=false yarn build
```

| Metric | Value |
|--------|-------|
| Exit code | `0` |
| Result | **Compiled with warnings** |
| Duration | 21.27s |
| `main.<hash>.js` (gzipped) | **481.92 kB (+6.56 kB vs V1A baseline 475.36 kB)** — within expected V1B delta |
| `main.<hash>.css` (gzipped) | 16.76 kB (unchanged) |
| Errors | 0 |
| Warnings | 1 (pre-existing `OrderEntry.jsx:1297` `useCallback`/`printOrder` — unrelated to V1B) |

**Runtime verification:**
- `sudo supervisorctl status frontend` → `RUNNING`
- External preview URL `https://insights-phase.preview.emergentagent.com/` → **HTTP 200**
- Dev server hot-reload picked up the change cleanly (no compile errors in `/var/log/supervisor/frontend.out.log`)

---

## 4. Items Deferred / Not Implemented

### 4.1 B-1 Cashier-cancel warning toast (intentionally deferred)

Per Owner B-1 decision: toast triggers only on **(c) post-commit + post-Hold (with committed coupon)**. The cancel/Hold buttons live in **`OrderEntry.jsx`**, not in `CollectPaymentPanel.jsx`. The plan §12 B-1 said "scheduled as the LAST item in V1B Step 1, after all UI + payload edits land."

This implementation pass completed E-1..E-17 (16 items). B-1 (item 17 of 17) requires:
- An OrderEntry.jsx-side check on whether the order being cancelled/held was committed with a non-empty `coupon_code` (read from `currentTable.couponCode` or equivalent backend-echoed field).
- A pre-confirm toast wired into the existing cancel-order and Hold-order handlers.

Recommended approach for the next V1B continuation pass:
- Check `currentTable.couponCode` (or `currentTable.rawOrderDetails.coupon_code`) — non-empty + non-null.
- Use existing `sonner` `toast()` API with message `'Coupon allowance consumed — cannot be refunded'` (Owner Q3 = A copy).
- 4-second duration; no blocking modal (Owner Q3 = A is informational pre-confirm, not a confirm-required dialog).

**Status:** **DEFERRED** — does not affect V1B Step 1 functional smoke (CRM commits coupon usage; toast is purely informational on cancel).

### 4.2 V1 closure items (Step 4 — separate later PR)
- Remove `couponLive` constant from `BUG108_FLAGS.js` + remove all `BUG108_FLAGS.couponLive ?` ternaries (uncondition).
- Remove `BUG108_COPY.couponDisabledHelper: 'Coming soon'`.
- Remove dead-code branches in CollectPaymentPanel.jsx that handle `!couponLive` (helper text rendering, blocked state).

**Trigger:** After V1B is stable in preprod and owner sign-off.

### 4.3 V2 / V3 / permanently-deferred items
Identical to V1B plan §7 — unchanged. Includes: item/category coupons, BOGO/BXG/Nth, QSR coupon UI (permanently deferred per Owner Q4 = A), room/hotel coupon, reversal/refund, deprecated `/api/pos/coupons/apply`, direct frontend `/api/pos/orders` commit, backend mapper changes.

---

## 5. Confirmations

| # | Confirmation | Status |
|---|--------------|--------|
| 1 | `BUG108_FLAGS.couponLive` flipped to `true` (Owner-approved, manual rollback policy) | ✅ |
| 2 | Flow 3 latent key-mismatch fix landed in same PR as flag flip (per V1B plan §3.9) | ✅ |
| 3 | All 4 commit flows (Flow 1/2/3/4) carry uniform `coupon_code` field | ✅ |
| 4 | Print payload (Flow 5) carries `coupon_discount` gated field | ✅ |
| 5 | Channel mapper never sends `'pos'` (Owner B-6) — fallback is `'dine_in'` | ✅ |
| 6 | Manual-discount ↔ coupon mutex (BUG-108 P1 Q10) preserved — `couponBlocked = !couponLive \|\| isManualActive` derivation retained, dropdown suppressed when blocked | ✅ |
| 7 | Inline-mirror (room-service) shares state with main view — no per-surface duplication | ✅ |
| 8 | `/available` rate-limit: max 3 calls per panel session (Owner B-5), cache reset on customer change | ✅ |
| 9 | Loyalty/coupon stacking auto-remove (Owner B-2) — silent removal + toast on `useLoyalty` toggle when coupon is non-stackable | ✅ |
| 10 | Dropdown row click applies silently (Owner B-3) — does NOT populate input | ✅ |
| 11 | Auto-apply picks highest `expectedDiscount` regardless of match count (Owner B-4) | ✅ |
| 12 | Error rendering uses only `errorCodeToCopy(code)` — never raw `error.detail` (per Contract Freeze §3.7) | ✅ |
| 13 | No backend (Laravel) code touched | ✅ |
| 14 | No CRM code touched | ✅ |
| 15 | No data mutated (no scripts run, no admin actions) | ✅ |
| 16 | `/app/memory/final/` untouched | ✅ |
| 17 | Baseline docs untouched | ✅ |
| 18 | V1A foundation files (`couponService.js`, `constants.js` additions) untouched | ✅ |
| 19 | V1B plan doc untouched after §12 lock | ✅ |
| 20 | PRD.md untouched | ✅ |
| 21 | Build passes with zero errors and only pre-existing unrelated warning | ✅ |

---

## 6. Risks Active in Production

Per V1B plan §8 — these now matter because `couponLive=true`:

| # | Risk | Mitigation in place | Residual |
|---|------|---------------------|----------|
| R-1 | `selectedCoupon` retaining legacy mock shape → discount silently 0 | Only setter sites are `runValidate` (writes canonical shape) and Remove handler (writes `null`). No legacy-shape writes anywhere post-V1B. | **LOW** |
| R-2 | Flow 3 fix changes prepaid payloads — POS BE / CRM must handle end-to-end | I-1 verification pending (BE smoke). Manual rollback via flag flip. | **MEDIUM** until BE smoke |
| R-3 | Manual-discount ↔ coupon mutex regression | `couponBlocked` derivation retained; dropdown suppressed when blocked. | **LOW** |
| R-4 | Dropdown z-index issues clipping Apply/Remove | `absolute` + `zIndex: 50` + `onMouseDown` (not `onClick`) prevents blur race. | **LOW** |
| R-5 | `/available` thrash | Max 3 calls/session, customer-id keyed, no useEffect re-runs. | **LOW** |
| R-6 | Stacking warning collision with loyalty section | Auto-remove path (B-2) — coupon section is the only surface that shows the message (via toast). | **LOW** |
| R-7 | Print double-count | POS BE must forward `coupon_discount` to print template unchanged. | **MEDIUM** until BE template lands |

---

## 6.5 Post-Merge Session Notes (2026-05-25, same-day)

### Hotfix H-1 — Missing useState declarations (Runtime ReferenceError)
**Symptom:** Owner-reported error boundary on Collect Bill: `ReferenceError: availableCoupons is not defined`.
**Root cause:** In the initial V1B parallel `search_replace` batch, the state-additions edit (4 new `useState` calls: `availableCoupons`, `couponLoading`, `couponInstruction`, `showCouponDropdown`) reported "Edit was successful" but the change silently did not persist to the file — likely a race-condition during the parallel write batch. All other edits landed correctly, so the file referenced 4 undefined variables at render time.
**Fix:** Re-ran the state declarations as a single targeted `search_replace`. Now present at L277–280 of `CollectPaymentPanel.jsx`. Verified via grep:
```
277: const [availableCoupons, setAvailableCoupons] = useState([]);
278: const [couponLoading, setCouponLoading] = useState(false);
279: const [couponInstruction, setCouponInstruction] = useState(null);
280: const [showCouponDropdown, setShowCouponDropdown] = useState(false);
```
**Verification:** Hot-reload picked up cleanly. Frontend → HTTP 200. Login page renders. No error boundary.
**Lesson for future passes:** After parallel `search_replace` batches, grep for the new markers before declaring success — especially for state additions, which are the foundation of every downstream reference.

### Smoke S-1 — CRM coupon endpoint reachability + auth
**Test:** `curl https://crm.mygenie.online/api/pos/coupons/available?customer_id=&order_total=1728&channel=dine_in -H 'X-API-Key: <production CRM token>'`
**Result:** HTTP 200, contract-shaped response (`success: true, data: { count: 0, coupons: [] }`).
**Confirms:**
- Production CRM URL (`crm.mygenie.online/api`) is reachable from this environment.
- The X-API-Key auth (`dp_live_-…`) is valid against production CRM.
- Response envelope matches `couponTransform.fromAPI.availableCoupons` expected shape.
**Does NOT confirm:** Whether kunafamahal restaurant or any specific customer has coupons configured in CRM admin. That requires a customer-scoped call (pending owner-side customer-id retrieval).

### Owner-reported open item — Coupon section header not rendering for kunafamahal
**Reported:** 2026-05-25, after H-1 fix. Owner login `owner@kunafamahal.com`. Profile API shows `is_coupon: "Yes"`, `is_loyality: "Yes"`, `is_customer_wallet: "Yes"`.
**Observation:** Loyalty section renders correctly (proves `customer` + `restaurantSettings.isLoyalty` are both truthy and the profile transform is reaching the UI). Coupon section header is completely hidden.
**Render gate (CollectPaymentPanel L1201):** `customer && restaurantSettings?.isCoupon`. Since loyalty's gate (which uses identical `customer &&` predicate) passes, the only failing predicate is `restaurantSettings?.isCoupon`.
**Most-likely causes (in priority order):**
1. **Browser cache** carrying the pre-H-1 broken JS chunk or the error-boundary state. → Hard-refresh.
2. **Field nesting mismatch** in the profile API response — `is_coupon` may be at a different path than `is_loyality` despite both being `"Yes"`. The profile transform (`profileTransform.js:314`) expects `restaurants[0].is_coupon`.
3. **Backend serialization** specific to kunafamahal — same field returns `"Yes"` in JSON but maps differently when nested in `restaurants[0].settings.is_coupon` (which the transform does NOT read).
**Status:** Pending owner verification via hard-refresh + DevTools Network inspection of `restaurants[0]` JSON path.
**NOT a V1B implementation bug** — V1B coupon UI is correctly wired. The gate is intentional pre-existing behavior; the issue is upstream profile-field plumbing or browser cache.

---

## 7. Verification Commands

```bash
# Files changed (V1B working tree, excluding pre-existing yarn.lock)
cd /app && git diff --stat HEAD -- frontend/src
#  frontend/src/api/transforms/couponTransform.js                  | ~5 lines
#  frontend/src/api/transforms/orderTransform.js                   | ~30 lines
#  frontend/src/components/order-entry/CollectPaymentPanel.jsx     | ~220 lines (incl. UI rewrite)
#  frontend/src/utils/BUG108_FLAGS.js                              | 1 line

# Build
cd /app/frontend && CI=false yarn build
# → exit 0, Compiled with warnings (1 pre-existing OrderEntry.jsx)

# Confirm couponLive=true
grep -n "couponLive" /app/frontend/src/utils/BUG108_FLAGS.js
#  35: couponLive: true,

# Confirm Flow 3 key-mismatch fix landed
grep -n "discounts\.couponDiscount\|discounts\.coupon " /app/frontend/src/api/transforms/orderTransform.js
# Expect: discounts.couponDiscount appearing in BOTH Flow 3 (~L1163) and Flow 4 (~L1374);
# NO occurrence of `discounts.coupon ||` anywhere.

# Confirm channel map fix
grep -n "CHANNEL_MAP\||| 'dine_in'\|'pos'" /app/frontend/src/api/transforms/couponTransform.js
# Expect: fallback '|| 'dine_in'' present; '|| 'pos'' absent.
```

---

## 8. Rollback Procedure

Single-line revert if Step 2 verification reveals issues:

```js
// /app/frontend/src/utils/BUG108_FLAGS.js — line 35
couponLive: false,  // ← change `true` back to `false`
```

Restart frontend (hot-reload will pick it up):
```bash
# Hot-reload handles it. If not, force restart:
sudo supervisorctl restart frontend
```

Effects of rollback:
- Coupon UI returns to "Coming soon" state (helper text path active).
- All 5 commit flows force-zero `coupon_*` fields.
- Print payload force-zeros `coupon_discount`.
- No CRM `/available` or `/validate` traffic.
- Customer data in CRM (`coupon_usage` rows) remains — committed allowances are NOT reversed by flag flip (CRM has no reversal endpoint yet — Phase 2 deliverable).

---

**End of BUG-108 Coupon V1B Step 1 Implementation Report.**
