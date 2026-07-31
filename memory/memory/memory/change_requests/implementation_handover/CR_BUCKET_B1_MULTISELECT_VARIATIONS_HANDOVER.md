# CR-006 Phase B / Bucket B1 — Multi-Select Variations — Implementation Handover

**Status:** SHIPPED 2026-05-03. Owner-approved + verified end-to-end on preprod.
**Author:** Implementation Agent · session 2026-05-03.
**Source planning handover:** `/app/memory/change_requests/implementation_handover/CR_005_to_009_IMPLEMENTATION_HANDOVER.md` §10.B1.
**Parent CR:** `/app/memory/change_requests/CR_006_VARIATION_MODAL_OPTIONAL_AND_MULTISELECT.md`
**Predecessor bucket:** A1 (Phase A of CR-006) — Optional variation behaviour shipped earlier in this session.

---

## 1. Bucket implemented

| Item | Detail |
|---|---|
| CR | CR-006 #2 — Multi-select variations in `ItemCustomizationModal.jsx` |
| Bucket | B1 (Phase B of CR-006) |
| Scope | Operators can now pick **multiple options** from variation groups where backend config has `type === 'multi'` (e.g. Big Buddha Burger → Choice Of Filling). |
| Constraint enforcement | `min` and `max` per group are honoured by the UI (block Add-to-Order until min met; disable additional clicks once max reached). |
| Visual | Outlined pills with checkmark icon (Owner choice **1b**) for multi groups. Single-select pills unchanged. |
| Backend contract | Verified via preprod DevTools trace (Big Buddha Burger order, 2026-05-02). Backend already accepts `{ name, values: { label: [...] } }` with array shape — zero backend change required. |

---

## 2. Owner approvals received

| Gate | Approved by | When |
|---|---|---|
| Q-V4 unblock — backend payload shape verified via DevTools trace | Owner (pasted live order JSON) | 2026-05-02 |
| Multi-select visual style 1b (outlined pills + checkmark) | Owner ("1. b") | 2026-05-03 |
| `max=7` vs label "Max 2" data discrepancy → honour data, log separately as menu-config ticket | Owner ("2 d") | 2026-05-03 |
| B2 handover written **after** B1 ships | Owner ("3 after B1 ships") | 2026-05-03 |
| Apply gate | Owner ("Apply") | 2026-05-03 |
| Verification gate | Owner ("pass") | 2026-05-03 |

---

## 3. Files changed

| File | Lines | Nature |
|---|---|---|
| `frontend/src/components/order-entry/ItemCustomizationModal.jsx` | ~180 LOC across 7 blocks | State shape, toggle logic, validation, render branch |
| `frontend/src/api/transforms/orderTransform.js` | L381-409 (groupMap builder) | Array-aware option iteration; backend payload shape unchanged |

**Files NOT touched** (kept hotspot discipline): `OrderEntry.jsx`, `CollectPaymentPanel.jsx`, `OrderTable.jsx`, any backend / `.env`.

---

## 4. Behaviour shipped

### 4.1 State shape
```jsx
selectedVariants = {
  [groupId]: option         // single-select group  (existing)
  [groupId]: option[]       // multi-select group   (NEW)
}
```
The shape per groupId is determined by `group.type` and never mixed. Single-select code paths fully preserved.

### 4.2 Toggle logic (`selectVariant`)
- **Multi:** click adds to array; click again removes. Cap at `group.max` (max=0 means unlimited).
- **Single — required:** replace only (existing).
- **Single — optional:** click same selected option to deselect (A1 behaviour, preserved).

### 4.3 Validation (`allRequiredSelected`)
| Group config | Add-to-Order rule |
|---|---|
| `single` + `required` | Must have a selection |
| `single` + optional | Always allowed (zero or one) |
| `multi` + `required` | `length >= max(1, group.min)` |
| `multi` + optional + `min > 0` | If anything picked, must hit min; empty array allowed |
| `multi` + optional + `min == 0` | Always allowed |

### 4.4 Inline hint text (multi groups only)
| Condition | Text shown | Color |
|---|---|---|
| Required not yet met | `Pick at least N` | Orange |
| Optional with min, picked but under min | `Pick at least N` | Orange |
| Max reached | `Maximum N reached` | Orange |
| Constraint exists, count valid | `X selected • min N • max M` | Grey |

### 4.5 Render — visual differentiation
- **Single-select:** solid green pill on select (legacy look — UNCHANGED).
- **Multi-select:** outlined pill with empty checkbox icon → on select, fill becomes light green tint, border + checkbox solid green, white ✓ inside checkbox. Disabled at-max state shows reduced opacity + cursor-not-allowed + tooltip.

### 4.6 Total recalc (`calculateTotal`)
Now sums option prices across both shapes uniformly:
```js
sel => Array.isArray(sel)
  ? sel.reduce((s, o) => s + (o?.price || 0), 0)
  : (sel?.price || 0)
```

### 4.7 Outbound payload (`orderTransform.buildCartItem`)
Normalises any `selectedVariants[groupId]` to an array, then iterates each option into the existing `groupMap` builder. Empty arrays are skipped → no phantom group entries on the wire.

```jsonc
"variations": [
  { "name": "Choice Of Dip",             "values": { "label": ["Tomato Relish"] } },
  { "name": "Choice Of Filling (Max 2)", "values": { "label": ["Pineapple", "Cheddar"] } }
]
```
**Confirmed accepted by backend** via preprod live order on Big Buddha Burger.

### 4.8 Cart customizations summary (display copy)
For multi groups, the cart-line summary now reads `Group: OptionA, OptionB` instead of dropping all but one label.

---

## 5. Verification done

| Check | Result |
|---|---|
| ESLint — `ItemCustomizationModal.jsx` | ✅ Clean |
| ESLint — `orderTransform.js` | ✅ Clean |
| Webpack compile | ✅ Successful |
| Smoke load (login page renders) | ✅ Pass |
| Owner end-to-end on preprod — Big Buddha Burger, 2 fillings selected, order placed, payload inspected | ✅ Pass |

---

## 6. Backward compatibility checklist

| Path | Behaviour |
|---|---|
| Single-select pills | UI / state / payload all UNCHANGED |
| Optional single-select toggle-off (A1) | Preserved |
| Re-edit from cart (running orders, hold orders) | `selectedVariants` accepts both shapes; `useEffect` restores either cleanly |
| Inbound `variation` shape from socket / running-orders (RESPONSE shape) | Already normalised at `orderTransform.js:410-422` (BUG-VARIATION-RESHAPE patch) — untouched |
| Empty multi groups | Filtered out of outbound payload (no `{ name, values: { label: [] } }` ever sent) |

---

## 7. Open follow-ups

| ID | Description | Status |
|---|---|---|
| **CR-012 (NEW)** | Big Buddha Burger label says *"Max 2"* but backend `max = 7` — menu-config inconsistency. Frontend honours data (max=7) per Owner direction (`2 d`). | TO BE LOGGED — see §8 |
| **B1 — UX polish (optional)** | Show selected count badge in section header (e.g. `(2/7)`) | Backlog |
| **B1 — Telemetry** | Track multi-select usage to identify dead variation groups | Backlog |

---

## 8. CR-012 stub — to be created

**File:** `/app/memory/change_requests/CR_012_BIG_BUDDHA_FILLING_MAX_LABEL_MISMATCH.md`
**Type:** Menu-config data ticket (not code)
**Description:** Multiple Palm House burger items have group label *"(Max 2)"* embedded in `name` but `max=7` (or `max=2`) in the underlying config. Frontend B1 honours the numeric `max`. Restaurant team must reconcile so the visible label matches the enforced cap.
**Affected items observed (Palm House preprod, 2026-05-02):**
- Big Buddha Burger (V) id 107738, 107478 — label "Max 2", max=7 (107738) / max=2 (107478)
- Zanzibar Burger (V) id 107739, 107479 — label "Max 2", max=7 / max=2
- Open Burger (V,GF) id 107740, 107480 — label "Max 3", max=3 ✅ (consistent)

---

## 9. Backups

| File | Backup path |
|---|---|
| `ItemCustomizationModal.jsx` | `ItemCustomizationModal.jsx.bak.B1` |
| `orderTransform.js` | `orderTransform.js.bak.B1` |

Backups can be removed once the next session confirms B1 is stable in production. Rollback command:
```bash
cp ItemCustomizationModal.jsx.bak.B1 ItemCustomizationModal.jsx
cp orderTransform.js.bak.B1 orderTransform.js
sudo supervisorctl restart frontend
```

---

## 10. Sign-off

- **Owner sign-off (verification gate):** "pass" — 2026-05-03.
- **Closes:** CR-006 Phase B (multi-select).
- **CR-006 overall closure:** Phase A (optional) + Phase B (multi-select) both shipped → **CR-006 fully closed.**
- **Next bucket:** Owner to choose between D1 (CR-008 #4 default landing screen, hotspot) and parked-backend buckets pending backend fields.
