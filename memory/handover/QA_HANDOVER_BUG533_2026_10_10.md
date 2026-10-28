# QA HANDOVER — BUG-533
## Date: 2026-10-10

---

## §1 — Registry Sync Confirmation

| Item | Status | Sprint | EXIT GATE |
|---|---|---|---|
| BUG-533 | GATE_5A_IMPLEMENTED | oct_bug_batch | 5/5 PASS |

Registry synced: YES. Code markers: InHousePanel ×1, DeparturesPanel ×1, ExtendStayForm ×6. Compile: PASS (0 new warnings).

---

## §2 — Files Changed

| File | Change |
|---|---|
| `src/components/pms/frontdesk/InHousePanel.jsx` | E1: hoisted enrichedRow above extend/bill exits |
| `src/components/pms/frontdesk/DeparturesPanel.jsx` | E2: same hoist |
| `src/components/pms/frontdesk/ExtendStayForm.jsx` | E3-E8: remove METHODS + 4 states + computed + UI blocks + update submit + two-row bill |

---

## §3 — Test Cases

### Current bill display

| # | Test | Steps | Expected | Severity if FAIL |
|---|------|-------|----------|---|
| TC-533-1 | Discounted booking: two-row bill display | `/pms/front-desk-v2?tab=inhouse` → bonk r4 → Extend | **Rack ~~₹7,035~~** → Check-in discount **−₹1,000** (green) → Total **₹5,985** → Balance **₹3,985** | BLOCKER |
| TC-533-2 | Paid so far unchanged | Same | Paid so far **₹2,000** | BLOCKER |
| TC-533-3 | Non-discounted room: single-row display | Any in-house room without check-in discount → Extend | Single row: Total (incl. GST) ₹X, no rack/discount lines | MAJOR |

### Removed fields

| # | Test | Steps | Expected | Severity if FAIL |
|---|------|-------|----------|---|
| TC-533-4 | Discount field absent | bonk r4 → Extend → left panel | No "Discount · optional" checkbox or input | BLOCKER |
| TC-533-5 | Collect Now field absent | Same | No "Collect Now · optional" checkbox or input | BLOCKER |

### Extend flow

| # | Test | Steps | Expected | Severity if FAIL |
|---|------|-------|----------|---|
| TC-533-6 | Extend confirm still works | bonk r4 → Extend → set new date + reason → Confirm | Success: new checkout set, no payment/discount in payload | MAJOR |
| TC-533-7 | DeparturesPanel same display | `/pms/front-desk-v2?tab=departures` → any discounted row → Extend | Same two-row display ₹5,985 / ₹3,985 | MAJOR |

---

## §4 — Regression Tests

| # | What to verify | Why |
|---|---|---|
| R1 | RowExpansionStub (detail expansion) still shows discount correctly | Both panels now pass enrichedRow to all 3 paths — verify detail view unaffected |
| R2 | FolioCheckoutPanel (Bill expansion) still works | Now receives enrichedRow instead of row — additive, but verify no crash |
| R3 | BUG-529/531: folio CPP ₹848 + InHouse balance column ₹3,985 still correct | Unrelated files — verify no regression |

---

## §5 — Credentials + Environment

| Account | Email | Password | Context |
|---|---|---|---|
| Owner | `owner@thegoankitchen.com` | `Qplazm@10` | RID 69, The Goan Kitchen |
| bonk booking | `MG-69-2C201998-53D8-4980-A6A8-B042088BFC9D` | — | Room r4 — has check-in discount ₹1,000 |
| Key values | rack ₹7,035 · discount ₹1,000 · discounted total ₹5,985 · paid ₹2,000 · balance ₹3,985 | — | All TC-533 tests |
| Extend path | `/pms/front-desk-v2?tab=inhouse` → bonk r4 → Extend button | — | TC-533-1 to TC-533-6 |
