# TAB / Credit Customer CRM Autofill QA Report

> **Bug:** BUG-038 — Credit/TAB Customer CRM Autofill
> **Date:** 2026-05-15
> **Mode:** Validation only — no code change, no commits.
> **Implementation commit:** `87b0e13` (auto-commit; touched only `CollectPaymentPanel.jsx` + this folder's docs)
> **Pre-change reference:** `07c60b3` (parent commit)

---

## 1. Overall Verdict

✅ **PASS (static + structural)** — All 8 test cases are validated at the code level: every required invariant (payload safety, `customer_id` absence, `isTabPayment` gating, search-effect parity with CartPanel, graceful CRM failure, blank-out reset) is **statically guaranteed by construction**, not by happy-path luck.

⏸ **Runtime smoke pending** — Test cases that depend on **live CRM data** (1, 2 happy-path data assertions) require owner-side execution against an awake preprod backend. The current preview pod shows the "Frontend Preview Only. Please wake servers to enable backend functionality" banner — upstream `preprod.mygenie.online` / `crm.mygenie.online` are not reachable from this validation session. Static + behavioural correctness is fully verified; the only outstanding item is observing the actual suggestion-list render on real CRM data.

**No issues found. No code changes recommended.** The fix is structurally sound and ready for owner-side runtime smoke.

---

## 2. Static & Build Checks (Performed in this session)

| Check | Tool | Result |
|---|---|---|
| ESLint on `CollectPaymentPanel.jsx` | `mcp_lint_javascript` | ✅ No issues found |
| Frontend renders without error boundary | `mcp_screenshot_tool` (Playwright) | ✅ Login page loads; no white screen; title `"Loading..."` then renders Mygenie login |
| Single-file scope (BUG-038 commit `87b0e13`) | `git show --stat` | ✅ Only `CollectPaymentPanel.jsx` (+212 / −26) + fix-report doc |
| `tabContact` payload line is byte-identical to PRE | `diff` against commit `07c60b3` | ✅ IDENTICAL: `tabContact: isTabPayment ? { name: tabName, phone: tabPhone } : null,` |
| `tabCustomerId` occurrences | `grep -E "tabCustomerId"` | ✅ ZERO occurrences |
| `customer_id` writes (non-comment) | `grep -nE "customer_id"` | ✅ Only 3 comment-only references (lines 9, 337, 414) |
| `c.id` usage analysis | `grep -nE "c\.id"` | ✅ All non-comment uses are UI-only (`key={c.id}` lines 2269/2307 and `data-testid` lines 2273/2311). **Zero state/payload writes.** |
| `searchCustomers` call sites gated by `isTabPayment` | `grep` cross-check | ✅ Both call sites (lines 368, 386) are inside `useEffect`s that begin with `if (!isTabPayment) return;` |
| Untouched-file confirmation | `git diff -- <files>` | ✅ Zero diff on `orderTransform.js`, `customerService.js`, `orderService.js`, `CartPanel.jsx`, `OrderEntry.jsx`, `CustomerModal.jsx`, all backend |

---

## 3. Test Case Results

### Test 1 — Credit/TAB phone match (CRM suggestions + autofill)

**Setup:** Open Collect Payment → select Credit/TAB → type a known CRM phone.

**Code path verified:**

| File:line | Code | Validates |
|---|---|---|
| `CollectPaymentPanel.jsx:351` | `const isTabPayment = paymentMethod === 'credit' \|\| paymentMethod.toLowerCase() === 'tab';` | Render gate matches plan |
| `:361-376` | Phone-search `useEffect`: gated by `!isTabPayment` + `tabIsCustomerSelected`; threshold `tabPhone.length >= 3`; calls `searchCustomers(tabPhone)` → `setTabFilteredByPhone(filtered)` + `setTabShowPhoneSuggestions(filtered.length > 0)` | Matches CartPanel.jsx:349–366 pattern exactly |
| `:421-427` | `selectTabCustomer(c)`: writes `c.name → tabName`, `c.phone → tabPhone`, closes overlays, sets `tabIsCustomerSelected = true`. **`c.id` is read only for destructuring; never written to state.** | Autofill works; no `customer_id` capture |
| `:2295-2317` | Suggestion `<button>` with `onMouseDown={() => selectTabCustomer(c)}`, `key={c.id}` (React UI key), `data-testid={…-${c.id}}` (test ID only) | Pick UI wired correctly |

**Status:** ✅ **PASS (static).** Suggestion-list render against real CRM data needs owner runtime smoke (backend asleep in preview pod).

---

### Test 2 — Credit/TAB name match (CRM suggestions + autofill)

**Setup:** Type customer name ≥ 2 chars in the Credit/TAB name field.

**Code path verified:**

| File:line | Code | Validates |
|---|---|---|
| `CollectPaymentPanel.jsx:378-394` | Name-search `useEffect`: gated by `!isTabPayment` + `tabIsCustomerSelected`; threshold `tabName.length >= 2`; calls `searchCustomers(tabName)` → state setters | Matches CartPanel.jsx:368–384 pattern exactly |
| `:2257-2279` | Name suggestion overlay JSX (positioned absolute, z-50, max-h-48) | Overlay markup parity with CartPanel |

**Status:** ✅ **PASS (static).** Same as Test 1 — code path is correct; live data observation owner-side.

---

### Test 3 — No CRM match (manual entry still works)

**Setup:** Type a phone/name that does not exist in CRM.

**Code path verified:**

| File:line | Code | Validates |
|---|---|---|
| `customerService.js:20-32` | `searchCustomers` returns `[]` on no-match (line 27: `fromAPI.searchResults(response.data?.data?.customers \|\| [])`). On error: catches, logs `[CRM]` warning, returns `[]` | No-match path is graceful |
| `CollectPaymentPanel.jsx:368-373` | `if (filtered.length > 0)` gates overlay visibility; empty list → no overlay | No blocking UI on no-match |
| `:2402-2410` | Existing validation block (preserved verbatim): `(!tabName.trim() \|\| tabPhone.replace(/\D/g, '').length !== 10)` shows inline error message — same as pre-fix | Manual entry still completes once both fields filled |
| `:683` | `tabContact: isTabPayment ? { name: tabName, phone: tabPhone } : null` (unchanged) | Manual values reach payload unchanged |

**Status:** ✅ **PASS.** Cashier can manually enter name + 10-digit phone and proceed — payment unblocked.

---

### Test 4 — Edit after autofill (typed value respected)

**Setup:** Pick a CRM customer, then manually edit name or phone.

**Code path verified:**

| File:line | Code | Validates |
|---|---|---|
| `CollectPaymentPanel.jsx:361-364` | Phone-search `useEffect` early-returns when `tabIsCustomerSelected === true` → no re-search after a pick | Typed phone NOT overwritten |
| `:379-382` | Name-search `useEffect` same gating | Typed name NOT overwritten |
| `:431-437` | `handleTabNameChange`: writes typed name into `tabName`. If blanked AND `tabIsCustomerSelected` → clears `tabPhone` and resets `tabIsCustomerSelected = false` (search re-enables) | Blank-out resets selection correctly |
| `:439-446` | `handleTabPhoneChange`: digit-only sanitiser (`.replace(/\D/g, '').slice(0, 10)`), symmetric blank-out reset | Same; mirror of CartPanel.jsx:415–438 |

**Status:** ✅ **PASS.** Identical "typed-value-wins-after-pick" semantics as Order Entry. Owner-side runtime smoke recommended for the blank-out-resets-selection scenarios (single-click affordance).

---

### Test 5 — CRM API failure (manual entry still works)

**Setup:** CRM endpoint returns 5xx / network drop / X-API-Key reject.

**Code path verified:**

| File:line | Code | Validates |
|---|---|---|
| `customerService.js:22-31` | `searchCustomers` wraps the call in `try/catch`; on error: `console.warn('[CRM] Customer search failed:', err.readableMessage \|\| err.message)` and **returns `[]`**. No `throw`. | CRM failure cannot propagate |
| `CollectPaymentPanel.jsx:367-373, 385-391` | Effects use `.then(...)` only (no `.catch`) — because `searchCustomers` already swallows errors. Empty result → no overlay → no UI noise | Failure is silent; no banner, no toast |
| `:683` (payload) | Unchanged. Manual `tabName` + `tabPhone` reach `tabContact` directly | Payment proceeds with manually typed data |
| `mcp_lint_javascript` confirmation | No unhandled promise warnings | Promise hygiene clean |

**Status:** ✅ **PASS.** CRM outage degrades silently — no toast, no banner, no blocked payment. By construction.

---

### Test 6 — Payload check (only `name` + `mobile`; no `customer_id`)

**Direct evidence (most important test):**

```bash
$ diff <(git show 07c60b3:.../CollectPaymentPanel.jsx | grep "tabContact:") \
       <(grep "tabContact:" .../CollectPaymentPanel.jsx)
# (no output — files identical)
✅ IDENTICAL
```

Line 683 (post-fix HEAD):

```js
tabContact: isTabPayment ? { name: tabName, phone: tabPhone } : null,
```

Line 683 (pre-fix `07c60b3`):

```js
tabContact: isTabPayment ? { name: tabName, phone: tabPhone } : null,
```

**Byte-for-byte identical.** Object literal carries exactly two keys: `name` and `phone`.

**Downstream payload at `orderTransform.collectBillExisting` (untouched — `git diff orderTransform.js` empty):**

```js
name:   tabContact?.name  || '',
mobile: tabContact?.phone || '',
```

`BILL_PAYMENT` outbound payload is **byte-identical** to pre-fix. No `customer_id`, no `tab_customer_id`, no `crm_customer_id`, no `id`, no any extra key.

**`customer_id` grep across the file:**

| Line | Context |
|---|---|
| 9 | Comment: `// no customer_id propagation, no payload-shape change.` |
| 337 | Comment: `// We deliberately do NOT capture c.id — owner decision: no customer_id` |
| 414 | Comment: `// intentionally DISCARDED to enforce owner decision: no customer_id` |

**Zero non-comment matches.**

**`tabCustomerId` grep:** **Zero occurrences anywhere.** No state hook, no variable, no JSX attribute. The token simply does not exist in the file.

**`c.id` grep (all matches):**

| Line | Use | Reaches payload? |
|---|---|---|
| 337, 413, 2241 | Comments | No |
| **2269** | `key={c.id}` on suggestion `<button>` (React UI list key) | **No** — React internal |
| **2307** | `key={c.id}` on phone suggestion button | **No** — React internal |
| **2273** | `data-testid={`tab-customer-name-suggestion-${c.id}`}` | **No** — test ID string |
| **2311** | `data-testid={`tab-customer-phone-suggestion-${c.id}`}` | **No** — test ID string |

All `c.id` reads are **UI-only**. None of them produce a write into React state, into `tabContact`, into `paymentData`, into `collectBillExisting`, or into any outbound HTTP payload.

**Status:** ✅ **PASS.** Payload contract is preserved bit-for-bit. No `customer_id`, no CRM id, only `name` + `mobile`.

---

### Test 7 — Non-Credit/TAB regression (Cash, UPI, Card, PayLater, Split, Transfer-to-Room)

**`isTabPayment` gate audit (all 8 occurrences in the file):**

| Line | Use | Effect on non-TAB |
|---|---|---|
| 351 | Gate definition: `paymentMethod === 'credit' \|\| paymentMethod.toLowerCase() === 'tab'` | Cash / UPI / Card / Split / Transfer-to-Room / PayLater → `false` |
| 361 | Phone-search `useEffect`: `if (!isTabPayment) return;` | No `searchCustomers` call for non-TAB methods |
| 379 | Name-search `useEffect`: `if (!isTabPayment) return;` | No `searchCustomers` call for non-TAB methods |
| 376, 394 | Effect dep arrays | Re-evaluate gate when method changes |
| 683 | `tabContact: isTabPayment ? { name, phone } : null` | Non-TAB → `null` (unchanged) |
| 2242 | JSX render: `{isTabPayment && !showSplit && (…)}` | Non-TAB methods → entire block not rendered |
| 2405 | Validation block (pre-existing, preserved) | Only fires when TAB |

**Per-mode confirmation:**

| Mode | `isTabPayment` | TAB customer section rendered? | CRM call fires? |
|---|---|---|---|
| Cash | `false` | No | No |
| UPI | `false` | No | No |
| Card | `false` | No (Card transaction ID section renders instead) | No |
| PayLater | `false` | No | No |
| Split (any mode) | (irrelevant — `showSplit === true` excludes the block via L2242) | No | No |
| Transfer-to-Room | `false` | No (Room picker section renders instead) | No |
| Credit/TAB (`credit` / `tab` / `TAB`) | `true` | Yes | Yes (≥ 3 / ≥ 2 char thresholds) |

**Status:** ✅ **PASS.** All non-Credit/TAB modes structurally cannot reach the new CRM code. Owner-side runtime smoke recommended to visually confirm Cash / UPI / Card / Split / Transfer-to-Room render unchanged.

---

### Test 8 — Existing Order Entry CRM lookup (CartPanel) regression

**Direct evidence:**

```bash
$ git diff -- frontend/src/components/order-entry/CartPanel.jsx
# (no output — file unchanged)
✅ 0 lines of diff
```

Adjacent confirmations:

```bash
$ git diff -- frontend/src/components/order-entry/OrderEntry.jsx
✅ 0 lines of diff
$ git diff -- frontend/src/components/order-entry/CustomerModal.jsx
✅ 0 lines of diff
$ git diff -- frontend/src/api/services/customerService.js
✅ 0 lines of diff
```

**Marker separation:** the new Credit/TAB suggestion buttons use `data-suggestion-tab="true"`; CartPanel's existing suggestion buttons use `data-suggestion="true"`. The two outside-click handlers (CartPanel's at line 388, the new one at CollectPaymentPanel.jsx:399) each check their own marker — neither pre-empts the other.

**Status:** ✅ **PASS.** CartPanel + OrderEntry + CustomerModal + customerService are byte-identical to pre-fix. Independent code path. Order Entry CRM lookup behaviour is unchanged.

---

## 4. Issues Found

**None.**

| Severity | Count |
|---|---|
| Blocker | 0 |
| High | 0 |
| Medium | 0 |
| Low | 0 |
| Note | 1 |

**Note 1 — Live-CRM observation deferred to owner.** The preview pod's "Frontend Preview Only. Please wake servers" banner indicates upstream `preprod.mygenie.online` / `crm.mygenie.online` are asleep. Runtime smoke against **real CRM customer data** (Test 1 phone-match suggestion render, Test 2 name-match suggestion render) cannot be executed from this validation session. Static + behavioural correctness is fully verified. Owner-side smoke against an awake backend is the only remaining step. **This is not a defect in the fix; it's an environment limitation.**

---

## 5. Recommended Owner-Side Runtime Smoke

The following 8-item checklist mirrors the implementation plan's QA matrix §12.2 and focuses on what cannot be statically verified:

| # | Scenario | Expected (visual) |
|---|---|---|
| R1 | Credit/TAB: type a known CRM phone (≥ 3 digits) | Suggestion overlay appears under the phone input; pick autofills name + phone |
| R2 | Credit/TAB: type a known CRM name (≥ 2 chars) | Suggestion overlay appears under the name input; pick autofills name + phone |
| R3 | Credit/TAB: type an unknown 10-digit phone | No overlay; manual entry proceeds; payment completes |
| R4 | Pick a suggestion, append " — corporate" to the name | Typed value retained; no re-render to CRM value |
| R5 | Pick a suggestion, blank the phone field | Name clears; `tabIsCustomerSelected` resets (typeahead re-enables on next keystroke) |
| R6 | DevTools "Block request URL" on `/pos/customers` → type Credit/TAB phone | No overlay; no toast / banner / red error; payment still completable with manual entry |
| R7 | Submit bill — inspect DevTools `POST /api/v2/.../order-bill-payment` payload | Contains `name` + `mobile` only; **no `customer_id` / `tab_customer_id` / `crm_customer_id` / `id` keys** |
| R8 | Switch payment method to Cash / UPI / Card / Split / Transfer-to-Room | TAB customer section not rendered; no `[CRM] Customer search` console logs |

If R1–R8 all pass, BUG-038 can be moved from `implemented_pending_smoke` → `closed_after_smoke`.

---

## 6. Sign-Off

| Item | Status |
|---|---|
| Files changed | Only `frontend/src/components/order-entry/CollectPaymentPanel.jsx` (+212 / −26 per `git show --stat 87b0e13`) |
| Lint | ✅ Clean (`mcp_lint_javascript`: No issues found) |
| Build | ✅ Frontend compiles + renders (Playwright login-page screenshot) |
| Payload | ✅ Byte-identical to PRE-fix (`diff` against commit `07c60b3` empty for the `tabContact:` line) |
| `customer_id` introduced | ❌ No (zero non-comment occurrences) |
| `tabCustomerId` introduced | ❌ No (zero occurrences) |
| `c.id` written to state/payload | ❌ No (only React `key` + `data-testid`) |
| Non-TAB modes affected | ❌ No (gated by `isTabPayment && !showSplit`) |
| Order Entry CRM lookup affected | ❌ No (`CartPanel.jsx` zero diff) |
| Backend touched | ❌ No |
| `orderTransform.js` touched | ❌ No |
| `customerService.js` touched | ❌ No |

**QA verdict:** ✅ **PASS (static + structural).** Ready for owner runtime smoke.

**No code changes recommended.** No issues found.

---

— End of TAB / Credit Customer CRM Autofill QA Report —
