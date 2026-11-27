# CR-430 — Impact Analysis Update (Gate 2 Extension)
## New scope: OD-430-03 (compact served rows) + OD-430-04 (remove "No active items" block)

**ID:** CR-430 | **Stage:** Gate 2 extension | **Date:** 2026-10-17
**Risk:** LOW | **File:** `OrderCard.jsx` (R5 hotspot)
**Previously implemented (GATE_5B_QA_CONDITIONAL_PASS):** E-1 (auto-expand useEffect) + E-2 (checkmark div min-h removed)
**New scope this IA:** E-3 (OD-430-03) + E-4 (OD-430-04) + E-5 (OD-430-03-cancelled, noted below)

---

## Code Reality: NONE for new scope

```bash
grep -c "OD-430-03\|OD-430-04" src/components/cards/OrderCard.jsx
# → 0  (no fix code exists yet for new scope)
```

---

## Conflict Pre-Check

| Open item | Touches OrderCard.jsx? | Lines | Conflict? |
|---|---|---|---|
| BUG-571 | YES — GATE_5B_QA_PASSED | L454 (hide empty item groups) | NO — different lines |
| BUG-575 | YES — GATE_5B_QA_PASSED | L468 (remove stopPropagation) | NO — different lines |
| BUG-581 | YES — GATE_5B_QA_PASSED | L691 (action word labels) | NO — different lines |
| BUG-572 | YES — GATE_5B_QA_PASSED | L138 (WhatsApp gate) | NO — different lines |
| BUG-574 | YES — GATE_5B_QA_PASSED | L847-855 (two-path timer) | NO — different lines |

**Result: NO CONFLICT.** Target lines L688-817 (items section) and L839-864 (served rows) not touched by any open item.

---

## EDIT E-3 — Compact served item rows (OD-430-03)

### Target: `OrderCard.jsx L839` — served row padding

```
CURRENT STATE (verified live):
L839:  <div key={item.id} className="flex items-center gap-2 py-1.5">
```

**Change:**
```jsx
// BEFORE:
<div key={item.id} className="flex items-center gap-2 py-1.5">

// AFTER:
<div key={item.id} className="flex items-center gap-2 py-0.5"> {/* CR-430 OD-430-03: tighter row padding py-1.5→py-0.5 */}
```
**Impact:** Row padding 12px total → 4px total. ~8px saved per row × 9 rows = ~72px on a 9-item served list.

---

### Target: `OrderCard.jsx L860-864` — "Served" text label + checkmark size

```
CURRENT STATE (verified live):
L860:  <span className="text-[10px] flex-shrink-0" style={{ color: COLORS.grayText }}>
L861:    Served
L862:  </span>
L863:  {/* Served checkmark (no action) */}
L864:  <div className="flex items-center justify-center -mr-2"> {/* CR-430: removed min-h... */}
L865:    <Check className="w-5 h-5" style={{ color: COLORS.grayText }} strokeWidth={2.5} />
L866:  </div>
```

**Change:**
```jsx
// BEFORE:
                  <span className="text-[10px] flex-shrink-0" style={{ color: COLORS.grayText }}>
                    Served
                  </span>
                  {/* Served checkmark (no action) */}
                  <div className="flex items-center justify-center -mr-2"> {/* CR-430: removed min-h-[44px] min-w-[44px] — non-interactive static checkmark */}
                    <Check className="w-5 h-5" style={{ color: COLORS.grayText }} strokeWidth={2.5} />
                  </div>

// AFTER:
                  {/* CR-430 OD-430-03: removed "Served" label (redundant — section header says it); shrunk checkmark w-5→w-3 */}
                  <div className="flex items-center justify-center -mr-2">
                    <Check className="w-3 h-3" style={{ color: COLORS.grayText }} strokeWidth={2.5} />
                  </div>
```

**Impact:**
- Removes ~30px of right-side content per row → names no longer wrap to 2 lines
- Checkmark stays as visual confirmation but is unobtrusive at 12px

---

## EDIT E-4 — Remove "No active items" block (OD-430-04)

### Target: `OrderCard.jsx L688-817` — entire items section

```
CURRENT STATE (verified live):
L688:  <div className={`px-3 border-b ${isDineIn ? 'py-1.5' : 'py-1'}`} style={{ borderColor: COLORS.borderGray }}>
L689:    {activeItems.length > 0 ? (
L690:      activeItems.map((item) => { ... })
L812:    ) : (
L813:      <div className="py-1.5 text-xs" style={{ color: COLORS.grayText }}>
L814:        No active items
L815:      </div>
L816:    )}
L817:  </div>
```

**Change — wrap outer div in condition:**
```jsx
// BEFORE: outer div ALWAYS renders (active items OR "No active items"):
      <div className={`px-3 border-b ${isDineIn ? 'py-1.5' : 'py-1'}`} style={{ borderColor: COLORS.borderGray }}>
        {activeItems.length > 0 ? (
          activeItems.map((item) => { ... })
        ) : (
          <div className="py-1.5 text-xs" style={{ color: COLORS.grayText }}>
            No active items
          </div>
        )}
      </div>

// AFTER: entire div only renders when there ARE active items:
      {activeItems.length > 0 && ( // CR-430 OD-430-04: hide entire items section when no active items — "No active items" text removed
        <div className={`px-3 border-b ${isDineIn ? 'py-1.5' : 'py-1'}`} style={{ borderColor: COLORS.borderGray }}>
          {activeItems.map((item) => { ... })}
        </div>
      )}
```

**What changes visually:**
- When all items served: block disappears entirely. Card goes `header → waiter row → ▼ Served (N) → footer`
- The served section outer div at L822 has `className="border-b"` with its own border — provides separator from waiter row
- No visual gap or missing separator

**What stays exactly the same:**
- When active items exist: the div renders identically, no change
- Served / Cancelled sections: completely unaffected
- Footer: completely unaffected

**Downstream safety:**
- `activeItems` is a local computed variable (L310) — no external consumers
- The items div has no `ref`, `id`, or test selector on the outer wrapper
- No layout dependency on this div being always present

---

## Observation — Cancelled rows also have py-1.5 (L892)

Out of scope for this CR but flagging:
```
L892: <div key={item.id} className="flex items-center gap-2 py-1.5">
```
Cancelled item rows have the same `py-1.5` padding. They also have `(Cancelled)` text label and a **`min-h-[44px] min-w-[44px]` spacer div** that was NOT cleaned up by original CR-430. A future CR can address this for consistency.

---

## Full Edit Summary for New Scope

| Edit | Line(s) | Change | Tokens affected |
|---|---|---|---|
| E-3a | L839 | `py-1.5` → `py-0.5` on served row `<div>` | Row padding |
| E-3b | L860-862 | Remove `<span>Served</span>` entirely | Text label gone |
| E-3c | L865 | `w-5 h-5` → `w-3 h-3` on `<Check>` | Checkmark size |
| E-4 | L688-817 | Wrap outer div in `{activeItems.length > 0 && (...)}` | "No active items" block gone |

**Total new lines changed:** ~6 lines modified/removed across 2 logical edits. All in `OrderCard.jsx` (R5).

---

## Scope Lock

**WILL change:** `src/components/cards/OrderCard.jsx` — L688/L839/L860-866 only
**WILL NOT touch:**
- Cancelled items section (L875-920) — noted but out of scope
- Auto-expand useEffect (E-1, already done)
- Checkmark div min-h (E-2, already done)
- StatusConfigPage toggle (separate gap)
- Any other file

---

## Verification Matrix

| # | Test | Expected |
|---|---|---|
| V1 | Order where ALL items served — "No active items" block | **GONE** — card shows header → waiter → ▼ Served |
| V2 | Order where ALL items cancelled | **GONE** — card shows header → waiter → ▼ Cancelled |
| V3 | Order with ACTIVE items (Preparing/Ready) | Items section renders normally — no regression |
| V4 | Order with mix: 2 active + 3 served | Active items show, served section below — no change |
| V5 | Served row py-0.5 — 9-item list is ~35% shorter | Visual: list noticeably more compact |
| V6 | "Served" text gone from each row | Only ✓ remains at row end |
| V7 | Checkmark is 12px, visible but small | Not dominant — subtle confirmation |
| V8 | Visual separator between waiter row and ▼ Served | Served section border-top provides clean line |
| V9 | Compile: 0 new warnings | webpack 1 pre-existing warning only |

---

## Post-Code Registry Checklist
```
- [ ] registry.json: CR-430 → GATE_5A_IMPLEMENTED (all edits)
- [ ] BUG_TRACKER.md: row updated
- [ ] FILE_OWNERSHIP.md: OrderCard.jsx + CR-430 E-3/E-4 + date
- [ ] Code markers: // CR-430 OD-430-03 and // CR-430 OD-430-04 on edited lines
- [ ] Compile: 0 new warnings
```

*Gate 2 extension complete — 2026-10-17. Ready Gate 3 (Implementation Plan) → Gate 4 GO → Implementation.*
