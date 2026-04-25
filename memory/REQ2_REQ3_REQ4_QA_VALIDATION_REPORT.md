# REQ2 / REQ3 / REQ4 — QA Validation Report

> **Role:** QA Validation Agent (read-only).
> **Scope:** Validate implementation of REQ2 (Order Taking), REQ3 (Room Bill Print Payload), and REQ4 (Default View Setting) against locked decisions and handover specs.
> **Approach:** No code changes. Findings only.
> **Author session date:** 2026-04-25.

---

## 1. Executive Summary

All three requirements are functionally implemented and lint-clean. **REQ4 PASSES** end-to-end with one minor doc-anchor drift. **REQ2 PASSES** the locked spec but introduces a follow-up enhancement ("Option B" — force Order/Status views on flip) that **silently supersedes REQ4's admin lock and admin default**, creating a cross-requirement coupling that is not explicitly documented in the locked decisions doc. **REQ3 PASSES** the locked decisions; six unit tests added and all 6 + 7 pre-existing roomInfo tests pass. Two doc-housekeeping items remain (CHANGELOG entry for REQ3; outdated reference inside `V3_DOC_UPDATES_PENDING.md`).

**Verdict:** PASS with observations. No code fix is mandatory for shipping; one doc update (Gap G-CR-1) is recommended before declaring closure, plus an explicit owner sign-off on the REQ2-OFF override semantics (Gap G-CR-2).

| Requirement | Pass | Partial | Fail | Verdict |
|---|---|---|---|---|
| REQ4 — Default View | 13 | 1 | 0 | PASS |
| REQ2 — Order Taking | 10 | 2 | 0 | PASS-with-observations |
| REQ3 — Room Bill Print | 12 | 1 | 0 | PASS |
| Cross-Requirement | — | 2 | 0 | Owner sign-off requested |
| **TOTAL** | **35** | **6** | **0** | — |

---

## 2. Documents Reviewed

1. `/app/memory/REQ2_ORDER_TAKING_DECISIONS_LOCKED.md` (locked decisions)
2. `/app/memory/REQ2_ORDER_TAKING_IMPLEMENTATION_HANDOVER.md` (10-test acceptance)
3. `/app/memory/REQ2_ADD_BUTTON_VISIBILITY_DEEPDIVE.md` (background)
4. `/app/memory/DEFAULT_VIEW_SETTING_DECISIONS_LOCKED.md` (locked decisions)
5. `/app/memory/REQ4_DEFAULT_VIEW_IMPLEMENTATION_HANDOVER.md` (13-test acceptance)
6. `/app/memory/DEFAULT_VIEW_SETTING_DEEPDIVE.md` (background)
7. `/app/memory/REQ3_ROOM_BILL_PRINT_DEEPDIVE.md` (decision matrix Q-3A–Q-3L)
8. `/app/memory/REQ3_V3_DOC_NOTES.md` (NEW — standalone V3 notes per Q-3K)
9. `/app/memory/V3_DOC_UPDATES_PENDING.md` (cross-check ADs queued)
10. `/app/memory/CHANGELOG.md` (cross-check session entries)
11. `/app/memory/PRD.md` (Req 3 section appended this session)

---

## 3. Code Areas Reviewed

| File | Range | Requirement coverage |
|---|---|---|
| `frontend/src/pages/StatusConfigPage.jsx` | 1–80, 100–290, 290–440, 565–640, 920–1100 | REQ2, REQ4 (constants, state, hydrate, reset, save, UI render, help-copy) |
| `frontend/src/pages/DashboardPage.jsx` | 30–75, 273–400, 400–480, 1145–1180, 1331 | REQ2, REQ4 (resolver, lazy init, path-nav, storage listener, handleTableClick, cursor class) |
| `frontend/src/components/layout/Header.jsx` | 85–115, 615–632 | REQ2 (state, listener, conditional Add) |
| `frontend/src/index.css` | 115–132 | REQ2 (cursor polish) |
| `frontend/src/components/cards/TableCard.jsx` | 200 (test-id anchor) | REQ2 cursor selector match |
| `frontend/src/components/cards/{DineInCard,OrderCard,DeliveryCard}.jsx` | test-id anchors | REQ2 cursor selector match |
| `frontend/src/api/transforms/orderTransform.js` | 248–272, 1192–1252, 1276–1282 | REQ3 (`_raw`, payload enrichment, isRoomPrint branch) |
| `frontend/src/components/order-entry/OrderEntry.jsx` | 1102–1118, 1313 | REQ3 (Path A & Path B isRoom guards) |
| `frontend/src/api/transforms/__tests__/req3-room-bill-print.test.js` | full file | REQ3 (6 unit tests) |

---

## 4. Requirement-by-Requirement Validation

### 4.1 REQ4 — Default View Setting

| Spec § | Expected | Actual | Status |
|---|---|---|---|
| §3.1 constants | `DEFAULT_POS_VIEW_KEY`, `DEFAULT_DASHBOARD_VIEW_KEY`, factory `'table'` / `'channel'` | Lines 42–45 — exact match | ✅ |
| §3.2 state | `defaultPosView`, `defaultDashboardView` initialized to factory | Lines 142–144 | ✅ |
| §3.3 hydrate | Read on mount; accept only valid values | Lines 218–236 — **also adds backfill on null (positive deviation, see G-REQ4-1)** | ✅ + |
| §3.4 reset | Reset to factory | Lines 295–297 | ✅ |
| §3.5 save | Persist on Save | Lines 404–406 | ✅ |
| §3.6 help-copy | New wording | Line 889 — exact match | ✅ |
| §3.7 sub-row pickers | Visible only when parent axis = `'both'`; correct test-IDs | Lines 939–989 (POS), 1038–1088 (Dashboard) | ✅ |
| §4.1 resolver helper | `resolveInitialView(lockKey, defaultKey, lockValues, defaultValues, factory)` | Lines 42–56 | ✅ |
| §4.2/4.3 lazy initializers | Use resolver; factory `'table'` and `'channel'` | Lines 366–387 | ✅ |
| §4.4 path-nav | Re-resolve admin default when lock = `'both'` | Lines 283–303 | ✅ |
| §4.5 cross-tab listener | Sync default keys when lock = `'both'` | Lines 342–357 | ✅ |
| Test-IDs (Q-10) | `default-pos-view-{table,order}`, `default-dashboard-view-{channel,status}` | Confirmed in code | ✅ |
| Sidebar (Q-11) | No code change | None observed | ✅ |
| V3 doc (Q-12) | Separate `V3_DOC_UPDATES_PENDING.md` entry | `AD-Default-View` already queued | ✅ |

### 4.2 REQ2 — Order Taking Visibility

| Spec § | Expected | Actual | Status |
|---|---|---|---|
| §1 storage contract | `mygenie_order_taking_enabled = { enabled: true \| false }` | Lines 51–52 + 408 | ✅ |
| §3.1 constants | `ORDER_TAKING_KEY`, `ORDER_TAKING_FACTORY` | Lines 51–52 | ✅ |
| §3.2 state | `orderTakingEnabled` factory `true` | Line 147 | ✅ |
| §3.3 hydrate + backfill | First-visit factory backfill | Lines 239–250 | ✅ |
| §3.4 reset | Reset to factory | Line 299 | ✅ |
| §3.5 save | Persist `{ enabled }` | Line 408 | ✅ |
| §3.6 UI Elements card | New section between Visibility & Station View | Lines 574–629 — placement matches spec | ✅ |
| Q-2G test-id | `order-taking-toggle` | Line 616 | ✅ |
| §4 Header conditional | Hide Add button when OFF | Lines 87–110, 619 | ✅ |
| §5.1 DashboardPage state + listener | `orderTakingEnabled` lazy init + `storage` event | Lines 425–448 | ✅ |
| §5.2 `handleTableClick` gate | Early return when OFF | Lines 1158–1163 | ✅ |
| §5.3 cursor polish (optional) | Card cursors → default; buttons keep pointer | `index.css` lines 117–131; root class on line 1331 — selector uses `^=` prefix matching real test-IDs (`table-card-`, etc.) | ✅ + |
| **Follow-up enhancement (Option B)** | When OFF, force initial views to Order + Status; toggles remain visible | Lines 263–280 (path-nav) + 452–472 (effect on flag flip) — implemented as agreed with user mid-session | ⚠ See G-CR-2 |

### 4.3 REQ3 — Room Order Bill Print Payload

| Decision | Expected | Actual | Status |
|---|---|---|---|
| Q-3A — Suppress auto-bill (any room order) | Both Path A and Path B short-circuit when `isRoom` | Path A: `OrderEntry.jsx:1108-1112`; Path B: line 1313 inline `&& !effectiveTable?.isRoom` | ✅ |
| Q-3B — Manual Print Bill enabled | Untouched | Line 1042 `onPrintBill` path unchanged | ✅ |
| Q-3C — Conservative key contract | Populate `roomRemainingPay`/`roomAdvancePay` + emit `associated_orders[]`; defer other new top-level keys | `orderTransform.js` lines 1276–1277, 1282 | ✅ |
| Q-3D — Schema mapping | Match curl sample (`id, room_id, restaurant_id, user_id, order_id, restaurant_order_id, order_amount, order_status, created_at, updated_at`) | Lines 1220–1236 | ✅ |
| Q-3E — `roomGst = 0` | Stays 0 | Line 1278 | ✅ |
| Q-3F — Food-only SC/discount/tip/GST | Architectural rule preserved | Line 1127–1128 `scApplicable`, plus rooms math is flat add | ✅ |
| Q-3G — Room number in `tablename` | Confirm `tablename` carries room number for room orders | Line 1169–1172 falls through to `order.tableNumber` for room (orderType=`dineIn`); **NOT explicitly verified** at runtime | ⚠ See G-REQ3-1 |
| Q-3H — Trust live overrides | No extra refetch | Unchanged | ✅ |
| Q-3I — Transfer-to-Room print | No print | Unchanged | ✅ |
| Q-3J — Empty-room ₹0 | Covered by Q-3A=strict | Auto-print blocked by isRoom guard | ✅ |
| Q-3K — Separate V3 doc | Standalone `REQ3_V3_DOC_NOTES.md`; do NOT touch `/app/v3/*` or existing `V3_DOC_UPDATES_PENDING.md` | New file created at `/app/memory/REQ3_V3_DOC_NOTES.md`; existing `V3_DOC_UPDATES_PENDING.md` still references AD-302A/AD-Room-Print-Payload as "pending owner answers" — **outdated** | ⚠ See G-REQ3-2 |
| Q-3L — Hard-coded behavior | No feature flag | None added | ✅ |
| Unit tests | Coverage of branches | 6 new tests at `req3-room-bill-print.test.js`; all pass; 7 existing roomInfo tests still pass | ✅ |
| `_raw` preservation | `fromAPI.order.associatedOrders[]._raw` | Line 261 | ✅ |
| payment_amount with override | Roll `assoc + balance` for room override path | Lines 1250–1252 | ✅ |
| payment_amount default branch | Trust `order.amount` (room-inclusive via Task 4) | Line 1199–1201 | ✅ |

---

## 5. REQ2 — Pass / Fail / Partial Matrix

| Test from Handover §6 | Result | Notes |
|---|---|---|
| T-1 default install (no key) → ON | PASS | `isOrderTakingDisabledFromStorage()` returns false on null |
| T-2 `{enabled:false}` → reload → Add hidden + clicks no-op | PASS | Header conditional + `handleTableClick` early return |
| T-3 in-card action buttons still work | PASS | They bypass `handleTableClick`; CSS keeps button cursor pointer |
| T-4 toggle OFF → save → navigate | PASS | Storage write + dashboard listener |
| T-5 cross-tab OFF→ON | PASS | `storage` event listener present in both Header and DashboardPage |
| T-6 first-time backfill | PASS | Lines 239–243 backfill `{enabled:true}` on null |
| T-7 Reset to Default | PASS | Line 299 |
| T-8 sidebar/filter/Settings unaffected | PASS | Only `handleTableClick` and Header Add are gated |
| T-9 Header search unaffected | PASS | Search results dispatch through `onSearchSelect` (does NOT route through `handleTableClick`); but **search-result click on a table can still call `handleTableClick`** indirectly via `onSelectTable` (line 1615) — gated correctly when OFF |
| T-10 test-id present | PASS | `order-taking-toggle` |
| **Follow-up "Option B"** force Order+Status when OFF | PARTIAL | Implemented (lines 263–280 + 452–472) but coupling with REQ4 not declared in locked-decisions doc — see G-CR-2 |
| Cursor polish | PASS+ | Selector tightened to `^=` prefixes (matches real test-IDs); button cursor preserved |

---

## 6. REQ3 — Pass / Fail / Partial Matrix

| Test from Deep-dive §6.3 | Result | Notes |
|---|---|---|
| T-1 dine-in autoBill → fires | PASS | Non-room path unchanged |
| T-2 fresh ROOM order autoBill (Path A) → SKIPPED + log | PASS | Line 1108–1112; verifiable log "[AutoPrintBill] SKIPPED — isRoom" |
| T-3 collect-bill on existing room (Path B) → SKIPPED | PASS | Inline gate at 1313 |
| T-4 manual Print Bill (food + transfers + balance) | PASS (unit-tested) | 6/6 tests pass |
| T-5 manual Print Bill (food-only room) | PASS (unit-tested) | `associated_orders=[]`, `roomRemainingPay=0` |
| T-6 dashboard printer icon (default branch) | PASS (unit-tested) | Default branch trusts `order.amount` (room-inclusive via Task 4) |
| T-7 discount on room collect-bill | PASS | Architectural rule preserved (`scApplicable`, food-only) |
| T-8 tip on room | PASS | Tip applied to food only |
| T-9 empty room ₹0 marker → suppressed | PASS | Q-3A=strict |
| T-10 backend drops new keys gracefully | NOT VERIFIABLE in code | Backend-side; out of code scope |
| T-11 dine-in at table flagged isRoom | PASS | `effectiveTable.isRoom` is single source of truth |
| T-12 Transfer-to-Room — no print | PASS | Unchanged |
| Q-3G `tablename` carries room number | PARTIAL | Code path correct; runtime verification deferred (no live room order printed) — see G-REQ3-1 |

---

## 7. REQ4 — Pass / Fail / Partial Matrix

| Test from Handover §5 | Result | Notes |
|---|---|---|
| T-1 lock=both, default_pos=order → activeView=order | PASS | Resolver step 2 |
| T-2 lock=both, default_dash=channel → dashboardView=channel | PASS | Resolver step 2 |
| T-3 lock=order, default_pos=table → activeView=order | PASS | Resolver step 1 (lock wins) |
| T-4 switch lock back to both → default reactivates | PASS | Path-nav effect lines 283–292 |
| T-5 cleared localStorage → factory (table + channel) | PASS | Resolver step 3 |
| T-6 cashier flips sidebar; nav → admin default re-applied | PASS | Spec'd intentional re-apply |
| T-7 picker visibility toggles, selection preserved | PASS | Conditional `viewModeTableOrder === 'both'`; state retained while UI hides |
| T-8 Reset to Default → all 4 keys reset | PASS | Lines 295–297 + lock resets at lines 293–294 |
| T-9 cross-tab default change reflects | PASS | Lines 342–357 |
| T-10 Save without touching picker → factory written | PASS | State init = factory; Save persists |
| T-11 Help-copy match | PASS | Line 889 verbatim |
| T-12 Sidebar toggle in 'both' mode → no key write | PASS | Sidebar untouched |
| T-13 legacy tenants (no default key) → factory | PASS | Resolver default path |
| Backfill on null hydrate (positive deviation) | PARTIAL — see G-REQ4-1 | Functionally consistent but undocumented in handover |

---

## 8. Cross-Requirement Conflicts

### Conflict #1 — REQ2-OFF supersedes REQ4 admin lock & admin default
- **Where:** `DashboardPage.jsx:263–280` (path-nav) and lines 452–472 (effect on flag flip), plus lazy-init guards at lines 366–387.
- **Behavior:** When `mygenie_order_taking_enabled.enabled === false`, the dashboard force-sets `activeView='order'` and `dashboardView='status'`, IGNORING `mygenie_view_mode_*` lock and `mygenie_default_*_view`.
- **Per-spec status:** Locked-decisions doc (REQ2_ORDER_TAKING_DECISIONS_LOCKED.md) does NOT mention this override. It was a follow-up user message ("Option B: when order mode is off default view will be order view and status view").
- **Risk:** A tenant who has set `mygenie_view_mode_table_order='table'` (admin lock = Table View only) and `mygenie_order_taking_enabled.enabled=false` will see Order View instead — silently overriding the admin lock.
- **Action:** Documented in this report as G-CR-2; recommend explicit owner sign-off + entry into REQ2_ORDER_TAKING_DECISIONS_LOCKED.md so future agents know the precedence.

### Conflict #2 — `V3_DOC_UPDATES_PENDING.md` outdated for REQ3
- **Where:** Existing file mentions "Entry 4 — AD-302A + Entry 5 — AD-Room-Print-Payload — pending owner answers". Owner answered them in this session; per Q-3K=separate, the entries went to `REQ3_V3_DOC_NOTES.md` instead.
- **Risk:** Future V3 validation agent may look at the pending doc and report duplicates / inconsistency.
- **Action:** Documented as G-REQ3-2.

---

## 9. Gaps Found

### G-REQ4-1 — Undocumented backfill in Status hydrate
- **Requirement:** REQ4
- **Severity:** LOW (positive deviation)
- **Reference:** Handover §3.3 — "if (storedDefPos === 'table' \| 'order') setDefaultPosView(storedDefPos)"
- **Current behavior:** Hydrate writes factory default to `localStorage` when key is `null` (lines 223–226, 231–233).
- **Expected behavior per spec:** Read-only hydrate; do NOT write.
- **Why it matters:** Functionally consistent (resolver also returns factory), but the side-effect alters localStorage on first Settings page mount even if user doesn't touch the toggle. Could surprise a future debugger reading "what wrote this key without Save?"
- **File/function:** `frontend/src/pages/StatusConfigPage.jsx:218–236` (`useEffect` mount).
- **Proposed fix:** Either (a) document the backfill in REQ4 handover doc and the in-code comment (already partially documented as "Req 4 backfill"), or (b) remove the backfill — relying on `saveConfiguration` to persist on next Save. Owner choice.
- **Retest:** Clear localStorage → open Settings → DON'T click anything → check `mygenie_default_pos_view` value in DevTools. Should match owner's expectation (factory backfill, OR null until Save).

### G-REQ3-1 — `tablename` runtime verification for room orders
- **Requirement:** REQ3 (Q-3G)
- **Severity:** LOW (deferred per Q-3C=c conservative)
- **Reference:** Decision matrix Q-3G — "use existing `tablename` (carries room number)".
- **Current behavior:** `buildBillPrintPayload:1169–1172` returns `order.tableNumber` for room orders. No runtime verification confirms `tableNumber` is set to the actual room number string (e.g., `'202'`).
- **Expected behavior:** Print receipts show the room number for room orders.
- **Why it matters:** If `tableNumber` is not populated for room orders (e.g., backend returns `null` or table.name = "Room 202" with extra prefix), receipts may print blank or with unexpected formatting.
- **File/function:** `frontend/src/api/transforms/orderTransform.js:1169–1172` and `fromAPI.order` block populating `tableNumber`.
- **Proposed fix:** Add a verification step — either (a) place a real room order in the live preview and print bill, capture payload via DevTools/network tab, confirm `tablename` matches the room number; or (b) add a unit test asserting `tablename` for a constructed room order.
- **Retest:** Owner places a real room order with a transferred dine-in bill, clicks manual `Print Bill`, captures the payload, and confirms `tablename` is the room number.

### G-REQ3-2 — `V3_DOC_UPDATES_PENDING.md` references obsolete REQ3 ADs
- **Requirement:** REQ3 (Q-3K — separate doc)
- **Severity:** LOW (doc housekeeping)
- **Reference:** Q-3K decision: "separate doc; existing V3 untouched".
- **Current behavior:** `/app/memory/V3_DOC_UPDATES_PENDING.md` lines 70–72 still describe AD-302A and AD-Room-Print-Payload as "pending owner answers". The owner answered them this session; the canonical record is `/app/memory/REQ3_V3_DOC_NOTES.md`.
- **Expected behavior:** Pending list should either remove the obsolete entries or replace with a pointer to `REQ3_V3_DOC_NOTES.md`.
- **File:** `/app/memory/V3_DOC_UPDATES_PENDING.md:70–72`.
- **Proposed fix:** Replace lines 70–72 with: "Entries 4–5 — AD-302A + AD-Room-Print-Payload — see standalone `/app/memory/REQ3_V3_DOC_NOTES.md` (per Q-3K = separate doc). Do not duplicate here."
- **Retest:** Manual diff after fix.

### G-CR-1 — REQ3 CHANGELOG entry missing
- **Requirement:** Cross-Requirement (project hygiene)
- **Severity:** LOW
- **Reference:** REQ4 Handover §8 — "Append session entry to `/app/memory/CHANGELOG.md`". Same convention should apply to REQ3.
- **Current behavior:** `CHANGELOG.md` has no REQ3 entry. PRD got the section, but the time-ordered changelog is empty for this session.
- **Expected behavior:** One paragraph entry per session.
- **File:** `/app/memory/CHANGELOG.md`.
- **Proposed fix:** Append a session block with date 2026-04-25 summarizing REQ3 implementation: files touched, decisions taken, test count, doc location.
- **Retest:** Visual.

### G-CR-2 — REQ2-OFF override of REQ4 lock not in locked-decisions doc
- **Requirement:** Cross-Requirement (REQ2 ↔ REQ4)
- **Severity:** MEDIUM (semantic deviation; could surprise tenants)
- **Reference:** REQ2 locked decisions §"Effective behavior summary" + REQ4 §"Effective runtime precedence (final rule)".
- **Current behavior:** When Order Taking is OFF, dashboard sets `activeView='order'` and `dashboardView='status'` regardless of REQ4 lock or default. The REQ4 admin lock semantic ("admin lock = absolute") is silently overridden.
- **Expected behavior per locked decisions:** REQ4 §"Effective runtime precedence" lists three steps (lock → default → factory). REQ2 OFF is not part of this precedence chain.
- **Why it matters:** A tenant who set lock = `'table'` for cashiers AND turned Order Taking OFF for kitchen-floor staff will see Order View on the kitchen-floor terminal. If owner expected lock to win, this is a defect; if owner expected REQ2 to win (Option B intent), this is correct. **Decision is owner-only.**
- **File/function:** `DashboardPage.jsx:263–280` (path-nav effect early return) and lines 452–472 (effect on flag flip), and lazy initializers at lines 366–387 (`isOrderTakingDisabledFromStorage()` short-circuit).
- **Proposed fix:** Two options — (a) Add a one-paragraph "Cross-cutting precedence" section to `REQ2_ORDER_TAKING_DECISIONS_LOCKED.md` declaring "REQ2 OFF supersedes REQ4 lock and default by forcing Order/Status views (Option B per owner, 2026-04-25)"; (b) Treat as defect: change behavior to respect REQ4 lock when present. Owner picks (a) or (b).
- **Retest:** Set lock=`'table'`, save → set Order Taking OFF, save → reload → expected behavior per owner's chosen option.

### G-REQ2-1 — Dashboard cursor `^=` selector covers room TableCards (verify)
- **Requirement:** REQ2 (cursor polish §5.3)
- **Severity:** INFO
- **Reference:** §5.3 — "card cursors → default" when OFF.
- **Current behavior:** `index.css` selector `[data-testid^="table-card-"]` covers TableCard which is also used for rooms (rendered with `isRoom`). ✅ Confirmed via grep — `TableCard.jsx:200` emits `table-card-${table.id}`.
- **Expected behavior:** Room cards also show default cursor when OFF.
- **No fix needed.** Just confirms the selector list is complete (table-card, dinein-card, delivery-card, order-card cover all major dashboard cards). RoomCard inherits via TableCard.
- **Retest:** Order Taking OFF → hover available room card → cursor shows default. ✅

### G-REQ2-2 — Search-result click path reuses `handleTableClick`
- **Requirement:** REQ2
- **Severity:** INFO (positive — already gated)
- **Reference:** Handover §6 T-9 (Header search unaffected).
- **Current behavior:** Header search dispatches `onSearchSelect`. The selected item routes through `onSelectTable={handleTableClick}` (line 1615). When OFF, the gate at line 1161 returns early — search-driven OrderEntry opens are also blocked. ✅
- **No fix needed.** Worth noting that "T-9 search unaffected" in spec means search behavior (UI) is unaffected; functional click-through to OrderEntry IS gated, which is the intended Q-2D behavior.
- **Retest:** Order Taking OFF → search a table by name → click result → OrderEntry should NOT open.

---

## 10. Regression Risks

| Risk | Severity | Trigger | Mitigation |
|---|---|---|---|
| Existing tenants with Task-1-v2 lock saved (`'table'`/`'order'`) and no REQ4 default key | LOW | First load post-deploy | Resolver step 1 honors lock → behaves as before; default key never read. ✅ |
| Existing tenants with Task-1-v2 `'both'` lock | LOW | First load post-deploy | Resolver step 3 returns factory `'table'`/`'channel'`. **Q-2 factory change** (dashboard axis: `'status'` → `'channel'`) may surprise tenants who were used to `'status'`. Per Q-9 = no migration. Documented. |
| REQ3 default-branch print on a room order (dashboard printer icon) | LOW | Cashier clicks printer on room from dashboard | `order.amount` is room-inclusive (Task 4); `roomRemainingPay`/`roomAdvancePay` populated from `order.roomInfo`. Verified by unit test T-3 default branch. ✅ |
| REQ3 backend printer template ignores unknown `associated_orders` key | LOW | Tenant on older backend | User curl sample shows backend understands schema. If older tenants run a different backend, print may show fewer fields but won't error. |
| REQ2 cursor polish on non-card rendered area | NEGLIGIBLE | None observed | Selectors are scoped to card test-IDs only. |
| REQ2 OFF + REQ4 lock conflict | MEDIUM | See G-CR-2 | Owner sign-off pending. |
| Pre-existing test drift (`updateOrderPayload.test.js:323`) | UNRELATED | N/A | Documented in PRD §8 item 1. Out of scope for these 3 reqs. |

---

## 11. Proposed Fixes (priority order)

| # | Gap ID | Severity | Effort | Action |
|---|---|---|---|---|
| 1 | G-CR-2 | MEDIUM | 5 min | Owner picks (a) document override semantic in `REQ2_ORDER_TAKING_DECISIONS_LOCKED.md` OR (b) honor REQ4 lock when Order Taking is OFF (treat as defect → patch `DashboardPage.jsx`). |
| 2 | G-REQ3-2 | LOW | 2 min | Update `V3_DOC_UPDATES_PENDING.md:70–72` to point at `REQ3_V3_DOC_NOTES.md`. |
| 3 | G-CR-1 | LOW | 5 min | Append REQ3 entry to `CHANGELOG.md`. |
| 4 | G-REQ3-1 | LOW | 10 min | Place a live room order with transfer + balance, click manual `Print Bill`, capture payload, confirm `tablename`/`roomRemainingPay`/`associated_orders[]` look right. |
| 5 | G-REQ4-1 | LOW | 2 min | Either document backfill in handover or remove the side effect from hydrate. Owner choice. |

None of these block ship; #1 is the only one that warrants explicit owner sign-off before declaring closure.

---

## 12. Edge Cases to Retest

1. **Cashier flips sidebar runtime toggle from OFF state** — Order Taking OFF, sidebar shows runtime toggle. Cashier flips Table → Order. Navigate to Settings then back. Expected per Option B: re-applies forced `'order'` (because effect on path nav resets when OFF). Verify intentional.
2. **Two tabs, opposite Order Taking states** — Tab A OFF, Tab B ON. Same browser. Tab B saves → Tab A `storage` event flips → Tab A's view re-resolves to admin default/factory. Verify visual smoothness (no flicker on Add button reappearing).
3. **REQ4 lock = `'both'`, REQ4 default = `'order'`, REQ2 = OFF** — Currently REQ2 wins (forces `'order'` regardless). But default IS `'order'` so user-visible is identical. ✅
4. **REQ4 lock = `'table'`, REQ2 = OFF** — Currently REQ2 wins (forces `'order'`). Lock loses. **Awaiting owner G-CR-2 sign-off.**
5. **Reset to Default in Settings** — All four REQ4 keys reset + Order Taking re-enabled. Save → confirm localStorage shape.
6. **Manual `Print Bill` on a room with `associated_orders=[]` and `balancePayment=0`** — Payload should have `roomRemainingPay=0`, `roomAdvancePay≥0`, `associated_orders=[]`. payment_amount = food only. Unit test T-2 covers; manual confirmation desirable.
7. **Auto-bill flag = true + non-room order** — Path A and Path B continue to fire (regression). Test `[AutoPrintBill]` log NOT showing the "isRoom" SKIPPED message.
8. **Print on a room with extremely large `associated_orders[]` (e.g., 50 transfers)** — Performance not validated. Probably fine; `.map` over a small array.
9. **`fromAPI.order` called with missing `associated_order_list`** — `_raw` defaults to `{}`; `buildBillPrintPayload` falls back to camelCase fields. Not unit-tested explicitly.

---

## 13. Final Recommendation

**Recommendation: SHIP with owner sign-off on G-CR-2.**

- All three requirements meet their locked specifications.
- Six new unit tests + 7 pre-existing tests pass; lint clean; webpack compiled successfully; smoke screenshot OK.
- The only semantic decision pending is whether REQ2-OFF should override REQ4 lock (G-CR-2). If owner intended it (Option B), document it; if not, patch.
- All other gaps are doc-housekeeping or low-severity verification items that can be handled in a 15-minute follow-up pass.

**Pre-ship checklist:**
- [ ] Owner sign-off on G-CR-2 semantic.
- [ ] G-REQ3-2 doc fix (2 min).
- [ ] G-CR-1 changelog entry (5 min).
- [ ] G-REQ3-1 live room-order print verification (10 min, blocked on a tenant fixture).
- [ ] G-REQ4-1 backfill decision (owner: keep or revert).

---

_End of validation report. No code changes made by the QA agent. All recommendations are advisory; main agent should obtain owner approval before implementing fixes._
