# POS 3.0 BUG-108 — Baseline Reconciliation Note

**Date:** 2026-05-22
**Prepared by:** Senior POS3.0 BUG-108 Frontend UX Planning Agent (post-baseline-recovery)
**Trigger:** Baselines and overlay docs at `/app/memory/final/`, `/app/memory/change_requests/`, etc. were restored from remote `22-may-docs` branch (549 files). This note reconciles my earlier BUG-108 docs against the recovered baselines.
**Scope:** READ-ONLY analysis. No code changes, no edits to baseline docs, no edits to earlier BUG-108 docs.

---

## 1. Status

```
bug_108_baseline_reconciliation_complete_proceed_with_minor_alignment_in_next_planning_pass
```

**Headline verdict:** My BUG-108 docs are **broadly aligned** with the recovered baselines. **No hard conflicts** with `final/` policy docs. **3 alignment notes** (not blockers) on owner decisions where the baselines assumed a different default. **1 cross-CR overlap** with BUG-104 worth flagging.

---

## 2. Baselines Recovered (Now Locally Available)

| Path | Purpose | Read for this note |
|------|---------|--------------------|
| `final/ARCHITECTURE_DECISIONS_FINAL.md` | Architecture rules (transforms, env, CRM behavior) | ✅ |
| `final/MODULE_DECISIONS_FINAL.md` | Module-level decisions | ✅ |
| `final/CHANGE_REQUEST_PLAYBOOK.md` | CR workflow (10-step, approval-gate, handover-note format) | ✅ |
| `final/IMPLEMENTATION_AGENT_RULES.md` | Mandatory rules before coding | ✅ |
| `final/OPEN_QUESTIONS_FINAL_RESOLUTION.md` | Resolved open questions | ✅ (no BUG-108 entries) |
| `final/BUSINESS_RULES_BASELINE_FINAL.md` | Business rules baseline | ✅ |
| `change_requests/BASELINE_RECONCILIATION_REPORT_2026_05_04.md` | Prior reconciliation pass | ✅ |
| `change_requests/BACKEND_FIELD_UNPARK_DECISION_2026_05_06.md` | Backend field decisions | ✅ |
| `change_requests/final_sprint_reconciliation/POS3_0_CR_MASTER_PLANNING_2026_05_18.md` | **CR Master Plan §10 + CQ-CR-05..13** — pre-existing BUG-108 framing | ✅ **CRITICAL FIND** |
| `change_requests/final_sprint_reconciliation/POS3_0_COMPLETE_SPRINT_STATUS_RECONCILIATION_2026_05_21.md` | Sprint status — BUG-108 listed as `crm_blocked` | ✅ |

---

## 3. What the Baselines Say About BUG-108

### 3.1 Sprint Status (`POS3_0_COMPLETE_SPRINT_STATUS_RECONCILIATION_2026_05_21.md`)

```
| BUG-108 | CR (P1) | `CRM_blocked` | CR Master Planning §10; 6+ CRM endpoints unknown.
            Existing UI scaffolding in CollectPaymentPanel (local/mock data). |
            CRM API docs → replace mock data with real APIs |
            CRM team provides API docs (CQ-CR-05 through CQ-CR-13) |
```

**Conclusion:** The baseline correctly classified BUG-108 as **CRM-blocked**. My discovery plan + API inventory + UX planning docs align with this — they explicitly state the work is gated on CRM endpoints.

### 3.2 CR Master Planning §10 — The 9 Original CRM Questions (CQ-CR-05 through CQ-CR-13)

The baseline already framed BUG-108 as 9 CRM-API-clearance questions. My docs framed them as 6 owner decisions (Q1-Q6). Mapping below.

| Baseline ID | Baseline question | My doc covered as | Status |
|-------------|-------------------|-------------------|--------|
| **CQ-CR-05** | "CRM API endpoint for validating a coupon code" | Q1 (ownership) + Q2 (timing) + §3.2 of API Inventory | ✅ Covered (with caveat — see §4.1) |
| **CQ-CR-06** | "CRM API endpoint for fetching customer loyalty balance" | Already live (`GET /pos/customers/{id}.total_points`) — §2.3 of API Inventory | ✅ Already shipped |
| **CQ-CR-07** | "CRM API endpoint for fetching customer wallet balance" | Already live (`wallet_balance` field) — §2.3 of API Inventory | ✅ Already shipped |
| **CQ-CR-08** | "CRM API endpoint for redeeming loyalty points after payment" | Q4 deferred + Q5=(a) — owner chose: CRM only sees fully-settled orders | 🟡 Owner overrode — deferred to separate CR |
| **CQ-CR-09** | "CRM API endpoint for debiting wallet after payment" | Q4 deferred + Q5=(a) | 🟡 Owner overrode — deferred to separate CR |
| **CQ-CR-10** | "CRM API endpoint for marking a coupon as used" | Q5=(a) — no separate "mark used" call; coupon usage is part of the settled-order push | 🟡 Owner overrode — implicit in settlement push |
| **CQ-CR-11** | "Can coupon + loyalty + wallet combine on the same order?" | **NOT explicitly answered in my docs** | ⚠️ Gap — see §4.2 |
| **CQ-CR-12** | "How does CRM coupon discount interact with manual/preset discount?" | **NOT explicitly answered in my docs** | ⚠️ Gap — see §4.3 |
| **CQ-CR-13** | "Redeem at place-order time or collect-bill time?" | Q4 deferred + Q5=(a) — answered indirectly: **settlement time** | ✅ Owner answered (via Q5) |

### 3.3 BUG-104 ↔ BUG-108 Overlap (`OQ-CR-05` in CR Master Planning)

```
OQ-CR-05 | BUG-104 | Should Credit module integrate with CRM customer_id (BUG-108 overlap)
                    or remain mobile-number-based (current PAY-008 rule)?
```

**Status now:** BUG-104 Phase 1 + Phase 2A shipped using **mobile-number-based** (`name + phone` → `mobile` field in POS payload). No CRM `customer_id` linkage. This is consistent with PAY-008. **My BUG-108 docs do not address this overlap.** See §4.4.

### 3.4 Backend Field Unpark Decision

```
| loyalty_info  | 8/13 (`{"enabled": false}`)          | confirmed_present_non_null |
| wallet_info   | 8/13 (`{"amount": 0, "applied": false}`) | confirmed_present_non_null |
| coupon_info   | 0/13                                  | confirmed_present_null_only |
```

**Reading:** The backend already emits `loyalty_info` and `wallet_info` blobs on responses for ~8 out of 13 surveyed restaurants. `coupon_info` is null everywhere. These are **response-side** fields; my docs (which focus on request-side payload like `use_wallet_balance`) didn't analyze these. See §4.5.

### 3.5 Architecture / Implementation Rules

| Rule | My alignment |
|------|--------------|
| **Rule EP-02** ("CRM is required by default, except where customer-detail workflows do not exist") | ✅ My docs honor — Coupon/Loyalty/Wallet sections gate on `customer && restaurantSettings.flag` |
| Transform-driven payloads (architecture rule §114) | ✅ My §10 payload safety plan keeps all transformations in `orderTransform.js` |
| Soft-fail return patterns for CRM (§129) | ✅ My §7.3 "CRM unreachable" UX state matches this rule |
| Implementation Agent Rules — mandatory reading order | ⚠️ I **did not** read these before the prior docs (they were not in `/app/memory/` at the time, per §2.1 of UX Planning doc). Now recovered. |
| 10-step CR Playbook (impact analysis + approval gate + file-level plan + testing checklist) | ⚠️ My docs followed a **lighter** discovery-planning format (Q&A + matrix + API inventory). For 108-P1 implementation, the playbook's full 10-step format will be required. |

---

## 4. Alignment Notes (Not Blockers — Informational for Next Planning Pass)

### 4.1 Q1 Coupon-Ownership — Owner Override vs. Baseline Assumption

- **Baseline (CQ-CR-05 + CQ-CR-10):** Implicitly assumes **CRM owns** the coupon catalog and the "mark used" semantics. All 4 coupon CQ items frame the endpoint as `CRM API endpoint for…`.
- **My Q1 owner answer:** **POS backend owns** the catalog; CRM stores per-customer entitlement only.
- **Reconciliation:** This is an **owner-approved override** of the baseline assumption. Not a conflict — the baseline framing was a starting hypothesis, and the owner has the authority to set ownership. The API Inventory doc (§3.1) correctly reflects this with the coupon catalog endpoint marked as POS-backend-hosted.
- **Action:** No change needed in my docs. CRM team should be told the catalog is **not** their responsibility (already stated in `BUG_108_API_INVENTORY_FOR_CRM_2026_05_22.md` §3.1, but worth re-emphasizing in any future CRM correspondence).

### 4.2 CQ-CR-11 — Combinability of Coupon + Loyalty + Wallet

- **Baseline:** Asks whether the three are **combinable** or **mutually exclusive**.
- **My docs:** **Implicit assumption that they combine.** The code today computes all three discounts and emits them in the same payload. My UX plan (§7.1) shows all three sections rendered together with no exclusivity logic.
- **Reading from existing code:** `CollectPaymentPanel.jsx:517` does `totalDiscount = manualDiscount + presetDiscount + loyaltyDiscount + couponDiscount + walletDiscount` — they **stack additively**, capped at `itemTotal`.
- **Gap:** Owner has not explicitly confirmed this is the desired business rule.
- **Recommendation:** Add a new owner question (Q9) in the next planning pass: "Should coupon + loyalty + wallet combine additively (current code behavior), or should the cashier pick at most one/two?" **Until answered, the safest default is to preserve current code behavior (additive).**

### 4.3 CQ-CR-12 — Coupon vs. Manual/Preset Discount Precedence

- **Baseline:** Asks how a CRM coupon discount interacts with the existing manual/preset discount.
- **My docs:** **Not addressed.**
- **Reading from existing code:** `manualDiscount + presetDiscount + couponDiscount` are all summed in `totalDiscount` (additive). No precedence logic.
- **Gap:** Owner has not confirmed whether a coupon **replaces** or **stacks with** a manual discount.
- **Recommendation:** Add a new owner question (Q10) in the next planning pass: "If a cashier applies BOTH a manual discount and a coupon, should they stack (current behavior) or should the coupon override the manual?" **Until answered, default is stack.**

### 4.4 BUG-104 ↔ BUG-108 Overlap (OQ-CR-05)

- **Baseline OQ-CR-05:** "Should Credit module integrate with CRM `customer_id` (BUG-108 overlap) or remain mobile-number-based (current PAY-008 rule)?"
- **Current state:** BUG-104 Phase 1 + 2A shipped mobile-number-based. No CRM `customer_id` linkage.
- **My BUG-108 docs:** Do not address whether a credit customer also has a CRM `customer_id`, or whether selecting a credit customer should auto-load their CRM coupons/loyalty/wallet.
- **Gap:** Cross-CR question. Not a hard conflict, but a future "delight" path (e.g., when a credit customer pays off their tab, do they earn loyalty points?) is undefined.
- **Recommendation:** Out of scope for BUG-108 P1. Flag for the future "redemption" CR (Q4 deferral): "When a credit/tab customer settles, should CRM loyalty/wallet rules apply?"

### 4.5 Response-Side Fields (`loyalty_info`, `wallet_info`, `coupon_info`)

- **Baseline `BACKEND_FIELD_UNPARK_DECISION_2026_05_06.md`:** Records that the backend already returns `loyalty_info` (8/13 restaurants) and `wallet_info` (8/13) on order/profile responses. `coupon_info` is null everywhere.
- **My docs:** Did not analyze response-side fields. Focused on request-side payload (`use_wallet_balance`, `used_loyalty_point`, `coupon_discount`).
- **Implication:** When BUG-108 P1 ships, the frontend may already have access to a `loyalty_info` blob on the order response — useful for displaying "loyalty earned on this order" (a future feature, not BUG-108).
- **Action:** Not a conflict. Noted for completeness. No change needed.

### 4.6 CR Playbook Format — Future P1 Handoff Must Follow 10-Step Format

- **Baseline `CHANGE_REQUEST_PLAYBOOK.md`:** Mandates a 10-step format with **Impact Analysis**, **Approval Gate**, **File-Level Change Plan**, **Testing Checklist**, **Handover Note** sections.
- **My docs:** Used a lighter discovery + UX format (Q&A + matrix + API inventory + UX layout).
- **Reconciliation:** Discovery/planning docs are **not** implementation docs. The playbook's 10-step format applies to **implementation handoffs**. When 108-P1 implementation is scoped, the next agent must produce a doc that follows the playbook (Approval Gate + File-Level Change Plan + Testing Checklist).
- **Action:** No retroactive change to my docs. **Add to TODO for 108-P1:** the next planning agent must produce a playbook-compliant implementation handoff before any code is written.

---

## 5. New Items to Add to the Owner Question Set (for Next Planning Pass)

Surfaced by baseline reconciliation. These extend the existing Q1-Q8 in `BUG_108_FRONTEND_UX_PLANNING_AND_OWNER_APPROVAL_2026_05_22.md`:

| New Q | Source | Question | Recommended default |
|-------|--------|----------|---------------------|
| **Q9** | CQ-CR-11 | Should coupon + loyalty + wallet combine additively (current behavior) or be mutually exclusive? | **Combine additively** (preserves current code) |
| **Q10** | CQ-CR-12 | If a cashier applies both manual discount and coupon, should they stack or should coupon override? | **Stack additively** (preserves current code) |
| **Q11** | OQ-CR-05 (cross-CR) | When a credit/tab customer eventually settles, should CRM loyalty/wallet rules apply on the settlement payment? | **Out of BUG-108 scope; defer to redemption CR** |

These are not blockers for 108-P1 (read + validate only) — they only matter when redemption logic is wired in the future CR.

---

## 6. What Was Confirmed Aligned (No Action Needed)

| Topic | My doc | Baseline | Verdict |
|-------|--------|----------|---------|
| BUG-108 is CRM-blocked | UX Plan §13 | Sprint Status §123 | ✅ Aligned |
| CRM customer balance reads are already live | API Inventory §2 | CR Master §144 (loyalty/wallet endpoints inherited from BUG-098 work) | ✅ Aligned |
| 6+ CRM endpoints needed | API Inventory §3 | CR Master §202 | ✅ Aligned |
| BUG-099 + BUG-108 must coordinate on `CollectPaymentPanel.jsx` | (not flagged in my docs) | CR Master §859 (HIGH-risk hotspot) | ⚠️ See §7 |
| Owner-only decision authority | Owner Decisions Recorded doc | Playbook §41 | ✅ Aligned |
| No silent discount mutations | UX Plan §10 (payload safety) | Architecture §283 (CRM error handling) | ✅ Aligned |

---

## 7. Cross-CR Hotspot Warning (Important)

`CR_MASTER_PLANNING_2026_05_18.md` §859 explicitly flags:

```
| CollectPaymentPanel.jsx | BUG-099 (compact layout), BUG-108 (coupon/loyalty/wallet)
                          | HIGH — 2514-line hotspot. Both CRs modify this file. Must coordinate. |
```

**Implication:** If **BUG-099** (compact layout for CollectPaymentPanel) is in flight or planned, the BUG-108 P1 work must coordinate to avoid merge conflicts and overlapping refactor.

**Action:** Before kicking off BUG-108 P1 implementation, check the sprint status doc for BUG-099 state. If BUG-099 is in flight, the two should be planned together (or BUG-099 shipped first to provide a clean baseline for BUG-108 UI edits).

---

## 8. Summary of Reconciliation

| Bucket | Count |
|--------|-------|
| Hard conflicts with baseline | **0** |
| Owner-approved overrides of baseline assumptions | **3** (Q1 ownership, Q5 reversal model, Q4 deferral) |
| Gaps in my docs surfaced by baseline | **3** (Q9, Q10, Q11 — added to question set) |
| Cross-CR overlaps to coordinate | **2** (BUG-104 OQ-CR-05, BUG-099 hotspot) |
| Already-aligned items | **6** |
| Format requirements for 108-P1 implementation handoff | **1** (CR Playbook 10-step compliance) |

**Net:** My BUG-108 docs are **fit for purpose as discovery/planning artifacts**. They need **light alignment** before P1 implementation:
1. Add Q9/Q10/Q11 to the next owner-approval round.
2. Confirm BUG-099 status to avoid CollectPaymentPanel hotspot collision.
3. Use the CR Playbook's 10-step format for the eventual implementation handoff.

---

## 9. Recommended Next Actions

1. **Show the owner this note** so they can answer Q9/Q10/Q11 before 108-P1 code starts.
2. **Check BUG-099 status** in `POS3_0_COMPLETE_SPRINT_STATUS_RECONCILIATION_2026_05_21.md` and decide ordering.
3. When CRM endpoints arrive (and Loyalty-page screenshot is shared), the next agent should produce a CR Playbook-compliant implementation handoff covering:
   - Impact analysis (modules / routes / services / transforms / storage / regression risk)
   - Approval Gate
   - File-Level Change Plan (per file)
   - Testing Checklist (happy / error / permission / socket / regression)
   - Handover note

4. **No edits to existing BUG-108 docs** (Discovery Plan, Decision Matrix, Owner Decisions Recorded, API Inventory, UX Planning) are required by this reconciliation. They remain valid; this note is the bridge between them and the recovered baselines.

---

## 10. Confirmations

| # | Confirmation | Status |
|---|--------------|--------|
| 1 | No code (frontend or backend) was changed in this reconciliation | ✅ |
| 2 | No baseline doc was edited | ✅ |
| 3 | No existing BUG-108 doc was edited | ✅ |
| 4 | No APIs invoked | ✅ |
| 5 | No data mutated | ✅ |
| 6 | `/app/memory/final/` was read but not written to | ✅ |
| 7 | Only new file created: this reconciliation note | ✅ |

---

**End of BUG-108 Baseline Reconciliation Note.**
