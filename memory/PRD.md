# MyGenie POS Frontend — PRD + Sprint State

## Problem Statement
Clone https://github.com/Abhi-mygenie/core-pos-front-end-.git (branch `27-may`) into `/app`, bring up the React frontend on port 3000 with supplied env vars, then deliver POS3.1 QSR sprint (BUG-109/110/111) and CRM 2.0 CR-002 (Cross-Sell + Customer Intelligence) work under strict mini-CR playbook.

## Architecture
- React 19 + CRA + craco (frontend on port 3000, supervisor-managed)
- Talks to external preprod API `https://preprod.mygenie.online/` and socket `https://presocket.mygenie.online`
- Firebase web SDK configured for `mygenie-restaurant` project
- Placeholder FastAPI backend kept running (default starter) — NOT part of app logic
- Strict per-gate CR approval ladder; only edit code after explicit owner approval

## Completed (chronological)

### 2026-01-27 — Initial deployment
- Wiped /app (except .git/.emergent), cloned repo branch `27-may`
- Created `/app/frontend/.env` with all 14 supplied variables; `REACT_APP_BACKEND_URL` set
- `yarn install` complete; frontend compiles
- Supervisor running: frontend + backend + mongodb

### CRM 2.0 sprint (mid-May 2026)
- Sprint consolidation docs at `/app/memory/crm/crm_2_0/reconciliation/`
- CR-002 Cross-Sell + Customer Intel: code-complete, Stage 6b preview gate CLOSED
- CR-002 Stage 8 POS-facing handoff doc: drafted, BLOCKED on owner-supplied live R689 HAR/payload evidence

### POS3.1 sprint (2026-05-27)

**BUG-109 (QSR validation parity)** + **BUG-110 (QSR prepaid lock)** — ✅ SHIPPED
- Single-file fix at `/app/frontend/src/components/order-entry/CartPanel.jsx`
- 3 surgical diffs: prop destructure + button disable expression + call-site prop pass
- Build clean. Live smoke testing pending owner (no preprod creds available to agent).
- Plan doc: `/app/memory/change_requests/POS3_1_BUG_109_110_QSR_GATE_ALIGNMENT_PLAN_2026_05_27.md`

**BUG-111 Phase 1 (QSR Grand Total server-parity)** — ✅ SHIPPED 2026-05-27
- Single-file fix at `/app/frontend/src/components/order-entry/CartPanel.jsx`
- 2 diffs:
  - **Diff 1 (L362):** `effectiveTotal = hasPlacedItems ? (total || finalTotal) : finalTotal` → cascades to Grand Total display, Cash Received auto-fill, Pay button amount
  - **Diff 2 (L492):** Wrap breakdown rows in `{!hasPlacedItems && (...)}` to hide misleading local-recomputed Item Total/Tax/etc on placed orders
- Build clean (exit 0, bundle -45B, only pre-existing OrderEntry.jsx:1308 ESLint warning remains)
- Owner-confirmed live: Grand Total now correctly displays server amount (e.g. ₹675 instead of locally-recomputed ₹1,200+)
- Plan doc: `/app/memory/change_requests/POS3_1_BUG_111_QSR_BILL_PARITY_PLAN_2026_05_27.md`

## Currently In-Flight / Pending

### 🟠 BUG-111 Phase 2 — Server-driven breakdown (PROPOSED, NOT APPLIED)
**Status:** Plan documented in BUG-111 plan doc §13. Awaiting Gate A-P2 approval next session.

**What it adds:** Replace the "hide breakdown" wrap (Phase 1 Diff 2) with a server-driven breakdown branch. Shows Item Total / **Discount (single aggregated row — restaurant+coupon+loyalty+wallet summed)** / Subtotal / Service Charge / Delivery / Tax (GST) / VAT / Round-off on placed orders using `placedOrderData` (= `orderFromContext || orderData`).

**Diffs prepared (NOT YET APPLIED):**
1. `orderTransform.js fromAPI.order` — surface 6 missing fields: `couponDiscount, loyaltyDiscount, walletDebit, gstTax, vatTax, roundUp` (+8 lines)
2. `OrderEntry.jsx` L2147 — add prop `placedOrderData={orderFromContext || orderData}` (+3 lines)
3. `CartPanel.jsx` — forward `placedOrderData` through outer + QsrBillingSection (+3 lines)
4. `CartPanel.jsx` L492 — replace Phase 1 Diff 2 wrapper with 2-branch ternary (~+21 net)

**Total Phase 2 size:** ~+35 lines, 3 files, 0 logic rewrites, 0 payload change.

**CRITICAL Live test (T-DISCOUNT-CLUB) — BLOCKING for close-out:**
> Owner directive 2026-05-27: "we need to test a order how loyalty coupon and other discounts all shd club in single discount for qsr view"

Steps:
1. Full Mode → place order, apply all four discount sources:
   - Restaurant discount (e.g. ₹50)
   - Coupon (e.g. WELCOME10 → ₹100)
   - Loyalty (e.g. 300 pts → ₹30)
   - Wallet (e.g. ₹50)
2. Collect Bill (server returns `restaurant_discount_amount=50, coupon_discount=100, loyalty_discount=30, use_wallet_balance=50`)
3. Re-open order in QSR mode
4. **Expected:** QSR Billing shows ONE `Discount -₹230` row (50+100+30+50 aggregated), NOT 4 separate rows
5. **FAIL if:** rows appear separated, any source missed, or values mismatch Full Mode summary

## Backlog / Next Action Items (Priority Order)

🔴 **P0 — Resume here next session**
- [ ] **BUG-111 Phase 2** — Get Gate A-P2 approval from owner, apply 4 diffs in sequence (B-P2 → E-P2), run build/lint, then execute T-DISCOUNT-CLUB live test
- [ ] Combined QA + Handoff doc covering BUG-109 + BUG-110 + BUG-111 (P1+P2) at `/app/memory/change_requests/pos_3_1/POS3_1_BUG_109_110_111_QA_HANDOFF_2026_05_27.md`
- [ ] Sprint scaffold: move 3 plan docs into `/app/memory/change_requests/pos_3_1/` per BUG-109/110 plan §9

🟡 **P1 — After POS3.1 closed**
- [ ] CR-002 Stage 8 POS-facing handoff: append live R689 HAR/payload evidence (BLOCKED — needs owner-supplied evidence)
- [ ] CR-005 Wallet Discovery
- [ ] Live smoke testing closeout for BUG-109/110/111 by owner on preprod

🟢 **P2 — Backlog**
- [ ] CR-003 Tab
- [ ] CR-008 Integrations
- [ ] CR-003 Coupon Analytics Dashboard Phase 2 (PARKED — owner directive 2026-05-27)
- [ ] CRM endpoint latency (CG-05) — preprod latency high, currently defended by skeleton
- [ ] `usual_time_of_day` timezone (CG-09) — backlog
- [ ] ESLint warning in `OrderEntry.jsx:1308` (unnecessary `printOrder` useCallback dep) — pre-existing, low priority
- [ ] Decide whether to remove unused placeholder `/app/backend`

## Critical Conventions (READ BEFORE EDITING)

1. **STRICT MINI-CR PLAYBOOK:** Owner enforces per-gate approval. Never edit code without explicit "approve" on the specific diff. Write Plan doc with text diffs first, then wait.

2. **DO NOT TOUCH:**
   - `/app/memory/final/`
   - `/app/memory/crm/crm_1_0/`
   - Outbound payload contracts (`placeOrder`, `updateOrder`, `placeOrderWithPayment`, `collectBillExisting` in `orderTransform.js`)

3. **Hotspot files (require extra care):** `DashboardPage.jsx`, `OrderEntry.jsx`, `CollectPaymentPanel.jsx`, `RoomCheckInModal.jsx`, `StatusConfigPage.jsx`, `orderTransform.js`, `reportService.js`, socket handlers, `CartPanel.jsx`

4. **Server-authoritative pattern:** On placed orders, prefer `orderFinancials.amount` / `orderFromContext.*` over local recompute. See `OrderEntry.jsx:788-792` for the canonical `total` ternary.

5. **Build verification:** `cd /app/frontend && CI=false yarn build` → must exit 0. Only acceptable warning: pre-existing `OrderEntry.jsx:1308` `printOrder` ESLint warning.

## Test Credentials
- See `/app/memory/test_credentials.md` (currently empty — agent has no preprod creds, all live testing performed by owner).

## Key File References
- `/app/frontend/src/api/transforms/orderTransform.js` (1917 lines — inbound `fromAPI.order` at L107-411; outbound `toAPI.*` at L769+)
- `/app/frontend/src/components/order-entry/OrderEntry.jsx` (2488 lines — `orderFinancials` state at L142; `total` calc at L788-792; CartPanel call at L2147)
- `/app/frontend/src/components/order-entry/CartPanel.jsx` (1326 lines — `QsrBillingSection` at L244-600; CartPanel main render at L600+)
- `/app/memory/change_requests/POS3_1_BUG_109_110_QSR_GATE_ALIGNMENT_PLAN_2026_05_27.md`
- `/app/memory/change_requests/POS3_1_BUG_111_QSR_BILL_PARITY_PLAN_2026_05_27.md` (Phase 1 shipped, Phase 2 §13 proposed)

## 3rd Party Integrations
- Firebase (configured, not modified)
- Preprod API + Socket (read-only consumer)
- No LLM/Stripe/etc integrations in this codebase

## Last Owner Messages (chronological, latest first)
1. **(latest)** "update all docs, note we need to test a order how loyalty coupon and other discounts all shd club in single discount for qsr view, update prd for next agent and handover note, and close the session"
2. "a" → approved Option Y (Phase 1 minimal)
3. "does final planning match with this..." → flagged that Phase 1 should be a 1-line prop consumption, not an 11-field transform extension (over-engineered draft was rejected)
4. Screenshot showing ₹675 Grand Total but missing breakdown rows → triggered Phase 2 investigation
5. "Approve A, proceed B & C together" → approved Phase 1 Diffs 1+2

## Project Health
- ✅ Build: clean (exit 0)
- ✅ Frontend service: running (supervisor)
- ✅ Backend service: running (supervisor, placeholder only)
- ✅ MongoDB: running (supervisor, unused)
- ⏳ No pending code edits (Phase 2 awaiting approval)
- ⏳ No pending testing (Phase 1 owner-validated visually; Phase 2 needs T-DISCOUNT-CLUB live test post-implementation)
