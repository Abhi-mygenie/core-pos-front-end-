# Investigation Report — Aggregator Order Issues (7 Findings)

**Date:** 2026-07-31  
**Role:** INVESTIGATION  
**Account:** owner@18march.com (rid=478, preprod)  
**Endpoint:** `GET /api/v1/vendoremployee/urbanpiper/get-order-list` — 8 live aggregator orders probed  
**Steps Used:** 10/10  
**Confidence:** HIGH (code-traced + live data confirmed)

---

## Finding 1: Addon + Variation NOT Shown in Aggregator Popup

**Classification: FE_BUG**  
**Confidence: HIGH — CONFIRMED with live data**

### Live Evidence
Order #478/002407 (Swiggy, fOS=1) has:
- Plain Dosa: `add_ons: [{name: "egg", price: 10}]` 
- Butter Dosa: `add_ons: [{name: "cheese", price: 50}]`

Order #478/002402 (Zomato, fOS=1): `add_ons: [{name: "egg", price: 10}]`
Order #478/002401 (Zomato, fOS=1): `add_ons: [{name: "Paneer", price: 80}]`

**Data flows through transform correctly** (`aggregatorTransform.js` maps to `item.addOns[]`), but **`AggregatorOrderPopOut.jsx` has ZERO render code for addOns or variation** — grep returns 0 hits. `ScanOrderPopOut.jsx` (web orders) renders them at lines 455–530.

### Fix
- File: `AggregatorOrderPopOut.jsx`, inside items.map (~line 288–302)
- Add variation + addon render block (copy from ScanOrderPopOut lines 490–530)
- ~30 lines, LOW risk

---

## Finding 2a: Order Note — "Order Instructions :::" Prefix

**Classification: DATA_ISSUE (backend sends prefix)**  
**Confidence: HIGH — CONFIRMED**

### Live Evidence
Zomato orders have: `order_note: "Order Instructions ::: This is order level instructions"`
Swiggy orders have: `order_note: "This is order level instructions"` (no prefix)

The `"Order Instructions :::"` prefix is **injected by the backend/UrbanPiper**, not the FE. The FE renders `order.orderNote` as-is.

**The conditional guard `{order.orderNote && (...)}` is CORRECT** — label only appears when note exists.

### Owner Question: "should not come if no instructions"
The guard works. But if the owner means the `"Order Instructions :::"` prefix should be stripped:
- Fix: In `aggregatorTransform.js`, strip the prefix: `orderNote.replace(/^Order Instructions\s*:::\s*/i, '').trim() || null`
- This also handles cases where note is ONLY `"Order Instructions :::"` with no actual text → becomes null → hidden

---

## Finding 2b: "Scheduled: 2026-07-30 23:19:54"

**Classification: NOT A BUG — explanation requested**

### Live Evidence
All 8 orders have `schedule_at` populated. This is the **scheduled pickup time** set by the aggregator platform — when the rider is expected to collect the order.

Example: `"2026-07-30 23:19:54"` = rider pickup expected at 11:19 PM on July 30.

### Recommendation
Format for readability. Currently raw datetime string. Should be: `"Today, 11:19 PM"` or `"30 Jul, 11:19 PM"`.

---

## Finding 2c: "Bangalore, Bangalore" — Incomplete Address

**Classification: DATA_ISSUE — CONFIRMED with live data**

### Live Evidence (Swiggy orders)
```json
{
  "city": "Bangalore",
  "line_1": "Bangalore",     ← city name repeated in line_1
  "line_2": null,
  "sub_locality": "Bangalore", ← city name repeated again
  "pin": null,
  "landmark": null
}
```

Zomato orders have better data: `"line_1": "Test Are", "city": "Delhi NCR"`

**Root cause:** Swiggy test orders populate `line_1` and `sub_locality` with city name. This is a **Swiggy/UrbanPiper test data issue**. Real production orders would have full address.

### FE Enhancement
Current `formatAddress`: `[addr.line_1, addr.line_2, addr.city, addr.pin]`
Add: `addr.sub_locality`, `addr.landmark` — but also **deduplicate** so repeated city names don't show.

Fix: 
```javascript
const formatAddress = (addr) => {
  if (!addr) return null;
  const parts = [addr.line_1, addr.line_2, addr.sub_locality, addr.city, addr.pin]
    .filter(Boolean)
    .filter((v, i, a) => a.indexOf(v) === i); // deduplicate
  return parts.length > 0 ? parts.join(', ') : null;
};
```

---

## Finding 3: Instruction Label on OrderCard — Same as 2a

Same root cause as Finding 2a. `OrderCard.jsx` line 622: `{order.orderNote && (...)}` — correct guard. The `"Order Instructions :::"` prefix is backend data.

---

## Finding 4: KOT/Bill Button Per Status — Owner Wants Separation

**Classification: OWNER_DECISION**

### Current Behavior (confirmed in code)
| fOS | KOT | Bill | Action Button |
|-----|:---:|:---:|---|
| 1 (preparing) | ✅ | ✅ | "Mark Ready" (clickable → calls API) |
| 2 (ready) | ✅ | ✅ | "Ready to Dispatch" (clickable → calls API) |

**Owner wants:** preparing → KOT only, ready → Bill only.

Fix: `OrderCard.jsx` lines 1013 + 1082 — change fOS conditions. 2 lines.

---

## Finding 4b (NEW): "Ready to Dispatch" Button Should Be Text, Not Button

**Classification: FE_BUG — CONFIRMED from screenshot**

### Evidence
Screenshot shows "Ready to Dispatch" as an **interactive button** (orange border, clickable). Owner says: "should be text since app don't have action on it."

### Code
`OrderCard.jsx` line 1071–1079:
```jsx
{isAggregator && fOrderStatus === 2 && (
  <button ... onClick={(e) => { e.stopPropagation(); onAggregatorDispatch?.(order); }}>
    Ready to Dispatch
  </button>
)}
```

This IS a functional button — it calls `onAggregatorDispatch` which triggers the UrbanPiper status update API. But if the app doesn't actually support dispatch action, it should be converted to a status label/text.

### Fix
Replace `<button>` with `<span>` styled as status text. Or — if dispatch API works — keep as button but verify the API flow.

**OWNER DECISION NEEDED:** Is the dispatch API functional? If no → convert to text label. If yes → keep as button.

---

## Finding 5: Order Polling Impact on Aggregator Orders

**Classification: NO IMPACT — CONFIRMED**

`useOrderPollingReconciliation.js` line 206: `if (l.isAggregator === true) { continue; }` — aggregator orders are explicitly skipped. Zero interference.

---

## Finding 6: Audit Tab Missing in Orders (Beta)

**Classification: BY DESIGN**

Screenshot shows **Orders (Beta)** page (CR-117) — Audit tab was never planned. Audit is only on the original Order Report (`/reports/audit`). Backend combined endpoint has no audit/gap data.

---

## Summary

| # | Issue | Classification | Live Data | Fix |
|---|-------|---------------|:---------:|-----|
| 1 | Addon/Variation not in popup | **FE_BUG** | ✅ 4 orders have add_ons | ~30 lines in AggregatorOrderPopOut.jsx |
| 2a | "Order Instructions :::" prefix | **DATA_ISSUE** | ✅ Zomato sends prefix, Swiggy doesn't | Strip prefix in transform |
| 2b | Scheduled time explanation | **NOT A BUG** | ✅ All 8 orders have schedule_at | Format datetime better |
| 2c | "Bangalore, Bangalore" | **DATA_ISSUE** | ✅ Swiggy repeats city in line_1 | Deduplicate in formatAddress() |
| 3 | Instruction on card | **Same as 2a** | — | Same fix |
| 4 | KOT/Bill per status | **OWNER_DECISION** | — | 2 lines — needs confirmation |
| 4b | "Ready to Dispatch" as button | **FE_BUG/DECISION** | ✅ Screenshot | Button → text if no action |
| 5 | Polling impact | **NO IMPACT** | ✅ Code confirmed | None |
| 6 | Audit tab in Beta | **BY DESIGN** | — | Not planned |

### Evidence
- `/app/memory/evidence/CR-117/aggregator_orders_live_20260731.json` — 8 orders full payload
