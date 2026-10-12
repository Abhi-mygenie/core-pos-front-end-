# BUG-522 — REVISED IMPACT ANALYSIS (Gate 2)

**ID:** BUG-522
**Date:** 2026-10-09 (revised)
**Agent:** PLANNING (Gate 2 only)
**Risk:** HIGH (R6 — handlePaid touches checkout payment payload)
**ODs:** OD-INV-01 LOCKED = make independent (room-only RoomDiscountControls; CPP handles F&B)
**File:** `src/components/pms/frontdesk/FolioCheckoutPanel.jsx` — 1 file only
**Supersedes:** BUG-520, BUG-521 (root cause eliminated)

---

## Duplicate Check: DISTINCT
No prior item covers this redesign. BUG-499 (origin of `roomApplyTo` state) is the source.

---

## Conflict Pre-Check

| File | Last modifier | Open items | Conflict |
|---|---|---|---|
| `FolioCheckoutPanel.jsx` | BUG-519 (2026-10-09) | None open | NONE |

---

## Code Reality: PARTIAL

`roomApplyTo` state, `foodDiscountRs` useMemo, and the three-button selector exist and must be removed. The 'room' branch of every useMemo is correct as-is and becomes the only path.

---

## 1. Design Principle (New Independent Model)

```
┌─────────────────────────────────────────────────────────┐
│  ROOM DISCOUNT (RoomDiscountControls — bill-right)       │
│  % / flat input + reason + split payment                 │
│  → ALWAYS applies to room rent only                      │
│  → Left panel shows "Room discount: −₹X" (read-only)    │
└─────────────────────────────────────────────────────────┘
         Independent of ↕
┌─────────────────────────────────────────────────────────┐
│  CollectPaymentPanel — ADJUSTMENTS > Discount             │
│  Existing food discount mechanism (unchanged)             │
│  → Handles F&B discount natively                         │
│  → SC + GST recalculate on post-discount base            │
│  → Correct payload keys already set by collectBillExisting│
└─────────────────────────────────────────────────────────┘
```

Both update the grand total independently and correctly — no extra code needed:
- Room discount → `roomDiscountInfoRs` → `roomInfo.balance_due` override → CPP `roomBalance` → Grand Total
- F&B discount → CPP `manualDiscount` → `subtotalAfterDiscount` → `finalTotal` → Grand Total

---

## 2. API Contract — `fe_discount_curls.md` Mapping

Three scenarios for the BE payload:

### Scenario A — Room discount only (no CPP food discount)

`payload.order_discount = 0` (collectBillExisting sets 0 when no CPP discount)

```json
{
  "payment_amount": 248,
  "grant_amount":   248,
  "order_amount":   248,
  "paid_room":      "yes",
  "room_discount":          255,
  "room_discount_apply_to": "room",
  "room_discount_type":     "Percent",
  "room_discount_value":    17,
  "room_discount_reason":   null
}
```
→ Matches `fe_discount_curls.md` **Curl C** (room only). ✅

---

### Scenario B — CPP food discount only (no room discount)

Room discount block never fires (`roomDiscount = 0`).
`collectBillExisting` already sets all food discount keys correctly.

```json
{
  "payment_amount":      228,
  "grant_amount":        228,
  "order_amount":        228,
  "order_discount":       20,
  "order_discount_type": "Percent",
  "discount_value":       10,
  "discount_type":        "Percent",
  "paid_room":           "yes"
  // room_discount_apply_to: NOT SENT
}
```
→ Matches `fe_discount_curls.md` **Curl B** (food only — "omit apply_to entirely if only F&B fields"). ✅

---

### Scenario C — Both: Room discount + CPP food discount simultaneously

User enters room discount in RoomDiscountControls AND applies CPP Discount dropdown.
After `collectBillExisting`: `payload.order_discount > 0` (food discount present).

```json
{
  "payment_amount":      228,
  "grant_amount":        228,
  "order_amount":        228,
  "order_discount":       20,
  "order_discount_type": "Percent",
  "discount_value":       10,
  "discount_type":        "Percent",
  "paid_room":           "yes",
  "room_discount":          255,
  "room_discount_apply_to": "both",
  "room_discount_type":     "Percent",
  "room_discount_value":    17,
  "room_discount_reason":   null
}
```
→ Matches `fe_discount_curls.md` **Curl E** (Both — different %: "Each side independent → F&B fields + room_discount ₹ + apply_to=both"). ✅

**Key:** `room_discount_apply_to` is **dynamic** — not hardcoded:
```js
payload.room_discount_apply_to = payload.order_discount > 0 ? 'both' : 'room';
```
`payload.order_discount` is set by `collectBillExisting` BEFORE our room block runs, making it a reliable signal.

---

## 3. What CollectPaymentPanel Does Natively (unchanged)

When cashier applies ADJUSTMENTS > Discount in CPP:

**CPP → paymentData.discounts (CollectPaymentPanel L1124–1151):**
```js
discounts: {
  manual:               manualDiscount,       // ₹ amount
  preset:               presetDiscount,       // ₹ amount (preset category)
  orderDiscountPercent: discountType === 'percent' ? parseFloat(discountValue) : 0,
  discountType:         selectedDiscountType?.name || discountType || '',
  orderDiscountType:    selectedDiscountType ? 'Percent' : (discountType === 'percent' ? 'Percent' : 'Amount'),
  ...
}
```

**collectBillExisting (orderTransform.js L1686–1693) → payload:**
```js
order_discount:      (discounts.manual || 0) + (discounts.preset || 0),   // ₹ total
order_discount_type: discounts.orderDiscountType || '',                     // 'Percent'/'Amount'
discount_type:       discounts.discountType || '',                          // type string
discount_value:      discounts.preset > 0
  ? discounts.presetDiscountPercent
  : discounts.orderDiscountPercent > 0
    ? discounts.orderDiscountPercent
    : discounts.manual                                                       // % or ₹ value
```

Also adjusts `payment_amount = fbOnlyTotal - foodDiscount` automatically.

**This is already correct. We do not touch it.**

---

## 4. Exact Code Changes — FolioCheckoutPanel.jsx

### Change 1 — Remove `roomApplyTo` state (L217)

**REMOVE:**
```js
const [roomApplyTo, setRoomApplyTo] = useState('room');   // 'room' | 'both' | 'food'
```

**KEEP (no change):**
```js
const [roomDiscount, setRoomDiscount] = useState(0);
const [roomDiscountType, setRoomDiscountType] = useState('Amount');
const [roomDiscountReason, setRoomDiscountReason] = useState('');
const [roomSplitEnabled, setRoomSplitEnabled] = useState(false);
const [roomSplitLegs, setRoomSplitLegs] = useState([...]);
```

---

### Change 2 — Simplify `roomDiscountInfoRs` useMemo (L262–274)

**Current (13 lines — has 'both'/'food' branches):**
```js
const roomDiscountInfoRs = useMemo(() => { // BUG-518
  if (!roomDiscount || roomApplyTo === 'food' || maxCheckoutDiscount === null) return 0;
  const maxCap = maxCheckoutDiscount ?? baseBalance ?? 0;
  const bc = Number(row.charge?.booking_charge || 0);
  if (roomDiscountType === 'Percent') {
    const half = roomApplyTo === 'both' ? roomDiscount / 2 : roomDiscount; // ← WRONG when independent
    return bc > 0 ? Math.min(Math.floor(bc * half / 100), maxCap) : 0;
  }
  if (roomApplyTo === 'both') {
    return Math.min(Math.floor(Number(roomDiscount) / 2), maxCap);          // ← WRONG when independent
  }
  return Math.min(Math.floor(Number(roomDiscount)), maxCap);
}, [roomDiscount, roomDiscountType, roomApplyTo, ...]);
```

**New (7 lines — room-only, full discount, no halving):**
```js
const roomDiscountInfoRs = useMemo(() => { // BUG-522: independent, always full room discount
  if (!roomDiscount || maxCheckoutDiscount === null) return 0;
  const maxCap = maxCheckoutDiscount ?? baseBalance ?? 0;
  const bc = Number(row.charge?.booking_charge || 0);
  if (roomDiscountType === 'Percent') {
    return bc > 0 ? Math.min(Math.floor(bc * roomDiscount / 100), maxCap) : 0;
  }
  return Math.min(Math.floor(Number(roomDiscount)), maxCap);
}, [roomDiscount, roomDiscountType, maxCheckoutDiscount, baseBalance, row.charge?.booking_charge]);
// BUG-522: removed roomApplyTo from deps
```

**Why:** Room discount is always the FULL entered amount applied to room. No halving needed.
`maxCheckoutDiscount` cap (BUG-517) stays intact.

---

### Change 3 — Remove `foodDiscountRs` useMemo entirely (L284–297, 14 lines)

**REMOVE completely:**
```js
// BUG-499: foodDiscountRs — F&B half for Both/food
const foodDiscountRs = useMemo(() => {
  const fnbTotal = order?.amount || 0;
  if (!fnbTotal || !roomDiscount || roomApplyTo === 'room') return 0;
  if (roomApplyTo === 'food') { ... }
  // 'both': ...
}, [roomDiscount, roomDiscountType, roomApplyTo, order?.amount]);
```

**Why:** F&B discount is handled entirely by CPP's own mechanism. This useMemo was the source of all food discount payload bugs.

**KEEP (no change):**
```js
const discountOverMax = useMemo(() => { ... }); // L276–283 — no roomApplyTo dep, unchanged
```

---

### Change 4 — Simplify `handlePaid` room + food blocks (L319–340)

**Current (22 lines — 'both' branch + food block):**
```js
if (roomDiscount > 0 && roomApplyTo !== 'food' && baseBalance !== null) {
    const bc517 = Number(row.charge?.booking_charge || 0);
    const roomHalfRs = roomApplyTo === 'both'
      ? (roomDiscountType === 'Percent'
          ? Math.min(bc517 > 0 ? Math.floor(bc517 * (roomDiscount / 2) / 100) : 0, maxCheckoutDiscount ?? 0)
          : Math.min(Math.floor(Number(roomDiscount) / 2), maxCheckoutDiscount ?? 0))
      : roomDiscountInfoRs;
    payload.room_discount          = roomHalfRs;
    payload.room_discount_apply_to = roomApplyTo;  ← state variable (stale design)
    payload.room_discount_type     = roomDiscountType;
    payload.room_discount_value    = roomDiscount;
    payload.room_discount_reason   = roomDiscountReason || null;
  }
  if (foodDiscountRs > 0) {  ← food block that conflicts with CPP
    payload.payment_amount = Math.max(0, (payload.payment_amount || 0) - foodDiscountRs);
    payload.grant_amount   = payload.payment_amount;
    payload.order_amount   = payload.payment_amount;
    payload.order_discount      = foodDiscountRs;        ← overwrites CPP's order_discount
    payload.order_discount_type = roomDiscountType;
  }
```

**New (7 lines — dynamic apply_to, no food block):**
```js
  if (roomDiscount > 0 && baseBalance !== null) { // BUG-522: removed roomApplyTo guard
    payload.room_discount          = roomDiscountInfoRs; // BUG-522: full room amount (no halving)
    // BUG-522: dynamic — 'both' when CPP food discount also present (Curl E), else 'room' (Curl C)
    // collectBillExisting runs before this block → payload.order_discount already set from CPP
    payload.room_discount_apply_to = payload.order_discount > 0 ? 'both' : 'room';
    payload.room_discount_type     = roomDiscountType;
    payload.room_discount_value    = roomDiscount;
    payload.room_discount_reason   = roomDiscountReason || null;
  }
  // BUG-522: food discount block removed — CPP's collectBillExisting handles F&B fully:
  //   payment_amount, order_discount, order_discount_type, discount_value, discount_type
```

**handlePaid useCallback deps (L357) — remove `roomApplyTo`, `foodDiscountRs`:**
```js
// CURRENT:
}, [..., roomApplyTo, foodDiscountRs, roomDiscountInfoRs, discountOverMax]);

// NEW:
}, [..., roomDiscountInfoRs, discountOverMax]); // BUG-522: removed roomApplyTo, foodDiscountRs
```

---

### Change 5 — RoomDiscountControls component (L41–103)

**5a — Signature: remove `roomApplyTo`, `setRoomApplyTo` (L41–45):**
```js
// CURRENT:
const RoomDiscountControls = ({
  c, roomDiscount, setRoomDiscount, roomDiscountReason, setRoomDiscountReason,
  roomDiscountType, setRoomDiscountType, roomApplyTo, setRoomApplyTo,   ← REMOVE
  roomSplitEnabled, setRoomSplitEnabled, roomSplitLegs, setRoomSplitLegs,
  maxCheckoutDiscount, baseBalance,
}) => {

// NEW:
const RoomDiscountControls = ({ // BUG-522: removed roomApplyTo, setRoomApplyTo
  c, roomDiscount, setRoomDiscount, roomDiscountReason, setRoomDiscountReason,
  roomDiscountType, setRoomDiscountType,
  roomSplitEnabled, setRoomSplitEnabled, roomSplitLegs, setRoomSplitLegs,
  maxCheckoutDiscount, baseBalance,
}) => {
```

**5b — Remove three-button selector (L57–67) — the `div.flex.gap-1.mb-0.5` block:**
```js
// REMOVE L57–67:
<div className="flex gap-1 mb-0.5">
  {['room', 'both', 'food'].map(v => (
    <button key={v} type="button" data-testid={`bill-apply-to-${v}`}
      onClick={() => { setRoomApplyTo(v); if (v === 'food') setRoomDiscount(0); }}
      className={...}>
      {v === 'room' ? 'Room' : v === 'both' ? 'Both' : 'F&B only'}
    </button>
  ))}
</div>
```

**5c — Remove `roomApplyTo !== 'food'` conditional wrapper (L68 + L103):**
```js
// CURRENT:
{roomApplyTo !== 'food' && (    ← REMOVE this wrapper
  <>
    ...inputs + alert...        ← KEEP (always visible now)
  </>                           ← REMOVE
)}                              ← REMOVE

// NEW: inputs + alert are always rendered (no conditional)
```

**KEEP unchanged inside RoomDiscountControls:**
- `maxPct` useMemo (L47–53) — no `roomApplyTo` dep ✅
- `discountOverMax` line (L54) ✅
- Amount/Percent toggle buttons (L71–78) ✅
- Number input + Reason input (L81–95) ✅
- `discountOverMax` alert (L97–103) ✅
- Split room payment block (L106–144) ✅

---

### Change 6 — Call site: remove 2 props (L393–394)

```jsx
// REMOVE:
roomApplyTo={roomApplyTo} setRoomApplyTo={setRoomApplyTo}
```

---

### Change 7 — CPP `total` prop simplify (L408)

```jsx
// CURRENT:
total={Math.max(0, (order.amount || 0) - (roomApplyTo !== 'room' ? foodDiscountRs : 0))}

// NEW: // BUG-522: foodDiscountRs removed; CPP computes its own total from cartItems
total={order.amount || 0}
```

*(CPP does not use this prop for display — cosmetic cleanup only.)*

---

## 5. Summary Table

| # | Section | Lines | Action | Net |
|---|---|---|---|---|
| 1 | `roomApplyTo` state | L217 | REMOVE 1 line | −1 |
| 2 | `roomDiscountInfoRs` useMemo | L262–274 | SIMPLIFY 13→7 lines | −6 |
| 3 | `foodDiscountRs` useMemo | L284–297 | REMOVE 14 lines | −14 |
| 4 | handlePaid room + food blocks | L319–340 | SIMPLIFY 22→7 lines | −15 |
| 5 | handlePaid deps | L357 | SIMPLIFY −2 deps | −2 |
| 6 | RoomDiscountControls signature | L41–45 | SIMPLIFY −2 props | −1 |
| 7 | Three-button selector | L57–67 | REMOVE 11 lines | −11 |
| 8 | `roomApplyTo !== 'food'` guard | L68, L103 | REMOVE wrapper | −2 |
| 9 | Call site props | L393–394 | REMOVE 2 props | −1 |
| 10 | CPP `total` prop | L408 | SIMPLIFY 1 line | 0 |

**Net: ~53 lines removed, 1 file only.**

---

## 6. Risk Register

| Risk | Assessment | Mitigation |
|---|---|---|
| `roomDiscountInfoRs` formula change | LOW — 'room' branch formula identical to current. Removes incorrect 'both' halving. | Entry verify: grep for roomDiscountInfoRs value matches expected |
| `handlePaid` room block simplified | MEDIUM (R6) — but REMOVES incorrect code. The 'room' path was already the fallback | Self-test Scenario A + C before QA |
| Dynamic `apply_to` logic | MEDIUM — relies on `payload.order_discount > 0` from collectBillExisting | `collectBillExisting` always runs before our block; CPP always sets `order_discount = manual + preset` even if 0 |
| `discountOverMax` alert (parent + RoomDiscountControls) | NONE — no `roomApplyTo` dependency in either | ✅ |
| CPP `collectBillExisting` food keys | NONE — not touched | ✅ |
| Split room payment | NONE — not touched | ✅ |
| Left panel (Statement + RoomSection) | NONE — roomDiscountInfoRs still passed through correctly | ✅ |

---

## 7. Verification Matrix

| # | What | How | Auto? |
|---|---|---|---|
| V-1 | `roomApplyTo` fully removed | `grep -c "roomApplyTo" FolioCheckoutPanel.jsx` → 0 | YES |
| V-2 | `foodDiscountRs` fully removed | `grep -c "foodDiscountRs" FolioCheckoutPanel.jsx` → 0 | YES |
| V-3 | Three buttons gone | `grep -c "bill-apply-to-" FolioCheckoutPanel.jsx` → 0 | YES |
| V-4 | Dynamic apply_to in code | `grep -n "order_discount > 0.*both.*room\|BUG-522" FolioCheckoutPanel.jsx` | YES |
| V-5 | Compile clean | webpack 0 new warnings | YES |
| V-6 | Scenario A — room only display | Bill bonk → enter ₹200 → left: "Room discount: −₹200", right: "Room discount applied: −₹200" | NO |
| V-7 | Scenario A — room only payload | Network: `room_discount=200`, `room_discount_apply_to="room"`, no `order_discount` | NO |
| V-8 | Scenario B — CPP food only display | CPP Discount 10% → Food Total decreases in Grand Total | NO |
| V-9 | Scenario B — CPP food only payload | Network: `order_discount>0`, `discount_value=10`, no `room_discount_apply_to` | NO |
| V-10 | Scenario C — both simultaneously | Room ₹200 + CPP 10% → Network: `room_discount_apply_to="both"`, `order_discount>0` | NO |
| V-11 | Split room payment | Toggle split → legs visible | NO |
| V-12 | maxCheckoutDiscount cap still works | bonk: enter 600 → capped at 525, alert shown | NO |

---

## 8. Owner Decisions

**All locked. Zero open ODs.**

| ID | Decision |
|---|---|
| OD-INV-01 | Independent — Room Discount = room only; CPP = F&B only. LOCKED. |

---

## 9. Post-Code Registry Checklist

```
- [ ] registry.json: BUG-522 → GATE_5A_IMPLEMENTED, sprint_key: oct_bug_batch
- [ ] BUG_TRACKER.md: row updated
- [ ] FILE_OWNERSHIP.md: FolioCheckoutPanel.jsx — BUG-522
- [ ] Code markers: // BUG-522 on every changed section
- [ ] COMPILE CHECK: 0 new warnings
```

---

**Gate 2 Status: COMPLETE — no open ODs.**
**Next: Owner says "Gate 3 GO" → Implementation Plan written → Gate 4 GO → Implementation.**
