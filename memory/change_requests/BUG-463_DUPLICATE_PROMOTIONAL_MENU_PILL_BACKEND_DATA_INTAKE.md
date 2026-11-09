# Intake — BUG-463
## Local Settings Active Menu: Two visually identical "Promotional Menu" pills

**Date:** 2026-09-25
**Registered by:** INTAKE agent (ALPHA v0.7) — sourced from CR-376 Gate 5b QA findings (QA_HYATT account)
**Source:** QA-FOUND (T9 NOTE in CR-376 Gate 5b QA report)
**Sprint:** sep_bug_closure

---

## Header (INTAKE mandatory fields)

| Field | Value |
|---|---|
| **Code Reality** | NONE — frontend renders menu type names verbatim from API. No frontend transformation or deduplication exists. The duplicate originates in backend/preprod data. |
| **Duplicate check** | DISTINCT — no existing bug covers this data issue. |
| **Blast radius** | NONE (frontend) / SMALL (backend data) — no FE code change required. Backend must correct the menu type record. |
| **Risk** | LOW — UI display only, no financial logic, no order flow impact. |

---

## Classification

| Field | Value |
|---|---|
| **Type** | BUG — backend data issue (typo in menu type name in preprod) |
| **Severity** | P3 — LOW. Staff see two identically-labelled pills. Selecting the typo version (`Promational Menu`) selects a different (likely empty) menu — confusing but not revenue-impacting. |
| **Area** | Backend preprod data — `menu_types` / `food_for` values for QA_HYATT restaurant |
| **Hotspot** | NO — no frontend file change |

---

## Step 0a — Code Reality Check

```bash
grep -rn "Promational\|Promotional" src/ --include="*.js" --include="*.jsx"
# Result: 0 hits — not hardcoded in frontend. Comes entirely from API.
```

**Code Reality: NONE (frontend). Backend data issue.**

---

## Step 0b — Duplicate Detection

| Check | Result |
|---|---|
| Registry keyword search: `Promotional`, `Promational`, `pill`, `duplicate menu` | No match. DISTINCT. |
| API trace | `productTransform.js:109` — `foodFor: api.food_for \|\| 'Normal'`. No normalisation/dedup of food_for values. |

**Duplicate check result: DISTINCT**

---

## Step 1 — Classify + Severity

**Symptom:** The QA_HYATT restaurant in preprod has two menu type entries with nearly identical names:
- `"Promotional Menu"` (correct)
- `"Promational Menu"` (typo — missing second `o`)

Both are returned in the products API under `food_for`. The Active Menu pill list in Local Settings renders both. They appear visually identical on screen. A cashier picking the wrong one activates a menu with a typo name — likely empty or incorrectly populated.

**Severity: P3 — LOW**
- Affects only QA_HYATT in preprod
- No code fix needed on frontend
- Typo correction in backend data resolves entirely

---

## Step 1b — Risk Classification

- **Risk: LOW** — display only, no FE code change, no financial logic
- **Frontend fix: NOT required**
- **Backend/data fix: YES** — correct `"Promational Menu"` → `"Promotional Menu"` in the restaurant's menu type configuration, OR merge products under the correct name

---

## Step 2 — Evidence

| Field | Value |
|---|---|
| **Source** | QA-FOUND — T9 observation, CR-376 Gate 5b (2026-09-25) |
| **Confidence** | CONFIRMED — JS pill extraction returned both `'Promational Menu'` and `'Promotional Menu'` in the array |
| **Repro steps** | 1. Login as owner@hyatt.com. 2. Navigate to Local Settings → Active Menu section. 3. Observe: two pills both displaying as "Promotional Menu". |
| **Evidence** | JS: `['24hrs Menu', 'Bar & Drinks', 'Breakfast', 'FOOD MENU', 'GROK', 'Kids Menu', 'PET FOOD', 'Promational Menu', 'Promotional Menu', 'Tea, Coffee & Soft Beverages']` — raw names from DOM buttons. |

---

## Step 3 — Blast Radius

| Metric | Value |
|---|---|
| Frontend files to change | **0** |
| Backend action needed | Correct/merge `"Promational Menu"` data entry for QA_HYATT restaurant |
| Scope | NONE (FE) / SMALL (backend data) |

---

```
Intake complete: BUG-463
Classification: BUG, Severity: P3, Risk: LOW
Duplicate check: DISTINCT
Evidence: CONFIRMED — raw JS pill array captured
Blast radius: NONE (frontend). Backend data fix only.
Docs updated: change_requests/BUG-463_..._INTAKE.md · registry.json · BUG_TRACKER.md
Frontend fix: NOT required.
Next: Backend Brief → owner to raise with backend/data team. No gate cycle needed on FE.
```
