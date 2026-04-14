# MyGenie POS Frontend — PRD

**Last Updated:** April 14, 2026
**Repo:** https://github.com/Abhi-mygenie/core-pos-front-end-.git (branch: 13-april-v2-)
**Stack:** React 19 + CRA + Craco + Tailwind + Radix UI + Socket.io

---

## Architecture

- **Frontend:** React SPA on port 3000
- **POS API:** https://preprod.mygenie.online/ (menu, orders, tables, auth)
- **CRM API:** TBD base URL with X-API-Key auth (customers, addresses, loyalty, coupons)
- **Socket:** https://presocket.mygenie.online (real-time order updates)
- **Firebase:** Push notifications (FCM)

## Core Requirements

- Multi-channel POS: Dine-in, Walk-in, Takeaway, Delivery, Room
- Real-time dashboard with socket-driven order updates
- Order lifecycle: YTC → Preparing → Ready → Served → Paid
- Customer management via CRM API
- Delivery order flow with address management
- Firebase push notifications
- KOT/Bill printing

## What's Been Implemented

### Session 14b (April 14, 2026)
- CRM POS API Integration Phases 1-4: customer search, lookup, create/update, address CRUD
- Dynamic CRM API key per restaurant (15 restaurants configured)
- Delivery address flow: address picker, cross-restaurant lookup, Google Places Autocomplete
- Place-order payload now includes address_id + full customer fields from CRM

### Session 14 (April 14, 2026)
- Confirm Order: Separate endpoint `waiter-dinein-order-status-update`
- Dynamic order status from profile API `def_ord_status`
- Socket handler `handleUpdateOrderStatus` upgraded to v2 (payload-based, no GET API)
- OrderCard Accept button wired in list view
- CRM POS API analyzed, tracker created

### Session 13 (April 13, 2026)
- Socket v2 full implementation (8 files, 5 new events)
- Fire-and-forget + wait-for-engage pattern
- Dashboard engage fix for all order types

### Sessions 1-12
- Full POS frontend: dashboard, order entry, cart, payment
- Dual-view system (channel/status), visibility settings
- Socket architecture with 3 channels
- Firebase FCM notifications
- KOT/Bill printing with station picker
- Split bill feature

## Prioritized Backlog

### P0 — In Progress
- CRM Integration Phase 5 (loyalty, coupons, notes, WhatsApp)

### P1 — Next
- CRM Integration Phase 5 (loyalty, coupons, notes, WhatsApp)
- BUG-230: Unify F_ORDER_STATUS vs F_ORDER_STATUS_API

### P2 — Future
- BUG-210: Multi-device race condition (table engage check)
- BUG-212: Addon name mismatch (backend)
- BUG-224: Manual bill gst_tax always 0
- BUG-225: Manual bill custName sends label
- BUG-227: Order-level Ready/Serve item food_status (backend)
- BUG-228: Walk-in → Table merge missing update-order-target (backend)

## Key Documents
- `/app/memory/CRM_INTEGRATION_TRACKER.md` — CRM integration checklist & plan
- `/app/memory/CRM_POS_API.md` — CRM POS API reference (23 endpoints)
- `/app/memory/SOCKET_V2_FEATURE.md` — Socket v2 architecture spec
- `/app/memory/CHANGELOG.md` — Full session history
- `/app/memory/BUGS.md` — Bug tracker
- `/app/memory/ARCHITECTURE.md` — System architecture
