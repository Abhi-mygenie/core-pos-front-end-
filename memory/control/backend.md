# Backend — Escalation + Owner Pending Items

**Date:** 2026-05-29
**Last Updated:** 2026-05-29

---

# PART 1 — BACKEND TEAM ESCALATION

**From:** POS Frontend Team
**To:** Backend / Laravel Team
**Priority:** Items grouped P1 → P3

---

## RESOLVED (no action needed)

| # | Item | Resolution |
|---|---|---|
| D1 | `loyalty_idempotency_key=null` on order 869016 | **FIXED** by backend |
| D2 | PayLater settle on `update-order` channel | **Intentional / by design** — frontend adapted |

---

## INFORMATION REQUESTED FROM BACKEND

### D3. Rider Accept/Reject Socket Events — SHARE DOCS (P1)
**Bug:** BUG-097 Bucket 5
**Status:** Owner says backend has this documented.

**Please share:**
- Rider **accept** socket event name + payload shape
- Rider **reject** socket event name + payload shape
- Does payload include `rejected_delivery_man_ids`?
- Is `delivery_man` field cleared or preserved on reject?
- What signals the "rider picked up" → "rider on the way" → "delivered" transitions?

---

### D4. Menu Update + Hold/Unpaid Order Socket Events — SHARE DOCS (P1)
**Bug:** BUG-096
**Status:** Owner says backend has event names.

**Please share:**
- Socket event name for menu item **add**
- Socket event name for menu item **edit**
- Socket event name for menu item **delete**
- Socket event name for hold order status change
- Socket event name for unpaid order updates
- Payload shape for each

---

### D5. Room Check-in API — `customer_id` Field (P2)
**Bug:** BUG-090
**Question:** Does the room check-in API accept a `customer_id` field? If yes, what is the exact field name?
**Frontend need:** Pass CRM customer ID when checking in a guest with a phone number match.
**Status:** Need to check

---

### D6. Phone Format for Room Check-in (P2)
**Bug:** BUG-092
**Question:** What format should phone number be sent in for room check-in?
- Option A: `+91` prefix (e.g., `+919876543210`)
- Option B: Raw 10 digits (e.g., `9876543210`)
- Option C: Backend accepts both
**Status:** Need to check

---

### D7. BE-1: Display Fields on `/order-logs-report` (P2)
**CRs:** CR-001, CR-004
**Status:** Owner says recent CRs may have addressed some of these. **Needs validation.**

**Fields originally requested:**
| Field | Purpose | Status |
|---|---|---|
| `waiter_name` | PUNCHED BY column | **CHECK IF NOW AVAILABLE** |
| `cancel_reason` | Cancelled tab Reason column | **CHECK IF NOW AVAILABLE** |
| `cancel_type` | Cancellation stage column | **CHECK IF NOW AVAILABLE** |
| `table_no` | TABLE NO column (human-readable) | **CHECK IF NOW AVAILABLE** |
| `room_info` | Room data on RM parent rows | **CHECK IF NOW AVAILABLE** |
| `*_by_id` + `*_by_name` | ACTIONED BY column | **CHECK IF NOW AVAILABLE** |

**Action:** Frontend team will validate which fields are now live. Backend to confirm if any are still missing.

---

## OPEN ISSUES (next sprint)

### D8. BE-2: Lodging Payment Breakdown (P2)
**Scope:** Room Orders Report
**Fields needed:** `lodging_collected`, `discount_amount`, `discount_reason`, optionally `payment_breakdown[]`
**Status:** Open issue — **scheduled for next sprint**

---

## OPEN ITEMS (P3)

### D10. `delivery-assign-order` Socket — Add Full Payload
**Bug:** BUG-094
**Current:** Socket event has no order payload — frontend makes extra API call.
**Request:** Include full order payload in the socket event.
**Status:** OPEN

### D11. `room_info.checkin_date` Missing from API
**Bug:** BUG-093
**Current:** Room detail API doesn't return check-in date/time.
**Request:** Add `checkin_date` (or `check_in_at`) to room info response.
**Status:** OPEN

### D12. Print Template — `delivery_charge_gst_amount` Slot
**Bug:** BUG-101
**Current:** Print template has no slot for delivery charge GST.
**Request:** Add template slot for `delivery_charge_gst_amount`.
**Status:** OPEN

### D13. PACKAGED Items Missing `ready_at`/`serve_at`
**Source:** Audit Report CR
**Current:** PACKAGED items with `food_status=5` have no timestamps logged.
**Request:** Backend should log `serve_at` when marking packaged items as served.
**Status:** OPEN

---

## BACKEND SUMMARY

| Category | Count |
|---|---|
| Resolved | 2 (D1, D2) |
| Docs requested from backend | 2 (D3, D4) |
| Questions to check | 3 (D5, D6, D7) |
| Next sprint | 1 (D8) |
| Open (P3) | 4 (D10, D11, D12, D13) |
| **Total remaining** | **10** |

*Please respond with docs for D3/D4 and answers for D5/D6/D7 at earliest convenience. D8 is tracked for next sprint. D10-D13 are open and can be picked up when backend has bandwidth.*

---
---

# PART 2 — OWNER PENDING ITEMS

**What the owner needs to provide/action**

---

## PENDING FROM OWNER

### 1. SC-004 / PAY-005 — SC GST Print Payload (Category A3)
**What's needed:**
- Frontend print payload for a **dine-in order with Service Charge**
- The **actual printed bill** showing the SC GST value
**Why:** To confirm or deny the alleged SC GST double-count on print
**When:** Owner said "will share in end"

### 2. D9 — `restaurant_discount_amount` Test Payload
**What's needed:** A sample API payload showing discount fields for a discounted order
**Why:** To verify `restaurant_discount_amount` is now populated correctly
**When:** Owner said "there is a test pending, I will share payload"

### 3. D3 — Rider Socket Event Documentation
**What's needed:** Backend docs for rider accept/reject socket events (event names + payload shapes)
**Why:** Blocks BUG-097 Bucket 5 implementation
**Status:** Owner says backend has this documented — needs to share

### 4. D4 — Menu Update Socket Event Names
**What's needed:** Backend docs for menu item add/edit/delete socket events + hold/unpaid order events
**Why:** Blocks BUG-096 completion
**Status:** Owner says backend has event names — needs to share

### 5. CRM 2.0 Pending Decisions (Category C2-C5)
**What's needed:** Answers to:
- C2: Will you seed an order with `order_note` on R689?
- C3: Retroactively approve Phase 2 preview gate bypass?
- C4: Accept first-time badge timing for v1?
- C5: CRM 2.0 next sprint priority order (Tab / Wallet / Integrations)?

### 6. Credentials
- **kunafamahal.com password** — needed for CRM 2.0 QA
- **Google Maps API Key** — needed for delivery address autocomplete
- **mantri.com credentials** — needed for Room Orders Report testing

### 7. Smoke QA Execution (when ready)
- BUG-097 Rider-on-the-Way (25-row checklist)
- PROD-BUG-002 Settle Print Guard (25-row checklist)
- POS2-005 Hold/Audit Reroute (status-8 row)

---

## ALREADY DECIDED (for reference)

| Item | Decision | Date |
|---|---|---|
| A1 ROUND-001 | Always ceiling | 2026-05-29 |
| A2 TIP-003 | No tip on Takeaway/Delivery | 2026-05-29 |
| A4 TOTALS-004 | Room grand total includes balance — confirmed | 2026-05-29 |
| A5 PAY-006 | Transfer to Room payload — provided + frozen | 2026-05-29 |
| B1 BUG-097 | Option A — CartPanel disabled at fOS=5 | 2026-05-29 |
| B2 BUG-104 | Full scope session now, wallet integration later | 2026-05-29 |
| B3 BUG-105 | Deferred — future module | 2026-05-29 |
| B4 UX-LOADING-02 | Defer — already fixed | 2026-05-29 |
| C1 CR-002 QA | Authorized — owner placing orders on R689 | 2026-05-29 |
| D1 Loyalty key | Fixed by backend | 2026-05-29 |
| D2 PayLater channel | Intentional by design | 2026-05-29 |
| D8 BE-2 Lodging | Next sprint | 2026-05-29 |
