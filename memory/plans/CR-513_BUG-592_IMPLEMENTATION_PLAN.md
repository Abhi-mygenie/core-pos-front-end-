# CR-513 + BUG-592 — Implementation Plan (Gate 3)

**Date:** 2026-11-06
**Role:** PLANNING (Role 2) — Stage: Implementation Plan. No code is written at this gate.
**Inputs:** `impact/CR-513_IMPACT_ANALYSIS.md` (Gate 2 closed; the decision box at the top is authoritative)
**Code Reality:** NONE (CR-513) · NONE (BUG-592 FE fix)
**Risk:** CRITICAL (printing + discount) · R5 hotspot files: 3 → **Gate 4 owner approval required** (Owner Approval Matrix)
**Sprint:** proposed `nov_cr_batch`
**API affected:** `POST /api/v1/vendoremployee/order-temp-store` only (additive keys). No other payload changes.

---

## 1. Scope Lock

**Files WILL change**
| File | R5 | Edits |
|---|:---:|---|
| `src/api/transforms/orderTransform.js` | YES | E1 (BUG-592, L234) · E2 (CR-513, builder return ~L2165) |
| `src/components/order-entry/CollectPaymentPanel.jsx` | YES | E3 (`handlePrintBill` overrides ~L1309) |
| `src/components/order-entry/OrderEntry.jsx` | YES | E4a-E4e (5 auto-print override objects) |
| `src/__tests__/api/transforms/orderTransform.cr513.test.js` | NEW | E5 unit tests |

**Files WILL NOT touch:** socket handlers, OrderContext, OrderCard / TableCard / RePrintButton, report pages, PMS files, `placeOrder` / `placeOrderWithPayment` / `updateOrder` / `collectBillExisting` builders, `roundOffUtils.js`, discount / tax / total computation anywhere.

**Out of scope (reference only):** dashboard and report reprints send no new keys (owner Q1) · PMS → follow-up CR · `get-single-order-new` gap → backend brief.

---

## 2. Conflict Check (re-verified 2026-11-06)
- BUG-592 is combined into this plan, so there is no conflict on L234 / L2165.
- CR-487 / CR-502 are SUBSUMED here.
- BUG-641 (GATE_5A, `buildBillPrintPayload` L1869 billFoodList) uses a different region and is parallel-safe. QA must re-run the BUG-641 comp-print check.
- BUG-639 / 646 / 647 touch different functions in `orderTransform.js`. Merge-order note only.

---

## 3. Contract (owner-locked)

| Key | Value | When omitted (key NOT sent) |
|---|---|---|
| `discount_percentage` | % of the single active discount: manual % if manual type is percent and value > 0, otherwise preset category % if > 0 | flat ₹ discount · coupon-only · no discount · any caller that does not pass `discountPercent` (all reprint paths) |
| `roundoff` | signed ₹, 2-dp (+ rounded up / − rounded down, CR-170) | value is 0 / undefined / not a number · reprint paths |

Only one discount can be active at a time (existing rule), so the values are never summed.

---

## 4. Exact Edits

### E1 — BUG-592: drop raw-% fallback · `orderTransform.js` L234
Current:
```js
      discount: parseFloat(api.restaurant_discount_amount || api.discount_value || 0) || 0,
```
New:
```js
      discount: parseFloat(api.restaurant_discount_amount || 0) || 0, // BUG-592: no discount_value fallback (raw % input, not ₹)
```
- Consumers of `order.discount` (code-traced): `buildBillPrintPayload` L1942 (collect-branch fallback) and L2165 only.
- Effect: when the backend ₹ amount is missing → 0 instead of the raw %. Backend now populates the ₹ amount (#021113 probe).
- The comment block L228-233 ("with `discount_value` as legacy fallback") is updated to one line: `// BUG-592: discount_value removed — it is the raw % / ₹ input, not the resolved ₹`.

### E2 — CR-513: emit keys · `orderTransform.js` `buildBillPrintPayload` return, immediately after L2165 `discount_amount: …,`
Insert:
```js
      // CR-513: additive print keys — omitted when not applicable (owner OD-513-05/10)
      ...(parseFloat(overrides.discountPercent) > 0 ? { discount_percentage: parseFloat(overrides.discountPercent) } : {}),
      ...(Number.isFinite(parseFloat(overrides.roundoff)) && parseFloat(overrides.roundoff) !== 0
          ? { roundoff: Math.round(parseFloat(overrides.roundoff) * 100) / 100 } : {}),
```
- Reads overrides only, never `order.*`, so reprint paths (no overrides) emit nothing. Matches owner Q1.
- Same conditional-spread pattern as the existing `delivery_charge_gst_amount` / `print_bill_customer_copy` (L2254-2256).

### E3 — CPP Print Bill · `CollectPaymentPanel.jsx` `handlePrintBill` overrides, after L1309 `discountAmount,`
Insert:
```js
        // CR-513: active discount % (one discount at a time) + signed round-off
        discountPercent: (discountType === 'percent' && parseFloat(discountValue) > 0)
          ? parseFloat(discountValue)
          : (selectedDiscountType?.discountPercent || 0),
        roundoff: roundOff,
```
- Sources: `discountType` / `discountValue` (L340-341), `selectedDiscountType` (L346), `roundOff` (L817). All are in scope.
- Flat manual: the first branch is false. If no preset → 0 → E2 omits. ✔

### E4a-E4e — OrderEntry auto-print sites (5) · `OrderEntry.jsx`
Same 2 lines inserted directly after each `discountAmount…` line:
```js
                  discountPercent: paymentData?.discounts?.orderDiscountPercent || paymentData?.discounts?.presetDiscountPercent || 0, // CR-513
                  roundoff:        paymentData?.roundOff, // CR-513
```
| Edit | Line (current) | Path |
|---|---|---|
| E4a | L1723 `discountAmount,` | P4a QSR Place&Pay (sync) |
| E4b | L1766 `discountAmount,` | P4b QSR Place&Pay (background, BUG-112) |
| E4c | L1843 `discountAmount,` | P4c QSR Pay auto-print |
| E4d | L2292 `discountAmount:      autoPrintDiscountAmount,` | P2 prepaid auto-print |
| E4e | L2578 `discountAmount:      collectBillDiscountAmount,` | P3 postpaid collect auto-print |

- Sources (CPP `paymentData`): `discounts.orderDiscountPercent` = manual % or 0 for flat (L1216) · `discounts.presetDiscountPercent` (L1217) · `roundOff` (L1196).
- Indentation follows each site. Line numbers will shift by +2 per earlier site. The implementation agent anchors on the line text, not the number.
- **P1 note:** the CPP Print Bill (E3) reaches OrderEntry `onPrintBill` (L2184-2207), which forwards `overrides` unchanged, so no OrderEntry edit is needed for P1.

### E5 — Unit tests (new) · `src/__tests__/api/transforms/orderTransform.cr513.test.js`
| # | Case | Expect |
|---|---|---|
| U1 | overrides `{orderItemTotal, discountPercent: 30, roundoff: 0.5}` | `discount_percentage === 30`, `roundoff === 0.5` |
| U2 | `roundoff: -0.04` | `roundoff === -0.04` (signed) |
| U3 | `discountPercent: 0` / undefined | key `discount_percentage` absent (`not.toHaveProperty`) |
| U4 | `roundoff: 0` / undefined | key `roundoff` absent |
| U5 | no overrides (reprint) | both keys absent; `discount_amount` unchanged vs today |
| U6 | `fromAPI.order({restaurant_discount_amount: 630, discount_value: '30.00'})` | `discount === 630` |
| U7 | `fromAPI.order({restaurant_discount_amount: 0, discount_value: '50'})` | `discount === 0` (BUG-592) |
| U8 | snapshot of key set: all pre-existing keys still present | no removed keys |

---

## 5. Verification Matrix (seeds the QA handover)

| Edit | File | Change | How to verify | Automated |
|---|---|---|---|:---:|
| E1 | orderTransform.js L234 | drop `discount_value` fallback | U6, U7 | YES |
| E2 | orderTransform.js ~L2166 | conditional keys | U1-U5, U8 | YES |
| E3 | CollectPaymentPanel.jsx | Print Bill passes % + roundoff | Browser: 30% manual discount → Print Bill → Network `order-temp-store` body has `discount_percentage: 30`, `roundoff` = UI round-off line | NO |
| E3 | 〃 | flat ₹ discount | Network: `discount_percentage` absent | NO |
| E3 | 〃 | preset category % | Network: `discount_percentage` = preset % | NO |
| E4d | OrderEntry.jsx | prepaid Place+Pay auto-print (autoBill ON) | Network body has both keys | NO |
| E4e | OrderEntry.jsx | postpaid Collect Bill auto-print | Network body has both keys | NO |
| E4a-c | OrderEntry.jsx | QSR auto-prints | Network body has both keys | NO |
| — | reprint (OrderCard / Audit) | no new keys | Network: both keys absent; `discount_amount` = ₹ value | NO |
| — | round-off 0 order | | Network: `roundoff` absent | NO |
| — | round-down order (paise < 10, e.g. ₹x.04) | | Network: `roundoff` negative | NO |
| — | regression | BUG-001/002/273/281/556/641 payloads | All prior keys and values identical except the 2 additive keys | NO |

Compile: webpack 0 new warnings. Unit run: `yarn craco test --watchAll=false --testPathPattern="cr513|cr029|orderTransform"`.

---

## 6. Risk Register

| # | Risk | Mitigation |
|---|---|---|
| R1 | 3 R5 files | Edits are additive lines only. No existing line changes except E1. |
| R2 | E1 changes the reprint `discount_amount` when the backend ₹ amount is missing (was raw %, now 0) | Intended (BUG-592). Backend populates the ₹ amount (verified). |
| R3 | Printer Agent template ignores the new keys | Harmless; bill unchanged |
| R4 | Line drift in OrderEntry (other CRs) | Entry verification by text anchor (Role 3 Step 0) |
| R5 | `paymentData.roundOff` is food-only for room orders | Room orders skip auto-print (AD-302A). P1 room Print Bill sends food round-off; rendering is the Printer Agent team's call. |

## 7. Execution Sequence
1. E1 + E2 (`orderTransform.js`) → E5 tests → run tests.
2. E3 (CPP).
3. E4a-E4e (OrderEntry).
4. Compile check → browser Network checks (§5) → EXIT GATE.

## 8. Post-Code Registry Checklist (Implementation agent MUST run)
- [ ] `registry.json`: CR-513 and BUG-592 → status `GATE_5A_IMPLEMENTED`, `sprint_key: nov_cr_batch`
- [ ] `CR_REGISTRY.md` (CR-513 row) + `BUG_TRACKER.md` (BUG-592 row) updated
- [ ] `FILE_OWNERSHIP.md`: add `orderTransform.js` (E1, E2), `CollectPaymentPanel.jsx` (E3), `OrderEntry.jsx` (E4a-e), new test file — with CR-513 / BUG-592 and the date
- [ ] Code markers: `// CR-513` in every edited site; `// BUG-592` at E1
- [ ] QA handover `handover/QA_HANDOVER_CR513_BUG592_<DATE>.md` inheriting §5

## 9. Owner Decisions
None open. All locked at Gate 2.

## Next
**Gate 4 GO** (owner) → IMPLEMENTATION (Role 3).

---

## Re-verification Addendum (2026-11-07, branch 7nov-1)

### Entry Verification — All 5 edits confirmed by text anchor

| Edit | Planned anchor | Found at | Status |
|------|---------------|----------|--------|
| E1 | `discount: parseFloat(api.restaurant_discount_amount \|\| api.discount_value \|\| 0) \|\| 0,` | L234 ✅ exact match | NOT IMPLEMENTED — ready |
| E2 | `discount_amount: overrides.discountAmount !== undefined ? …` | L2170 ✅ exact match | NOT IMPLEMENTED — ready |
| E3 | `discountAmount,` in CPP handlePrintBill overrides | L1328 ✅ exact match | NOT IMPLEMENTED — ready |
| E4a | `discountAmount,` QSR Place&Pay sync | L1736 ✅ | NOT IMPLEMENTED — ready |
| E4b | `discountAmount,` QSR Place&Pay background | L1779 ✅ | NOT IMPLEMENTED — ready |
| E4c | `discountAmount,` QSR Pay auto-print | L1856 ✅ | NOT IMPLEMENTED — ready |
| E4d | `discountAmount: autoPrintDiscountAmount,` prepaid auto | L2305 ✅ | NOT IMPLEMENTED — ready |
| E4e | `discountAmount: collectBillDiscountAmount,` postpaid auto | L2591 ✅ | NOT IMPLEMENTED — ready |
| E5 | New test file | Does not exist ✅ | Ready to create |

### Source Fields Verified

| Field | Location | Confirmed |
|-------|----------|:---------:|
| `discountType` | CPP L340 | ✅ |
| `discountValue` | CPP L341 | ✅ |
| `selectedDiscountType.discountPercent` | CPP L346 + L386 | ✅ |
| `roundOff` | CPP L822 | ✅ |
| `paymentData.discounts.orderDiscountPercent` | CPP L1235 | ✅ |
| `paymentData.discounts.presetDiscountPercent` | CPP L1236 | ✅ |
| `paymentData.roundOff` | CPP L1215 | ✅ |
| `onPrintBill` forwards overrides unchanged | OrderEntry L2197 | ✅ |

### Conflict Check

| File | Last modifier on this branch | Conflict? |
|------|------------------------------|:---------:|
| `orderTransform.js` | CR-483 (2026-11-07, L313 + L1661 + L1097) — different regions | NO |
| `CollectPaymentPanel.jsx` | CR-483 (2026-11-07, L469/854/1211/3433) — different regions | NO |
| `OrderEntry.jsx` | CR-482 (keyboard nav), BUG-462/464 (menu type) — different regions | NO |

No conflicts. CR-483 edits are in payment payload + Received Amount UI areas. CR-513 edits are in print payload + discount source areas. Parallel-safe.

### Marker Check
- `// CR-513` — 0 hits in codebase. Safe to use. ✅
- `// BUG-592` — 0 hits in codebase. Safe to use. ✅

### Print Paths Confirmed (6)
| Path | Location | Override site | Confirmed |
|------|----------|---------------|:---------:|
| P1 CPP Print Bill | CPP L1308→L1354→OrderEntry L2197 | E3 (CPP L1328) | ✅ |
| P2 Prepaid auto-print | OrderEntry L2305 | E4d | ✅ |
| P3 Postpaid collect auto-print | OrderEntry L2591 | E4e | ✅ |
| P4a QSR Place&Pay sync | OrderEntry L1736 | E4a | ✅ |
| P4b QSR Place&Pay background | OrderEntry L1779 | E4b | ✅ |
| P4c QSR Pay auto-print | OrderEntry L1856 | E4c | ✅ |

### No new print paths found on this branch.

### Backend Re-probe
Skipped — same preprod backend, same APIs. Evidence from original branch (2026-11-06) is valid. Probes saved in `evidence/CR-513/`.

### Updated Verification Matrix

Same as original plan §5. No changes needed — all anchors match.

### Conflicts & Open Questions
**None.** All locked decisions hold. No code partly implemented. No R5 conflicts.

### Status
**PLAN FINALIZED.** Ready for Gate 4 GO.

