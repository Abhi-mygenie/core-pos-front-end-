# Intake — BUG-394
## Number Inputs Accept Special Characters — Silent Data Corruption Across 4 Files

**Date:** 2026-09-10
**Registered by:** INTAKE Agent (ALPHA v0.7)
**Source:** OWNER-REPORTED + AGENT-CONFIRMED-IN-CODE
**Sprint:** pos_7_0
**Investigation report:** `/app/memory/handover/SESSION_HANDOVER_2026_09_10_FULL_DAY_CLOSE.md` (INV-1 section)
**Evidence:** `/app/memory/evidence/BUG-394/code_evidence_2026_09_10.json`

---

## Classification

| Field | Value |
|-------|-------|
| **Type** | BUG — Data integrity defect |
| **Severity** | **P1 — HIGH** |
| **Risk** | **HIGH** — price fields, financial data, API contract violation, hotspot file |
| **Area** | Menu Management → ProductForm, BulkEditor, AddonManagementPanel, VariationExpandPanel |
| **Fast Lane** | **NOT ELIGIBLE** — 4 files, price/financial logic, BulkEditor is hotspot |
| **Planning skip** | **NOT ELIGIBLE** — 4 files require full Gate 2→3→4 cycle |
| **Backend changes** | ZERO — pure FE input validation fix |

**Severity rationale:**
- AddonManagementPanel is a **BLOCKER** — raw string `"-"` is stored in state as-is and sent directly to the backend API price field. Backend receives corrupt string data.
- All other patterns are **MAJOR** — `parseFloat("-") || 0` and `Number("-")` silently corrupt data to `0` or `NaN` with no user-visible error. Staff see the field show `0`, assume it accepted their input, and save.

---

## Owner Trigger (verbatim)

> Owner observed: `-` (minus sign) typed in the Price field silently converts to `0` instead of showing an error or rejecting the input.

---

## Root Cause — 5 Patterns, 4 Files

| # | File | Line | Broken Code | Behaviour on `-` | Severity |
|---|------|:----:|-------------|-----------------|----------|
| P1 | `ProductForm.jsx` InputField | L18 | `parseFloat(e.target.value) \|\| 0` | `parseFloat('-')` = `NaN` → `NaN \|\| 0` = **0 silently** | MAJOR |
| P2 | `BulkEditor.jsx` renderCell | L1403 | `Number(e.target.value)` | `Number('-')` = `NaN` → **NaN stored in cell state** | MAJOR |
| P3 | `AddonManagementPanel.jsx` price (add+edit) | L156, L237 | `price: e.target.value` | **raw string `"-"` stored and sent to API** | **BLOCKER** |
| P4 | `AddonManagementPanel.jsx` weight (add+edit) | L158, L239 | `Number(e.target.value)` | `Number('-')` = `NaN` → NaN in state | MAJOR |
| P5 | `VariationExpandPanel.jsx` price | L54 | `parseFloat(e.target.value) \|\| 0` | `parseFloat('-')` = `NaN` → **0 silently** | MAJOR |

**No sanitisation guards exist anywhere in these 4 files.** `isNaN`, `isFinite`, or regex guards are completely absent from all number `onChange` handlers.

---

## Why P3 (AddonManagementPanel) is a BLOCKER

```js
// add mode — line 156
onChange={e => setAddForm(p => ({ ...p, price: e.target.value }))}
//                                              ^^^^^^^^^^^^^^^^ raw string — no conversion

// edit mode — line 237
onChange={e => setEditForm(p => ({ ...p, price: e.target.value }))}
```

There is **zero numeric conversion**. The value goes straight from the DOM input into state, and then from state into the API payload. If a user types `"-"` or `"abc"`, the API receives a string instead of a number for the addon price field.

---

## Steps to Reproduce

1. Log in to preprod, navigate to **Menu Management → Addons tab**.
2. Click "Add Addon" or edit an existing addon.
3. Click the **Price** field and type `-`.
4. Click **Save**.
5. **Expected:** Error message, input rejected, or field clears.
6. **Actual:** Form saves with `price: "-"` sent directly to the API.

For ProductForm / BulkEditor / VariationExpand:
1. Open any menu item for editing.
2. Click into the **Price** number field, type `-`.
3. **Actual:** Field shows `0` immediately (NaN silently coerced). No error.

---

## Evidence

- **Source:** OWNER-REPORTED (trigger) + AGENT-CONFIRMED-IN-CODE (5 patterns traced)
- **Confidence:** CONFIRMED — code traces show exact broken handlers
- **Screenshots:** Not provided (owner verbal report)
- **Code evidence:** `/app/memory/evidence/BUG-394/code_evidence_2026_09_10.json`
- **Curl output:** Not applicable (FE-side fix, no API probe needed)

---

## Blast Radius

```bash
# grep for affected patterns
grep -n "parseFloat(e.target\|Number(e.target" src/components/panels/menu/*.jsx
# → 5 hits across 4 files (all confirmed above)
```

| Metric | Value |
|--------|-------|
| Files affected | 4 |
| onChange handlers | 5 |
| Hotspot files | **YES** — `BulkEditor.jsx` |
| Financial data | **YES** — price fields directly |
| API impact | **YES** — AddonManagementPanel sends raw string |
| Estimated scope | **MEDIUM** (4 files, ~5-10 lines of fix) |

---

## Duplicate Check

| Bug | Title | Verdict |
|-----|-------|---------|
| **BUG-392** | Scroll wheel changes price | **RELATED** — same 4 files, scroll wheel added `onWheel` guards but did NOT fix invalid char handling. BUG-394 is a distinct failure mode. |
| **BUG-103** | Remove number input arrows | **CLOSED** — different issue (arrows UI, not input validation) |
| All others | — | **DISTINCT** — no other bug covers special char / NaN / silent 0 in menu price inputs |

**Duplicate check result: DISTINCT (RELATED to BUG-392)**

---

## Owner Decisions

None required — behaviour is clearly wrong. Fix is straightforward input sanitisation.

---

## Proposed Fix Pattern (for Planning agent)

```js
// Safe onChange for number inputs (Planning agent to confirm exact implementation):
const handleNumericChange = (val, setter, fallback = 0) => {
  if (val === '' || val === '-') return; // let user clear; reject lone minus
  const n = parseFloat(val);
  if (!isNaN(n) && n >= 0) setter(n);
  // else: ignore keystroke — do not store NaN or negative
};
```

**Note:** Planning agent must decide: reject mid-typing or reject on blur? Owner has not specified UX preference — agent to recommend in Gate 2 plan.

---

## Registration

| Field | Value |
|-------|-------|
| ID | **BUG-394** |
| Title | Number inputs accept special chars (-, letters) — silent data corruption across 4 files |
| Sprint | pos_7_0 |
| Gate | 1 — INTAKE |
| Priority | P1 HIGH |
| Risk | HIGH |
| Code reality | NONE |
| Planning skip | NOT ELIGIBLE |
| Next step | Gate 2 GO from owner → PLANNING (Impact Analysis) |

---

*Intake complete. BUG-394 registered. All 5 patterns confirmed in code. Ready for Gate 2.*
*INTAKE Agent — ALPHA v0.7 — 2026-09-10*
