# BUG-421 — Implementation Plan: In-House Balance Shows Booking Total, Not Outstanding

**Code Reality:** CONFIRMED bug. `pmsService.js` L64 assigns `row.balance = amount_after_tax` (full booking total, no advance deducted).
**Conflict Pre-Check:** BUG-378 (CLOSED) last touched `getInHouseGuests`. This plan extends that function. No conflict.
**Risk:** HIGH — financial display; drives Outstanding Balance KPI; informs checkout decisions.
**Fast Lane:** NOT eligible (financial + new parallel API calls).

---

## Owner Decisions Resolved

| ID | Question | Answer |
|----|----------|--------|
| OD-421-01 | Balance = room_price + gst - advance? | **YES — full incl. GST minus advance paid** |
| OD-421-02 | Parallel folio calls acceptable (1 per in-house guest)? | **YES — 5 in parallel is fine. Note as future improvement.** |

---

## Impact Analysis

### Current behaviour
`pmsService.js` L64:
```js
row.balance = match.res.amount_after_tax != null
             ? Number(match.res.amount_after_tax) : null;
```
`amount_after_tax` = full booking price (e.g. ₹1,000). Advance NOT deducted. Shown as ₹1,000 on In-House page for every guest regardless of what they paid.

### Why not use local-reservations fields directly?
`local-reservations` gives `amount_after_tax` and `advance_amount`, but NOT `gst_tax` separately or `receive_balance`. A quick subtraction `amount_after_tax - advance` is imprecise. Owner approved folio calls (OD-421-02).

### Correct formula (owner confirmed, aligns with BUG-423)
```
balance = max(0, room_price + gst_tax - advance_payment - receive_balance)
```

### Field source
`getGuestFolio` (same file, L469) uses `API_ENDPOINTS.SINGLE_ORDER_NEW`. Raw response has `room_info.room_price`, `room_info.gst_tax`, `room_info.advance_payment`, `room_info.receive_balance`. All are numbers. **No new import needed — `api` and `API_ENDPOINTS` already imported in pmsService.js.**

### Data flow after fix
```
getInHouseGuests():
  Step 1: GET_ROOM_LIST → rows[] (roomNumber, guestName, phone, parentOrderId)
  Step 2: local-reservations → checkinDate, checkoutDate, channel, balance (initial fallback)
  Step 3 (NEW BUG-421): SINGLE_ORDER_NEW × N in parallel → room_price, gst_tax, advance, receive_balance → computed balance overwrites fallback
```

### Performance note (per OD-421-02)
`Promise.all` runs all folio calls concurrently. For 5–10 in-house guests: ~300–600ms total. Page already has a loading spinner. Graceful degradation: if a single folio call fails, that row keeps the `amount_after_tax` fallback.

---

## Implementation Plan

### Edit E1 — Add Step 3 parallel folio enrichment in `getInHouseGuests()`

| Field | Value |
|-------|-------|
| File | `src/api/services/pmsService.js` |
| Location | After the existing Step 2 try/catch block (after L73 `}`), before `return rows` (L75) |
| Lines added | ~25 |

**New block to insert before `return rows`:**
```js
  // BUG-421 Step 3: parallel folio calls for accurate outstanding balance (OD-421-02 approved)
  // IMPROVEMENT NOTE: add folio response caching if guest count grows beyond ~20
  try {
    const orderIds = rows.map(r => r.parentOrderId).filter(Boolean);
    if (orderIds.length > 0) {
      const folioResults = await Promise.all(
        orderIds.map(oid =>
          api.post(API_ENDPOINTS.SINGLE_ORDER_NEW, { order_id: Number(oid) })
            .then(res =>
              res?.data?.orders?.order_details_order ||
              res?.data?.order_details_order ||
              (Array.isArray(res?.data?.orders) ? res.data.orders[0] : null) ||
              res?.data?.orders ||
              null
            )
            .catch(() => null)
        )
      );
      rows.forEach((row, idx) => {
        const raw = folioResults[idx];
        if (!raw) return;
        const ri = raw.room_info ?? {};
        const rp = Number(ri.room_price      ?? 0);
        const gt = Number(ri.gst_tax         ?? 0);
        const ap = Number(ri.advance_payment ?? 0);
        const rb = Number(ri.receive_balance ?? 0);
        row.balance = Math.max(0, rp + gt - ap - rb);
      });
    }
  } catch {
    // Graceful: if entire Step 3 fails, balance stays as amount_after_tax fallback from Step 2
  }
```

**Also update L64 comment:**
```js
// BUG-421: amount_after_tax = initial fallback; overwritten by Step 3 folio call below
row.balance = match.res.amount_after_tax != null
             ? Number(match.res.amount_after_tax) : null;
```

---

## Verification Matrix

| # | Check | Method |
|---|-------|--------|
| 1 | Guest: advance ₹100, room ₹1000, GST ₹50 → In-House balance shows ₹950 | Browser `/pms/in-house` |
| 2 | Guest with 0 advance → balance = room_price + gst_tax | Browser |
| 3 | Guest with mid-stay payment received → balance decreases | Browser |
| 4 | Outstanding Balance KPI = sum of all row balances | Compare KPI vs row sum |
| 5 | Page loads correctly when 1 folio call fails (network throttle) | DevTools throttle |
| 6 | No compile error | webpack |

---

## Post-Code Registry Checklist

- [ ] registry.json: BUG-421 → status: IMPLEMENTED
- [ ] BUG_TRACKER.md: row updated
- [ ] FILE_OWNERSHIP.md: `api/services/pmsService.js` + BUG-421
- [ ] Code marker: `// BUG-421` in new block
- [ ] Compile: 0 new warnings

---

```
Planning complete: BUG-421
Stage: Impact Analysis + Implementation Plan
Code reality: CONFIRMED BUG (wrong field L64)
Risk: HIGH (financial display + parallel API calls)
Files WILL change: src/api/services/pmsService.js (~25 lines added before return rows)
Files WILL NOT touch: InHouseGuestsPage.jsx, folioTransform.js, all others
Owner decisions: OD-421-01 and OD-421-02 resolved
Next: Gate 4 GO / Implementation
```
