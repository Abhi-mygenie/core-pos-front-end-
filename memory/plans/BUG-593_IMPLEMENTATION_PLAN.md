# BUG-593 — Implementation Plan (Gate 3)

**ID:** BUG-593
**Date:** 2026-10-22
**IA:** `impact/BUG-593_IMPACT_ANALYSIS_REV2.md`
**Code Reality:** CONFIRMED
**Risk:** HIGH
**Conflict Pre-Check:** CLEAN

---

## 1. Execution Sequence

One file, one edit location.

---

## 2. Edit 1 — `src/components/order-entry/OrderEntry.jsx` L244-252

**Target:** `enrichCustomerLoyaltyFromCRM` callback — the `setCustomer` merge

**Current (L244-252):**
```js
        setCustomer((prev) => ({
          ...(prev || {}),
          id:            enriched.id || prev?.id || null,
          tier:          enriched.tier ?? prev?.tier,
          totalPoints:   enriched.totalPoints ?? prev?.totalPoints,
          pointsValue:   enriched.pointsValue ?? prev?.pointsValue,
          walletBalance: enriched.walletBalance ?? prev?.walletBalance,
          loyalty:       enriched.loyalty ?? prev?.loyalty,
        }));
```

**Replace with:**
```js
        setCustomer((prev) => ({
          ...(prev || {}),
          name:          enriched.name || prev?.name,  // BUG-593: merge CRM name so collect-bill sends correct cust_name
          id:            enriched.id || prev?.id || null,
          tier:          enriched.tier ?? prev?.tier,
          totalPoints:   enriched.totalPoints ?? prev?.totalPoints,
          pointsValue:   enriched.pointsValue ?? prev?.pointsValue,
          walletBalance: enriched.walletBalance ?? prev?.walletBalance,
          loyalty:       enriched.loyalty ?? prev?.loyalty,
        }));
```

**Logic:** `enriched.name || prev?.name` — if CRM returns a name, use it. If CRM name is empty, keep whatever was in the existing customer state. No data is ever lost.

---

## 3. Verification Matrix

| # | What to Verify | Method |
|---|---------------|--------|
| V-1 | Re-open existing order with phone 7505242126 → "Customer name" field shows "abhishek jain" | Browser: Cafe103 |
| V-2 | Collect bill after re-open → CRM lookup still shows "abhishek jain" (not "Noname") | CRM search after settlement |
| V-3 | New order flow: enter phone → name appears from CRM as before (no regression) | Browser |
| V-4 | Order without customer → name stays empty, no error | Browser |
| V-5 | webpack 0 new warnings | Dev server log |

---

## 4. Post-Code Registry Checklist

```
- [ ] registry.json: BUG-593 → status: GATE_5A_IMPLEMENTED
- [ ] Code marker: // BUG-593 comment on changed line
- [ ] Compile check: webpack 0 new warnings
```

---

## 5. Scope Lock

**Files WILL change:** `src/components/order-entry/OrderEntry.jsx` — 1 line addition at L244
**Files WILL NOT touch:** `customerTransform.js` · `customerService.js` · `CartPanel.jsx` · `CollectPaymentPanel.jsx` · `orderTransform.js` · any `.env`
**Blockers:** NONE
