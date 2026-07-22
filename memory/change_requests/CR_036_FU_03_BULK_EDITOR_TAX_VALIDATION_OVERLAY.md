# CR-036-FU-03: Bulk Editor — Tax-Required Validation + Backdrop Loader + Data-Loss Race Guard

> **Follow-up to CR-036** (functional).
> Surfaced during owner Gate-4 smoke testing 2026-06-12 alongside CR-036-FU-02.

**Registered:** 2026-06-12
**Sprint:** pos_4_0
**Priority:** P1 — money-related (items missing tax on GST-enabled restaurants break billing) + P2 (UX + silent data-loss race during import)
**Status:** **GATES 1 + 2 + 3 COMPLETE 2026-06-12.** Awaiting owner Gate-4 smoke.

---

## 0. Related CRs
- **CR-036** (parent — Bulk Editor Add Item Row Visibility)
- **CR-036-FU-01** (sibling — Validation UX; this CR extends `_validationErrors` mechanism with F3 rules)
- **CR-036-FU-02** (sibling — Column reorder + Sold By tier promotion)
- **CR-013 Phase 1.5 D-GST-3** (May-2026 — backend persists `service_gst_tax_amount` + `tip_gst_tax_amount`; same restaurant-tax-config domain)

---

## 1. Problem Statement

### G-1 (F3) — No tax validation when restaurant has GST enabled
- API returns `gst_status: true` at top of restaurants[0] in `/profile` (owner-confirmed screenshot 2026-06-12).
- BulkEditor doesn't consume `useRestaurant()` — no awareness of restaurant tax config.
- Cashier can save items with `taxPercent: 0` or non-`{GST,VAT}` `taxType` when restaurant requires tax → billing breakage.
- **Exception:** packaged items (`packedFood === "Yes"`) are exempt — pre-priced packaging handled outside item-level tax computation.

### G-2 (N1) — No blocking loader; data-loss race during refresh
- Initial menu load: tiny `<span>Loading...</span>` next to menu-type dropdown (`MenuManagementPanel.jsx:147`) — easy to miss.
- Excel export: only the Export button shows "Exporting...".
- Excel import: only the Import button shows "Importing..." AND `useEffect([foods])` silently wipes user's local edits when `onRefresh` fires post-import (race condition).
- User can add rows / edit cells during load/import → state gets reset when `foods` prop updates → silent data loss.

---

## 2. Root Cause

| Gap | Root cause |
|---|---|
| **G-1** | (a) `restaurant.gstStatus` not exposed in `profileTransform.js`. (b) `BulkEditor.jsx` doesn't `useRestaurant()`. (c) `validateRow` has no tax rule. |
| **G-2** | (a) `MenuManagementPanel.jsx:21` `loading` flag renders only inline text. (b) `BulkEditor.jsx` `useEffect([foods])` unconditionally resets rows. (c) `handleImport` triggers `onRefresh()` without checking dirty state. (d) No global busy-state aggregator. |

---

## 3. Scope Locked (per owner directive 2026-06-12)

### F3 rules
| # | Rule |
|---|---|
| 1 | If `restaurant.tax.gstStatus === true` AND `row.packedFood !== "Yes"` → tax required |
| 2 | Tax required means BOTH `row.taxType ∈ {"GST","VAT"}` AND `Number(row.taxPercent) > 0` |
| 3 | Applies to **both** `_isNew` and existing dirty rows |
| 4 | If `restaurant.tax.gstStatus` is `undefined`/missing → no validation (safe fallback) |
| 5 | Both `taxType` AND `taxPercent` cells get red tint on failure |
| 6 | **Packaged items (`packedFood === "Yes"`) EXEMPT** — owner directive (key: `packedFood` row state, mapping to `packed_food` API field) |

### N1 rules
| # | Rule |
|---|---|
| 1 | Semi-transparent backdrop overlay (`bg-white/60` + `backdrop-blur-sm`) over BulkEditor wrapper |
| 2 | Driven by aggregated `busy = isLoading \|\| exporting \|\| importing` |
| 3 | Status text adapts to operation: "Loading menu…" / "Importing your Excel file…" / "Generating export…" |
| 4 | On import-success-with-unsaved-edits → confirmation Dialog blocks refresh; Continue/Cancel |
| 5 | `useEffect([foods])` race-guard: skip reset while `pendingImport !== null` |
| 6 | No Cancel button on overlay during in-flight operations |

---

## 4. Impact Analysis

### 4.1 Code surface (applied)

| # | Change | File / Region | Δ Lines |
|---|---|---|---|
| 1 | Add `gstStatus: api.gst_status === true` to `tax` block | `profileTransform.js:182-194` | +9 |
| 2 | Add `useRestaurant` import + read `gstRequired` | `BulkEditor.jsx:6-13, 164-167` | +6 |
| 3 | Accept `isLoading` prop on BulkEditor | `BulkEditor.jsx:163` | 1 char |
| 4 | F3 validation rule in `validateRow` with packed-item exemption | `BulkEditor.jsx:407-422` | +15 |
| 5 | `pendingImport` state + race-guard `useEffect([foods, pendingImport])` | `BulkEditor.jsx:201-211` | +12 |
| 6 | `handleImport` confirmation logic + `confirmImportRefresh` / `cancelImportRefresh` handlers | `BulkEditor.jsx:584-617` | +30 |
| 7 | Backdrop overlay JSX (rendered conditionally on `busy`) | `BulkEditor.jsx:660-680` | +20 |
| 8 | Confirmation Dialog JSX (rendered when `pendingImport !== null`) | `BulkEditor.jsx:917-956` | +40 |
| 9 | Pass `isLoading={loading}` from MenuManagementPanel → BulkEditor + drop inline Loading text in bulk mode | `MenuManagementPanel.jsx:146-148, 182` | +4 modified |
| **TOTAL source** | | **3 files** | **~140 lines** |
| 10 | New tests: G-TaxRequired (4) + G-Overlay (2) + G-RaceGuard (2) | `BulkEditor.cr036.test.jsx` (append) | +~150 lines |
| 11 | Mock useRestaurant in CR-027 P3 test (regression) | `BulkEditor.cr027p3.test.jsx` | +8 |

### 4.2 Edge cases (15 — verified)

| # | Scenario | Outcome | Test |
|---|---|---|---|
| EC-1 | `gstStatus=true` + non-packed + tax type cleared/empty | Red treatment + tax-required toast | ✅ T-FU03-1 |
| EC-2 | `gstStatus=true` + packed_food="Yes" + empty tax | **VALID** — exemption applies | ✅ T-FU03-2 |
| EC-3 | `gstStatus=true` + taxType="GST" + taxPercent=0 | Fails on `> 0` rule | ✅ T-FU03-1 |
| EC-4 | `gstStatus=false` + empty tax | No validation triggered | ✅ T-FU03-3 |
| EC-5 | `restaurant.tax` undefined | No validation (safe fallback) | ✅ T-FU03-4 |
| EC-6 | Toggle `packedFood: No → Yes` on invalid row | `_validationErrors` cleared on next save attempt | (covered by CR-036-FU-01 EC-5 mechanism) |
| EC-7 | Initial menu load (424 items) | Backdrop appears immediately, hides when `foods` populates | ✅ T-FU03-5 |
| EC-8 | `isLoading=false` + no import/export | Overlay NOT rendered | ✅ T-FU03-6 |
| EC-9 | Quick refresh after Save | Backdrop appears briefly during fetch | (visual only — no data-loss risk since no dirty rows after Save) |
| EC-10 | Import with N dirty rows | Confirmation Dialog appears | ✅ T-FU03-8 (confirmation dialog testid) |
| EC-11 | Import with 0 dirty rows | No dialog; auto-refresh | (implicit — dialog only when `dirtyCount > 0`) |
| EC-12 | Cancel on dialog | Local edits preserved; toast guidance shown | (manual smoke) |
| EC-13 | Continue on dialog | `onRefresh()` fires; `useEffect([foods])` resets rows | (manual smoke) |
| EC-14 | Add Item with foods reference stable | Row preserved (regression) | ✅ T-FU03-7 |
| EC-15 | Import response missing field gracefully | All `?.` chains; safe | (defensive) |

### 4.3 Wire-format / Reporting / Audit Impact
**ZERO.** Pure UI validation + UX overlay layer. `_validationErrors` never persisted, never sent to backend. `pendingImport` is transient state. Payload to `food_info` unchanged. `profileTransform.js` extension is read-only (boolean exposed to UI consumers).

### 4.4 Risk Matrix

| # | Risk | Likelihood | Severity | Mitigation |
|---|---|---|---|---|
| R-1 | `gst_status` field path differs in `/profile` vs the products-list endpoint screenshotted | Medium | Low | Defensive `=== true` so undefined / missing yields `false` → validation silently disabled (safe). Will verify in live DevTools during Gate 4. |
| R-2 | `restaurant.tax.gstStatus` propagation timing — context not populated when BulkEditor mounts | Low | Low | `useRestaurant()` returns reactive context; `validateRow` reads at Save-time. If context is null at first Save, fallback (EC-5) applies → no validation. |
| R-3 | Overlay blocks Save button → user can't recover from error states | None | — | Overlay bound to `busy` (load/import/export only), NOT to `saving`. Save spinner stays per-button. |
| R-4 | Confirmation Dialog conflicts with toast positioning | Low | Low | shadcn Dialog z-50, overlay z-40, toast bottom-right. No overlap. |
| R-5 | `pendingImport` orphaned if user navigates away mid-dialog | Low | Low | Dialog `onOpenChange` cleans up on dismiss; component unmount via React |
| R-6 | Packed-item exempt rule conflicts with backend tax expectations | Low | Low | UI-only validation — backend free to enforce or accept |
| R-7 | Existing tests assert old toast format | None | — | `_validationErrors` & toast format unchanged from FU-01; tests pass |
| R-8 | Overlay z-index conflicts with Dialog | None | — | Confirmation Dialog uses default `z-50`; overlay `z-40`. Dialog wins. |
| R-9 | Race-guard skips legitimate refresh after Save (no dirty rows scenario) | None | — | Race-guard only blocks when `pendingImport !== null`. `handleSave` doesn't set `pendingImport`. |
| R-10 | CR-027 Phase 3 + CR-036 + FU-01 tests break | None | — | CR-027 P3 test file patched with useRestaurant mock; verified 4/4 PASS. CR-036/FU-01/FU-02 all PASS via shared mock pattern. |

---

## 5. Gating

| Gate | Status |
|---|---|
| Gate 1 — Investigation | ✅ COMPLETE |
| Gate 2 — Impact analysis + scope lock | ✅ COMPLETE |
| **Gate 3 — Implementation + automated QA** | ✅ **COMPLETE 2026-06-12** |
| Gate 4 — Owner smoke test on preprod | ⛔ AWAITING OWNER |

### Gate 3 Exit Evidence
- All 11 code edits applied to `BulkEditor.jsx` + `profileTransform.js` + `MenuManagementPanel.jsx` (~140 lines)
- 8 new tests pass: G-TaxRequired (4), G-Overlay (2), G-RaceGuard (2)
- All 35 menu tests PASS: CR-027 P3 (4) + CR-036 (7) + CR-036-FU-01 (12) + CR-036-FU-02 (4) + CR-036-FU-03 (8)
- Frontend: HTTP 200, compiles clean
- Lint: zero NEW errors (only pre-existing `LocalTextInput` warning on untouched line)

---

## 6. Rollback

Single-commit, 3 source files. `git revert <commit>` restores. No DB migrations. Backend ignores client-side validation. `useRestaurant` mock in test files is additive.

---

## 7. Backend Verification (Gate 4 smoke gate)

Before owner smoke validation, confirm on live preprod:

1. Login → DevTools → Network → find `/profile` (or equivalent profile load) response
2. Verify `restaurants[0].gst_status: true` field exists (boolean)
3. If different path (`gst.status` nested object, or `gstEnabled`, or absent), update `profileTransform.js:194` mapping (1-line change)

Defensive `=== true` means any path mismatch yields `false` → tax validation disabled (no false-positive blocking saves).

---

## 8. Adjacent Observations (NOT in scope — future CRs)

1. F1 (Type no-default) PARKED by owner
2. `validateRow` could surface multiple error messages per row (currently shows only first via toast); rich error drawer = future P3
3. Backend acceptance of `item_type: null` not validated (F1 deferred)
4. Excel template-download could omit `tax_type` column when `gstStatus=false` — power-user clarity (future P3)

---

**END OF CR-036-FU-03 — GATES 1 + 2 + 3 COMPLETE 2026-06-12.**
