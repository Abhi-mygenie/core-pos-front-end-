# POS2-002 Phase 3.2 — Per-Status Sub-Breakdown Inside Platform Counter Chip — UX/Scope Proposal

> **Sprint:** pos2.0
> **CR ID:** POS2-002 Phase 3.2 (sub-CR of Phase 3.1)
> **Date:** 2026-05-10
> **Type:** UX/scope proposal — NO code, NO implementation yet, NO `/app/memory/final/*` edits.
> **Predecessor:** Phase 3.1 live counter chip (shipped 2026-05-10).
> **Status:** 🅿️ `parked_by_owner_2026_05_10` — full spec preserved below for future pickup.

---

## ⚠️ Parking notice (2026-05-10)

Owner reviewed the proposal and elected NOT to take Phase 3.2 in this sprint. The spec is intentionally preserved verbatim — nothing has been redacted or pruned — so a future agent can resume from the existing 4 decisions without re-running the discovery cycle. Resume by gathering owner picks for decisions A/B/C/D below, then proceed straight to the implementation outline.

No code was touched. No production file changed. Phase 3.1 remains the most recent shipped state.

---

---

## 1. Goal

Surface a per-status sub-breakdown **inline inside each segment** of the Phase 3.1 platform counter chip so operators can see — at a glance, no click — *which lifecycle stage the running orders are stuck in* per platform.

Today (Phase 3.1):
```
● Web 4 · ● POS 17
```
After Phase 3.2 (proposed default):
```
● Web 4  Y2 P1 R1  ·  ● POS 17  Y5 P8 R4
```

Operators reading a "POS 17" pulse instantly know the bottleneck (e.g. `Y5 P8 R4` = 5 unconfirmed, 8 in kitchen, 4 ready to serve).

---

## 2. The 4 decisions that shape this CR

I have an opinion on each. If you reply `defaults / go` I'll use the recommended (⭐) option everywhere; otherwise override per item.

### Decision A — Which statuses appear in the breakdown?

| Option | Statuses shown | Pro | Con |
|---|---|---|---|
| ⭐ **A1 — actionable triplet** | `YTC (7)` / `Ready (2)` / `Served (5)` | Captures the three stages where the operator must act (confirm, serve, collect). Preparing is "waiting" so excluded. | Doesn't show kitchen load. |
| A2 — full lifecycle quartet | `YTC (7)` / `Preparing (1)` / `Ready (2)` / `Served (5)` | Shows the whole pipeline including kitchen. | Wider chip, more numbers to scan. |
| A3 — kitchen-focused triplet | `YTC (7)` / `Preparing (1)` / `Ready (2)` | Mirrors the 4 dashboard chips minus Served. | Hides the "served but unpaid" chunk. |
| A4 — operator-decides | Same 4 as the dashboard chips visible to the user | Self-aligns with header chips. | Variable width; harder to scan. |

**Recommendation:** A1 — three numbers fit cleanly in the chip and map directly to "what should I do next?" Most useful during peak hours.

### Decision B — Visual format of the breakdown?

Format consistency for one platform segment shown on its own:

| Option | Sample render | Pro | Con |
|---|---|---|---|
| ⭐ **B1 — letter prefixes** | `● Web 4  Y2 P1 R1` | Compact (under 9 chars per platform). Self-labelling, no legend needed. Reads naturally. | Letters compete with the platform label slightly. |
| B2 — slash counts | `● Web 4 (2/1/1)` | Most compact. | Order ambiguity unless legend exists; "what does the 2 mean?" |
| B3 — color sub-dots | `● Web 4  🟡2 🔵1 🟢2` | Visual scanning. | Three new colors compete with platform brand dots; colorblind-unfriendly. |
| B4 — hover tooltip only | `● Web 4` (sub-counts in tooltip) | Chip stays compact. | Owner explicitly said "no extra click" — tooltip violates spirit even if hover ≠ click. |

**Recommendation:** B1 — best balance of compactness, scannability, and self-labelling. Letters are: `Y` for YTC, `R` for Ready, `S` for Served (or `P` for Preparing under option A2/A3).

### Decision C — Show the breakdown when total = 0?

| Option | Behaviour |
|---|---|
| ⭐ **C1 — hide breakdown when platform total = 0** | `● Web 0  ·  ● POS 17  Y5 R8 S4` — the dimmed-zero side stays clean. |
| C2 — always show, even when total = 0 | `● Web 0  Y0 R0 S0  ·  ● POS 17  Y5 R8 S4` — repetitive, low signal. |
| C3 — always show; dim individual zero sub-counts | `● Web 4  Y2 R0(dim) S2  ·  ● POS 17 …` — gives field-level zero visibility. |

**Recommendation:** Mix — hide the entire breakdown when platform total = 0 (C1 behaviour for 0 totals), but dim individual sub-zeros when total > 0 (C3 behaviour for non-zero totals). Best of both: clean for empty platforms, visible-but-quiet for individual gaps.

### Decision D — Click behaviour on a sub-count?

| Option | Behaviour |
|---|---|
| ⭐ **D1 — read-only (v1)** | No click handler. Stays a pure information radiator like Phase 3.1. |
| D2 — click filters | Clicking `Y2` on the Web segment narrows dashboard to YTC + Web. Saves two clicks. |
| D3 — click drills | Opens a side-panel listing those exact orders. Bigger scope. |

**Recommendation:** D1 for v1 — keeps Phase 3.2 ~30 min FE. D2 is a great Phase 3.3 follow-up if you want it.

---

## 3. Layout sanity check (estimated chip width)

Default render with A1 + B1 + C1+C3 hybrid + D1:

```
[ ● Web 4  Y2 R1 S1  ·  ● POS 17  Y5 R8 S4 ]
```

- Web segment: dot (8px) + space + "Web 4" (~36px) + space + "Y2 R1 S1" (~52px) ≈ **104 px**
- Separator dot + spacing ≈ 16 px
- POS segment ≈ **108 px**
- Outer padding (`px-2.5 py-1`) ≈ 20 px
- **Total chip width ≈ 248 px** at base font (`text-xs`).

For comparison, today (Phase 3.1) the chip is ~110 px. That's roughly +138 px. Verified by the screenshot: the right-aligned cluster has ~340 px of free horizontal space between the divider and the search bar at 1920px viewport, so the wider chip still fits with `mr-3` gap intact.

If a smaller tablet viewport (1280 px) ever cramps the chip, fallback B2 (`Web 4 (2/1/1)`) shrinks it ≈ 30%. We can ship B1 and add a media-query fallback in Phase 3.3 only if owner reports a real cramp.

---

## 4. Implementation outline (assuming default decisions)

| File | Type | Net lines | Change |
|---|---|---|---|
| `components/layout/PlatformCounterChip.jsx` | EDIT | ~+50 | `computePlatformCounts` already returns `{ web, pos }`. Extend to return `{ web: { total, ytc, ready, served }, pos: { total, ytc, ready, served } }` (or whichever statuses A-decision picks). Component renders inline sub-counts conditionally per C1+C3 hybrid. |
| `pages/DashboardPage.jsx` | EDIT | ~0 | Already passes `platformCounts.web` and `platformCounts.pos` to Header — needs to pass the now-richer objects. Header / chip plumbing is internal. |
| `components/layout/Header.jsx` | EDIT | ~+2 | Header prop names rename to pass the richer objects (`webBreakdown` / `posBreakdown` instead of `webCount` / `posCount`). Backwards-compat — old shape still tolerated via internal coercion. |
| `__tests__/components/layout/PlatformCounterChip.test.jsx` | EDIT | ~+80 | Add ~12 tests: purefn buckets sub-counts correctly, render sub-counts inline, hide breakdown when total = 0, dim individual sub-zeros, full back-compat with old `{ web: number, pos: number }` shape if someone passes the old form. |

**Total effort:** ~30 min FE, all in 4 files. Zero new files (this is an extension of Phase 3.1).

### Risk surface

- **Risk: low.** Pure additive; existing Phase 3.1 contract maintained via internal coercion in the chip component.
- **Edge case:** When all sub-counts sum to less than the platform total (e.g. operator includes `Pending Payment` orders that aren't in the A1 triplet), the chip's primary number remains the *full* platform total — sub-numbers are a "where in the YTC/Ready/Served funnel are they" pulse, not a re-bucketing. We surface this in the doc + tests so it never confuses the operator.

### Tests added (~12)

1. Purefn returns `{ web: { total, ytc, ready, served }, pos: { total, ytc, ready, served } }` shape.
2. Sub-counts add up correctly given a synthetic order list.
3. Sub-counts ignore terminal statuses.
4. Statuses NOT in the chosen triplet (e.g. `Preparing` under A1) still count toward `total` but not toward any sub-count (proves the "primary total ≥ sum of sub-counts" invariant).
5. Component renders inline sub-counts when `total > 0`.
6. Component hides sub-count cluster when `total === 0` (C1 hybrid).
7. Component dims individual zero sub-counts when total > 0 (C3 hybrid).
8. `data-testid="dashboard-platform-counter-web-ytc"` / `-ready` / `-served` exposed for QA.
9. `aria-label` updated to include sub-breakdown ("4 running web orders: 2 yet-to-confirm, 1 ready, 1 served").
10. Default props back-compat — chip still renders if someone passes the old `{ web: 4, pos: 17 }` shape.
11. Brand color exports unchanged (regression).
12. Idempotence — purefn re-call yields same nested shape.

---

## 5. Owner verification checklist (post-merge, if approved)

| # | Action | Expected |
|---|---|---|
| 1 | Fresh login, dashboard with mixed orders | Chip reads `● Web 4 Y2 R1 S1 · ● POS 17 Y5 R8 S4` |
| 2 | Confirm a YTC web order | `Y2` → `Y1` (and the next stage's count adjusts) |
| 3 | Mark a ready order served | `R8` → `R7`, `S4` → `S5` |
| 4 | All web orders cleared | Web segment collapses to dimmed `Web 0` (no breakdown) |
| 5 | Pick `Platform = Web` from dropdown | Chip totals UNCHANGED (independence guarantee preserved) |
| 6 | Aria-label spot check | Screen reader announces full breakdown |

---

## 6. Non-goals

- ❌ Click filtering on sub-counts (D2 — Phase 3.3 candidate)
- ❌ Drill-down side panel (D3 — separate CR)
- ❌ Showing all 9 dashboard statuses
- ❌ Touch any card / payload / socket flow
- ❌ Edit `/app/memory/final/*`

---

## 7. Verdict

> ## `awaiting_owner_decisions` — please reply with one of:
>
> - **`defaults / go`** → use the recommended option for every decision (A1 / B1 / C1+C3 hybrid / D1) and proceed
> - **Per-decision picks**, e.g. `A2 + B3 + C1 + D1` → I lock those and proceed
> - **Tweak first** → call out anything you want adjusted (e.g. include `Preparing` but skip `Served`, or use color dots, or label letters in a different language)

Once locked, this becomes the implementation contract for Phase 3.2 and I write code in a single ~30 min FE pass.

---

— End of POS2-002 Phase 3.2 UX/Scope Proposal 2026-05-10 —
