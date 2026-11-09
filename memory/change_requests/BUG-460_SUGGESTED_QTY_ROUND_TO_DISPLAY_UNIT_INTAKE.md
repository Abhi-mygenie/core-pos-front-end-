# BUG-460 — Smart Purchase Suggested Qty not rounded to a whole display unit (INTAKE)

**Date:** 2026-09-25 · **Role 1 INTAKE** · **Sprint:** sep_bug_closure · **Status:** GATE_1_INTAKE
**Type:** BUG · **Severity:** P2 · **Risk:** HIGH (financial-adjacent — changes suggested purchase quantity + two-box seed default)
**Source:** OWNER-REPORTED (screenshot) · **Confidence:** CONFIRMED (reproduced + traced) · **Duplicate check:** RELATED to CR-387

## Problem
Smart Purchase → "Suggested Qty" shows an un-purchasable fraction of a display unit, e.g. **"641 bottle 330 ml"**. Beer is bought in whole **bottles**, so the suggestion should round **up to the next whole display unit → "642 bottle"**. Same for every converted row on the screenshot: "688 tin 665 ml"→"689 tin", "7 box 4 piece"→"8 box", "10 pkt 4 piece"→"11 pkt", "745 bottle 120 ml"→"746 bottle". No-conversion rows (piece/kg) already whole → unchanged.

## Evidence
- Screenshot: owner-provided (Suggested Qty column, 6 rows).
- Steps to reproduce: login QA_INV → `/inventory-smart-purchase` → All Ingredients → any converted row → read Suggested Qty.
- Investigation: `investigations/BUG-460_SUGGESTED_QTY_ROUND_TO_DISPLAY_UNIT_INVESTIGATION_2026_09_25.md`

## Root cause (from investigation)
`purchasePlanner.js` L126 `Math.ceil(-gap)` (velocity) + L173 `Math.ceil(threshold - onHand)` (alert) ceil to the nearest whole **BASE** unit (ml). CR-387 (`AutoShoppingList.jsx` L344 `fmtBreak`) then renders that as a breakdown → leftover partial display unit. Rounding granularity should be the **display** unit for `has_conversion` rows.

## Code reality
PARTIAL — suggest_qty computed & displayed today; display-unit rounding absent.

## Blast radius
SMALL — `purchasePlanner.js` (2 sites) + optional `ceilToDisplayUnit` helper in `quantityBreakdown.js`; display + two-box seed inherit; +tests. No hotspot file (R5). Not backend.

## Route recommendation (owner asked: Bug Fix vs Planning)
**PLANNING route** (full Gate 2/3 → owner "Gate 4 GO"). Rationale:
1. **Not Bug Fix route** — Role 5 fixes specific QA-reported failures against an *existing approved plan*; there is none. This is a new behavior/semantics change.
2. **Not Fast Lane / planning-skip** — it is **financial-adjacent** (alters suggested purchase quantity + the default seeded into the two-box "Qty to Buy"), so it fails the planning-skip "not financial" condition and the Owner Approval Matrix requires owner sign-off anyway.
3. **Open owner decisions** (ceil vs nearest; alert rows; leave Projected/Gap partial) must be resolved in Planning (R3 — don't invent policy).

## Open questions for owner — RESOLVED (2026-09-25)
1. **Ceil / round-up** confirmed by owner. Always round UP to the next whole display unit (never short).
2. **Yes** — apply the same rounding to alert / top-up rows too.
3. **Yes** — keep Projected Need + Gap as partial breakdown (informational). Only round Suggested Qty and the two-box "Qty to Buy" seed.

## Next
Planning agent → Gate 2 Impact Analysis + Gate 3 Implementation Plan → owner "Gate 4 GO".
