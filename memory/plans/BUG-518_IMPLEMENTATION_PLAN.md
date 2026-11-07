# BUG-518 — IMPLEMENTATION PLAN (Gate 3)

**ID:** BUG-518
**Date:** 2026-10-08
**Agent:** PLANNING (Gate 3)
**Risk:** CRITICAL (R6 — financial, display/payload mismatch)
**ODs:** OD-518-01=a · OD-518-02=YES · OD-518-03=YES
**Awaiting:** Gate 4 GO before any code change
**DEPENDS ON:** BUG-517 must be implemented first (introduces `maxCheckoutDiscount` used here)

---

## Scope Lock

**Files WILL change:**
- `src/components/pms/frontdesk/FolioCheckoutPanel.jsx` — 4 edits (E-518-1 through E-518-4)

**Files will NOT touch:** Any other file

---

## Conflict Pre-Check

FolioCheckoutPanel.jsx was last modified by BUG-517 (same session, prior). BUG-518 edits are in the same formula zones. **Must run after BUG-517 is complete.**

---

## Code Reality: PARTIAL (BUG-499 gap)

BUG-499 implemented 50/50 split. This plan adds per-side capping (OD-518-01=a) and ensures display = payload (OD-518-02).

---

## Entry Verification (after BUG-517 is implemented)

```bash
# BUG-517 must be in place first
grep -n "maxCheckoutDiscount" /app/frontend/src/components/pms/frontdesk/FolioCheckoutPanel.jsx | wc -l
# Must: ≥ 6 hits (BUG-517 added them)

# E-518 anchors (line numbers after BUG-517 may shift slightly — verify by content)
grep -n "roomApplyTo === 'both'" /app/frontend/src/components/pms/frontdesk/FolioCheckoutPanel.jsx | head -5
grep -n "Math.floor(Number(roomDiscount) / 2)" /app/frontend/src/components/pms/frontdesk/FolioCheckoutPanel.jsx
```

---

## The Core Problem (OD-518-01=a)

**Before BUG-518** (after BUG-517, with 'both' Amount ₹800):

| Location | Formula | Result | Issue |
|---|---|---|---|
| `RoomSection.roomDiscountRs` (display) | `min(floor(800), maxCap=525)` | **₹525** shown | shows full capped amount |
| `parent.roomDiscountInfoRs` (display) | `min(floor(800), maxCap=525)` | **₹525** | same |
| `foodDiscountRs` (display + payload) | `floor(800/2)` | **₹400** | uncapped half |
| `handlePaid.roomHalfRs` (payload) | `floor(800/2)` | **₹400** | uncapped half |

Display total: ₹525 + ₹400 = ₹925. Payload total: ₹400 + ₹400 = ₹800. **MISMATCH.**

**After BUG-518** (with OD-518-01=a, each half capped independently):

| Formula | Result |
|---|---|
| room half display = min(floor(800/2), maxCap=525) | min(400, 525) = **₹400** |
| food half display = min(floor(800/2), fnbTotal=400) | min(400, 400) = **₹400** |
| room half payload = min(floor(800/2), maxCap=525) | **₹400** (matches display) |
| food half payload = min(floor(800/2), fnbTotal=400) | **₹400** (matches display) |

Display total = ₹800. Payload total = ₹800. **MATCH.** ✓

---

## Edit E-518-1 — RoomSection `roomDiscountRs` for 'both': use capped half

**Location:** After E-517-3 (BUG-517 updated roomDiscountRs). Add 'both' branch.

**Current (after BUG-517):**
```js
  const roomDiscountRs = useMemo(() => {
    if (!roomDiscount || roomApplyTo === 'food' || baseBalance === null) return 0;
    const maxCap = maxCheckoutDiscount ?? baseBalance;
    const bc = Number(c.booking_charge || 0);
    if (roomDiscountType === 'Percent') {
      return bc > 0 ? Math.min(Math.floor(bc * roomDiscount / 100), maxCap) : 0;
    }
    return Math.min(Math.floor(Number(roomDiscount)), maxCap);
  }, [roomDiscount, roomDiscountType, roomApplyTo, baseBalance, maxCheckoutDiscount, c.booking_charge]);
```

**New (add 'both' Amount branch):**
```js
  const roomDiscountRs = useMemo(() => { // BUG-518: 'both' Amount uses capped half (OD-518-01=a)
    if (!roomDiscount || roomApplyTo === 'food' || baseBalance === null) return 0;
    const maxCap = maxCheckoutDiscount ?? baseBalance;
    const bc = Number(c.booking_charge || 0);
    if (roomDiscountType === 'Percent') {
      const half = roomApplyTo === 'both' ? roomDiscount / 2 : roomDiscount;
      return bc > 0 ? Math.min(Math.floor(bc * half / 100), maxCap) : 0;         // BUG-518: half for both
    }
    if (roomApplyTo === 'both') {
      return Math.min(Math.floor(Number(roomDiscount) / 2), maxCap);              // BUG-518: capped half
    }
    return Math.min(Math.floor(Number(roomDiscount)), maxCap);
  }, [roomDiscount, roomDiscountType, roomApplyTo, baseBalance, maxCheckoutDiscount, c.booking_charge]);
```

---

## Edit E-518-2 — Parent `roomDiscountInfoRs`: same capped-half logic for 'both'

**Current (after BUG-517):**
```js
  const roomDiscountInfoRs = useMemo(() => {
    if (!roomDiscount || roomApplyTo === 'food' || maxCheckoutDiscount === null) return 0;
    const maxCap = maxCheckoutDiscount ?? baseBalance ?? 0;
    const bc = Number(row.charge?.booking_charge || 0);
    if (roomDiscountType === 'Percent') {
      return bc > 0 ? Math.min(Math.floor(bc * roomDiscount / 100), maxCap) : 0;
    }
    return Math.min(Math.floor(Number(roomDiscount)), maxCap);
  }, [roomDiscount, roomDiscountType, roomApplyTo, maxCheckoutDiscount, baseBalance, row.charge?.booking_charge]);
```

**New:**
```js
  const roomDiscountInfoRs = useMemo(() => { // BUG-518: 'both' Amount uses capped half (OD-518-01=a)
    if (!roomDiscount || roomApplyTo === 'food' || maxCheckoutDiscount === null) return 0;
    const maxCap = maxCheckoutDiscount ?? baseBalance ?? 0;
    const bc = Number(row.charge?.booking_charge || 0);
    if (roomDiscountType === 'Percent') {
      const half = roomApplyTo === 'both' ? roomDiscount / 2 : roomDiscount;
      return bc > 0 ? Math.min(Math.floor(bc * half / 100), maxCap) : 0;         // BUG-518
    }
    if (roomApplyTo === 'both') {
      return Math.min(Math.floor(Number(roomDiscount) / 2), maxCap);              // BUG-518: capped half
    }
    return Math.min(Math.floor(Number(roomDiscount)), maxCap);
  }, [roomDiscount, roomDiscountType, roomApplyTo, maxCheckoutDiscount, baseBalance, row.charge?.booking_charge]);
```

---

## Edit E-518-3 — Parent `foodDiscountRs`: add per-side cap (OD-518-01=a, OD-518-03=YES)

**Current:**
```js
  const foodDiscountRs = useMemo(() => {
    const fnbTotal = order?.amount || 0;
    if (!fnbTotal || !roomDiscount || roomApplyTo === 'room') return 0;
    if (roomApplyTo === 'food') {
      return roomDiscountType === 'Percent'
        ? Math.floor(fnbTotal * roomDiscount / 100)
        : Math.min(Math.floor(Number(roomDiscount)), fnbTotal);
    }
    // 'both': 50/50 split per OD-499-01
    return roomDiscountType === 'Percent'
      ? Math.floor(fnbTotal * (roomDiscount / 2) / 100)
      : Math.floor(Number(roomDiscount) / 2);
  }, [roomDiscount, roomDiscountType, roomApplyTo, order?.amount]);
```

**New (add caps + consistent label):**
```js
  const foodDiscountRs = useMemo(() => { // BUG-518: per-side cap (OD-518-01=a); fnbTotal base (OD-518-03)
    const fnbTotal = order?.amount || 0;
    if (!fnbTotal || !roomDiscount || roomApplyTo === 'room') return 0;
    if (roomApplyTo === 'food') {
      return roomDiscountType === 'Percent'
        ? Math.min(Math.floor(fnbTotal * roomDiscount / 100), fnbTotal)           // BUG-518: cap
        : Math.min(Math.floor(Number(roomDiscount)), fnbTotal);
    }
    // 'both': OD-518-01=a — cap each half at its own limit
    return roomDiscountType === 'Percent'
      ? Math.min(Math.floor(fnbTotal * (roomDiscount / 2) / 100), fnbTotal)      // BUG-518: cap
      : Math.min(Math.floor(Number(roomDiscount) / 2), fnbTotal);                // BUG-518: capped half
  }, [roomDiscount, roomDiscountType, roomApplyTo, order?.amount]);
```

---

## Edit E-518-4 — `handlePaid` roomHalfRs 'both' Amount: use capped half

**Current (after BUG-517):**
```js
        const bc517 = Number(row.charge?.booking_charge || 0);
        const roomHalfRs = roomApplyTo === 'both'
          ? (roomDiscountType === 'Percent'
              ? Math.min(bc517 > 0 ? Math.floor(bc517 * (roomDiscount / 2) / 100) : 0, maxCheckoutDiscount ?? 0)
              : Math.floor(Number(roomDiscount) / 2))                             // BUG-518 will add cap here
          : roomDiscountInfoRs;
```

**New (add cap for Amount 'both'):**
```js
        const bc517 = Number(row.charge?.booking_charge || 0);
        const roomHalfRs = roomApplyTo === 'both'
          ? (roomDiscountType === 'Percent'
              ? Math.min(bc517 > 0 ? Math.floor(bc517 * (roomDiscount / 2) / 100) : 0, maxCheckoutDiscount ?? 0)
              : Math.min(Math.floor(Number(roomDiscount) / 2), maxCheckoutDiscount ?? 0)) // BUG-518: capped half
          : roomDiscountInfoRs;
```

---

## Edit E-518-5 — Statement F&B preview label L200: update "50% split" text

**Current:**
```jsx
          {roomApplyTo === 'both' ? 'F&B (50% split)' : 'F&B'} discount: −{fmtINR(foodDiscountRs)}
```

**New (remove "50% split" hardcode — split may not be exactly 50/50 with caps):**
```jsx
          {roomApplyTo === 'both' ? 'F&B (split)' : 'F&B'} discount: −{fmtINR(foodDiscountRs)}{/* BUG-518 */}
```

---

## Verification Matrix

| # | Edit | Verification | Auto? |
|---|---|---|---|
| V-1 | E-518-1 roomDiscountRs 'both' branch | `grep -n "BUG-518.*capped half" FolioCheckoutPanel.jsx` | YES |
| V-2 | E-518-3 foodDiscountRs cap | `grep -n "Math.min.*fnbTotal.*BUG-518" FolioCheckoutPanel.jsx` | YES |
| V-3 | compile | webpack 0 new warnings | YES |
| V-4 | 'both' ₹800, baseBalance=600, fnb=400 | roomDiscountRs=min(400,525)=400 ✓ foodDiscountRs=min(400,400)=400 ✓ total displayed=800 | NO (browser) |
| V-5 | 'both' ₹600, baseBalance=525, fnb=400 | room=min(300,525)=300 food=min(300,400)=300 total=600 | NO (browser) |
| V-6 | payload matches display | Network tab: room_discount=roomDiscountInfoRs ✓ order_discount=foodDiscountRs ✓ | NO (browser+network) |
| V-7 | 'food' mode ₹500, fnb=400 | foodDiscountRs=min(500,400)=400 (capped at fnbTotal) | NO (browser) |

---

## Post-Code Registry Checklist

```
- [ ] registry.json: BUG-518 → GATE_5A_IMPLEMENTED, sprint_key: oct_bug_batch
- [ ] BUG_TRACKER.md: BUG-518 row updated
- [ ] FILE_OWNERSHIP.md: FolioCheckoutPanel.jsx — BUG-518, date
- [ ] Code markers: // BUG-518 on every modified line
- [ ] COMPILE CHECK: 0 new warnings
```
