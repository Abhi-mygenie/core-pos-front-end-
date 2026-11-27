# BUG-555 — Gate 3 Plan Revalidation (line-by-line, pre-Gate 4)

**Date:** 2026-10-15 · **Role:** PLANNING (review only — no code) · **Input:** `plans/BUG-555_IMPLEMENTATION_PLAN.md` vs HEAD source, `impact/BUG-555_IMPACT_ANALYSIS.md` §9 ODs, intake, approved `bug555-tablet-design-review.html`, `/app/design_guidelines.json`.
**Method:** every `File:line` anchor in the plan re-read at HEAD; every WP-D line structurally verified by script (header → exactly 2 direct children: title row, controls row); plan text diffed against approved mockup CSS and design_guidelines.json.

## 1. Anchor verification — RESULT: 100% match

| WP | Anchors checked | Result |
|---|---|---|
| WP-A | A1 L2 import · A2 L54 (`DROPDOWN_TABLE_SORT` → comment L55) · A3 L103 `searchQuery` · A4 L1683 · A5 L1685 · A6 L1687 · A7 last `)}` L2997 / root `</div>` L2998 · A8 `CategoryPanel.jsx:32` · A9 button L58 (plan says ~59), `truncate` span L68 | ✅ all match. `useEffect` already imported (L1). `COLORS.primaryOrange/primaryGreen/lightBg/borderGray/darkText` all exist in `constants/colors.js`. |
| WP-A z-order | OE root `fixed inset-0 z-50` L1665; 18 order-entry modals each `z-[100]`/`z-[110]`, none portaled (`createPortal` = 0 hits, no Radix dialog imports in order-entry/) | ✅ `z-[120]` inside root wins over every OE modal. |
| WP-D | 40/40 outer+inner lines match `evidence/BUG-555/BUG-555_WPD_edit_sites_2026_10_15.txt`; D16 FoodCourtBeta inner = L323 confirmed (L370 is the presets segment); D40 PLReportPage outer L176 already `flex-wrap gap-y-2` (BUG-539) | ✅ Every header has exactly 2 direct children: title row (also `flex items-center gap-3`) at `outer+1`, controls row at listed inner line. |
| WP-B | B1 L3-8 · B2 L248-249 · B3 L287 `useLocation` · first `isExpanded` use L325 · B4 L490-497 · B5 L489 · B6 L862 | ✅ No `Menu` identifier collision (only in comments/labels). No `isExpanded` read between L250–L324. 94 host pages: 90 × `flex h-screen…`, 3 × `flex min-h-screen bg-slate-50`, DashboardPage `flex min-h-screen`. |
| WP-C | C1 271 · C2 339 · C3 428 · C4 433 · C5 438 · C6 441 · C7 445 · C8 483 · C9 765 · C10 770 (testid 769) · C11 775 | ✅ Those 8 lines are the **only** `lg:/md:/sm:/xl:` occurrences in Header.jsx. Header mounted only by `DashboardPage.jsx:5`. |
| Tooling | Tailwind **3.4.17** (default `xl`=1280, `max-sm:` variant available), React **19.0.0**, firebase ^13 | ✅ |
| Jest | No suite renders Sidebar/Header/OrderEntry unmocked (`phase1_5.cr385`, `phase05.cr385` mock Sidebar; `DashboardPage.bug452` is source-string only; `CategoryPanel.cr376fub` renders CategoryPanel which gets CSS classes only, no `matchMedia`) | ✅ jsdom lacks `matchMedia` → safe because nothing renders the matchMedia components. |
| Scope | 2 + 1 + 1 + 40 = **44 files** = §0 / §9 count | ✅ |

## 2. Findings (plan vs approved mockup / design_guidelines / ODs)

| # | Sev | Where | Finding | Proposed amendment |
|---|---|---|---|---|
| F1 | **MED** | C10 `min-w-[44px] min-h-[44px]` | Applies at **all** widths → desktop Add button grows 40→44px tall, violating OD-555-17 "≥1280 pixel-identical". design_guidelines WP-C says icon-only `p-2.5` below 640. | Scope to mobile only: `max-sm:min-w-[44px] max-sm:min-h-[44px]` (Tailwind 3.4 supports `max-sm:`). Desktop class set unchanged. |
| F2 | **LOW** | A5 header row `gap-3` | Approved mockup `.mhead` uses `gap: 8px 12px` (row-gap 8); IA A2 said `flex-wrap gap-y-2`. Plan gives 12px row gap → header 4px taller than mockup when wrapped. Desktop unaffected (single row). | A5 → `flex flex-wrap items-center gap-3 gap-y-2`. |
| F3 | **LOW** | L1738 icon group (plan: "unchanged") | Mockup `.icons{margin-left:auto}` → icons **right-aligned on row 2**. In code the `flex-1` spacer (L1707) stays on row 1, so wrapped icons land **left**. | New **A10**: L1738 `flex items-center gap-3 flex-shrink-0` → `… flex-shrink-0 ml-auto`. No-op on desktop (flex-grow spacer consumes free space before auto-margin). |
| F4 | **LOW** | A7 overlay | Mockup + design_guidelines: `backdrop-filter: blur(8px)` / `backdrop-blur-md`; plan has no blur. Mockup icon 96px + "slowly tilting" animation (owner-approved note); plan: static 64px. | a) add `backdrop-blur` (8px) to overlay class — zero extra files; b) icon `w-24 h-24` (96px); c) animation: **owner decision** — `animate-spin [animation-duration:3s]` (continuous spin, Tailwind-only) vs static (plan). No new keyframe file either way. |
| F5 | **LOW** | A7 overlay position | Plan `fixed inset-0`; IA §1.5 + mockup `.rot` say `absolute inset-0` inside the `fixed` OE root. Both render identically (root is `fixed inset-0`), but `absolute` is the documented contract and avoids relying on no ancestor transform. | A7 → `absolute inset-0 z-[120]`. |
| F6 | **LOW** | A7 copy | Mockup (approved): "Rotate your tablet" / "Order Entry works in landscape. Turn your tablet sideways to continue." design_guidelines text differs ("Rotate Your Tablet" / "…optimized for landscape mode…"). Plan uses mockup text. | Keep mockup text (owner saw it). No change — recorded for traceability. |
| F7 | **LOW** | B5 backdrop | design_guidelines + mockup: `bg-black/50 backdrop-blur-sm`; plan `bg-black/50` only. | B5 backdrop → `fixed inset-0 z-[90] bg-black/50 backdrop-blur-sm`. |
| F8 | **LOW** | B4 closed drawer | `-translate-x-full` keeps 30+ buttons tabbable off-screen; `aria-hidden` alone doesn't remove them from tab order. design_guidelines asks `aria-modal` on drawer + focus trap. | B4: add `invisible` when closed (`${drawerOpen ? "translate-x-0" : "-translate-x-full invisible"}` — visibility flips at end of slide-out / start of slide-in with `transition-all`), `inert={isTablet && !drawerOpen}` (React 19 supports boolean `inert`), and `role={isTablet ? "dialog" : undefined}` `aria-modal={isTablet ? true : undefined}`. Full focus-trap: **out of scope** (would need new dep) — log as follow-up. |
| F9 | **LOW** | WP-C comments | Plan updates trailing `{/* CR-414: … <1024px */}` on C1–C8 but the block comment at **L337-338** ("Visible <1024px only (OD-537-02…)") would go stale. | Add C2-comment: L337-338 → "Visible <1280px only (… + BUG-555)". |
| F10 | **INFO** | B3 "36 `isExpanded` reads" | Actual: 33 lines (some lines contain 2 reads). Cosmetic. | Reword to "all existing reads". |
| F11 | **INFO** | A9 "~59" | Button opens at L58. | Fix anchor to L58. |
| F12 | **INFO** | Mockup rail online dot | Mockup rail shows a green online dot at the bottom; Sidebar has no online state (Header owns `online-status`). Plan correctly omits it (OD-555-17 illustrative). | None — note so QA doesn't flag it. |
| F13 | **INFO** | WP-D wrapped alignment | Plan drops IA's "+`justify-end` where right-aligned". Mockup `.rctl` has no `justify-end`; controls left-align on row 2. Plan = mockup. | None. |
| F14 | **INFO** | WP-D edit method | 40 files × 2 identical `flex items-center gap-3` strings per header (title row at outer+1 is byte-identical to the controls row). `search_replace` with next-line context works but is 80 hand-anchored edits. | Recommend the implementer run a **line-number-driven Python edit** that asserts each (file, line, expected class string) from §3 table before replacing, then re-runs the scan → 0 NOWRAP. Deterministic; same R18 marker per file. |
| F15 | **INFO** | Wrap behaviour at 800×500 | Mockup shows search + both chips on row 1, icons on row 2. In code the menu-type chip (L1727) is conditional and the search intrinsic width is input-driven (~180px); at 288px the chip may wrap with the icons. Matrix row "A5" should accept chips on either row. | Matrix A5 wording: "search on row 1; icon group fully visible on row ≤2; all 5 icons ≥40px". |
| F16 | **INFO** | BUG-560 | Not part of this plan (own Gate 2–3 per E-3=b). Intake snippet matches `config/firebase.js:21-27` at HEAD; consumers = `LoginPage.jsx:8` (`requestFCMToken`), `NotificationContext.jsx:4` (`onForegroundMessage`). | No action here. |

**No blocking finding.** F1 is the only one that would breach a locked OD (OD-555-17 desktop pixel-identical) if implemented as written.

## 3. Verification Matrix additions (if F1–F9 accepted)
- C10: desktop `add-table-btn` height unchanged (40px) at V6; ≥44×44 at V3.
- A10: at V4 icon group `getBoundingClientRect().right` ≈ middle-pane right edge (right-aligned on row 2).
- B4: closed drawer — `document.activeElement` never lands inside `sidebar-drawer` when tabbing from the rail (inert).
- A7: `getComputedStyle(overlay).backdropFilter` contains `blur`.

## 4. Owner decision — CLOSED 2026-10-15
- Owner: **"static"** → **OD-555-18** locked (no rotate-icon animation; tilt keyframe and `animate-spin` rejected).
- Amendments F1, F2, F3, F5, F7, F8, F9, F10, F11, F14, F15 **applied** to `plans/BUG-555_IMPLEMENTATION_PLAN.md` (v2). F4a/b (blur + 96px icon) applied; F4c = static per OD-555-18. F6, F12, F13, F16 = no change (recorded).
- Docs updated: IA §9 (OD-555-18 + revalidation note), intake §12, `registry.json` (OD-555-18, `plan_revision`, `plan_revalidation_doc`), `BUG_TRACKER.md`.
- Follow-up logged (not in scope): full keyboard focus-trap inside the open sidebar drawer (needs new dependency).
- Status: plan v2 ready for **Gate 4 GO**.
