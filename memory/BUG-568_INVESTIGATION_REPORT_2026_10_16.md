# Investigation Report — BUG-568 + BUG-569
## Owner Smoke Test Findings: Sidebar Inaccessible + OrderCard Button Overflow
**Date:** 2026-10-16 · **Role:** INVESTIGATION · **Steps used:** 8/10 · **Sprint:** oct_cr_batch

---

## 1. Summary

| # | Issue | Root Cause | Confidence | ID | Classification |
|---|---|---|---|---|---|
| 1 | iPad portrait — can't scroll sidebar to Logout | `h-screen` (100vh) on tablet drawer > actual visible viewport (browser chrome) | HIGH | **BUG-568** | FE_BUG |
| 2 | Android tablet — Ready/Serve buttons overflow card | BUG-561 fix IS in current code; likely stale deployment | MEDIUM | **BUG-569** | FE_BUG (verify) |
| 3 | Android tablet — sidebar very difficult to use | Same as #1 + maskImage hides nav scroll affordance on touch | HIGH | BUG-568 sub-issue |

BUG-568 covers Issues 1 and 3 (same root cause). BUG-569 covers Issue 2.

---

## 2. Hypotheses Tested

| # | Hypothesis | Test | Result | Evidence |
|---|---|---|---|---|
| H1 | `h-screen` (100vh) on drawer > visible viewport | Read `Sidebar.jsx:525` + check `inset-y-0` co-presence | **CONFIRMED** | L525: `h-screen fixed inset-y-0` — 100vh > actual viewport on iOS/Android |
| H2 | Bottom section `flex-shrink-0` — no scroll on overflow | Read bottom section (L779-898) | **CONFIRMED** | Bottom has `flex-shrink-0`, no `overflow-y-auto` — Logout at very bottom |
| H3 | maskImage gradient makes nav bottom items unreadable on touch | Read `Sidebar.jsx:634` (BUG-562) | **CONFIRMED** | `linear-gradient to bottom, black calc(100%-40px), transparent 100%)` fades last 40px to transparent — hides items + defeats scroll affordance |
| H4 | Ready/Serve button overflow — BUG-561 not applied | Read `OrderCard.jsx:1132, 1197` | **ELIMINATED** | Both buttons have `flex-1 min-w-0 px-2` (BUG-561 fix IS present) |
| H5 | Card has no overflow clip | Read `OrderCard.jsx:454` | **ELIMINATED** | `overflow-hidden` present on card root |
| H6 | Issue 2 from stale deployment | Compare screenshot URL vs env | **CONFIRMED** | Screenshot: `pos-frontend-app-4.preview.emergentagent.com` ≠ current `genie-pos-app.preview.emergentagent.com` |

---

## 3. BUG-568 — Sidebar Drawer: Logout Inaccessible on iPad/Android

### Root Cause

**File:** `src/components/layout/Sidebar.jsx` **Line:** 525

```jsx
// CURRENT (broken on mobile browsers):
className={`h-screen flex flex-col ... ${isTablet ?
  `fixed inset-y-0 left-0 z-[100] shadow-2xl ...` :
  "sticky top-0"}`}
```

On **iOS Safari** and **Android Chrome**, `100vh` (= `h-screen`) includes the browser chrome — URL bar, nav bar, tab strip. This means `height: 100vh` > actual visible viewport height. Even though `fixed inset-y-0` correctly sets `top:0; bottom:0`, the explicit `h-screen` overrides the inset height, making the `aside` taller than the visible area.

The `aside` uses `flex flex-col` with:
- Logo header: ~72px (fixed)
- View toggles: ~100px (fixed)
- Nav: `flex-1 overflow-y-auto min-h-0` — collapses to fit
- **Bottom section: `flex-shrink-0`** — NEVER shrinks → pushed below visible area

**Result:** Logout button (last item in bottom section) is below the visible fold. No way to scroll to it — the bottom section has no `overflow-y-auto`.

### Data Flow Trace
```
Browser visible viewport: e.g. 768px (after chrome = 844px - 76px chrome)
aside height: h-screen = 100vh = 844px  ← exceeds visible area by 76px
  ├── Logo header:     72px
  ├── View toggles:    ~100px
  ├── Nav (flex-1):    collapses to ~500px
  └── Bottom (flex-shrink-0): ~272px  ← starts at 672px, ends at 944px
       ├── Ringer:    ~48px
       ├── Refresh:   ~48px
       ├── Profile:   ~48px
       ├── Logout:    ~48px    ← at ~892px, BELOW visible fold (844px)
```

### Sub-issue: maskImage hides nav scroll affordance (BUG-562)
`Sidebar.jsx:634` — `maskImage: 'linear-gradient(to bottom, black calc(100% - 40px), transparent 100%)'`

The last 40px of nav items fade to transparent. On touch devices this hides scroll affordance rather than signalling it — users assume the nav ends there, when items continue below.

### Fix scope
**1 file, 1-2 lines, LOW risk.** Not financial, not R5.

Change at L525: replace `h-screen` with `isTablet ? "h-[100dvh]" : "h-screen"` so the tablet drawer uses dynamic viewport height (excludes browser chrome). `100dvh` is supported on iOS Safari 15.4+ and Android Chrome 108+.

```jsx
// PROPOSED:
className={`${isTablet ? "h-[100dvh]" : "h-screen"} flex flex-col ... ${isTablet ?
  `fixed inset-y-0 left-0 z-[100] shadow-2xl ...` :
  "sticky top-0"}`}
```

**Fast Lane eligible:** YES — 1 file, 1-2 lines, not R5, not financial.

---

## 4. BUG-569 — OrderCard Ready/Serve Button Overflow (Android Tablet)

### Root Cause

**Classification:** LIKELY RESOLVED by BUG-561 on current deployment.

Evidence:
- `OrderCard.jsx:1132` Ready button: `flex-1 min-w-0 px-2` ✅ (BUG-561 fix present)
- `OrderCard.jsx:1197` Serve button: `flex-1 min-w-0 px-2` ✅
- `OrderCard.jsx:454` Card root: `overflow-hidden` ✅

Owner screenshot URL: `pos-frontend-app-4.preview.emergentagent.com` — this is a **different deployment** from current (`genie-pos-app.preview.emergentagent.com`). The screenshot likely shows the pre-BUG-561 code.

### Residual Risk (MEDIUM)
If the owner's device is pointed at the current deployment and the issue persists, the residual cause is:

Footer layout: `flex items-center justify-between gap-2`
- Left section: up to 3 fixed 44px buttons (KOT + Cancel + WhatsApp) = 148px + 16px gaps = 164px
- Right section: `flex-1 min-w-0` → minimum 0px

On very narrow cards (<180px), right section can become visually cramped with text truncated. But `overflow-hidden` on card root clips any actual overflow.

### Fix scope
**Verify on current deployment first.** If resolved: close as CLOSED_SUBSUMED (BUG-561). If still visible: additional narrowing of left-section icons at tablet widths.

---

## 5. Data Flow Trace — BUG-568 (Sidebar)

```
DashboardPage → Layout → Sidebar.jsx
  isTablet = matchMedia('(max-width: 1279px)').matches  [L290]
  drawer = fixed inset-y-0 left-0 + h-screen  [L525]
  
  aside (flex-col, h-screen=100vh)
    ├── Logo div (p-4, ~72px)
    ├── View toggles (px-3 py-3, ~100px)  
    ├── nav (flex-1, overflow-y-auto, min-h-0)  [L634]
    │    └── maskImage fades last 40px  ← hides scroll cue
    └── Bottom div (p-4, flex-shrink-0)  [L780]
         ├── Ringer (~48px)
         ├── Refresh (~48px)
         ├── Profile (~48px)
         └── Logout (~48px)  ← BREAK POINT: below 100vh visible area
                                on iOS/Android where 100vh > actual viewport
```

---

## 6. Evidence
- Screenshot 1 (iPad portrait): Sidebar showing with Ringer/Refresh/Profile visible, Logout below fold
- Screenshot 2 (Android tablet): Ready button circled — stale deployment, current code has BUG-561 fix
- Screenshot 3 (Android tablet): Drawer open, scrollbar visible, items below "Ringer On" cut off

---

## 7. Recommendations

| Bug | Action | Risk | Fast Lane? |
|---|---|---|---|
| BUG-568 | Planning Gate 2 IA → Gate 3 → implement `h-[100dvh]` on tablet drawer | LOW | YES |
| BUG-569 | Verify on current deployment (`genie-pos-app.preview.emergentagent.com`); if resolved → CLOSED_SUBSUMED(BUG-561); if persists → full gate cycle | MEDIUM | TBD |

---

## 9. BUG-569 — Update: Confirmed on Current Deployment + Root Cause Found

**New evidence:** Owner screenshot from `genie-pos-app.preview.emergentagent.com` (current deployment) confirms issue persists.

### Root Cause (HIGH confidence — multi-button overflow)

**File:** `ChannelColumn.jsx:9` + `OrderCard.jsx:1044,1046`

```
TABLE_CARD_WIDTH = 160px  (ChannelColumn.jsx:9)
Footer px-3 → content area = 136px

Left section possibilities:
  1 button (KOT):                   44px
  2 buttons (KOT + Cancel):         44+8+44 = 96px
  3 buttons (KOT+Cancel+WhatsApp): 44+8+44+8+44 = 148px

  Gap (inner gap-2) between left and right: 8px

Right button (flex-1 min-w-0) remaining space:
  1 left btn: 136 - 44 - 8 = 84px  ← OK (visually tight, orange border visible)
  2 left btn: 136 - 96 - 8 = 32px  ← VERY TIGHT, text clips
  3 left btn: 136 - 148 - 8 = -20px ← OVERFLOW — left section overflows content area!
```

**BUG-561 fix gap:** BUG-561 changed RIGHT buttons to `flex-1 min-w-0 px-2`. This prevents the right button overflowing. BUT: the LEFT section `<div className="flex items-center gap-2">` (L1046) has NO `min-w-0` and no `flex-shrink-0`. With negative remaining space, CSS flex-shrink kicks in — the right button (min-w-0) collapses to 0, and the left section (no min-w-0, min-width ≈ content) overflows the footer's px-3 content area by ~20px. Card's `overflow-hidden` clips at the card border, making the right button appear to "flow out."

**Secondary (1-button visual):** With 1 left button at 160px card, right button = 84px. The 1px orange border on "Ready" (vs no border on "Bill"/"Settle") creates visual prominence at 12px from card edge — appears to overflow even when it doesn't.

### Data Flow Trace
```
ChannelColumn.jsx:9 → TABLE_CARD_WIDTH = 160px (fixed desktop, auto-fill 140px tablet)
  → OrderCard.jsx:991 footer: px-3 py-2 flex items-center justify-between gap-2
    → OrderCard.jsx:1044 inner: flex items-center w-full gap-2
      → L1046 left div: flex items-center gap-2  ← NO min-w-0 here
        │  L1050 KOT btn: min-w-[44px]
        │  L1065 Cancel btn: min-w-[44px] (if isOrderCancelAllowed)
        │  L1077 WA btn: min-w-[44px] (if showWhatsAppPayment)
        └─ BREAK: at 3 buttons, left = 148px + 8px gap = 156px > 136px content
      → L1132 Ready btn: flex-1 min-w-0 ← collapses to 0, sits at card right edge
```

### Fix Scope (1 file, 1-2 lines, MEDIUM risk)
Two options:
- **Option A (recommended):** Add `min-w-0` to the LEFT section div at L1046: `<div className="flex items-center gap-2 min-w-0">` → left section can shrink; both sections shrink proportionally with overflow-hidden clipping  
- **Option B:** Add `overflow-hidden` to the inner div at L1044 to clip left section overflow earlier

### Classification
FE_BUG — PLAN_GAP. BUG-561 fixed right button overflow but left section can still overflow content area at 160px card when 3 icon buttons are visible.

### Files
- `OrderCard.jsx:1046` (left section container — needs `min-w-0`)
- `ChannelColumn.jsx:9` (TABLE_CARD_WIDTH = 160 context)

NONE — both are new findings from Gate 6 smoke test.
