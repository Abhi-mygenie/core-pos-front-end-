# QA Handover — CR-493 (Cancel Reason Mandatory) — 2026-11-16

## 1. Inherited from Plan (Verification Matrix results)

| Edit | File | Verification | Self-Test Result |
|------|------|-------------|:---:|
| E1 | CancelOrderModal.jsx L66 | Label reads "Cancellation Reason *" | PASS ✅ |
| E3 | CancelOrderModal.jsx L63-100 | Empty reasons → red message box, no dropdown, button disabled | PASS ✅ — code verified |
| E4 | CancelFoodModal.jsx L158 | Label reads "Cancellation Reason *" | PASS ✅ |
| E5 | CancelFoodModal.jsx L155-210 | Same empty-reasons block | PASS ✅ — code verified |

Compile: 0 new warnings.

## 2. Test Cases

### TC-1: Mandatory asterisk on labels (E1 + E4)
| Step | Action | Expected |
|------|--------|----------|
| 1 | Open order → click Cancel Order | Dialog shows "Cancellation Reason **\***" with red asterisk |
| 2 | Open order → click X on an item to cancel it | Item cancel dialog shows "Cancellation Reason **\***" with red asterisk |

### TC-2: No-reasons block (E3 + E5) — requires a restaurant with zero configured reasons
| Step | Action | Expected |
|------|--------|----------|
| 1 | (Setup: restaurant with no cancellation reasons) Open cancel order dialog | Dropdown hidden. Red message: "No cancellation reasons configured. Ask admin to add cancellation reasons." `data-testid="cancel-order-no-reasons"`. Button disabled. |
| 2 | Same for item cancel | Same red message with `data-testid="cancel-food-no-reasons"`. Button disabled. |

### TC-3: Normal flow regression — reasons present
| Step | Action | Expected |
|------|--------|----------|
| 1 | Cancel order with reasons configured | Dropdown visible, reason selectable, button enables after selection. Unchanged behaviour. |
| 2 | Cancel item with reasons configured | Same — unchanged behaviour. |

## 3. Regression Tests

| # | What to verify | Why |
|---|----------------|-----|
| R1 | BUG-674 notes box still visible in cancel dialog | Same file (CancelOrderModal) modified |
| R2 | Refund mode cancel still works | CancelOrderModal isRefund path unchanged |
| R3 | Item cancel still works end-to-end | CancelFoodModal modified |

## 4. Registry Sync Confirmation
- Registry synced: YES
- Items: CR-493
- Sprint: nov_cr_batch
- EXIT GATE: 5/5 PASSED
  - [x] REGISTRY SYNC: registry.json CR-493 → GATE_5A_IMPLEMENTED
  - [x] CR_REGISTRY.MD: row updated
  - [x] FILE_OWNERSHIP.MD: 2 files added
  - [x] CODE MARKERS: `// CR-493` in both files
  - [x] COMPILE CHECK: 0 new warnings

## 5. Credentials + Environment
- Preview URL: https://build-preview-339--3oltfmkm.preview.emergentagent.com
- Test: owner@cafe103.com / Qplazm@10
- Note: TC-2 (no-reasons block) needs a restaurant with zero configured cancellation reasons

## 6. Files Changed
| File | Lines | Change |
|------|-------|--------|
| `components/order-entry/CancelOrderModal.jsx` | L63-100 | `*` label + no-reasons message block |
| `components/order-entry/CancelFoodModal.jsx` | L155-210 | `*` label + no-reasons message block |

## 7. Blocked Edits
| Edit | Backend Ask | What FE will do after |
|------|-----------|----------------------|
| B5 | BA-05: `cancel_note_mandatory` setting key | Notes box becomes required when setting ON; button disabled while empty |
| B6 | BA-23: `cancel_source` field on auto-cancels | QA verify only — no double count in Insights |
