# POS3.0 BUG-097 Owner Smoke QA Checklist — 2026-05-20 (v5)

> **Purpose**: Structured smoke QA checklist — all Bucket 4.5 items owner-confirmed.
> **Version**: 5.0 — Waiting for Rider patch confirmed, Bucket 4.5 closed
> **Status**: BUCKET_4_5_OWNER_CONFIRMED

---

## A. Environment

| Field | Value |
|-------|-------|
| URL tested | `https://insights-phase.preview.emergentagent.com` |
| Backend API | `https://preprod.mygenie.online/` |
| Socket URL | `https://presocket.mygenie.online` |
| Restaurant ID / tenant | _(owner to fill)_ |
| `delivery_assign` value tested | _(owner to fill)_ |
| Order IDs tested | _(owner to fill)_ |
| Browser/device | _(owner to fill)_ |

---

## B. Dispatch Flow — `delivery_assign = No`

| # | Test Step | Expected | Result |
|---|-----------|----------|--------|
| B1 | Place/locate delivery order | On dashboard | _(owner)_ |
| B2 | Move to ready (fOrderStatus 2) | Ready status | _(owner)_ |
| B3 | **Dispatch** button appears | Visible | _(owner)_ |
| B4 | **Assign Rider** does NOT appear | Not visible | _(owner)_ |
| B5 | KOT hidden | No printer icon | _(owner)_ |
| B6 | Click Dispatch | API fires | _(owner)_ |
| B7 | Success toast | "Order dispatched" | _(owner)_ |
| B8 | Card updates | Status progresses | _(owner)_ |
| B9 | No console error | Clean | _(owner)_ |

---

## C. Assign Rider Flow — `delivery_assign = Yes`

| # | Test Step | Expected | Result | Notes |
|---|-----------|----------|--------|-------|
| C1 | Place/locate delivery order | On dashboard | _(owner)_ | |
| C2 | Move to ready (fOrderStatus 2) | Ready status | _(owner)_ | |
| C3 | **Assign Rider** button appears (no rider) | Visible | _(owner)_ | |
| C4 | **Dispatch** does NOT appear | Not visible | _(owner)_ | |
| C5 | KOT hidden | No printer icon | _(owner)_ | |
| C6 | Click Assign Rider — modal opens | Modal appears | _(owner)_ | |
| C7 | Rider list loads | Riders displayed | _(owner)_ | |
| C8 | Name + phone per rider | Visible | _(owner)_ | |
| C9 | Single-select radio works | One at a time | _(owner)_ | |
| C10 | Click Assign Rider CTA | Success toast, modal closes | _(owner)_ | |
| C11 | Success toast | "Rider assigned" + name | _(owner)_ | |
| **C12** | **IMMEDIATELY after modal closes: card shows "Reassign" (NOT Serve, NOT "Assign Rider")** | **"Reassign" button, no flicker to Serve/Assign** | _(owner — RETEST)_ | **Gap 2+3 fix: optimistic update + branching** |
| **C13** | **Rider name appears in rider section immediately** | **Assigned rider name + "Assigned" badge visible** | _(owner — RETEST)_ | **Gap 2 fix: optimistic riderStatus='riderAssigned'** |
| **C14** | **Click Reassign — modal opens with rider list, current rider pre-selected** | **Modal opens, assigned rider has "Current" tag** | _(owner — RETEST)_ | **Existing modal reuse** |
| C15 | Cancel button in modal works | Modal closes | _(owner)_ | |
| C16 | No console error | Clean | _(owner)_ | |

---

## C-SOCKET. Socket Payload Handling (Gap 1)

| # | Test Step | Expected | Result | Notes |
|---|-----------|----------|--------|-------|
| **CS1** | **After assign: check browser console for `delivery-assign-order: Transformed order ... from socket payload`** | **Log says "from socket payload" NOT "from API fallback"** | _(owner — NEW)_ | **Gap 1 fix: no get-single-order-new call** |
| **CS2** | **No `fetchSingleOrderForSocket` log after delivery-assign-order** | **No "Fetching order" log for this event** | _(owner — NEW)_ | **Confirms GET API skipped** |

---

## D. Delivered / Handover Flow

| # | Test Step | Expected | Result |
|---|-----------|----------|--------|
| D1 | Locate delivery order at fOrderStatus 5 | Card visible | _(owner)_ |
| D2 | Button says **Handover** (not "Bill") | Correct label | _(owner)_ |
| D3 | Click Handover | Bill print flow triggers | _(owner)_ |
| D4 | KOT hidden at fOrderStatus 5 | No printer icon | _(owner)_ |
| D5 | Status updates after handover | Order completes | _(owner)_ |
| D6 | Order removed from dashboard | Same as collect bill | _(owner)_ |
| D7 | Non-delivery labels unchanged | "Bill" not "Handover" | _(owner)_ |
| D8 | No console error | Clean | _(owner)_ |

---

## E. Non-Delivery Regression

| # | Test Step | Expected | Result |
|---|-----------|----------|--------|
| E1 | Dine-in: Ready/Serve/Bill unchanged | Correct | _(owner)_ |
| E2 | Room: C/Out label | Correct | _(owner)_ |
| E3 | Takeaway: unchanged | Correct | _(owner)_ |
| E4 | KOT visible for non-delivery | Present | _(owner)_ |
| E5 | Bill/Collect Bill labels unchanged | Correct | _(owner)_ |
| E6 | Merge/Shift/Transfer unchanged | Present | _(owner)_ |
| E7 | Prepaid/PAID badge | Correct | _(owner)_ |
| E8 | HOLD badge | Correct | _(owner)_ |

---

## F. Card View Regression

### F1. OrderCard (List View)

| # | Check | Expected | Result |
|---|-------|----------|--------|
| F1a | Delivery fOS2 no rider | Assign Rider | _(owner)_ |
| **F1b** | **Delivery fOS2 rider assigned (immediately after assign)** | **"Reassign" instantly, no flicker** | _(owner — RETEST)_ |
| F1c | Delivery fOS5 | Handover | _(owner)_ |
| F1d | No duplicate buttons | Clean | _(owner)_ |
| F1e | Non-delivery | Unchanged | _(owner)_ |

### F2. TableCard (Grid View)

| # | Check | Expected | Result |
|---|-------|----------|--------|
| F2a | Delivery fOS2 no rider | Assign | _(owner)_ |
| **F2b** | **Delivery fOS2 rider assigned (immediately after assign)** | **"Reassign" instantly, no flicker** | _(owner — RETEST)_ |
| F2c | Delivery fOS5 | Handover | _(owner)_ |
| F2d | No duplicate buttons | Clean | _(owner)_ |
| F2e | Non-delivery | Unchanged | _(owner)_ |

---

## G. Endpoint URLs

| Constant | URL | Status |
|----------|-----|--------|
| `DELIVERY_ORDER_ASSIGN` | `/api/v2/vendoremployee/order/delivery-order-assign` | Updated (prior patch) |
| `DELIVERY_ORDER_CANCEL` | `/api/v2/vendoremployee/order/delivery-order-cancel` | Updated (prior patch) |

---

## H. Pending / Blocked

| Item | Status | Dependency |
|------|--------|------------|
| Rider accept → "Rider On The Way" | BLOCKED | BQ-097-2 |
| Rider reject → Reassign + mark rejected | BLOCKED | BQ-097-3 |
| Bucket 5 | BLOCKED | BQ-097-2 + BQ-097-3 |
| `DeliveryCard.jsx` deletion | DEFERRED | Owner decision |

---

## Checklist Metadata

| Field | Value |
|-------|-------|
| Version | 5.0 |
| Updated | 2026-05-20 (Bucket 4.5 owner-confirmed) |
| Bucket 4.5 items | ALL CONFIRMED — Gap 1+2+3, Waiting for Rider label, TableCard height |
| Bucket 5 status | BLOCKED — rider accept/reject sockets pending backend event confirmation |
| Build status | PASS |
