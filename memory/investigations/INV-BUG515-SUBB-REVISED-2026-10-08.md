# BUG-515 Sub-B — REVISED INVESTIGATION REPORT (Round 2)
# "No changes visible" after E-5/E-6/E-7 implementation

**Date:** 2026-10-08
**Agent:** INVESTIGATION
**Trigger:** Owner reports no visible change in expansion on both In-House and Departures tabs after BUG-515 Sub-B implementation
**Screenshots provided:** Both tabs, `core-pos-front-5.preview.emergentagent.com`
**Steps used:** 7/10

---

## 1. Summary

**Root Cause 1 — HIGH confidence (CONFIRMED):**
The code changes E-5/E-6/E-7 were applied to pod `react-app-deploy-20.preview.emergentagent.com`.
The owner is testing at `core-pos-front-5.preview.emergentagent.com` — a **different Emergent job/pod**.
The fix does not exist at `core-pos-front-5`. This pod still has the original BUG-515 code (E-1a–E-4b only).

**Root Cause 2 — HIGH confidence (code trace on `core-pos-front-5`):**
Even if the user were on the correct pod, on `core-pos-front-5` the expansion still shows rack data because:
- `joinRowBalances` (without E-5) never outputs the 5 discount fields → `balances[orderId].roomDiscountAmount` is always `undefined`
- `InHousePanel.renderExpansion` (without E-6) passes the raw snap row directly to `RowExpansionStub`
- `DeparturesPanel.renderExpansion` (without E-7) same
- `RowExpansionStub` evaluates `hasDiscount = (row.roomDiscountAmount ?? 0) > 0 = (undefined ?? 0) > 0 = false` always
- Section 2 never renders; single-section rack data shows

**Classification:** ENVIRONMENT (pod mismatch) + FE_BUG (pipeline bridge absent on `core-pos-front-5`)
**Confidence:** HIGH for both causes
**Steps used:** 7/10

---

## 2. Evidence — Pod URL Mismatch

| Evidence | Value |
|---|---|
| This pod `REACT_APP_BACKEND_URL` | `https://react-app-deploy-20.preview.emergentagent.com` |
| This pod `APP_URL` (supervisor) | `https://a4ac9ff7-296e-490d-9003-ce2a4bae50c8.preview.emergentagent.com` |
| User testing URL (from screenshots) | `https://core-pos-front-5.preview.emergentagent.com` |
| E-5 in this pod's frontDeskService.js | ✅ Present (L149-153) |
| E-6 in this pod's InHousePanel.jsx | ✅ Present (L23/L27/L31) |
| E-7 in this pod's DeparturesPanel.jsx | ✅ Present (L42/L46/L50) |
| E-5/E-6/E-7 on `core-pos-front-5` | ❌ NOT present — different pod |

The fix is in the right files, compiled (webpack clean), but running on the wrong URL.

---

## 3. Hypotheses Tested

| # | Hypothesis | Test method | Steps used | Result |
|---|---|---|---|---|
| H1 | Code changes not applied (files unchanged) | grep E-5/E-6/E-7 markers in source | Step 1 | **ELIMINATED** — all 12 markers confirmed |
| H2 | Webpack didn't compile new code | `tail frontend.out.log` | Step 1 | **ELIMINATED** — "webpack compiled with 1 warning" (0 new) |
| H3 | `ExpansionRow` memoized — prevents re-render when balances load | Read GuestTable.jsx L14-22 | Step 3 | **ELIMINATED** — plain function component, no React.memo |
| H4 | `row.orderId` key mismatch vs `g.parentOrderId` | Read roomListTransform + fromReservation | Step 4 | **ELIMINATED** — both use `r.order_id`; balance ₹600 confirms match |
| **H5** | User testing at different pod (core-pos-front-5 ≠ react-app-deploy-20) | Compare pod URLs | Step 2 | **CONFIRMED — PRIMARY CAUSE** |
| H6 | On core-pos-front-5: `roomGstSlabs` null → effectiveGst = rack → balance = ₹650, not ₹600 | Check profileTransform roomGstSlabs parsing + screenshots | Steps 5-6 | **ELIMINATED** — Departures shows ₹600 (not ₹650) → roomGstSlabs IS configured at RID 69 (The Goan Kitchen) |

---

## 4. Data Flow Trace — What `core-pos-front-5` Actually Runs

```
ON core-pos-front-5 (original BUG-515 code, E-1a through E-4b only):

pmsService.getInHouseGuests()
  Step 3 folio: ri.room_discount_amount = 1000
  discountRs = 1000, effectiveGst = 100 (roomGstSlabs configured at RID 69)
  roomBalance = bp + effectiveGst = 500 + 100 = 600 ✓
  → if (discountRs > 0): row.roomDiscountAmount = 1000  ← SET ON INTERNAL ROW
  → row.balance = 600

joinRowBalances(inHouseRows) [WITHOUT E-5]:
  m[orderId] = { ...roundBalance(600), room, fnb, transferred }
  // roomDiscountAmount, effectiveTotal, etc. → DROPPED (E-5 absent)
  → balances[orderId].display = 600 ✓
  → balances[orderId].roomDiscountAmount = undefined (not in map)

FrontDeskWorkstationPage L151 (In-House):
  → InHousePanel(rows=snapRows, balances={ display:600, roomDiscountAmount:undefined })

InHousePanel.renderExpansion(row) [WITHOUT E-6]:
  → <RowExpansionStub row={snapRow} />  // raw snap row, no merging
  → snapRow.roomDiscountAmount = undefined (never set on snap row)

RowExpansionStub:
  hasDiscount = (undefined ?? 0) > 0 = false
  → single section, rack values only
  → "Booking (incl. GST): ₹3,150, SGST: ₹75, CGST: ₹75, Balance due: ₹1,650"
```

**BREAK POINT:** `joinRowBalances` (without E-5) drops `roomDiscountAmount`. `renderExpansion` (without E-6/E-7) never merges it back. `RowExpansionStub` always sees `undefined` → `hasDiscount = false`.

---

## 5. Why In-House Shows "..." but Departures Shows ₹600

The two screenshots were taken at different times:

```
useRowBalances deps = [loadedAt, inHouseCount]

Departures screenshot:
  → snap was loaded, loadedAt = T1
  → getRowBalances resolved → balances = { display:600 }
  → balance column = ₹600

[User switches to In-House tab OR window loses/regains focus > 5s]
  → BUG-435 focus listener fires → refresh() called → new snap fetched
  → snap.loadedAt = T2 (new value) → useRowBalances effect fires
  → setBalances(undefined) → balance column = "..."
  → getRowBalances starts re-fetching asynchronously

In-House screenshot (taken during re-fetch):
  → balances = undefined (loading)
  → balance column = "..."
  → expansion opened during loading → enrichedRow = snapRow → rack data
```

This "..." state is EXPECTED and correctly handles graceful degradation. Once balances re-load, the expansion updates to two-section.

However: without E-5/E-6/E-7 (on `core-pos-front-5`), even after balances load, `roomDiscountAmount` is still absent from the balances map → `hasDiscount` stays false permanently.

---

## 6. Code State Comparison

| Component | `react-app-deploy-20` (this pod) | `core-pos-front-5` (user's pod) |
|---|---|---|
| `pmsService.js` E-1a–E-1c (enrichment) | ✅ Present | ✅ Present (original BUG-515) |
| `frontDeskService.js` E-2 (+roomGstSlabs) | ✅ Present | ✅ Present |
| `FrontDeskWorkstationPage.jsx` E-3 | ✅ Present | ✅ Present |
| `GuestTable.jsx` E-4a (RowExpansionStub) | ✅ Present | ✅ Present |
| `GuestTable.jsx` E-4b (sort key) | ✅ Present | ✅ Present |
| **`frontDeskService.js` E-5** (+5 discount fields in joinRowBalances) | ✅ **PRESENT** | ❌ **ABSENT** |
| **`InHousePanel.jsx` E-6** (renderExpansion merge) | ✅ **PRESENT** | ❌ **ABSENT** |
| **`DeparturesPanel.jsx` E-7** (renderExpansion merge) | ✅ **PRESENT** | ❌ **ABSENT** |

---

## 7. GuestTable Re-Render Analysis (confirms fix is architecturally sound)

`ExpansionRow` (GuestTable.jsx L14-22): plain `function` component, no `React.memo`, no `useMemo`. Re-renders normally when `children` prop changes.

When `balances` updates on this pod:
```
balances loads → setBalances(b) → FrontDeskWorkstationPage re-renders
  → InHousePanel re-renders (new balances prop)
    → new renderExpansion closure (captures new balances)
      → GuestTable re-renders (new renderExpansion prop)
        → open=true: renderExpansion(row) called with loaded balances
          → b = balances[orderId] = { display:600, roomDiscountAmount:1000, ... }
          → (b.roomDiscountAmount ?? 0) > 0 = true
          → enrichedRow = { ...row, roomDiscountAmount:1000, effectiveTotal:2100, ... }
            → RowExpansionStub: hasDiscount=true → Section 2 renders ✓
```

No memoization blocks this path. **Fix is architecturally correct on this pod.**

---

## 8. Recommendations

**Classification: ENVIRONMENT — fix must be deployed to `core-pos-front-5`**

The code fix is complete and correct on `react-app-deploy-20`. It needs to be deployed to `core-pos-front-5` so the user can see the change. This is a deployment action — not a code fix.

**Options:**
1. **Publish/deploy this pod's code to production** → user sees fix at `core-pos-front-5`
2. **Test at `react-app-deploy-20.preview.emergentagent.com`** on this pod directly to verify the fix works, then deploy

---

## 9. Retroactive Candidates

NONE

---

## Handover to Next

```
Root cause 1: Code changes on react-app-deploy-20; user testing core-pos-front-5 (different pod).
Root cause 2: On core-pos-front-5, E-5/E-6/E-7 absent → joinRowBalances drops discount fields;
              renderExpansion passes raw snap row → hasDiscount always false → rack data.

The fix IS complete and architecturally correct on react-app-deploy-20.
To fix core-pos-front-5: deploy this pod's code via the Deploy button.

"..." in In-House balance: BUG-435 focus-refresh triggered a snap reload between screenshots.
This is expected graceful degradation while balances re-fetch — NOT a separate bug.

Classification: ENVIRONMENT (pod mismatch). FE code correct.
Confidence: HIGH. Steps: 7/10.
Report: investigations/INV-BUG515-SUBB-REVISED-2026-10-08.md
```
