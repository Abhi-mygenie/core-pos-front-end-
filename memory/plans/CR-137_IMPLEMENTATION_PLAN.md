# CR-137 — Implementation Plan: Optional `discount_for` Field
**Gate:** 3 — Implementation Plan
**Date:** 2026-08-12
**Agent:** Planning (Gate 3 — Implementation Plan only)
**Depends on:** Impact Analysis at `/app/memory/impact/CR-137_IMPACT_ANALYSIS.md`
**Awaiting:** Gate 4 GO from owner before any coding

---

## Line Verification (done at plan time — re-verify before coding)

| File | Expected line | Verified content |
|---|---|---|
| `orderTransform.js` L1065 | `self_discount: 0,` Flow 1 | ✅ confirmed |
| `orderTransform.js` L1188 | `self_discount: 0,` Flow 2 | ✅ confirmed |
| `orderTransform.js` L1366 | `self_discount: (discounts.manual \|\| 0)...` Flow 3 (2nd occurrence) | ✅ confirmed |
| `orderTransform.js` L1641 | `self_discount: (discounts.manual \|\| 0)...` Flow 4 | ✅ confirmed |
| `CollectPaymentPanel.jsx` L304-305 | `discountType` + `discountValue` useState | ✅ confirmed |
| `CollectPaymentPanel.jsx` L1113 | `walletBalance: walletDiscount,` | ✅ confirmed |
| `CollectPaymentPanel.jsx` L1306-1308 | "None" clear handler (3 setters) | ✅ confirmed |
| `CollectPaymentPanel.jsx` L1360-1365 | Main drawer `-₹` display + discount-section close | ✅ confirmed |
| `CollectPaymentPanel.jsx` L1981-1985 | Inline (Room Service) `-₹{manualDiscount}` display | ✅ confirmed |
| `CartPanel.jsx` L486-519 | `discounts: {` block in `handleCollectBill` | ✅ confirmed |
| `orderLedgerService.js` L85 | `discountFor: o.discountAmount > 0 ? 'Customer' : ''` | ✅ confirmed |

> ⚠ BUG-304 and BUG-305 modified `orderTransform.js`, `CollectPaymentPanel.jsx`, and `CartPanel.jsx` on 2026-08-11 (yesterday). Line numbers above are verified against the **current post-BUG-304/305 code**. Re-grep before coding anyway.

---

## Scope Lock

**Files WILL change (7 edits across 4 files):**
- `src/api/transforms/orderTransform.js` — E1, E2, E3, E4
- `src/components/order-entry/CollectPaymentPanel.jsx` — E5a, E5b, E5c, E5d1, E5d2
- `src/components/order-entry/CartPanel.jsx` — E6
- `src/api/services/orderLedgerService.js` — E7

**Files WILL NOT touch:**
`OrderEntry.jsx`, `AppProviders.jsx`, `reportTransform.js`, `reportService.js`,
`couponService.js`, `loyaltyTransform.js`, `SplitBillModal.jsx`, `CollectBillPanelDrawer.jsx`,
any report page, any context file, any test file.

---

## Edit-by-Edit Plan (exact `search_replace` instructions)

---

### E1 — `orderTransform.js` · Flow 1 `placeOrder` · +1 line after L1065

**What:** Add `discount_for: null` after `self_discount: 0,` in the placeOrder discount block.

**search_replace `old_str`:**
```
      // Discount
      discount_type:              null,
      self_discount:              0,
      // BUG-108 V1B (2026-05-25, E-11): coupon_code parity field — Flow 1 never
```

**search_replace `new_str`:**
```
      // Discount
      discount_type:              null,
      self_discount:              0,
      discount_for:               null,                   // CR-137: always null on placement — no discount applied pre-payment
      // BUG-108 V1B (2026-05-25, E-11): coupon_code parity field — Flow 1 never
```

**Self-test:** `grep -n "discount_for" orderTransform.js` → count increases by 1.

---

### E2 — `orderTransform.js` · Flow 2 `updateOrder` · +1 line after L1188

**What:** Same parity addition for the updateOrder discount block.

**search_replace `old_str`:**
```
      // Discount
      discount_type:              null,
      self_discount:              0,
      // BUG-108 V1B (2026-05-25, E-12): coupon_code parity field — Flow 2 never
```

**search_replace `new_str`:**
```
      // Discount
      discount_type:              null,
      self_discount:              0,
      discount_for:               null,                   // CR-137: always null on update — owner OQ-1 confirmed
      // BUG-108 V1B (2026-05-25, E-12): coupon_code parity field — Flow 2 never
```

**Self-test:** `grep -n "discount_for" orderTransform.js` → count increases by 1 more (now 2 total).

---

### E3 — `orderTransform.js` · Flow 3 `placeOrderWithPayment` · +1 line after L1366

**What:** Add `discount_for` reading from `discounts.discountFor` (threaded from CollectPaymentPanel).
Note: Flow 3 has **two** `self_discount` lines (L1356 + L1366 — V1 closure duplicate). Insert after the **second** one (L1366), which is the active field.

**search_replace `old_str`:**
```
      // BUG-108 V1B (2026-05-25, E-13/E-14): Flow 3 coupon fields.
      // V1 closure (2026-05-25): couponLive ternaries removed — fields unconditional.
      self_discount:              (discounts.manual || 0) + (discounts.preset || 0),
      coupon_code:                discounts.couponCode || '',
```

**search_replace `new_str`:**
```
      // BUG-108 V1B (2026-05-25, E-13/E-14): Flow 3 coupon fields.
      // V1 closure (2026-05-25): couponLive ternaries removed — fields unconditional.
      self_discount:              (discounts.manual || 0) + (discounts.preset || 0),
      discount_for:               discounts.discountFor || null,  // CR-137
      coupon_code:                discounts.couponCode || '',
```

**Self-test:** `grep -n "discount_for" orderTransform.js` → 3 total hits.

---

### E4 — `orderTransform.js` · Flow 4 `collectBillExisting` · +1 line after L1641

**What:** Same as E3 — read from `discounts.discountFor`.

**search_replace `old_str`:**
```
      // BUG-138: self_discount = manual + preset only (old POS parity). Coupon/loyalty/wallet have own fields.
      self_discount:                (discounts.manual || 0) + (discounts.preset || 0),
      coupon_code:                  discounts.couponCode || '',
```

**search_replace `new_str`:**
```
      // BUG-138: self_discount = manual + preset only (old POS parity). Coupon/loyalty/wallet have own fields.
      self_discount:                (discounts.manual || 0) + (discounts.preset || 0),
      discount_for:                 discounts.discountFor || null,  // CR-137
      coupon_code:                  discounts.couponCode || '',
```

**Self-test:** `grep -n "discount_for" orderTransform.js` → **4 total hits** (E1+E2+E3+E4 done ✅).

---

### E5a — `CollectPaymentPanel.jsx` · Add `discountFor` state · after L305

**What:** Declare the new state variable directly after the existing `discountValue` state.

**search_replace `old_str`:**
```
  const [discountType, setDiscountType] = useState(null); // 'percent' or 'flat'
  const [discountValue, setDiscountValue] = useState("");
```

**search_replace `new_str`:**
```
  const [discountType, setDiscountType] = useState(null); // 'percent' or 'flat'
  const [discountValue, setDiscountValue] = useState("");
  const [discountFor, setDiscountFor] = useState('');     // CR-137: optional discount reason (max 50 chars)
```

---

### E5b — `CollectPaymentPanel.jsx` · Wire `discountFor` into discounts object · after L1113

**What:** Add `discountFor` as the last field in the `discounts:` object so it flows through to both Flow 3 and Flow 4 transforms.

**search_replace `old_str`:**
```
        walletBalance:        walletDiscount,
      },
      customer,
```

**search_replace `new_str`:**
```
        walletBalance:        walletDiscount,
        discountFor:          discountFor,             // CR-137
      },
      customer,
```

---

### E5c — `CollectPaymentPanel.jsx` · Reset `discountFor` on discount clear · L1306-1308

**What:** When the operator selects "None" from the discount dropdown, clear the reason text too.
Only the "None" branch clears the discount completely. The preset→manual and manual→preset switches keep the reason (discount is still active, operator just changed amount).

**search_replace `old_str`:**
```
                  if (val === '') {
                    // "None" — clear everything
                    setDiscountType(null);
                    setDiscountValue("");
                    setSelectedDiscountType(null);
```

**search_replace `new_str`:**
```
                  if (val === '') {
                    // "None" — clear everything
                    setDiscountType(null);
                    setDiscountValue("");
                    setDiscountFor('');                // CR-137
                    setSelectedDiscountType(null);
```

---

### E5d1 — `CollectPaymentPanel.jsx` · Reason input in MAIN DRAWER path · after L1373

**What:** Insert the optional reason text input inside the discount-section div, between the flex row and the coupon-blocked helper. Visible only when `manualDiscount > 0 || presetDiscount > 0`.

**search_replace `old_str`:**
```
            </div>
          </div>
          {/* BUG-108 P1 Q10: Discount disabled when a coupon is applied. */}
          {selectedCoupon && (
            <div className="text-xs mt-1 ml-6 italic" style={{ color: COLORS.grayText }} data-testid="discount-helper-text">
              {BUG108_COPY.discountBlockedByCoupon}
            </div>
          )}
        </div>

        {/* 2. Coupon Section
```

**search_replace `new_str`:**
```
            </div>
          </div>
          {/* CR-137: Optional discount reason — appears only when a discount is active */}
          {(manualDiscount > 0 || presetDiscount > 0) && (
            <div className="mt-2">
              <input
                type="text"
                placeholder="Reason (optional) — e.g. Staff, Event, Loyalty"
                value={discountFor}
                onChange={(e) => setDiscountFor(e.target.value.slice(0, 50))}
                className="w-full px-2 py-1.5 rounded-lg border text-sm outline-none"
                style={{ borderColor: COLORS.borderGray }}
                data-testid="discount-for-input"
              />
            </div>
          )}
          {/* BUG-108 P1 Q10: Discount disabled when a coupon is applied. */}
          {selectedCoupon && (
            <div className="text-xs mt-1 ml-6 italic" style={{ color: COLORS.grayText }} data-testid="discount-helper-text">
              {BUG108_COPY.discountBlockedByCoupon}
            </div>
          )}
        </div>

        {/* 2. Coupon Section
```

---

### E5d2 — `CollectPaymentPanel.jsx` · Reason input in INLINE (Room Service) path · after L1985

**What:** Same input in the inline Room Service discount section. Condition is `manualDiscount > 0` (inline path only supports manual %, not preset).

**search_replace `old_str`:**
```
                          {manualDiscount > 0 && (
                            <span className="text-xs font-medium self-center" style={{ color: COLORS.primaryGreen }}>-₹{manualDiscount}</span>
                          )}
                        </div>
                      </div>
                      {selectedCoupon && (
                        <div className="text-xs mt-1 ml-5 italic" style={{ color: COLORS.grayText }}>
                          {BUG108_COPY.discountBlockedByCoupon}
                        </div>
                      )}
                    </div>
```

**search_replace `new_str`:**
```
                          {manualDiscount > 0 && (
                            <span className="text-xs font-medium self-center" style={{ color: COLORS.primaryGreen }}>-₹{manualDiscount}</span>
                          )}
                        </div>
                      </div>
                      {/* CR-137: Optional discount reason — inline path */}
                      {manualDiscount > 0 && (
                        <div className="mt-1.5">
                          <input
                            type="text"
                            placeholder="Reason (optional)"
                            value={discountFor}
                            onChange={(e) => setDiscountFor(e.target.value.slice(0, 50))}
                            className="w-full px-2 py-1 rounded-lg border text-xs outline-none"
                            style={{ borderColor: COLORS.borderGray }}
                            data-testid="discount-for-input-inline"
                          />
                        </div>
                      )}
                      {selectedCoupon && (
                        <div className="text-xs mt-1 ml-5 italic" style={{ color: COLORS.grayText }}>
                          {BUG108_COPY.discountBlockedByCoupon}
                        </div>
                      )}
                    </div>
```

---

### E6 — `CartPanel.jsx` · Pass-through in QSR `handleCollectBill` discounts · after L519

**What:** Add `discountFor: null` at the end of the `discounts` object in the QSR path. CartPanel has no discount reason UI — always null. Ensures Flow 3/4 transform reads a defined key.

**search_replace `old_str`:**
```
        loyaltyPoints: 0,
        loyaltyPointsRedeemed: 0,
        loyaltyRedemptionId: null,
        walletBalance: 0,
      },
      customer: null,
```

**search_replace `new_str`:**
```
        loyaltyPoints: 0,
        loyaltyPointsRedeemed: 0,
        loyaltyRedemptionId: null,
        walletBalance: 0,
        discountFor: null,           // CR-137 pass-through: QSR quick-bill has no reason UI
      },
      customer: null,
```

---

### E7 — `orderLedgerService.js` · Prefer API field for Discount For column · L85

**What:** When the backend starts receiving `discount_for`, return the actual value. Fall back to `'Customer'` for old orders that never had a reason.

**search_replace `old_str`:**
```
    discountFor: o.discountAmount > 0 ? 'Customer' : '',
```

**search_replace `new_str`:**
```
    discountFor: o.discount_for || (o.discountAmount > 0 ? 'Customer' : ''),  // CR-137: prefer API field; fallback 'Customer'
```

---

## Execution Sequence

```
1. orderTransform.js        → E1, E2, E3, E4  (one file, 4 quick inserts)
   ✓ Compile check after each group of edits
2. CollectPaymentPanel.jsx  → E5a (state), E5b (wire), E5c (reset), E5d1 (main UI), E5d2 (inline UI)
   ✓ Compile check after all 5 sub-edits
3. CartPanel.jsx            → E6  (1 line)
4. orderLedgerService.js    → E7  (1 line change)
   ✓ Final compile check — 0 new webpack warnings
```

---

## Verification Matrix (for self-test + QA handover)

| # | Edit | Verification | Pass Criteria |
|---|---|---|---|
| V1 | E1+E2+E3+E4 | `grep -c "discount_for" src/api/transforms/orderTransform.js` | `4` |
| V2 | E5a | `grep -n "discountFor.*useState" src/components/order-entry/CollectPaymentPanel.jsx` | 1 hit at ~L306 |
| V3 | E5b | `grep -n "discountFor.*discountFor" src/components/order-entry/CollectPaymentPanel.jsx` | 1 hit |
| V4 | E5c | `grep -n "setDiscountFor" src/components/order-entry/CollectPaymentPanel.jsx` | ≥3 hits (state decl + clear + 2× onChange) |
| V5 | E5d1 | `grep -n "discount-for-input" src/components/order-entry/CollectPaymentPanel.jsx` | 1 hit (main drawer) |
| V6 | E5d2 | `grep -n "discount-for-input-inline" src/components/order-entry/CollectPaymentPanel.jsx` | 1 hit (inline) |
| V7 | E6 | `grep -n "discountFor.*null.*CR-137" src/components/order-entry/CartPanel.jsx` | 1 hit |
| V8 | E7 | `grep -n "discount_for" src/api/services/orderLedgerService.js` | 1 hit |
| V9 | compile | `tail -5 /var/log/supervisor/frontend.out.log` | "webpack compiled" — 0 new warnings |
| V10 | browser | Apply 10% discount → reason input appears | Input visible below `-₹` amount |
| V11 | browser | Type "Staff" in reason → clear discount (None) → re-apply | Reason clears on None, re-appears on re-apply |
| V12 | network | Collect bill with reason → Network tab | `discount_for: "Staff"` in payload |
| V13 | network | Collect bill without reason → Network tab | `discount_for: null` in payload |
| V14 | network | Place order (Flow 1) → Network tab | `discount_for: null` in payload |

---

## Risk Register

| Risk | Mitigation |
|---|---|
| E3 targets wrong `self_discount` (2 exist in Flow 3) | search_replace uses the unique preceding comment "// V1 closure (2026-05-25)" — unambiguous |
| E5d1 search_replace breaks if BUG-108 comment text changed | Use 4+ lines of context; the `{/* 2. Coupon Section` comment is stable |
| `discountFor` not cleared when coupon is applied | Not needed — coupon disables the discount dropdown entirely; discount remains at the value it was, so reason is valid to keep |
| Two render paths get out of sync | Both E5d1 and E5d2 share the same `discountFor` state — automatically consistent |

---

## Post-Code Registry Checklist (Implementation agent MUST run)

```
- [ ] registry.json: CR-137 → status: "IMPLEMENTED", sprint_key: "pos_5_1"
- [ ] CR_REGISTRY.md: CR-137 row → IMPLEMENTED
- [ ] FILE_OWNERSHIP.md: add 4 files with CR-137 + date 2026-08-12
        orderTransform.js, CollectPaymentPanel.jsx, CartPanel.jsx, orderLedgerService.js
- [ ] Code markers: // CR-137 comment present in every modified file (already in plan)
- [ ] Compile: tail frontend logs → "webpack compiled" with 0 NEW warnings
```

---

## QA Handover Seed (Implementation agent appends self-test results here)

```markdown
## 1. Verification Matrix results
(Implementation agent fills in V1–V14 PASS/FAIL)

## 2. Regression Test List
**MANDATORY for QA agent — 77 tests across 10 sections:**
  Path: `/app/memory/plans/CR-137_REGRESSION_TEST_LIST.md`

  Priority breakdown:
  - 35 × P0  — must all pass before merge
  - 31 × P1  — must all pass before owner smoke
  - 11 × P2  — run before release

  Highest-priority sections (run first):
  - Section I (8 P0): Full critical-path smoke — Login → Order → Pay → Ledger → Logout
  - Section B (3 P0): BUG-304 interaction — discountableRatio + dSgst/dCgst/dVat unchanged
  - Section C (3 P0): BUG-305 interaction — gst_tax in backend payload + print unchanged
  - Section A (6 P0): CR-137 feature tests — reason input appear/hide/clear/payload

  ⚠ BUG-304 + BUG-305 shipped 2026-08-11 (yesterday) in the same files.
  Tests B1, B3, C1, C2 are the highest-interaction-risk checks.

## 3. Registry Sync Confirmation
  Registry synced: YES/NO
  Items: CR-137
  Sprint: pos_5_1
  EXIT GATE: N/5 PASSED

## 4. Credentials
  Account: owner@shimlaqohfoodcourt.com / Qplazm@10
  URL: https://pos-printer-1.preview.emergentagent.com
  Flow to test: Dine-in order → add items → Collect Bill → apply discount → enter reason → submit
```

---

*Implementation Plan complete. 9 edits across 4 files. Awaiting **Gate 4 GO** from owner.*
