# BUG-626 — Implementation Plan
## getStatusBadge Missing Upi / Card / Room Entries

**ID:** BUG-626
**Date:** 2026-11-07 (revalidated against `main` HEAD)
**Agent role:** PLANNING (Role 2)
**Status:** GATE_3_PLAN_COMPLETE
**Sprint:** nov_cr_batch
**Risk:** LOW
**Priority:** P0
**Related:** BUG-354

**Original intake:** `change_requests/BUG-626_STATUS_BADGE_UPI_CARD_ROOM_MISSING_INTAKE.md`
**Original IA:** `impact/QA_BATCH_BUGS_623_627_IMPACT_ANALYSIS_2026_10_28.md` §BUG-626
**Validated:** 2026-11-07 — all line numbers, map entries, and fallback logic confirmed against current HEAD.
**Change from original plan:** Insertion point corrected from L57 → **after L58** (line drift +1 — BUG-354 added 3 entries since IA was authored).

---

## 1. Problem

`getStatusBadge(pt)` in `OrderReportBetaPage.jsx` maps `payment_type` → status badge. BUG-354 added `TAB`, `prepaid`, `postpaid` entries, but three values remain unmapped: `Upi`, `Card`, `Room`. These fall through to the grey fallback and display as raw strings on ~148 rows in the Order Report Beta page.

---

## 2. Root Cause

```
API row.payment_type = "Upi"  →  map["Upi"] = undefined
  → fallback: { label: "Upi", cls: 'bg-zinc-100 text-zinc-600' }
  → raw string "Upi" rendered in grey chip
```

Same data path as BUG-354 fix. `deriveStatus()` (L137-155) is a separate function for the filter dropdown — different data path, NOT touched by this fix.

---

## 3. Scope Lock

**File WILL change:**

| # | File | Edit |
|---|---|---|
| 1 | `src/pages/reports-module/OrderReportBetaPage.jsx` | E1: add 3 entries to `getStatusBadge` map after `postpaid` |

**Files WILL NOT touch:** Any other file. No state, API contract, transform, filter, or KPI logic.

---

## 4. Current State of `getStatusBadge` (confirmed L50-61)

```js
const getStatusBadge = (pt) => {
  const map = {
    Cash:     { label: 'Paid',     cls: 'bg-blue-100 text-blue-800'   },
    Unpaid:   { label: 'Unpaid',   cls: 'bg-yellow-100 text-yellow-800' },
    Cancel:   { label: 'Cancel',   cls: 'bg-red-100 text-red-800'     },
    Partial:  { label: 'Partial',  cls: 'bg-blue-100 text-blue-800'   },
    TAB:      { label: 'TAB',      cls: 'bg-amber-100 text-amber-800' },     // BUG-354
    prepaid:  { label: 'Prepaid',  cls: 'bg-green-100 text-green-800' },     // BUG-354
    postpaid: { label: 'Postpaid', cls: 'bg-zinc-200 text-zinc-700'   },     // BUG-354
  };
  return map[pt] || { label: pt || '—', cls: 'bg-zinc-100 text-zinc-600' };
};
```

7 entries. `Upi`, `Card`, `Room` absent → fall through to raw-string fallback.

---

## 5. Exact Edit

### E1 — `OrderReportBetaPage.jsx`: Insert 3 entries after `postpaid` line (currently L58)

**Current code (L57-61) — confirmed exact:**
```js
    prepaid:  { label: 'Prepaid',  cls: 'bg-green-100 text-green-800' },     // BUG-354
    postpaid: { label: 'Postpaid', cls: 'bg-zinc-200 text-zinc-700'   },     // BUG-354
  };
  return map[pt] || { label: pt || '—', cls: 'bg-zinc-100 text-zinc-600' };
};
```

**Replace with:**
```js
    prepaid:  { label: 'Prepaid',  cls: 'bg-green-100 text-green-800' },     // BUG-354
    postpaid: { label: 'Postpaid', cls: 'bg-zinc-200 text-zinc-700'   },     // BUG-354
    Upi:      { label: 'Paid',     cls: 'bg-blue-100 text-blue-800'   },     // BUG-626
    Card:     { label: 'Paid',     cls: 'bg-blue-100 text-blue-800'   },     // BUG-626
    Room:     { label: 'Room',     cls: 'bg-purple-100 text-purple-800' },   // BUG-626
  };
  return map[pt] || { label: pt || '—', cls: 'bg-zinc-100 text-zinc-600' };
};
```

**Design decisions:**
- `Upi` / `Card` → label `'Paid'`, blue `bg-blue-100 text-blue-800` — consistent with `Cash` and `Partial` (same blue, semantically "paid" transactions)
- `Room` → label `'Room'`, purple `bg-purple-100 text-purple-800` — visually distinct from all existing entries; confirms room-billed orders are a separate category (not generic "Paid")
- Keys are **case-sensitive** and match exact `payment_type` values from backend (`Upi`, `Card`, `Room` with capital first letter — matches Palm House data)
- Fallback unchanged — any other unmapped value still shows raw string in grey

**Lines added:** 3

---

## 6. Conflict Pre-Check (re-run 2026-11-07)

- `OrderReportBetaPage.jsx` — last touched: BUG-354 (L50-52, 2026-10-28, added TAB/prepaid/postpaid to same map)
- Target lines L57-61 — same function, different entries. No structural conflict.
- No other open registry item targets this file.
- **No conflict.**

---

## 7. Verification Matrix

| # | Check | How to verify | Auto? |
|---|---|---|:---:|
| V1 | `Upi` entry present with label `'Paid'` and blue class | `grep "Upi" OrderReportBetaPage.jsx` | YES |
| V2 | `Card` entry present with label `'Paid'` and blue class | `grep "Card" OrderReportBetaPage.jsx` | YES |
| V3 | `Room` entry present with label `'Room'` and purple class | `grep "Room.*purple" OrderReportBetaPage.jsx` | YES |
| V4 | Existing 7 entries unchanged | Code review L52-58 | YES |
| V5 | `BUG-626` code markers on all 3 new lines | `grep "BUG-626" OrderReportBetaPage.jsx` | YES |
| V6 | Webpack compiles clean | `tail frontend.out.log` → 0 new warnings | YES |
| V7 | Upi/Card rows show "Paid" blue badge on Palm House report | Browser: Order Report Beta, Palm House | NO |
| V8 | Room rows show "Room" purple badge on Palm House report | Browser: same report | NO |

---

## 8. Risk Register

| # | Risk | Mitigation |
|---|---|---|
| R1 | Key case mismatch — backend sends lowercase `upi`/`card` | Keys `Upi`/`Card` are capital-first to match confirmed Palm House data (`payment_type` from backend). If backend ever sends lowercase, fallback shows raw string — not a regression, same as today. |
| R2 | `Room` badge colour conflicts visually | Purple not used anywhere else in `getStatusBadge`. Visually distinct. Owner confirmed Room → 'Room' purple (OD-626-01). |
| R3 | deriveStatus filter incorrectly updated | `deriveStatus()` (L137-155) is a separate function on a different data path. Not touched. |

---

## 9. Post-Code Registry Checklist

```
- [ ] registry.json: BUG-626 → GATE_5A_IMPLEMENTED
- [ ] BUG_TRACKER.md: row added
- [ ] FILE_OWNERSHIP.md: OrderReportBetaPage.jsx (BUG-626, 2026-11-07)
- [ ] Code markers: // BUG-626 on all 3 new lines ✅ (already in plan above)
- [ ] Compile: 0 new warnings
```

---

## 10. Execution Sequence

1. Apply E1 (insert 3 lines after `postpaid` entry at L58)
2. Compile check
3. Verification matrix V1-V6 (automated) + V7-V8 (browser, owner smoke)
4. EXIT GATE (5 checks)
5. QA handover
