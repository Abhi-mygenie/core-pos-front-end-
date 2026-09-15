# CR-379 — Design Decisions (Frozen)
## New PMS Check-In: CRM Customer Link

```
CR ID:       CR-379
Gate:        2.5 — Design Review (owner-requested addition)
Frozen:      2026-09-12
Author:      Agent (PLANNING role)
Owner:       Approved via chat — "freeze this design update docs and decision and close gate"
Mockup:      /public/cr379-design-mockup.html (live)
Status:      FROZEN — all decisions locked. Gate 3 GO authorised.
```

---

## Locked Design Decisions

### DD-1 — Badge trigger
**Decision: AUTO on 10 digits**
Phone field `onChange` — when digit count reaches 10, `lookupCustomer` fires automatically.
No manual "Check CRM" button required.
OTA arrivals: same trigger fires via `useEffect` on form load when phone is pre-populated.

---

### DD-2 — Badge placement
**Decision: Inline — between name/phone row and room assignment**
The CRM badge block sits immediately below the primary guest name + phone row.
Renders only when phone is 10 digits (loading, found, not-found, or failed state).
Room assignment and all other form fields follow below the badge.

---

### DD-3 — Badge fields (final set)
**Decision: 4-column stats row + Documents section**

| Column | Field | Source |
|---|---|---|
| 1 | Stays | `crmCustomer.totalVisits` |
| 2 | Last Stay | `crmCustomer.lastVisit` (formatted) |
| 3 | Loyalty Pts | `crmCustomer.totalPoints` + `≈ ₹{pointsValue}` subtitle |
| 4 | Store Credit | `crmCustomer.walletBalance` + "Prepaid balance" subtitle |

**Wallet balance renamed: "Store Credit"** — prepaid/refund balance in CRM, distinct from loyalty points.
**Loyalty points** shown separately with ₹ monetary equivalent as subtitle.

---

### DD-4 — Documents on file display
**Decision: Doc-type cards with thumbnail placeholder, date, and Front/Back flag**

Each document in `crmCustomer.documents` (keyed by doc_type) renders as a card:
- Coloured thumbnail area (icon-based, real image thumb in Gate 5 if file_url accessible)
- Doc type label (Aadhaar / Passport / PAN / etc.)
- Front + Back or Front-only indicator
- Upload date (`created_at` formatted)
- Hover reveals eye icon (full view = CR-380 scope)

"Add new doc (CR-380)" dashed placeholder always shows after existing doc cards.
Documents fetched via `getDocuments(crmCustomerId)` — called immediately after successful `lookupCustomer`.
**This fetch is CR-379 scope.** Upload/management is CR-380 scope.

---

### DD-5 — Extra adults layout
**Decision: Inline rows, dynamically added under the occupancy counter**

- Section label: "Occupancy & Guest Name Register" — subtitle: "Slot 1 is Primary Guest"
- Adults counter (existing `adults` field) stays.
- Extra adult name slots appear below the counter when `adults > 1`:
  - Adult 2 input, Adult 3 input, Adult 4 input — shown/hidden as count changes
- Children counter (existing `children` field) stays.
- Children name inputs appear when `children > 0` — one input per child (name + age).
- Purple accent for child slots (visual distinction from adult slots).

---

### DD-6 — Children names
**Decision: Individual inputs per child**
One text input per child index. Placeholder: "Child N Name & Age".
Not comma-entry. Not accordion. Simple inline row matching adult slot pattern.

---

### DD-7 — Corporate / B2B toggle
**Decision: Checkbox with expandable fields inline**
A checkbox row: "Corporate / B2B Billing" + "Check if invoice is raised to company GSTIN".
When checked, reveals: Company/Firm Name input + GST Number input.
Non-blocking — if `updateCustomer` fails, check-in continues.

---

### DD-8 — CRM error state
**Decision: Amber non-blocking banner (STATE 4 in badge container)**
Replaces badge block when CRM lookup fails (timeout / offline).
Text: "CRM lookup failed (Timeout / Offline)" + "Check-in will proceed without loyalty link."
Badge container switches between 4 states (returning / new / loading / failed).
All states non-blocking per OD-1A.

---

## Summary Table

| ID | Decision | Value |
|---|---|---|
| DD-1 | Badge trigger | Auto on 10 digits |
| DD-2 | Badge placement | Below name/phone, above room assignment |
| DD-3 | Badge fields | 4-col: Stays, Last Stay, Loyalty Pts (+ ₹equiv), Store Credit |
| DD-4 | Documents | Doc-type cards with thumbnail + date; getDocuments fetch in CR-379 |
| DD-5 | Extra adults | Inline slots, counter-driven, Adult 2–4 |
| DD-6 | Children names | Individual inputs per child |
| DD-7 | Corporate toggle | Checkbox + expandable firm/GST fields |
| DD-8 | CRM error | Amber non-blocking banner |

---

## Gate 2.5 Close

```
Gate 2.5 status:   CLOSED — design frozen by owner 2026-09-12
Gate 3 GO:         AUTHORISED
Next action:       Write Gate 3 Implementation Plan (exact file + line + edit-site spec)
```
