# CR-430 — Implementation Plan (Gate 3)
## All pending edits: E-3 (compact served) + E-4 (no active items) + E-5 (compact cancelled)

**Stage:** Gate 3 · **Date:** 2026-10-17
**File:** `src/components/cards/OrderCard.jsx` — R5 hotspot
**Based on IAs:**
- `impact/CR-430_E3_E4_IMPACT_ANALYSIS_2026_10_17.md` (OD-430-03 + OD-430-04)
- `impact/CR-430_E5_IMPACT_ANALYSIS_2026_10_17.md` (OD-430-05)
**Risk:** LOW · 1 file · 7 sub-edits · no new imports

---

## Pre-Implementation Entry Verification (MANDATORY)

Run before writing a single line:

```bash
sed -n '839p'    src/components/cards/OrderCard.jsx
# Expected: <div key={item.id} className="flex items-center gap-2 py-1.5">

sed -n '859,861p' src/components/cards/OrderCard.jsx
# Expected: <span className="text-[10px] flex-shrink-0" style={{ color: COLORS.grayText }}>
#             Served

sed -n '864,865p' src/components/cards/OrderCard.jsx
# Expected: <Check className="w-5 h-5" style={{ color: COLORS.grayText }}

sed -n '688p'    src/components/cards/OrderCard.jsx
# Expected: <div className={`px-3 border-b ${isDineIn ? 'py-1.5' : 'py-1'}`}

sed -n '813,814p' src/components/cards/OrderCard.jsx
# Expected: <div className="py-1.5 text-xs" style={{ color: COLORS.grayText }}>
#             No active items

sed -n '892p'    src/components/cards/OrderCard.jsx
# Expected: <div key={item.id} className="flex items-center gap-2 py-1.5">

sed -n '904,905p' src/components/cards/OrderCard.jsx
# Expected: <span className="text-[10px] flex-shrink-0" style={{ color: '#9CA3AF' }}>
#             (Cancelled)

sed -n '908p'    src/components/cards/OrderCard.jsx
# Expected: <div className="min-h-[44px] min-w-[44px] flex items-center justify-center -mr-2" />
```

If ANY line differs → **STOP. Return to Planning.**

---

## Execution Order

Execute **E-3 → E-4 → E-5** in order (top to bottom in the file). Each edit is independent but sequential order prevents line-drift on subsequent searches.

```
E-3a → E-3b+c (served rows, L839 then L859-866)
E-4            (items wrapper, L688-817)
E-5a → E-5b+c (cancelled rows, L892 then L904-909)
Compile check after all 5 search_replace calls
```

---

## Edit E-3a — Served row: tighten padding
**Line:** 839 | **OD:** OD-430-03

```
FIND (exact):
                <div key={item.id} className="flex items-center gap-2 py-1.5">
                  <div
                    className="w-2 h-2 rounded-full flex-shrink-0"
                    style={{ backgroundColor: COLORS.primaryGreen }}

REPLACE WITH:
                <div key={item.id} className="flex items-center gap-2 py-0.5"> {/* CR-430 OD-430-03: tighter row padding */}
                  <div
                    className="w-2 h-2 rounded-full flex-shrink-0"
                    style={{ backgroundColor: COLORS.primaryGreen }}
```

**Verify after:** `sed -n '839p'` reads `py-0.5`

---

## Edit E-3b+c — Served rows: remove label + shrink checkmark
**Lines:** 859-866 | **OD:** OD-430-03

```
FIND (exact):
                  <span className="text-[10px] flex-shrink-0" style={{ color: COLORS.grayText }}>
                    Served
                  </span>
                  {/* Served checkmark (no action) */}
                  <div className="flex items-center justify-center -mr-2"> {/* CR-430: removed min-h-[44px] min-w-[44px] — non-interactive static checkmark */}
                    <Check className="w-5 h-5" style={{ color: COLORS.grayText }} strokeWidth={2.5} />
                  </div>

REPLACE WITH:
                  {/* CR-430 OD-430-03: removed "Served" label (redundant) + shrunk checkmark w-5→w-3 */}
                  <div className="flex items-center justify-center -mr-2">
                    <Check className="w-3 h-3" style={{ color: COLORS.grayText }} strokeWidth={2.5} />
                  </div>
```

**Verify after:** `grep -n "w-3 h-3\|OD-430-03" src/components/cards/OrderCard.jsx` → 2 hits

---

## Edit E-4 — Remove "No active items" block
**Lines:** 688-817 (outer div condition) | **OD:** OD-430-04

```
FIND (exact):
      <div className={`px-3 border-b ${isDineIn ? 'py-1.5' : 'py-1'}`} style={{ borderColor: COLORS.borderGray }}>
        {activeItems.length > 0 ? (
          activeItems.map((item) => {

REPLACE WITH:
      {activeItems.length > 0 && ( // CR-430 OD-430-04: only render items section when active items exist — removes "No active items" block
        <div className={`px-3 border-b ${isDineIn ? 'py-1.5' : 'py-1'}`} style={{ borderColor: COLORS.borderGray }}>
          {activeItems.map((item) => {
```

⚠️ **This edit also requires closing the JSX correctly.** The existing closing sequence is:

```
FIND (exact — the else + closing div):
          })
        ) : (
          <div className="py-1.5 text-xs" style={{ color: COLORS.grayText }}>
            No active items
          </div>
        )}
      </div>

REPLACE WITH:
          })}
        </div>
      )} {/* CR-430 OD-430-04 end */}
```

**Verify after:** `grep -n "OD-430-04\|No active items" src/components/cards/OrderCard.jsx` → 1 hit (OD-430-04 comment), 0 hits for "No active items"

---

## Edit E-5a — Cancelled row: tighten padding
**Line:** 892 | **OD:** OD-430-05

```
FIND (exact):
                <div key={item.id} className="flex items-center gap-2 py-1.5">
                  <div
                    className="w-2 h-2 rounded-full flex-shrink-0"
                    style={{ backgroundColor: '#9CA3AF' }}

REPLACE WITH:
                <div key={item.id} className="flex items-center gap-2 py-0.5"> {/* CR-430 OD-430-05: tighter row padding, parity with served rows */}
                  <div
                    className="w-2 h-2 rounded-full flex-shrink-0"
                    style={{ backgroundColor: '#9CA3AF' }}
```

⚠️ **This is the SECOND `py-1.5` row in the file.** The search must include context (the `backgroundColor: '#9CA3AF'` line) to distinguish from E-3a's `COLORS.primaryGreen` line.

**Verify after:** `grep -n "OD-430-05" src/components/cards/OrderCard.jsx` → 1+ hits

---

## Edit E-5b+c — Cancelled rows: remove label + replace spacer with × icon
**Lines:** 904-909 | **OD:** OD-430-05

```
FIND (exact):
                  <span className="text-[10px] flex-shrink-0" style={{ color: '#9CA3AF' }}>
                    (Cancelled)
                  </span>
                  {/* Spacer to align with Served block's checkmark column */}
                  <div className="min-h-[44px] min-w-[44px] flex items-center justify-center -mr-2" />

REPLACE WITH:
                  {/* CR-430 OD-430-05: removed (Cancelled) label; replaced 44px spacer with tiny × — parity with served ✓ */}
                  <div className="flex items-center justify-center -mr-2">
                    <X className="w-3 h-3" style={{ color: '#9CA3AF' }} strokeWidth={2.5} />
                  </div>
```

**Note:** `X` is already imported on line 2. No import change needed.

**Verify after:** `grep -n "min-h-\[44px\]" src/components/cards/OrderCard.jsx` → 0 hits (all gone)

---

## Compile Checkpoint (after all 5 search_replace calls)

```bash
sleep 12 && tail -5 /var/log/supervisor/frontend.out.log
# Expected: "webpack compiled with 1 warning"
# The pre-existing SettlementReportMockup.jsx warning is acceptable
# ANY new warning = STOP and fix before continuing
```

---

## Verification Matrix (inherits to QA handover)

| # | Bug | Test | Steps | Expected |
|---|---|---|---|---|
| V1 | E-3 | Served rows compact | Open card with all items served, expand ▼ Served | Rows ~20px, name fits 1 line |
| V2 | E-3 | "Served" label gone | Expand ▼ Served section | Only tiny ✓ at row end, no "Served" word |
| V3 | E-3 | Checkmark small | Expand ▼ Served section | 12px ✓, visible but not dominant |
| V4 | E-4 | "No active items" gone | Open card where all items served | Block gone — card: header → waiter → ▼ Served |
| V5 | E-4 | Active items still show | Open card with Preparing/Ready items | Items render normally |
| V6 | E-4 | Mix of active + served | Open card with 2 active + 3 served | Active items show, Served section below |
| V7 | E-5 | Cancelled rows compact | Expand ▼ Cancelled section | Rows ~20px, no wide empty space |
| V8 | E-5 | "(Cancelled)" label gone | Expand ▼ Cancelled section | Only tiny ✕ at row end |
| V9 | E-5 | Strikethrough still applied | Expand ▼ Cancelled | Item names still show with line-through |
| V10 | E-5 | Parity: served ≈ cancelled | Compare both sections side by side | Both ~20px, consistent compact look |
| V11 | — | Compile clean | tail supervisor log | webpack compiled with 1 warning (pre-existing) |

---

## R5 Regression Checklist (DashboardPage.jsx hotspot applies to OrderCard.jsx R5)

- [ ] Order card renders without blank/crash
- [ ] Active items (Preparing, Ready) display correctly — name, qty, action button
- [ ] Served section toggle ▼/▲ still works
- [ ] Cancelled section toggle ▼/▲ still works
- [ ] Expand/collapse state resets correctly per card
- [ ] Bill button and footer unchanged
- [ ] Walk-in orders unaffected
- [ ] Aggregator orders unaffected (activeItems logic unchanged)

---

## Scope Lock

**WILL change:** `src/components/cards/OrderCard.jsx` only
- L688: outer items div condition wrapper
- L812-817: else branch + closing divs
- L839: served row `py-1.5` → `py-0.5`
- L859-866: remove Served label + shrink checkmark
- L892: cancelled row `py-1.5` → `py-0.5`
- L904-909: remove (Cancelled) label + replace spacer

**WILL NOT touch:**
- `StatusConfigPage.jsx` (toggle UI — separate gap)
- `OrderCard.jsx` lines outside the above ranges
- Any other file

---

## Post-Code Registry Checklist (EXIT GATE)

```
□ 1. registry.json: CR-430 → status: IMPLEMENTED, sprint_key: nov_cr_batch
□ 2. BUG_TRACKER.md: row updated with IMPLEMENTED
□ 3. FILE_OWNERSHIP.md: OrderCard.jsx + CR-430 E-3/E-4/E-5 + date
□ 4. Code markers: // CR-430 OD-430-03/04/05 on every edited line
□ 5. Compile: webpack compiled with 1 warning (pre-existing), 0 new
```

*Gate 3 complete — 2026-10-17. Awaiting Gate 4 GO from owner.*
