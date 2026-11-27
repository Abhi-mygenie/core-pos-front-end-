# QA Handover — BUG-682 (cancelNoteMandatory always false — wrong transform object)

**Date:** 2026-11-25 · **Risk:** MEDIUM · **Sprint:** nov_cr_batch
**File:** `src/api/transforms/profileTransform.js`

---

## 1. Verification Matrix

| Edit | File | Change | Self-Test |
|---|---|---|---|
| E1 | profileTransform.js:231 | `cancelNoteMandatory: api.settings?.cancel_note_mandatory === 'Yes'` added to `cancellation` context object (was only in `settings`) | ✅ BUG-682 marker confirmed at L231 |

Compile: webpack clean.

---

## 2. Browser Test Cases

**Requires:** Cafe103 (has `cancel_note_mandatory = Yes` in settings). Confirm via Settings → Cancellation on Cafe103.

| # | Test | Steps | Expected |
|---|---|---|---|
| T1 | Cancel item → note required | Login cafe103 → place order → cancel item → Notes field | Label shows "Additional Notes *" (red asterisk = mandatory) |
| T2 | Confirm disabled without note | Cancel item modal open → do NOT type note → Confirm button | Confirm button DISABLED, cannot submit |
| T3 | Confirm enabled with note | Same modal → type any note → Confirm button | Button ENABLED, submits successfully |
| T4 | Cancel order → note required | Same → cancel full order | Same mandatory behaviour on order-level cancel |
| T5 | Cafe103 OFF → optional | Temporarily toggle setting OFF (if owner allows) or test on a restaurant with setting OFF | Label shows "Additional Notes (Optional)", no asterisk, Confirm enabled without note |

---

## 3. Regression Tests

| # | What | Why |
|---|---|---|
| R1 | Cancellation works normally (no note required) on restaurant with setting OFF | profileTransform L435 (settings context) also still present — dual mapping, no regression |
| R2 | Cancel food item flow completes end-to-end | The fix is in profile fetch, not in cancel API call |

---

## 4. Registry Sync Confirmation

Registry: BUG-682 → GATE_5A_IMPLEMENTED · Sprint: nov_cr_batch ✅

---

## 5. Credentials + Environment

| Account | Password | Restaurant | Use |
|---|---|---|---|
| owner@cafe103.com | Qplazm@10 | Cafe 103 (644) | cancel_note_mandatory = Yes setting |

**Note:** Confirm `cancel_note_mandatory = Yes` on Cafe103 via Settings → Cancellation before running T1-T4.
