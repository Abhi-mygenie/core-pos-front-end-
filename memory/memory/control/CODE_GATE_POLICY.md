# Code-Gate Policy

**Effective:** 2026-05-31 (POS 4.0 consolidation)
**Status:** ACTIVE
**Related:** `CODE_GATE_WAIVER_REGISTRY_2026_05_30.md`, `CODE_GATE_PREMATURE_WAIVER_REGISTRY_2026_05_30.md`,
`POS4_QA_001_QA_BACKFILL_BRIEF_2026_05_31.md`

---

## 1. What the Code-Gate is

The **Pre-Implementation Code-Gate** (artifact #4 in the 7-artifact closure model) is a
diff-preview / scope-lock written **before** code is changed. It proves the change was scoped
against the real code surface, not improvised.

7-artifact model: `0 session-start · 1 intake · 2 impact · 3 plan · **4 code-gate** · 5 impl-summary+QA · 6 owner-smoke`.

---

## 2. The waiver (pre-Phase-4 work)

All work delivered **before POS 4.0** (POS 2.0 / 3.0 / 3.1 / CRM 2.0 / standalone / production
hotfixes) predates the formalised Code-Gate step. For that body of work the Code-Gate is
**WAIVED**:

- A **missing or `WAIVED` Code-Gate does NOT constitute closure debt** for pre-Phase-4 items.
- Waivers are recorded in the two Code-Gate Waiver Registries (premature + standard).
- This waiver is **Code-Gate only**. It does **not** waive the **QA artifact** — QA is still
  required for an item to leave the closure-debt register (see the QA-driven debt model).

## 3. From POS 4.0 onward — MANDATORY

Starting with the POS 4.0 sprint, the Code-Gate is **mandatory and non-waivable** for any
code-bearing CR/Bug:

- No implementation may begin until artifacts 0–4 exist and the owner gives GO.
- An item cannot reach SHIPPED/VERIFIED without a real Code-Gate (no retro waiver).
- POS 4.0 items are additionally **excluded from the active closure-debt count** while the
  sprint is in progress (they are tracked in the POS 4.0 backlog, not as debt).

---

## 4. Closure-debt impact (how the generator applies this)

`scripts/gen_dashboard_data.js` derives `closure_debt.json` using:

| Rule | Code-Gate behaviour |
|---|---|
| (b) | `art4_code_gate` missing/`WAIVED` → ignored for debt (pre-Phase-4 waiver) |
| (c) | `sprint_key === 'pos_4_0'` → item excluded from `active_debt` |
| (d) | `art5_impl_summary_qa !== 'PRESENT'` → item **is** active debt |

Result of the 2026-05-31 run: **19 active QA items, 11 QA-satisfied, 2 POS 4.0 excluded.**

---

## 5. Summary

| Era | Code-Gate | QA |
|---|---|---|
| Pre-POS 4.0 | Waived (registry-logged) | **Required** (POS4-QA-001 backfill) |
| POS 4.0+ | **Mandatory, non-waivable** | **Required** |
