# BUG-569 — Intake (Gate 1)
## OrderCard action buttons crowd/overflow at 160px card width — left section has no min-w-0

**ID:** BUG-569
**Type:** BUG (found during Gate 6 Owner Smoke Test — PLAN_GAP from BUG-561)
**Date:** 2026-10-16
**Registered by:** INTAKE agent (owner smoke test 2026-10-16)
**Severity:** P1 — HIGH
**Risk:** MEDIUM (OrderCard.jsx — component state + layout logic, non-financial)
**Sprint:** oct_cr_batch
**Area:** Menu / Order Entry (user sees order cards during service; Ready/Serve tapping is the order-taking flow)
**Related:** BUG-561 (PLAN_GAP — fixed right button overflow but left section was not addressed)
**Fast Lane eligible:** YES — 1 file, 1 line, not R5, not financial
**Process:** Fast Lane (owner Gate 4 GO required)
**Duplicate check:** RELATED to BUG-561 (same file, same footer section). BUG-561 fixed the RIGHT action button; this is the LEFT section — distinct scope, distinct fix.

---

## 1. Description

At `TABLE_CARD_WIDTH = 160px` (ChannelColumn.jsx:9, desktop fixed), the OrderCard footer's **left section** can contain up to 3 icon buttons: KOT print + Cancel + WhatsApp = 3 × 44px + 2 × 8px gaps = **148px**. With 8px gap to the right section, total left demand = **156px**. The footer's content area = card_width − px-3 − px-3 = 160 − 24 = **136px**.

156px > 136px → **left section overflows** the footer's content area.

The left section container (`OrderCard.jsx:1046 <div className="flex items-center gap-2">`) has **no `min-w-0`**. Without it, the browser's minimum content size (`min-width: auto`) prevents shrinking, causing the left section to overflow the card's padding area. The `overflow-hidden` on the card root clips this at the card border, making buttons appear to "flow out."

BUG-561 fixed the **right** button with `flex-1 min-w-0 px-2`. The **left** section was not addressed — this is the PLAN_GAP.

**Owner report (Android tablet landscape):** *"In small resolution Android tab — Ready/Serve these buttons are flowing out of card."* Confirmed on current deployment (`genie-pos-app.preview.emergentagent.com`).

---

## 2. Button Width Budget at 160px Card

| Left buttons visible | Left section width | Gap | Right available | Result |
|---|---|---|---|---|
| 1 (KOT only) | 44px | 8px | **84px** | ✅ OK (visually tight — orange border on "Ready" appears to hug edge) |
| 2 (KOT + Cancel) | 96px | 8px | **32px** | ⚠️ Very tight — text barely visible |
| 3 (KOT + Cancel + WhatsApp) | 148px | 8px | **−20px** | ❌ OVERFLOW — left section clips at card border |

---

## 3. Affected Files

| File | Line | Issue |
|---|---|---|
| `src/components/cards/OrderCard.jsx` | 1046 | Left section `<div className="flex items-center gap-2">` — missing `min-w-0` |
| `src/components/dashboard/ChannelColumn.jsx` | 9 | `TABLE_CARD_WIDTH = 160` — context (not changed) |

---

## 4. Evidence

- **Screenshot 1:** Android tablet (old deployment, `pos-frontend-app-4`) — "Ready" button circled, flowing beyond card
- **Screenshot 2:** Android tablet landscape (current deployment, `genie-pos-app`) — "Ready" button confirmed on current build
- **Code trace:** Left section no `min-w-0`, TABLE_CARD_WIDTH=160, math confirms overflow at 3 buttons
- **Confidence:** HIGH — overflow math confirmed, code trace confirmed
- **Source:** OWNER-REPORTED (Gate 6 smoke test 2026-10-16)

---

## 5. Blast Radius

- **1 file changed:** `src/components/cards/OrderCard.jsx`
- **1 line changed:** L1046 — add `min-w-0` to left section container
- **Hotspot files:** NO — OrderCard.jsx not in R5 list
- **Estimated scope:** SMALL

---

## 6. Severity Rubric

**P1 — HIGH:** Feature impaired — staff cannot see/tap action buttons (Ready/Serve/Bill) on narrow cards during active service. Workaround is to expand the card column count.

---

## 7. Risk Classification

**Risk: MEDIUM**
- Component layout change — affects how buttons are sized in dashboard cards
- No API, financial, state management, or auth change
- Not R5 hotspot (OrderCard.jsx not in R5 list)
- Affects all card types at 160px width (table view)

**Fast Lane eligible:** YES (1 file, 1 line, MEDIUM risk — needs owner explicit approval since MEDIUM)

---

## 8. Proposed Fix (for Planning reference)

**E1 — OrderCard.jsx:1046:** Add `min-w-0` to left section container
```jsx
// BEFORE:
<div className="flex items-center gap-2">

// AFTER:
<div className="flex items-center gap-2 min-w-0"> {/* BUG-569 */}
```

With `min-w-0`, the left section can shrink below its natural content width. CSS flex-shrink will distribute the overflow between left (with buttons that may clip via overflow-hidden) and right (which already has min-w-0). The card's `overflow-hidden` clips the result cleanly.

---

## 9. Open Decisions

**None.** Fix is unambiguous.

**OD-569-01:** Owner approves Fast Lane GO? → Implementation (1 line, OrderCard.jsx)
