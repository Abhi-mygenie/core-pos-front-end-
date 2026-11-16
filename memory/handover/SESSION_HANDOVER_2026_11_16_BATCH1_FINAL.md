# Session Handover — 2026-11-16 — Batch 1 FINAL (Gate 3 Validated + Plans Written)

**For:** IMPLEMENTATION agent
**From:** PLANNING agent (2026-11-16 session)
**Repo:** `https://github.com/Abhi-mygenie/core-pos-front-end-.git` · branch `main` · commit `de118fb`
**App:** `/app/frontend` (React 19 + CRACO + Tailwind + Radix/shadcn) · backend at `preprod.mygenie.online`

---

## 1. What to do

Boot IMPLEMENTATION role per `control/AGENT_PROMPT_ALPHA.md`. All 6 items have Gate 3 plans FROZEN with exact line numbers verified at HEAD. Execute in the order below. No planning needed — just verify starting state at each file, code the edit, compile check, move to next.

---

## 2. Execution order + exact edits

### ITEM 1: CR-521 — Bill print card color green → orange

**Plan:** 1 line, 1 file. Zero risk.

| File | Line | Current | New |
|---|---|---|---|
| `src/constants/colors.js` | L18 | `billPrintedBg: "#E8F5E9"` | `billPrintedBg: "#FFEDD5"` // CR-521 |

Consumed by `TableCard.jsx` L287 + `OrderCard.jsx` L460 — no changes needed there.

---

### ITEM 2: CR-493 B5 — Notes mandatory toggle

**Plan:** `plans/BATCH-A_CR-493_B5_B6_IMPLEMENTATION_PLAN_2026_11_16.md` (read the Addendum section at the bottom for the corrected B5-E1 path)

| Edit | File | Line | What |
|---|---|---|---|
| B5-E1 | `api/transforms/profileTransform.js` | L428 (before closing `};` at L429) | Add: `cancelNoteMandatory: apiSettings.settings?.cancel_note_mandatory === 'Yes', // CR-493 B5` |
| B5-E2 | `contexts/RestaurantContext.jsx` | L56 (after `itemCancelWindowMinutes: 0,`) | Add: `cancelNoteMandatory: false, // CR-493 B5` |
| B5-E3 | `api/transforms/restaurantSettingsTransform.js` | After L107 (`settelmentReport`) | Add: `cancelNoteMandatory: toBool(advanced.cancel_note_mandatory), // CR-493 B5` |
| B5-E4a | `components/order-entry/OrderEntry.jsx` | L3148 (CancelFoodModal) | Add prop: `cancelNoteMandatory={cancellation.cancelNoteMandatory}` |
| B5-E4b | `components/order-entry/OrderEntry.jsx` | L3158 (CancelOrderModal) | Add prop: `cancelNoteMandatory={cancellation.cancelNoteMandatory}` |
| B5-E5a | `components/order-entry/CancelOrderModal.jsx` | L8 | Add `cancelNoteMandatory = false` to destructure |
| B5-E5b | Same | L18 (after existing guard) | Add: `if (cancelNoteMandatory && !cancellationNote.trim()) return; // CR-493 B5` |
| B5-E5c | Same | L116 | Change `'Notes (Optional)'` to `(cancelNoteMandatory ? <>Notes <span style={{ color: COLORS.errorText }}>*</span></> : 'Notes (Optional)')` |
| B5-E5d | Same | L139 | Add `|| (cancelNoteMandatory && !cancellationNote.trim())` to disabled |
| B5-E6a | `components/order-entry/CancelFoodModal.jsx` | L5 | Add `cancelNoteMandatory = false` to destructure |
| B5-E6b | Same | L31 (after existing guard) | Add: `if (cancelNoteMandatory && !additionalNotes.trim()) return; // CR-493 B5` |
| B5-E6c | Same | L214 | Change `Additional Notes (Optional)` to `{cancelNoteMandatory ? <>Additional Notes <span style={{ color: '#EF4444' }}>*</span></> : 'Additional Notes (Optional)'}` |
| B5-E6d | Same | L256 | Add `|| (cancelNoteMandatory && !additionalNotes.trim())` to disabled |

**6 files, 12 edit points.** `cancellation` already destructured at OrderEntry L66 — no new import needed.

---

### ITEM 3: BUG-639 — Verify expandCompItems (no code change)

`orderTransform.js` L1304: `const builtItems = expandCompItems(unplacedItems).map(buildCartItem);`

**Already present.** Verify this line exists at HEAD → update registry to CLOSED → move on. If the line is NOT there (unlikely), implement per the G1 cancel plan.

---

### ITEM 4: CR-526 Part 1 — Fix BUG-605 (Order Beta unpaid dialog)

**Plan:** 3-line fix at `OrderReportBetaPage.jsx` L909-914.

**Current (L909-914):**
```jsx
{markUnpaidTarget && (
  <MarkUnpaidConfirmDialog
    order={{ id: markUnpaidTarget.order_id, orderNumber: markUnpaidTarget.restaurant_order_id }}
    isPending={markUnpaidPending}
    onConfirm={() => handleUnpaidConfirm(markUnpaidTarget)}
    onClose={() => setMarkUnpaidTarget(null)}
```

**New:**
```jsx
{markUnpaidTarget && (
  <MarkUnpaidConfirmDialog
    open={!!markUnpaidTarget}
    order={markUnpaidTarget}
    isPending={markUnpaidPending}
    onConfirm={() => handleUnpaidConfirm(markUnpaidTarget)}
    onCancel={() => setMarkUnpaidTarget(null)}
```

Changes: (1) add `open` prop, (2) pass `order` directly (not wrapped), (3) `onClose` → `onCancel`. Matches Audit report pattern at `AllOrdersReportPage.jsx`.

---

### ITEM 5: CR-526 Part 2 — Credit Management "Remove" button

**Plan:** `plans/CR-526_PART2_IMPLEMENTATION_PLAN_2026_11_16.md`
**1 file:** `components/credit/CreditCustomerDetailSheet.jsx`, ~40 lines across 6 edits.

| Edit | What |
|---|---|
| E1 | Add imports: `useAuth`, `makeOrderUnpaid`, `MarkUnpaidConfirmDialog`, `Trash2` icon |
| E2 | `CreditRow`: add `onRemove` + `canRemove` props → "Remove" button on Open rows, "—" on Partial, nothing on Covered |
| E3 | Table header: add "Action" column |
| E4 | Main component: add `removeTarget` state + `handleRemoveConfirm` handler + `canRemoveCredit` permission check |
| E5 | Pass `onRemove` + `canRemove` to CreditRow in all 3 buckets (Open=true, Covered/Partial=false) |
| E6 | Render `MarkUnpaidConfirmDialog` before closing `</Sheet>` |

---

### ITEM 6: BUG-647 — Zero tax in payload when GST/VAT OFF

**Plan:** `plans/BUG-647_IMPLEMENTATION_PLAN_2026_11_16.md`
**3 files, ~35 lines across 8 edits.**

| Edit | File | What |
|---|---|---|
| E1 | `orderTransform.js` after L803 | Add `applyTaxFlags` wrapper function (6 lines) |
| E1a-e | `orderTransform.js` L1061/1069/1192/1199/1338 | Wrap `.map(buildCartItem)` with `.map(i => applyTaxFlags(i, options.taxFlags))` at 5 call sites |
| E2 | `orderTransform.js` L818-820 | Add `gstEnabled = true, vatEnabled = true` to `calcOrderTotals` extras destructure |
| E3 | `orderTransform.js` after L906 | Zero `gstTax`/`vatTaxPostDiscount` when flags false. Change `vatTaxPostDiscount` from const→let at L903 |
| E4 | `orderTransform.js` L929-934 | Conditional zeroing on `service_gst_tax_amount`, `tip_tax_amount`, `delivery_charge_gst_amount` |
| E5 | `orderTransform.js` L1617-1618 | collectBillExisting food_detail: `isGst && gstEnabled`, `!isGst && vatEnabled` |
| E6 | `OrderEntry.jsx` L1148 + L1159 | localTax/unplacedTax: add `gstStatus`/`vatEnabled` guard before accumulating |
| E7 | `CartPanel.jsx` L434 | taxTotals: add same guard. `restaurant` already available (L357, `useRestaurant` at L7) |
| E8 | `OrderEntry.jsx` all orderToAPI calls | Pass `taxFlags: { gstEnabled: restaurant?.tax?.gstStatus !== false, vatEnabled: restaurant?.settings?.vatEnabled !== false }` |

**Key detail:** `buildCartItem` signature unchanged — `applyTaxFlags` wraps the output. `calcOrderTotals` gets 2 new optional extras fields (backward-compatible defaults = true).

---

## 3. Total scope

| # | ID | Files | Lines | Risk |
|---|---|---|---|---|
| 1 | CR-521 | 1 | 1 | LOW |
| 2 | CR-493 B5 | 6 | 12 | HIGH |
| 3 | BUG-639 | 0 | 0 (verify) | — |
| 4 | CR-526 Part 1 | 1 | 3 | MEDIUM |
| 5 | CR-526 Part 2 | 1 | 40 | CRITICAL |
| 6 | BUG-647 | 3 | 35 | CRITICAL |
| **Total** | | **12 files** | **~91 lines** | |

---

## 4. Credentials

| Account | RID | Use |
|---|---|---|
| `owner@cafe103.com` / `Qplazm@10` | 644 | General testing, GST toggle, credit management |
| `owner@ruby.com` / `Qplazm@10` | 672 | Socket probes, APS testing |
| Login endpoint | — | `POST /api/v1/auth/vendoremployee/login` |

---

## 5. Key plans to read (boot sequence)

| # | File | For which item |
|---|---|---|
| 1 | This handover | All items — exact edits listed above |
| 2 | `plans/BATCH-A_CR-493_B5_B6_IMPLEMENTATION_PLAN_2026_11_16.md` | CR-493 B5 (full detail + verification matrix) |
| 3 | `plans/BUG-647_IMPLEMENTATION_PLAN_2026_11_16.md` | BUG-647 (applyTaxFlags wrapper + all call sites) |
| 4 | `plans/CR-526_PART2_IMPLEMENTATION_PLAN_2026_11_16.md` | CR-526 Part 2 (Credit Remove button) |
| 5 | `control/AGENT_PROMPT_ALPHA.md` | Role system + EXIT GATE checklist |

---

## 6. After coding all 6 items

1. Run EXIT GATE (5 checkboxes per Alpha prompt §ROLE 3)
2. Write QA handover with verification matrix results
3. Push to remote
4. Then proceed to Batch 2 handover (`handover/SESSION_HANDOVER_2026_11_16_BATCH2_BUG677_BUG678_CR545.md`)

---

## 7. What NOT to do

- Do NOT code B6 (BA-23 cancel_source) — blocked on backend
- Do NOT code CR-526 Part 3 (settlement lock) — blocked on BB-02/03
- Do NOT modify socket layer — that's Batch 2
- Do NOT touch CancellationsMockup.jsx — CR-524 already done this session

---

## 8. Environment

- Frontend: port 3000, supervisor-managed, hot reload
- Real backend: `preprod.mygenie.online`
- Git remote: PAT token in `backend/.env` as `GITHUB_PAT_TOKEN`
- Compile check: `tail -3 /var/log/supervisor/frontend.out.log`

---

*End of Batch 1 FINAL handover. All Gate 3 plans frozen. Gate 4 GO needed to implement.*
