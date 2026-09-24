# INV — GST architecture, `gst_status` key and menu-validation flow — Investigation Report

**Date:** 2026-09-24 · **Role:** INVESTIGATION (ALPHA v0.7) → INTAKE for discovered items · **Steps used:** 10/10 · **Risk label:** CRITICAL (tax / money)
**Code:** `21implement` @ `a4c9196f` · **Evidence:** `/app/memory/evidence/INV-GST-KEY-2026-09-24/` (profile + settings-list + products sample for owner1@thegoankitchen.com and owner@palmhouse.com; tokens masked)
**Legend:** ✅ CONFIRMED (code or live API) · ⚠️ ASSUMPTION (needs backend or owner confirmation)

---

## 1. Current GST architecture (where GST is configured)

| Level | Key(s) | API | Live values (tgk / palmhouse) | FE consumer | Status |
|---|---|---|---|---|---|
| **Outlet on/off** | `gst_status` (bool) + `gst_code` | `GET /api/v1/vendoremployee/profile` → `restaurants[0]` | `true / true`, codes present | `profileTransform.js:184` → `restaurant.tax.gstStatus` (`=== true`) | ✅ **already consumed** since CR-036-FU-03 (2026-06-12) |
| Outlet on/off (settings mirror) | `basic.gst_status` (int 0/1) **and** legacy `basic.gst = {status, code}` | `GET /api/v2/vendoremployee/restaurant-settings/settings-list` | `1 / 1`; `gst.status=1` | `restaurantSettingsTransform.js:118-119` reads **`basic.gst.status`/`gst.code` only** — new flat `gst_status` **not read** | ✅ FE reads legacy shape only |
| Outlet on/off (write) | `basic.gst_status` (owner's curl) vs FE writes `basic.gst = {status, code}` (`restaurantSettingsTransform.js:218`) | `POST /api/v2/vendoremployee/restaurant-settings/update-settings` (multipart `data=`) | — | `RestaurantSettingsPage.jsx:632` toggle → save → `getProfile()` re-sync (BUG-337) | ⚠️ whether both write paths hit the same column is **unverified** (toggle not run on live tenants — financial setting) |
| **Outlet GST mode** | `restaurent_gst` = `restaurant` \| `category` (+ duplicate `restaurant_gst`) | settings-list `advanced.*`, profile root | `restaurant / category` | `restaurantSettingsTransform.js:120` (`gstMode`) — display only | ✅ FE never uses mode in calculations |
| **Outlet GST rate** | `gst_tax` ("5.00") | profile root, settings `advanced` | `5.00 / 0.00` | `profileTransform.js:176` → `tax.gstPercentage`; `OrderEntry.jsx:2831` `showGst` | ✅ not used to compute item tax |
| **Item level** | `tax` (number %), `tax_type` (`GST`\|`VAT`\|`None`), `tax_calc` (`Exclusive`\|`Inclusive`) | `GET /api/v1/vendoremployee/get-products-list`, menu add/edit | e.g. `tax=5, tax_type=GST, tax_calc=Exclusive` | `productTransform.js:71-76` → `item.tax`; `orderTransform.js:723-734` per-line tax; `CollectPaymentPanel.jsx:266-304` display | ✅ **item level is the only calculation input** |
| Item "GST applicable" flag | **does not exist** — only `packed_food` (Yes/No) and `pack_charges` | products-list contract (`products_sample.json`, 68 keys) | `packed_food=No, pack_charges=0.00` | `BulkEditor` treats `packedFood==='Yes'` as tax-exempt | ✅ no per-item GST yes/no key in API |
| Packaging GST | **no key** (`pack_charges` only; delivery has `deliver_charge_gst`) | profile/settings/products — 0 keys matching `pack.*gst` | — | none | ✅ packaging GST is not modelled anywhere in the FE-visible contract |
| Room GST | `room_gst_applicable`, `settings.room_gst.slabs[]` | profile/settings | `Yes / No` | PMS flows (BUG-338/386/388…) | out of scope here |

**Type drift ✅:** profile sends `gst_status: true` (boolean); settings-list sends `gst_status: 1` (int). FE gate is strict `=== true` on the profile value, so if the backend ever normalises profile to `1`, GST gating **silently turns off** (OQ-F3-3 "safe fallback" becomes unsafe).

## 2. Flow trace — Settings → Menu → API → Order → GST calc → Bill

```
Restaurant Settings wizard (RestaurantSettingsPage step4 gstEnabled/gstCode)
  → POST update-settings  basic.gst={status,code}            [restaurantSettingsTransform.js:218]
  → getProfile() → restaurant.tax.gstStatus                  [profileTransform.js:184, BUG-337 re-sync]

Menu Management
  BulkEditor.validateRow (L553-586): gstRequired = restaurant.tax.gstStatus === true
      → non-packaged rows need taxType∈{GST,VAT} AND taxPercent>0             (CR-036-FU-03)
      → Aggregator rows need taxType==='GST' AND taxPercent===5, UNCONDITIONAL (BUG-391)
  ProductForm (single item): NO gstStatus rule; Aggregator tax fields locked to GST 5%  (BUG-391)
  Excel import (menuService.bulkImport): NO FE validation — backend only
  → menuManagementTransform.toAPI: tax, tax_type, tax_calc, pack_charges, packed_food / is_packaged_good

Order Entry
  productTransform → item.tax {percentage,type,calculation}
  orderTransform.buildCartItem (L723-734): taxAmount = f(item.tax) — NO gstStatus check
  orderTransform.calcOrderTotals (L796+): gst_tax / tax_amount / service_gst_tax_amount — NO gstStatus check
  → POST place/update order payload carries GST even when gst_status=false        ← BREAK POINT 1

Collect Bill
  CollectPaymentPanel.taxTotals (L266-304): skips GST lines when gstStatus===false  (BUG-336) ✅
  → settle payload gstTax / printGstTax derived from taxTotals (gated)
Bill print
  buildBillPrintPayload ← paymentData.printGstTax (gated) — but header amounts persisted by the
  backend from the place-order payload (ungated) may differ                      ← BREAK POINT 1 downstream
```

## 3. Current validation rules (FE)

| # | Rule | Where | Condition | Source |
|---|---|---|---|---|
| V1 | Non-packaged item must have GST/VAT type + rate > 0 | `BulkEditor.jsx:576-584` | `restaurant.tax.gstStatus === true && row.packedFood !== 'Yes'` | CR-036-FU-03 (owner directive 2026-06-12) |
| V2 | Aggregator item must be GST **exactly 5 %** | `BulkEditor.jsx:568-575`; `ProductForm.jsx:240-241, 287, 440-456` (fields locked) ; `menuManagementTransform` safety net | `menuType === 'Aggregator'` — **unconditional** (ignores gstStatus and packedFood) | BUG-391 |
| V3 | Validate-Tax button (pre-flight highlight) | `BulkEditor.jsx:593+` | runs V1/V2 only | CR-158 |
| V4 | Packaging: `pack_charges` numeric ≥ 0, `packedFood` toggle, Aggregator `swiggyPackingChrg` YES/NO, `is_packaged_good` 0/1 | `ProductForm.jsx:610,624,424`; `BulkEditor.jsx:167-178` | no validation beyond number parsing | BUG-326 / BUG-394 |
| V5 | **No** tax rule at all in single-item `ProductForm` for non-Aggregator menus; **no** FE rule on Excel import | — | — | gap |
| — | Backend validation on add/edit/import | unknown | ⚠️ not probed (mutating) | backend question |

## 4. GST vs packaging conflict — exact clashes ✅

| Clash | Rules | Condition | Location | Effect |
|---|---|---|---|---|
| **X1** | V1 exempts packaged items; V2 forces GST 5 % | `menuType==='Aggregator'` **and** `packedFood==='Yes'` (`is_packaged_good=1`) | `BulkEditor.jsx:568-584` (V2 evaluated first, V1 skipped) ; `ProductForm.jsx:440-456` | packaged MRP goods (water, cans — 12 %/18 % or MRP-inclusive) **cannot be saved with their real GST**; the owner's packaged-exemption is dead for Aggregator rows |
| **X2** | V2 unconditional vs `gst_status=false` | outlet GST OFF + Aggregator menu | same | rows are forced to carry 5 % GST although the outlet is GST-disabled; `CollectPaymentPanel` then hides it (BUG-336) while the order payload still sends it (BREAK POINT 1) |
| **X3** | V1 in BulkEditor vs none in ProductForm/import | same item edited via different screens | `BulkEditor.jsx:576` vs `ProductForm.jsx` (0 hits for `gstStatus`) | inconsistent: form saves 0 % item, bulk editor refuses the same row on next edit |
| **X4** | `packedFood` exemption assumes "tax handled outside item-level computation" — but no packaging-GST key exists | any packaged item | contract (`products_sample.json`) | packaged items simply carry **no** GST anywhere in the payload — neither item tax nor packaging GST |

## 5. Impact of the new backend key (`gst_status`)

- ✅ Key already exists on the profile since 2026-06 and the FE already gates **menu bulk validation (V1)** and **bill display (BUG-336)** on it. What is *new* is the flat `basic.gst_status` on settings-list/update-settings.
- ✅ Not consumed: `restaurantSettingsTransform` still reads/writes `basic.gst.{status,code}`. If backend deprecates the object, the wizard toggle breaks silently (`gstEnabled` → `false`).
- ✅ Not applied: `orderTransform` (place/update order) and per-item `tax_amount` ignore the flag.
- Alignment proposal (for Planning, needs owner decisions):
  - `gst_status=false` → V1 off (already), **V2 off** (Aggregator 5 % rule suspended or converted to 0 %), order payload GST forced to 0 for `tax_type=GST` lines, VAT untouched.
  - `gst_status=true` → V1 on for all non-packaged items **in every screen** (bulk, form, import feedback), V2 stays but must **yield to packaged items** (OD needed: Aggregator packaged → allow any GST rate ≥ 0 / require MRP-inclusive?).
  - Packaging: `pack_charges` is a price component, not a tax — keep independent of gst_status; if the business needs GST on packaging, backend must add a `pack_charges_gst` (like `deliver_charge_gst`) before FE can compute or validate it.

## 6. Expected vs actual

| Scenario | Expected | Actual |
|---|---|---|
| GST OFF, item with `tax=5 GST`, dine-in order | no GST in display, payload, bill | display 0 ✅ (BUG-336); **place-order payload carries tax_amount/gst_tax** ❌ |
| GST OFF, Aggregator menu edit | no GST requirement | forced GST 5 % ❌ (X2) |
| GST ON, Aggregator packaged item (water bottle 12 %) | saveable with real rate | rejected "must have exactly 5% GST" ❌ (X1) |
| GST ON, single-item form, `tax=0` non-packaged | rejected like BulkEditor | accepted ❌ (X3) |
| GST toggle in wizard | works with new flat key | works only while backend keeps `basic.gst` object ⚠️ |
| Settings-list `gst_status` type | same type as profile | `1` vs `true` ⚠️ |

## 7. FE / BE gaps → registered items

| ID | Type | Title | Priority / Risk | Classification |
|---|---|---|---|---|
| **BUG-454** | BUG | Order payload GST not gated by `gst_status` (`orderTransform.buildCartItem` / `calcOrderTotals`) — BUG-336 gap | P0 / CRITICAL | FE_BUG (RELATED BUG-336) |
| **BUG-455** | BUG | Single-item `ProductForm` lacks the CR-036-FU-03 tax-required rule (BulkEditor only) | P2 / MEDIUM | FE_BUG (RELATED CR-036-FU-03) |
| **CR-387** | CR | Align menu GST/packaging validation with `gst_status` (X1 · X2 · X4 + flat `basic.gst_status` consumption in settings wizard) | P1 / HIGH | FE_FIX + OWNER_DECISION + BACKEND_ASK |
| Backend brief | — | `BACKEND_BRIEF_CR-387_2026-09-24.md`: (a) `basic.gst_status` vs `basic.gst.status` — same column? deprecation plan? (b) profile `true` vs settings `1` type; (c) server-side validation rules on add/edit/import for tax vs packaged/pack_charges; (d) is a packaging-GST key planned? | — | CONTRACT question |

## 8. What must change before Planning (Gate 2 entry conditions)
1. Backend answers (a)–(d) above — especially (a) so the wizard write path can be planned, and (c) so FE rules don't contradict server rules.
2. Owner decisions: **OD-387-01** Aggregator + packaged item → which GST rule wins? **OD-387-02** when `gst_status=false`, should Aggregator items be saved with 0 % or should the Aggregator menu be blocked? **OD-387-03** should Excel import get FE-side pre-validation (pre-parse) or rely on backend errors? **OD-387-04** packaging GST — out of scope until backend key exists?
3. BUG-454 can go to Planning immediately (no OD): gate `buildCartItem` tax on `gstStatus` like BUG-336; hotspot `orderTransform.js` (R5) + financial (R6) → full gate flow, owner Gate-4 GO, E2E money regression.

## 9. Assumptions (not verified)
- ⚠️ Backend stores one GST flag; `basic.gst.status` and `basic.gst_status` are two views of it.
- ⚠️ Backend re-computes or trusts FE `tax_amount` on place-order — the audit engine (`orderLedgerAuditEngine.js`) treats backend-stored `gst_tax_amount` as truth, which suggests the FE payload is persisted as-is.
- ⚠️ No server-side GST validation on add/edit — inferred from the FE having to add V1/V2 (CR-036-FU-03, BUG-391), not proven.

## 10. Retroactive candidates
NONE (gst_status consumption is already registered as CR-036-FU-03).
