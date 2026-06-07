# CR-006 — Item Customization Modal: Optional Variations & Multi-Select

**Status:** Requirements gathering & impact analysis (no code changes yet).
**Author:** Requirement Gathering Agent · 2026-05-01
**Source:** User-reported bug + side-by-side screenshot of new POS (left) vs old POS (right) for the WAFFLES item with ICECREAM (Optional) and ADDONS groups.
**Related:** CR-005 (concurrent CR — independent of this one).

---

## 1. Bugs reported

| # | Bug | Severity |
|---|---|---|
| 1 | Optional variation comes pre-selected (cannot represent "user did not pick") | **High** — wrong order data, customer billed for an optional add they didn't ask for |
| 2 | Multi-select variations are not supported (UI is single-select only) | **High** — feature gap; old POS supports it, new POS regression |

---

## 2. Evidence from raw inspection

Both bugs are **frontend-only**. The backend already supplies `type` (`single`/`multi`), `required` (boolean), `min` and `max` per variation group. They are mapped by the transform but ignored by the modal.

### 2.1 Transform — already correct
**File:** `frontend/src/api/transforms/productTransform.js` L155-166
```js
variations: (apiVariations) => {
  return apiVariations.map((variation, idx) => ({
    id: `vg-${idx}`,
    name: variation.name,
    type: variation.type,                  // 'single' | 'multi' ← AVAILABLE
    required: variation.required === 'on', // boolean         ← AVAILABLE
    min: variation.min || 0,               // ← AVAILABLE
    max: variation.max || 0,               // ← AVAILABLE
    options: fromAPI.variationOptions(variation.values),
  }));
}
```
✅ All metadata exists on `item.variantGroups[i]`. No backend change needed.

### 2.2 Modal — the regression points
**File:** `frontend/src/components/order-entry/ItemCustomizationModal.jsx`

| Line | Code | Problem |
|---|---|---|
| 7 | `useState({})` shape `{groupId: option}` | Can only hold one option per group |
| 32-40 | Auto-select `group.options[0]` for **every** group on open | Ignores `group.required` — optional groups get pre-selected |
| 100-102 | `selectVariant` replaces value, no toggle-off | Optional group's first-option pre-pick can never be cleared by user |
| 343 | `isSelected = selectedVariants[group.id]?.id === option.id` | Single-id compare; doesn't work for arrays |
| 86-88 | `Object.values(selectedVariants).reduce((s, opt) => s + opt.price, 0)` | Treats option as object, would crash on array |
| 164-167 | Submits `${group.name}: ${option.name}` (one label) | Loses multi-select information |
| 339 | Header shows `{group.name} {required && '*'}` | No `(Optional)` label in UI; old POS shows it explicitly |

### 2.3 Order placement — likely already accepts array
**File:** `frontend/src/api/transforms/orderTransform.js` L376-410
```js
const variantGroups = item.variantGroups || [];
let variations = [];
if (item.variantsByGroup) {
  // group → labels collection
}
variations = Object.entries(groupMap).map(([name, labels]) => ({ ... }));
```
Outbound transform is already grouped by name with a `labels` array — it can carry multiple labels per group out-of-the-box. ⚠️ **Needs verification** once the modal emits multi-select payloads, but appears safe.

---

## 3. Required behaviour

### 3.1 Optional vs Required
| Group | Header label | On modal open | Validation |
|---|---|---|---|
| `required === true` | `<NAME> *` (orange asterisk, current behaviour kept) | First option pre-selected (current behaviour kept) | Must have at least one option selected before "Add to Order" enabled |
| `required === false` | `<NAME> (Optional)` (new label, matches old POS) | **No option pre-selected** | "Add to Order" enabled with zero selections |

### 3.2 Single vs Multi
| `type` | UI control | Selection model |
|---|---|---|
| `single` (or undefined) | Pill buttons (current behaviour kept) | Click to select; click another option replaces |
| `multi` | **Checkbox rows** (matching old POS visual) | Click to toggle on/off; multiple options can be active |

### 3.3 Min / Max enforcement (`min`, `max` per group)
- If `min > 0` and current count < `min` → block "Add to Order" + show inline hint (e.g., "Pick at least 2")
- If `max > 0` and current count === `max` → grey out unselected options in that group + tooltip ("Maximum 3 reached")
- `min`/`max` apply only to `multi` groups; single-select implicitly enforces 1.

### 3.4 De-selection for optional single-select
- Currently single-select pill has no way to clear. For `required === false` single-select groups, clicking the same selected pill should **toggle it off** so the user can revert to "no choice".

### 3.5 Total recalculation
- `calculateTotal()` must walk all selected options across all groups (not assume one option per group). Pseudocode:
  ```
  variantsPrice = 0
  for each group in variantGroups:
    selected = selectedVariants[group.id]   // either {option} or [{option}, ...]
    if Array.isArray(selected):
      variantsPrice += sum(selected.map(o => o.price))
    else if selected:
      variantsPrice += selected.price
  ```

### 3.6 Submit payload
- `variants` array entry per group: when multi → `${group.name}: ${labels.join(', ')}` (or backend's preferred shape — confirm with `orderTransform.js` outbound).

---

## 4. File-by-file impact

| File | Lines | Change |
|---|---|---|
| `components/order-entry/ItemCustomizationModal.jsx` | 7 | State shape extension to support array per group |
| same | 32-40 | Initial-selection rule: only pre-select first option when `group.required === true` AND `group.type !== 'multi'` |
| same | 86-97 | `calculateTotal` to walk both single and array selections |
| same | 100-102 | `selectVariant` to handle multi (push/remove from array) and single optional toggle-off |
| same | 132-138 | `allRequiredSelected` extended to enforce `min` and `max` |
| same | 162-170 | Customizations payload to handle array shape |
| same | 333-367 | Render block — switch between pill and checkbox layout per `group.type`; show `(Optional)` label when not required |
| `api/transforms/productTransform.js` | 155-178 | (no change) — already provides everything |
| `api/transforms/orderTransform.js` | 376-410 | Verify outbound shape unchanged when array carries multiple labels (unit test in `__tests__/`) |
| `__tests__/` | new | Test cases: optional+empty, optional+single-pick, required+single-pick, multi+min-violated, multi+max-clamp |

---

## 5. UX details (matching old POS)

From the right-hand screenshot:
- Group label: `<NAME> (Optional)` in lighter text — match wording exactly.
- Multi-select control: **square checkbox** (white when off, primary-orange tick when on) with option label and right-aligned `+₹<price>`.
- Single-select control: pill (current new POS UI is fine).
- Total amount line at bottom updates live.

Recommend matching the right-hand visual (checkbox rows for multi-select groups). Confirm if the visual must match the old POS exactly, or if a different multi-select pattern is acceptable (e.g., outlined pills with checkmark).

---

## 6. Risks

| ID | Risk | Mitigation |
|---|---|---|
| R-1 | `orderTransform.js` outbound payload may need adjustment if it assumes one label per group | Add unit test with multi-label group before shipping |
| R-2 | Cart re-edit (`item.selectedVariants` saved shape) breaks for already-placed orders if state shape changes | Migration helper: when reading saved selections, normalize to new shape |
| R-3 | Print/KOT formatting may collapse multiple labels onto one line awkwardly | Verify on bill/KOT preview during QA |
| R-4 | Older menus may not have `type` field at all — defaulting to `single` is the safe behaviour | Already handled by transform; modal must default to single when `type` falsy |

---

## 7. Open questions

| ID | Question | Suggested default |
|---|---|---|
| Q-V1 | When a single-select group is `required === false`, should clicking the same option toggle it off? | Yes (per §3.4) |
| Q-V2 | Multi-select UI: checkbox rows (match old POS exactly), or outlined pills with checkmark icon (match new POS pill aesthetic)? | Checkbox rows for fidelity |
| Q-V3 | If `min === 0` and `max === 0` on a multi-select group, treat as "no constraints" or "single-select"? | No constraints (any number including 0) |
| Q-V4 | What is the backend's expected outbound payload shape for multi-select variations? | Verify against `orderTransform.js:376-410` and live preprod placement |
| Q-V5 | Should existing cart-saved single selections auto-upgrade to array shape on re-edit? | Yes — normalize on read |

---

## 8. Out of scope

- Add-on min/max (not requested in this CR).
- Image-rich variation rows (old POS doesn't have them either).
- Variation availability time windows (`web_available_time_starts/ends`) — separate concern.

---

## 9. Hand-off note

This is a frontend-only fix. Once Q-V1..Q-V5 are answered, implementation can begin without any backend dependency. Recommended sequence:

1. **Phase A** — Fix Bug #1 (optional auto-select). Tiny diff in `useEffect` initializer + render header label. Low risk, ship first.
2. **Phase B** — Fix Bug #2 (multi-select). Larger diff — state shape, render branch, payload shape, tests. Coordinate with QA on `orderTransform.js` outbound verification.

---

## 10. Decision log

| Date | Decision | Source |
|---|---|---|
| 2026-05-01 | Bugs raised; no code changes yet | User |
| 2026-05-01 | Confirmed both bugs are frontend-only — backend already ships `type`, `required`, `min`, `max` | Code inspection |
