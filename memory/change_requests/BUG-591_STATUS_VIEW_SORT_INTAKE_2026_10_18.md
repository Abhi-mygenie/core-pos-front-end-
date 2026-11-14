# BUG-591 — Intake
## Status View: Cards Sort by Table Number / Label, Not by createdAt

**Date:** 2026-10-18
**Type:** BUG
**Priority:** P2
**Risk:** LOW
**Area:** Dashboard / Status View
**Sprint:** oct_cr_batch
**Registered by:** INTAKE role (from investigation BUG-591_STATUS_VIEW_SORT_INVESTIGATION_2026_10_18.md)

---

## Duplicate check
DISTINCT — no existing bug for Status View sort order.

---

## Symptom
In Status View (YTC / Preparing / Ready / Served columns), cards are ordered by **table number** — Walk-In orders (label "WAL" → 0) float to the TOP, high-numbered tables (Table 14 → 14) sink to the BOTTOM. A 51-day-old bill at the bottom; a 5-day-old Walk-In at the top.

Expected: cards within each column sorted by **createdAt ascending** (oldest first, regardless of table type).

---

## Root Cause (confirmed)
`ChannelColumn.jsx` L117–123 — `groupingMode === 'status'` branch calls `sortByActiveFirst()`. This function uses label numeric as tie-break. Walk-In = "WAL" → NaN → 0. Table 2 → 2. Table 14 → 14. Result: Walk-Ins always float to top.

Fix: replace `sortByActiveFirst` in the status branch with `createdAt` ascending sort. `sortByActiveFirst` in Channel View must NOT change.

---

## Evidence
- Source: AGENT-DISCOVERED + owner screenshot evidence
- Confidence: HIGH — confirmed in code + live PalmHouse probe
- Investigation: `/app/memory/investigations/BUG-591_STATUS_VIEW_SORT_INVESTIGATION_2026_10_18.md`

---

## Blast Radius
- **1 file:** `src/components/dashboard/ChannelColumn.jsx` (NOT R5)
- **~5 lines:** L117–123 status branch only
- Hotspot: NO
- Fast Lane eligible: YES (≤10 lines, 1 file, not R5, not financial) — owner must approve

---

## Gate Status
- Gate 1: COMPLETE
- Gate 2: Ready (Fast Lane pending owner GO, or full planning)
