# Implementation Plan (Gate 3) — QA Nov Sprint batch (11 ready items)

**Date:** 2026-11-18 · **Build:** main @ c30f4c05 · **Author:** PLANNING agent
**Stage:** Gate 3 — Implementation Plan only. NO code written. Awaiting Gate 4 GO.
**Scope (11):** BUG-685, 686, 688, 689, 690, 691, 695, 697, 698, 700, 693.
**Excluded (not ready):** BUG-687 (close as working-as-designed), 694 (investigation), 696 (backend brief filed, FE deferred), 699 (pairs with 696).

All target lines re-verified against HEAD this session. Two IAs were stale and are corrected below (690, 693).

---

## Conflict / scope lock
- **Same-file batch — `pages/reports-module/AuditLogMockup.jsx`:** BUG-700, 698, 697, 695, 691 (+ later 699). MUST be one change set, edited **bottom-up** (highest line first) to avoid line drift.
- All other items are in distinct files → parallel-safe.
- **Files WILL change:** CartPanel.jsx · useOrderPollingReconciliation.js · AuditLogMockup.jsx · EmployeeListView.jsx · socketService.js (+ useSocketEvents.js) · DashboardPage.jsx (BUG-690). **Verify-only:** LoginPage.jsx/public asset (BUG-693).
- **Files WILL NOT touch:** axios.js (global), datePresets.js (FY kept per OD-698-01), any transform, orderTransform, print/billing logic.

---

## BUG-685 — Add-to-cart crash (P0 / HIGH / BLOCKER) · `components/order-entry/CartPanel.jsx`
- **Root cause (confirmed):** main `CartPanel` props block (L806-860) destructures `isEditLocked` (L856) and `isPrepaid` (L830) but NOT `onEdit`; render passes `onEdit={onEdit}` at L1353 → `ReferenceError`.
- **Edit 1:** add `onEdit,` to the props destructure (e.g. right after `onCustomize,` L811).
- **Verify:** webpack compiles; add customizable item → no crash, pencil renders; plain item → no pencil; edit opens modal, saves in place; full order places E2E.
- **Risk:** HIGH (R5 order file) but 1-line prop add, no logic change.

## BUG-686 — Dashboard wipes running orders (P1 / HIGH / MAJOR) · `hooks/useOrderPollingReconciliation.js`
- **Root cause (confirmed):** L280-281 — on rejected POS fetch, `serverOrders=[]` then `reconcile([])` wipes all local orders.
- **Edit 1:** guard — if `posResult.status === 'rejected'`, skip `reconcile(...)` (keep the aggregator branch L284+ running). e.g. `if (posResult.status === 'fulfilled') reconcile(posResult.value || [], ...); else console.log('[OrderPolling] skip reconcile: POS fetch rejected');`
- **Verify:** throttle/offline POS fetch → local orders retained; ~10 logins → stable, no POS-0 flash; success poll still reconciles; aggregator add still works.
- **Risk:** HIGH (order visibility). ~2-4 lines.

## AuditLog same-file batch — `pages/reports-module/AuditLogMockup.jsx` (edit bottom-up)
- **BUG-700 (LOW, testability):** `RiskBar` empty return L93 and `DrillDownTable` empty return L123 lack testids. Add `data-testid="audit-card1-risk-bar"` to L93 wrapper and `data-testid={testId}` to L123 empty wrapper (so `audit-card1-table`/`audit-card3-table` resolve at 0 events).
- **BUG-698 (LOW, +OD-698-01=previous completed FY):** L192 FY branch sets dates but omits shared sync. Add `setSharedFrom(range.from); setSharedTo(range.to);`. **Do NOT change `datePresets.js computePresetRange('FY')`** (previous-completed FY is the confirmed intent).
- **BUG-697 (LOW):** L171 `useState('7D')` hard-codes the preset chip. Initialise `activePreset` by matching the shared/applied range (`sharedFrom/sharedTo`) to a known preset, else `''`. Add a small `matchPreset(from,to)` helper or lazy initialiser.
- **BUG-695 (LOW):** nested `<button>` — outer toggle L347 wraps inner link L362. Fix: change the outer toggle to `<div role="button" tabIndex={0} onClick=... onKeyDown=...>` (keep `data-testid="audit-card1-toggle"`), leaving inner `audit-card1-link` button intact. Preserve chevron + stopPropagation behaviour.
- **BUG-691 (LOW):** `fmtTime` L24 slices date-only values to `"2026-"`. Make robust: handle both `"YYYY-MM-DD HH:MM:SS"` (space) and ISO `T` separator, and return `—` when no time component is present instead of a date prefix. Re-verify the clip still reproduces with v3 data before/after.
- **Verify (all):** no React nested-button console error; empty-state testids present (cafe103 0-events); FY preset propagates shared range to other Insights pages and still returns previous FY; first-load chip matches applied range; TIME shows HH:MM or `—`, never `"2026-"`; webpack 0 new warnings.
- **Risk:** 5 × LOW; MEDIUM process (shared report file). One PR, bottom-up.

## BUG-689 — Auto-email extra `.com` (P2 / LOW, OD-689-01 = restaurant's REAL domain) · `components/panels/employee/EmployeeListView.jsx`
- **Root cause (confirmed):** `generateEmail` L28-34 strips the name and hard-appends `.com`.
- **Owner decision:** use the restaurant's **real domain**. **Implementation dependency to confirm first:** is a real domain available on the `restaurant` object (e.g. `restaurant.domain`/`website`/`email`)? 
  - If YES → derive domain from that field; fall back to the current `rname + '.com'` only when absent.
  - If NO such field exists → this needs a domain source (config or backend) → raise a short OWNER/BACKEND follow-up before coding. Do not invent a domain.
- **Edit (pending field confirmation):** L31-33 — replace unconditional `${rname}.com` with the resolved real domain; keep manual-edit (`_emailManual`) + BUG-230 sync intact.
- **Verify:** new + existing rows generate `name@<realdomain>`; manual edit still disables auto-gen; no doubled TLD; existing employee IDs unaffected.
- **Risk:** LOW string builder, but produces a login ID → confirm no dependency on the old format.

## BUG-688 — Double `join_restaurant` on reconnect (P3 / LOW) · `api/socket/socketService.js` (+ `api/socket/useSocketEvents.js`)
- **Root cause (confirmed):** on reconnect, the `connect` handler calls `_emitJoinWithAck` (L290) AND `useSocketEvents.js:232` calls `joinRestaurant` → two emits per reconnection.
- **Edit:** add a connection-scoped guard — track the joined socket id (e.g. `this._joinedSocketId = this.socket.id` after a connect-handler emit) and have `_emitJoinWithAck`/`joinRestaurant` skip a redundant emit for the same live connection; reset on disconnect. Keep BUG-677 F6 ACK re-emit + force-reconnect path intact (that must still re-emit on ACK miss).
- **Verify:** offline→online → exactly ONE `join_restaurant` per reconnection (socket logs); ACK-miss still re-emits once then force-reconnects.
- **Risk:** LOW (socket layer). Reconnect test required.

## BUG-690 — Add-on list no auto-refresh (P3 / LOW) — IA CORRECTED · parent `pages/DashboardPage.jsx`
- **Correction:** `AddonManagementPanel.handleAdd` ALREADY calls `onRefresh()` (L63). Not this file.
- **Root cause (refined):** parent passes `onRefresh={handleRefreshAll}` (DashboardPage.jsx:1940); the add-on master list fed to the panel via the `addons` prop is not re-fetched/updated by that refresh path.
- **Edit (implementation-time trace):** ensure the add-on master reload is part of the refresh that backs this panel (re-fetch add-ons and update the `addons` prop source after a successful create), OR give the panel a dedicated `onAddonChange` reload. Confirm exact source in DashboardPage during implementation.
- **Verify:** create add-on → appears immediately, no manual refresh; no duplicate rows; ₹0 allowed / empty blocked (BUG-669 intact).
- **Risk:** LOW.

## BUG-693 — Login logo blank (P3 / LOW, OD-693-01 = bundle) — IA CORRECTED · VERIFY-ONLY
- **Correction:** `GENIE_LOGO_URL` is already a LOCAL asset `"/mygenie-logo.svg"` (constants/colors.js:23, CR-491) and `public/mygenie-logo.svg` EXISTS (valid SVG). Owner's "bundle" intent is already satisfied.
- **Plan:** VERIFY-ONLY — confirm `/mygenie-logo.svg` returns 200 in the target environment (it renders in preview). No code change expected.
- **Optional hardening (only if owner wants it in the hashed JS bundle):** `import logo from '../assets/mygenie-logo.svg'` instead of a public path — defer unless requested.
- **Risk:** none (no code).

---

## Verification Matrix (seeds QA)
| # | Bug | Check | Method | Auto? |
|---|-----|-------|--------|:--:|
| 1 | 685 | add-to-cart no crash; pencil only on customizable; edit-in-place | Browser | NO |
| 2 | 686 | POS fetch rejected → orders retained; success still reconciles | Browser throttle + logs | NO |
| 3 | 700 | empty-state `audit-card1-risk-bar` + `audit-card3-table` testids at 0 events | DOM (cafe103) | YES |
| 4 | 698 | FY shares range to Insights pages; still previous-completed FY | Browser + context | NO |
| 5 | 697 | first-load chip matches applied range | Browser | NO |
| 6 | 695 | no `<button> in <button>` console error; link + toggle work | Console + click | NO |
| 7 | 691 | TIME shows HH:MM or `—`, never `"2026-"` | Browser | NO |
| 8 | 689 | email = `name@<realdomain>`; manual edit preserved | Browser | NO |
| 9 | 688 | one join per reconnection; ACK-miss re-emit intact | Socket logs | NO |
| 10 | 690 | new add-on appears without manual refresh | Browser | NO |
| 11 | 693 | `/mygenie-logo.svg` 200 + logo visible | Network tab | PARTIAL |
| 12 | all | webpack 0 new warnings | dev server | YES |

## Post-Code Registry Checklist (for IMPLEMENTATION agent)
- [ ] registry.json: each ID → status IMPLEMENTED, sprint_key nov_cr_batch
- [ ] BUG_TRACKER.md: rows → IMPLEMENTED
- [ ] FILE_OWNERSHIP.md: add CartPanel.jsx, useOrderPollingReconciliation.js, AuditLogMockup.jsx, EmployeeListView.jsx, socketService.js, useSocketEvents.js, DashboardPage.jsx with BUG ids + date
- [ ] Code markers: `// BUG-XXX` in every modified file
- [ ] webpack 0 new warnings

## Open items before/within Gate 4
- **BUG-689:** confirm a real-domain source exists on `restaurant` (else short owner/backend follow-up).
- **BUG-693:** verify-only; may close without code.

---

## RECOMMENDED EXECUTION ORDER
1. **BUG-685** (P0 crash) — unblocks all order-entry testing. Do first, verify, then continue.
2. **BUG-686** (P1 order wipe) — second; both are the HIGH-risk order items, done and verified early.
3. **AuditLog batch as ONE change set, bottom-up:** 700 → 698 → 697 → 695 → 691. Single PR, one QA pass.
4. **BUG-689** (employee email) — after confirming the real-domain source.
5. **BUG-688** (socket double-join) — isolated; needs a reconnect test cycle.
6. **BUG-690** (add-on refresh) — parent trace in DashboardPage.
7. **BUG-693** (logo) — verify-only; likely closes with no code.

Rationale: money/order-flow blockers first (685, 686); then the batched same-file report work as a single safe pass; then the independent LOW items; the verify-only logo last.
