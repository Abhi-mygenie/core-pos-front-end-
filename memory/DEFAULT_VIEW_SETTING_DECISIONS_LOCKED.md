# Default View Setting (Req 4) — Locked Decisions

**Status:** APPROVED for implementation. Decisions locked by Abhishek (current session).
**Companion docs:** `/app/memory/DEFAULT_VIEW_SETTING_DEEPDIVE.md` (full analysis), `/app/memory/V3_DOC_UPDATES_PENDING.md` (V3 update queue).
**Implementation phase:** queued; will be folded into `/app/memory/FOUR_REQUIREMENTS_IMPLEMENTATION_HANDOVER.md` once Reqs 1–3 are also answered.

---

## Locked answers

| Q | Decision | Notes |
|---|---|---|
| Q-1 — Storage shape | **(a)** Two new localStorage keys | `mygenie_default_pos_view` and `mygenie_default_dashboard_view` |
| Q-2 — Factory defaults | POS = `'table'`, Dashboard = `'channel'` | Note: revises today's hardcoded `'status'` at `DashboardPage.jsx:309` to `'channel'`. Implementation must update that line too. |
| Q-3 — First pick of Both | **(a)** Pre-select factory default in picker | Matches existing visibility-settings UX |
| Q-4 — UI placement | **(a)** Inline sub-row under each axis row, visible only when axis = `'both'` | |
| Q-5 — Reset to Default button | **(a)** Resets new default keys to factory values too | |
| Q-6 — Cross-tab conflict | DROPPED | Each user has their own localStorage; no cross-tab conflict to handle |
| Q-7 — Picker visibility when axis ≠ `'both'` | **(a)** Hide entirely | Stored value is preserved internally; not rendered |
| Q-8 — Help copy update | **(a) (default)** Replace existing copy with: *"By default, cashiers see both view toggles in the sidebar and can switch on the fly. Pick a specific view to lock the dashboard. Choose **Both** to let cashiers switch freely — you can also set which view opens first when both are enabled."* | If owner overrides later, they will say "Q-8: c" (no change). |
| Q-9 — Backward compat / migration | **(a)** No migration; legacy tenants get factory defaults on next render | |
| Q-10 — Test-IDs | **(a)** `default-pos-view-table`, `default-pos-view-order`, `default-dashboard-view-channel`, `default-dashboard-view-status` | |
| Q-11 — Sidebar runtime toggles | **(a)** In-memory only; do NOT write the new default keys | Sidebar toggles unchanged from Task 1 v2 |
| Q-12 — V3 doc update | **NOT inline** | Owner requested a separate doc; see `/app/memory/V3_DOC_UPDATES_PENDING.md`. Another agent will later validate and merge into `/app/v3/*`. |
| Q-13 — Permission gating | **(a)** No extra permission gate | Matches existing View Mode lock semantics |

---

## Effective runtime precedence (final rule)

For each axis, when computing the initial value of `activeView` / `dashboardView` in `DashboardPage.jsx`:

1. **Lock value** — `mygenie_view_mode_*` ∈ `{'table'|'order'}` or `{'channel'|'status'}` → use it.
2. **Admin default** — when lock = `'both'`, read `mygenie_default_*_view` if present.
3. **Factory default** — POS = `'table'`, Dashboard = `'channel'`.

Sidebar runtime toggles continue to flip in-memory only and never write any of the four keys above.

---

## Storage contract summary (final)

| Key | Allowed values | Default | Active when |
|---|---|---|---|
| `mygenie_view_mode_table_order` (existing) | `'table' \| 'order' \| 'both'` | `'both'` | Always |
| `mygenie_default_pos_view` (NEW) | `'table' \| 'order'` | `'table'` | Above key = `'both'` |
| `mygenie_view_mode_channel_status` (existing) | `'channel' \| 'status' \| 'both'` | `'both'` | Always |
| `mygenie_default_dashboard_view` (NEW) | `'channel' \| 'status'` | `'channel'` | Above key = `'both'` |

---

## Files to touch (final list)

| File | Change |
|---|---|
| `frontend/src/pages/StatusConfigPage.jsx` | Add 2 new state vars + hydrate on mount + persist on Save + render 2 inline sub-row pickers (visible only when axis = `'both'`); update help copy at line 763 (per Q-8 = a); extend `resetToDefault` to clear new keys to factory. |
| `frontend/src/pages/DashboardPage.jsx` | Replace hardcoded fallbacks at lines 302 and 309 with the precedence rule above (note the line 309 factory changes from `'status'` to `'channel'`). Same logic applied in path-nav effect (lines 240-250) and `storage` event listener (lines 253-288). |
| `frontend/src/components/layout/Sidebar.jsx` | No change. |
| Contexts / API | No change. |
| `/app/memory/V3_DOC_UPDATES_PENDING.md` | Append `AD-Default-View` entry (separate doc; another agent will merge into V3). |

---

_End of locked decisions for Req 4. No code modified yet._
