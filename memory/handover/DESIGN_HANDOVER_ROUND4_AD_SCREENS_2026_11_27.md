# Design Handover — Round 4 Ad Screens (MyGenie)
# For: Next design agent working on this task
# Written: 2026-11-27
# Status: READY TO START — read this fully before touching any screen

---

## 0. READ THIS FIRST — BEFORE YOU OPEN ANY REFERENCE FILE

**Two critical caveats on the reference pack:**

### Caveat 1 — Five reference screens carry old numbers
The zip (`MyGenie_Earlier_Screens_Reference.zip`) contains first-delivery files. Five screens were corrected after delivery and the corrected versions are what run in live ads today. The README inside the pack lists each difference. **For every number, the demo data table in Section 3 of this handover is the source of truth — not the PNG files.**

| File | What the PNG shows (wrong) | What to use (correct) |
|------|---------------------------|----------------------|
| C3_S1_dashboard | UPI 54% in Payment Mix | UPI 36% |
| C3_S2_pl-report | Net P&L ₹24,600 · Purchase −₹14,200 · Expenses −₹9,850 | Net P&L ₹9,850 · Purchase −₹16,500 · Expenses −₹22,300 |
| C3_S3_outlets | All-outlets P&L ₹40,500 · Koramangala P&L ₹24,600 · Indiranagar P&L ₹15,900 | All-outlets P&L ₹16,750 · Koramangala P&L ₹9,850 · Indiranagar P&L ₹6,900 |
| C4_S1_orders-all-channels | Title reads "Orders (Beta)" | Title reads "Orders" |
| C2_S2_upi-bill | Table 4 · Dine-In | Takeaway · Order #1012 |

The pack is still useful for: **layout, fonts, card spacing, status bar, highlight outline style**. Use layout from the files. Use numbers from this doc.

### Caveat 2 — Corrected versions and kitchen-ticket screen are lost
The corrected final files and the KOT phone screen were lost in a workspace reset and are not in the pack. If the design agent (or any team member) still has their own final corrected files from a previous session, **those are the better reference for screens that were corrected**. Otherwise use this pack for structure and the demo data table for numbers.

### Caveat 3 — IMPORTANT: Cancellation and Audit screens have changed in a new release
The cancellation screens (C1 folder: alert push, stage split, employee, details, consumption) and the audit log screens have been **updated in a recent product release**. The reference pack shows the old versions of these screens. **Before designing any screen that touches cancellations or audit log data, check the live app first** to confirm the current layout. Do not assume these reference files represent what the app looks like today.

---

## 1. Brief Summary

**What is needed:** 32 PNG files (16 screens × clean version + highlight version) of the MyGenie POS app filled with specific demo data, for Facebook and Instagram ads.

**What you are NOT doing:** These 16 screens do NOT include the 7 screens that were excluded because their features could not be confirmed as live (OW1, OW2, AI1, AI2, KD1, WA1, CR1).

**How the files will be used:** Marketing team places the screen inside a device frame, adds a headline and logo. You deliver the app screen only — no device frame, no headline, no logo.

**Deliverable format:**
- PNG, full resolution, no compression, no rounded corners, no drop shadow, no device frame
- File names: `R4_<code>_<short-name>.png` and `R4_<code>_<short-name>_hl.png`
- Two folders: Priority 1 (due Nov 30) and Priority 2 (due Dec 3)

---

## 2. The 9 Screens to Produce (confirmed as live in the app)

### Priority 1 — Due Nov 30 (4 files = 2 screens × clean + hl)

| Code | Screen | Device | Canvas | Must show | Highlight area |
|------|--------|--------|--------|-----------|----------------|
| **TB1** | Billing on tablet | Tablet, landscape | 2048 × 1536 px | Order entry for Order #1012 (Takeaway): menu grid showing Starters · Main Course · Breads · Beverages, cart panel showing 1× Paneer Butter Masala ₹380 + 2× Butter Naan ₹120 + 2× Sweet Lime Soda ₹180, Grand Total ₹680.00, Collect Bill button | Grand total ₹680 and the green Collect Bill button |
| **DT1** | Dashboard on desktop | Desktop | 1920 × 1080 px | Dashboard Report · Demo Kitchen — Koramangala · Today. Hero card: NET SALES ₹48,650.00, 112 Paid Orders, POS Top Channel, 38% Repeat Customers, LIVE green dot. Channel Mix: POS ₹29,190 · Swiggy ₹11,680 · Zomato ₹7,780. Payment Mix: UPI 36%. Cancellations: 7 · ₹3,240.00 | Net sales figure ₹48,650.00 |

### Priority 2 — Due Dec 3 (14 files = 7 screens × clean + hl)

| Code | Screen | Device | Canvas | Must show | Highlight area |
|------|--------|--------|--------|-----------|----------------|
| **DT2** | Orders all channels, desktop | Desktop | 1920 × 1080 px | Page title "Orders" · Demo Kitchen — Koramangala · Today. 3 channel count tiles: POS 74 (green) · Swiggy 22 (orange) · Zomato 16 (red). 5 recent orders: #1069 POS Dine-In Table 4 ₹680 Paid · #1068 Swiggy ₹540 Paid · #1067 Zomato ₹720 Paid · #1066 POS Takeaway ₹260 Paid · #1065 Swiggy ₹410 Paid | The 3 channel count tiles |
| **DT3** | P&L report, desktop | Desktop | 1920 × 1080 px | Profit & Loss Report · Demo Kitchen — Koramangala · Today. Hero card: NET P&L ₹9,850.00. Revenue vs Expenses bar. Rows: Sales ₹48,650 · Paid Revenue ₹46,900 · Purchase −₹16,500 · Expenses −₹22,300 · Net P&L ₹9,850 (green) | Net P&L figure ₹9,850.00 |
| **ML1** | Multi-outlet, desktop or tablet landscape | Desktop 1920×1080 or tablet landscape 2048×1536 | Outlets · Demo Kitchen · 2 outlets · Today. Hero card ALL OUTLETS: Net Sales ₹84,850.00 · Net P&L ₹16,750.00. Outlet card 1 — Demo Kitchen — Koramangala: NET SALES ₹48,650 · NET P&L ₹9,850 · ORDERS 112. Outlet card 2 — Demo Kitchen — Indiranagar: NET SALES ₹36,200 · NET P&L ₹6,900 · ORDERS 87 | The all-outlets total card (₹84,850 / ₹16,750) |
| **DL1** | Delivery order with rider | Phone, portrait | 1080 × 1920 px | A delivery order from the POS, rider assigned (use demo name: Ravi, phone 98XXXXXX21), order status showing dispatched or out for delivery | Rider name and status badge |
| **TK1** | Takeaway order ready | Phone, portrait | 1080 × 1920 px | A takeaway order marked ready for pickup — order number, items, amount, "Ready" or equivalent status | The ready status badge |
| **RP1** | Reports list on phone | Phone, portrait | 1080 × 1920 px | The reports navigation menu as the owner sees it on phone — show at least 8 report names (e.g. Dashboard Report, Profit & Loss, Orders, Item Sales, Cancellations, Payments, Staff, Customers) | Three report names (highlight a group of 3) |
| **LV1** | Live operations on phone | Phone, portrait | 1080 × 1920 px | What is happening right now: running tables or live orders with amounts and statuses (use the demo recent orders data for amounts) | Running tables count or live order count |

---

## 3. Demo Data — Source of Truth for All Numbers

Use these values everywhere. One screen must not contradict another.

| Item | Value |
|------|-------|
| Outlet 1 | Demo Kitchen — Koramangala |
| Outlet 2 | Demo Kitchen — Indiranagar |
| Day shown | Today, evening service. Status bar time between 8:45 PM and 9:00 PM |
| Net sales, Koramangala | ₹48,650.00 from 112 paid orders |
| Orders by channel | POS 74 · Swiggy 22 · Zomato 16 |
| Sales by channel | POS ₹29,190 · Swiggy ₹11,680 · Zomato ₹7,780 |
| Net P&L, Koramangala | ₹9,850.00 (Sales ₹48,650 · Paid Revenue ₹46,900 · Purchase −₹16,500 · Expenses −₹22,300) |
| Indiranagar | Net sales ₹36,200 · Net P&L ₹6,900 · 87 orders |
| All outlets | Net sales ₹84,850 · Net P&L ₹16,750 |
| Repeat customers | 38% |
| Payment mix | UPI 36% |
| Cancellations | 7 for ₹3,240 |
| Menu categories | Starters · Main Course · Breads · Beverages |
| Menu items | Paneer Butter Masala ₹380 · Kadai Paneer ₹340 · Dal Makhani ₹290 · Veg Hakka Noodles ₹260 · Butter Naan ₹60 · Sweet Lime Soda ₹90 |
| Sample bill | Order #1012, Takeaway: 1× Paneer Butter Masala ₹380 + 2× Butter Naan ₹120 + 2× Sweet Lime Soda ₹180. Grand Total ₹680.00, paid by UPI |
| Recent orders | #1069 POS Dine-In Table 4 ₹680 · #1068 Swiggy ₹540 · #1067 Zomato ₹720 · #1066 POS Takeaway ₹260 · #1065 Swiggy ₹410 |
| Demo rider | Ravi · 98XXXXXX21 |
| Demo customer | Neha (first name only) |

---

## 4. Visual Style Rules (from reference screens)

| Element | Rule |
|---------|------|
| Status bar | Time top-left, 5G + full battery top-right, light background |
| Navigation | Back chevron in soft grey rounded square · Bold black title · Grey subtitle: *Title · Outlet · Today* |
| Page background | Light grey (#F2F2F7 or similar) |
| Cards | White, rounded corners (12–16px), soft drop shadow |
| Hero KPI card | Black background, white text, rupee figure very large and bold, LIVE = green dot + "LIVE" label |
| Bar charts | Horizontal tracks: green for POS, orange for Swiggy, red for Zomato |
| Channel pills | Small coloured rounded tags on order rows — green POS, orange Swiggy, red Zomato |
| Amounts | Always `₹XX,XXX.00` with rupee symbol, comma separator, two decimals |
| P&L bar | 3 segments: green (revenue), blue (purchase), orange (expenses) |
| Font | Clean sans-serif; KPI digits appear monospace-spaced |
| App language | English only |
| **Highlight outline** | Soft coral/red rounded rectangle outline around highlight area · Rest of screen slightly dimmed/faded · No arrows, no added text, no callouts |
| No: | Notifications, debug banners, cursor, personal photos, third-party logos (unless the live app itself shows one) |
| No: | Commission figures, GST lines, MyGenie pricing anywhere on screen |
| No: | Rounded corners on the final PNG, device frame, drop shadow on the PNG itself |

---

## 5. Live App Account

| Field | Value |
|-------|-------|
| Email | owner@cafe103.com |
| Password | Qplazm@10 |
| App URL | https://core-pos-preview-32--7s7xeuwn.preview.emergentagent.com |
| Live backend | https://preprod.mygenie.online |

**Important:** This is a real test account — it may not have the exact demo data figures. Where the live account data differs from Section 3, **use the demo data values in Section 3 for the screen content**. The brief explicitly requires demo data, not real account data.

---

## 6. Reference Files Location (in this workspace)

Saved at: `/app/memory/evidence/ad_screens_reference/MyGenie_Earlier_Screens_Reference/`

| Folder | Contains |
|--------|---------|
| `C1_Cancellations_Inventory/` | ⚠️ CHANGED IN NEW RELEASE — check live app before using for layout |
| `C2_Billing/` | Order entry + UPI bill (layout OK, C2_S2 has wrong order type — use takeaway) |
| `C3_Dashboard_PnL_Outlets/` | Dashboard + P&L + Outlets (layout OK, all three have wrong numbers — use Section 3) |
| `C4_Orders_Payout/` | Orders all channels + payout match (layout OK, title has "Beta" — remove it) |
| `C5_Customers_WhatsApp/` | Customer lifecycle + win-back + WhatsApp offer (layout OK, numbers match brief) |
| `Where_screens_are_used_carousel.jpg` | Current ad carousel — shows context for where new screens will appear |

Also available: full design brief at `/app/memory/evidence/design_brief_round4.md`

---

## 7. Screens NOT in this batch (excluded — do not design)

| Code | Why excluded |
|------|-------------|
| OW1, OW2 | Customer ordering website — could not confirm it exists as a live feature |
| AI1, AI2 | AI menu upload — not found in the POS app codebase |
| KD1 | Kitchen display — could not confirm as a navigable live screen |
| WA1 | WhatsApp automations list — not confirmed in POS app (may be CRM) |
| CR1 | Customer list (regulars vs not-returned) — not confirmed in POS app |

These need owner answers before they can be designed. Do not proceed on them.

---

## 8. File Naming

```
Clean:     R4_<CODE>_<short-name>.png
Highlight: R4_<CODE>_<short-name>_hl.png

Examples:
  R4_TB1_billing-tablet.png
  R4_TB1_billing-tablet_hl.png
  R4_DT1_dashboard-desktop.png
  R4_DT1_dashboard-desktop_hl.png
  R4_DT2_orders-desktop.png
  R4_DT3_pl-desktop.png
  R4_ML1_outlets.png
  R4_DL1_delivery-rider.png
  R4_TK1_takeaway-ready.png
  R4_RP1_reports-list.png
  R4_LV1_live-ops.png
```

Total: 18 files (9 screens × 2 versions each)

---

## 9. Delivery Checklist (per file before sending)

- [ ] Feature exists in the live app as shown
- [ ] Numbers match the demo data table in Section 3 (not the reference PNG files)
- [ ] No real names, phone numbers, or third-party logos
- [ ] Correct canvas size for the device
- [ ] Clean and `_hl` both present
- [ ] File name follows `R4_<code>_<short-name>` convention
- [ ] Cancellation/audit screens checked against live app before use (Caveat 3)

---

## 10. Suggested Work Order

1. Start with **DT1** (desktop dashboard) — most data-rich, all reference available, P1 deadline
2. Then **TB1** (tablet billing) — reuse C2_S1 layout expanded to landscape, P1 deadline
3. Then **DT2** (desktop orders) — close match to C4_S1, fix title + widen to desktop
4. Then **DT3** (desktop P&L) — close match to C3_S2, fix all three numbers
5. Then **ML1** (outlets) — close match to C3_S3, fix P&L figures
6. Then **RP1** (reports list) — simpler, just navigation menu
7. Then **LV1** (live ops) — dashboard-style, running tables
8. Then **DL1** (delivery + rider) and **TK1** (takeaway ready) — may need live app check
