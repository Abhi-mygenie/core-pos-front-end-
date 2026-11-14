# BUG-670 — Item-Wise Cancellation Missing Notes / Additional Notes Field

**Registered:** 2026-11-12
**Type:** BUG
**Sprint:** nov_cr_batch
**Status:** GATE_1_INTAKE_COMPLETE

---

## 1. Description

When cancelling at the **order level**, an "Additional Notes (Optional)" text field appears in the cancellation dialog. However, when cancelling at the **item level** (individual item cancellation), the notes field is missing from the item cancellation dialog.

**Current behaviour:** 
- Order-level cancel: Cancellation Reason dropdown + "Additional Notes (Optional)" field ✅
- Item-level cancel: Cancellation Reason dropdown only — **no notes field** ❌

**Expected behaviour:** Item-level cancellation should also include an "Additional Notes" field (matching order-level cancellation UX).

---

## 2. Classification

- **Type:** BUG
- **Severity:** P2 — Medium (notes available at order level but not item level; parity gap)
- **Risk:** MEDIUM — cancel dialog component, cancel API payload
- **Area:** Menu / Order Entry
- **Fast Lane:** NOT eligible (dialog change, API payload addition)

---

## 3. Duplicate Check

- CR-493 (Cancellation Reason Mandatory — GATE_1_INTAKE_COMPLETE): makes reason mandatory; this is about adding missing notes field to item cancel
- **Result: RELATED CR-493** (same cancel flow; different gap — CR-493 makes existing reason mandatory; BUG-670 adds missing notes field to item cancel)

---

## 4. Evidence

- **Source:** OWNER-REPORTED (2026-11-12 batch)
- **Screenshot:** provided — "Cancel m" dialog showing Cancellation Reason dropdown + "Additional Notes (Optional)" at order level; no item-cancel dialog screenshot but described
- **Confidence:** CONFIRMED

---

## 5. Root Cause (preliminary)

Item cancellation dialog component differs from order cancellation dialog — the item-cancel dialog was built without the notes field, or the notes field was added to order-cancel only and not propagated to item-cancel.

---

## 6. Blast Radius

- Item cancellation dialog component in `OrderEntry.jsx` or separate cancel modal (R5)
- Cancel API payload — add `notes` field to item cancel call
- **Estimated scope:** SMALL-MEDIUM (1–2 files)

---

## 7. Code Reality

- **Status:** NONE — item-cancel dialog missing notes field

---

## 8. Related

- CR-493 (Cancellation Reason Mandatory — GATE_1_INTAKE_COMPLETE)
- CR-529 (Password/OTP guard for cancel — GATE_1_INTAKE_COMPLETE, same cancel flow)
