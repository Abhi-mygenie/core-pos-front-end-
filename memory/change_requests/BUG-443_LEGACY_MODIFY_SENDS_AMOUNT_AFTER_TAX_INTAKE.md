# BUG-443 — Legacy ModifyBookingDialog PATCH sends `amount_after_tax: 0` + empty `reason` (G-02 violation, price risk)

**Registered:** 2026-09-22 (QA Role 4, CR-385 P1.5 re-test `iteration_15.json` P15-03) · **Type:** BUG · **Priority:** P1 · **Risk:** MEDIUM (money field sent by FE; if the backend honours it the booking price can be zeroed) · **QA severity:** MAJOR (payload confirmed; price impact SUSPECTED — verify on a test booking before routing)
**Duplicate check:** DISTINCT — RELATED CR-362 (dialog owner), CR-385 M2 (new `ModifyBookingForm` is clean: `{checkin, checkout, reason}`), BQ-385-08 (server-priced modify contract), G-02 frozen rule
**Source:** QA-FOUND · **Confidence:** CONFIRMED for the payload (`PATCH /local-reservations/229` body `{"reason":"","checkin":"2026-09-22","checkout":"2026-09-24","amount_after_tax":0}`), SUSPECTED for the money impact
**Code reality:** EXISTS — `components/pms/ModifyBookingDialog.jsx` L53–58 (CR-362) builds the body with `amount_after_tax` and an empty default reason.

## Fix proposal (not applied — QA role, owner hard rule "no scope creep")
Drop `amount_after_tax` from the body; default `reason` to `'Modified from Front Desk'` (mirror `buildModifyBody` in `ModifyBookingForm.jsx`); optionally reuse the server preview. 1 file. Fast Lane NOT eligible (money field, MEDIUM). Routing options: P1.5b (owner GO) or retire with FU-385-C (legacy pages).

## Verify first
Create a Suite test booking → legacy Modify +1 night → read the LR row: if `charge.total_with_gst` is 0 or unchanged-for-2-nights, backend honours `amount_after_tax` → escalate to BLOCKER + backend note (BQ).
