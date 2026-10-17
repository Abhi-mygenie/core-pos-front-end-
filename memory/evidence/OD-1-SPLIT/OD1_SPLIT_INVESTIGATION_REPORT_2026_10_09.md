# INVESTIGATION REPORT — OD-1 Split Button + Issue B Discount Alert

**Date:** 2026-10-09
**Role:** INVESTIGATION
**Items:** OD-1 (Split button), Issue B (Discount alert), Gate status confirmation
**Steps used:** 8/10

---

## 1. OD-1 — Split Button Missing

### Summary
Root cause: **CONFIG_ISSUE (backend)** — `partial` was not previously in `restaurants[0].payment_types` for RID 69.
Now that it IS present, **no FE code change is needed**. Recommend retest after fresh login.
Confidence: HIGH (code fully traced)

### API Endpoint Used
`GET /api/v1/vendoremployee/profile` (called once at `LoadingPage.jsx:363`)

Field path: `response.restaurants[0].payment_types` → field name: `payment_types` at `restaurants[0]` level (confirmed by `profileTransform.js:188` comment line 179: "sibling of `gst_code / payment_types`")

### Data Flow Trace
```
API: GET /api/v1/vendoremployee/profile
  → response.restaurants[0].payment_types
  → profileTransform.fromAPI.paymentTypes(api.payment_types)       [profileTransform.js:273]
  → restaurant.paymentTypes = [{id:9, name:"partial", ...}, ...]
  → RestaurantContext.paymentTypes                                  [RestaurantContext.jsx:74]
  → CPP: restaurantPaymentTypes = useRestaurant().paymentTypes      [CollectPaymentPanel.jsx:79]
  → filterLayoutByApiTypes(paymentLayoutConfig, restaurantPaymentTypes, hasRooms)
      ↳ id === 'split': apiPaymentTypes.some(pt => pt.name?.toLowerCase() === 'partial')
      ↳ "partial".toLowerCase() === "partial" → TRUE
  → enabledLayout.row2 = ["split", "credit", ...]
  → !isHoldContext (FolioCheckoutPanel passes NO allowedMethods) → TRUE  [CPP:375]
  → {!isHoldContext && enabledLayout.row2.includes('split') && <Split button />}  [CPP:2730/2733]
  → SPLIT BUTTON RENDERS ✅
```

### Why It Was Missing Before
Before `partial` was added to RID 69's `payment_types`:
- `apiPaymentTypes.some(pt => pt.name === 'partial')` = FALSE
- `enabledLayout.row2` did NOT include `split`
- Split button not rendered → confirmed missing

### Now (with partial in payment_types)
Split button SHOULD appear on next login (fresh profile fetch).

### Recommendation
**No FE code change needed.**
**Action for owner:** Fresh login (force new profile fetch) → open Folio checkout → verify Split button appears.

If Split STILL does NOT appear after fresh login → escalate as FE_BUG with new evidence (likely `payment_types` is at ROOT level, not `restaurants[0]`).

### Hypotheses Tested
| # | Hypothesis | Test Method | Result |
|---|---|---|---|
| H1 | `partial` missing from backend payment_types for RID 69 | Owner-provided API evidence | CONFIRMED was true, now RESOLVED |
| H2 | FE reads wrong nesting level (root vs restaurants[0]) | Code trace profileTransform.js:188 + comment L179 | ELIMINATED — code reads `restaurants[0].payment_types` per design |
| H3 | `allowedMethods` prop hides Row 2 in Folio context | Code trace FolioCheckoutPanel.jsx:365-385 | ELIMINATED — no `allowedMethods` passed |
| H4 | `isRoom` prop suppresses Split | Code trace CPP:2730-2733 | ELIMINATED — no isRoom guard on Split |
| H5 | Context (RestaurantProvider) not available in PMS | AppProviders.jsx checked | ELIMINATED — all routes wrapped |

---

## 2. Issue B — Room Discount Alert Not Showing

### Summary
Root cause: **CODE_ERROR** — `onChange` in `RoomDiscountControls` clamps value at `maxPct`, making `discountOverMax` permanently false.
Confidence: HIGH

**File:** `/app/frontend/src/components/pms/frontdesk/FolioCheckoutPanel.jsx`

### Root Cause Detail

**Line 74 (onChange):**
```js
onChange={e => setRoomDiscount(Math.min(
  Math.max(0, parseFloat(e.target.value) || 0),
  roomDiscountType === 'Percent' ? maxPct : (maxCheckoutDiscount ?? baseBalance ?? ...)
))}
```
→ `roomDiscount` is ALWAYS clamped ≤ maxPct → can never exceed it.

**Line 54 (discountOverMax):**
```js
const discountOverMax = roomDiscountType === 'Percent' && Number(roomDiscount) > maxPct;
```
→ Always false (because onChange clamps). Also: only checks Percent mode — Amount mode not covered (unlike CheckInForm which checks both via BUG-507).

**Alert at L87:** `{discountOverMax && <alert />}` → never renders.

### Gate Status for Issue B
```
Gate 0 (Registration):  NOT DONE — no BUG ID assigned
Gate 1 (Intake):        NOT DONE
Gate 2 (Impact):        NOT DONE
Gate 3 (Plan):          NOT DONE
Gate 4 (GO):            NOT DONE
Gate 5a (Implementation): NOT DONE
```
**Zero gates passed. Investigation findings only.**

### Planning Skip Eligibility
| Criterion | Status |
|---|---|
| Owner "FAST LANE APPROVED" | NOT YET — needs owner approval |
| 1 file only | ✅ `FolioCheckoutPanel.jsx` |
| ≤10 changed lines | ✅ ~4 lines |
| No API/state/localStorage change | ✅ |
| Not R5 hotspot | ✅ (`FolioCheckoutPanel` is NOT in R5 list) |
| Not R6 financial | ✅ (UI validation alert, not money calculation) |

**Planning skip IS eligible pending owner approval.**

Fix scope (~4 lines):
1. `onChange` L74: remove `Math.min` cap for Percent mode (let user type freely so alert can trigger)
2. `discountOverMax` L54: extend to Amount mode (mirror CheckInForm BUG-507 pattern)

---

## 3. Gate Status Summary (all items)

| Item | Last Completed Gate | Next Gate |
|---|---|---|
| BUG-516 | Gate 5A (Implemented) | Gate 5B (QA) — pending |
| BUG-517 | Gate 5A (Implemented) | Gate 5B (QA) — pending |
| BUG-518 | Gate 5A (Implemented) | Gate 5B (QA) — pending |
| BUG-519 | Gate 5A (Implemented) | Gate 5B (QA) — pending |
| BUG-522 | Gate 5A (Implemented) | Gate 5B (QA) — pending |
| Issue B (Discount Alert) | **NONE** (unregistered) | Gate 1 (Intake/Register) OR Planning Skip if owner approves |
| OD-INV2-01 (CPP room price) | NONE — open OD | Awaiting owner decision |

---

## 4. Evidence Artifacts
- Saved to: `/app/memory/evidence/OD-1-SPLIT/`
- Code traces: `profileTransform.js:77-188`, `paymentMethods.js:188-216`, `CollectPaymentPanel.jsx:79-102,2723-2746`
- Curl probe: BLOCKED (preprod login returns 404 from pod — IP restriction, consistent with prior CORS findings)

---

## 5. Recommendations

| Item | Classification | Action | Owner Decision Needed |
|---|---|---|---|
| OD-1 Split | CONFIG_ISSUE (resolved by backend) | Retest after fresh login | Confirm Split now shows |
| Issue B (alert) | CODE_ERROR | Planning skip if owner approves | YES — approve fast lane first |
| OD-INV2-01 | OD still open | Cannot plan without owner answer | YES — Is Split room payment mandatory? |

