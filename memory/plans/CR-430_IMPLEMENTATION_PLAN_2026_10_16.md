# Implementation Plan — CR-430
## Served items: reduce card height + localStorage-controlled auto-expand + compact served rows

**Role:** PLANNING (Gate 3) · **Date:** 2026-10-16 · **Updated:** 2026-10-17 (OD-430-03 scope extension)
**Based on:** `impact/CR-430_IMPACT_ANALYSIS_2026_10_16.md` + `impact/CR-430_SERVED_ITEMS_COMPACT_MOCKUP_2026_10_17.html`
**Code Reality:** PARTIAL · Risk: MEDIUM · 1 file (OrderCard.jsx R5)

---

## OD-430-03 LOCKED (2026-10-17) — Option A
> Remove "Served" text label from each row (redundant — section says "Served").
> Shrink checkmark icon w-5 h-5 → w-3 h-3 (12px, kept for visual confirmation).
> Reduce row padding py-1.5 → py-0.5 (~35% height reduction per row).

---

## Scope Lock
**WILL change:** `OrderCard.jsx`
- L84-88 (useEffect auto-expand)
- L857 (checkmark div — already done in prev impl)
- L838-865 (served items map — NEW scope from OD-430-03)

**WILL NOT touch:** expand/collapse toggle button, any other component, StatusConfigPage (separate toggle gap)

---

## Step 0 — Entry Verification
```bash
sed -n '84,89p' src/components/cards/OrderCard.jsx
# Expected: BUG-293 useEffect: if (_allServed) setShowServed(true)

sed -n '857p' src/components/cards/OrderCard.jsx
# Expected: <div className="min-h-[44px] min-w-[44px] flex items-center justify-center -mr-2">

grep -c "CR-430" src/components/cards/OrderCard.jsx
# Expected: 0
```

---

## Edit E-1 — L84-88: Make BUG-293 auto-expand respect localStorage preference

```jsx
// BEFORE:
  // BUG-293: auto-expand when all items become served (mount + real-time).
  // Uses primitive bool dep so React compares correctly regardless of array reference.
  useEffect(() => {
    if (_allServed) setShowServed(true);
  }, [_allServed]);

// AFTER:
  // BUG-293: auto-expand when all items become served (mount + real-time).
  // CR-430: respect localStorage preference — staff can disable auto-expand per device.
  // Key: 'mygenie_served_auto_expand' — absent or 'true' = auto-expand ON (default), 'false' = OFF.
  useEffect(() => {
    const autoExpand = localStorage.getItem('mygenie_served_auto_expand') !== 'false';
    if (_allServed && autoExpand) setShowServed(true);
  }, [_allServed]); // CR-430
```

---

## Edit E-2 — L857: Remove unnecessary touch-target sizing from static checkmark div

```jsx
// BEFORE:
                  <div className="min-h-[44px] min-w-[44px] flex items-center justify-center -mr-2">

// AFTER:
                  <div className="flex items-center justify-center -mr-2"> {/* CR-430: removed min-h/w — non-interactive static checkmark */}
```

**Why safe:** This div holds only a `<CheckCircle2>` or `<Check>` icon (static, not tappable). The 44px was a mistaken touch-target size. The card's served items expand/collapse toggle button at a different location keeps its own 40px height.

---

## Execution
Execute in **Session 2** (with BUG-572 E-2 + BUG-574, all in one OrderCard.jsx R5 session).

---

## Verification Matrix
| # | Check | Expected |
|---|---|---|
| V1 | Served item row height | ~20px per item (not 44px) |
| V2 | Cards more compact when served items visible | Visible reduction in card height |
| V3 | Toggle (▼ Served N) still works | Expand/collapse still functional |
| V4 | `mygenie_served_auto_expand` absent → auto-expand ON | Default behaviour preserved |
| V5 | `mygenie_served_auto_expand = 'false'` → no auto-expand | Staff preference respected |
| V6 | `mygenie_served_auto_expand = 'true'` → auto-expand ON | Explicit opt-in works |
| V7 | Compile clean | 0 new warnings |
| V8 | OD-430-03: "Served" text label gone from each served row | Not visible in expanded list |
| V9 | OD-430-03: Checkmark is small (12px) and visible but not dominant | Tiny ✓ at row end |
| V10| OD-430-03: 9-item served list visibly shorter (~35% less height) | Noticeably more compact |

## R5 Regression Checklist
| # | Test |
|---|---|
| R1 | Served item markup still shows correctly (name, qty, time) |
| R2 | Expand/collapse toggle button unchanged |
| R3 | _allServed logic still computes correctly |
| R4 | No layout shift on other card sections |
| R5 | Green dot still visible on each served item row |

## Post-Code Checklist
```
- [ ] registry.json: CR-430 → GATE_5A_IMPLEMENTED
- [ ] BUG_TRACKER.md updated
- [ ] FILE_OWNERSHIP.md: OrderCard.jsx
- [ ] Code markers: CR-430 at all edited lines
- [ ] Compile: clean
```

---

## Edit E-3 — Served items compact rows (OD-430-03 · NEW scope 2026-10-17)

**File:** `src/components/cards/OrderCard.jsx`
**Lines:** ~838-865 (served items map block)
**Bugs addressed:** OD-430-03

```jsx
// FIND (current served row):
                <div key={item.id} className="flex items-center gap-2 py-1.5">

// REPLACE WITH:
                <div key={item.id} className="flex items-center gap-2 py-0.5"> {/* CR-430 OD-430-03: tighter row padding */}
```

```jsx
// FIND (Served text label — remove entirely):
                  <span className="text-[10px] flex-shrink-0" style={{ color: COLORS.grayText }}>
                    Served
                  </span>
                  {/* Served checkmark (no action) */}
                  <div className="flex items-center justify-center -mr-2"> {/* CR-430: removed min-h-[44px] min-w-[44px] — non-interactive static checkmark */}
                    <Check className="w-5 h-5" style={{ color: COLORS.grayText }} strokeWidth={2.5} />
                  </div>

// REPLACE WITH:
                  {/* CR-430 OD-430-03: removed "Served" label (redundant) + shrunk checkmark w-5→w-3 */}
                  <div className="flex items-center justify-center -mr-2">
                    <Check className="w-3 h-3" style={{ color: COLORS.grayText }} strokeWidth={2.5} />
                  </div>
```

**Net change:** Remove `<span>Served</span>`, shrink `w-5 h-5` → `w-3 h-3`, tighten `py-1.5` → `py-0.5`
