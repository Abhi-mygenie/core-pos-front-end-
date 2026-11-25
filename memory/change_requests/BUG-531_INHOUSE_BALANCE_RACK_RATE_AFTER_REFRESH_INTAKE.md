# BUG-531 — Intake

## InHouse/Departures Balance Column Shows Rack Rate (₹1,650) After Snapshot Refresh — Discount Lost

**Date:** 2026-10-10
**Type:** BUG
**Priority:** P1
**Risk:** HIGH
**Area:** PMS / Front Desk Workstation / InHouse + Departures panels
**Sprint:** oct_bug_batch
**Registered by:** INTAKE role (bundled with BUG-529)
**Related:** BUG-529 (same bundle), BUG-515 (balance pipeline — fixed enrichment; this is a separate reset issue), BUG-527

---

## Duplicate check
- DISTINCT from BUG-515: BUG-515 fixed the enrichment pipeline (joinRowBalances, pmsService discount fields).  
  BUG-531 is about the `setBalances(undefined)` reset that discards that enrichment on every snapshot tick.
- DISTINCT from BUG-529, BUG-526, BUG-530, BUG-532

---

## Symptom
InHouse and Departures balance column:
- Shows "..." flicker on every snapshot refresh (every ~N seconds)
- After flicker: if `getRowBalances` (Step 3 folio API) **succeeds** → correct discounted ₹600 shown
- After flicker: if `getRowBalances` **fails or is slow** → balance falls back to `charge.balance_due = ₹1,650` (rack rate, no discount)
- Expected: balance stays at discounted value during refresh; no flicker/regression

---

## Code Reality Check
**NONE — fix not applied**

```
FrontDeskWorkstationPage.jsx:L36 (inside useRowBalances useEffect):
  let live = true; setBalances(undefined);   ← THIS LINE resets to undefined on every loadedAt change
```

Every snapshot refresh triggers a new `loadedAt` → useEffect re-runs → `setBalances(undefined)` → UI shows "…"  
On fetch failure/timeout: falls back to `charge.balance_due` via `null` path → rack rate shown.

---

## Root Cause
`useRowBalances` useEffect at L36 calls `setBalances(undefined)` as an eager reset before the async `getRowBalances` fetch completes.  
Intent: show loading state. Side-effect: (a) flicker on every refresh, (b) any fetch failure shows pre-discount balance.

**FE fix (1 line):** Remove `setBalances(undefined)` from L36. Keep the previous (stale) value visible during the new fetch.  
The `live` ref guard + `.then`/`.catch` already handle the update atomically.

---

## Backend context (companion ask, already filed)
Backend brief `BACKEND_BRIEF_DASHBOARD_BALANCE_SC_GAP_2026_10_10.md` ask:  
Add `room_discount_amount` to LR charge snapshot → eliminates the Step 3 folio dependency entirely.  
FE fix alone (remove reset) is sufficient for now.

---

## Evidence
- Source: AGENT-DISCOVERED (investigation session 2026-10-10)
- Confidence: CONFIRMED — code traced at FrontDeskWorkstationPage.jsx L36
- Test data: bonk booking — rack rate `charge.balance_due=₹1,650`; discounted balance ₹600

---

## Blast Radius
- **1 file:** `src/pages/pms/FrontDeskWorkstationPage.jsx` (**NOT R5**)
- **1 line:** remove `setBalances(undefined)` from L36 of `useRowBalances` effect
- Estimated scope: SMALL (1 file, 1 line)
- Hotspot: NO
- Fast Lane eligible: YES — 1 file, 1 line, NOT R5, NOT financial payload, NOT hotspot
  (owner must approve Fast Lane)

---

## Owner Decisions
- OD-531-01: Approve Fast Lane? (1 file, 1 line, NOT R5, display fix only)  
  Or run full gate? Recommended: Fast Lane bundled with BUG-529 Gate 4 GO.

---

## Gate Status
- Gate 1: COMPLETE (this document)
- Gate 2: PENDING (skippable via Fast Lane if owner approves)
- Gate 3: PENDING
- Gate 4 GO: NOT given

---

## Next
Can be bundled directly into BUG-529 Gate 4 GO same implementation session.  
Fast Lane recommended — owner to confirm.
