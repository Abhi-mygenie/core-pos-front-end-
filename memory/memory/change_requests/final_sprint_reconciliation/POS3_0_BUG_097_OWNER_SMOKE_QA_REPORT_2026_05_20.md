# POS3.0 BUG-097 Owner Smoke QA Report — 2026-05-20 (v4)

> **Status**: `waiting_for_rider_corrective_patch_owner_confirmed`
> **Version**: 5.0 — Waiting for Rider patch owner-confirmed, all Bucket 4.5 items closed
> **Date**: 2026-05-20

---

## 1. Purpose

Record owner smoke QA results for BUG-097 Buckets 0–4 + Bucket 4.5 combined corrective patches. All Bucket 4.5 items now owner-confirmed.

---

## 2. Environment

| Field | Value |
|-------|-------|
| Frontend URL | `https://insights-phase.preview.emergentagent.com` |
| Backend API | `https://preprod.mygenie.online/` |
| Branch | `20-may` |
| Bucket 4.5 Gap 1+2+3 applied | YES |
| Build | PASS — 441.01 kB gzipped |

---

## 3. Fixes Applied In This Patch

| Gap | Before | After |
|-----|--------|-------|
| 1. Socket handler | Ignored payload → GET API call → slow update | Uses `payload.orders[0]` directly → instant update; GET only as fallback |
| 2. Optimistic update | `onAssigned` not wired → card shows stale state until socket | `onAssigned` wired → card updates immediately with rider fields |
| 3. Serve fall-through | Delivery + rider assigned → Serve button | Delivery + rider assigned → Reassign button |

---

## 4. Results Summary

| Area | Result | Notes |
|------|--------|-------|
| B. Dispatch (`delivery_assign=No`) | not_tested | No tenant tested |
| C. Assign Rider (`delivery_assign=Yes`) | **pass** | Gap 1+2+3 patch applied. Owner confirmed "works". |
| C-SOCKET. Socket payload handling | **pass** | No GET API call after assign. Owner confirmed. |
| C-WAITING. Waiting for Rider label | **pass** | Owner confirmed "works". Patch closed. |
| D. Delivered / Handover | observation | Label correct on dashboard cards. |
| E. Non-Delivery Regression | pass | |
| F. Card View (OrderCard + TableCard) | **pass** | Waiting for Rider + card height fix confirmed. |

---

## 5. Items Requiring Owner Retest

| # | Item | What To Check |
|---|------|---------------|
| C12 | Card immediately after assign | "Reassign" button appears instantly (no Serve, no flicker to "Assign Rider") |
| C13 | Rider name in rider section | Assigned rider name + "Assigned" badge visible immediately |
| C14 | Click Reassign | Modal opens with rider list, current rider tagged "Current" |
| CS1 | Console log after assign | `delivery-assign-order: Transformed order ... from socket payload` (not "from API fallback") |
| CS2 | No GET API log | No `Fetching order` log for delivery-assign-order event |
| F1b | OrderCard delivery fOS2 + rider | "Reassign" instantly |
| F2b | TableCard delivery fOS2 + rider | "Reassign" instantly |

---

## 6. Blocked Items

| Item | Status | Dependency |
|------|--------|------------|
| Rider accept → "Rider On The Way" | BLOCKED | BQ-097-2 |
| Rider reject → Reassign + mark rejected | BLOCKED | BQ-097-3 |
| Bucket 5 | BLOCKED | BQ-097-2 + BQ-097-3 |

---

## 7. Final QA Status

**`waiting_for_rider_corrective_patch_owner_confirmed`**

All Bucket 4.5 items closed:
- Gap 1 (socket payload) — owner confirmed
- Gap 2 (optimistic update) — owner confirmed
- Gap 3 (Serve fall-through) — owner confirmed
- Waiting for Rider label — owner confirmed "works"
- TableCard height fix — owner confirmed

Remaining open for Bucket 5:
- Rider accepts → Reassign button (blocked — needs backend `f_order_status` confirmation)
- Rider rejects → nothing happens on cashier (blocked — needs console log verification)
- Rider name disappears after time (parked — needs live console debug)
- "Delivered" → "Collect Bill" in Order Entry panel (planned, not implemented)
- Rejected rider grey-out in modal (planned, not implemented)

---

## Report Metadata

| Field | Value |
|-------|-------|
| Version | 5.0 |
| Updated | 2026-05-20 |
| Code changed | YES — Bucket 4.5 complete (socket, optimistic, Serve fix, Waiting label, height fix) |
| Build | PASS |
| `/app/memory/final/` updated | NO |
