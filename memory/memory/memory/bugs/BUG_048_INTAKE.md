# BUG-048 Intake

> **Sprint:** pos_final_1.0
> **Task type:** Bug Intake (read-only)
> **Status:** Intake created. No code analysis, no implementation.
> **Date:** 2026-05-12 (current session)

---

## BUG-048: Room Orders Report — Discount Column Wrongly Shows Previous Outstanding After Full Payment; Total Inflates (₹9,999 → ₹16,665)

### Priority
**P1**

### Source
Owner screenshot / Manual validation (sprint pos_final_1.0 bug list).

### Raw Input Summary
Owner observed that the Room Orders Report shows incorrect Discount and Total values after a room booking is fully settled.

- **Before full payment** (advance ₹3,333 paid against a ₹9,999 booking for room `r1`, guest `abhishek`):
  - Total **₹9,999**, Paid **₹3,333**, Discount **—**, Outstanding **₹6,666**. *(Correct.)*
- **After full payment** (remaining ₹6,666 collected):
  - Total **₹16,665**, Paid **₹9,999**, Discount **₹6,666**, Outstanding **₹0**.

Owner clarification: Room Discount is NOT used in this flow. The room price was ₹9,999, ₹3,333 was the advance, ₹6,666 was the outstanding amount — that outstanding ₹6,666 is appearing as a Discount value AFTER the final payment, AND it is being added into Total (so Total inflates from ₹9,999 → ₹16,665 = ₹9,999 + ₹6,666).

### Affected Area
- **Module:** Reports / Room Orders Report.
- **Surface(s):** Reports → Room Orders Report → "All" tab — both the per-row table and the summary header pills (`Rooms`, `Total`, `Paid`, `Discount`, `Outstanding`).
- **Likely candidates** (to be confirmed by Impact Analysis):
  - Room Orders report transform / row builder (maps room-payment ledger entries to row fields).
  - Summary-header aggregator (sums per-row values; appears to share state with the table).
  - Backend room-payment payload shape — whether the final-settlement entry is being returned with a non-zero `discount` / `room_discount` field, or whether the frontend is mis-mapping it.

### Steps to Reproduce
1. Create or open a room booking for guest `abhishek` in room `r1` with room price **₹9,999**.
2. Record an **advance payment of ₹3,333**.
3. Open **Reports → Room Orders Report → "All" tab**.
4. Confirm the row reads: Total ₹9,999, Paid ₹3,333, Discount — (or 0 / blank), Outstanding ₹6,666. Confirm the summary header pills match.
5. Return to the booking and complete payment for the **remaining ₹6,666** (full settlement).
6. Reopen Reports → Room Orders Report → "All" tab.
7. Observe the row and the summary-header pills.

### Expected Behavior (per owner)
After full payment is settled:
- **Total** should remain **₹9,999** (booking price; no second order, no real discount applied).
- **Paid** should become **₹9,999** (advance ₹3,333 + final ₹6,666).
- **Outstanding** should become **₹0**.
- **Discount** should remain **—** / **0** / **hidden**, because the room flow under test does NOT use Discount.

The previously-outstanding amount (₹6,666) must NOT be re-mapped into the Discount column. Total must NOT be inflated by the final-settlement ledger entry.

### Actual Behavior
After full payment is settled, the report shows:
- **Total**: ₹16,665 *(wrong — looks like booking price + remaining-settlement amount)*
- **Paid**: ₹9,999 *(correct cumulative paid)*
- **Discount**: ₹6,666 *(wrong — the previously-outstanding amount appears here)*
- **Outstanding**: ₹0 *(correct)*

Summary header pills mirror the row's wrong values:
`Rooms 1 | Total ₹16,665 | Paid ₹9,999 | Discount ₹6,666 | Outstanding ₹0`.

### Evidence
Two owner-provided screenshots saved at `/app/memory/attachments/bug_048/`:

| File | Captured at | Visible state |
|---|---|---|
| `screenshot_15-10-48.png` | 12-May-2026, 15:10:48 | Owner-described as **the post-full-payment state** — Total ₹16,665, Paid ₹9,999, Discount ₹6,666, Outstanding ₹0, row r1 / guest "abhsihek" / check-in 12-May 15:03 / "0 transferred". Summary header reads `Rooms 1 | Total ₹16,665 | Paid ₹9,999 | Discount ₹6,666 | Outstanding ₹0`. |
| `screenshot_15-11-32.png` | 12-May-2026, 15:11:32 | Companion screenshot from the same session. Owner-described as the **pre-full-payment** state (Total ₹9,999, Paid ₹3,333, Discount —, Outstanding ₹6,666). Impact Analysis must inspect side-by-side to confirm pre vs post mapping. |

> The file naming uses the **screenshot timestamp** (HH-MM-SS) only — not a "before/after" semantic — because the underlying timestamps are seconds apart and the report likely went from `before` → `after` between the two captures. Impact Analysis should open both files and verify which is which.

### Assumptions / Unknowns
- **Backend vs frontend source for the Discount value** — UNKNOWN. Impact Analysis must verify whether the room-payment API returns a `discount` / `room_discount` field carrying ₹6,666 (i.e., backend mis-labelling the final-settlement entry), or whether the frontend transform is summing / mapping a "remaining due" entry into a Discount slot.
- **Which API powers this report** — UNKNOWN at intake. Candidate endpoints to inspect: any `/api/.../room`, `/api/.../room-payment`, `/api/.../report/rooms` family.
- **Total inflation source** — UNKNOWN. Whether `Total` is being summed as "all ledger entries' amount" (which would explain ₹9,999 + ₹6,666 = ₹16,665) instead of "booking price only" (which would stay at ₹9,999). Same question applies to whether this is a transform-level mistake or a backend response-shape mistake.
- **CR-004 baseline intent** — UNKNOWN. Did the spec call for a Discount column at all in this flow? If yes, what is the legitimate population path?
- **Summary header vs row reducer** — UNKNOWN. Whether the header pills (Rooms / Total / Paid / Discount / Outstanding) and the table row share a single reducer or are computed independently. The screenshots show both surfaces drift together → suggests shared upstream source.
- **Export path** (Excel / CSV / PDF) — UNKNOWN whether it inherits the same defect.
- **Payment-method coverage** — UNKNOWN whether the defect reproduces with cash, card, UPI, or all primary methods.
- **Timing** — UNKNOWN whether the defect is state-vs-persisted-value or always reproducible.
- **Overlap with BUG-043** — `BUG-043 / Room Orders Report — Wrongly Shows Discount Column / Value` was filed earlier in the same sprint **without screenshots and without evidence**, and was explicitly awaiting owner clarification on "remove Discount column entirely vs correct the values". BUG-048's evidence partially resolves that ambiguity (the column must remain, but must NOT pick up the previous-outstanding value when full payment is settled; AND Total must not inflate). Impact Analysis must decide whether BUG-048 supersedes BUG-043, whether BUG-043 should be marked duplicate-of BUG-048, or whether they describe two distinct defects.

### Clarification Required
**No** for intake.

Impact Analysis should:
1. Verify backend vs frontend source of the Discount value (capture the Room Orders Report API response *before* vs *after* full settlement on the same booking and diff the payload).
2. Verify the Total computation (`bookingPrice` vs `sum(ledgerEntries.amount)`).
3. Confirm the CR-004 (or sibling change-request) baseline intent for the Room Orders Report column set.
4. Confirm whether the summary header and per-row table share the same reducer.
5. Cross-reference BUG-043 and decide merge / supersede / distinct.
6. Confirm whether export paths (Excel / CSV / PDF) inherit the same defect.

### Ready for Next Agent
**Yes** — ready for Bug Impact Analysis Agent.

### Next Agent
Bug Impact Analysis Agent.

---

## Cross-References

- **`/app/memory/BUG_TEMPLATE.md`** — summary table row for BUG-048 added; full intake section appended after BUG-047 (immediately preceding `[End of file]`).
- **BUG-043** (`Room Orders Report — Wrongly Shows Discount Column / Value`, Open / Intake Created) — same module / surface; owner-provided screenshots in BUG-048 give the missing evidence BUG-043 was waiting on. Impact Analysis must resolve merge / supersede / distinct.
- **CR-004** (Reports baseline / column-set rules — if applicable to Room Orders Report) — Impact Analysis should confirm whether CR-004 covers this report and what its intended column set is.

## Forbidden-Surface Compliance (this intake)

- ❌ `/app/memory/final/*` — **NOT** touched.
- ❌ Production code — **NOT** modified.
- ❌ Tests — **NOT** added.
- ✅ `/app/memory/BUG_TEMPLATE.md` — updated per task instruction (summary-table row + full intake section appended).
- ✅ `/app/memory/bugs/BUG_048_INTAKE.md` — this file, created.
- ✅ `/app/memory/attachments/bug_048/` — two owner-supplied screenshots saved locally for traceability.

---

*End of BUG-048 Intake. Awaiting Bug Impact Analysis Agent.*
