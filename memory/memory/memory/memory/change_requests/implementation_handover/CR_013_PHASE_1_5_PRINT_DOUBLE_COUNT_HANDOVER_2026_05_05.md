# CR-013 Phase 1.5 — Print-Bill Double-Count Handover (for next agent)

**Date:** 2026-05-05 (late afternoon session)
**Branch:** `5may`
**Session agent:** CR-013 / CR-008 Round-3 Continuation + Approval-Gate Agent
**Status:** `decision_pending_owner` — owner must pick Option A / B / C before next code change
**Do NOT:** implement any of A / B / C until owner explicitly replies. Owner's standing directive this session is "no code update" until each change is approved.

---

## 0. TL;DR for the next agent

1. Phase 1.5 main (D-GST-3 payload-fill + D-GST-4 UI breakdown + parity warn + print payload split) shipped earlier this session. Two hotfixes followed:
   - **Fix-1** — `deliver_charge_gst` nested under `settings.*` fallback in `profileTransform.js:136`.
   - **Fix-2** — delivery-charge handoff `OrderEntry.jsx:1190` fallback to local state.
2. **New bug discovered late in the session:** the printed bill on Bean Me Up shows `CGST = SGST = ₹27.95` each, but the actual Total charged is ₹748 (= `715 + 33`, i.e. item GST only). The backend print template is doing TWO opposite-direction errors on the same bill — over-counts SC GST on the display lines, under-counts it in the Total.
3. Root cause: Phase 1.5 D-GST-3 flipped `service_gst_tax_amount` from hardcoded `0` to real value (₹11.70), which unmasked latent backend logic that treats this field asymmetrically.
4. FE math + FE payload are **correct** — verified via DevTools paste. The issue is entirely in backend's template + `order.amount` computation.
5. Owner has asked for three options (A / B / C) to be tabled. Final decision not yet given.
6. Next agent's job: read this doc → wait for owner's A/B/C choice → act accordingly.

---

## 1. Session timeline

### 1.1 — Phase 1.5 main ship (earlier session this day)
Owner-approved 2026-05-05 answers Q1=yes, Q2=₹0.01, Q3=both, Q4=defaults. Plus round-off-only-for-Grand-Total directive.

**Files touched:**
| File | Backup | Lint |
|---|---|---|
| `frontend/src/api/transforms/orderTransform.js` | `.bak.cr013p15` | ✅ |
| `frontend/src/components/order-entry/CollectPaymentPanel.jsx` | `.bak.cr013p15` | ✅ |

**What shipped:**
- `calcOrderTotals` now exposes `service_gst_tax_amount` + `tip_tax_amount` in its return.
- 5 payload sites stopped hardcoding 0 for those keys: `placeOrder`, `updateOrder`, `placeOrderWithPayment`, `collectBillExisting` (BILL_PAYMENT), `transferToRoom`. They now carry real values.
- `buildBillPrintPayload` additionally emits `cgst_amount` + `sgst_amount` (each = `finalGstTax / 2`) alongside existing `gst_tax`.
- Collect Bill UI Bill Summary replaced single SGST / CGST pair with per-component breakdown (item / SC / Tip / Delivery), gated on `> 0`, rate-labelled on SC/Tip/Delivery.
- Parity guardrail — `console.warn('[CR-013 PARITY] ...', {...})` if component-sum vs composite diverges by > ₹0.01.
- Round-off applies ONLY to final Grand Total, never to component values.

**Summary doc:** `/app/memory/change_requests/implementation_summaries/CR_013_PHASE_1_5_DGST3_DGST4_SUMMARY.md`
**Phase 3 CR:** `/app/memory/change_requests/phase_3/CR_013_P3_PRINT_TEMPLATE_PER_COMPONENT_TAX.md` (backend gates BE-G7 / BE-G8 / BE-G9 / BE-G10 / BE-G11).
**Round-3 closure:** `/app/memory/change_requests/implementation_summaries/CR_008_D1_CAP_ROUND_3_DELIVERY_DOUBLE_FIX_SUMMARY.md`.

### 1.2 — Fix-1 (delivery GST nested-key fallback)
**Reported by owner:** Delivery GST breakdown not rendering on Bean Me Up (id=742) despite `deliver_charge_gst = 18%`.

**Live API proof:**
```
restaurants[0].service_charge_tax         = "18.00"     (root)  ← already worked
restaurants[0].deliver_charge_gst         =  null       (root)  ❌
restaurants[0].settings.deliver_charge_gst = "18.00"    (NESTED) ← FE never looked here
```

**Fix:** `profileTransform.js:136` additive nullish-coalescing fallback:
```js
deliveryChargeGstPct: parseTaxPct(api.deliver_charge_gst ?? api.settings?.deliver_charge_gst),
```
`service_charge_tax` (line 135) intentionally NOT given a settings fallback per owner directive "fix 1 only".

**Backup:** `profileTransform.js.bak.cr013p15-fix1`. **Lint:** clean. **Webpack:** ✅. **HTTP:** 200.

**Live verification (simulated against Bean Me Up profile API):**
- Pre-fix `restaurant.deliveryChargeGstPct` resolved → `0` ❌
- Post-fix → `18` ✅
- `delTaxRate = 0.18`, `deliveryGst = deliveryCharge × 0.18` > 0 → Delivery CGST + SGST lines now render.

### 1.3 — Fix-2 (delivery-charge handoff OrderEntry → CollectPaymentPanel)
**Reported by owner (with screenshots):** User typed ₹500 in OrderEntry delivery-charge input → "Collect Bill ₹920" (= items + item GST + 500) → clicked Collect Bill → CollectPayment screen shows Delivery Charge field as ₹0, Pay = ₹420 (= items + item GST only). Delivery silently dropped on hand-off.

**Root cause:** `OrderEntry.jsx:1190` passed only `initialDeliveryCharge={orderFinancials.deliveryCharge}` — populated by backend echo (BUG-019 scan / re-engage paths). For pre-place fresh delivery orders, `orderFinancials.deliveryCharge = 0` and the user-typed value lived only in OrderEntry's local `deliveryCharge` React state, which the prop never read → CollectPaymentPanel's lazy-init at `:149-153` saw `0`, rendered empty input.

**Fix:** `OrderEntry.jsx:1190` additive `||` fallback:
```jsx
initialDeliveryCharge={orderFinancials.deliveryCharge || (Number(deliveryCharge) || 0)}
```

**Backup:** `OrderEntry.jsx.bak.cr013p15-fix2`. **Lint:** clean. **Webpack:** ✅. **HTTP:** 200.

**Preservation verified:**
- BUG-019 scan prepaid: first operand wins → identical behaviour ✅
- BUG-019 re-engaged placed delivery: first operand wins → identical ✅
- D1-Gate `readOnly={isPrepaid}` unaffected ✅
- CR-008 D1-Cap Round-2 / Round-3 untouched ✅

### 1.4 — Owner's "u are adding to csgt and cgst both, u have to /2 and add" observation
Owner flagged that SC GST + Delivery GST appeared double-counted somewhere on the print path. First pass: FE math audited — UI + print payload math confirmed correct, each component halved correctly. Verdict deferred pending observation of actual printed bill.

### 1.5 — Owner shared a blurry photo of the printed receipt + full print-payload DevTools paste
**Printed receipt showed:**
```
Item Total : 650.00
S.C (10%)  :  65.00
Sub Total  : 715.00
CGST(2.5%) :  27.95    ← per-side value (rate label hardcoded on template)
SGST(2.5%) :  27.95
Total      : 748
```

**FE payload DevTools paste (verbatim):**
```
order_id                : 825311
restaurant_order_id     : "001840"
print_type              : "bill"
payment_amount          : 748
grant_amount            : 748
order_item_total        : 650
order_subtotal          : 715
serviceChargeAmount     :  65
gst_tax                 :  44.2     ← full composite (item 32.50 + SC 11.70)
cgst_amount             :  22.1     ← gst_tax / 2 ✅
sgst_amount             :  22.1     ← gst_tax / 2 ✅
vat_tax                 :   0
delivery_charge         :   0
Tip                     :   0
```

→ **See §3 for the full math walkthrough and decoding.**

**Owner's statement:** "no backend doesn't add" (i.e. backend does NOT sum `gst_tax + cgst_amount + sgst_amount`).

---

## 2. Tenant under test

| Setting | Value | Source |
|---|---|---|
| Tenant | Bean Me Up | preprod |
| Restaurant ID | 742 | `restaurants[0].id` |
| Login | `owner@beanmeup.com` / `Qplazm@10` | (used this session) |
| `service_charge` | "Yes" | root |
| `service_charge_percentage` | "10.00" | root |
| `service_charge_tax` | "18.00" | root ✅ |
| `auto_service_charge` | "Yes" | root |
| `tip` | "Yes" | root |
| `deliver_charge_gst` (root) | `null` | root — **missing at root** |
| `deliver_charge_gst` (settings) | "18.00" | **nested under `restaurants[0].settings`** |

Cross-check tenant: Palm House (owner@palmhouse.com / Qplazm@10) — id=541 — both `service_charge_tax` and `settings.deliver_charge_gst` are "0.00". No component GST lines render on this tenant (frozen-rule §10 force-0). Useful as a control tenant.

---

## 3. The printed-bill double-count — full forensic decode

### 3.1 Bill in question
- `order_id = 825311`, `restaurant_order_id = "001840"`, Bean Me Up, dineIn
- 1 item: Cold Pressed Juices ₹650, 5% GST (item-level)
- Auto SC 10% → ₹65
- SC GST 18% → ₹11.70
- Item GST 5% → ₹32.50
- Tip / Delivery = 0

### 3.2 Expected values (if everything is honest)
```
Subtotal       = items + SC              = 650 + 65      = 715.00
Item GST       = 5% × 650                = 32.50
SC GST         = 18% × 65                = 11.70
Total GST      = item GST + SC GST       = 44.20
CGST half      = 44.20 / 2               = 22.10
SGST half      = 44.20 / 2               = 22.10
Grand Total    = Subtotal + Total GST    = 715 + 44.20   = 759.20
(with BUG-009 round-off)                                 ≈ 759 or 760
```

### 3.3 FE payload vs receipt output — side-by-side
| Surface | Expected | FE payload (actual) | Receipt (printed) | Match? |
|---|---|---|---|---|
| Subtotal | 715 | `order_subtotal: 715` | Sub Total 715.00 | ✅ |
| `gst_tax` | 44.20 | 44.20 | — (not on receipt) | ✅ (FE) |
| `cgst_amount` | 22.10 | 22.10 | — (not used by template) | ✅ (FE) / ❌ (template ignores) |
| `sgst_amount` | 22.10 | 22.10 | — (not used by template) | ✅ (FE) / ❌ (template ignores) |
| Receipt CGST line | 22.10 | — | **27.95** | ❌ |
| Receipt SGST line | 22.10 | — | **27.95** | ❌ |
| Receipt Total | 759 | `payment_amount: 748` | **748** | ❌ |

### 3.4 Reverse-engineering the backend template formula

**Display formula (per-side CGST / SGST lines):**
```
27.95
= 16.25 + 11.70
= (gst_tax − service_gst_tax_amount) / 2   +   service_gst_tax_amount
= (44.20 − 11.70) / 2                      +   11.70
= 16.25                                    +   11.70
```
**→ Backend adds the FULL `service_gst_tax_amount` to BOTH the CGST and SGST display slots instead of `/2`.** Visible total GST on bill: `27.95 × 2 = 55.90` — ₹11.70 higher than the real total GST of ₹44.20.

**Total formula (`order.amount` / `payment_amount`):**
```
748
= 715 + 33
= order_subtotal + (gst_tax − service_gst_tax_amount)
= 715 + (44.20 − 11.70)
= 715 + 32.50
(with ₹0.50 round-up to 748)
```
**→ Backend subtracts `service_gst_tax_amount` from `gst_tax` when computing the total.** Hidden total GST in the charge: ₹32.50 — ₹11.70 LOWER than real.

### 3.5 Why this is a Phase-1.5 regression (invisible pre-Phase-1.5)

| Era | `service_gst_tax_amount` on `BILL_PAYMENT` | Display CGST | Display SGST | Total |
|---|---|---|---|---|
| Pre-Phase-1.5 | hardcoded **0** | `(gst_tax − 0) / 2 + 0 = 22.10` ✅ | same ✅ | `715 + (44.20 − 0) = 759.20` ✅ |
| Post-Phase-1.5 D-GST-3 | **11.70** (real) | `16.25 + 11.70 = 27.95` ❌ | same ❌ | `715 + (44.20 − 11.70) = 747.50 ≈ 748` ❌ |

Both backend errors were always present in the template logic — they just produced no visible symptom when the FE was sending `0` for the per-component keys. D-GST-3 flipping the value to real unmasks both errors simultaneously and in opposite directions.

### 3.6 Customer-visible inconsistency

A customer or auditor reading the bill sees:
- CGST + SGST on display = ₹55.90
- Total charged − Subtotal = ₹33.00
- **Mismatch: ₹22.90**

The printed bill is not internally reconcilable. This is the reason to resolve urgently.

---

## 4. Open owner question — Option A / B / C

| # | Option | CGST/SGST on this bill | Total on this bill | `service_gst_tax_amount` persisted | Forensic loss | Reversibility |
|---|---|---|---|---|---|---|
| **A** | Backend ticket only (BE-G7/G8/G11 urgent, no FE change) | Stays 27.95 (broken) until BE ships | Stays 748 (broken) until BE ships | 11.70 ✅ | None | — |
| **B** | Targeted FE rollback on `collectBillExisting` only (BILL_PAYMENT path) — revert `service_gst_tax_amount` + `tip_tax_amount` to 0 there; keep real values on the other 4 sites | 16.25 each ✅ (pre-Phase-1.5 baseline) | 759 ✅ | 0 on BILL_PAYMENT (regressed for this path only); 11.70 on placeOrder / updateOrder / placeOrderWithPayment / transferToRoom ✅ | SC/Tip GST forensics lost ONLY on collect-bill-path orders | Fully reversible once BE ships |
| **C** | Full FE rollback of D-GST-3 at all 5 sites | 16.25 each ✅ | 759 ✅ | 0 everywhere (all D-GST-3 parked) | SC/Tip GST forensics lost on ALL paths | Fully reversible once BE ships |
| **D** (not recommended) | FE workaround — pre-halve `service_gst_tax_amount` on `BILL_PAYMENT` | 22.10 + 5.85 = 27.95 ... still wrong; OR cancels one side of the bug only | Unpredictable | 5.85 (half of real) — audit confusion | Half-value persistence | — |

**Agent's session recommendation:** Option **B** (targeted rollback on `collectBillExisting`) + raise BE-G7 / BE-G8 / BE-G11 as urgent in the Phase 3 CR. Rationale: fixes the printed bill immediately with minimum persistence regression, and automatically reverses the moment backend ships.

**Owner's last statement (verbatim):** *"docuemnt this for next agent with all details discussed so far so he can refer this doc and continue DISCUSSION of this options and questions"*

→ **Owner has NOT chosen A/B/C/D yet.** Do not implement.

---

## 5. Implementation sketch for each option (so next agent can quote when owner picks)

### Option A — Backend-only
No FE change. Promote BE-G7 / BE-G8 / BE-G10 / BE-G11 to urgent in `/app/memory/change_requests/phase_3/CR_013_P3_PRINT_TEMPLATE_PER_COMPONENT_TAX.md`. Update that file to record:
- BE-G7: confirm backend's `order.amount` formula for `BILL_PAYMENT` paid orders — does it subtract `service_gst_tax_amount` from `gst_tax`?
- BE-G8: same question for `tip_tax_amount`.
- BE-G11: backend print template must consume `cgst_amount` + `sgst_amount` FE-side fields (already sent by Phase 1.5) and STOP using the legacy `(gst_tax − service_gst_tax_amount) / 2 + service_gst_tax_amount` formula.
- BE-G10: confirm whether template auto-renders passed tax fields.
Urgent priority flag added. Owner emails / tags backend lead. No FE code change.

### Option B — Targeted FE rollback on `collectBillExisting` only
**File:** `/app/frontend/src/api/transforms/orderTransform.js`
**Backup:** `orderTransform.js.bak.cr013p15-optB`
**Edits (two sites, `collectBillExisting` only — approx L1128 + L1130 after Phase 1.5 renumber):**
```js
// BEFORE (Phase 1.5 shipped value)
service_gst_tax_amount:   Math.round((serviceGstTaxAmount || 0) * 100) / 100,
tip_tax_amount:           Math.round((tipTaxAmount || 0) * 100) / 100,

// AFTER (Option B targeted rollback — BILL_PAYMENT only)
service_gst_tax_amount:   0,   // Option B rollback (2026-05-05) — waiting on BE-G7/G8/G11
tip_tax_amount:           0,   // Option B rollback (2026-05-05) — waiting on BE-G7/G8/G11
```
Do NOT touch:
- `calcOrderTotals` return (lines ~636-637) — still exposes real values for other 4 sites.
- `placeOrder` / `updateOrder` / `placeOrderWithPayment` payload — still flow real values via `...totals`.
- `transferToRoom` — still consumes real values from `paymentData` (should remain honest; transfer-to-room is a distinct path not routed through the same print template).
- `buildBillPrintPayload` — still emits `cgst_amount` + `sgst_amount` (harmless even if template ignores them today).
- `CollectPaymentPanel.jsx` — UI breakdown + parity guardrail untouched. `paymentData` still carries `serviceGstTaxAmount` + `tipTaxAmount` (they'll just be dropped at the `collectBillExisting` payload builder).

Add a code-comment cross-referencing this handover doc + the Phase 3 CR so the next revert (once BE-G11 ships) is easy to find.

**Post-change checklist:**
- [ ] Lint `orderTransform.js`.
- [ ] Webpack auto-reload → Compiled successfully.
- [ ] Capture before/after DevTools snapshot of `BILL_PAYMENT` POST request body for Bean Me Up (compare `service_gst_tax_amount` + `tip_tax_amount` values).
- [ ] Owner runtime check: Bean Me Up dineIn order → Collect Bill → Print → confirm CGST = SGST = 16.25 and Total = 759 (or 760 with round-off).
- [ ] Update `/app/memory/change_requests/implementation_summaries/CR_013_PHASE_1_5_DGST3_DGST4_SUMMARY.md` with a §0c "Option B Interim Rollback" section. Record: date, files, lint, webpack, backup, owner-verified.
- [ ] Update Phase 3 CR priority to urgent for BE-G7/G8/G11.

### Option C — Full FE rollback of D-GST-3
**File:** same as Option B
**Backup:** `orderTransform.js.bak.cr013p15-optC`
**Edits (all 5 sites):**
1. `calcOrderTotals` return: set both keys to `0` instead of computing real values (or leave computed but wrap spread on each site to override back to 0 — simpler to just change at the spread sites).
2. `placeOrder` payload: add explicit overrides `service_gst_tax_amount: 0, tip_tax_amount: 0` AFTER `...totals` spread.
3. `updateOrder` payload: same.
4. `placeOrderWithPayment` payload: same.
5. `collectBillExisting` payload: change as in Option B.
6. `transferToRoom` payload: set to 0 as well.

Same post-change checklist as Option B but scope broader.

### Option D — NOT recommended
(documented only for completeness; agent recommends against)

---

## 6. Files in play this session

### 6.1 Changed (live on disk right now)
| File | Baseline backup | Current state |
|---|---|---|
| `frontend/src/api/transforms/orderTransform.js` | `.bak.cr013p15` (Phase 1.5 main) | Phase 1.5 D-GST-3 applied at all 5 sites + `cgst_amount`/`sgst_amount` on print payload |
| `frontend/src/components/order-entry/CollectPaymentPanel.jsx` | `.bak.cr013p15` | Phase 1.5 D-GST-4 UI breakdown + parity warn + paymentData extension |
| `frontend/src/api/transforms/profileTransform.js` | `.bak.cr013p15-fix1` | Fix-1 applied on line 136 (settings fallback for `deliver_charge_gst`) |
| `frontend/src/components/order-entry/OrderEntry.jsx` | `.bak.cr013p15-fix2` | Fix-2 applied on line 1190 (local `deliveryCharge` fallback) |

### 6.2 Docs written this session
| Doc | Location |
|---|---|
| Round-3 closure | `/app/memory/change_requests/implementation_summaries/CR_008_D1_CAP_ROUND_3_DELIVERY_DOUBLE_FIX_SUMMARY.md` |
| Phase 1.5 main + Fix-1 + Fix-2 summary | `/app/memory/change_requests/implementation_summaries/CR_013_PHASE_1_5_DGST3_DGST4_SUMMARY.md` |
| Phase 3 backend CR | `/app/memory/change_requests/phase_3/CR_013_P3_PRINT_TEMPLATE_PER_COMPONENT_TAX.md` |
| **This handover doc** | `/app/memory/change_requests/implementation_handover/CR_013_PHASE_1_5_PRINT_DOUBLE_COUNT_HANDOVER_2026_05_05.md` |

### 6.3 Backups of interest (for rollback / diff)
```
frontend/src/api/transforms/orderTransform.js.bak.cr013p15
frontend/src/api/transforms/orderTransform.js.bak.cr013
frontend/src/api/transforms/orderTransform.js.bak.d1cap
frontend/src/api/transforms/profileTransform.js.bak.cr013p15-fix1
frontend/src/components/order-entry/CollectPaymentPanel.jsx.bak.cr013p15
frontend/src/components/order-entry/OrderEntry.jsx.bak.cr013p15-fix2
frontend/src/components/order-entry/OrderEntry.jsx.bak.cr008r3
frontend/src/components/order-entry/CartPanel.jsx.bak.cr008r3
```
`/app/memory/final/` — UNTOUCHED throughout this session.

---

## 7. Strict rails for the next agent

1. **Do NOT** touch `/app/memory/final/`.
2. **Do NOT** touch backend.
3. **Do NOT** implement Option A / B / C / D until owner explicitly picks one in a reply.
4. **Do NOT** change CR-008 D1-Cap / D1-Gate / Round-3 or CR-013 D-GST-1 / D-GST-2 / G3. Those are regression-locked.
5. **Do NOT** touch Fix-1 or Fix-2. They're confirmed working.
6. **Do NOT** add `delivery_charge_gst_amount` as a new payload key — BE-G9 in Phase 3 CR.
7. **Do NOT** run testing_agent (out of owner's repeatedly-stated scope for this CR).
8. When owner picks, follow the exact implementation sketch in §5 for that option.
9. After code change, ALWAYS:
   - take `.bak.cr013p15-opt{A|B|C}` backup (suffix by option chosen),
   - lint,
   - confirm webpack compiles,
   - update `/app/memory/change_requests/implementation_summaries/CR_013_PHASE_1_5_DGST3_DGST4_SUMMARY.md` with a new §0c section describing the rollback scope,
   - append a §8 entry to THIS handover doc recording which option was chosen + observed post-fix values.
10. If owner provides new info (screenshots, payload captures, new tenant test), re-decode using the §3 framework before proposing any additional change.

---

## 8. Post-resolution log (for next agent to fill)

### 8.1 Owner choice (awaited)
- Date: _to be filled_
- Option chosen: _A / B / C / D_
- Verbatim owner reply: _"..."_

### 8.2 Code change (if any)
- Files touched: _..._
- Backup(s): _..._
- Lint: _..._
- Webpack: _..._

### 8.3 Live verification on Bean Me Up
- Pre-change CGST / SGST on receipt: 27.95 / 27.95
- Pre-change Total: 748
- Post-change CGST / SGST on receipt: _..._
- Post-change Total: _..._
- Owner-confirmed: _..._

### 8.4 Phase 3 CR updates
- BE-G7 priority: _normal / urgent_
- BE-G8 priority: _normal / urgent_
- BE-G10 priority: _normal / urgent_
- BE-G11 priority: _normal / urgent_
- Backend team notified: _date_

---

## 9. Quick-reference appendix — live API values for tenants tested

### 9.1 Bean Me Up (id=742)
```
login:                              owner@beanmeup.com / Qplazm@10
restaurants[0].service_charge_tax:           "18.00"
restaurants[0].service_charge_percentage:    "10.00"
restaurants[0].auto_service_charge:          "Yes"
restaurants[0].service_charge:               "Yes"
restaurants[0].tip:                          "Yes"
restaurants[0].deliver_charge_gst:            null
restaurants[0].settings.deliver_charge_gst:  "18.00"    ← nested (Fix-1 required)
restaurants[0].settings.service_charge_tax:   null

FE post-Fix-1 resolution:
  serviceChargeTaxPct       = 18
  deliveryChargeGstPct      = 18
```

### 9.2 Palm House (id=541) — control tenant
```
login:                              owner@palmhouse.com / Qplazm@10
restaurants[0].service_charge_tax:           "0.00"
restaurants[0].deliver_charge_gst:            null
restaurants[0].settings.deliver_charge_gst:  "0.00"
restaurants[0].settings.service_charge_tax:   null

FE resolution:
  serviceChargeTaxPct       = 0
  deliveryChargeGstPct      = 0
→ all component GST lines correctly hidden (frozen-rule §10)
```

---

## 10. Cross-references

- Owner directives (verbatim this session):
  1. 2026-05-05 Q1/Q2/Q3/Q4 + round-off-only-for-Grand-Total.
  2. "fix 1 only" → Fix-1 scope limited to `deliver_charge_gst` fallback.
  3. "approved" (after Fix-2 screenshots) → Fix-2 shipped.
  4. "no code update" → repeatedly, for validation/analysis steps.
  5. "no backend doesn't add" → confirms risk-1 (backend summing three keys) is NOT the bug; risk-2 (template reading legacy `service_gst_tax_amount` asymmetrically) IS.
  6. "docuemnt this for next agent ... continue DISCUSSION of this options and questions" → this document.

- Frozen rules still in force:
  - CR-013 Frozen Business Logic §10 (force-0 fallback)
  - OD-D1 relaxation (rate-labelled breakup on Collect Bill UI — approved 2026-05-05)
  - OD-D3 (no new payload keys without owner approval)
  - BUG-009 rounding (Grand Total only)

- Regression-locked surfaces:
  - CR-008 Sub-CR #1 D1-Gate (`readOnly={isPrepaid}`)
  - CR-008 D1-Cap Round-1 / Round-2 / Round-3
  - CR-013 D-GST-1 / D-GST-2 / G3
  - Phase 1.5 main D-GST-3 payload-fill on `placeOrder` / `updateOrder` / `placeOrderWithPayment` / `transferToRoom` (Option B keeps these intact; Option C would touch them)
  - Phase 1.5 main D-GST-4 UI breakdown + parity
  - Phase 1.5 Fix-1 (`profileTransform.js:136`)
  - Phase 1.5 Fix-2 (`OrderEntry.jsx:1190`)
  - Round Off applies ONLY to Grand Total

---

**Next agent: read this doc fully, wait for the owner's A / B / C (or new instruction), then follow §5 + §7 exactly. Do not attempt to "guess" an implementation before the choice lands.**

— End of Handover —
