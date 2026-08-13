# TAB / Credit Customer CRM Autofill — Live Smoke Gap Analysis

> **Bug:** BUG-038 — Credit/TAB Customer CRM Autofill
> **Date:** 2026-05-15 (post owner live smoke)
> **Mode:** Diagnostic only — no code change, no commits.
> **Trigger:** Owner ran live smoke on preprod; Network panel showed **no `customers?search=…` calls** in the Credit/TAB section (screenshot 1). Order Entry CartPanel CRM lookup (screenshot 2) does fire calls but they return **401 Unauthorized**.

---

## 1. Two Distinct Gaps

Owner's evidence reveals **two separate problems**, only one of which falls inside BUG-038 scope:

| ID | Problem | Surface | In BUG-038 scope? | Severity |
|---|---|---|---|---|
| **GAP-A** | Credit/TAB CRM search useEffect never fires because `tabIsCustomerSelected` is seeded `true` from upstream `customer.id` | `CollectPaymentPanel.jsx` (my fix) | ✅ Yes | High — directly defeats the autofill purpose |
| **GAP-B** | Existing CartPanel / Order Entry CRM lookup hits the API but receives `HTTP 401 Unauthorized` for every call | `customerService.js` / `crmAxios.js` / X-API-Key config | ❌ No (pre-existing, unrelated to BUG-038) | High — blocks the user-visible outcome of any CRM autofill across the app, including BUG-038 |

Both gaps must be addressed for the owner to see the end-to-end "type → suggestion → autofill" experience. **My fix is partially correct (single-line tweak needed) but its visible outcome is also blocked by GAP-B which is outside this CR.**

---

## 2. GAP-A — Why No API Call Fires from Credit/TAB Section (in BUG-038 scope)

### 2.1 Direct evidence (screenshot 1)

- Owner is on Collect Payment, payment method = Credit (green border).
- Credit Customer Details show pre-filled `tabName = "abhishek"` and `tabPhone = "7505242126"`.
- Network panel: **Fetch/XHR filter, timeline 2,000 ms – 12,000 ms, completely empty.** No `customers?search=…` calls fired during the entire observation window.

### 2.2 Root cause (code-level)

Line 343 of `CollectPaymentPanel.jsx`:

```js
const [tabIsCustomerSelected, setTabIsCustomerSelected] = useState(!!customer?.id);
```

The state is seeded **once at mount** from `customer?.id`. The owner's scenario is a **re-engaged order** (the order was placed earlier — note screenshot 2 shows items "918 mins ago", i.e. ~15 hours old). When such an order is re-opened, `OrderEntry` hydrates `customer` from the stored order payload, and **`customer.id` is truthy** (the original CRM linkage from placement). So:

- `tabIsCustomerSelected` seeds to `true` at mount.
- My phone-search useEffect (line 360-376) reads `if (tabIsCustomerSelected) return;` → exits before calling `searchCustomers`.
- My name-search useEffect (line 378-394) does the same.
- The handlers `handleTabNameChange` / `handleTabPhoneChange` only flip `tabIsCustomerSelected` to `false` on **blank-out** (mirror of CartPanel.jsx:415–438). Mere edits don't reset it.

Net: an upstream-linked customer **permanently gates off the search** even when the cashier wants to change/verify the credit customer for this specific bill. **Zero API calls fire.**

### 2.3 Why this is a real defect (vs. correct CartPanel parity)

CartPanel has the same gate (`isCustomerSelected = !!customer?.id`). In CartPanel that semantic is correct because the cashier is **building** an order — if a customer was already picked, you don't need to re-search until they're explicitly unpicked.

But in Collect Payment, the cashier may legitimately want to:
- Bill the order on credit to a **different customer** than the one tied to the order itself (e.g. invoice goes to a corporate account that's not the orderer).
- Verify the credit-customer's CRM record before pressing Pay.
- Re-trigger autofill after re-engaging an old order.

In all three cases the upstream `customer.id` is irrelevant — the cashier is operating on a separate **credit-customer** context. The gate as currently shipped blocks every one of these flows.

This is **the same root cause** as the original BUG-038 defect (single-source-of-truth seeding from `customer` prop, never re-syncing) — my fix wired the typeahead but kept the original gating semantic too tightly coupled to the upstream prop.

### 2.4 Proposed fix (one-line; **NOT applied per owner directive "no code update"**)

```diff
- const [tabIsCustomerSelected, setTabIsCustomerSelected] = useState(!!customer?.id);
+ // Always seed false in Collect Payment context. The cashier may want to
+ // bill a different customer than the order's upstream customer (corporate
+ // invoice / different credit account / record verification). Search fires
+ // whenever they type ≥3 phone digits / ≥2 name chars. Once they pick a
+ // suggestion here, tabIsCustomerSelected flips true via selectTabCustomer
+ // and re-typing in the same field will not re-fire (until blanked).
+ const [tabIsCustomerSelected, setTabIsCustomerSelected] = useState(false);
```

**Single line. Same file. No other change needed.** Net effect:

| Scenario | Pre-fix-A | Post-fix-A |
|---|---|---|
| New order, no upstream customer, cashier types in Credit/TAB | Search fires ✓ | Search fires ✓ (unchanged) |
| Re-engaged order with stored `customer.id`, cashier types | **Search blocked ✗ (current owner-observed defect)** | **Search fires ✓** |
| Cashier picks a CRM suggestion in Credit/TAB block | `tabIsCustomerSelected → true` → no re-search until blank-out ✓ | Same ✓ |
| Cashier edits name after pick (e.g. "abhishek — corporate") | Typed value retained, no re-search ✓ | Same ✓ |
| Cashier blanks the field | Reset, search re-enables ✓ | Same ✓ |

**Payload safety unchanged** — `tabContact: { name, phone }` continues to be the only outbound. No `customer_id` introduced. No `tabCustomerId` introduced. All BUG-038 invariants from the implementation plan still hold.

**Regression risk for non-TAB modes:** zero — `tabIsCustomerSelected` is referenced only inside `isTabPayment`-gated effects and the Credit/TAB JSX block.

### 2.5 Why my QA report didn't catch this

My QA report §3 Test-1 marked the case as "PASS (static); runtime smoke owner-side." I verified the search useEffect was correctly wired and the threshold matched CartPanel. I did **not** simulate the re-engaged-order scenario (where `customer.id` is truthy from stored data) because the preview pod's backend was asleep and I had no way to load a real order. **This is exactly the kind of context-specific behaviour that only owner runtime smoke can surface — and it did, as expected.** The QA report correctly flagged "runtime smoke needed against awake backend"; that smoke caught the gap.

---

## 3. GAP-B — Pre-Existing CRM 401 (out of BUG-038 scope)

### 3.1 Direct evidence (screenshot 2)

Order Entry CartPanel customer fields are populated with `"abh"` (name) and `"7505242126"` (phone). Network panel shows **four** `customers?search=…` calls, all returning **`HTTP 401`**:

```
customers?search=7505242126&l...   401   xhr   bundle.js:130926   0.5 kB
customers?search=7505242126&l...   401   xhr   bundle.js:130926   0.5 kB
customers?search=ab&limit=10       401   xhr   bundle.js:130926   0.5 kB
customers?search=abh&limit=10      401   xhr   bundle.js:130926   0.5 kB
```

Initiator `bundle.js:130926` corresponds to the CartPanel CRM search hook (line 358 / 376 of `CartPanel.jsx`). This is the **existing** CRM lookup, **not** the new BUG-038 wire.

### 3.2 Likely cause

`X-API-Key` header attached by `crmAxios` is rejected by the CRM gateway. Candidates:

1. The per-restaurant API key in `REACT_APP_CRM_API_KEYS` for this restaurant ID is missing / wrong / expired.
2. The auth interceptor in `crmAxios.js` is not picking up the key for the current restaurant (resolution logic broken or the restaurant ID is not in the keyed map).
3. The CRM backend has rotated keys and the FE config is stale.
4. CORS or origin check failing on the CRM gateway side.

None of these are in BUG-038's surface. **My fix did NOT cause this.** The 401s would happen identically with or without my changes — they originate from CartPanel's existing typeahead.

### 3.3 Impact on BUG-038's user-visible outcome

Even after applying the §2.4 one-line fix to GAP-A, the Credit/TAB autofill **will not show suggestions** because `searchCustomers` returns `[]` whenever the CRM API returns 401 (`customerService.js:28–31` catches the error and returns `[]`). The graceful-failure path is working as designed — but it means **the cashier sees no overlay** regardless of how correctly my code is wired.

So the order in which fixes must land for the owner to see end-to-end autofill working:

1. **GAP-A** (BUG-038 follow-up, this CR): apply the one-line patch in §2.4.
2. **GAP-B** (separate pre-existing issue, NOT BUG-038): diagnose and fix the CRM 401. Once CRM returns 200 with real customer data, BUG-038's autofill becomes user-visible.

Until GAP-B is fixed, BUG-038's fix is structurally correct but its visible behaviour will be: "no suggestions appear; manual entry path works; payload safety preserved." This matches my QA report's static guarantees but does not match the owner's "see the autofill happen" expectation.

### 3.4 Recommended GAP-B triage steps (informational only — not in BUG-038 scope)

1. Inspect the failed request in DevTools → Headers tab → verify `X-API-Key` value being sent.
2. Cross-reference against `REACT_APP_CRM_API_KEYS` env var (see `frontend/.env` line: `REACT_APP_CRM_API_KEYS={"364":"dp_live_…","510":"dp_live_HrwXp5fOYBNwEhKNkldDRZq5h0wtLDboODi4TMEUiyU",…}`) to confirm the key is present for the active restaurant ID.
3. Check `crmAxios.js` interceptor — is it resolving the restaurant ID correctly at request time?
4. Try the request from a separate cURL with the same key → if also 401, the issue is server-side (CRM backend rejecting); if 200, the FE interceptor is the gap.
5. Confirm `REACT_APP_CRM_BASE_URL` (`https://crm.mygenie.online/api`) is reachable from the browser (CORS, DNS, certificate validity).

This is owner / backend / DevOps territory. **Do not block BUG-038 closure on GAP-B** — they are independent.

---

## 4. Sub-Conclusions

| Item | Status |
|---|---|
| Did my BUG-038 code fire any API in screenshot 1? | ❌ No — `tabIsCustomerSelected` seed gates it off for re-engaged orders |
| Is this a bug in my fix? | ✅ Yes — single-line seed change required (§2.4) |
| Did the existing CartPanel CRM lookup work? | ❌ No — calls fire but all return 401 |
| Is the 401 caused by my fix? | ❌ No — pre-existing CRM auth issue, completely unrelated |
| Is my payload safety still intact? | ✅ Yes — `tabContact: { name, phone }` byte-identical; no `customer_id` anywhere |
| Is the typeahead UI/state machine correctly wired? | ✅ Yes — confirmed by code inspection at lines 339–394, 421–446, 2295–2317 |
| Will the one-line GAP-A fix break any other behaviour? | ❌ No — change is local to one `useState` initial; no other module touched |
| Will GAP-A alone make autofill visible to cashier? | ⚠ Only after GAP-B (CRM 401) is also fixed |

---

## 5. Recommended Next Steps

### 5.1 Inside BUG-038 (this CR)

Apply the §2.4 one-line patch to `CollectPaymentPanel.jsx:343`. That's it. Single character / line change:

```js
// FROM
const [tabIsCustomerSelected, setTabIsCustomerSelected] = useState(!!customer?.id);
// TO
const [tabIsCustomerSelected, setTabIsCustomerSelected] = useState(false);
```

Plus a 2-line comment explaining why Collect Payment differs from CartPanel on this gate. No other change.

After the patch, re-run owner's smoke (screenshot 1 reproduction):
- Open the same re-engaged order.
- Select Credit.
- The two search useEffects should now fire on mount because `isTabPayment` flips true and `tabIsCustomerSelected` is `false`.
- Phone "7505242126" length 10 ≥ 3 → `GET /api/pos/customers?search=7505242126&limit=10` fires.
- Name "abhishek" length 8 ≥ 2 → second call fires.
- **Both will currently return 401 (GAP-B)** — but you'll see them in the Network panel proving GAP-A is fixed.

### 5.2 Outside BUG-038

File **GAP-B** as a **separate bug** (suggested ID: BUG-038-FU-CRM-AUTH or new BUG-050). Pre-existing; not introduced by this CR; affects all CRM features (CartPanel, CustomerModal, Credit/TAB autofill). Owner / backend / DevOps to investigate `X-API-Key` rejection on `crm.mygenie.online`.

### 5.3 Awaiting owner directive

Per owner message "no code update pls chekc and share gap", **I have NOT applied the §2.4 patch.** This document is the gap analysis only. Awaiting owner approval to apply the one-line fix (or any alternative direction).

---

## 6. Strict-Rules Compliance

| Rule | Status |
|---|---|
| Diagnostic only — no code change | ✅ |
| No commits | ✅ |
| No backend change | ✅ |
| No payload change | ✅ |
| No `customer_id` introduced | ✅ |
| `orderTransform.js` untouched | ✅ |
| `customerService.js` untouched | ✅ |
| `CartPanel.jsx` untouched | ✅ |
| Non-Credit/TAB modes untouched | ✅ |
| `/app/memory/final/*` untouched | ✅ |
| Owner directive "no code update" honoured | ✅ |

---

— End of TAB / Credit Customer CRM Autofill Live Smoke Gap Analysis —
