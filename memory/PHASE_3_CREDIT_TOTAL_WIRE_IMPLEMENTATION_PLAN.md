# Phase 3 — Credit Total Wire: Implementation Plan

**Created:** 2026-06-12
**Gate:** 3 (Implementation Plan)
**Items:** CR-039 (Wire Total Credit / Total Paid from API)
**Related:** CR-026 §3 (backend ask — `tap-waiter-list` totals, now shipped), BUG-127 (Dashboard Credit Outstanding tile — already wired to `restaurant-tap-summary.balance`)

---

## API Response Shape (verified from owner screenshot)

The `POST /api/v1/vendoremployee/pos/tap-waiter-list` response now returns:

```json
{
  "employee-tap-list": [
    {
      "id": 2579,
      "name": "parth",
      "mobile": "9696759711",
      "email": null,
      "total_credit": "415.00",       // ← NEW per-customer
      "total_debit": "0.00",          // ← NEW per-customer
      "balance": "415.00"
    },
    ...
  ],
  "restaurant-tap-summary": {         // ← NEW top-level block
    "total_credit": "83,765.54",      // Comma-formatted string
    "total_debit": "44,812.49",       // Comma-formatted string
    "balance": "38,953.05"            // Comma-formatted string
  }
}
```

**Critical data format note:** Values are **comma-formatted strings** (e.g., `"83,765.54"`, `"3,000.00"`). Must strip commas before `parseFloat`. Pattern already established in codebase at `insightsService.js:681`:
```js
parseFloat(String(tapSummary.balance ?? '0').replace(/,/g, '')) || 0
```

---

## SCOPE LOCK

### Files I WILL change
| File | Change Type |
|------|-------------|
| `api/services/creditService.js` | Change `getTabCustomerList()` return shape to include summary + per-customer totals |
| `components/panels/CreditManagementPanel.jsx` | Update `fetchCustomers` to read new return shape |

### Files I will NOT touch
- `components/credit/CreditCustomerList.jsx` — already wired to receive `totalCredit`/`totalPaid` props; `hasTotals` check at L122 will automatically activate once non-null values flow through
- `api/services/insightsService.js` — already independently fetches `tap-waiter-list` and reads `restaurant-tap-summary.balance` (BUG-127 L616+680). No change needed.
- `utils/creditStatementGenerator.js` — receives data via props, doesn't call APIs directly
- `api/transforms/creditTransform.js` — utility functions only, no API shape dependency
- `api/constants.js` — endpoint URL unchanged

---

## Edit-by-Edit Plan

### Edit 1 — Change `getTabCustomerList()` return shape
**File:** `api/services/creditService.js`
**Lines:** 12-19
**Current:**
```js
/**
 * Fetch all credit/tab customers with outstanding balances.
 * @returns {Promise<Array<{id,name,mobile,email,balance}>>}
 */
export const getTabCustomerList = async () => {
  const res = await api.post(API_ENDPOINTS.CREDIT_CUSTOMER_LIST, {});
  return res.data?.['employee-tap-list'] || [];
};
```
**New:**
```js
/**
 * Fetch all credit/tab customers with outstanding balances + restaurant summary.
 * CR-039: Backend now ships `restaurant-tap-summary` (total_credit/total_debit/balance)
 * and per-customer total_credit/total_debit fields.
 * @returns {Promise<{customers: Array, summary: {totalCredit:number, totalDebit:number, balance:number}}>}
 */
export const getTabCustomerList = async () => {
  const res = await api.post(API_ENDPOINTS.CREDIT_CUSTOMER_LIST, {});
  const customers = res.data?.['employee-tap-list'] || [];
  const raw = res.data?.['restaurant-tap-summary'] || {};
  const parseAmount = (v) => parseFloat(String(v ?? '0').replace(/,/g, '')) || 0;
  return {
    customers,
    summary: {
      totalCredit: parseAmount(raw.total_credit),
      totalDebit: parseAmount(raw.total_debit),
      balance: parseAmount(raw.balance),
    },
  };
};
```

**Key decisions:**
- Returns an **object** `{ customers, summary }` instead of a raw array. This is a breaking change for callers.
- `parseAmount` strips commas and parses to float — handles `"83,765.54"` format.
- Defensive: `?? '0'` + `|| 0` for missing/null fields.
- Per-customer `total_credit`/`total_debit` are passed through as-is on the customer objects. Edit 3 (portfolio optimization, Option B — LOCKED by owner) will read them directly from the customer array without needing another service change.

**Consumer impact:** Only 2 callers of `getTabCustomerList()`:
1. `CreditManagementPanel.jsx` L51 — **must update** (Edit 2 below)
2. `insightsService.js` L616 — calls `api.post(API_ENDPOINTS.CREDIT_CUSTOMER_LIST, {})` **directly**, does NOT use `getTabCustomerList()`. **No change needed.**

### Edit 2 — Update `fetchCustomers` in CreditManagementPanel
**File:** `components/panels/CreditManagementPanel.jsx`
**Lines:** 47-75
**Current:**
```js
  const fetchCustomers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const list = await getTabCustomerList();
      setCustomers(
        list.map((c) => ({
          id: c.id,
          name:
            typeof c.name === 'string' && c.name.length > 0
              ? c.name.charAt(0).toUpperCase() + c.name.slice(1)
              : c.name,
          mobile: c.mobile || '',
          email: c.email || null,
          balance: Number(c.balance) || 0,
        })),
      );
      // BG-01: When backend ships these, getTabCustomerList raw response
      // will include total_credit / total_paid at top level.
      // For now, they'll be undefined → null.
      setTotalCredit(list._totalCredit ?? null);
      setTotalPaid(list._totalPaid ?? null);
    } catch (err) {
      console.error('[CreditManagementPanel]', err);
      setError(err.readableMessage);
    } finally {
      setLoading(false);
    }
  }, []);
```
**New:**
```js
  const fetchCustomers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { customers: rawList, summary } = await getTabCustomerList();
      setCustomers(
        rawList.map((c) => ({
          id: c.id,
          name:
            typeof c.name === 'string' && c.name.length > 0
              ? c.name.charAt(0).toUpperCase() + c.name.slice(1)
              : c.name,
          mobile: c.mobile || '',
          email: c.email || null,
          balance: Number(String(c.balance ?? '0').replace(/,/g, '')) || 0,
        })),
      );
      // CR-039: restaurant-tap-summary now provides portfolio totals.
      setTotalCredit(summary.totalCredit);
      setTotalPaid(summary.totalDebit);
    } catch (err) {
      console.error('[CreditManagementPanel]', err);
      setError(err.readableMessage);
    } finally {
      setLoading(false);
    }
  }, []);
```

**Key changes:**
1. Destructure `{ customers: rawList, summary }` from new return shape
2. Replace `list._totalCredit ?? null` (was always null) with `summary.totalCredit` (now a real number)
3. Replace `list._totalPaid ?? null` with `summary.totalDebit` (maps backend's "total_debit" to the UI's "Total Paid" tile)
4. **Balance parsing hardened:** `c.balance` may now be `"3,000.00"` (comma-formatted string) — added `String(...).replace(/,/g, '')` before `Number()`. Previously `Number("415.00")` worked because small values had no commas, but `Number("3,000.00")` returns `NaN`.

### Downstream auto-activation (NO code changes needed)

**CreditCustomerList.jsx L122:**
```js
const hasTotals = totalCreditProp != null && totalPaidProp != null;
```
With `summary.totalCredit` being a real number (e.g., `83765.54`), `hasTotals` becomes `true`. The KPI tiles automatically switch from `"—"` to formatted values. The tooltip text also auto-switches from "Awaiting backend..." to "Lifetime total credit...".

**Insights Dashboard (BUG-127):**
Already wired independently via `insightsService.js` L616+680 — reads `restaurant-tap-summary.balance` directly from its own `api.post()` call. Unaffected by this change.

---

## Naming Mapping

| API field | FE state variable | UI label |
|---|---|---|
| `restaurant-tap-summary.total_credit` | `totalCredit` | **TOTAL CREDIT** |
| `restaurant-tap-summary.total_debit` | `totalPaid` | **TOTAL PAID** |
| `restaurant-tap-summary.balance` | (not used in KPI — Outstanding is client-side sum) | — |

**Note:** The API calls it `total_debit` but the UI labels it "Total Paid" — this is correct. Debits = payments received = "Paid". The mapping `totalDebit → totalPaid` is intentional.

---

## Edit 3 — Portfolio Export Optimization (Option B — LOCKED by owner)

**File:** `components/panels/CreditManagementPanel.jsx`
**Lines:** 278-301 (`handlePortfolioExport` inner loop)

**Current behaviour:** For each customer, makes an individual `getTabCustomerRecords(c.id)` API call (batched 5 at a time) just to get `totalCredit`/`totalPaid`. For 41 customers = 9 batch rounds of network calls.

**New behaviour:** Read `total_credit`/`total_debit` directly from the customer objects already fetched by `getTabCustomerList()`. **Eliminates all N API calls.** Export becomes instant.

**Prerequisite:** Edit 2 must store per-customer `total_credit`/`total_debit` in the `customers` state. Update the customer mapping in `fetchCustomers`:

**Edit 2 addendum — add per-customer totals to customer objects:**
In the `rawList.map()` inside `fetchCustomers`, add:
```js
          totalCredit: parseFloat(String(c.total_credit ?? '0').replace(/,/g, '')) || 0,
          totalDebit: parseFloat(String(c.total_debit ?? '0').replace(/,/g, '')) || 0,
```

**Then replace the portfolio export inner loop (L278-301):**

**Current:**
```js
      const BATCH = 5;
      const enriched = [];
      let completed = 0;

      for (let i = 0; i < filteredCustomers.length; i += BATCH) {
        const batch = filteredCustomers.slice(i, i + BATCH);
        await Promise.allSettled(
          batch.map(async (c) => {
            try {
              const raw = await getTabCustomerRecords(c.id);
              const credits = (raw?.credits || []);
              const debits = (raw?.debits || []);
              const tc = raw?.meta?.totalCreditAmount || credits.reduce((s, cr) => s + (parseFloat(cr.credit_order_amount) || 0), 0);
              const tp = raw?.meta?.totalDebitAmount || debits.reduce((s, d) => s + (parseFloat(d.debit_order_amount) || 0), 0);
              enriched.push({ name: c.name, mobile: c.mobile, totalCredit: tc, totalPaid: tp, outstanding: tc - tp });
            } catch {
              enriched.push({ name: c.name, mobile: c.mobile, totalCredit: 0, totalPaid: 0, outstanding: c.balance || 0 });
            }
          })
        );
        completed += batch.length;
        writeProgressPage(win, { current: completed, total: filteredCustomers.length, customerName: 'Portfolio Summary' });
        await new Promise((r) => setTimeout(r, 0));
      }
```

**New:**
```js
      // CR-039 Option B: per-customer totals now available from list API — no N+1 calls needed.
      const enriched = filteredCustomers.map((c) => ({
        name: c.name,
        mobile: c.mobile,
        totalCredit: c.totalCredit || 0,
        totalPaid: c.totalDebit || 0,
        outstanding: (c.totalCredit || 0) - (c.totalDebit || 0),
      }));
```

**Impact:**
- Removes `BATCH`, `completed` variables, the entire `for` loop, all `getTabCustomerRecords` calls, all `Promise.allSettled` batching, and the progress page updates inside the loop.
- The `writeProgressPage` call before the loop (L276) can stay or be removed — the export is now synchronous (instant).
- The `getTabCustomerRecords` import at L19 stays — it's still used by `handleSelectCustomer` (L96-110) for the detail drawer. Only the portfolio export path changes.
- `writePortfolioStatement` call (L306) stays unchanged — it receives the same `enriched` array shape.

**Lines removed:** ~20
**Lines added:** ~5
**Net:** ~-15

---

## Related: CR-026 Backend Ask — NOW FULFILLED

CR-026 §3 raised: *"Credit Panel totals: `tap-waiter-list` must return `total_tap_credit_amount` + `total_tap_debit_amount` at top level (TOTAL CREDIT / TOTAL PAID cards show `—` today)."*

Backend shipped `restaurant-tap-summary` with slightly different field names (`total_credit`/`total_debit` instead of `total_tap_credit_amount`/`total_tap_debit_amount`). CR-039 wires it. **CR-026 §3 backend ask can be marked RESOLVED after CR-039 ships.**

---

## CR-043 (NEW — to register): Credit Totals in Reports

Backend now also ships **per-customer** `total_credit` / `total_debit` on each customer object in the list. This data was previously only available via the detail endpoint (`tap-customer-record-list`) per individual customer. New opportunities:

1. **Portfolio Summary export optimization** — currently makes N API calls to get per-customer totals; can now use list-level data (eliminates N calls for 41+ customers)
2. **Insights Dashboard** — could show Total Credit / Total Paid breakdown (not just Outstanding balance)
3. **Settlement Report** — could cross-reference credit settled vs credit outstanding

**Recommendation:** Register CR-043 for using per-customer `total_credit`/`total_debit` in reports + portfolio optimization. Scope TBD by owner.

---

## Execution Sequence

```
Step 1: Edit 1 (creditService.js — change return shape)         ~5 min
Step 2: Edit 2 (CreditManagementPanel.jsx — read new shape)     ~5 min
Step 3: Curl-probe verification on preprod                       ~5 min
Step 4: Visual verification (screenshot Credit Management KPI)   ~5 min
```

**Total implementation time: ~20 minutes**

---

## Test Plan

### Verification steps
1. **KPI tiles show values:** Open Credit Management → TOTAL CREDIT shows `₹83,765.54` (or current value), TOTAL PAID shows `₹44,812.49`, OUTSTANDING shows client-side sum.
2. **Tooltip updated:** Hover TOTAL CREDIT → shows "Lifetime total credit across all customers" (not "Awaiting backend...")
3. **Customer balances correct:** Verify individual customer balances display correctly (especially comma-formatted values like `₹3,000.00`)
4. **Empty state:** If a restaurant has no credit customers → all tiles show ₹0 (not dashes)
5. **Error state:** If API fails → error toast appears, tiles don't show (existing error handling)
6. **Portfolio export still works:** Click Portfolio Summary → export generates (still uses N+1 calls for now — optimization is future CR-043)
7. **Insights Dashboard unaffected:** Navigate to Insights → Dashboard → Credit Outstanding tile still shows correct value from its own API call

### Curl-probe (pre-implementation)
```bash
API_URL="https://preprod.mygenie.online"
TOKEN="<from login>"
curl -s -X POST "$API_URL/api/v1/vendoremployee/pos/tap-waiter-list" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{}' | python3 -c "
import sys,json
d=json.load(sys.stdin)
s=d.get('restaurant-tap-summary',{})
print(f'total_credit: {s.get(\"total_credit\")}')
print(f'total_debit: {s.get(\"total_debit\")}')
print(f'balance: {s.get(\"balance\")}')
print(f'customers: {len(d.get(\"employee-tap-list\",[]))}')
c=d.get('employee-tap-list',[])[0] if d.get('employee-tap-list') else {}
print(f'first customer keys: {list(c.keys())}')
"
```

---

## Risk Register

| # | Risk | Likelihood | Impact | Mitigation |
|---|------|-----------|--------|------------|
| R-1 | `getTabCustomerList()` return shape change breaks callers | LOW | MEDIUM | Only 1 caller uses the function (`CreditManagementPanel`). `insightsService` calls API directly. Both updated in this plan. |
| R-2 | Comma-formatted balance breaks existing `Number(c.balance)` | MEDIUM | MEDIUM | Hardened with `String(...).replace(/,/g, '')` in Edit 2. Previously worked by luck (small values had no commas). |
| R-3 | `restaurant-tap-summary` missing on older backend versions | LOW | LOW | Defensive `?? '0'` + `|| 0` defaults to 0 — tiles show ₹0 instead of `—`. No crash. |
| R-4 | Portfolio export breaks due to return shape change | ZERO | — | Portfolio calls `getTabCustomerRecords` (detail API per customer), not `getTabCustomerList`. Unaffected. |

---

*Phase 3 Implementation Plan — 2026-06-12. Ready for Gate 4 (Code Gate) approval.*
