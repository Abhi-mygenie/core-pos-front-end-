# CR-038 — Boot Screen Retry Policy — Manual Retry with Counter/Limit

**Status:** REGISTERED — INTAKE COMPLETE
**Created:** 2026-06-12
**Type:** CR (Change Request)
**Area:** Loading (LoadingPage.jsx)
**Priority:** P2 (UX resilience — no money/data impact)
**Sprint:** POS 4.0

---

## 1. Symptom / Requirement

When any API fails on the boot (loading) screen, a "Retry Failed (N)" button appears. Currently:
- **No automatic retry** — cashier must manually click each time
- **No retry limit** — unlimited manual retries allowed
- **60-second timeout** per API call (axios.js L17) — a slow network means 60s wait before failure

Owner directive: **Keep manual retry but add a retry counter/limit** (Option B). After N retries, behaviour TBD (disable button / show escalation message / force logout).

---

## 2. Current Behaviour (Investigation)

| Aspect | Current |
|--------|---------|
| Auto-retry | ❌ None |
| Manual retry | ✅ Unlimited — `handleRetry()` at L581 |
| Retry scope | Smart — only re-runs failed APIs (`failedKeys` filter at L582-584) |
| Retry counter | ❌ None |
| Max retries | ❌ No limit |
| Timeout per API | 60 seconds (axios.js) |
| Station phase | Also retried if failed (L586, L601-603) |

### Code location
- `handleRetry` function: `LoadingPage.jsx` L581–618
- Retry button UI: `LoadingPage.jsx` L820–827
- API timeout: `axios.js` L17

---

## 3. Proposed Behaviour (pending owner decisions)

| # | Decision | Owner Answer |
|---|----------|-------------|
| OQ-1 | Max retry count | **3** |
| OQ-2 | After max retries exhausted | **(a) Disable button + show "Contact support" message** — user is not logged in at this point anyway |
| OQ-3 | Show retry count to user | **YES** — e.g., "Retry Failed (1) — Attempt 2 of 3" |
| OQ-4 | Per-API or global counter | **Global** — 3 total clicks regardless of which API fails |

---

## 4. Impact

- **Boot screen only** — no impact on any other screen
- **Regression risk:** LOW — changes limited to `handleRetry` + retry button UI
- **Money/payload impact:** NONE
- **Files:** 1 file (`LoadingPage.jsx`)

---

## 5. Gate Status

| Gate | Status |
|------|--------|
| 0 — Registration | ✅ COMPLETE |
| 1 — Intake | ✅ COMPLETE (this document) |
| 2 — Impact Analysis | PENDING |
| 3 — Implementation Plan | PENDING |
| 4 — Code Gate | PENDING |
| 5 — Implementation + QA | PENDING |
| 6 — Owner Smoke | PENDING |

---

*CR-038 Intake — 2026-06-12*
