# CR-027: Unified Toast & Error Surfacing (Cross-Module)

> **RENUMBERED 2026-06-11:** formerly CR-025 — ID collision with "CR-025 Discount Payload Fix". Owner-approved renumber (baseline consolidation R3).
## Intake + Discovery + Impact Analysis + Implementation Plan
**Registered:** 2026-06-10
**Sprint:** pos_4_0
**Priority:** P1 (opacity bug — not money-impacting, but every failed API call across the app is currently surfaced inconsistently or not at all; large support-burden reduction expected)
**Status:** READY FOR GATE 6 (Code) — Q1/Q3/Q4/A–D locked 2026-06-10; Q2 & Q5 listed OPEN but non-blocking. **Risk-assessed; phased rollout adopted (see §4.7).**
**Owner:** Abhi
**Reporter:** Owner (chat, 2026-06-10)
**Initiated from:** Menu Management error-handling investigation (chat 2026-06-10). Promoted to cross-module scope after owner direction "1 need to unify so need to know what all kind of toast are there across modules".

---

## 1. INTAKE

### 1.1 Reporter-stated need
> "All the errors which are coming from the API by editing, updating, uploading, all these are, needs to be shown into the frontend, with the toast, so user knows what exactly is wrong."

Originally scoped to Menu Management. Expanded to cross-module after owner clarified the unification requirement.

### 1.2 Goal
Every API failure in the app surfaces a toast with the **backend's message** (verbatim, no FE wording library). Eliminate silent failures, eliminate hardcoded generic fallbacks where a backend message is available, eliminate inconsistency across modules.

### 1.3 Out of scope (deferred)
- Q2: bumping `TOAST_LIMIT` from 1 → 3 in `hooks/use-toast.js`. Owner parked until post-unification behaviour can be observed.
- Q5: bootstrap silent-failure policy (per-call block vs. toast vs. hybrid). Owner parked until more clarity.
- FE wording library / status-code hint map. Backend-curated text only (Q4 locked).

---

## 2. DISCOVERY — Code-level evidence

### 2.1 Toast usage inventory (cross-module)

| Metric | Value |
|--------|-------|
| Total `toast({...})` calls | **168** |
| Files using toast | **28** |
| With `variant: "destructive"` | **90** (already correct) |
| With `variant: "default"` | 6 |
| With `variant: "outline"` | 2 |
| With `variant: "ghost"` | 1 |
| No variant set | ~69 (mostly success/info — out of scope) |
| Title `"Error"` (generic) | 28 |

### 2.2 Five inconsistent error-extraction patterns in use today

| # | Pattern | Locations (samples) |
|---|---------|---------------------|
| 1 | `err.readableMessage` (CANONICAL — already correct) | `pages/SettlementPage.jsx`, `pages/LoginPage.jsx`, `components/panels/SettlementPanel.jsx` (some), `components/panels/CreditManagementPanel.jsx` (some) |
| 2 | `err.readableMessage \|\| "fallback"` (partial — better) | a few places in Settlement |
| 3 | `err?.response?.data?.message \|\| "fallback"` | `components/panels/menu/CategoryList.jsx` L55, L79, L93 · `components/panels/menu/ProductForm.jsx` L528 · `components/panels/menu/BulkEditor.jsx` L438 |
| 4 | `err?.message` / `err.message` | several places in Order Entry, OrderCard, TableCard |
| 5 | Hardcoded string only (NO backend message) | `components/panels/MenuManagementPanel.jsx` L34 · `components/panels/menu/ProductList.jsx` L88, L101, L114, L128 · `components/panels/menu/ProductForm.jsx` L472 · `components/panels/menu/BulkEditor.jsx` L367–371, L408, L421 + many modals/cards |

### 2.3 Axios interceptor today (`api/axios.js` L54–62)

```js
const errorMessage =
  error.response?.data?.errors?.[0]?.message ||
  error.response?.data?.message ||
  error.message ||
  'Something went wrong';

error.readableMessage = errorMessage;
```

**Gaps:**
1. `error.response.data.errors[0].message` only fires when `errors` is an **array**. Laravel's default 422 returns `errors` as an **OBJECT** keyed by field (`errors: { field: ["msg"] }`) — this branch never matches → field-level validation messages are lost.
2. Network/timeout codes are not specifically classified. When `err.code === 'ECONNABORTED'` (axios timeout), `err.message` reads `"timeout of 60000ms exceeded"` — surfaced verbatim. When `err.code === 'ERR_NETWORK'`, `err.message` is `"Network Error"` — surfaced verbatim. Both are technically correct but user-hostile.

### 2.4 Backend response shapes to expect (Laravel)

| Status | Shape | Currently surfaced as |
|--------|-------|------------------------|
| 400 | `{ message: "..." }` | ✅ via `data.message` |
| 401 | (anything) | Interceptor logs out + redirects |
| 403 | `{ message: "..." }` | ✅ via `data.message` |
| 404 | `{ message: "..." }` | ✅ via `data.message` |
| 409 | `{ message: "..." }` | ✅ via `data.message` |
| 413 | `{ message: "..." }` | ✅ via `data.message` |
| 415 | `{ message: "..." }` | ✅ via `data.message` |
| **422 (Laravel default)** | `{ message: "...", errors: { field: ["msg"] } }` | **✗ field-level lost** — only general message bubbles up |
| 422 (custom array) | `{ errors: [{ message: "..." }] }` | ✅ via `data.errors[0].message` |
| 429 | `{ message: "..." }` | ✅ via `data.message` |
| 500 | `{ message: "..." }` or HTML | ✅ if JSON; HTML page falls through to `err.message` |
| 502 / 503 / 504 | HTML | Falls through to `err.message` ("Request failed with status code 503") — user-hostile |
| Network down | `err.code = 'ERR_NETWORK'`, `err.message = "Network Error"` | Surfaced verbatim |
| Timeout (>60s) | `err.code = 'ECONNABORTED'`, `err.message = "timeout of 60000ms exceeded"` | Surfaced verbatim |

---

## 3. IMPACT ANALYSIS

### 3.1 Files affected (28)

Grouped by slice:

| Slice | Files | Approx. catches to convert |
|-------|-------|------------------------------|
| **Menu Management** | `panels/MenuManagementPanel.jsx`, `panels/menu/ProductList.jsx`, `panels/menu/ProductForm.jsx`, `panels/menu/BulkEditor.jsx`, `panels/menu/CategoryList.jsx` | ~14 |
| **Cards** | `cards/OrderCard.jsx`, `cards/TableCard.jsx`, `cards/WhatsAppPaymentModal.jsx` | ~6 |
| **Modals** | `modals/AssignRiderModal.jsx`, `modals/RoomCheckInModal.jsx`, `modals/SplitBillModal.jsx`, `credit/CreditClearanceModal.jsx` | ~6 |
| **Order Entry** | `order-entry/OrderEntry.jsx`, `order-entry/CustomerModal.jsx`, `order-entry/RePrintButton.jsx` | ~10 |
| **Panels (non-menu)** | `panels/CreditManagementPanel.jsx`, `panels/SettlementPanel.jsx`, `panels/settings/TableManagementView.jsx`, `panels/settings/shared.jsx` | ~8 |
| **Pages** | `pages/AllOrdersReportPage.jsx`, `pages/LoadingPage.jsx`, `pages/LoginPage.jsx`, `pages/RestaurantSettingsPage.jsx`, `pages/RoomOrdersReportPage.jsx`, `pages/SettlementPage.jsx`, `pages/StatusConfigPage.jsx` | ~10 |
| **Layout** | `layout/Sidebar.jsx` | ~2 |
| **Infra** | `api/axios.js`, `hooks/use-toast.js` (only if Q2 unlocks) | 1 interceptor edit |

### 3.2 Cross-cutting risk

- **Interceptor edit (axios.js):** affects every API call in the app. Test plan must verify no regressions on already-correct flows (Settlement, Login).
- **BulkEditor:** non-trivial UI addition (row error state + drawer). Highest implementation effort in this CR.
- **Pages already using `err.readableMessage` directly:** must continue to work after interceptor extension (backwards-compatible — only ADDS branches to the OR chain).

### 3.3 Related historical context

- The `err.readableMessage` pattern was introduced in the interceptor as the intended canonical way. Settlement and Login adopted it. Other modules — Menu Management, Cards, Modals — were written before/without awareness of it. This CR closes that consistency gap.

---

## 4. IMPLEMENTATION PLAN

### 4.1 Target pattern (single source of truth)

Every backend-error catch in the codebase becomes:

```js
} catch (err) {
  console.error('[<Module>] <action> failed:', err);
  toast({
    title: "Error",
    description: err.readableMessage,
    variant: "destructive",
  });
}
```

For action-specific titles (e.g. "Save failed", "Delete failed"), the title may vary; **the `description` field must always be `err.readableMessage`** (no `||` fallback — the interceptor guarantees a non-empty value via its `"Something went wrong"` terminal fallback).

### 4.2 Interceptor extension (`api/axios.js`)

Replace the current 4-step OR chain with a 6-step chain:

```js
// Pseudo — for implementation reference
let validationLine = '';
const errs = error.response?.data?.errors;
if (errs && typeof errs === 'object' && !Array.isArray(errs)) {
  // Laravel default 422 object shape: errors: { field: ["msg"] }
  const firstKey = Object.keys(errs)[0];
  validationLine = errs[firstKey]?.[0] || '';
}

const friendlyTimeout = error.code === 'ECONNABORTED'
  ? 'Request timed out. Check your connection and try again.'
  : '';
const friendlyNetwork = error.code === 'ERR_NETWORK'
  ? 'Cannot reach server. Check your internet connection.'
  : '';

error.readableMessage =
  validationLine
  || error.response?.data?.errors?.[0]?.message    // array shape (existing)
  || error.response?.data?.message                 // generic (existing)
  || friendlyTimeout
  || friendlyNetwork
  || error.message
  || 'Something went wrong';
```

Backwards-compatible: all existing `err.readableMessage` consumers continue to work; new branches only fire when the previous branches were empty.

### 4.3 BulkEditor per-row error trail (Q3 hybrid)

In `panels/menu/BulkEditor.jsx`:

1. Extend each row state with `_saveError: string | null` (defaults `null`).
2. In `processOne(row)` catch block (~L367), set `_saveError: err.readableMessage` on the row alongside the existing `_saveStatus: "error"`.
3. Render a tooltip on the row's red status indicator showing `_saveError`. (Use existing tooltip primitive if available; otherwise native `title` attribute is acceptable for v1.)
4. After `handleSave`, if `failed > 0`:
   - If `failed <= 3` → toast as today (`"45 saved, 3 failed. Hover red rows to see why."`).
   - If `failed > 3` → toast `"45 saved, 7 failed."` with a `[View errors]` button. Button opens a drawer/dialog listing each failed row's `productName` + `_saveError`.
5. Drawer state: `const [showErrors, setShowErrors] = useState(false)` + render a simple list dialog (use existing Dialog/Sheet primitive).
6. `_saveError` clears when the row is re-edited (mark dirty again).

### 4.4 No silent failures (Decision C)

Every `console.error(...)` followed by no toast in the in-scope files gets a toast added. Notable spots:

- `panels/MenuManagementPanel.jsx` L46 (categories fetch), L57 (addons fetch), L78 (meta bundle: menu master + delete reasons + station list).
- (Audit other files during implementation; any `} catch (err) { console.error(...); }` without a sibling `toast(...)` call is in-scope.)

### 4.5 Execution order (lowest-risk first)

See §4.7 for the formal phased rollout. Summary:

- **Phase 1** — Interceptor only (1 file).
- **Phase 2** — Mechanical catch conversion across 27 files, in 3 slices (Menu → Cards/Modals/Order Entry → Panels/Pages/Sidebar).
- **Phase 3** — BulkEditor row trail + drawer (new UI).

Each phase is an independent commit and independently revertable.

### 4.6 Files NOT to edit

- Any `toast({...})` call that is a **success** or **info** toast (not in a catch block) — out of scope for this CR.
- Any `toast({...})` call already using `err.readableMessage` correctly with `variant: "destructive"` — out of scope (touch only if title is wrong or variant missing).

---

### 4.7 Risk analysis & phased rollout (owner-driven, added 2026-06-10)

Owner flagged the CR's blast radius (28 files + interceptor + 168 toast calls). Below is the honest risk picture and the mitigation plan that turns CR-027 into three independently-revertable phases.

#### 4.7.1 Risk summary

| Layer | Risk | Severity | Mitigatable? |
|-------|------|----------|---------------|
| Axios interceptor edit (`api/axios.js`) | App-wide error contract — affects every API call, not just the 28 in the conversion list | **HIGH** | YES — change is additive (prepends 2 branches to existing 4-branch OR chain); existing `readableMessage` consumers see identical behaviour |
| BulkEditor row trail + drawer (Q3 hybrid) | Genuinely new UI state + new drawer component | MEDIUM | YES — defer to Phase 3 sub-scope; can ship later without blocking Phases 1–2 |
| 28-file mechanical conversion | Typos, side-effect catches missed, action-specific titles flattened | MEDIUM | YES — slice-by-slice; diff-review enforces "only description string changes"; `yarn build` + `yarn test` after each slice |
| `TOAST_LIMIT = 1` clobbers concurrent errors | CR produces MORE toasts (5 silent bootstrap catches now fire); only last one is visible | LOW–MEDIUM | YES (without unlocking Q2) — aggregate bootstrap failures into a single toast |
| Existing tests assert specific text | `__tests__/api/axios.test.js` + transforms tests may have hard-coded message strings | LOW–MEDIUM | YES — run `yarn test` after the interceptor edit; update expected values (all changes should be "new behaviour is correct, update assertion", not "logic is wrong") |
| CR-021 (Collect Bill split) in flight | Merge conflict on shared rails | LOW | NO direct file overlap (`OrderEntry.jsx` is referenced in CR-021 but edited only by CR-027); ship CR-021 first |

The interceptor change is the only **app-wide** risk. Everything else is bounded to its own file or phase.

#### 4.7.2 Specific failure modes for the mechanical conversion (Phase 2)

| Failure mode | Where it can bite | How it's caught |
|--------------|--------------------|------------------|
| Catch block has side-effects beyond toast (retry, state cleanup, redirect) and implementer accidentally removes the surrounding logic | Any of the 27 files | **Diff-review every catch.** Only the `description` value changes; the rest of the catch body is byte-identical. |
| Action-specific title gets flattened to generic `"Error"` | Cards / Modals / Order Entry (titles like `"Cancel Failed"`, `"Dispatch failed"`, `"Cannot print bill"`) | CR explicitly says **titles are preserved**; diff-review enforces |
| Backend message is empty / less specific than the old hardcoded fallback for some endpoint | A few legacy endpoints | Interceptor's terminal fallback is still `"Something went wrong"`. Monitor for 48 hours after rollout; if any specific message is regressively worse, restore the action-specific text as a `\|\| fallback` in that one catch. |
| Missing import / typo / `err` shadowing | Any file | `yarn build` + linter |
| Adding a toast to a catch that's inside a polling/refresh effect → toast spam | `MenuManagementPanel.jsx` bootstrap, any auto-refresh path | Audit each newly-toasted catch for "is this called in a hot loop?" before adding the toast. |

#### 4.7.3 Phased rollout (canonical execution order)

##### Phase 1 — Interceptor only (1 file)

**Scope:** `api/axios.js` interceptor extension (Decision A) + 4 new test cases in `__tests__/api/axios.test.js`.

**Why first:** smallest possible change with the largest leverage. If correct, every consumer of `err.readableMessage` automatically benefits. If wrong, single-file revert restores prior behaviour.

**Acceptance criteria:**
- All existing `__tests__/api/axios.test.js` cases still pass unchanged.
- 4 new test cases pass:
  1. Laravel 422 object shape (`errors: { name: ["The name field is required."] }`) → `readableMessage === "The name field is required."`
  2. Axios `ECONNABORTED` → friendly timeout message
  3. `ERR_NETWORK` → friendly network message
  4. Empty `errors` object falls through to `data.message`
- Settlement + Login + Credit + Restaurant Settings smoke-tested on preprod (these already consume `readableMessage`).
- 24-hour soak on preprod before Phase 2 begins.

**Revert plan:** single-file `git revert` on `api/axios.js`.

##### Phase 2 — Mechanical catch conversion (27 files, 3 slices)

**Scope:** convert all in-scope catch blocks to the §4.1 target pattern. Title preserved; description replaced with `err.readableMessage`; variant set to `"destructive"`.

**Slice ordering:**

| Slice | Files | Catches | Why this order |
|-------|-------|---------|----------------|
| 2A — Menu Management | `panels/MenuManagementPanel.jsx`, `panels/menu/ProductList.jsx`, `panels/menu/ProductForm.jsx`, `panels/menu/CategoryList.jsx`, `panels/menu/BulkEditor.jsx` (catches only — UI work deferred to Phase 3) | ~14 | Highest density of inconsistency + originating module |
| 2B — Cards + Modals + Order Entry | `cards/OrderCard.jsx`, `cards/TableCard.jsx`, `cards/WhatsAppPaymentModal.jsx`, `modals/AssignRiderModal.jsx`, `modals/RoomCheckInModal.jsx`, `modals/SplitBillModal.jsx`, `credit/CreditClearanceModal.jsx`, `order-entry/OrderEntry.jsx`, `order-entry/CustomerModal.jsx`, `order-entry/RePrintButton.jsx` | ~16 | Bulk mechanical conversion |
| 2C — Panels + Pages + Sidebar | `panels/CreditManagementPanel.jsx`, `panels/SettlementPanel.jsx`, `panels/settings/TableManagementView.jsx`, `panels/settings/shared.jsx`, `pages/AllOrdersReportPage.jsx`, `pages/LoadingPage.jsx`, `pages/LoginPage.jsx`, `pages/RestaurantSettingsPage.jsx`, `pages/RoomOrdersReportPage.jsx`, `pages/SettlementPage.jsx`, `pages/StatusConfigPage.jsx`, `layout/Sidebar.jsx` | ~20 | Mostly already-canonical; smallest churn |

**Per-slice gating:**
- `yarn build` clean.
- `yarn test` clean (update expected assertions where new behaviour is correct).
- 5-minute preprod smoke on the slice's primary flows.
- Owner signoff before next slice.

**Revert plan:** per-slice revert. Each slice = one commit.

##### Phase 3 — BulkEditor row trail + drawer (Q3 hybrid)

**Scope:** the genuinely new UI work — `row._saveError` state, tooltip on red row indicator, `[View errors]` button + drawer when `failed > 3`.

**Why last:** higher implementation effort; not blocking; can be deferred indefinitely without losing the value of Phases 1–2.

**Acceptance criteria:**
- 1–3 failures → tooltip on each red row shows backend message.
- 4+ failures → toast shows `[View errors]` button → drawer lists each failed row + its message.
- `_saveError` clears when row is re-edited.

**Revert plan:** isolated to `panels/menu/BulkEditor.jsx`; revert that one file.

#### 4.7.4 Residual risk after mitigation

| Risk | Residual exposure |
|------|---------------------|
| Interceptor regression | Near zero after Phase 1 24h soak — additive change, all existing consumers unchanged |
| Per-slice mechanical typo | Caught by build/test/smoke per slice; worst case = revert one slice |
| Toast spam in a refresh loop | Caught by pre-edit audit per catch in Phase 2 |
| Concurrent error invisibility (`TOAST_LIMIT = 1`) | Real but pre-existing; aggregated-bootstrap-toast mitigation contains the new exposure; OD-025-2 will decide the permanent fix |
| Regressive backend messages on legacy endpoints | Surfaces only after rollout; 48-hour monitor + per-catch `\|\|` fallback restore on demand |
| CR-021 merge conflict | Eliminated by shipping CR-021 first |

#### 4.7.5 Alternative paths considered (and why rejected)

| Alternative | Owner-visible cost | Why rejected |
|-------------|--------------------|---------------|
| **(b)** Split CR-027 into 3 separate CR docs (025A, 025B, 025C) | Three tracker entries; more administrative overhead | Same outcome as phased rollout inside one doc, with less context-locality |
| **(c)** Pause CR-027 entirely | All 168 toasts remain inconsistent; Menu Management opacity bug persists | Doesn't address the originating need |
| **(d)** Drop interceptor change; mechanical-conversion only against current 4-branch interceptor | Loses Laravel 422 object-shape fix + friendly network/timeout messages | Defeats half the value; field-level validation messages stay hidden |

**Selected:** **(a)** — phased rollout in this single doc, formalised in §4.7.3.

---

## 5. TESTING PLAN

### 5.1 Interceptor unit-level
- [ ] Mock a Laravel-style 422 with `errors: { name: ["The name field is required."] }` — assert `err.readableMessage === "The name field is required."`.
- [ ] Mock 400 with `{ message: "Bad request" }` — assert `err.readableMessage === "Bad request"`.
- [ ] Mock 422 with `{ errors: [{ message: "Custom array" }] }` — assert `err.readableMessage === "Custom array"`.
- [ ] Mock `ECONNABORTED` — assert friendly timeout message.
- [ ] Mock `ERR_NETWORK` — assert friendly network message.
- [ ] Existing Settlement flow still passes (regression).

### 5.2 Per-slice smoke (preprod)
- [ ] Menu Management: kill internet → try Add Product → toast shows "Cannot reach server..." not "Failed to save product."
- [ ] Menu Management: trigger backend 422 (e.g. duplicate category name) → toast shows backend's exact message.
- [ ] Menu Management: trigger backend 413 (upload >5MB image) → toast shows backend's exact size-limit message.
- [ ] BulkEditor: save 5 rows where 2 fail with different backend messages → tooltip on each red row shows the right backend message → toast says "3 saved, 2 failed. Hover red rows to see why."
- [ ] BulkEditor: save 10 rows where 7 fail → toast shows `[View errors]` button → drawer lists all 7 with messages.
- [ ] Menu Management: bootstrap → kill backend `/categories` → toast fires; panel still loads partially.
- [ ] Cards / Modals / Order Entry: trigger a known error in each module → backend message surfaces with destructive variant.

### 5.3 Regression
- [ ] Settlement flows — unchanged.
- [ ] Login error toasts — unchanged.
- [ ] Success toasts everywhere — unchanged (no destructive variant, no `readableMessage`).
- [ ] `TOAST_LIMIT = 1` still in place (Q2 not yet flipped).

### 5.4 Owner smoke
- [ ] Run the QA flows from the Menu Management triage doc (`memory/triage/MENU_MANAGEMENT_FE_GAPS_TRIAGE_2026_06_10.md`) and confirm any backend errors hit during validation are surfaced clearly.

---

## 6. OWNER DECISION QUEUE

### 6.1 Locked 2026-06-10

| ID | Decision | Owner pick | Source |
|----|----------|------------|--------|
| **OD-025-1** | Scope: unify cross-module vs. Menu Management only | **CROSS-MODULE** — all 28 files | chat 2026-06-10 |
| **OD-025-3** | BulkEditor per-row error trail (3a tooltip / 3b inline column / 3c drawer / hybrid) | **HYBRID** — tooltip ≤3 failures, `[View errors]` drawer >3 failures | chat 2026-06-10 |
| **OD-025-4** | FE wording library vs. backend message verbatim | **BACKEND MESSAGE VERBATIM**. No FE hint map. Backend curates text. | chat 2026-06-10 |
| **A** | Interceptor extension for 422 object shape + network/timeout codes | **APPROVED** | chat 2026-06-10 |
| **B** | Single read pattern (`err.readableMessage` everywhere) | **APPROVED** | chat 2026-06-10 |
| **C** | No silent `console.error`-only catches in scope | **APPROVED** | chat 2026-06-10 |
| **D** | `variant: "destructive"` on all error toasts | **APPROVED** | chat 2026-06-10 |

### 6.2 OPEN (do not block this CR; revisit later)

| ID | Decision needed | State |
|----|-----------------|-------|
| **OD-025-2** | Bump `TOAST_LIMIT` from 1 → 3 in `hooks/use-toast.js` | OPEN — owner parked. Revisit after observing post-unification behaviour. |
| **OD-025-5** | Bootstrap silent-failure policy (toast-only / block-with-retry-screen / per-call hybrid) | OPEN — owner parked. Decision C (no silent failures) already requires toasts; blocking-screen behaviour is the additional unresolved layer. |

### 6.3 Locked behaviour summary

After this CR ships:

1. Every API failure in the 28 in-scope files surfaces a toast with `description: err.readableMessage` and `variant: "destructive"`.
2. The axios interceptor extracts Laravel 422 object-shape field-level messages and friendly network/timeout text into `err.readableMessage`.
3. BulkEditor: failed rows store their backend message; tooltip shows it inline; drawer aggregates when failures > 3.
4. No `console.error`-only catches in scope.
5. Backend message is shown verbatim. No FE wording library. Backend team owns user-facing text.
6. `TOAST_LIMIT` stays at 1 (unchanged) until OD-025-2 is decided.
7. Bootstrap fetches fire toasts on failure (Decision C) but the panel still renders partial UI; whether to upgrade to a full-block screen is OD-025-5.

### 6.4 Non-negotiables (regression guards)

- Settlement and Login error flows remain functionally identical.
- Success and info toasts remain unchanged (no variant, no `readableMessage`).
- No backend API contract changes.
- Hot-reload safe — no env or supervisor restart required.

---

## 7. ARTIFACT TRACKER

| # | Artifact | Status | Path |
|---|----------|--------|------|
| 1 | Intake | DONE | this file, §1 |
| 2 | Discovery (cross-module inventory) | DONE | this file, §2 |
| 3 | Impact Analysis | DONE | this file, §3 |
| 4 | Implementation Plan | DONE | this file, §4 |
| 5 | Owner Decision Queue | **DONE (locked 2026-06-10; Q2 and Q5 OPEN but non-blocking)** | this file, §6 |
| 6 | Code Gate | **READY FOR PICKUP** | — |
| 7 | Implementation Summary | PENDING | — |
| 8 | QA Report | PENDING | — |
| 9 | Owner Smoke / Signoff | PENDING | — |

---

## 8. CROSS-REF

- **Predecessor canonical pattern:** `pages/SettlementPage.jsx`, `pages/LoginPage.jsx`, `components/panels/SettlementPanel.jsx` (partial), `components/panels/CreditManagementPanel.jsx` (partial) — already use `err.readableMessage`. This CR makes that pattern universal.
- **Sibling open CRs (sprint pos_4_0):**
  - **CR-018 (Schedule Order)** — independent code path, can ship in parallel.
  - **CR-021 (Collect Bill split-payment defects)** — independent code path, can ship in parallel. Note: CR-021 catches are NOT in scope of this CR's conversion list because they don't exist yet; once CR-021 lands, its new catches MUST follow the CR-027 pattern.
- **Related triage:** `memory/triage/MENU_MANAGEMENT_FE_GAPS_TRIAGE_2026_06_10.md` — when those preprod validations surface backend errors, they will benefit from CR-027 being in place.
- **Inventory source:** `grep -rE "toast\(\s*\{" --include="*.jsx" --include="*.js"` across `frontend/src` (168 hits, 28 files), 2026-06-10.
