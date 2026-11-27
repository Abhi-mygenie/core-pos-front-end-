# Handover — Gate 3 Implementation Planning: 11 FE-independent items — 2026-11-15

## 0. Your role and rules

- **Role: PLANNING — Gate 3.** Write one per-CR/BUG implementation plan for each of the 11 items below. Documents only: **zero app code** (`frontend/src` untouched). No implementation, no QA. No item moves to Gate 4 (implementation) until the owner gives Gate 4 GO.
- **Read first:** `memory/control/AGENT_PROMPT_ALPHA.md` (risk levels, approval matrix, file hotspots R5, plan format). These 11 items include CRITICAL-risk files — follow the full protocol.
- **One plan per item**, in `memory/plans/BATCH-<X>_<ID>_IMPLEMENTATION_PLAN_2026_11_15.md`. Two plans already exist and are referenced in §2.
- **Re-anchor every plan to HEAD** (`git log --oneline -1` → record commit hash in plan header). Do NOT use line numbers from IA docs blindly — verify at HEAD before writing.
- **Ask before guessing** any line number, function name, or prop. Use grep/search to confirm. If a conflict is unresolvable without an owner decision, stop and ask.
- **Sequencing is mandatory** — several items edit the same files. Follow the sequence in §4 exactly.
- No real customer or masked data in any plan.

---

## 1. Items to plan (11 total, in execution order)

| # | Batch | ID | Risk | Backend? | Plan file | Status |
|---|---|---|---|---|---|---|
| 1 | A | CR-372-B | MEDIUM | None | `BATCH-A_CR-372-B_IMPLEMENTATION_PLAN_2026_11_15.md` | **FROZEN** — read only, no changes |
| 2 | C | BUG-675 | LOW | None | `BATCH-C_BUG-675_IMPLEMENTATION_PLAN_2026_11_15.md` | Write now |
| 3 | D | BUG-667 | LOW | None | `BATCH-D_BUG-667_IMPLEMENTATION_PLAN_2026_11_15.md` | Write now |
| 4 | B | CR-394 | LOW | None (data fix = Gyan separately) | `BATCH-B_CR-394_IMPLEMENTATION_PLAN_2026_11_15.md` | Write now |
| 5 | B | BUG-671 | HIGH | None | `BATCH-B_BUG-671_IMPLEMENTATION_PLAN_2026_11_15.md` | Write now |
| 6 | D | BUG-669 | MEDIUM | None (add-on part only) | `BATCH-D_BUG-669_IMPLEMENTATION_PLAN_2026_11_15.md` | Write now (add-on only) |
| 7 | D | BUG-673 | MEDIUM (R5) | None | `BATCH-D_BUG-673_IMPLEMENTATION_PLAN_2026_11_15.md` | Write now — same agent as CR-523 |
| 8 | D | CR-523 | MEDIUM (R5) | None (save/change only) | `BATCH-D_CR-523_IMPLEMENTATION_PLAN_2026_11_15.md` | Write now — same agent as BUG-673 |
| 9 | A | CR-492 | CRITICAL | None (READY rows only) | `BATCH-A_CR-492_IMPLEMENTATION_PLAN_2026_11_15.md` | **EXISTS, NOT FROZEN** — extend/freeze READY rows only |
| 10 | B | BUG-672 | CRITICAL | None | `BATCH-B_BUG-672_IMPLEMENTATION_PLAN_2026_11_15.md` | Write now |
| 11 | C | CR-503 | HIGH | None | `BATCH-C_CR-503_IMPLEMENTATION_PLAN_2026_11_15.md` | Write now |

---

## 2. Plans that already exist

### CR-372-B — `plans/BATCH-A_CR-372-B_IMPLEMENTATION_PLAN_2026_11_15.md`
**Status: GATE_3_PLAN_FROZEN 2026-11-15** (owner approved R16). Do not modify. The implementation agent reads and executes this plan as-is. No action needed from you. For reference: deletes `/settlement/preview` demo route, guards `/local-printer-setup` with login check.

### CR-492 — `plans/BATCH-A_CR-492_IMPLEMENTATION_PLAN_2026_11_15.md`
**Status: GATE_3_PLAN_READY_FE — NOT FROZEN.** READY rows G2-E1…E6 (hide comp for users without `complementary_food` right). BLOCKED row G2-B3 (BA-08, Gyan's right confirmation) — **skip entirely**. Your job: review the READY rows at HEAD (re-anchor line numbers), confirm no conflicts introduced by this session's memory changes, then mark the plan **FROZEN** for the READY rows only. Add a note: "G2-B3 stays BLOCKED pending Gyan reply to BA-07/08." Risk: CRITICAL — full approval protocol applies.

---

## 3. Per-item implementation notes

### BUG-675 (Batch C) — LOW — `SettlementPanel.jsx` + `SettlementPage.jsx`
**What:** Remove the "Total sale: ₹X" subtitle under the Cash Collected KPI card.
**Lines (verify at HEAD):**
- `SettlementPanel.jsx` L249: `sub={<span>Total sale: ₹{X}</span>}` → remove the `sub` prop
- `SettlementPage.jsx` L224: same pattern → remove
- `SettlementMockup.jsx` L181 — do NOT touch (CR-372-B deletes the whole file separately)
**Conflict:** CLEAR. No other open items on these files.

---

### BUG-667 (Batch D) — LOW — Sidebar + PMS headers
**What:** Wrap long restaurant name onto 2 lines in (a) Sidebar bottom "Name · #ID" line and (b) restaurant name next to the date in PMS page headers.
**Files (verify at HEAD):**
- `Sidebar.jsx` ~L886-889: "Name · #ID" line — parent likely needs `min-w-0`; remove `truncate`, add `break-words` or `line-clamp-2`
- `FrontDeskPage.jsx`, `ReservationsPage.jsx`, `RoomStatusPage.jsx`: header restaurant name — 2-line wrap
**Conflict:** `Sidebar.jsx` — BUG-570 / CR-435 (5A sprint) on a different block; confirm no overlap at HEAD.

---

### CR-394 (Batch B) — LOW — `AddCustomItemModal.jsx`
**What:** Remove the Inclusive GST option from open/custom items. Custom items always Exclusive (OD-394-A).
**Change:** In `AddCustomItemModal.jsx`, find the GST calculation dropdown (Inclusive / Exclusive options) and either remove Inclusive from the list or force default to Exclusive and hide the choice. FE already defaults to Exclusive (CR-348 code exists).
**Note:** BB-13 (Gyan's one-time data fix) is SEPARATE — Gyan converts existing Inclusive products server-side. FE change is UI-only.
**Conflict:** Check `AddCustomItemModal.jsx` for any BUG-392/394/608 (5A sprint) open items on the same price inputs.

---

### BUG-671 (Batch B) — HIGH — `OrderTable.jsx`
**What:** Show Unpaid button on partly-paid (`partial`) orders in Audit report.
**Root cause:** `PAID_ACTIONS_ALLOWED_METHODS` array at `OrderTable.jsx` L248 is `['cash','card','upi']` — `partial` is missing.
**Fix:** Add `'partial'` to the array. Scope: Unpaid only (OD-671-A). Change Method for split = Phase 2.
**Conflicts:**
- `OrderReportBetaPage.jsx` — touched by Batch A CR-515 (Gate 3 plan: row-action buttons). **BUG-671 edits `OrderTable.jsx` only** — verify at HEAD that CR-515 Gate 3 edits do not redefine the same array.
- `AllOrdersReportPage.jsx` — CR-526 (Batch B, waiting backend), CR-528 (Batch C, waiting backend). BUG-671 touches `OrderTable.jsx` NOT `AllOrdersReportPage.jsx` directly — confirm import chain at HEAD.
**Risk escalation trigger:** if `PAID_ACTIONS_ALLOWED_METHODS` is shared state or imported in >1 place, treat as CRITICAL and ask owner.

---

### BUG-669 — add-on part only (Batch D) — MEDIUM — `AddonManagementPanel.jsx`
**What:** Block saving an add-on with an empty price field. Allow ₹0. Message: "Enter a price (0 is allowed)" (OD-669-A).
**Root cause:** `AddonManagementPanel.jsx` L48 blocks on `!addForm.price` — this fails for the value `0` (falsy). Fix: change guard to `addForm.price === '' || addForm.price === null || addForm.price === undefined`.
**Scope:** Add-on part ONLY. Variation part (ProductForm.jsx / VariationExpandPanel.jsx) = PHASE 2 (owner: "where does it fail?" — not answered yet).
**Conflict:** BUG-608 (5A sprint) on the same price inputs in `ProductForm.jsx` — different file, verify no shared component.

---

### BUG-673 (Batch D) — MEDIUM (R5 hotspot) — `OrderEntry.jsx`
**What:** Fix Enter key behaviour: (a) empty search box → no item highlighted, Enter does nothing (OD-673-A); (b) after mouse-click add → clear search + refocus search box (OD-673-B).
**Files:** `OrderEntry.jsx` L119-121 (search state), L636-654 (highlight logic), L761-803 (Enter handler), L2075-2095 (add logic)
**R5 hotspot rules:** `OrderEntry.jsx` is flagged HIGH-RISK in `AGENT_PROMPT_ALPHA.md`. Verify every anchor line at HEAD. Plan must list affected functions by name, not just line numbers.
**Conflict:** `OrderEntry.jsx` also carries CR-523 (below), BUG-656 (L2919 customer lock, 5A), CR-512, BUG-662. **Write BUG-673 and CR-523 plans in the same session so line anchors are consistent.** The implementation agent should do BUG-673 first, then CR-523, in the same branch.

---

### CR-523 — save/change part only (Batch D) — MEDIUM (R5) — `OrderEntry.jsx` + `CartPanel.jsx`
**What:** Let cashier link or change a customer on a placed order directly (without Update/Complete). Saved immediately on pop-up save (OD-523-D). Works after bill print when `order_edit_access` is ON (OD-523-A).
**Scope: save/change ONLY.** Remove customer (cust_remove: empty name+mobile = unlink) = NOT in this plan — waits for Gyan's BD-06 reply.
**Files:** `OrderEntry.jsx` L3149-3163 (customer section), L2919 (customer lock with `order_edit_access`); `CartPanel.jsx` (customer display)
**Conflict note:** `OrderEntry.jsx` — same file as BUG-673. Plan together with BUG-673 (same session, same agent). Both plans must anchor to the same HEAD commit. BUG-656 (L2919) overlaps: check whether Batch A Gate 3 for BUG-656 has already edited L2919 at HEAD.

---

### BUG-672 (Batch B) — CRITICAL — `profileTransform.js`, `orderTransform.js`, `CollectPaymentPanel.jsx`
**What:** Fix Credit (TAB) payment on prepaid orders.
**Root causes (two separate fixes):**
1. `profileTransform.paymentTypes` (L276-283): drops `prepaid`/`postpaid` flags. Fix: keep them so CPP can read them.
2. `orderTransform.placeOrderWithPayment` (L1294, L1391-1396): no TAB handling (no `credit→TAB` map, no `success` status, no `name/mobile/crm_customer_id`). Fix: mirror the `collectBillExisting` TAB path (L1539, L1665, L1754-1757).
3. CPP `filterLayoutByApiTypes` (or equivalent): hide Credit button when the order is prepaid and TAB `prepaid: 0`.
**Conflicts — CRITICAL to check before writing a single plan line:**
- `CollectPaymentPanel.jsx` (CPP) is edited by Batch A CR-492 (comp) and CR-494 (PIN) Gate 3 plans. **BUG-672 edits CPP and `orderTransform.js` → must rebase on Batch A Gate 3 CPP/orderTransform lines.** Check which Batch A plans touch these files and what lines they change. If Batch A Gate 3 is not yet implemented, write BUG-672 plan assuming current HEAD; note the rebase requirement in the plan.
- `profileTransform.js` — no known open edits; confirm at HEAD.
**Risk: CRITICAL.** Money path (credit ledger). Full AGENT_PROMPT_ALPHA approval protocol. Owner confirms final plan before Gate 4.

---

### CR-503 (Batch C) — HIGH — `OrderReportBetaPage.jsx`, `CollectBillPanelDrawer.jsx`
**What:** Add Collect + Print Bill pop-up for Pay Later / Hold orders in Order Beta.
**How:**
- Identify Hold/Pay Later rows: `f_order_status === 8 || f_order_status === 9` (probe a real Hold order at HEAD to confirm which code is live — see Hold order #000498 on foodimal.com; Hold status code TBD = Gate 3 probe).
- Add a "Collect" button to Hold rows in `OrderReportBetaPage.jsx` (similar to Audit's existing Collect action).
- Open `CollectBillPanelDrawer` (already used in Audit). Wire `onPrintBill` prop.
- Right gate: `order_unpaid` permission (CR-515, Batch A — adds the right; plan must handle the case where right doesn't exist yet).
**Conflicts:**
- `OrderReportBetaPage.jsx`: Batch A CR-515 Gate 3 plan edits row-action buttons. BUG-645 code at L81-88, L179, L214, L497, L622 **must stay intact** (partial payment filter). CR-526 (Batch B), CR-503 (this) → stagger commits or share branch.
- `CollectBillPanelDrawer.jsx`: CR-515 (rights gating later) — no current edit; confirm at HEAD.
**Gate 3 probe first:** confirm the Hold `f_order_status` code from order #000498 (foodimal.com) before writing the row-filter predicate into the plan.

---

## 4. Sequencing and file-conflict map

Execute plans in this order. Items that share a file must be in the same Gate 3 branch or rebased carefully.

```
Step 1: BUG-675          → SettlementPanel/Page (isolated, 2 lines)
Step 2: BUG-667          → Sidebar + PMS headers (isolated)
Step 3: CR-394           → AddCustomItemModal (isolated)
Step 4: BUG-671          → OrderTable.jsx (verify CR-515 rebase need)
Step 5: BUG-669          → AddonManagementPanel.jsx (isolated add-on part)
Step 6: BUG-673 + CR-523 → OrderEntry.jsx (SAME BRANCH — plan together)
Step 7: BUG-672          → profileTransform + orderTransform + CPP (rebase on Batch A A plans)
Step 8: CR-492           → extend existing plan, freeze READY rows
Step 9: CR-503           → OrderReportBetaPage + CollectBillPanelDrawer
```

CR-372-B: plan already FROZEN — no work needed. Pass directly to implementation.

**Files shared across items:**
| File | Items that touch it |
|---|---|
| `OrderEntry.jsx` | BUG-673, CR-523 — plan together |
| `CollectPaymentPanel.jsx` (CPP) | BUG-672, Batch A CR-492, CR-494 (Gate 3) |
| `orderTransform.js` | BUG-672, Batch A CR-492, CR-494 |
| `OrderReportBetaPage.jsx` | CR-503, BUG-671 (indirect via import), Batch A CR-515 |

---

## 5. Output format (one plan per item)

Each plan file must have:
```
# BATCH-<X> · <ID> (<title>) — Implementation Plan (Gate 3) — 2026-11-15
> Status: GATE_3_PLAN_DRAFT (or FROZEN after owner GO)
> HEAD commit: <hash>
> Risk: <level>
> Conflicts: <list or CLEAR>

## 1. What changes (plain English, ≤5 lines)
## 2. Files changed (path · function · ~line at HEAD · what changes)
## 3. Exact edits (before / after for each changed line or block)
## 4. Test steps (manual — what to click, what to check)
## 5. Rebase note (if file is shared with another plan — what to merge)
```

After writing each plan, ask the owner for Gate 4 GO before the implementation agent reads it.

---

## 6. Source files to read (in order)

1. `memory/control/AGENT_PROMPT_ALPHA.md` — role, risk, R5 hotspot list, approval matrix
2. `memory/plans/BATCH-A_CR-372-B_IMPLEMENTATION_PLAN_2026_11_15.md` — example of a frozen plan
3. `memory/plans/BATCH-A_CR-492_IMPLEMENTATION_PLAN_2026_11_15.md` — existing READY_FE plan to extend
4. Per-item IA docs: `memory/impact/<ID>_IMPACT_ANALYSIS.md` for each item
5. Per-batch decisions: `memory/change_requests/BATCH_<X>_OWNER_DECISIONS_2026_11_14.md`
6. Contracts (for items with locked field names): `memory/contracts/BATCH-<X>_<CR>_API_CONTRACT_2026_11_15.md`
7. `memory/impact/BATCH-D_IMPACT_ANALYSIS_SUMMARY_2026_11_15.md` — sequencing + conflict pre-check for D
8. `memory/impact/BATCH-B_IMPACT_ANALYSIS_SUMMARY_2026_11_14.md` — sequencing + conflict for B

---

## 7. Done when

All 11 items have a plan file in `memory/plans/` (CR-372-B already FROZEN, CR-492 extended to FROZEN for READY rows). Each plan:
- Is frozen (or awaiting Gate 4 GO from owner)
- Has a HEAD-verified commit hash
- Lists all file conflicts and rebase instructions
- Has no TBD line numbers (all verified at HEAD by grep/search)

Then tell the owner: "All 11 plans written — ready for Gate 4 GO per item."
