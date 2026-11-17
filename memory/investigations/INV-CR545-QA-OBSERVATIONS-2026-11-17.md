# INV-CR545-QA-OBSERVATIONS — Investigation Report

**Date:** 2026-11-17
**Role:** INVESTIGATION
**Classification:** MEDIUM risk (ScanOrderPopOut — web order confirmation flow)
**Steps Used:** 6/10
**Confidence:** HIGH — code-traced, registry cross-referenced
**Related:** CR-545 (GATE_5A_IMPLEMENTED — Phase 1)

---

## 1. Summary

Owner reported 5 observations during CR-545 QA smoke test on the ScanOrderPopOut (web order confirmation banner). Investigation cross-referenced all 5 against registry (866 items) and codebase. Result:

| # | Observation | Verdict | Existing ID |
|---|------------|---------|-------------|
| OBS-1 | Customer info + delivery address missing from banner | **ALREADY REGISTERED** | **CR-534** (GATE_1_INTAKE) |
| OBS-2 | Cancelled item (melo fish) still shows in banner | **NEW BUG** — not registered | — |
| OBS-3 | Table no 7 but 7874 beside Print Bill | **NOT A BUG** — 7874 is order number | — |
| OBS-4 | KOT button no item selection | **NEW CR** — not registered | — |
| OBS-5 | APS item should not show ₹1 amount | **CR-545 SCOPE GAP** — Phase 2 adjacent | — |

---

## 2. Detailed Analysis Per Observation

---

### OBS-1: Banner Should Show Customer Info + Delivery Address

**Verdict: ALREADY REGISTERED as CR-534 (GATE_1_INTAKE_COMPLETE)**

**Registry entry:**
```
CR-534: "Scan Order Popup: Missing Customer Name, Phone, Info"
Status: GATE_1_INTAKE_COMPLETE
Notes: "Scan order popup missing customer name, phone, and order info. Information density improvement."
```

**Current code state (ScanOrderPopOut.jsx L363-376):**
- ✅ Customer name IS shown (`activeOrder.customerName`)
- ✅ Phone number IS shown (`activeOrder.phone`)
- ❌ Delivery address NOT shown — `getAddressLine()` helper exists at L130-132 but is **never called in the body**
- ❌ Order type (Dine-In/Delivery/Takeaway) IS shown at L339 but basic
- ❌ No additional info (special instructions shown at L428-434 for delivery, but only `delivery_instructions` — no address)

**What CR-534 should cover (enhancement scope):**
1. Delivery address line (address, city, pincode) — helper exists, needs wiring
2. Customer phone formatted with country code
3. Additional order metadata (delivery slot, order notes more prominently)
4. Order type-specific info density (delivery = address+instructions, dine-in = table+pax, room = room+guest)

**Action:** No new registration needed. CR-534 covers this. **Gate 2 (IA) can proceed.**

---

### OBS-2: Cancelled Item (Melo Fish) Still Shows in Banner ⚠️ NEW BUG

**Verdict: NEW BUG — not registered anywhere in registry**

**Evidence from screenshots:**
- Screenshot 1 (ScanOrderPopOut): "melo fish" appears with APS badge and ₹1.00 — no cancelled indication
- Screenshot 2 (OrderEntry): "melo fish (Cancelled)" shown greyed out with strikethrough — correctly reflects cancelled state
- Network tab confirms: `cancel-food-item` API returned 200, `order_status: "cancelled"` for item_id 3969284

**Root cause (code trace):**
ScanOrderPopOut.jsx L449-461 iterates `activeOrder.items` with **NO filter for cancelled items:**
```javascript
{[...(activeOrder.items || [])].sort((a, b) => {
    const aAps = Number(a?.unitPrice ?? a?.price) === 1 ? 0 : 1;
    const bAps = Number(b?.unitPrice ?? b?.price) === 1 ? 0 : 1;
    return aAps - bAps;
}).map((it, idx) => { ... })}
```

No check for `it.foodStatus`, `it.isCancelled`, `it.status === 'cancelled'`, or any cancel indicator. ALL items render regardless of state.

**OrderEntry comparison:** OrderEntry/CartPanel correctly shows cancelled items as strikethrough/greyed because it checks `foodStatus` or the item cancel state from the order context. The popup doesn't do this.

**Impact:**
- Staff sees cancelled items as active in the confirmation banner
- Order total (₹692) likely includes the cancelled item's price (should be ₹691 without melo fish at ₹1)
- Misleading for accept/reject decision

**Proposed fix (2 approaches):**
- **Option A (filter out):** Remove cancelled items entirely from the popup list → `items.filter(it => it.foodStatus !== 7 && !it.isCancelled)`
- **Option B (show as struck through):** Keep cancelled items but render as greyed/strikethrough with "(Cancelled)" label — matches OrderEntry behavior

**Recommendation:** Option A for the popup (it's a quick confirmation view — cancelled items add noise). Option B is more appropriate for OrderEntry detail.

**Needs registration as:** BUG (P1, MEDIUM risk)

---

### OBS-3: Table No is 7 But Shows 7874 Beside Print Bill Button

**Verdict: NOT A BUG — user confusion between table number and order number**

**Evidence from screenshots:**
- Screenshot 1 (ScanOrderPopOut): Large "**7**" displayed → this IS the table number, correctly shown at L330-331
- Screenshot 2 (OrderEntry header): Green button shows "**7874** ✓" with "Print Bill" next to it → this is the **ORDER NUMBER** (order sequence ID), not the table number

**Code trace:**
- ScanOrderPopOut L330-332: `activeOrder.tableNumber` → shows "7" ✅ correct
- OrderEntry header bar: Shows `order.orderNumber` or `order.orderSequenceId` → shows "7874" ✅ correct
- These are two different fields: table number (7) vs order number (7874)

**Why it's confusing:**
The popup prominently shows "7" (table number) as the primary identifier. When the user opens OrderEntry, they see "7874" (order number) in the header — a completely different number with no "Table 7" visible in the header bar.

**This IS part of CR-534 scope** — information density improvement. CR-534 should ensure the popup displays BOTH table number and order number clearly labeled:
```
Table 7 · Order #7874
```

**Action:** No new registration. CR-534 scope covers this. Add this specific note to CR-534 IA when planning.

---

### OBS-4: KOT Button Doesn't Have Option for Selecting Items ⚠️ NEW CR/SCOPE GAP

**Verdict: NEW enhancement — not registered. Partial overlap with CR-545 Phase 1 scope.**

**Current behavior (CR-545 Phase 1 implementation):**
ScanOrderPopOut.jsx L596-616 — KOT button in footer:
```javascript
onPrintKOT ? (
  <button onClick={() => onPrintKOT(activeOrder)} ...>
    <Printer className="w-4 h-4" /> KOT
  </button>
) : null
```

DashboardPage.jsx KOT handler:
```javascript
handlePrintKOTFromPopup = (order) => {
  // Prints ALL items — no item selection
  const tableEntry = buildTableEntryFromOrder(order);
  handleKOTPrint(tableEntry, order);  // existing KOT path
}
```

**Gap:** The KOT button prints the **entire order**. There is no item selection UI. In OrderEntry, KOT printing allows selecting specific items — but the popup's KOT is all-or-nothing.

**Use case:** Staff wants to send only specific items to kitchen before accepting the full order. Example: send the food items to kitchen KOT but NOT drinks (handled at counter).

**Registry check:** No existing CR/BUG for selective KOT in the popup. CR-545 implementation plan (Gate 3) explicitly scoped KOT as "reuses OrderCard print path" — full order. Item-selective KOT was not in scope.

**Recommendation:** Register as new CR (P2, LOW risk). Can be done as:
- Checkbox per item in the popup → selected items sent to KOT
- Or: KOT opens a quick item-picker modal before printing

**Action:** Needs new CR registration.

---

### OBS-5: APS Item Should Not Show ₹1 Amount ⚠️ CR-545 SCOPE GAP

**Verdict: SCOPE GAP in CR-545 Phase 1 — adjacent to Phase 2 (price edit)**

**Current behavior (CR-545 Phase 1):**
ScanOrderPopOut.jsx L493-508:
- Shows orange "APS" badge on ₹1 items ✅
- Shows "₹1.00" price next to the badge ← **user says this should be hidden**

**Owner decision OD-545-04 (locked 2026-11-16):**
> "Accept button works normally even when ₹1 items are present. Staff can accept order at ₹1, then correct price in OrderEntry afterward."

This decision addresses the **accept flow** but doesn't explicitly say whether ₹1 should be DISPLAYED or hidden. The implementation chose to display it (transparency) — the user now says it's misleading.

**Why it matters:**
- ₹1 is a **placeholder** price, not a real price
- Showing ₹1 to staff implies the order total (₹692) is accurate — it's not
- Staff may accept at ₹692 thinking that's correct, then forget to edit the ₹1 item
- Hiding ₹1 and showing "Price TBD" or "Set Price" would signal action is needed

**Two options:**
- **Option A (quick fix, Phase 1 scope):** Replace `₹1.00` with text like "**Price TBD**" or "**Set Price →**" for APS items. Badge stays. Total shows with asterisk "₹692*" and footnote "*APS items need pricing".
- **Option B (Phase 2, backend-blocked):** Inline price edit field directly in the popup — replace ₹1 with an input box. This is already in Phase 2 scope.

**Recommendation:** Option A is a quick UX fix within Phase 1 scope (~5 lines). Option B is Phase 2.

**Action:** This is a scope clarification on CR-545, not a new CR. Owner decision needed: show ₹1 (current) vs hide and show "Price TBD" (proposed).

---

## 3. Summary — Registration Actions

| # | Observation | Action | ID |
|---|------------|--------|-----|
| OBS-1 | Customer info + delivery address | ✅ Already registered | **CR-534** (GATE_1_INTAKE) |
| OBS-2 | Cancelled items in popup | ⚠️ **REGISTER as new BUG** | Needs new ID |
| OBS-3 | Table 7 vs order 7874 | ✅ Already covered by CR-534 scope | **CR-534** (GATE_1_INTAKE) |
| OBS-4 | KOT no item selection | ⚠️ **REGISTER as new CR** | Needs new ID |
| OBS-5 | APS ₹1 amount display | ⚠️ **CR-545 OD needed** (Phase 1 scope) | **CR-545** (scope clarification) |

---

## 4. Owner Decisions — ALL LOCKED (2026-11-17)

| # | Decision | Answer | Registered |
|---|----------|--------|------------|
| OD-OBS2-01 | Cancelled items in popup | **B — Show as strikethrough** (same pattern as OrderEntry cancel display) | **BUG-679** |
| OD-OBS4-01 | KOT item selection | **P2 B — Register, include in next implementation batch** | **CR-547** |
| OD-OBS5-01 | APS ₹1 display | **Hide ₹1 — APS item should not show ₹1 amount** (Phase 1 scope fix) | **CR-545** (scope update) |

---

## 5. Evidence

| Artifact | Description |
|----------|-------------|
| Screenshot 1 | ScanOrderPopOut showing melo fish with APS badge + ₹1 (cancelled but visible) |
| Screenshot 2 | OrderEntry showing melo fish as cancelled + order number 7874 in header |
| Code trace | ScanOrderPopOut.jsx L449-461 (no cancel filter), L493-508 (APS badge + ₹1 display) |
| Registry | CR-534 (customer info), CR-545 (APS), CR-533 (minimize popup) — all cross-referenced |

---

```
Investigation complete: CR-545 QA Observations (5 items)
Confidence: HIGH. Steps: 6/10.
Existing registrations: 2 (CR-534 covers OBS-1 + OBS-3)
New items to register: 2 (OBS-2 as BUG, OBS-4 as CR)
Scope clarification: 1 (OBS-5 on CR-545 — owner decision needed)
Investigation report at: investigations/INV-CR545-QA-OBSERVATIONS-2026-11-17.md
```
