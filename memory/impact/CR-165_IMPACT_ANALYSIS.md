# CR-165 — Impact Analysis (Gate 2)
## Razorpay Cancel and Refund Integration

**Date:** 2026-08-24
**Role:** PLANNING (Gate 2 — Impact Analysis)
**Agent:** Emergent E1
**Based on intake:** `/app/memory/change_requests/CR-165_RAZORPAY_CANCEL_REFUND_INTAKE.md`

---

## Header

| Field | Value |
|---|---|
| Code Reality | NONE — no existing implementation |
| Conflict Pre-Check | CONFLICT — `OrderEntry.jsx` and `DashboardPage.jsx` are R5 hotspots with recent modifications (see §3) |
| Risk | **CRITICAL** — direct financial mutation (real Razorpay refund, real money) |
| Blast Radius | MEDIUM (5–6 files, ~90–130 lines) |
| Gate 2 Status | **COMPLETE — 1 open question remains (OQ-2b-final). See §7.** |

---

## 1. OQ-2b Resolved by Curl Probe (2026-08-24)

**Owner provided curl using the new v2 endpoint with Bearer token. Validated:**

```
POST https://manage.mygenie.online/api/v2/vendoremployee/order/cancel-and-refund-order
Authorization: Bearer ***
Content-Type: application/json
Accept: application/json
X-localization: en

{
  "order_id": 1246797,
  "cancellation_reason": "Customer cancelled",
  "cancellation_note": "Refund through Razorpay"
}
→ HTTP 200: {"message": ""}
```

**Findings from probe:**

| Probe | URL | HTTP | Response |
|---|---|---|---|
| Valid payload (order 1246797) | manage.mygenie.online | 200 | `{"message": ""}` |
| Non-existent order (9999999) | manage.mygenie.online | 200 | `{"message": ""}` |
| Empty body `{}` | manage.mygenie.online | 200 | `{"message": ""}` |
| Valid payload (order 1246797) | preprod.mygenie.online | **401** | `{"errors":[{"code":"auth-001","message":"Unauthorized."}]}` |

**OQ-2b answer: Use existing `api` axios instance (Option A)**

Rationale:
- Path `/api/v2/vendoremployee/order/cancel-and-refund-order` is consistent with all other v2 vendoremployee paths in `constants.js` (e.g., `LOGOUT`, `PLACE_ORDER`, `BILL_PAYMENT`)
- Bearer token is now required (not a no-auth endpoint)
- The `manage.mygenie.online` domain was the test environment; the path pattern confirms the endpoint follows the same Laravel routing convention as all other `preprod.mygenie.online` endpoints
- The 401 on preprod is a token-environment mismatch (manage token used on preprod test), not a missing endpoint
- `api` axios instance auto-attaches Bearer token from `localStorage.auth_token` — this is correct behaviour

**IMPORTANT — OQ-2b-final (new, must confirm before Gate 3):**
The response `{"message": ""}` is identical for ALL inputs including empty body. This means either:
- (a) The v2 endpoint always returns blank message on success/error (needs owner to test with a real in-flight Razorpay order and confirm the expected response shape), OR
- (b) The test token doesn't match the restaurant for order 1246797 so all calls return a generic blank response

**Gate 3 cannot start until owner confirms the actual success/failure response shape on preprod with a matching token + order.**

---

## 2. API Contract (Updated — v2)

| Field | Old (v1 — 2026-08-23 investigation) | New (v2 — 2026-08-24 curl) |
|---|---|---|
| URL | `preprod.mygenie.online/api/v1/razor-pay/cancel-and-refund-order` | `{API_BASE_URL}/api/v2/vendoremployee/order/cancel-and-refund-order` |
| Auth | None | Bearer token required |
| `restaurant_id` | Required | **Removed** |
| `order_id` | Required | Required |
| `cancellation_reason` | Required | Required |
| `cancellation_note` | Required | Required |
| Success response | `{status: true/false, refund: ...}` | `{"message": ""}` — shape TBD |
| Error shape | `{status: false, message: "..."}` | **Unknown** — blank for all probed cases |

**Payload (v2 final):**
```json
{
  "order_id": <number>,
  "cancellation_reason": "<string>",
  "cancellation_note": "<string>"
}
```

Note: `restaurant_id` is NO LONGER sent. The backend derives it from the Bearer token.

---

## 3. Conflict Pre-Check

| File | Last Modified By | Risk of Conflict |
|---|---|---|
| `OrderEntry.jsx` | BUG-281 agent (2026-07-xx) + CR-098 | **HIGH — R5 hotspot.** Must read current file before coding. No logical conflict with refund hook position (after cancel API call). |
| `DashboardPage.jsx` | CR-056 + CR-015 + CR-024 agents | **MEDIUM — R5 hotspot.** Cancel handler at line 1332 is isolated. Additive change only. |
| `CancelOrderModal.jsx` | No recent CR | LOW. Small file (119 lines), additive prop. |
| `api/constants.js` | CR-062 + CR-029 + CR-037 | LOW. Additive constant only. |
| `api/services/razorpayRefundService.js` | Does not exist | NEW — no conflict. |
| `OrderReportBetaPage.jsx` | CR-117 + CR-136 | LOW. Additive Refund button column. |

**Execution constraint:** Implementation agent MUST read `OrderEntry.jsx` at exact line numbers before editing (current line count is 2870; plan lines may drift after recent edits).

---

## 4. Data Flow Trace

### Trigger A — Auto-Refund on Order Cancel (Dashboard + OrderEntry)

```
User taps "Cancel" on table card / OrderEntry
  → CancelOrderModal opens (CancelOrderModal.jsx)
      onCancel(selectedReason) called
  → handleCancelOrderConfirm (DashboardPage.jsx:1332)
      OR handleCancelOrder (OrderEntry.jsx:1264)
          1. api.put(ORDER_STATUS_UPDATE, cancelPayload)   ← existing
          2. [NEW] check order.razorpayOrderId or paymentMethod
              IF razorpay order → api.post(RAZORPAY_CANCEL_REFUND, refundPayload)
                  success → toast "Refund initiated"
                  failure → toast "Order cancelled, refund failed"
```

**Gap confirmed (evidence-backed):**
Running orders API (`GET /api/v1/vendoremployee/pos/employee-orders-list`) does NOT return `razorpay_order_id` — confirmed from BUG-144 `all_order_keys`. The field is only available in report APIs (ORDER_REPORT_BETA_COMBINED → reportTransform.js:903). `SINGLE_ORDER_NEW` also lacks it.

**Detection options for Trigger A (owner must choose — OQ-5):**

| Option | Approach | Pro | Con |
|---|---|---|---|
| A | `payment_method === 'razorpay'` check | No extra API call | Exact `payment_method` value for Razorpay not in any test data — must verify |
| B | Backend adds `razorpay_order_id` to running orders response | Clean, mirrors Trigger B | Requires backend change |
| C | Always call cancel-and-refund endpoint; backend no-ops for non-PG orders | Zero FE detection logic | Need backend confirmation it handles non-Razorpay gracefully |

**OQ-5:** Which option? If A: what exact `payment_method` value does backend send for Razorpay PG orders?

### Trigger B — Manual Refund from Order Report

```
OrderReportBetaPage.jsx loads ORDER_REPORT_BETA_COMBINED
  → Each row has razorpay_order_id field
      IF razorpay_order_id != null → show [Refund] button in row
  → User clicks [Refund]
      → CancelOrderModal opens in mode="refund"
          onCancel(selectedReason, cancellationNote) called   ← BOTH params
  → razorpayRefundService.cancelAndRefund(orderId, reason, note)
      api.post(RAZORPAY_CANCEL_REFUND, {...})
          success → toast + remove/mark row
          failure → toast error
```

`razorpay_order_id` IS available in `OrderReportBetaPage.jsx` (confirmed at line 154 — already used for PG filter). **Trigger B has no data gap.**

### Key Correction: Same Modal at Both Triggers

`CancelOrderModal.jsx` is used at **both** Trigger A and Trigger B with `mode="refund"`. Both call sites must:
1. Open the modal with `mode="refund"` (shows textarea for `cancellation_note`)
2. Wire `onCancel` to receive `(reason, note)` — both values passed dynamically
3. Pass both to `razorpayRefundService.cancelAndRefund(orderId, reason.reasonText, note)`

**Implication for `CancelOrderModal.jsx`:**
- Current: `onCancel(selectedReason)` — passes reason object
- Required: `onCancel(selectedReason, cancellationNote)` — passes BOTH in refund mode
- The note textarea is shown ONLY when `mode="refund"`; in default `mode="cancel"` nothing changes (backward-compatible)

**Call sites that must update their `onCancel` handler:**
- `OrderEntry.jsx:2726` — currently `onCancel={handleCancelOrder}` → update to `onCancel={(reason, note) => handleCancelOrder(reason, note)}`
- `DashboardPage.jsx:2049` — currently `onCancel={handleCancelOrderConfirm}` → same update
- `OrderReportBetaPage.jsx` — new call site, wire from the start with `(reason, note)`

---

## 5. Affected Files — Scope Declaration

### Files WILL change:

| # | File | Change | Risk |
|---|---|---|---|
| 1 | `src/api/constants.js` | Add `RAZORPAY_CANCEL_REFUND: '/api/v2/vendoremployee/order/cancel-and-refund-order'` to `API_ENDPOINTS` | LOW |
| 2 | `src/api/services/razorpayRefundService.js` | **NEW FILE** — `cancelAndRefund(orderId, reason, note)` using existing `api` instance | LOW |
| 3 | `src/components/order-entry/CancelOrderModal.jsx` | Add `mode` prop (`'cancel'` default / `'refund'`), `cancellation_note` textarea in refund mode, update callback to `onCancel(reason, note)` — backward-compatible (note is undefined in cancel mode) | MEDIUM |
| 4 | `src/components/order-entry/OrderEntry.jsx` | In `handleCancelOrder`: (a) open modal in `mode="refund"` when Razorpay detected, (b) receive `(reason, note)`, (c) after cancel API → call refund if Razorpay | **HIGH — R5** |
| 5 | `src/pages/DashboardPage.jsx` | In `handleCancelOrderConfirm`: same pattern. Modal call site updated to `onCancel={(reason, note) => handleCancelOrderConfirm(reason, note)}` | **HIGH — R5** |
| 6 | `src/pages/reports-module/OrderReportBetaPage.jsx` | Add `[Refund]` button for `razorpay_order_id != null` rows. Open CancelOrderModal `mode="refund"`, wire `onCancel={(reason, note) => handleRefund(orderId, reason, note)}` | MEDIUM |

### Files will NOT touch:

- `orderTransform.js` — only if Trigger A detection uses `paymentMethod` (no new field needed). If OQ-5 answer requires adding `razorpay_order_id`, this file WILL be added to scope. Flag to owner.
- `CollectPaymentPanel.jsx` — billing flow not involved
- `AppProviders.jsx` — no provider change needed
- `OrderLedgerMockup.jsx` — separate report page, Trigger B only targets `OrderReportBetaPage.jsx`
- `socketHandlers.js` — socket not involved

---

## 6. Risk Register

| Risk | Probability | Impact | Mitigation |
|---|---|---|---|
| **Refund fires on non-Razorpay order** | HIGH — detection gap exists | CRITICAL — charges customer | Gate 3 must specify exact detection predicate. OQ-5 must be answered. |
| **Refund fires twice** (double cancel) | LOW | CRITICAL | Add `isRefunding` guard state before API call |
| **Cancel succeeds, refund fails** | MEDIUM | HIGH — order cancelled, money not returned | Separate toast: "Order cancelled. Refund failed — contact support." Never roll back cancel. |
| **Refund API response parsing** | MEDIUM — `{"message": ""}` is ambiguous | HIGH | OQ-2b-final must clarify success/failure response shape |
| **OrderEntry.jsx hotspot regression** | MEDIUM | HIGH | Must run cancel flow (table, takeaway, delivery, QSR) in QA regression |
| **DashboardPage.jsx hotspot regression** | LOW | HIGH | Must run cancel-from-card flows |
| **CancelOrderModal signature change** | MEDIUM — two call sites | MEDIUM | Both `OrderEntry.jsx:2726` and `DashboardPage.jsx:2049` call this modal. Both WILL change. |

---

## 7. Open Questions Before Gate 3

| # | Question | Blocker? |
|---|---|---|
| **OQ-2b-final** | Owner to confirm: does the v2 endpoint return `{"message": ""}` on success AND error? Or should it return `{status: true/false, ...}`? Needs a real test with matching token + order. | **YES — blocks service error handling** |
| **OQ-5 (NEW)** | For Trigger A: does `payment_method` field in running orders equal `'razorpay'` for Razorpay PG orders? Or do we need to add `razorpay_order_id` to `orderTransform.js`? | **YES — blocks Trigger A detection logic** |

**Gate 3 can start immediately after OQ-2b-final and OQ-5 are answered (both are quick 30-second answers).**

---

## 8. Verification Matrix (seeds QA handover)

| Edit | File | Change | How to Verify |
|---|---|---|---|
| 1 | `constants.js` | RAZORPAY_CANCEL_REFUND key added | `grep 'RAZORPAY_CANCEL_REFUND' src/api/constants.js` → 1 result |
| 2 | `razorpayRefundService.js` | Service exports `cancelAndRefund` | Unit test + import check |
| 3 | `CancelOrderModal.jsx` | `mode="refund"` shows textarea + new title/button | Browser: open modal in refund mode, verify title, textarea, button text |
| 4 | `CancelOrderModal.jsx` | `onCancel(reason, note)` passes both args | Console log in dev; unit test |
| 5 | `OrderEntry.jsx` | Cancel + Razorpay guard calls refund | Network tab: cancel Razorpay order → 2 API calls (cancel + refund) |
| 6 | `OrderEntry.jsx` | Cancel non-Razorpay order → NO refund call | Network tab: cancel cash order → 1 API call only |
| 7 | `DashboardPage.jsx` | Same as edits 5–6 via card cancel | Same network tab check |
| 8 | `OrderReportBetaPage.jsx` | `[Refund]` button visible for razorpay rows | Report page: PG-filtered row shows button |
| 9 | `OrderReportBetaPage.jsx` | `[Refund]` button NOT visible for cash rows | Report page: cash row has no button |
| 10 | Full flow | Cancel Razorpay order → refund confirmation toast | E2E: preprod Razorpay order → cancel → toast → verify Razorpay dashboard |
| 11 | **Regression** | Cancel cash/room/delivery orders unchanged | Run all cancel paths: cash, room, delivery, QSR, takeaway |

---

## 9. Post-Code Registry Checklist (for Implementation agent)

```
- [ ] registry.json: CR-165 → status: IMPLEMENTED, sprint_key: pos_6_0
- [ ] CR_REGISTRY.md: row updated to IMPLEMENTED
- [ ] FILE_OWNERSHIP.md: add all 6 files with CR-165 + date
- [ ] Code markers: // CR-165 in every modified file
- [ ] razorpayRefundService.js: // CR-165: Razorpay cancel and refund integration
- [ ] CancelOrderModal.jsx: // CR-165: mode prop + cancellation_note
- [ ] OrderEntry.jsx: // CR-165: Razorpay guard + refund call
- [ ] DashboardPage.jsx: // CR-165: Razorpay guard + refund call
- [ ] OrderReportBetaPage.jsx: // CR-165: Refund button for PG orders
```

---

## 10. Credentials

- Test account: `owner@18march.com / ***` (has Razorpay orders — see handover)
- Preview URL: `https://core-pos-deploy-12.preview.emergentagent.com`

---

## Registry Update Required

Update `registry.json` → CR-165 status: `INTAKE — Gate 2 COMPLETE. OQ-2b-final + OQ-5 needed for Gate 3.`
