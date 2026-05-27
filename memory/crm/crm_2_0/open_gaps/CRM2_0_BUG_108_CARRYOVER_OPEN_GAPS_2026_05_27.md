# CRM 2.0 — BUG-108 Carryover Open Gaps Register

**Date:** 2026-05-27
**Sprint:** CRM 2.0
**Type:** OPEN_GAPS (BUG-108 carryover slice)
**Agent:** Sprint Consolidation Agent (read-only)
**Mandate:** Closes CG-15 / CG-21 per README §5 ("BUG-108 carryover items must be tracked under a CRM 2.0 open-gaps doc")

**Source of truth (do not edit those):**
- `/app/memory/change_requests/final_sprint_reconciliation/POS3_0_BUG_108_COUPON_LOYALTY_FINAL_RECONCILIATION_2026_05_26.md`
- `/app/memory/change_requests/final_sprint_reconciliation/POS3_0_BUG_108_COUPON_LOYALTY_OPEN_GAPS_REGISTER_2026_05_26.md` (POS3.0 register, 30 items)
- `/app/memory/crm/crm_2_0/README.md` §5 (carryover declaration)

---

## 1. Purpose

The POS3.0 BUG-108 sprint left 30 open items at close. Roughly two-thirds are owned by POS Backend, CRM admin, or POS UI hygiene and stay in their original POS3.0 register. **This doc tracks only the items that affect — or are absorbed by — CRM 2.0**: CRM-side blockers, items reassigned to new CRM 2.0 CRs, and items whose owner-smoke or live verification is now expected to happen during CRM 2.0 live-QA windows.

In-scope here = the slice that a CRM 2.0 agent might need to look at; out-of-scope items remain owned by the POS3.0 register.

---

## 2. Carryover Items (CRM 2.0-relevant)

| Carryover ID | Source ID (POS3.0) | Area | Description | Current Status | Owner | Why it's a CRM 2.0 carryover |
|---|---|---|---|---|---|---|
| **BC-01** | G-08 (P0) | POS BE mapper — `items[]` forwarding at commit | POS Backend forwarding of `items[]` (OrderItem schema) to CRM `/api/pos/orders`. **CLOSED 2026-05-27 — owner confirmed.** | ✅ CLOSED | POS BE team | Verified. |
| **BC-02** | G-11 (P1) | Loyalty idempotency key | POS BE owns generation of `"order_{id}_loyalty"` per Owner 2026-05-25 Option B. **CLOSED 2026-05-27 — backend now sends this key. Owner confirmed.** | ✅ CLOSED | POS BE team | Verified — backend generates the key correctly. |
| **BC-03** | G-15 (P2) | CRM admin UI for V3-B / V3-C coupons | BOGO/BXG/Nth coupons must be seeded via DB/API; no CRM admin UI. | CRM_BLOCKED (admin) | CRM team | Future CRM admin sprint inside CRM 2.0 scope (not a POS frontend deliverable). |
| **BC-04** | G-17 (P3) | Coupon reversal / refund | No CRM reversal endpoint; cancel/refund of committed coupon usage impossible. | DEFERRED (CRM Phase 2) | CRM Phase 2 | Pre-condition for any future cancel-coupon CR in CRM 2.0. |
| **BC-05** | G-19 (P3) | Wallet CRM integration | Wallet UI disabled with helper; payload force-zeroed. Owner Q11 deferred to a separate CR. | DEFERRED (separate CR) | Wallet CR owner | **Re-scoped as CRM 2.0 CR-005 Wallet.** Tracks here until CR-005 discovery starts (CG-17). |
| **BC-06** | G-23 (P3) | Variant / add-on coupon matching | CRM coupon engine ignores variants/add-ons; POS sends base `food_id` only. | DEFERRED (CRM engine limit) | CRM engine extension | Belongs to a future CRM 2.0 engine upgrade. |
| **BC-07** | G-25 (P3) | CRM `excluded_item_ids` / `excluded_category_ids` admin UI | Backend-only; no admin UI for exclusions. | CRM_BLOCKED (admin) | CRM team | CRM 2.0 admin sprint candidate. |
| **BC-08** | G-27 (P3) | CRM `/pos/max-redeemable` slowness on staging | ~17s on staging-15 — N+1 fix planned on CRM. POS has 30s timeout. | CRM_BLOCKED (perf) | CRM team | Tracks CRM-side latency under CRM 2.0 ops. |
| **BC-09** | G-30 (P1) | Live restaurant validation for V2 + V3 coupons | CRM QA'd with synthetic fixtures only; needs real-restaurant E2E. | OWNER_SMOKE_PENDING | Owner + CRM admin | Eligible to piggyback on the R689 CR-002 live-QA window. |
| **BC-10** | (not in POS3.0 register; tracked here for the first time) | order 869016 P1 backend defect — `loyalty_idempotency_key = null` | Specific historical order with null key (root cause of BC-02 surfacing). | BACKEND_DEFECT | POS BE team | First raised in baseline docs that were never produced (see §4 below). |

---

## 3. Items explicitly **NOT** carried over (remain in POS3.0 register)

The following POS3.0 BUG-108 items stay under the POS3.0 register because they are POS-frontend / POS-backend / template / process hygiene and have no CRM 2.0 owner:

- G-01, G-02 (V1B owner-smoke + V1 closure QA)
- G-03, G-04, G-05, G-06 (V2 + V3-A/B/C QA pass docs)
- G-07, G-09, G-10 (POS BE mapper hygiene + bill template)
- G-12 (loyalty discount field live capture)
- G-13 (Loyalty Phase C live UI)
- G-14 (auto-print payload P-1/P-3)
- G-16 (V2 category-scope test coupon seed)
- G-18 (cashier-cancel warning toast — closed)
- G-20 (QSR separate coupon UI — closed by owner)
- G-21 (room/hotel coupon owner smoke)
- G-22 (Flow 6 transferToRoom — V1 scope decision)
- G-24 (multi-coupon — product decision)
- G-26 (per-line discount allocation display)
- G-28, G-29 (POS3.0 doc hygiene + PRD update)

These are owned by the POS3.0 doc chain and are not tracked further in CRM 2.0.

---

## 4. Missing baseline-referenced BUG-108 files (CG-16)

The CRM 2.0 baseline doc set referenced three additional BUG-108 carryover files. None exist on the filesystem **and none exist anywhere in git history (`git log --all`)** in this repository:

| # | Referenced path | On disk | In git history (any branch) | Verdict |
|---|---|---|---|---|
| 1 | `change_requests/final_sprint_reconciliation/POS3_0_BUG_108_COUPON_LOYALTY_FINAL_RECONCILIATION_ORDER_869016_ADDENDUM_2026_05_26.md` | NO | NO | **Never produced in this repository** |
| 2 | `change_requests/final_sprint_reconciliation/POS3_0_BUG_108_BACKEND_MAPPER_AUDIT_REPORT_LIVE_UPDATE_2026_05_26.md` | NO | NO | **Never produced in this repository** |
| 3 | `change_requests/final_sprint_reconciliation/POS3_0_BUG_108_COUPON_V2_V3_QA_REPORT_LIVE_UPDATE_2026_05_26.md` | NO | NO | **Never produced in this repository** |

Search method (recorded for audit):
```
find /app -type f \( -name '*ORDER_869016_ADDENDUM*' -o -name '*BACKEND_MAPPER_AUDIT_REPORT_LIVE_UPDATE*' -o -name '*COUPON_V2_V3_QA_REPORT_LIVE_UPDATE*' \)
git log --all -- 'memory/change_requests/final_sprint_reconciliation/...patterns...'
```
Both produced zero hits.

**Decision (closing CG-16):**
- Items are formally recorded as **NEVER_PRODUCED** in this repository.
- The information they would have contained is still partly captured:
  - Order 869016 defect → tracked in **BC-10** above.
  - Backend mapper audit → ongoing under **BC-01 / BC-02**.
  - V2/V3 QA report → folded into POS3.0 register items G-03..G-06 (not CRM 2.0 scope).
- No further attempt to locate or reconstruct these files. CG-16 → **RESOLVED (NEVER_PRODUCED)**.

If a future agent finds these files in another fork/branch/session, append a follow-up note here — do not back-date this doc.

---

## 5. Summary Counts

| Bucket | Count |
|---|---|
| Total CRM 2.0-relevant carryover items | 10 (BC-01 … BC-10) |
| P0 | 1 (BC-01) |
| P1 | 3 (BC-02, BC-09, BC-10) |
| P2 | 3 (BC-03, BC-07, BC-08) |
| P3 | 3 (BC-04, BC-05, BC-06) |
| Resolved by this doc | CG-15, CG-21 (carryover doc mandated by README §5 — now exists) and CG-16 (3 missing files formally recorded as NEVER_PRODUCED) |

---

## 6. Cross-references to other CRM 2.0 docs

| Item | Other CRM 2.0 home |
|---|---|
| BC-01 commit-payload verification | Will be partially evidenced by CG-01 (CR-002 live regression) when the R689 paid-order session happens — but a clean CR-002 PASS does NOT close BC-01; that needs a POS BE audit. |
| BC-02 loyalty_idempotency_key | Same R689 session can capture evidence; full close still needs POS BE. |
| BC-05 Wallet | Re-opened as CRM 2.0 **CR-005 Wallet**. When CR-005 discovery starts, BC-05 closes and the work continues there. |
| BC-09 live restaurant validation | Owner smoke window in CR-002 can co-collect evidence; full close still needs CRM-side sign-off. |

---

## 7. Confirmations

| # | Confirmation | Status |
|---|---|---|
| 1 | No code changed | CONFIRMED |
| 2 | No data mutated | CONFIRMED |
| 3 | No mutating API called | CONFIRMED |
| 4 | `/app/memory/final/` UNTOUCHED | CONFIRMED |
| 5 | `/app/memory/crm/crm_1_0/` UNTOUCHED | CONFIRMED |
| 6 | POS3.0 BUG-108 register NOT edited | CONFIRMED |
| 7 | This is the additive carryover slice for CRM 2.0; POS3.0 register remains authoritative for its 30 items | CONFIRMED |
| 8 | CG-15, CG-16, CG-21 closed by this doc | CONFIRMED |

---

**End of CRM 2.0 BUG-108 Carryover Open Gaps Register.**
