# TAB / Credit Customer CRM Autofill — QA Failure Fix Report

> **Bug:** BUG-038 — Credit/TAB Customer CRM Autofill (QA-failure follow-up)
> **Date:** 2026-05-15
> **Predecessor docs:**
> - `TAB_CREDIT_CUSTOMER_CRM_AUTOFILL_FIX_REPORT.md` (initial fix)
> - `TAB_CREDIT_CUSTOMER_CRM_AUTOFILL_QA_REPORT.md` (static QA — PASS but flagged "runtime smoke owner-side required")
> - `TAB_CREDIT_CUSTOMER_CRM_AUTOFILL_LIVE_SMOKE_GAP_ANALYSIS.md` (root-cause diagnosis after owner live smoke)
> - `TAB_CREDIT_CUSTOMER_CRM_AUTOFILL_IMPLEMENTATION_PLAN.md`
> - `BUG_038_CREDIT_CUSTOMER_CRM_AUTOFILL_IMPACT_ANALYSIS.md`
> **Mode:** Minimal-fix follow-up. No unrelated changes, no commits.

---

## 1. Investigation — Answers to the 11 Owner Checks

| # | Check | Result |
|---|---|---|
| 1 | Is the running code actually the modified `CollectPaymentPanel.jsx`? | ✅ **Yes.** BUG-038 markers present at 7 sites (lines 7, 335, 353, 396, 413, 424, 2239). HEAD = commit `87b0e13`. Hot reload picks up changes from the source file. |
| 2 | Are Credit/TAB name & phone inputs wired to the new handlers? | ✅ **Yes.** `onChange={handleTabNameChange}` and `onChange={handleTabPhoneChange}` on the inputs inside the `{isTabPayment && !showSplit && (…)}` block. |
| 3 | Are `useEffect` deps watching `tabName` / `tabPhone`? | ✅ **Yes.** Phone effect deps: `[tabPhone, tabIsCustomerSelected, isTabPayment]`. Name effect deps: `[tabName, tabIsCustomerSelected, isTabPayment]`. |
| 4 | Is `isTabPayment` true for the Credit button? | ✅ **Yes.** `paymentMethod === 'credit' \|\| paymentMethod.toLowerCase() === 'tab'` (line 351). When the cashier clicks the Credit button, `paymentMethod` becomes `'credit'`. |
| 5 | **Is `tabIsCustomerSelected` accidentally `true` before user selection?** | ❌ **YES — THIS IS THE BUG.** Original seed at line 343: `useState(!!customer?.id)`. For re-engaged orders (the owner's smoke scenario: order placed 918 mins ≈ 15 hours earlier with a stored CRM-linked customer), the parent `OrderEntry` hydrates `customer = { id: <stored_id>, name: "abhishek", phone: "7505242126" }`. The seed evaluates to `true`. Both search useEffects hit `if (tabIsCustomerSelected) return;` and **exit before reaching `searchCustomers`**. |
| 6 | Thresholds correct? | ✅ **Yes.** Phone ≥3 digits (line 367), name ≥2 chars (line 385). Matches CartPanel parity. |
| 7 | `customerService.searchCustomers` imported and called? | ✅ **Yes.** Import at line 10; calls at lines 368 (phone search) and 386 (name search). |
| 8 | Suggestions hidden behind z-index / layout? | ❌ **No relevant.** No suggestions can render because the network call never fires; the overlay state stays empty (`tabFilteredBy* = []`, `tabShow*Suggestions = false`). Z-index is `z-50` which is fine. |
| 9 | CRM API failing with 401, or no request at all? | **No request at all** from the Credit/TAB block (per owner's screenshot 1 — empty Network panel under Fetch/XHR filter). A pre-existing CRM 401 affects the **adjacent** CartPanel flow (screenshot 2, four calls all 401) — but that is **out of scope** for BUG-038 (see §5). |
| 10 | Does implementation accidentally only search **after** selecting a customer? | ❌ **Effectively yes — the inverted version of the intended gate.** The seed flag is `true` from mount when an upstream customer is linked, so the search is gated **off** until the cashier blanks the field. This is the inverse of the owner's expectation ("type → search → suggestions"). |
| 11 | Is the code path inside `isTabPayment && !showSplit`? | ✅ **Yes.** All new JSX is inside the existing conditional render branch at line 2242. All search useEffects have `if (!isTabPayment) return;` as the first guard. |

**Root cause identified at check #5.**

---

## 2. Fix Classification

| Dimension | Answer |
|---|---|
| Was it deployment / build? | ❌ No — code is loaded and reachable |
| Was it handler wiring? | ❌ No — `onChange` handlers correctly attached |
| Was it effect-guard / dependency issue? | ✅ **YES** — `tabIsCustomerSelected` initial seed too aggressive |
| Was it `isTabPayment` condition? | ❌ No — gate flips correctly when Credit is clicked |
| Was it API / auth? | ❌ Not in BUG-038 scope (pre-existing CRM 401 noted separately in §5) |

**Bucket: effect-guard / initial-seed defect. Surgical one-line fix.**

---

## 3. Exact Fix

**File:** `/app/frontend/src/components/order-entry/CollectPaymentPanel.jsx`
**Line:** 343 (the `tabIsCustomerSelected` `useState` seed)

### 3.1 Before

```js
const [tabIsCustomerSelected, setTabIsCustomerSelected] = useState(!!customer?.id);
```

This seeds `tabIsCustomerSelected = true` whenever the parent passes a `customer` object with a truthy `id`. Re-engaged orders always satisfy this condition because the `customer_id` was stored at original placement.

### 3.2 After

```js
// BUG-038 follow-up (May-2026, post owner live smoke): seed `false`
// unconditionally so the CRM typeahead fires when the cashier types in
// the Credit/TAB block, even if the order being settled was placed
// earlier with an already-linked customer (`customer.id` truthy on
// re-engaged orders). The cashier may want to bill the credit to a
// different customer than the order's upstream customer (corporate
// invoice / different credit account / record verification). Picking a
// suggestion via selectTabCustomer flips this to `true` and gates
// further re-search until the field is blanked — same edit-after-pick
// semantics as CartPanel. Mobile remains the unique key; no payload
// change; no customer_id capture.
const [tabIsCustomerSelected, setTabIsCustomerSelected] = useState(false);
```

### 3.3 What this changes

| Scenario | Pre-fix | Post-fix |
|---|---|---|
| New order, no upstream customer | Search fires ✓ | Search fires ✓ (unchanged) |
| Re-engaged order, stored `customer.id`, cashier types | Search **blocked** ✗ (owner-observed defect) | **Search fires ✓** |
| Cashier picks a suggestion in Credit/TAB | `tabIsCustomerSelected → true`; no re-search until blank-out | Same ✓ |
| Cashier edits name/phone after pick | Typed value retained; no re-search | Same ✓ |
| Cashier blanks the field | Reset; search re-enables | Same ✓ |

### 3.4 What this does NOT change

- Bill-payment payload (`tabContact: { name, phone }`) — **byte-identical**.
- `orderTransform.collectBillExisting` — **byte-identical (zero diff)**.
- `customerService.js` / `crmAxios.js` / backend — **untouched**.
- CartPanel typeahead — **untouched**.
- All non-Credit/TAB payment modes — **untouched** (still gated by `isTabPayment`).
- No `customer_id` introduced; no `tabCustomerId` introduced.

---

## 4. Files Changed

| Path | Op | LoC | Why |
|---|---|---|---|
| `/app/frontend/src/components/order-entry/CollectPaymentPanel.jsx` | EDIT | +11 / −1 (10-line comment + 1-line value change) | Seed `tabIsCustomerSelected = false` unconditionally |

**Total: 1 file, 11 inserted lines (10 comment + 1 code), 1 deleted line.**

Confirmed by `git status --short frontend/src/`:

```
 M frontend/src/components/order-entry/CollectPaymentPanel.jsx
```

No other file modified. Specifically verified zero diff on:

- `frontend/src/api/transforms/orderTransform.js`
- `frontend/src/api/services/customerService.js`
- `frontend/src/components/order-entry/CartPanel.jsx`
- `frontend/src/components/order-entry/OrderEntry.jsx`

---

## 5. Pre-Existing CRM 401 (Not in BUG-038 Scope — Flagged)

Owner's screenshot 2 shows the **existing** CartPanel CRM typeahead firing four calls — all `HTTP 401`:

```
customers?search=7505242126&l...   401   xhr   bundle.js:130926
customers?search=7505242126&l...   401   xhr   bundle.js:130926
customers?search=ab&limit=10       401   xhr   bundle.js:130926
customers?search=abh&limit=10      401   xhr   bundle.js:130926
```

The initiator points to the existing CartPanel hook, **not** the new BUG-038 code. After this QA-failure fix, the Credit/TAB block will also hit the same CRM endpoint and **will return 401 until the auth issue is fixed separately**. The fix in this report ensures the **wire is correct**; visibility of suggestions depends on resolving the 401 in a separate ticket (suggested BUG-038-FU-CRM-AUTH or BUG-050).

`searchCustomers` (in `customerService.js:22-31`) is graceful-failure-by-design — catches the 401, returns `[]`, logs `[CRM]` warning. So even with 401 in flight, the Credit/TAB section will not break and manual entry path remains functional.

**This pre-existing 401 is not addressed by this CR.** Owner directive locked scope to BUG-038 only; `customerService.js` and `crmAxios.js` are explicitly listed in the no-touch list except for compile/import issues (neither applies here).

---

## 6. QA / Check Results

### 6.1 Static checks

| Check | Tool | Result |
|---|---|---|
| ESLint on `CollectPaymentPanel.jsx` | `mcp_lint_javascript` | ✅ No issues found |
| Single-file scope | `git status --short` | ✅ Only `CollectPaymentPanel.jsx` |
| `tabContact` payload byte-identical to pre-fix | `diff` against commit `07c60b3` | ✅ IDENTICAL |
| Zero `customer_id` non-comment occurrences | `grep -nE "customer_id"` | ✅ All 4 matches are comments (lines 9, 337, 353, 425) |
| Zero `tabCustomerId` occurrences | `grep -nE "tabCustomerId"` | ✅ ZERO |
| `orderTransform.js` untouched | `git diff -- orderTransform.js` | ✅ Empty |
| `customerService.js` untouched | `git diff -- customerService.js` | ✅ Empty |
| `CartPanel.jsx` untouched | `git diff -- CartPanel.jsx` | ✅ Empty |
| `OrderEntry.jsx` untouched | `git diff -- OrderEntry.jsx` | ✅ Empty |

### 6.2 Behavioural verification (post-fix code path trace)

**Scenario: re-engaged order with stored `customer.id`, cashier opens Collect Payment, selects Credit, types nothing (fields pre-filled with "abhishek" + "7505242126").**

| Step | State | Effect |
|---|---|---|
| Mount | `tabName = "abhishek"`, `tabPhone = "7505242126"`, `tabIsCustomerSelected = false` (NEW), `paymentMethod = 'cash'` default | `isTabPayment = false` → both search useEffects no-op |
| Click Credit | `paymentMethod → 'credit'` → `isTabPayment = true` | Both search useEffects re-run via dep change |
| Phone effect | `tabPhone.length = 10 ≥ 3`, `tabIsCustomerSelected = false`, `isTabPayment = true` | → calls `searchCustomers("7505242126")` → API request fires |
| Name effect | `tabName.length = 8 ≥ 2`, same gates | → calls `searchCustomers("abhishek")` → API request fires |

**Two `GET /api/pos/customers?search=…&limit=10` requests will appear in DevTools Network panel** (one for phone, one for name) the moment the cashier clicks Credit, even without typing.

**Scenario: cashier modifies the phone — typing one more digit "75052421260" → sanitised to "7505242126" (capped at 10).** (Note: the sanitiser already enforces max 10 digits, so the field stays the same. If they backspace one digit: "750524212" length 9 ≥ 3 → new search fires for the shortened query.)

**Scenario: cashier picks a CRM suggestion from the overlay.** `selectTabCustomer(c)` writes `c.name → tabName`, `c.phone → tabPhone`, closes overlays, sets `tabIsCustomerSelected = true`. Future typing in the same fields won't re-trigger search (typed-value-respected) until the cashier blanks a field, which calls the existing handler reset logic.

**Scenario: CRM API returns 401 (current platform reality per GAP-B).** `searchCustomers` catches the error and returns `[]`. Phone effect sets `setTabShowPhoneSuggestions(false)` (no overlay rendered). Validation still allows the manual entry to proceed. **Manual entry path is unaffected.**

---

## 7. Confirmations Required by Owner Final-Response Template

### 7.1 API fires on name ≥ 2 chars

✅ **Confirmed via code trace.** With `tabIsCustomerSelected = false` from mount and `isTabPayment = true` once Credit is clicked, the name useEffect at line 378–394 satisfies all three guards:
1. `!isTabPayment` → false (skip early-return)
2. `tabIsCustomerSelected` → false (skip early-return)
3. `tabName.trim() && tabName.length >= 2` → true once cashier types 2+ chars

→ `searchCustomers(tabName)` fires. DevTools Network panel will show `GET /api/pos/customers?search=<name>&limit=10`.

### 7.2 API fires on phone ≥ 3 digits

✅ **Confirmed via code trace.** Same guards on the phone useEffect at line 360–376:
1. `!isTabPayment` → false
2. `tabIsCustomerSelected` → false
3. `tabPhone.trim() && tabPhone.length >= 3` → true once cashier types 3+ digits

→ `searchCustomers(tabPhone)` fires. DevTools Network panel will show `GET /api/pos/customers?search=<phone>&limit=10`.

### 7.3 No payload / `customer_id` change

✅ **Confirmed.** Diff of the `tabContact:` line against pre-fix commit `07c60b3` is empty. `selectTabCustomer(c)` continues to discard `c.id` and write only `c.name` + `c.phone`. `tabCustomerId` does not exist as a state variable anywhere. `orderTransform.collectBillExisting` continues to emit `name` + `mobile` only.

### 7.4 Manual entry still works on CRM failure

✅ **Confirmed.** `customerService.searchCustomers` is graceful-failure-by-design (`customerService.js:22-31`). On any non-2xx response (including the current platform 401), it returns `[]` and logs a `[CRM]` warning. The Credit/TAB code path uses `.then(...)` without a `.catch` because the helper already handles errors. Empty filtered list → no overlay → cashier proceeds with the manually-typed name + 10-digit phone. Validation block at line 2402 fires only when one of the fields is empty/invalid — manual entry passes once both are filled.

---

## 8. Cumulative Confirmations Across the BUG-038 Implementation

| Locked rule | Status across all commits in the CR |
|---|---|
| No payload change | ✅ `tabContact: { name, phone }` byte-identical pre/post |
| No `customer_id` | ✅ Zero non-comment occurrences |
| Mobile is unique key | ✅ Only identifier in payload |
| Manual entry works on CRM failure | ✅ Graceful failure preserved |
| Credit/TAB only | ✅ All new code gated by `isTabPayment` (+`!showSplit` for JSX) |
| No disruptive toast / banner / sound | ✅ Errors are console-only (`[CRM]` warn from `customerService`) |
| `orderTransform.js` untouched | ✅ Zero diff |
| `customerService.js` untouched | ✅ Zero diff |
| `CartPanel.jsx` untouched | ✅ Zero diff |
| Backend untouched | ✅ |
| Non-Credit/TAB modes untouched | ✅ Structurally unreachable |

---

## 9. Recommended Owner Re-Smoke

1. Open the same re-engaged order owner used earlier (the 15-hour-old order with "abhishek" + "7505242126").
2. Select Credit.
3. Watch DevTools Network panel filtered on Fetch/XHR.
4. **Expected:** two `customers?search=…` calls fire immediately (pre-filled values trigger both effects on Credit click).
5. **Expected (current platform reality):** both will return 401 due to the pre-existing CRM auth issue (GAP-B). This is **not** a BUG-038 defect — flag separately.
6. Once GAP-B is fixed by the CRM/auth owner, suggestion overlays will appear and pick-to-autofill will function end-to-end.

For a re-smoke that bypasses GAP-B: temporarily use a working `X-API-Key` or run against an environment where CRM auth is healthy. The wire on BUG-038's side is structurally correct.

---

## 10. Strict-Rules Compliance Certification

| Rule | Status |
|---|---|
| Allowed file only (`CollectPaymentPanel.jsx`) | ✅ |
| `orderTransform.js` untouched | ✅ |
| `collectBillExisting` untouched | ✅ |
| Payment payload byte-identical | ✅ |
| `customerService.js` untouched | ✅ |
| `CartPanel.jsx` untouched | ✅ |
| `OrderEntry.jsx` untouched | ✅ |
| Backend untouched | ✅ |
| No `customer_id` introduced | ✅ |
| Mobile remains unique key | ✅ |
| Manual entry works on CRM failure | ✅ |
| Credit/TAB only | ✅ |
| No disruptive toast/banner/sound | ✅ |
| PayLater / Cash / UPI / Card / Split / To-Room / Hold untouched | ✅ (gated by `isTabPayment`) |
| VAT / service-charge / tip / delivery-charge logic untouched | ✅ |
| Minimal fix (one-line code change + 10-line comment) | ✅ |
| Lint clean | ✅ |
| No commits | ✅ |

---

— End of TAB / Credit Customer CRM Autofill QA Failure Fix Report —
