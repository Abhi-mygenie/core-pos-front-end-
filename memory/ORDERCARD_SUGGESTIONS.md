# OrderCard - Design Suggestions & Implementation Plan

**Created:** April 7, 2026  
**Last Updated:** April 7, 2026  
**Status:** Mostly Implemented (Phase 1 & 2 done, Phase 3 pending)

---

## Overview

This document outlines all the changes needed for the OrderCard component used in the **Order View** (List View) of the POS Dashboard. The goal is to create a compact, tablet-friendly card that fits 4 per row.

---

## Current vs Target Comparison

### Current State (From Screenshots)
```
┌──────────────────────────────────────────────────────────────┐
│ [MG] 1 WC          Owner · 1 days              ₹501    [🕐]  │
├──────────────────────────────────────────────────────────────┤
│ ● falafel chicken wrap (1)    [X]   Preparing    [Ready]    │
│ ● All cheese burger (2)       [X]   Preparing    [Ready]    │
├──────────────────────────────────────────────────────────────┤
│ [Bill]  [KOT]                       [X]         [Collect]   │
└──────────────────────────────────────────────────────────────┘

Issues:
- Shows "Owner" (waiter) instead of customer name
- No order type label (Dine In / Take Away / Delivery)
- Snooze button always visible (should only be for Yet to Confirm)
- Item-level cancel [X] buttons - too small for touch
- Item-level Ready/Serve buttons - redundant with order-level
- Footer buttons always visible regardless of status
- Card too wide (360px) - only 3 per row
```

### Target State
```
┌────────────────────────────────────────────┐
│ [MG] Dine In    John Doe · 1d    ₹501 [🕐] │
├────────────────────────────────────────────┤
│ ● falafel chicken wrap (1)                 │
│ ● All cheese burger (2)                    │
│ ▼ Served (2)                               │
├────────────────────────────────────────────┤
│      [🖨️ KOT]              [Ready]         │
└────────────────────────────────────────────┘

Improvements:
- Shows customer name ("John Doe" or "Walk-In")
- Shows order type label ("Dine In")
- Snooze only for Yet to Confirm orders
- No item-level buttons (clean, touch-friendly)
- Dynamic footer based on order status
- Compact width (280px) - fits 4 per row
```

---

## Detailed Change List

### 1. Header Section Changes

| # | Change | Current | Target | Priority |
|---|--------|---------|--------|----------|
| 1.1 | **Add order type label** | Not shown | "Dine In" / "Take Away" / "Delivery" | P0 |
| 1.2 | **Show customer name** | Shows waiter ("Owner") | Show `order.customer` or "Walk-In" | P0 |
| 1.3 | **Remove waiter from center** | "Owner · 1 days" | Just time ("1 days") | P0 |
| 1.4 | **Conditional snooze button** | Always visible | Only for `isYetToConfirm` | P1 |

**Header Layout:**
```
[Logo] [Order Type]    [Customer] · [Time]    [Amount] [Snooze?]
  │        │               │          │           │        │
  MG    "Dine In"      "John"     "1 days"     ₹501    Only if
        "Take Away"    or "WC"                         YetToConfirm
        "Delivery"
```

---

### 2. Items Section Changes

| # | Change | Current | Target | Priority |
|---|--------|---------|--------|----------|
| 2.1 | **Remove item-level cancel [X]** | Present per item | Remove entirely | P0 |
| 2.2 | **Remove item-level action buttons** | [Ready]/[Serve] per item | Remove entirely | P0 |
| 2.3 | **Remove item status text** | "Preparing"/"Ready" shown | Remove (redundant) | P0 |
| 2.4 | **Simple item display** | Complex with buttons | Just `● name (qty)` | P0 |

**Item Row Layout:**
```
Before: ● falafel chicken wrap (1)    [X]   Preparing    [Ready]
After:  ● falafel chicken wrap (1)
```

---

### 3. Footer Section Changes

| # | Change | Current | Target | Priority |
|---|--------|---------|--------|----------|
| 3.1 | **Remove always-visible buttons** | Bill/KOT/X/Collect always shown | Remove | P0 |
| 3.2 | **KOT button always visible** | Part of static group | Left side, always | P0 |
| 3.3 | **Dynamic action button** | Static "Collect" | Based on fOrderStatus | P0 |

**Footer Button Logic:**

| fOrderStatus | Order Status | Footer Buttons |
|--------------|--------------|----------------|
| 1 | Preparing | `[🖨️ KOT]` + `[Ready]` (orange) |
| 2 | Ready | `[🖨️ KOT]` + `[Serve]` (green) |
| 5 | Served | `[🖨️ KOT]` + `[Bill]` (green) |
| 7 | Yet to Confirm | `[X Reject]` + `[Accept]` (green) |

---

### 4. Touch/Tablet Compatibility Changes

| # | Change | Current | Target | Priority |
|---|--------|---------|--------|----------|
| 4.1 | **Button min-height** | ~32px | 44px minimum | P0 |
| 4.2 | **Button min-width** | Variable | 44px minimum | P0 |
| 4.3 | **Item row height** | py-1 (32px) | py-2 (40px) | P1 |
| 4.4 | **Card body tappable** | Only buttons | Entire card opens Order Entry | P1 |
| 4.5 | **Adequate spacing** | Tight | 8px+ between tappable elements | P1 |

**Touch Guidelines:**
- Apple iOS: 44x44px minimum touch target
- Google Android: 48x48dp minimum touch target
- No hover-only interactions (touch doesn't support hover)

---

### 5. Grid/Layout Changes

| # | Change | Current | Target | Priority |
|---|--------|---------|--------|----------|
| 5.1 | **Card min-width** | 360px | 280px | P0 |
| 5.2 | **Cards per row** | 3 | 4 | P0 |
| 5.3 | **Grid gap** | gap-4 | gap-3 | P1 |

**CSS Change:**
```css
/* Before */
gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))'

/* After */
gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))'
```

---

## Visual Mockups

### Preparing Order (fOrderStatus = 1)
```
┌────────────────────────────────────────────┐
│ [MG] Dine In    John Doe · 1d        ₹501  │
├────────────────────────────────────────────┤
│ ● falafel chicken wrap (1)                 │
│ ● All cheese burger (2)                    │
├────────────────────────────────────────────┤
│      [🖨️ KOT]              [Ready]         │
│        44px               orange/44px      │
└────────────────────────────────────────────┘
```

### Ready Order (fOrderStatus = 2)
```
┌────────────────────────────────────────────┐
│ [MG] Take Away  Walk-In · 30m        ₹320  │
├────────────────────────────────────────────┤
│ ● Margherita Pizza (1)                     │
│ ● Garlic Bread (2)                         │
├────────────────────────────────────────────┤
│      [🖨️ KOT]              [Serve]         │
│        44px               green/44px       │
└────────────────────────────────────────────┘
```

### Served Order (fOrderStatus = 5)
```
┌────────────────────────────────────────────┐
│ [MG] Delivery   Raj Kumar · 1h       ₹450  │
├────────────────────────────────────────────┤
│ ● Butter Chicken (1)                       │
│ ● Naan (3)                                 │
│ ▼ Served (2)                               │
├────────────────────────────────────────────┤
│      [🖨️ KOT]               [Bill]         │
│        44px               green/44px       │
└────────────────────────────────────────────┘
```

### Yet to Confirm Order (fOrderStatus = 7)
```
┌────────────────────────────────────────────┐
│ [Z] Delivery  New Order · 2m   ₹280   [🕐] │  ← Snooze visible
├────────────────────────────────────────────┤
│ ● Paneer Tikka (1)                         │
│ ● Dal Makhani (1)                          │
├────────────────────────────────────────────┤
│      [X Reject]            [Accept]        │
│       red/44px            green/44px       │
└────────────────────────────────────────────┘
```

---

## Implementation Checklist

### Phase 1: Core Changes (P0)
- [x] Add order type label to header
- [x] Show customer name instead of waiter
- [x] Remove waiter from center section
- [x] Remove item-level cancel buttons (from card view)
- [x] Remove item-level action buttons (replaced with status toggles for Dine-In)
- [x] Remove item status text (replaced with icon-based toggles)
- [x] Implement dynamic footer buttons (Ready/Serve/Bill based on fOrderStatus)
- [x] Change card min-width to 280px
- [x] Increase button sizes to 44px

### Phase 2: Polish (P1)
- [x] Conditional snooze button (only Yet to Confirm)
- [x] Increase item row height for touch
- [x] Make card body tappable (opens OrderEntry)
- [x] Add adequate spacing between elements
- [x] Reduce grid gap
- [x] Permission-gate Cancel Order button (`order_cancel`)
- [x] Permission-gate Merge Order button (`merge_table`)
- [x] Permission-gate Table Shift button (`transfer_table`)
- [x] Permission-gate Food Transfer icon (`food_transfer`)
- [x] Cancellation time window logic (pre-ready: time check, post-ready: restaurant flag)
- [x] CSS Columns masonry layout (4 columns)
- [x] Disabled KOT/Bill print with Phase 2 tooltip
- [x] isEngaged spinner overlay during API calls
- [x] Item-level status toggles (Preparing → Ready → Served) for Dine-In
- [x] Tightened vertical spacing for Delivery/TakeAway cards
- [x] Gray italic for addon display
- [x] Bold + large ₹ amount, prominent status badge
- [x] Unified grid view for all order types

### Phase 3: Testing
- [ ] Test on tablet device
- [ ] Verify 4 cards fit per row
- [ ] Verify all touch targets are 44px+
- [ ] Test Ready/Serve/Bill button functionality
- [ ] Test Yet to Confirm flow (Accept/Reject)

---

## Files to Modify

| File | Changes |
|------|---------|
| `/components/cards/OrderCard.jsx` | Header, items, footer redesign |
| `/pages/DashboardPage.jsx` | Grid width change, pass handlers |

---

## Related Documents

- [PRD.md](./PRD.md) - Product requirements
- [ARCHITECTURE.md](./ARCHITECTURE.md) - Technical architecture
- [API_DOCUMENT_V2.md](./API_DOCUMENT_V2.md) - API reference

---

*Document created for OrderCard redesign tracking*
