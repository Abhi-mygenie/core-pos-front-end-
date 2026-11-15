# BATCH-A · CR-492 (Comp rights + comp reason) — Implementation Plan (Gate 3) — 2026-11-15

> Status: **GATE_3_PLAN_FROZEN (READY rows) — 2026-11-15**. FROZEN: G2-E1…E6. BLOCKED: G2-B3 (BA-08, Gyan reply pending — skipped). QA check (R16, not blocker): G2-B2 (BA-07).
> Re-anchored at HEAD `66ffe518` (2026-11-15): all READY row line numbers verified — no shifts from b5d7a42.
> Source rows: G2 E1–E6 + B2, B3 (moved unchanged from `plans/BATCH-A_G2_RIGHTS_IMPLEMENTATION_PLAN_2026_11_15.md`, now superseded).
> Risk: CRITICAL. Mockups: M5 `#m5`, M5b Option B `#m5b` (approved R15).
> Decisions: OD-492-A (no right → checkbox hidden, existing comp read-only) · OD-492-B (hide for everyone) · R14 (item comp checkbox only; discounts independent; reason required full + part; blocks Pay only) · R15 (no right + no reason → Pay blocked).
> Build only after Gate 4 GO **and** QA pass BUG-660/665/666 (CPP). Sequence BUG-639 before or with this CR. Release only after R-1.
> **G2-B3 stays BLOCKED pending Gyan reply to BA-07/08. Do not implement B3 until unblocked.**

## 1. Code reality — rechecked at HEAD `b5d7a42` 2026-11-15 (Code Reality: NONE for rights; PARTIAL for reason box)
| File | Line | Current |
|---|---|---|
| `components/order-entry/CollectPaymentPanel.jsx` | L4 | `import { useRestaurant, useTables, useSettings, useMenu } from "../../contexts";` — no `useAuth` |
| same | L88 | `useRestaurant()` — no right check in file |
| same | L147 | `activeItems` useMemo |
| same | L155-L164 | `isLineComplimentary(item)` / `isPartialComp(item)` |
| same | L2102-L2125 | Room-service list: checkbox `complimentary-checkbox-${id}` (L2123), `disabled={isCatalogLocked \|\| isCancelled}` (L2114) |
| same | L2141-L2151 | Reason input only `isComp && !isCatalogLocked`; placeholder `Reason (optional)` L2145 — part-comp lines have no box |
| same | L2490-L2542 | Second list: checkbox L2515 (disabled L2504) + reason L2533-L2542 (placeholder L2537) |
| same | L3502-L3510 | Pay `onClick={handlePayment}` L3502, `disabled={` L3503 |
| same | L1573, L2246 | Discount reason placeholders — NOT comp, NOT touched |
| `api/transforms/orderTransform.js` | L636 | `expandCompItems` — comp line keeps `compReason` → `complementary_reason`. No change |
| Probe RID 644 Owner | — | `complementary_food`: **False** (R-1); profile `complementary`: "No" |

## 2. Conflict pre-check
| File | Open item(s) | Overlap |
|---|---|---|
| CollectPaymentPanel.jsx | BUG-660 (L545-L692), BUG-665 (L852-L860, L3044), BUG-666 (L282-L319, L785-L788) | No overlap → build after QA, recheck |
| orderTransform.js | BUG-639 (updateOrder missing `expandCompItems`) | Not edited; see Risk 3 |

## 3. Shared files (Batch A)
| File | Other Batch A CRs | Order |
|---|---|---|
| CollectPaymentPanel.jsx | CR-494 (discount + comp PIN, TBD), CR-495 (room comp line, TBD) | CR-492 → CR-494 → CR-495 |
| CollectBillPanelDrawer.jsx (read only here) | CR-515 (B1) | CR-492 → CR-515 B1 |

## 4. Exact edits — READY
| # | File / line | Current → New |
|---|---|---|
| G2-E1 | CPP L4 + L88 | add `useAuth` to contexts import; `const { hasPermission } = useAuth(); const canMarkComp = hasPermission('complementary_food');` |
| G2-E2 | CPP L2110-L2125 (M5) | Render checkbox only when `canMarkComp \|\| isCatalogLocked`. Without right: no checkbox; comp lines still show `(Complimentary)` + ₹0 |
| G2-E3 | CPP L2141-L2151 (M5b-B) | `isComp && !isCatalogLocked` → `(isComp \|\| isPartial) && !isCatalogLocked`; `Reason (optional)` → `Reason (required)`; red border while empty; `readOnly` when `!canMarkComp` |
| G2-E4 | CPP L2499-L2542 | Same as E2 + E3 for the second list |
| G2-E5 | CPP after L164 (helpers) | `const missingCompReason = activeItems.some(i => i.isComplementary !== true && i.status !== 'cancelled' && (isLineComplimentary(i) \|\| isPartialComp(i)) && !(i.compReason \|\| '').trim());` |
| G2-E6 | CPP L3503 Pay `disabled` | add `\|\| missingCompReason`. Print Bill unchanged. Applies to every user (R15) |

## 5. BLOCKED edits
| # | Needs | What will change |
|---|---|---|
| G2-B2 | **BA-07** | **QA check (R16)** — backend rejects `is_complementary=Yes` without right; QA verifies |
| G2-B3 | **BA-08** | If restaurant `complementary` flag interacts with the right, `canMarkComp` adds the flag |

## 6. Scope lock
WILL change: CollectPaymentPanel.jsx (imports, L88, helper after L164, comp checkbox/reason L2102-L2151 + L2490-L2542, Pay disabled L3503).
Will NOT touch: discount presets (CPP L1505-L1585, CartPanel L595-L607), MarkCompModal, Print Bill, billing math, orderTransform, AllOrdersReportPage, CR-445 payment button (P1).

## 7. Risks
1. **R-1 (probe-confirmed):** RID 644 / RID 541 owners lack `complementary_food` → lose comp on release. Backend/admin must grant before release.
2. **R15:** old comp line without reason blocks Pay for cashiers without the right, and in the reports Collect Bill drawer for everyone (no `onSetCompReason`). Release note to support.
3. Part-comp reason on update-order path depends on BUG-639.

## 8. Execution order
E1 → E2 + E3 + E4 → E5 + E6 → verify B2/B3 after reply.

## 9. Verification matrix
| # | Edit | Flow | Expected | Automated? |
|---|---|---|---|:---:|
| V1 | E2/E4 | No `complementary_food` → Collect Bill | No comp checkbox (both lists) | NO |
| V2 | E3 | Same user, comp line with reason | (Complimentary) ₹0 + reason read-only; Pay enabled | NO |
| V3 | E3/E6 | Same user, comp line WITHOUT reason | Red read-only box; Pay disabled | NO |
| V4 | E3/E6 | With right, full comp, reason empty | "Reason (required)" red; Pay disabled; Print Bill works | NO |
| V5 | E3/E5 | With right, part comp 1 of 3 | Reason box under line; Pay disabled until filled | NO |
| V6 | E5/E6 | Reason typed | Pay enabled; payload `complementary_reason` = text | NO |
| V7 | E2 | Catalog-complimentary item | No box, no block | NO |
| V8 | — | Discount presets (incl. 100%) | Unchanged | NO |
| V9 | all | Build / tests | 0 new errors | YES |
| V10 | B2 (QA) | Comp save by user without right (direct API) | Backend rejects | NO |

## 10. Post-code registry checklist
- [ ] FILE_OWNERSHIP blocks · [ ] `registry.json` + `CR_REGISTRY.md` CR-492 · [ ] tracker BA-07/08 · [ ] marker `// CR-492`

## 11. Mockup links
M5 → E2, E4 · M5b Option B → E3–E6.
