# Baseline Code-Verification Report — 2026-05-31

**Trigger:** P0 baseline promotion (handover `NEXT_AGENT_HANDOVER_2026_05_31.md`) — promote the 4 fully-closed
sprints into the frozen baseline, **with the actual application code as the final source of truth**.
**Mode:** Owner-directed **Option A — code-verified promotion** (not doc/attestation-only).

---

## 0. Code anchor (source of truth)

| Field | Value |
|---|---|
| Repo | `https://github.com/Abhi-mygenie/core-pos-front-end-.git` |
| Branch | `31may-for-baseline` |
| Verified commit | `8f92e8c` |
| Working tree used | `/app/frontend/src` (live code) |
| Drift linter | `node scripts/gen_dashboard_data.js --check` → **clean** before & after |

**Branch alignment check:** this branch's load-bearing file sizes match the control-layer landmines
(`OrderEntry.jsx` 2493, `orderTransform.js` 1916, `DashboardPage.jsx` 1975, `CollectPaymentPanel.jsx` 3057),
confirming the control docs were last maintained against **this** code. Traceability is high: **959**
work-item comment lines (`BUG-*/CR-*/POS2-*`) across **69** files annotate the actual fixes.

> Note: the earlier `analysis/DOC_VS_CODE_GAP.md` was produced on a *different* branch (`step1`/`c9d6192`).
> This report re-anchors all evidence to `31may-for-baseline`/`8f92e8c`.

---

## 1. Method

1. Treat the **frontend code** as the final source of truth (not the closure docs).
2. For every promotable (done) item in the 4 sprints, locate the **claimed change in code** (file:line).
3. Promote (freeze) **only** items whose claim is confirmed in code, OR — for items with no frontend
   footprint (backend/runtime) — that carry an owner-smoke sign-off, explicitly labelled.
4. **No fabrication.** Anything not confirmable in code is bucketed honestly, not promoted on code grounds.

---

## 2. FE-code-verified items — PASS (promoted on code evidence)

| Item | Sprint | Claim | Code evidence (commit 8f92e8c) | Verdict |
|---|---|---|---|---|
| POS2-003 | POS 2.0 | Per-station print-agent mapping from profile | `printerAgentSelector.js:2`; `RestaurantContext.jsx:88`; `profileTransform.js:192,283` | ✅ PASS |
| POS2-003-REOPEN-A | POS 2.0 | `printer_agent` additive field on cancel-item | `orderTransform.js:780` | ✅ PASS |
| POS2-003-REOPEN-B | POS 2.0 | `place-order` reverted v1 → v2 per owner directive 2026-05-09 | `constants.js:59` (`PLACE_ORDER = '/api/v2/.../place-order'` + owner-directive comment) | ✅ PASS |
| POS2-003-FU-02 | POS 2.0 | Modal-local customer-intel hook (FU-02) | `CustomerModal.jsx:207` (`CR-002-FU-02` hook) | ✅ PASS |
| POS2-005 | POS 2.0 | status-8 (Running/Unpaid) Hold-classified → Audit tab, not dashboard; HOLD priority over PAID | `socketHandlers.js:189,562`; `constants.js:200`; `TableCard.jsx:309`; `OrderCard.jsx:432` | ✅ PASS |
| POS2-007 Phase 1 | POS 2.0 | Confirm-order tone override from profile (`confirmOrderTone`), Silent Mode still wins | `NotificationContext.jsx:26,99,117`; `utils/soundManager.js` | ✅ PASS |
| BUG-097 | POS 3.0 | Dispatch vs Assign-Rider driven by `delivery_assign` from **profile**, never `order_in`/`source` | `profileTransform.js:127`; `TableCard.jsx:70,72,457`; `OrderCard.jsx:81` | ✅ PASS |
| BUG-111 P1+P2 | POS 3.1 | Server-authoritative QSR bill parity on placed orders | `CartPanel.jsx:365,499` (`POS3.1 BUG-111 Phase 2`) | ✅ PASS |
| CR-002 | CRM 2.0 | Commit payload `order_note`/`food_level_notes` emit `{label}`-shaped notes (unchanged from BUG-108 baseline) | `orderTransform.js:602,882,1007,1135` | ✅ PASS |
| OG-06 (CR-002) | CRM 2.0 | Legacy note GETs (`/notes/items`, `/notes/orders`) removed | No axios GET to notes endpoints in `frontend/src` (only an unrelated code comment matches) | ✅ PASS |
| PROD-HOTFIX-007 | standalone | Loyalty earn/redeem with client idempotency | `loyaltyTransform.js` (idempotency key + `BUG108_FLAGS.loyaltyRedeemLive`) | ✅ PASS |
| PROD-HOTFIX-008 | standalone | KOT payload carries `custName`/`custPhone` | `orderService.js:145-156` | ✅ PASS |
| Audit Report Optimization | standalone | `/order-logs-report` transform for Audit Report page | `reportTransform.js:650` | ✅ PASS |

**Result: all 13 verification rows PASS — 12 distinct promotable items (OG-06 is a sub-check of CR-002) confirmed in code. 0 silent reversals. 0 mismatches.**

---

## 3. Frozen on owner-smoke (no FE footprint — not code-verifiable in this repo)

This is a **frontend-only** repo; the backend is the external Laravel/Firebase/socket stack. The following
classes of closed items have **no frontend code surface** to verify here and are frozen on their recorded
owner-smoke / owner-attestation evidence (explicitly labelled, per Option A honesty rule):

- **Owner-attested, no-code-needed closures** — e.g. `PROD-002` (Settle print guard: owner live-QA confirmed
  backend does not print on paid-prepaid order; no FE fix), `POS2-002`/`POS2-005-FU §B` (closed as-designed).
- **Production-verified backend behaviour** — owner live-capture sign-offs (e.g. CR-002 T-28/T-29 live PASS).

These are **valid baseline members** but their ground truth lives in the backend + owner sign-off, not this code.

---

## 4. Explicitly NOT promoted into the frozen baseline

Kept "in play" for POS 4.0 / separate tracks (unchanged by this report):

- **Subsumed (owner-attested)** items — labelled SUBSUMED; not frozen as independently code-verified work.
- **Backend-blocked / owner-scope / deferred** items — already carried into the **POS 4.0 backlog**.
- **24 unfrozen business rules** — remain on their separate 5-step promotion gate (32/56 frozen at P0 time; TIP-003 + ROUND-001 promoted later same day → 34/56, see `BUSINESS_RULE_PROMOTION_TIP003_ROUND001_2026_05_31.md`).

---

## 5. Outcome

- **4 sprints code-verified & frozen:** POS 2.0, POS 3.0, POS 3.1, CRM 2.0.
- The **actual frontend code on `31may-for-baseline`@`8f92e8c` is the recorded source of truth** for every
  promoted FE item (file:line evidence above).
- Registry updated: `sprints_meta` marks the 4 sprints `frozen: true` (POS 3.1 / CRM 2.0 flipped ACTIVE → CLOSED
  to match `SPRINT_STATUS.md`); a top-level `baseline_code_verification` block records this evidence.
- Dashboard pipeline re-generated; `--check` clean (no drift).

## 6. Certifications

- ✅ Code (not docs) used as the final source of truth; evidence anchored to `8f92e8c`.
- ✅ No production code modified during verification (read-only inspection).
- ✅ No fabricated artifacts; non-code-verifiable items bucketed honestly.
- ✅ Derived dashboard JSONs untouched by hand; only `registry.json` edited, then regenerated + `--check` clean.

---

*End of Baseline Code-Verification Report — 2026-05-31.*
