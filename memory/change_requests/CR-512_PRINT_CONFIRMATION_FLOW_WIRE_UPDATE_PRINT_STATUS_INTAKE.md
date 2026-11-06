# CR-512 — Print Confirmation Flow: Wire `update-print-status` + `print-logs` APIs

**ID:** CR-512
**Type:** CR
**Priority:** P0 (blocks BUG-583 visual activation + CR-489 edit-after-print lock)
**Risk:** HIGH (touches R5 hotspot OrderEntry.jsx, 10 call sites across 10 files, socket interaction)
**Sprint:** nov_cr_batch
**Source:** AGENT-DISCOVERED (INTAKE role, 2026-11-06 — gap found during BUG-583 Gate 5B owner smoke)
**Related:** BUG-583 (GATE_5A — rendering done, waiting for this), CR-489 (edit-after-print lock — depends on bill_print)

---

## Summary

Backend delivered 3 new print APIs in `frontend-handover-printing.md` (6 Nov 2026). None are wired in the frontend. Without calling `update-print-status` after a successful bill print, `bill_print` stays `"No"` forever — BUG-583 green cards never activate, and CR-489 cannot detect "bill was printed."

## Backend APIs to Wire (from handover)

| # | Method | Endpoint | Purpose | Priority |
|---|--------|----------|---------|----------|
| **1** | POST | `/api/v2/vendoremployee/print/update-print-status` | Confirm bill/KOT print success → sets `bill_print: "Yes"` + emits `update-order` socket | **P0 — required for BUG-583 + CR-489** |
| **2** | POST | `/api/v2/vendoremployee/print/print-logs` | Log print events (queued/success/failed) with error details | P1 — observability |
| **3** | GET | `/api/v2/vendoremployee/print/print-logs` | Read print logs with filters + pagination | P2 — reporting/debug UI |

## Current Flow (broken)

```
User taps "Bill" → printOrder() → POST /order-temp-store → "Stored in temp table" → DONE
                                                                    ↓
                                                   bill_print stays "No" forever
                                                   BUG-583 green card never shows
```

## Required Flow (from handover §"Suggested frontend flow")

```
1. User taps "Bill" → printOrder() → POST /order-temp-store → printer queue
2. On success → POST /update-print-status { order_id, bill_print: "Yes" }
   → Backend sets bill_print = "Yes" on order
   → Backend emits update-order socket
   → All connected clients get bill_print: "Yes"
   → BUG-583 green card activates ✅
3. On failure → POST /print-logs { order_id, print_status: "failed", error_message, error_log }
```

## Code Reality

- `update-print-status`: **NONE** — endpoint not in `constants.js`, no service function, no callers
- `print-logs` POST: **NONE**
- `print-logs` GET: **NONE**
- `printOrder()` in `orderService.js`: EXISTS — currently fire-and-forget to `order-temp-store`

## Blast Radius

- **MEDIUM-LARGE** — 10 files call `printOrder()`:
  - `OrderCard.jsx` (R5-adjacent)
  - `OrderEntry.jsx` (R5 hotspot)
  - `RePrintButton.jsx`
  - `OrderDetailSheet.jsx`
  - `TableCard.jsx`
  - `DashboardPage.jsx`
  - `AllOrdersReportPage.jsx`
  - `OrderReportBetaPage.jsx`
  - `PmsCheckoutDrawer.jsx`
  - `FolioCheckoutPanel.jsx`
- **Cleanest approach:** Add confirmation inside `printOrder()` itself in `orderService.js` — all 10 callers get it for free, zero caller changes needed

## Open Decisions

| OD | Question | Options |
|----|----------|---------|
| OD-512-01 | Where to add confirmation call? | **(a) Inside `printOrder()` after success (recommended — 1 file, all callers get it)** / (b) At each call site (10 files) |
| OD-512-02 | Should confirmation fire for KOT too, or bill only? | (a) Bill only / **(b) Both bill and KOT (handover supports both)** |
| OD-512-03 | Wire print-logs (failure logging) in same CR or defer? | **(a) Same CR — log failures alongside confirmation** / (b) Defer to separate CR |
| OD-512-04 | Reprint increments counter again — is that acceptable? | Handover says yes ("Reprints are separate attempts") — **confirm with owner** |

## Evidence

- Live API probe: `memory/evidence/BUG-583/LIVE_PROBE_2026_11_06.md`
- Backend brief: `memory/backend_briefs/BACKEND_BRIEF_BUG-583_BILL_PRINT_NOT_SET_2026_11_06.md` (NOTE: this was filed before the handover was fully understood — the gap is FE-side, not backend-side)
- Backend handover: `frontend-handover-printing.md` (uploaded in chat 2026-11-06)

## Duplicate Check

- **DISTINCT** — no existing CR covers `update-print-status` or `print-logs` API integration
- **RELATED:** BUG-583 (rendering), CR-489 (edit-after-print lock), CR-500/CR-501 (printer agent tracking items)

## What NOT to Do

- **Do NOT revert BUG-583** — rendering code is correct and verified. It activates the moment `bill_print: "Yes"` arrives.
- **Do NOT modify `order-temp-store`** — that endpoint is the printer queue, not the confirmation.
- **Do NOT call confirmation on preview/failure** — handover explicitly warns against this.
