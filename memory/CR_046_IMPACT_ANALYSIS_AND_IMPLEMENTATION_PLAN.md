# CR-046 — Impact Analysis + Implementation Plan

**ID:** CR-046
**Gate:** 2 (Impact Analysis) + 3 (Implementation Plan)
**Planning Agent:** 2026-06-14
**Code Reality:** NONE (greenfield)
**Conflict Pre-Check:** No other CRs touch `public/__dev/`. SAFE.

---

## GATE 2: IMPACT ANALYSIS

### Affected Files

| # | File | Action | Risk |
|---|------|--------|------|
| 1 | `public/__dev/index.html` | MODIFY — add login gate, load auth.js + workflow.js | LOW — isolated from /src |
| 2 | `public/__dev/dashboard.js` | MODIFY — add gate progress bars, stage filter, multi-select, batch queue, Gate 4 buttons, smoke cards | MEDIUM — 1205 lines, largest file |
| 3 | `public/__dev/styles.css` | MODIFY — add login styles, gate progress styles, batch panel styles | LOW |
| 4 | `public/__dev/auth.js` | NEW — login/session logic | LOW |
| 5 | `public/__dev/workflow.js` | NEW — batch queue read/write, approval write, smoke result write | LOW |
| 6 | `public/__dev/data/access.json` | NEW — SHA-256 hashed credentials | LOW |
| 7 | `public/__dev/data/workflow_queue.json` | NEW — batch queue data | LOW |
| 8 | `craco.config.js` | MODIFY — add __dev/ exclusion from production build | LOW — additive only |

### Scope Lock

**WILL change:** 8 files listed above (all in `public/__dev/` except craco.config.js)
**Will NOT touch:** anything in `/src/`, any POS app code, any existing dashboard data files (bug_tracker.json, cr_registry.json, config.json, closure_debt.json)

### Downstream Consumers

- Dashboard reads from `__dev/data/*.json` — no change to schema
- Agents read `workflow_queue.json` — NEW consumer (Step -1 in boot)
- `craco.config.js` affects build — verify `yarn build` still works

### Risk Register

| # | Risk | Probability | Impact | Mitigation |
|---|------|:-----------:|:------:|------------|
| R1 | craco exclusion breaks existing public/ serving | LOW | HIGH | Test: yarn build + verify __dev/ absent but rest of public/ intact |
| R2 | dashboard.js refactor breaks existing tabs | MEDIUM | MEDIUM | Additive changes only — no existing function signatures change |
| R3 | auth.js SHA-256 not available in browser | LOW | HIGH | Use Web Crypto API (SubtleCrypto) — available in all modern browsers |
| R4 | workflow_queue.json concurrent write corruption | LOW | LOW | Single-writer model (only dashboard writes), agents only read |

---

## GATE 3: IMPLEMENTATION PLAN

### Phase 1 — Security + Foundation

#### Edit 1: craco.config.js — Build exclusion

**File:** `/app/frontend/craco.config.js`
**Line:** Inside `webpack.configure` function (after watchOptions block ~line 62)
**Change:** Add CopyWebpackPlugin ignore pattern for __dev/

```javascript
// CR-046: Exclude __dev/ from production build
if (process.env.NODE_ENV === 'production') {
  const { ignore } = webpackConfig.plugins
    .find(p => p.constructor.name === 'CopyPlugin')
    ?.options?.patterns?.[0]?.globOptions || {};
  // Alternative: add a custom plugin to remove __dev/ post-copy
}
```

**Note:** CRA's CopyPlugin auto-copies public/ to build/. We need to verify the exact plugin hook. May need to use `webpackConfig.plugins.push(new webpack.IgnorePlugin(...))` or post-build cleanup. Will investigate during implementation — Entry Verification step.

#### Edit 2: access.json — Credentials

**File:** `/app/frontend/public/__dev/data/access.json` (NEW)
**Content:**
```json
{
  "user": "abhishek jain",
  "password_hash": "<SHA-256 of Qplazm@07111981>",
  "created_at": "2026-06-14"
}
```

#### Edit 3: auth.js — Login logic

**File:** `/app/frontend/public/__dev/auth.js` (NEW ~80 lines)
**Functions:**
- `hashPassword(plain)` — SHA-256 via SubtleCrypto
- `checkAuth()` — returns true if sessionStorage has valid token
- `login(user, password)` — hash password, compare against access.json, set sessionStorage
- `logout()` — clear sessionStorage
- `renderLoginScreen(container)` — renders login form into #root

#### Edit 4: index.html — Load auth.js, add login gate

**File:** `/app/frontend/public/__dev/index.html`
**Change:** Add auth.js script before dashboard.js. Dashboard.js only loads after auth passes.

```html
<script src="./auth.js"></script>
<script>
  // CR-046: Login gate — dashboard only loads after auth
  if (!checkAuth()) {
    renderLoginScreen(document.getElementById('root'));
  } else {
    // Load dashboard
    const s = document.createElement('script');
    s.type = 'text/babel';
    s.setAttribute('data-presets', 'react');
    s.src = './dashboard.js';
    document.body.appendChild(s);
  }
</script>
```

#### Edit 5: dashboard.js — Gate progress bar component

**File:** `/app/frontend/public/__dev/dashboard.js`
**Location:** Add new component after helpers section (~line 100)
**Change:** New `GateProgressBar` component

```jsx
function GateProgressBar({ item }) {
  // Gates: Intake → Plan → Gate4 → Code → QA → Smoke
  const gates = [
    { key: 'intake', label: 'Intake', status: item.art1_intake },
    { key: 'plan', label: 'Plan', status: item.art3_plan || item.art2_impact },
    { key: 'gate4', label: 'Gate 4', status: /* derived from status field */ },
    { key: 'code', label: 'Code', status: item.art5_impl_summary_qa },
    { key: 'qa', label: 'QA', status: /* derived */ },
    { key: 'smoke', label: 'Smoke', status: item.art6_owner_smoke },
  ];
  // Render: ✅ green / 🟡 amber / ⬜ gray / 🔴 red per gate
}
```

#### Edit 6: dashboard.js — Stage filter dropdown

**Location:** Add to BugTrackerTab and CRRegistryTab filter sections
**Change:** New dropdown: "Items ready for: [Planning | Gate 4 | Implementation | QA | Smoke]"
**Logic:** Filter items by current gate status to show only eligible items for that stage

### Phase 2 — Batch Workflow

#### Edit 7: dashboard.js — Multi-select checkboxes

**Location:** Add checkbox column to item rows in both Bug Tracker and CR Registry tabs
**State:** `selectedItems` Set in parent tab component
**Change:** Checkbox per row + "Select All" header checkbox + selected count display

#### Edit 8: workflow.js — Batch queue logic

**File:** `/app/frontend/public/__dev/workflow.js` (NEW ~150 lines)
**Functions:**
- `loadQueue()` — fetch workflow_queue.json
- `saveQueue(data)` — write back (via fetch POST to a tiny endpoint, OR localStorage bridge)
- `createBatch(stage, items, sprint, notes)` — add batch to queue
- `addApproval(itemId, gate, verdict, notes)` — add gate approval
- `addSmokeResult(itemId, verdict, notes)` — add smoke result
- `getBatchesForStage(stage)` — filter active batches

**Write mechanism:** Since `__dev/` is static files (no backend), writes go to `localStorage` and are displayed from there. The workflow_queue.json is the seed/template. Agent reads localStorage export or the owner clicks "Export Queue" to generate the JSON file for agent consumption.

#### Edit 9: dashboard.js — Batch action bar

**Location:** Bottom of filter section (both tabs)
**Change:** When items selected, show action bar:
```
Selected: 3 items  [▶ Send to: Planning ▼]  [📋 Export Queue]
```

#### Edit 10: dashboard.js — Gate 4 approval buttons

**Location:** Per-item row, visible when item status = GATE 3 COMPLETE
**Change:** `[✅ GO]` and `[❌ NO + feedback]` buttons
**On click:** Calls `workflow.addApproval()` → stores in localStorage → updates item display

#### Edit 11: dashboard.js — Queue panel

**Location:** New tab or sidebar panel
**Change:** Shows active/queued batches with items, stage, status
**Actions:** Cancel batch, view batch items

### Phase 3 — Smoke + Polish

#### Edit 12: dashboard.js — Smoke test cards

**Location:** Expandable card when item is at QA PASSED stage
**Content:** Summary of what was done + exact verification steps + `[✅ PASS]` `[❌ FAIL + feedback]`
**On click:** Calls `workflow.addSmokeResult()` → stores approval → updates item to CLOSED

#### Edit 13: dashboard.js — Batch history panel

**Location:** Within Queue panel tab
**Change:** Shows completed batches (kept until sprint closure)
**Data:** Stored in localStorage, exportable as JSON

#### Edit 14: dashboard.js — Ejection notifications

**Location:** Toast/banner at top of dashboard
**Change:** When agent ejects item from batch (writes to queue), dashboard shows notification on next load

---

## VERIFICATION MATRIX

| Edit # | File | Change | How to Verify | Automated? |
|--------|------|--------|---------------|:---:|
| 1 | craco.config.js | __dev/ exclusion | `yarn build && ls build/__dev/` → should not exist | YES (bash) |
| 2 | access.json | Credentials | `python3 -c "import hashlib; print(hashlib.sha256(b'Qplazm@07111981').hexdigest())"` matches file | YES |
| 3 | auth.js | Login logic | Browser: visit /__dev/ → login screen appears → enter creds → dashboard loads | NO (browser) |
| 4 | index.html | Login gate | Browser: without session → login shown. With session → dashboard loads | NO (browser) |
| 5 | dashboard.js | Gate progress bar | Browser: items show ✅⬜🟡 gate indicators | NO (browser) |
| 6 | dashboard.js | Stage filter | Browser: select "Planning" → only INTAKE items shown | NO (browser) |
| 7 | dashboard.js | Multi-select | Browser: checkboxes appear, select count shows | NO (browser) |
| 8 | workflow.js | Queue logic | Browser: select items → "Send to Planning" → queue panel shows batch | NO (browser) |
| 9 | dashboard.js | Batch action bar | Browser: select items → action bar appears at bottom | NO (browser) |
| 10 | dashboard.js | Gate 4 buttons | Browser: GATE 3 items show [✅ GO] → click → status updates | NO (browser) |
| 11 | dashboard.js | Queue panel | Browser: new panel/tab shows batches | NO (browser) |
| 12 | dashboard.js | Smoke cards | Browser: QA PASSED items show expandable smoke card | NO (browser) |
| 13 | dashboard.js | Batch history | Browser: completed batches visible in history | NO (browser) |
| 14 | dashboard.js | Ejections | Browser: ejected items show notification | NO (browser) |

---

## POST-CODE REGISTRY CHECKLIST (Implementation agent executes this)

```
- [ ] registry.json: CR-046 → status: IMPLEMENTED, sprint_key: pos_5_0
- [ ] CR_REGISTRY.md: CR-046 row → IMPLEMENTED
- [ ] FILE_OWNERSHIP.md: add auth.js, workflow.js, access.json, workflow_queue.json, + modified files
- [ ] Code markers: // CR-046 comment in every modified file
```

---

## EXECUTION SEQUENCE

```
Phase 1 (Session 1):
  Edit 1 → verify build exclusion
  Edit 2 → create access.json with hash
  Edit 3 → create auth.js
  Edit 4 → modify index.html
  Edit 5 → add GateProgressBar to dashboard.js
  Edit 6 → add stage filter to dashboard.js
  CHECKPOINT → verify: login works, gate bars show, build excludes __dev/

Phase 2 (Session 2):
  Edit 7 → add multi-select
  Edit 8 → create workflow.js
  Edit 9 → add batch action bar
  Edit 10 → add Gate 4 buttons
  Edit 11 → add queue panel
  CHECKPOINT → verify: can select, queue, approve

Phase 3 (Session 3):
  Edit 12 → smoke cards
  Edit 13 → batch history
  Edit 14 → ejection notifications
  CHECKPOINT → verify: full flow works
```

---

*Planning complete — 2026-06-14. 14 edits across 8 files. 3-phase execution. Ready for Gate 4.*
