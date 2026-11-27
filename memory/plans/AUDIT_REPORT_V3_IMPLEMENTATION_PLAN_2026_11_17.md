# Audit Report v3 — Implementation Plan (Gate 3)
# CR-543 + CR-544 + CR-546 Combined — Option B

**IDs:** CR-543, CR-544, CR-546
**Title:** Audit Report v3 — 3-Card Theft Detection Dashboard
**Date:** 2026-11-17
**Gate:** 3 — Line-by-line Implementation Plan
**Option:** B — Card 1 + Card 3 fully built + Card 2 partial (cancel-after-unpaid live, discount/gap rows placeholder)
**Based on:** `design/AUDIT_REPORT_DESIGN_DECISIONS_LOCKED_2026_11_17.md` (19 decisions D1–D19)
**Design mockup:** `frontend/public/AUDIT_REPORT_v3_DESIGN_2026_11_17.html`
**Target component:** `pages/reports-module/AuditLogMockup.jsx` (207 lines — full rewrite to v3)
**Data source:** `fetchInsightsDashboard(from, to)` → `response.audits` (existing, used by current AuditLogMockup)
**Test account:** owner@ruby.com / Qplazm@10, RID 672 (101 `late_cancel` events)

---

## Code Reality

| Item | Code exists? | Status |
|------|-------------|--------|
| `AuditLogMockup.jsx` | YES (207 lines) — shows make_unpaid + payment_method_change + post-print events | REWRITE to v3 3-card layout |
| `fetchInsightsDashboard` | YES — `insightsService.js` | No change needed |
| `insights-dashboard` endpoint | YES — returns `audits.orders[]` with event types | No change needed |
| `late_cancel` events | DELIVERED on preprod | Card 1 ready |
| `cancel_after_unpaid` events | DELIVERED on preprod | Card 2 partial |
| `discount_apply/remove_after_print` events | DELIVERED on preprod | Card 3 ready |
| `item/order_cancel_after_print` events | DELIVERED on preprod | Card 3 ready |
| `discount_after_unpaid` events (NEW-1) | NOT DELIVERED | Card 2 placeholder |
| `repay_gap` events (NEW-2) | NOT DELIVERED | Card 2 placeholder |
| Route `/reports-module/audit-log` | YES — App.js L201 | No change |
| Sidebar "Order Edit Audit" | YES — Sidebar.jsx L186 | Rename to "Audit Report" (D2) |

---

## Scope Lock

**Files WILL change:**

| File | Change | Hotspot? |
|------|--------|----------|
| `pages/reports-module/AuditLogMockup.jsx` | FULL REWRITE — v3 3-card layout | NO |
| `components/layout/Sidebar.jsx` | L186: rename "Order Edit Audit" → "Audit Report" | NO |

**Files will NOT touch:**
- `insightsService.js` — API call unchanged
- `App.js` — route unchanged
- `orderTransform.js` — no order data changes
- Any R5 hotspot file

**Total: 2 files. Zero hotspots.**

---

## Architecture — v3 Page Structure

```
AuditLogMockup.jsx (renamed internally to AuditReportPage)
│
├─ KPI Bar (4 cards, always visible)
│   ├─ Total Events (deduplicated count)
│   ├─ Made Unpaid (make_unpaid count)
│   ├─ Pay Method Changed (payment_method_change count)
│   └─ Post-Print Edits (item_cancel + order_cancel + discount_apply + discount_remove after print)
│
├─ Card 1 — High Risk Cancellations (CR-543)
│   ├─ Headline: count + ₹ leakage (sum of cancelled amounts where duration ≥ 5 min)
│   ├─ Risk Bar: horizontal bar with Doubt (5-15) / Risk (15-30) / High Risk (30+)
│   └─ Click → /reports-module/cancellations?filter=high_risk (external link)
│
├─ Card 2 — Leakage After Unpaid (CR-544) [OPTION B: partial]
│   ├─ Headline: count + ₹ leakage (cancel amounts on unpaid orders)
│   ├─ Sub-section: cancel_after_unpaid events (LIVE — table rows)
│   ├─ Sub-section: discount_after_unpaid events (PLACEHOLDER — "Awaiting backend")
│   ├─ Sub-section: repay_gap events (PLACEHOLDER — "Awaiting backend")
│   └─ Click → expand in-page drill-down table
│
├─ Card 3 — Leakage After Print (CR-546)
│   ├─ Headline: count + ₹ leakage (cancel + discount amounts on post-print orders)
│   ├─ Sub-events: item_cancel, order_cancel, discount_apply, discount_remove after print
│   └─ Click → expand in-page drill-down table
│
└─ Drill-down Tables (expanded on card click)
    ├─ Each row: Order #, Event type badge, Staff name, Amount, Time, Duration
    └─ Overlap badges: 🔴 High Risk · 🔓 After Unpaid · 🖨️ After Print (Approach C)
```

---

## Data Processing Logic

### Event Classification (from `audits.orders[]`)

```javascript
// Each event in audits.orders[] has a `type` field. Classify into cards:

const CARD_1_TYPES = ['late_cancel'];                    // CR-543
const CARD_2_TYPES = ['cancel_after_unpaid',             // CR-544 (delivered)
                      'discount_apply_after_unpaid',     // CR-544 v3 (NOT YET — placeholder)
                      'discount_remove_after_unpaid'];   // CR-544 v3 (NOT YET — placeholder)
const CARD_3_TYPES = ['item_cancel_after_print',         // CR-528
                      'order_cancel_after_print',        // CR-528
                      'discount_apply_after_print',      // CR-546
                      'discount_remove_after_print'];    // CR-546

// Approach C overlap: an event can match multiple cards
// e.g., a late_cancel on an unpaid order that was printed → Card 1 + Card 2 + Card 3
// Classification rules:
//   Card 1: type === 'late_cancel' (always; risk_level/duration from the event)
//   Card 2: type includes 'unpaid' OR (any type AND event has unpaid_count > 0)
//   Card 3: type includes 'after_print' OR (any type AND event has bill_printed_at)

// KPI bar (deduplicated):
//   Total Events = unique order_ids across all audits.orders[]
//   Made Unpaid = count where type === 'make_unpaid'
//   Pay Method Changed = count where type === 'payment_method_change'
//   Post-Print Edits = count where type matches CARD_3_TYPES
```

### Card 1 — Risk Tier Breakdown (CR-543)

```javascript
// late_cancel events have: risk_level, duration_minutes, punch_time, cancel_time, scope
// risk_level values: 'ok' (<5 min), 'doubt' (5-15), 'risk' (15-30), 'high_risk' (30+), 'no_punch'
// Card 1 filters: duration_minutes >= 5 (excludes 'ok' and 'no_punch')

const riskTiers = {
  doubt:     events.filter(e => e.risk_level === 'doubt'),     // 5-15 min
  risk:      events.filter(e => e.risk_level === 'risk'),       // 15-30 min
  high_risk: events.filter(e => e.risk_level === 'high_risk'),  // 30+ min
};

// Risk bar: horizontal stacked bar showing count per tier
// ₹ leakage: sum of event.amount where duration_minutes >= 5
```

### Card 2 — Leakage After Unpaid (CR-544, Option B partial)

```javascript
// DELIVERED: cancel_after_unpaid events
//   Fields: order_id, amount, by, made_unpaid_at, cancel_time, gap_minutes, unpaid_count, scope
//   ₹ leakage = sum of event.amount

// NOT DELIVERED (placeholder):
//   discount_apply_after_unpaid — show "Discount events: Awaiting backend"
//   discount_remove_after_unpaid — same placeholder
//   repay_gap — show "Re-pay gap analysis: Awaiting backend"
```

### Card 3 — Leakage After Print (CR-546)

```javascript
// DELIVERED: all 4 event types
//   item_cancel_after_print: amount = cancelled item amount
//   order_cancel_after_print: amount = order total
//   discount_apply_after_print: discount_amount = applied discount ₹
//   discount_remove_after_print: discount_amount = removed discount ₹
//   ₹ leakage = sum of (cancel amounts + discount amounts)
```

---

## Edit Sites

### E-1 — `AuditLogMockup.jsx`: FULL REWRITE

The current 207-line file is replaced with the v3 3-card layout. Key structural changes:

| Section | Current (v2) | New (v3) |
|---------|-------------|---------|
| Header | "Order Edit Audit" | "Audit Report" (D2) |
| KPI bar | None | 4-card KPI strip |
| Body | Flat event table | 3 alert cards + expandable drill-down tables |
| Event types | 5 (make_unpaid, payment_method_change, 3× after_print) | 8+ (adds late_cancel, cancel_after_unpaid, discount_after_print) |
| Overlap | None | Approach C badges on drill-down rows |

**Component structure inside the file:**

```
AuditReportPage (default export)
  ├─ KpiBar — 4 stat cards
  ├─ AlertCard × 3 — card 1/2/3, each with:
  │   ├─ headline (count + ₹ leakage)
  │   ├─ risk bar (card 1 only) or sub-event breakdown
  │   └─ expandable drill-down table
  ├─ DrillDownTable — reusable table for card 2 & 3
  ├─ RiskBar — horizontal stacked bar for card 1
  └─ OverlapBadges — multi-category pills per row
```

**Data flow:**
```
fetchInsightsDashboard(from, to)
  → rawData.audits.orders[] (array of events)
  → useMemo: classify events into card1/card2/card3 arrays
  → useMemo: compute KPI counts (deduplicated)
  → useMemo: compute ₹ leakage per card
  → render KPI bar + 3 cards
```

**Preserved from current file:**
- Date picker (from/to + presets) — identical pattern
- Sidebar integration — identical pattern
- `fetchInsightsDashboard` import — identical
- `ReportLoadingShield` — identical
- Download menu (Excel/PDF) — identical structure
- `InsightsCacheContext` date sharing — identical

---

### E-2 — `Sidebar.jsx` L186: rename label

```javascript
// BEFORE (L186):
      { id: "insights-audit-log", label: "Order Edit Audit", path: "/reports-module/audit-log" },

// AFTER:
      { id: "insights-audit-log", label: "Audit Report", path: "/reports-module/audit-log" },  // D2: renamed from "Order Edit Audit"
```

---

## Verification Matrix

| # | Test | Expected | Automated? |
|---|------|----------|:---:|
| V-1 | Page loads at `/reports-module/audit-log` | Audit Report page renders with KPI bar + 3 cards | NO (browser) |
| V-2 | KPI bar shows 4 items | Total Events, Made Unpaid, Pay Method Changed, Post-Print Edits | NO (browser) |
| V-3 | Card 1 headline | Count + ₹ of late_cancel events with duration ≥ 5 min | NO (browser) |
| V-4 | Card 1 risk bar | 3 segments: Doubt / Risk / High Risk with correct counts | NO (browser) |
| V-5 | Card 1 click → Cancellation Report | Navigation to `/reports-module/cancellations?filter=high_risk` | NO (browser) |
| V-6 | Card 2 headline | Count + ₹ of cancel_after_unpaid events | NO (browser) |
| V-7 | Card 2 drill-down | cancel_after_unpaid rows with order #, staff, amount, gap_minutes | NO (browser) |
| V-8 | Card 2 placeholder | "Discount events: Awaiting backend" and "Re-pay gap: Awaiting backend" sections visible | NO (browser) |
| V-9 | Card 3 headline | Count + ₹ of all after-print events | NO (browser) |
| V-10 | Card 3 drill-down | Rows grouped by: item cancel, order cancel, discount apply, discount remove | NO (browser) |
| V-11 | Overlap badges on drill-down rows | Events in multiple cards show multi-category pills | NO (browser) |
| V-12 | KPI Total Events deduplicated | Unique order_ids, not sum of card counts | NO (browser) |
| V-13 | Sidebar label | "Audit Report" (not "Order Edit Audit") | NO (browser) |
| V-14 | Date picker + presets | Same as current — 7D/30D/MTD/LM/FY | NO (browser) |
| V-15 | Download Excel/PDF | Export works with v3 data structure | NO (browser) |
| V-16 | Ruby ZAP data | 101 late_cancel events appear on Card 1 for owner@ruby.com | NO (browser) |
| V-17 | Compile | `yarn build` exit 0, 0 new warnings | YES |

---

## Post-Code Registry Checklist

```
□ 1. registry.json: CR-543, CR-544, CR-546 → status: GATE_5A_IMPLEMENTED (v3)
□ 2. CR_REGISTRY.md: rows updated
□ 3. FILE_OWNERSHIP.md: AuditLogMockup.jsx + Sidebar.jsx listed with CR-543/544/546 marker
□ 4. Code markers: // CR-543, // CR-544, // CR-546 in relevant sections
□ 5. Compile check: yarn build exits 0, 0 new warnings
```

---

## Execution Sequence

```
1. Entry verify: AuditLogMockup.jsx exists (207 lines), Sidebar.jsx L186 exact
2. Apply E-2 (Sidebar.jsx: rename label — 1 line, low risk, do first)
3. Apply E-1 (AuditLogMockup.jsx: full rewrite to v3)
   a. Preserve: imports, date picker, sidebar, loading shield, download menu
   b. Add: KPI bar component (4 cards)
   c. Add: Card 1 — High Risk Cancellations (risk bar + ₹ leakage)
   d. Add: Card 2 — Leakage After Unpaid (cancel rows + placeholder sections)
   e. Add: Card 3 — Leakage After Print (4 event type rows + ₹ leakage)
   f. Add: Drill-down table with overlap badges
   g. Add: data classification useMemos
4. Compile check: yarn build
5. Browser verify: login as owner@ruby.com → navigate to Audit Report → verify 3 cards
6. Registry checklist
7. Checkpoint: ✅
```

---

## Risk Register

| Risk | Mitigation |
|------|-----------|
| `audits.orders[]` structure different from expected | Probe API first (curl with Ruby creds). Save response as evidence. |
| `late_cancel` events missing `risk_level` field | Defensive: `event.risk_level \|\| 'unknown'`. Skip from risk bar if missing. |
| Card 2 placeholder confuses users | Label clearly: "Discount events: Awaiting backend delivery" with muted text |
| Overlap classification incorrect | Unit test the classification function with synthetic events covering all 7 overlap scenarios from D9 |
| AuditLogMockup full rewrite breaks other imports | Only imported in App.js L201. No other consumers. Safe to rewrite. |
| Download Excel/PDF with new structure | Adapt export columns to v3 layout. Test with Ruby data. |

---

## Card 2 Placeholder Sections (Option B)

When backend delivers NEW-1 (discount_after_unpaid) and NEW-2 (repay_gap):

1. Remove the placeholder text
2. Add event type to `CARD_2_TYPES` array
3. Add rows to drill-down table
4. Add ₹ amounts to Card 2 leakage sum

No structural changes needed — the card/table framework is designed to accept new event types.

---

```
Plan ready: Audit Report v3 (CR-543 + CR-544 + CR-546) Option B
2 files: AuditLogMockup.jsx (full rewrite) + Sidebar.jsx (1 line rename)
Zero hotspots
19 design decisions applied (D1–D19)
Backend: Card 1 + Card 3 fully delivered. Card 2 partial (cancel_after_unpaid delivered, discount/gap pending)
Test data: owner@ruby.com (101 late_cancel events)
Awaiting Gate 4 GO.
```
