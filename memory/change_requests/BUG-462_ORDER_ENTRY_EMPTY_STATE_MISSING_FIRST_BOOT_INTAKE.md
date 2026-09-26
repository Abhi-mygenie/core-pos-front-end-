# Intake — BUG-462
## Order Entry: Empty-state not shown on first boot for non-Normal restaurants

**Date:** 2026-09-25
**Registered by:** INTAKE agent (ALPHA v0.7) — sourced from CR-376 Gate 5b QA findings (QA_HYATT account)
**Source:** QA-FOUND (T10 FAIL in CR-376 Gate 5b QA report)
**Sprint:** sep_bug_closure
**Related CR:** CR-376 (Menu Switch — the feature that introduced the condition)

---

## Header (INTAKE mandatory fields)

| Field | Value |
|---|---|
| **Code Reality** | FULL — condition exists at `OrderEntry.jsx` L1800: `activeMenuType !== 'Normal' && activeMenuProducts.filter(...).length === 0`. The guard `activeMenuType !== 'Normal'` is the direct cause. |
| **Duplicate check** | DISTINCT — no existing BUG or CR covers first-boot empty-state gap. CR-376 introduced the feature; this is a gap in that implementation. Related: CR-376 (parent). |
| **Blast radius** | SMALL — 1 file (`OrderEntry.jsx`), 1 line change in the condition at L1800. |
| **Risk** | MEDIUM — UX display only, no financial logic, no API change, no localStorage key change. But `OrderEntry.jsx` is an **R5 hotspot file** — requires explicit file-level plan + regression checklist. Fast Lane NOT eligible. |

---

## Classification

| Field | Value |
|---|---|
| **Type** | BUG — code gap introduced by CR-376 implementation |
| **Severity** | P2 — MEDIUM. QA_HYATT first-boot cashier sees a blank item grid with no explanation and no call-to-action. They cannot proceed and have no guidance to fix via Local Settings. No revenue impact (cannot accidentally place order). |
| **Area** | Order Entry > `OrderEntry.jsx` L1800 — empty-state render condition |
| **Hotspot** | YES — `OrderEntry.jsx` is R5 hotspot |

---

## Step 0a — Code Reality Check

```bash
grep -n "activeMenuType.*Normal\|active-menu-empty-state" src/components/order-entry/OrderEntry.jsx
# L1800: {activeMenuType !== 'Normal' && activeMenuProducts.filter(p => p.isActive && !p.isDisabled).length === 0 ? (
# L1801:   <div ... data-testid="active-menu-empty-state">
```

**Code Reality: FULL** — condition is present, gap is in the guard logic.

---

## Step 0b — Duplicate Detection

| Check | Result |
|---|---|
| Registry keyword search: `empty-state`, `first-boot`, `activeMenuType`, `Normal default` | No match. DISTINCT. |
| Codebase grep for existing fix | No guard workaround exists. DISTINCT. |
| Handover symptom match | CR-376 Gate 3 handover (line 70) explicitly calls this out as **expected** behaviour — but QA T10 test in the QA handover expects it to show. Contradiction between planning intent and code. |

**Duplicate check result: DISTINCT (related to CR-376 as parent)**

---

## Step 1 — Classify + Severity

**Symptom:** On first boot (no `mygenie_active_menu_type` in localStorage), `getActiveMenuType()` returns `'Normal'` (default). For restaurants with zero Normal products (e.g. QA_HYATT — all products are FOOD MENU / Bar & Drinks / Breakfast etc.), `activeMenuProducts` is empty. However the empty-state guard condition `activeMenuType !== 'Normal'` is `false`, so the empty-state block is never rendered. Staff see a blank item grid with visible categories on the left but zero items anywhere.

**Severity: P2 — MEDIUM**
- New cashier on first boot has no idea what's wrong
- Cannot take orders (menu invisible)
- No call-to-action to fix in Local Settings
- Workaround exists: manager must know to go to Local Settings → Active Menu and pick a menu type

---

## Step 1b — Risk Classification

- **Risk: MEDIUM**
- Trigger: Component state + display logic. Non-financial. No API change. No localStorage key rename.
- File: `OrderEntry.jsx` (R5 hotspot) — requires explicit plan + regression checklist per Rule R5
- **Fast Lane: NOT eligible** — hotspot file (R5 disqualifies)

---

## Step 2 — Evidence

| Field | Value |
|---|---|
| **Source** | QA-FOUND — T10 FAIL, CR-376 Gate 5b (2026-09-25) |
| **Confidence** | CONFIRMED — reproduced in browser + JS verified `document.querySelector('[data-testid="active-menu-empty-state"]')` returns `null` |
| **Screenshot** | Blank item grid, categories visible left, no empty-state message |
| **Repro steps** | 1. Login as owner@hyatt.com. 2. `localStorage.removeItem('mygenie_active_menu_type')`. 3. Open any table → Order Entry. 4. Observe: blank item grid, no empty-state element. |
| **Root cause (exact)** | `OrderEntry.jsx` L1800: condition `activeMenuType !== 'Normal'` is `false` on first boot (default = 'Normal'). Guard prevents empty-state even when `activeMenuProducts` is empty. |

---

## Step 3 — Blast Radius

```bash
grep -rn "active-menu-empty-state\|activeMenuType.*Normal" src/ --include="*.jsx" | wc -l
# Result: 3 hits — all in OrderEntry.jsx (L1723, L1800, L1801)
```

| Metric | Value |
|---|---|
| Files to change | **1** — `OrderEntry.jsx` only |
| Hotspot files | YES — `OrderEntry.jsx` is R5 |
| Scope | SMALL (1 file, ≤3 lines change) |
| Open owner questions | None — fix direction clear: remove or broaden `activeMenuType !== 'Normal'` guard at L1800. Planning agent must decide exact condition to avoid side-effects for Normal-only restaurants. |

---

## Proposed Fix Direction (for Planning agent)

Change L1800 condition from:
```js
activeMenuType !== 'Normal' && activeMenuProducts.filter(p => p.isActive && !p.isDisabled).length === 0
```
To one of these (Planning agent to confirm which):
```js
// Option A — remove Normal guard entirely (empty-state for ANY menu with 0 items)
activeMenuProducts.filter(p => p.isActive && !p.isDisabled).length === 0

// Option B — also guard with availableMenuTypes.length > 1 (only multi-menu restaurants)
availableMenuTypes.length > 1 && activeMenuProducts.filter(p => p.isActive && !p.isDisabled).length === 0
```
Option B is safer: Normal-only restaurants (single menu) never see the empty-state (regression safe).

---

```
Intake complete: BUG-462
Classification: BUG, Severity: P2, Risk: MEDIUM
Duplicate check: DISTINCT (related to CR-376)
Evidence: CONFIRMED — reproduced in browser, JS-verified
Blast radius: SMALL (1 file — OrderEntry.jsx R5 hotspot, ≤3 lines)
Docs updated: change_requests/BUG-462_..._INTAKE.md · registry.json · BUG_TRACKER.md
Hotspot: YES (OrderEntry.jsx — R5). Fast Lane: NOT eligible.
Next: Planning Gate 2 (Impact Analysis) — owner to approve.
```
