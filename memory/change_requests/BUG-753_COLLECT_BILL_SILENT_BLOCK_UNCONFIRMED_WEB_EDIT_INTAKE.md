# BUG-753 — INTAKE DOC
## Collect Bill Button: Silent Block When Web-Edit Items Are Unconfirmed

```
ID:          BUG-753
Type:        BUG
Severity:    P2 — MEDIUM
Risk:        MEDIUM (UI feedback / UX — no financial logic)
Sprint:      nov_cr_batch
Client:      ALL
Assignee:    Abhishek (FE — not backend-blocked)
Area:        Order Entry
Status:      GATE_1_INTAKE
Source:      QA-FOUND (Session 1 TGK — 2026-11-26 QA continuation)
Confidence:  CONFIRMED (reproduced in browser automation on TGK t2 order)
```

---

## 1. Description

When a table has a pending **web-edit order with unconfirmed items** (e.g. an APS ₹1 item in a ScanOrderPopOut popup), the **Collect Bill button in Order Entry appears fully enabled** but clicking it produces **no response whatsoever** — no modal opens, no toast, no error, no tooltip. The button silently swallows the click.

The operator has no way of knowing why Collect Bill isn't working. They are likely to click it repeatedly, assume the app is broken, or escalate.

---

## 2. Steps to Reproduce

1. Login to any restaurant with Scan & Order enabled (e.g. `owner@thegoankitchen.com`)
2. A web-edit order arrives on a table (e.g. t2 Dine-In) with an unconfirmed APS ₹1 item
3. The ScanOrderPopOut popup appears on the dashboard
4. Without accepting or rejecting the popup, navigate into Order Entry for that table
5. Click the **Collect Bill** button (shows full order amount, appears enabled)
6. **Expected:** Modal opens, OR button is disabled with tooltip "Confirm or reject incoming items first"
7. **Actual:** Nothing happens. No modal. No toast. Silent failure.

---

## 3. Evidence

- Reproduced in Playwright browser automation on TGK t2 (COD + unconfirmed 'melo fish' APS ₹1)
- Testing agent noted: `"Collect Bill ₹1,092 button present in Order Entry but modal does NOT open — likely blocked by unconfirmed APS item"`
- QA Report: `memory/test_reports/QA_REPORT_CONTINUATION_2026-11-25.md` Session 1 BUG-672 notes
- Source: `frontend/src/components/order-entry/OrderEntry.jsx` — `handleCollectBillStayOnOrder` has no unconfirmed-items guard with user feedback

---

## 4. Blast Radius

- File: `frontend/src/components/order-entry/OrderEntry.jsx` (R5 hotspot)
- Estimated scope: SMALL (1–2 edit sites, guard check + toast/disable)
- Hotspot: YES — `OrderEntry.jsx` is an R5 file → full Gate flow required

---

## 5. Risk Classification

- **Risk: MEDIUM**
- Trigger: UI feedback gap — no financial, no order-flow, no data change
- Fast Lane eligible: NO — touches R5 hotspot file (`OrderEntry.jsx`)

---

## 6. Duplicate Check

- DISTINCT — no prior registration found for this specific "Collect Bill silent block on unconfirmed web-edit" symptom
- RELATED: BUG-752 (long buzzer doesn't stop on ScanOrderPopOut actions — same popup context)
- RELATED: CR-552 (per-item approval of web-edit items — same ScanOrderPopOut flow)

---

## 7. Proposed Fix Direction (for Planning agent)

Option A (**recommended**): Disable the Collect Bill button when `hasUnconfirmedWebEditItems` is true, with a tooltip or inline message: *"Confirm or reject the incoming items before collecting payment."*

Option B: Keep button enabled, show a toast on click: *"Please confirm or reject the pending web-edit items first."*

**Owner decision needed:** Which UX is preferred (A or B)?

---

## 8. Assignee Routing

Area = Order Entry → not Printer Agent, not PMS, not backend-blocked → **Abhishek**

---

## Open Questions

- OD-753-01: Disable button (Option A) or show toast on click (Option B)?
