# CR-557 — Implementation Plan (Gate 3)

**ID:** CR-557 · Extract shared `<PopoutItemRow>` so web-EDIT Mode B reuses the full renderer
**Gate:** 3 — Implementation Plan · **Role:** PLANNING · **Date:** 2026-11-19
**Severity:** P0 · **Risk:** HIGH (R5 hotspot `ScanOrderPopOut.jsx`; behaviour-preserving refactor)
**Code Reality:** PARTIAL (rich row inline in Mode A; shared component absent)
**IA:** `impact/CR-557_IMPACT_ANALYSIS.md` (GATE_2_IA_COMPLETE)
**Decisions locked:** OD-557-01 = YES (APS/Price-TBD in Mode B) · OD-557-02 = Option A (prevItems use shared read-only row) · OD-557-03 = Keep old labels (per-variant test-id family; no test migration)

---

## 0. Entry verification (Implementation agent MUST run first)
```
grep -n "import { COLORS } from '../../constants';" src/components/dashboard/ScanOrderPopOut.jsx   # expect L48
grep -n "popout-kot-check-new-" src/components/dashboard/ScanOrderPopOut.jsx                        # expect L570
grep -n "popout-prev-item-" src/components/dashboard/ScanOrderPopOut.jsx                            # expect L610
```
If any line number drifted → STOP, return to Planning (plan stale).

**Import strategy (no circular import):** `flattenVariationOptions` / `getSelectedVariationOptions` STAY defined/exported in `ScanOrderPopOut.jsx`. The parent computes `variationOptions` per item and passes it as a prop. `PopoutItemRow` imports only `COLORS` + `XCircle` — it never imports from `ScanOrderPopOut`.

---

## EDIT 1 — NEW FILE `src/components/dashboard/PopoutItemRow.jsx`

Presentation-only (inherits ScanOrderPopOut anti-rules: no service/socket/localStorage/NotificationContext). Reproduces the Mode-A rich row (current L675–814) verbatim, parameterised by `variant` with per-variant legacy test-id families.

```jsx
// PopoutItemRow — CR-557
// Shared item-row renderer for ScanOrderPopOut (Mode A normal, Mode B new items,
// and read-only "previously ordered" items). Presentation-only: no service/socket/
// localStorage/NotificationContext. All data + callbacks arrive via props.
//
// Carries, in ALL variants:
//   - APS badge + "Price TBD" for ₹1 non-comp items (CR-545 / OBS-5)   [OD-557-01]
//   - cancelled row: strikethrough + grey + "(Cancelled)" + price hidden (BUG-679)
//   - full per-option variation list with per-option price (BUG-702)
//   - add-on prices, item note, Comp tag
//
// variant: 'full'     → Mode A rows   (test-id family popout-item-*, popout-kot-check-*)
//          'new'       → Mode B new items (family popout-new-item-*, popout-kot-check-new-*)
//          'readonly'  → Mode B previously-ordered items (greyed, no KOT/cancel)   [OD-557-02]
import React from 'react';
import { XCircle } from 'lucide-react';
import { COLORS } from '../../constants';

const TID = (variant, idx) => ({
  full: {
    row: `popout-item-row-${idx}`,
    kot: `popout-kot-check-${idx}`,
    cancel: `popout-item-cancel-${idx}`,
    comp: `popout-item-comp-tag-${idx}`,
    aps: `popout-item-aps-tag-${idx}`,
    varPfx: `popout-item-variation-${idx}`,
    addonPfx: `popout-item-addon-${idx}`,
    note: `popout-item-note-${idx}`,
  },
  new: {
    row: `popout-new-item-${idx}`,
    kot: `popout-kot-check-new-${idx}`,
    cancel: `popout-cancel-new-item-${idx}`,
    comp: `popout-new-item-comp-tag-${idx}`,
    aps: `popout-new-item-aps-tag-${idx}`,
    varPfx: `popout-new-item-variation-${idx}`,
    addonPfx: `popout-new-item-addon-${idx}`,
    note: `popout-new-item-note-${idx}`,
  },
  readonly: {
    row: `popout-prev-item-${idx}`,
    kot: '',
    cancel: '',
    comp: `popout-prev-item-comp-tag-${idx}`,
    aps: `popout-prev-item-aps-tag-${idx}`,
    varPfx: `popout-prev-item-variation-${idx}`,
    addonPfx: `popout-prev-item-addon-${idx}`,
    note: `popout-prev-item-note-${idx}`,
  },
}[variant] || {});

const PopoutItemRow = ({
  item,
  idx,
  variant = 'full',
  currencySymbol = '₹',
  variationOptions = [],       // precomputed by parent via flattenVariationOptions()
  showKot = false,
  isSelected = false,
  onToggleKot,                 // (itemId) => void
  showCancel = false,
  onCancel,                    // (item) => void
}) => {
  const it = item || {};
  const tid = TID(variant, idx);
  const isReadonly = variant === 'readonly';

  const qty = Number(it?.qty ?? it?.quantity) || 1;
  const unit = Number(it?.unitPrice ?? it?.price) || 0;
  const lineTotal = unit * qty;
  const isComp = Boolean(it?.isComplementary || it?.isComplementaryRuntime);
  const isCancelled = it?.status === 'cancelled' || Number(it?.foodStatus ?? it?.food_status) === 3; // BUG-679
  const isAps = unit === 1 && !isComp; // CR-545
  const addOns = Array.isArray(it?.addOns) ? it.addOns : [];

  const canKot = showKot && !isReadonly && !isCancelled;
  const canCancel = showCancel && !isReadonly && !isCancelled;

  const nameColor = isCancelled ? '#9CA3AF' : (isReadonly ? COLORS.grayText : COLORS.darkText);

  return (
    <li
      className="px-3 py-2 text-sm flex items-start gap-2"
      style={{ opacity: isReadonly ? 0.6 : (isCancelled ? 0.5 : 1) }}
      data-testid={tid.row}
    >
      {canKot && (
        <input
          type="checkbox"
          className="mt-1 flex-shrink-0 accent-[#2E7D32]"
          checked={isSelected}
          onChange={() => onToggleKot?.(it.id)}
          data-testid={tid.kot}
        />
      )}
      <div className="flex-1 min-w-0">
        {/* row 1: qty + name + comp/aps tags + price + cancel */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <span
              style={{ color: nameColor, textDecoration: isCancelled ? 'line-through' : 'none' }}
              className="font-medium truncate"
            >
              {qty}× {it?.name || it?.productName || it?.foodName || 'Item'}
              {isCancelled ? <span className="ml-1 text-xs font-normal" style={{ textDecoration: 'none' }}>(Cancelled)</span> : null}
            </span>
            {isComp ? (
              <span data-testid={tid.comp} className="text-[10px] font-bold px-1.5 py-0.5 rounded flex-shrink-0"
                style={{ backgroundColor: '#F1F5F9', color: COLORS.darkText }}>Comp</span>
            ) : null}
            {isAps ? (
              <span data-testid={tid.aps} className="text-[10px] font-bold px-1.5 py-0.5 rounded flex-shrink-0"
                style={{ backgroundColor: '#FFF3E0', color: '#E65100' }}>APS</span>
            ) : null}
          </div>
          {isCancelled ? null : isAps ? (
            <span className="text-[11px] font-semibold flex-shrink-0 px-1.5 py-0.5 rounded"
              style={{ backgroundColor: '#FFF3E0', color: '#E65100' }}>Price TBD</span>
          ) : (
            <span style={{ color: COLORS.grayText }} className="font-mono flex-shrink-0">
              {currencySymbol}{lineTotal.toFixed(2)}
            </span>
          )}
          {canCancel ? (
            <button
              data-testid={tid.cancel}
              className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 hover:bg-gray-100"
              style={{ backgroundColor: COLORS.sectionBg }}
              onClick={(e) => { e.stopPropagation(); onCancel?.(it); }}
              title="Cancel this item"
            >
              <XCircle className="w-4 h-4" style={{ color: COLORS.grayText }} />
            </button>
          ) : null}
        </div>
        {/* row 2: variations (BUG-702) */}
        {variationOptions.length > 0 ? (
          <div className="mt-1 pl-3 border-l-2" style={{ borderColor: COLORS.borderGray }}>
            {variationOptions.map((o, vIdx) => (
              <div key={`var-${vIdx}`} className="text-xs" style={{ color: COLORS.grayText }}
                data-testid={`${tid.varPfx}-${vIdx}`}>
                {o.label}{o.price > 0 ? <span className="ml-1">(+{currencySymbol}{o.price.toFixed(2)})</span> : null}
              </div>
            ))}
          </div>
        ) : null}
        {/* row 3: add-ons */}
        {addOns.length > 0 ? (
          <div className="mt-1 pl-3 border-l-2" style={{ borderColor: '#FCD9A4' }}>
            {addOns.map((a, aIdx) => (
              <div key={`add-${aIdx}`} className="text-xs" style={{ color: COLORS.primaryOrange }}
                data-testid={`${tid.addonPfx}-${aIdx}`}>
                + {a?.name || ''}{Number(a?.price) > 0 ? <span className="ml-1">(+{currencySymbol}{Number(a.price).toFixed(2)})</span> : null}
              </div>
            ))}
          </div>
        ) : null}
        {/* row 4: item note */}
        {it?.notes ? (
          <div className="mt-1 text-xs italic px-2 py-1 rounded"
            style={{ color: COLORS.grayText, backgroundColor: COLORS.sectionBg }} data-testid={tid.note}>
            &quot;{it.notes}&quot;
          </div>
        ) : null}
      </div>
    </li>
  );
};

export default PopoutItemRow;
```

**Line count:** ~165 new lines. Logic is copied verbatim from Mode A (L665–812); only the test-id source (`TID`) and the `variant`/`readonly` gating are new.

---

## EDIT 2 — `ScanOrderPopOut.jsx` import (after L48)

**Current (L48):**
```js
import { COLORS } from '../../constants';
```
**Add immediately after:**
```js
import PopoutItemRow from './PopoutItemRow'; // CR-557
```

---

## EDIT 3 — Mode B `newItems` list → shared row (replace L553–597)

**Current (L552–598):** `<ul>` … `{newItems.map((it, idx) => { const qty…; return (<li data-testid={`popout-new-item-${idx}`}> …stripped markup… </li>); })}` … `</ul>`

**New — keep the `<ul>` wrapper (L552 / L598), replace the `.map` callback body:**
```jsx
<ul className="divide-y" style={{ borderColor: COLORS.borderGray }}>
  {newItems.map((it, idx) => (
    <PopoutItemRow
      key={it?.itemId ?? it?.id ?? idx}
      item={it}
      idx={idx}
      variant="new"
      currencySymbol={currencySymbol}
      variationOptions={flattenVariationOptions(Array.isArray(it?.variation) ? it.variation : [])}
      showKot={!!onPrintKOT}
      isSelected={selectedItemIds.has(it.id)}
      onToggleKot={toggleKotItem}
      showCancel={!!onCancelItem}
      onCancel={(item) => onCancelItem(activeOrder, item)}
    />
  ))}
</ul>
```
> Gains for Mode B: APS/Price-TBD (OD-557-01), cancelled styling (BUG-679), multi-line variation+price (BUG-702), add-on prices, notes, Comp tag. Asserted test-ids `popout-kot-check-new-${idx}` preserved.

---

## EDIT 4 — Mode B `prevItems` list → shared read-only row (replace L605–616)

**Current (L604–617):** `<ul>` … `{prevItems.map((it, idx) => { … return (<li data-testid={`popout-prev-item-${idx}`} style={{opacity:0.6}}> …minimal… </li>); })}` … `</ul>`

**New — keep `<ul>` wrapper, replace callback body:**
```jsx
<ul className="divide-y" style={{ borderColor: COLORS.borderGray }}>
  {prevItems.map((it, idx) => (
    <PopoutItemRow
      key={it?.itemId ?? it?.id ?? idx}
      item={it}
      idx={idx}
      variant="readonly"
      currencySymbol={currencySymbol}
      variationOptions={flattenVariationOptions(Array.isArray(it?.variation) ? it.variation : [])}
    />
  ))}
</ul>
```
> OD-557-02 Option A: greyed read-only row, no KOT/cancel. `popout-prev-item-${idx}` preserved.

---

## EDIT 5 — Mode A list → shared row (replace L665–815)

**Current (L659–817):** `<ul>` … `{[...(activeOrder.items||[])].sort(APS).map((it, idx) => { const qty…; return (<li data-testid={`popout-item-row-${idx}`}> …full markup… </li>); })}` … `</ul>`

**New — KEEP the `<ul>` (L659), KEEP the APS sort spread (L661–664), replace the `.map` callback body:**
```jsx
<ul className="divide-y" style={{ borderColor: COLORS.borderGray }}>
  {/* CR-545: APS items (₹1) sort to top so staff sees them first */}
  {[...(activeOrder.items || [])].sort((a, b) => {
    const aAps = Number(a?.unitPrice ?? a?.price) === 1 ? 0 : 1;
    const bAps = Number(b?.unitPrice ?? b?.price) === 1 ? 0 : 1;
    return aAps - bAps;
  }).map((it, idx) => (
    <PopoutItemRow
      key={`${it?.id ?? it?.foodId ?? idx}-${idx}`}
      item={it}
      idx={idx}
      variant="full"
      currencySymbol={currencySymbol}
      variationOptions={flattenVariationOptions(Array.isArray(it?.variation) ? it.variation : [])}
      showKot={!!onPrintKOT}
      isSelected={selectedItemIds.has(it.id)}
      onToggleKot={toggleKotItem}
      showCancel={!!onCancelItem}
      onCancel={(item) => onCancelItem(activeOrder, item)}
    />
  ))}
</ul>
```
> Behaviour identical to today. Asserted `popout-kot-check-${idx}` preserved. Select-all headers (L527–551 edit-mode, L623–658 normal-mode) are UNCHANGED — they stay in the parent.

---

## Scope lock
- **Files WILL change:** `components/dashboard/PopoutItemRow.jsx` (NEW), `components/dashboard/ScanOrderPopOut.jsx` (1 import + 3 list-body replacements).
- **Files WILL NOT touch:** `DashboardPage.jsx`, `orderTransform.js`, `reportTransform.js`, `orderService.js`, `AggregatorOrderPopOut.jsx`, `constants.js`, any financial/print/socket file, the two test files.
- **NOT changed in ScanOrderPopOut.jsx:** queue/mode predicates, `selectedItemIds` state + reset effect, `toggleKotItem`, both select-all headers, action-row footer (Mute/Edit/KOT/Reject/Accept), all handlers, exported helpers.

## Risk register
| # | Risk | Mitigation |
|---|------|-----------|
| R1 | Mode A visual/behaviour drift during extraction | Row markup copied verbatim; V1–V4 pin Mode A; unit tests must stay green (V12) |
| R2 | Mode B cancel button restyled (was red-tint `p-0.5`, now grey round `w-7 h-7`) — intentional normalization | OD parity approved; note in QA; purely cosmetic, no behaviour change |
| R3 | Mode B variation test-id changes from single `popout-new-item-variation-${idx}` to `-${idx}-${vIdx}` | No test asserts it (verified); additive since Mode B is now multi-line per BUG-702 |
| R4 | `key` differs between Mode A (`${id}-${idx}`) and Mode B (`${itemId??id??idx}`) | Preserved exactly per original each call site |
| R5 | Other same-file open items (CR-533/534) mid-flight | Re-check FILE_OWNERSHIP at entry; CR-557 is foundational → land first |

## Verification Matrix (seeds QA handover)
| # | Check | Method | Expected |
|---|-------|--------|----------|
| V1 | Mode A APS badge + Price TBD on ₹1 | Browser: web order ₹1 item | unchanged |
| V2 | Mode A cancelled strikethrough + price hidden | Browser | unchanged |
| V3 | Mode A full variation options + per-option price | Browser | unchanged |
| V4 | Mode A add-on prices + note + Comp tag | Browser | unchanged |
| V5 | **Mode B** APS/Price-TBD on ₹1 new item | Browser: web-edit adds ₹1 item | badge + Price TBD now show |
| V6 | **Mode B** cancelled rendering | Browser | strikethrough + price hidden |
| V7 | **Mode B** multi-line variation + price | Browser | options + prices |
| V8 | **Mode B** add-on prices + note | Browser | render like Mode A |
| V9 | Per-item cancel opens CancelFoodModal in both modes | Browser click X | modal opens |
| V10 | KOT checkbox + select-all + count unchanged both modes | Browser | selection/payload identical |
| V11 | prevItems read-only (no cancel/KOT), greyed | Browser expand "Previously ordered" | no action controls |
| V12 | Unit tests green | `npx craco test --watchAll=false --testPathPattern="ScanOrderPopOut\|CR547"` | pass |
| V13 | `// CR-557` markers both files; webpack 0 new warnings | grep + dev server | clean |

## Execution sequence
1. Create `PopoutItemRow.jsx` (Edit 1).
2. Edit 2 (import) → Edit 5 (Mode A) → Edit 3 (Mode B new) → Edit 4 (prevItems).
3. `yarn` dev compile — 0 new warnings.
4. Run V12 unit tests.
5. Browser self-test V1–V11, screenshots for Mode A + Mode B.

## Post-Code Registry Checklist (Implementation agent executes)
- [ ] `registry.json`: CR-557 → status `IMPLEMENTED`, sprint_key `nov_cr_batch`, gate 5
- [ ] `CR_REGISTRY.md`: CR-557 row → IMPLEMENTED
- [ ] `FILE_OWNERSHIP.md`: add `PopoutItemRow.jsx` (NEW) + `ScanOrderPopOut.jsx` (CR-557) with date
- [ ] Code markers: `// CR-557` in both files
- [ ] Reopened dependents BUG-679(ModeB)/BUG-702(ModeB)/CR-545(ModeB): mark resolved-by-CR-557 after QA; CR-558 unblocked

---
```
Planning complete: CR-557
Stage: Implementation Plan (Gate 3)
Code reality: PARTIAL
Risk: HIGH
Edits: 1 new file + 4 edits in ScanOrderPopOut.jsx (1 import, 3 list-body swaps)
Files WILL change: PopoutItemRow.jsx (NEW), ScanOrderPopOut.jsx
Files WILL NOT touch: DashboardPage.jsx, orderTransform.js, reportTransform.js, orderService.js, AggregatorOrderPopOut.jsx, constants.js, test files
Verification matrix: 13 checks (V12 automated unit tests; rest browser/grep)
Owner decisions: OD-557-01/02/03 all locked
Next: Gate 4 GO → IMPLEMENTATION
```
