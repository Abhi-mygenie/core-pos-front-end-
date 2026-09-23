# BUG-452 — Stale cart restored from `cartsByTable[oldKey]` after order-type / table switch mid-build — INTAKE 2026-09-23

Source: **OWNER-REPORTED** ("sometimes after placing order and clicking Add again, old items still show in cart. Happens very rarely.") → investigated 2026-09-18 as `INV-CART-PERSIST-001` (`investigations/INVESTIGATION_2026_09_18_CART_PERSIST_AFTER_ORDER.md`) → validated + registered 2026-09-23 (INTAKE role, ALPHA v0.7).
Sprint: **`sep_bug_closure`** (owner 2026-09-23). Gate: **1 (INTAKE)**.

## Classification
| Field | Value |
|---|---|
| Type | BUG |
| Severity | **P2 — MEDIUM** (order-flow correctness, but rare: only on type/table switch mid-build; straight-through flow is clean; cashier can remove items) |
| Risk | **HIGH** — order flow; touches `DashboardPage.jsx` and/or `OrderEntry.jsx`, **both R5 hotspots** |
| RCA classification | CODE_ERROR (copy-on-switch instead of move-on-switch) |
| Confidence | **REPORTED** (owner-observed, not yet reproduced by agent; repro steps below are code-derived) |
| Code reality | **NONE** — no fix present at HEAD `1be4055` |
| Fast Lane eligible | NO (R5 hotspot, order flow) |
| Planning skip eligible | **NO** — the investigation's "DashboardPage is not R5" claim is wrong (R5 lists `DashboardPage.jsx` explicitly; HIGH-RISK FILE TRAPS names this exact trap) |

## Symptom
Cashier opens Add (walk-in) → adds items → switches type (Walk-In ▾ → TakeAway/Delivery) or picks a table from the header dropdown → closes without placing → clicks Add again → the earlier items reappear in the walk-in cart. Same for reopening Table A after switching A → B mid-build.

## RCA (code-read, confirmed against HEAD 2026-09-23)
| File | Line | Code | Role |
|---|---|---|---|
| `src/pages/DashboardPage.jsx` | 453 | `const [cartsByTable, setCartsByTable] = useState({})` | Session-long store |
| `src/pages/DashboardPage.jsx` | 2069–2070 | `savedCart={cartsByTable[orderEntryTable?.id \|\| orderEntryType] \|\| []}` / `onCartChange={(key, items) => setCartsByTable(prev => ({ ...prev, [key]: items }))}` | Read on mount / **write on key change** |
| `src/pages/DashboardPage.jsx` | 1504–1511 / 1462–1497 | `handleOrderTypeChange` / `handleTableClick` set a non-null type → OrderEntry stays **mounted** | Trigger 1 / Trigger 2 |
| `src/pages/DashboardPage.jsx` | 1513–1520 / 2058 | `handleCloseOrderEntry` → `setOrderEntryType(null)` → `{orderEntryType && <OrderEntry/>}` unmounts | Normal close never writes (why it is rare) |
| `src/pages/DashboardPage.jsx` | 545, 1540 | `setCartsByTable({})` on manual refresh; `[cartKey]: []` on stay-on-order (PROD-004) | Only clear paths |
| `src/components/order-entry/OrderEntry.jsx` | 378–391 | `useEffect([table?.id, orderType])`: `if (oldKey && oldKey !== newKey) onCartChange(oldKey, cartItems)` then `if (savedCart.length > 0) setCartItems(savedCart)` | **THE WRITE** (:385) + restore (:390–391) |
| `src/components/order-entry/OrderEntry.jsx` | 504–508 | `// BUG-334 … Carry current cartItems forward` (no clear on switch) | Items also carried to the new key — by design |

Mechanism: on a key switch while mounted, the effect **copies** `cartItems` into `cartsByTable[oldKey]` and (BUG-334) **also carries them forward** in the live cart. The old key is never cleared → next open of that key restores the copy. `key={orderEntryResetNonce}` (:2061) only bumps in the stay-on-order path, so it does not help here.

## Evidence
- Screenshot: not provided
- Steps to reproduce (code-derived; OrderEntry is `fixed inset-0 z-50`, so both switches happen via the **"Walk-In ▾" header badge**, not the dashboard grid):
  1. Login (alias `cafe103_no_rooms_postpaid_gst`, RID 644) → **Add** → add 2 items
  2. Header badge → **TakeAway** (Trigger 1) — or scroll the same dropdown to the table list → pick a table (Trigger 2)
  3. Close with **X** without placing → **Add** again → EXPECTED empty cart · ACTUAL earlier items present
- Code grep: `evidence/BUG-452/BUG-452_code_grep_2026_09_23.txt`
- Source: OWNER-REPORTED · Confidence: REPORTED

## Duplicate check
**RELATED — with one behavioural CONFLICT.**
| Item | Relation |
|---|---|
| **BUG-334** "Pre-Place Table Switch Clears Food Cart" — CLOSED, OWNER VERIFIED 2026-08-20 (`OrderEntry.jsx:506` marker) | **CONFLICT.** BUG-334 deliberately *carries the cart forward* on type/table switch. INV-CART-PERSIST-001 locked OD-1/OD-2 = "always clear on switch", which would **reverse** BUG-334. The investigation missed BUG-334 (no duplicate check); its repro step "cart appears empty after switch" is not true at HEAD. |
| INV-OE-001 (2026-08-17) | Parent investigation of BUG-334 — same `useEffect` |
| PROD-004 / PROD-HOTFIX-004 "Walk-in cart not cleared on stay-on-order" — SHIPPED 2026-05-27 | Same store, different path (`:1540`) |

**Not a duplicate:** the remaining defect (stale copy left under the *old* key) exists regardless of which switch behaviour the owner wants.

## Blast radius
- `cartsByTable|savedCart|onCartChange` references: see evidence (2 files)
- Files: 1–2 (`DashboardPage.jsx` :2070 handler and/or `OrderEntry.jsx` :383–386) — **SMALL** in lines, **HIGH** in risk
- Hotspots: **YES — `DashboardPage.jsx` + `OrderEntry.jsx` (both R5)**

## Owner decisions
| # | Decision | Status |
|---|---|---|
| **OD-452-01** | Switch behaviour: **(a)** keep BUG-334 carry-forward and make the switch a *move* (clear `cartsByTable[oldKey]` when items are carried) — consistent with BUG-334, minimal; **(b)** "always clear on switch" as locked in INV-CART-PERSIST-001 OD-1/OD-2 — **reverses BUG-334 (owner-verified)**; requires explicit re-confirmation and a note on BUG-334 | **REOPENED — owner asked "is there any conflict?" → YES, see above. No other item modified (owner instruction).** |
| OD-452-02 | Fix location: `DashboardPage.jsx:2070` handler vs `OrderEntry.jsx:383–386` save branch. **Note:** INV Option A (clear inside `handleOrderTypeChange` *before* `setOrderEntryType`) does **not** work — the OrderEntry effect fires after the type change and re-writes the old key. | OPEN (Planning) |

## Investigation-doc validation notes (2026-09-23)
Root-cause trace VALID. Invalid/stale: R5 claim (DashboardPage), planning-skip eligibility, Option A fix location, "only cleared by stay-on-order" (also `:545`), §5 heading "grid click" vs §11, bare `OrderEntry.jsx` path, **raw password printed in §11 (R20 violation — must be masked when the doc is next edited)**, missing duplicate check (BUG-334). Doc **not modified** (owner instruction).

## Next
Planning Gate 2 — blocked on **OD-452-01**. IA must read BUG-334 intake/plan (`impact/BATCH-04_IMPACT_ANALYSIS.md`) and FILE_OWNERSHIP for `OrderEntry.jsx`/`DashboardPage.jsx`; R5 regression checklist mandatory (walk-in R13, stay-on-order PROD-004, BUG-334 carry-forward).
