# CR-360 — Gate 3: Implementation Plan
## S6 In-House Guests — Phase 1 Completion: KPI Tiles + View Bill

**Doc:** `memory/plans/CR-360_IMPLEMENTATION_PLAN.md`
**Date:** 2026-09-03
**Risk:** LOW | **Scope:** 1 file, ~20 lines

---

## §0 — Entry Verification

| Claim | Current State | Match? |
|---|---|---|
| `InHouseGuestsPage.jsx` line 82: `value: '—'` for Checkout Today | ✅ confirmed | PASS |
| `InHouseGuestsPage.jsx` line 152: View Bill has no onClick | ✅ confirmed | PASS |
| `row.checkoutDate`, `row.checkinDate`, `row.balance` available in rows | ✅ confirmed (BUG-378) | PASS |
| `row.parentOrderId` available | ✅ confirmed (BUG-378 / roomListTransform) | PASS |
| No `useNavigate` import in InHouseGuestsPage.jsx | ✅ confirmed (only imports useState, useEffect, useCallback) | PASS |

---

## §1 — Execution Order

```
Step 1  pages/pms/InHouseGuestsPage.jsx  — E1: add useNavigate import
Step 2  pages/pms/InHouseGuestsPage.jsx  — E2: add KPI derivation + update KPI array
Step 3  pages/pms/InHouseGuestsPage.jsx  — E3: wire View Bill onClick
────────────────────────────────────────
Compile check after all 3 steps.
```

All steps are in the same file — execute sequentially.

---

## §2 — Exact Edits

### STEP 1 — Add `useNavigate` import (E1)

**Find** (line 1 of InHouseGuestsPage.jsx):
```jsx
import { useState, useEffect, useCallback } from 'react';
```

**Replace with:**
```jsx
import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom'; // CR-360
```

---

### STEP 2 — Derive KPI values + update KPI strip (E2)

**Find** (after `const load = ...` and `useEffect(() => { load(); }, [load]);`):

Add KPI derivation block after line `useEffect(() => { load(); }, [load]);`:

**Insert after:**
```jsx
  useEffect(() => { load(); }, [load]);
```

**Insert (new lines):**
```jsx

  // CR-360: Derive KPI values from enriched rows (data available from BUG-378 local-res join)
  const todayStr = new Date().toISOString().slice(0, 10);
  const checkoutToday = rows.filter(r => r.checkoutDate?.slice(0, 10) === todayStr).length;
  const totalBalance  = rows.reduce((sum, r) => sum + (r.balance ?? 0), 0);
  const avgNights = (() => {
    const diffs = rows
      .filter(r => r.checkinDate && r.checkoutDate)
      .map(r => Math.round((new Date(r.checkoutDate) - new Date(r.checkinDate)) / 86400000));
    return diffs.length ? Math.round(diffs.reduce((s, d) => s + d, 0) / diffs.length) : null;
  })();
```

**Then find** (KPI strip hardcoded values):
```jsx
              { label: 'Checkout Today',      value: '—' },
              { label: 'Outstanding Balance', value: '—', red: true },
              { label: 'Avg Nights',          value: '—' },
```

**Replace with:**
```jsx
              { label: 'Checkout Today',      value: loading ? '…' : checkoutToday },
              { label: 'Outstanding Balance', value: loading ? '…' : (totalBalance > 0 ? `₹${totalBalance.toLocaleString('en-IN')}` : '—'), red: true }, // CR-360
              { label: 'Avg Nights',          value: loading ? '…' : (avgNights != null ? `${avgNights}d` : '—') }, // CR-360
```

---

### STEP 3 — Wire View Bill onClick (E3)

**Find** (line 152–154):
```jsx
                        <button className="text-[12px] text-[#329937] hover:underline font-medium">
                          View Bill
                        </button>
```

**Replace with:**
```jsx
                        <button
                          onClick={() => navigate('/reports/room-orders')} // CR-360: Phase 1 — navigate to room orders report; full checkout link in Phase 3 (Departures)
                          className="text-[12px] text-[#329937] hover:underline font-medium"
                        >
                          View Bill
                        </button>
```

**Also add `navigate` initialisation** inside the component (after `const [search, setSearch] = useState('');`):

**Find:**
```jsx
  const [search, setSearch]   = useState('');
```

**Replace with:**
```jsx
  const [search, setSearch]   = useState('');
  const navigate              = useNavigate(); // CR-360
```

---

## §3 — Verification Matrix

| # | Check | Expected | Auto? |
|---|---|---|---|
| V1 | `useNavigate` imported | `grep "useNavigate" InHouseGuestsPage.jsx` → 2 hits (import + init) | NO |
| V2 | `checkoutToday` derived | `grep "checkoutToday" InHouseGuestsPage.jsx` → 2 hits (def + use) | NO |
| V3 | `totalBalance` derived | `grep "totalBalance" InHouseGuestsPage.jsx` → 2 hits | NO |
| V4 | `avgNights` derived | `grep "avgNights" InHouseGuestsPage.jsx` → 2 hits | NO |
| V5 | Old hardcoded `'—'` for tiles GONE | `grep "value: '—'" InHouseGuestsPage.jsx` → 0 hits in KPI section | NO |
| V6 | View Bill has onClick | `grep "onClick.*navigate" InHouseGuestsPage.jsx` → 1 hit | NO |
| V7 | Compile clean | `webpack compiled with 1 warning` (pre-existing) | NO |
| V8 | Browser: Checkout Today shows number | Navigate `/pms/in-house` — Checkout Today tile shows count | NO |
| V9 | Browser: Outstanding Balance shows ₹ | Balance tile shows ₹ amount (or "—" if all guests have null balance) | NO |
| V10 | Browser: View Bill click navigates | Clicking View Bill → /reports/room-orders loads | NO |

---

## §4 — Post-Code Registry Checklist

```
□ 1. registry.json: CR-360 → status: IMPLEMENTED, sprint_key: pos_pms_1
□ 2. CR_REGISTRY.md: CR-360 row → IMPLEMENTED
□ 3. FILE_OWNERSHIP.md: InHouseGuestsPage.jsx listed under CR-360
□ 4. Code markers: // CR-360 in modified file
□ 5. Compile: webpack 0 new warnings
```

---

## §5 — Scope Lock

**WILL change:** `pages/pms/InHouseGuestsPage.jsx` only
**WILL NOT touch:** `pmsService.js` · `roomListTransform.js` · `aiosellService.js` · `CollectPaymentPanel.jsx` · `DashboardPage.jsx` · `App.js` · `Sidebar.jsx`

---

*Planning agent | CR-360 Gate 3 | 2026-09-03 | Implementation Plan COMPLETE | Awaiting Gate 4 GO*
