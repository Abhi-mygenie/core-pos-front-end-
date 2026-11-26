# BATCH-A · CR-493 B5 + B6 — Implementation Plan Update (Gate 3) — 2026-11-16

> Status: **GATE_3_PLAN_FROZEN** (B5 ready pending FLAG 1-2 answers; B6 ready pending BA-23 delivery)
> Supersedes: §5 "BLOCKED edits" in `plans/BATCH-A_CR-493_IMPLEMENTATION_PLAN_2026_11_15.md`
> Risk: HIGH. Mockups: M1 `#m1`, M2 `#m2`.
> Backend handoff: `CR-493_CANCEL_REASON_AND_NOTES_FRONTEND_HANDOFF.md`
> Contract review: `backend_briefs/BACKEND_CONTRACT_REVIEW_CR-493_BA05_BA06_BA23_2026_11_16.md`

---

## 0. Entry verification — Code reality at HEAD (2026-11-16)

### CancelOrderModal.jsx (155 lines)

| Line | Current | Relevant to |
|---|---|---|
| L8 | Props: `{ table, itemCount, reasons, onClose, onCancel, mode }` | B5: needs new prop `cancelNoteMandatory` |
| L11 | `const [cancellationNote, setCancellationNote] = useState('');` | B5: note state exists |
| L18 | `if (!selectedReason || submitting) return;` | B5: add note-empty guard here |
| L116 | `{isRefund ? 'Refund Note' : 'Notes (Optional)'}` | B5: change label when mandatory |
| L139 | `disabled={!selectedReason || submitting}` | B5: add note guard to button disabled |

### CancelFoodModal.jsx (270 lines)

| Line | Current | Relevant to |
|---|---|---|
| L5 | Props: `{ item, reasons, onClose, onCancel }` | B5: needs new prop `cancelNoteMandatory` |
| L7 | `const [additionalNotes, setAdditionalNotes] = useState("");` | B5: note state exists |
| L31 | `if (!selectedReason || submitting) return;` | B5: add note-empty guard here |
| L213-214 | `Additional Notes (Optional)` | B5: change label when mandatory |
| L256 | `disabled={!selectedReason || submitting}` | B5: add note guard to button disabled |

### profileTransform.js (L225-230)

| Line | Current | Relevant to |
|---|---|---|
| L225-230 | `cancellation: { allowPostServeCancel, allowPostServeCancel2, orderCancelWindowMinutes, itemCancelWindowMinutes }` | B5: add `cancelNoteMandatory` here |

### RestaurantContext.jsx (L51-58)

| Line | Current | Relevant to |
|---|---|---|
| L51-58 | `cancellation` useMemo with 4 defaults | B5: add `cancelNoteMandatory: false` to defaults |

### OrderEntry.jsx (L66, L3148, L3158)

| Line | Current | Relevant to |
|---|---|---|
| L66 | `const { restaurant, features, cancellation, settings, printerAgents } = useRestaurant();` | B5: `cancellation` already destructured — has `cancelNoteMandatory` once added to transform |
| L3148 | `<CancelFoodModal item={cancelItem} reasons={...} onClose={...} onCancel={...} />` | B5: add `cancelNoteMandatory={cancellation.cancelNoteMandatory}` prop |
| L3158-3163 | `<CancelOrderModal table={...} itemCount={...} reasons={...} onClose={...} onCancel={...} mode={...} />` | B5: add `cancelNoteMandatory={cancellation.cancelNoteMandatory}` prop |

### restaurantSettingsTransform.js (L24)

| Line | Current | Relevant to |
|---|---|---|
| L24 | `const advanced = data.advanced || {};` | B5: read `cancel_note_mandatory` from `advanced` |

### CancellationsMockup.jsx (L252-282)

| Line | Current | Relevant to |
|---|---|---|
| L273 | `scope: i.scope || 'item'` | B6: no `cancel_source` mapped |
| L296 | `reason: r.reason || 'No reason provided'` | B6: verify "No reason provided" gone |
| L322 | `cancelledOrderCount: s.cancelled_order_count || s.order_scope_count || 0` | B6: verify no double-count |

---

## 1. Conflict pre-check (2026-11-16)

| File | Last modifier | Open items | Conflict? |
|---|---|---|---|
| CancelOrderModal.jsx | BUG-674 E2 (2026-11-16) | None | ✅ CLEAR |
| CancelFoodModal.jsx | CR-493 E4/E5 + BUG-670 B1 (2026-11-16) | None | ✅ CLEAR |
| profileTransform.js | CR-482 (2026-11-08) | None open on `cancellation` block | ✅ CLEAR |
| restaurantSettingsTransform.js | CR-489 (2026-11-06) | None | ✅ CLEAR |
| RestaurantContext.jsx | Stable | None | ✅ CLEAR |
| OrderEntry.jsx | BUG-674/670/CR-493 E1-E5/CR-515 (2026-11-16) | None on modal call sites | ✅ CLEAR |
| CancellationsMockup.jsx | CR-480 (2026-11-08) | None | ✅ CLEAR |

---

## 2. Exact edits — B5 (BA-05: Notes mandatory setting)

### B5-E1: profileTransform.js — Add `cancelNoteMandatory` to cancellation block

**File:** `src/api/transforms/profileTransform.js`
**Line:** L229 (after `itemCancelWindowMinutes`)
**Current:**
```js
      cancellation: {
        allowPostServeCancel: toBoolean(api.cancle_post_serve),
        allowPostServeCancel2: toBoolean(api.allow_cancel_post_server),
        orderCancelWindowMinutes: parseInt(api.cancel_order_time) || 0,
        itemCancelWindowMinutes: parseInt(api.cancel_food_timings) || 0,
      },
```
**New:**
```js
      cancellation: {
        allowPostServeCancel: toBoolean(api.cancle_post_serve),
        allowPostServeCancel2: toBoolean(api.allow_cancel_post_server),
        orderCancelWindowMinutes: parseInt(api.cancel_order_time) || 0,
        itemCancelWindowMinutes: parseInt(api.cancel_food_timings) || 0,
        cancelNoteMandatory: api.cancel_note_mandatory === 'Yes', // CR-493 B5: BA-05
      },
```
**Note:** Handoff FLAG 1 says profile path may differ from `restaurants[0]`. The existing `fromAPI.restaurant()` receives `api = restaurants?.[0]`, and the key is at the root level of that object (same as `cancle_post_serve`). If backend nests it under `settings`, dual-path fallback: `api.cancel_note_mandatory ?? api.settings?.cancel_note_mandatory`.

### B5-E2: RestaurantContext.jsx — Add default

**File:** `src/contexts/RestaurantContext.jsx`
**Line:** L55 (after `itemCancelWindowMinutes: 0,`)
**Current:**
```js
    return restaurant?.cancellation || {
      allowPostServeCancel: false,
      allowPostServeCancel2: false,
      orderCancelWindowMinutes: 0,
      itemCancelWindowMinutes: 0,
    };
```
**New:**
```js
    return restaurant?.cancellation || {
      allowPostServeCancel: false,
      allowPostServeCancel2: false,
      orderCancelWindowMinutes: 0,
      itemCancelWindowMinutes: 0,
      cancelNoteMandatory: false, // CR-493 B5
    };
```

### B5-E3: restaurantSettingsTransform.js — Read from settings-list + write to update-settings

**File:** `src/api/transforms/restaurantSettingsTransform.js`
**Read (fromAPI):** Add to step5 (operational/cancel section, near L107 `settelmentReport`)
```js
        cancelNoteMandatory: toBool(advanced.cancel_note_mandatory), // CR-493 B5
```
**Write (toAPI):** When toAPI section is built (currently "Phase 2" stub at L115+), add:
```js
        cancel_note_mandatory: settings.cancelNoteMandatory ? 'Yes' : 'No', // CR-493 B5
```
**Note:** Handoff confirms path is `data.advanced.cancel_note_mandatory`. This matches the existing `advanced` object at L24.

### B5-E4: OrderEntry.jsx — Pass prop to both modals

**File:** `src/components/order-entry/OrderEntry.jsx`
**Line L3148** (CancelFoodModal call):
**Current:**
```jsx
<CancelFoodModal item={cancelItem} reasons={getItemCancellationReasons()} onClose={() => setCancelItem(null)} onCancel={handleCancelFood} />
```
**New:**
```jsx
<CancelFoodModal item={cancelItem} reasons={getItemCancellationReasons()} onClose={() => setCancelItem(null)} onCancel={handleCancelFood} cancelNoteMandatory={cancellation.cancelNoteMandatory} />
```

**Line L3158-3163** (CancelOrderModal call):
**Current:**
```jsx
<CancelOrderModal
  table={table}
  itemCount={cartItems.filter(i => i.placed && i.status !== 'cancelled').length}
  reasons={getOrderCancellationReasons()}
  onClose={() => setShowCancelOrderModal(false)}
  onCancel={handleCancelOrder}
  mode={orderData?.razorpayOrderId ? 'refund' : 'cancel'}
/>
```
**New:**
```jsx
<CancelOrderModal
  table={table}
  itemCount={cartItems.filter(i => i.placed && i.status !== 'cancelled').length}
  reasons={getOrderCancellationReasons()}
  onClose={() => setShowCancelOrderModal(false)}
  onCancel={handleCancelOrder}
  mode={orderData?.razorpayOrderId ? 'refund' : 'cancel'}
  cancelNoteMandatory={cancellation.cancelNoteMandatory}
/>
```
**Note:** `cancellation` is already destructured at L66 — no new import needed.

### B5-E5: CancelOrderModal.jsx — Accept prop, conditional label, button guard, 422 handling

**File:** `src/components/order-entry/CancelOrderModal.jsx`

**a) Props (L8):**
```js
// Current:
const CancelOrderModal = ({ table, itemCount, reasons = [], onClose, onCancel, mode = 'cancel' }) => {
// New:
const CancelOrderModal = ({ table, itemCount, reasons = [], onClose, onCancel, mode = 'cancel', cancelNoteMandatory = false }) => {
```

**b) Note-empty guard — early return (L18):**
```js
// Current:
if (!selectedReason || submitting) return;
// New:
if (!selectedReason || submitting) return;
if (cancelNoteMandatory && !cancellationNote.trim()) return; // CR-493 B5
```

**c) Label (L115-116):**
```jsx
// Current:
{isRefund ? 'Refund Note' : 'Notes (Optional)'}
// New:
{isRefund ? 'Refund Note' : (cancelNoteMandatory ? <>Notes <span style={{ color: COLORS.errorText }}>*</span></> : 'Notes (Optional)')}
```

**d) Button disabled (L139):**
```jsx
// Current:
disabled={!selectedReason || submitting}
// New:
disabled={!selectedReason || submitting || (cancelNoteMandatory && !cancellationNote.trim())}
```

**e) 422 error handling (L25):** Already handled — the existing catch block reads `err?.response?.data?.errors?.[0]?.message` and shows it in `setError(msg)`. Backend 422 `CANCEL_NOTE_REQUIRED` will surface via this path. **No change needed.**

**f) Razorpay refund note:** Handoff says "validate the note before submitting the refund." In refund mode (`isRefund`), the label is already 'Refund Note' (no "Optional"). The button guard at (b) applies to both modes. If `cancelNoteMandatory` is ON, refund mode also requires a note — which is correct behaviour per handoff. **No additional change needed.**

### B5-E6: CancelFoodModal.jsx — Accept prop, conditional label, button guard

**File:** `src/components/order-entry/CancelFoodModal.jsx`

**a) Props (L5):**
```js
// Current:
const CancelFoodModal = ({ item, reasons = [], onClose, onCancel }) => {
// New:
const CancelFoodModal = ({ item, reasons = [], onClose, onCancel, cancelNoteMandatory = false }) => {
```

**b) Note-empty guard — early return (L31):**
```js
// Current:
if (!selectedReason || submitting) return;
// New:
if (!selectedReason || submitting) return;
if (cancelNoteMandatory && !additionalNotes.trim()) return; // CR-493 B5
```

**c) Label (L213-214):**
```jsx
// Current:
Additional Notes (Optional)
// New:
{cancelNoteMandatory ? <>Additional Notes <span style={{ color: '#EF4444' }}>*</span></> : 'Additional Notes (Optional)'}
```

**d) Button disabled (L256):**
```jsx
// Current:
disabled={!selectedReason || submitting}
// New:
disabled={!selectedReason || submitting || (cancelNoteMandatory && !additionalNotes.trim())}
```

**e) 422 error handling:** `submitError` state + catch block at L37-39 already shows `err?.response?.data?.errors?.[0]?.message`. Backend 422 will surface. **No change needed.**

---

## 3. Exact edits — B6 (BA-23: cancel_source verification)

**BA-23 status: NOT DELIVERED** — handoff explicitly says "Pending backend work." B6 is FE-verify-only once backend delivers.

### B6-V1: CancellationsMockup.jsx — Map `cancel_source` (additive, prep for verification)

**File:** `src/pages/reports-module/CancellationsMockup.jsx`
**Line:** L273 (inside cancelledItems transform, after `scope`)
**Add:**
```js
      cancelSource: i.cancel_source || '', // CR-493 B6: manual / auto_last_item / merge
```

### B6-V2: Verification steps (manual, after backend delivers)

| # | What to verify | How | Expected |
|---|---|---|---|
| V-B6-1 | Cancel last item in an order → check Insights API | Curl `insights-cancellations` for the date | Order row has `cancel_source: "auto_last_item"` |
| V-B6-2 | Order cancel totals | Check `summary.cancelled_order_count` | Does NOT include auto_last_item orders |
| V-B6-3 | "No reason provided" gone | Filter items by empty reason | Zero rows with empty/null reason from auto-cancelled orders |
| V-B6-4 | Merge exclusion | Check merged orders | `cancel_source: "merge"` excluded from totals |
| V-B6-5 | Reason carried | Auto-cancelled order row | `cancellation_reason` = last item's reason text, not null |
| V-B6-6 | Employee carried | Auto-cancelled order row | `canceled_by` = employee who cancelled the last item, not null |

**No FE logic change needed for counting** — if backend correctly excludes `auto_last_item` and `merge` from `cancelled_order_count`, FE reads the number as-is. If backend does NOT exclude them (delivers the field but doesn't fix counting), FE will need a filter:
```js
// Only if backend doesn't fix counting:
cancelledOrderCount: cancelledItems.filter(i => i.scope === 'order' && i.cancelSource === 'manual').length,
```
This decision is deferred until backend delivers and we can verify.

---

## 4. Files WILL change (B5)

| # | File | Lines | Change |
|---|---|---|---|
| B5-E1 | `api/transforms/profileTransform.js` | L229 | +1 line: `cancelNoteMandatory` |
| B5-E2 | `contexts/RestaurantContext.jsx` | L55 | +1 line: default |
| B5-E3 | `api/transforms/restaurantSettingsTransform.js` | L107 area | +1 line read, +1 line write |
| B5-E4 | `components/order-entry/OrderEntry.jsx` | L3148, L3158 | +1 prop each (2 lines) |
| B5-E5 | `components/order-entry/CancelOrderModal.jsx` | L8, L18, L116, L139 | 4 edits |
| B5-E6 | `components/order-entry/CancelFoodModal.jsx` | L5, L31, L214, L256 | 4 edits |

**Total: 6 files, ~12 lines changed.**

## 5. Files WILL change (B6 — prep only)

| # | File | Lines | Change |
|---|---|---|---|
| B6-V1 | `pages/reports-module/CancellationsMockup.jsx` | L273 | +1 line: map `cancelSource` |

## 6. Files WILL NOT touch

| File | Reason |
|---|---|
| `SettingsContext.jsx` | Reasons loading unchanged |
| `settingsTransform.js` | Reasons transform unchanged |
| `settingsService.js` | Reasons fetch unchanged |
| `orderTransform.js` | Cancel payload unchanged (BUG-670/674 own this) |
| `insightsService.js` | No new API call |
| `RestaurantSettingsPage.jsx` | Settings UI toggle for `cancel_note_mandatory` deferred — owner hasn't asked for UI control in POS Settings yet (backend admin phase 1 per handoff) |

---

## 7. Risks

| # | Risk | Severity | Mitigation |
|---|---|---|---|
| R-1 | FLAG 1: profile path might not be `restaurants[0].cancel_note_mandatory` | MEDIUM | Dual-path fallback: `api.cancel_note_mandatory ?? api.settings?.cancel_note_mandatory` in B5-E1 |
| R-2 | FLAG 2: settings-list API may not be live yet ("Planned") | LOW | FE reads from profile at boot (primary); settings-list is secondary for RestaurantSettingsPage which is not in scope |
| R-3 | BA-23 not delivered — cancel_source absent | LOW | B6-V1 maps with `|| ''` fallback; no logic depends on it until backend delivers |
| R-4 | Note mandatory blocks refund too | LOW | Correct per handoff ("validate the note before submitting the refund") |

---

## 8. Execution order

```
B5-E1 (profileTransform) → B5-E2 (RestaurantContext default) → B5-E3 (settingsTransform)
  → B5-E4 (OrderEntry props) → B5-E5 (CancelOrderModal) + B5-E6 (CancelFoodModal) [parallel]
  → B6-V1 (CancellationsMockup map field)
  → webpack compile check
```

---

## 9. Verification matrix

| # | Edit | Flow | Expected | Automated? |
|---|---|---|---|:---:|
| V-B5-1 | B5-E1+E2 | Profile loads with `cancel_note_mandatory: "No"` | `cancellation.cancelNoteMandatory === false` | NO |
| V-B5-2 | B5-E5c | Setting OFF → open order cancel | Label says "Notes (Optional)" | NO |
| V-B5-3 | B5-E5c | Setting ON → open order cancel | Label says "Notes *" | NO |
| V-B5-4 | B5-E5d | Setting ON, note empty → click button | Button disabled, cannot submit | NO |
| V-B5-5 | B5-E5d | Setting ON, note typed → click button | Button enabled, submits | NO |
| V-B5-6 | B5-E6c | Setting OFF → open item cancel | Label says "Additional Notes (Optional)" | NO |
| V-B5-7 | B5-E6c | Setting ON → open item cancel | Label says "Additional Notes *" | NO |
| V-B5-8 | B5-E6d | Setting ON, note empty → click button | Button disabled, cannot submit | NO |
| V-B5-9 | B5-E5e | Setting ON, submit with empty note, backend returns 422 | Error message shown in modal, modal stays open | NO |
| V-B5-10 | B5-E5 | Refund mode + setting ON, note empty | Button disabled (refund also requires note) | NO |

---

## 10. Blockers before implementation

| Blocker | Impact | Status |
|---|---|---|
| **FLAG 1 answer** | B5-E1 path — `restaurants[0].cancel_note_mandatory` or nested in `settings`? | ⏳ Waiting backend |
| **FLAG 2 answer** | B5-E3 — is `data.advanced.cancel_note_mandatory` live on preprod? | ⏳ Waiting backend |
| **BA-23 delivery** | B6 verification — `cancel_source` field must exist in API | ⏳ Waiting backend |

**B5 can be coded now with FLAG 1 dual-path fallback.** Full verification requires the setting to be live on preprod.
**B6 cannot be verified until BA-23 is delivered.** B6-V1 (field mapping) can be coded now as prep.

---

## 11. Post-code registry checklist

- [ ] `registry.json`: CR-493 → status GATE_5A_IMPLEMENTED (full, remove "B5/B6 blocked")
- [ ] `CR_REGISTRY.md`: row updated
- [ ] `FILE_OWNERSHIP.md`: 6 files listed with CR-493 B5 + date
- [ ] Code markers: `// CR-493 B5` on every modified line
- [ ] Compile: webpack 0 new warnings
- [ ] Tracker: BA-05 → DONE, BA-06 → DONE (already confirmed), BA-23 → DONE or PENDING (depends on delivery)

---

## Addendum — 2026-11-16 (FLAG 1 RESOLVED)

### FLAG 1 RESOLVED — V1 profile path confirmed

Owner screenshot (2026-11-16) shows `cancel_note_mandatory: "No"` at line 418 of the V1 profile response, inside `restaurants[0].settings` — same nested path as `order_edit_access`, `whatsapp_message`, `reconcile_amount`.

**B5-E1 exact edit (confirmed):**
```js
// profileTransform.js, inside fromAPI.settings(), after orderEditAccess line (~L428):
cancelNoteMandatory: apiSettings.settings?.cancel_note_mandatory === 'Yes', // CR-493 B5
```

No dual-path fallback needed. No extra settings-list call needed. Same pattern as every other setting.

**B5 is FULLY UNBLOCKED. All 6 edits (B5-E1 through B5-E6) ready for Gate 4 GO.**

### Blockers remaining
- B6 (BA-23): `cancel_source` not delivered — still waiting on Gyan
