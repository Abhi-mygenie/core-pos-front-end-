# BATCH-A · G2 Rights (CR-492, CR-515) — Implementation Plan (Gate 3) — 2026-11-15

> Status: **GATE_3_PLAN_PARTIAL** — rights edits + comp reason (M5b Option B) READY; pay-later collect BLOCKED on BA-09.
> Build only after Gate 4 GO **and** QA pass of BUG-660/665/666 (CollectPaymentPanel) and BUG-656/662/CR-512 (OrderEntry).
> Mockups: M5 `#m5` (comp in payment), **M5b `#m5b` Option B — APPROVED 2026-11-15**, M7 `#m7` (rights buttons).

## 0. Owner decisions (R13–R15, 2026-11-15)
- Order-level comp: **discounts are independent** — no discount preset is hidden. The right will hide the future "Complimentary" payment button (CR-445, P1). Batch A CR-492 = **item comp checkbox only**.
- Comp reason required for full **and** part comp; **M5b Option B**: reason box under every comp line; block **Pay only** (Print Bill unchanged; bill never prints the reason).
- Existing comp on an order opened by a user without the right → read-only.
- R15: comp line with no reason + cashier **without** the right → **Pay stays blocked** (a user with the right must add the reason).
- Collect pay-later right → wait for **BA-09**.

## 1. Code reality (verified at HEAD 2026-11-15)
| File | Line | Current |
|---|---|---|
| `CollectPaymentPanel.jsx` | L88 | `useRestaurant()` — no `useAuth` import; no right check anywhere in the file |
| same | L155-L164 | `isLineComplimentary(item)` (full) / `isPartialComp(item)` (part, BUG-298) |
| same | L2102-L2125 | Dine-in list: `isComp`, `isPartial`; comp checkbox `complimentary-checkbox-${id}`; qty>1 → `onSetCompItem` (MarkCompModal), qty 1 → `onToggleComplimentary` |
| same | L2140-L2151 | Reason input only `isComp && !isCatalogLocked`; placeholder `Reason (optional)`; testid `comp-reason-input-${id}` — **part-comped lines have no box** |
| same | L2490-L2542 | Second list: same checkbox + reason input (L2533-L2542) |
| same | L3501-L3510 | Pay button `onClick={handlePayment}`, inline `disabled={...}` list of conditions |
| `orderTransform.js` | L636-L648 | `expandCompItems` splits part comp into comp line + normal line; comp line keeps `compReason` (spread) → L794 `complementary_reason` sent. No change needed. |
| `OrderEntry.jsx` | L1085, L2161-L2163 | `setCompReason` (itemId, reason); passes `onSetCompReason`, `onSetCompItem` |
| `CollectBillPanelDrawer.jsx` | L265-L285 | CPP with `onToggleComplimentary={null}`, no `onSetCompReason` |
| `CartPanel.jsx` | L595-L607 | QSR discount presets — **not touched** |
| `OrderReportBetaPage.jsx` | L4-L30 | no `useAuth`; L700-L780 change-method picker + Mark Unpaid shown to **all** users |
| `AllOrdersReportPage.jsx` | L132, L605-L625 | already gated by `update_payment` / `order_unpaid` — reference pattern |
| Probe 2026-11-15 (RID 644 Owner) | — | `complementary_food`: **False** (R-1 confirmed); `update_payment`, `order_unpaid`, `order_cancel`: True; profile `complementary`: "No" |

## 2. Conflict pre-check
| File | Open items | Overlap |
|---|---|---|
| CollectPaymentPanel.jsx | BUG-660 (L545-L692), BUG-665 (L852-L860, L3044), BUG-666 (L282-L319, L785-L788) | No overlap → build after QA, recheck lines |
| orderTransform.js | BUG-639 (Gate 3: updateOrder missing `expandCompItems`) | Not edited by G2; see Risk 3 |
| OrderReportBetaPage.jsx / CollectBillPanelDrawer.jsx | none open | — |

## 3. Exact edits — READY
| # | Item | File / line | Change |
|---|---|---|---|
| G2-E1 | CR-492 | CPP imports + L88 | import `useAuth` from `../../contexts`; `const { hasPermission } = useAuth(); const canMarkComp = hasPermission('complementary_food');` |
| G2-E2 | CR-492 / M5 | CPP L2110-L2125 | Render checkbox only when `canMarkComp \|\| isCatalogLocked`. Without the right: no checkbox; existing comp lines still show `(Complimentary)` + ₹0. |
| G2-E3 | CR-492 / M5b-B | CPP L2140-L2151 | Condition `isComp && !isCatalogLocked` → `(isComp \|\| isPartial) && !isCatalogLocked`. Placeholder `Reason (optional)` → `Reason (required)`. Red border while empty. `readOnly` when `!canMarkComp` (OD-492-A). |
| G2-E4 | CR-492 | CPP L2499-L2542 | Same as E2 + E3 for the second list. |
| G2-E5 | CR-492 / M5b-B | CPP after L177 | `const missingCompReason = activeItems.some(i => i.isComplementary !== true && i.status !== 'cancelled' && (isLineComplimentary(i) \|\| isPartialComp(i)) && !(i.compReason \|\| '').trim());` |
| G2-E6 | CR-492 / M5b-B | CPP L3503 Pay `disabled` | add `\|\| missingCompReason`. Print Bill not changed. Applies to every user (R15). |
| G2-E7 | CR-515 / M7 | OrderReportBetaPage L4 + top of component | import + `const { hasPermission } = useAuth();` |
| G2-E8 | CR-515 / M7 | OrderReportBetaPage L700-L780 | Change-method picker only if `hasPermission('update_payment')`; Mark Unpaid only if `hasPermission('order_unpaid')` (same rule as AllOrdersReportPage L605-L625). |

## 4. BLOCKED
| # | Item | Waits on | What will change |
|---|---|---|---|
| G2-B1 | CR-515 collect pay-later | **BA-09** right key | CollectBillPanelDrawer Hold-tab Collect button gated by the confirmed key. |
| G2-B2 | CR-492 server enforcement | **BA-07** | Backend only. |
| G2-B3 | CR-492 restaurant flag | **BA-08** | Profile `complementary` ("No" on RID 644) — if it interacts with the right, `canMarkComp` adds the flag. |
| — | CR-445 comp payment button | P1 (not Batch A) | Right hides the button (owner R14-Q2). Carried to CR-445 Gate 3. |

## 5. Scope lock
CPP comp checkbox/reason areas, `missingCompReason` + Pay disabled rule, OrderReportBetaPage buttons. NOT touched: discount presets (CPP L1505-L1585, CartPanel L595-L607), MarkCompModal, Print Bill, billing math, orderTransform, AllOrdersReportPage, Room orders gating, reprint (P1).

## 6. Risks
1. **R-1 (confirmed by probe):** cafe103 (RID 644) Owner has no `complementary_food` → loses the comp checkbox on release. Backend/admin must grant before release.
2. **R15 consequence:** an old comp line without a reason blocks Pay for cashiers without the right — and in the reports Collect Bill drawer for everyone (drawer has no `onSetCompReason`). A user with the right must add the reason on the order screen. Release note to support.
3. Part-comp reason reaches backend through `expandCompItems` (place-order path). Update-order path lacks it (BUG-639, Gate 3) → part-comp reason may not save on that path until BUG-639 ships. Sequence BUG-639 before or with G2.
4. Orders Beta: users without `update_payment`/`order_unpaid` lose buttons they use today (intended).

## 7. Execution order
E1 → E2 + E3 + E4 → E5 + E6 → E7 + E8 → (after BA-09) B1.

## 8. Verification matrix
| # | Flow | Expected |
|---|---|---|
| V1 | User without `complementary_food` → Collect Bill | No comp checkbox (both lists) |
| V2 | Same user, order has comp line with reason | (Complimentary) ₹0 + reason read-only; Pay enabled |
| V3 | Same user, order has comp line WITHOUT reason | Red empty read-only box; Pay disabled |
| V4 | User with right, full comp, reason empty | Box "Reason (required)" red; Pay disabled; Print Bill works |
| V5 | User with right, part comp 1 of 3 | Reason box shown under line; Pay disabled until filled |
| V6 | Reason typed | Pay enabled; payload comp line `complementary_reason` = text |
| V7 | Catalog-complimentary item | No box, no block (unchanged) |
| V8 | Discount presets (incl. 100%) | Unchanged for everyone |
| V9 | Orders Beta without `update_payment` / `order_unpaid` | Picker / Mark Unpaid hidden |
| V10 | Orders Beta with both | Unchanged |
| V11 | Build / tests | 0 new errors |

## 9. Registry checklist
FILE_OWNERSHIP blocks · CR_REGISTRY + registry.json (CR-492, CR-515) · decisions log R13–R15 · tracker BA-07/08/09 open.

## 10. Mockup links
M5 (E2-E4) · M5b Option B (E3-E6) · M7 (E7-E8).
