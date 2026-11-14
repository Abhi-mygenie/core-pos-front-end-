# QA Handover — BUG-659 — 2026-11-08

**From:** Implementation agent
**Date:** 2026-11-08
**Items:** BUG-659

---

## 1. Inherited from Plan — Verification Matrix Results

| V# | Edit | File | Change | Self-Test Result |
|----|------|------|--------|:---:|
| V1 | E1 | orderTransform.js L234-237 | `discountValue`, `discountType`, `roundUp` mapped in `fromAPI.order` | ✅ PASS (grep confirmed) |
| V2 | E1 | orderTransform.js L235 | `discountValue` is float 50 for "50.00" | ✅ PASS (unit test) |
| V3 | E1 | orderTransform.js L236 | `discountType` reads `api.discount_type || api.order_discount_type || null` | ✅ PASS (grep confirmed) |
| V4 | E1 | orderTransform.js L237 | `roundUp` is float 0.49 for "0.49" | ✅ PASS (unit test) |
| V5 | E2 | orderTransform.js L2174-2178 | `discount_percentage` IIFE: override-first, fallback `order.discountType === 'Percent' ? order.discountValue : 0` | ✅ PASS (unit test: override=50 → 50, no-override Percent → 50) |
| V6 | E2 | orderTransform.js L2176 | Flat discount (Amount) NOT emitted as `discount_percentage` | ✅ PASS (unit test: Amount/null → `{}`) |
| V7 | E2 | orderTransform.js L2179-2183 | `roundoff` IIFE: override-first, fallback `order.roundUp` | ✅ PASS (unit test: no-override roundUp=0.49 → 0.49) |
| V8 | E2 | orderTransform.js L2182 | `roundoff` omitted when `order.roundUp` is 0 or null | ✅ PASS (unit test: 0 → `{}`, null → `{}`) |
| V9 | — | webpack | 0 new warnings | ✅ PASS — `compiled with 1 warning` (pre-existing, not BUG-659) |
| V10 | — | collect-bill path | `hasFinancialOverrides=true` branch (L1909) untouched — override path unchanged | ✅ PASS (code review) |

V11 and V12 are browser-only tests — deferred to QA.

---

## 2. QA Test Cases

### TC1 — Report reprint: discounted order shows discount_percentage + roundoff (P6 path)

**Path:** AllOrdersReportPage or OrderReportBetaPage → Print Bill
**Data:** Any order with percentage discount (e.g. order 1537857, RID 675, 50% discount, roundoff 0.49)
**Steps:**
1. Login as owner/manager
2. Go to All Orders Report or Order Report Beta
3. Find order with discount (e.g. #001423)
4. Click Print Bill
5. Intercept POST `order-temp-store` in Network tab

**Expected:**
```json
{
  "discount_percentage": 50,
  "discount_amount": 119.05,
  "roundoff": 0.49
}
```
**Failure before fix:** `discount_percentage` absent, `roundoff` absent
**Pass criterion:** Both keys present with correct values

---

### TC2 — Report reprint: flat-discount order does NOT emit discount_percentage (guard check)

**Path:** AllOrdersReportPage → Print Bill on a flat-₹ discounted order
**Expected:** `discount_percentage` absent (not in payload)
**Pass criterion:** No `discount_percentage` key in payload

---

### TC3 — Report reprint: order without discount/roundoff — no regression

**Path:** AllOrdersReportPage → Print Bill on a standard order (no discount, no roundoff)
**Expected:** `discount_percentage` absent, `roundoff` absent (same as before fix)
**Pass criterion:** Payload unchanged from pre-fix behaviour

---

### TC4 — Collect-bill auto-print unchanged (working path regression)

**Path:** OrderEntry → Collect Bill with 50% discount → Pay
**Expected:** `discount_percentage: 50`, `roundoff: 0.50` (from live override, not stored order)
**Pass criterion:** Auto-print payload identical to pre-fix (override path not affected)

---

### TC5 — Dashboard reprint (P5 path — partial fix scope note)

**Path:** Dashboard OrderCard / TableCard / RePrintButton → Print Bill
**Expected (after E1+E2):** `discount_amount` correct. `discount_percentage` and `roundoff` still ABSENT (P5 uses employee-orders-list / socket data which lacks `discount_type`/`round_up`).
**Note:** P5 is NOT fixed by E1+E2. This is known. Option A (separate gate) needed. QA should confirm P5 behaviour is unchanged (not broken further).

---

## 3. Regression Tests

| # | What to verify | Why |
|---|----------------|-----|
| R1 | Auto-print payload (collect-bill) includes `discount_percentage` + `roundoff` with override values | CR-513 override path must remain intact |
| R2 | Manual reprint of zero-discount order: no extra keys emitted | Null fallback chain (R1/R2 from plan risk register) |
| R3 | Report page renders without crash for orders with/without discount | `order.discountType` safely null for old orders |

---

## 4. Registry Sync Confirmation

```
Registry synced: YES
Item: BUG-659 → GATE_5A_IMPLEMENTED
Sprint: nov_cr_batch
EXIT GATE: ALL 5 PASSED
  □ 1. registry.json: BUG-659 → GATE_5A_IMPLEMENTED ✅
  □ 2. BUG_TRACKER.md: row updated ✅
  □ 3. FILE_OWNERSHIP.md: orderTransform.js L234-237 + L2174-2183 added ✅
  □ 4. Code markers: 6 BUG-659 comments in both edit sites ✅
  □ 5. webpack: 0 new warnings ✅
```

---

## 5. Credentials + Environment

- Preprod URL: `https://preprod.mygenie.online/`
- Test order: #001423 (order_id 1537857), Restaurant Mantri (RID 675) — 50% discount, roundoff 0.49
- Test order 2: #000660 (order_id 1537880), Ruby ZAP (RID 672) — 50% discount, roundoff 0.70
- Evidence: `evidence/BUG-659/post_fix_verification_2026_11_07.json`

---

## 6. Scope boundary

**E1+E2 fixes:** P6a (AllOrdersReportPage), P6b (OrderReportBetaPage) — both call `get-single-order-new` before printing.
**NOT fixed by E1+E2:** P5a (RePrintButton), P5b (OrderCard), P5c (TableCard) — these use running-orders context from `employee-orders-list`/socket which lacks `discount_type`/`round_up`. Needs **Option A** (separate gate cycle, 3 files).
