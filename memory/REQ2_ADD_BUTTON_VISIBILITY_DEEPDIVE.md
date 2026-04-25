# Req 2 — Add Button Visibility — Deep-Dive Analysis

- **Type:** Read-only deep-dive + plan + gap analysis. NO code changes.
- **Source of truth:** `roomv2` branch under `/app/frontend/src`.
- **Status:** STOP — Owner approval needed on Section §10 questions before drafting the implementation handover.
- **Companion docs:** `/app/memory/THREE_REQUIREMENTS_V3_VALIDATION_GAPS.md` §2 (earlier validation pass).

---

## 0. Executive Summary

| Item | Today | After this requirement |
|---|---|---|
| Top-right Add button (`Add` button used to start new orders) | Rendered unconditionally in `Header.jsx:592-600` | Gated behind a new admin Visibility Setting |
| Where admin controls existing visibility settings | `StatusConfigPage.jsx` ("Visibility Settings" route) — already supports Status, Station View, Channel, Layout, View Mode | Adds one more toggle: "Add Button" |
| LocalStorage shape today | One key per setting (`mygenie_*`) | Adds 1 new key `mygenie_add_button_visibility` |
| Default | Visible | Visible (preserves current behavior) |
| Scope of impact | Pure UI gating; no API / socket / payload / backend touched | Same |
| Risk | LOW once authority + granularity decisions are locked | LOW |

**Net effect:** smallest of the four requirements. ~30-line addition once the design questions in §10 are answered.

---

## 1. Where The Add Button Lives Today

**File:** `frontend/src/components/layout/Header.jsx:589-600`

```jsx
{/* Right Section - Add Button + Online Status */}
<div className="flex items-center gap-3">
  {/* Add Order Button */}
  <button
    data-testid="add-table-btn"
    className="flex items-center gap-1.5 px-3 py-2.5 rounded-lg transition-colors hover:opacity-80"
    style={{ backgroundColor: COLORS.primaryOrange, color: "white" }}
    onClick={onAddOrder}
  >
    <PlusSquare className="w-4 h-4" />
    <span className="text-sm font-medium">Add</span>
  </button>
  ...
</div>
```

**Caller:**
- `DashboardPage.jsx:1175` mounts the Header and passes `onAddOrder={handleAddOrder}`.
- `DashboardPage.jsx:1053` — `handleAddOrder` opens the `OrderEntry` panel for a new order.

**Behavior:** clicking opens a modal (or panel) where the user picks the order type (Dine-In, Takeaway, Delivery, Room) and a target table/customer. There is no permission check, no role gate, no feature flag — it always renders.

---

## 2. Existing Visibility-Settings Patterns To Reuse

The codebase already has 6 distinct visibility-settings patterns, all centralized in `StatusConfigPage.jsx`. Each follows a stereotyped flow: a localStorage key + UI toggle + admin save + cross-tab `storage` event subscription.

| Pattern | LocalStorage key | UI in StatusConfigPage |
|---|---|---|
| Status filter | `mygenie_enabled_statuses` | Per-status enable toggles |
| Station View | `mygenie_station_view_config` | Master enable + per-station list + display mode |
| Channel filter | `mygenie_channel_visibility` | Per-channel enable toggles |
| Layout — Table | `mygenie_layout_table_view` | Per-channel column counts |
| Layout — Order | `mygenie_layout_order_view` | Per-channel column counts |
| View Mode lock (Task 1) | `mygenie_view_mode_table_order`, `mygenie_view_mode_channel_status` | 3-card pickers per axis |
| Default View (Req 4 — just shipped) | `mygenie_default_pos_view`, `mygenie_default_dashboard_view` | Inline sub-pickers |

**Cross-tab sync mechanism:** all consumers (Header, Sidebar, DashboardPage) subscribe to `window.storage` events for the relevant keys. Header already does this for `mygenie_channel_visibility` and `mygenie_enabled_statuses` — so adding one more listener is trivial.

---

## 3. Files That Will Need Changes (Estimated)

| # | File | Change | Estimated lines |
|---|---|---|---|
| 1 | `frontend/src/pages/StatusConfigPage.jsx` | Add 1 const + 1 state + hydrate + persist + extend resetToDefault + render 1 toggle | +30-40 |
| 2 | `frontend/src/components/layout/Header.jsx` | Read localStorage key on mount + subscribe to storage event + conditional render | +15 |
| 3 | (Optional) `frontend/src/pages/DashboardPage.jsx` | Pass a flag prop down OR rely on Header reading localStorage directly | 0-5 |

**Files I will NOT touch:** OrderEntry.jsx, contexts, services, transforms, backend, V3 docs (queued separately).

**Total surface:** ~45-60 lines.

---

## 4. Decision Surface — What Must Be Locked Before Coding

### 4.1 Authority model
The two existing patterns split into:
- **Cashier-toggleable** (Status filter chips, Channel chips, View Mode runtime toggle) — user flips live.
- **Admin-locked** (Station View enable, View Mode lock, Layout column counts, Default View picker) — set once in Settings; cashier cannot toggle live.

Add Button visibility could be either. **Authority choice drives storage shape and UI placement.**

### 4.2 Granularity
- **Global:** one master toggle. Hides Add button entirely when disabled. Simplest.
- **Per-channel:** 4 toggles (dineIn, takeAway, delivery, room). Compounds with existing channel-visibility (which already filters channels by tenant features).
- **Per-order-type / Per-role:** more complex; rarely needed for this kind of toggle.

### 4.3 Default value
- Default visible (preserves current behavior, factory default).
- Default hidden (forces admin to opt-in).

### 4.4 Permission interaction
- Today no permission check exists on the button.
- Should the new visibility flag be **standalone** or **AND-gated** with an existing permission?

### 4.5 Storage key + shape
- Single localStorage key (recommended, mirrors existing patterns).
- Shape depends on Granularity (Q-2): boolean for global, object for per-channel.

---

## 5. Gaps Found

### GAP-2A — Authority not specified by owner yet
Q-2A in §10 — admin-locked vs cashier-toggleable vs hybrid. Drives whether the Sidebar gets a quick toggle (cashier flip) or only Settings page has the control.

### GAP-2B — Granularity not specified
Q-2B — global vs per-channel. Per-channel adds 4× UI rows + storage-shape complexity for marginal product value.

### GAP-2C — Settings save → live update for Header
- Same latent issue we hit on Req 4: `StatusConfigPage.saveConfiguration` writes localStorage; same-tab `storage` events do NOT fire.
- Need to confirm Header subscribes properly (it already does for other keys — can extend with one more `if`).

### GAP-2D — Default-when-hidden UX
- If admin hides the Add button, are there alternate paths to start a new order?
  - Empty-table-card click in TableSection → opens OrderEntry. Yes, this still works.
  - Sidebar "Add" entry? None today.
- So hiding the Add button is NOT equivalent to "disabling new-order creation" — cashier can still create from table cards. **Flag for owner: confirm this is acceptable, or also gate the table-card empty-state click.**

### GAP-2E — Test ID exists today: `add-table-btn`
- The button already has `data-testid="add-table-btn"`. If we add a wrapper `<>...{visible && <button .../>}</>`, the testid disappears when hidden. We may need a wrapper testid for the container so tests can still locate "the area where the Add button SHOULD be".

### GAP-2F — Multi-device (separate physical terminals)
- Each terminal has its own localStorage. Admin enabling/disabling on Terminal A does NOT propagate to Terminal B. Same constraint as all other visibility settings — flag for explicit owner ack.

### GAP-2G — Visibility-Settings sidebar nav already exists
- `Sidebar.jsx:74-80` already has a `visibility-settings` group with one child (`status-config`). Adding a new toggle inside `StatusConfigPage` requires NO sidebar nav change — purely additive.

---

## 6. Proposed Plan (Pending §10 Answers)

### 6.1 Recommended baseline (all defaults)
- **Authority:** admin-only (Q-2A = a). Mirrors View Mode lock UX. No live cashier toggle.
- **Granularity:** global (Q-2B = a). One master switch. Simplest.
- **Default:** visible (Q-2C = a). Preserves current behavior.
- **Permission:** no extra gate (Q-2H = a). Just visibility.
- **Storage key:** `mygenie_add_button_visibility = { enabled: true | false }`. JSON object so we can extend later if granularity changes.
- **UI placement:** new row at top of `StatusConfigPage` "Visibility Settings" card (Q-2F), or new "UI Elements" section. Recommended: a NEW concise card section titled "UI Elements" so future toggles (e.g., hiding other Header buttons) can be added without re-architecting.
- **Cross-tab sync:** Header.jsx subscribes to `storage` event for the new key. Same pattern already used for `mygenie_channel_visibility`.
- **Test-IDs:** `add-button-visibility-toggle`, `add-button-container` (wrapper around the button so tests can locate the area even when hidden).

### 6.2 Pseudocode
**StatusConfigPage:**
```js
const ADD_BUTTON_VISIBILITY_KEY = 'mygenie_add_button_visibility';
const [addButtonVisible, setAddButtonVisible] = useState(true);

// hydrate
const stored = localStorage.getItem(ADD_BUTTON_VISIBILITY_KEY);
if (stored !== null) {
  try { setAddButtonVisible(JSON.parse(stored).enabled !== false); } catch {}
}

// persist
localStorage.setItem(ADD_BUTTON_VISIBILITY_KEY, JSON.stringify({ enabled: addButtonVisible }));

// reset
setAddButtonVisible(true);

// render: a single toggle row similar to Channel Visibility master toggle
```

**Header:**
```js
const [addButtonVisible, setAddButtonVisible] = useState(() => {
  try {
    const stored = localStorage.getItem('mygenie_add_button_visibility');
    if (stored) return JSON.parse(stored).enabled !== false;
  } catch {}
  return true;  // factory default
});

// storage listener
if (e.key === 'mygenie_add_button_visibility') {
  try { setAddButtonVisible(JSON.parse(e.newValue).enabled !== false); }
  catch { setAddButtonVisible(true); }
}

// render
{addButtonVisible && (
  <button data-testid="add-table-btn" ...>Add</button>
)}
```

### 6.3 Test cases (draft)
| # | Setup | Expected |
|---|---|---|
| T-1 | Default (no key) | Add button visible (factory) |
| T-2 | Admin sets visibility = false → Save → reload Dashboard | Add button NOT in DOM |
| T-3 | Admin sets visibility = false in tab A; tab B is on dashboard | Tab B's Add button hides via storage event |
| T-4 | Admin sets visibility = false → user clicks empty table card | OrderEntry still opens (alternate path) |
| T-5 | Reset to Default in StatusConfigPage | Visibility resets to true |
| T-6 | First visit to StatusConfigPage with no key — backfill (Req 4 pattern) | localStorage backfilled with `{enabled:true}` |
| T-7 | Visibility toggle disabled state preserved across reloads | After reload, button stays hidden |

---

## 7. Risk / Impact

- **LOW.** Pure additive UI gating.
- **NIL** for billing / socket / print / payment paths.
- One pitfall: forgetting cross-tab subscription = users on terminal A don't see the change when admin saves in terminal B until reload. Already handled in pattern.
- Secondary: if Q-2D = a (also hide alternate paths), the "empty table click" path needs gating too — adds 2-3 more touchpoints in `TableCard` / `DineInCard` / `DeliveryCard`. Owner needs to confirm.

---

## 8. V3 Documentation Implication

Post-approval, append to `/app/memory/V3_DOC_UPDATES_PENDING.md`:
- New AD: `AD-Visibility-Add-Button` (storage shape, cross-tab semantics, default factory = visible).
- No risk-register changes required.

---

## 9. Out Of Scope (Don't Do)

- Backend changes.
- New permission keys.
- Migrating the Add button to a permission-driven system (P3 backlog item per PRD).
- Adding a new sidebar nav entry — existing `visibility-settings` group is reused.

---

## 10. Questions That Need Owner Approval (Answer Each)

### Q-2A — Authority model
- **(a)** Admin-locked single value (Settings only; cashier cannot toggle live). **RECOMMENDED.**
- **(b)** Cashier-toggleable (chip in Header or Sidebar; any logged-in user can flip).
- **(c)** Hybrid (admin locks `visible | hidden | cashier-toggle`; cashier-toggle exposes a chip).
- **(d)** Permission-backed (gate on existing permission key like `pos.add` or `order.create`).

> Your call: ___

### Q-2B — Granularity
- **(a)** Global — one master switch for the whole Add button. **RECOMMENDED.**
- **(b)** Per-channel — 4 separate switches (dineIn, takeAway, delivery, room).
- **(c)** Per-order-type — 4 separate switches matching the order-type dropdown inside Add.
- **(d)** Per-role — different visibility per `userRole`.

> Your call: ___

### Q-2C — Default value (factory)
- **(a)** Visible. **RECOMMENDED** — preserves current behavior.
- **(b)** Hidden. Forces admin to opt-in.

> Your call: ___

### Q-2D — Alternate entry-point gating (GAP-2D)
When admin hides the Add button, should the empty-table-card click in TableSection also be hidden/disabled? (i.e., truly disable new-order creation across the dashboard, not just hide one button.)
- **(a)** NO — keep alternate paths available; only the top-right Add button is gated. **RECOMMENDED** — provides a safety hatch for the cashier.
- **(b)** YES — also gate empty-table-card click + any other "create new order" trigger so the result is consistent across the dashboard.

> Your call: ___

### Q-2E — Storage key + shape
- **(a)** `mygenie_add_button_visibility = { enabled: true | false }` — JSON object, mirrors existing `mygenie_channel_visibility` shape; extensible later. **RECOMMENDED.**
- **(b)** `mygenie_add_button_visibility = "true" | "false"` — plain string; simpler.
- **(c)** Custom — please specify.

> Your call: ___

### Q-2F — UI placement in StatusConfigPage
- **(a)** Top of the existing "Visibility Settings" card, above Status Config. Quick to find.
- **(b)** New top-level "UI Elements" section card (between Status and Station View) — extensible for future toggles (e.g., hide other Header buttons). **RECOMMENDED.**
- **(c)** Inside the existing "Channel Visibility" card.

> Your call: ___

### Q-2G — Test-IDs
- **(a)** Toggle: `add-button-visibility-toggle`. Wrapper container: `add-button-container`. **RECOMMENDED.**
- **(b)** Custom — specify.

> Your call: ___

### Q-2H — Permission AND-gate
- **(a)** No additional permission gate — pure visibility flag. **RECOMMENDED.**
- **(b)** AND-gate with an existing permission (specify which).

> Your call: ___

---

## 11. Quick-answer cheat sheet (paste back if all defaults are fine)

```
Q-2A: a   (admin-locked)
Q-2B: a   (global)
Q-2C: a   (default visible)
Q-2D: a   (don't gate alternate paths)
Q-2E: a   ({ enabled: true|false } JSON object)
Q-2F: b   (new "UI Elements" section card)
Q-2G: a   (default test-IDs)
Q-2H: a   (no permission gate)
```

---

## 12. After Approval

I will roll Req 2 into a focused implementation handover (separate doc) that the implementation agent can execute without asking. Test cases mirror Req 4 structure: setup localStorage → reload → assert DOM presence/absence.

---

_End of Req 2 deep-dive. No code or production docs modified._
