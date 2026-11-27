# BUG-682 — CR-493 B5 Implementation Bug: cancelNoteMandatory in Wrong Transform Object

**Registered:** 2026-11-17
**Type:** BUG (QA failure on implemented CR)
**Sprint:** nov_cr_batch
**Priority:** P0
**Risk:** LOW (1 line primary + 3 prop wires, 4 files, not hotspot)
**Status:** GATE_1_INTAKE_COMPLETE
**Client:** ALL
**Assignee:** Abhishek
**Routing reason:** FE-only fix
**Parent:** CR-493 B5 (Cancel Note Mandatory — GATE_5A_IMPLEMENTED)

---

## 1. Description

CR-493 B5 was implemented and marked GATE_5A_IMPLEMENTED on 2026-11-16. However, the Cancel Order modal **always shows "Notes (Optional)"** even when the backend setting `cancel_note_mandatory` is "Yes".

**Root cause:** `cancelNoteMandatory` is correctly parsed in `profileTransform.js → fromAPI.settings()` (line 429) and stored at `restaurant.settings.cancelNoteMandatory = true`. But the UI reads from `restaurant.cancellation.cancelNoteMandatory` (via `RestaurantContext.jsx`), and the `cancellation` object at `profileTransform.js:225-230` does NOT include `cancelNoteMandatory`. Result: always `undefined` → `false`.

---

## 2. Classification

- **Type:** BUG (CODE_ERROR — field mapped to wrong sub-object in CR-493 B5 implementation)
- **Severity:** P0 — Cancellation control feature broken. Staff can submit empty cancel notes when owner required them mandatory.
- **Risk:** LOW — 1 primary line + 3 consumer prop additions, 4 files, none are R5 hotspots
- **Fast Lane:** YES (eligible — ≤10 lines, no hotspot, not financial)
- **Planning skip eligible:** YES — owner approval required

---

## 3. Duplicate Check

- CR-493 B5: PARENT — this is a bug IN the CR-493 B5 implementation
- **Result: DISTINCT**

---

## 4. Evidence

- **Source:** AGENT-DISCOVERED (Investigation session 1, 2026-11-17)
- **Confidence:** HIGH (reproduced + traced, API probe confirmed setting = "Yes")
- **Test account:** owner@palmhouse.com / Qplazm@10
- **API proof:** `curl /profile` → `settings.cancel_note_mandatory: "Yes"` (saved in evidence)
- **Screenshot:** UI shows "Notes (Optional)" with backend showing "Yes"

---

## 5. Fix

**Primary (1 line):** Add to `cancellation` object in `profileTransform.js:225-230`:
```js
cancelNoteMandatory: api.settings?.cancel_note_mandatory === 'Yes',  // BUG-682
```

**Secondary (3 lines):** Wire prop in consumers that use `CancelOrderModal` without passing `cancelNoteMandatory`:
- `AllOrdersReportPage.jsx:1129` — add `cancelNoteMandatory={cancellation.cancelNoteMandatory}`
- `OrderReportBetaPage.jsx:899` — add `cancelNoteMandatory={cancellation.cancelNoteMandatory}`
- `DashboardPage.jsx:2266` — add `cancelNoteMandatory={cancellation.cancelNoteMandatory}`

**Total: ~4 lines, 4 files**

---

## 6. Blast Radius

- `profileTransform.js` — 1 line (transform mapping)
- `AllOrdersReportPage.jsx` — 1 prop addition
- `OrderReportBetaPage.jsx` — 1 prop addition
- `DashboardPage.jsx` — 1 prop addition
- **SMALL** (4 files, ~4 lines, no hotspots)

---

```
Intake complete: BUG-682
Classification: BUG, Severity: P0, Risk: LOW
Duplicate check: DISTINCT (parent: CR-493 B5)
Evidence: code-traced + API-probed (investigation report)
Blast radius: SMALL (4 lines, 4 files)
Client: ALL
Assignee: Abhishek
Fast Lane: eligible (owner approval)
Next: Owner approves Fast Lane → Direct bug fix
```
