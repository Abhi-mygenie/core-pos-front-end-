# Batch C — Owner Decisions (FINAL for intake) — 2026-11-14

Source: owner Q&A rounds 1–4 (2026-11-14). Detail in `BATCH_C_OWNER_ANSWERS_DRAFT_2026_11_14.md`.
Scope: P0 only. Client = **ALL**. Assignee rule: Abhishek FE, "waiting on Gyan" where backend needed; Gyan keeps CR-497, CR-138, BUG-192.

## P0 → impact analysis
| Item | Decision |
|---|---|
| CR-503 | Pay Later: Collect opens a pop-up that includes Print Bill. Uses CR-515 rights (reprint, collect pay-later). Move-to-Paid after collection already works by existing rules. |
| CR-528 | Edits/cancels after bill print — goes inside the Audit report; rest at impact. |
| CR-524 | Cancellation report: Punch Time (= when item was added) + Cancellation Duration (minutes). |
| BUG-675 | Remove the "Total sale: ₹X" subtitle under Cash Collected (owner screenshot). Code: `SettlementPanel.jsx` L249, `SettlementPage.jsx` L224 (`SettlementMockup.jsx` L181 is deleted under CR-372-B). "definition pending" text already gone. |

## Investigation validation needed (kept OPEN, owner: validate with code later)
| Item | Agent code finding (2026-11-14) |
|---|---|
| CR-505 | BUG-645 (GATE_5B_QA_PASS 2026-11-08) appears to cover it: split legs in Payment dropdown, partial orders under matching mode with leg amount "(of ₹full)", totals sum legs (OrderReportBetaPage.jsx L81-87, L179-219, L497, L622). Owner answers: 505-01 a (any cash part), 505-02 a (cash part only). |
| CR-510 | OrderDetailSheet.jsx L337-395 renders variations + add-ons with prices; BUG-601 QA-passed. Verify on a real Swiggy/Zomato order. |

## Merged
BUG-605 → CR-526 (Batch B). Symptom: Make Unpaid does nothing on click, all order types; Change Payment Method works.

## Moved to P1
CR-504, CR-506, CR-507, CR-508, CR-509, CR-511, CR-532, CR-444, CR-497, CR-537, CR-539, CR-138, BUG-192.

## Not in scope this round
CR-050 (P3), CR-424 (P1), CR-446 (no priority).
