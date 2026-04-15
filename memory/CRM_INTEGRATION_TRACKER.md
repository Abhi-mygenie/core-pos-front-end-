# CRM POS Integration — Master Tracker

**Last Updated:** April 14, 2026
**Status:** Planning Phase — No code changes yet
**CRM API Doc:** `/app/memory/CRM_POS_API.md`

---

## Quick Status

| Phase | Description | Status |
|-------|-------------|--------|
| Phase 1 | CRM axios setup + customer search replacement | Planning |
| Phase 2 | Customer lookup + create/update | **Done** |
| Phase 3 | Address lookup + picker + CRUD (Delivery) | **Done** |
| Phase 4 | Wire address into place-order payload | **Done** |
| Phase 5 | Loyalty, coupons, notes, WhatsApp | Planning |

---

## API Consumption Checklist

### Legend
- `Consumed` — Integrated in frontend, tested, working
- `In Progress` — Code written, not yet tested
- `Planning` — Mapped to a component/flow, not yet coded
- `Backlog` — Not yet mapped to any flow

| # | Endpoint | Method | Status | Consumed In (File) | Purpose |
|---|----------|--------|--------|-------------------|---------|
| **Search & Lookup** | | | | | |
| 1.1 | `/pos/customers?search=` | GET | **Done** | `customerService.js` → `CartPanel.jsx`, `CustomerModal.jsx` | Typeahead search (name or phone) |
| 1.2 | `/pos/customer-lookup` | POST | **Done** (service ready) | `customerService.js` → `OrderEntry.jsx` | Exact phone match → profile + loyalty |
| 1.3 | `/pos/customers/{id}` | GET | **Done** (service ready) | `customerService.js` → `OrderEntry.jsx` | Full customer details after selection |
| **Customer CRUD** | | | | | |
| 2.1 | `/pos/customers` | POST | **Done** (service ready) | `customerService.js` → `CustomerModal.jsx` | Create new customer |
| 2.2 | `/pos/customers/{id}` | PUT | **Done** (service ready) | `customerService.js` → `CustomerModal.jsx` | Update customer details |
| 2.3 | `/pos/customers/{id}` | DELETE | Backlog | — | Deactivate customer (not needed in POS MVP) |
| **Addresses** | | | | | |
| 3.1 | `/pos/customers/{id}/addresses` | GET | Backlog | — | List addresses (not needed — address-lookup covers this) |
| 3.2 | `/pos/customers/{id}/addresses` | POST | **Done** (service ready) | `customerService.js` → `AddressFormModal.jsx` | Add new address during delivery |
| 3.3 | `/pos/customers/{id}/addresses/{addr_id}` | PUT | **Done** (service ready) | `customerService.js` → `AddressFormModal.jsx` | Edit address |
| 3.4 | `/pos/customers/{id}/addresses/{addr_id}` | DELETE | **Done** (service ready) | `customerService.js` → `AddressPickerModal.jsx` | Delete address |
| 3.5 | `/pos/customers/{id}/addresses/{addr_id}/default` | PUT | **Done** (service ready) | `customerService.js` → `AddressPickerModal.jsx` | Set default address |
| **Cross-Restaurant** | | | | | |
| 4.1 | `/pos/address-lookup` | POST | **Done** (service ready) | `customerService.js` → `AddressPickerModal.jsx` | All addresses by phone (all restaurants) |
| **Orders** | | | | | |
| 5.1 | `/pos/orders` | POST | Backlog | — | Order webhook to CRM (Phase 5) |
| 5.2 | `/pos/customers/{id}/orders` | GET | Backlog | — | Order history (Phase 5) |
| **Loyalty** | | | | | |
| 6.1 | `/pos/max-redeemable` | POST | Backlog | — | Max redeemable points (Phase 5) |
| 6.2 | `/pos/customers/{id}/loyalty` | GET | Backlog | — | Loyalty summary (Phase 5) |
| **Coupons** | | | | | |
| 7.1 | `/pos/coupons/validate` | POST | Backlog | — | Validate coupon (Phase 5) |
| 7.2 | `/pos/coupons/apply` | POST | Backlog | — | Apply coupon (Phase 5) |
| **Notes** | | | | | |
| 8.1 | `/pos/customers/{id}/notes/items` | GET | Backlog | — | Item note patterns (Phase 5) |
| 8.2 | `/pos/customers/{id}/notes/orders` | GET | Backlog | — | Order note patterns (Phase 5) |
| **WhatsApp** | | | | | |
| 9.1 | `/pos/events` | POST | Backlog | — | WhatsApp event triggers (Phase 5) |
| **Config** | | | | | |
| 10.1 | `/pos/api-key` | GET | Backlog | — | Get API key (CRM admin only) |
| 10.2 | `/pos/api-key/regenerate` | POST | Backlog | — | Regenerate key (CRM admin only) |

**Total: 23 endpoints | Planning: 11 | Backlog: 12**

---

## Endpoint Retirement (Old POS → New CRM)

| Old POS Endpoint | Old File | Replaced By | Status |
|-----------------|----------|-------------|--------|
| `POST /api/v2/vendoremployee/restaurant-customer-list` | `customerService.js` | `GET /pos/customers?search=` (1.1) | **Done** — old endpoint removed |

---

## Auth

| Item | Value |
|------|-------|
| Method | `X-API-Key` header (per restaurant, dynamic) |
| Key source | `.env` → `REACT_APP_CRM_API_KEYS` (JSON map: restaurantId → apiKey) |
| Key resolution | `setCrmRestaurantId()` called from `LoadingPage.jsx` after profile load |
| Env var (keys) | `REACT_APP_CRM_API_KEYS` |
| Env var (base URL) | `REACT_APP_CRM_BASE_URL` |
| Env var (Google Maps) | `REACT_APP_GOOGLE_MAPS_KEY` |
| Multi-user safe | Yes — one key for all POS users |

---

## Delivery Order Flow

```
1. Waiter selects "Delivery" order type
2. Waiter enters customer phone
3. POST /pos/customer-lookup (phone)
   ├── Found (registered: true)
   │   → Store customer_id, name, phone, tier, points, wallet
   │   → POST /pos/address-lookup (phone)
   │   → Show address picker (all addresses across all restaurants)
   │   → Default address pre-selected
   │
   └── Not found (registered: false)
       → Show "Create Customer" form
       → POST /pos/customers (create)
       → POST /pos/address-lookup (phone) — check cross-restaurant
       → Show address picker OR "Add New Address" form

4. Address picker options:
   ├── Select existing → use addr_id
   ├── Add new → POST /pos/customers/{id}/addresses → get addr_id
   └── Edit → PUT /pos/customers/{id}/addresses/{addr_id}

5. Place order payload:
   ├── address_id: "addr_xxx"
   ├── cust_name, cust_mobile, cust_email, cust_dob, cust_anniversary
   └── delivery_charge
```

---

## Files to Change

| File | Change | Phase |
|------|--------|-------|
| `.env` | Add `REACT_APP_CRM_BASE_URL`, `REACT_APP_CRM_API_KEY` | 1 |
| **New:** `api/crmAxios.js` | Axios instance with X-API-Key | 1 |
| `api/constants.js` | Replace `CUSTOMER_SEARCH`, add all CRM endpoints | 1 |
| `api/services/customerService.js` | Rewrite: search, lookup, create, update, address CRUD | 1-3 |
| `api/transforms/customerTransform.js` | Map CRM response format | 1-2 |
| `components/order-entry/CartPanel.jsx` | New search + address summary for delivery | 1, 3 |
| `components/order-entry/CustomerModal.jsx` | Create/update via CRM | 2 |
| `components/order-entry/OrderEntry.jsx` | Wire address selection, store addr_id | 3-4 |
| `api/transforms/orderTransform.js` | Pass `address_id: "addr_xxx"` in payload | 4 |
| **New:** `AddressPickerModal.jsx` | Address list from address-lookup, select/add/edit/delete | 3 |
| **New:** `AddressFormModal.jsx` | Add/edit address form | 3 |

---

## What POS Core API Still Handles (No Change)

- Menu & categories
- Place order / update order
- Order status updates (ready, served, confirm)
- Tables & rooms
- Socket events (all)
- Bill / payment
- Print (KOT / Bill)
- POS login & profile
- Station / KDS

---

## Implementation Order

| Phase | What | Endpoints | Dependencies |
|-------|------|-----------|-------------|
| 1 | CRM axios + customer search | 1.1 | .env config, API key |
| 2 | Customer lookup + create/update | 1.2, 1.3, 2.1, 2.2 | Phase 1 |
| 3 | Address lookup + picker + CRUD | 4.1, 3.2, 3.3, 3.4, 3.5 | Phase 2 |
| 4 | Wire address into place-order | orderTransform.js | Phase 3 |
| 5 | Loyalty, coupons, notes, WhatsApp | 5.1, 6.x, 7.x, 8.x, 9.1 | Phase 4 |
