# Changelog

## 2026-04-25 — Req 4: Default View Setting

**What:** Admin-controlled "Default View" sub-setting for the View Mode lock when an axis is set to `'both'`. Replaces hardcoded fallbacks in `DashboardPage.jsx` (POS axis: kept `'table'`; Dashboard axis: changed `'status'` → `'channel'`) with two new localStorage-backed admin settings.

**Storage contract:**
- `mygenie_default_pos_view` — `'table' | 'order'`, factory `'table'`, active when `mygenie_view_mode_table_order === 'both'`
- `mygenie_default_dashboard_view` — `'channel' | 'status'`, factory `'channel'`, active when `mygenie_view_mode_channel_status === 'both'`

**Runtime precedence per axis:** Lock value > Admin default > Factory default.

**Files changed:**
- `frontend/src/pages/StatusConfigPage.jsx` — 4 new const + 2 state vars + hydrate + persist + extended `resetToDefault` + 2 inline sub-row pickers (visible only when parent axis = `'both'`) + help-copy update.
- `frontend/src/pages/DashboardPage.jsx` — added `resolveInitialView` helper; replaced both lazy initializers; extended path-nav effect for the `'both'` branch; added 2 new `if` blocks to the cross-tab `storage` listener.

**Test-IDs added:** `default-pos-view-table`, `default-pos-view-order`, `default-dashboard-view-channel`, `default-dashboard-view-status`.

**Out of scope (intentional):** No backend changes. No permission gate. No legacy migration. No V3 doc update inline (queued separately in `/app/memory/V3_DOC_UPDATES_PENDING.md`). Sidebar runtime toggles remain in-memory only.

**Backward compat:** Tenants with no new keys in localStorage fall back to factory defaults. Tenants on a hard lock (`'table'/'order'/'channel'/'status'`) are unaffected.

**Note for next deploy:** Existing tenants who currently land on Status View when axis = `'both'` will land on Channel View after this change (factory default changed by owner decision).

**References:**
- Implementation handover: `/app/memory/REQ4_DEFAULT_VIEW_IMPLEMENTATION_HANDOVER.md`
- Locked decisions: `/app/memory/DEFAULT_VIEW_SETTING_DECISIONS_LOCKED.md`
- Deep-dive: `/app/memory/DEFAULT_VIEW_SETTING_DEEPDIVE.md`
- Pending V3 doc entry: `/app/memory/V3_DOC_UPDATES_PENDING.md` (Entry 1)
