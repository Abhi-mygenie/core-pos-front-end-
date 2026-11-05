# INV-TABLET-001 — Dashboard UI not fitting on Android tablet (portrait + landscape)
**Role:** Investigation (Role 6, ALPHA) · **Date:** 2026-10-10 · **Code:** `09_oct_gyan` @ `ef1ba89` · **No code edits**
**Source:** owner photos of a tablet (Dashboard → Channel view → Table view, Dine-In, tables G-01…T-08)

## 1. Summary
Root cause: the Dashboard is laid out in **fixed pixels for a ≥1008 px desktop** — (a) the header row has no responsive behaviour and needs 1008 px, so on tablet widths its right side (Web/POS counter, Search, **Add**) is pushed off-screen and cannot be reached; (b) channel columns and table cards use **fixed px widths** (card 160 px, column = N×160 + gaps), so the grid never adapts to the screen — big empty area in landscape, columns depend only on the manual `<` `>` setting.
Classification: **FE_BUG** (layout, not data/backend) · Confidence: **HIGH** (reproduced + traced) · Steps used: 6/10

## 2. Hypotheses Tested
| # | Hypothesis | Test | Result | Evidence |
|---|---|---|---|---|
| H1 | Header not responsive → right controls overflow on tablet widths | Measure header `scrollWidth` vs width at 600/800/960/1280 | **CONFIRMED** | Needs 1008 px. 600 px: Web/POS, Search, Add off-screen. 800 px: Search + Add off-screen. 960 px: Add off-screen. 1280 px: OK. Matches owner photo 1 (no search/Add) and photo 2 (Add cut at edge). |
| H2 | Dashboard grid uses fixed px, not screen width | Code trace + measure | **CONFIRMED** | Dine-In column is 344 px at every viewport (2 cols × 160 + gap + padding). Empty space on the right: 170 px (600), 370 px (800), 530 px (960 landscape), 850 px (1280). Matches photo 2's blank right area. |
| H3 | Device zoom / bad viewport meta | Check `public/index.html` | ELIMINATED | `width=device-width, initial-scale=1` present; problem reproduces in a clean browser at tablet sizes. |
| H4 | Data issue (table list) | — | ELIMINATED | Cards, amounts and statuses render correctly; only sizing/placement is wrong. |

## 3. Code Trace
- **Header** `components/layout/Header.jsx` L240 `<div className="flex items-center">` — one non-wrapping row: logo + status pills (L254) + Platform dropdown (L326) + counter chip (L336) + search `w-48`/`w-64` (L342) + Add. No `sm:/md:/lg:` breakpoints, no wrap, no scroll → content beyond the width is clipped. Logo shrinks to 0 width on narrow screens (flex shrink on `w-auto` img).
- **Columns** `components/dashboard/ChannelColumn.jsx` L9 `TABLE_CARD_WIDTH = 160`, L192 `columnWidth = actualColumns*160 + gaps + 16`, L199-200 fixed `width/minWidth` px, L284 `gridTemplateColumns: repeat(N, 160px)`.
- **Column count** `components/dashboard/ChannelColumnsLayout.jsx` L10 default 2 per channel, L122-146 `<` `>` arrows change count by 1, stored in `localStorage mygenie_layout_table_view`. Count does not follow screen size or orientation (owner photos show 3 cols portrait / 4 cols landscape = manual arrow setting).
- **Sidebar** `components/layout/Sidebar.jsx` L498 fixed 70 px (collapsed) / 280 px (expanded) — fine on tablet, not a cause.
- BREAK POINT: layout sizing is pixel-fixed; no viewport/orientation awareness anywhere in the Dashboard chain.

## 4. Evidence Artifacts
`/app/memory/evidence/INV-TABLET-001/` — `INV-TABLET-001_layout_metrics.json`, screenshots `p600.png`, `p800.png`, `l960.png`, `l1280.png`.

## 5. Recommendations
Classification: **FE_FIX** (2 files minimum, layout only, not financial).
1. **Header** (Header.jsx): let the row wrap or move the right cluster to a second line under ~1024 px; or collapse Search to an icon and keep **Add** always visible; allow horizontal scroll of the status pills.
2. **Grid** (ChannelColumn.jsx / ChannelColumnsLayout.jsx): size cards to the available width (e.g. `repeat(auto-fill, minmax(150px, 1fr))` or compute columns from container width) so the grid fills the screen in both orientations; keep `<` `>` as an override.
Planning skip eligible: **NO** — > 10 lines, 2-3 files, Dashboard is a hotspot (R5). → full Planning cycle (Gate 2-3). Owner to confirm target devices/widths (e.g. 8" tablet ~600-800 px portrait).

## 6. Retroactive Candidates
NONE.

## Handover
"Root cause: Dashboard header + channel grid are fixed-pixel desktop layouts (header needs 1008 px; cards 160 px, columns N×160) with no tablet/orientation handling. Confidence: HIGH. Steps: 6/10. FE fix: yes — Header.jsx + ChannelColumn.jsx/ChannelColumnsLayout.jsx. Backend ask: no. Planning skip eligible: NO (hotspot, multi-file). Escalated from Bug Fix: NO. Retroactive candidates: none. Report at /app/memory/INV-TABLET-001_INVESTIGATION_REPORT.md."
