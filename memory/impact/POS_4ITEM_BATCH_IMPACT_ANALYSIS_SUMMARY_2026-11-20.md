# POS 4-Item Batch — Impact Analysis Summary (Gate 2) — 2026-11-20

**Role:** PLANNING (Gate 2 Impact Analysis). Owner GO given for all 4. Code is source of truth — every anchor re-verified against current `main`.

| ID | Title | Code Reality | Risk | Files WILL change | Planning-skip? | Owner decisions |
|---|---|---|---|---|---|---|
| **CR-561** | APS ₹1 price entry (both places) | PARTIAL | **HIGH** (now touches billing gate) | PopoutItemRow, ScanOrderPopOut, OrderEntry, CollectPaymentPanel (bill guard) | NO | LOCKED (A=both, B=price before final bill) |
| **BUG-741** | Pop-up cancel wording | FULL (label only) | **LOW–MEDIUM** | CancelFoodModal, PopoutItemRow, (ScanOrderPopOut label) | eligible (owner) | LOCKED (keep per-item + clarify) |
| **BUG-703** | Aggregator expand no-op in channel mode | PARTIAL | **MEDIUM** (P0 tracker) | DashboardPage:2048, ChannelColumnsLayout, ChannelColumn | n/a (3-file prop threading) | none |
| **BUG-742** | Custom-item KOT not printed first place | PARTIAL | **CRITICAL** (printing) | orderTransform.js:2336 (1 line) | blocked by CRITICAL unless OD-742-B downgrade | C=auto station; A/B open |

## Recommended implementation order (unchanged from handover)
1. **BUG-703** — 3-file prop threading, data already proven; fastest safe win (browser-verify `poki@macha.com`).
2. **BUG-742** — 1 line, but **must first capture the live `add-single-product` response** to confirm it returns `station`; else BACKEND_BRIEF. Risk CRITICAL → owner OD-742-B before planning-skip.
3. **BUG-741** — wording only; low risk; can implement after.
4. **CR-561** — HIGH: now also edits the billing gate (OD-561-B "price before final bill"); full gate + E2E money test; sequence after CR-547/552/558 settle on `ScanOrderPopOut`.

## Cross-item file conflicts (sequence, don't parallelize blindly)
- `ScanOrderPopOut.jsx` + `PopoutItemRow.jsx`: shared by **CR-561 + BUG-741** (this batch) and open **CR-547 / CR-552 / CR-557 / CR-558**. Coordinate / sequence.
- `pages/DashboardPage.jsx` (R5): BUG-703 adds one prop at :2048; shared with CR-547/552/525 — additive, low collision.
- `orderTransform.js` (R5): BUG-742 edits an isolated function (`customItemFromAPI`); no overlap with CR-552's `fromAPI.order` edits.

## Key risks / honesty notes
- **BUG-742 is only truly "1 line" if the backend returns `station` on add-single-product** — unverified (write-only call, not read-only probable). Flagged as the Gate-3 gate.
- **CR-561 scope grew** beyond the pop-up/edit UI because OD-561-B requires a pre-final-bill price guard, pulling in the financial billing path (R5).
- All four are **doc-only at this gate** — no application code changed.

## Next
Per item → Gate 3 Implementation Plan (exact edits + Verification Matrix + Post-Code Registry Checklist), then owner Gate 4 GO → Implementation.
