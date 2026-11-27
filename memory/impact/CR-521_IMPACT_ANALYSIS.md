# CR-521: Orange Background After Bill Print. Impact Analysis (Gate 2), 2026-11-15

Code Reality: PARTIAL. BUG-583 (GATE_5A) already paints printed cards: light-green bg `#E8F5E9` + green border. CR-521 changes only the bg colour.
Conflict pre-check: `TableCard.jsx` / `OrderCard.jsx` are shared with **CR-525 (this batch, analysed first)**. Also BUG-583 (5A), BUG-628 (5A), CR-433 (5B) and BUG-557 (5A) touch these files; `colors.js` is touched by BUG-583 and CR-433. CR-521 is a 1-token change, but Gate 3 must sequence it **after CR-525** in the same files.
Risk: LOW (colour only), but the cards are R5. Fast Lane: technically 1 file (colors.js) / 1 line. Owner approval is needed. Recommended only if the companion tweaks below are rejected.
Backend-blocked: NO for the colour. **Depends on the CR-525 probe P2**: if the backend doesn't clear `bill_print` after an edit, the card stays orange after an edit (same flag drives both CRs).

## Owner decisions (locked)
- Keep the green border. The background becomes orange instead of green on table AND order cards (same colour coding). Exact orange: design agent → **`#FFEDD5`** (see `design/CR-521_ORANGE_SHADE_DECISION_2026_11_15.md`).

## Where the colour comes from
| File | Line | Code |
|---|---|---|
| constants/colors.js | L18 | `billPrintedBg: "#E8F5E9"`: the **single source** |
| components/cards/TableCard.jsx | L285-290 | `backgroundColor: table.billPrinted ? COLORS.billPrintedBg : COLORS.lightBg`, `border: 2px solid primaryGreen` when printed |
| components/cards/OrderCard.jsx | L460 | same rule, inline style |
| api/transforms/orderTransform.js | L313 | `billPrinted: api.bill_print === 'Yes'` (BUG-583/664) |
| pages/DashboardPage.jsx | L603…L1238 (13 sites) | thread `billPrinted` to the cards. No colour logic |

## Current vs Proposed
| | Current | Proposed |
|---|---|---|
| Printed card background | `#E8F5E9` light green | **`#FFEDD5` light orange** |
| Printed card border | 2px `#329937` green | unchanged |
| Ready card (not printed) | white bg + orange `#F26B33` border | unchanged, still distinct (white vs orange fill, orange vs green border) |
| Dark text `#1A1A1A` on bg | ~16:1 | ~13.8:1 (AAA) |
| Gray text `#666666` on bg | ~5.2:1 | ~4.9:1 (AA) |

Mockup (side by side: Preparing, Ready, Current printed, Proposed printed): `mockups/CR-521_CURRENT_VS_PROPOSED_2026_11_15.html`.

## Design companion tweaks (recommendation, owner to approve)
1. Header pill `#F5F5F5` → white on printed cards (TableCard L292-298 `headerPillStyle`, OrderCard header).
2. Delivery Assign/Dispatch/On The Way buttons bg `#FFF3E8` → white on printed cards (TableCard L682/L703/L718, OrderCard L1244/L1254, plus the fOS=2 equivalents).
3. KOT icon button: solid white bg.
If approved → 3 files, ~8 edits. If not → only `colors.js` L18.
Note: under CR-525 the KOT + Bill buttons on printed cards are replaced by Collect Bill, so tweak 3 may become moot.

## Downstream / regression
Every dashboard view that renders TableCard/OrderCard: Table view, Channel/column view, Delivery list, Room cards (TableCard `isRoom`), snoozed (opacity 0.6), keyboard highlight outline `#F97316` (still visible on `#FFEDD5`? The outline is offset by 2px outside the card, so yes). Owner smoke on a 10" tablet + desktop.

## Verification seeds
V1 Print bill → card turns light orange with the green border (table + order card).
V2 Ready (unprinted) card still white with an orange border.
V3 Collect payment → card leaves the printed state as today.
V4 Edit after print → colour follows `bill_print` (see CR-525 P2).

## API Contract — FINAL v1 LOCKED 2026-11-15

`contracts/BATCH-D_CR-525_API_CONTRACT_2026_11_15.md`
