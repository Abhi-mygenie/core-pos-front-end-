# POS3.0 BUG-099 QSR Quick Billing — Final UX Decision Plan — 2026-05-19

## 1. Purpose

This is the **final UX decision document** for BUG-099 — QSR / Cafe Quick Billing.

All owner questions have been answered. UX direction is **approved by owner**. Final refinements captured 2026-05-19.

- No code was changed.
- No implementation plan was created.
- No code diff was created.
- No `/app/memory/final/` was updated.
- No baseline docs were updated.
- No QA was executed.

**Status: `qsr_ux_plan_created_ready_for_implementation_planning`**

---

## 2. Inputs Used

| # | Input | Source |
|---|---|---|
| 1 | Order Screen screenshot (2 items) | Owner upload (2026-05-19) |
| 2 | Order Screen screenshot (4 items) | Owner upload (2026-05-19) |
| 3 | Collect Bill field audit | Agent analysis of `CollectPaymentPanel.jsx` (2515 lines) — 38 fields cataloged |
| 4 | Owner notes (2026-05-19) | Coupon/Loyalty/Wallet hidden; Delivery charge shown; Discount shown if involved; No other inputs editable by default |
| 5 | Owner answers (OQ-CR-01/02/03) | From `POS3_0_CR_PLANNING_CLEARANCE_ADDENDUM_2026_05_18.md` |
| 6 | Owner answers (QSR-OQ-01 through QSR-OQ-09) | Captured in 3 batches during this session |
| 7 | Owner UX approval | "Accept this UX direction" (2026-05-19) |
| 8 | Owner final refinements | 15-point final direction (2026-05-19) |
| 9 | POS3.0 CR Master Planning | `/app/memory/change_requests/final_sprint_reconciliation/POS3_0_CR_MASTER_PLANNING_2026_05_18.md` |
| 10 | POS3.0 Bug Impact Analysis | `/app/memory/bugs/POS3_0_BUG_IMPACT_ANALYSIS.md` (BUG-099 section) |
| 11 | POS3.0 CR Clearance Addendum | `/app/memory/change_requests/final_sprint_reconciliation/POS3_0_CR_PLANNING_CLEARANCE_ADDENDUM_2026_05_18.md` |

---

## 3. Governing Principle

> **QSR behavior should be configurable/profile-driven wherever config already exists.**

Rather than blanket-hiding or blanket-skipping fields, QSR mode respects existing restaurant profile settings. If a restaurant has a feature configured (SC, tip, discount presets, autoKot, autoBill), QSR mode honors that configuration automatically. QSR mode only hides features that have no profile-driven equivalent or are explicitly excluded (coupon, loyalty, wallet, split, TAB, room transfer).

---

## 4. Owner Decisions — Complete Record

### From CR Planning Clearance Addendum (prior session)

| Q-ID | Question | Owner Decision |
|---|---|---|
| OQ-CR-01 | Toggle mechanism | Restaurant-profile toggle; admin enables QSR mode per restaurant |
| OQ-CR-02 | Collect Bill behavior | Billing completes at order screen itself. No navigation to CollectPaymentPanel |
| OQ-CR-03 | API to use | Use Collect Bill API — `collectBillExisting` transform |

### From QSR UX Planning Session — Initial Answers

| Q-ID | Question | Initial Answer | Final Refinement (2026-05-19) |
|---|---|---|---|
| QSR-OQ-01 | Discount | Configurable in Visibility Settings toggle | **Respect profile/config.** If restaurant has discount presets configured → show editable. QSR Discount toggle in Visibility Settings controls visibility. |
| QSR-OQ-02 | Service Charge | Skip entirely for QSR | **Respect profile/config.** If `autoServiceCharge = Yes` AND SC% > 0 AND applicable order type → auto-apply (no toggle). If auto = No → skip. Profile-driven, not blanket-skipped. |
| QSR-OQ-03 | Tip | Hide entirely | **Respect profile/config.** If restaurant `features.tip = true` AND applicable order type → show as optional field. If not → hide. Profile-driven. |
| QSR-OQ-04 | Delivery Charge | Show editable | **Unchanged.** Editable for delivery orders in QSR billing section. |
| QSR-OQ-05 | Cash Received | Auto-assume exact, hide input | **Refined: Auto-fill grand total but remain editable.** Cashier sees pre-filled input, can change if needed. |
| QSR-OQ-06 | Card TXN ID | Hidden/skipped entirely | **Refined: Optional/configurable.** Not required to proceed. Cashier can skip or enter. |
| QSR-OQ-07 | Print Bill | Existing workflow | **Respect profile/config.** KOT/Bill auto-handled from `autoKot`/`autoBill`. Existing auto-print logic fires. |
| QSR-OQ-08 | Complimentary | Existing workflow | **Unchanged.** Stays on item rows as-is. |
| QSR-OQ-09 | UX Option | Option A — Inline | **Unchanged.** Inline QSR payment section in cart space. |

### Final Structural Decisions (2026-05-19)

| # | Decision | Status |
|---|---|---|
| 1 | BUG-099 changes only QSR mode | CONFIRMED |
| 2 | Non-QSR flows remain unchanged | CONFIRMED |
| 3 | QSR should NOT go to a separate Collect Bill screen by default | CONFIRMED |
| 4 | QSR billing/payment happens inline on the Order Screen | CONFIRMED |
| 5 | Full Billing remains only as fallback for advanced/exception cases | CONFIRMED |
| 6 | Hide KOT/Bill checkboxes in QSR mode | CONFIRMED |
| 7 | KOT/Bill behavior from profile `autoKot`/`autoBill` | CONFIRMED |
| 8 | QSR behavior configurable/profile-driven wherever config exists | CONFIRMED |
| 9 | Hide coupon, loyalty, wallet, split, To Room, TAB/Credit by default | CONFIRMED |
| 10 | Cash/Card/UPI are primary payment options | CONFIRMED |
| 11 | Cash received auto-fills grand total, remains editable | CONFIRMED |
| 12 | Card TXN ID optional/configurable | CONFIRMED |
| 13 | Discount/SC/Tip/DC/Print respect profile/config | CONFIRMED |

---

## 5. Approved UX Specification

### 5.1 Visibility Settings — New Toggles

Two new toggles in the "UI Elements" section of `StatusConfigPage.jsx`:

| Toggle | Key | Default | Description |
|---|---|---|---|
| **QSR Quick Billing** | `mygenie_qsr_mode_enabled` | OFF | Enables inline QSR billing on the order screen. Hides KOT/Bill checkboxes. |
| **QSR Discount** | `mygenie_qsr_discount_enabled` | OFF | Shows editable discount field in QSR billing. Only visible when QSR Quick Billing is ON. |

Both follow the existing toggle pattern (localStorage, persisted on Save Configuration).

### 5.2 Order Screen — QSR Mode OFF (Zero Change)

When QSR Quick Billing toggle is OFF, the order screen renders exactly as today. No visual difference. No behavior change.

### 5.3 Order Screen — QSR Mode ON, Before Place Order

```
┌─────────────────────────────────┐
│ [1 ▼]                  [X Cancel]│
│ [Customer name] [Phone number]   │
├─ Items ──────── Qty ─── Price ──┤
│ 🗑 Garlic Sauce    - 1 +   ₹100 │  ← Normal edit controls
│   Customize  Add Note            │
│ 🗑 Tandoori Twist  - 1 +    ₹25 │
│   Customize  Add Note            │
│ 🗑 2 CRISPY CHICK  - 1 +   ₹351 │
│   Customize  Add Note            │
│ 🗑 4 PC FRIED WIN  - 1 +   ₹198 │
│   Customize  Add Note            │
│                                  │
│        (empty space)             │
│                                  │
├─────────────────────────────────┤
│ [       Place Order (4)        ]│  ← Full width, single button
└─────────────────────────────────┘
```

**Changes from existing non-QSR screen:**
- KOT/Bill checkboxes **hidden** (auto-handled by profile `autoKot`/`autoBill`)
- "Collect Bill" button **hidden** for fresh orders (no placed items yet)
- "Place Order" button is **full width**

### 5.4 Order Screen — QSR Mode ON, After Place Order (KEY SCREEN)

After Place Order succeeds, items become read-only and the QSR billing section appears:

```
┌─────────────────────────────────┐
│ [1 ▼]                  [X Cancel]│
│ [Customer name] [Phone number]   │
├─ Items ──────── Qty ─── Price ──┤
│ ✅ Garlic Sauce     1      ₹100 │  ← Placed (read-only, compact)
│ ✅ Tandoori Twist   1       ₹25 │
│ ✅ 2 CRISPY CHICK   1      ₹351 │
│ ✅ 4 PC FRIED WIN   1      ₹198 │
├── QSR BILLING ──────────────────┤
│                                  │
│  Item Total              ₹674   │
│  Tax (GST)               ₹102   │
│  ─────────────────────────────  │
│  Grand Total             ₹776   │
│                                  │
│  [Cash ✓]   [Card]   [UPI]     │
│                                  │
│  Cash: [₹776_________]         │  ← Auto-filled, editable
│                                  │
├─────────────────────────────────┤
│ [     Collect Bill ₹776        ]│  ← Green CTA, full width
│           Full Billing →         │  ← Small text link fallback
└─────────────────────────────────┘
```

### 5.5 Variant: With Service Charge (Profile: autoServiceCharge=Yes, SC%>0, dine-in/walk-in)

SC auto-applies from profile. No toggle shown. Read-only display row.

```
├── QSR BILLING ──────────────────┤
│                                  │
│  Item Total              ₹674   │
│  Service Charge (10%)     ₹67   │  ← Auto-applied, read-only
│  Tax (GST)               ₹112   │
│  ─────────────────────────────  │
│  Grand Total             ₹853   │
│                                  │
│  [Cash ✓]   [Card]   [UPI]     │
│  Cash: [₹853_________]         │
├─────────────────────────────────┤
│ [     Collect Bill ₹853        ]│
│           Full Billing →         │
└─────────────────────────────────┘
```

### 5.6 Variant: With Tip (Profile: features.tip=true, dine-in/walk-in/room)

Tip shown as optional field. Cashier can enter or leave empty.

```
├── QSR BILLING ──────────────────┤
│                                  │
│  Item Total              ₹674   │
│  💸 Tip  ₹[0_____]             │  ← Optional, editable, default 0
│  Tax (GST)               ₹102   │
│  ─────────────────────────────  │
│  Grand Total             ₹776   │
│                                  │
│  [Cash ✓]   [Card]   [UPI]     │
│  Cash: [₹776_________]         │
├─────────────────────────────────┤
│ [     Collect Bill ₹776        ]│
│           Full Billing →         │
└─────────────────────────────────┘
```

### 5.7 Variant: Delivery Order (Delivery Charge Editable)

```
├── QSR BILLING ──────────────────┤
│                                  │
│  Item Total              ₹674   │
│  🚚 Delivery  ₹[50____]        │  ← Editable input
│  Tax (GST)               ₹110   │
│  ─────────────────────────────  │
│  Grand Total             ₹834   │
│                                  │
│  [Cash ✓]   [Card]   [UPI]     │
│  Cash: [₹834_________]         │
├─────────────────────────────────┤
│ [     Collect Bill ₹834        ]│
│           Full Billing →         │
└─────────────────────────────────┘
```

### 5.8 Variant: With Discount (QSR Discount Toggle ON)

```
├── QSR BILLING ──────────────────┤
│                                  │
│  🏷️ Discount [None▼] [___]      │  ← Editable dropdown + input
│                                  │
│  Item Total              ₹674   │
│  Discount              -₹67.40  │  ← Computed, read-only display
│  Tax (GST)                ₹92   │
│  ─────────────────────────────  │
│  Grand Total             ₹699   │
│                                  │
│  [Cash ✓]   [Card]   [UPI]     │
│  Cash: [₹699_________]         │
├─────────────────────────────────┤
│ [     Collect Bill ₹699        ]│
│           Full Billing →         │
└─────────────────────────────────┘
```

### 5.9 Variant: Card Payment (TXN ID Optional)

```
├── QSR BILLING ──────────────────┤
│                                  │
│  Item Total              ₹674   │
│  Tax (GST)               ₹102   │
│  ─────────────────────────────  │
│  Grand Total             ₹776   │
│                                  │
│  [Cash]   [Card ✓]   [UPI]     │
│                                  │
│  TXN ID: [_ _ _ _] (optional)  │  ← Optional, can skip
│                                  │
├─────────────────────────────────┤
│ [     Collect Bill ₹776        ]│  ← Enabled even without TXN ID
│           Full Billing →         │
└─────────────────────────────────┘
```

### 5.10 Variant: Full Stack (Delivery + Discount + SC + Tip)

Maximum fields visible — all profile-driven:

```
├── QSR BILLING ──────────────────┤
│                                  │
│  🏷️ Discount [10%▼]   -₹67.40  │  ← QSR Discount toggle ON
│                                  │
│  Item Total              ₹674   │
│  Discount              -₹67.40  │
│  Service Charge (10%)    ₹60.7  │  ← Profile: auto SC ON
│  🚚 Delivery  ₹[50____]        │  ← Delivery order, editable
│  💸 Tip  ₹[20____]             │  ← Profile: tip ON, optional
│  Tax (GST)              ₹109.5  │
│  Round-off               ₹0.20  │  ← Non-zero, shown
│  ─────────────────────────────  │
│  Grand Total             ₹847   │
│                                  │
│  [Cash ✓]   [Card]   [UPI]     │
│  Cash: [₹847_________]         │  ← Auto-filled, editable
├─────────────────────────────────┤
│ [     Collect Bill ₹847        ]│
│           Full Billing →         │
└─────────────────────────────────┘
```

---

## 6. Side-by-Side Comparison (Existing vs QSR)

Based on owner's 4-item screenshot:

| Area | EXISTING (Non-QSR) | QSR MODE (After Place Order) |
|---|---|---|
| **Items display** | Editable: trash, ±qty, Customize, Add Note (~90px/row) | Read-only: checkmark + name + price (~40px/row) |
| **KOT/Bill** | Manual checkboxes visible | **Hidden** — auto from profile `autoKot`/`autoBill` |
| **Empty space** | ~200px unused | Filled with QSR Billing section |
| **Bill summary** | Only total on Collect Bill button | Compact inline: Item Total, SC, DC, Tip, Tax, Grand Total |
| **Discount** | Not visible (inside Collect Bill screen) | Editable inline (if QSR Discount toggle ON) |
| **Service Charge** | Not visible (inside Collect Bill screen) | Auto-applied from profile (read-only row, if applicable) |
| **Tip** | Not visible (inside Collect Bill screen) | Optional field (if profile enables, applicable order type) |
| **Delivery Charge** | Editable row in cart | Editable in QSR billing (delivery orders) |
| **Payment method** | Not visible | Cash/Card/UPI pills inline |
| **Cash flow** | Hidden (inside Collect Bill) | Auto-filled grand total, editable input |
| **Card flow** | Hidden (TXN ID required) | TXN ID optional/configurable |
| **Coupon/Loyalty/Wallet** | Inside Collect Bill | **Hidden** |
| **Split/Room/TAB** | Inside Collect Bill | **Hidden** |
| **Bottom buttons** | [Place Order] + [Collect Bill] side-by-side | [Collect Bill ₹X] full width + "Full Billing →" link |
| **Scrolling** | Minimal (items only) | None (QSR section fits in reclaimed space) |
| **Clicks to pay** | 5-7 (across 2 screens) | 2-3 (single screen) |

---

## 7. Payment Method Behavior

| Payment | Cashier Action | System Behavior |
|---|---|---|
| **Cash** (default) | Sees pre-filled amount → tap "Collect Bill" (or edit amount first) | Calls `collectBillExisting` with `payment_mode: 'Cash'`, `payment_amount: <grand total or edited amount>`. Change calculated if overpaid. |
| **Card** | Tap [Card] pill → optionally enter TXN ID → tap "Collect Bill" | Calls `collectBillExisting` with `payment_mode: 'Card'`. TXN ID included if entered, omitted if skipped. |
| **UPI** | Tap [UPI] pill → tap "Collect Bill" | Calls `collectBillExisting` with `payment_mode: 'UPI'`. No extra input. |

---

## 8. Complete Field Decision Matrix (Final)

| # | Field | QSR Decision | Editable? | Condition | Notes |
|---|---|---|---|---|---|
| 1 | **Discount Type** | show | YES | QSR Discount toggle ON | Dropdown: None / % / ₹ / presets |
| 2 | **Discount Value** | show | YES | QSR Discount toggle ON + type selected | Input for % or ₹ |
| 3 | **Coupon Code** | **HIDE** | — | Always | Owner confirmed |
| 4 | **Loyalty** | **HIDE** | — | Always | Owner confirmed |
| 5 | **Wallet** | **HIDE** | — | Always | Owner confirmed |
| 6 | **Service Charge** | auto-apply (read-only row) | NO | Profile: `autoServiceCharge=Yes` AND SC% > 0 AND dine-in/walk-in/room | No toggle. If auto=No → not applied. Profile-driven. |
| 7 | **Tip** | show (optional) | YES | Profile: `features.tip=true` AND dine-in/walk-in/room | Optional input, default 0. Profile-driven. |
| 8 | **Delivery Charge** | show | YES | Delivery orders only | Editable input |
| 9 | **Item Total** | show | NO | Always | Read-only row |
| 10 | **Tax (GST)** | show | NO | Always | Combined SGST+CGST row |
| 11 | **VAT** | show | NO | VAT restaurants | Replaces GST row |
| 12 | **Round-off** | show | NO | Non-zero only | Read-only row |
| 13 | **Grand Total** | show | NO | Always | Bold, prominent |
| 14 | **Cash pill** | show | — | Always | Default selected |
| 15 | **Card pill** | show | — | Always | — |
| 16 | **UPI pill** | show | — | Always | — |
| 17 | **Cash Received** | show | YES | Cash selected | Auto-filled with grand total, editable |
| 18 | **Change Display** | show | NO | Cash received > grand total | Read-only |
| 19 | **Card TXN ID** | show | YES (optional) | Card selected | Optional — Collect Bill enabled without it |
| 20 | **KOT Checkbox** | **HIDE** | — | Always in QSR | Auto from profile `autoKot` |
| 21 | **Bill Checkbox** | **HIDE** | — | Always in QSR | Auto from profile `autoBill` |
| 22 | **Split** | **HIDE** | — | Always | — |
| 23 | **To Room** | **HIDE** | — | Always | — |
| 24 | **TAB / Credit** | **HIDE** | — | Always | — |
| 25 | **Dynamic types** | **HIDE** | — | Always | Dineout, Zomato Gold, etc. |
| 26 | **Print Bill** | existing workflow | — | — | Auto-print per `autoKot`/`autoBill` profile settings |
| 27 | **Split Bill button** | **HIDE** | — | Always | — |
| 28 | **Complimentary** | existing workflow | — | — | Stays on item rows as-is |
| 29 | **Full Billing link** | show | — | Always | Opens CollectPaymentPanel for advanced cases |

---

## 9. Flow Summary

### QSR Flow (Final Approved)
```
Add items
  → Place Order (1 click)
  → QSR billing section appears inline
  → [Optional: adjust delivery charge / discount / tip]
  → Select payment pill (Cash default, or tap Card/UPI)
  → [Cash: verify/edit pre-filled amount]
  → [Card: optionally enter TXN ID]
  → Collect Bill (1 click — calls collectBillExisting API)
  → Auto-print per profile → Navigate away

Minimum clicks: 2 (Cash, no adjustments)
Maximum clicks: 4-5 (Card + discount + delivery charge edit)
Screens: 1
Scrolling: None
```

### Non-QSR Flow (Unchanged)
```
Add items → Place Order → Collect Bill button → CollectPaymentPanel
→ Adjust → Select payment → Pay

Clicks: 5-7
Screens: 2
Scrolling: Heavy
```

### Fallback: QSR → Full Billing
```
QSR billing visible → "Full Billing →" link
→ CollectPaymentPanel opens with all fields
→ Full billing flow as today
```

---

## 10. Guarded Behavior Summary

| Condition | What Happens |
|---|---|
| QSR toggle OFF | Zero change. Everything as today. |
| QSR ON + fresh order (no placed items) | KOT/Bill hidden. Collect Bill hidden. Place Order full width. |
| QSR ON + after Place Order | Items compact/read-only. QSR billing section appears. |
| QSR ON + existing order (re-engaged) | QSR billing section appears immediately. |
| QSR ON + "Full Billing →" clicked | Opens CollectPaymentPanel — full flow. |
| QSR Discount toggle OFF | Discount field hidden in QSR billing. |
| QSR Discount toggle ON | Discount field editable (dropdown + input). |
| Profile `autoServiceCharge=Yes` + SC%>0 + applicable type | SC auto-applied, read-only row shown. |
| Profile `autoServiceCharge=No` or SC%=0 | SC row hidden, not applied. |
| Profile `features.tip=true` + applicable type | Tip optional field shown. |
| Profile `features.tip=false` or non-applicable type | Tip hidden. |
| Delivery order | Delivery charge editable input shown. |
| Non-delivery order | Delivery charge hidden. |
| Cash selected | Cash amount input auto-filled, editable. Change shown if overpaid. |
| Card selected | Optional TXN ID field shown. Collect Bill enabled without it. |
| UPI selected | No extra input. Collect Bill immediately available. |

---

## 11. What Is NOT Changed

| Area | Status |
|---|---|
| `CollectPaymentPanel.jsx` | **UNTOUCHED** |
| Full Collect Bill flow (dine-in, room, complex, non-QSR) | **UNTOUCHED** |
| Payment business logic / payload shape | **UNTOUCHED** — same `collectBillExisting` API |
| Financial calculation rules (TAX, ROUND, TOTALS, SC, TIP) | **PRESERVED** — QSR uses identical math |
| Print payload shape | **PRESERVED** |
| Payment status semantics | **PRESERVED** |
| `/app/memory/final/` baseline docs | **NOT UPDATED** |
| `BUG_TEMPLATE.md` | **NOT MODIFIED** |

---

## 12. Phase 1 vs Phase 2

### Phase 1 (This Implementation)

| Item | Included |
|---|---|
| QSR Quick Billing toggle in Visibility Settings | YES |
| QSR Discount toggle in Visibility Settings | YES |
| KOT/Bill checkboxes hidden in QSR mode | YES |
| KOT/Bill auto from profile `autoKot`/`autoBill` | YES |
| Inline QSR billing section after Place Order | YES |
| Compact bill summary (Item Total, Tax, Grand Total) | YES |
| Service Charge auto-applied from profile (read-only) | YES |
| Tip optional field from profile | YES |
| Delivery Charge editable (delivery orders) | YES |
| Discount editable (when QSR Discount toggle ON) | YES |
| Cash/Card/UPI payment pills | YES |
| Cash auto-filled grand total, editable | YES |
| Card TXN ID optional | YES |
| Collect Bill API call inline (`collectBillExisting`) | YES |
| "Full Billing →" fallback link | YES |
| Auto-print per profile settings | YES |
| Non-QSR flows zero change | YES |

### Phase 2 (Future)

| Item | Notes |
|---|---|
| QSR mode from backend restaurant profile API | Currently localStorage; backend adds boolean later |
| One-step Place & Pay (skip Place Order) | Uses `placeOrderWithPayment` — faster than Phase 1 |
| QSR analytics / speed metrics | Track billing time |
| QSR compact menu view / favorites grid | Quick item selection |
| Quick reorder from customer history | CRM integration |

---

## 13. Implementation Handoff Notes (High-Level — No Code Steps)

1. **QSR toggles:** Follow `orderEntryPrefs.js` pattern. New `qsrModePrefs.js` utility. Add 2 toggles to `StatusConfigPage.jsx` UI Elements section.

2. **CartPanel QSR section:** After Place Order + QSR ON: hide KOT/Bill, render compact items + QSR billing section. Items become read-only rows.

3. **Bill calculation:** Needs same financial math as CollectPaymentPanel but profile-driven:
   - SC: auto-apply if `autoServiceCharge && scPct > 0 && applicableType`. Else 0.
   - Tip: include if `features.tip && applicableType`. Else 0.
   - Delivery: include if delivery order. Else 0.
   - Discount: include if QSR Discount ON and cashier applies. Else 0.
   - Coupon/Loyalty/Wallet: always 0 in QSR.
   - Tax, Round-off, Grand Total: standard rules.

4. **Payment pills:** Reuse `enabledPrimaryMethods` from CollectPaymentPanel (respects `pay_cash`/`pay_upi`/`pay_cc`).

5. **Cash flow:** Auto-fill `amountReceived = grandTotal`. Show editable input. Calculate change if `received > total`.

6. **Card flow:** Show optional TXN ID input. Do NOT gate Collect Bill button on TXN ID.

7. **Collect Bill API:** Call `collectBillExisting` from OrderEntry when QSR Collect Bill tapped. Same payload as full flow.

8. **KOT/Bill auto:** Read `autoKot`/`autoBill` from profile settings and pass through to Place Order + Collect Bill payloads.

9. **"Full Billing →" link:** Opens CollectPaymentPanel as today.

10. **Business rules parity:** QSR inline and full CollectPaymentPanel must produce identical financial results for the same inputs.

---

## 14. Final Status

**`qsr_ux_plan_created_ready_for_implementation_planning`**

### Confirmations
- ✅ No code was changed
- ✅ No implementation plan was created
- ✅ No code diff was created
- ✅ `/app/memory/final/` was NOT updated
- ✅ No baseline docs were updated
- ✅ No QA was executed
- ✅ All owner questions answered and refined
- ✅ UX direction approved by owner
- ✅ KOT/Bill hiding approved
- ✅ Profile-driven behavior approved
- ✅ Cash editable, Card TXN optional — approved
- ✅ Side-by-side comparison included
- ✅ All variants documented (SC, Tip, DC, Discount, Card, Full Stack)
- ✅ Ready for implementation planning gate

---

*— End of POS3.0 BUG-099 QSR Quick Billing Final UX Decision Plan — 2026-05-19 —*
