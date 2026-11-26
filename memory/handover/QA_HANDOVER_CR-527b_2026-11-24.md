# QA Handover — CR-527b (Credit diner-dropdown UX)

**ID:** CR-527 (slice "b") · **Risk:** MEDIUM · **Priority:** P2 · **Date:** 2026-11-24
**Implemented by:** IMPLEMENTATION role · **Status:** GATE_5A_IMPLEMENTED, QA PENDING
**Plan:** `plans/CR-527b_CREDIT_DINER_DROPDOWN_UX_IMPLEMENTATION_PLAN.md` · **IA:** `impact/CR-527b_CREDIT_DINER_DROPDOWN_UX_IMPACT_ANALYSIS.md`

## 0. What shipped
Single file `frontend/src/components/credit/CreditCustomerDetailSheet.jsx`, edits E1-E6 (region L612-724). Functionally identical to branch `notification-fix` (`git diff origin/notification-fix` = only the 3 `// CR-527b` marker comments). webpack compiled successfully, 0 new warnings.

## 1. Inherited from Plan — Verification Matrix (self-test results)
| # | Edit | Verification | Self-test (impl) |
|---|---|---|:--:|
| 1 | E1 dinerMap `mobile` | compiles; mobile available to render | ✅ compile PASS |
| 2 | E2 chip label | chips show `name · mobile (count)` | ⏳ browser (QA) |
| 3 | E3 `modal={false}` | sheet behind not inert; outer click still closes | ⏳ browser (QA) |
| 4 | E4 trigger label | selected diner shows `name · mobile` | ⏳ browser (QA) |
| 5 | E5 scroll-isolation | wheel/touch inside list → list scrolls, **sheet behind does NOT** | ⏳ browser (QA) |
| 6 | E5 search value | typing a mobile number filters to matching diner | ⏳ browser (QA) |
| 7 | E5 2-line item | name (line 1) + muted mobile (line 2); blank mobile → name only | ⏳ browser (QA) |
| 8 | E6 summary | active summary `name · mobile: N orders · ₹X open` | ⏳ browser (QA) |
| 9 | Same-name disambiguation (core value) | two diners same name, diff mobile → 2 distinct, readable entries | ⏳ browser (QA) |
| 10 | Compile | `Compiled successfully`, 0 new warnings | ✅ PASS |

Impl self-test note: code is byte-identical to the already-working `notification-fix` implementation (plus comment markers) and compiles clean; rows 2-9 need a live holder with 6+ distinct diners so are handed to QA.

## 2. Test cases (execute in browser)
Environment: preprod via `REACT_APP_API_BASE_URL`. Account: `pms@macha` (see `memory/test_credentials.md`), restaurant 69. Open **Credit Management → a holder with many credit orders from different diners**.

- **TC1 (6+ dropdown):** Holder with **6+ distinct diners** → `credit-diner-dropdown` renders. Open it: each row shows diner **name + muted mobile** (`credit-diner-search` list, 2-line items).
- **TC2 (scroll-isolation):** With dropdown open, hover the list and **wheel-scroll / touch-drag inside it** → the list scrolls; the **credit sheet behind it does NOT scroll**. (Pre-fix: sheet scrolled.)
- **TC3 (modal=false):** With dropdown open, **click outside** → dropdown closes; content behind remains interactive (not inert). Keyboard: focus reaches the search input.
- **TC4 (mobile search):** Type part of a **mobile number** into search → matching diner(s) filter in (value now includes mobile).
- **TC5 (select → trigger + summary):** Select a diner → trigger `<b>` shows `name · mobile`; the `credit-diner-active-summary` line shows `name · mobile: N orders · ₹X open`; rows filter to that diner.
- **TC6 (chips 2-5):** Holder with **2-5 distinct diners** → chips (not dropdown); each chip shows `name · mobile (count)` with a hover `title`.
- **TC7 (blank mobile):** A diner with no mobile → renders **name only** (no trailing ` · `), no crash.
- **TC8 (same-name disambiguation):** Two diners with the **same name, different mobile** → appear as **two distinct, distinguishable** entries.

## 3. Regression tests
- Credit sheet opens; **covered/partial/open buckets**, FIFO coverage %, amounts unchanged.
- **Date-range filter** (BUG-733 DatePicker) still works; diner list/counts respect the date filter.
- `matchesDiner` filtering unchanged (selecting a diner filters rows by `name|mobile` key).
- Branch thresholds unchanged: **0-1** diner → no filter UI; **2-5** → chips; **6+** → dropdown.
- `CreditRow` **Diner** column and the Remove/Action column (CR-526) unchanged.

## 4. Registry Sync Confirmation
- Registry synced: **YES** (CR-527 slice status → IMPLEMENTED CR-527b GATE_5A; `files` + QA-handover artifact_ref added).
- CR_REGISTRY.md: CURRENT IMPLEMENTATION block prepended.
- FILE_OWNERSHIP.md: row added for `CreditCustomerDetailSheet.jsx` (CR-527b).
- Code markers: `// CR-527b` ×3 in file. Sprint: nov_cr_batch.
- EXIT GATE: **5/5 PASSED**.

## 5. Credentials + Environment
- Account alias: `pms@macha` (password in `memory/test_credentials.md`, masked here), restaurant 69, preprod.
- URL: preview `https://restaurant-pos-app-19--7hrjl4hr.preview.emergentagent.com` (app → preprod API).

**Next:** QA role executes TC1-TC8 + regression. BLOCKER/MAJOR → Bug Fix; else → owner smoke.
