# CR-536 — Implementation Plan (Gate 3)

**Date:** 2026-11-18
**Agent role:** PLANNING
**Stage:** Gate 3 — Implementation Plan
**IA:** `memory/impact/CR-536_IMPACT_ANALYSIS.md` (Gate 2 + Gate 2.5 approved)
**Risk:** CRITICAL (tax invoice / print / financial document)
**IA verified at HEAD:** YES (same session — all target lines confirmed)

**Owner decisions locked:** OD-536-A (address), OD-536-B (no UPI), OD-536-C (pre-fill, editable)
**API contract locked:** `contracts/BATCH-B_CR-536_API_CONTRACT_2026_11_15.md`

---

## 1. Scope Lock

### Phase A — FE-only (ship now, no backend dependency)
**Files WILL change:**
- `src/components/order-entry/CollectPaymentPanel.jsx` — E1, E2, E3, E4a, E4b
- `src/api/transforms/orderTransform.js` — E5 (3 sites)
- `src/components/order-entry/OrderEntry.jsx` — E6 (5 sites)

### Phase B — activates on BB-10b sign-off (~4 lines, write now, wire later)
**Files WILL change:**
- `src/api/transforms/customerTransform.js` — E7
- `src/components/order-entry/CollectPaymentPanel.jsx` — E8

**Files WILL NOT touch:**
- `CartPanel.jsx` · `ItemCustomizationModal.jsx` · any socket/context/service/report file
- `customerService.js` — no change (lookup endpoint unchanged)

**Payload change:** YES — `custGSTAddress` added to `order-bill-payment` + `place-order` (empty string until BB-10 ships; backend ignores unknown fields)
**Backend change:** BB-10 (order APIs) + BB-10b (customer profile) — both additive, no behaviour change until Gyan delivers

---

## 2. Exact Edits

---

### Edit E1 — CPP: Add `custGSTAddress` state

**File:** `CollectPaymentPanel.jsx`
**Location:** L563 — after `custGSTName` state
**Action:** INSERT 1 line

```
CURRENT (L561-564):
  // CR-116: B2B customer GST info
  const [custGST, setCustGST] = useState("");
  const [custGSTName, setCustGSTName] = useState("");

NEW:
  // CR-116: B2B customer GST info
  const [custGST, setCustGST] = useState("");
  const [custGSTName, setCustGSTName] = useState("");
  const [custGSTAddress, setCustGSTAddress] = useState(""); // CR-536: billing address
```

**Verify:** `grep -n "custGSTAddress" CollectPaymentPanel.jsx` → hits at E1 state + E2 UI + E4a + E4b

---

### Edit E2 — CPP: Add Billing Address input (full-width, below GST grid)

**File:** `CollectPaymentPanel.jsx`
**Location:** L3428-3448 — B2B GST section
**Action:** REPLACE entire B2B section div (add address row below 2-col grid)

```
CURRENT (L3428-3448):
          {/* CR-116: B2B Customer GST Information */}
          <div className="mt-3 pt-3 border-t" style={{ borderColor: COLORS.borderGray }} data-testid="b2b-gst-section">
            <div className="text-xs mb-2 font-medium" style={{ color: COLORS.grayText }}>B2B Invoice (Optional)</div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <input value={custGST} onChange={e => setCustGST(e.target.value)}
                  placeholder="GST Number"
                  className="w-full h-8 text-xs border rounded-md px-2 outline-none focus:ring-1"
                  style={{ borderColor: COLORS.borderGray, color: COLORS.primaryText }}
                  data-testid="collect-bill-cust-gst" />
              </div>
              <div>
                <input value={custGSTName} onChange={e => setCustGSTName(e.target.value)}
                  placeholder="GST Registered Name"
                  className="w-full h-8 text-xs border rounded-md px-2 outline-none focus:ring-1"
                  style={{ borderColor: COLORS.borderGray, color: COLORS.primaryText }}
                  data-testid="collect-bill-cust-gst-name" />
              </div>
            </div>
          </div>

NEW:
          {/* CR-116 + CR-536: B2B Customer GST Information */}
          <div className="mt-3 pt-3 border-t" style={{ borderColor: COLORS.borderGray }} data-testid="b2b-gst-section">
            <div className="text-xs mb-2 font-medium" style={{ color: COLORS.grayText }}>B2B Invoice (Optional)</div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <input value={custGST} onChange={e => setCustGST(e.target.value)}
                  placeholder="GST Number"
                  className="w-full h-8 text-xs border rounded-md px-2 outline-none focus:ring-1"
                  style={{ borderColor: COLORS.borderGray, color: COLORS.primaryText }}
                  data-testid="collect-bill-cust-gst" />
              </div>
              <div>
                <input value={custGSTName} onChange={e => setCustGSTName(e.target.value)}
                  placeholder="GST Registered Name"
                  className="w-full h-8 text-xs border rounded-md px-2 outline-none focus:ring-1"
                  style={{ borderColor: COLORS.borderGray, color: COLORS.primaryText }}
                  data-testid="collect-bill-cust-gst-name" />
              </div>
            </div>
            {/* CR-536: Billing Address — full width below GST no./name */}
            <div className="mt-2">
              <input value={custGSTAddress} onChange={e => setCustGSTAddress(e.target.value)}
                placeholder="Billing Address (for GST invoice)"
                className="w-full h-8 text-xs border rounded-md px-2 outline-none focus:ring-1"
                style={{ borderColor: COLORS.borderGray, color: COLORS.primaryText }}
                data-testid="collect-bill-cust-gst-address" />
            </div>
          </div>
```

**Verify:** `grep -n "cust-gst-address\|custGSTAddress" CollectPaymentPanel.jsx` → hits at E1 state + E2 input + E4a + E4b

---

### Edit E3 — CPP: Pre-fill custGST + custGSTName from lookupCustomer result

**File:** `CollectPaymentPanel.jsx`
**Location:** L641-645 — inside `lookupCustomer` `.then((found) => { ... })` callback
**Action:** INSERT 2 lines after `setTabCrmId(found.id)`

```
CURRENT (L641-648):
          if (found?.id) {
            setTabCrmId(found.id);
            if (tabAutoSelectedPhoneRef.current !== tabPhone) { // BUG-660 OD-660-01: phone match = selected, keep typed name
              tabAutoSelectedPhoneRef.current = tabPhone;
              setTabIsCustomerSelected(true);
            }

NEW:
          if (found?.id) {
            setTabCrmId(found.id);
            if (found.gstNumber) setCustGST(found.gstNumber);     // CR-536: pre-fill from CRM (OD-536-C)
            if (found.gstName)   setCustGSTName(found.gstName);   // CR-536: pre-fill from CRM (OD-536-C)
            if (tabAutoSelectedPhoneRef.current !== tabPhone) { // BUG-660 OD-660-01: phone match = selected, keep typed name
              tabAutoSelectedPhoneRef.current = tabPhone;
              setTabIsCustomerSelected(true);
            }
```

**Why:** `found` is the result of `customerTransform.fromAPI.customerLookup` which already maps `api.gst_number` → `gstNumber` and `api.gst_name` → `gstName` (confirmed L105-106). Fields stay editable — cashier can override.

**Verify:** `grep -n "setCustGST\|setCustGSTName\|CR-536" CollectPaymentPanel.jsx` → hits at E1, E3, E4a, E4b

---

### Edit E4a — CPP: Add `custGSTAddress` to payment data

**File:** `CollectPaymentPanel.jsx`
**Location:** L1347-1348 — after `custGSTName` in payment data object
**Action:** INSERT 1 line

```
CURRENT (L1347-1348):
      custGST,          // CR-116: B2B GST number
      custGSTName,       // CR-116: B2B GST registered name

NEW:
      custGST,          // CR-116: B2B GST number
      custGSTName,       // CR-116: B2B GST registered name
      custGSTAddress,   // CR-536: B2B billing address
```

---

### Edit E4b — CPP: Add `custGSTAddress` to print data

**File:** `CollectPaymentPanel.jsx`
**Location:** L1420-1421 — after `custGSTName` in print overrides
**Action:** INSERT 1 line

```
CURRENT (L1420-1421):
        custGST,          // CR-116: B2B GST number for print
        custGSTName,       // CR-116: B2B GST registered name for print

NEW:
        custGST,          // CR-116: B2B GST number for print
        custGSTName,       // CR-116: B2B GST registered name for print
        custGSTAddress,   // CR-536: B2B billing address for print
```

---

### Edit E5 — orderTransform.js: Add `custGSTAddress` at 3 payload sites

**File:** `orderTransform.js`

**E5a — Destructuring (L1557-1558):**

```
CURRENT (L1557-1558):
      custGST     = '',
      custGSTName = '',

NEW:
      custGST        = '',
      custGSTName    = '',
      custGSTAddress = '', // CR-536
```

**E5b — collectBillExisting payload (L1792-1793):**

```
CURRENT (L1792-1793):
      custGST,
      custGSTName,

NEW:
      custGST,
      custGSTName,
      custGSTAddress, // CR-536
```

**E5c — print overrides (L2234-2235):**

```
CURRENT (L2234-2235):
      custGSTName: overrides.custGSTName || '',  // CR-116: B2B customer GST name
      custGST: overrides.custGST || '',          // CR-116: B2B customer GST number

NEW:
      custGSTName:    overrides.custGSTName    || '',  // CR-116: B2B customer GST name
      custGST:        overrides.custGST        || '',  // CR-116: B2B customer GST number
      custGSTAddress: overrides.custGSTAddress || '',  // CR-536: B2B billing address
```

**Verify:** `grep -n "custGSTAddress" orderTransform.js` → 3 hits (E5a + E5b + E5c)

---

### Edit E6 — OrderEntry.jsx: Forward `custGSTAddress` at 5 print sites

**File:** `OrderEntry.jsx`
**Pattern:** Each site has `custGST: ... // BUG-281` and `custGSTName: ... // BUG-281` on consecutive lines. INSERT 1 line after each `custGSTName` line.

**E6-1 (L1806):**
```
CURRENT:
                  custGST:             paymentData?.custGST     || '',  // BUG-281
                  custGSTName:         paymentData?.custGSTName || '',  // BUG-281

NEW:
                  custGST:             paymentData?.custGST        || '',  // BUG-281
                  custGSTName:         paymentData?.custGSTName    || '',  // BUG-281
                  custGSTAddress:      paymentData?.custGSTAddress || '',  // CR-536
```

Apply the same pattern at all 5 sites (L1805-6, L1850-1, L1930-1, L2383-4, L2673-4).

**Verify:** `grep -n "custGSTAddress" OrderEntry.jsx` → 5 hits

---

## 3. Phase B Edits (write now — activate on BB-10b sign-off)

---

### Edit E7 — customerTransform.js: Map `gst_address` from CRM profile

**File:** `customerTransform.js`
**Location:** L106 — after `gstNumber` mapping
**Action:** INSERT 1 line (at all 3 `fromAPI` shapes: search result L67, customerDetail L106, customerLookup L148)

```
CURRENT (L105-107):
    gstName:       api.gst_name || null,
    gstNumber:     api.gst_number || null,
    documents:     api.documents || {},

NEW:
    gstName:       api.gst_name    || null,
    gstNumber:     api.gst_number  || null,
    gstAddress:    api.gst_address || null,  // CR-536 Phase B (BB-10b)
    documents:     api.documents   || {},
```

Apply same insertion at L66-67 (search result) and L147-148 (lookup) for consistency.

---

### Edit E8 — CPP: Pre-fill address from CRM (activates once E7 is live)

**File:** `CollectPaymentPanel.jsx`
**Location:** E3 block — after the `setCustGSTName` line added in E3
**Action:** INSERT 1 line

```
NEW (after E3's setCustGSTName line):
            if (found.gstAddress) setCustGSTAddress(found.gstAddress); // CR-536 Phase B (BB-10b)
```

**Note:** E8 is a no-op until E7 ships because `found.gstAddress` will always be `null/undefined` until `customerTransform` maps it. Safe to include in Phase A commit.

---

## 4. Execution Sequence

```
Phase A (ship now):
1. E1  — CPP: +custGSTAddress state
2. E2  — CPP: +address input in B2B section
3. E3  — CPP: +pre-fill custGST/custGSTName in lookupCustomer callback
4. E4a — CPP: +custGSTAddress in payment data
5. E4b — CPP: +custGSTAddress in print data
   → Webpack check 1 (after CPP)
6. E5a — orderTransform.js: destructuring
7. E5b — orderTransform.js: payload
8. E5c — orderTransform.js: print overrides
   → Webpack check 2 (after orderTransform)
9. E6  — OrderEntry.jsx: 5 print sites (identical 1-liner each)
   → Webpack check 3 (final)

Phase B (write in same commit, activates on BB-10b):
10. E7 — customerTransform.js: +gstAddress at 3 fromAPI shapes
11. E8 — CPP: +pre-fill setCustGSTAddress in lookupCustomer callback
    (no-op until BB-10b delivers — safe to ship now)
```

---

## 5. Verification Matrix

| # | Edit | File | Verification | Auto? |
|---|------|------|-------------|:---:|
| V1 | E1 | CPP | `grep -n "custGSTAddress" CollectPaymentPanel.jsx` → state at top | YES |
| V2 | E2 | CPP | `grep -n "cust-gst-address" CollectPaymentPanel.jsx` → 1 hit | YES |
| V3 | E3 | CPP | `grep -n "setCustGST\b" CollectPaymentPanel.jsx` → hits at E1 init + E3 pre-fill | YES |
| V4 | E4a | CPP | `grep -n "custGSTAddress" CollectPaymentPanel.jsx` → payment data hit | YES |
| V5 | E4b | CPP | `grep -n "custGSTAddress" CollectPaymentPanel.jsx` → print data hit | YES |
| V6 | E5 | orderTransform.js | `grep -n "custGSTAddress" orderTransform.js` → 3 hits | YES |
| V7 | E6 | OrderEntry.jsx | `grep -n "custGSTAddress" OrderEntry.jsx` → 5 hits | YES |
| V8 | E7+E8 | customerTransform.js + CPP | `grep -n "gstAddress\|gst_address" customerTransform.js` → 3 hits | YES |
| V9 | — | Browser | Credit/TAB payment: type phone → address field visible below GST fields | NO |
| V10 | — | Browser | Select existing B2B customer → GST no. + name pre-filled | NO |
| V11 | — | Browser | Type billing address → included in payload (`custGSTAddress` in network tab) | NO |
| V12 | — | Browser (Phase B) | Select customer with `gst_address` → address pre-fills | NO |
| V13 | — | Webpack | `tail frontend.out.log` → 0 new warnings | YES |

---

## 6. Post-Code Registry Checklist (EXIT GATE)

```
- [ ] registry.json: CR-536 → status: IMPLEMENTED, sprint_key: nov_cr_batch
- [ ] CR_REGISTRY.md: row updated to IMPLEMENTED
- [ ] FILE_OWNERSHIP.md: CollectPaymentPanel.jsx · orderTransform.js · OrderEntry.jsx · customerTransform.js
- [ ] Code markers: // CR-536 in every modified block
- [ ] Webpack compiles with 0 new warnings
```

---

## 7. Risk Register

| # | Risk | Mitigation |
|---|------|-----------|
| R1 | `custGSTAddress` in payload before BB-10 — backend rejects unknown field | All known backends ignore unknown fields (`order-bill-payment` / `place-order`). No regression. |
| R2 | Pre-fill overwrites cashier's manual GST entry | E3 guard: `if (found.gstNumber) setCustGST(...)` — only pre-fills when CRM has the data. Fields stay editable. |
| R3 | Phase B E8 fires before E7 (customerTransform) is deployed | `found.gstAddress` will be `null/undefined` → `if (found.gstAddress)` guard prevents empty overwrite. No-op. |
| R4 | `custGSTAddress` forwarded at 5 OrderEntry print sites — 1 missed | Use grep after E6 to confirm exactly 5 hits. |
| R5 | CPP `primaryText` colour undefined | Existing inputs use same colour — if undefined, falls back gracefully. |

---

```
Planning complete: CR-536
Stage: Implementation Plan (Gate 3)
Code reality: PARTIAL (CR-116 GST no./name exists; address is new)
Risk: CRITICAL
Phase A — FE only: CollectPaymentPanel.jsx (5 edits) · orderTransform.js (3 sites) · OrderEntry.jsx (5 sites)
Phase B — BB-10b: customerTransform.js (3 sites) · CollectPaymentPanel.jsx (1 line)
Total: ~30 lines net across 4 files
Execution: E1→E5 → E6 → E7→E8 (3 webpack checkpoints)
Verification matrix: 13 checks (8 automated, 5 browser)
BB-10 activation: ZERO additional FE code — payload already includes field
BB-10b activation: E7+E8 (4 lines) — safe to ship in Phase A as no-op
Docs: memory/plans/CR-536_IMPLEMENTATION_PLAN_2026_11_18.md
Next: Gate 4 GO → Implementation
```
