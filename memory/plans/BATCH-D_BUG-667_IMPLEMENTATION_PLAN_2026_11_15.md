# BATCH-D · BUG-667 (Wrap long restaurant name — Sidebar + PMS headers) — Implementation Plan (Gate 3) — 2026-11-15

> Status: GATE_3_PLAN_DRAFT
> HEAD commit: 66ffe518
> Risk: LOW
> Conflicts: Sidebar.jsx — BUG-570/CR-435 (5A) on different block (~L400-500 nav items). No overlap with L880-889 profile block. PMS headers — no open edits.

## 1. What changes
Long restaurant names overflow the sidebar profile line and PMS page headers. Fix: allow the name to wrap onto 2 lines with a clamp, instead of truncating to 1 line or overflowing.

## 2. Files changed

| # | File | Function / Line at HEAD | What changes |
|---|------|------------------------|--------------|
| E1 | `src/components/layout/Sidebar.jsx` | L880 (`<div className="flex-1 text-left">`) | Add `min-w-0` to prevent flex child overflow |
| E2 | `src/components/layout/Sidebar.jsx` | L887 (restaurant name `<div>`) | Replace `truncate` with `line-clamp-2 break-words` for 2-line wrap |
| E3 | `src/pages/pms/FrontDeskPage.jsx` | L143 (`<p>` with restaurant name) | Add `line-clamp-2 break-words`, parent `<div>` gets `min-w-0 flex-1` |
| E4 | `src/pages/pms/ReservationsPage.jsx` | L103 (`<p>` with restaurant name) | Same pattern as E3 |
| E5 | `src/pages/pms/RoomStatusPage.jsx` | L121 (`<p>` with restaurant name) | Same pattern as E3 |

## 3. Exact edits

### E1 + E2 — Sidebar.jsx L880, L887

**Before (L880):**
```jsx
            <div className="flex-1 text-left">
```
**After:**
```jsx
            <div className="flex-1 text-left min-w-0"> {/* BUG-667: constrain flex child width */}
```

**Before (L887):**
```jsx
              <div className="text-xs truncate" style={{ color: COLORS.grayText }}>
```
**After:**
```jsx
              <div className="text-xs line-clamp-2 break-words" style={{ color: COLORS.grayText }}> {/* BUG-667: wrap long name to 2 lines */}
```

### E3 — FrontDeskPage.jsx L140-143

**Before:**
```jsx
          <div>
            <h1 className="text-[18px] font-bold text-[#1A1A1A]" style={{ fontFamily: 'Poppins, sans-serif' }}>{greeting()}</h1>
            <p className="text-[12px] text-[#888] mt-0.5">{longDate}{restaurant?.name ? ` · ${restaurant.name}` : ''}</p>
          </div>
```
**After:**
```jsx
          <div className="min-w-0 flex-1"> {/* BUG-667 */}
            <h1 className="text-[18px] font-bold text-[#1A1A1A]" style={{ fontFamily: 'Poppins, sans-serif' }}>{greeting()}</h1>
            <p className="text-[12px] text-[#888] mt-0.5 line-clamp-2 break-words">{longDate}{restaurant?.name ? ` · ${restaurant.name}` : ''}</p>
          </div>
```

### E4 — ReservationsPage.jsx L100-103

**Before:**
```jsx
          <div>
            <h1 className="text-[18px] font-semibold text-[#1A1A1A]" style={{ fontFamily: 'Poppins, sans-serif' }}>Reservations · Tape Chart</h1>
            <p className="text-[13px] text-[#888] mt-0.5">{fmtDate()} · {restaurant?.name ?? ''}</p>
          </div>
```
**After:**
```jsx
          <div className="min-w-0 flex-1"> {/* BUG-667 */}
            <h1 className="text-[18px] font-semibold text-[#1A1A1A]" style={{ fontFamily: 'Poppins, sans-serif' }}>Reservations · Tape Chart</h1>
            <p className="text-[13px] text-[#888] mt-0.5 line-clamp-2 break-words">{fmtDate()} · {restaurant?.name ?? ''}</p>
          </div>
```

### E5 — RoomStatusPage.jsx L118-121

**Before:**
```jsx
          <div>
            <h1 className="text-[18px] font-semibold text-[#1A1A1A]" style={{ fontFamily: 'Poppins, sans-serif' }}>Room Status Board</h1>
            <p className="text-[13px] text-[#888] mt-0.5">{fmtDate()} · {restaurant?.name ?? ''}</p>
          </div>
```
**After:**
```jsx
          <div className="min-w-0 flex-1"> {/* BUG-667 */}
            <h1 className="text-[18px] font-semibold text-[#1A1A1A]" style={{ fontFamily: 'Poppins, sans-serif' }}>Room Status Board</h1>
            <p className="text-[13px] text-[#888] mt-0.5 line-clamp-2 break-words">{fmtDate()} · {restaurant?.name ?? ''}</p>
          </div>
```

## 4. Test steps
| # | Steps | Expected |
|---|-------|----------|
| V1 | Sidebar expanded, desktop: restaurant with 60+ char name | Wraps to 2 lines, stays inside 280px sidebar, "· #ID" visible or ends with "…" |
| V2 | Short restaurant name | Looks exactly as today — 1 line |
| V3 | Tablet drawer | Same as V1 (same 280px width) |
| V4 | Collapsed sidebar | Unchanged — only avatar shows |
| V5 | FrontDeskPage with long name | 2 lines max, "New Booking" button keeps size/position |
| V6 | ReservationsPage with long name | 2 lines max, refresh button not pushed |
| V7 | RoomStatusPage with long name | 2 lines max, refresh button not pushed |
| V8 | Webpack compile | 0 new warnings |

## 5. Rebase note
Sidebar.jsx: BUG-570/CR-435 edit nav items around L400-500. No line overlap with profile block (L880-889). Parallel-safe.

## 6. Scope lock
**WILL change:** Sidebar.jsx (L880, L887), FrontDeskPage.jsx (L140, L143), ReservationsPage.jsx (L100, L103), RoomStatusPage.jsx (L118, L121)
**WILL NOT touch:** Sidebar nav items, sidebar scroll area, Switch Restaurant, any transforms/APIs
