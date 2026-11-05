# BUG-590 — Impact Analysis (Gate 2)
## Search dropdown: tables "EXACT MATCH" header missing "TABLE" prefix

**ID:** BUG-590 | **Stage:** Gate 2 | **Date:** 2026-10-17
**Risk:** LOW | **Priority:** P2

---

## Code Reality: NONE
`grep -rn "BUG-590"` → 0 matches in `src/`. No fix code exists.

---

## Conflict Pre-Check

| Open item | File | Lines | Conflict? |
|---|---|---|---|
| BUG-581 | Header.jsx | Action labels (OrderCard) | NO — different section |
| BUG-588 | Header.jsx | L503 + L545 (item.id → item.label) | NO — different lines |
| BUG-589 | DashboardPage.jsx | L1221 | NO — different file |

**Result: NO CONFLICT.** L494 not touched by any open item.

---

## Data Flow Trace

```
Header.jsx dropdown — section headers:
  Tables exact:    L494  <span>Exact Match</span>         ← no channel label ❌
  Tables partial:  L537  "Tables" / "Other Tables"        ← OK
  Delivery exact:  L579  <span>Delivery - Exact Match</span>   ✅
  TakeAway exact:  L636  <span>TakeAway - Exact Match</span>   ✅
  Rooms exact:     L693  <span>Room - Exact Match</span>       ✅
```

All channels except **Tables** identify themselves in the exact match header. When a hotel like Palmhouse has both a table "109" and room "109", the user sees:

```
EXACT MATCH           ← Could be a table OR room? No channel context
  109  Available

ROOM - EXACT MATCH    ← Clearly a hotel room
  109  Kashni Kaur  ₹2,503
```

**Fix:** Add "TABLE - " prefix to the tables exact match header label — matching the pattern used by every other channel.

---

## Exact Edit Required

**Header.jsx L494:**
```jsx
// BEFORE:
<span>Exact Match</span>

// AFTER:
<span>Table - Exact Match</span> {/* BUG-590: add TABLE prefix to match ROOM/DELIVERY/TAKEAWAY pattern */}
```

**1 line. That is the entire fix.**

---

## Scope Lock
**WILL change:** `src/components/layout/Header.jsx` — L494 only (1 word added to string)
**WILL NOT touch:** DashboardPage.jsx · any search logic · any other Header section

---

## Verification Matrix

| # | Test | Expected |
|---|---|---|
| V1 | Search any table (e.g. "10") → exact match | Header shows **"TABLE - EXACT MATCH"** |
| V2 | Search room number (e.g. "109") | Header still shows **"ROOM - EXACT MATCH"** unchanged |
| V3 | Hotel with same table+room number ("109") | Two sections clearly labeled: "TABLE - EXACT MATCH" and "ROOM - EXACT MATCH" |
| V4 | Delivery search | "DELIVERY - EXACT MATCH" unchanged |

---

## Post-Code Registry Checklist
```
- [ ] registry.json: BUG-590 → IMPLEMENTED
- [ ] BUG_TRACKER.md: row updated
- [ ] FILE_OWNERSHIP.md: Header.jsx + BUG-590 + date
- [ ] Code marker: // BUG-590 on edited line
- [ ] Compile: 0 new warnings
```
*Gate 2 complete — 2026-10-17. Fast Lane eligible (1 file, 1 line, LOW risk, NOT R5 hotspot). Awaiting owner FAST LANE APPROVED or Gate 3.*
