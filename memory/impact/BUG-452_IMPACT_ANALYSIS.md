# BUG-452 — IMPACT ANALYSIS (Gate 2) — Stale cart under old key after type/table switch → Option B "always clear"

**Date:** 2026-09-23 · **Role:** PLANNING (ALPHA v0.7) — Stage: Impact Analysis ONLY · **Sprint:** `sep_bug_closure`
**Code Reality:** NONE for BUG-452. **BUG-334 code EXISTS** at `OrderEntry.jsx:504–508` (carry-forward branch) and is the behaviour being reversed (HEAD `1be4055`, `evidence/BUG-452/BUG-452_code_grep_2026_09_23.txt`)
**Conflict Pre-Check:**
- `components/order-entry/OrderEntry.jsx` — last: BUG-330 (2026-08-19, L322–328 cancel gate), **BUG-334 (2026-08-20, L484→506 carry-forward — CLOSED OWNER VERIFIED)**, CR-348 (custom item GST). No open item. **Behavioural conflict with BUG-334 — owner resolved: OD-452-01 = Option B, BUG-334 REVERSED.**
- `pages/DashboardPage.jsx` — last BUG-358 (sidebar localStorage), BUG-332 (search), CR-097; **BUG-453 (this sprint) adds 2 lines in `toggleSnooze` L1280–1290 — different region → parallel-safe.** PROD-004 clear at L1540 stays.
- `AppProviders.jsx` not involved (R7).
**Risk:** HIGH — order-capture flow, two R5 hotspots, reverses an owner-verified behaviour.
**Intake:** `change_requests/BUG-452_STALE_CART_RESTORED_AFTER_TYPE_TABLE_SWITCH_INTAKE.md` · OD-452-01 LOCKED = **Option B: always clear (live cart + old key) on order-type / table switch mid-build**.

---

## 1. Data flow trace (today)

```
DashboardPage (session-long)
  cartsByTable {}                                   :453
  <OrderEntry key={orderEntryResetNonce}             :2061
     table={orderEntryTable} orderType={orderEntryType}
     savedCart={cartsByTable[table?.id || type] || []}                       :2069  (READ on key change)
     onCartChange={(key, items) => setCartsByTable(prev => ({...prev,[key]:items}))}  :2070  (WRITE)
     onOrderTypeChange={handleOrderTypeChange}       :2066 → :1504–1511  setOrderEntryType(newType)  (mounted)
     onSelectTable={handleTableClick}                :2068 → :1462–1497  setOrderEntryTable(t) + type (mounted)
     onClose={handleCloseOrderEntry}                 :2063 → :1513–1520  setOrderEntryType(null) → UNMOUNT

OrderEntry
  cartKeyRef = useRef(null)                                                  :308
  Trigger sites: type dropdown :2436 onOrderTypeChange?.(type.id) · table list :2494 onSelectTable?.(t)
  useEffect([table?.id, orderType])                                          :378–512
     newKey = table?.id || orderType; oldKey = cartKeyRef.current
     if (oldKey && oldKey !== newKey) onCartChange(oldKey, cartItems)   ← W1 STALE COPY  :383–386
     cartKeyRef.current = newKey
     if (savedCart.length > 0)  setCartItems(savedCart) + customer/financials from orderData   :390–…   ← R1 RESTORE
     else if (orderData)        existing placed items → setCartItems(existingItems)          :455–500
     else if (oldKey !== null)  /* BUG-334: carry cartItems forward — no reset */              :504–508  ← C1 CARRY
     else                       setCartItems([])                                               :509–511
```

**Bug mechanism:** W1 copies unplaced items to `cartsByTable[oldKey]`; C1 keeps them live in the new key. Old key is never emptied (only `:545` refresh and `:1540` stay-on-order clear anything). Next mount of old key → R1 restores the copy.

**Latent second defect found in IA:** if the switch starts on an **occupied table** (cart holds `placed:true` items from `orderData`), W1 writes those *placed* items into `cartsByTable[tableA]`; reopening Table A then takes R1 (savedCart) **in priority over fresh `orderData`** → stale placed-item snapshot, stale financials. Option B removes W1 and thereby also fixes this.

## 2. Option B — what "always clear" must do (locked semantics)

On a real switch (`oldKey && oldKey !== newKey`, component stays mounted):
1. **Do not write** the old key (delete W1 call) — old key stays empty → no restore later.
2. **Reset the draft** for the new destination: unplaced `cartItems` → `[]`, and the draft-only state that BUG-334 was carrying along: `customer`, `orderNotes`, `selectedAddress`, `deliveryCharge`, `orderFinancials` (to zero) — **unless** the new key is an occupied table/order, in which case the existing `orderData` branch (:455–500) already repopulates from the server order.
3. **Placed items are never touched**: they belong to the source order on the server; clearing local state does not cancel anything (OD-452-03 satisfied by construction — no API call in this effect).

### Two implementation shapes (Gate 3 to pick; both are Option B)

| Shape | Where | Mechanics | Pros | Cons |
|---|---|---|---|---|
| **S1 — remount via nonce (recommended)** | `DashboardPage.jsx` only | In `handleOrderTypeChange` and in `handleTableClick` **when `orderEntryType !== null` (OrderEntry already open)** → `setOrderEntryResetNonce(n => n + 1)`. React remounts `<OrderEntry key=…>` → `cartKeyRef` starts `null` → W1 never fires → all `useState` back to defaults → `savedCart` `[]` → occupied table loads from `orderData`. Reuses the CR-008 #4 mechanism already proven at `:1541`. | 2 one-line additions in `DashboardPage`; **`OrderEntry.jsx` untouched**; "clean slate" is exact (every field), no per-field reset list to maintain; PROD-004 path unchanged | R5 `DashboardPage.jsx` (but not `OrderEntry`); remount closes the type/table dropdown (it is closing anyway) and re-runs mount effects (CRM enrich etc. — same as any fresh open); BUG-334 marker branch becomes unreachable dead code → must be removed/re-commented for §F integrity |
| S2 — edit the effect | `OrderEntry.jsx` :383–386 + :504–508 | Delete W1; in C1 branch call `setCartItems([])` + reset `customer/orderNotes/selectedAddress/deliveryCharge/orderFinancials` | Single file; no remount | Edits **the** R5 hotspot effect; must enumerate every draft field (risk of missing one → half-cleared UI); BUG-334 branch rewritten in place |

**Recommendation: S1.** Fewer lines, zero risk of partial reset, no edit to the 2 500-line OrderEntry effect; the only OrderEntry change is deleting the now-dead BUG-334 comment branch (or leaving a `// BUG-452: unreachable after remount` note — Gate 3 decision).

### BUG-334 reversal bookkeeping (needs owner approval to touch BUG-334 — R14/R16)
- `registry.json` BUG-334: append `status_history` "REVERSED BY BUG-452 (OD-452-01 Option B, owner 2026-09-23)"; status text stays CLOSED with the annotation.
- `BUG_TRACKER.md` BUG-334 row: same note.
- `impact/BATCH-04_IMPACT_ANALYSIS.md` (BUG-334 IA): header note "superseded by BUG-452".
- Code: `OrderEntry.jsx:504–508` comment rewritten to `// BUG-334 carry-forward REVERSED by BUG-452 (owner 2026-09-23)…` so §F code↔registry cross-check stays truthful.

## 3. Files affected (S1)

| # | File | Change | Lines | Hotspot |
|---|---|---|---|---|
| 1 | `src/pages/DashboardPage.jsx` | `handleOrderTypeChange` (:1504–1511): `+ setOrderEntryResetNonce(n => n + 1)` when `orderEntryType !== null`; `handleTableClick` (:1462–1497): same guard + bump before `setOrderEntryTable` | +2–4 | **YES (R5)** |
| 2 | `src/components/order-entry/OrderEntry.jsx` | :504–508 BUG-334 branch → remove or re-comment as reversed (no logic change; branch unreachable) | −4 / comment | **YES (R5)** — comment-level |
| 3 | `src/pages/__tests__/DashboardPage.bug452.test.jsx` or `OrderEntry.bug452.test.jsx` | **NEW** — switch type mid-build → cart empty; switch table mid-build → cart empty, `cartsByTable` old key stays empty; open → close → reopen same key → empty; occupied table → items from `orderData` | ~80 | — |

Dead plumbing after fix (`cartsByTable`, `savedCart`, `onCartChange`, R1 branch, `:545`, `:1540`): **keep as-is** in BUG-452 (scope lock); file OG entry "cart save/restore plumbing dead after BUG-452 — remove in a cleanup CR".

## 4. Downstream consumers / interactions

| Consumer | Effect |
|---|---|
| **Walk-in (R13)** | Add → items → switch to TakeAway → **cart empty** (owner intent). Add again → empty. |
| Occupied Table A → Table B (B occupied) | Remount → `orderData(B)` branch → B's placed items; A untouched on server. Reopen A → A's placed items from `orderData` (fresh — better than today's stale snapshot). |
| Occupied Table A → available Table B | B empty draft. |
| `handleTableClick(null)` (post-prepaid, :1463–1466) | Returns before any bump — no remount, unchanged. |
| Merge / Shift / Transfer entry points (`setInitialShowMerge/Shift` then `handleTableClick`) | These open OrderEntry from the dashboard (type `null` → no bump) — unchanged. **Check at Gate 3:** any in-OrderEntry flow that calls `onSelectTable` while merge/shift modal is open would now remount and close that modal (`initialShowMerge/Shift` props persist, so modal re-opens; verify). |
| PROD-004 stay-on-order (`:1536–1546`) | Already bumps nonce — same mechanism, unchanged |
| CR-008 delivery charge / BUG-065 phone / BUG-108 loyalty in R1 branch | Unreachable (savedCart always `[]`) — behaviour for **existing orders** still comes from the `orderData` branch (:455–500), which has its own copies of these (BUG-019 `:466`, BUG-267 `:478`). No loss. |
| BulkEditor / other `cartsByTable` readers | None (grep: DashboardPage + OrderEntry only) |

## 5. Risks

| Risk | L | Mitigation |
|---|---|---|
| Cashier loses a half-built cart on an accidental type click | **Accepted by owner (Option B)** | Gate 3 may propose a confirm dialog "Discard 3 items?" — **not assumed**; owner said clean slate. Flag as optional D-452-04. |
| Remount closes an open modal in OrderEntry (merge/shift/payment) when switching table from inside | LOW–MEDIUM | Gate 3 code check of `initialShow*` props + 1 regression test each |
| S1 bump when OrderEntry is closed (grid click) | LOW | Guard `if (orderEntryType !== null)`; even unguarded, key change on a closed component is a no-op |
| Reversing BUG-334 without registry annotation → §F drift | MEDIUM | Bookkeeping list §2 — requires owner approval since BUG-334 is outside the sprint scope lock |
| R5 ×2 | — | Regression checklist mandatory (§6) |

## 6. Verification approach (seeds Gate 3 matrix)
1. Unit (RTL): render Dashboard→OrderEntry harness; add item; fire type change → cart length 0; `cartsByTable` has no non-empty entry.
2. Unit: table switch mid-build → same.
3. Unit: reopen old key → empty.
4. Browser (preprod, alias `cafe103_no_rooms_postpaid_gst`): INV repro Trigger 1 + Trigger 2 → EXPECTED empty on reopen.
5. Regression (R5/R13): walk-in place order → close → Add → empty; stay-on-order toggle ON → Collect Bill → fresh walk-in (PROD-004); occupied table open/edit/place; merge + shift flows; prepaid `onSelectTable(null)` path; sidebar Refresh with OrderEntry closed.
6. `yarn build` 0 new warnings; `grep -n "BUG-334" OrderEntry.jsx` shows the reversed comment only.

## 7. Scope lock (for Gate 3)
WILL change: `pages/DashboardPage.jsx` (2 handlers, additive), `components/order-entry/OrderEntry.jsx` (comment/dead-branch at :504–508 only), new test file.
WILL NOT touch: the OrderEntry effect logic (:378–503), `cartsByTable` plumbing, `handleCollectBillStayOnOrder`, `AppProviders.jsx`, CartPanel, orderTransform.
Outside sprint (needs owner OK): BUG-334 registry/tracker/IA annotation.

---
```
Impact Analysis complete: BUG-452
Code reality: NONE (BUG-334 code exists and is reversed) · Conflict: BUG-334 behavioural — resolved by OD-452-01; BUG-453 same file different lines — parallel-safe · Risk: HIGH
Files WILL change: pages/DashboardPage.jsx (+2–4 lines, R5), components/order-entry/OrderEntry.jsx (comment only, R5), new test
Files WILL NOT touch: OrderEntry effect logic, cartsByTable plumbing, CartPanel, orderTransform, AppProviders
Owner decisions: D-452-S (shape S1 remount vs S2 effect edit — rec S1) · approval to annotate BUG-334 as REVERSED · optional D-452-04 discard-confirm dialog (rec: no, per Option B)
Next: Gate 3 Implementation Plan (owner GO)
```
