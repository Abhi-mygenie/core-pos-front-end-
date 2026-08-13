# Legacy Bug Bulk Closure — 2026-05-12

> **Owner authorisation:** PRD §3 Step 3 grants Option A (Light Retro) for the 19 legacy April-2026 bugs listed below. This document is the **one-time grandfathering exception** to the Tier-3 6-Artifact Closure Gate Rule (added 2026-05-12 to `/app/memory/final/IMPLEMENTATION_AGENT_RULES.md`).
> **Branch:** `13-may-bug` (HEAD `fdb4bc3` at time of stamping).
> **Method:** Code inspection against the current `/app/frontend/src` codebase, cross-checked against the pre-flip backup of `BUG_TEMPLATE.md`.
> **Outcome:** All 19 bugs flipped from `Fixed (Apr-2026)` / `FIXED (Apr-2026)` / `Closed — confirmed working` to `Closed — Verified 2026-05-12 (retro)` in the master tracker.

---

## 1. Scope — 19 legacy April-2026 bugs

| BUG-001 | Prepaid Auto Bill Print — Payload Missing Tip and Discount | `OrderEntry.jsx`, `CollectPaymentPanel.jsx`, `orderService.js`, `orderTransform.js` |
| BUG-002 | Postpaid Collect Bill — Auto Bill Print Not Triggered (no order-temp-store call) | `OrderEntry.jsx`, `orderService.js`, `orderTransform.js`, `constants.js` |
| BUG-003 | Credit on Walk-in — Name Field Auto-Fills “Walk-In” | `OrderEntry.jsx`, `CollectPaymentPanel.jsx`, `orderTransform.js` |
| BUG-004 | Split Bill — Total Amount Wrong in Equally and By Person | `SplitBillModal.jsx`, `OrderEntry.jsx`, `CollectPaymentPanel.jsx` |
| BUG-006 | Service Charge Calculated Before Discount (Should Be After Discount, Then Taxes) | `CollectPaymentPanel.jsx`, `orderTransform.js` |
| BUG-007 | Place Order Payload for Delivery Orders Missing Full `delivery_address` Object | `orderTransform.js`, `OrderEntry.jsx` |
| BUG-009 | Rounding Off — Inverted Logic (₹1.06 Rounds to ₹2 Instead of ₹1) | `CollectPaymentPanel.jsx`, `orderTransform.js` |
| BUG-010 | Discount and Tip Fields — No Programmatic Max Validation (Allows >100% Discount) | `CollectPaymentPanel.jsx` |
| BUG-012 | Delivery Order Edit — Address Not Showing in UI and Not Printing on Bill | `OrderEntry.jsx`, `orderTransform.js` (`buildBillPrintPayload`) |
| BUG-013 | Service Charge Applied to Takeaway and Delivery (Should Be Dine-In and Room Only) | `CollectPaymentPanel.jsx`, `orderTransform.js`, `OrderEntry.jsx` |
| BUG-014 | GST Not Applied on Tip Amount | `CollectPaymentPanel.jsx`, `orderTransform.js` |
| BUG-015 | Loyalty, Coupon Code, and Wallet Shown on Collect Bill — Feature Flags Not Gating Visibility | `CollectPaymentPanel.jsx` |
| BUG-017 | Quantity Input — Amount Not Updating When Qty Is Typed (Items with Variants / Add-ons) | `components/order-entry/OrderEntry.jsx` |
| BUG-018 | Complimentary Items — (1) Payload defect on catalog-complimentary items, (2) Runtime marking via checkbox on Collect Bill, (3) Print payload regression (line prices + default-branch totals) | `api/transforms/orderTransform.js`, `api/constants.js`, `components/order-entry/OrderEntry.jsx`, `components/order-entry/CollectPaymentPanel.jsx` |
| BUG-019 | Scan / Re-engaged Delivery Orders — Delivery Charge Not Mapped to Collect Bill (cashier under-collects) | `components/order-entry/OrderEntry.jsx`, `components/order-entry/CollectPaymentPanel.jsx` |
| BUG-020 | Discount Calculation — Integer Rounding Instead of 2-Decimal (10% of ₹45 becomes ₹5 instead of ₹4.50, cascading into wrong SC base and wrong final bill) | `components/order-entry/CollectPaymentPanel.jsx` (lines ~202-227) |
| BUG-021 | Runtime-Marked Complimentary Item — Prints at Actual Price on Postpaid Collect-Bill Auto-Print (prepaid prints ₹0 correctly) | `api/transforms/orderTransform.js` `buildBillPrintPayload` (~lines 974-1020), `components/order-entry/OrderEntry.jsx` `AutoPrintCollectBill` block, `components/order-entry/CollectPaymentPanel.jsx` `handlePrintBill` |
| BUG-022 | Cancelled Item — Not Shown as Strikethrough in Collect Bill Page "ITEMS" List (Order page correctly strikes it through) | `components/order-entry/CollectPaymentPanel.jsx` (main items loop + room-service items loop) |
| BUG-023 | Print Bill from Dashboard Card — Service Charge Present in Print Payload for Takeaway / Delivery (residual of BUG-013 in default-branch print path) | order.isRoom === true` (matches the *effective* `CollectPaymentPanel.jsx:244` rule once `normalizeOrderType` folds walk-ins into `dineIn`). QA re-verified on order #731600 (takeaway, dashboard-card print): `serviceChargeAmount: 0`, `gst_tax: 17.5`, `order_subtotal == order_item_total == 395`. Override path untouched; no other files touched. | Close | `api/transforms/orderTransform.js` (`buildBillPrintPayload`, lines 1071-1092) |

## 2. Bugs explicitly excluded from this bulk closure

- **BUG-005** — Closed pre-session (not a business requirement) — terminal in tracker.
- **BUG-008** — Closed pre-session (already working) — terminal in tracker.
- **BUG-025 / BUG-026 / BUG-027** — Already final-doc-swept before 2026-05-12; no further action required per PRD §3.2 note.
- **BUG-011, BUG-016, BUG-024, BUG-028..BUG-049 (May-2026 sprint)** — Closed via individual smoke-signoff docs in this session; see `BUG_*_SMOKE_SIGNOFF.md`.

## 3. Grandfathering rationale

Per PRD §3 (this session's owner directive) and the newly-added Tier-3 rule:

> "For legacy bugs predating this rule, see `BUG_LEGACY_BULK_CLOSURE_2026_05_12.md` for the one-time grandfathering exception."

The 19 April-2026 bugs in scope §1 above were closed before the 6-artifact rule existed. Re-creating the missing artifacts (Intake / Impact Analysis / Implementation Plan / Pre-Implementation Code Gate / QA Report / Smoke Sign-off) for each would be ~57 documents of clerical retrospective work with no incremental safety value — the fixes have been in production since April-2026 and no regressions have been reported in the {intervening sprints, daily smokes, May owner walkthroughs}.

Instead, the PRD-approved Option A approach is:
1. **One retro implementation-summary per bug** documenting title, plain-English issue, current file:line references, fix description, and a code-inspection verification stamp — already produced in 19 sibling docs (`BUG_LEGACY_RETRO_SUMMARY_001.md` … `BUG_LEGACY_RETRO_SUMMARY_023.md`, skipping closed legacy IDs).
2. **This bulk sign-off doc** as the one owner-blanket-approval record satisfying the closure gate.

## 4. Per-bug retro summary documents

- BUG-001 — `BUG_LEGACY_RETRO_SUMMARY_001.md`
- BUG-002 — `BUG_LEGACY_RETRO_SUMMARY_002.md`
- BUG-003 — `BUG_LEGACY_RETRO_SUMMARY_003.md`
- BUG-004 — `BUG_LEGACY_RETRO_SUMMARY_004.md`
- BUG-006 — `BUG_LEGACY_RETRO_SUMMARY_006.md`
- BUG-007 — `BUG_LEGACY_RETRO_SUMMARY_007.md`
- BUG-009 — `BUG_LEGACY_RETRO_SUMMARY_009.md`
- BUG-010 — `BUG_LEGACY_RETRO_SUMMARY_010.md`
- BUG-012 — `BUG_LEGACY_RETRO_SUMMARY_012.md`
- BUG-013 — `BUG_LEGACY_RETRO_SUMMARY_013.md`
- BUG-014 — `BUG_LEGACY_RETRO_SUMMARY_014.md`
- BUG-015 — `BUG_LEGACY_RETRO_SUMMARY_015.md`
- BUG-017 — `BUG_LEGACY_RETRO_SUMMARY_017.md`
- BUG-018 — `BUG_LEGACY_RETRO_SUMMARY_018.md`
- BUG-019 — `BUG_LEGACY_RETRO_SUMMARY_019.md`
- BUG-020 — `BUG_LEGACY_RETRO_SUMMARY_020.md`
- BUG-021 — `BUG_LEGACY_RETRO_SUMMARY_021.md`
- BUG-022 — `BUG_LEGACY_RETRO_SUMMARY_022.md`
- BUG-023 — `BUG_LEGACY_RETRO_SUMMARY_023.md`

## 5. Verification assertions (this document is the proof artefact)

| Assertion | Evidence |
|---|---|
| Each of the 19 bugs has a retro summary file on disk | See §4 list — all 19 files written to `/app/memory/bugs/` on 2026-05-12 |
| Each retro summary captures: bug title, plain-English issue, file refs, brief description, verification stamp | Yes — generated from a single template (PRD §3 spec) and per-bug data from the pre-flip tracker backup |
| Master tracker rows flipped consistently | Yes — all 19 rows now show `**Closed — Verified 2026-05-12 (retro)**` in `/app/memory/BUG_TEMPLATE.md` |
| Pre-flip backup preserved | Yes — `/app/memory/BUG_TEMPLATE_BACKUP_2026_05_12.md` (full 326 KB copy of the pre-flip file) |
| Owner blanket sign-off | ✅ Granted via PRD §3 ("Q3: 'A' — Option A (Light Retro) approved for the 19 legacy April bugs") |

## 6. Owner blanket sign-off

> *Owner authorisation reproduced from PRD §3 banner — preserved verbatim:*
>
> "Q3: 'A' — **Option A (Light Retro) approved** for the 19 legacy April bugs."

**Effective:** 2026-05-12
**Applied to:** the 19 bug IDs listed in §1.
**Status after sign-off:** all 19 master-tracker rows flipped to `Closed — Verified 2026-05-12 (retro)`.

## 7. Tier-3 6-Artifact Rule compliance (post-this-document)

After 2026-05-12, no new bug closure may use this bulk-grandfathering path. The Tier-3 rule (`/app/memory/final/IMPLEMENTATION_AGENT_RULES.md` §"Closure Gate — 6-Artifact Rule") requires all six artifacts for any future closure. This bulk doc is the **single exception** for legacy April-2026 bugs only.

---

— End of Legacy Bug Bulk Closure 2026-05-12 —
