# BACKEND_CONTRACT_REVIEW — CR-493 (BA-05 / BA-06 / BA-23) — 2026-11-16

## Status: PARTIALLY ACCEPTED — 3 FLAGS + SIGN-OFF BLANK + BA-23 NOT DELIVERED

**Locked contract:** `contracts/BATCH-A_CR-493_API_CONTRACT_2026_11_15.md`
**Contract rules (owner R19/R20, 2026-11-15):** Names LOCKED. No renames. Backend may only reply OK / ETA / Not feasible. Errors use `{ "error_code": "CODE", "message": "text" }` with HTTP 422. Sign-off table must be filled.
**Handoff doc:** `CR-493_CANCEL_REASON_AND_NOTES_FRONTEND_HANDOFF.md` (backend reply)

---

## PART A: Field-by-Field Match — BA-05 (Notes Mandatory Setting)

### Setting key: `cancel_note_mandatory`

| Check | Contract | Handoff | Match |
|---|---|---|---|
| Key name | `cancel_note_mandatory` | `cancel_note_mandatory` | ✅ |
| Values | `"Yes"` / `"No"` | `"Yes"` / `"No"` | ✅ |
| Default | `"No"` | Treat absent as `"No"` | ✅ |
| Scope | One key for both order + item cancel | "Use one setting for both item and full-order cancellations" | ✅ |

### Endpoints

| Endpoint | Contract | Handoff | Match |
|---|---|---|---|
| `GET /profile` → `restaurants[0]` | `cancel_note_mandatory` at `restaurants[0]` | "Add the key to the restaurant payload. The contract shows `restaurants[0]`, but this V1 handler returns a restaurant object under `restaurants`." | ⚠️ FLAG 1 |
| `GET /settings-list` | `cancel_note_mandatory` | "Planned location: `data.advanced.cancel_note_mandatory`" | ⚠️ FLAG 2 |
| `POST /update-settings` | `cancel_note_mandatory` | "Planned input: `{\"advanced\":{\"cancel_note_mandatory\":\"Yes\"}}` encoded as JSON in the existing form field `data`" | ✅ (follows existing envelope pattern) |

### Error on empty note

| Check | Contract | Handoff | Match |
|---|---|---|---|
| HTTP code | 422 | 422 | ✅ |
| Error code | `CANCEL_NOTE_REQUIRED` | `CANCEL_NOTE_REQUIRED` | ✅ |
| Enforced on | `order-status-update` (cancel) + `cancel-food-item` | Both listed under "Existing write endpoints" | ✅ |

### Existing write endpoints

| Endpoint | Contract key | Handoff key | Match |
|---|---|---|---|
| `PUT /order-status-update` (cancel) | `cancellation_note` | `cancellation_note` | ✅ |
| `PUT /cancel-food-item` | `cancel_item_note` (max 255) | `cancel_item_note` (max 255) | ✅ |

### Behaviours

| Behaviour | Contract | Handoff | Match |
|---|---|---|---|
| When enabled, reject empty note | Yes (422) | "Require non-whitespace text in the dialog" + handle 422 | ✅ |
| When off, send empty string | Implied | "When toggle is off: send `\"\"` for a blank note" | ✅ |
| Note ≠ reason (keep separate) | Not specified | "Keep the selected reason and the note separate; never fill a blank note with the reason" | ✅ (good clarification, no conflict) |

---

## PART B: Field-by-Field Match — BA-06 (Reasons List)

| Check | Contract | Handoff | Match |
|---|---|---|---|
| Endpoint | `GET /api/v1/vendoremployee/cancellation-reasons` | Same endpoint + `?limit=100&offset=1` | ✅ |
| Field | `[].item_type` | `reasons[].item_type` | ⚠️ FLAG 3 |
| Values | `"Order"` / `"Food"` | "Use `reasons[].item_type` to distinguish `\"Order\"` from `\"Food\"`" | ✅ |
| Response shape | Top-level array `[]` | "Returns paginated `reasons[]`, not a top-level array" | ⚠️ FLAG 3 |
| `type` query param | Not specified | "`type` filters `user_type`, not `item_type`" | ✅ (useful clarification) |

---

## PART C: Field-by-Field Match — BA-23 (Last-Item Auto-Cancel)

| Check | Contract | Handoff | Match |
|---|---|---|---|
| `cancel_source` field | `"manual"` / `"auto_last_item"` / `"merge"` — on cancel-order-list, insights-cancellations, Order Beta | **"Pending backend work"** — not yet implemented | ❌ NOT DELIVERED |
| `cancellation_reason` on auto-cancel | = last item's reason text | "Keeps the item's reason on the parent" | ✅ (behaviour described) |
| `cancellation_note` on auto-cancel | `""` | "Sets the parent's note to `\"\"`" | ✅ |
| `canceled_by` on auto-cancel | = employee who cancelled last item | "Records the employee who cancelled the item" | ✅ |
| Insights double-count prevention | `auto_last_item` / `merge` NOT counted as order cancels | "Insights should count the item once, not also count an order cancellation" | ✅ (behaviour described) |
| Merge exclusion | Excluded from cancellation totals | "Merges stay excluded from cancellation totals" | ✅ |
| Inference rule | — | "Do not infer `cancel_source` from an empty note" | ✅ (good clarification) |

**BA-23 verdict:** Behaviours are correctly described but `cancel_source` field is explicitly marked as **"Pending backend work"** — NOT YET DELIVERED. The handoff is a spec acknowledgement, not a delivery confirmation.

---

## PART D: FLAGS — Explanation Required

### FLAG 1: Profile endpoint path ambiguity

**Contract says:** `GET /profile` → `restaurants[0].cancel_note_mandatory`

**Handoff says:** "The contract shows `restaurants[0]`, but this V1 handler returns a restaurant object under `restaurants`. Keep the existing shape and confirm the exact path on preprod before relying on it."

**Problem:** The handoff is warning that the path might not be `restaurants[0]` (array index) but rather `restaurants` (object or different structure). This is a data shape question that needs to be resolved — FE code currently reads `restaurants[0]` from profile.

**Questions:**
1. Is the actual path `restaurants[0].cancel_note_mandatory` (array) or `restaurants.cancel_note_mandatory` (object)? 
2. Or is it nested differently? FE needs the exact path.
3. Has this key been added to the profile response yet, or is it "planned"?

### FLAG 2: Settings-list nesting under `data.advanced`

**Contract says:** `cancel_note_mandatory` on `settings-list` response (flat location not specified).

**Handoff says:** "Planned location: `data.advanced.cancel_note_mandatory`"

**Problem:** The word "Planned" means this is not yet implemented. Also, the nesting under `data.advanced` was not in the contract. FE's existing settings transform needs to know the exact path.

**Questions:**
1. Is `data.advanced.cancel_note_mandatory` the final path, or could it change?
2. Is this live on preprod now, or still "planned"?
3. Does `update-settings` input shape `{"advanced":{"cancel_note_mandatory":"Yes"}}` match the read shape exactly?

### FLAG 3: Response shape — paginated `reasons[]` vs top-level array — **RESOLVED (NO ISSUE)**

**Contract says:** `[].item_type` — implying a top-level array.

**Handoff says:** "Returns paginated `reasons[]`, not a top-level array."

**Code verification:** FE already handles the paginated shape correctly:
- `settingsTransform.js:21` → `cancellationReasonsResponse(api)` reads `api.reasons` (paginated)
- `settingsService.js:28` → `result.reasons` (extracts array from paginated response)
- `LoadingPage.jsx:518` → `reasonsResponse.reasons` (paginated)
- `insightsService.js:70` → `cancelReasonsResp.data?.reasons || []` (paginated)

**Verdict:** Contract doc was imprecise (wrote `[]` instead of `reasons[]`), but FE code already handles the real shape. **No issue. No action needed.** Contract can be updated for doc accuracy but this is not a blocker.

---

## PART E: Delivery Status Summary

| BA ID | Item | Delivered? | Matches Contract? |
|---|---|---|---|
| **BA-05** | `cancel_note_mandatory` setting | ⚠️ PARTIALLY — "Database column added, API rollout pending" | Key name + values + error code: ✅. Endpoint paths: ⚠️ FLAGS 1-2 (need exact paths confirmed) |
| **BA-06** | `item_type` on reasons list | ✅ EXISTING (confirm only) | Values: ✅. Response shape: ⚠️ FLAG 3 |
| **BA-23** | `cancel_source` field | ❌ NOT DELIVERED — "Pending backend work" | Behaviour spec: ✅ (correct understanding). Field: ❌ NOT YET IN API |

---

## PART F: Sign-off Table — STILL BLANK

The contract (§5) requires backend to fill:

| ID | OK / ETA / Not feasible | Notes | Date |
|---|---|---|---|
| BA-05 | ⚠️ DB column added, API pending | Need ETA for API rollout | |
| BA-06 | ✅ Confirmed existing | Paginated shape clarification needed | |
| BA-23 | ❌ Pending | Need ETA for `cancel_source` field | |

---

## PART G: What FE Needs to Proceed

### Can proceed NOW (no backend dependency):
- Nothing new — E1, E3, E4, E5 are already implemented (reason always mandatory + no-reasons block). These don't depend on BA-05/06/23.

### Code-verified facts (for FLAG resolution):
- **FLAG 3 RESOLVED:** FE already reads `response.reasons` (paginated). `settingsTransform.js:21` parses `api.reasons`, `api.total_size`, `api.limit`, `api.offset`. `item_type` mapped at L46-49 (`isForOrder`, `isForItem`). No code change needed.
- **FLAG 1 context:** `profileTransform.js:79` reads `api.restaurants?.[0]` — array index. If backend returns an object instead of array, this will be `undefined`. Backend must confirm: is it `restaurants[0]` (array) or `restaurants` (object)?
- **FLAG 2 context:** `restaurantSettingsTransform.js:24` reads `data.advanced || {}`. So if `cancel_note_mandatory` lives at `data.advanced.cancel_note_mandatory`, the existing transform infrastructure will pick it up — FE just needs to add a line reading it. Path is compatible.
- **`cancel_note_mandatory` not yet in FE code:** No grep hits anywhere in `src/`. B5 edit will add it to `profileTransform.js` + `restaurantSettingsTransform.js` + both cancel modals once backend confirms it's live.

### BLOCKED until backend confirms:

| Blocker | What FE is waiting for | FE edit blocked |
|---|---|---|
| **BA-05 API live** | `cancel_note_mandatory` readable from profile + settings-list, 422 enforcement on cancel endpoints | B5 (notes mandatory toggle in both modals) |
| **FLAG 1 resolved** | Exact path on profile response | B5 implementation |
| **FLAG 2 resolved** | Confirm `data.advanced` nesting is final | B5 settings read/write |
| **BA-23 `cancel_source` delivered** | Field present on cancel-order-list, insights-cancellations, Order Beta | B6 (verify no double-count in Insights) |

### Request to backend:
1. **Answer FLAGS 1, 2, 3** (or confirm FE should probe preprod to resolve)
2. **Provide ETA** for BA-05 API rollout and BA-23 `cancel_source` delivery
3. **Fill sign-off table** in the contract

---

**Reviewed by:** FE Planning Agent
**Contract authority:** Owner (R19/R20 rules)
**Next:** Backend answers FLAGS → Owner amends contract if needed → B5/B6 unblocked
