# CR-051 — Customer Field Mandatoriness Override (Visibility Section)

**Status:** IMPLEMENTED (amended 2026-06-18 — 6th toggle: TakeAway Name, default ON)
**Created:** 2026-06-17
**Type:** CR (Change Request)
**Area:** StatusConfigPage (Visibility) + OrderEntry (Validation)
**Priority:** P2
**Sprint:** POS 5.0
**Risk:** MEDIUM (touches validation logic in OrderEntry — hotspot file R5)
**Reporter:** Owner

---

## Amendment Log

| Date | Change |
|------|--------|
| 2026-06-17 | Original CR-051: 5 toggles (Walk-in name/phone, Dine-in name/phone, TakeAway phone) |
| 2026-06-18 | Amendment: +6th toggle TakeAway Name (default ON). Hardcoded check → toggle-controlled. QSR path missing name check added. |

---

## 1. Problem Statement (Owner Verbatim)

> In the visibility section, I want user should be able to override it from the local storage. He should be able to make name or phone number or both mandatory for walk-in and dine-in order. Walk-in separate and dine-in one with table is separate. As well as in takeaway order, phone number is not mandatory — that can also come in visibility section. Both order placement and collect bill should validate — same as delivery checks.

---

## 2. Current Behavior

| Order Type | Name Required | Phone Required | Address Required |
|-----------|:---:|:---:|:---:|
| Walk-in | ❌ No | ❌ No | N/A |
| Dine-in (table) | ❌ No | ❌ No | N/A |
| TakeAway | ✅ Yes | ❌ No | N/A |
| Delivery | ✅ Yes | ✅ Yes | ✅ Yes |

---

## 3. Target Behavior — 6 Toggles

| # | Toggle | Order Type | Default | localStorage Key |
|---|--------|-----------|:-------:|-----------------|
| 1 | Walk-in: Name mandatory | walkIn | OFF | `mygenie_walkin_name_required` |
| 2 | Walk-in: Phone mandatory | walkIn | OFF | `mygenie_walkin_phone_required` |
| 3 | Dine-in: Name mandatory | dineIn | OFF | `mygenie_dinein_name_required` |
| 4 | Dine-in: Phone mandatory | dineIn | OFF | `mygenie_dinein_phone_required` |
| 5 | TakeAway: Name mandatory | takeAway | **ON** | `mygenie_takeaway_name_required` |
| 6 | TakeAway: Phone mandatory | takeAway | OFF | `mygenie_takeaway_phone_required` |

**Scope:** Per-device (localStorage only). No backend sync.

**Enforcement:** Same toast + return pattern as Delivery validation. Blocks at BOTH:
- `handlePlaceOrder` (L888–911)
- Scenario 2 prepaid validation (L1867–1886)
- QSR `handleQsrCollectBill` (L1209 — needs check)

---

## 4. IMPACT ANALYSIS (Gate 2)

### 4.1 Code Reality Check
```bash
grep -rn "walkin_name_required\|dinein_name_required\|takeaway_phone" /app/frontend/src/
```
**Result:** NONE — no existing code. This is greenfield.

### 4.2 Files Affected

| # | File | Lines | Change | Risk |
|---|------|-------|--------|------|
| 1 | `pages/StatusConfigPage.jsx` | ~1639 | +5 toggle states, +5 hydrate on mount, +5 persist on save, +5 reset on defaults, +UI section (~80 lines JSX) | LOW — additive UI, no existing logic touched |
| 2 | `components/order-entry/OrderEntry.jsx` | ~2679 | +validation blocks at 3 sites (L893, L1869, L1209 QSR) reading localStorage | **MEDIUM — R5 hotspot file** |

**Total: 2 files. ~120 lines added. 0 lines modified.**

### 4.3 Validation Sites in OrderEntry.jsx

There are **3 validation sites** that need the new checks:

| # | Site | Line | Flow | Current Checks |
|---|------|------|------|---------------|
| V1 | `handlePlaceOrder` | L893–911 | Postpaid place order | TakeAway name, Delivery name+phone+address |
| V2 | Scenario 2 prepaid | L1869–1886 | Prepaid place+pay | Same as V1 (duplicated block) |
| V3 | QSR `handleQsrCollectBill` | L1209 | QSR quick billing | Needs investigation — may not have validation |

**Pattern to follow (from Delivery at L898–911):**
```js
if (orderType === 'walkIn') {
  const nameReq = localStorage.getItem('mygenie_walkin_name_required') === 'true';
  const phoneReq = localStorage.getItem('mygenie_walkin_phone_required') === 'true';
  if (nameReq && !customer?.name?.trim()) {
    toast({ title: "Name Required", description: "Customer name is mandatory for Walk-in orders", variant: "destructive" });
    return;
  }
  if (phoneReq && !customer?.phone?.trim()) {
    toast({ title: "Phone Required", description: "Customer phone is mandatory for Walk-in orders", variant: "destructive" });
    return;
  }
}
```

### 4.4 StatusConfigPage.jsx — UI Placement

New toggles go in the **UI Elements** section (L727+), after the existing Auto Settle toggle (~L920). Grouped as a new sub-section:

```
UI Elements
├── Order Taking (existing)
├── Stay on Order Entry After Collect Bill (existing)
├── QSR Quick Billing (existing)
│   └── QSR Discount (existing, nested)
├── Auto Settle (existing)
├── Weight Entry Prompt (existing)
└── ★ NEW: Customer Field Requirements
    ├── Walk-in: Name mandatory [toggle]
    ├── Walk-in: Phone mandatory [toggle]
    ├── Dine-in: Name mandatory [toggle]
    ├── Dine-in: Phone mandatory [toggle]
    └── TakeAway: Phone mandatory [toggle]
```

### 4.5 Conflict Pre-Check

| File | Last Modified By | Open CRs? |
|------|-----------------|-----------|
| `StatusConfigPage.jsx` | CR-024 agent (2026-06-10) | None |
| `OrderEntry.jsx` | CR-037 agent (2026-06-13) | None on validation blocks |

**Conflict: NONE.**

---

## 5. IMPLEMENTATION PLAN (Gate 3)

### Step 1: Add localStorage keys + state in StatusConfigPage.jsx

**Add constants (after L70):**
```js
// CR-051: Customer field mandatoriness overrides
const WALKIN_NAME_REQ_KEY = 'mygenie_walkin_name_required';
const WALKIN_PHONE_REQ_KEY = 'mygenie_walkin_phone_required';
const DINEIN_NAME_REQ_KEY = 'mygenie_dinein_name_required';
const DINEIN_PHONE_REQ_KEY = 'mygenie_dinein_phone_required';
const TAKEAWAY_PHONE_REQ_KEY = 'mygenie_takeaway_phone_required';
```

**Add state (after L201):**
```js
// CR-051: Customer field mandatoriness states
const [walkinNameReq, setWalkinNameReq] = useState(false);
const [walkinPhoneReq, setWalkinPhoneReq] = useState(false);
const [dineinNameReq, setDineinNameReq] = useState(false);
const [dineinPhoneReq, setDineinPhoneReq] = useState(false);
const [takeawayPhoneReq, setTakeawayPhoneReq] = useState(false);
```

### Step 2: Hydrate from localStorage on mount

**Add in useEffect (after L334):**
```js
// CR-051: hydrate customer field requirements
try {
  setWalkinNameReq(localStorage.getItem(WALKIN_NAME_REQ_KEY) === 'true');
  setWalkinPhoneReq(localStorage.getItem(WALKIN_PHONE_REQ_KEY) === 'true');
  setDineinNameReq(localStorage.getItem(DINEIN_NAME_REQ_KEY) === 'true');
  setDineinPhoneReq(localStorage.getItem(DINEIN_PHONE_REQ_KEY) === 'true');
  setTakeawayPhoneReq(localStorage.getItem(TAKEAWAY_PHONE_REQ_KEY) === 'true');
} catch (e) { console.error('Failed to read customer field requirements:', e); }
```

### Step 3: Persist on save

**Add in `saveConfiguration` (after L518):**
```js
// CR-051: persist customer field requirements
localStorage.setItem(WALKIN_NAME_REQ_KEY, walkinNameReq ? 'true' : 'false');
localStorage.setItem(WALKIN_PHONE_REQ_KEY, walkinPhoneReq ? 'true' : 'false');
localStorage.setItem(DINEIN_NAME_REQ_KEY, dineinNameReq ? 'true' : 'false');
localStorage.setItem(DINEIN_PHONE_REQ_KEY, dineinPhoneReq ? 'true' : 'false');
localStorage.setItem(TAKEAWAY_PHONE_REQ_KEY, takeawayPhoneReq ? 'true' : 'false');
```

### Step 4: Reset to defaults

**Add in resetToDefaults (after L395):**
```js
// CR-051: reset customer field requirements
setWalkinNameReq(false);
setWalkinPhoneReq(false);
setDineinNameReq(false);
setDineinPhoneReq(false);
setTakeawayPhoneReq(false);
```

### Step 5: Add UI section in JSX

**After Auto Settle / Weight Entry Prompt section (~L950+), add a new "Customer Field Requirements" sub-section:**

Grouped card with header "Customer Field Requirements" containing 5 toggles:
- Group 1: **Walk-in Orders** — Name mandatory + Phone mandatory
- Group 2: **Dine-in Orders** — Name mandatory + Phone mandatory
- Group 3: **TakeAway Orders** — Phone mandatory

Each toggle follows the exact same JSX pattern as the QSR toggle (L831–873).

**Est: ~80 lines JSX.**

### Step 6: Add validation in OrderEntry.jsx

**Helper function (add near top of component, ~L55):**
```js
// CR-051: Read customer field mandatoriness from localStorage
const getFieldRequirements = () => ({
  walkinName: localStorage.getItem('mygenie_walkin_name_required') === 'true',
  walkinPhone: localStorage.getItem('mygenie_walkin_phone_required') === 'true',
  dineinName: localStorage.getItem('mygenie_dinein_name_required') === 'true',
  dineinPhone: localStorage.getItem('mygenie_dinein_phone_required') === 'true',
  takeawayPhone: localStorage.getItem('mygenie_takeaway_phone_required') === 'true',
});
```

**Validation block (insert BEFORE existing TakeAway check at L893, and duplicate at L1869 and QSR path):**
```js
// CR-051: Customer field mandatoriness overrides
const reqs = getFieldRequirements();
if (orderType === 'walkIn') {
  if (reqs.walkinName && !customer?.name?.trim()) {
    toast({ title: "Name Required", description: "Customer name is mandatory for Walk-in orders", variant: "destructive" });
    return;
  }
  if (reqs.walkinPhone && !customer?.phone?.trim()) {
    toast({ title: "Phone Required", description: "Customer phone is mandatory for Walk-in orders", variant: "destructive" });
    return;
  }
}
if (orderType === 'dineIn') {
  if (reqs.dineinName && !customer?.name?.trim()) {
    toast({ title: "Name Required", description: "Customer name is mandatory for Dine-in orders", variant: "destructive" });
    return;
  }
  if (reqs.dineinPhone && !customer?.phone?.trim()) {
    toast({ title: "Phone Required", description: "Customer phone is mandatory for Dine-in orders", variant: "destructive" });
    return;
  }
}
if (orderType === 'takeAway' && reqs.takeawayPhone && !customer?.phone?.trim()) {
  toast({ title: "Phone Required", description: "Customer phone is mandatory for TakeAway orders", variant: "destructive" });
  return;
}
```

**3 insertion sites:**
1. `handlePlaceOrder` — before L893
2. Scenario 2 prepaid — before L1869
3. QSR `handleQsrCollectBill` — before the payload builder (~L1220)

---

## 6. VERIFICATION MATRIX

| # | Test | Steps | Expected |
|---|------|-------|----------|
| V1 | Walk-in Name OFF → place order without name | Settings: Walk-in Name OFF → Walk-in order → no name → Place | ✅ Allowed |
| V2 | Walk-in Name ON → block without name | Settings: Walk-in Name ON → Walk-in order → no name → Place | ❌ Blocked + toast |
| V3 | Walk-in Phone ON → block without phone | Settings: Walk-in Phone ON → Walk-in order → no phone → Place | ❌ Blocked + toast |
| V4 | Dine-in Name ON → block without name | Settings: Dine-in Name ON → Table order → no name → Place | ❌ Blocked + toast |
| V5 | Dine-in Phone ON → block without phone | Settings: Dine-in Phone ON → Table order → no phone → Place | ❌ Blocked + toast |
|| **V5a** | TakeAway Name ON (default) → block without name | Default state → TakeAway → no name → Place | ❌ Blocked + toast |
|| **V5b** | TakeAway Name OFF → allow without name | Settings: TakeAway Name OFF → TakeAway → no name → Place | ✅ Allowed |
| V6 | TakeAway Phone ON → block without phone | Settings: TakeAway Phone ON → TakeAway → no phone → Place | ❌ Blocked + toast |
| V7 | Delivery unchanged | Delivery → still requires name+phone+address regardless of toggles | ✅ No change |
| V8 | Prepaid path validates same as postpaid | Enable toggles → prepaid flow → same blocks | ❌ Blocked + toast |
| V9 | QSR path validates | Enable toggles → QSR quick billing → same blocks | ❌ Blocked + toast |
| V10 | Settings persist after reload | Enable toggles → Save → reload page → toggles still ON | ✅ Persisted |
| V11 | Reset to Defaults clears | Enable toggles → Reset → all OFF | ✅ All OFF |

---

## 7. SCOPE LOCK

**Files WILL change:**

| # | File | Action | Est. Lines |
|---|------|--------|:---:|
| 1 | `pages/StatusConfigPage.jsx` | +6 keys, +6 states, +hydrate, +save, +reset, +UI section | +110 |
| 2 | `components/order-entry/OrderEntry.jsx` | +helper fn, +validation at 3 sites (6 toggles each) | +45 |

**Files WILL NOT touch:**

| File | Reason |
|------|--------|
| `CollectPaymentPanel.jsx` | Validation is in OrderEntry, not in payment panel |
| `CartPanel.jsx` | No validation responsibility |
| `DashboardPage.jsx` | No customer field logic |
| Any API/transform | localStorage only, no API changes |

**Total: 2 files, ~155 lines added, ~2 lines modified.**

---

## 8. RISK REGISTER

| ID | Risk | Severity | Mitigation |
|----|------|----------|------------|
| R1 | `OrderEntry.jsx` is R5 hotspot | MEDIUM | Only additive validation blocks before existing code. Zero modification to existing logic. |
| R2 | localStorage read on every Place Order call (performance) | LOW | `localStorage.getItem` is synchronous and sub-ms. 5 reads = negligible. |
| R3 | User clears localStorage → toggles reset to OFF | LOW | Expected behavior — per-device, non-critical. Default OFF = current behavior. |
| R4 | `orderType` value for walk-in might be 'walkIn' or 'walk_in' | MEDIUM | Verify against existing code. Current delivery check uses `orderType === 'delivery'`, takeaway uses `orderType === 'takeAway'`. Must verify walk-in/dine-in literals. |

---

## 9. GATE STATUS

| Gate | Status |
|------|--------|
| 0 — Registration | ✅ COMPLETE |
| 1 — Intake | ✅ COMPLETE |
| 2 — Impact Analysis | ✅ COMPLETE |
| 3 — Implementation Plan | ✅ COMPLETE |
| 4 — Code Gate / Owner GO | ✅ COMPLETE |
| 5 — Implementation | ✅ COMPLETE (2026-06-18, amended with 6th toggle) |
| 6 — Owner Smoke | ⏳ PENDING |

---

*CR-051 — Customer Field Mandatoriness Override — 2026-06-18. Gates 0-5 COMPLETE. 2 files, ~155 lines. 6 toggles (amended from 5). TakeAway Name default ON. Awaiting owner smoke.*
