# SESSION HANDOVER — 2026-10-10 (INTAKE: BUG-533)

**Date:** 2026-10-10
**Role:** INTAKE
**Item registered:** BUG-533
**Status:** GATE_1_INTAKE

---

## 1. WHAT WAS DONE

BUG-533 registered from investigation findings. All ODs locked from the investigation session — no open questions remain.

---

## 2. BUG-533 SUMMARY

**Title:** Extend Stay — current bill shows rack rate (discount ignored) + Discount + Collect Now fields must be removed

**Three issues in one registration:**

| Sub | Issue | Files |
|---|---|---|
| A | "Current bill" shows ₹7,035/₹5,035 (rack rate) — should show ₹5,985/₹3,985 (post-discount) | InHousePanel.jsx + DeparturesPanel.jsx + ExtendStayForm.jsx |
| B | Discount section must be removed from left panel | ExtendStayForm.jsx |
| B2 | Collect Now section must be removed from left panel | ExtendStayForm.jsx |

**Root cause A:** Both panels `renderExpansion` exit early for `'extend'` before building `enrichedRow`. Fix: move enrichment block above early returns; pass enrichedRow to ExtendStayForm.

**Root cause B/B2:** Both sections rendered by design from CR-385 M4. Owner confirmed: remove both.

**Locked ODs:**
- OD-INV-EXTEND-01: Remove Discount field ✓
- OD-INV-EXTEND-01b: Remove Collect Now field ✓
- OD-INV-EXTEND-02: Two-row display (rack crossed out → discount line → discounted total + balance). Check-in discount does NOT carry to extended nights (new nights at rack by server) ✓
- OD-INV-EXTEND-03: Both InHousePanel + DeparturesPanel ✓

**Files (0 R5):**
- `src/components/pms/frontdesk/InHousePanel.jsx` — ~4 lines
- `src/components/pms/frontdesk/DeparturesPanel.jsx` — ~4 lines
- `src/components/pms/frontdesk/ExtendStayForm.jsx` — ~22 removed + ~5 changed

**Registry:** 817 items total. BUG-533 at GATE_1_INTAKE, sprint=oct_bug_batch.

---

## 3. NEXT AGENT BOOT

```
Last session (2026-10-10 INTAKE): BUG-533 registered — Extend Stay rack rate +
discount/collect now removal. All ODs locked. 3 files, 0 R5. Gate 1 complete.

Owner choices:
  a) "Gate 2 GO BUG-533" → PLANNING role (Impact Analysis)
  b) "Gate 2 GO BUG-533" + "Gate 3 GO BUG-533" → PLANNING (full IA + plan)
  c) Other items first
```
