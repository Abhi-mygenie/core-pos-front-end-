# BUG-351 — Room Check-In: Doc Upload Required Even for CRM-Verified Guests

**Date:** 2026-08-26
**Registered by:** INTAKE agent
**Source:** AGENT-DISCOVERED (INVESTIGATION_REPORT_BATCH_2026_08_26.md, Issue 1)
**Sprint:** POS 5.1 backlog

---

## Classification

| Field | Value |
|---|---|
| Type | BUG |
| Severity | P1 |
| Risk | HIGH |
| Side | Frontend |
| Root cause | CODE_ERROR |
| Duplicate check | DISTINCT |
| Code reality | NONE (bug exists, no fix code present) |
| Blast radius | SMALL (~1 file, ~1 line) |
| Fast Lane eligible | YES (1 file, 1 line, but HIGH risk — needs owner GO) |

## Description

When a guest already has verified ID documents on file in the CRM (`crmDocuments.length > 0`), the check-in form still forces front-desk staff to upload a new physical ID photo. The validation at `RoomCheckInModal.jsx:610` checks `!frontImage` without first checking whether CRM documents already exist.

## Root Cause

```js
// RoomCheckInModal.jsx:610 — CURRENT (wrong)
if (flags.guestDetails) {
  if (!frontImage) next.front = 'Front image required';  // no crmDocuments.length check
}
```

`crmDocuments` state is already fetched and available at `RoomCheckInModal.jsx:345` (`const [crmDocuments, setCrmDocuments] = useState([])`). The guard simply doesn't use it.

## Proposed Fix

```js
// RoomCheckInModal.jsx:610 — FIXED
if (flags.guestDetails) {
  if (!frontImage && crmDocuments.length === 0) next.front = 'Front image required';
}
```

## Evidence

- Screenshot: provided in investigation report
- File: `src/components/modals/RoomCheckInModal.jsx` line 610
- Steps: Check in a guest who has visited before (CRM docs exist) → validation still demands photo upload
- Confidence: HIGH (code-verified)

## Hotspot Files

`RoomCheckInModal.jsx` — room billing flow, HIGH risk per business safety rule (room billing = financial area)

## Owner Decisions Needed

None — fix is clear. But needs Gate 4 GO before implementation because RoomCheckInModal is a HIGH-risk hotspot (room billing path).
