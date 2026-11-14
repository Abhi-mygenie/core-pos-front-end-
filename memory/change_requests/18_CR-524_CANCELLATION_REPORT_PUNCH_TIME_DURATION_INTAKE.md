# CR-524 — Cancellation Report: Punch Time and Cancellation Duration

**Registered:** 2026-11-12
**Type:** CR
**Sprint:** nov_cr_batch
**Status:** GATE_1_INTAKE_COMPLETE

---

## 1. Description

The owner wants the cancellation report to include two new time-based columns:

1. **Punch Time** — the time the item/order was originally placed (order creation time)
2. **Cancellation Duration** — the elapsed time between punch time and cancellation time (how long the order/item was active before cancellation)

**Current behaviour:** The cancellation report shows cancelled items/orders but does not display when the order was first placed (punch time) or how long it took to cancel.

**Expected behaviour:** New columns "Punch Time" and "Cancellation Duration" in the cancellation insights/report page.

---

## 2. Classification

- **Type:** CR
- **Severity:** P2 — Medium (reporting enhancement; not blocking)
- **Risk:** MEDIUM — touches cancellation report page, transform
- **Area:** Reports / Analytics
- **Fast Lane:** NOT eligible (report + data transform)

---

## 3. Duplicate Check

- BUG-579 (Cancellation report values — GATE_1_INTAKE_COMPLETE): about monetary values
- BUG-603 (cancel_type overwriting kitchen stage — BACKEND_BLOCKED): related but different
- **Result: DISTINCT** — no prior registration for punch time / duration columns

---

## 4. Evidence

- **Source:** OWNER-REPORTED (2026-11-12 batch)
- **Confidence:** REPORTED (no screenshot)

---

## 5. Blast Radius

- Cancellation report page (InsightsCancellations or similar) — add 2 new columns
- Report transform / `reportService.js` — map `created_at` / `cancel_time` fields
- Backend: confirm `created_at` and `cancel_time`/`cancelled_at` are available in the cancellation API response
- **Estimated scope:** SMALL-MEDIUM (1–2 files + backend confirm)

---

## 6. Open Questions

- OD-524-01: Does the backend cancellation API return `created_at` (punch time) and `cancelled_at` (cancellation time) for each cancelled item?
- OD-524-02: Should "Cancellation Duration" be shown as (a) HH:MM:SS (b) minutes only (c) human-readable (e.g. "3 mins 20 secs")?

---

## 7. Code Reality

- **Status:** NONE — no punch time or duration columns in cancellation report

---

## 8. Related

- BUG-579 (Cancellation report monetary values — GATE_1_INTAKE_COMPLETE)
- BUG-603 (cancel_type kitchen stage — BACKEND_BLOCKED)
