# POS3.0 BUG-097 — fOS=5 "Rider is on the way" Corrective Approval Plan — 2026-05-21

> **Status:** AWAITING OWNER APPROVAL — no code change yet.
> **Scope:** 1 corrective item (UI label/guard, frontend-only, no API, no socket, no backend dependency).
> **Patch type:** carve-out an additional sub-branch inside the existing `fOrderStatus === 5` block on `OrderCard.jsx` and `TableCard.jsx`.
> **Source of requirement:** Owner screenshot 2026-05-21 (order #002432) + planning gap identified in `POS3_0_BUG_097_STATUS_RECONCILIATION_2026_05_21.md`, `POS3_0_BUG_097_FINAL_PLANNING_COMPLETION_2026_05_21.md`, and `POS3_0_BUG_097_BUCKET_5_PLANNING_NOTES_2026_05_20.md` (state machine §1).
> **Stop point:** create exact diff preview, stop for owner approval before any implementation.

---

## 1. Approval Gate (per IMPLEMENTATION_AGENT_RULES.md)

| Field | Value |
|---|---|
| Request | At `fOrderStatus === 5` AND `isDelivery === true` AND `order.riderStatus === 'riderReached'`, replace the **Bill / Settle** action button with a **disabled passive label "Rider is on the way"**. |
| Change Type | local UI fix (carve-out sub-branch inside existing block) |
| Affected Modules | Dashboard / POS Workspace (OrderCard.jsx, TableCard.jsx) — both card surfaces |
| Related APIs | None |
| Socket Events | None (uses already-mapped `order.riderStatus`) |
| State Impact | None — reads existing `order.riderStatus` |
| UI Impact | Delivery cards at fOrderStatus 5 with rider picked up only. All non-delivery and pre-pickup states unchanged. |
| Regression Risks | LOW — sub-branch nested inside an existing single-purpose block; non-delivery and `riderStatus !== 'riderReached'` paths preserved verbatim. |
| Backend Dependency | NONE — data already on the existing `delivery-assign-order` socket payload via `delivery_man_status === 'Yes'`. |
| Open Decisions | (1) Short label text on TableCard tile (space-constrained). (2) Whether to also gate CartPanel's "Collect Bill" button by the same state. |
| Safe Without Clarification | NO — needs explicit owner sign-off on the open decisions (especially Q1). |

---

## 2. Why This Is Frontend-Only

`delivery_man_status === 'Yes'` is set by the existing backend **today** on the same `delivery-assign-order` socket payload. `orderTransform.js` L289–309 already maps it to `order.riderStatus = 'riderReached'`. The 3-item patch already proved the data flow (the pill "Order Accepted" depends on the same field). No new event, no new payload, no Bucket 5 dependency.

The earlier classification of "Rider On The Way" as Bucket 5 / backend-blocked was a planning misclassification documented in the previous status review — see `POS3_0_BUG_097_STATUS_RECONCILIATION_2026_05_21.md` §4 row 7 and §9.

---

## 3. Semantic Note (NOT renamed in this patch)

The internal value `'riderReached'` is semantically wrong — it currently fires when the rider has **picked up the order at the restaurant**, NOT when the rider has reached the customer. The owner has explicitly **deferred** the rename in this patch:

> "keep internal riderStatus value as riderReached for now; do not rename constants in this patch"

So all code uses `'riderReached'` as-is. Only user-facing labels change.

Rename to `'riderOnTheWay'` (or `'riderPickedUp'`) can be done as a separate hygiene CR later — outside this scope.

---

## 4. Out of Scope (do NOT implement)

| Item | Reason |
|---|---|
| Rider accept socket handler | Bucket 5 — backend-blocked |
| Rider reject socket handler | Bucket 5 — backend-blocked |
| Rejected rider grey-out in modal | Bucket 5 — backend-blocked |
| Delivered / customer-received final state (exit condition off "Rider is on the way" → Bill) | Bucket 5 — needs backend confirmation of handover signal |
| `'riderReached'` → `'riderOnTheWay'` rename | Owner directive — defer |
| `socketHandlers.js`, `socketEvents.js` edits | Owner directive — backend-blocked area |
| `deliveryService.js`, `constants.js` | No API change |
| `orderTransform.js`, `profileTransform.js` | No transform change (uses existing `riderStatus`) |
| `AssignRiderModal.jsx` | Unrelated to fOS=5 |
| `DeliveryCard.jsx` | Legacy, untouched |
| `CartPanel.jsx` | Owner scope: "apply to OrderCard and TableCard" only. CartPanel re-evaluation noted as Open Question 2 below. |
| `/app/memory/final/`, baseline docs | Owner directive |
| Any non-delivery behavior | Out of scope |

---

## 5. Open Questions (owner decision required before implementation)

### Q1 — TableCard short label text

OrderCard has room for the full label **"Rider is on the way"** (≈18 chars). TableCard tiles use `text-xs` + `flex-1` and existing peer labels are short ("Bill", "C/Out", "Reassign", "Waiting..", "Dispatch", "Assign"). The full string is likely to wrap to 2 lines on a tile.

Choose ONE for TableCard tile (OrderCard always uses the full string):

- (a) `"Rider is on the way"` — full string everywhere (likely wraps on tile)
- (b) `"On the way.."` — mirrors the "Waiting.." pattern from fOS=2 (~13 chars)
- (c) `"En route"` — shortest (~8 chars), highly readable
- (d) `"Rider en route"` — borderline, ~14 chars
- (e) something else — please specify

**Recommendation:** (b) `"On the way.."` — keeps parity with the existing "Waiting.." short-label pattern, fits the tile, and reads naturally.

### Q2 — CartPanel scope

If the cashier clicks into the order from the dashboard at this stage, `CartPanel.jsx` currently shows the bottom **"Collect Bill ₹XX"** button. The owner instruction says "apply to OrderCard and TableCard" only. Should CartPanel also block / relabel the Collect Bill button when `riderStatus === 'riderReached'`?

- (a) **Out of scope for this patch** — leave CartPanel as-is. Cashier *could* still print/collect bill from CartPanel by navigating in. (User instruction interpreted literally.)
- (b) **Add CartPanel guard** — also disable + relabel the bottom button to "Rider is on the way" while `orderType === 'delivery' && riderStatus === 'riderReached'`. Adds 1 more file to this patch.

**Recommendation:** (a) — stay literal to owner scope. Surface as a follow-up only if the dashboard fix alone isn't enough during smoke.

### Q3 — `canBill === false` interaction (edge)

The existing fOS=5 block is guarded by `fOrderStatus === 5 && canBill`. If `canBill` becomes false for some reason (e.g., financial guard, no orderItems), nothing renders today. With the new sub-branch, when `canBill === false` the "Rider is on the way" label also will NOT render. Is this acceptable, or should the new label render regardless of `canBill`?

- (a) **Keep `canBill` guard** — minimal patch, no behavior change for non-bill-able states.
- (b) **Lift `canBill` guard only for the rider-on-the-way label** — slightly larger patch.

**Recommendation:** (a) — minimal-risk patch. `canBill` is almost always true at fOS=5 for live delivery orders; defer (b) only if owner sees a real case where it matters.

---

## 6. Exact Diff Preview

### 6A. `src/components/cards/OrderCard.jsx`

**Location:** L958–985 (existing `{fOrderStatus === 5 && canBill && (…)}` block).

**Current code (verbatim, do NOT touch other lines):**

```jsx
            {fOrderStatus === 5 && canBill && (
              order.paymentType === 'prepaid' ? (
                // PROD-BUG-001: hide Settle when auto-settle is ON + non-PayLater
                // (auto-settle useEffect in DashboardPage handles the API call)
                (order.paymentMethod?.toLowerCase() === 'paylater' || !(() => { try { return localStorage.getItem('mygenie_auto_settle_enabled') === 'true'; } catch(_) { return false; } })()) && (
                <button
                  data-testid={`settle-btn-${orderId}`}
                  className={`min-h-[44px] px-6 text-sm font-bold rounded-lg ${isSettling ? 'opacity-50' : ''}`}
                  style={{ backgroundColor: COLORS.primaryGreen, color: "white" }}
                  onClick={handleSettlePrepaid}
                  disabled={isSettling}
                  title="Settle Order"
                >
                  {isSettling ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Settle'}
                </button>
                )
              ) : (
                <button
                  data-testid={`bill-btn-${orderId}`}
                  className={`min-h-[44px] px-6 text-sm font-bold rounded-lg ${isPrintingBill ? 'opacity-50' : ''}`}
                  style={{ backgroundColor: COLORS.primaryGreen, color: "white" }}
                  onClick={handlePrintBill}
                  disabled={isPrintingBill}
                  title="Print Bill"
                >
                  {isPrintingBill ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Bill'}
                </button>
              )
            )}
```

**Proposed code (only the outer ternary changes — Settle/Bill blocks preserved verbatim):**

```jsx
            {fOrderStatus === 5 && canBill && (
              // BUG-097 (2026-05-21): delivery + rider picked up (riderStatus='riderReached')
              // ⇒ passive "Rider is on the way" label; no Bill/Settle until handover.
              // (Internal value 'riderReached' kept as-is per owner directive — semantic
              //  rename to 'riderOnTheWay' deferred to a separate hygiene CR.)
              isDelivery && order.riderStatus === 'riderReached' ? (
                <button
                  data-testid={`rider-on-the-way-btn-${orderId}`}
                  className="min-h-[44px] px-6 text-sm font-bold rounded-lg flex items-center justify-center gap-2 opacity-50 cursor-default"
                  style={{ backgroundColor: "#FFF3E8", color: COLORS.primaryOrange, border: `1px solid ${COLORS.primaryOrange}` }}
                  disabled
                >
                  Rider is on the way
                </button>
              ) : order.paymentType === 'prepaid' ? (
                // PROD-BUG-001: hide Settle when auto-settle is ON + non-PayLater
                // (auto-settle useEffect in DashboardPage handles the API call)
                (order.paymentMethod?.toLowerCase() === 'paylater' || !(() => { try { return localStorage.getItem('mygenie_auto_settle_enabled') === 'true'; } catch(_) { return false; } })()) && (
                <button
                  data-testid={`settle-btn-${orderId}`}
                  className={`min-h-[44px] px-6 text-sm font-bold rounded-lg ${isSettling ? 'opacity-50' : ''}`}
                  style={{ backgroundColor: COLORS.primaryGreen, color: "white" }}
                  onClick={handleSettlePrepaid}
                  disabled={isSettling}
                  title="Settle Order"
                >
                  {isSettling ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Settle'}
                </button>
                )
              ) : (
                <button
                  data-testid={`bill-btn-${orderId}`}
                  className={`min-h-[44px] px-6 text-sm font-bold rounded-lg ${isPrintingBill ? 'opacity-50' : ''}`}
                  style={{ backgroundColor: COLORS.primaryGreen, color: "white" }}
                  onClick={handlePrintBill}
                  disabled={isPrintingBill}
                  title="Print Bill"
                >
                  {isPrintingBill ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Bill'}
                </button>
              )
            )}
```

**Line-level summary:**
- Added: 1 outer ternary `isDelivery && order.riderStatus === 'riderReached' ? (…) : (…existing…)`.
- Added: 1 new `<button data-testid="rider-on-the-way-btn-${orderId}">` block (10 lines including class + style).
- Removed: nothing.
- Touched: existing Settle and Bill branches are kept verbatim — only their containing wrapper changes from `(prepaid ? : )` to `(rider-on-the-way ? : prepaid ? : )`.

### 6B. `src/components/cards/TableCard.jsx`

**Location:** L537–562 (existing `{table.fOrderStatus === 5 && (…)}` Settle/Bill ternary).

**Current code (verbatim):**

```jsx
                    {table.paymentType === 'prepaid' ? (
                      // PROD-BUG-001: hide Settle when auto-settle is ON + non-PayLater
                      (table.paymentMethod?.toLowerCase() === 'paylater' || !(() => { try { return localStorage.getItem('mygenie_auto_settle_enabled') === 'true'; } catch(_) { return false; } })()) && (
                      <TextButton
                        onClick={handleSettlePrepaid}
                        testId={`settle-btn-${table.id}`}
                        ariaLabel={`Settle order for table ${table.id}`}
                        fullWidth={false}
                        className="flex-1 text-xs py-2 flex items-center justify-center gap-1"
                        disabled={isActionInProgress}
                      >
                        {isSettling ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Settle'}
                      </TextButton>
                      )
                    ) : (
                      <TextButton
                        onClick={handlePrintBill}
                        testId={`collect-btn-${table.id}`}
                        ariaLabel={`Print Bill for table ${table.id}`}
                        fullWidth={false}
                        className="flex-1 text-xs py-2 flex items-center justify-center gap-1"
                        disabled={isActionInProgress}
                      >
                        {isPrintingBill ? <Loader2 className="w-4 h-4 animate-spin" /> : (table.isRoom ? 'C/Out' : 'Bill')}
                      </TextButton>
                    )}
```

**Proposed code (only the outer ternary changes — Settle/Bill blocks preserved verbatim):**

> ⚠️ The label text shown here is the **recommended option (b) `"On the way.."`** per Q1. If owner picks another option, only the literal string in line 4 of the new block changes.

```jsx
                    {/* BUG-097 (2026-05-21): delivery + rider picked up (riderStatus='riderReached')
                        ⇒ passive "On the way.." label; no Bill/Settle until handover.
                        (Short label mirrors the fOS=2 "Waiting.." pattern for tile width.
                         Full string "Rider is on the way" used on OrderCard.) */}
                    {isDelivery && table.order?.riderStatus === 'riderReached' ? (
                      <TextButton
                        backgroundColor="#FFF3E8"
                        textColor={COLORS.primaryOrange}
                        borderColor={COLORS.primaryOrange}
                        testId={`rider-on-the-way-btn-${table.id}`}
                        ariaLabel={`Rider on the way for table ${table.id}`}
                        fullWidth={false}
                        className="flex-1 text-xs py-2 flex items-center justify-center gap-1 opacity-50 cursor-default"
                        disabled
                      >
                        On the way..
                      </TextButton>
                    ) : table.paymentType === 'prepaid' ? (
                      // PROD-BUG-001: hide Settle when auto-settle is ON + non-PayLater
                      (table.paymentMethod?.toLowerCase() === 'paylater' || !(() => { try { return localStorage.getItem('mygenie_auto_settle_enabled') === 'true'; } catch(_) { return false; } })()) && (
                      <TextButton
                        onClick={handleSettlePrepaid}
                        testId={`settle-btn-${table.id}`}
                        ariaLabel={`Settle order for table ${table.id}`}
                        fullWidth={false}
                        className="flex-1 text-xs py-2 flex items-center justify-center gap-1"
                        disabled={isActionInProgress}
                      >
                        {isSettling ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Settle'}
                      </TextButton>
                      )
                    ) : (
                      <TextButton
                        onClick={handlePrintBill}
                        testId={`collect-btn-${table.id}`}
                        ariaLabel={`Print Bill for table ${table.id}`}
                        fullWidth={false}
                        className="flex-1 text-xs py-2 flex items-center justify-center gap-1"
                        disabled={isActionInProgress}
                      >
                        {isPrintingBill ? <Loader2 className="w-4 h-4 animate-spin" /> : (table.isRoom ? 'C/Out' : 'Bill')}
                      </TextButton>
                    )}
```

**Line-level summary:**
- Added: 1 outer ternary `isDelivery && table.order?.riderStatus === 'riderReached' ? (…) : (…existing…)`.
- Added: 1 new `<TextButton testId="rider-on-the-way-btn-${table.id}">` block (~12 lines incl. props).
- Removed: nothing.
- Touched: existing Settle and Bill (`collect-btn-${table.id}`) branches are kept verbatim — only the wrapper changes.

---

## 7. Behavior Truth Table (post-patch, pending approval)

| Order Type | `riderStatus` | `fOS` | OrderCard right button | TableCard right tile button |
|---|---|---|---|---|
| Delivery | `riderAssigned` | 2 | `Waiting for Rider` (disabled) — unchanged | `Waiting..` (disabled) — unchanged |
| Delivery | `riderReached` | 2 | `Reassign` (clickable) — unchanged | `Reassign` (clickable) — unchanged |
| **Delivery** | **`riderReached`** | **5** | **`Rider is on the way`** (disabled) ← **NEW** | **`On the way..`** (disabled) ← **NEW** |
| Delivery | `riderAssigned` | 5 (edge — assigned but not picked up at fOS=5) | `Bill` / `Settle` — unchanged | `Bill` / `C/Out` / `Settle` — unchanged |
| Delivery | `null` (no rider) | 5 | `Bill` / `Settle` — unchanged | `Bill` / `Settle` — unchanged |
| Dine-in / takeaway / room | any | 5 | `Bill` / `Settle` / `C/Out` — unchanged | `Bill` / `Settle` / `C/Out` — unchanged |
| Any non-delivery | any | any | unchanged | unchanged |

---

## 8. Risk Assessment

| Item | Risk | Reasoning |
|---|---|---|
| OrderCard sub-branch | LOW | Outer wrapper only; Settle and Bill blocks preserved verbatim. `isDelivery` and `order.riderStatus` are already imported/used in this file (e.g. for rider chip and fOS=2 branching). |
| TableCard sub-branch | LOW | Same pattern. `isDelivery` and `table.order?.riderStatus` already used in this file (fOS=2 branching). Optional chaining matches existing pattern. |
| Tile width on TableCard | LOW (with option b) | "On the way.." is 13 chars, fits the same tile that already renders "Reassign" (8 chars) and "Waiting.." (10 chars). |
| `canBill === false` edge | LOW | Honoured as today; no change. Surfaced in Q3 for owner. |
| Tests affected | LOW | No existing automated tests assert at this exact state combination. New `data-testid` (`rider-on-the-way-btn-*`) is non-clashing. |
| Translation / i18n | N/A | App is English-only at present. |
| Regression for fOS=2 Reassign branch | NONE | fOS=2 block untouched. |
| Regression for non-delivery fOS=5 | NONE | Non-delivery branch sits past the new outer ternary's `isDelivery` guard. |

---

## 9. Build / Test Plan (post-approval)

1. `cd /app/frontend && CI=false yarn build` — expect 0 errors. Bundle delta ≤ +1 kB.
2. Owner smoke (preprod):
   - Take a live delivery order to fOS=5.
   - With rider assigned but `delivery_man_status="No"` (pending pickup) → card shows existing Bill / Settle (regression, should be unchanged).
   - Flip `delivery_man_status` to `"Yes"` (rider picks up) → OrderCard shows **"Rider is on the way"** (orange, disabled). TableCard shows **"On the way.."** (orange, disabled).
   - Confirm Bill is **not clickable** in this state.
   - Confirm dine-in / takeaway / room fOS=5 still show Bill / Settle / C/Out.
   - Confirm fOS=2 Reassign / Waiting from the previous 3-item patch are still working.
3. Append result to `POS3_0_BUG_097_3_ITEM_OWNER_SMOKE_QA_CHECKLIST_2026_05_21.md` (or create a new dated checklist).

The handover-exit signal (when the customer receives the order) is **still backend-blocked**. After this patch, when backend supplies a "delivered" / "handover complete" signal, the next CR will define the path from "Rider is on the way" back to Bill / removal-from-dashboard. Not in this patch.

---

## 10. Files To Change (post-approval)

```
src/components/cards/OrderCard.jsx    (outer ternary added around fOS=5+canBill block; 1 new <button>)
src/components/cards/TableCard.jsx    (outer ternary added around fOS=5 Settle/Bill ternary; 1 new <TextButton>)
```

2 files. No deletions. No renames. No new files.

---

## 11. Explicit Do-NOT List (re-stated)

- Do NOT edit `socketHandlers.js`, `socketEvents.js`, `deliveryService.js`, `constants.js`, `orderTransform.js`, `profileTransform.js`, `AssignRiderModal.jsx`, `DeliveryCard.jsx`, `CartPanel.jsx` (unless Q2 = option b).
- Do NOT rename `'riderReached'` → `'riderOnTheWay'`.
- Do NOT wire any new socket event.
- Do NOT implement the "customer received / handover complete" exit transition — backend-blocked.
- Do NOT implement rider accept / reject sockets — backend-blocked.
- Do NOT implement rejected-rider grey-out — backend-blocked.
- Do NOT update `/app/memory/final/` or any baseline doc.
- Do NOT touch PROD-BUG-001/2/3, BUG-099, BUG-104, or unrelated hotfixes.

---

## 12. Sign-off Block (owner fills before implementation)

| Decision | Owner choice |
|---|---|
| Approve OrderCard label `"Rider is on the way"` | ⬜ Yes / ⬜ No / ⬜ Other: _________ |
| Q1 — TableCard short label | ⬜ (a) Full / ⬜ (b) `On the way..` (recommended) / ⬜ (c) `En route` / ⬜ (d) `Rider en route` / ⬜ (e) Other: _________ |
| Q2 — CartPanel scope | ⬜ (a) Out of scope (recommended) / ⬜ (b) Add CartPanel guard |
| Q3 — `canBill` interaction | ⬜ (a) Keep guard (recommended) / ⬜ (b) Lift for rider-on-the-way only |
| Approve overall patch and proceed | ⬜ Yes / ⬜ No |

---

## Document Metadata

| Field | Value |
|---|---|
| Version | 1.0 |
| Created | 2026-05-21 |
| Status | AWAITING OWNER APPROVAL |
| Code changed | NO |
| Build run | NO |
| `/app/memory/final/` updated | NO |
| Baseline docs updated | NO |

*— POS3.0 BUG-097 fOS=5 "Rider is on the way" Corrective Approval Plan — 2026-05-21 —*
