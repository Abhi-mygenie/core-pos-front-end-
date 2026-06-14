# CR-045 — Insights Module: Suppress/Ignore Unused API Response Fields

**Status:** REGISTERED — INTAKE COMPLETE
**Created:** 2026-06-12
**Type:** CR (Change Request)
**Area:** Insights Module / API Transforms / Performance
**Priority:** P2 (performance optimization — reduce memory footprint of large report responses)
**Sprint:** POS 4.0

---

## 1. Symptom

The `order-logs-report` API returns many fields per order that are never used by any FE report. These fields consume network bandwidth and memory when stored in React state, especially for large date ranges (1000+ orders).

Owner has a list of specific fields to suppress. Even if backend doesn't stop sending them, FE should ignore/strip them at the transform layer.

---

## 2. Technical Assessment

**Current behaviour:** FE transforms (`insightsService.js`, `orderLedgerService.js`, etc.) already cherry-pick specific fields from each order/item. Fields not explicitly referenced are technically "ignored" — they exist in the raw `res.data` object but are never read into aggregated state.

**However:** The raw `res.data` object (which can be 10-50 MB for large date ranges) lives in memory until garbage collected. If we cache raw responses (CR-044), unused fields would persist longer.

**Two levels of suppression possible:**

| Level | What | Impact | Effort |
|-------|------|--------|--------|
| **L1 — Transform-level strip** | At the point where each report service reads the API response, explicitly map only needed fields into the working dataset. Discard the raw response immediately after extraction. | Reduces memory after transform. Raw response still downloaded. | Low — modify entry point of each service |
| **L2 — Response interceptor strip** | Add an axios response interceptor or wrapper that strips known-unused fields before ANY consumer sees them. | Reduces memory at the earliest point. Raw response discarded immediately. | Medium — centralized but needs a field whitelist |

**Recommendation:** L1 is safer and more maintainable — each service knows which fields it needs. L2 is more aggressive but creates a centralized dependency.

---

## 3. Open Items

- **Owner to provide the specific list of dead/unused fields** — will be captured during investigation phase
- **Depends on CR-044** — if raw response caching is implemented, field stripping becomes more impactful (cached data should be lean)

## 3a. TEMPORARY ARRANGEMENT — Backend Will Take Over

**This CR is a TEMPORARY FE-side optimization.** Backend team will ship server-side field stripping in a future release. When that happens:
- Set `REACT_APP_STRIP_ORDERS=false` in frontend `.env` to disable FE stripping
- QA all reports to verify backend strip covers everything
- Remove `orderPayloadStripper.js` and all import references
- Full deprecation plan documented in `PHASE_5_INSIGHTS_OPTIMIZATION_IMPLEMENTATION_PLAN.md`

**Design constraints enforced:**
- `STRIP_ENABLED` env flag (default ON, togglable without code change)
- No format mutations (`food_details` string stays string after strip)
- Double-strip safe (`pick()` on already-stripped data = harmless passthrough)

---

## 4. Gate Status

| Gate | Status |
|------|--------|
| 0 — Registration | ✅ COMPLETE |
| 1 — Intake | ✅ COMPLETE (this document) |
| 2 — Impact Analysis | PENDING (waiting for owner's field list) |
| 3 — Implementation Plan | PENDING |
| 4 — Code Gate | PENDING |
| 5 — Implementation + QA | PENDING |
| 6 — Owner Smoke | PENDING |

---

*CR-045 Intake — 2026-06-12*
