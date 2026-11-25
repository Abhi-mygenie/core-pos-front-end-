# CR-527b (RE-INTAKE) — Credit diner-dropdown UX (mobile disambiguation + scroll-isolation)

**ID:** CR-527 (same ID family, scope slice "b")
**Type:** CR (re-intake / cherry-pick of deferred slice)
**Registered:** 2026-11-24 (INTAKE role, Gate 1)
**Classification:** CR — Credit Management diner-filter dropdown usability
**Severity/Priority:** **P2** (works but awkward; no money/order/contract impact)
**Risk:** **MEDIUM** (component state + filter/display only; hotspot file `CreditCustomerDetailSheet.jsx`; no financial/API/socket/localStorage change)
**Area:** Credit Management (reports/credit UI)
**Client:** ALL
**Assignee:** Abhishek (frontend, not backend-blocked — mirrors CR-527a auto-route)
**Fast Lane:** NOT eligible (target is an R5 hotspot file and change is >10 lines)
**Duplicate check:** **RELATED** — slice "b" of CR-527. NOT a duplicate: capture phase (diner_* threading) + CR-527a (holder re-map) are distinct slices; this is the previously-undone **diner-dropdown UX polish** that lives only on `notification-fix`.

---

## 1. Problem

In Credit Management → Customer Detail, the per-diner filter dropdown (shown when a holder has 6+ distinct diners) has two usability gaps on deployed `main`:

1. **Scroll bleed** — wheel/touch scrolling inside the diner Popover/Command list propagates to the sheet behind it, so the underlying credit list scrolls instead of the dropdown. The Popover also closes on outer interactions because it is modal.
2. **No mobile disambiguation** — diners are listed by **name only**. Two diners with the same name (or blank-name diners) cannot be told apart; the diner's mobile is available in the data (`dinerMobile`, mapped on main at L271) but never shown in the chip, the trigger label, the search value, or the active-summary line.

## 2. Why this is a re-intake (decision history)

- The CR-527 capture phase (diner chips 2-5 / searchable Command dropdown 6+) shipped to `main` on 2026-11-20/21 (GATE_5A). It introduced the diner filter but **name-only**, with a default (modal) Popover.
- The `notification-fix` branch agent later refined that same dropdown: `Popover modal={false}`, wheel/touch `stopPropagation` on `PopoverContent` + `CommandList`, and `name · mobile` across chip/trigger/search/summary.
- That refinement was **never ported to `main`** (gap report `memory/INV-NOTIFICATION-FIX-DEPLOY-GAP-2026-11-24_INVESTIGATION_REPORT.md`, queue item #1). This intake brings the deferred slice back into the pipeline.

## 3. Evidence

**Verified this session via `git diff main origin/notification-fix -- frontend/src/components/credit/CreditCustomerDetailSheet.jsx`:**

- **Deployed `main`** (`CreditCustomerDetailSheet.jsx`):
  - `<Popover open={dinerMenuOpen} ...>` (L661) — no `modal={false}`.
  - `<PopoverContent className="p-0 w-[300px]" align="start">` (L674) — no `onWheel`/`onTouchMove`.
  - `dinerMap` entry has no `mobile`; chip/trigger/CommandItem/summary render `d.label` only.
- **`notification-fix` (`8c80bfe`)** — same file:
  - `<Popover modal={false} ...>` (L669).
  - `PopoverContent` + `CommandList` each add `onWheel={(e)=>e.stopPropagation()}` and `onTouchMove={(e)=>e.stopPropagation()}` (L687-688, L693-694).
  - `dinerMap` entry adds `mobile: c.dinerMobile || ''`; chip `title` + label, trigger `<b>`, CommandItem (two-line name + muted mobile), search `value`, and active-summary all include `· {mobile}`.

- **Source:** AGENT-DISCOVERED (branch-gap investigation). **Confidence:** CONFIRMED (diff inspected this session).
- **Data dependency satisfied on main:** `dinerMobile: c.diner_mobile` already mapped (`CreditCustomerDetailSheet.jsx` L271 `// CR-527/BB-09`), so the mobile value is present without any backend change.

## 4. Scope / Blast radius

- **File (cherry-pick target):** `frontend/src/components/credit/CreditCustomerDetailSheet.jsx` — **1 file**.
- **Consumer:** `frontend/src/components/panels/CreditManagementPanel.jsx` (renders the sheet; display-only, no change needed).
- **Separable:** ✅ clean — no shared-file coupling with the FCM pack, CR-552, or the CR-527a `orderTransform` re-map.
- **Scope lock:** touches only the diner-filter render region (dinerMap entry shape + Popover/Command props + label strings). No data fetch, no client-side credit filter (L321-336), no date-range block (BUG-733 L442-471), no CR-526 Remove/Action region.
- **Hotspot:** YES (`CreditCustomerDetailSheet.jsx` is in R5 / touched by CR-526, CR-527, BUG-733). Estimated scope: **SMALL (1 file, ~6 edit sites).**
- **Risk:** MEDIUM — filter/display UX, non-financial; hotspot file means line-disjoint discipline + QA regression on the credit sheet required.

## 5. Open questions / owner decisions

- **OD-527b-1:** Confirm classification **P2 / Risk MEDIUM** (usability only, no money/contract). _(agent-proposed; owner may override.)_
- **OD-527b-2:** Ship the dropdown exactly as on `notification-fix` (name · mobile + scroll-isolation + `modal={false}`), or does the mobile display need a design pass first? _(default: ship as-on-branch — LOW/MED, matches the shipped capture-phase styling.)_
- **OD-527b-3:** Sequencing — port CR-527b **after** CR-527a QA signs off (both touch the CR-527 family), or in parallel (different files, no overlap)? _(default: parallel-safe; different files.)_

## 6. Source commit for cherry-pick

- Branch `notification-fix` (`8c80bfe`, single squashed commit). Extract the `CreditCustomerDetailSheet.jsx` hunks only (**per-hunk**, not `git cherry-pick <sha>`).

## 7. Credentials / environment

- Test account: see `/app/memory/test_credentials.md` (alias `pms@macha` / client ALL). Password masked per control-doc security rule.

---

**Gate status:** GATE_1_INTAKE_COMPLETE
**Next:** PLANNING Gate 2 (Impact Analysis) for the 1-file dropdown port — no code/cherry-pick until owner Gate-4 GO.
