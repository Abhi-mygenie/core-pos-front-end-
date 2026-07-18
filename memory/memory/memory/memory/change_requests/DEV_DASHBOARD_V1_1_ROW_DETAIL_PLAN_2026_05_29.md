# Dev Dashboard v1.1 — Row-Detail Expansion + Status Grouping

**Document:** `DEV_DASHBOARD_V1_1_ROW_DETAIL_PLAN_2026_05_29.md`
**Date:** 2026-05-29
**Stage:** Stage 5 — Plan (awaiting owner GO at Gate G-1)
**Predecessor:** Dev Dashboard v1.0 (delivered same day — see `HANDOVER_DEV_DASHBOARD_2026_05_29.md`)
**Sprint anchor:** None (internal tooling, not user-facing CR — streamlined mini-CR convention applies)
**Owner-confirmed scope:** v1.1 = click-to-expand row details (Option B) + cross-tab linking + collapsible status groups (Option C)

---

## 1. One-line scope

> Add row-level expand/collapse with rich detail panels, cross-tab ID linking, and collapsible row groups by status across all three tabs of the dev dashboard — purely client-side, JSON-only, zero touch to existing app code or to the snapshot data files.

---

## 2. Frozen Owner Decisions (carried forward)

| # | Decision | Source |
|---|---|---|
| D1 | Hidden route `/__dev/`, env-gated via `REACT_APP_SHOW_DEV_DASHBOARD` | v1.0 ask_human |
| D2 | Read-only — no write/edit/persist operations | v1.0 ask_human |
| D3 | Zero touch to existing code — only `/__dev/**` and `/app/scripts/gen_dev_dashboard_config.js` | v1.0 ask_human |
| D4 | React 18 UMD + Tailwind v4 browser + Babel-standalone (jsDelivr) | v1.0 implementation |
| D5 | Data via runtime fetch from `/__dev/data/*.json` (snapshot-based) | v1.0 ask_human |
| D6 | Folder ships to prod with "Not Enabled" gate (option a) | v1.0 ask_human |
| **D7** | **v1.1: Click-to-expand row detail (Option B), NOT hover popover** | This session |
| **D8** | **v1.1: Include collapsible status groups (Option C)** | This session |
| **D9** | **v1.1: Cross-tab linking via clickable references in each detail panel** | This session |
| D10 | Stick to AGENT_PROMPT_ALPHA.md ruleset (R1–R16) | Always |

---

## 3. Files in scope

### WILL change (all existing — additive edits within isolated dashboard)
| File | Change Type | Approx LOC |
|---|---|---|
| `/app/frontend/public/__dev/dashboard.js` | Edit — add components + state | +~250 LOC |
| `/app/frontend/public/__dev/styles.css` | Edit — add ~6 small rules for expand/collapse animation | +~20 LOC |
| `/app/frontend/public/__dev/README.md` | Edit — update tabs section to mention v1.1 features | +~10 LOC |

### Will NOT touch
- `/app/frontend/public/__dev/data/*.json` — **data files are snapshot-only; no schema change**
- `/app/frontend/public/__dev/index.html` — no markup change needed
- `/app/scripts/gen_dev_dashboard_config.js` — env-gate logic untouched
- **Anything outside `/__dev/`** — same hard ban as v1.0 (no `/src/`, no `App.js`, no `package.json`, no `craco.config.js`, no `.env`, no `/memory/final/`, no `/memory/crm/crm_1_0/`)

---

## 4. Feature Specs (per tab)

### 4.1 — Universal Behaviour (applies to all 3 tabs)

**4.1.1 Click-to-Expand Row** (Option B)
- Each table row gains an expand chevron in a new leftmost column (`▶` collapsed, `▼` expanded)
- Click anywhere on the row OR press `Enter` when row is focused → toggles expansion
- Multiple rows can be expanded simultaneously
- Expanded state is held in component state only (NOT persisted across reloads — keeps things stateless and avoids localStorage scope creep)
- A "Collapse all" button appears near the filter row whenever ≥1 row is expanded
- Smooth CSS height animation (~150ms)

**4.1.2 Cross-Tab Linking**
- A small "🔗 Cross-references" strip appears at the bottom of every detail panel
- For an item with ID `X`, it lists which OTHER tabs also contain `X`
- Format: `→ X in Bug Tracker (status: STATUS_VALUE)` rendered as a clickable button
- Click → switches active tab AND seeds the search input with `X` AND auto-expands the matching row
- Powered by an in-memory index built on first data load: `{ id → [{ tab, row, status, severity }, …] }`

**4.1.3 Collapsible Status Groups** (Option C)
- A new "Group by" dropdown appears in each tab's filter row, default `None`
- Other options per tab (see §4.2 / §4.3 / §4.4)
- When grouping is active, rows are split into collapsible sections with a header showing: `▶ <Group Name>  ·  N rows  ·  [severity/status mix pills]`
- Each group is **collapsed by default** when grouping is first applied (so the table starts dense)
- A "Expand all groups" / "Collapse all groups" pair of buttons appears next to the dropdown
- Group expand/collapse state is independent of row-detail expand/collapse state
- When grouping is set to `None`, behaviour is identical to today (flat table)

**4.1.4 Keyboard accessibility**
- Rows are focusable (`tabIndex=0`)
- `Enter` toggles row expansion
- `Esc` collapses all detail panels in the current tab
- `g` then `0/1/2` shortcut → switch tab (g+0 = Closure, g+1 = Bugs, g+2 = CRs) — *low priority, ship if time*

---

### 4.2 — Closure Debt tab

**4.2.1 New "Group by" options**
- `None` (default)
- `Severity` (CRITICAL → HIGH → MEDIUM → LOW → OK)
- `Sprint` (POS 2.0, POS 3.0, POS 3.1, CRM 2.0, Standalone, Production Hotfix)
- `Missing count` (6 of 6, 5 of 6, 4 of 6, 3 of 6, 2 of 6, ≤1)
- `Registry status` (any matching pill family — CLOSED-family, BLOCKED-family, PARTIAL, PENDING, …)

**4.2.2 Detail panel fields**

| Section | Fields | Notes |
|---|---|---|
| **Header strip** | ID badge · Title (full wrap) · Severity pill · Missing count badge · Effort hours badge | Reuses existing styles |
| **Identity** | sprint · files_touched (full wrap) | New row |
| **Artifacts (6, named)** | Each of art1…art6 as labeled row: `● Intake (PRESENT) → /change_requests/…md` · `○ Impact Analysis (MISSING)` | Doc paths from `existing_docs_path` matched by keyword heuristic (see §6.2) |
| **Existing docs** | Parsed `existing_docs_path` as a clickable list (multi-doc semicolon-split) | Links are `target="_blank"` to relative path under `/app/memory/`. NOTE: these are read-only paths; the dev dashboard cannot resolve them server-side — so links are **non-clickable info-only** by default, with a copy-path button. *(Defensive: we won't fake clickable links to files we can't actually serve.)* |
| **Recommended action** | Full-wrap multiline | Existing field |
| **Notes** | Full-wrap multiline | Existing field |
| **Flags** | `owner_verified_in_prose: ✓/✗` · `tracked_in_open_gaps: ✓/✗` | As small badges |
| **Tasks remaining** | Mini-checklist derived from missing artifacts (display-only, no checkboxes) | e.g. "Impact Analysis · Owner Smoke Sign-off" |
| **🔗 Cross-references** | Cross-tab links | See §4.1.2 |

### 4.3 — Bug Tracker tab

**4.3.1 New "Group by" options**
- `None` (default)
- `Status` (CLOSED, BACKEND-BLOCKED, CRM-BLOCKED, PARTIAL, SMOKE PENDING, INTAKE, OWNER SCOPE NEEDED, etc.)
- `Section` (Active / Recent · Intake Only · Production Hotfix)
- `Sprint` (POS 3.0, POS 3.1, PROD Hotfix, Backlog)
- `Priority` (P0 · P1 · P2 · P3 · —)

**4.3.2 Detail panel fields**

| Section | Fields | Notes |
|---|---|---|
| **Header strip** | ID · Title (full wrap) · Priority pill · Status pill | Reuses styles |
| **Identity** | section · sprint · date (if present) | All existing fields |
| **Blocker** | Full-wrap | Existing field |
| **Notes / Description** | Full-wrap | Existing field |
| **Closure Debt linkage** (enriched) | If the ID appears in `closure_debt.json`: show severity pill + 6-artifact dot strip + missing count | Computed from cross-index |
| **🔗 Cross-references** | "→ ID in CR Registry (status)" · "→ ID in Closure Debt (severity, missing)" | See §4.1.2 |

### 4.4 — CR Registry tab

**4.4.1 New "Group by" options**
- `None` (default)
- `Status` (CODE-COMPLETE, SHIPPED, NOT_STARTED, INVESTIGATION COMPLETE, etc.)
- `Sprint` (POS 2.0, POS 3.0, POS 3.1, CRM 2.0, Standalone, Phase 3)
- `Priority` (P0/P1/P2/P3/—)

**4.4.2 Detail panel fields**

| Section | Fields | Notes |
|---|---|---|
| **Header strip** | ID · Title (full wrap) · Priority pill (if present) · Status pill | Reuses styles |
| **Identity** | sprint_label · sprint_status banner (`ACTIVE since…`, `CLOSED YYYY-MM-DD`) | Computed |
| **Files Touched** | Full multi-line list (no truncation) | Existing field |
| **Notes** | Full-wrap | Existing field |
| **Hotspot warning** (enriched) | If any file in `files` matches `cross_sprint_dependency_flags[*].file` → red banner showing `⚠ Hotspot — touched by [sprints] · risk: [HIGH/MED/LOW]` | Computed |
| **Closure Debt linkage** (enriched) | If ID appears in `closure_debt.json`: severity pill + 6-artifact dots + missing count | Computed |
| **🔗 Cross-references** | "→ ID in Bug Tracker (status)" · "→ ID in Closure Debt (severity, missing)" | See §4.1.2 |

---

## 5. Data contracts (unchanged from v1.0)

**No JSON schema changes.** All new derived fields are computed client-side from existing JSON.

| Derived value | Source | Notes |
|---|---|---|
| Cross-tab ID index | `closure_debt.json.items[*].item_id` ∪ `bug_tracker.json.*[*].id` ∪ `cr_registry.json.sprints[*].crs[*].id` | Built once on data load, memoized |
| Artifact label mapping | static dict in `dashboard.js` | `art1_intake` → "Intake", etc. |
| Closure-debt enrichment for bugs/CRs | look up by ID in closure-debt index | Optional — only displayed when match exists |
| Hotspot detection | regex over CR's `files` field against `cross_sprint_dependency_flags` | Substring match |
| Group-by key extractor | static functions per tab × per groupBy choice | All client-side |

---

## 6. Implementation Details

### 6.1 New state in `App` component
```js
const [expandedRows, setExpandedRows] = useState({ closure: {}, bugs: {}, crs: {} });
const [groupBy, setGroupBy] = useState({ closure: "none", bugs: "none", crs: "none" });
const [collapsedGroups, setCollapsedGroups] = useState({ closure: {}, bugs: {}, crs: {} });
const [searchSeed, setSearchSeed] = useState({ closure: "", bugs: "", crs: "" });   // for cross-tab nav
const xref = useMemo(() => buildCrossRefIndex(closureDebt, bugTracker, crRegistry), [...]);
```

### 6.2 Artifact ↔ doc-path matcher (best-effort heuristic)
Since `existing_docs_path` is a free-text semicolon-joined string, we cannot perfectly attribute each doc to a specific artifact. Heuristic:

| Artifact | Match keywords (case-insensitive) |
|---|---|
| Intake | `INTAKE`, `DISCOVERY`, `REGISTRATION` |
| Impact | `IMPACT`, `INVESTIGATION` |
| Plan | `PLAN`, `PLANNING` |
| Code Gate | `GATE`, `PRE_IMPLEMENTATION`, `CODE_GATE` |
| Impl Summary / QA | `IMPLEMENTATION_SUMMARY`, `IMPL_SUMMARY`, `QA_REPORT`, `QA_HANDOFF`, `IMPLEMENTATION_REPORT` |
| Owner Smoke | `SMOKE_SIGNOFF`, `SMOKE`, `OWNER_VERIFIED` |

Where heuristic fails (e.g. a doc named `…COMBINED…`), the doc shows up in a "Combined / Other docs" pool at the bottom of the artifact list. **No data is fabricated**; only existing paths are surfaced.

### 6.3 New shared components (all internal to `dashboard.js`)
| Component | Purpose | LOC est. |
|---|---|---|
| `<RowExpander>` | Chevron button | ~10 |
| `<DetailPanel>` | Generic expanded-row wrapper (animated) | ~30 |
| `<ArtifactRow>` | Single labeled artifact line with state + matched doc paths | ~25 |
| `<CrossRefStrip>` | Bottom-of-panel cross-tab links | ~30 |
| `<GroupHeader>` | Collapsible group header | ~30 |
| `<DotStrip>` | Reuse from v1.0 (already exists) | 0 |
| `<HotspotBanner>` | Red warning banner for hotspot files | ~15 |
| `<StatusMixPills>` | Tiny inline pill cluster used in group headers | ~20 |
| Pure helpers: `buildCrossRefIndex`, `matchDocToArtifact`, `groupRows`, `detectHotspot` | | ~80 |

### 6.4 CSS additions (`styles.css`)
- 6 rules for expand/collapse animation, group header chevron rotation, cross-ref link hover, hotspot banner border-pulse

---

## 7. Acceptance Criteria

### AC-CL-* (Closure Debt)
| AC | Description |
|---|---|
| AC-CL-1 | Clicking a row toggles its detail panel; chevron rotates 90° |
| AC-CL-2 | Detail panel shows all 6 artifacts as named rows with PRESENT/PARTIAL/MISSING/N/A state |
| AC-CL-3 | `existing_docs_path` is split by `;` and each path shown with copy-path button |
| AC-CL-4 | Notes + recommended_action wrap in full |
| AC-CL-5 | `owner_verified_in_prose` and `tracked_in_open_gaps` shown as badges |
| AC-CL-6 | Cross-ref strip shows up to 2 links (→ Bug Tracker, → CR Registry) when ID is found in those datasets |
| AC-CL-7 | Group-by `Severity` → 5 collapsible groups (CRITICAL/HIGH/MEDIUM/LOW/OK) all collapsed initially |
| AC-CL-8 | Group-by `Sprint` → 6 collapsible groups |
| AC-CL-9 | Group-by `Missing count` → up to 5 groups (6/6, 5/6, 4/6, 3/6, ≤2/6) |
| AC-CL-10 | "Expand all groups" / "Collapse all groups" buttons work |
| AC-CL-11 | When grouping is `None`, layout matches v1.0 exactly |

### AC-BG-* (Bug Tracker)
| AC | Description |
|---|---|
| AC-BG-1 | Click row → detail panel with full status/blocker/notes |
| AC-BG-2 | If bug ID matches a closure-debt entry, that row's severity + 6 dots + missing count is shown |
| AC-BG-3 | Cross-ref to CR Registry visible when applicable (e.g. BUG-108) |
| AC-BG-4 | Group-by `Status` produces collapsible sections per status family |
| AC-BG-5 | Group-by `Section` produces 3 sections (Active/Intake/Hotfix) |
| AC-BG-6 | Group-by `Priority` produces 5 sections (P0/P1/P2/P3/—) |

### AC-CR-* (CR Registry)
| AC | Description |
|---|---|
| AC-CR-1 | Click row → detail panel with full files & notes |
| AC-CR-2 | If any file matches `cross_sprint_dependency_flags`, red hotspot banner shown with risk pill |
| AC-CR-3 | Cross-ref to Closure Debt visible when ID matches (e.g. CR-002) |
| AC-CR-4 | Group-by `Sprint` produces 6 sections (one per sprint bucket) |
| AC-CR-5 | Group-by `Status` produces N sections based on distinct statuses |

### AC-XR-* (Cross-tab linking)
| AC | Description |
|---|---|
| AC-XR-1 | Click "→ X in [Other Tab]" → switches to that tab AND auto-fills the search box with `X` AND auto-expands the row for `X` |
| AC-XR-2 | If `X` is filtered out by current filters in the destination tab, those filters are auto-reset to `ALL` so the row is visible |
| AC-XR-3 | The seeded search persists until the user changes it manually |

### AC-UX-* (UX)
| AC | Description |
|---|---|
| AC-UX-1 | Multiple row expansions can be active simultaneously |
| AC-UX-2 | "Collapse all" button visible only when ≥1 row is expanded |
| AC-UX-3 | `Esc` collapses all expanded rows in current tab |
| AC-UX-4 | Row hover state still works (subtle background change) |
| AC-UX-5 | Grouped headers show row count + severity/status mix at-a-glance |

### AC-REG-* (Regression — must still hold)
| AC | Description |
|---|---|
| AC-REG-1 | `git status` shows ZERO modifications to `/app/frontend/src/**`, `App.js`, `package.json`, `craco.config.js`, `.env`, `index.html` (main app) |
| AC-REG-2 | Main app `/` returns HTTP 200 |
| AC-REG-3 | Disabled state (`config.enabled=false`) still shows "Not Enabled" gate |
| AC-REG-4 | CSV export still works for filtered + grouped rows (exports flattened filtered set, ignoring group structure) |
| AC-REG-5 | v1.0 filter dropdowns + search still work identically |
| AC-REG-6 | Babel-standalone + React 18 + Tailwind CDN setup unchanged |
| AC-REG-7 | Snapshot data files (`closure_debt.json`, `bug_tracker.json`, `cr_registry.json`) byte-identical to v1.0 |

---

## 8. Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| `dashboard.js` grows beyond ~1000 LOC and Babel-standalone compile time degrades | M | L | Acceptable — initial compile is ~150ms cached by browser. Owner accepted in v1.0. |
| Cross-ref index miscomputes for IDs with whitespace/case differences | L | L | Normalize all IDs via `.trim().toUpperCase()` before indexing |
| Doc-to-artifact heuristic mis-attributes a doc | M | L | Fall back to "Combined / Other docs" bucket; never claim attribution we can't prove |
| Hotspot detection false-positive (substring match) | L | L | Show as warning, not blocker; copy includes "may overlap" wording |
| Group-collapsed-by-default hides content the user expected to see | L | M | Sticky banner "5 groups collapsed — click to expand" + Expand-all button |
| Adding `tabIndex` triggers focus rings around rows in unintended places | L | L | Use `outline-none focus-visible:ring-2` so ring shows only on keyboard nav |
| Existing v1.0 test selectors (`data-testid`) break | L | M | All existing test IDs preserved verbatim; new test IDs added with prefix `row-detail-*` and `group-header-*` |
| Snapshot data file accidentally modified | L | H | Per scope-lock §3 — data files in "Will NOT touch" list. Implementation will be reviewed pre-commit. |

**Overall regression risk: LOW** — same as v1.0. Zero touch to existing main app code; this is purely additive within the isolated dashboard.

---

## 9. Test Matrix

| # | Pre-condition | Action | Expected |
|---|---|---|---|
| T-1 | Closure Debt tab loaded | Click first row | Detail panel slides open, chevron rotates |
| T-2 | T-1 done | Click first row again | Panel collapses |
| T-3 | Closure Debt | Click 3 different rows | All 3 expanded simultaneously |
| T-4 | T-3 done | Click "Collapse all" | All 3 collapse |
| T-5 | Closure Debt | Expand BUG-109 row | Detail shows: title, severity HIGH, 6 named artifact rows, doc paths, cross-ref to Bug Tracker + CR Registry not present (BUG-109 only in closure debt and bug tracker, not as CR in registry — but it IS a CR ID in CR registry pos_3_1, so cross-ref to CR Registry SHOULD appear) |
| T-6 | T-5 expanded | Click "→ BUG-109 in Bug Tracker" cross-ref link | Tab switches to Bug Tracker, search box shows "BUG-109", row for BUG-109 auto-expanded |
| T-7 | Closure Debt | Group-by → Severity | 5 collapsible groups appear, all collapsed |
| T-8 | T-7 done | Click "CRITICAL" group header | Group expands showing 15 rows |
| T-9 | T-7 done | Click "Expand all groups" | All 5 groups expand |
| T-10 | Closure Debt + group + filter | Group-by Sprint + Severity filter = CRITICAL | Groups show only CRITICAL rows; empty groups hidden |
| T-11 | Bug Tracker | Click BUG-108 row | Panel shows Closure Debt enrichment (MEDIUM severity, 3 missing) + cross-ref to CR Registry |
| T-12 | CR Registry | Click CR-002 | Panel shows: files list, sprint status banner, Closure Debt enrichment (HIGH, 2 missing), cross-ref to Closure Debt |
| T-13 | CR Registry | Click BUG-097 row (it's a CR-style entry in POS 3.0) | Panel shows files including `OrderEntry.jsx`, hotspot banner appears with HIGH risk |
| T-14 | Any tab | Press `Esc` | All expanded panels in current tab collapse |
| T-15 | Closure Debt | Export CSV after grouping by Sprint with CRITICAL filter | Downloaded CSV contains 15 rows, no group headers |
| T-16 | Disable config | Reload page | "Dashboard Not Enabled" page renders (unchanged from v1.0) |
| T-17 | Main app | Visit `/` | Login screen renders (HTTP 200, no regression) |
| T-18 | All 3 tabs | Visit each tab | No console errors / no pageerror |
| T-19 | Mobile width (375px) | Expand any row | Detail panel reflows acceptably (cards stack vertically) |
| T-20 | `git diff` after build | — | No changes outside `/app/frontend/public/__dev/` and `/app/scripts/` |

---

## 10. Rollback

Single-file revert:
```bash
git checkout HEAD~1 -- /app/frontend/public/__dev/dashboard.js \
                       /app/frontend/public/__dev/styles.css \
                       /app/frontend/public/__dev/README.md
```

This restores v1.0 behaviour exactly. JSON data files are unchanged so no data rollback needed.

---

## 11. Gate Ladder

```
Gate G-1 — APPROVE THIS PLAN                              [PENDING owner approval]
  Step 1 — Implement helpers (xref index, group, match)    [HOLD until G-1]
  Step 2 — Implement <DetailPanel> + <RowExpander>         [auto, no gate]
  Step 3 — Wire detail panel into Closure Debt             [auto]
  Step 4 — Wire detail panel into Bug Tracker              [auto]
  Step 5 — Wire detail panel into CR Registry              [auto]
  Step 6 — Implement <GroupHeader> + grouping logic        [auto]
  Step 7 — Cross-tab linking action                        [auto]
  Step 8 — Esc/keyboard a11y                               [auto]
  Step 9 — Verify all 20 test matrix items                 [auto]
  Step 10 — Update README.md + handover note               [auto]

Gate G-2 — OWNER SMOKE TEST on preprod URL                 [HOLD until step 10]
Gate G-3 — APPROVE FINAL CLOSE-OUT                         [HOLD until G-2 PASS]
```

Owner can collapse gates with explicit message ("approve all v1.1 work in one go").

---

## 12. Confirmations

| # | Confirmation | Status |
|---|---|---|
| 1 | Plan reviewed, no code edited yet | CONFIRMED |
| 2 | All diffs scoped to `/__dev/dashboard.js`, `/__dev/styles.css`, `/__dev/README.md` | CONFIRMED |
| 3 | JSON data files UNTOUCHED | CONFIRMED |
| 4 | `/app/frontend/src/**` UNTOUCHED | CONFIRMED |
| 5 | `/app/memory/final/` and `/app/memory/crm/crm_1_0/` UNTOUCHED | CONFIRMED |
| 6 | Owner decisions D7, D8, D9 reflected verbatim | CONFIRMED |
| 7 | Rulebook (AGENT_PROMPT_ALPHA.md R1–R16) honoured | CONFIRMED |
| 8 | No new npm dependencies | CONFIRMED |
| 9 | No new env vars beyond `REACT_APP_SHOW_DEV_DASHBOARD` from v1.0 | CONFIRMED |
| 10 | Snapshot data semantics unchanged (no field renames, no schema diff) | CONFIRMED |

---

## 13. Estimated Effort

| Step | Time |
|---|---|
| Helpers (xref index, grouping, doc-match heuristic) | 15 min |
| Detail panel + row expander | 10 min |
| Wire panel into Closure Debt with all enrichment | 15 min |
| Wire panel into Bug Tracker + closure-debt enrichment | 10 min |
| Wire panel into CR Registry + hotspot detection | 10 min |
| Status grouping (Option C) | 15 min |
| Cross-tab linking action + filter-reset logic | 10 min |
| Keyboard a11y (`Esc`, `Enter`, focus rings) | 5 min |
| CSS (animations, group chevrons) | 5 min |
| Manual test through 20-case matrix + screenshots | 15 min |
| README + handover doc update | 10 min |
| **Total** | **~2 hours** |

---

## 14. Files referenced

- v1.0 handover: `/app/memory/memory/HANDOVER_DEV_DASHBOARD_2026_05_29.md`
- Session start: `/app/memory/control/sessions/SESSION_START_2026_05_29_DEV_DASHBOARD.md`
- Dashboard source: `/app/frontend/public/__dev/dashboard.js`
- Data files: `/app/frontend/public/__dev/data/*.json`
- Agent prompt: `/app/memory/control/AGENT_PROMPT_ALPHA.md`

---

**End of Dev Dashboard v1.1 Plan. Stage 5 — awaiting owner approval at Gate G-1.**
