# QA Handover — POS 4.0 Retroactive Batch (7 Missed CRs)

**Created:** 2026-06-14
**Scope:** 7 CRs found implemented in code but not reflected in registries
**Test Account:** owner@welcomeresort.com / Qplazm@10 (RID 474) + owner@palmhouse.com / Qplazm@10 (RID 541)
**Login API:** `POST https://preprod.mygenie.online/api/v1/auth/vendoremployee/login`
**Preview URL:** https://mygenie-pos-ui-3.preview.emergentagent.com

---

## CR-027 — Unified Toast & Error Surfacing (Phase 1)

**What was implemented:** Axios response interceptor with 6-branch error message extraction.

| # | Test Case | Steps | Expected |
|---|-----------|-------|----------|
| 27.1 | Interceptor exists | View `src/api/axios.js` line 54+ | CR-027 Phase 1 comment + 6-branch chain |
| 27.2 | Laravel 422 parsing | Send invalid login (wrong password) | Error toast shows readable message, not raw JSON |
| 27.3 | Timeout handling | (Code review) Check `ECONNABORTED` branch | Friendly "Request timed out" message |
| 27.4 | Unit tests pass | `npx craco test --testPathPattern=cr027` | 24/24 PASS |

---

## CR-028 — Item-Level Discount

**What was implemented:** Per-item discount distribution via largest-remainder rounding, `give_discount` exclusion, coupon rejection for non-eligible items, GST recompute on post-discount base.

| # | Test Case | Steps | Expected |
|---|-----------|-------|----------|
| 28.1 | give_discount mapped | View `productTransform.js:136` | `giveDiscount: api.give_discount !== 'No'` |
| 28.2 | Per-item distribution | View `orderTransform.js:476-535` | Largest-remainder function with coupon Phase 3B support |
| 28.3 | Place Order payload | View `orderTransform.js:1202-1230` | `discount_amount` injected per item (not hardcoded '0.00') |
| 28.4 | Collect Bill payload | View `orderTransform.js:1508-1537` | Same per-item injection on collect bill path |
| 28.5 | Exclusion in CollectPayment | View `CollectPaymentPanel.jsx:515-534` | `discountableTotal` excludes `giveDiscount=false` items |
| 28.6 | Exclusion in CartPanel | View `CartPanel.jsx:360-394` | Same exclusion logic |
| 28.7 | Coupon rejection | View `CollectPaymentPanel.jsx:885` | Coupon targeting give_discount='No' item → rejected |
| 28.8 | Browser: Apply discount | Login → Place order → Apply 20% discount → Open Network → check payload | `discount_amount` per item should NOT be '0.00' |

---

## CR-036 — Bulk Editor Add Item Row

**What was implemented:** Top-pinned new row with auto-focus, visible regardless of search filter.

| # | Test Case | Steps | Expected |
|---|-----------|-------|----------|
| 36.1 | Add Item button | Login → Menu Management → Bulk Edit → click "+ Add Item" | New row appears at TOP of list |
| 36.2 | Auto-focus | After adding | Name input of new row is focused |
| 36.3 | Search filter bypass | Type in search → Add Item | New row still visible despite filter |
| 36.4 | Unit tests | `npx craco test --testPathPattern=cr036` | 31/31 PASS |

---

## CR-036-FU-01 — Validation UX Polish

| # | Test Case | Steps | Expected |
|---|-----------|-------|----------|
| FU01.1 | Validation on Save | Add empty row → click Save | Specific toast: "Row 1 — Name is required. +N more" |
| FU01.2 | Red border | After failed save | Row has `border-l-4 border-l-red-500` |
| FU01.3 | Cell tint | After failed save | Failing cells have `bg-red-100/60` tint |
| FU01.4 | Trash2 icon | New row (`_isNew`) | Shows red Trash2 icon (not RotateCcw) |
| FU01.5 | Scroll to first error | Multiple errors → Save | Scrolls to first failing row |

---

## CR-036-FU-02 — Column Reorder + Sold By

| # | Test Case | Steps | Expected |
|---|-----------|-------|----------|
| FU02.1 | Column order | Open Bulk Editor | Tax Type column appears BEFORE Tax % |
| FU02.2 | Sold By visible | Open Bulk Editor | "Sold By (Unit)" column visible by default (Tier 1) |
| FU02.3 | Label matches | Compare to ProductForm single-add | Both say "Sold By (Unit)" |

---

## CR-036-FU-03 — Tax Validation + Backdrop Loader

| # | Test Case | Steps | Expected |
|---|-----------|-------|----------|
| FU03.1 | Tax required | Login as restaurant with GST → Add Item → leave Tax Type empty → Save | Validation error: "GST or VAT tax required" |
| FU03.2 | Packed exemption | Add Item → set Packaged Item = Yes → leave tax empty → Save | No tax validation error (packed items exempt) |
| FU03.3 | Backdrop overlay | During menu load | Semi-transparent overlay with "Loading menu…" text |
| FU03.4 | gstStatus in profile | View `profileTransform.js:175-176` | `gstStatus: api.gst_status === true` |

---

## CR-029-QSR — QSR Payload Parity + round_up

| # | Test Case | Steps | Expected |
|---|-----------|-------|----------|
| QSR.1 | round_up persists | QSR mode → Place & Pay → check Network payload | `round_up` field is real numeric (not hardcoded 0) |
| QSR.2 | round_up on Collect Bill | Existing order → Collect Bill → check payload | `round_up` from `paymentData.roundOff` |
| QSR.3 | Category discount fields | Apply category discount → check payload | `discount_member_category_id` and `name` populated |
| QSR.4 | Unit tests | `npx craco test --testPathPattern=cr029` | 11/11 PASS |

---

## Regression Tests

| # | Test | Expected |
|---|------|----------|
| R-1 | Dashboard loads after login | No errors, orders visible |
| R-2 | Menu Management → Bulk Edit | Opens, items load, columns visible |
| R-3 | Insights reports load | Cache + strip working |
| R-4 | Settlement panel | KPIs correct |

---

*QA Handover — 2026-06-14. 7 CRs, ~25 test cases + 4 regression.*
