# TAB / Credit Customer CRM Autofill — GAP-A QA Report

> **Bug:** BUG-038 GAP-A — `tabIsCustomerSelected` seed gate
> **Fix commit:** auto-commit `50c8c1b` (touched only `CollectPaymentPanel.jsx`)
> **Date:** 2026-05-15 (post-fix, post-owner-credentials)
> **Mode:** Validation only — no code change, no commits.

---

## 1. Overall Verdict

✅ **PASS (static + structural — exhaustive 8-check trace).**
⏸ **Runtime live smoke against awake CRM = owner-side.** The preview pod's auth backend is asleep ("Frontend Preview Only. Please wake servers to enable backend functionality" banner); Playwright cannot log in (form components render zero queryable `<input>` elements; no auth endpoint is reachable from this validation session).

**Confidence:** the fix is structurally guaranteed to remove the seed gate that blocked the call. The owner's previous live smoke (screenshot 2 — CartPanel) already proved the same `searchCustomers` helper reaches `crm.mygenie.online` and returns **HTTP 401** today. Re-running the screenshot-1 reproduction recipe after this patch will show `customers?search=…` requests in DevTools Network panel firing identically to CartPanel — confirming GAP-A is fixed. The 401 response status itself is the **separate GAP-B issue** (out of scope, see §6).

---

## 2. Static / Structural Checks (Executed in this session)

| # | Check | Tool / Method | Result |
|---|---|---|---|
| C1 | ESLint on `CollectPaymentPanel.jsx` | `mcp_lint_javascript` | ✅ **No issues found** |
| C2 | Initial state of `tabIsCustomerSelected` is unconditionally `false` | `grep -n` on line 351 | ✅ Confirmed: `useState(false)` |
| C3 | Phone-search useEffect gate sequence | `sed -n 360,376p` | ✅ Confirmed: `if (!isTabPayment) return; if (tabIsCustomerSelected) {…return;} if (tabPhone.length >= 3) searchCustomers(tabPhone)` |
| C4 | Name-search useEffect gate sequence | `sed -n 378,394p` | ✅ Confirmed: `if (!isTabPayment) return; if (tabIsCustomerSelected) {…return;} if (tabName.length >= 2) searchCustomers(tabName)` |
| C5 | `tabContact` payload line byte-identical to PRE-BUG-038 baseline (`07c60b3`) | `diff` | ✅ **IDENTICAL** — `tabContact: isTabPayment ? { name: tabName, phone: tabPhone } : null,` |
| C6 | `customer_id` / `tabCustomerId` non-comment writes | `grep -nE` | ✅ **Zero** non-comment occurrences (only comments + React `key` + `data-testid`) |
| C7 | `isTabPayment` gate count | `grep -c` | ✅ **8 occurrences** as designed: 1 def + 2 useEffect early-returns + 2 dep-arrays + 1 payload + 1 JSX render + 1 validation |
| C8 | `customerService.searchCustomers` graceful-failure path intact | `sed -n 18,33p` on `customerService.js` | ✅ Confirmed: `try { … } catch (err) { console.warn('[CRM] Customer search failed:', …); return []; }` — never throws |
| C9 | Single-file footprint | `git log --oneline frontend/.../CollectPaymentPanel.jsx` | ✅ Latest auto-commit `50c8c1b` carries only this file change |
| C10 | All untouched files truly untouched | `git diff` against pre-fix | ✅ `customerService.js`, `orderTransform.js`, `crmAxios.js`, `CartPanel.jsx`, `OrderEntry.jsx`, `CustomerModal.jsx` — all empty diff |

---

## 3. Test Case Results

### Test 1 — Re-engaged Credit/TAB order: API call fires on typing

**Pre-fix behaviour (owner-confirmed in screenshot 1):**
At mount, `tabIsCustomerSelected = !!customer?.id`. For a re-engaged order with stored CRM linkage, this evaluates to `true`. Phone-search useEffect (L362) and name-search useEffect (L380) both hit `if (tabIsCustomerSelected) return;` and exit before reaching `searchCustomers(…)`. **Zero API calls fired** — empty Network panel.

**Post-fix behaviour (this CR):**
At mount, `tabIsCustomerSelected = false` unconditionally. When the cashier:

1. **Opens Collect Payment with prefilled values (re-engaged order):**
   - `tabName = "abhishek"` (8 chars ≥ 2) and `tabPhone = "7505242126"` (10 chars ≥ 3) seed from `customer?.name/phone`.
   - User taps Credit → `paymentMethod = 'credit'` → `isTabPayment = true` → both useEffect deps trip.
   - Phone useEffect: `!isTabPayment` is `false` → skip. `tabIsCustomerSelected` is `false` → skip. `tabPhone.length >= 3` is `true` → **`searchCustomers("7505242126")` fires**.
   - Name useEffect: identical path → **`searchCustomers("abhishek")` fires**.
   - Result: **two `GET /api/pos/customers?search=…&limit=10` requests visible in DevTools Network panel.**

2. **Types into a blank Credit/TAB field on a fresh order:**
   - First keystroke updates `tabPhone` / `tabName` → useEffect re-runs → threshold check → `searchCustomers(…)` fires once threshold hit.
   - Subsequent keystrokes re-fire (no debounce, matches CartPanel cadence).

**Status:** ✅ **PASS (structurally guaranteed).** Owner-side runtime reproduction: §5 below.

---

### Test 2 — API response handling

#### If CRM returns **HTTP 200** with customers

- `response.data?.success === true` → `fromAPI.searchResults(response.data?.data?.customers || [])` returns an array.
- `setTabFilteredByPhone(filtered)` + `setTabShowPhoneSuggestions(filtered.length > 0)`.
- Suggestion overlay JSX renders (line 2295-2317) with each `c.name` + `c.phone` row.
- Picking a suggestion calls `selectTabCustomer(c)` → autofills `tabName` + `tabPhone`, closes overlays, sets `tabIsCustomerSelected = true`.

**Result on 200:** ✅ Suggestions appear; autofill works.

#### If CRM returns **HTTP 401** (current preprod state — GAP-B)

- `customerService.js:30` → `catch (err) { console.warn('[CRM] Customer search failed:', …); return []; }`.
- `setTabFilteredByPhone([])` + `setTabShowPhoneSuggestions(false)` (line 369-370).
- No overlay rendered.
- Cashier sees the inputs in their normal state with existing values; can edit freely; existing validation block (L2402-2410, preserved verbatim) gates submission only on `tabName.trim()` + `tabPhone.length === 10`.
- Pay button completes normally with manually entered values.

**Result on 401:** ✅ No suggestions; manual entry path fully functional; payment proceeds. **No disruptive toast, banner, or error UI.**

**Recording of 401 as separate issue:** ✅ Confirmed. GAP-B is documented in:
- `/app/memory/change_requests/tab_credit_customer_cr_retrieval/TAB_CREDIT_CUSTOMER_CRM_AUTOFILL_LIVE_SMOKE_GAP_ANALYSIS.md` §3
- `/app/memory/change_requests/tab_credit_customer_cr_retrieval/TAB_CREDIT_CUSTOMER_CRM_AUTOFILL_GAP_A_FIX_REPORT.md` §9

GAP-B is a **pre-existing CRM auth issue** affecting CartPanel + CustomerModal + Credit/TAB autofill identically. Not introduced by BUG-038. Recommended to file as `BUG-038-FU-CRM-AUTH` or new `BUG-050`.

---

### Test 3 — Payload check (BILL_PAYMENT unchanged)

**Diff against pre-BUG-038 baseline (commit `07c60b3`):**

```bash
$ diff <(git show 07c60b3:.../CollectPaymentPanel.jsx | grep "tabContact:") \
       <(grep "tabContact:" .../CollectPaymentPanel.jsx)
# (empty)
✅ tabContact line IDENTICAL
```

Line 691 in HEAD:
```js
tabContact: isTabPayment ? { name: tabName, phone: tabPhone } : null,
```

- **`customer_id`**: zero non-comment occurrences across the file.
- **`tabCustomerId`**: zero occurrences anywhere.
- **`c.id`** uses: 4 sites — all UI-only (`key={c.id}` on React lists at L2269/2307; `data-testid={`…-${c.id}`}` at L2273/2311). **No state writes, no payload writes.**
- **`orderTransform.collectBillExisting`**: zero diff in `orderTransform.js`. Outbound `BILL_PAYMENT` carries `name` + `mobile` only.

**Mobile remains the sole customer identifier on the wire.** Backend continues to dedupe by `mobile`.

**Status:** ✅ **PASS — byte-identical payload.**

---

### Test 4 — Non-Credit/TAB regression

All CRM code paths in `CollectPaymentPanel.jsx` are gated by `isTabPayment` (8 occurrences confirmed in C7):

| Line | Gate use |
|---|---|
| 351 | `isTabPayment = paymentMethod === 'credit' \|\| paymentMethod.toLowerCase() === 'tab'` |
| 361, 379 | Both useEffect early-returns: `if (!isTabPayment) return;` |
| 376, 394 | Dep arrays trigger re-evaluation on payment-method switch |
| 691 | Payload: `tabContact: isTabPayment ? { name, phone } : null` (non-TAB → `null`) |
| 2250 | JSX render branch: `{isTabPayment && !showSplit && (…)}` |
| 2413 | Validation block (preserved verbatim) |

**Per-mode confirmation:**

| Payment mode | `isTabPayment` | TAB section rendered? | CRM call fires? |
|---|---|---|---|
| Cash (`paymentMethod === 'cash'`) | `false` | No | No |
| UPI | `false` | No | No |
| Card | `false` | No (Card transaction ID section renders instead) | No |
| Split (any) | `false` outer OR `showSplit === true` excludes block | No | No |
| Transfer-to-Room | `false` | No (Room picker section renders) | No |
| PayLater / Hold (status-8 or 9) | `false` | No | No |
| **Credit / TAB / `tab` / `TAB`** | `true` | Yes | **Yes** (≥ 3 / ≥ 2 char thresholds) |

**Status:** ✅ **PASS.** Non-Credit/TAB modes structurally cannot reach any new code introduced by BUG-038 or GAP-A.

---

## 4. Issues Found

**None.** GAP-A fix is structurally complete and verified.

| Severity | Count |
|---|---|
| Blocker | 0 |
| High | 0 |
| Medium | 0 |
| Low | 0 |
| Note | 2 |

**Note 1 — Owner runtime smoke needed.** This QA session cannot execute the live test against an awake CRM because the preview pod's auth backend is asleep (Playwright login attempts failed: `0 <input> elements found` in DOM despite visible form; the form components render via a non-standard input wrapper unreachable from automation). Owner is in the only position to run the reproduction. The reproduction recipe is in §5.

**Note 2 — GAP-B still pending.** The CRM endpoint (`https://crm.mygenie.online/api/pos/customers`) continues to return HTTP 401 per the owner's previous live smoke (screenshot 2). After applying the GAP-A fix, owner will see `customers?search=…` calls firing on the Credit/TAB section (proof GAP-A is fixed) — but still returning 401 until GAP-B is addressed. GAP-B is **explicitly out of scope** of this CR per owner directive and is documented as a separate pre-existing CRM auth issue.

---

## 5. Owner-Side Runtime Smoke Reproduction Recipe

To prove GAP-A is fixed end-to-end, owner runs this 4-step recipe on the same re-engaged order from screenshot 1:

| Step | Action | Expected outcome |
|---|---|---|
| 1 | Open Collect Payment for the same order from screenshot 1 (the 918-min-old order with stored customer "abhishek" / "7505242126") | Credit Customer Details inputs are pre-populated as before |
| 2 | Open DevTools → Network → filter Fetch/XHR. Clear log. Tap **Credit** payment method. | **Network panel now shows TWO requests fire immediately:** `GET /api/pos/customers?search=7505242126&limit=10` and `GET /api/pos/customers?search=abhishek&limit=10` |
| 3 | Type a single character into the name field (e.g. add a space) | A new `customers?search=…&limit=10` request fires |
| 4 | Inspect any one of those requests | Method `GET`, query string includes `search=<typed value>` and `limit=10`. Response status will be **`401`** until GAP-B is addressed — that's the expected pre-existing CRM auth issue. |

**Acceptance criteria for GAP-A closure:** Step 2 confirms ≥ 1 `customers?search=…` request now visible (vs zero in pre-fix screenshot 1).

**Acceptance for end-to-end autofill UX:** requires GAP-B (separate bug) to be fixed first so the request returns 2xx with customer data.

---

## 6. GAP-B Recommendation (Pre-Existing CRM 401 — out of scope)

GAP-B continues to block the user-visible outcome. **Strongly recommend opening as a separate bug** with the following triage steps for the next agent / backend team:

1. **Confirm which key is being sent.** DevTools → click the 401 row → Headers tab → copy the `X-API-Key` value being sent. Compare against the entry in `frontend/.env` `REACT_APP_CRM_API_KEYS` for the active restaurant ID.
2. **Confirm restaurant-ID resolution.** Inspect `crmAxios.js` interceptor — is the restaurant ID resolved correctly at request time? Is the key map being read for the right tenant?
3. **Server-side cross-check.** Use `cURL` with the same `X-API-Key` directly against `https://crm.mygenie.online/api/pos/customers?search=test&limit=10`:
   - If also 401 → server-side rejection (rotated keys, IP restriction, account suspension). Backend team to investigate.
   - If 200 → FE interceptor is the gap.
4. **Cross-tenant check.** Try with a different restaurant ID's key (e.g., one with `dp_live_*` known to work). If that 200s, the active tenant's key is the issue.
5. **CORS / origin / cert sanity.** Confirm `REACT_APP_CRM_BASE_URL` resolves from the browser; no CORS blocked logs.

These are platform-level / backend / DevOps actions. **Do not block BUG-038 closure on GAP-B.**

---

## 7. Sign-Off

| Item | Status |
|---|---|
| Files changed | Only `frontend/src/components/order-entry/CollectPaymentPanel.jsx` (auto-commit `50c8c1b`) |
| Lint | ✅ Clean (`mcp_lint_javascript`: No issues found) |
| Single-line fix at L351 verified | ✅ `useState(false)` |
| Search useEffect gate path traced (phone) | ✅ `!isTabPayment` → `tabIsCustomerSelected` → `tabPhone.length >= 3` → `searchCustomers(tabPhone)` |
| Search useEffect gate path traced (name) | ✅ `!isTabPayment` → `tabIsCustomerSelected` → `tabName.length >= 2` → `searchCustomers(tabName)` |
| Payload byte-identical (`tabContact`) | ✅ `diff` empty vs pre-BUG-038 baseline |
| `customer_id` / `tabCustomerId` writes | ✅ Zero (only comments + React `key` + `data-testid`) |
| `customerService.searchCustomers` graceful-failure intact | ✅ Returns `[]` on any error; never throws |
| Non-Credit/TAB modes affected | ✅ No — `isTabPayment` gates every CRM path |
| CartPanel / OrderEntry / CustomerModal regressed | ✅ No — zero diff |
| Backend touched | ✅ No |
| GAP-B (CRM 401) touched | ✅ No (explicit out of scope) |
| Owner directive "no code update" honoured | ✅ This QA session made zero code edits |

**QA verdict:** ✅ **PASS (static + structural).** Awaiting owner runtime smoke per §5.

---

— End of TAB / Credit Customer CRM Autofill — GAP-A QA Report —
