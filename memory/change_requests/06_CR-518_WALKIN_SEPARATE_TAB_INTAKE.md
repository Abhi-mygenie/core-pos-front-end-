# CR-518 — Walk-In: Separate Tab on Dashboard (like Takeaway and Delivery)

**Registered:** 2026-11-12
**Type:** CR
**Sprint:** nov_cr_batch
**Status:** GATE_1_INTAKE_COMPLETE

---

## 1. Description

The dashboard currently shows separate column-based tabs/sections for **Dine-In**, **Takeaway**, and **Delivery**. Owner wants **Walk-In** orders to have their own dedicated tab/section, separate from Dine-In.

**Current behaviour:** Walk-In orders appear inside the Dine-In section (or are mixed with Dine-In). There is no dedicated Walk-In column/tab on the dashboard.

**Expected behaviour:** A separate "Walk-In" tab/column appears on the dashboard, similar to Takeaway and Delivery, showing only Walk-In type orders.

---

## 2. Classification

- **Type:** CR
- **Severity:** P2 — Medium (operational clarity; workaround is to view all dine-in)
- **Risk:** HIGH — touches DashboardPage (R5), ChannelColumnsLayout, order type filtering
- **Area:** Menu / Order Entry
- **Fast Lane:** NOT eligible (R5 hotspot, dashboard layout change)

---

## 3. Duplicate Check

- Searched: "walkin tab", "walk-in tab", "walk in separate" in registry.json
- Found CR-051 (walkin name/phone toggles) — different scope
- **Result: DISTINCT**

---

## 4. Evidence

- **Source:** OWNER-REPORTED (2026-11-12 batch)
- **Screenshot:** provided — dashboard showing Dine-In (65 orders) and Delivery (1 order) columns
- **Confidence:** CONFIRMED

---

## 5. Blast Radius

- `DashboardPage.jsx` (R5) — add Walk-In as a separate order type column
- `ChannelColumnsLayout.jsx` / `ChannelColumn.jsx` — render new column
- `orderTransform.js` (R5) — ensure Walk-In order_type is distinguishable
- **Estimated scope:** MEDIUM (3–4 files, R5 hotspot)

---

## 6. Open Questions

- OD-518-01: Should Walk-In be a completely new column type, or a filter chip within the existing dashboard?
- OD-518-02: Does the backend order_type already distinguish Walk-In from Dine-In, or does this need a new order_type value?
- OD-518-03: Which order types map to "Walk-In" vs "Dine-In" from the backend `order_type` field?

---

## 7. Code Reality

- **Status:** PARTIAL — walk-in name/phone toggles exist (CR-051); no separate dashboard tab for Walk-In

---

## 8. Related

- CR-051 (Walk-In name/phone toggles — CLOSED)
- CR-429 (Active tables first toggle on dashboard)
