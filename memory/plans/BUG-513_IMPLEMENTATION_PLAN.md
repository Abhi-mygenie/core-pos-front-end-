# BUG-513 — IMPLEMENTATION PLAN (Gate 3)

**ID:** BUG-513
**Date:** 2026-10-08
**Agent:** PLANNING (Gate 2+3 combined at owner request)
**Based on:** `impact/BUG-513_IMPACT_ANALYSIS.md`
**Risk:** CRITICAL (R6 financial)
**Awaiting:** Owner **Gate 4 GO** before any code change

---

## Scope Lock

**Files WILL change:**
- `src/components/pms/frontdesk/CheckInForm.jsx` — 1 edit, L124

**Files will NOT touch:**
- `CheckInPage.jsx` — already protected, zero changes
- `pmsService.js` — no change
- Any other file

---

## Edit E-1 — Add `collectBlockedAtMax` guard to `confirm()`

**File:** `src/components/pms/frontdesk/CheckInForm.jsx`
**Line:** 124
**Type:** 1-character word addition to existing guard

**Current (L123–124):**
```js
  const confirm = async () => {
    if (!ready || busy) return;
```

**New (L123–124):**
```js
  const confirm = async () => {
    if (!ready || busy || collectBlockedAtMax) return;  // BUG-513: block GST collect at max discount
```

**Why this is safe:**
- `collectBlockedAtMax` const already exists at L97 (placed by BUG-512)
- At all normal discount levels: `collectAtMaxGst = FALSE` → `collectBlockedAtMax = FALSE` → guard passes, no behavior change
- At max discount + collect entered: `collectBlockedAtMax = TRUE` → guard fires → function returns without API call
- Mirrors the pattern already used at `CheckInPage.jsx` L309 (`if (!formValid || submitting)` where `formValid` includes `!collectBlockedAtMax_ci`)
- Does not affect any other check-in path

**Change summary:** 1 file, 1 line, 3 words added (`|| collectBlockedAtMax`)

---

## Verification Matrix

| # | Edit | How to Verify | Steps | Automated? |
|---|---|---|---|---|
| V-1 | E-1 guard added | grep confirms `collectBlockedAtMax` in guard | `grep -n "if (!ready" CheckInForm.jsx` → must show `|| collectBlockedAtMax` | YES (grep) |
| V-2 | Sub-issue A: confirm() blocked at max | Browser — enter max discount + collect=50 → click Confirm → NO API call fired | Network tab: no POST to check-in API | NO (browser) |
| V-3 | Normal discount unaffected | Browser — enter 60% discount + valid collect → click Confirm → API call fires normally | POST to check-in API with correct collectNow | NO (browser) |
| V-4 | Zero collect at max | Browser — max discount + collect=0 → `collectBlockedAtMax = FALSE` → Confirm works | Confirm button enabled, check-in proceeds | NO (browser) |
| V-5 | Sub-issue B diagnostic | After E-1, click Confirm button at max+collect=50 → does it reach confirm()? | console.log or Network tab — if NO request, HTML disabled is working | NO (browser) |
| V-6 | webpack compiles | `tail -5 /var/log/supervisor/frontend.out.log` → "Compiled" | No new errors/warnings | YES (log check) |

**Critical test V-2:** Proves the financial fix works. Network tab must show ZERO API calls when clicking at max discount.

---

## Post-Code Registry Checklist

```
- [ ] registry.json: BUG-513 → status: GATE_5A_IMPLEMENTED
- [ ] BUG_TRACKER.md: BUG-513 row updated
- [ ] FILE_OWNERSHIP.md: CheckInForm.jsx — BUG-513, 2026-10-08
- [ ] Code marker: // BUG-513 comment on L124
- [ ] COMPILE CHECK: webpack 0 new warnings
```

---

## Sub-issue B — Post-Implementation Path

After E-1 is implemented and V-2 passes:

**Run V-5 (diagnostic):** At max discount + collect=50, click Confirm button.

| V-5 Result | Classification | Action |
|---|---|---|
| No API call fired (button click blocked by HTML `disabled`) | **Cosmetic only** — H4 confirmed (visual ambiguity) | File separate LOW/cosmetic CR for better disabled styling. Close BUG-513. |
| API call fires (clicks go through despite `disabled`) | **UX blocking bug** — H5 confirmed (disabled prop not setting HTML attr) | File BUG-514, immediate investigation. E-1 guard still catches it financially. |
| confirm() logs entry but returns immediately (E-1 guard fires) | **E-1 working as designed** — clicks go through but guard stops API | Sub-issue A sufficient. Sub-issue B = cosmetic. |

**Key point:** Regardless of V-5 outcome, E-1 provides financial protection. Sub-issue B can be triaged post-implementation without urgency.

---

## Risk Register

| Risk | Probability | Mitigation |
|---|---|---|
| E-1 accidentally blocks Confirm at non-max discounts | LOW — `collectBlockedAtMax = FALSE` at all non-max levels | V-3 covers this |
| Line drift (L124 shifted since plan written) | LOW — file just modified in last session | Agent: verify L124 reads `if (!ready \|\| busy)` before editing |
| Sub-issue B persists requiring urgent fix | MEDIUM — root cause still unclear | E-1 provides financial protection regardless; V-5 determines urgency |

---

## Execution Sequence

```
1. Entry verification: confirm L124 reads `if (!ready || busy) return;`
2. Apply E-1 (search_replace, 1 line)
3. webpack compile check
4. V-1 grep verification (immediate)
5. V-2 + V-3 + V-4 browser tests
6. V-5 Sub-issue B diagnostic
7. EXIT GATE 5-checkbox pass
8. Write QA handover (can combine with BUG-511 + BUG-512 QA sweep)
```

---

## QA Handover Seed

These test cases feed directly into the combined check-in discount QA sweep:

| TC | Scenario | Steps | Expected |
|---|---|---|---|
| TC-513-1 | Max discount + collect=50, click Confirm | Enter 88.34%/₹7950, enter 50 in collect, click Confirm | NO API call. Function returns at guard. |
| TC-513-2 | Max discount + collect=0, click Confirm | Enter 88.34%/₹7950, collect=0, click Confirm | Check-in proceeds (collectAmt=0, guard doesn't fire) |
| TC-513-3 | Partial discount + valid collect, click Confirm | 60% + collect=2700, click Confirm | Check-in API fires normally |
| TC-513-4 | Max discount + collect=50, V-5 diagnostic | After fix, click button — observe if reaches confirm() | Either blocked by HTML disabled OR caught by guard |

