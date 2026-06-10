# CRM 2.0 — CR-002 Cross-Sell — Preview Checkpoint Handoff

**Date:** 2026-05-26
**Sprint:** CRM 2.0
**CR ID:** `CR_002`
**Type:** Preview Checkpoint Handoff
**Stage:** 6 (between Phase 1 and Phase 2)
**Predecessor:** `implementation/CRM2_0_CR_002_CROSS_SELL_PHASE_1_IMPLEMENTATION_REPORT_2026_05_26.md`

---

## 1. Phase 1 Status

```
crm2_cr002_phase_1_complete_preview_checkpoint_ready
```

All Phase 1 code (API service, transform, cache hook) is implemented and build-verified. Zero visual changes to the app.

---

## 2. Preview Method

**Option C — Screenshot + annotated mockup.**

Screenshots will be captured by the implementation agent after temporarily rendering Phase 2 UI with live CRM data piped through the hook.

---

## 3. Preview Checklist (P-1 through P-9)

The following preview elements must be reviewed and approved by the owner before any Phase 2 production UI code is committed.

| # | Preview Element | Description | Approval Status |
|---|---|---|---|
| P-1 | CustomerModal — Profile banner (populated customer) | Name, phone, tier pill (Bronze/Silver/Gold/Platinum), value-band pill (Low/Medium/High/VIP), churn pill (Watch/At Risk), win-back pill, stats row (visits / spend / points / wallet), usual channel/time chips, last visit relative time | PENDING |
| P-2 | CustomerModal — Past Favourites chip row | Top-5 items as clickable chips with name + order count (e.g. "Nuts Overload 78x") | PENDING |
| P-3 | CustomerModal — Smart Suggestions 3-card section | Each card: name, reason text, source pill (history/restaurant), confidence %, price from menu, "+ Add" button | PENDING |
| P-4 | CustomerModal — new-customer entry mode | Proof that existing form (Name, Phone, Member ID, Birthday, Anniversary, Cancel, Save) is completely unchanged | PENDING |
| P-5 | CustomerModal — first-time customer | "New Customer" badge shown, band/churn/favourites/suggestions hidden | PENDING |
| P-6 | ItemNotesModal — Customer Preferences populated | Top-5 item-specific notes with `<note> (count x relative-time)` format, clickable to add as green chip | PENDING |
| P-7 | OrderNotesModal — Customer History populated | Same format as P-6 for order-level notes | PENDING |
| P-8 | Loading skeleton states | Animate-pulse shimmer placeholders for profile/favourites/suggestions while fetch in flight | PENDING |
| P-9 | Empty / error states | Sections hidden cleanly on no-data / timeout / auth failure | PENDING |

---

## 4. Approval Options

| Response | Action |
|---|---|
| **APPROVED** | Implementation agent proceeds to Phase 2 — production UI committed to existing modals |
| **CHANGES_REQUESTED** | Implementation agent updates preview per owner feedback, re-presents |
| **REJECTED** | Escalate to planning agent for redesign |

---

## 5. Key Design Decisions in Preview (from Planning Doc §4)

| Decision | Value |
|---|---|
| Path C: Zero new top-level surfaces | Everything inside existing modals |
| `usual_channel` / `usual_time_of_day` | Shown as small gray chips when non-null |
| Loading UX | Tailwind `animate-pulse` skeleton shimmer |
| Click behaviour (chips / cards) | `food.customizable ? setCustomizationItem(food) : addToCart(food)` |
| Existing customer form | Collapsed under "Edit Customer Info" in existing-customer mode |
| notePresets.js mock | Kept but no longer called by production modals (replaced by hook data) |

---

## 6. Data Available for Preview

The `useCustomerIntel` hook is already wired in OrderEntry.jsx. When a CRM-attached customer is selected (e.g. after login to restaurant 689 and selecting "abhishek jain"), the hook fires `POST /pos/customers/order-suggestions` and returns normalized data including:

- `customerSummary` (name, phone, tier, visits, spend, points, wallet)
- `customerValue` (band, churnRisk, winBackRecommendation) or null for first-time customers
- `orderPatterns.topItems` (top 5 favourite items)
- `customerNotes` (order-level past notes)
- `itemNotesByItemId` (item-level past notes per cart item)
- `crossSellItems` (top 3 cross-sell suggestions)
- `featureFlags` (cross_sell, upsell, ai)

This data is the source for all P-1 through P-9 preview elements.

---

## 7. Confirmations

| # | Confirmation | Status |
|---|---|---|
| 1 | Phase 1 complete and build-verified | CONFIRMED |
| 2 | No Phase 2 production UI committed | CONFIRMED |
| 3 | `CustomerModal.jsx` unchanged | CONFIRMED |
| 4 | `ItemNotesModal.jsx` unchanged | CONFIRMED |
| 5 | `OrderNotesModal.jsx` unchanged | CONFIRMED |
| 6 | `/app/memory/final/` untouched | CONFIRMED |
| 7 | `/app/memory/crm/crm_1_0/` untouched | CONFIRMED |

---

**Phase 2 production UI is BLOCKED until owner approves the preview checkpoint.**

**Recommended next agent:** `CRM2.0 CR-002 Preview Checkpoint QA/Owner Review Agent`

---

**End of Preview Checkpoint Handoff.**
