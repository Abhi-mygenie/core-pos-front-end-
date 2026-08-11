# BUG-038 — Credit/TAB Customer CRM Autofill Impact Analysis

> **Sprint:** pos_final_1.0
> **Task type:** Bug Impact Analysis (read-only — no code changes)
> **Bug ID:** BUG-038
> **Title:** Credit/TAB payment customer details are not linking/autopopulating from CRM
> **Date:** 2026-05-12 (current session)
> **Status:** ⏸️ **PARKED — pending owner ↔ backend discussion** (2026-05-12)
> **Verdict (on park):** `parked_pending_backend_discussion` (was `frontend_fix_ready_for_planning`)
> **Scope guard:** Only Credit/TAB customer details inside `CollectPaymentPanel`. Cash / UPI / Card / Split / Transfer-to-Room payment paths are out of scope.

---

## 0. Park Note (2026-05-12)

Owner has parked this bug pending a discussion with the backend team. No implementation, no planning, no code change at this time.

**Reason for park:** Owner wants to align with backend on the `customer_id` propagation question (§11 Option B, §10 row 2) before committing the FE wiring direction. Specifically:

- Should `order-bill-payment` payload carry CRM `customer_id` for Credit/TAB, or continue to dedupe by `mobile` only?
- Is backend already creating / linking CRM records on Credit/TAB settle, or does it expect the FE to pass the linkage?
- Are there any Credit/TAB ledger tables that key off `customer_id` and would benefit from the FE supplying it?

**State preserved while parked:**
- Impact analysis (this doc) — kept as the source of truth.
- No code changed. No `/app/memory/final/` change. No `BUG_TEMPLATE.md` change.
- `BUG-038` remains "Open / Intake Created / Not Started" in the tracker.

**On unpark — recommended next step:**
- Owner confirms backend stance on `customer_id` in payload.
- Re-open this analysis. If backend wants only Option A (FE UX wiring, no payload change): proceed straight to a pre-implementation code gate. If Option B is in scope: extend the analysis with the confirmed payload shape and then code-gate.
- Either path: implementation effort remains small (single file, single conditional block in `CollectPaymentPanel.jsx:2110–2151`).

**Items to bring to the backend discussion:**
1. The endpoint `POST /api/v2/vendoremployee/order/order-bill-payment` payload shape that `orderTransform.collectBillExisting` emits today (see §6 / §9 in this doc — only `name` + `mobile` carried).
2. The CRM endpoints already wired on FE: `GET /api/pos/customers?search=…` and `POST /api/pos/customer-lookup`.
3. The §10.1 probe: does CRM return a record for the owner's test number `7505242126`?
4. Whether duplicate detection / customer ledgering on the backend keys off `mobile` or `customer_id`.

---

## 1. Docs Read

### `/app/memory/final/` (baseline rules — read-only)
- `FINAL_DOCS_APPROVAL_STATUS.md` — no AD/OD on Credit/TAB CRM linkage; payment-customer linkage is not a baseline-locked decision.
- `ARCHITECTURE_DECISIONS_FINAL.md` — Module 3 (Customer/CRM) explicitly names `customerService.searchCustomers` and `customerService.lookupCustomer` as the canonical CRM-side helpers; Module 5 (Payments) does not prescribe a separate customer-capture flow.
- `MODULE_DECISIONS_FINAL.md` §3 (Customer) — CRM is the source of truth for `customer_id`, `name`, `phone`. §5 (Payments) — payment payload carries customer-identifying fields only.
- `CHANGE_REQUEST_PLAYBOOK.md` — `orderTransform.js` is high-risk for shape changes; pure additive enrichment to a single payload field is acceptable.
- `IMPLEMENTATION_AGENT_RULES.md` — §"Areas that must not be changed casually" flags `orderTransform.collectBillExisting` for payload-shape changes; field-value additions (vs. shape changes) are permitted.
- `OPEN_QUESTIONS_FINAL_RESOLUTION.md` — no open question on Credit/TAB CRM linkage.

### Overlay docs
- `change_requests/BASELINE_RECONCILIATION_REPORT_2026_05_04.md` — no item on Credit/TAB CRM autofill.
- `change_requests/FINAL_ACCEPTANCE_AND_DOC_SWEEP_2026_05_04.md` — no acceptance item bound to this surface.
- `change_requests/PENDING_TASK_REGISTER_2026_05_04.md` — no pending item.

### Bug-specific
- `BUG_TEMPLATE.md` row 41 — BUG-038 "Credit Payment — Customer Details Not Linking / Auto-Populating From CRM" — Open / Intake Created / Not Started.

### Current code (verified this session)
- `frontend/src/api/services/customerService.js` (CRM helpers — fully wired).
- `frontend/src/components/order-entry/CartPanel.jsx` L342–376 (main customer capture — fires CRM search on typing).
- `frontend/src/components/order-entry/CustomerModal.jsx` L4, L22, L74 (uses `searchCustomers` + `lookupCustomer`).
- `frontend/src/components/order-entry/CollectPaymentPanel.jsx` L315–334 (`tabName` / `tabPhone` local state), L2109–2151 (Credit Customer Details UI), L555–568 (`tabContact` into `handlePayment` → `paymentData`).
- `frontend/src/api/transforms/orderTransform.js` L1129, L1270–1271 (`collectBillExisting` reads `tabContact?.name`, `tabContact?.phone` only).
- `frontend/src/api/constants.js` L34–35 (`CUSTOMER_SEARCH = '/pos/customers'`, `CUSTOMER_LOOKUP = '/pos/customer-lookup'`).
- Owner screenshots (this session): main Order Entry name field shows `[CRM]` console log when typing `abh`; Credit Customer Details section in CollectPaymentPanel accepts `abh` typed locally with NO CRM call observed (validation error "Enter 10-digit phone number" rendered).

---

## 2. Baseline Conflict Check

| Rule | Source | Compatibility |
|---|---|---|
| Module 3 — `customerService.{searchCustomers, lookupCustomer}` is the canonical CRM access path | `MODULE_DECISIONS_FINAL.md` | ✅ Fix reuses the existing helpers; no new service introduced. |
| Module 5 — payment payload carries customer name/phone (already shipped today via `tabContact`) | `MODULE_DECISIONS_FINAL.md` | ✅ Compatible — fix can additionally populate the same payload from a CRM-selected customer (no payload-shape change). |
| `orderTransform.collectBillExisting` is high-risk for shape changes | `IMPLEMENTATION_AGENT_RULES.md` | ✅ Plan does NOT change payload shape; only the values populated into existing `name` / `mobile` fields. Optional `customer_id` addition is **owner-decision-gated** (see §11). |
| No `/app/memory/final/` edits | task directive | ✅ Honoured. |
| No `BUG_TEMPLATE.md` edits | task directive | ✅ Honoured. |

**Verdict:** No baseline conflict. Pure presentation-layer + service-call addition inside `CollectPaymentPanel`.

---

## 3. Main Order Entry Customer Lookup Flow (Source of Truth)

**Component:** `CartPanel.jsx` — the customer name + phone input pair rendered at the top of the cart panel.

**State:**
- `customerName` (string)
- `customerPhone` (string)
- `isCustomerSelected` (boolean — set true after a CRM suggestion is picked)
- `filteredCustomers` / `filteredByName` (typeahead results)
- `showPhoneSuggestions` / `showNameSuggestions` (UI gating)

**Triggers and API calls (verified, L341–376):**

| User action | Threshold | API called | Endpoint |
|---|---|---|---|
| Types into **phone** field | `customerPhone.length >= 3` AND `!isCustomerSelected` | `searchCustomers(customerPhone)` | `GET /api/pos/customers?search=<phone>&limit=10` (via `crmApi`, X-API-Key auth) |
| Types into **name** field | `customerName.length >= 2` AND `!isCustomerSelected` | `searchCustomers(customerName)` | Same endpoint, same params shape |
| Picks a suggestion | n/a | `selectCustomer(c)` (L397+) → sets name+phone+id, locks suggestion lists | — |

**Trigger model:** debounced-by-React effect (re-runs on every keystroke; no explicit debounce — relies on the suggestion list being a passive overlay).

**State populated on selection:**
- `customerName ← c.name`
- `customerPhone ← c.phone`
- `isCustomerSelected ← true`
- `customer.id` is captured through the parent prop flow (`CartPanel` calls back to `OrderEntry` which holds the canonical `customer` object).

**Console signature:** `[CRM] Customer search failed: …` warnings emit only on failure; successful searches are silent. The owner's screenshot showing a `[CRM]` console badge corresponds to the warning path (or DevTools' "CRM" filter label) — confirmation that this code path is wired.

---

## 4. Credit/TAB Customer Field Flow (Defect Site)

**Component:** `CollectPaymentPanel.jsx` — the **Credit Customer Details** section rendered when `paymentMethod ∈ {'credit', 'tab', 'TAB'}` and `!showSplit`. UI at **L2109–2151**.

**State (L322–324):**
```js
const [tabName, setTabName] = useState(customer?.name || "");
const [tabPhone, setTabPhone] = useState(customer?.phone || "");
```

Seeded **once on mount** from the prop-supplied `customer` object (the same `customer` that flows in from `OrderEntry`'s top-level customer state — which itself was populated by `CartPanel` via CRM). After that, both are owned locally and never re-synced.

**Triggers (L2114–2139):**
- Name input: `onChange={(e) => setTabName(e.target.value)}` — local state only.
- Phone input: `onChange={(e) => setTabPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}` — local state only.

**No CRM call is wired in this section.** Verified:

```
$ grep -n "searchCustomers\|lookupCustomer\|customerService" /app/frontend/src/components/order-entry/CollectPaymentPanel.jsx
(no matches)
```

**Validation (L2141–2149):** purely client-side. Renders "Name is required for credit/TAB orders" / "Enter 10-digit phone number (0/10)" when either field is empty/short. No CRM-existence path.

**Output → `paymentData.tabContact` (L562):**
```js
tabContact: isTabPayment ? { name: tabName, phone: tabPhone } : null,
```

Flows into `orderTransform.collectBillExisting` at **L1270–1271**:
```js
name:   tabContact?.name  || '',
mobile: tabContact?.phone || '',
```

**`customer_id` is NOT included in the payload.** No field anywhere in `collectBillExisting` carries the CRM `customer_id` for Credit/TAB. Even when the main `CartPanel` had selected a CRM customer with a known UUID, that UUID is dropped at the payment boundary.

---

## 5. API / Network Comparison

| Surface | CRM search fires? | Endpoint | Trigger | Evidence |
|---|---|---|---|---|
| `CartPanel` phone field | ✅ YES | `GET /api/pos/customers?search=<phone>&limit=10` | onChange, ≥3 chars, `!isCustomerSelected` | `CartPanel.jsx:349–353` |
| `CartPanel` name field | ✅ YES | Same endpoint | onChange, ≥2 chars, `!isCustomerSelected` | `CartPanel.jsx:367–371` |
| `CustomerModal` (deep customer-edit) | ✅ YES — both search + lookup | `searchCustomers` + `POST /api/pos/customer-lookup` on phone exact | onChange + on confirm | `CustomerModal.jsx:22,74` |
| **`CollectPaymentPanel` Credit Customer Details — name field** | ❌ **NO** | n/a | onChange only updates local state | `CollectPaymentPanel.jsx:2117–2125` |
| **`CollectPaymentPanel` Credit Customer Details — phone field** | ❌ **NO** | n/a | onChange only updates local state | `CollectPaymentPanel.jsx:2126–2139` |

Owner-observed in DevTools:
- Main Order Entry: `[CRM]` log + network call on typing → ✅ matches the wired path.
- Credit Customer Details: no `[CRM]` log + no network call → ✅ matches the un-wired path.

---

## 6. Current State Mapping for Name / Phone / Customer ID

| Field | Captured where | Stored where | Sent to bill-payment as | Source-of-truth |
|---|---|---|---|---|
| Customer **name** (CRM-linked) | `CartPanel` name field → `searchCustomers` → suggestion pick → `customer.name` in `OrderEntry` state | Prop `customer.name` flows into `CollectPaymentPanel` and seeds `tabName` (L323) | `payload.name` (L1270) | CRM (when picked) OR manual typing |
| Customer **phone** (CRM-linked) | `CartPanel` phone field → same path | `tabPhone` (seeded once from prop, L324) | `payload.mobile` (L1271) | Same |
| Customer **id** / CRM UUID | `CartPanel` suggestion pick → `customer.id` in `OrderEntry` state | **NOT carried into `tabContact`**; not read by `CollectPaymentPanel`; not written into the payment payload | — (no field) | CRM only; dropped at the payment boundary |
| `paymentData.tabContact` | `CollectPaymentPanel.handlePayment` (L562) | Local — built fresh each handlePayment call | → `collectBillExisting` → `name` + `mobile` | Local `tabName` + `tabPhone` only |

**Critical observation:** the Credit Customer Details section is downstream of `CartPanel`'s CRM lookup, but **does not re-trigger lookup if the customer typed a new name/phone in the payment section.** Pre-fill via the prop works on the happy path (cashier captured customer up-front); the broken path is when the cashier discovers the bill is on credit only when they reach Collect Payment and starts typing the customer there.

---

## 7. Root Cause Hypothesis

**Single root cause (frontend-only):** the Credit Customer Details inputs in `CollectPaymentPanel.jsx:2114–2139` are bare `<input>` elements with `onChange` setters that mutate local state only. There is no wiring to `customerService.searchCustomers` / `lookupCustomer` and no path to call back into `OrderEntry`'s customer prop, so when the cashier enters a name/phone here:

1. No CRM typeahead suggestions appear.
2. No CRM `customer_id` is captured even if the entered phone matches an existing CRM record.
3. The validation "Name is required for credit/TAB orders" / "Enter 10-digit phone number" stays red until both are manually filled, even though CRM has the customer.
4. The bill-payment payload carries only the typed `name` + `mobile` strings — never a `customer_id`.

This is a missing-wiring defect, **not** a logic bug. The CRM helpers are fully built and used elsewhere in the same module; they are just not invoked from this section.

Secondary, owner-decision-gated: even after wiring CRM search here, the bill-payment payload at `orderTransform.collectBillExisting` does not have a `customer_id` field. If backend requires CRM linkage to be carried as an ID (and not just name+mobile), a payload-shape addition is needed — that needs backend confirmation.

---

## 8. Frontend vs Backend Classification

| Defect | Owner | Why |
|---|---|---|
| Credit Customer Details typeahead absent | **Frontend** | CRM search is wired elsewhere in the same module; this section was simply never connected. No backend change needed for the UX. |
| `customer_id` not in `collectBillExisting` payload | **Backend-dependent (owner-decision-gated)** | If backend ledger only stores `name` + `mobile` for Credit/TAB (today's contract), no payload change. If backend wants to dedupe via CRM `customer_id`, a payload-shape addition is required; the FE has the UUID available the moment a CRM suggestion is picked. **Decision required from owner / backend.** |
| Validation "Name is required" firing on a CRM-existing customer | **Frontend (downstream of typeahead fix)** | Validation is purely client-side on `tabName.trim()` + 10-digit phone. Once the CRM suggestion is picked, name+phone auto-fill and validation passes. |

**Net classification:** Primarily frontend; one downstream owner/backend decision on `customer_id` payload propagation.

---

## 9. Exact Files / Functions Likely Affected

| Path | Function / Block | Planned change |
|---|---|---|
| `frontend/src/components/order-entry/CollectPaymentPanel.jsx` | TAB state (**L322–324**) | Add suggestion-list state (mirrors `CartPanel`): `tabFilteredCustomers`, `tabShowSuggestions`, `tabCustomerId`, refs for outside-click handling. |
| same | **L2114–2139** (Credit Customer Details inputs) | Wrap name + phone inputs in a relative-positioned container with a suggestion overlay. Add `onFocus` / `onChange` driven `searchCustomers` calls mirroring `CartPanel.jsx:343–376` (same thresholds — phone ≥3 chars, name ≥2 chars). On suggestion pick, set `tabName`, `tabPhone`, and capture `c.id` into `tabCustomerId`. |
| same | New effect | Outside-click handler to close the suggestion overlay (pattern copied from `CartPanel.jsx:378–394`). |
| same | **L562** (`tabContact` construction inside `handlePayment`) | Either (a) keep payload unchanged (today's name+mobile only) — pure UX fix, or (b) additionally include `tabCustomerId` if owner decides backend should receive `customer_id`. |
| `frontend/src/api/services/customerService.js` | `searchCustomers`, `lookupCustomer` | **No change.** Re-used as-is. |
| `frontend/src/api/transforms/orderTransform.js` `collectBillExisting` (**L1129, L1267–1271**) | `name` / `mobile` field population | **No change** unless owner enables the `customer_id` path. If enabled: add `customer_id: tabContact?.id || null` (single key; existing keys preserved). |

### Files explicitly NOT touched
- `frontend/src/components/order-entry/CartPanel.jsx` — working as designed; the source of `customer` prop that already seeds `tabName`/`tabPhone` on the happy path.
- `frontend/src/components/order-entry/CustomerModal.jsx` — unrelated; already CRM-linked.
- `frontend/src/components/order-entry/OrderEntry.jsx` — no prop-flow change needed.
- `frontend/src/api/crmAxios.js` — auth + base URL already correct.
- `frontend/src/api/constants.js` — endpoints already declared.
- `frontend/src/api/transforms/customerTransform.js` — response transform already correct.
- All Cash / UPI / Card / Split / Transfer-to-Room branches in `CollectPaymentPanel.jsx`.
- All `paymentService` / `orderService` callers.
- Backend / any API.
- `/app/memory/final/*` and `BUG_TEMPLATE.md` (task directive).

---

## 10. Required API / Network Evidence

Most evidence is already on the record. Two confirmations recommended before implementation:

| # | Question | Answer source | Blocking? |
|---|---|---|---|
| 1 | Does `GET /api/pos/customers?search=7505242126` return a customer record for the owner's test number 7505242126? | Owner can run from DevTools console: `await fetch('/api/pos/customers?search=7505242126&limit=10', { headers: { 'X-API-Key': '<tenant-key>' } }).then(r=>r.json())` | No — wiring will work whether the number is registered or not (no-match returns `[]` → no suggestions; manual typing path still works as today). Useful for owner smoke. |
| 2 | Does backend's `order-bill-payment` endpoint accept (and benefit from) a `customer_id` field for Credit/TAB tracking, or does it dedupe customers solely by `mobile`? | Backend confirmation | **Owner decision** — gates whether the FE adds `customer_id` to the payload. Without confirmation, ship Bucket A only (UX wiring); leave payload unchanged. |
| 3 | Should we also fire `lookupCustomer(phone)` on phone-blur with full 10 digits to enrich `tabCustomerId` even when the cashier didn't pick a suggestion? | Owner UX decision | No — optional polish; can ship in a follow-up. |

---

## 11. Recommended Fix Options

### Option A — Wire CRM search into Credit Customer Details (RECOMMENDED, ships first)
- **Scope:** Two-input section in `CollectPaymentPanel.jsx:2114–2139`. Add `searchCustomers` calls on typing (mirroring `CartPanel.jsx:343–376`), render a suggestion overlay, and on pick set name+phone+id locally.
- **Payload impact:** None today — `tabContact` still ships as `{ name, phone }`. The captured `customer_id` is kept in local state for §11 Option B if/when owner approves.
- **Pros:** Solves the owner-reported UX defect (typeahead + autofill). Zero risk to Cash/UPI/Card paths. Zero backend dependency.
- **Cons:** Does not propagate CRM `customer_id` to backend — duplicate-detection still relies on `mobile`. Acceptable if backend dedupes by `mobile`.
- **Effort:** Small (~30 lines + 1 effect + 1 outside-click handler in a single file).

### Option B — Additionally propagate `customer_id` into bill-payment payload
- **Scope:** Add single field `customer_id` into `orderTransform.collectBillExisting` payload (L1267–1272 area) when `tabContact?.id` is present.
- **Pros:** Backend gets canonical CRM linkage; opens room for cleaner customer-credit ledgering downstream.
- **Cons:** Requires backend confirmation (`needs_backend_response_sample` on whether the endpoint accepts/expects this field). Without that, risk of silent ignore (low) or 400 on unknown field (very low).
- **Effort:** 2 lines in `orderTransform.js` + owner-approved backend ack.
- **Recommendation:** Defer to a follow-up ticket; do NOT block Option A.

### Option C — Phone-blur exact lookup (optional UX polish)
- **Scope:** When `tabPhone.length === 10` and `!tabCustomerId`, call `lookupCustomer(tabPhone)` once; if found, autofill name + set `tabCustomerId`.
- **Pros:** Catches the case where cashier types the full 10 digits and skips the typeahead.
- **Cons:** One extra network call on blur. Cosmetic.
- **Recommendation:** Bundle with Option A only if owner asks; else defer.

---

## 12. What NOT to Change

| Surface | Reason |
|---|---|
| `CartPanel.jsx` customer fields | Already correct; do not duplicate or replace. |
| `CustomerModal.jsx` | Unrelated; CRM-wired. |
| `customerService.js` | Re-used as-is. No new helpers. |
| `crmAxios.js`, `constants.js`, `customerTransform.js` | Endpoint + transport + transform already correct. |
| `orderTransform.collectBillExisting` payload **shape** | Today's shape is preserved by Option A (recommended). Only Option B adds one optional field, and only after owner confirmation. |
| All non-Credit/TAB payment branches in `CollectPaymentPanel` (Cash, UPI, Card, Split, Transfer-to-Room) | Out of scope. Their state and rendering must remain identical. |
| `OrderEntry.jsx` customer state flow | The existing `customer` prop seeding into `tabName`/`tabPhone` continues to work; no parent change needed. |
| Backend / `/api/v2/vendoremployee/order/order-bill-payment` | Option A does not require any backend change. Option B is owner-decision-gated. |
| Validation rule "Name is required for credit/TAB orders" | The text and threshold stay; once typeahead autofills `tabName`, the validation will naturally pass. |
| Hold-order / room-payment / pre-place flows | Not in defect path (Hold uses its own validation; room is a separate branch — BUG-042 territory). |
| `/app/memory/final/*` | Task directive. |
| `BUG_TEMPLATE.md` | Task directive. |
| Other Credit-related bugs (BUG-003 "Walk-In" auto-fill) | Already closed; behavior unchanged. |

---

## 13. Answers to the 10 Investigation Questions

1. **Is Credit/TAB calling CRM search today?** No.
2. **Design or missing wiring?** Missing wiring — CRM helpers exist and are used three doors down (`CartPanel`, `CustomerModal`).
3. **Which CRM API does Order Entry use?** `GET /api/pos/customers?search=<query>&limit=10` via `searchCustomers` (and `POST /api/pos/customer-lookup` for exact-phone lookup via `lookupCustomer`).
4. **Can Credit/TAB safely reuse the same flow?** Yes — identical helper, identical thresholds; only the consumer state differs (`tabName`/`tabPhone`/`tabCustomerId` vs. `customerName`/`customerPhone`/`customer.id`).
5. **Which field triggers lookup?** Both: phone (≥3 chars, also benefits from optional blur exact-lookup) AND name (≥2 chars). Same predicate as `CartPanel`.
6. **Does CRM return a customer for 7505242126?** Unknown until owner runs the cURL/DevTools probe in §10.1. Wiring does not depend on the answer.
7. **Does bill-payment payload require `customer_id`?** Today no (only `name` + `mobile`). Owner/backend to confirm whether adding `customer_id` is desirable (Option B).
8. **Frontend, backend, or mixed?** **Frontend** for the reported defect (UX wiring). **Mixed** only if Option B is pursued.
9. **Does this affect only Credit/TAB, or also PayLater / Hold / etc.?** The defect surface is the Credit Customer Details block which renders **only when `paymentMethod ∈ {'credit', 'tab', 'TAB'}`**. PayLater / Hold / room-payment use separate UI and are not in scope. The fix does not affect them.
10. **Safest fix that doesn't affect Cash/UPI/Card?** Option A — all changes live inside the `{isTabPayment && !showSplit && (…)}` conditional block at L2110. Non-TAB branches structurally cannot reach the new code.

---

## 14. Final Verdict

**`frontend_fix_ready_for_planning`** ✅

- Defect is a missing-wiring issue inside one block of one file.
- All CRM helpers and endpoints already exist and are validated in adjacent code paths.
- No backend dependency for the recommended Option A.
- Option B (carrying `customer_id` into the bill-payment payload) is owner-decision-gated and can be deferred.
- Risk LOW; no payment-mode regression possible.

### Confirmation
- ❌ No code modified.
- ❌ No `/app/memory/final/` updates.
- ❌ No `BUG_TEMPLATE.md` updates.
- ❌ No backend changes.
- ✅ Impact-analysis doc created at `/app/memory/bugs/BUG_038_CREDIT_CUSTOMER_CRM_AUTOFILL_IMPACT_ANALYSIS.md`.

---

*End of BUG-038 Impact Analysis. Awaiting owner approval to proceed to implementation planning (Option A baseline; Option B/C deferred unless owner asks).*
