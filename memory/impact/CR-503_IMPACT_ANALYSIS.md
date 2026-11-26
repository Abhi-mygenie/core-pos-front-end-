# CR-503 — Order Beta: Pay Later Collect Pop-up (Print Bill + Collect Payment) — Impact Analysis (Gate 2) — 2026-11-15

**Role:** PLANNING (Gate 2 only)
**Code Reality:** NONE — no Collect/Print actions exist for TAB rows in OrderReportBetaPage
**Conflict Pre-Check:** CR-515 — no longer a blocker (owner 2026-11-15 R2: no right check for now; CR-515 adds gating later)

> **REVISED 2026-11-15 (write probe + owner round 2) — see bottom section. It overrides the row filter, rights gate and CR-515 sequencing above.**
**Risk:** HIGH (payment mutation — `BILL_PAYMENT` endpoint invoked from report context)
**Backend-blocked:** NO — `CollectBillPanelDrawer` already calls `collectBillExisting` → `BILL_PAYMENT`; no new backend work

---

## Owner Decisions (locked)

| Decision | Value |
|----------|-------|
| Collect action | Opens the CollectBillPanelDrawer (same as Audit page) |
| Print Bill | Inside the pop-up (not a separate button); requires wiring `onPrintBill` in drawer |
| Move-to-Paid | Handled by existing rules after collection |
| Rights gating | `order_unpaid` (from CR-515, Batch A) |

---

## Probe Results — Beta API + CollectBillPanelDrawer Code

Probed 2026-11-15 on RID 644 (CAFE 103), Nov 1–15.

**TAB rows confirmed:**
- 14 TAB rows in Nov 1–15 window, all `f_order_status: 6` (settled) and `payment_status: paid`
- `payment_method: 'TAB'` / `payment_method_raw: 'tab'`
- `payment_for: 'postpaid'` on TAB rows
- `order_new_date` (full ISO datetime) available on every row
- For uncollected TAB: `f_order_status` would be `5` (unpaid/pending) with `payment_status: unpaid`

Evidence: `/app/memory/evidence/BATCH-C-IA/probes_2026_11_15/03b_cr503_tab_full.txt`

**CollectBillPanelDrawer code findings:**
- `CollectBillPanelDrawer` is used in `AllOrdersReportPage` (L25 import, L1150 render)
- The drawer wraps `CollectPaymentPanel` with `onPrintBill={null}` (L275) → Print Bill button is **hidden** when `null`
- `CollectPaymentPanel` shows Print Bill button only when `onPrintBill` callback is provided (L1427: `{hasPlacedItems && onPrintBill && ...}`)
- **CR-503 requires wiring `onPrintBill`** → CollectBillPanelDrawer.jsx needs a new `onPrintBill` prop passed through to CollectPaymentPanel

---

## Data Flow Trace

```
OrderReportBetaPage.jsx (Credit tab, TAB rows)
  → row.payment_method_raw === 'tab' (or payment_method === 'TAB')
  → Actions column:
      CURRENT: only Pay Link button for f_order_status=9 (Razorpay only)
      NEEDED: "Collect" button for unpaid TAB rows
        → onClick: openCollectBillDrawer(row)
        → <CollectBillPanelDrawer open={!!collectBillTarget} order={...} onPrintBill={handlePrintBill} />
          → CollectBillPanelDrawer fetches full order via get-single-order-new
          → renders CollectPaymentPanel with Print Bill button wired
          → on collect: POST BILL_PAYMENT → onCollectSuccess → refetch report

Rights gate (CR-515 dependency):
  → hasPermission('order_unpaid') ?? false
  → Button hidden/disabled when right absent
```

---

## Affected Code

### A. `OrderReportBetaPage.jsx` — primary change file

| Site | Line | Change |
|------|------|--------|
| A-1 | ~L4-22 (imports) | Add imports: `CollectBillPanelDrawer`, `useAuth`, `getSingleOrderNew` / `orderFromAPI`, `printOrder` |
| A-2 | ~L130 (state) | Add `const [collectBillTarget, setCollectBillTarget] = useState(null)` |
| A-3 | ~L131 | Add `const [collectBillPending, setCollectBillPending] = useState(false)` |
| A-4 | ~L132 | Add `const [optimisticCollectedBetaIds, setOptimisticCollectedBetaIds] = useState(new Set())` |
| A-5 | ~L132 (useAuth) | Add `const { hasPermission } = useAuth()` |
| A-6 | ~L133 | Add `const canCollectPayLater = hasPermission?.('order_unpaid') ?? false` |
| A-7 | ~L270+ | Add handlers: `openCollectBillDrawer`, `closeCollectBillDrawer`, `handleCollectStart`, `handleCollectSuccess`, `handleCollectError`, `handlePrintBillFromBeta` |
| A-8 | ~L706 (Actions column) | Add "Collect" button for `payment_method_raw === 'tab'` AND `payment_status !== 'paid'` AND `!optimisticCollectedBetaIds.has(row.order_id)`, gated by `canCollectPayLater` |
| A-9 | ~L780 (component bottom) | Add `<CollectBillPanelDrawer open={!!collectBillTarget} order={collectBillTarget} onClose={closeCollectBillDrawer} onCollectStart={handleCollectStart} onCollectSuccess={handleCollectSuccess} onCollectError={handleCollectError} onPrintBill={handlePrintBillFromBeta} />` |

### B. `CollectBillPanelDrawer.jsx` — small prop-wiring change

| Site | Line | Change |
|------|------|--------|
| B-1 | ~L275 | Change `onPrintBill={null}` to `onPrintBill={onPrintBill ?? null}` (accept external prop) |
| B-2 | Component signature | Add `onPrintBill` to destructured props |

---

## Files WILL change

| File | Change | Lines est. |
|------|--------|-----------|
| `src/pages/reports-module/OrderReportBetaPage.jsx` | Imports + state + handlers + Collect button + drawer render | ~40-50 lines |
| `src/components/reports/CollectBillPanelDrawer.jsx` | Accept + pass-through `onPrintBill` prop | ~3 lines |

## Files WILL NOT touch

| File | Reason |
|------|--------|
| `AllOrdersReportPage.jsx` | Has its own collect flow; no change needed |
| `CollectPaymentPanel.jsx` | Already supports `onPrintBill`; no change |
| `reportService.js` | No new API call; drawer handles BILL_PAYMENT internally |
| `reportTransform.js` | TAB row data already in Beta API response |
| `paymentMutationService.js` | No change needed |

---

## CR-515 Conflict (Rights Gate)

**Conflict:** CR-515 (Batch A) gates `order_unpaid` on OrderReportBetaPage for Unpaid/Change buttons. CR-503 also needs `order_unpaid` for Collect button.

**Execution options:**
- **Option A (preferred):** Implement CR-503 and CR-515's Beta-page changes in the same Gate 3 plan. Gate-3 agent coordinates both.
- **Option B:** Implement CR-503 now, ship without gate; add gate when CR-515 Gate 3 is done.

Recommend Option A — single coordinated plan avoids two sequential edits to the same file.

---

## Risk Register

| # | Risk | Severity | Mitigation |
|---|------|----------|------------|
| R-1 | BILL_PAYMENT called from new context (reports); payload must match | HIGH | CollectBillPanelDrawer already builds payload via `collectBillExisting` — same as Audit page. No divergence. |
| R-2 | Optimistic UI removes collected row before refetch; refetch races | MEDIUM | Mirror AllOrdersReportPage's pattern: optimistic hide + refetch on success, restore on error |
| R-3 | Print Bill in collect pop-up: `handlePrintBillFromBeta` needs `get-single-order-new` + `rawOrderDetails` | MEDIUM | Same pattern as `handlePrintBillFromAudit` in AllOrdersReportPage. Copy-adapt. |
| R-4 | `useAuth` not currently imported in OrderReportBetaPage | LOW | Simple import addition |
| R-5 | CR-515 conflict — gate added twice or missing if sequencing wrong | MEDIUM | Option A: coordinate in one Gate 3 plan |

---

## Open Owner Decisions

| OD | Question | Status |
|----|----------|--------|
| OD-503-01 | Collect pop-up = CollectBillPanelDrawer (same as Audit). Confirmed. | LOCKED |
| OD-503-02 | After collection → move to Paid: existing rules. Confirmed. | LOCKED |
| OD-503-03 | Print Bill wired via `onPrintBill` callback in drawer. No separate Print button in actions column. | LOCKED per owner "pop-up includes Print Bill" |

---

## Verification Matrix

| # | Verification | Method | Automated? |
|---|-------------|--------|:---:|
| V-1 | Credit tab TAB rows show "Collect" button (unpaid only) | Browser: Beta → Credit tab → unpaid TAB row | NO |
| V-2 | Collect opens drawer panel | Browser: click Collect | NO |
| V-3 | Print Bill visible inside drawer | Browser: check CollectPaymentPanel inside drawer | NO |
| V-4 | After collect: row moves to Credit/Paid, no longer in unpaid state | Browser: collect → verify row disappears | NO |
| V-5 | No "Collect" button for already-paid TAB rows | Browser: settled TAB rows → no Collect | NO |
| V-6 | Collect button hidden when `order_unpaid` permission absent | Browser: role without right | NO |
| V-7 | AllOrdersReportPage Collect unaffected (regression) | Browser: Audit Hold tab → collect still works | NO |
| V-8 | `yarn build` 0 new warnings | `yarn build` | YES |

---

## Post-Code Registry Checklist

```
- [ ] registry.json: CR-503 → status: GATE_5A_IMPLEMENTED, sprint_key: nov_cr_batch
- [ ] CR_REGISTRY.md: row updated
- [ ] FILE_OWNERSHIP.md: OrderReportBetaPage.jsx + CollectBillPanelDrawer.jsx + CR-503 + date
- [ ] Code marker: // CR-503 on new state, handlers, button, drawer render
- [ ] Compile: webpack 0 new warnings
```

---

## Scope Lock

**Files WILL change:** `src/pages/reports-module/OrderReportBetaPage.jsx` · `src/components/reports/CollectBillPanelDrawer.jsx`
**Files WILL NOT touch:** AllOrdersReportPage, CollectPaymentPanel, reportService.js, reportTransform.js, paymentMutationService.js
**BLOCKERS:** CR-515 Gate 3 coordination (Option A — same PR preferred)

```
Planning complete: CR-503
Stage: Impact Analysis (Gate 2)
Code reality: NONE
Risk: HIGH (payment mutation)
Files WILL change: OrderReportBetaPage.jsx (~45 lines), CollectBillPanelDrawer.jsx (~3 lines)
Files WILL NOT touch: AllOrdersReportPage, CollectPaymentPanel, reportService, reportTransform
Owner decisions: ALL LOCKED
Docs: memory/impact/CR-503_IMPACT_ANALYSIS.md
Next: Coordinate with CR-515 Gate 3 → single combined Gate 3 plan
```

---

## REVISION 2026-11-15 — Write probe + Owner Round 2

Evidence: `/app/memory/evidence/BATCH-C-IA/probes_2026_11_15_write/WRITE_PROBE_FINDINGS_2026_11_15.md` (W-9..W-12)

**Probe facts**
- POS "Pay Later" = Hold (`payment_method: paylater`), not TAB. Earlier IA assumed TAB/Credit only — corrected.
- Uncollected Hold: `f_order_status 1`, `payment_status 'sucess'`, `payment_for prepaid` → Beta Hold tab. Collect via `order-bill-payment` (cash/paid) → fos 6 → Settled. Verified on 1578760.
- Collect with mode `paylater` on unpaid order → fos 6, `paid`, method `paylater` → also sits in Hold tab although already paid.
- "Uncollected TAB = fos 5" was a guess — still unobserved. All TAB rows seen are fos 6 / paid.

**Owner decisions (round 2, locked)**
| OD | Decision |
|---|---|
| OD-503-04 | Collect + Print Bill pop-up on **both Hold and Credit (TAB)** rows |
| OD-503-05 | **No right check for now** (CR-515 adds gating later) → drop `canCollectPayLater` / `useAuth` sites A-5, A-6 |

**Revised row rule (Gate 3 to confirm against data)**
- Hold: `payment_method === 'paylater'` AND `payment_status !== 'paid'` (i.e. `'sucess'`), or `f_order_status` 8/9.
- Credit: `payment_method === 'TAB'` — OPEN: every TAB row seen is already paid (fos 6). Gate 3 must decide what "Collect" means for a paid TAB row (credit settlement vs nothing). Flagged as OD-503-06 for the Gate 3 round.
- Hold rows already paid via `paylater` (fos 6, paid) → no Collect button.

**Scope impact:** files unchanged (OrderReportBetaPage.jsx, CollectBillPanelDrawer.jsx). CR-515 is no longer a sequencing blocker. Risk stays HIGH (payment mutation).
