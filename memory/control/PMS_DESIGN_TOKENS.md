# PMS Module — Design Tokens (single source for CR-358 P3/P4/P5 mockups + code)

**Created:** 2026-09-03 (CR-358-P3 Gate 2.5 audit) | **Source of truth:** live code (`App.css`, `CollectPaymentPanel.jsx`, `CheckInPage.jsx`, `InHouseGuestsPage.jsx`, `Sidebar.jsx`)

| Token | Value | Usage |
|---|---|---|
| Font | `'Poppins', 'Inter', sans-serif` | everything (App.css L20) |
| Brand orange | `#F26B33` (+ Tailwind `orange-50/100/400/500/600/700`) | header icons, totals, Print Bill outline, links, tab underline |
| Action green | `#329937`, hover `#2B8230` | primary CTA (Checkout, Confirm Check-In, New Booking), selected payment tile |
| Text primary | `#1A1A1A` | headings, body |
| Text muted | `#888` (also `#9CA3AF`) | labels, secondary |
| Border | `#E5E5E5` | cards, table rows |
| Surface | `#F7F7F7` (page bg), `#FAFAFA`, `#FFFFFF` (cards) | |
| Danger | `#EF4444`, `#D32F2F`, `red-50` | overdue, errors |
| Warning / SR | `amber-50/100/600/700` | SR badge, warnings |
| Info | `blue-50/600` — **rare, P2 only** | avoid for new work |

**Forbidden in PMS mockups/code:** Tailwind default green `#22C55E`, blue `#3B82F6/#2563EB`, slate family (`#64748B #475569 #334155 #1E293B #0F172A #E2E8F0 #CBD5E1 #F1F5F9 #F8FAFC`), `#2D3748 #4A5568`.
