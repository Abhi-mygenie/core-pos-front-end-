# QA Handover — CR-525 (After Bill Print → single Collect Bill)

**Date:** 2026-11-19
**Agent:** IMPLEMENTATION (Role 3)
**Risk:** HIGH (R5 cards, money-path entry) · FE-only · HIDE-ONLY
**Files changed:** `src/components/cards/TableCard.jsx`, `src/components/cards/OrderCard.jsx`
**Compile:** PASS (webpack compiled successfully, 0 new errors)

---

## Derived flag (both cards)
```js
showCollect = orderEditAccess && billPrinted && !isRoom && paymentType !== 'prepaid' && !isDelivery && !isAggregator
```
When `showCollect` is true at Served (fOrderStatus === 5): KOT + Bill (and Ready/Serve) are replaced by a single **Collect Bill** button, and tapping the card / pressing Enter opens the Collect Payment panel (`onBillClick`). HIDE-ONLY — no reverse logic.

## Edits
| # | File | Location | Change |
|---|------|----------|--------|
| E1a | TableCard.jsx | L148-149 | `showCollect` flag after `isEditLocked` |
| E1b | TableCard.jsx | L305-307 | `handleCardClick` → `onBillClick(table)` when `showCollect` |
| E2  | TableCard.jsx | L664-778 | fOS 5 block wrapped `showCollect ? <Collect Bill> : <existing KOT+rider+Bill/Settle>` |
| E3a | OrderCard.jsx | L123-124 | `showCollect` flag after `isEditLocked` |
| E3b | OrderCard.jsx | L465-466 | card `onClick`/`onKeyDown` → `onBillClick()` when `showCollect` |
| E4a | OrderCard.jsx | L1061 | KOT render gated with `&& !showCollect` |
| E4b | OrderCard.jsx | L1241-1304 | fOS 5 Bill block wrapped `showCollect ? <Collect Bill> : <existing Bill/Settle/rider>` |

## Verification Matrix (from plan — to execute)
| # | Test | Steps | Expected |
|---|------|-------|----------|
| V1 | Setting ON + dine-in + bill printed | orderEditAccess ON; print bill; view card | single "Collect Bill", no KOT |
| V2 | Setting OFF | same order, orderEditAccess OFF | normal KOT + Bill (unchanged) |
| V3 | Card tap / Enter | tap or Enter on printed card (setting ON) | opens Collect Payment panel |
| V4 | Room order | print bill on room order | C/Out unchanged (excluded) |
| V5 | Prepaid | prepaid at Served | Settle unchanged (excluded) |
| V6 | Delivery | delivery at Served | rider buttons unchanged (excluded) |
| V7 | Aggregator | aggregator any stage | unchanged (excluded) |
| V8 | Walk-in / Takeaway | bill printed, setting ON | shows Collect Bill (included) |
| V9 | fOS 1-2 | before bill print | KOT + Ready/Serve unchanged |
| V10 | Regression BUG-583 | bill printed → card bg | still green |
| V11 | Regression CR-512 | print-bill confirm flow | unchanged |
| V12 | Regression CR-489 | edit on locked order | edit still blocked |

## Credentials + Environment
- Owner (Cafe 103): `owner@cafe103.com` / `Qplazm@10`
- Preview URL: https://core-pos-app-8--1ufd2mpm.preview.emergentagent.com
- NOTE: requires `order_edit_access` (orderEditAccess) = ON for Cafe 103 and a Served + bill-printed dine-in order to exercise the included path. cafe103 default was `order_edit_access: "No"` per the plan's API probe — QA must enable the setting (or use a restaurant that has it ON) to see Collect Bill.

## Registry Sync
- registry.json: CR-525 → GATE_5A_IMPLEMENTED
- CR_REGISTRY.md: row updated
- FILE_OWNERSHIP.md: both files listed with CR-525 marker
- Code markers: `// CR-525` present in both files
