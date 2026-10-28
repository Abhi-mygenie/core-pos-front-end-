# CR-415 — Impact Analysis (Gate 2)

**Date:** 2026-10-12
**Role:** PLANNING (Gate 2 — Impact Analysis only)
**Item:** CR-415 — Sidebar Cleanup: Remove Coming Soon + Duplicate/Legacy modules
**Risk:** LOW
**Sprint:** oct_cr_batch

---

## Header

**Code Reality:** FULL — all 7 target items confirmed at HEAD in `Sidebar.jsx`.
**Conflict Pre-Check:** CLEAN — no open item touches Sidebar.jsx in this region.
**ODs:** ALL LOCKED by owner 2026-10-12 (verbatim list provided).
**Gate 2 Status:** COMPLETE — zero open decisions.

---

## 1. Owner-Specified Removal List (locked)

| # | Category | Item | Sidebar.jsx line | Action |
|---|---------|------|:---:|--------|
| 1 | Daily Report | `item-report` — "Item Report" `comingSoon:true` | L101 | **REMOVE** |
| 2 | Settings | `operating-hours` — "Operating Hours" `comingSoon:true` | L117 | **REMOVE** |
| 3 | Settings | `cancellation-reasons` — "Cancellation Reasons" `comingSoon:true` | L118 | **REMOVE** |
| 4 | Aggregator | `food-mapping` — "Food Mapping" `comingSoon:true` | L217 | **REMOVE** |
| 5 | Insights | `insights-expenses-group` — "Expenses" group header `isGroup:true` | L206 | **REMOVE** |
| 6 | Insights | `insights-expense-report` — "Expense Report" (duplicate of Daily Report entry) | L207 | **REMOVE** |
| 7 | Rooms & Reservations (PMS) | `pms-front-desk` — "Front Desk" legacy `/pms/front-desk` | L236 | **REMOVE** |

**Items explicitly NOT removed (owner: "dont remove any" beyond the list):**

| Item | Reason |
|------|--------|
| L104 `expense-report` — "Expense Report" (Daily Report section) | **KEEP** — this is the primary entry; Insights duplicate removed instead |
| L245 `pms-front-desk-v2` — "Front Desk (Beta)" | **KEEP** — Beta replaces legacy; removing legacy only |
| L194 `insights-customers-rfm` "Customer Intelligence" | **KEEP** — not requested |
| L195 `insights-customers-mix` "Guest vs Registered" | **KEEP** — not requested |
| L196 `insights-customers-intel-beta` "Customer Intelligence (Beta)" | **KEEP** — not requested |
| L197 `insights-customers-gvr-beta` "Guest vs Registered (Beta)" | **KEEP** — not requested |
| All other Settings items | **KEEP** |

---

## 2. Code Reality — Exact Lines at HEAD

```javascript
// --- ITEMS TO REMOVE ---

// L101 — Daily Report section
{ id: "item-report", label: "Item Report", comingSoon: true },

// L117 — Settings section
{ id: "operating-hours", label: "Operating Hours", comingSoon: true },

// L118 — Settings section (adjacent to L117)
{ id: "cancellation-reasons", label: "Cancellation Reasons", comingSoon: true },

// L217 — Aggregator section
{ id: 'food-mapping', label: 'Food Mapping', comingSoon: true },

// L206-207 — Insights section (group header + single child → both go)
{ id: "insights-expenses-group", label: "Expenses", isGroup: true },
{ id: "insights-expense-report", label: "Expense Report", path: "/reports-module/expense-report" },

// L236 — PMS section (legacy, superseded by Front Desk Beta on L245)
{ id: 'pms-front-desk', label: 'Front Desk', path: '/pms/front-desk' },
```

---

## 3. Why Remove Both Insights Expense Lines (L206+L207)

L206 `insights-expenses-group` is an `isGroup:true` header. It has exactly one child: L207 `insights-expense-report`. Removing L207 alone would leave an orphaned group header with no visible children — the sidebar renders it as a section label with nothing below, which looks broken. Both must go together as one logical unit.

The identical "Expense Report" path (`/reports-module/expense-report`) is still accessible via **Daily Report → Expense Report** (L104, kept). No route or functionality is lost.

---

## 4. Data Flow Trace

```
Sidebar.jsx
  └── NAV_ITEMS array (L68-L253)
        ├── reports section (L93-L106)     ← L101 removed
        ├── settings section (L109-L122)   ← L117+L118 removed
        ├── insights section (L139-L209)   ← L206+L207 removed
        ├── aggregator section (L210-L219) ← L217 removed
        └── pms section (L220-L249)        ← L236 removed
  └── render loop (L396-L440)
        └── comingSoon check (L401/413/425/436):
              child.comingSoon ? <ComingSoonItem> : <NavLink>
              → removing the entry means render loop never sees it → nothing rendered
```

**No logic change** — pure data array deletion. The `comingSoon` render path at L401/413/425/436 is not touched; it simply has fewer items to process.

---

## 5. Conflict Pre-Check

**FILE_OWNERSHIP grep for Sidebar.jsx recent modifiers:**
- CR-378 (2026-09-11): L820 restaurant name — different region (bottom of Sidebar JSX)
- CR-355 (2026-09-01): Printers item — different line
- CR-358-P1 (2026-09-03): PMS section added — the same pms section, but L236 was added then and is now being removed

**Open registry items on Sidebar.jsx:** None at GATE_1 or above except CR-415 itself.

**Verdict:** CLEAN — no conflict.

---

## 6. Risk Classification

| Attribute | Value |
|-----------|-------|
| Risk | **LOW** |
| Trigger | Pure array entry deletion — no logic, no route, no API change |
| R5 hotspot? | NO |
| R6 financial? | NO |
| Planning-skip eligible? | **NO** — owner explicitly requires gate flow; not a fast-lane eligible item by policy |
| Files WILL change | `Sidebar.jsx` only |
| Files WILL NOT touch | Any page, route, service, transform, App.js |

---

## 7. Side Effects Check

| Concern | Assessment |
|---------|-----------|
| Routes still work | Yes — removing sidebar entry doesn't remove the route; pages are still accessible by direct URL |
| `comingSoon` renderer orphaned | No — the renderer at L401/413/425/436 just processes fewer items |
| Insights Expense group empty | Resolved — both group header (L206) + child (L207) removed together |
| PMS Front Desk legacy route | `/pms/front-desk` page still exists; only sidebar link removed. Front Desk (Beta) at L245 is the active entry. |
| Any test referencing removed IDs | Check needed at implementation: `grep -rn "item-report\|operating-hours\|cancellation-reasons\|food-mapping\|insights-expense-report\|pms-front-desk" src/ --include="*.test.*"` |

---

## 8. Verification Matrix

| # | What to verify | How | Automated? |
|---|---------------|-----|:---:|
| V1 | 4 comingSoon items absent from sidebar | Navigate sidebar — no "Coming Soon" chips visible | NO |
| V2 | No "Expense Report" entry under Insights | Open Insights → scroll to bottom — no Expenses group | NO |
| V3 | "Expense Report" still in Daily Report section | Expand Daily Report in sidebar | NO |
| V4 | No "Front Desk" (legacy) entry in PMS section | Expand Rooms & Reservations — "Front Desk" gone, "Front Desk (Beta)" present | NO |
| V5 | All other sidebar entries intact | Visual full-sidebar check | NO |
| V6 | 7 removed lines absent from Sidebar.jsx | `grep` for each removed ID | YES |
| V7 | webpack 0 new warnings | `yarn build` | YES |

---

## 9. Post-Code Registry Checklist

```
- [ ] registry.json: CR-415 → status: GATE_5A_IMPLEMENTED
- [ ] CR_REGISTRY.md / BUG_TRACKER.md: row updated
- [ ] FILE_OWNERSHIP.md: Sidebar.jsx row added — CR-415, 7 lines removed
- [ ] Code markers: // CR-415 comment on each removal site (or inline note)
- [ ] yarn build: exit 0
```

---

## 10. Summary

- **File:** `Sidebar.jsx` — 7 line deletions, pure data array cleanup
- **Risk:** LOW — no logic, no route, no API change
- **All decisions locked:** zero open ODs
- **NO planning-skip** (per gate discipline — owner confirmed full gate flow)

**Next:** "Gate 3 GO" → Implementation Plan.
