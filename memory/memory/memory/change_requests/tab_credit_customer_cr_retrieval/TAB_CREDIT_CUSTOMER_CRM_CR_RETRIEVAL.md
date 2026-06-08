# TAB / Credit Customer CRM CR Retrieval

> **Mode:** Retrieval and explanation only. No code change, no commit, no refactor.
> **Date:** 2026-05-15
> **Task:** Surface the historical CR/bug doc describing the "TAB / Credit Customer flow has no CRM API call" issue, and explain what it was, why it was parked, and what is next.

---

## 1. Summary

**This is `BUG-038 — Credit/TAB Customer CRM Autofill`.**

The bug is recorded in **`/app/memory/bugs/BUG_038_CREDIT_CUSTOMER_CRM_AUTOFILL_IMPACT_ANALYSIS.md`**. It documents that the **Credit / TAB payment section inside `CollectPaymentPanel.jsx`** does **not call any CRM API** when the cashier enters customer name/phone there. CRM linking happens correctly in the main Order Entry flow (via `CartPanel`) but is **not wired** into the Credit/TAB customer details block at payment time. The work was **parked on 2026-05-12 pending an owner ↔ backend discussion** about whether the bill-payment payload should additionally carry a CRM `customer_id`.

The recommended frontend-only fix (Option A — wire `searchCustomers` typeahead into the same two inputs, ~30 LoC in one file) was **ready for implementation planning** but held until backend clarity is provided. No code has been changed.

---

## 2. Documents Found

| Path | Role |
|---|---|
| `/app/memory/bugs/BUG_038_CREDIT_CUSTOMER_CRM_AUTOFILL_IMPACT_ANALYSIS.md` | **Primary** — full impact analysis, root cause, fix options A/B/C, NOT-to-change list, park note. Source of truth for this CR. |
| `/app/memory/bugs/BUG_PENDING_TASK_REGISTER_2026_05_12.md` (rows 42, 100, 174–177, 282, 351) | Tracker rollup — lists BUG-038 as "Impact analysis present; no plan, no code; awaiting plan-agent". |
| `/app/memory/bugs/BUG_CODE_VALIDATED_CONSOLIDATION_REPORT_2026_05_12.md` (rows 40, 91, 172) | Cross-check — lists BUG-038 in the "Impact analysis done — plan next" bucket. |
| `/app/memory/change_requests/PENDING_TASK_REGISTER_2026_05_04.md` | **No mention.** Bug is bug-tracker scope, not in the CR pending register. |
| `/app/memory/change_requests/BACKEND_FIELD_UNPARK_DECISION_2026_05_06.md` | **No mention.** Not in the backend-unpark batch. |
| `/app/memory/final/*` | **No mention.** No AD/OD on Credit/TAB CRM linkage; not a baseline-locked decision. |

No competing or superseding doc exists. The impact-analysis file is the single authoritative source.

---

## 3. Original Issue

When the cashier reaches **Collect Payment → Credit / TAB**, two text inputs (Customer Name + 10-digit Phone) appear under "Credit Customer Details" (`CollectPaymentPanel.jsx:2109–2151`). These inputs:

1. **Do not call any CRM API** as the cashier types (no typeahead suggestions appear).
2. **Do not autofill** when the typed phone matches an existing CRM customer.
3. **Do not capture or send the CRM `customer_id`** on submit. The bill-payment payload carries only the raw typed `name` and `mobile` strings (`orderTransform.js:1270–1271` inside `collectBillExisting`).
4. Validation errors ("Name is required", "Enter 10-digit phone number") therefore fire even when CRM already has the customer.

Owner observed in DevTools that the main Order Entry name field shows a `[CRM]` console log + network call on typing, but the Credit Customer Details inputs show **no CRM log + no network call**. This was confirmed by a direct `grep` of `CollectPaymentPanel.jsx` — `searchCustomers` / `lookupCustomer` / `customerService` appear **zero times** in that file.

The CRM helpers themselves (`customerService.searchCustomers`, `customerService.lookupCustomer`) are fully built and used in three adjacent components:
- `CartPanel.jsx:341–376` — main order-entry customer capture.
- `CustomerModal.jsx:22, 74` — deep customer edit modal.
- (No third — these are the only two CRM-wired sites today.)

The CRM endpoints are also already declared:
- `GET /api/pos/customers?search=<query>&limit=10` (`constants.js:34`)
- `POST /api/pos/customer-lookup` (`constants.js:35`)

So the defect is a **missing-wiring** issue, not a missing API, not a missing helper, not a missing transform.

---

## 4. Impacted Flow

| Surface | Affected? |
|---|---|
| **TAB / Credit** payment branch in `CollectPaymentPanel` | ✅ YES — the defect site |
| **Customer Credit** (same concept as TAB; same payment method values: `'credit'`, `'tab'`, `'TAB'`) | ✅ YES — same code block |
| **CRM customer linking** at payment time | ✅ YES — `customer_id` is dropped at the payment boundary |
| **CRM customer create / update** | ⚠ Indirect — backend may dedupe by `mobile` today; the FE does not pass `customer_id` |
| **PayLater / Hold (fOrderStatus 9 / 8)** | ❌ No — PayLater/Hold uses a separate UI path. Out of scope per the impact analysis §13.9. |
| **Order placement** (initial cart → place order) | ❌ No — CartPanel CRM lookup already works correctly |
| **Cash / UPI / Card / Split / Transfer-to-Room** payment branches | ❌ No — structurally cannot reach the Credit/TAB conditional block (`isTabPayment && !showSplit`) |
| **`collect-payment` / `order-bill-payment` payload shape** | ❌ No (Option A keeps payload identical) / ⚠ One additive field if Option B is approved |

**Scope statement (verbatim from §0 of the impact analysis):** *"Only Credit/TAB customer details inside `CollectPaymentPanel`. Cash / UPI / Card / Split / Transfer-to-Room payment paths are out of scope."*

---

## 5. Expected CRM API Behavior

Two CRM endpoints are expected to fire from the Credit Customer Details inputs, mirroring how `CartPanel.jsx` already uses them:

| Trigger | Threshold | API | Endpoint | Existing helper |
|---|---|---|---|---|
| Cashier types in the **phone** field | `tabPhone.length >= 3` AND no customer yet selected | `searchCustomers(query)` | `GET /api/pos/customers?search=<phone>&limit=10` (via `crmApi`, `X-API-Key` auth) | `customerService.searchCustomers` |
| Cashier types in the **name** field | `tabName.length >= 2` AND no customer yet selected | `searchCustomers(query)` | Same endpoint | Same helper |
| Cashier picks a suggestion | n/a | local-state setter | n/a — captures `c.id`, `c.name`, `c.phone` into local state | n/a |
| *(Optional polish — Option C)* Phone blur with full 10 digits | `tabPhone.length === 10 && !tabCustomerId` | `lookupCustomer(phone)` | `POST /api/pos/customer-lookup` | `customerService.lookupCustomer` |

On pick, the captured CRM record (with UUID) is held in local state:
- `tabName ← c.name`
- `tabPhone ← c.phone`
- `tabCustomerId ← c.id` (new local state — does not exist today)

Then on submit, depending on owner decision:
- **Option A (default):** payload keeps today's shape (`name` + `mobile` only). `tabCustomerId` stays local — backend continues to dedupe by `mobile`.
- **Option B (owner-gated):** payload additionally includes `customer_id: tabCustomerId` inside `collectBillExisting`.

---

## 6. Actual Behavior

| Field | Actual today |
|---|---|
| Typeahead on phone in Credit Customer Details | ❌ Not rendered |
| Typeahead on name in Credit Customer Details | ❌ Not rendered |
| Autofill from CRM when phone matches | ❌ No |
| `customer_id` captured | ❌ No — section has no `customerId` state |
| `customer_id` in payment payload | ❌ No — `collectBillExisting` doesn't carry a `customer_id` key |
| Validation passes when CRM has the customer | ❌ Validation still requires manual fill |

`CollectPaymentPanel.jsx:322–324` (state seed):
```js
const [tabName, setTabName] = useState(customer?.name || "");
const [tabPhone, setTabPhone] = useState(customer?.phone || "");
```
This seeds **once on mount** from the parent's `customer` prop, then never re-syncs. On the happy path where the cashier captured the customer earlier in `CartPanel`, the section pre-fills correctly — but the moment the cashier first interacts with the section to add/correct the customer, the CRM channel is closed.

`CollectPaymentPanel.jsx:2114–2139` (inputs):
- Plain `<input>` elements.
- `onChange` mutates `tabName` / `tabPhone` local state only.
- No effect, no service call, no suggestion overlay.

`CollectPaymentPanel.jsx:555–568` → `paymentData.tabContact = isTabPayment ? { name: tabName, phone: tabPhone } : null;`
This is the only outbound carrier. `customer_id` / `c.id` is **not part of `tabContact`** anywhere on disk.

---

## 7. Why It Was Deferred

Recorded verbatim in §0 ("Park Note (2026-05-12)") of the impact analysis. Reason: **owner wants to align with backend on the `customer_id` propagation question before committing to the FE wiring direction.**

Specific decision points the owner wants backend to answer (§0):
1. Should the `order-bill-payment` payload carry CRM `customer_id` for Credit/TAB, or continue to dedupe by `mobile` only?
2. Is backend already creating / linking CRM records on Credit/TAB settle, or does it expect the FE to pass the linkage explicitly?
3. Are there any Credit/TAB ledger tables that key off `customer_id` and would benefit from the FE supplying it?

**Categorisation of the park reason** (against the prompt's checklist):

| Possible reason | Applies? |
|---|---|
| **Backend dependency** | ✅ YES — for **Option B** (payload `customer_id` propagation) only. The owner does not want to ship Option A in isolation without first asking backend whether B should be folded in. |
| **CRM API contract unclear** | ⚠ Partial — the CRM **read** contracts (`searchCustomers`, `lookupCustomer`) are clear and used elsewhere. The unclear part is the **write/linkage** contract on bill-payment. |
| **Payload fields missing** | ⚠ Partial — `customer_id` is missing from the bill-payment payload; needs owner+backend confirmation whether to add. |
| **Frontend not ready** | ❌ No — the FE fix is small (~30 LoC, single file, single conditional block). |
| **Scope decision** | ✅ YES — owner explicitly bundled the Option A (UX wiring) decision with the Option B (payload) decision rather than ship A first. |
| **QA deferred dependency** | ❌ No — no QA pass attempted yet; this is pre-implementation. |

**Net reason:** scope-bundled park awaiting backend stance on customer-linkage propagation. Not a coding blocker; a contract-clarity blocker.

---

## 8. Current Status

**Status:** ⏸ **PARKED — pending owner ↔ backend discussion (2026-05-12).**

Verbatim from the impact analysis §0: *"Owner has parked this bug pending a discussion with the backend team. No implementation, no planning, no code change at this time."*

**Tracker cross-references (both dated 2026-05-12):**

| Tracker | Says |
|---|---|
| `BUG_PENDING_TASK_REGISTER_2026_05_12.md` row 100, 174–177, 282, 351 | "Impact analysis present at `BUG_038_…`. **No plan, no code.** Owner action: Approve scope; trigger implementation plan. BE action: None expected." |
| `BUG_CODE_VALIDATED_CONSOLIDATION_REPORT_2026_05_12.md` rows 40, 91, 172 | "Impact analysis done — plan next." Listed under "Approve BUG-038 plan (analysis exists; plan-agent next)." |

There is an **apparent inconsistency** between the impact-analysis park note ("parked pending backend discussion") and the pending-task register ("BE action: None expected; owner action: approve scope → plan-agent"). The reconciliation, based on text of both docs:

- The **park note** reflects the owner's most recent verbal decision (the §0 note is labelled the latest snapshot).
- The **pending-task register** likely captured the pre-park state where Option A (FE-only, no BE need) was the obvious path forward, and Option B (BE coordination) was the owner-gated extension. The note "BE action: None expected" applies if Option A ships in isolation.

**Operationally:** the bug is **PARKED**. Implementation has not started. No `qa_passed_with_deferred_backend_dependency` state — this is upstream of QA. Verdict on park: `parked_pending_backend_discussion` (was `frontend_fix_ready_for_planning`).

---

## 9. Code References

Listed in the impact analysis §9 and verified above; reproduced here for handover convenience.

| File | Lines | Function / block | Role |
|---|---|---|---|
| `frontend/src/components/order-entry/CollectPaymentPanel.jsx` | 322–324 | `tabName`, `tabPhone` `useState` seeding | **Defect state container** — seeded once from prop, never re-syncs |
| `frontend/src/components/order-entry/CollectPaymentPanel.jsx` | 555–568 | `handlePayment` → `tabContact` construction | Outbound payload carrier (`{ name, phone }` only) |
| `frontend/src/components/order-entry/CollectPaymentPanel.jsx` | 2109–2151 | "Credit Customer Details" JSX block | **Defect UI site** — bare inputs, no CRM wiring |
| `frontend/src/components/order-entry/CartPanel.jsx` | 341–376 | CRM-wired customer typeahead (working reference) | Pattern to mirror |
| `frontend/src/components/order-entry/CartPanel.jsx` | 378–394 | Outside-click handler for suggestion overlay | Pattern to mirror |
| `frontend/src/components/order-entry/CustomerModal.jsx` | 22, 74 | `searchCustomers` + `lookupCustomer` usage | Second CRM-wired reference |
| `frontend/src/api/services/customerService.js` | (whole file) | `searchCustomers`, `lookupCustomer` | Helpers to re-use — no change |
| `frontend/src/api/transforms/orderTransform.js` | 1129, 1267–1271 | `collectBillExisting` payload | `name` / `mobile` population; `customer_id` absent today |
| `frontend/src/api/constants.js` | 34–35 | `CUSTOMER_SEARCH`, `CUSTOMER_LOOKUP` endpoints | Already declared |
| `frontend/src/api/crmAxios.js` | (whole file) | CRM auth + base URL | Already correct |

**Explicit "do not touch" list** (impact analysis §12): `CartPanel.jsx` customer fields, `CustomerModal.jsx`, `customerService.js`, `crmAxios.js`, `constants.js`, `customerTransform.js`, `orderTransform.collectBillExisting` payload shape (Option A) / shape preserved with one optional additive key under Option B, all non-Credit/TAB payment branches, `OrderEntry.jsx` customer state flow, backend `/api/v2/.../order-bill-payment` (Option A), validation rule text, Hold/PayLater/room flows (BUG-042 territory), `/app/memory/final/*`, `BUG_TEMPLATE.md`, BUG-003 closed behaviour.

---

## 10. Recommended Next Step

Per the impact analysis §0 "On unpark — recommended next step", in this order:

1. **Owner runs the §10.1 probe** (5-minute DevTools task) to confirm `GET /api/pos/customers?search=7505242126&limit=10` returns a record for the owner's test number. This is informational — wiring works regardless — but useful for owner smoke during QA.
2. **Owner ↔ backend discussion** on the four items listed in §0:
   - Should `order-bill-payment` carry `customer_id` for Credit/TAB?
   - Is backend already linking CRM on Credit/TAB settle?
   - Are there Credit/TAB ledger tables keyed on `customer_id`?
   - Does backend dedupe by `mobile` or `customer_id`?
3. **Owner makes the scope decision:**
   - **Option A only** (FE UX wiring, no payload change) → straight to pre-implementation code gate → implementation plan → ~30 LoC in `CollectPaymentPanel.jsx`. No backend coordination needed.
   - **Option A + Option B** (UX wiring + payload `customer_id`) → confirm backend payload shape sample → extend the analysis with the confirmed shape → code gate → implementation plan → ~32 LoC across `CollectPaymentPanel.jsx` (~30) + `orderTransform.js` (~2).
4. **After scope is fixed:** invoke the impl-plan agent against `BUG_038_CREDIT_CUSTOMER_CRM_AUTOFILL_IMPACT_ANALYSIS.md` for the concrete implementation plan. Effort is small either way.

**No FE change should land before steps 2–3 are resolved.** The risk of shipping Option A then re-doing the section weeks later is small, but the owner has explicitly chosen the bundled-decision path.

---

## 11. Open Questions

Verbatim from the impact analysis §10 + §0, all currently unresolved:

| # | Question | Owner of answer | Blocking implementation? |
|---|---|---|---|
| OQ-1 | Does backend's `order-bill-payment` endpoint accept (and benefit from) a `customer_id` field for Credit/TAB tracking, or does it dedupe customers solely by `mobile`? | **Backend** | **YES — primary park reason.** Gates whether Option B is in scope. |
| OQ-2 | Is backend already creating / linking CRM records on Credit/TAB settle, or does it expect the FE to pass the linkage explicitly? | **Backend** | YES — same gate. |
| OQ-3 | Are there Credit/TAB ledger tables on the backend that key off `customer_id` and would benefit from the FE supplying it? | **Backend** | YES — same gate. |
| OQ-4 | Does `GET /api/pos/customers?search=7505242126` return a customer record for the owner's test number? | **Owner** (DevTools probe) | NO — informational only; wiring works either way. |
| OQ-5 | Should phone-blur exact lookup (Option C) be bundled into the first ship, or deferred to follow-up? | **Owner** (UX decision) | NO — independent toggle; can ship either way. |
| OQ-6 | Should backend or FE drive duplicate detection going forward? | **Owner / Backend** (architectural) | NO — directional, doesn't block Option A. |

---

## 12. Strict-Rules Compliance Certification

| Rule | Status |
|---|---|
| Retrieval and explanation only — no code change | ✅ |
| No commits | ✅ |
| No backend change | ✅ |
| No CRM logic change | ✅ |
| No payment payload change | ✅ |
| No CollectPayment change | ✅ |
| No TAB/Credit flow change | ✅ |
| No docs modified except this retrieval report | ✅ |
| `/app/memory/final/*` untouched (read-only consultation) | ✅ |
| `BUG_TEMPLATE.md` untouched | ✅ |
| Impact analysis doc preserved verbatim | ✅ |

---

— End of TAB / Credit Customer CRM CR Retrieval —
