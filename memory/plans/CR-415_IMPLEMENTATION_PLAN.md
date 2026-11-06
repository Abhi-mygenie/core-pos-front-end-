# CR-415 — Implementation Plan (Gate 3)

**Date:** 2026-10-12
**Role:** PLANNING (Gate 3 — Implementation Plan only)
**Item:** CR-415 — Sidebar Cleanup: Remove 6 entries (7 lines)
**Risk:** LOW
**Sprint:** oct_cr_batch
**Gate 3 Status:** COMPLETE — awaiting Gate 4 GO

---

## Step 0 — Entry Verification (PASS)

All 7 target lines + 2 kept lines verified at HEAD:

| Line | Fragment | Label | Match |
|------|---------|-------|:---:|
| L101 | `item-report` `comingSoon: true` | CS-1 Daily Report | ✅ |
| L117 | `operating-hours` `comingSoon: true` | CS-2 Settings | ✅ |
| L118 | `cancellation-reasons` `comingSoon: true` | CS-3 Settings | ✅ |
| L206 | `insights-expenses-group` `isGroup: true` | EXP-1 Insights header | ✅ |
| L207 | `insights-expense-report` | EXP-2 Insights item | ✅ |
| L217 | `food-mapping` `comingSoon: true` | CS-4 Aggregator | ✅ |
| L236 | `pms-front-desk` `'/pms/front-desk'` | FD-1 PMS legacy | ✅ |
| L104 | `expense-report` (KEPT) | Daily Report expense | ✅ OK |
| L245 | `pms-front-desk-v2` (KEPT) | Front Desk Beta | ✅ OK |

No drift. Plan valid at HEAD.

---

## Scope Lock

**File WILL change:** `src/components/layout/Sidebar.jsx`
**Files WILL NOT touch:** `App.js` · any page · any service · any transform

---

## Exact Edits — 5 search_replace calls (E2+E3 combined as adjacent)

### E1 — Remove `item-report` (Daily Report, L101)

**old_str:**
```javascript
      { id: "item-report", label: "Item Report", comingSoon: true },
      { id: "order-report-beta", label: "Orders (Beta)", path: "/reports-module/order-report-beta" }, // CR-117
```
**new_str:**
```javascript
      // CR-415: item-report (Coming Soon) removed
      { id: "order-report-beta", label: "Orders (Beta)", path: "/reports-module/order-report-beta" }, // CR-117
```

---

### E2+E3 — Remove `operating-hours` + `cancellation-reasons` (Settings, L117+L118)

**old_str:**
```javascript
      { id: "operating-hours", label: "Operating Hours", comingSoon: true },
      { id: "cancellation-reasons", label: "Cancellation Reasons", comingSoon: true },
      { id: "employee-management", label: "Employee Management", path: "/employees" }, // CR-069
```
**new_str:**
```javascript
      // CR-415: operating-hours + cancellation-reasons (Coming Soon) removed
      { id: "employee-management", label: "Employee Management", path: "/employees" }, // CR-069
```

---

### E4+E5 — Remove `insights-expenses-group` + `insights-expense-report` (Insights, L205-207)

**old_str:**
```javascript
      // CR-061: Expense Report
      { id: "insights-expenses-group", label: "Expenses", isGroup: true },
      { id: "insights-expense-report", label: "Expense Report", path: "/reports-module/expense-report" },
    ],
```
**new_str:**
```javascript
      // CR-061: Expense Report — CR-415: insights duplicate removed (kept in Daily Report)
    ],
```

---

### E6 — Remove `food-mapping` (Aggregator, L217)

**old_str:**
```javascript
      { id: 'aggregator-setup', label: 'Aggregator Setup', path: '/aggregator/setup' },
      { id: 'food-mapping',     label: 'Food Mapping',     comingSoon: true },
    ],
```
**new_str:**
```javascript
      { id: 'aggregator-setup', label: 'Aggregator Setup', path: '/aggregator/setup' },
      // CR-415: food-mapping (Coming Soon) removed
    ],
```

---

### E7 — Remove `pms-front-desk` legacy (PMS, L236)

**old_str:**
```javascript
      // P3 placeholder
      { id: 'pms-front-desk',      label: 'Front Desk',      path: '/pms/front-desk' },
      { id: 'pms-arrivals',        label: 'Arrivals',         path: '/pms/arrivals' },
```
**new_str:**
```javascript
      // P3 placeholder — CR-415: pms-front-desk legacy removed (superseded by Front Desk Beta)
      { id: 'pms-arrivals',        label: 'Arrivals',         path: '/pms/arrivals' },
```

---

## Execution Sequence

Apply E1 → E2+E3 → E4+E5 → E6 → E7 (all on `Sidebar.jsx`, sequential within file).
Then: `yarn build` → EXIT GATE.

---

## Verification Matrix

| # | What to verify | How | Automated? |
|---|---------------|-----|:---:|
| V1 | 4 comingSoon items absent from sidebar | Navigate Daily Report / Settings / Aggregator — no Coming Soon chips | NO |
| V2 | "Expense Report" absent from Insights | Open Insights → scroll — no Expenses group | NO |
| V3 | "Expense Report" still in Daily Report | Expand Daily Report sidebar section | NO |
| V4 | "Front Desk" legacy absent from PMS section | Expand Rooms & Reservations — no plain "Front Desk", only "Front Desk (Beta)" | NO |
| V5 | `grep "item-report\|operating-hours\|cancellation-reasons\|food-mapping\|insights-expense-report\|pms-front-desk[^-]" Sidebar.jsx` returns 0 hits on data entries | grep | YES |
| V6 | CR-415 code markers present (5 comments) | grep "CR-415" Sidebar.jsx | YES |
| V7 | `expense-report` (L104) + `pms-front-desk-v2` (L245) still present | grep | YES |
| V8 | webpack 0 new warnings | `yarn build` | YES |

---

## Risk Register

| # | Risk | Mitigation |
|---|------|-----------|
| R1 | E4+E5 search pattern not unique | Mitigated: `// CR-061: Expense Report` comment + two specific IDs makes context unique |
| R2 | Some test file references removed IDs | Check: `grep -rn "item-report\|operating-hours\|cancellation-reasons\|food-mapping\|insights-expense-report\|pms-front-desk" src/ --include="*.test.*"` at implementation |

---

## Post-Code Registry Checklist

```
- [ ] registry.json: CR-415 → status: GATE_5A_IMPLEMENTED
- [ ] BUG_TRACKER.md / CR_REGISTRY.md: CR-415 row updated
- [ ] FILE_OWNERSHIP.md: Sidebar.jsx row added — CR-415, 7 lines removed
- [ ] Code markers: // CR-415 × 5 (one per edit site)
- [ ] yarn build: exit 0
```
