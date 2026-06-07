# Per-Bucket Implementation Handover — Bucket A1 (CR-006 Phase A — Optional Variation Fix)

**Bucket:** A1 — CR-006 Phase A (Optional auto-select fix)
**Implemented by:** Implementation Agent
**Date:** 2026-05-02
**Delivery model:** Staged — split into 3 sub-buckets (A1.1 → A1.2 → A1.3), each shipped + manually validated by owner before the next started.
**Status:** ✅ All 3 sub-buckets implemented, lint clean, manually validated against `Ocean Blue (V)` (`owner@palmhouse.com`). Phase B (multi-select UI) deferred to bucket B1 — out of scope here.

---

## 1. Source planning handover

- **Main planning handover:** `/app/memory/change_requests/implementation_handover/CR_005_to_009_IMPLEMENTATION_HANDOVER.md` §10.A1
- **Source contract:** `/app/memory/change_requests/CR_006_VARIATION_MODAL_OPTIONAL_AND_MULTISELECT.md` (Phase A only — Phase B is bucket B1)
- **Repo / branch:** upstream `core-pos-front-end-` @ `1-may`

## 2. Bucket implemented

Three behaviour fixes inside `ItemCustomizationModal.jsx` to make optional variation groups behave correctly — no silent auto-pick, a visible `(Optional)` label, and one-tap clearing of an unwanted optional pick. Multi-select rendering (CR-006 Bug #2) remains in single-pill mode and is owned by bucket B1.

## 3. User approvals received

| # | Ask | Decision |
|---|---|---|
| 1 | Pre-implementation: scope, impact analysis, staged delivery plan | ✅ Approved (staged: A1.1 → manual val → A1.2 → manual val → A1.3 → manual val) |
| 2 | A1.1 diff — initializer `if (group.required && group.type !== 'multi')` guard | ✅ Approved → applied → manually validated on `Ocean Blue (V)` |
| 3 | A1.2 diff — full ternary header label `(Optional)` for `!group.required` | ✅ Approved → applied → manually validated |
| 4 | A1.3 diff — toggle-off for optional single-select | ✅ Approved → applied → manually validated |
| 5 | Q-V1 (toggle-off behaviour) | ✅ Default = Yes (toggle-off enabled for optional single-select) |
| 6 | Test file deferral (same TEST-INFRA-001 reason as A0a/A0b) | ✅ Implicitly approved — no devDeps added |

## 4. Open questions answered

| ID | Source | Resolution |
|---|---|---|
| Q-V1 | Main handover §12 | Yes — optional single-select toggles off when the same pill is clicked. Required groups stay replace-only. |
| Q-V5 | Main handover §12 | Out of scope for A1 — Phase B (B1) concern. |
| Test infra | Section 9 below | Deferred to TEST-INFRA-001 (same reason as A0a/A0b). |

## 5. Files changed

| File | Edits | Net Δ | Sub-bucket |
|---|---|---|---|
| `frontend/src/components/order-entry/ItemCustomizationModal.jsx` | 3 in-place edits + 13 comment lines | +24 / −3 (net +21) | All three (A1.1 at L34–43, A1.2 at L343–347, A1.3 at L100–117) |

**One file, three function bodies, zero new files.** No transforms, no contexts, no other components.

## 6. Detailed edit log

### A1.1 — Initializer (L32–43)
```diff
       item.variantGroups.forEach(group => {
-        if (group.options?.length > 0) {
+        // CR-006 Phase A / Sub-A1.1 (May-2026): only pre-select for REQUIRED
+        // single-select groups. Optional groups stay empty until the user
+        // clicks a pill, so the cart never carries a phantom auto-pick the
+        // customer did not ask for. Multi-select rendering is Phase B / B1.
+        if (group.required && group.type !== 'multi' && group.options?.length > 0) {
           initialVariants[group.id] = group.options[0];
         }
       });
```

### A1.2 — Header label (L343–347)
```diff
-                {group.name} {group.required && <span style={{ color: COLORS.primaryOrange }}>*</span>}
+                {group.name} {group.required ? (
+                  <span style={{ color: COLORS.primaryOrange }}>*</span>
+                ) : (
+                  <span style={{ color: COLORS.grayText, fontWeight: 400, textTransform: 'none' }}>(Optional)</span>
+                )}
```

### A1.3 — selectVariant handler (L100–117)
```diff
   const selectVariant = (groupId, option) => {
-    setSelectedVariants(prev => ({ ...prev, [groupId]: option }));
+    // CR-006 Phase A / Sub-A1.3 (May-2026): OPTIONAL single-select groups
+    // toggle off when the cashier clicks the currently-selected pill — so a
+    // pre-selection (or a customer's "actually, never mind") can be cleared
+    // with one tap. Required groups stay replace-only because a required
+    // pick cannot be empty. Multi-select rendering is Phase B / B1; treat
+    // as replace until then.
+    const group = item.variantGroups?.find(g => g.id === groupId);
+    const isOptionalSingle = group && !group.required && group.type !== 'multi';
+    setSelectedVariants(prev => {
+      if (isOptionalSingle && prev[groupId]?.id === option.id) {
+        const { [groupId]: _removed, ...rest } = prev;
+        return rest;
+      }
+      return { ...prev, [groupId]: option };
+    });
   };
```

## 7. Before / after behaviour (per scenario)

| Scenario | Before A1 | After A1 |
|---|---|---|
| Open item with **optional** group (e.g. `Ocean Blue (V)` → `CHOICE OF MILK`) | First pill (`Almond`) auto-highlighted green. Header reads `CHOICE OF MILK`. | All pills neutral. Header reads `CHOICE OF MILK (Optional)`. |
| Hit Add to Order without picking on optional group | Cart line silently includes `Almond`. Customer billed. | Cart line has no milk text. Total reflects base only. |
| Click an unselected optional pill | Selects | Selects (same) |
| Click the **currently-selected** optional pill | No effect (stuck) | Clears the pick |
| Open item with **required** group (e.g. `Chicken Strips 3pc` → `VARRIENT *`) | First pill (`30ML`) pre-picked green. Header `VARRIENT *`. | **Identical.** |
| Click the selected required pill | No effect | **No effect** (replace-only preserved) |
| Click a different required pill | Replaces | **Replaces** (unchanged) |
| Re-edit a placed cart line with saved optional pick | Restores saved pick | **Restores** (saved-selection branch wins). Now also clearable in one tap (A1.3). |
| Item with **only optional groups, all cleared** | Auto-picks first option of each group → wrong cart | Empty `selectedVariants`. Outbound payload `variation: []`. Backend already accepts this. |
| Multi-select group (`type: 'multi'`) | Renders as single pills, auto-picks first | Renders as single pills (unchanged), **does not** auto-pick (Phase B / B1 owns proper multi UI) |

## 8. Impact map (consumers of `selectedVariants`) — verified before implementation

| Consumer | Empty-key behaviour | Required change for A1? |
|---|---|---|
| `calculateTotal` (same file L86–88) | `Object.values().reduce()` skips missing keys | ❌ None — already safe |
| `allRequiredSelected` (same file L132–138) | Filters by `g.required`, optional missing OK | ❌ None — already safe |
| `handleAddToOrder` customizations builder (same file L162–170) | Builds entries from existing keys; missing keys → not in label | ❌ None — already safe |
| `orderTransform.js::toAPI` outbound payload (L375–398) | Pre-existing `.filter(([, option]) => option)` drops empty | ❌ None — already safe |
| `OrderEntry.jsx` price recompute (L589–590) | Same `Object.values().reduce()` idiom | ❌ None — already safe |
| `CartPanel.jsx` cart line label (L68, L195) | Existing `length > 0` guard | ❌ None — already safe |
| `CollectPaymentPanel.jsx` bill display (L1055, L1321) | Same length-0 guard | ❌ None — already safe |
| KOT print / station routing | Reads server `item.variation`, not modal state | ❌ Unaffected |

**Net: zero downstream changes required.** All 8 consumers already handled the missing-key case before A1; the bug existed only because the modal forced keys into `selectedVariants` that the user never asked for.

## 9. Validation performed

| Check | Result |
|---|---|
| ESLint on `ItemCustomizationModal.jsx` (after each sub-bucket) | ✅ 0 issues × 3 |
| Webpack hot-reload compile (after each sub-bucket) | ✅ Only the pre-existing `LoadingPage.jsx:111` warning × 3 |
| `git status` scope-leak (after each sub-bucket) | ✅ Only `ItemCustomizationModal.jsx` modified × 3 |
| Diff vs proposed (after each sub-bucket) | ✅ Verbatim match × 3 |
| **Manual validation by owner — A1.1** | ✅ Pass — `Ocean Blue (V)` no longer auto-picks Almond; `Chicken Strips 3pc` still pre-picks 30ML |
| **Manual validation by owner — A1.2** | ✅ Pass — `CHOICE OF MILK (Optional)` label rendering correctly |
| **Manual validation by owner — A1.3** | ✅ Pass — toggle-off works on optional pills; required pills stay replace-only |

## 10. Validation NOT performed

| Check | Reason |
|---|---|
| Unit tests for the 3 fixes (source doc §6 wants render tests) | `@testing-library/react` not installed on branch `1-may`; same TEST-INFRA-001 deferral as A0a / A0b. Manual browser verification used instead. |
| Backend payload regression for items with all-optional cleared groups | Outbound transform already filters empty options pre-A1; no behaviour change expected. Owner-side check via real order placement on `Ocean Blue (V)` has been done. |
| Multi-select-group items end-to-end behaviour (`type: 'multi'`) | Out of scope — Phase B / B1. |
| Min/Max enforcement for multi groups | Out of scope — Phase B / B1. |

## 11. Deviations from contract

**None.** All three edits land verbatim against the proposed diffs. The staged delivery (3 sub-buckets) is a process choice agreed with owner mid-implementation; the *code outcome* is identical to a single A1 commit.

## 12. Regression checklist (main handover §11)

| Item | Status |
|---|---|
| Customisation modal opens cleanly across menu items | ✅ Manually verified on `Ocean Blue (V)`, `Chicken Strips 3pc` |
| `[Add to Order]` enabled state correct | ✅ Required groups still gate; optional groups never gated (consistent with today) |
| Cart line label, total, KOT label, bill display unchanged for required-only items | ✅ Code paths untouched |
| Re-edit existing cart lines | ✅ Saved-selection branch preserved (manual test #6–7 pass) |
| Browser console clean | ✅ No new errors observed |
| Webpack compile clean | ✅ Only pre-existing `LoadingPage.jsx:111` warning |
| Full Jest suite green | ❌ Pre-existing failures (TEST-INFRA-001) — unrelated to A1 |

## 13. Known limitations / out of scope

1. **Multi-select rendering (CR-006 Bug #2)** — `type: 'multi'` groups still render as single-select pills. A1 only changes auto-pick / header / toggle-off behaviour, not the rendering primitive. Owned by **bucket B1 (Phase B)**.
2. **Min / Max enforcement** — `min` / `max` on multi groups not enforced. Owned by B1.
3. **Submit payload for multi groups** — unchanged. Owned by B1.
4. **`AllOrdersReportPage` / receipt display formatting** of variant labels — untouched. Cart, bill, and report all consume the same `customizations.variants` array which is now correctly trimmed when optional groups are empty.
5. **Cart line re-edit toggling on multi groups** — meaningless until B1 ships true multi rendering.

## 14. Backend pending items

**None for A1.** Backend already exposes `type` / `required` / `min` / `max` on the variation transform; A1 just consumes the existing data correctly.

## 15. QA instructions

### Pre-conditions
- Live URL: `https://insights-phase.preview.emergentagent.com`
- Account: `owner@palmhouse.com` / `Qplazm@10`
- Hard refresh between sub-bucket validations to ensure new bundle loaded.

### A1.1 acceptance — `Ocean Blue (V)`
1. Open the dish from Popular / search.
2. **Expected:** all 5 milk pills neutral on first open. Total reads `₹350` (base, no Almond auto-add).
3. Tap Add to Order with no milk picked → cart line `Ocean Blue (V) — ₹350`, no milk text.

### A1.2 acceptance — `Ocean Blue (V)` header
4. Header now reads `CHOICE OF MILK (Optional)` — `(Optional)` in zinc-grey, normal weight, mixed case.
5. Open `Chicken Strips 3pc` → header still reads `VARRIENT *` (orange asterisk, no `(Optional)`).

### A1.3 acceptance — toggle-off
6. On `Ocean Blue (V)`: tap `Almond` → green. Tap `Almond` again → cleared. Tap `Oat` → green. Tap `Oat` again → cleared.
7. Pick `Soy`, Add to Order. Re-open from cart → Soy restored. Tap Soy → cleared. Tap Update Order → cart line shows no milk text.
8. On `Chicken Strips 3pc`: tap `30ML` again → must NOT clear (required group, replace-only).

### Cumulative regression
9. ADDONS section behaves exactly as today.
10. SIZE selection on items with sizes works as today.
11. Re-edit a placed cart item with required pick → restores correctly, can't be cleared by re-clicking the same pill.

### Rollback
Single git revert across the three commits on this branch. No state migration. Behaviour returns to pre-A1: optional groups auto-pick, no `(Optional)` label, no toggle-off.

## 16. Next recommended bucket

Per main handover §13 sequencing: **Bucket A2 — CR-007 (Order ID visibility + Print Bill in Order Entry)**.

- Source contract: `/app/memory/change_requests/CR_007_ORDERID_VISIBILITY_AND_PRINT_BILL_IN_ORDER_ENTRY.md`
- Pre-filled Approval Gate: main handover §10.A2.
- Files: `OrderCard.jsx`, `CartPanel.jsx`, `RePrintButton.jsx` (3 files, multiple edits).
- Risk: Low. Display + new button wired to existing print path.

**Bucket B1 (Phase B / multi-select)** is the natural follow-up to A1 specifically — but per the sequencing in §13 it lands after A2/A3/A4, not next.

**I will NOT start A2 (or any other bucket) until you explicitly approve it.** The currently-approved scope is fully complete with this handover.

---

**End of A1 per-bucket handover.**
