# Revision Implementation Summary

> Output document mandated by the QA spec the user issued before this revision.
> Source spec: `/app/memory/TASK_1_REVISION_GAPS.md`.
> Companion logs: `/app/memory/PRD.md` (§"Task 1 v2 — View Mode Lock revision"),
> `/app/memory/FIVE_TASK_VALIDATION_HANDOVER.md` (§"Task 1 v2 — intent revision"),
> `/app/memory/FIVE_TASK_IMPLEMENTATION_SUMMARY.md` (§"Task 1 v2 — intent revision").

## 1. Gap Validated

Original Task 1 deleted the legacy "both views available with runtime Sidebar toggle" default and forced every user (including unconfigured ones) into a single-pick locked view. User clarified that:

> Default = legacy (both Sidebar toggles visible; cashier may switch at runtime).
> Visibility Settings is purely an OPTIONAL admin override that locks a specific axis.

11 gaps were enumerated in the handover (Gap 1–11). Implementation closed Gaps 1, 2, 3, 4, 5, 6, 8, 9, 10, 11. Gap 7 (migration) was deliberately deferred via the "no version-key bump; existing saved locks are treated as deliberate" decision.

## 2. Status

**Implemented.**

All 5 planned steps + 1 bonus step (Display Mode latent bug) are complete. Manual visual gate passed by user after each step.

## 3. Files Changed

| File | Net diff |
|---|---|
| `frontend/src/pages/StatusConfigPage.jsx` | Defaults flipped to `'both'`; hydrate accepts `'both'`; View Mode section rewritten with Pattern A (3 cards × 2 axes); Display Mode section rewritten with same Pattern A. |
| `frontend/src/pages/DashboardPage.jsx` | 2 new lock-flag state hooks; lazy init clarified; path-nav effect extended; cross-tab `storage` listener extended; Sidebar invocation grew by 6 props (4 view + 2 lock). |
| `frontend/src/components/layout/Sidebar.jsx` | 4 lucide icons re-imported; 6 props in destructure (incl. `lockTableOrder = false`, `lockChannelStatus = false` defensive defaults); runtime toggle block restored, conditionally rendered per lock flag. |

Documentation files appended (no overwrites): `/app/memory/PRD.md`, `/app/memory/FIVE_TASK_VALIDATION_HANDOVER.md`, `/app/memory/FIVE_TASK_IMPLEMENTATION_SUMMARY.md`.

## 4. What Changed

### 4.1 Default behaviour restored (Step 1)
Sidebar.jsx now exposes a `view-toggle` and `group-toggle` button (test IDs preserved from the legacy implementation). DashboardPage.jsx passes the 4 view props back to Sidebar. With no admin override, both toggles render exactly like the pre-Task-1 baseline.

### 4.2 "Both" as a first-class value (Steps 2 + 3)
StatusConfigPage.jsx accepts `'both'` as a valid value for both view-mode keys and uses it as the default. The View Mode UI now renders 3 checkbox-style cards per axis: `Table View / Order View / Both (default)` and `By Channel / By Status / Both (default)`. Banner copy rewritten accordingly.

### 4.3 Bug class eliminated (Steps 3 + 3b)
The old radio implementation used `<label>` wrapping a hidden `<input type="radio" className="sr-only">`. Clicking the label focused the hidden input; the browser then ran `scrollIntoView(false)` on the focused element; because `sr-only` clips it to (0,0) of the document, the page scrolled to the top, leaving the rest of the page off-screen. The `position: fixed` "Save Now" toast survived, creating the misleading "blank page" symptom.

Replaced with the page's existing `<div onClick>` checkbox-card pattern (already used by Status / Station / Channel cards). No hidden input → no focus shift → no scroll jump. Same fix applied to Display Mode (Stacked/Accordion) under Station View. Page is now `sr-only`-radio free.

### 4.4 Lock flags + runtime hide (Step 4)
DashboardPage.jsx adds `lockTableOrder` / `lockChannelStatus` state initialized from localStorage. Both flags are recomputed on:
- mount (lazy init)
- navigation back to Dashboard (`location.pathname` effect)
- cross-tab save (`storage` event listener)

When a flag becomes true, DashboardPage also aligns its visible `activeView` / `dashboardView` to the locked value.

Sidebar.jsx conditionally renders each toggle button: hidden when its axis is locked. The wrapping `view-toggles-container` div also hides if every individual toggle would be hidden, preventing an empty bordered div.

### 4.5 Docs updated (Step 5)
PRD, validation handover, and implementation summary all received an appended "Task 1 v2" section (no overwrites). This file (`REVISION_IMPLEMENTATION_SUMMARY.md`) is also new.

## 5. API / Payload / Socket / UI Impact

| Domain | Impact |
|---|---|
| HTTP / REST | None. |
| Socket | None. |
| Payload | None. |
| Outbound contracts (transferToRoom, confirmOrder, etc.) | None. |
| localStorage keys | Same keys (`mygenie_view_mode_table_order`, `mygenie_view_mode_channel_status`). Value domain extended from `'table' \| 'order'` / `'channel' \| 'status'` to include `'both'`. No version bump. |
| UI — Settings | View Mode section: now 3 checkbox cards per axis (was 2 radio cards). Display Mode section: 2 checkbox cards (was 2 radio cards). Banner copy rewritten. |
| UI — Sidebar | Runtime toggle buttons re-appear on Dashboard (legacy default restored). Hidden per axis when admin lock is active. |
| UI — Dashboard | Same render output for any specific (locked) axis value. When unlocked, behaviour matches pre-Task-1 baseline. |
| Tasks 2 / 3 / 4 / 5 | Untouched. |

## 6. Tests Run

| Test | Result |
|---|---|
| ESLint on `StatusConfigPage.jsx` | ✅ Clean |
| ESLint on `DashboardPage.jsx` | ✅ Clean |
| ESLint on `Sidebar.jsx` | ✅ Clean |
| Webpack hot-reload compile | ✅ `webpack compiled with 1 warning` (unchanged pre-existing `LoadingPage.jsx:101` exhaustive-deps; not introduced by this revision) |
| `curl -sI http://localhost:3000` | ✅ `HTTP/1.1 200 OK` after every step |
| Test IDs in compiled bundle | ✅ All 6 `view-mode-*` IDs + `view-toggle` / `group-toggle` / `view-toggles-container` + `display-mode-stacked` / `display-mode-accordion` present |
| `sr-only` count in `StatusConfigPage.jsx` | ✅ 0 (was 4 across two radio sections) |
| Manual visual gate Step 1 | ✅ "A PASS" — both Sidebar toggles visible and click-flip dashboard view |
| Manual visual gate Step 2 | ✅ Implicit (no UI change visible to user; intermediate state intentional) |
| Manual visual gate Step 3 | ✅ "pass" — 3 cards per axis, click works without scroll-jump, save persists |
| Manual visual gate Step 3b (Display Mode) | ✅ "pass" |
| Manual visual gate Step 4 | ✅ "pass proceed to step 5" — full lock-hide matrix verified |

## 7. Risks Remaining

| # | Risk | Status |
|---|---|---|
| R1 | Existing users with a saved lock keep that lock — they may not realise they can revert by clicking "Both" | Accepted (per Gap 7 decision). Soft migration available if field reports surface. |
| R2 | Latent `sr-only` + radio bug class on **other pages** (outside StatusConfigPage) | Not validated. Quick `grep` of `frontend/src/` for similar patterns is a 1-minute follow-up if requested. |
| R3 | Pre-existing `LoadingPage.jsx:101` exhaustive-deps warning | Untouched (out of scope; in known-acceptable list). |
| R4 | Branch tip is still at the auto-commit `f6f0a2d`; on-disk edits from the prior original Task 1 + this revision are uncommitted in the working tree | User action: use the platform "Save to GitHub" or rollback as needed. |

## 8. Retest Notes

### Required retest matrix (post-deploy or whenever code is touched)

| # | Step | Expected |
|---|---|---|
| 1 | Console: `localStorage.removeItem('mygenie_view_mode_table_order'); localStorage.removeItem('mygenie_view_mode_channel_status'); location.reload();` | Dashboard loads with both Sidebar toggles visible; defaults match legacy (`activeView='table'`, `dashboardView='status'`). |
| 2 | Click `data-testid="view-toggle"` | Dashboard view flips Table ↔ Order at runtime. |
| 3 | Click `data-testid="group-toggle"` | Header pills swap; layout regroups Channel ↔ Status. |
| 4 | Settings → View Mode → click "Order View" card → Save → return to Dashboard | `view-toggle` hidden; `group-toggle` still visible; dashboard renders Order View. |
| 5 | Settings → View Mode → click "By Channel" on the other axis → Save | `group-toggle` also hidden; dashboard renders Order + By Channel. Wrapper container hidden. |
| 6 | Settings → click "Both (default)" on Table/Order axis → Save | `view-toggle` reappears; `group-toggle` still hidden. |
| 7 | Settings → click "Reset to Default" → Save | Both toggles reappear; both axes back to `'both'`. |
| 8 | Cross-tab: open Dashboard in tab A; in tab B open Settings, lock Order View, Save | Tab A's `view-toggle` hides without reload; dashboard switches to Order View. |
| 9 | Settings → Station View → click Stacked / Accordion cards | No scroll jump; selection persists; "Save Now" toast appears. |
| 10 | Tasks 2 / 3 / 4 / 5 spot-check | No regression: Collect Bill → To Room still works; takeaway label "Takeaway"; tab title "MyGenie POS"; cancel-gap Option C still applies on room orders with placed items. |

### Suggested automation
A `testing_agent_v3` run scoped to the matrix above + the original 5-task regressions would close out the QA loop. The user has previously chosen to skip automated testing; flag it again if production push is imminent.

### Rollback
```bash
cp /tmp/task1_revision_backups/StatusConfigPage.jsx.bak /app/frontend/src/pages/StatusConfigPage.jsx && \
cp /tmp/task1_revision_backups/DashboardPage.jsx.bak    /app/frontend/src/pages/DashboardPage.jsx && \
cp /tmp/task1_revision_backups/Sidebar.jsx.bak          /app/frontend/src/components/layout/Sidebar.jsx
```
Hot reload picks up the rollback automatically. Backups retained until the user explicitly clears them (no auto-cleanup).

---

End of summary.
