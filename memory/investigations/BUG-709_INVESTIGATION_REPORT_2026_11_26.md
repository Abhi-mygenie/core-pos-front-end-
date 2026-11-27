# BUG-709 — Make Unpaid Audit Event Missing After Order Cancellation

**ID:** BUG-709
**Type:** BUG
**Area:** Reports / Audit Log
**Priority:** P0
**Status:** AWAITING_OWNER_UI_CONFIRM — likely NO DEFECT
**Client:** ALL
**Assignee:** Abhishek (FE confirm) · Backend: Gyan (investigated, no fix)
**Sprint:** nov_cr_batch
**Created:** pre-2026-11-19
**Backend handoff received:** 2026-11-26

---

## Symptom
The `make_unpaid` audit event was reported to disappear from the Audit Dashboard after the order is subsequently cancelled.

---

## Investigation History

### Round 1 — 2026-11-19 (IA probe, ruby order 000802)
Live probe on `ruby.com` restaurant, order 000802. Operations trail: `bill_print → paid(upi) → make_unpaid → order_cancel`.

**Finding:** `insights-dashboard` `audits.orders[]` **DOES contain** the `make_unpaid` event for the cancelled order. A new distinct `cancel_after_unpaid` event also appears alongside it. The two events **coexist** — no overwrite, no drop.

**Frontend code review (`AuditLogMockup.jsx`):** `make_unpaid` events are pulled from `allEvents` (line 252) with no order-status filter. Card 1 (make_unpaid) and Card 2 (cancel_after_unpaid) are computed independently — no logic suppresses a `make_unpaid` row when a `cancel_after_unpaid` appears for the same order.

**Owner response (2026-11-19):** "I will check and confirm." — still pending at that time.

**Gate at close of Nov-19 session:** `GATE_2_IA_AWAITING_OWNER`

---

### Round 2 — 2026-11-26 (Backend independent verification, preprod restaurant 672)
Backend (Gyan) ran a fresh reproduction sequence on preprod. Full operations trail: order placed → paid → `make-order-unpaid` → `order-status-update` (cancelled).

**Finding (verbatim from backend handoff):**
- `make_unpaid` event **persists** in both `insights-dashboard` and `employee-order-details.unpaid_history` after cancellation
- A distinct `cancel_after_unpaid` event is generated alongside
- `buildInsightsAuditData()` reads from `order_lifecycle_logs` by `created_at` only — never joins or filters on current order status
- No backend code fix made or deemed necessary

**Evidence payloads confirmed:**
```json
// insights-dashboard — BOTH events present after cancel:
{ "type": "make_unpaid", "order_id": "000845", "unpaid_reason_id": 3, "unpaid_reason": "Payment marked paid by mistake", "unpaid_note": "BUG709 QA..." }
{ "type": "cancel_after_unpaid", "order_id": "000845", "scope": "item", "made_unpaid_at": "...", "gap_minutes": 0 }

// employee-order-details.unpaid_history — present after cancel:
{ "id": 2813581, "created_at": "2026-11-26 14:46:07", "unpaid_reason_id": 3, "unpaid_reason": "...", "unpaid_note": "..." }
// order state: payment_status: "cancelled", order_status: "cancelled"
```

---

## Current Assessment

| Layer | Status | Finding |
|-------|--------|---------|
| Backend — event persistence | ✅ Correct | `make_unpaid` persists in `order_lifecycle_logs` through cancellation |
| Backend — event delivery | ✅ Correct | `insights-dashboard` returns both `make_unpaid` + `cancel_after_unpaid` |
| Frontend — `AuditLogMockup.jsx` filtering | ✅ Correct | No order-status filter suppressing events; card separation is independent |
| Root cause | ❓ Unknown | Bug not reproduced on backend or frontend code review |

---

## Remaining Gap — What Still Needs Confirmation

The bug was originally observed visually in the UI. Neither backend investigation nor frontend code review has reproduced it. Possible causes if the bug still appears:

1. **Stale cached response** — UI loaded before the cancel completed; date range doesn't re-fetch after cancel
2. **`order_id` mismatch** — `cancel_after_unpaid.order_id` is the printed bill number (string `"000845"`); if FE deduplicates by `order_id` string and the `make_unpaid` event uses a different representation, an event could be hidden
3. **Date filter edge case** — if cancel happens on a different business day, the `make_unpaid` date may fall outside the current filter window

---

## Decision

| Decision | Value |
|----------|-------|
| Backend fix needed? | **NO** — both investigations confirm events persist |
| Frontend code change needed? | **NO** — code review confirms no suppression logic |
| Next action | **QA visual session** — log in, perform make_unpaid → cancel sequence on preprod, confirm Audit Dashboard shows both events with network tab open |
| If bug confirmed in UI | Capture raw `insights-dashboard` JSON response → check if `make_unpaid` event is in payload. If yes → FE rendering issue in `AuditLogMockup.jsx` card bucketing. If no → date/filter issue in request params |
| Ticket close criteria | Owner confirms UI shows `make_unpaid` event after cancel → **CLOSE as NO DEFECT** |

---

## Related
- BUG-709 handover: `memory/handover/SESSION_HANDOVER_2026_11_19_REMAINING_P0_705_708_709_712.md`
- Backend handoff: `BUG-709_MAKE_UNPAID_AFTER_CANCEL_FRONTEND_HANDOFF_2026_11_26.md` (uploaded 2026-11-26)
- CR-542 (adds `unpaid_reason_id` to `make_unpaid` events — same event type, same audit log)
- Test accounts: `owner@ruby.com` / `Qplazm@10`, order 000802 (make_unpaid→cancel scenario)
