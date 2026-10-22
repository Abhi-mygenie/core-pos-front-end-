# CR-430 — Impact Analysis (Gate 2 — Edit E-5 / OD-430-05)
## Fix cancelled item rows: remove 44px spacer + py-1.5 + "(Cancelled)" label

**ID:** CR-430 (E-5 scope) | **Stage:** Gate 2 | **Date:** 2026-10-17
**Risk:** LOW | **Priority:** P1 (parity with served rows already fixed by OD-430-03)
**File:** `OrderCard.jsx` (R5 hotspot)

---

## Code Reality: NONE

`grep -c "OD-430-05" src/components/cards/OrderCard.jsx` → 0. No fix exists yet.

---

## Conflict Pre-Check

| Open item | Touches OrderCard.jsx? | Lines affected | Conflict? |
|---|---|---|---|
| E-3 (OD-430-03) | YES — same file, pending | L839, L860-865 (served rows) | NO — different lines |
| E-4 (OD-430-04) | YES — same file, pending | L688-817 (items section) | NO — different lines |
| All prior CR-430 edits | YES — GATE_5B_QA | L84-88, L863 | NO — already done |

**Result: NO CONFLICT.** Target lines L892-909 (cancelled rows) not touched by any other edit.

---

## Why this gap exists

Original CR-430 removed `min-h-[44px] min-w-[44px]` from the **served** checkmark div (L863). The cancelled rows had an **identical spacer div** (L909) added to align with the served checkmark column. When the served checkmark shrinks, the alignment reason disappears — but the spacer was never cleaned up.

```
SERVED ROW (fixed by OD-430-03):
  item name → [small ✓ 12px]   ← no 44px forced height

CANCELLED ROW (still broken):
  item name → (Cancelled) → [EMPTY DIV min-h-44px min-w-44px]  ← forces 44px height
```

---

## Data Flow

`cancelledItems = items.filter(i => i.status === "cancelled")` — local variable, no external consumers.

The cancelled section renders identically to the served section — toggle button + collapsible rows. Same fix logic applies: remove the redundant label, remove the oversized spacer, tighten the padding.

---

## Exact Edits Required — Edit E-5

### E-5a — `OrderCard.jsx L892`: Row padding `py-1.5` → `py-0.5`

```
CURRENT (verified live):
L892:  <div key={item.id} className="flex items-center gap-2 py-1.5">
```

```jsx
// BEFORE:
<div key={item.id} className="flex items-center gap-2 py-1.5">

// AFTER:
<div key={item.id} className="flex items-center gap-2 py-0.5"> {/* CR-430 OD-430-05: tighter row padding, parity with served rows */}
```

---

### E-5b — `OrderCard.jsx L904-906`: Remove `(Cancelled)` text label

```
CURRENT (verified live):
L904:  <span className="text-[10px] flex-shrink-0" style={{ color: '#9CA3AF' }}>
L905:    (Cancelled)
L906:  </span>
```

```jsx
// BEFORE:
                  <span className="text-[10px] flex-shrink-0" style={{ color: '#9CA3AF' }}>
                    (Cancelled)
                  </span>

// AFTER: (remove entirely — section header "▼ Cancelled (N)" already says it)
                  {/* CR-430 OD-430-05: removed (Cancelled) label — section header already says it */}
```

---

### E-5c — `OrderCard.jsx L908-909`: Replace 44px spacer with tiny × icon

```
CURRENT (verified live):
L907:  {/* Spacer to align with Served block's checkmark column */}
L908:  <div className="min-h-[44px] min-w-[44px] flex items-center justify-center -mr-2" />
```

```jsx
// BEFORE:
                  {/* Spacer to align with Served block's checkmark column */}
                  <div className="min-h-[44px] min-w-[44px] flex items-center justify-center -mr-2" />

// AFTER:
                  {/* CR-430 OD-430-05: replaced 44px spacer with tiny × — parity with served ✓ icon */}
                  <div className="flex items-center justify-center -mr-2">
                    <X className="w-3 h-3" style={{ color: '#9CA3AF' }} strokeWidth={2.5} />
                  </div>
```

**Note:** `X` is already imported in `OrderCard.jsx` (line 2, from lucide-react). No new import needed.

---

## Complete Edit Summary (E-5 only)

| Sub-edit | Line | Change | Effect |
|---|---|---|---|
| E-5a | L892 | `py-1.5` → `py-0.5` | Row padding: 12px → 4px total |
| E-5b | L904-906 | Remove `<span>(Cancelled)</span>` | Label gone, frees row width |
| E-5c | L908-909 | Replace `min-h-[44px] min-w-[44px]` spacer with `X w-3 h-3` | Row height drops from 44px → ~20px |

**Net result:** Cancelled rows match served rows in compactness (~20px/row). Consistent UX across both collapsed sections.

---

## Visual Change

```
BEFORE (each cancelled row):
 ● Banana Date Energiser (1)  (Cancelled)  [      empty 44px box      ]
 ← ~44px tall per row →

AFTER (each cancelled row):
 ● Banana Date Energiser (1)  ✕
 ← ~20px tall per row →
```

---

## Scope Lock

**WILL change:** `src/components/cards/OrderCard.jsx` — L892, L904-909 only
**WILL NOT touch:**
- Served rows (handled by E-3)
- Items section wrapper (handled by E-4)
- Any other file — `X` icon already imported, no new imports

---

## Verification Matrix

| # | Test | Expected |
|---|---|---|
| V1 | Order with cancelled items — expand ▼ Cancelled | Rows are compact (~20px), no wide empty space on right |
| V2 | "(Cancelled)" text gone from rows | Only tiny × at row end |
| V3 | Tiny × visible but not dominant | 12px, gray, matches served ✓ size |
| V4 | Row height matches served rows | Both ~20px — visually consistent |
| V5 | Cancelled item name still strikes through | `line-through` style unchanged |
| V6 | Cancelled section toggle still works | ▼/▲ expand/collapse unaffected |
| V7 | Compile: 0 new warnings | `X` icon already imported, no issues |

---

## Post-Code Registry Checklist
```
- [ ] registry.json: CR-430 status updated
- [ ] BUG_TRACKER.md: row updated
- [ ] FILE_OWNERSHIP.md: OrderCard.jsx + E-5 + date
- [ ] Code markers: // CR-430 OD-430-05 on every edited line
- [ ] Compile: 0 new warnings
```

---

## Full CR-430 Pending Scope Summary (all new edits)

| Edit | OD | Lines | Change |
|---|---|---|---|
| E-3a | OD-430-03 | L839 | Served row `py-1.5` → `py-0.5` |
| E-3b | OD-430-03 | L860-862 | Remove `<span>Served</span>` |
| E-3c | OD-430-03 | L865 | Checkmark `w-5 h-5` → `w-3 h-3` |
| E-4 | OD-430-04 | L688 | Wrap items div `{activeItems.length > 0 && ...}` |
| E-5a | OD-430-05 | L892 | Cancelled row `py-1.5` → `py-0.5` |
| E-5b | OD-430-05 | L904-906 | Remove `<span>(Cancelled)</span>` |
| E-5c | OD-430-05 | L908-909 | Replace 44px spacer with `<X w-3 h-3>` |

**All 7 sub-edits in 1 file (`OrderCard.jsx`). Ready for Gate 3 → Gate 4 GO → Implementation.**

*Gate 2 complete — 2026-10-17.*
