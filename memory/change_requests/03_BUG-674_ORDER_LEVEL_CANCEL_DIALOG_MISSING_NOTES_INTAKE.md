# BUG-674 — Order-Level Cancellation Dialog Missing Notes / Additional Notes Field

**Registered:** 2026-11-12 (revised from misclassification on first intake pass)
**Type:** BUG
**Sprint:** nov_cr_batch
**Status:** GATE_1_INTAKE_COMPLETE

---

## 1. Description

The **order-level cancellation dialog** is missing an "Additional Notes" free-text field. When cancelling an entire order, only a Cancellation Reason dropdown appears — there is no way to record a free-text note explaining the cancellation.

**Previous misclassification:** On first intake (2026-11-12 session 1), this item was incorrectly logged as an "observation that notes already exist." Owner has now confirmed: **order-level cancel dialog does NOT have a notes field.**

**Current behaviour:** Order-level cancel dialog = Cancellation Reason dropdown only. No notes/free-text field.

**Expected behaviour:** Order-level cancel dialog should include an "Additional Notes" (free-text) field, identical to the notes field visible in the item-level cancel dialog.

---

## 2. Classification

- **Type:** BUG
- **Severity:** P0 — Critical (no way to document the reason in free text at order level; audit gap)
- **Risk:** MEDIUM — cancel dialog, cancel API payload (add `notes` field)
- **Area:** Menu / Order Entry
- **Fast Lane:** NOT eligible (dialog change, API payload addition)

---

## 3. Duplicate Check

- BUG-670 (Item-wise cancel missing notes — P0): same feature gap at item level; this is order-level
- CR-493 (Cancel reason mandatory — P0): makes reason dropdown mandatory; BUG-674 is about the missing notes field
- **Result: DISTINCT** — no order-level notes field gap previously registered

---

## 4. Evidence

- **Source:** OWNER-REPORTED + clarified on 2026-11-12 (second pass)
- **Screenshot:** provided — order-level cancel dialog shows Reason dropdown + "Additional Notes (Optional)" area in screenshot — wait, the screenshot may show item-level. Owner confirmed order-level is MISSING notes.
- **Confidence:** CONFIRMED by owner

---

## 5. Blast Radius

- Order-level cancellation dialog / modal in `OrderEntry.jsx` (R5) — add notes textarea
- Cancel API payload — add `notes` field to order-cancel call
- **Estimated scope:** SMALL-MEDIUM (1–2 files, R5)

---

## 6. Open Questions

- OD-674-01: Should the notes field be "Additional Notes (Optional)" matching item-cancel, or mandatory (see CR-493)?
- OD-674-02: Does the backend order-cancel endpoint already accept/store a `notes`/`cancellation_note` field?

---

## 7. Code Reality

- **Status:** NONE — notes field absent from order-level cancel dialog

---

## 8. Related

- BUG-670 (Item-wise cancel missing notes — P0, same batch)
- CR-493 (Cancel reason mandatory — P0)
- CR-529 (PIN/OTP + role guard for cancel — P0)
