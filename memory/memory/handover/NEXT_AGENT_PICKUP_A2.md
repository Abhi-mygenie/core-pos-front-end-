# Implementation Handover — Next Agent Pickup
**Context:** CR-005..CR-009 implementation sprint
**Session ended:** 2026-05-02
**Hand-off from:** Implementation Agent (current session)
**Status:** Sprint partially complete. **Bucket A2 left in HALF-APPLIED state — read §3 carefully before doing anything else.**

---

## 0. URGENT — first action you must take

**Bucket A2.1 is partially applied. The dashboard `OrderCard` has lost its timeline component.**

A2.1 was planned as 3 surgical edits to `frontend/src/components/cards/OrderCard.jsx`. Only **Change 1** (removing the inline `<OrderTimeline />` from row 1 and replacing it with the `#orderId` chip) was applied. **Change 2 (re-inserting the timeline as a new sibling header row) and Change 3 (a comment rename) were NOT applied** before the session ended.

**Effect on production today:** every order card on `/dashboard` is rendering with the `#001285` chip but **without any timeline tracking**. Webpack compiles clean; no runtime error. But product behaviour is regressed until Change 2 lands.

**Two acceptable courses of action — get owner's explicit pick before coding:**

### Option REVERT
Revert the applied Change 1 so the card returns to pre-A2.1 (timeline visible, no `#orderId` chip).
```bash
cd /app && git checkout HEAD -- frontend/src/components/cards/OrderCard.jsx
sudo supervisorctl restart frontend  # not needed (hot reload), included for safety
```
Then resume from the A2 approval gate as if A2.1 had never started.

### Option COMPLETE (recommended)
Apply Change 2 + Change 3 verbatim from §3.2 below. After they land, the card will be in the agreed A2.1 end-state (row 1 = `#orderId` in place of timeline; new row 2 = timeline; row 3 = order-note when present). Owner has already approved this UX. Then move on to A2.2 → A2.3 per §4.

**Do not silently pick.** Surface this to the owner in your first message and get an explicit go.

---

## 1. Source documents (read first — order matters)

| Order | Doc | Purpose |
|---|---|---|
| 1 | `/app/memory/change_requests/implementation_handover/CR_005_to_009_IMPLEMENTATION_HANDOVER.md` | Master planning handover. §10.A2 has the Approval Gate for the bucket in flight. §13 has sequencing. §12 is the open-questions register. |
| 2 | `/app/memory/change_requests/CR_007_ORDERID_VISIBILITY_AND_PRINT_BILL_IN_ORDER_ENTRY.md` | A2's source contract. §4 file-level impact, §5 code-reuse map. |
| 3 | `/app/memory/final/IMPLEMENTATION_AGENT_RULES.md` | Mandatory implementation guardrails. |
| 4 | `/app/memory/final/FINAL_DOCS_APPROVAL_STATUS.md` | What's frozen vs in flight on the broader docs side. |
| 5 | `/app/memory/change_requests/implementation_handover/CR_BUCKET_A0a_UI_COD_MASK_HANDOVER.md` | Closed bucket — reference for "T-A test deferral" pattern. |
| 6 | `/app/memory/change_requests/implementation_handover/CR_BUCKET_A0b_ROLE_NAME_WIRE_FIX_HANDOVER.md` | Closed bucket — reference for hotspot-respecting refactor pattern. |
| 7 | `/app/memory/change_requests/implementation_handover/CR_BUCKET_A1_VARIATION_OPTIONAL_HANDOVER.md` | Closed bucket — reference for staged delivery (3 sub-buckets, manual validation between each). |
| 8 | `/app/memory/change_requests/CR_010_ROLES_AND_PERMISSIONS_CONSOLIDATION.md` | Planning-only CR drafted this session. Not implementation. Read so you don't re-open the same questions. |

---

## 2. Sprint state — what's done, what's pending

| Bucket | Source contract | Status | Per-bucket handover |
|---|---|---|---|
| A0a (UI-COD-MASK) | `/app/memory/UI_COD_MASK_HANDOVER.md` | ✅ Done · ✅ Manually validated by owner | `CR_BUCKET_A0a_UI_COD_MASK_HANDOVER.md` |
| A0b (ROLE-NAME-WIRE-FIX) | `/app/memory/ROLE_NAME_WIRE_FIX_HANDOVER.md` | ✅ Done · ✅ Lint clean · 6/6 unit tests pass · ⏳ Live preprod manual QA pending | `CR_BUCKET_A0b_ROLE_NAME_WIRE_FIX_HANDOVER.md` |
| A1 (CR-006 Phase A) | `/app/memory/change_requests/CR_006_VARIATION_MODAL_OPTIONAL_AND_MULTISELECT.md` | ✅ Done · ✅ Manually validated by owner on `Ocean Blue (V)` (`owner@palmhouse.com`) | `CR_BUCKET_A1_VARIATION_OPTIONAL_HANDOVER.md` |
| **A2 (CR-007)** | `/app/memory/change_requests/CR_007_*.md` | **🟡 HALF-APPLIED — see §3** | NOT YET WRITTEN |
| A3 (CR-008 #2 — action time / time diff cols) | `CR_008_*.md` | ⏸️ Not started | — |
| A4 (CR-005 Phase A — web order attribution) | `CR_005_*.md` | ⏸️ Not started | — |
| B1..B4 | various | ⏸️ Not started | — |
| D1 | `CR_008_*.md` #4 | ⏸️ Not started — explicit owner go-ahead required (medium-high risk) | — |
| C1..C9 | various | ⏸️ **Backend-blocked** — cannot be picked up by frontend agent | — |

### Standalone deliverables this session
- `/app/memory/change_requests/CR_010_ROLES_AND_PERMISSIONS_CONSOLIDATION.md` — drafted (planning-only, no implementation). Do not pick up RP-A..RP-F items inside it without owner go-ahead.

### Owner-frozen out-of-scope (do NOT touch unless owner re-opens)
- `frontend/src/api/services/stationService.js:185` — owner explicitly declined any change. Form-data field `role_name=stationName` for `/station-order-list` stays as-is. See A0b handover §10 D-A0b-3.
- `frontend/src/contexts/OrderContext.jsx:36` — `refreshOrders(roleName='Manager')` default. Captured as Q-RP-03 in CR-010.

---

## 3. A2 — half-applied state precisely

### 3.1 What's already on disk in `OrderCard.jsx`

The current `git diff` (uncommitted in working tree, will auto-commit on next platform tick):

```diff
@@ -299,11 +299,17 @@
           )}
           
-          {/* Timeline: ●──14m──●──3m──● */}
-          <OrderTimeline 
-            createdAt={order.createdAt}
-            readyAt={order.readyAt}
-            servedAt={order.servedAt}
-            fOrderStatus={fOrderStatus}
-          />
+          {/* CR-007 / A2.1 (May-2026): Order ID chip in row 1, replacing the
+              timeline slot. Timeline now lives in the new sibling row below.
+              Renders only when orderId is set (brand-new pre-engage cards
+              are excluded). Width budget unchanged. */}
+          {orderId && (
+            <span
+              data-testid={`order-id-chip-${orderId}`}
+              className="text-xs flex-shrink-0"
+              style={{ color: COLORS.grayText }}
+            >
+              #{orderId}
+            </span>
+          )}
         </div>
```

This is **A2.1 Change 1** verbatim. ESLint clean. Webpack compile clean (only the pre-existing `LoadingPage.jsx:111` warning baseline).

### 3.2 What still needs to apply for A2.1 to reach the agreed end-state

#### A2.1 Change 2 — insert new "HEADER ROW 2: Timeline" as sibling
**Anchor:** between current line 308 (closing `</div>` of the existing primary header) and current line 310 (start of the existing order-note row).

Open `OrderCard.jsx`, find this block (currently at the boundary of the primary header and the order-note row):
```jsx
          )}
        </div>
      </div>

      {/* ── HEADER ROW 2: Order Note (same background, part of header) ── */}
      {order.orderNote && (
```

Replace with:
```jsx
          )}
        </div>
      </div>

      {/* ── HEADER ROW 2: Timeline tracking — CR-007 / A2.1 (May-2026).
          Same getHeaderBgColor() band as row 1, narrow padding so card height
          grows by ~16-20px only. Mirrors the existing order-note row pattern. ── */}
      <div
        className="px-3 pb-1.5 flex items-center"
        style={{ backgroundColor: getHeaderBgColor() }}
        onClick={(e) => e.stopPropagation()}
      >
        <OrderTimeline
          createdAt={order.createdAt}
          readyAt={order.readyAt}
          servedAt={order.servedAt}
          fOrderStatus={fOrderStatus}
        />
      </div>

      {/* ── HEADER ROW 3: Order Note (same background, part of header) ── */}
      {order.orderNote && (
```

(Change 3 is folded into the same block — the comment `HEADER ROW 2: Order Note` becomes `HEADER ROW 3: Order Note`.)

#### Validation after applying
1. ESLint: `mcp_lint_javascript` on `OrderCard.jsx` — must be clean.
2. Webpack: `tail -n 8 /var/log/supervisor/frontend.out.log` — only the pre-existing `LoadingPage.jsx:111` exhaustive-deps warning is acceptable.
3. `git diff frontend/src/components/cards/OrderCard.jsx` — verify both Change 1 (already there) and Change 2 (new) are present, and only `OrderCard.jsx` is modified in working tree.
4. Manual validation by owner per §4.1 — the owner explicitly wants to approve each sub-bucket before the next.

### 3.3 What's still pending in A2 even after A2.1 closes

| Sub-bucket | Files | Status |
|---|---|---|
| A2.1 Change 2 (timeline row 2) | `OrderCard.jsx` | ⏸️ Pending — see §3.2 |
| **A2.2** — `#orderId` chip on `CartPanel` | `CartPanel.jsx` | ⏸️ Not started. UX agreed — see §4.2. |
| **A2.3** — new `PrintBillButton` + 2 wire-up sites in CartPanel | `RePrintButton.jsx`, `CartPanel.jsx` | ⏸️ Not started. UX agreed — see §4.3. |

---

## 4. A2 — agreed UX, code anchors, owner instructions

### 4.1 Process the owner expects you to follow (mandatory)

The owner has run this entire sprint with a strict gate-by-gate process. Mid-A1 they instructed:

> "next time please get code reviewed before implementing"
> "we will implement one flow at a time and do manual validation before moving to next"

So for every remaining sub-bucket you must:
1. **Show the exact `old → new` diff** (no high-level summary).
2. **Wait for explicit "Apply" or "Approved"** from the owner.
3. Apply via `mcp_search_replace`, lint, hot-reload, show actual `git diff`.
4. **Stop. Wait for owner's manual validation result** (they will reply "Pass" / "Fail" / "Pause").
5. Only on "Pass" move to the next sub-bucket.
6. After all sub-buckets in a bucket land, **show final review summary**, get re-approval, then write the per-bucket handover.

**Do not roll multiple sub-buckets together. Do not auto-roll into the next bucket.**

### 4.2 A2.2 — `#orderId` chip on CartPanel — anchors

- **File:** `frontend/src/components/order-entry/CartPanel.jsx`
- **Anchor:** top of the JSX inside the `<>` fragment at L439, **above** the walk-in table input at L442.
- **Pattern to insert (verbatim mirror of `CollectPaymentPanel.jsx:578–581`):**
  ```jsx
  {orderId && (
    <div
      className="px-3 py-2 flex items-center"
      style={{ borderBottom: `1px solid ${COLORS.borderGray}` }}
      data-testid={`cart-panel-order-id-${orderId}`}
    >
      <span className="ml-auto text-sm" style={{ color: COLORS.grayText }}>
        #{orderId}
      </span>
    </div>
  )}
  ```
- **Hide rule:** chip auto-hides when `orderId == null` (brand-new unplaced cart). The wrapping `{orderId && ...}` already does that.
- **No edit to `OrderEntry.jsx`** (hotspot file) — `orderId` is already a prop on CartPanel at L271.

### 4.3 A2.3 — new `PrintBillButton` + wire-up — anchors

- **New component file:** `frontend/src/components/order-entry/RePrintButton.jsx` — add a sibling export `PrintBillButton` next to `RePrintOnlyButton`.
- **Owner instruction Q-O4:** "**same as collect bill, try to reuse components and code**". So the JSX **must** mirror `CollectPaymentPanel.jsx:593–604` verbatim:
  ```jsx
  <button
    onClick={handlePrintBill}
    disabled={isPrintingBill || !orderId}
    className="flex items-center gap-1 px-2 py-1 rounded-md border text-xs font-medium transition-opacity hover:opacity-80 disabled:opacity-50 disabled:cursor-not-allowed"
    style={{ borderColor: COLORS.primaryOrange, color: COLORS.primaryOrange }}
    data-testid="cart-panel-print-bill-btn"
    title="Print Bill"
  >
    <Printer className="w-3.5 h-3.5" />
    <span>{isPrintingBill ? 'Printing…' : 'Print Bill'}</span>
  </button>
  ```
- **Click handler — verbatim copy of `OrderCard.handlePrintBill` (L120–138):**
  ```js
  const handlePrintBill = async () => {
    if (!orderId || isPrintingBill) return;
    setIsPrintingBill(true);
    try {
      const scPctForPrint = restaurant?.autoServiceCharge ? (restaurant?.serviceChargePercentage || 0) : 0;
      await printOrder(orderId, 'bill', null, order, scPctForPrint);
      toast({ title: "Bill request sent", description: `Order #${orderId}` });
    } catch (error) {
      console.error('[PrintBillButton] Bill print error:', error);
      toast({ title: "Failed to send Bill request", variant: "destructive" });
    } finally {
      setIsPrintingBill(false);
    }
  };
  ```
- **Live order lookup — to keep `OrderEntry.jsx` (hotspot) untouched:**
  ```js
  const { getOrderById } = useOrders();
  const order = orderId ? getOrderById(orderId) : null;
  const { restaurant } = useRestaurant();
  ```
  `useOrders` is already exported from `frontend/src/contexts/index.js:10`. `useRestaurant` is already imported in `RePrintButton.jsx` at L3.

- **Wire-up site 1 — KOT separator** in `CartPanel.jsx` L645–651:
  ```jsx
  // Wrap the existing single-button render in a flex row containing both buttons.
  <div className="flex items-center gap-2">
    <RePrintOnlyButton orderId={orderId} cartItems={cartItems} />
    <PrintBillButton orderId={orderId} />
  </div>
  ```
- **Wire-up site 2 — footer (placed-only state)** in `CartPanel.jsx` L683–687: same `flex gap-2` wrap.
- **Visibility gate (both sites):** the existing `canPrintBill && cartItems.some(i => i.placed && !i.isCheckInMarker) && !cartItems.some(i => !i.placed)` at L683 (and the placed-vs-unplaced separator condition at L647) is already correct — both buttons fall under the same gate together. No new gate logic needed.
- **Critical:** do NOT use `CollectPaymentPanel.jsx:527–559` overrides path. Owner explicitly said "**don't complicate**". Print Bill in CartPanel uses the OrderCard pattern, not the live-overrides pattern.

### 4.4 Open questions register — already resolved by owner

| ID | Question | Owner's decision |
|---|---|---|
| Q-O1 | Order ID display format | `#<orderId>` raw (no padding). Same as CollectPaymentPanel. |
| Q-O2 | Issue #2 chip location | **CartPanel** (right panel) — NOT OrderEntry parent. Hotspot stays untouched. |
| Q-O3 | Print Bill visibility gate | `orderId && canPrintBill && hasPlacedItems` — same gate as Re-Print KOT. |
| Q-O4 | Button label/icon/styling | **Reuse CollectPaymentPanel JSX verbatim** ("same as collect bill, try to reuse components and code"). Orange-outline pill, `Printer w-3.5`, "Print Bill" / "Printing…". |
| Q-O5 | OrderCard layout for Issue #1 | **Split header into 2 rows.** Row 1 = primary info incl. `#orderId`. Row 2 = timeline. Width unchanged. Height grows ~16-20px (acceptable per owner). |

### 4.5 Constraint owner re-confirmed mid-A2

> "width of actual header should not change"

Card outer width and column-grid width must stay identical to today. Card vertical height growing by ~16–20px is acceptable. Already factored into the A2.1 design.

---

## 5. Mandatory implementation guardrails (still in force)

From `IMPLEMENTATION_AGENT_RULES.md` plus owner directives this session:

1. **No backend changes** for any A/B bucket.
2. **No `OrderEntry.jsx` edits** — it's a hotspot. A2's design specifically routes around it (the new chip lives inside CartPanel; the new button looks up the live order via `useOrders()` instead of prop drilling).
3. **No `CollectPaymentPanel.jsx` edits** — also a hotspot. A2 only mirrors its styling, never modifies it.
4. **No `stationService.js` edits** — owner-frozen.
5. **No new devDeps** — `@testing-library/react` is not installed; the project's existing tests that import it (e.g. `SocketContext.test.jsx`) are already broken on this branch. Tests for A2 are deferred under TEST-INFRA-001 (logged in A0a / A0b / A1 handovers). Manual browser validation only.
6. **Use `mcp_search_replace` for existing files**, `mcp_create_file` only for genuinely new files.
7. **Yarn only** — never `npm`.
8. **Hot reload covers regular code changes** — restart supervisor only on `.env` changes or new dependency installs.
9. **All URLs / ports / tokens come from `.env`** — `REACT_APP_API_BASE_URL` etc. Never hard-code.

---

## 6. Test infrastructure note (TEST-INFRA-001)

Recurring across A0a / A0b / A1 / A2:

- `@testing-library/react`, `@testing-library/jest-dom`, `@testing-library/user-event` are referenced by existing test files (e.g. `src/__tests__/contexts/SocketContext.test.jsx`) but are **NOT in `package.json`** and **NOT installed**.
- `react-test-renderer` is also not installed.
- One pre-existing failing assertion in `src/__tests__/api/constants.test.js:34` (path-validation case).
- A0b's new pure-Jest test (`src/__tests__/api/role-name-wire-contract.test.js`) does run cleanly and passes 6/6.

When you propose a test file for any A2 sub-bucket, expect the owner to defer it (Option T-A) unless a parallel TEST-INFRA-001 ticket has landed first. Do not silently `yarn add --dev` — that's scope leakage.

Remediation steps if owner ever authorises TEST-INFRA-001:
```bash
cd /app/frontend
yarn add --dev @testing-library/react@^14 @testing-library/jest-dom@^6 @testing-library/user-event@^14
# Add `import '@testing-library/jest-dom';` to src/setupTests.js (create if missing)
# Fix or quarantine the failing assertion in src/__tests__/api/constants.test.js:34
CI=true yarn test --watchAll=false
```

---

## 7. Manual validation pre-conditions

Owner does live validation through the deployed preview. You will not have credentials in the pod; ask the owner each time.

- **Live URL:** `https://insights-phase.preview.emergentagent.com`
- **Real backend:** `https://preprod.mygenie.online/` (external — owner controls).
- **Test accounts shared so far this session:**
  - `owner@palmhouse.com` / `Qplazm@10` — used for A1 (`Ocean Blue (V)` is the canonical optional-variant test). Has placed orders, dashboard cards visible, ideal for A2.
  - `owner@18march.com` / `Qplazm@10` — used for A0a/A0b regression. Multi-tab Audit Report data.

The "Frontend Preview Only. Please wake servers to enable backend functionality." banner appears on first load; the owner clicks **Wake up servers**. Don't try to script through it.

---

## 8. Codebase pre-flight checks

Run these before your first edit:

```bash
cd /app
git branch --show-current     # main (platform git)
git log -1 --oneline          # latest auto-commit
git status --short            # expect: only frontend/src/components/cards/OrderCard.jsx modified, plus untracked frontend/yarn.lock from initial deployment
```

Application code on disk = upstream `https://github.com/Abhi-mygenie/core-pos-front-end-.git` branch `1-may`. Repo's own `.git` was discarded during the deployment task; `/app/.git` is the platform-managed git, NOT the repo's git.

If `git status` shows files modified beyond `OrderCard.jsx`, **stop and ask the owner** — something else has changed.

---

## 9. Recommended sequence for your session

1. **Read** this handover end-to-end. Read at least the A2 source contract (`CR_007_*.md`) and the master handover `§10.A2`.
2. **First message to owner:** flag the A2.1 half-applied state explicitly (§0). Get explicit pick: REVERT or COMPLETE.
3. If COMPLETE → propose Change 2 + 3 diff (§3.2), wait for approval, apply, lint, show diff, **stop for manual validation**.
4. After A2.1 passes manual validation → propose A2.2 diff (§4.2), wait, apply, lint, show diff, stop for manual validation.
5. After A2.2 passes → propose A2.3 diff (§4.3), wait, apply, lint, show diff, stop for manual validation.
6. After A2.3 passes → write `/app/memory/change_requests/implementation_handover/CR_BUCKET_A2_ORDERID_AND_PRINT_BILL_HANDOVER.md` (mirror the structure of `CR_BUCKET_A1_VARIATION_OPTIONAL_HANDOVER.md`).
7. **Stop.** Do not start A3 unless owner explicitly approves.

---

## 10. Files referenced by anchor in this handover

| Path | Why |
|---|---|
| `/app/frontend/src/components/cards/OrderCard.jsx` | A2.1 — primary file. Currently half-modified. |
| `/app/frontend/src/components/order-entry/CartPanel.jsx` | A2.2 + A2.3 — chip + button render sites. |
| `/app/frontend/src/components/order-entry/RePrintButton.jsx` | A2.3 — add new `PrintBillButton` export. |
| `/app/frontend/src/components/order-entry/CollectPaymentPanel.jsx` | A2.3 — **READ-ONLY reference** for the button JSX (L593–604). |
| `/app/frontend/src/components/order-entry/OrderEntry.jsx` | **HOTSPOT — DO NOT MODIFY** for A2. |
| `/app/frontend/src/contexts/index.js` | Re-exports `useOrders`, `useRestaurant`. Already has everything A2.3 needs. |
| `/app/frontend/src/api/services/orderService.js` | `printOrder()` — reused, do not modify. |

---

## 11. Definition of "A2 done"

- ✅ A2.1 Change 2 + Change 3 applied; card header has 2 rows; `#orderId` in row 1; `<OrderTimeline />` in row 2.
- ✅ A2.2 `#orderId` chip rendering at top of CartPanel only when `orderId` is set.
- ✅ A2.3 `PrintBillButton` rendering next to Re-Print KOT in both render sites; clicking triggers `printOrder('bill', ...)` with toast; gated by `canPrintBill && orderId && hasPlacedItems`.
- ✅ ESLint clean on every touched file.
- ✅ Webpack compiles with only the pre-existing `LoadingPage.jsx:111` warning.
- ✅ Owner manually validated each sub-bucket and replied "Pass".
- ✅ `OrderEntry.jsx`, `CollectPaymentPanel.jsx`, `stationService.js` — zero edits.
- ✅ Per-bucket handover written at `/app/memory/change_requests/implementation_handover/CR_BUCKET_A2_*.md`.

Anything short of this list = A2 not done. Do not move to A3.

---

**End of handover.**
