# BUG-755 — Gate 3 Implementation Plan
## Dashboard Room Tile Amount Differs Between Table View and Order View

**ID:** BUG-755
**Date:** 2026-11-27
**Role:** PLANNING — Gate 3 (Implementation Plan)
**Based on IA:** `impact/BUG-755_IMPACT_ANALYSIS.md`
**OD locked:** None required
**Awaiting:** Gate 4 GO

---

## 1. Entry Verification

Anchor verified at HEAD:

| Edit | File | Line | Current content | Match? |
|------|------|------|----------------|--------|
| E1 | `ChannelColumn.jsx` | 346 | `const order = item.order || item;` | ✅ |
| E1 | `ChannelColumn.jsx` | 352 | `order={order}` (isOrderDesktop OrderCard) | ✅ |
| E1 | `ChannelColumn.jsx` | 384 | `order={order}` (non-desktop OrderCard) | ✅ |

---

## 2. Scope Lock

**Files WILL change:**
- `src/components/dashboard/ChannelColumn.jsx` — 1 edit, ~3 lines

**Files WILL NOT touch:**
- `src/pages/DashboardPage.jsx` (R5 — `allRoomsList` and `computeRoomCardAmount` are already correct)
- `src/components/cards/OrderCard.jsx`
- `src/components/cards/TableCard.jsx`
- Any context, service, or transform file

---

## 3. Edit

### E1 — `ChannelColumn.jsx` line 346

**Current:**
```javascript
                    // List View - render OrderCard
                    const order = item.order || item;
```

**New:**
```javascript
                    // List View - render OrderCard
                    // BUG-755: for room items, use enriched amount (computeRoomCardAmount)
                    // from allRoomsList rather than raw order.amount (food only).
                    const order = item.isRoom && item.amount != null
                      ? { ...(item.order || item), amount: item.amount }
                      : (item.order || item);
```

**Why:** `allRoomsList` items already have `item.amount = computeRoomCardAmount(order)` which includes food + serviceTax + transferredOrders + roomBalance. The raw `item.order.amount` only contains the food subtotal. By spreading `item.order` and overriding `amount` with `item.amount`, OrderCard shows the full checkout value — the same number the cashier sees in Table View.

**No change to the two `order={order}` sites at lines 352 and 384** — `order` now already contains the corrected amount.

---

## 4. Verification Matrix

| # | Test | Steps | Expected |
|---|------|-------|----------|
| V1 | Room with balance — Order View shows correct amount | Switch to Order View, find room with open booking balance | Amount = Table View amount (e.g. ₹473 not ₹126) |
| V2 | Room with zero balance — consistent in both views | Find room where guest has ₹0 pending balance | Same amount in both views |
| V3 | Dine-In order amount unchanged | Check a dine-in table in Order View | Amount unchanged (non-room, `item.isRoom` guard bypasses fix) |
| V4 | Available rooms hidden in Order View | Switch to Order View | Available rooms not shown (existing L317 guard unchanged) |
| V5 | Compile clean | `yarn build` or `craco start` | 0 new warnings |

---

## 5. Post-Code Registry Checklist

```
[ ] registry.json: BUG-755 → status: GATE_5A_IMPLEMENTED, sprint_key: dec_sprint
[ ] BUG_TRACKER.md: row updated → GATE_5A_IMPLEMENTED
[ ] FILE_OWNERSHIP.md: ChannelColumn.jsx entry → BUG-755 + date
[ ] Code marker: // BUG-755 comment in ChannelColumn.jsx
[ ] Compile: webpack 0 new warnings
```

---

## 6. Risk Register

| Risk | Level | Note |
|------|-------|------|
| Non-room items accidentally get wrong amount | **LOW** | Guarded by `item.isRoom` — only room channel items affected |
| DineIn / TakeAway / Delivery amounts change | **NONE** | `item.isRoom` is false for all non-room channels |
| Table View (TableCard) affected | **NONE** | TableCard path (`viewType === 'table'`) untouched — L320 branch |
| BUG-532 SC fix regression | **NONE** | `computeRoomCardAmount` already includes serviceTax (DashboardPage L52) |

---

**Awaiting Gate 4 GO.**
