# CR-481 — Standardize Date Preset Filters Across All Insights Reports

**ID:** CR-481  **Type:** CR  **Registered:** 2026-11-02  **Sprint:** nov_cr_batch
**Severity:** P2  **Risk:** LOW  **Status:** GATE_1_INTAKE_COMPLETE
**Source:** OWNER-REPORTED (screenshot: Channel & Payment missing LM, 2026-11-02)
**Related:** BUG-640 (timezone bug in same preset system)

## Description
Date preset filters are inconsistent across Insights report pages. Owner observed Channel & Payment Analysis shows `[Today, 7D, 30D, MTD]` while Cancellations shows `[Today, 7D, LM, MTD, FY]`. There is no standard — some pages use `LM` (calendar last month), others use `30D` (rolling 30 days), and many are missing `LM` and `FY` entirely.

**Note:** `30D` ≠ `LM`. `30D` = today minus 29 days (rolling window). `LM` = 1st to last day of previous calendar month (fixed window). Both have valid use cases but should be offered consistently.

## Current State (46 report pages audited)

| Preset | Pages With It | Pages Without It |
|---|---|---|
| Today | 32 | 14 |
| 7D | 44 | 2 |
| LM | 8 | 38 |
| 30D | 31 | 15 |
| MTD | 44 | 2 |
| FY | 7 | 39 |
| Yesterday | 1 (Settlement only) | 45 |
| 90D | 1 (Settlement only) | 45 |
| 365D | 1 (Settlement only) | 45 |
| YTD | 1 (Settlement only) | 45 |

## Evidence
- Owner screenshot 1: Cancellations has `[Today, 7D, LM, MTD, FY]`
- Owner screenshot 2: Channel & Payment has `[Today, 7D, 30D, MTD]` — no LM, no FY
- Code audit: 17 distinct preset combinations across 46 pages
- Confidence: CONFIRMED

## Duplicate Check
**DISTINCT.** No existing CR covers preset standardization.

## Code Reality
**NONE** — each page defines its own preset array independently.

## Proposed Standard Set
**Recommended:** `[Today, 7D, LM, 30D, MTD, FY]` — covers all common time windows.
- **Today:** Current day
- **7D:** Last 7 days (rolling)
- **LM:** Last calendar month (Oct 1–31)
- **30D:** Last 30 days (rolling)
- **MTD:** Month to date (Nov 1–today)
- **FY:** Financial year (Apr 1 – Mar 31)

## Blast Radius
**LARGE** — 46 report pages. But change is mechanical: update the preset array + ensure handler covers all presets.

## Open Decisions
- **OD-481-01:** Standard preset set — (a) `[Today, 7D, LM, 30D, MTD, FY]` (recommended), (b) `[Today, 7D, LM, MTD, FY]` (drop 30D), (c) Owner defines custom set
  - **LOCKED: (a)** `[Today, 7D, LM, 30D, MTD, FY]`
- **OD-481-02:** Extract presets to shared component/constant, or keep inline per page?
  - **LOCKED: Shared constant only** — no new component, no design changes. Just a constant array + handler utility function imported by each page.

## Risk Classification
- **Risk:** LOW — UI-only change per page, no API/logic change
- **Fast Lane eligible:** NO (46 files)
