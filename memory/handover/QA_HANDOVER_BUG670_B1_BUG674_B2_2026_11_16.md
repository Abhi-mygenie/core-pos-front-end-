# QA Handover — BUG-670 B1 + BUG-674 B2 (Cancel Notes: Payload + Reports) — 2026-11-16

## 1. Edits Implemented

| Edit | File | Change | Self-Test |
|------|------|--------|:---:|
| BUG-670 B1-E1 | CancelFoodModal.jsx L35 | `note: additionalNotes.trim()` added to onCancel; L218: `maxLength={255}` | PASS ✅ |
| BUG-670 B1-E2 | OrderEntry.jsx L1560+L1568 | `note` param destructured, forwarded as `cancelItemNote` in options | PASS ✅ |
| BUG-670 B1-E3 | orderTransform.js L1006 | `cancel_item_note: options.cancelItemNote \|\| ''` in cancelItem payload | PASS ✅ |
| BUG-674 B2a | insightsService.js L313 | `cancelNote: line.cancel_item_note \|\| ''` in cancels drill | PASS ✅ |
| BUG-674 B2a | CancellationsMockup.jsx L931+L953-960 | "Cancel Note" header + amber display column | PASS ✅ |
| BUG-674 B2b | OrderReportBetaPage.jsx L743 | Cancel reason + note + cancelled-by on cancelled rows | PASS ✅ |

Compile: 0 new warnings.

## 2. Test Cases

### TC-1: Item cancel with note (BUG-670 B1)
| Step | Action | Expected |
|------|--------|----------|
| 1 | Open order → click X on an item → type "Burnt" in notes → pick reason → confirm | Network: `cancel_item_note: "Burnt"` in PUT cancel-food-item payload |
| 2 | Same but leave notes blank | Network: `cancel_item_note: ""` |
| 3 | Type 256+ characters in the notes box | Textarea stops at 255 (maxLength enforced) |

### TC-2: Cancellation Report shows cancel note (BUG-674 B2a)
| Step | Action | Expected |
|------|--------|----------|
| 1 | Cancel an item with note → open Cancellation Report (Insights) | "Cancel Note" column visible with amber icon showing the note text |
| 2 | Cancel an item WITHOUT note | Cancel Note column shows "—" |
| 3 | Kitchen instruction field ("Notes" column) | Unchanged — still shows kitchen instruction, NOT the cancel note |

### TC-3: Order Beta shows cancel info (BUG-674 B2b)
| Step | Action | Expected |
|------|--------|----------|
| 1 | Cancel a full order with reason + note → open Orders Beta | Cancelled row shows: reason — note (cancelled-by name) in red text |
| 2 | Non-cancelled order row | No cancel info shown |
| 3 | Cancelled order without note | Shows reason only (no " — " suffix) |

### TC-4: BUG-674 B3/B4/B7 — QA verify backend behaviour
| Step | Action | Expected |
|------|--------|----------|
| B3 | Cancel full order with note → read back cancel-order-list → check line reasons | Each line's own reason is UNCHANGED (not overwritten by order note) |
| B4 | Cancel order, leave note blank → read back | `cancellation_note: ""` (not copied from reason) |
| B7 | Razorpay refund cancel with Refund Note → read back | `cancellation_note` = the refund note; `payment_method`/`payment_status` untouched |

## 3. Regression Tests

| # | What to verify | Why |
|---|----------------|-----|
| R1 | Order-level cancel still works (BUG-674 E2/E6/E7/E8) | Same file (OrderEntry, orderTransform) modified |
| R2 | Item cancel without note (existing flow) | CancelFoodModal onCancel shape changed |
| R3 | Cancellation Report existing columns | CancellationsMockup table modified |
| R4 | Order Beta existing action buttons (CR-515 gates) | OrderReportBetaPage modified |

## 4. Registry Sync Confirmation
- Registry synced: YES
- Items: BUG-670, BUG-674
- EXIT GATE: 5/5 PASSED
  - [x] REGISTRY SYNC: both → GATE_5A_IMPLEMENTED
  - [x] BUG_TRACKER.MD: both rows updated
  - [x] FILE_OWNERSHIP.MD: 6 files added
  - [x] CODE MARKERS: BUG-670 (3 files), BUG-674 B2 (3 files)
  - [x] COMPILE CHECK: 0 new warnings

## 5. Credentials + Environment
- Preview: https://build-preview-339--3oltfmkm.preview.emergentagent.com
- API: https://preprod.mygenie.online
- Test: owner@cafe103.com / Qplazm@10

## 6. Files Changed
| File | Bug | Change |
|------|-----|--------|
| CancelFoodModal.jsx | BUG-670 | L35: note in onCancel; L218: maxLength=255 |
| OrderEntry.jsx | BUG-670 | L1560: note param; L1568: cancelItemNote option |
| orderTransform.js | BUG-670 | L1006: cancel_item_note field in payload |
| insightsService.js | BUG-674 | L313: cancelNote in cancels drill |
| CancellationsMockup.jsx | BUG-674 | L931: Cancel Note header; L953-960: display |
| OrderReportBetaPage.jsx | BUG-674 | L743: cancel info on cancelled rows |
