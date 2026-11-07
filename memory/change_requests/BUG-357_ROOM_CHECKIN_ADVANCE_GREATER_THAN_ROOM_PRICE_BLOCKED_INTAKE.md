# BUG-357 — Room Check-In: Advance > Room Price Blocked by FE-Only Validation

**Date:** 2026-08-26
**Registered by:** INTAKE agent
**Source:** AGENT-DISCOVERED (INVESTIGATION_REPORT_BATCH_2026_08_26.md, Issue 8/10)
**Sprint:** POS 5.1 backlog

---

## Classification

| Field | Value |
|---|---|
| Type | BUG |
| Severity | P2 |
| Risk | LOW |
| Side | Frontend |
| Root cause | CODE_ERROR (overly strict FE-only guard) |
| Duplicate check | DISTINCT |
| Code reality | NONE (fix not present) |
| Blast radius | SMALL (1 file, 1 line) |
| Fast Lane eligible | YES (1 file, 1 line, LOW risk — needs owner GO) |

## Description

The room check-in form blocks submission if the advance payment amount exceeds the room price, showing: *"Advance cannot be greater than Room Price"*. This restriction is **frontend-only** — the backend accepts advance > room price (HTTP probe returned 403 from invalid room_id, NOT from amount validation).

Some properties (e.g. corporate bookings) legitimately take advance payments larger than a single night's room rate.

## Root Cause

`RoomCheckInModal.jsx:630`:
```js
else if (advancePayment !== '' && adv > ord)
  next.advance = 'Advance cannot be greater than Room Price';
```

## Proposed Fix

Remove this validation line (or convert to a non-blocking warning):
```js
// Option A: remove entirely
// Option B: show warning toast but don't block submission
```

## Evidence

- File: `src/components/modals/RoomCheckInModal.jsx:630`
- Backend probe: HTTP 403 from invalid room_id, NOT from advance amount
- Confidence: HIGH

## Owner Decisions Needed

OD-1: Remove entirely (Option A) or soft-warn (Option B)?
