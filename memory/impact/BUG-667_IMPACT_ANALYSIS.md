# BUG-667: Long Restaurant Name Overflows. Impact Analysis (Gate 2), 2026-11-15

Code Reality: NONE. There is no wrap fix yet. The sidebar line already has `truncate`, but it doesn't take effect (see root cause).
Conflict pre-check: `Sidebar.jsx` has many past owners. Items still open on this file: BUG-570 (GATE_5A, P0), CR-435 (GATE_5A), BUG-568 (5B conditional). None of them touch the profile block at L870-892. The PMS headers (FrontDeskPage / ReservationsPage / RoomStatusPage) have no open edits on the header `<p>` lines. Parallel-safe. Re-verify the anchors at Gate 3.
Risk: LOW (CSS/layout only, no logic). Fast Lane is **not** eligible: 4 files (owner chose "both places").
Backend-blocked: NO. No API is involved (`restaurant.name` already comes from the profile).

## Owner decisions (locked)
- Intake 2026-11-14: a long name should **wrap onto 2 lines**.
- Gate 2 R1 (2026-11-15), 667-02 = **BOTH places**: (a) the sidebar bottom line, (b) the restaurant name next to the date at the top of the PMS pages.

## Place A: sidebar bottom (`components/layout/Sidebar.jsx`)
- L532: aside width is fixed (`280px` expanded / `70px` collapsed).
- L852-858: profile `<button className="w-full flex items-center gap-3 ...">`.
- L880 `<div className="flex-1 text-left">`: **root cause**. A flex child has `min-width:auto`, so it grows to the width of its text. The `truncate` on the inner lines then has no width limit and the text spills past the 280px aside.
- L881-885: line 1 = staff name + role (`truncate`).
- L886-889: line 2 = `"{restaurant.name} · #{id}"` (`text-xs truncate`). CR-378 added the name here.
- Shown only when `isExpanded` (L879). The collapsed sidebar shows only the avatar, so it's not affected.
- Tablet drawer (L525-526, `isTablet`) uses the same block at the same 280px, so the same fix applies.

Proposed (Gate 3 detail): L880 add `min-w-0`. L886 replace `truncate` with a 2-line clamp (`line-clamp-2 break-words`). Line 1 (staff name) stays `truncate`. Names longer than 2 lines end with "…".

## Place B: PMS page headers
| File | Line | Current |
|---|---|---|
| pages/pms/FrontDeskPage.jsx | L141-143 | `<div>` (no width limit) → `<p className="text-[12px]">{longDate} · {restaurant.name}</p>` beside the New Booking button (`justify-between`) |
| pages/pms/ReservationsPage.jsx | L101-103 | same pattern, `text-[13px]`, beside the Refresh/action buttons |
| pages/pms/RoomStatusPage.jsx | L119-121 | same pattern, beside the Refresh button |

Risk today: the left `<div>` is a flex item with no `min-w-0`, so a long name can push or squeeze the right-hand buttons.
Proposed: the left `<div>` gets `min-w-0 flex-1`, the `<p>` gets a 2-line clamp, and the button group gets `shrink-0`.
Other places showing `restaurant.name`: report export payloads and the PMS checkout print payload. These are data, not screen layout, so they're out of scope.

## Files (estimate for Gate 3)
| File | Edits | Hotspot |
|---|---|---|
| components/layout/Sidebar.jsx | 2 class changes (L880, L886) | YES (R5 list), CSS only |
| pages/pms/FrontDeskPage.jsx | 2-3 class changes | no |
| pages/pms/ReservationsPage.jsx | 2-3 class changes | no |
| pages/pms/RoomStatusPage.jsx | 2-3 class changes | no |

## Verification seeds
V1 Sidebar expanded, desktop: a 60-character name wraps to 2 lines, stays inside the sidebar, and "· #ID" stays visible or ends with "…".
V2 Short name: looks exactly as today (1 line).
V3 Tablet drawer: same as V1.
V4 Collapsed sidebar: unchanged.
V5 Each PMS header with a long name: 2 lines max, and the buttons keep their size and position.

## Downstream / regression
Sidebar profile click (navigates to profile), Switch Restaurant, Logout positions, the sidebar scroll area height (the bottom block grows by ~16px when wrapped).
