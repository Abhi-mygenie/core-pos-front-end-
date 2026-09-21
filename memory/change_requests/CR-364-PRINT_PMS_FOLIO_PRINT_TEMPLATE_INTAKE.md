# CR-364-PRINT — INTAKE
## PMS — Guest Folio Print Template (`rtype='RM'` branch, ~60-field payload extension)

**ID:** CR-364-PRINT
**Date:** 2026-09-14
**Registered by:** Intake agent (ALPHA v0.7)
**Source:** SCOPE SPLIT from CR-364 (2026-09-14) — print path deferred to keep CR-364 data-path planning clean
**Parent CR:** CR-364 (Guest Folio Detail Page)
**Related:** CR-364 (parent data path) · OD-364-02 (print = PMS folio via `rtype='RM'` — R6 owner sign-off required before live) · `orderTransform.js:buildBillPrintPayload` (R5 hotspot) · BACKEND_BRIEF_CR364_FOLIO_PRINT_2026_09_16.md (9 blocks, 15 questions)
**Type:** CR (scope extension of existing print pipeline)
**Scope decision:** Extend `buildBillPrintPayload` in `orderTransform.js` to include ~20 PMS-specific fields when `order.isRoom === true`, and gate the print template on `rtype='RM'` server-side

---

## Classification

| Field | Value |
|---|---|
| Type | CR |
| Area | PMS → Print pipeline (`orderTransform.js` → `order-temp-store` → print template) |
| Priority | **P2** — print folio not needed for CR-364 data-path v1 to ship; blocked by BE anyway |
| Risk | **HIGH** — `orderTransform.js` is R5 hotspot; R6 print semantics (owner approval required before template goes live per OD-364-02); any regression breaks ALL bill printing |
| Sprint | pos_pms_1 |
| Fast Lane eligible | **NO** — R5 hotspot + R6, touches multi-tenant print path |
| Duplicate check | **DISTINCT** — no existing CR covers PMS folio print template; **RELATED** to CR-364 (parent data path) |
| Code reality | **PARTIAL** — `rtype: order.isRoom ? 'RM' : 'TB'` already emitted at `orderTransform.js:L2216` in `buildBillPrintPayload`. No template branch (`rtype='RM'` switch) exists yet. Test `req3-room-bill-print.test.js` already verifies `rtype='RM'` is sent. |
| Blast radius | **SMALL** — 1 R5 file (`orderTransform.js`, ~30 lines in `buildBillPrintPayload`) + potential server-side template work (outside FE scope) |
| Backend blocked | **YES** — Q-364P-01/08/09/10/13/15 unanswered (see §Blockers) |

---

## Description

When a hotel guest checks out, staff need to print a **PMS Guest Folio** — a document distinct from a standard F&B bill. It shows:
- Room header (guest name, room no, check-in/out, nights, channel, meal plan)
- Room charges line(s) with per-night breakdown
- GST on lodging
- All payments received (advance, interim, checkout) with dates and modes
- F&B posted to room (settled associated orders with item summary)
- Balance due / zero-balance confirmation
- Hotel branding + GST registration number

Today, `buildBillPrintPayload` sends `rtype='RM'` but the payload lacks the room-specific fields above. The print template server-side applies a generic F&B bill layout regardless of `rtype`.

---

## Scope

**FE scope (this CR):**
- Extend `buildBillPrintPayload` in `orderTransform.js` to populate ~20 PMS-specific fields when `order.isRoom === true`
- Fields sourced from existing `order.roomInfo`, `order.roomPaymentSummary`, `order.associatedOrders` — **no new API calls**
- All field values pass through as-is — **no arithmetic (R6)**

**Server-side scope (backend task — gated on BE answers):**
- `order-temp-store` accepts the extended payload
- Print template branches on `rtype='RM'` to render the PMS folio layout
- This is outside FE scope; FE passes every field and whatever backend ignores simply won't print (OD-364-02)

**Out of scope for v1:**
- Per-night room charge expansion (Q-364P-03 deferred)
- Dated payment history ledger per line (B-364-01 partial)
- Regulatory HSN/SAC codes (Q-364P-11 deferred)
- Reprint counter / folio_no (Q-364P-09 deferred)

---

## Blockers (all 6 must be answered before Gate 2)

| Question | Ask | Status |
|---|---|---|
| Q-364P-01 | Does `order-temp-store` accept extended payload keys? Will extra fields be ignored or cause 422? | ❌ UNANSWERED |
| Q-364P-08 | Does a `rtype='RM'` branch already exist in the print template? If not, can it be added? | ❌ UNANSWERED |
| Q-364P-09 | What is `folio_no` — is it auto-generated server-side or FE-provided? | ❌ UNANSWERED |
| Q-364P-10 | Is a reprint counter (`reprint_count`) tracked server-side? | ❌ UNANSWERED |
| Q-364P-13 | UPI QR on folio — is it generated server-side or does FE pass a VPA string? | ❌ UNANSWERED |
| Q-364P-15 | Regulatory: HSN/SAC codes for lodging service — required on GST invoice? | ❌ UNANSWERED |

Full question set + proposed payload: `/app/memory/backend_briefs/BACKEND_BRIEF_CR364_FOLIO_PRINT_2026_09_16.md`

---

## Evidence

- `orderTransform.js:L2216` — `rtype: order.isRoom ? 'RM' : 'TB'` already in payload (code reality PARTIAL)
- `src/api/transforms/__tests__/req3-room-bill-print.test.js` — existing test verifies `rtype='RM'` for room orders
- `orderTransform.js:L1839` — comment references hotel folio and `order-temp-store` endpoint
- Backend brief: `/app/memory/backend_briefs/BACKEND_BRIEF_CR364_FOLIO_PRINT_2026_09_16.md` — 9 blocks, ~60 keys, 15 Q
- Source: SCOPE SPLIT · Confidence: CONFIRMED (FE side); UNCONFIRMED (BE template side)

---

## Owner Decision (frozen at split)

| OD | Decision |
|---|---|
| OD-364-02 | **PMS-specific folio layout** via `rtype='RM'` template branch. FE passes every field; whatever BE ignores simply won't print. **R6 owner sign-off is required before the template goes live.** |

---

## Files (expected — FE only)

| File | Change | Hotspot? |
|---|---|---|
| `src/api/transforms/orderTransform.js` | Extend `buildBillPrintPayload` (+~30 lines) — add PMS fields when `order.isRoom === true` | **YES (R5)** |

Files NOT touched: `GuestFolioPage.jsx`, `folioTransform.js`, `pmsService.js`, `App.js`, `CollectPaymentPanel.jsx`, `PmsCheckoutDrawer.jsx`

---

## Gate status
- [ ] Gate 0/1 — Intake ✅ OPEN (registered 2026-09-14, BACKEND-BLOCKED)
- [ ] Gate 2 — Blocked on Q-364P-01/08/09/10/13/15
- [ ] Gate 3 / 4 / 5

**Park until backend answers the 6 print questions. No FE work can proceed until `order-temp-store` behaviour + template branch confirmed.**

*Intake: 2026-09-14 · Scope split from CR-364 · Code reality: PARTIAL · Duplicate: DISTINCT / RELATED to CR-364 · Blast: SMALL · Risk: HIGH · BACKEND-BLOCKED*
