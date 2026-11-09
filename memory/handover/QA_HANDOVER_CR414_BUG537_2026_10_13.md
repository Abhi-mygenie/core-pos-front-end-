# QA Handover — CR-414 + BUG-537 (Dashboard Tablet Responsive Redesign)
**Date:** 2026-10-13 · **From:** IMPLEMENTATION agent · **To:** QA (`testing_agent`) · **Risk:** HIGH · **Sprint:** oct_cr_batch
**Plan:** `plans/CR-414_IMPLEMENTATION_PLAN.md` v2 (15 edits, 3 files)
**Items in this batch (new + testing debt):** CR-414, BUG-537 (just shipped) · BUG-539, CR-413, CR-412 (shipped earlier, `testing_agent` not yet run).

---

## 1. Inherited from Plan — Verification Matrix (self-test result)

| # | Edit | File | Verification | Self-Test |
|---|------|------|-------------|:---:|
| V-1 | 1c/1d/1e/1g/1h | Header.jsx | 600×960 single-row header; `pos-header` scrollWidth ≤ clientWidth; Add visible | **DELEGATED (needs auth)** |
| V-2 | same | Header.jsx | 768×1024 + 960×600 same as V-1 (F2 regression — `lg`=1024 threshold must prevent 10" overflow) | **DELEGATED** |
| V-3 | 1d | Header.jsx | Tap `tablet-filter-dropdown-btn` → menu opens downward below header | **DELEGATED** |
| V-4 | 1d | Header.jsx | **Channel view** (default): menu lists YTC/Preparing/Ready/Served/Pending Pay/Paid + **Schedule** with check marks; toggling Preparing off removes Preparing cards; last status cannot be deselected (reuses pill handler `handleStatusToggle`) | **DELEGATED** |
| V-5 | 1d | Header.jsx | **Status view**: menu lists Delivery/TakeAway/Dine In/Room; untick Dine In → Dine-In cards disappear; last channel cannot be deselected | **DELEGATED** |
| V-6 | 1d | Header.jsx | Menu stays open while toggling; closes on outside tap/touchstart | **DELEGATED** |
| V-7 | 1e/1g | Header.jsx | PlatformDropdown + Web/POS counter chip not visible <1024 | **PASS** — `grep` confirms 3× `hidden lg:flex`; screenshot delegated |
| V-8 | 1h/1i | Header.jsx | Focus search at 600: no header overflow; results dropdown fully in viewport | **DELEGATED** |
| V-9 | 2b/2c | ChannelColumn.jsx | 600: each channel full-width (`channel-column-dineIn` width ≈ layout clientWidth); cards auto-fill (≈3 table cards per row at 530 usable) | **DELEGATED** |
| V-10 | 3c | ChannelColumnsLayout.jsx | 600: Dine-In above Take-Away above Delivery, visible gap between | **DELEGATED** |
| V-11 | OD-414-02=A | ChannelColumn.jsx | Tap `>` on Dine-In at 600 → console `[Arrow] dineIn 2→3`, `mygenie_layout_table_view` localStorage updated; visible grid unchanged on tablet (auto-fill); on ≥1024 reflects fixed columns | **DELEGATED** |
| V-12 | all | all | **1280×800 collapsed sidebar: pixel-match vs `evidence/BUG-537/l1280.png` (desktop safety)** | **DELEGATED — MUST PASS** |
| V-13 | all | all | 1024×768: side-by-side layout, header overflow ≤ HEAD baseline | **DELEGATED** |
| V-14 | 3c | ChannelColumnsLayout.jsx | Status view at 600: status columns stack vertically | **DELEGATED** |
| V-15 | 2c | ChannelColumn.jsx | Order view at 600: 1 order card per row (280px min); at 768: 2 per row | **DELEGATED** |
| V-16 | 2a/3b | ChannelColumn.jsx + ChannelColumnsLayout.jsx | `grep -c isTablet` ≥1 in each (Header uses Tailwind `lg:` only — plan V-16 line is inaccurate for Header; functionally correct) | **PASS** — ChannelColumn=5, ChannelColumnsLayout=2 |
| V-17 | all | — | `yarn start` compile exit 0, 0 new warnings; no JSX `{/* */}` inside opening tags | **PASS** — `webpack compiled with 1 warning` (pre-existing SettlementReportMockup). F1 regex scan: 0 bad across 3 files |

**Code marker count (plan target: ≥9/≥4/≥4):**
- `Header.jsx` → **10** ✅
- `ChannelColumn.jsx` → **5** ✅
- `ChannelColumnsLayout.jsx` → **4** ✅

---

## 2. Browser test cases (expand on V-matrix with step-by-step)

### CR-414 — Tablet redesign (device-emulation in Chrome DevTools)

| # | Viewport | Steps | Expected |
|---|---|-------|---------|
| T1 | 600×960 | Login → Dashboard | Header is one row: logo · filter dropdown button · fluid search · Add. No pills nav. No PlatformDropdown. No Web/POS chip. Nothing clipped off right edge. |
| T2 | 600×960 | Tap filter dropdown button | Menu opens **downward** immediately below the button. Shows status rows YTC/Preparing/Ready/Served/Pending Pay/Paid + Schedule (default `channel` view). Active ones have orange `Check` icon. |
| T3 | 600×960 | Tap "Preparing" | Check icon disappears from Preparing. Preparing cards vanish from dashboard. Menu stays open. |
| T4 | 600×960 | Tap "Served" (so only Served is active) → tap Served again | Second tap blocked — last status cannot be deselected (reuses pill guard). |
| T5 | 600×960 | Tap outside menu | Menu closes. Filter button retains the small count badge showing active-filter count. |
| T6 | 600×960 | Dashboard body | Channels **stacked vertically**: Dine-In (full width) then Take-Away then Delivery. Each at natural height. Whole page scrolls. Table cards auto-fill (≈3/row). |
| T7 | 600×960 | Tap `>` arrow on Dine-In header | Console `[Arrow] dineIn N→N+1`. `mygenie_layout_table_view` localStorage key updates. Visible grid stays the same (auto-fill ignores actualColumns on tablet). |
| T8 | 600×960 | Tap search; type `table` | Search box fills row. Results dropdown pinned to right (`right:0; w-80`) — fully in viewport. |
| T9 | 600×960 | Switch to Status view (via sidebar toggle) | Dashboard shows status columns stacked vertically. Filter dropdown button label flips to "Channels". Menu now lists Delivery/TakeAway/Dine In/Room. |
| T10 | 768×1024 | Repeat T1 | Still single-row header, no overflow. (Critical — v1's `md`=768 would have failed here.) |
| T11 | 960×600 (landscape 10") | Repeat T1 | Still single-row header, no overflow. |
| T12 | 1024×768 | Repeat T1 | **Desktop layout** — pills nav visible, PlatformDropdown + Web/POS chip visible, search `w-48` fixed, channels side-by-side. |
| T13 | 1280×800 collapsed sidebar | Compare against `evidence/BUG-537/l1280.png` | **Pixel-identical to HEAD baseline** (Desktop Safety — plan §6). |
| T14 | 1280×800 **expanded** sidebar | — | Header overflows (pre-existing F12 — out of scope, confirm no regression). |
| T15 | 600 → rotate → 960 | While on dashboard | `isTablet` recomputes via matchMedia; layout switches smoothly without reload. |

### Regression (plan R5 hotspots — must still work on desktop)

| # | Test | Why |
|---|------|-----|
| R1 | Place order via dashboard → verify order appears in correct channel at 1280 | ChannelColumn/Layout touched |
| R2 | Open PlatformDropdown (desktop) and filter POS/Web/Scan | PlatformDropdown wrapper classname changed |
| R3 | Search a customer by name on desktop | Search box classes changed |
| R4 | Toggle sidebar collapse/expand at 1280 | Verify layout survives width change (matchMedia observer) |

### Testing debt — previously shipped, never run through `testing_agent`

| Item | Scope | Primary file(s) | Guidance |
|---|---|---|---|
| **BUG-539** | See `handover/QA_HANDOVER_BUG539_2026_10_12.md` | — | Run its test cases |
| **BUG-539 ML64** | See `handover/QA_HANDOVER_BUG539_ML64_2026_10_12.md` | — | Run its test cases |
| **CR-413** | See `handover/QA_HANDOVER_CR413_2026_10_12.md` | — | Run its test cases |
| **CR-412** | See `handover/QA_HANDOVER_CR412_2026_10_12.md` | — | Run its test cases |

---

## 3. Registry Sync Confirmation
- Registry synced: **YES**
- Items: CR-414, BUG-537 → `GATE_5A_IMPLEMENTED`
- Sprint: `oct_cr_batch`
- **EXIT GATE: 5/5 PASS**
  1. registry.json updated ✅
  2. CR_REGISTRY.md + BUG_TRACKER.md rows → GATE_5A_IMPLEMENTED ✅
  3. FILE_OWNERSHIP.md: new section at line 1921 lists all 3 files + per-edit summary ✅
  4. Code markers: 10/5/4 (≥9/≥4/≥4) ✅
  5. Compile: `webpack compiled with 1 warning` (SettlementReportMockup pre-existing, unrelated) ✅

## 4. Credentials + Environment
- Account: see `/app/memory/test_credentials.md` (if present) — otherwise QA agent must request from owner.
- Preview URL: value of `REACT_APP_BACKEND_URL` in `/app/frontend/.env` → `https://genie-pos-web.preview.emergentagent.com`
- Backend (Laravel): `preprod.mygenie.online`
- Note: pod's local FastAPI backend is **stopped by design** (this is a frontend-only deployment).

## 5. Known pre-existing / out of scope (do NOT fail QA on these)
- F12: expanded 280px sidebar at 1280 already overflows desktop header (pre-existing, not touched).
- 1024–1078 desktop width is marginal (pre-existing).
- SettlementReportMockup eslint `allDays` warning (pre-existing).

## 6. data-testid additions (for `testing_agent`)
- `tablet-filter-dropdown-btn`
- `tablet-filter-active-count`
- `tablet-filter-dropdown-menu`
- `tablet-filter-channel-<id>` (dineIn / delivery / takeAway / room)
- `tablet-filter-status-<id>` (ytc / preparing / ready / served / pendingPay / paid)
- `tablet-filter-schedule`
- (unchanged, still present) `channel-column-<id>`, `channel-columns-layout`
