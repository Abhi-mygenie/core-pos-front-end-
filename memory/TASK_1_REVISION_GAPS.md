# Task 1 — Revision Handover: Restore "Both" Default + Admin Override

> **Audience:** next implementation agent.
> **Status:** READ-ONLY GAP ANALYSIS. No code changes performed in this session. The next agent must implement the fixes described in §6.
> **Branch:** `roomv2` (commit `f6f0a2d` at session end; on-disk changes from the prior Task-1 implementation are still uncommitted — see `/app/memory/PRD.md` §6).
> **Scope:** Task 1 ONLY (View Mode lock). Tasks 2, 3, 4, 5 are unaffected by this revision.

---

## 1. Why this document exists

The original Task 1 implementation (captured in `FIVE_TASK_IMPLEMENTATION_SUMMARY.md` §5.2 and `FIVE_TASK_VALIDATION_HANDOVER.md` §2.1) interpreted the requirement as:

> "Drop the 'Both' option; user picks exactly one mode per axis; remove the runtime sidebar toggle entirely."

User has since clarified the actual intent:

> **"Both was the default behaviour and was supposed to be preserved. Admin can override in Visibility Settings."**

In other words, the **legacy runtime toggle in the sidebar must remain the default**. The Visibility Settings screen is purely an **override** that lets an admin lock a specific axis when they want to. If the admin doesn't override, the cashier keeps the toggle exactly as before.

The current code does the opposite: it removed the sidebar toggle entirely and forces a frozen single-value choice on every user (including users who never visited the settings screen). This is a behavioural regression that must be fixed.

---

## 2. Source documents already on disk

Read these before starting (in order):

| File | Why |
|---|---|
| `/app/memory/FIVE_TASK_VALIDATION_HANDOVER.md` §2.1 | Original (now-obsolete) Task 1 spec — keep for context only |
| `/app/memory/FIVE_TASK_IMPLEMENTATION_SUMMARY.md` §5.2 | What was actually built (the regression) |
| `/app/memory/PRD.md` §5.2 | PRD entry that also reflects the wrong intent (must be updated, see §8 of this doc) |
| `/app/v3/ARCHITECTURE_DECISIONS_FINAL.md` | Confirm no AD-* decision constrains this revision (none found in the prior validation pass) |

After your implementation, **append** a "Task 1 v2 — intent revision" section to the first three docs. **Do not rewrite history.**

---

## 3. Revised intent (single source of truth)

| Behaviour | Before Task 1 (legacy) | After original Task 1 (current bug) | After this revision (target) |
|---|---|---|---|
| Sidebar `Table View ↔ Order View` toggle | Always visible, runtime switch | Removed entirely | **Visible by default**; hidden only if admin locks this axis |
| Sidebar `By Channel ↔ By Status` toggle | Always visible, runtime switch | Removed entirely | **Visible by default**; hidden only if admin locks this axis |
| Visibility Settings → "View Mode" radios | (didn't exist) | 2 forced choices per axis | **3 choices per axis: Table / Order / Both** and **Channel / Status / Both** |
| Default for fresh users (no localStorage) | Both toggles visible | Locked to `table` + `status` (regression) | **Both toggles visible** (= legacy) |
| What "Both" means | n/a | n/a | **No lock; cashier sees the runtime toggle for that axis and may switch freely** |

User has confirmed **Gap 1 Option (a)** — i.e., a third radio card per axis labelled "Both", not a master override toggle. See §6.1.

---

## 4. Files to touch / not to touch

### Will change

| File | Section | Purpose |
|---|---|---|
| `frontend/src/pages/StatusConfigPage.jsx` | constants (27-28), state (114-116), hydrate effect (176-184), saveConfiguration (324-338), resetToDefault (220-230), View Mode JSX section (751-916) | Add `'both'` as a valid value; default to `'both'`; render a 3rd radio card per axis; rewrite copy |
| `frontend/src/pages/DashboardPage.jsx` | view state lazy init (264-280), storage event listener (238-259), Sidebar invocation (1116-1124) | Derive `lockTableOrder` / `lockChannelStatus`; pass view setters + lock flags down to Sidebar |
| `frontend/src/components/layout/Sidebar.jsx` | imports (1-12), props destructure (111-119), where the deleted block lived (after line 277, currently lines 279-280) | Restore the runtime toggle block, conditionally rendered per lock flag; re-import 4 lucide icons; re-add 4 view props + 2 new lock props |

### Read-only verification (no edits expected)

| File | Verify |
|---|---|
| `frontend/src/components/layout/Header.jsx` | Confirm Header is a controlled consumer of `activeView` / `setActiveView` / `dashboardView` / `setDashboardView` and does not render its own duplicate toggle. No code change anticipated. |

### Do NOT touch

- `frontend/src/contexts/TableContext.jsx`
- Any file involved in Task 2 / 3 / 4 / 5
- Any backend file
- `frontend/src/constants/colors.js`
- The five existing localStorage keys (`mygenie_enabled_statuses`, `mygenie_station_view_config`, `mygenie_channel_visibility`, `mygenie_layout_table_view`, `mygenie_layout_order_view`)

---

## 5. Gap-by-gap detail

Severity legend: **High** = blocks correct UX; **Medium** = correctness/consistency; **Low** = polish/test infra.

### Gap 1 — No "Both" option per axis  *(High)*

**Where:** `StatusConfigPage.jsx` 751-916 (the new "View Mode" section).

**Evidence:** Each axis renders only 2 radio cards:
- Lines 779-841 — `view-mode-to-table` / `view-mode-to-order`
- Lines 851-913 — `view-mode-cs-channel` / `view-mode-cs-status`

There is no third option representing "no override / let the cashier choose".

**Fix (Option a — confirmed by user):** Add a 3rd radio card per axis valued `'both'`. Reuse the existing radio-card visual pattern (style props at e.g. lines 781-808). Add new test IDs `view-mode-to-both` and `view-mode-cs-both`.

The localStorage value domain extends from `'table' | 'order'` → `'table' | 'order' | 'both'`, and from `'channel' | 'status'` → `'channel' | 'status' | 'both'`.

`'both'` is the **default** for fresh users.

---

### Gap 2 — Defaults silently lock new users  *(High)*

**Where:** `StatusConfigPage.jsx` 27-28 and `DashboardPage.jsx` 264-280.

**Evidence:**
```js
// StatusConfigPage.jsx
const DEFAULT_VIEW_MODE_TO = 'table';
const DEFAULT_VIEW_MODE_CS = 'status';

// DashboardPage.jsx 264-280 — fallback to 'table' / 'status' when nothing in localStorage
```

A fresh tenant who never visits Visibility Settings ends up with `activeView='table'` + `dashboardView='status'` AND no Sidebar toggle (Gap 3) → effectively locked.

**Fix:** Defaults must be `'both'`. Implementation:
```js
// StatusConfigPage.jsx
const DEFAULT_VIEW_MODE_TO = 'both';
const DEFAULT_VIEW_MODE_CS = 'both';
```
DashboardPage's lazy initializers must:
1. Pick a runtime `activeView` for the dashboard to show **right now** — when storage is `'both'` or missing, pick `'table'` (matches today's legacy default tab). Same for the other axis: `'status'` when unlocked.
2. Expose two derived flags `lockTableOrder` and `lockChannelStatus` that are `true` **only** when storage is exactly `'table'` or `'order'` (resp. `'channel'` or `'status'`).

```js
// DashboardPage.jsx — illustrative shape, not a literal patch
const storedTO = (() => { try { return localStorage.getItem('mygenie_view_mode_table_order'); } catch { return null; } })();
const storedCS = (() => { try { return localStorage.getItem('mygenie_view_mode_channel_status'); } catch { return null; } })();
const lockTableOrder    = storedTO === 'table' || storedTO === 'order';
const lockChannelStatus = storedCS === 'channel' || storedCS === 'status';
const [activeView, setActiveView]       = useState(lockTableOrder    ? storedTO : 'table');
const [dashboardView, setDashboardView] = useState(lockChannelStatus ? storedCS : 'status');
```

Also update the existing `location.pathname` effect (215-235) and the cross-tab `storage` event listener (238-259) to recompute the lock flags when the user navigates back from the settings page or saves in another tab.

---

### Gap 3 — Sidebar runtime toggle block deleted  *(High)*

**Where:** `Sidebar.jsx` line 279-280 (just a comment now). The original block (formerly at lines 285-337) including `data-testid="view-toggle"` and `data-testid="group-toggle"` is gone. The 4 lucide icons (`LayoutGrid, List, Columns, Rows`) were also pruned from the import at lines 1-7.

**Fix:** Restore the deleted block, but render each axis's toggle conditionally:

```jsx
{/* Sidebar.jsx — illustrative shape */}
{!lockTableOrder && (
  <button
    data-testid="view-toggle"
    onClick={() => setActiveView(activeView === 'table' ? 'order' : 'table')}
    ...
  >
    {activeView === 'table' ? <LayoutGrid /> : <List />}
    ...
  </button>
)}
{!lockChannelStatus && (
  <button
    data-testid="group-toggle"
    onClick={() => setDashboardView(dashboardView === 'channel' ? 'status' : 'channel')}
    ...
  >
    {dashboardView === 'channel' ? <Columns /> : <Rows />}
    ...
  </button>
)}
```

Reuse whatever the original block looked like — the pre-deletion version is recoverable via `git log`/`git diff` on `roomv2` if needed; the deleted code spanned lines 285-337 of the prior `Sidebar.jsx`.

Re-add the 4 lucide imports.

---

### Gap 4 — DashboardPage has no "axis locked vs unlocked" state  *(High)*

**Where:** `DashboardPage.jsx` 264-280.

**Fix:** See Gap 2 — derive `lockTableOrder` and `lockChannelStatus` alongside the two state variables. These are pure functions of the localStorage value and must be recomputed whenever the storage value changes (see §6.4 and the existing 215-259 effects).

---

### Gap 5 — DashboardPage no longer passes view setters to Sidebar  *(High)*

**Where:** `DashboardPage.jsx` 1116-1124 (the `<Sidebar … />` invocation).

**Fix:** Re-add the 4 view props and the 2 new lock flags to the Sidebar invocation:

```jsx
<Sidebar
  isExpanded={sidebarExpanded}
  setIsExpanded={setSidebarExpanded}
  onOpenSettings={() => setIsSettingsOpen(true)}
  onOpenMenu={() => setIsMenuOpen(true)}
  onRefresh={handleRefreshAll}
  isRefreshing={isRefreshing}
  isOrderEntryOpen={orderEntryType !== null}
  /* RESTORED for Task 1 v2 */
  activeView={activeView}
  setActiveView={setActiveView}
  dashboardView={dashboardView}
  setDashboardView={setDashboardView}
  lockTableOrder={lockTableOrder}
  lockChannelStatus={lockChannelStatus}
/>
```

---

### Gap 6 — Sidebar prop signature + icon imports  *(High)*

**Where:** `Sidebar.jsx` lines 1-12 (imports), 111-119 (destructure).

**Fix:** Mirror Gap 3 / Gap 5 — re-add `activeView, setActiveView, dashboardView, setDashboardView` plus the new `lockTableOrder, lockChannelStatus` to the destructure. Re-import the 4 icons.

---

### Gap 7 — Migration for users who already saved a locked value  *(Medium)*

**Why this matters:** Anyone who already used the broken Visibility Settings screen has `'table'` or `'order'` (and `'channel'` or `'status'`) saved in localStorage. Under the revised semantics those values are now interpreted as "admin chose to lock", which they never knowingly did.

**Approach (no version-key bump):** Treat existing values as deliberate locks (because we cannot distinguish accidental from intentional saves). The new "Both" radio gives those users an explicit, discoverable path to revert. Combined with:
- `Reset to Default` button on the settings page now clears the lock by writing `'both'` to both keys,
- A short banner on the View Mode section explaining the new "Both" semantics (see §6.1 copy),
…this is acceptable for a low-volume preprod tenant base.

If post-deploy QA reveals confused users in the field, fall back to a one-time migration: detect any saved `'table' / 'order' / 'channel' / 'status'` value, write `'both'` over it, log a console info. **Hold off on this until needed.**

---

### Gap 8 — UI copy hard-codes "no runtime toggle"  *(Medium)*

**Where:** `StatusConfigPage.jsx` 758-770.

**Current copy:**
> "Lock the dashboard to one view per axis. No runtime toggle."
> "Pick exactly one option per axis. The dashboard renders that view directly — there is no toggle button."

**Replace with (suggested):**
> Section subtitle: "Override the default view mode (optional)."
> Section banner: "By default, cashiers see both view toggles in the sidebar and can switch on the fly. Pick a specific view here only if you want to lock the dashboard to that view for this device. Choose **Both** to keep the default."

Adjust phrasing to fit existing tone (see the "Channel Visibility" override banner at lines 695-703 for reference).

---

### Gap 9 — Test IDs  *(Low)*

Required test IDs after the fix:

| Element | Test ID | Comes from |
|---|---|---|
| Sidebar Table/Order toggle | `view-toggle` | Restored in `Sidebar.jsx` (Gap 3) |
| Sidebar Channel/Status toggle | `group-toggle` | Restored in `Sidebar.jsx` (Gap 3) |
| Settings: Table radio | `view-mode-to-table` | Already exists |
| Settings: Order radio | `view-mode-to-order` | Already exists |
| Settings: **Both** radio (Table/Order) | `view-mode-to-both` | **NEW** (Gap 1) |
| Settings: Channel radio | `view-mode-cs-channel` | Already exists |
| Settings: Status radio | `view-mode-cs-status` | Already exists |
| Settings: **Both** radio (Channel/Status) | `view-mode-cs-both` | **NEW** (Gap 1) |

---

### Gap 10 — Source-of-truth docs reflect the wrong intent  *(Medium)*

**Where:**
- `/app/memory/PRD.md` §5.2 lines 107-114
- `/app/memory/FIVE_TASK_VALIDATION_HANDOVER.md` §1, §2.1, §6, §7
- `/app/memory/FIVE_TASK_IMPLEMENTATION_SUMMARY.md` §Task 1

**Fix:** After implementation passes QA, **append** (do not overwrite) a section titled "**Task 1 v2 — intent revision**" to each of those three files containing:

1. Pointer to this file (`/app/memory/TASK_1_REVISION_GAPS.md`).
2. One-paragraph summary of the revised intent (§3 of this doc).
3. The migration strategy chosen (Gap 7 above).
4. Updated QA checklist (§7 of this doc).

---

### Gap 11 — Header logic (verify only)  *(Low)*

**Where:** `DashboardPage.jsx` 1149-1173 passes `activeView` / `setActiveView` / `dashboardView` / `setDashboardView` into `Header`. Header presumably swaps filter pills based on `dashboardView`.

**Action:** Open `frontend/src/components/layout/Header.jsx` once. Confirm:
- Header does NOT render its own `view-toggle` / `group-toggle` (it shouldn't — the original block lived in Sidebar only).
- Header is a controlled consumer of the 4 props and is unaffected by lock state.

If both are true → no Header change required. Otherwise raise as a follow-up.

---

## 6. Implementation plan (do these in order, one commit per step)

### 6.1 — StatusConfigPage: extend value domain to include `'both'` and render the 3rd radio per axis

1. Change defaults at lines 27-28:
   ```js
   const DEFAULT_VIEW_MODE_TO = 'both';
   const DEFAULT_VIEW_MODE_CS = 'both';
   ```
2. Update the hydrate effect at lines 176-184 to accept `'both'` as a valid stored value:
   ```js
   if (storedTO === 'table' || storedTO === 'order' || storedTO === 'both') setViewModeTableOrder(storedTO);
   if (storedCS === 'channel' || storedCS === 'status' || storedCS === 'both') setViewModeChannelStatus(storedCS);
   ```
3. Inside the View Mode section JSX (lines 773-915), insert a 3rd radio card per axis after the existing two. Reuse the same wrapping `<label>` pattern. Test IDs: `view-mode-to-both`, `view-mode-cs-both`. Inner copy:
   - Title: **Both**
   - Subtitle: "Default — cashier can switch views from the sidebar."
4. Rewrite the section subtitle (line 759) and banner (lines 768-770) per Gap 8.
5. Verify `saveConfiguration` (line 324) writes the new value as-is — no change needed because it already calls `localStorage.setItem(VIEW_MODE_TABLE_ORDER_KEY, viewModeTableOrder)` (line 331-332).
6. Verify `resetToDefault` (line 220) now resets to `'both'` for both axes (it will automatically because the `DEFAULT_*` constants changed in step 1).

ESLint clean before commit.

### 6.2 — DashboardPage: derive lock flags + pass them down

1. Replace the lazy initializers at lines 264-280 with the pattern shown in Gap 2.
2. Update the cross-navigation effect (lines 215-235) to also re-read both view-mode keys and recompute the lock flags. Use `useState` setters or convert `lockTableOrder`/`lockChannelStatus` to `useState` so they re-render the Sidebar.
3. Update the cross-tab `storage` event listener (lines 238-259) similarly: when key is `mygenie_view_mode_table_order` or `mygenie_view_mode_channel_status`, re-derive the lock flag and call `setActiveView`/`setDashboardView` if newly locked to a specific value.
4. Update the `<Sidebar … />` invocation at lines 1116-1124 per Gap 5.

ESLint clean before commit.

### 6.3 — Sidebar: restore conditional toggle block

1. Re-import the 4 icons (Gap 6).
2. Re-add the 4 view props + 2 lock props to the destructure (Gap 6).
3. Restore the toggle block at the location of the current `// View toggles removed` comment (Sidebar.jsx 279-280). Render each axis's toggle conditionally on its lock flag (Gap 3 sample). Preserve `data-testid="view-toggle"` and `data-testid="group-toggle"`.
4. Match the original visual style — recover from git history (`git log -p frontend/src/components/layout/Sidebar.jsx`) since the deletion was within this branch's working tree.

ESLint clean before commit.

### 6.4 — Smoke test locally

(See §7.)

### 6.5 — Append revision sections to docs (Gap 10)

PRD + the two FIVE_TASK_*.md files. Append, don't overwrite.

### 6.6 — Run testing agent (or document manual QA evidence)

Per the user's previous QA spec, full automated regression is opt-in. At minimum, screenshot+console QA per the existing plan in `/app/memory/PRD.md` §10 plus the new tests in §7 of this doc.

---

## 7. QA checklist for the revision

### Default behaviour (unconfigured user)

- [ ] Clear localStorage entirely (`localStorage.clear(); location.reload()`).
- [ ] Dashboard opens in **Table View / By Status** (matches today's legacy initial tab).
- [ ] Sidebar shows **both** `data-testid="view-toggle"` and `data-testid="group-toggle"` buttons.
- [ ] Clicking each toggle flips the dashboard view at runtime (no reload required).

### Settings — "Both" radios visible

- [ ] Open Visibility / Status Configuration → "View Mode" section shows **3** radios per axis.
- [ ] DOM check: `document.querySelectorAll('[data-testid^="view-mode-"]').length === 6`.
- [ ] When loaded fresh, both axes have **Both** selected by default.

### Override flow — Table/Order axis

- [ ] Pick **Order View** → Save → reload Dashboard.
- [ ] `localStorage.getItem('mygenie_view_mode_table_order')` === `'order'`.
- [ ] Sidebar **does NOT** render `data-testid="view-toggle"` (axis is locked).
- [ ] Sidebar **still** renders `data-testid="group-toggle"` (other axis still default).
- [ ] Dashboard renders Order View.

### Override flow — Channel/Status axis

- [ ] Pick **By Channel** → Save → reload.
- [ ] `localStorage.getItem('mygenie_view_mode_channel_status')` === `'channel'`.
- [ ] Sidebar **does NOT** render `data-testid="group-toggle"`.
- [ ] Sidebar still renders `data-testid="view-toggle"` (Table/Order is back to Both because we only locked one axis).
- [ ] Header filter pills swap to Status pills (existing behaviour).

### Both axes locked

- [ ] Lock Order + By Channel → Save → reload.
- [ ] Sidebar renders **neither** toggle.
- [ ] Dashboard renders Order View / By Channel directly.

### Revert via "Both"

- [ ] In Settings, change locked axis back to **Both** → Save → reload.
- [ ] Sidebar's removed toggle reappears.
- [ ] Cashier can switch views again.

### Reset to Default

- [ ] Lock both axes → Save → click **Reset to Default**.
- [ ] Both keys revert to `'both'` (verify via `localStorage.getItem(...)`).
- [ ] After save+reload, Sidebar shows both toggles.

### Cross-tab sync (existing behaviour, must still work)

- [ ] Open dashboard in tab A. Open settings in tab B → save a new lock → tab A's Sidebar reflects the lock without a reload (storage event handler at DashboardPage.jsx 238-259).

### Regression sanity

- [ ] Header filter pill swap still works in all 4 (axisA × axisB) combinations.
- [ ] Status filter pills still respect `enabledStatuses`.
- [ ] No new console errors.
- [ ] ESLint clean on all 3 changed files.
- [ ] `webpack compiled with 1 warning` (the pre-existing `LoadingPage.jsx:101` exhaustive-deps; unrelated to this change).
- [ ] Tasks 2, 3, 4, 5 unaffected (spot-check one card per: Room transfer picker still fetches fresh; takeaway label still reads "Takeaway"; room card amount still includes balance + transfers; tab title still "MyGenie POS").

---

## 8. Out of scope

- Per-role override (manager sees toggle, cashier doesn't) — already P3 in PRD §9; keep deferred.
- Split-screen / dual-pane "both visible at once" — explicitly rejected by the revised intent (the cashier still picks one view at a time; "Both" means "cashier can switch").
- Migration via version-key bump — not needed (see Gap 7).
- Header refactor — verification only (Gap 11).

---

## 9. Acceptance gate

This revision is **DONE** when:

1. All §7 QA checklist items pass.
2. ESLint clean across the 3 changed files.
3. Webpack compiles with the existing 1 warning (no new warnings introduced).
4. Source-of-truth docs (Gap 10) have appended revision sections.
5. A short summary entry is added to `/app/memory/PRD.md` under "What's Been Implemented" with a date stamp:

```
### Task 1 v2 — View Mode Lock revision (yyyy-mm-dd)
- StatusConfigPage: added 'Both' radio per axis (default).
- DashboardPage: derives lockTableOrder / lockChannelStatus from storage; passes to Sidebar.
- Sidebar: runtime toggles restored, conditionally hidden per lock flag.
- Default behaviour for unconfigured users now matches legacy (both toggles visible).
- See /app/memory/TASK_1_REVISION_GAPS.md for full spec.
```

---

## 10. Quick reference — files & line ranges

| File | Lines (current) | What needs to change |
|---|---|---|
| `frontend/src/pages/StatusConfigPage.jsx` | 27-28 | Defaults → `'both'` |
| `frontend/src/pages/StatusConfigPage.jsx` | 176-184 | Accept `'both'` as valid stored value |
| `frontend/src/pages/StatusConfigPage.jsx` | 758-770 | Rewrite section copy |
| `frontend/src/pages/StatusConfigPage.jsx` | 773-842 | Insert 3rd radio for Table/Order axis (`view-mode-to-both`) |
| `frontend/src/pages/StatusConfigPage.jsx` | 845-915 | Insert 3rd radio for Channel/Status axis (`view-mode-cs-both`) |
| `frontend/src/pages/DashboardPage.jsx` | 215-259 | Recompute lock flags on nav + storage event |
| `frontend/src/pages/DashboardPage.jsx` | 264-280 | New lazy init pattern (see Gap 2 sample) |
| `frontend/src/pages/DashboardPage.jsx` | 1116-1124 | Pass 6 props to Sidebar (4 view + 2 lock) |
| `frontend/src/components/layout/Sidebar.jsx` | 1-12 | Re-import 4 icons |
| `frontend/src/components/layout/Sidebar.jsx` | 111-119 | Re-add 6 props to destructure |
| `frontend/src/components/layout/Sidebar.jsx` | 279-280 | Replace comment with restored conditional toggle block |
| `frontend/src/components/layout/Header.jsx` | (read-only verify) | No change anticipated (Gap 11) |

---

End of handover.
