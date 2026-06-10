# BUG-042-B — Pre-Implementation Code Gate

> **Sprint:** pos_final_1.0
> **Task type:** Pre-Implementation Code Gate
> **Scope:** BUG-042-B only.
> **Locked decision:** `grant_amount` is the confirmed backend key; `grand_amount` is a single runtime outlier in `collectBillExisting`.
> **Status:** Documentation-only — no code changes performed.

---

## 1. Docs Read

### `/app/memory/final/` (baseline)
- `IMPLEMENTATION_AGENT_RULES.md` — Mandatory pre-coding reading + impact analysis + high-risk-areas list. Confirmed `orderTransform.js` is on the high-risk-areas list (line 152) → explicit file-level plan + regression checklist required.
- `ARCHITECTURE_DECISIONS_FINAL.md` — Rule API-02 ("Preserve transform-mediated payload shaping for order/financial/report flows", line 113) + Rule API-03 ("Order composition lives in OrderEntry; final settlement lives in Collect Bill flows", line 116). Confirmed `collectBillExisting` is the canonical bill-settlement payload builder.
- `MODULE_DECISIONS_FINAL.md` — Section 4 (Order Entry / Collect Bill / Payment) line 165 confirms `bill payment` as a related API and line 205 mandates impact identification across "place-order, update-order, collect-bill, prepaid flow, split, room, or print behavior" before change.
- `CHANGE_REQUEST_PLAYBOOK.md` — Process scaffold for payload builders (line 53, 131).
- `OPEN_QUESTIONS_FINAL_RESOLUTION.md` — No open question on `grand_amount` / `grant_amount`. No conflict.
- `FINAL_DOCS_APPROVAL_STATUS.md`, `FINAL_DOCS_SUMMARY.md` — Status snapshots only; no relevant decision.

### Audit + bug docs
- `/app/memory/bugs/BUG_042_OWNER_DECISION_AND_PAYLOAD_AUDIT.md` (v3) — Source of truth for this gate. Section 4 (BUG-042-B) + Section 4.0 (codebase grep evidence).
- `/app/memory/bugs/BACKEND_CONFIRMATION_PULL_BUG_037_039_042_047.md` — Backend confirmation pull (general context).

### Adjacent docs reviewed for conflict screening (no conflicts found)
- `/app/memory/change_requests/phase_3/CR_013_PRINT_PAYLOAD_TRUTH.md` — references `grand_amount` / `grant_amount` only in the print-payload context (`buildBillPrintPayload`); does not constrain `collectBillExisting`.
- `/app/memory/change_requests/phase_3/CR_013_BEAN_ME_UP_PRINT_DOUBLE_COUNT_DECISION_BRIEF.md`, `/app/memory/change_requests/implementation_plans/CR_013_PRINT_PAYLOAD_RUNTIME_HANDOVER.md`, `/app/memory/change_requests/implementation_handover/CR_013_PHASE_1_5_PRINT_DOUBLE_COUNT_HANDOVER_2026_05_05.md` — same scope (print payload). No constraint on BILL_PAYMENT payload.
- `/app/memory/security/SECURITY_AUDIT_REPORT.md`, `/app/memory/security/SECURITY_FIX_HANDOVER.md` — `grand_amount` mentions are background context; no rule.
- `/app/memory/BUG_TEMPLATE.md` — read-only; structural.

---

## 2. Baseline Conflict Check

| Rule | Source | Compatibility with BUG-042-B |
|---|---|---|
| API-02 (preserve transform-mediated payload shaping) | `ARCHITECTURE_DECISIONS_FINAL.md:113` | ✅ COMPATIBLE — change is a single-key spelling fix inside an established transform. The shape (key count, value derivation) is preserved; only one key's literal name changes. |
| API-03 (final settlement lives in Collect Bill flows) | `ARCHITECTURE_DECISIONS_FINAL.md:116` | ✅ COMPATIBLE — change stays inside the `collectBillExisting` builder, the canonical settlement payload path. |
| High-risk file list — `orderTransform.js` | `IMPLEMENTATION_AGENT_RULES.md:152` | ⚠️ Requires explicit file-level plan + regression checklist (provided in Section 4 + Section 10 below). |
| Module 4 — Order Entry / Collect Bill | `MODULE_DECISIONS_FINAL.md:155–212` | ✅ COMPATIBLE — change affects "bill payment" related API surface (line 165) which is in scope of Module 4. |
| Owner directive #6 (single emit, no dual-send) | Audit v3 §1.2 | ✅ Honoured — replace, do not duplicate. |
| Owner directive #3 (no other payload changes) | Audit v3 §1.1 | ✅ Honoured — only the literal key spelling at `orderTransform.js:1234` changes; no other field added / removed / renamed / re-typed. |
| Owner directive (no `payment_status` change for Cash/Card/UPI) | Audit v3 §4 | ✅ Honoured — `payment_status` line at `orderTransform.js:1219` is untouched in this gate. |
| Owner directive (Room / To Room untouched) | Audit v3 §1.2 #10 | ✅ Honoured — `transferToRoom` builder and `buildBillPrintPayload` are not in scope. |
| Owner directive (`grand_total` untouched, `order_amount` untouched) | Gate task §Scope | ✅ Honoured — only `grand_amount` is renamed; `grand_total` is comments-only (no runtime emission) and the conditional `order_amount` at `orderTransform.js:1241` stays. |

**Verdict:** No baseline conflict. No change to `/app/memory/final/`. No change to `BUG_TEMPLATE.md`.

---

## 3. Code Grep Evidence

### 3.1 `grand_amount` — runtime emissions

Comprehensive search across `/app/frontend/src/` (excluding `.bak` and test files for production-path identification).

| File:Line | Type | Detail |
|---|---|---|
| `frontend/src/api/transforms/orderTransform.js:1234` | **Code (runtime emission)** | `grand_amount: finalTotal \|\| 0,` — inside `collectBillExisting`. **THE ONLY runtime emission of `grand_amount` in the codebase.** |
| `frontend/src/components/order-entry/CollectPaymentPanel.jsx:515` | Comment only | Documents pre-existing semantics (`grand_amount = food-grand only`). Not a runtime field. |

→ **Exactly 1 runtime emission exists**, at the documented location. No other site emits `grand_amount`.

### 3.2 `grant_amount` — runtime emissions (already established convention)

| File:Line | Type | Detail |
|---|---|---|
| `frontend/src/api/transforms/orderTransform.js:1023` | Code | `placeOrderWithPayment` → `partial_payments[]` split entry: `grant_amount: parseFloat(p.amount) \|\| 0` (split-payment row). |
| `frontend/src/api/transforms/orderTransform.js:1029` | Code | `placeOrderWithPayment` → padding row for missing modes: `payment_mode: mode, payment_amount: 0, grant_amount: 0, transaction_id: ''`. |
| `frontend/src/api/transforms/orderTransform.js:1037` | Code | `placeOrderWithPayment` → single-payment row: `grant_amount: mode === method ? finalTotal : 0`. |
| `frontend/src/api/transforms/orderTransform.js:1616` | Code | `buildBillPrintPayload` → `grant_amount: roomFinalPaymentAmount` (REQ3 room bill print). |
| `frontend/src/api/transforms/orderTransform.js:1568` | Comment | Documents `grant_amount` as the room-bill-print payload field. |
| `frontend/src/api/transforms/__tests__/req3-room-bill-print.test.js:112` | Test assertion | `expect(payload.grant_amount).toBe(676);` — backend contract validated. |

→ **`grant_amount` is already a known, working backend key** with 4 production-path emissions + 1 unit-test assertion. Renaming `grand_amount` → `grant_amount` aligns one outlier with the established convention.

### 3.3 `grand_total` — runtime status (DO NOT TOUCH)

| File:Line | Type | Detail |
|---|---|---|
| `frontend/src/components/order-entry/CollectPaymentPanel.jsx:132, 516, 517, 527` | Comments | Describe ROOM_CHECKIN_GAP3 semantic model (`grand_total = food + associated + roomBalance`). |
| `frontend/src/api/transforms/orderTransform.js:312, 313, 1238` | Comments | Same room collect-bill historical context. Line 1238 explicitly notes `grand_total` was REPLACED by `order_amount` on 2026-04-25. |

**No runtime emission of `grand_total` exists.** All occurrences are comments only. **No change needed.**

### 3.4 `order_amount` — confirmation it is NOT affected

`orderTransform.js:1241` emits `order_amount: finalTotal \|\| 0` **only when** `roomBalance > 0` (room order with pending balance). This is the replacement key for the deprecated `grand_total`. It is **outside the scope of BUG-042-B** — not touched.

---

## 4. Exact File / Line to Change

**Single site, single line:**

| File | Line | Current literal | Proposed literal |
|---|---|---|---|
| `/app/frontend/src/api/transforms/orderTransform.js` | **1234** | `grand_amount:                 finalTotal \|\| 0,` | `grant_amount:                 finalTotal \|\| 0,` |

**File-Level Change Plan (per IMPLEMENTATION_AGENT_RULES.md §65):**

- **File:** `/app/frontend/src/api/transforms/orderTransform.js`
- **Why this file is affected:** Sole owner of the BILL_PAYMENT payload builder (`collectBillExisting`) that contains the outlier `grand_amount` key. Established convention `grant_amount` already in use elsewhere in the same file.
- **Intended change:** Rename a single object-property key from `grand_amount` → `grant_amount` at line 1234. Value expression (`finalTotal \|\| 0`) and key alignment (whitespace) preserved.
- **Risk level for this file:** Low (single-line, single-key rename; value unchanged; surrounding lines untouched; no formula change).
- **Downstream files to verify after change:**
  - `frontend/src/components/order-entry/OrderEntry.jsx` (consumer of `collectBillExisting` for dashboard normal Collect Bill — runtime path 1).
  - `frontend/src/components/reports/CollectBillPanelDrawer.jsx` (consumer for Audit Hold-tab Collect — runtime path 2).
  - `frontend/src/components/order-entry/CollectPaymentPanel.jsx` (calling site that supplies `paymentData`).

---

## 5. Current Payload Behavior

When `collectBillExisting(...)` is invoked (by either `OrderEntry.jsx:1544` or `CollectBillPanelDrawer.jsx:171`) and posted to `/api/v2/vendoremployee/order/order-bill-payment`, the emitted JSON includes (excerpt; full list in Audit v3 §2.1):

```json
{
  "order_id": "<id>",
  "payment_mode": "<cash|card|upi|credit|partial>",
  "payment_amount": <finalTotal>,
  "payment_status": "<paid|success>",
  "...": "...",
  "vat_tax": <0|N>,
  "grand_amount": <finalTotal>,   ← THE OUTLIER KEY (current)
  "round_up": 0,
  "service_tax": <N>,
  "...": "..."
}
```

**Observed runtime symptom on Hold-tab Collect (Cash/UPI):** Backend returns `"Order already paid"`. Backend reference shared by BE team uses `grant_amount` (with the typo).

**Dashboard normal Collect Bill:** Currently succeeds — backend appears to accept either spelling on this path, or computes the amount server-side from itemised fields.

---

## 6. Proposed Payload Behavior

After the proposed change, the same payload becomes:

```json
{
  "order_id": "<id>",
  "payment_mode": "<cash|card|upi|credit|partial>",
  "payment_amount": <finalTotal>,
  "payment_status": "<paid|success>",
  "...": "...",
  "vat_tax": <0|N>,
  "grant_amount": <finalTotal>,   ← RENAMED (proposed)
  "round_up": 0,
  "service_tax": <N>,
  "...": "..."
}
```

**Key count unchanged.** Value unchanged. Only the literal key spelling changes (`d` → `t`).

---

## 7. Pseudo-Diff (only)

```diff
--- a/frontend/src/api/transforms/orderTransform.js
+++ b/frontend/src/api/transforms/orderTransform.js
@@ -1231,7 +1231,7 @@
       gst_tax:                      gstTax,
       vat_tax:                      vatAmount || 0,
-      grand_amount:                 finalTotal || 0,
+      grant_amount:                 finalTotal || 0,
       // ROOM_CHECKIN_GAP3 (Stage 2, revised 2026-04-25): `order_amount` carries
       // the full payable amount (food + associated + room balance) for room
       // orders with a pending room balance. User-confirmed field name on
```

(Line numbers approximate — surrounding context preserved as-is.)

---

## 8. What Will NOT Change

### 8.1 Inside `orderTransform.js`
- ✋ Every other field in `collectBillExisting`: `order_id`, `payment_mode`, `payment_amount`, `payment_status`, `transaction_id`, `billing_auto_bill_print`, `food_detail`, `waiter_id`, `restaurant_name`, `email`, `order_sub_total_amount`, `order_sub_total_without_tax`, `total_gst_tax_amount`, `gst_tax`, `vat_tax`, `round_up`, `service_tax`, `service_gst_tax_amount`, `tip_amount`, `tip_tax_amount`, `delivery_charge`, `self_discount`, `coupon_discount`, `coupon_title`, `coupon_type`, `comm_discount`, `discount_type`, `order_discount_type`, `order_discount`, `discount_value`, `discount_member_category_id`, `discount_member_category_name`, `used_loyalty_point`, `use_wallet_balance`, `paid_room`, `usage_id`, `name`, `mobile`, `partial_payments[]`, conditional `order_amount` (room only).
- ✋ `payment_status` line at **1219** (`isTab ? 'success' : 'paid'`) — UNCHANGED.
- ✋ `placeOrderWithPayment` partial_payments rows at lines **1023 / 1029 / 1037** (`grant_amount` already correct) — UNCHANGED.
- ✋ `buildBillPrintPayload` (room bill print) at line **1616** — UNCHANGED.
- ✋ `transferToRoom` builder at line **1293** — UNCHANGED.
- ✋ `placeOrder`, `updateOrder`, `cancelItem`, `cancelOrder`, `updateOrderStatus` — UNCHANGED.
- ✋ `calcOrderTotals` and all helper math — UNCHANGED.
- ✋ Conditional `order_amount` emission (room-only) at line **1241** — UNCHANGED.

### 8.2 Outside `orderTransform.js`
- ✋ `OrderEntry.jsx` collect-bill caller (`L1544`) — UNCHANGED.
- ✋ `CollectBillPanelDrawer.jsx` collect-bill caller (`L171`) — UNCHANGED.
- ✋ `CollectPaymentPanel.jsx` payment-data builder (`L522–571`) — UNCHANGED.
- ✋ `OrderTable.jsx` row action eligibility — UNCHANGED (BUG-042-A scope, not this gate).
- ✋ `socketHandlers.js` terminal-status handling — UNCHANGED (BUG-042-C scope, not this gate).
- ✋ Backend endpoint name `/api/v2/vendoremployee/order/order-bill-payment` (`API_ENDPOINTS.BILL_PAYMENT`) — UNCHANGED.

### 8.3 Documentation
- ✋ `/app/memory/final/` — read-only.
- ✋ `/app/memory/BUG_TEMPLATE.md` — read-only.

### 8.4 Other BUG-042 sub-buckets
- ✋ BUG-042-A (Hold rail cleanup) — out of scope for this gate.
- ✋ BUG-042-C (status-9 terminal clear) — out of scope for this gate.

---

## 9. Risk Assessment

### 9.1 Regression risk on Dashboard normal Collect Bill (Scenario 1)

| Risk dimension | Assessment |
|---|---|
| **Probability** | Low |
| **Reason** | (a) `grant_amount` is already used by the same backend on adjacent endpoints (split partial_payments via `/place-order`, room bill print via `/order-temp-store`). (b) Test file `req3-room-bill-print.test.js:112` already asserts on `grant_amount`. (c) Backend reference payload shared by BE team uses `grant_amount`. (d) Owner directive #6 explicitly mandates the rename (no dual-send). |
| **Mitigation** | Manual smoke test on preprod: dashboard Collect Bill via Cash + Card + UPI before & after change; assert backend response is success and order moves to Paid tab. |
| **Rollback** | One-line revert restores previous behaviour. |

### 9.2 Regression risk on Hold-tab Collect (Audit drawer)

| Risk dimension | Assessment |
|---|---|
| **Probability** | Cannot regress — current behaviour is already broken with `"Order already paid"`. |
| **Mitigation** | Verify Hold-tab Collect via Cash + UPI now succeeds with backend acceptance. |

### 9.3 Regression risk on TAB / Split / Room

| Path | Assessment |
|---|---|
| **TAB (`credit`) on Collect Bill** | Same builder, same rename. `payment_status='success'` branch preserved. Low risk — TAB previously succeeded via same endpoint; rename either equivalent or strictly more correct. |
| **Split (`partial`) on Collect Bill** | Outer `grand_amount` → `grant_amount`. Inner `partial_payments[]` rows are already on `grant_amount`. Consistent. Low risk. |
| **Room order Collect Bill (with `roomBalance > 0`)** | Conditional `order_amount` emitted alongside `grant_amount`. Both keys preserved/aligned. Low risk. |
| **Transfer to Room (`transferToRoom`)** | Different builder, different endpoint (`/order-shifted-room`) — out of this change's surface entirely. Zero risk. |

### 9.4 Print / Socket / Localstorage / Bootstrap impact

- Print: ✋ no impact. `buildBillPrintPayload` (the print payload builder) is unchanged.
- Socket: ✋ no impact. Socket handlers do not consume `grand_amount` / `grant_amount`.
- LocalStorage: ✋ no impact. No storage key carries this field.
- Bootstrap (`LoadingPage.jsx`): ✋ no impact.

### 9.5 Overall regression risk
**LOW.** Single-line, single-key spelling alignment. Evidence-backed by adjacent payloads + unit test + BE reference.

---

## 10. Test / QA Plan

### 10.1 Pre-change baseline (regression anchors)
- Confirm dashboard normal Collect Bill (Cash) succeeds against preprod **before** the change. Record screenshot / network trace.
- Confirm Hold-tab Collect Bill (Cash) fails with `"Order already paid"` **before** the change. Record screenshot / network trace.

### 10.2 Post-change functional tests

| # | Scenario | Expected |
|---|---|---|
| T-1 | Hold-tab → Collect drawer → pay via **Cash** | Network request to `/order-bill-payment` carries `grant_amount` (NOT `grand_amount`); HTTP 200; order moves from Hold tab to Paid tab; toast `"Bill cleared successfully"`. |
| T-2 | Hold-tab → Collect drawer → pay via **UPI** | Same as T-1 with `payment_mode: "upi"`. |
| T-3 | Hold-tab → Collect drawer → pay via **Card** | Same as T-1 with `payment_mode: "card"` and `transaction_id` populated. |
| T-4 | Dashboard → Collect Bill on an existing running order via **Cash** | Network request carries `grant_amount`; HTTP 200; order moves to Paid; table marked `available`. **REGRESSION ANCHOR.** |
| T-5 | Dashboard → Collect Bill via **UPI** | Same as T-4 with UPI. |
| T-6 | Dashboard → Collect Bill via **Card** | Same as T-4 with Card. |
| T-7 | Dashboard → Collect Bill via **TAB (credit)** | Network request carries `grant_amount` AND `payment_status: "success"` (TAB branch preserved). HTTP 200. |
| T-8 | Dashboard → Collect Bill via **Split (partial)** | Outer payload carries `grant_amount` (rename); inner `partial_payments[]` rows still carry their own `grant_amount` (UNCHANGED). HTTP 200. |
| T-9 | Room order with roomBalance > 0 → Collect Bill | Payload carries BOTH `grant_amount` (renamed) AND `order_amount` (conditional, unchanged). HTTP 200; room balance settles correctly. |
| T-10 | **Transfer to Room** | Untouched path — payload still hits `/order-shifted-room`; does NOT emit `grant_amount` (or `grand_amount`). Regression anchor. |
| T-11 | Auto-print bill after successful Collect Bill | Print payload via `/order-temp-store` continues to use `grant_amount` (already on `grant_amount` pre-change; no behavioural drift). |

### 10.3 Static / regression assertions

- **A-1:** `grep -n "grand_amount" /app/frontend/src/api/transforms/orderTransform.js` returns **zero** matches in code (comments may still mention it for history). 
- **A-2:** `grep -n "grant_amount" /app/frontend/src/api/transforms/orderTransform.js` returns **5** runtime emission lines (was 4 — adds the renamed line).
- **A-3:** Existing test `frontend/src/api/transforms/__tests__/req3-room-bill-print.test.js:112` still passes (it asserts on the room-print path, unaffected).
- **A-4:** No new test failures across `frontend/src/__tests__/` from `yarn test`.
- **A-5:** Lint clean: `yarn lint` no new errors/warnings on `orderTransform.js`.

### 10.4 Manual QA checklist (per IMPLEMENTATION_AGENT_RULES.md §79)

- [ ] Happy path tested (Cash settle on Hold-tab + dashboard).
- [ ] Error path tested (network drop mid-collect; backend rejects with new error — confirm graceful failure & toast).
- [ ] Permission-gated path tested (cashier role with collect-bill permission only).
- [ ] Socket/reload/re-entry behavior tested (after Collect Bill success, refresh dashboard → order absent; refresh Audit Hold → order in Paid tab).
- [ ] Related print/payment/room path tested (auto-print bill + Transfer-to-Room sanity).
- [ ] Regression surfaces checked (dashboard Collect Bill across all payment modes).
- [ ] Docs updated (Implementation Summary + QA Report under `/app/memory/bugs/`).

---

## 11. Owner Approval Gate

### Approval Gate (per IMPLEMENTATION_AGENT_RULES.md §46)
- **Request Summary:** Rename one outlier object-property key `grand_amount` → `grant_amount` inside the `collectBillExisting` payload builder so the BILL_PAYMENT endpoint receives the BE-confirmed key and unblocks Hold-tab Collect ("Order already paid" error).
- **Change Type:** Single-line literal-key rename in an existing transform builder.
- **Affected Module(s):** Order Entry / Collect Bill / Payment (Module 4) — bill-payment API line.
- **Primary Files to Change:** `/app/frontend/src/api/transforms/orderTransform.js` (line 1234, one line).
- **Related APIs:** `POST /api/v2/vendoremployee/order/order-bill-payment` (`API_ENDPOINTS.BILL_PAYMENT`).
- **State Impact:** None (payload-only).
- **UI Impact:** None (no visual change; only network request body).
- **Regression Risks:** LOW — single key spelling fix; evidence-backed by adjacent payloads on the same backend + existing unit-test assertion + BE team's own reference payload.
- **Open Decision Dependencies:** None (owner directives finalised in Audit v3 §1.2).
- **Safe to Implement Without Owner Clarification?** YES — pending this gate's approval signal.

### Confirmation: gate produces no code changes
- ❌ No code modified.
- ❌ No new files created outside this gate doc.
- ❌ `/app/memory/final/` untouched.
- ❌ `BUG_TEMPLATE.md` untouched.
- ✅ This gate doc created at `/app/memory/bugs/BUG_042_B_PRE_IMPLEMENTATION_CODE_GATE.md`.

---

## Final Verdict

**`ready_for_owner_code_gate_review`** ✅

All preconditions met:
- Single file / single line identified.
- Baseline rules (API-02, API-03, Module 4 future-change rules, high-risk file protocol) honoured.
- Code grep evidence proves `grand_amount` is a runtime outlier and `grant_amount` is the established convention.
- No dual-send. No collateral payload changes. No `payment_status` change.
- Room / To Room / Print / Socket / LocalStorage / Bootstrap surfaces untouched.
- BUG-042-A and BUG-042-C explicitly out of scope.
- Risk LOW; rollback trivial.

Awaiting owner approval to proceed to implementation.

---

*End of BUG-042-B Pre-Implementation Code Gate.*
