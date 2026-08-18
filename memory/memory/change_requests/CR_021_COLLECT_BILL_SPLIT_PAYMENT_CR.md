# CR-021: Collect Bill — Split / Partial Payment Defects
## Intake + Discovery + Impact Analysis + Implementation Plan
**Registered:** 2026-06-10
**Sprint:** pos_4_0
**Priority:** P0 (money-impacting — cashier can collect mismatched amounts; payload data loss)
**Status:** CLOSED — OWNER VERIFIED 2026-06-11 (owner ruling R1, baseline consolidation: smoke covered BOTH postpaid Collect Bill AND prepaid Place+Pay split parity)
**Owner:** Abhi
**Reporter:** Owner (chat, 2026-06-10)

---

## 1. INTAKE

### 1.1 Reporter-stated symptoms (verbatim → paraphrased)
| # | Symptom (reporter) | Severity proposed |
|---|---|---|
| B1 | Split partial values (e.g. Cash ₹50 + UPI ₹100) "are not getting parsed in the payload" sent to backend. | P0 |
| B2 | When the bill changes in Collect Bill (discount, service charge, tip), the **validation** on split partial-payment inputs **does not re-evaluate** against the new total. | P0 |
| B3 | In split mode with 3 methods (Cash + Card + UPI), the **Card last-4 / Txn ID** field is forced as **compulsory** even when ₹0 / nothing is entered against Card. | P1 |

### 1.2 Discovery — additional issue found in same code rail
| # | Discovered defect (no reporter input yet) | Severity proposed |
|---|---|---|
| B4 | Pay button has **no validation that `Σ splitPayments.amount === effectiveTotal`**. Cashier can click Pay with the split sum either under- or over-covering the bill — and the request will go through. | P0 |

### 1.3 Out of scope (deferred)
- Split-by-Station rail (`splitType === "station"`) — not reported, not investigated under this CR.
- Transfer-to-Room (`transferToRoom`) and PlaceOrderWithPayment (prepaid place+pay) flows are confirmed not affected by B1 (see §3.2) — out of scope for the fix.

---

## 2. DISCOVERY — Code-level evidence

### 2.1 Files in the Collect Bill split-payment rail
| File | Role | Key lines |
|------|------|-----------|
| `components/order-entry/CollectPaymentPanel.jsx` | UI + paymentData builder | 319, 336, 340–344, 633–666, 957–1067, 2511, 2615–2710, 3054–3061 |
| `components/order-entry/OrderEntry.jsx` | Consumes `onPaymentComplete(paymentData)` → posts BILL_PAYMENT | 1357, 1701, 1979 |
| `components/reports/CollectBillPanelDrawer.jsx` | Same flow from Audit Report → Hold tab | 160, 171 |
| `api/transforms/orderTransform.js` | Builds the actual API payload | 1093–1141 (placeOrderWithPayment), **1250–1445 (collectBillExisting)**, 1454+ (transferToRoom) |
| `api/constants.js` | `BILL_PAYMENT = /api/v2/vendoremployee/order/order-bill-payment` | 62 |

### 2.2 B1 — `partial_payments` is dropped from the BILL_PAYMENT payload

**Root cause (CONFIRMED):** `orderTransform.js` L1436:

```js
// Partial payments
if (method === 'partial' && splitPayments?.length) {
  payload.partial_payments = splitPayments.map(p => ({
    payment_mode:   p.method,
    payment_amount: p.amount,
    transaction_id: p.transactionId || '',
  }));
}
```

But `paymentData.method` is built at `CollectPaymentPanel.jsx` L988 from local state `paymentMethod`, and `paymentMethod` is **never** set to the string `'partial'` anywhere in the file. Quick scan:
- Init (L319): `'cash'`
- Method buttons (L2481, 2527, 2547, 2572): `cash | card | upi | credit | transferToRoom | <dynamic>`
- Split button (L2511): `onClick={() => { setShowSplit(!showSplit); if (!showSplit) setSplitType("payment"); }}` — **does NOT update `paymentMethod`**.

Effect: when cashier enters split mode (`showSplit=true`), `paymentMethod` stays at whatever it last was (e.g. `'cash'`). The transform's `method === 'partial'` gate therefore **always evaluates false** on the BILL_PAYMENT path, so:
- `payload.partial_payments` is **never attached**.
- Backend sees only top-level `payment_mode` (e.g. `'cash'`) and the full `payment_amount` against it — the split breakdown is **silently lost**.

**Asymmetry: `placeOrderWithPayment` (L1119) is correct.** It checks only `splitPayments?.length`, never `method === 'partial'`. So prepaid Place+Pay split works; only **Collect Bill on existing order** (BILL_PAYMENT) is broken.

### 2.3 B2 — Split amounts not re-clamped when bill total changes

**Root cause (CONFIRMED):** clamping logic in `CollectPaymentPanel.jsx` L2647–2670 runs **only inside `onBlur`** on the amount `<input>`:

```js
onBlur={() => {
  setSplitPayments(prev => {
    const newSplit = prev.map(s => ({ ...s }));
    const typedNum = parseFloat(newSplit[idx].amount) || 0;
    const othersSum = newSplit.reduce(...);
    const maxForThisRow = Math.max(0, Math.round((effectiveTotal - othersSum) * 100) / 100);
    if (typedNum > maxForThisRow) {
      newSplit[idx].amount = String(maxForThisRow);
    }
    ...
  });
}}
```

`effectiveTotal` (L646) re-computes reactively when discount / serviceCharge / tip / coupon / loyalty / wallet change. But `splitPayments[i].amount` is independent React state. There is **no `useEffect` that re-clamps `splitPayments` when `effectiveTotal` changes** — so previously-typed amounts stay frozen at their old values.

**Side effects observed in code:**
- The on-screen "Remaining" label (L2709) IS reactive (rendered as `finalTotal - Σ amounts`), so the cashier sees a now-wrong "Remaining" but the input cells keep the stale values.
- If `effectiveTotal` drops below `Σ amounts`, "Remaining" still clamps at `Math.max(0, ...)` → reads ₹0.00, **hiding** the over-collection.
- Combined with B4 (no Pay-button sum-check), this lets the cashier press Pay with a stale over-collected split.

### 2.4 B3 — Card Txn ID forced even when Card amount = 0

**Root cause (CONFIRMED):** Two locations, both missing the `amount > 0` guard:

1. **Pay button disabled-rule** (L3060):
   ```js
   (showSplit && splitType === 'payment' &&
    splitPayments.some(sp => sp.method === 'card' && (!sp.transactionId || sp.transactionId.length !== 4)))
   ```
   No check that `parseFloat(sp.amount) > 0`. Any card row — even with `amount = "" or "0"` — blocks Pay.

2. **Input visual state** (L2696–2697):
   ```js
   borderColor: (sp.transactionId || '').length === 4 ? COLORS.primaryGreen : '#ef4444',
   backgroundColor: ... : '#fef2f2'
   ```
   Renders red error state on the Card Txn ID input even when the cashier has not entered any amount in the Card row.

Reference: BUG-241 (the "inline Txn ID for card row" patch, L2677) introduced the Txn ID; BUG-240 (L399–400) defined the 4-digit format. Neither gated the requirement on `amount > 0`.

### 2.5 B4 — Pay button missing sum-must-cover-total check (discovered)

**Root cause (CONFIRMED):** Pay button `disabled` expression (L3054–3062):

```js
disabled={
  (!isMarkerOnlyRoom && (cartItems || []).filter(...).length === 0) ||
  (paymentMethod === 'transferToRoom' && !selectedRoom) ||
  (paymentMethod === 'card' && !showSplit && cardTxnId.length !== 4) ||
  (paymentMethod === 'cash' && !showSplit && (parseFloat(amountReceived || 0) < effectiveTotal)) ||
  (isTabPayment && !showSplit && (!tabName.trim() || tabPhone.replace(/\D/g, '').length !== 10)) ||
  (showSplit && splitType === 'payment' && splitPayments.some(sp => sp.method === 'card' && (!sp.transactionId || sp.transactionId.length !== 4))) ||
  isProcessingPayment
}
```

For `showSplit === true`, only the per-row card-txn-id check runs. **No rule checks that `Σ splitPayments[].amount >= effectiveTotal`** (or `=== effectiveTotal`, per restaurant policy). Combined with B2, the cashier can submit:
- Under-collected splits (e.g. ₹50 cash + ₹100 UPI for a ₹200 bill).
- Stale over-collected splits (after a discount drops the bill).

---

## 3. IMPACT ANALYSIS

### 3.1 Cross-flow impact matrix

| Flow | Endpoint | Affected? | Why |
|------|----------|-----------|-----|
| **Collect Bill on existing order** (postpaid) | `BILL_PAYMENT` | **B1 ✗, B2 ✗, B3 ✗, B4 ✗** | All four defects live here. |
| **Place+Pay prepaid (new order)** | `PLACE_ORDER` | **B1 ✗ FIXED (2026-06-11)** — `payment_method` now sends `"partial"` + `partial_payments` conditional. B2/B3/B4 **✓ fixed** (same UI panel). |
| **Audit Report → Hold tab Collect Bill** | `BILL_PAYMENT` | **B1, B2, B3, B4 ✗** | Uses `CollectBillPanelDrawer` → same `CollectPaymentPanel` + same `collectBillExisting`. |
| **Transfer to Room** | `ORDER_SHIFTED_ROOM` | Unaffected | `transferToRoom` transform doesn't handle splits (room transfer is single-transaction). |
| **TAB / Credit** | `BILL_PAYMENT` | Unaffected by B1 (split not allowed with credit). B2/B3/B4 not applicable. | — |

### 3.2 Risk

| Bug | Money-correctness risk | UX risk | Backend-data risk |
|-----|------------------------|---------|---------------------|
| B1  | **HIGH** — split breakdown lost; backend records single-mode payment for full amount instead of multi-mode. Reconciliation, settlement, daily-sales reports all show wrong method-wise revenue. | Low (UI looks fine) | **HIGH** — reports built on `partial_payments` (Settlement, Insights) will be permanently wrong. |
| B2  | **HIGH** — collected amount ≠ due amount. | Medium (stale "Remaining" misleading) | High when settled — bill closes with under/over collection. |
| B3  | Low (no money impact; blocks legitimate flow) | **HIGH** — cashier forced to enter fake card last-4 to proceed. | Medium — backend gets junk `transaction_id` against a ₹0 row, polluting card-reconciliation. |
| B4  | **HIGH** — no guardrail at all. | Low (no error shown) | High (same as B2). |

### 3.3 Related historical fixes (sanity check before patching)
- **BUG-080** — "One row per enabled primary method" (L338–344). Sets up `splitPayments` initial state. No issue with current shape.
- **BUG-113** (POS 4.0) — "Free typing — no real-time capping, no auto-fill on keystroke" (L2637–2670). **Important**: any fix to B2 must NOT reintroduce real-time keystroke clamping; the BUG-113 contract is owner-locked at "clamp on blur only". Re-clamp on `effectiveTotal` change is allowed because it's a side-effect not a keystroke.
- **BUG-241** — Inline Card Txn ID for split (L2677). Original implementation; this is where B3 was introduced.
- **BUG-001 / BUG-002 / BUG-273** — auto-print bill rail. Unaffected — they read `paymentData.subtotal/tip/discounts` not `splitPayments`.
- **BUG-252** — TAB detection (`method === 'credit' || method.toLowerCase() === 'tab'`). Different concern; reaffirms that `method` field is method-of-record, not split-flag — supports the B1 fix Option C (drop the `method === 'partial'` gate).

---

## 4. IMPLEMENTATION PLAN

### 4.1 Fix proposals (owner to pick the option per bug)

#### B1 — Thread split payments into BILL_PAYMENT payload

Three options:

| Option | Change | Pros | Cons |
|--------|--------|------|------|
| **A** | In `CollectPaymentPanel.jsx`, when toggling Split ON (L2511), also `setPaymentMethod('partial')`. When toggling Split OFF, restore previous. | Single line, keeps transform contract `method === 'partial'`. | Couples UI state to API protocol semantics; "partial" leaks into multiple `paymentMethod === 'X'` branches in the UI (e.g. L403 `isTabPayment`, L963 cash branch, L2476 selection highlight, etc.) — risk of unintended toggles. |
| **B** | In `CollectPaymentPanel.handlePayment` (L987–1059), set `paymentData.method = showSplit ? 'partial' : paymentMethod`. | Localised; no UI side-effects. | Two sources of truth at runtime; need to remember to apply at the print-bill builder (`handlePrintBill`, L1075+) too if it ever consumes `method`. |
| **C ★ recommended** | In `orderTransform.js` `collectBillExisting` (L1436), change gate from `method === 'partial' && splitPayments?.length` to just `splitPayments?.length > 0` — mirroring `placeOrderWithPayment` (L1119). | Restores symmetry between Place+Pay and Collect Bill transforms. No UI churn. Backend still gets the same `partial_payments` array shape. | Need to confirm backend doesn't reject `payment_mode: 'cash'` + `partial_payments[...]` combo. (Hypothesis: backend will accept — placeOrderWithPayment already sends this exact shape.) |

Recommended: **Option C**. Add a top-of-payload-builder note pointing to this CR; preserve the existing `method` value as-is so backend's primary payment_mode field still reflects what the cashier saw highlighted.

#### B2 — Re-clamp split amounts on `effectiveTotal` change

Add a `useEffect` near L666 (next to the existing cash auto-seed effect):

```js
useEffect(() => {
  if (!showSplit) return;
  setSplitPayments(prev => {
    const total = prev.reduce((s, p) => s + (parseFloat(p.amount) || 0), 0);
    if (total <= effectiveTotal) return prev; // no over-collection — keep as-is
    // Proportional scale-down so ratios are preserved
    const factor = effectiveTotal / total;
    return prev.map(p => {
      const amt = parseFloat(p.amount) || 0;
      if (!amt) return p;
      return { ...p, amount: String(Math.round(amt * factor * 100) / 100) };
    });
  });
}, [effectiveTotal, showSplit]);
```

Open questions for owner:
- **Q2.1** Proportional scale-down vs zero-out-all vs reset-only-the-last-edited-row? Owner pick.
- **Q2.2** If `effectiveTotal` **rises** (e.g. cashier adds a tip), do we want to re-clamp (no-op, current sum still legal) or auto-distribute the increase? Owner pick (recommend no-op — let cashier explicitly re-allocate).
- **Q2.3** Coordinated with BUG-113: this effect runs on **bill change**, not on keystroke. Confirms BUG-113 contract is respected.

#### B3 — Gate Card Txn ID requirement on `amount > 0`

Two changes:

1. **Pay button rule** (L3060) — add amount-gate:
   ```js
   (showSplit && splitType === 'payment' && splitPayments.some(
     sp => sp.method === 'card'
        && parseFloat(sp.amount) > 0           // ← NEW guard
        && (!sp.transactionId || sp.transactionId.length !== 4)
   ))
   ```

2. **Input visual state** (L2696–2697 + L2701–2703) — only show red/error state when `parseFloat(sp.amount) > 0 && txnId.length !== 4`. Otherwise neutral.

Optional follow-up (owner decision): collapse the Card Txn ID input entirely when `amount === 0` (auto-hide). Recommend keeping it visible-but-neutral to preserve cashier discoverability.

#### B4 — Sum-must-cover-total Pay button check (new defect)

Add to the Pay button disabled expression (L3054–3062):

```js
(showSplit && splitType === 'payment' &&
  splitPayments.reduce((s, p) => s + (parseFloat(p.amount) || 0), 0) < effectiveTotal) ||
```

Open question for owner:
- **Q4.1** Strict `< effectiveTotal` (under-collection blocked, over-collection allowed) vs strict `!== effectiveTotal` (must match exactly)? Recommend strict `< effectiveTotal` (matches existing cash rule at L3058) so the cashier can intentionally over-collect; tally exact-match is a future restaurant-settings flag.

### 4.2 Execution order (lowest-risk first)
1. **B3** — pure validation guard; isolated; ship first as a quick win.
2. **B4** — additive Pay-button rule; complementary to B3.
3. **B2** — adds a `useEffect`; verify no infinite loops via `splitPayments` stability.
4. **B1** — touches the API transform; ship behind a `console.log` payload preview for the first 24 hours so we can verify backend acceptance before declaring done.

### 4.3 Files to edit (final list)
| File | Bug coverage | Type of edit |
|------|--------------|--------------|
| `components/order-entry/CollectPaymentPanel.jsx` | B2, B3, B4 | + useEffect (L~666), edit Pay button rule (L3054–3062), edit Card Txn ID input style (L2696–2703) |
| `api/transforms/orderTransform.js` | B1 (Option C) | Drop `method === 'partial' &&` from L1436 gate |

No backend changes required (backend already accepts the `partial_payments` shape on `BILL_PAYMENT` — confirmed by working `placeOrderWithPayment` flow using identical shape).

---

## 5. TESTING PLAN

### 5.1 Manual smoke (after fix)
- [ ] B1 — Place existing dine-in order. In Collect Bill, click Split, distribute Cash ₹50 + UPI ₹100 against a ₹150 bill. Click Pay. Verify network payload contains `partial_payments: [{payment_mode:'cash', payment_amount:50, ...}, {payment_mode:'upi', payment_amount:100, ...}, {payment_mode:'card', payment_amount:0, ...}]`.
- [ ] B1 regression — Repeat without Split (single cash). Verify payload still has `payment_mode:'cash'` at top level and **no** `partial_payments` (transform Option C `length > 0` guard).
- [ ] B2 — Type ₹100 + ₹100 split on a ₹200 bill. Apply a ₹50 discount. Verify split amounts re-clamp (proportional → ₹75 + ₹75) and "Remaining" reads ₹0.
- [ ] B2 — Same scenario, raise tip by ₹30. Verify split amounts stay (cashier re-allocates manually) and "Remaining" reads ₹30.
- [ ] B3 — Split with Cash ₹150 + Card ₹0 + UPI ₹0 on ₹150 bill. Verify Pay button is **enabled** without touching Card Txn ID and Card row is **not** red.
- [ ] B3 — Split with Cash ₹100 + Card ₹50. Verify Pay button is **disabled** until 4-digit Txn ID is entered for Card; Card row shows red until then.
- [ ] B4 — Split with Cash ₹50 + UPI ₹50 on ₹200 bill. Verify Pay button is **disabled**.
- [ ] B4 — Same with Cash ₹100 + UPI ₹100. Verify Pay button is **enabled**.

### 5.2 Regression
- [ ] Place+Pay prepaid (new dine-in/takeaway/delivery) — split flow still works as before (uses same transform path that was already correct).
- [ ] Audit Report → Hold tab → Collect Bill split — works (`CollectBillPanelDrawer` shares the same panel).
- [ ] BUG-113 unaffected — keystroke typing in split amount still NOT clamped real-time; only blur and `effectiveTotal`-change re-clamp.
- [ ] BUG-241 unaffected — Card Txn ID still required when Card has amount > 0.
- [ ] TAB / Credit flow (`isTabPayment`) unaffected — split is hidden for TAB.

### 5.3 Owner smoke (per CR-018 protocol)
- [ ] Live test on `preprod.mygenie.online` with a ₹150 bill split Cash ₹50 + UPI ₹100. Owner confirms backend Settlement view shows the split breakdown.

---

## 6. OWNER DECISION QUEUE — LOCKED 2026-06-10

All 5 decisions confirmed by owner via chat 2026-06-10. Implementation agent: **do NOT deviate** from any pick below without re-asking the owner.

| ID | Decision needed | Owner pick | Source |
|----|-----------------|------------|--------|
| **OD-021-1** | B1 fix style | **DROP** the `method === 'partial' &&` gate in `orderTransform.js` `collectBillExisting` (Option C). Keeps the UI untouched; symmetric with `placeOrderWithPayment` which already uses only `splitPayments?.length`. | chat 2026-06-10 |
| **OD-021-2** | B2 behaviour on `effectiveTotal` **drop** (bill goes down due to discount/etc.) | **CLEAR ALL** split amounts. Cashier re-enters from scratch on the new total. | chat 2026-06-10 |
| **OD-021-3** | B2 behaviour on `effectiveTotal` **rise** (bill goes up due to tip/SC/etc.) | **CLEAR ALL** split amounts (same as drop, for consistency). Cashier re-enters from scratch on the new total. | chat 2026-06-10 |
| **OD-021-4** | B4 Pay-button sum check strictness | **UNDER-ONLY** — block when `Σ amounts < effectiveTotal`. Allow `Σ ≥ effectiveTotal` (over-collection treated as cash change, parity with existing cash-row rule at L3058). | chat 2026-06-10 |
| **OD-021-5** | B3 Card Txn ID input visual when amount = 0 | **VISIBLE-NEUTRAL** — keep the input rendered; remove the red border / pink background / "4 digits" hint when `parseFloat(sp.amount) === 0`. Layout does not shift. | chat 2026-06-10 |

### 6.1 Locked behaviour summary (single source of truth for the implementer)

After all 4 patches land, the Collect Bill split-payment rail must behave as follows:

1. **Split toggle ON** → 1 row per enabled primary method (existing BUG-080 behaviour, unchanged). `paymentMethod` state is left alone (existing) — fix is in the transform, not the UI flag.
2. **Card row, amount = 0** → Txn ID input renders **neutral** (default grey border, white background). No "4 digits" hint. Pay button is NOT blocked by an empty Txn ID on that row.
3. **Card row, amount > 0** → Txn ID input renders red until 4 digits entered (existing BUG-241 behaviour, unchanged). Pay button blocked until 4 digits.
4. **Discount / service charge / tip / coupon / loyalty / wallet changes** → `effectiveTotal` changes → **all split amounts clear to empty** (both directions: drop and rise). The "Remaining" label naturally recomputes; cashier re-enters.
5. **Pay button** → disabled whenever `Σ splitPayments[].amount < effectiveTotal` (new B4 rule). Existing per-row Card Txn ID rule still applies but **only on rows with amount > 0** (new B3 amount-gate). Existing rules for non-split flows untouched.
6. **BILL_PAYMENT payload** → `partial_payments[]` is attached whenever `splitPayments?.length > 0`, regardless of `paymentData.method` (new B1 fix). Existing top-level `payment_mode` / `payment_amount` fields are left alone — backend continues to see the same shape that `placeOrderWithPayment` already sends.
7. **Place+Pay prepaid (PLACE_ORDER)** → **FIXED (2026-06-11)**. Two bugs found and patched:
   - `payment_method` was never set to `"partial"` when `splitPayments` exist → now mirrors `collectBillExisting` logic: `splitPayments?.length > 0 ? 'partial' : method`
   - `partial_payments` was always sent (even single payments, padded with 3 zero modes) → now conditional, only sent when `splitPayments?.length > 0`
   - **Verified:** Order 939700 (cafe103, prepaid) — payload correctly sends `payment_method: "partial"` + `partial_payments` array
8. **Transfer-to-Room, TAB/Credit, single-method flows** → unchanged.

### 6.2 Non-negotiables (regression guards)

- **BUG-113 (POS 4.0)** "no real-time keystroke clamping" stays intact. The new B2 clear-on-bill-change effect must fire on **`effectiveTotal` changing**, not on input keystrokes.
- **BUG-241** Card Txn ID 4-digit format stays intact when card amount > 0.
- **BUG-001 / BUG-002 / BUG-273** auto-print bill paths are untouched.
- No backend changes. Confirm via network tab that the existing `BILL_PAYMENT` endpoint accepts `partial_payments[]` (it already does — `placeOrderWithPayment` uses the same shape today).

---

## 7. ARTIFACT TRACKER

| # | Artifact | Status | Path |
|---|----------|--------|------|
| 1 | Intake | DONE | this file, §1 |
| 2 | Discovery | DONE | this file, §2 |
| 3 | Impact Analysis | DONE | this file, §3 |
| 4 | Implementation Plan | DONE | this file, §4 |
| 5 | Owner Decision Queue | **DONE (locked 2026-06-10)** | this file, §6 |
| 6 | Code Gate | DONE — all 4 bugs implemented |
| 7 | Implementation Summary | DONE — B1 had 2 fixes: (1) remove `method==='partial'` gate, (2) set `payment_mode:'partial'` when splitPayments present |
| 8 | QA Report | DONE — code-level verification passed (iteration_7) |
| 9 | Owner Smoke / Signoff | DONE — 2026-06-11 |

---

## 7A. LIVE EVIDENCE — Owner screenshots 2026-06-10

Two screenshots captured on `preprod.mygenie.online` during owner walkthrough confirm the B3 → B4 exploit chain on a real ₹462 bill:

**Screenshot 1 — B3 reproduction**
- State: Cash ₹100 + UPI ₹200 + Card row amount = empty + Card Txn ID = empty (red border) → Remaining: ₹162.00
- Pay button: **DISABLED** (faded green), labelled `Pay ₹462`
- Confirms: Card Txn ID validator fires even though Card row amount is ₹0. Cashier is blocked despite Card not being used.

**Screenshot 2 — B3 bypass → B4 trigger (worst-case exploit)**
- State: identical to #1 except Card Txn ID = `2222` (any 4 digits) → Remaining: ₹162.00
- Pay button: **ENABLED** (full green), labelled `Pay ₹462`
- Confirms: validator falls silent once `txnId.length === 4`, regardless of card amount. No `Σ amounts >= total` rule fires. The Remaining ₹162.00 label is displayed **directly above** the Pay button that claims ₹462 will be collected — UI is self-contradictory.

**Net effect when cashier presses Pay in Screenshot 2:**
1. Frontend POSTs `BILL_PAYMENT` with `payment_amount: 462`.
2. Per **B1**, `partial_payments[]` is dropped from the payload (transform L1436 `method === 'partial'` gate misses).
3. Backend records full ₹462 against the single top-level `payment_mode` (whatever `paymentMethod` was last set to, e.g. `'cash'`).
4. Cash drawer is short by ₹162; reconciliation looks clean on paper. **Silent money loss.**

This single trace exercises B1 + B3 + B4 simultaneously. B2 (stale-validation-on-bill-change) is independent and not exercised by these screenshots.

**QA reproduction recipe (post-fix verification):**
1. Engage any dine-in order with grand total ≥ ₹300.
2. Open Collect Bill → Split → By Payment.
3. Enter Cash ₹100 + UPI ₹200, leave Card empty.
4. Pre-fix: Pay button disabled; type `1234` in Card Txn ID; Pay button enables and reads full bill amount.
5. Post-fix expectation: Card Txn ID must be neutral (not red) when Card amount = 0; Pay button must remain disabled with a "Split sum (₹300) is less than total (₹462)" hint; entering any Txn ID must NOT unlock the button while Remaining > 0.

---

## 8. CROSS-REF
- Predecessor inline-tracked bugs in same rail: **BUG-001, BUG-002, BUG-080, BUG-113, BUG-240, BUG-241, BUG-252, BUG-273**.
- Sibling open CR (sprint pos_4_0): **CR-018 (Schedule Order)** — independent code path, can ship in parallel.
- API endpoint: `BILL_PAYMENT = /api/v2/vendoremployee/order/order-bill-payment` (`api/constants.js:62`).
