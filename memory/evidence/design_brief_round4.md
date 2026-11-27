# Design Brief — Round 4 Ad Screens (MyGenie)

Nov 27, 2026 · @killua

## Summary

We need 16 real MyGenie app screens with demo data for the next round of Facebook and Instagram ads. Priority 1 (7 screens) is due Nov 30, 2026; Priority 2 (9 screens) is due Dec 3, 2026.

This brief is complete on its own. You do not need any earlier brief.

- **What you deliver:** PNG screenshots of the live app, filled with the demo data below, each in a clean version and a highlight version.
- **Where they go:** inside static image ads, a 10-card carousel and short videos. We add the device frame, headline and logo ourselves.
- **The one hard rule:** show only what exists in the live app today. If a screen or element in this brief does not exist, do not design it. Tell us instead.

## Background

MyGenie POS is an all-in-one restaurant POS. Our ads speak to owners of cafés, QSRs, cloud kitchens and family restaurants in India, and the proof that works best is showing the real product.

So far every ad shows a phone screen. The next round must also show the product on tablet, desktop and the kitchen screen, and must show four features we have no screens for yet.

| Gap today | What we use now | What we need |
| --- | --- | --- |
| Own ordering website (dine-in QR, takeaway, self delivery) | A drawn graphic | Real screens of the ordering site |
| AI menu upload | A drawn graphic | Real upload and result screens |
| Runs on iOS, Android, Windows, Mac | Drawn device outlines | Real tablet and desktop screens |
| Kitchen display | Nothing | A real kitchen screen |
| WhatsApp automation and CRM | One chat screen | The automations list and the customer list |
| Self delivery and takeaway | Nothing | Real order screens |
| Live operations and reports from anywhere | P&L and dashboard on phone | Reports list and live view |

## Rules for every screen

1. **Live features only.** Every screen, button, label and number type must exist in the app as customers use it today. No mock-ups of planned features.
2. **Demo account only.** Use the demo data in the next section. No real restaurant, staff or customer names, and no real phone numbers.
3. **No third-party logos.** Swiggy and Zomato appear as plain text labels, as on our existing screens. No Apple, Android, Windows, WhatsApp, UPI or bank logos added by you. If the live app itself shows one, leave it and tell us.
4. **No commission figures, no GST lines, no MyGenie pricing** anywhere on screen.
5. **App language English.** Rupee amounts in the app's own format, for example ₹48,650.00.
6. **Same numbers everywhere.** One screen must not contradict another. The demo data table is the source.
7. **Clean screens.** No notifications, no debug banners, no cursor, no personal profile photo. Battery full, signal 5G.
8. **Do not redesign.** Use the app's real layout, fonts and colours. Do not tidy, restyle or re-space anything.
9. **If something is missing, say so.** Write one line: which screen, what is missing, and what the live app shows instead.

## Demo data to use

These values are already on the screens used in live ads. New screens must match them so a viewer never sees two different numbers for the same thing.

| Item | Value |
| --- | --- |
| Outlet 1 | Demo Kitchen — Koramangala |
| Outlet 2 | Demo Kitchen — Indiranagar |
| Day shown | Today, evening service. Status bar time between 8:45 PM and 9:00 PM |
| Net sales, Koramangala | ₹48,650.00 from 112 paid orders |
| Orders by channel | POS 74 · Swiggy 22 · Zomato 16 |
| Sales by channel | POS ₹29,190 · Swiggy ₹11,680 · Zomato ₹7,780 |
| Net P&L, Koramangala | ₹9,850.00 (Sales ₹48,650 · Paid revenue ₹46,900 · Purchase −₹16,500 · Expenses −₹22,300) |
| Indiranagar | Net sales ₹36,200 · Net P&L ₹6,900 · 87 orders |
| All outlets | Net sales ₹84,850 · Net P&L ₹16,750 |
| Repeat customers | 38% |
| Payment mix | UPI 36% |
| Cancellations | 7 for ₹3,240: before cooking 2 (₹1,400), before serving 2 (₹580), after serving 3 (₹1,260) |
| Menu categories | Starters · Main Course · Breads · Beverages |
| Menu items and prices | Paneer Butter Masala ₹380 · Kadai Paneer ₹340 · Dal Makhani ₹290 · Veg Hakka Noodles ₹260 · Butter Naan ₹60 · Sweet Lime Soda ₹90 · Jeera Rice · Veg Biryani · Gulab Jamun |
| Sample bill | Order #1012, takeaway: 1 Paneer Butter Masala ₹380, 2 Butter Naan ₹120, 2 Sweet Lime Soda ₹180. Grand total ₹680.00, paid by UPI |
| Recent orders | #1069 POS dine-in Table 4 ₹680 · #1068 Swiggy ₹540 · #1067 Zomato ₹720 · #1066 POS takeaway ₹260 · #1065 Swiggy ₹410 |
| Kitchen tickets | KOT #214, dine-in Table 6: 2 Paneer Butter Masala, 4 Butter Naan, 1 Jeera Rice, note "kam teekha" · KOT #213, Swiggy: 1 Veg Biryani, 2 Gulab Jamun |
| Wastage example | Paneer Butter Masala: 18 punched, 1 cancelled; paneer wastage 170 g |
| Demo customer | Neha (first name only). E-bill ₹740, 74 loyalty points. Win-back code COMEBACK20, 20% off, valid 7 days |

For anything not listed (rider names, extra customers, more menu items), invent plain demo values. Use first names only and no phone numbers, or mask them as 98XXXXXX21.

## Screen list

Sixteen screens: 7 in Priority 1 and 9 in Priority 2. Each row says what the screen must show and what to highlight in the highlight version.

### Priority 1

| Code | Screen | Device | Must show | Highlight | Used in |
| --- | --- | --- | --- | --- | --- |
| OW1 | Ordering website: menu page | Phone browser | The restaurant's own ordering page as a customer sees it: Demo Kitchen name, categories, 4 to 6 menu items with prices, Add buttons | The restaurant name and one Add button | Carousel card 6 |
| OW2 | Ordering website: order type and cart | Phone browser | The Dine-in, Takeaway and Delivery choice, plus a cart with the sample bill items and total ₹680 | The three order-type options | Carousel card 6 |
| AI1 | AI menu upload: upload step | Phone | The screen where the owner picks a menu photo or PDF, with a file selected | The upload button or selected file | Carousel card 7 |
| AI2 | AI menu upload: result | Phone | The items the AI read, each with name, price and category, ready to confirm. Use the demo menu items | Two or three item rows showing name, price and category | Carousel card 7 |
| TB1 | Billing on tablet | Tablet, landscape | Order entry for Order #1012 as the cashier sees it on a tablet: menu grid, order panel, grand total ₹680 | Grand total and the Collect Bill button | All-platforms static, carousel card 8 |
| DT1 | Dashboard on desktop | Desktop | The owner dashboard for Koramangala: net sales ₹48,650, 112 orders, channel mix, live indicator | Net sales figure | All-platforms static, carousel card 8 |
| KD1 | Kitchen display | Tablet or desktop, landscape | Live kitchen tickets including KOT #214 and KOT #213 with items and status | KOT #214 | All-platforms static |

### Priority 2

| Code | Screen | Device | Must show | Highlight | Used in |
| --- | --- | --- | --- | --- | --- |
| DT2 | Orders, all channels, on desktop | Desktop | The orders list with POS 74, Swiggy 22, Zomato 16 and the five recent orders | The three channel counts | Statics, video |
| DT3 | P&L report on desktop | Desktop | Net P&L ₹9,850 with sales, purchase and expenses | Net P&L figure | Presenter video cut-in |
| ML1 | Outlets on desktop or tablet | Desktop or tablet, landscape | Both outlets with net sales and net P&L, and the all-outlets total ₹84,850 / ₹16,750 | The all-outlets total | Carousel card 3 |
| DL1 | Self-delivery order | Phone | A delivery order from the ordering website with a rider assigned and its status | Rider name and status | Carousel card 6, statics |
| TK1 | Takeaway order | Phone | A takeaway order marked ready for pickup | The ready status | Carousel card 6 |
| WA1 | WhatsApp automations | Phone | The list of automatic messages with their on/off state: e-bill, birthday wish, feedback, win-back offer, and whatever else is live | Two automations switched on | Carousel card 5 |
| CR1 | Customer list | Phone | Customers split into regulars and not returned, with last visit and favourite dish | The not-returned group | Carousel card 5, testimonial ads |
| RP1 | Reports list | Phone | The menu of reports the owner can open from the phone | Three report names | Carousel card 8 |
| LV1 | Live operations | Phone | What is happening right now: running tables or live orders with amounts | Running tables count or live order count | Carousel card 8, statics |

If a tablet or desktop layout does not exist for a screen, send the layout the app really shows on that device, even if it is the phone layout stretched, and say so.

## Sizes, versions and file names

| Device | Canvas | Notes |
| --- | --- | --- |
| Phone | 1080 × 1920 px, portrait | Same as all earlier screens. Include the app's status bar |
| Phone browser (OW1, OW2) | 1080 × 1920 px, portrait | Page content only. No browser address bar, no real web address |
| Tablet | 2048 × 1536 px, landscape | Screen content only, no device frame |
| Desktop | 1920 × 1080 px | App or browser content only. No operating-system bar, dock, taskbar or window buttons |

**Two versions of every screen:**

- **Clean:** the screen exactly as the app shows it.
- **Highlight (`_hl`):** the same screen with one area marked, as named in the Highlight column. Use the same style as the earlier highlight screens: a soft coloured outline around the area, nothing else changed, no arrows or added text.

**Format:** PNG, full resolution, no compression artefacts, no rounded corners, no drop shadow, no device frame. We add frames ourselves.

**File names:** `R4_<code>_<short-name>.png` and `R4_<code>_<short-name>_hl.png`.

| Example | File |
| --- | --- |
| OW1 clean | `R4_OW1_ordering-menu.png` |
| OW1 highlight | `R4_OW1_ordering-menu_hl.png` |
| DT1 clean | `R4_DT1_dashboard-desktop.png` |
| KD1 highlight | `R4_KD1_kitchen-display_hl.png` |

That makes 32 files in total: 14 for Priority 1 and 18 for Priority 2.

## Reference

Match the look of the 17 phone screens already delivered in October and November. Each exists as a clean file and an `_hl` file at 1080 × 1920 px.

| Earlier file | Screen | Where it runs today |
| --- | --- | --- |
| `C1_S1_alert-push` | Cancellation alert on the owner's phone | Live video ad 1A |
| `C1_S2_stage-split` | Cancellations by stage | Live video ad 1A, carousel card 1 |
| `C1_S3_employee`, `C1_S3b_details` | Cancellations by employee and details | Live video ad 1A |
| `C1_S4_consumption`, `C1_S5_consumption-detail` | Item consumption and wastage in grams | Carousel card 4 |
| `C2_S1_order-entry` | Order entry, Order #1012 | Video ads, statics |
| `C2_S2_upi-bill` | Collect payment with UPI QR and Print Bill | Video ads, statics |
| `C3_S1_dashboard` | Owner dashboard, net sales ₹48,650 | Statics |
| `C3_S2_pl-report` | Profit and loss report, net P&L ₹9,850 | Video ads, statics |
| `C3_S3_outlets` | Two outlets with totals | Carousel card 3 |
| `C4_S1_orders-all-channels` | Orders from POS, Swiggy, Zomato | Live video ad V7, carousel card 2 |
| `C4_S2_payout-match` | Order-wise payout match | Video ads |
| `C5_S1_customer-lifecycle`, `C5_S2_win-back` | Customer insight and not-returned list | Video ad 5A |
| `C5_S3_whatsapp-offer` | WhatsApp e-bill and win-back message to Neha | Carousel card 5 |
| KOT screen | Kitchen tickets #214 and #213 on phone | Statics |

The first picture below shows six of these screens, including one clean and highlight pair. The second shows the current carousel, so you can see where the new screens will replace drawn graphics on cards 6, 7 and 8.

&#91;image: Six earlier screens: Cancellations clean and highlight, Item Consumption, Win-Back list, WhatsApp offer, Payout Match\]

&#91;image: Current carousel, English version: cards 6, 7 and 8 use drawn graphics that the new screens will replace\]

**Some earlier files were revised after first delivery.** The dashboard, P&L, outlets, orders and collect-payment screens were corrected later (for example UPI share, outlet P&L totals, and the bill becoming takeaway Order #1012). Where an older file disagrees with the demo data table in this brief, the table is right.

The live site is [mygenie.online](https://www.mygenie.online/). The brand colours we use around the screens are orange #F58346, green #1DAA4B and yellow #F5BE46. Do not apply them to the screens; they are here only for context.

## Questions to answer and delivery checklist

Please answer these with the first delivery. One line each is enough.

1. Does the ordering website have separate Dine-in, Takeaway and Delivery flows, and is the table QR scan part of the same site?
2. Does AI menu upload accept both a photo and a PDF, and does it fill item name, price and category?
3. Which devices have their own layout: tablet, Windows, Mac, kitchen display? Which just show the phone layout?
4. Which WhatsApp automations are live today? List them by name.
5. Is rider assignment for self delivery live, and what does the owner see?
6. Is there a live-operations or running-tables view on the phone?

**Before you send, check each file:**

- [ ] The feature exists in the live app as shown
- [ ] Numbers match the demo data table
- [ ] No real names, phone numbers or third-party logos
- [ ] Correct canvas size for the device
- [ ] Clean and `_hl` versions both present
- [ ] File name follows `R4_<code>_<short-name>`

**How to deliver:** one folder per priority, plus a short note listing any screen you could not make and why.
