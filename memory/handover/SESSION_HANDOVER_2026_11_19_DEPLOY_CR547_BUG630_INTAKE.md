# SESSION HANDOVER — 2026-11-19
## Deploy · CR-547 · BUG-630 Phase B · Investigation ingest · INTAKE (BUG-704..712 + CR-553)

**Repo:** `Abhi-mygenie/core-pos-front-end-` · **Branch:** `main` @ `2ad64772` (local == origin, 0/0)
**Preview:** https://restaurant-pos-ui-8--7hj8onke.preview.emergentagent.com
**Test creds (gitignored):** `owner@cafe103.com` / `Qplazm@10` (preprod; owner = all permissions)

---

## 1. What was done this session

### A. Deployment
- Repo cloned directly into `/app` (platform files preserved: `.emergent`, `backend/.env`, `frontend/.env`), `yarn install` as-locked, running via supervisor (`craco start`, port 3000). Login page live, webpack clean, memory in sync. 4 missing keys (Firebase API/VAPID, CRM keys, Google Maps) collected via secrets card.
- Pushed deploy snapshot to branch `deploy-20261119-045130`; then synced local `main` with remote.

### B. CR-547 — Selective KOT (IMPLEMENTED, Gate 4 GO)
- `ScanOrderPopOut.jsx` (E1–E8) + `DashboardPage.jsx` (E9) per `plans/CR-547_IMPLEMENTATION_PLAN.md`. Hardened badge/disabled to use `kotSelectedItems` (items still present).
- Verified: jest `CR547_SelectiveKOT.test.jsx` 6/6; app health pass. Live not reachable (0 running orders). EXIT GATE 5/5.

### C. BUG-630 / BB-14 — Item Sales Ledger "Net Sales" (Phase B, IMPLEMENTED)
- Backend BB-14 delivered → `topFoodSalesService.js` L28 now reads `r.net_sales` (no fallback). Unit test 6/6; **testing agent LIVE PASS** on cafe103 real data. Registry → IMPLEMENTED.

### D. Investigation ingest (read-only, no code)
- Extracted owner zip into `investigations/`: `INV-5ISSUES-2026-11-18.md`, `INV-PAYLATER-VAT-LM-2026-11-18.md`. Added `INV_DATEFMT_CR523_CR515_2026_11_19.md`.
- 12 findings logged as `OG-*` in `OPEN_GAPS_REGISTER.md` with decisions.

### E. INTAKE — 10 new items (GATE_1_INTAKE)
Registered in `registry.json` (1144 items). Intake doc: `change_requests/BATCH_INTAKE_2026_11_19_INV_FINDINGS.md`.
BUG-673 annotated (keyboard fix incomplete — re-open candidate). OG-CR515-003 NOT filed (needs live probe).

---

## 2. Newly registered items — NEED IA (Gate 2) NEXT

> **ACTION FOR NEXT AGENT: run Impact Analysis (Gate 2) for each item below, then advance GATE_1_INTAKE → GATE_2_IA_CLOSED.** All are read-only investigated with root cause + file/line anchors already captured in the intake doc and the three investigation reports — use those as the IA starting point. No code is to be written until each item clears its gates.

| ID | Pri | Risk | Area | One-line | Root-cause anchor | IA notes |
|---|---|---|---|---|---|---|
| **BUG-711** | P0 | CRITICAL | Permissions/Security | OrderBeta Reprint prints bill without `print_icon` | `OrderReportBetaPage.jsx` L779 (no `hasPermission('print_icon')`) | 1-line gate fix; confirm no other ungated bill-print path; CR-515 incomplete |
| **BUG-712** | P0 | MEDIUM | Menu/Order Entry | CR-523 customer name not persisted/returned | FE save OK (`saveCustomerToServer` → `user-check-create`); read-back `api.user_name`/`user.f_name` blank | IA needs **live SINGLE_ORDER read-back probe** → likely backend brief |
| **BUG-705** | P1 | MEDIUM | Payments/Credit | PayLater Collect only Cash/UPI/Card | `CollectBillPanelDrawer.jsx` L300 hardcoded `allowedMethods` (CR-503 reuse) | Owner decision A (remove) vs B (caller prop) |
| **BUG-708** | P1 | LOW | Reports/Analytics | Cancellation cancel-note always "—" | `CancellationsMockup.jsx` transform missing `cancelNote` (render L972) | + backend probe whether `insights-cancellations` returns `notes` |
| **BUG-709** | P1 | MEDIUM | Reports/Analytics | Audit "Make Unpaid" missing after cancel | `insights-audit` drops `make_unpaid` (FE filter correct) | BACKEND brief (audit append-only) |
| **BUG-704** | P2 | LOW | Reports/Analytics | ItemSalesLedger LM/FY preset not persistent | `ItemSalesLedgerMockup.jsx` `handlePreset` L164 early-return before `setSharedFrom/To` (L175) | Same pattern as BUG-697/698; FE 1-line each branch |
| **BUG-706** | P2 | MEDIUM | Payments/Credit | OrderBeta VAT labelled "GST" | `OrderReportBetaPage.jsx` L501/699/881 hardcoded; `profileTransform` no `taxType` | 2-file fix; backend confirm `tax_type` field |
| **BUG-707** | P2 | LOW | Reports/Analytics | Cancellation date-format inconsistent | `CancellationsMockup.jsx` raw strings L736/954 vs `toLocaleString` L980 | Standardize shared formatter (app-wide) |
| **BUG-710** | P2 | MEDIUM | Payments/Credit | Discount-after-print not in report | FE reads `restaurant_discount_amount` (L183) | NEEDS live probe (priti orders) |
| **CR-553** | P2 | MEDIUM | Permissions/Security | Require `print_icon` for Collect-flow bill print | Collect gated by `clear_payment` only | OWNER DECISION before IA/design |

**Suggested IA order:** P0s first (BUG-711, BUG-712), then P1s (BUG-705, BUG-708, BUG-709), then P2s + CR-553.
**Probe-gated (do live read-only probe during IA):** BUG-712, BUG-710, and confirm OG-CR515-003 (login as a no-print role; check `print_icon` in permissions).

---

## 3. State / constraints
- Local == origin/main (`2ad64772`). All session work pushed.
- Backend is external Laravel (`preprod.mygenie.online`); several items (BUG-709, parts of BUG-706/708/712/710) need backend briefs — classify in IA.
- No new CR/BUG IDs minted beyond those above. Next free: BUG-713, CR-554.
- Reference: intake doc + `investigations/INV-5ISSUES-2026-11-18.md`, `investigations/INV-PAYLATER-VAT-LM-2026-11-18.md`, `investigations/INV_DATEFMT_CR523_CR515_2026_11_19.md`.
