# BUG-294 — Implementation Plan (Gate 3)

**ID:** BUG-294
**Date:** 2026-08-05
**Agent:** PLANNING (Gate 3 — Implementation Plan)
**Impact Analysis:** `impact/BUG-294_IMPACT_ANALYSIS.md` — verified accurate, no line drift
**Conflict Pre-Check:** CLEAR

---

## Step 0 — Code Reality Verification

Lines verified against live file at `components/order-entry/CustomerModal.jsx`:

| Claim | Verified |
|---|---|
| L284: `await updateCustomer(...)` — no inner try/catch | ✅ CONFIRMED |
| L307: `await lookupCustomer(phone.trim())` — inner catch partial (CRM_TIMEOUT only) | ✅ CONFIRMED |
| L319: `throw lookupErr` — re-throws non-timeout errors | ✅ CONFIRMED |
| L339: `await updateCustomer(...)` — no inner try/catch | ✅ CONFIRMED |
| L347: `await createCustomer(...)` — no inner try/catch | ✅ CONFIRMED |
| L379: outer catch → `setError('Failed to save customer')` | ✅ CONFIRMED |

**Additional finding from probe:** `customerService.js:lookupCustomer` already catches all non-timeout errors and returns `null` — so `throw lookupErr` at L319 is **dead code** in the current implementation. The fix is still required for defensive correctness and future-proofing.

---

## Step 1 — Conflict Pre-Check

| File | Last modifier | Active conflict? |
|---|---|---|
| `CustomerModal.jsx` | BUG-108/CR-002 (CLOSED, POS 3.0 era) | **NONE** |

---

## Step 2 — Execution Sequence

Single file, 4 edits. Execute in order (earlier edits shift line numbers — search by string, not line number).

**Order:** Edit 1 → Edit 2 → Edit 3 → Edit 4

---

## Edit 1 — L284: Wrap Branch 1 `updateCustomer` (existing CRM customer)

**File:** `components/order-entry/CustomerModal.jsx`
**What:** Wrap `await updateCustomer(...)` inside Branch 1 in non-blocking try/catch

**Current code (L283–302):**
```js
      if (customerId && !customerId.startsWith('CUST-')) {
        // Existing CRM customer — update
        await updateCustomer(customerId, {
          name: name.trim(),
          phone: phone.trim(),
          dob: birthday || undefined,
          anniversary: anniversary || undefined,
        }, restaurantId);
        // BUG-108 Loyalty Pipeline Fix: existing CRM customer selected via
        // the member-search typeahead carries loyalty fields on initialData /
        // the upstream search result. Use those directly when
        // `selectedCRMCustomer` hasn't already captured them above.
        if (!crmLoyaltyFields && initialData) {
          crmLoyaltyFields = {
            tier:          initialData.tier,
            totalPoints:   initialData.totalPoints,
            pointsValue:   initialData.pointsValue,
            walletBalance: initialData.walletBalance,
            loyalty:       initialData.loyalty,
          };
        }
      } else {
```

**New code:**
```js
      if (customerId && !customerId.startsWith('CUST-')) {
        // Existing CRM customer — update
        // BUG-294: non-blocking CRM update (matching BUG-092 pattern in RoomCheckInModal)
        try {
          await updateCustomer(customerId, {
            name: name.trim(),
            phone: phone.trim(),
            dob: birthday || undefined,
            anniversary: anniversary || undefined,
          }, restaurantId);
        } catch (crmErr) {
          console.warn('[CustomerModal] BUG-294: CRM update failed, proceeding without sync:', crmErr);
        }
        // BUG-108 Loyalty Pipeline Fix: existing CRM customer selected via
        // the member-search typeahead carries loyalty fields on initialData /
        // the upstream search result. Use those directly when
        // `selectedCRMCustomer` hasn't already captured them above.
        if (!crmLoyaltyFields && initialData) {
          crmLoyaltyFields = {
            tier:          initialData.tier,
            totalPoints:   initialData.totalPoints,
            pointsValue:   initialData.pointsValue,
            walletBalance: initialData.walletBalance,
            loyalty:       initialData.loyalty,
          };
        }
      } else {
```

**Net change:** +4 lines

---

## Edit 2 — L319: Remove re-throw of non-timeout CRM lookup error

**File:** `components/order-entry/CustomerModal.jsx`
**What:** Change `throw lookupErr` to `console.warn` — makes ALL CRM lookup errors non-blocking

**Note:** `lookupCustomer` in `customerService.js` already catches non-timeout errors and returns `null`. This `throw` is dead code in current implementation but could become active if `lookupCustomer` is changed. Fixing defensively.

**Current code (L317–321):**
```js
          } else {
            throw lookupErr; // Re-throw unexpected errors to outer catch at L113
          }
```

**New code:**
```js
          } else {
            // BUG-294: non-blocking — 401/5xx CRM errors are non-fatal (matching BUG-092)
            console.warn('[CustomerModal] BUG-294: CRM lookup failed, proceeding:', lookupErr);
            // existing stays null — falls through to createCustomer path below
          }
```

**Net change:** +1 line, -1 line = 0 net

---

## Edit 3 — L339: Wrap Branch 2 `updateCustomer` (phone already in CRM)

**File:** `components/order-entry/CustomerModal.jsx`
**What:** Wrap `await updateCustomer(...)` inside `if (existing)` block in try/catch

**Current code (L339–344):**
```js
          await updateCustomer(customerId, {
            name: name.trim(),
            phone: phone.trim(),
            dob: birthday || undefined,
            anniversary: anniversary || undefined,
          }, restaurantId);
```

**New code:**
```js
          // BUG-294: non-blocking CRM update (phone already registered)
          try {
            await updateCustomer(customerId, {
              name: name.trim(),
              phone: phone.trim(),
              dob: birthday || undefined,
              anniversary: anniversary || undefined,
            }, restaurantId);
          } catch (crmErr) {
            console.warn('[CustomerModal] BUG-294: CRM update (existing phone) failed, proceeding:', crmErr);
          }
```

**Net change:** +4 lines

---

## Edit 4 — L347: Wrap `createCustomer` with local-ID fallback

**File:** `components/order-entry/CustomerModal.jsx`
**What:** Wrap `await createCustomer(...)` in try/catch; on failure generate `CUST-{timestamp}` local ID

**Current code (L346–360):**
```js
        } else {
          // Truly new customer — create in CRM
          const result = await createCustomer({
            name: name.trim(),
            phone: phone.trim(),
            dob: birthday || undefined,
            anniversary: anniversary || undefined,
          }, restaurantId);

          if (result?.existing) {
            // Duplicate phone — CRM returned existing customer
            customerId = result.customer_id;
          } else {
            customerId = result?.customer_id || `CUST-${Date.now()}`;
          }
        }
```

**New code:**
```js
        } else {
          // Truly new customer — create in CRM
          // BUG-294: non-blocking CRM create with local-id fallback
          try {
            const result = await createCustomer({
              name: name.trim(),
              phone: phone.trim(),
              dob: birthday || undefined,
              anniversary: anniversary || undefined,
            }, restaurantId);
            if (result?.existing) {
              customerId = result.customer_id;
            } else {
              customerId = result?.customer_id || `CUST-${Date.now()}`;
            }
          } catch (crmErr) {
            console.warn('[CustomerModal] BUG-294: CRM create failed, proceeding with local id:', crmErr);
            customerId = `CUST-${Date.now()}`;
          }
        }
```

**Net change:** +5 lines

---

## Step 3 — Risk Register

| Risk | Likelihood | Mitigation |
|---|---|---|
| Regression: CRM_TIMEOUT toast disappears | LOW | Toast is in the inner catch at L309-317 which is UNTOUCHED. Only L319 changes. |
| Regression: Happy path (CRM working) breaks | VERY LOW | try/catch only adds catch branch; success path is unchanged |
| Local `CUST-{ts}` id leaks to POS backend | ALREADY EXISTS | L358 already generates `CUST-${Date.now()}` on `result?.customer_id` absence — pattern is established |
| Outer catch becomes unreachable | NO | Outer catch still handles non-CRM errors (JWT expired, network, JS exceptions) |

---

## Step 4 — Verification Matrix

| # | Edit | File | How to Verify | Automated? |
|---|---|---|---|:---:|
| V1 | Edit 1 — Branch 1 updateCustomer | CustomerModal.jsx | Mock `updateCustomer` to throw 401; open modal with existing memberId; click Save → modal closes, `onSave` called | YES (unit) |
| V2 | Edit 2 — lookupErr warn (dead code) | CustomerModal.jsx | Mock `lookupCustomer` to throw `{type: 'OTHER'}`; Save → modal closes (no block) | YES (unit) |
| V3 | Edit 3 — Branch 2 updateCustomer | CustomerModal.jsx | Mock `lookupCustomer` → existing; mock `updateCustomer` → throw; Save → modal closes with existing id | YES (unit) |
| V4 | Edit 4 — createCustomer + fallback | CustomerModal.jsx | Mock `lookupCustomer` → null; mock `createCustomer` → throw; Save → modal closes with `CUST-` fallback id | YES (unit) |
| V5 | Regression — CRM_TIMEOUT toast preserved | CustomerModal.jsx | Mock `lookupCustomer` → throw `{type:'CRM_TIMEOUT'}`; toast appears; Save still available | YES (unit) |
| V6 | Regression — happy path | CustomerModal.jsx | All mocks succeed; `onSave` called with real CRM id; modal closes | YES (unit) |
| V7 | E2E — order entry with CRM down | OrderEntry.jsx | With CRM unavailable: Add Customer → name+phone → Save → customer row shows in order → Place Order enabled | NO (browser) |

---

## Step 5 — Post-Code Registry Checklist

```
□ registry.json: BUG-294 → status: IMPLEMENTED, sprint_key: pos_5_1
□ BUG_TRACKER.md: BUG-294 row → IMPLEMENTED
□ FILE_OWNERSHIP.md: components/order-entry/CustomerModal.jsx — BUG-294 — 2026-08-05
□ Code markers: // BUG-294 in each of the 4 modified blocks (already in plan above)
□ Compile: webpack 0 new warnings
```

---

## Summary

```
Plan ready: BUG-294
Stage: Implementation Plan (Gate 3)
Edits: 4 surgical edits, 1 file (~+14 lines net)
Files WILL change: components/order-entry/CustomerModal.jsx
Files WILL NOT touch: (all other files)
Verification matrix: 7 checks (6 automated, 1 browser)
Owner decisions: NONE
Risk: HIGH (order flow) — but change is additive try/catch only
Awaiting Gate 4 GO.
```
