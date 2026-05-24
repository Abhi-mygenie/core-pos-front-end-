# POS2.0 Wave 5 — BUG-070 Implementation Report — 2026-05-17

## 1. Status
**APPLIED** — exactly per `POS2_0_WAVE_5_CODE_DIFF_PREVIEW_BUG_070_2026_05_17.md` + Change 4.3 (TableSection conditional header) approved 2026-05-17.

---

## 2. Files modified

| File | Change | Insertions | Deletions |
|------|--------|-----------:|----------:|
| `frontend/src/pages/DashboardPage.jsx` | `sectionName` on adaptTable (3 branches: occupied, available, walk-in); `sectionName` on `allRoomsList` (2 branches); new `roomsBySection` useMemo; render gate `isDineInOnly &&` dropped; new sectioned-rooms render block | ~55 | ~7 |
| `frontend/src/components/dashboard/ChannelColumn.jsx` | `sortedItems` → `sortedGroups` (bucket by sectionName, hoist `__no_section__` to top); render section headers above each non-null group | ~92 | ~67 |
| `frontend/src/components/sections/TableSection.jsx` | Header block wrapped in `{section.name && (...)}` so un-sectioned bucket renders with NO header band | +4 | -1 |
| **Total** | | **~151** | **~75** |

---

## 3. Owner directives honored

| Directive | Where enforced |
|---|---|
| Q1 — Channel View Room column segregates by area | `ChannelColumn.jsx` sortedGroups bucketing on `it.sectionName` |
| Q2 — Plain text headers | `ChannelColumn.jsx` `px-1 pt-2 pb-1 text-xs uppercase tracking-wide` band |
| Q3 — Section order = API insertion order | `sortedGroups` Map preserves insertion order; `roomsBySection` same |
| Q4 — Un-sectioned items render at top with NO header | `__no_section__` bucket hoisted to top; `TableSection.jsx` header now conditional; ChannelColumn header conditional on `group.name` |
| Cx1 — Table View sections render whenever `hasAreas` | L1585 gate now `hasAreas ?` (was `isDineInOnly && hasAreas ?`) |
| Order View / List View / Status View untouched | No changes to `showListView` branch or any other view |
| Empty sections hidden per column | Sections only appear in `sortedGroups` when ≥1 item carries that `sectionName` |

---

## 4. Validation

| Gate | Result |
|------|--------|
| ESLint on all 3 files (parallel) | ✅ No issues found |
| `yarn test --watchAll=false` | ✅ **498/498 passed**, 34 suites, 5.75 s |
| Webpack hot-reload | ✅ Dev server compiles green |

---

## 5. Owner smoke checklist (10 scenarios)

1. **Channel View — Dine-In column** sectioned by area (e.g., "Main / Walk-In" headers visible between cards)
2. **Channel View — Room column** sectioned by area (e.g., "First Floor / Second Floor / Top Floor" headers — matches the user's 101/102/103/201/202/203 screenshot scenario)
3. **Channel View — TakeAway / Delivery** remain flat (unchanged)
4. **Channel View — section order** matches API insertion order, not alphabetical
5. **Channel View — empty sections** hidden per column (e.g., a "Patio" header doesn't appear in Dine-In column if no Patio tables exist right now)
6. **Channel View — `__no_section__` bucket** renders at top with NO header band (room/table without `sectionName` in API)
7. **Table View default** (all channels active) → tables sectioned by area (previously only sectioned when filtered to Dine-In only)
8. **Table View — rooms** sectioned by area below tables, when room `sectionName` exists in API
9. **Table View — un-sectioned rooms** render at top with NO header band (Q4 fix via TableSection conditional)
10. **List View / Order View / Status View** → flat, unchanged

---

## 6. Sub-patch (Change 4.3) — TableSection conditional header

**Proof of need** (owner-approved 2026-05-17):
- Before patch: `<TableSection>` at `frontend/src/components/sections/TableSection.jsx` L30-37 ALWAYS rendered the header `<div>` (with `mb-4` margin) regardless of `section.name`. An empty 14px band would have appeared above un-sectioned rooms.
- After patch: header `<div>` wrapped in `{section.name && (...)}`. When `name === null`, no header element renders at all — no margin, no spacing artifact.

**Regression safety**: every existing `<TableSection>` call site passes a `section.name` derived from `apiTable.title` or hardcoded ('Walk-In', 'Default', section names from API). All existing render paths have non-null `name`. The conditional has zero effect on existing renders; only the new BUG-070 `__no_section__` bucket exercises the new path.

---

## 7. Risks / open items resolved at apply time

| Risk flagged in diff preview §11 | Resolution |
|---|---|
| `<TableSection>` always renders header even when `name === null` | ✅ Fixed via Change 4.3 sub-patch |
| Removing `isDineInOnly` gate may surprise operators | Per owner directive Cx1=a; document in closure report |
| `apiTables` may not carry `sectionName` on rooms in some restaurants | Safe default — falls into `__no_section__` bucket, renders flat = same as today |
| Channel View `dineIn` column includes walk-ins | Walk-ins carry `sectionName: 'Walk-In'` → grouped into "Walk-In" section under Dine-In column — matches Table View parity |

---

## 8. Wave 5 status

| Item | Status |
|------|--------|
| BUG-071 (UI / bills user-facing ID) | ✅ APPLIED (smoke deferred per owner) |
| BUG-070 (Area-wise segregation) | ✅ APPLIED — awaiting owner smoke |
| **Wave 5 Closure** | ⏳ After both smokes pass |

---

*— End of Wave 5 BUG-070 Implementation Report —*
