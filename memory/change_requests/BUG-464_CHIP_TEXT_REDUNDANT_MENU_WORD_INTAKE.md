# Intake — BUG-464
## Order Entry chip reads "FOOD MENU Menu" — word "Menu" duplicated

**Date:** 2026-09-25
**Registered by:** INTAKE agent (ALPHA v0.7) — sourced from CR-376 Gate 5b QA findings (QA_HYATT account)
**Source:** QA-FOUND (T4 NOTE in CR-376 Gate 5b QA report)
**Sprint:** sep_bug_closure
**Related CR:** CR-376 (introduced the chip at L1722-L1731)

---

## Header (INTAKE mandatory fields)

| Field | Value |
|---|---|
| **Code Reality** | FULL — chip text rendered at `OrderEntry.jsx` L1729: `{activeMenuType} Menu`. For `activeMenuType = 'FOOD MENU'`, renders `"FOOD MENU Menu"`. |
| **Duplicate check** | DISTINCT — no existing bug covers chip text formatting. |
| **Blast radius** | SMALL — 1 file (`OrderEntry.jsx`), 1 line (L1729). |
| **Risk** | LOW — cosmetic only. No functional impact. No financial logic. No API change. |

---

## Classification

| Field | Value |
|---|---|
| **Type** | BUG — cosmetic, introduced by CR-376 E4c |
| **Severity** | P3 — LOW. Chip displays `"FOOD MENU Menu"` instead of `"FOOD MENU"`. Affects only menu types whose names already contain the word "MENU". UX is slightly awkward but does not block any flow. |
| **Area** | Order Entry > `OrderEntry.jsx` L1729 — chip label render |
| **Hotspot** | YES — `OrderEntry.jsx` is R5 hotspot |

---

## Step 0a — Code Reality Check

```bash
grep -n "activeMenuType.*Menu\|{activeMenuType} Menu" src/components/order-entry/OrderEntry.jsx
# L1729: {activeMenuType} Menu
```

**Code Reality: FULL** — hardcoded `" Menu"` suffix unconditionally appended.

---

## Step 0b — Duplicate Detection

| Check | Result |
|---|---|
| Registry keyword search: `chip`, `FOOD MENU`, `Menu Menu`, `activeMenuType chip` | No match. DISTINCT. |
| Code search | L1729 is the only chip text render site. |

**Duplicate check result: DISTINCT (related to CR-376 as parent)**

---

## Step 1 — Classify + Severity

**Symptom:** The active menu chip in Order Entry appends the word `" Menu"` to the stored `activeMenuType` value unconditionally. For most menu type names (e.g. `"Premium"` → `"Premium Menu"`, `"Breakfast"` → `"Breakfast Menu"`), this reads naturally. For types whose names already include `"MENU"` (e.g. `"FOOD MENU"` → `"FOOD MENU Menu"`), the result is visually redundant.

**Affected types (QA_HYATT):** `"FOOD MENU"`, `"Kids Menu"`, `"Promotional Menu"`, `"Promational Menu"`, `"24hrs Menu"`, `"Bar & Drinks"` (border case — no "menu" suffix here so OK).

**Severity: P3 — LOW.** Cosmetic only. Staff can still identify the active menu. No functional breakage.

---

## Step 1b — Risk Classification

- **Risk: LOW** — cosmetic display, no financial logic, no state change, no API
- **Fast Lane: NOT eligible** — `OrderEntry.jsx` is R5 hotspot (disqualifies regardless of LOW risk)
- If owner approves fix: needs PLANNING Gate 2-3 due to hotspot

---

## Step 2 — Evidence

| Field | Value |
|---|---|
| **Source** | QA-FOUND — T4 observation, CR-376 Gate 5b (2026-09-25) |
| **Confidence** | CONFIRMED — browser chip text captured: `"FOOD MENU Menu"` via `data-testid="active-menu-type-chip"` |
| **Repro steps** | 1. Login as owner@hyatt.com. 2. Set `localStorage.setItem('mygenie_active_menu_type', 'FOOD MENU')`. 3. Open any table. 4. Observe chip in Order Entry header reads `"FOOD MENU Menu"`. |

---

## Step 3 — Blast Radius

```bash
grep -n "{activeMenuType} Menu" src/components/order-entry/OrderEntry.jsx
# Result: 1 hit — L1729
```

| Metric | Value |
|---|---|
| Files to change | **1** — `OrderEntry.jsx` L1729 |
| Hotspot files | YES — R5 |
| Scope | SMALL (1 file, 1 line) |

## Proposed Fix Direction (for Planning agent)

```js
// L1729 current:
{activeMenuType} Menu

// Proposed — suppress " Menu" suffix if name already ends with menu-word (case-insensitive):
{/menu$/i.test(activeMenuType) ? activeMenuType : `${activeMenuType} Menu`}
```

---

```
Intake complete: BUG-464
Classification: BUG, Severity: P3, Risk: LOW
Duplicate check: DISTINCT (related to CR-376)
Evidence: CONFIRMED — chip text captured in browser
Blast radius: SMALL (1 file — OrderEntry.jsx R5 hotspot, 1 line)
Docs updated: change_requests/BUG-464_..._INTAKE.md · registry.json · BUG_TRACKER.md
Hotspot: YES (OrderEntry.jsx — R5). Fast Lane: NOT eligible.
Owner to decide: ship-as-is (P3 cosmetic) or fix via Planning Gate 2-3.
Next: Owner decision → Planning Gate 2-3 if owner approves fix.
```
