# BUG-317 — Intake: Printer Config — Android Size Fields Reject Values > 8

**Date:** 2026-08-13  
**Source:** OWNER-REPORTED + AGENT-CONFIRMED (code trace)  
**Confidence:** CONFIRMED  
**Duplicate check:** RELATED to CR-133 Gap Batch OD-D (owner previously approved max=8) — OWNER NOW OVERRIDING OD-D

---

## Classification

| Field | Value |
|---|---|
| Type | BUG / Owner Decision Override |
| Severity | P2 — MEDIUM |
| Risk | LOW |
| Fast Lane eligible | YES (1 file, ~5 lines) — owner approval required |

---

## Description

The Android Print Style card (Logo Size, UPI QR, Feedback QR) uses `max={maxScale}` = 8. Browser `<input type="number">` rejects values > 8 (e.g., owner wants to enter 44, 46, 23). Values are silently clamped to 8 on blur.

**Previous decision:** CR-133 Gap Batch OD-D approved Android constrained to 1–8.  
**Owner NOW says:** Android logo/UPI QR/feedback QR should accept any positive integer.

---

## Fix Summary

Remove `max={maxScale}` constraint for the 3 android-specific size fields in `PrintStyleTab.jsx`. Keep `min={1}`, remove upper bound.

---

## Owner Decisions Needed

**OD-D override confirmed** — owner explicitly states "for android only for logo size, upi qr and fdbk qr -- we can put any value like 44, 46, 23".
