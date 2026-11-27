# Impact Analysis — BUG-565
## Header Overflow 44px at 600×960 — Add Button Off-Screen

**Role:** PLANNING (Gate 2 — Impact Analysis only)
**Date:** 2026-10-16
**Agent:** E1
**Code Reality:** PARTIAL — Header.jsx has CR-414 implementation; BUG-565 is a one-line omission in that implementation
**Conflict Pre-Check:** CONFLICT with BUG-555 WP-C on `Header.jsx` — execution order: BUG-565 BEFORE WP-C (WP-C is HELD pending CR-414 QA pass; this fix IS the unblock)

---

## 1. Summary

At 600×960 viewport (minimum OD-537-01 support target), the `pos-header` element overflows by **44px** (`scrollWidth=588 > clientWidth=544`). The Add button is pushed off-screen; users cannot add new orders on the smallest supported tablet.

**Root Cause (HIGH confidence):** Line 433 of `Header.jsx` — the center section wrapper `<div className="flex-1 flex justify-end px-2 lg:px-4">` is missing `min-w-0`. In CSS flexbox, a `flex-1` item without `min-w-0` retains `min-width: auto` (the browser's computed minimum content width). This prevents the center section from shrinking below its intrinsic minimum, causing the root flex row to overflow when left-section + right-section widths already consume most of the 544px available.

**Classification:** CODE_ERROR — CR-414 plan had `flex-1` on center but omitted the paired `min-w-0`; the inner search div (L441) has `min-w-0` but the outer center wrapper (L433) does not.

---

## 2. Viewport Budget at 600px

| Section | Width | Shrinkable? |
|---|---|---|
| Sidebar rail | 56px | No (Sidebar, not Header) |
| Header available | **544px** | — |
| Header px-3 padding | 24px | — |
| Inner flex row budget | **520px** | — |
| Left section (logo ~85px + gap-4 16px + tablet-dropdown-btn ~130px) | ~231px | No — `whitespace-nowrap` on btn |
| Right section (Add btn ~70px + gap-3 12px + dot 10px) | ~92px | No — fixed-size buttons |
| Center section must fit within | **~197px** | Only if `min-w-0` present |
| Center actual min without `min-w-0` | ~241px (browser auto) | Blocked — **causes 44px overflow** |

---

## 3. Affected File

| File | Line | Current | Change |
|---|---|---|---|
| `src/components/layout/Header.jsx` | **L433** | `className="flex-1 flex justify-end px-2 lg:px-4"` | `className="flex-1 min-w-0 flex justify-end px-2 lg:px-4"` |

**Only 1 file, 1 line changed.**

---

## 4. Risk Classification

**Risk: LOW**
- Pure CSS utility class addition (`min-w-0` = `min-width: 0`)
- No JS, state, API, localStorage, socket, or financial logic change
- No new component, prop, or hook introduced
- Desktop (≥1024px): unaffected — center section already has ample space; min-w-0 has zero visual effect when flex-1 has room to grow
- Header.jsx is **NOT** in the R5 hotspot list (`OrderEntry.jsx`, `CollectPaymentPanel.jsx`, `orderTransform.js`, `DashboardPage.jsx`, `LoadingPage.jsx`)

**Fast Lane eligible: YES** — all 7 conditions met:
1. ✅ 1 file only
2. ✅ ≤10 lines (1 line)
3. ✅ No API / state / localStorage / socket / registry schema / env change
4. ✅ Not an R5 hotspot file
5. ✅ Not financial / order / print / auth / permission
6. ✅ No open conflict in FILE_OWNERSHIP.md (BUG-565 is new; CR-414 on same file is the parent — this fix is within CR-414's QA re-test scope)
7. ✅ Owner approval needed (stated below)

---

## 5. Conflict Pre-Check

| Item | File | Status | Interaction |
|---|---|---|---|
| CR-414 / BUG-537 | `Header.jsx` | `GATE_5A_IMPLEMENTED` (QA fail) | **Parent** — BUG-565 is a child fix; lands in same QA cycle |
| BUG-555 WP-C | `Header.jsx` | HELD (awaiting CR-414 QA pass) | **Must run AFTER** BUG-565 fix. WP-C changes `lg:` → `xl:` on 8 breakpoint sites — none touch L433. **Parallel-safe.** |

Execution order: **BUG-565 → CR-414 QA re-test PASS → BUG-555 WP-C**

---

## 6. Downstream Consumers

`Header.jsx` is rendered by `DashboardPage.jsx`. This change:
- Does NOT alter any prop, state variable, ref, or exported symbol
- Does NOT affect DashboardPage logic
- Does NOT affect BUG-555 WP-A/B/D (those are in `OrderEntry.jsx`, `CategoryPanel.jsx`, `Sidebar.jsx`, 40 report pages — none share this class string)

No consumer changes needed.

---

## 7. Data Flow Trace

```
DashboardPage.jsx
  └─ <Header /> (src/components/layout/Header.jsx)
       └─ <header data-testid="pos-header" className="px-3 py-2">
            └─ <div className="flex items-center">          ← root flex row
                 ├─ Left section (flex items-center gap-4)  ← ~231px, fixed
                 ├─ Center section (flex-1 [+min-w-0])      ← L433 — FIX HERE
                 │    └─ Search box (flex-1 min-w-0)        ← inner already has min-w-0
                 └─ Right section (flex items-center gap-3) ← ~92px, fixed
                      └─ Add button (data-testid="add-table-btn")
```

BREAK POINT: L433 center section — `flex-1` without `min-w-0` → browser sets `min-width: auto` → center claims ~241px minimum → 231 + 241 + 92 = 564px > 520px available → 44px overflow → Add button pushed off-screen.

---

## 8. Verification Matrix (seeds QA)

| # | Check | Viewport | Method | Expected after fix |
|---|---|---|---|---|
| V1 | Header no overflow | 600×960 | Browser DevTools: `scrollWidth === clientWidth` | scrollWidth ≤ clientWidth (0px overflow) |
| V2 | Add button visible | 600×960 | `document.querySelector('[data-testid="add-table-btn"]').getBoundingClientRect()` | right ≤ viewport width |
| V3 | Search box functional | 600×960 | Click search, type query | Search box usable, no layout break |
| V4 | Desktop pixel-identical | 1280×800 | Visual comparison vs pre-fix | No change (min-w-0 has no effect when flex-1 has room) |
| V5 | 768×1024 still PASS | 768×1024 | Header overflow check | scrollWidth ≤ clientWidth |
| REG-1 | Compile clean | — | `webpack compiled` | 1 pre-existing warning, 0 new |

---

## 9. Post-Code Registry Checklist (for Implementation agent)

```
- [ ] registry.json: BUG-565 → status: GATE_5A_IMPLEMENTED, sprint_key: oct_cr_batch
- [ ] BUG_TRACKER.md: row updated (GATE_5A_IMPLEMENTED)
- [ ] FILE_OWNERSHIP.md: Header.jsx — BUG-565 IMPL 2026-10-16
- [ ] Code marker: // BUG-565 on changed line in Header.jsx
```

---

## 10. Owner Decisions

**None.** Root cause is a missing CSS utility. No business logic, no OD needed.

Fast Lane approval request:
> **FAST LANE APPROVAL REQUESTED for BUG-565**
> Risk: LOW | File: Header.jsx L433 | Change: add `min-w-0` to className | Lines: 1
> Owner: reply `BUG-565 Fast Lane GO` to skip Gate 3 and proceed directly to implementation.
> Or reply `Gate 3 GO` for a full Implementation Plan first.

---

## 11. Related Gap Resolved

**OG-AUDIT-F1** in `OPEN_GAPS_REGISTER.md` (V-800 portrait Add button clipped) — same root cause, same fix. This IA resolves OG-AUDIT-F1 as a sub-finding of BUG-565.

---

## Artifacts
- IA: `/app/memory/impact/BUG-565_IMPACT_ANALYSIS.md` ← this file
- QA report (source): `/app/memory/test_reports/QA_REPORT_CR414_BUG537_2026_10_15.md`
- Evidence: measured in QA report (scrollWidth=588, clientWidth=544, overflow=44px)
