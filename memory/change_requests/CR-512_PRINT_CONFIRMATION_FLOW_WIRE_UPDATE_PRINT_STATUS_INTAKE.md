# CR-512 — Print Confirmation Flow: Wire `update-print-status` + `print-logs` APIs

**ID:** CR-512
**Type:** CR (new feature — 3 backend APIs never wired in frontend)
**Priority:** P0 (blocks BUG-583 visual activation + CR-489 edit-after-print lock)
**Risk:** HIGH
**Risk Reason:** Touches R5 hotspot (OrderEntry.jsx), 10 files / 15 call sites, socket interaction, print flow is production-critical
**Process required:** Full gate flow (NOT Fast Lane eligible — R5 hotspot, 10 files, socket)
**Sprint:** nov_cr_batch
**Registered:** 2026-11-06
**Registered by:** INTAKE agent

---

## Source

- **Source:** AGENT-DISCOVERED during BUG-583 Gate 5B owner smoke test (2026-11-06)
- **Confidence:** CONFIRMED — live API probe verified `bill_print` stays `"No"` after print; handover doc read and traced
- **Backend handover:** `frontend-handover-printing.md` (6 Nov 2026, uploaded in chat)

---

## Duplicate Check

- **Classification: DISTINCT**
- No existing CR covers `update-print-status` or `print-logs` API integration
- **RELATED items:**
  - BUG-583 — card green rendering (GATE_5A, activates when this CR delivers `bill_print: "Yes"`)
  - CR-489 — edit-after-print lock (depends on `bill_print` detection)
  - CR-500 / CR-501 — printer agent tracking items (TRACKING ONLY, different scope)

---

## Code Reality

- **NONE** — all 3 endpoints are absent from `constants.js`, no service functions, no callers
- `printOrder()` in `orderService.js` EXISTS — sends to `order-temp-store` (printer queue) only, fire-and-forget

---

## Summary

Backend delivered 3 new print APIs in `frontend-handover-printing.md` (6 Nov 2026). None are wired in the frontend. Without calling `update-print-status` after a successful bill print, `bill_print` stays `"No"` forever — BUG-583 green cards never activate, and CR-489 cannot detect "bill was printed."

---

## Backend APIs to Wire (from handover)

| # | Method | Endpoint | Purpose | Priority |
|---|--------|----------|---------|----------|
| **1** | POST | `/api/v2/vendoremployee/print/update-print-status` | Confirm bill/KOT print success → sets `bill_print: "Yes"` + emits `update-order` socket | **P0 — required for BUG-583 + CR-489** |
| **2** | POST | `/api/v2/vendoremployee/print/print-logs` | Log print events (queued/success/failed) with error details | P1 — observability |
| **3** | GET | `/api/v2/vendoremployee/print/print-logs` | Read print logs with filters + pagination | P2 — reporting/debug UI |

---

## Current Flow (incomplete)

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
   → Backend sets bill_print = "Yes" on order row
   → Backend emits update-order socket event
   → All connected clients receive bill_print: "Yes"
   → BUG-583 green card activates ✅
3. On failure → POST /print-logs { order_id, print_status: "failed", error_message, error_log }
```

---

## Evidence

- **Live API probe:** `memory/evidence/BUG-583/LIVE_PROBE_2026_11_06.md`
  - After printing order #021104 (id 1537757), `bill_print` still `"No"` in orders-list
  - Print response: `{ status: true, message: "Order stored in temp table" }`
- **Backend handover:** `frontend-handover-printing.md` (uploaded in chat, not in repo)
  - §2 `update-print-status`: payload `{ order_id, bill_print: "Yes" }` → sets counter + emits socket
  - §"Suggested frontend flow": explicitly states FE must call confirmation after success
- **Steps to reproduce:**
  1. Login as manager@cafe103.com on preprod
  2. Tap "Bill" on any order card → prints
  3. Re-fetch `employee-orders-list` → `bill_print` still `"No"`
  4. Card stays white (BUG-583 green never triggers)

---

## Blast Radius

- **~10 files, 15 active call sites** (12 bill + 3 KOT)
- **Hotspot files touched:**
  - YES: `OrderEntry.jsx` (R5) — 5 bill print calls
  - YES: `DashboardPage.jsx` (R5) — 1 comment-only reference
  - `OrderCard.jsx` (R5-adjacent) — 1 bill + 1 KOT call
  - `TableCard.jsx` — 1 bill + 1 KOT call
  - `RePrintButton.jsx` — 1 bill + 1 KOT call
  - `OrderDetailSheet.jsx` — 1 bill call
  - `PmsCheckoutDrawer.jsx` — 1 bill call
  - `FolioCheckoutPanel.jsx` — 1 bill call
  - `AllOrdersReportPage.jsx` — 1 bill call
  - `OrderReportBetaPage.jsx` — 1 bill call
- **Estimated scope:** MEDIUM (2 new files: constants + service; 1 modified file: orderService.js)
- **Cleanest approach:** Add confirmation inside `printOrder()` itself — all 15 callers get it for free, **zero caller changes needed**

---

## Open Decisions — ALL LOCKED (owner 2026-11-06)

| OD | Decision | Owner choice |
|----|----------|-------------|
| **OD-512-01** | Where to add confirmation call? | **(a) Inside `printOrder()`** — 1 file, all callers get it for free |
| **OD-512-02** | Confirm KOT prints too, or bill only? | **(b) Both bill and KOT** |
| **OD-512-03** | Wire print-logs (failure logging) in same CR or defer? | **(b) Defer** to separate CR — only success confirmation in CR-512 |
| **OD-512-04** | Reprint increments counter — acceptable? | **Yes** — counter is backend-internal; FE only sees "Yes"/"No" flag (Yes when counter > 0). Reprints keep flag at "Yes". No FE impact. |

---

## What NOT to Do

- **Do NOT revert BUG-583** — rendering code is correct and verified. It activates the moment `bill_print: "Yes"` arrives via socket.
- **Do NOT modify `order-temp-store`** — that endpoint is the printer queue, not the confirmation.
- **Do NOT call confirmation on preview/failure** — handover explicitly warns: "Do not call confirmation on preview, queueing or failure."
- **Do NOT auto-retry** — handover warns: "Do not automatically retry a timed-out confirmation without checking the saved state: it is additive, not idempotent."
