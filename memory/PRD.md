# MyGenie POS Frontend — PRD & Session Log

**Project:** MyGenie Restaurant POS Frontend
**Repo:** `https://github.com/Abhi-mygenie/core-pos-front-end-.git`
**Branch:** `bugs-v1-15-april-`
**Stack:** React 19, Tailwind CSS, CRACO, Socket.io, Firebase
**Backend API:** `https://preprod.mygenie.online/`
**Socket:** `https://presocket.mygenie.online`

---

## Architecture

- **Frontend-only** React SPA (no local backend)
- Connects to external preprod backend API + socket server
- Firebase for auth/notifications
- CRM integration for customer management
- Google Maps for delivery addresses
- Socket v2 architecture — real-time multi-device sync with order-engage locking

## User Personas

- **Restaurant Owner/Manager** — Full access, can cancel orders, manage settings
- **Waiter/Staff** — Place/update orders, limited permissions based on profile API
- **Cashier** — Collect payments, print bills

## Core Features

- Login/Auth (Firebase)
- Dashboard with Table View / Order View / Channel / Status grouping
- Order Entry: Place, Update, Cancel, Split Bill
- Payment: Collect Bill, Prepaid, Partial Payments
- Table Management: Shift Table, Merge Table, Transfer Food
- Socket-first architecture (v2) — real-time multi-device sync
- KOT/Bill printing
- CRM customer search
- Delivery address management

---

## Session Log — April 15, 2026

### Setup
- Cloned repo (branch `bugs-v1-15-april-`), installed dependencies (firebase, socket.io-client, @hello-pangea/dnd, etc.), configured 16 env variables
- Frontend running on port 3000
- Pulled all 18 memory docs from repo

### Bugs Fixed (7 total)

| # | Bug ID | Title | Files Changed |
|---|--------|-------|---------------|
| 1 | — | Prepaid Place+Pay redirect: awaited HTTP instead of fire-and-forget + waitForTableEngaged | `OrderEntry.jsx` |
| 2 | — | Sidebar 4 buttons → 2 toggle buttons (Table/Order + Channel/Status) | `Sidebar.jsx` |
| 3 | BUG-234 | TakeAway/Delivery missing required field validation (name, phone, address) | `OrderEntry.jsx`, `CartPanel.jsx` |
| 4 | BUG-235 | Shift Table modal shows rooms — rooms excluded via `!t.isRoom` filter | `ShiftTableModal.jsx` |
| 5 | BUG-236 | Collect Bill / Edit rules not enforced (postpaid status check + prepaid lock) | `OrderEntry.jsx`, `CartPanel.jsx` |
| 6 | BUG-237 | Placed item qty edit: Update Order disabled, delta not sent — "delta as unplaced item" approach | `OrderEntry.jsx`, `CartPanel.jsx` |
| 7 | BUG-238 | "No channels configured" → "No active orders" in empty status view | `ChannelColumnsLayout.jsx` |

### Documents Updated
- `API_DOCUMENT_V2.md` — Redirect behavior table, PREPAID_ORDER clarification, Collect Bill button rules, Switch Table room exclusion
- `SOCKET_V2_FEATURE.md` — Flow 1 (Place+Pay redirect), Flow 4 (room filter), Flow 7 (Collect Bill rules), Flow 13 (exclusive endpoint), Endpoints Reference
- `BUGS.md` — Added BUG-234 through BUG-241 (7 new entries, 5 fixed + 3 open)

### Analysis & Documentation Only (no code change)
- PREPAID_ORDER endpoint usage audit (commit trail `0e4870a` → `197596e`)
- Status view empty state behavior (decided: no change, status view is order-centric)
- BUG-239/240/241: Payment validation gaps documented with proposed UX

---

## Open Bugs — Backend Action Required

| Bug | Title | Priority | Owner |
|-----|-------|----------|-------|
| BUG-204 | `order_sub_total_without_tax` returns 0 | P1 | Backend |
| BUG-212 | Addon names mismatch between APIs | P0 | Backend |
| BUG-224 | Manual Bill: `gst_tax` always 0 | P1 | Backend |
| BUG-225 | Manual Bill: `custName` sends label instead of real name | P2 | Backend |
| BUG-227 | Order-level Ready/Serve does not update item-level `food_status` | P0 | Backend |
| BUG-228 | `update-order-target` not sent when source is walk-in in merge | P0 | Backend |
| BUG-230 | `F_ORDER_STATUS` vs `F_ORDER_STATUS_API` mismatch | P2 | Backend |
| BUG-234 | No server-side validation for TakeAway/Delivery required fields | P1 | Backend |

## Open Bugs — Frontend (Ready to Implement)

| Bug | Title | Priority | Proposed UX |
|-----|-------|----------|-------------|
| BUG-239 | TAB (Credit): customer name/phone mandatory | P1 | "Credit Customer" section with pre-filled name+phone fields when TAB selected |
| BUG-240 | Card: last 4 digits + transaction ID mandatory | P1 | "Card Details" section with 2 inputs when Card selected |
| BUG-241 | Split with Card: transaction ID per card row | P1 | Inline transaction ID input below card split rows |

## Open UX Items

| Item | Priority | Notes |
|------|----------|-------|
| BUG-231 | P2 | Split Bill allows assigning 100% items to one person |
| BUG-232 | P2 | Prepaid: `service_tax` hardcoded 0 — needs restaurant config |
| BUG-233 | P3 | Prepaid orders have no visual indicator on dashboard |

---

## Backlog / Next Tasks (Prioritized)

### P0 — Critical
- BUG-227: Backend fix — item-level food_status on order-level Ready/Serve
- BUG-228: Backend fix — walk-in→table merge missing update-order-target

### P1 — High
- BUG-239/240/241: Payment field validation (TAB customer, Card details, Split card txn ID)
- BUG-234: Backend validation for TakeAway/Delivery required fields
- Partial payments (`partial_payments` array) — not yet implemented in frontend

### P2 — Medium
- Service tax from restaurant config (not hardcoded 0)
- Prepaid visual indicator on dashboard
- Split Bill 100% assignment validation

### P3 — Low
- Scheduled orders support
- Audio file attachment
- Loyalty points / Wallet balance integration
