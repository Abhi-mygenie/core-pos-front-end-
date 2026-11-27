# CR-527b — Impact Analysis (Gate 2)

**ID:** CR-527 (slice "b") · **Type:** CR · **Stage:** Gate 2 — Impact Analysis
**Date:** 2026-11-24 · **Role:** PLANNING (IA only — owner asked Gate 2)
**Risk:** **MEDIUM** · **Priority:** P2 · **Client:** ALL · **Assignee:** Abhishek
**Intake:** `change_requests/CR-527b_CREDIT_DINER_DROPDOWN_UX_REINTAKE_INTAKE.md`
**Cherry-pick source:** branch `notification-fix` (`8c80bfe`), per-hunk.

---

## Header — Code Reality & Conflict Pre-Check

- **Code Reality:** **NONE on deployed `main`** for this slice (diner filter is name-only, Popover is modal, no scroll-isolation). **FULL on `notification-fix`** (the port source). The *surrounding* CR-527 diner-filter infra (state, mapper, chips/dropdown skeleton) is already on `main` — CR-527b is **additive polish on top of it**.
- **Conflict Pre-Check (same file `CreditCustomerDetailSheet.jsx`, 913 lines on main):**
  - **BUG-733** (DatePicker swap) — **SHIPPED** (GATE_5A), date-range block **L471-478**. Line-disjoint from the diner region (L601-703). **No conflict.**
  - **CR-526** (Remove button / Action column) — shipped, `CreditRow` region. Different region. **No conflict.**
  - **CR-527 capture phase** — shipped; this slice extends its dinerMap/render. **Additive, no conflict.**
  - **CR-527a** — different files (`orderTransform.js`, `CollectPaymentPanel.jsx`), QA-pending. **No file overlap → parallel-safe** (resolves OD-527b-3 default).
  - **Watch:** FILE_OWNERSHIP notes a possible future **BUG-734** on this same file — none open in registry today; if it opens, sequence in one PR.

---

## 1. Problem (confirmed in code)

`CreditCustomerDetailSheet.jsx` diner filter, shown when a holder has `distinctDinerCount > 1`:
- **≤5 diners** → chip row (L631-659).
- **6+ diners** → searchable `Popover` + `Command` dropdown (L660-696).

Two gaps on `main`:
1. **Scroll bleed / modal:** `<Popover open={dinerMenuOpen} ...>` (L661) is default **modal**, and `PopoverContent` (L674) + `CommandList` (L677) have **no** `onWheel`/`onTouchMove` handlers → wheel/touch inside the list scrolls the sheet behind it.
2. **Name-only labels:** `dinerLabelOf` (L116) returns name only; the dinerMap entry (L612) carries no `mobile`. So chip (L656), trigger `<b>` (L670), CommandItem label (L689), search `value` (L686), and active-summary (L700) all show **name only** — same-name diners are indistinguishable even though `dinerKeyOf` (L115) already separates them by `name|mobile`.

## 2. Data-flow trace (API → UI)

```
API credit list  →  local mapper L270-271:  dinerName = c.diner_name,  dinerMobile = c.diner_mobile   ✅ PRESENT on main
      →  dinerKeyOf(c) = `${dinerName}|${dinerMobile}`  (L115)  → already unique per name+mobile
      →  dinerMap entry (L603-616): { key, label, count, open, noName }   ← BREAK: no `mobile` carried
      →  render: chip L656 / trigger L670 / CommandItem L686,L689 / summary L700   ← BREAK: label = name only
      →  Popover L661 modal + PopoverContent L674 / CommandList L677   ← BREAK: no scroll-isolation
```
**No API / transform / fetch is touched.** `diner_mobile` already arrives and is already mapped (CR-527/BB-09, L271). FIFO coverage + `matchesDiner` filter key are **unchanged** (dinerMap is a display lens only — L601-602 comment).

## 3. Files & edit sites (scope lock)

**WILL change — 1 file:** `frontend/src/components/credit/CreditCustomerDetailSheet.jsx`

| # | Main line | Change (from `nf`) |
|---|---|---|
| 1 | L612 | dinerMap entry: add `mobile: c.dinerMobile \|\| ''` |
| 2 | L656 | chip (≤5 branch): `title` + label `{mobile ? `${label} · ${mobile}` : label} ({count})` |
| 3 | L661 | `<Popover modal={false} ...>` |
| 4 | L670 | trigger `<b>`: active label includes `· {mobile}` |
| 5 | L674 | `PopoverContent` add `onWheel`/`onTouchMove` `stopPropagation` |
| 6 | L677 | `CommandList` add `onWheel`/`onTouchMove` `stopPropagation` |
| 7 | L686 | CommandItem `value` includes `${mobile}` (broadens search match) |
| 8 | L689 | CommandItem: two-line `name` + muted `mobile` |
| 9 | L700 | active-summary line includes `· {mobile}` |

~9 edit sites, all inside **L601-703**. **No new imports** (`Popover`/`Command` already imported L16-17; `modal` is a standard Radix `Popover.Root` prop).

**WILL NOT touch:** local mapper L270-271 · `dinerKeyOf`/`dinerLabelOf` module helpers (key logic unchanged) · `matchesDiner`/FIFO coverage · date-range block (BUG-733 L471-478) · `CreditRow` Diner cell (L133-143) · `CREDIT_TABLE_HEAD` · any API/transform · `CreditManagementPanel.jsx`.

## 4. Downstream consumers / blast radius

- **`CreditManagementPanel.jsx` L362** renders the sheet — props unchanged, display-only → **no impact**.
- Blast radius: **SMALL** (1 file, 1 render region). Hotspot file: **YES** → line-disjoint discipline + credit-sheet regression in QA.

## 5. Risk register

| Risk | Likelihood | Mitigation |
|---|---|---|
| `modal={false}` changes Popover dismissal/focus behaviour | LOW | QA: outer click still closes; keyboard focus into search works; no stuck-open |
| `stopPropagation` blocks a needed outer scroll | LOW | Intended; only stops wheel/touch originating inside the list |
| CommandItem `value` change alters cmdk fuzzy-match | LOW | Only **adds** mobile to the searchable string — broadens, never narrows |
| Same-name/blank-mobile edge | LOW | `mobile:''` → label-only render (graceful); key already unique via L115 |
| Hotspot regression elsewhere in sheet | LOW | Edits confined to L601-703; date/remove/row regions untouched |

**No financial / API-contract / socket / localStorage impact.** No backend dependency. No live curl-probe required (pure client render).

## 6. Owner decisions (carry to Gate 3)

- **OD-527b-1:** confirm **P2 / Risk MEDIUM** (agent-assessed). _Recommend: confirm._
- **OD-527b-2:** ship dropdown exactly as on `notification-fix` (name · mobile, scroll-isolation, `modal={false}`), or design pass first? _Recommend: ship as-on-`nf` (matches shipped capture-phase styling)._
- **OD-527b-3:** **RESOLVED by IA** — CR-527b and CR-527a touch **different files**, so **parallel-safe**; no need to wait for CR-527a QA.

---

**Gate status:** GATE_2_IA_COMPLETE
**Next:** PLANNING Gate 3 (Implementation Plan + Verification Matrix) — on owner request. No code/cherry-pick until owner Gate-4 GO.
