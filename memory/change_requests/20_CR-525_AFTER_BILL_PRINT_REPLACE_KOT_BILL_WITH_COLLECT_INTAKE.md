# CR-525 — After Bill Print: Replace KOT and Bill Buttons with Collect Bill Button

**Registered:** 2026-11-12
**Type:** CR
**Sprint:** nov_cr_batch
**Status:** GATE_1_INTAKE_COMPLETE

---

## 1. Description

After a bill is printed, the order card/footer still shows the **KOT** and **Bill** action buttons. The owner wants these to be replaced with a single **"Collect Bill"** button once the bill has been printed, so that the next logical action is immediately prominent.

**Current behaviour:** After bill print, the order card footer continues to show KOT and Bill buttons unchanged. The Collect Payment action is not surfaced directly on the card.

**Expected behaviour:** Once `billPrinted = true` (CR-512 signal), the KOT and Bill buttons on the order card are replaced by (or the Bill button changes to) a "Collect Bill" button that opens the payment/collect panel directly.

---

## 2. Classification

- **Type:** CR
- **Severity:** P2 — Medium (UX improvement; workaround exists via standard collect flow)
- **Risk:** HIGH — touches OrderCard (R5), bill-print state logic, CR-489 edit-lock interaction
- **Area:** Menu / Order Entry
- **Fast Lane:** NOT eligible (R5 hotspot, state logic)

---

## 3. Duplicate Check

- CR-489 (Edit lock after bill print — GATE_5A_IMPLEMENTED): related concept
- CR-512 (Print confirmation flow — GATE_5A_IMPLEMENTED): provides `billPrinted` signal
- **Result: DISTINCT** — no registration for button replacement after bill print

---

## 4. Evidence

- **Source:** OWNER-REPORTED (2026-11-12 batch)
- **Screenshot:** provided — table card showing KOT + Bill buttons; annotated by owner
- **Confidence:** CONFIRMED

---

## 5. Blast Radius

- `OrderCard.jsx` (R5) — conditional button rendering based on `billPrinted`
- `TableCard.jsx` — may also need similar treatment
- **Estimated scope:** SMALL-MEDIUM (1–2 files, R5)

---

## 6. Open Questions

- OD-525-01: Should both KOT and Bill be replaced, or only the Bill button changes to "Collect Bill"?
- OD-525-02: If order is edited after bill print (CR-489 allows with permission), should KOT/Bill reappear?
- OD-525-03: "Collect Bill" button — should it open the full CPP panel directly or trigger the existing collect-bill flow?

---

## 7. Code Reality

- **Status:** PARTIAL — `billPrinted` signal exists (CR-512); no button swap implemented yet

---

## 8. Related

- CR-512 (Print Confirmation Flow — GATE_5A_IMPLEMENTED, provides `billPrinted`)
- CR-489 (Edit After Bill Print — GATE_5A_IMPLEMENTED)
- BUG-583 (Card colour on bill print — GATE_5A_IMPLEMENTED via CR-512)
