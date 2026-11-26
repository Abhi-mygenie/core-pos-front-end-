# CR-525 — After Bill Print: Replace KOT and Bill Buttons with Collect Bill Button

**Registered:** 2026-11-12
**Type:** CR
**Sprint:** nov_cr_batch
**Status:** GATE_2_IA_CLOSED — HIDE-ONLY (revised 2026-11-19, owner) · UNBLOCKED · FE-only · ready for Gate 3
**Priority:** P0 · **Assignee:** Abhishek · **Release:** 2026-11-17 · **Client:** ALL

---

## 1. Description

After a bill is printed, the order card/footer still shows the **KOT** and **Bill** action buttons. The owner wants these to be replaced with a single **"Collect Bill"** button once the bill has been printed, so that the next logical action is immediately prominent.

**Current behaviour:** After bill print, the order card footer continues to show KOT and Bill buttons unchanged. The Collect Payment action is not surfaced directly on the card.

**Expected behaviour:** Once `billPrinted = true` (CR-512 signal), the KOT and Bill buttons on the order card are replaced by (or the Bill button changes to) a "Collect Bill" button that opens the payment/collect panel directly.

**REVISED 2026-11-19 (HIDE-ONLY):** replace BOTH KOT + Bill (and Ready/Serve) with a single **Collect Bill** button and route card tap/Enter → Collect Payment, **only** when the outlet setting `orderEditAccess` (CR-489) is ON. **No reverse** — if the printed order is later edited, the card stays on "Collect Bill" (KOT/Bill do not come back). This is forward-only and FE-only; the earlier backend reset (BD-01) is dropped.

---

## 2. Classification

- **Type:** CR
- **Severity:** P0 (escalated 2026-11-19 by owner — money-path card entry, part of the 2026-11-17 release batch). Was P2 at intake.
- **Risk:** HIGH — touches OrderCard (R5), bill-print state logic, CR-489 edit-lock interaction
- **Area:** Menu / Order Entry
- **Fast Lane:** NOT eligible (R5 hotspot, state logic)

---

## 3. Duplicate Check

- CR-489 (Edit lock after bill print — GATE_5A_IMPLEMENTED): related concept
- CR-512 (Print confirmation flow — GATE_5A_IMPLEMENTED): provides `billPrinted` signal
- **Result: DISTINCT** — no registration for button replacement after bill print

---

## 4. Evidence

- **Source:** OWNER-REPORTED (2026-11-12 batch)
- **Screenshot:** provided — table card showing KOT + Bill buttons; annotated by owner
- **Confidence:** CONFIRMED

---

## 5. Blast Radius

- `OrderCard.jsx` (R5) — conditional button rendering based on `billPrinted`
- `TableCard.jsx` — may also need similar treatment
- **Estimated scope:** SMALL-MEDIUM (1–2 files, R5)

---

## 6. Open Questions — RESOLVED (owner, 2026-11-19)

- OD-525-01 → **RESOLVED:** Replace BOTH KOT and Bill with a single "Collect Bill" button at the **Served (fOS 5)** stage where KOT + Bill render. (Ready/Serve at Preparing/Ready are NOT affected — revalidated 2026-11-19: no Bill/print button exists at fOS 1/2.)
- OD-525-02 → **RESOLVED (reversed):** **NO.** Hide-only — if a printed order is edited, KOT/Bill do **NOT** reappear. Accepted limitation; staff reprint via the order/report route. This removes the earlier "reverse" requirement and **drops backend dependency BD-01**.
- OD-525-03 → **RESOLVED:** "Collect Bill" opens the Collect Payment panel directly (reuses existing `handleBillClick` → `initialShowPayment`).
- OD-525-A → gated per-restaurant by `orderEditAccess` setting (CR-489); OFF → cards unchanged.
- OD-525-B/C → rooms (C/Out), prepaid (Settle), delivery (rider flow), aggregator all **EXCLUDED**. **Aggregator: NO CHANGES — confirmed/locked by owner 2026-11-19.** Walk-in / takeaway / dine-in tables **INCLUDED** (owner 2026-11-19).
- OD-525-D → **REVISED (revalidated 2026-11-19):** applies at the **Served (fOS 5)** stage (where KOT + Bill render). Revalidation of TableCard (L542-758) / OrderCard (L1136-1285) confirms the Bill/print-bill button appears ONLY at fOS 5; at Preparing (fOS 1) and Ready (fOS 2) cards show only KOT + Ready/Serve, so there is nothing to replace there and Ready/Serve stay. `showCollect` still keys off `billPrinted`.

---

## 7. Code Reality

- **Status:** PARTIAL — plumbing fully present & wired: `DashboardPage.handleBillClick` (L1604) + `initialShowPayment` exist and `onBillClick` is already passed to every live `<TableCard>`/`<OrderCard>`. The cards declare `onBillClick` in props but **never call it** (buttons call `handlePrintBill`; card tap calls `onOpenModal`/`onEdit`). CR-525 = pure FE wiring in the two card files, gated by `showCollect`. **No backend needed** (BD-01 dropped). All `showCollect` inputs already exist: `orderEditAccess` (profileTransform L430), `billPrinted` (orderTransform L316), plus `isRoom/paymentType/isDelivery/isAggregator` on the card.

---

## 8. Related

- CR-512 (Print Confirmation Flow — GATE_5A_IMPLEMENTED, provides `billPrinted`)
- CR-489 (Edit After Bill Print — GATE_5A_IMPLEMENTED)
- BUG-583 (Card colour on bill print — GATE_5A_IMPLEMENTED via CR-512)

---

## 9. Owner Decision Update — 2026-11-19 (HIDE-ONLY)

**New requirement (supersedes the original "reverse" behaviour):** After bill print, on table + order cards, replace KOT + Bill (and Ready/Serve) with a single **Collect Bill** button; card tap/Enter → Collect Payment. **HIDE-ONLY — no restore of KOT/Bill after a later edit.**

- **Backend dependency BD-01 DROPPED** → CR-525 is **FE-only** and **UNBLOCKED**. OD-525-E ("wait for server before go-live") no longer applies; BD-02/BD-03 not required for CR-525.
- **Derived flag:** `showCollect = restaurant.settings.orderEditAccess && billPrinted && !isRoom && paymentType!=='prepaid' && !isDelivery && !isAggregator`.
- **Files that will change:** `components/cards/TableCard.jsx`, `components/cards/OrderCard.jsx`. `DashboardPage.jsx` unchanged (plumbing already present; IA item E5 is now a no-op).
- **Accepted limitation (flag at QA):** edited-after-print stays on "Collect Bill".
- Full revised analysis: `impact/CR-525_IMPACT_ANALYSIS.md` → **Revision 2026-11-19 (HIDE-ONLY)**.

## 10. Revalidation + Decisions — 2026-11-19 (STAY AT GATE 2)
- **#1 Ready/Serve print button — revalidated against current `main`:** the Bill/print-bill button renders ONLY at **Served (fOS 5)** (TableCard `collect-btn` L746-755; OrderCard L1237-1285 → `handlePrintBill`). At Preparing (fOS 1) and Ready (fOS 2) the card shows only KOT + Ready/Serve — **no Bill/print button**. ⇒ The Collect Bill swap happens at the Served stage (replace KOT + Bill); Ready/Serve are untouched. The earlier "hide Ready/Serve at every stage" requirement is **dropped**.
- **#2 Aggregator orders — NO CHANGES** (locked, excluded).
- **#3 Walk-in / takeaway / dine-in — INCLUDED** (confirmed).
- **Gate:** remains **GATE_2_IA_CLOSED** (HIDE-ONLY). No open owner questions. NOT advancing to Gate 3 yet (owner: stay at Gate 2). Gate 4 GO required before any coding.
