# CR-534 — Scan/Confirm Order Pop-Up: Add Customer Name, Number and Other Useful Info

**Registered:** 2026-11-12
**Type:** CR
**Sprint:** nov_cr_batch
**Status:** GATE_1_INTAKE_COMPLETE

---

## 1. Description

The scan/confirm order confirmation pop-up (`ScanOrderPopOut`) is missing key customer and order information. The owner needs to see **customer name, phone number, and other useful order details** directly in the pop-up so they can make a confident accept/reject decision without opening the order.

**Current behaviour:** The pop-up shows customer name and phone only when available (`activeOrder.customerName`, `activeOrder.phone` — conditionally rendered). Other useful info such as order type, table/section, item count, special instructions, estimated amount, etc. may be missing or not prominently displayed.

**Expected behaviour:** The confirmation pop-up should prominently show:
- Customer name and phone number (always, or clearly show "Walk-in / Anonymous" when unavailable)
- Order type (Dine-In / Takeaway / Delivery)
- Table number / section (for dine-in)
- Delivery address (for delivery)
- Item count + brief item list
- Special instructions / order notes
- Order amount / estimated total

---

## 2. Classification

- **Type:** CR (information enhancement)
- **Severity:** P2 — Medium (pop-up is functional; this is an information density improvement)
- **Risk:** MEDIUM — `ScanOrderPopOut.jsx` display changes only; no logic change
- **Area:** Aggregator / Sockets
- **Fast Lane:** NOT eligible (UI restructure)

---

## 3. Duplicate Check

- CR-113 (OrderCard Customer+Phone for Aggregator — CLOSED OWNER VERIFIED): different component (OrderCard vs ScanOrderPopOut)
- **Code note:** `ScanOrderPopOut.jsx:361-371` already renders name/phone conditionally — gap is when these are null and other info is missing
- **Result: DISTINCT**

---

## 4. Evidence

- **Source:** OWNER-REPORTED (2026-11-12)
- **Confidence:** CONFIRMED

---

## 5. Blast Radius

- `src/components/dashboard/ScanOrderPopOut.jsx` — add info fields to the pop-up display
- `src/api/transforms/orderTransform.js` (R5) — confirm all required fields are mapped from socket/API data
- **Estimated scope:** SMALL-MEDIUM (1–2 files)

---

## 6. Open Questions

- OD-534-01: Which fields should be **mandatory** in the pop-up vs **shown when available**?
- OD-534-02: Is the order amount / item list available in the socket payload at the time the pop-up appears, or only after a full order fetch?
- OD-534-03: Preferred layout — compact single row per field, or a structured card with sections (customer section + order section)?

---

## 7. Code Reality

- **Status:** PARTIAL — name/phone conditionally shown; other info (notes, delivery address, estimated amount) missing

---

## 8. Related

- BUG-676 (Edit order ringer — same ScanOrderPopOut context)
- CR-533 (Minimize popup — same ScanOrderPopOut)
- CR-113 (OrderCard aggregator customer info — CLOSED, different component)
