# BUG-625 — Implementation Plan
## Active First Pill Missing from Tablet Dropdown

**ID:** BUG-625
**Date:** 2026-11-07 (validated against `main` HEAD)
**Agent role:** PLANNING (Role 2)
**Status:** GATE_3_PLAN_COMPLETE
**Sprint:** nov_cr_batch
**Risk:** LOW
**Priority:** P0
**Related:** CR-429

**Original intake:** `change_requests/BUG-625_CR429_ACTIVE_FIRST_TABLET_MISSING_INTAKE.md`
**Original IA:** `impact/QA_BATCH_BUGS_623_627_IMPACT_ANALYSIS_2026_10_28.md` §BUG-625
**Validated:** 2026-11-07 — all line numbers, imports, props, anchor strings, and design decisions confirmed against current HEAD. Plan is accurate. Zero changes required.

---

## 1. Problem

The "Active First" toggle (CR-429) renders only inside the `xl:flex` pills navigation in `Header.jsx` (L339-351). On tablets (<1280px), the header switches to a filter dropdown, and the Active First option is absent — tablet users cannot toggle it.

---

## 2. Data Flow (confirmed on current branch)

```
DashboardPage
  → channelActiveFirst (state)
  → onChannelActiveFirstToggle (handler)
    → Header.jsx (props L48-49):
        channelActiveFirst, onChannelActiveFirstToggle
      → xl nav (L277, "hidden xl:flex"):
          dashboardView !== 'status' → status pills + Schedule + Active First (L339-351) ✅
      → tablet dropdown (L359, "xl:hidden"):
          dashboardView !== 'status' → status filters + Schedule (L414-436) — NO Active First ❌
```

Both the xl nav and the tablet dropdown use the same branching logic: `dashboardView === 'status'` shows channel filters; the `else` branch (channel view) shows status filters. Active First belongs in the `else` branch — it only applies to channel view.

---

## 3. Scope Lock

**File WILL change:**

| # | File | Edit |
|---|---|---|
| 1 | `src/components/layout/Header.jsx` | E1: insert Active First button in tablet dropdown |

**Files WILL NOT touch:** `DashboardPage.jsx`, `ChannelColumn.jsx`, `ChannelColumnsLayout.jsx`, any state, prop, API, transform, or localStorage.

---

## 4. Existing Resources (no new imports needed)

| Resource | Location | Confirmed |
|---|---|---|
| `Check` icon | Imported at L2 (`lucide-react`) | ✅ Already used by all tablet dropdown buttons |
| `COLORS.primaryOrange` | Imported from constants at L3 | ✅ Used by xl Active First pill (L347) |
| `COLORS.grayText` | Imported from constants at L3 | ✅ Used by all tablet dropdown buttons |
| `channelActiveFirst` prop | Destructured at L48 | ✅ |
| `onChannelActiveFirstToggle` prop | Destructured at L49 | ✅ |

---

## 5. Exact Edit

### E1 — `Header.jsx`: Insert after Schedule button closing `</button>` (L435), before `</>` (L436)

**Current code (L434-436) — confirmed exact:**
```jsx
                      <span>Schedule</span>
                    </button>
                  </>
```

**Replace with:**
```jsx
                      <span>Schedule</span>
                    </button>
                    {/* BUG-625: Active First toggle in tablet dropdown — mirrors xl pill (CR-429) */}
                    <button
                      data-testid="tablet-filter-active-first"
                      onClick={onChannelActiveFirstToggle}
                      className="w-full text-left px-3 py-2.5 text-sm flex items-center gap-2.5 hover:bg-slate-50 transition-colors"
                      style={{ color: channelActiveFirst ? COLORS.primaryOrange : COLORS.grayText }}
                    >
                      <Check className="w-4 h-4 flex-shrink-0" style={{ visibility: channelActiveFirst ? 'visible' : 'hidden', color: COLORS.primaryOrange }} />
                      <span>Active First</span>
                    </button>
                  </>
```

**Design decisions:**
- `data-testid="tablet-filter-active-first"` — follows existing `tablet-filter-*` naming convention (`tablet-filter-schedule`, `tablet-filter-status-*`, `tablet-filter-channel-*`)
- Styling matches existing tablet dropdown buttons exactly: `w-full text-left px-3 py-2.5 text-sm flex items-center gap-2.5 hover:bg-slate-50 transition-colors`
- Uses `COLORS.primaryOrange` for active text — intentionally matches xl pill (L347), not `COLORS.darkText` used by status-filter buttons (different UX pattern: toggle vs selection)
- `Check` icon visibility pattern identical to all other dropdown buttons, using `COLORS.primaryOrange`
- Only renders inside the `else` branch (channel view) — same condition as the xl pill
- **Lines added:** ~10

---

## 6. Conflict Pre-Check

- `Header.jsx` last touched: BUG-555 WP-C (L359 breakpoint `lg:` → `xl:`), BUG-590 (L494), BUG-588 (L503/L545)
- Insertion target L434-436 is a **different section** from all prior changes
- **No conflict.**

---

## 7. Verification Matrix

| # | Check | How to verify | Auto? |
|---|---|---|:---:|
| V1 | Active First visible in tablet dropdown when in Channel View | Browser at <1280px viewport, open dropdown | NO |
| V2 | Toggle ON → orange text + check visible; OFF → grey text + check hidden | Click button, observe state change | NO |
| V3 | Toggle changes card ordering on dashboard | Click, verify tables reorder in channel columns | NO |
| V4 | Button ABSENT from dropdown when in Status View | Switch to status view, open dropdown — only channel filters shown | NO |
| V5 | xl pills still work unchanged at ≥1280px | Browser at full width, Active First pill still works | NO |
| V6 | Tablet dropdown active count badge does NOT change on toggle | `tablet-filter-active-count` badge: counts `activeStatuses.length + (tableFilter==='schedule'?1:0)` at L375 — Active First excluded by design | NO |
| V7 | Webpack compiles clean | `tail frontend.out.log` → 0 new warnings | YES |

---

## 8. Risk Register

| # | Risk | Mitigation |
|---|---|---|
| R1 | Active count badge increments on toggle | Badge at L375 counts `activeStatuses.length + schedule` only — does not include `channelActiveFirst`. No change needed. |
| R2 | Dropdown height overflow on small screens | Button is 1 row (~40px). Existing dropdown has 6-8 items; 1 more won't overflow on any tablet. |
| R3 | Props not available | `channelActiveFirst` + `onChannelActiveFirstToggle` already destructured at L48-49, confirmed. |

---

## 9. Post-Code Registry Checklist

```
- [ ] registry.json: BUG-625 → GATE_5A_IMPLEMENTED
- [ ] BUG_TRACKER.md: row updated
- [ ] FILE_OWNERSHIP.md: Header.jsx (BUG-625, 2026-11-07)
- [ ] Code marker: // BUG-625 comment in inserted block ✅ (already in plan text above)
- [ ] Compile: 0 new warnings
```

---

## 10. Execution Sequence

1. Apply E1 (insert ~10 lines in `Header.jsx` after L435)
2. Compile check
3. Verification matrix V1-V7
4. EXIT GATE (5 checks)
5. QA handover
