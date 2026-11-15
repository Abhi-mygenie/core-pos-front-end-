# CR-412 — Implementation Plan (Gate 3)

**Date:** 2026-10-12
**Role:** PLANNING (Gate 3 — Implementation Plan only)
**Item:** CR-412 — Loyalty Pre-tick when `loyalty_info.redeemed = true` (Scan & Order)
**Risk:** CRITICAL
**Sprint:** oct_cr_batch
**Gate 2 IA:** `impact/CR-412_IMPACT_ANALYSIS.md`

---

## Entry Verification (MANDATORY — run before touching any code)

Run each command. If output does not match exactly → **STOP. Return to Planning agent.**

### Anchor A — `orderTransform.js` L453 (insert after)
```bash
sed -n '453,455p' /app/frontend/src/api/transforms/orderTransform.js
```
**Expected:**
```
      couponType:     api.coupon_type     || 'order',

      // Raw orderDetails preserved for bill printing (order-temp-store API)
```

### Anchor B — `CollectPaymentPanel.jsx` L77–78 (insert between)
```bash
sed -n '77,78p' /app/frontend/src/components/order-entry/CollectPaymentPanel.jsx
```
**Expected:**
```
  allowedMethods,
}) => {
```

### Anchor C — `CollectPaymentPanel.jsx` L332–334 (insert between)
```bash
sed -n '332,334p' /app/frontend/src/components/order-entry/CollectPaymentPanel.jsx
```
**Expected:**
```
  // CR-413: initialCoupon mount useEffect removed — cashier always chooses coupon (OD-INV-01=A)

  // BUG-276: Service charge toggle — default ON, staff can uncheck per order
```

### Anchor D — `OrderEntry.jsx` L1935–1936 (insert between)
```bash
sed -n '1935,1936p' /app/frontend/src/components/order-entry/OrderEntry.jsx
```
**Expected:**
```
              // CR-413: initialCoupon prop removed — cashier always chooses coupon (OD-INV-01=A)
              // BUG-004 (QA, Apr 2026): expose Split Bill trigger from the Collect
```

### Anchor E — `CollectPaymentPanel.jsx` useLoyalty (must NOT change)
```bash
grep -n "const \[useLoyalty" /app/frontend/src/components/order-entry/CollectPaymentPanel.jsx
```
**Expected:** `308:  const [useLoyalty, setUseLoyalty] = useState(false);`
This line is **NOT modified** by this plan.

**Anchor verification confirmed at plan-write time (2026-10-12, same session):** ✅ A · ✅ B · ✅ C · ✅ D · ✅ E

---

## Scope Lock

**Files WILL change:**
- `src/api/transforms/orderTransform.js` — E-CR412-1 (after L453)
- `src/components/order-entry/CollectPaymentPanel.jsx` — E-CR412-2a (after L77) + E-CR412-2b (after L332)
- `src/components/order-entry/OrderEntry.jsx` — E-CR412-3 (after L1935)

**Files WILL NOT touch:**
- `src/api/services/socketHandlers.js` — OD-GAP3=B: backend fix, no FE socket change
- `DashboardPage.jsx` (R5)
- `CartPanel.jsx` (R5)
- Any service / context / other transform
- `orderTransform.cr409.test.js` — kept, tests unrelated E-1 coupon fields

**If scope expands beyond 3 files → STOP. Re-declare. Get owner confirmation.**

---

## Edits

### E-CR412-1 — `orderTransform.js`: add `loyaltyRedeemed` to `fromAPI.order`

| Field | Value |
|-------|-------|
| File | `src/api/transforms/orderTransform.js` |
| Position | After L453 — inside the coupon fields block |
| Net delta | +1 line |

**Before (L453–455):**
```javascript
      couponType:     api.coupon_type     || 'order',

      // Raw orderDetails preserved for bill printing (order-temp-store API)
```

**After:**
```javascript
      couponType:     api.coupon_type     || 'order',
      loyaltyRedeemed: api.loyalty_info?.redeemed === true, // CR-412: pre-tick loyalty when scan & order redeemed (OD-INV-02=B)

      // Raw orderDetails preserved for bill printing (order-temp-store API)
```

**Why `=== true`:** Guards against truthy non-boolean values (`1`, `"true"`). Only boolean `true` pre-ticks.
**Why optional chain `?.`:** `loyalty_info` is absent from `get-single-order-new` API and from socket payload until backend ships OD-GAP3. Optional chain prevents crash; evaluates to `false` when absent.
**Socket path:** Once backend ships `loyalty_info` in `update-order` socket, `handleOrderDataEvent` calls `fromAPI.order(socketPayload)` → `loyaltyRedeemed` computed automatically. Zero further changes needed.

**`search_replace` old_str:**
```
      couponType:     api.coupon_type     || 'order',

      // Raw orderDetails preserved for bill printing (order-temp-store API)
```
**`search_replace` new_str:**
```
      couponType:     api.coupon_type     || 'order',
      loyaltyRedeemed: api.loyalty_info?.redeemed === true, // CR-412: pre-tick loyalty when scan & order redeemed (OD-INV-02=B)

      // Raw orderDetails preserved for bill printing (order-temp-store API)
```

---

### E-CR412-2a — `CollectPaymentPanel.jsx`: add `initialLoyalty` prop

| Field | Value |
|-------|-------|
| File | `src/components/order-entry/CollectPaymentPanel.jsx` |
| Position | After L77 (`allowedMethods,`), before `}) => {` |
| Net delta | +2 lines (comment + prop) |

**Before (L77–78):**
```jsx
  allowedMethods,
}) => {
```

**After:**
```jsx
  allowedMethods,
  // CR-412: pre-ticked loyalty from scan & order. Null for regular POS orders → no-op.
  initialLoyalty = null,
}) => {
```

**Why default `null`:** Keeps existing callers (dashboard, CartPanel, FolioCheckoutPanel) passing no `initialLoyalty` — all receive `null` → mount effect is a no-op → zero regression.

**`search_replace` old_str:**
```
  allowedMethods,
}) => {
```
**`search_replace` new_str:**
```
  allowedMethods,
  // CR-412: pre-ticked loyalty from scan & order. Null for regular POS orders → no-op.
  initialLoyalty = null,
}) => {
```

---

### E-CR412-2b — `CollectPaymentPanel.jsx`: add mount `useEffect`

| Field | Value |
|-------|-------|
| File | `src/components/order-entry/CollectPaymentPanel.jsx` |
| Position | Between L332 (CR-413 marker) and existing blank line before BUG-276 |
| Net delta | +7 lines |

**Before (L332–334):**
```jsx
  // CR-413: initialCoupon mount useEffect removed — cashier always chooses coupon (OD-INV-01=A)

  // BUG-276: Service charge toggle — default ON, staff can uncheck per order
```

**After:**
```jsx
  // CR-413: initialCoupon mount useEffect removed — cashier always chooses coupon (OD-INV-01=A)

  // CR-412: seed useLoyalty from scan & order pre-tick on mount.
  // Fires once at panel open. initialLoyalty = null for regular POS orders → no-op.
  // OD-INV-02=B: pre-tick when redeemed=true regardless of redeemed_amount.
  useEffect(() => {
    if (initialLoyalty?.redeemed === true) setUseLoyalty(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // mount-only — initialLoyalty is frozen at panel open

  // BUG-276: Service charge toggle — default ON, staff can uncheck per order
```

**Why mount-only (`[]`):** `initialLoyalty` is a stable prop set once at panel open. Re-running on every render would interfere with cashier manually un-ticking loyalty mid-session. Mount-only is the correct pattern.
**Why not change `useState(false)` directly:** Mount effect is more explicit, auditable, and easier to revert. Keeps the `useLoyalty` state declaration unchanged at L308 (no risk of accidentally breaking the downstream `loyaltyDiscount` / `maxRedeemable` chain).

**`search_replace` old_str:**
```
  // CR-413: initialCoupon mount useEffect removed — cashier always chooses coupon (OD-INV-01=A)

  // BUG-276: Service charge toggle — default ON, staff can uncheck per order
```
**`search_replace` new_str:**
```
  // CR-413: initialCoupon mount useEffect removed — cashier always chooses coupon (OD-INV-01=A)

  // CR-412: seed useLoyalty from scan & order pre-tick on mount.
  // Fires once at panel open. initialLoyalty = null for regular POS orders → no-op.
  // OD-INV-02=B: pre-tick when redeemed=true regardless of redeemed_amount.
  useEffect(() => {
    if (initialLoyalty?.redeemed === true) setUseLoyalty(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // mount-only — initialLoyalty is frozen at panel open

  // BUG-276: Service charge toggle — default ON, staff can uncheck per order
```

---

### E-CR412-3 — `OrderEntry.jsx`: pass `initialLoyalty` prop to CPP

| Field | Value |
|-------|-------|
| File | `src/components/order-entry/OrderEntry.jsx` |
| Position | After L1935 (CR-413 marker), before `// BUG-004` |
| Net delta | +4 lines |

**Before (L1935–1936):**
```jsx
              // CR-413: initialCoupon prop removed — cashier always chooses coupon (OD-INV-01=A)
              // BUG-004 (QA, Apr 2026): expose Split Bill trigger from the Collect
```

**After:**
```jsx
              // CR-413: initialCoupon prop removed — cashier always chooses coupon (OD-INV-01=A)
              // CR-412: pre-tick loyalty from scan & order when redeemed=true (OD-INV-02=B).
              initialLoyalty={
                orderData?.loyaltyRedeemed ? { redeemed: true } : null
              }
              // BUG-004 (QA, Apr 2026): expose Split Bill trigger from the Collect
```

**Why `{ redeemed: true }` object:** Extensible shape (future: add `amount` field without changing CPP prop type). CPP checks `initialLoyalty?.redeemed === true` — consistent.
**Why `orderData?.loyaltyRedeemed`:** `loyaltyRedeemed` is `false` (not `undefined`) for non-scan orders after E-CR412-1 (`=== true` evaluates to `false`). So `? ... : null` always gives `null` for regular POS orders — prop resolves to `null` → mount effect no-op.

**`search_replace` old_str:**
```
              // CR-413: initialCoupon prop removed — cashier always chooses coupon (OD-INV-01=A)
              // BUG-004 (QA, Apr 2026): expose Split Bill trigger from the Collect
```
**`search_replace` new_str:**
```
              // CR-413: initialCoupon prop removed — cashier always chooses coupon (OD-INV-01=A)
              // CR-412: pre-tick loyalty from scan & order when redeemed=true (OD-INV-02=B).
              initialLoyalty={
                orderData?.loyaltyRedeemed ? { redeemed: true } : null
              }
              // BUG-004 (QA, Apr 2026): expose Split Bill trigger from the Collect
```

---

## Execution Sequence

```
1. Run Entry Verification (Anchors A–E) — abort on ANY mismatch
2. Apply E-CR412-1  (orderTransform.js — after L453)
3. Apply E-CR412-2a (CPP — after L77)
4. Apply E-CR412-2b (CPP — after L332)     ← E-CR412-2a and 2b are in the same file,
                                               non-overlapping ranges — both can be
                                               issued in a single parallel tool-call block
5. Apply E-CR412-3  (OrderEntry — after L1935)
   → All 4 search_replace calls can be issued in ONE parallel tool-call block
6. Wait for hot-reload compile: "webpack compiled"
7. Run Self-Verification V4–V7 (automated grep + unit test)
8. Run EXIT GATE (5 checkboxes)
9. Write QA Handover
10. Write Session Handover
```

**Parallel execution:** E-CR412-1, E-CR412-2a, E-CR412-2b, E-CR412-3 are all independent (different files or non-overlapping line ranges). Issue all four `search_replace` calls in one parallel block.

---

## Verification Matrix (Step 4 — seeds QA handover)

| # | Edit | What to verify | Method | Automated? |
|---|------|---------------|--------|:---:|
| V1 | E-CR412-1 | Scan & order with `redeemed=true, amount=7` → CPP opens with loyalty pre-ticked | Browser: open scan & order (RID 69, order with `loyalty_info.redeemed=true`) → CPP → loyalty ✅ | NO |
| V2 | E-CR412-1/2 | Scan & order with `redeemed=true, amount=0` → still pre-ticked (OD-INV-02=B) | Browser: same flow, zero amount → loyalty ✅ | NO |
| V3 | All | Regular POS dine-in → loyalty NOT pre-ticked | Browser: regular order → CPP → loyalty ☐ unchanged | NO |
| V4 | E-CR412-1 | `loyaltyRedeemed` field in orderTransform | `grep -n "loyaltyRedeemed" orderTransform.js` → 1 hit | YES |
| V5 | E-CR412-2a | `initialLoyalty` prop in CPP | `grep -n "initialLoyalty" CollectPaymentPanel.jsx` → 2 hits (prop + useEffect) | YES |
| V6 | E-CR412-3 | `initialLoyalty` prop pass in OE | `grep -n "initialLoyalty" OrderEntry.jsx` → 1 hit | YES |
| V7 | None | `orderTransform.cr409.test.js` 4/4 still passes | `npx craco test --watchAll=false --testPathPattern=orderTransform.cr409` | YES |
| V8 | All | webpack 0 new warnings | `yarn build` exit 0 | YES |
| V9 | E-CR412-2b | Cashier can manually un-tick loyalty after pre-tick | Browser: pre-ticked → click loyalty checkbox → unchecks cleanly | NO |

---

## Risk Register

| Risk | Likelihood | Mitigation |
|------|-----------|-----------|
| `useLoyalty = true` on mount triggers loyalty discount for non-scan orders | NONE | `initialLoyalty = null` default → useEffect guard `=== true` → no-op for all non-scan callers |
| `loyalty_info` absent from `get-single-order-new` crashes transform | NONE | Optional chain `api.loyalty_info?.redeemed` → `undefined === true` → `false` |
| Socket wipes `loyaltyRedeemed` after order edit | LOW (known, accepted) | OD-GAP3=B: backend to ship `loyalty_info` in socket. Documented in plan. Net improvement over current (pre-tick works on load) |
| `useEffect` import becomes duplicated | NONE | `useEffect` is already imported in CPP (used by many other effects) |
| Cashier pre-tick interferes with manual un-tick | NONE | Mount-only `[]` effect runs once. After mount, `useLoyalty` is pure state controlled by cashier toggle |
| BUG-538 (same files) conflicts | LOW | BUG-538 targets OE L334 + CPP discount section — far from CR-412 targets. Sequential execution (CR-412 first) eliminates any overlap risk |

---

## Post-Code Registry Checklist (Step 5 — EXIT GATE prerequisite)

```
□ 1. REGISTRY SYNC
     python3 -c "
     import json
     with open('/app/memory/control/registry.json') as f:
         d = json.load(f)
     items = {i['id']: i for i in d['items']}
     assert 'CR-412' in items
     assert 'IMPLEMENTED' in items['CR-412'].get('status','').upper()
     assert items['CR-412'].get('sprint_key') == 'oct_cr_batch'
     print('CR-412 registry PASS —', items['CR-412']['status'])
     "

□ 2. CR_REGISTRY.md
     CR-412 row → GATE_5A_IMPLEMENTED with edits listed

□ 3. FILE_OWNERSHIP.md
     Add section:
       ## FILE_OWNERSHIP — CR-412 IMPL (2026-10-12)
       | orderTransform.js          | E-CR412-1: +loyaltyRedeemed after L453 |
       | CollectPaymentPanel.jsx    | E-CR412-2a: +initialLoyalty prop after L77 |
       |                            | E-CR412-2b: +mount useEffect after L332 |
       | OrderEntry.jsx             | E-CR412-3: +initialLoyalty prop pass after L1935 |
       NOT touched: socketHandlers.js · DashboardPage.jsx (R5) · CartPanel.jsx (R5)

□ 4. CODE MARKERS
     All added lines carry // CR-412 comment.
     Verify:
       grep -c "CR-412" orderTransform.js             → ≥ 1
       grep -c "CR-412" CollectPaymentPanel.jsx        → ≥ 2
       grep -c "CR-412" OrderEntry.jsx                 → ≥ 1

□ 5. COMPILE + UNIT TEST
     yarn build → exit 0, 0 new warnings
     npx craco test --watchAll=false --testPathPattern=orderTransform.cr409 → 4/4 PASS
```

**Do NOT write SESSION_HANDOVER or QA handover until all 5 pass.**

---

## QA Handover Template (pre-filled)

```markdown
## QA Handover — CR-412

### 1. Inherited Verification Matrix
| Edit | File | What | Self-Test |
|------|------|------|-----------|
| E-CR412-1 | orderTransform.js L454 | loyaltyRedeemed field | V4 grep PASS |
| E-CR412-2a | CollectPaymentPanel.jsx ~L78 | initialLoyalty prop | V5 grep PASS |
| E-CR412-2b | CollectPaymentPanel.jsx ~L334 | mount useEffect | V5 grep PASS |
| E-CR412-3 | OrderEntry.jsx ~L1936 | initialLoyalty prop pass | V6 grep PASS |

### 2. Test cases
| # | Test | Steps | Expected |
|---|------|-------|---------|
| TC-1 | Scan & order redeemed=true → pre-ticked | Open scan & order with loyalty redeemed → CPP | Loyalty checkbox: ✅ pre-ticked |
| TC-2 | Scan & order redeemed=true, amount=0 → still pre-ticked | Same, zero amount order | Loyalty checkbox: ✅ (OD-INV-02=B) |
| TC-3 | Regular POS → NOT pre-ticked | Open regular dine-in → CPP | Loyalty checkbox: ☐ (unchanged) |
| TC-4 | Cashier can un-tick after pre-tick | Pre-ticked → click loyalty → un-tick | Loyalty unchecks, discount removed |

### 3. Regression cases
| # | Test | Why |
|---|------|-----|
| R1 | CR-413: CPP still opens with empty coupon field | CR-412 must not re-introduce any coupon pre-load |
| R2 | Regular settle — full payment flow | No regression on CPP core payment flow |
| R3 | orderTransform.cr409.test 4/4 | Confirms coupon E-1 fields untouched |

### 4. Known limitation
Socket path (order edited mid-session) may reset pre-tick until backend ships loyalty_info
in update-order socket (OD-GAP3=B). This is a known gap — document as NOTE, not FAIL.

### 5. Registry Sync
Registry synced: [ ] YES — EXIT GATE: [ ] 5/5 PASS

### 6. Credentials
- Owner: owner@thegoankitchen.com / Qplazm@10 (RID 69)
- Preview: https://genie-core-pos.preview.emergentagent.com
- Backend: https://preprod.mygenie.online
```

---

## Summary

| Field | Value |
|-------|-------|
| Edits | 4 (E-CR412-1 · E-CR412-2a · E-CR412-2b · E-CR412-3) |
| Files | 3 (orderTransform.js · CollectPaymentPanel.jsx · OrderEntry.jsx) |
| Lines added | ~10 (+1 OT · +2 CPP prop · +7 CPP useEffect · +4 OE) |
| Lines deleted | 0 |
| Risk | CRITICAL |
| Owner decisions | NONE — all locked |
| Planning-skip | NOT eligible (R5 + CRITICAL) |
| Socket path | Partial — LIST API works now; socket heals when backend ships OD-GAP3 |
| Awaiting | Gate 4 GO |
