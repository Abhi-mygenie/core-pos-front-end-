# CR-542 — Reason Mandatory on Every Make Unpaid

**Classification:** CR · **Client:** ALL · **Assignee:** Abhishek · **Priority:** P0 · **Status:** BACKEND_ENFORCING — FRONTEND_URGENT
**Source:** OWNER-REPORTED 2026-11-14 (Batch B Q&A, 526-02/08/09/11) · **Related:** CR-526, CR-515, BUG-671
**Backend handoff received:** 2026-11-26 (Gyan) · **Frontend unblocked:** 2026-11-26
**⚠️ ENFORCEMENT LIVE (2026-11-26):** Backend now rejects Make Unpaid calls without `unpaid_reason_id` → 422. Existing frontend (no reason sent) will fail for operators. Frontend implementation is URGENT.

---

## Description
**Current:** Making an order unpaid does not ask for a reason.
**Expected:** Every Make Unpaid action, everywhere it exists (dashboard, Audit report, Order Beta, Credit Management), requires a reason picked from a dropdown. The list is a **new, separate unpaid-reasons list** supplied by the backend (not the cancellation reasons list).

---

## Open Questions — ALL RESOLVED

| ID | Question | Decision |
|----|----------|----------|
| OD-542-01 | Priority? | **P0** (owner, Batch B Gate 2) |
| OD-542-02 | Optional notes box as well? | **YES** — `unpaid_note` optional free-text; backend accepts, stores, returns in reports |
| OD-542-03 | Where shown after? | Audit events + Combined daily report now include `unpaid_reason`, `unpaid_reason_id`, `unpaid_note`. Shown in Audit log + Order Beta report |
| OD-542-SEED | Who seeds reasons per restaurant? | **Backend (Gyan)** — backend will seed initial list per restaurant before go-live. FE dropdown will never be empty on launch |
| OD-542-ROOM | Remove from Room in scope? | **YES** — Gate 2.5 owner decision OD-542-B confirmed |
| OD-542-V1V2 | V1 or V2 endpoints? | Backend delivered on **V1** (not V2 as originally locked). Contract delta documented below |

---

## Contract Delta — LOCKED v1 (2026-11-15) vs ACTUAL DELIVERED (2026-11-26)

> Original contract (`contracts/BATCH-B_CR-542_API_CONTRACT_2026_11_15.md`) assumed V2 endpoints and `reason` text field. Backend delivered on V1 with `reason_id` integer. Frontend must follow the **ACTUAL DELIVERED** contract below.

| Item | Locked v1 (Nov-15) | Actual Delivered (Nov-26) | Frontend action |
|------|--------------------|--------------------------|-----------------|
| Reasons endpoint | `GET /api/v2/vendoremployee/unpaid-reasons` | `GET /api/v1/vendoremployee/unpaid-reasons` | Use V1 |
| Reasons mgmt | `GET ?include_inactive=1`, `POST`, `PUT /{id}` | Same paths but on V1 | Use V1 |
| Make Unpaid endpoint | `PUT /api/v2/vendoremployee/order/make-order-unpaid` | `POST /api/v1/vendoremployee/make-order-unpaid` **and** `POST /api/v1/vendoremployee/order/make-order-unpaid` | Switch to V1 POST; existing V2 endpoint unchanged — do NOT use it for CR-542 |
| Reason field name | `reason` (string, text) | `unpaid_reason_id` (integer, required) | Send ID not text |
| Notes field | Not in contract | `unpaid_note` (string, optional, `null` or omit → stored as `""`) | Add optional note field to dialog |
| "Other" + free text | Yes (OD-B-BB05-REASON) | Not applicable — backend manages list; no "Other" type | Remove "Other" branch |
| Error code | `UNPAID_REASON_REQUIRED` | 422 on missing/invalid `unpaid_reason_id` | Handle 422 on submit |

---

## Backend Endpoints — Ready on Preprod

| Endpoint | Method | Purpose | Status |
|----------|--------|---------|--------|
| `/api/v1/vendoremployee/unpaid-reasons` | GET | Active reasons for restaurant | ✅ Live |
| `/api/v1/vendoremployee/unpaid-reasons?include_inactive=1` | GET | All reasons (settings mgmt) | ✅ Live |
| `/api/v1/vendoremployee/unpaid-reasons` | POST | Add new reason `{ reason, is_active? }` | ✅ Live |
| `/api/v1/vendoremployee/unpaid-reasons/{id}` | PUT | Rename / enable / disable `{ reason?, is_active? }` | ✅ Live |
| `/api/v1/vendoremployee/make-order-unpaid` | POST | Mark unpaid (Audit, Order Beta, AllOrders) | ✅ Live — requires `unpaid_reason_id` |
| `/api/v1/vendoremployee/order/make-order-unpaid` | POST | Mark unpaid (Room/TAB path) | ✅ Live — requires `unpaid_reason_id` |

**Request body for both Make Unpaid endpoints:**
```json
{ "order_id": <int>, "unpaid_reason_id": <int>, "unpaid_note": "optional text or omit" }
```

**Reason object shape (GET response):**
```json
{ "id": 3, "reason": "Payment marked paid by mistake", "is_active": true }
```

---

## Reporting — What's Enriched

| Report endpoint | New fields returned |
|----------------|---------------------|
| `POST /api/v2/vendoremployee/report/insights-dashboard` | `unpaid_reason_id`, `unpaid_reason`, `unpaid_note` on `make_unpaid` events |
| `POST /api/v1/vendoremployee/daily-order-report-details-combined` | `unpaid_reason_id`, `unpaid_reason`, `unpaid_note` (latest snapshot) + `unpaid_history[]` per order row |
| `GET /api/v1/vendoremployee/employee-order-details?order_id=<id>` | `unpaid_history[]` array |

---

## Frontend Work Remaining — 5 Gaps

| # | File | Change |
|---|------|--------|
| 1 | `api/constants.js` | Add `UNPAID_REASONS: '/api/v1/vendoremployee/unpaid-reasons'` and `MAKE_ORDER_UNPAID_V1: '/api/v1/vendoremployee/make-order-unpaid'` |
| 2 | `api/services/paymentMutationService.js` | Add `fetchUnpaidReasons()`. Update `makeOrderUnpaid(orderId, reasonId, note)` → body `{ order_id, unpaid_reason_id, unpaid_note }` via V1 |
| 3 | `components/reports/MarkUnpaidConfirmDialog.jsx` | Fetch reasons on open; show dropdown of active reasons + optional note textarea; disable confirm until reason selected |
| 4 | 4 call sites | Pass `reasonId` + `note` from dialog callback: `AllOrdersReportPage:716`, `RoomOrdersReportPage:416`, `OrderReportBetaPage:370`, `CreditCustomerDetailSheet:309` |
| 5 | Display in reports | Show `unpaid_reason` + `unpaid_note` in Audit log event row + Order Beta unpaid row (per OD-542-03) |

**All 5 are frontend tasks. No backend dependency remaining.**
