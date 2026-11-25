# COMBINED QA HANDOVER — BUG-455 + BUG-459 + CR-387 (OD-UNIFY-02 combined wave)
**Date:** 2026-09-25 · **From:** IMPLEMENTATION Role 3 · **Gate:** 5a → QA (5b)
**Registry:** BUG-455 GATE_5A_IMPLEMENTED · BUG-459 GATE_5A_IMPLEMENTED · CR-387 GATE_5A_IMPLEMENTED · EXIT GATE 5/5 PASS
**Credentials:** `QA_INV` in `/app/memory/test_credentials.md` (preprod RID 835 — LIVE data, do NOT submit).

## Automated jest (already GREEN)
- `quantityBreakdown.bug459.test.js` 14/14 · `purchasePlanner.cr387.test.js` 8/8.

## Screen 1 — STOCK AUDIT (`/inventory-audit`) — BUG-459 + OD-UNIFY-01
| # | Verify | Expected |
|---|---|---|
| SA1 | Converted row (ANGARA GREAVY 9.4 pkt) System Qty cell | Shows plain "9.4 pkt" — NO `(9 pkt 200 gm)` parenthetical (BUG-455 suppressed here) |
| SA2 | Converted row Physical Qty | Two boxes `[major] pkt [minor] gm`; placeholders from display_qty_parts (e.g. 9 / 200), NOT the base number 4700 |
| SA3 | No-conversion row (ACHARI TIKKA kg / Packed Items piece) | Single input box + single unit label (unchanged) |
| SA4 | Type major=9 minor=0 on 9.75-pkt-equivalent item | Amber drift badge "↓ 0 pkt 600 gm"-style + "preview"; reason dropdown enables |
| SA5 | Type exact count | "Match" badge; type over → green "↑ +…" badge |
| SA6 | Minor ≥ factor then blur (e.g. minor 1700 @1600/tin) | Boxes normalize (major+1, minor carries) |
| SA7 | Breakdown appears exactly once per row | Only via two-box + badge; no duplicate parenthetical |

## Screen 2 — SMART PURCHASE / STOCK UPDATE (`/inventory-smart-purchase`) — CR-387 + OD-UNIFY-01
| # | Verify | Expected |
|---|---|---|
| SP1 | Converted row (UAT BAR BEER 8.49 bottle) On-Hand cell | "8.49 bottle" — NO `(8 bottle 319 ml)` parenthetical (suppressed) |
| SP2 | Projected Need / Gap / Suggested Qty (both tables) | Breakdown units (e.g. "650 bottle", "-… bottle", "641 bottle 330 ml") — NOT raw base "422500 ml"/"416980" |
| SP3 | No-conversion row (ACHARI TIKKA kg) | Single-unit values ("425 gm"), unchanged |
| SP4 | Click "+ Add" on a converted row → Purchase List "Qty to Buy" | Two-box `[major] bottle [minor] ml` seeded from suggested; single box for no-conversion rows; ad-hoc rows empty two-box |
| SP5 | Enter minor > factor then blur | Normalizes major/minor |
| SP6 | GroupedVendorPreview (payment section) item lines | Show breakdown text (rowQuantity text) |

## Screen 3 — BOUNDARY (unchanged) — regression
| # | Verify | Expected |
|---|---|---|
| B1 | Current Stock (`/inventory-current-stock`) | BUG-455 parenthetical STILL present (e.g. "11 tin (11 tin 35 ml)") |
| B2 | Sub-Recipe Stock (`/inventory-sub-recipe-stock`) | BUG-455 parenthetical STILL present |

## LIVE-ONLY (owner-authorized submit; NOT for automated agent — would mutate preprod)
- BUG-459 V6/V7/V10: Save Adjustments → `add-stock` payload `unit: displayUnit`, `physical_qty` = major+minor/factor; cal_quantity read-back; wastage toast.
- CR-387 V7/V9/V10: Update Stock → `add-purchase` `Unit: display_unit`, quantity in display units, rate per display unit, Amount unchanged; report row.

## Notes for QA agent
- data-testids: `audit-input-${id}`, `audit-input-minor-${id}`, `audit-unit-major-${id}`, `audit-unit-minor-${id}`, `drift-preview-badge`; `row-qty-${ingredient_id}`, `row-qty-minor-${ingredient_id}`.
- Do NOT click "Save Adjustments" / "Update Stock" (live preprod). Verify rendering + input behavior only.
