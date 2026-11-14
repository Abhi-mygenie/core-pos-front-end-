# CR-483 — Implementation Plan (Gate 3)

**Gate:** 3 — Implementation Plan
**Role:** PLANNING (stage = implementation_plan)
**Date:** 2026-11-07 (updated with live probe results)
**IA verified:** `impact/P0_BATCH_BUG583_CR483_CR484_CR489_CR490_IMPACT_ANALYSIS.md` §CR-483
**Backend unblock:** `investigations/P0_UNBLOCK_INVESTIGATION_REPORT_2026_11_06.md` §2B — all blockers resolved
**Live probe:** `evidence/CR-483/PROBE_REPORT_2026_11_07.md` — cafe103 (RID 644), order #021109 (ID 1537789)
**Design mockups:** 4 mockups generated 2026-11-07 (see §Design References below)
**Also covers:** CR-484 (subsumed, OD-483-09 LOCKED)

---

## Owner Decisions — ALL LOCKED

| OD | Decision | Round |
|----|----------|-------|
| OD-483-01 | No discount, billing untouched. Backend records reconciliation only. | r4 |
| OD-483-02 | ± limit default 3%, per restaurant (FE-enforced — backend provides Yes/No toggle, no % setting) | r4 |
| OD-483-03 | ALL payment methods (Cash, UPI, Card, Split, Credit, Pay Later, Room) | r4 |
| OD-483-04 | No special permission — any user who can collect payment | r4 |
| OD-483-05 | `received_amount` in payment payload; backend stores per-order; `reconcile_amount` on order = setting echo NOT ₹ diff — FE computes reconciliation | r4 + probe |
| OD-483-06 | SUPERSEDED — no discount, billing untouched | r4 |
| OD-483-07 | No reason required | r4 |
| OD-483-08 | CR-484 merged in | r5 |
| OD-483-09 | CR-484 = CR-483, single implementation | r5 |
| **NEW: OD-483-10** | **Phased delivery: Phase 1 = bill collection, Phase 2 = report columns** | Owner directive 2026-11-07 |
| **NEW: OD-483-11** | **Design approved:** Received Amount input below Grand Total on all payment tabs; Cash tab shows both Cash Received (existing) + Received Amount (new); ±3% validation with red error state; Settings toggle in Payment Settings section | Owner review 2026-11-07 |

---

## Phasing

| Phase | Scope | Files | Risk |
|-------|-------|-------|------|
| **Phase 1** | Settings toggle + Received Amount input on CPP + payload wiring | 5 files | CRITICAL (R5 hotspots) |
| **Phase 2** | Order Report columns + Excel/PDF export | 2 files | MEDIUM |

Phases are sequential — Phase 1 ships and is QA'd before Phase 2 begins. Phase 2 depends on Phase 1's transform mapping (E-6) to display `receivedAmount` in reports.

---

## Scope Lock

**Files WILL change (Phase 1 — 5 files):**
1. `src/api/transforms/restaurantSettingsTransform.js` — map `reconcile_amount` toggle
2. `src/api/transforms/profileTransform.js` — map `reconcile_amount` from login profile
3. `src/components/order-entry/CollectPaymentPanel.jsx` (R5) — Received Amount input
4. `src/api/transforms/orderTransform.js` (R5) — payload wiring + read mapping
5. `src/pages/settings/RestaurantSettingsPage.jsx` — toggle in settings UI

**Files WILL change (Phase 2 — 2 files):**
6. `src/pages/reports-module/OrderReportBetaPage.jsx` — 2 new columns
7. `src/pages/reports-module/OrderReportBetaPage.jsx` — Excel/PDF export update (same file)

**Files will NOT touch:**
- OrderEntry.jsx, OrderCard.jsx, TableCard.jsx, DashboardPage.jsx
- socketHandlers.js, any context provider
- Any print template, KOT logic, or printer agent config
- CRM payloads, revenue summaries, Day Closure
- No new files created

---

## Design References (Mockups — 2026-11-07)

### Settings Page Toggle (E-3)
![Settings Toggle](https://static.prod-images.emergentagent.com/jobs/990459d9-0a88-4c8d-882e-ed280fbe7464/images/aa06edf2399d668a06dc148b637f38fc17a2182271b1c5ac413a6cb1539df6b1.jpeg)
- New toggle row in Payment Settings: "Record Received Amount"
- Default OFF; below Auto Bill / Auto KOT

### Collect Payment — UPI/Card/Split (E-7)
![CPP UPI](https://static.prod-images.emergentagent.com/jobs/990459d9-0a88-4c8d-882e-ed280fbe7464/images/81d72a706cfe688a37a98bd1d945f27936198d55671a4a6343e85502f5169f76.jpeg)
- "Received Amount" input below Grand Total, above Pay button
- Pre-filled with grand total; ₹ prefix; helper: "±3% allowed"
- Same field on ALL non-Cash tabs

### Collect Payment — Cash Tab (E-7)
![CPP Cash](https://static.prod-images.emergentagent.com/jobs/990459d9-0a88-4c8d-882e-ed280fbe7464/images/751d352a57b99c9af7a7c485fb2b2ac666d743e4ed8a4b8ff88cf8b00c6ab0c3.jpeg)
- Cash Received (existing, for change) stays above
- Received Amount (new, for reconciliation) below it
- Two separate fields, different purposes

### Error State — ±3% Validation (E-7)
![Error State](https://static.prod-images.emergentagent.com/jobs/990459d9-0a88-4c8d-882e-ed280fbe7464/images/fba3e94fa2ae871b2789a0757505e829c26e7214ab552e2497c6f07ed2e80b71.jpeg)
- Red border + red bg tint on out-of-range value
- Error text: "Amount outside ±3% of bill (min ₹X)"
- Pay button disabled

### Layout Wireframe
```
┌─────────────────────────────┐
│  Collect Payment            │
│  [Cash] [UPI] [Card] [Split]│
├─────────────────────────────┤
│  Grand Total: ₹X,XXX       │
│                             │
│  ┌─ Cash Received ────────┐ │  ← EXISTING (Cash tab only)
│  │ amount                 │ │
│  └────────────────────────┘ │
│  Change: ₹XX                │
│                             │
│  ┌─ Received Amount ──────┐ │  ← NEW (all tabs, when setting ON)
│  │ ₹ X,XXX.00             │ │
│  └────────────────────────┘ │
│  ±3% allowed (₹min – ₹max) │
│                             │
│  [═══ Pay ₹X,XXX ════════] │
└─────────────────────────────┘
```

---

# PHASE 1 — Bill Collection

## Execution Sequence

```
E-1 (restaurantSettingsTransform.js)  — map reconcile_amount toggle (read + write)
E-2 (profileTransform.js)             — map reconcile_amount from login profile
E-3 (RestaurantSettingsPage.jsx)       — add toggle in Settings UI
E-4 (orderTransform.js — fromAPI)      — map received_amount + reconcile_amount from API
E-5 (orderTransform.js — collectBill)  — add received_amount to collect-bill payload
E-6 (orderTransform.js — placeOrder)   — add received_amount to prepaid payload
E-7 (CollectPaymentPanel.jsx)          — Received Amount input + validation
── webpack compile check ──
```

---

## E-1 — Map `reconcile_amount` toggle in settings transform

**File:** `src/api/transforms/restaurantSettingsTransform.js`
**Type:** Additive (read + write)
**Probe confirmed:** `data.basic.reconcile_amount = "No"` on cafe103 (2026-11-07 live probe)

**Read (fromAPI):** Add inside `step1` block (alongside `prepaidAutoSattle`, `autoDispatch` — same `basic.*` pattern):
```javascript
reconcileAmount: toBool(basic.reconcile_amount), // CR-483: received amount feature toggle
```

**Write (toAPI):** Add to the reverse mapping in the `step1` toAPI section:
```javascript
reconcile_amount: toYesNo(step1.reconcileAmount), // CR-483
```

**Verification:** `grep reconcileAmount restaurantSettingsTransform.js` → 2 matches (read + write).

---

## E-2 — Map `reconcile_amount` from login profile

**File:** `src/api/transforms/profileTransform.js`
**Type:** Additive (inside restaurant settings block, near L373 `autoBill`)
**Probe confirmed:** `restaurants[0].settings.reconcile_amount = "No"` — NESTED path, NOT root level (2026-11-07 live probe)

**⚠️ CRITICAL PATH:** Uses `apiSettings.settings?.reconcile_amount` (nested pattern, like `is_coupon`, `keyboard_shortcuts`), NOT `apiSettings.reconcile_amount` (root pattern like `print_kot`, `billing_auto_bill_print`).

**Add (near L373, after `autoBill` or `keyboardShortcuts`):**
```javascript
reconcileAmount: toBoolean(apiSettings.settings?.reconcile_amount), // CR-483: received amount feature toggle (nested path — confirmed probe 2026-11-07)
```

**Verification:** `grep reconcileAmount profileTransform.js` → 1 match.

---

## E-3 — Add toggle in Restaurant Settings UI

**File:** `src/pages/settings/RestaurantSettingsPage.jsx`
**Type:** Additive (new toggle row in appropriate settings section)

**Add a toggle row:**
- Label: "Record Received Amount"
- Description: "Show Received Amount field on all payment methods to track actual amount collected"
- Bound to: `reconcileAmount` in settings state
- Pattern: match existing toggle rows (e.g., `autoBill`, `autoKot`)

**Verification:** Browser → Settings → toggle visible and saves.

---

## E-4 — Map `received_amount` from API (read path)

**File:** `src/api/transforms/orderTransform.js`
**Location:** Inside `fromAPI.order` (near L310 `billPrinted`)
**Type:** Additive
**Probe confirmed:** Order #021109 → `received_amount: 13934`, `reconcile_amount: "No"` (2026-11-07 live probe)

**⚠️ CRITICAL FINDING from probe:**
- `api.received_amount` = number (₹ amount) ✅ — map this
- `api.reconcile_amount` = `"No"` (restaurant setting echo, NOT a per-order ₹ difference) ❌ — do NOT parse as number
- **FE must compute** reconciliation: `receivedAmount - orderAmount`

**Add:**
```javascript
receivedAmount: parseFloat(api.received_amount) || null,      // CR-483: ₹ amount (probe: 13934 on order #021109)
// CR-483: reconcile_amount on order = restaurant setting echo ("Yes"/"No"), NOT ₹ amount.
// FE computes reconciliation difference: receivedAmount - orderAmount (for reports in Phase 2)
```

**DO NOT add:** ~~`reconcileAmount: parseFloat(api.reconcile_amount) || null`~~ — this would parse `"No"` → `NaN` → `null`, harmless but misleading. The field is a setting echo, not a financial value.

**Fallback rule:** `null` (not 0) when absent — distinguishes "not entered" from "entered zero".

**Verification:** `grep receivedAmount orderTransform.js` → 1 match in fromAPI.

---

## E-5 — Add `received_amount` to collect-bill payload

**File:** `src/api/transforms/orderTransform.js`
**Location:** Inside `collectBillExisting` function (payment payload construction)
**Type:** Additive (1 key)

**Add to the payload object:**
```javascript
received_amount: paymentData.receivedAmount ?? undefined, // CR-483: omit if not provided (backend defaults to order_amount)
```

**Verification:** Network tab → `order-bill-payment` payload includes `received_amount` when entered.

---

## E-6 — Add `received_amount` to prepaid place-order payload

**File:** `src/api/transforms/orderTransform.js`
**Location:** Inside `placeOrder` function (when `payment_status=paid`)
**Type:** Additive (1 key)

**Add to the payload object:**
```javascript
received_amount: data.receivedAmount ?? undefined, // CR-483: omit if not provided
```

**Verification:** Network tab → `place-order` payload includes `received_amount` for prepaid orders.

---

## E-7 — Received Amount input in CollectPaymentPanel

**File:** `src/components/order-entry/CollectPaymentPanel.jsx` (R5 HOTSPOT)
**Type:** Modify — add input for ALL payment methods when `reconcileAmount` is enabled
**Risk:** CRITICAL — this is the payment panel; must not break existing collect-bill flow

### Behaviour Spec

1. **Visibility:** Show "Received Amount" input on ALL payment method tabs (Cash, UPI, Card, Split, Credit, Pay Later, Room) **only when** `restaurant.settings.reconcileAmount === true`.
2. **Default value:** Pre-filled with grand total (after round-off, same as bill amount). User can clear and type a different amount.
3. **Validation:**
   - Must be a positive number (> 0).
   - Must be within ± 3% of grand total: `grandTotal * 0.97 ≤ receivedAmount ≤ grandTotal * 1.03`.
   - If out of range → show inline error "Amount outside ±3% of bill", block Confirm.
   - The 3% is FE-hardcoded default (backend provides only Yes/No toggle, no % setting).
4. **Cash tab:** Existing "Cash Received" field stays for change calculation. New "Received Amount" field is separate — it's the actual amount to record on the order. If Received Amount is not changed from default, existing behaviour is preserved.
5. **Split tab:** One total Received Amount for the entire order, not per split line.
6. **Payload:** Pass `receivedAmount` to `handlePayment()` → transform adds `received_amount` to API call (E-5/E-6).
7. **When setting is OFF:** No input shown, no `received_amount` sent (backend defaults to order_amount).

### UI Placement
- Below the payment method selector, above the Confirm button.
- Input: standard number input with ₹ prefix, 2 decimal places.
- Label: "Received Amount"
- data-testid: `cpp-received-amount-input`

**Verification:** Browser → Collect Payment → input visible on UPI tab when setting ON → enter amount → confirm → network shows `received_amount`.

---

## Phase 1 Verification Matrix

| # | Check | Method | Auto? |
|---|-------|--------|:---:|
| V-1 | Settings: reconcileAmount toggle saves and persists | Browser: Settings page | NO |
| V-2 | CPP: Received Amount input visible on Cash when enabled | Browser: collect payment | NO |
| V-3 | CPP: Received Amount input visible on UPI/Card/Split | Browser: switch payment method | NO |
| V-4 | CPP: Default = grand total (pre-filled) | Browser: open CPP | NO |
| V-5 | CPP: Input hidden when setting = No | Browser: disable toggle, reopen CPP | NO |
| V-6 | CPP: ± 3% validation blocks Confirm | Browser: enter extreme value | NO |
| V-7 | Payload: `received_amount` in `order-bill-payment` | Network tab | NO |
| V-8 | Payload: `received_amount` in prepaid `place-order` | Network tab | NO |
| V-9 | Payload: `received_amount` absent when setting OFF | Network tab | NO |
| V-10 | Compile clean (0 new errors) | webpack | YES |

---

# PHASE 2 — Report Data

## Execution Sequence

```
E-8 (OrderReportBetaPage.jsx)  — add 2 columns + Excel/PDF
── webpack compile check ──
```

---

## E-8 — Add Received Amount + Reconciliation Amount columns to Order Report Beta

**File:** `src/pages/reports-module/OrderReportBetaPage.jsx`
**Type:** Additive (2 new columns in table + export)

### Table Columns

Add after existing amount columns:

| Column Header | Data Key | Format | Color | Position |
|--------------|----------|--------|-------|----------|
| Received | `row.received_amount` (from API, fallback to `order_amount_raw`) | ₹ INR 2dp | Default (zinc) | **After AMOUNT, before GST** |
| Recon | **FE-computed:** `order.receivedAmount - order.orderAmount` (NOT from `api.reconcile_amount` which is a setting echo) | ₹ INR 2dp, **red if negative**, **green if positive** | Conditional | **After RECEIVED, before GST** |

### Visibility
- Columns visible **only when** `restaurant.settings.reconcileAmount === true` (same gate as Phase 1).
- When setting OFF → columns hidden, export omits them.
- **Column position:** After AMOUNT, before GST (owner directive 2026-11-07).

### Excel Export
- **NO FE CHANGE.** Excel is generated by backend endpoint (`/api/v1/vendoremployee/daily-order-report-excel-export-combined`). Backend already includes `received_amount` + `reconcile_amount`.

### PDF Export
- Add 2 columns to PDF table (FE-generated via `handlePdfExport` → `exportReportAsPDF`).
- Conditionally included when `reconcileEnabled` is true.
- Same formatting rules as table.

### Verification

| # | Check | Method | Auto? |
|---|-------|--------|:---:|
| V-11 | Report: Received Amount column visible when setting ON | Browser: Orders Beta | NO |
| V-12 | Report: Reconciliation Amount computed correctly | Browser: check values | NO |
| V-13 | Report: Columns hidden when setting OFF | Browser: disable, refresh | NO |
| V-14 | Excel: 2 new columns in download | Download CSV | NO |
| V-15 | PDF: 2 new columns in print view | Print PDF | NO |
| V-16 | Compile clean (0 new errors) | webpack | YES |

---

## Post-Code Registry Checklist

### After Phase 1:
```
- [ ] registry.json: CR-483 → status: GATE_5A_IMPLEMENTED_PHASE_1
- [ ] BUG_TRACKER.md: not applicable (CR)
- [ ] CR_REGISTRY.md: CR-483 row updated
- [ ] FILE_OWNERSHIP.md: CollectPaymentPanel.jsx, orderTransform.js, profileTransform.js, restaurantSettingsTransform.js, RestaurantSettingsPage.jsx + date + CR-483
- [ ] Code markers: // CR-483 on all modified lines
- [ ] webpack: 0 new warnings/errors
```

### After Phase 2:
```
- [ ] registry.json: CR-483 → status: GATE_5A_IMPLEMENTED
- [ ] FILE_OWNERSHIP.md: OrderReportBetaPage.jsx + date + CR-483
- [ ] Code markers: // CR-483 on all modified lines
- [ ] webpack: 0 new warnings/errors
```

---

## Risk Summary

| Phase | Risk | R5 Files | Financial? | Regression |
|-------|------|----------|:---:|-----------|
| Phase 1 | CRITICAL | CPP (R5), orderTransform (R5) | YES (payment payload) | LOW — additive field, omit = no change |
| Phase 2 | MEDIUM | None | NO (display only) | LOW — additive columns |

## Edge Cases

| Scenario | Expected Behaviour |
|----------|-------------------|
| Setting OFF, user collects payment | No Received Amount field, no `received_amount` in payload, backend saves `order_amount` |
| Setting ON, user doesn't change default | `received_amount = grandTotal` sent, `reconciliation = 0` |
| Received = 0 | Validation blocks (must be > 0) |
| Received > 103% of bill | Validation blocks ("Amount outside ±3% of bill") |
| Received < 97% of bill | Validation blocks |
| Split payment | One Received Amount for the whole order, not per line |
| Prepaid order | `received_amount` sent in `place-order` payload |
| Credit / Pay Later / Room | Same input, same validation, same payload key |

---

## Dependencies

| Dependency | Status |
|-----------|--------|
| Backend `received_amount` in collect-bill payload | ✅ Delivered (handover §4) |
| Backend `received_amount` in place-order payload | ✅ Delivered (handover §4) |
| Backend `reconcile_amount` setting | ✅ Delivered — path: `settings.reconcile_amount` (profile), `basic.reconcile_amount` (settings-list). Probe confirmed 2026-11-07. |
| Backend `received_amount` on order object | ✅ Probe confirmed — order #021109: `received_amount: 13934` (number, ₹) |
| Backend `reconcile_amount` on order object | ⚠️ Probe confirmed — echoes restaurant setting `"No"`, NOT a ₹ difference. FE computes reconciliation. |
| Backend report API columns | ✅ Delivered per investigation (all 3 report APIs return `received_amount`) |
| CR-484 (MDR) | ✅ Subsumed — same field |

**All backend dependencies resolved. Live probe verified 2026-11-07 on cafe103 order #021109. Gate 3 COMPLETE. Awaiting Gate 4 GO.**
