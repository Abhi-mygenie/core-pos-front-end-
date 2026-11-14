# BUG-660 — Implementation Plan (Gate 3)

**Item:** Collect Bill → Credit: prefilled customer shows duplicate CRM suggestions
**Date:** 2026-11-09 · **Role:** PLANNING (stage: Implementation Plan) · **Severity:** P0 (owner) · **Risk:** HIGH
**Code Reality:** NONE (re-verified — no `BUG-660` marker; target lines unchanged since Gate 2)
**Impact Analysis:** `impact/BUG-660_IMPACT_ANALYSIS.md` (CLOSED) · **Intake:** `change_requests/BUG-660_CPP_CREDIT_PREFILLED_CUSTOMER_DOUBLE_SUGGESTIONS_INTAKE.md`
**Owner decisions applied:** OD-660-01 YES (phone+cc CRM match = selected, keep prefilled name) · OD-660-02 YES (lookup failure → current behaviour) · OD-660-03 YES (any field edit re-enables search)
**Approach:** A+B (locked at Gate 2)

## 1. Scope Lock
- **WILL change:** `src/components/order-entry/CollectPaymentPanel.jsx` (R5 hotspot) — 6 edits, ~20 lines, TAB block state/effects/handlers only.
- **WILL NOT touch:** `orderTransform.js`, `OrderEntry.jsx`, `CartPanel.jsx`, `customerService.js`, `crmAxios.js`, sockets, contexts, any JSX markup/testids in the TAB block, payload builder L1229, validation L3339-3350, Pay-disable L3478, discount/loyalty/coupon/print code.
- No API, transform, localStorage, provider, env or financial-calculation change.

## 2. Exact Edits (all in CollectPaymentPanel.jsx)

### E1 — Seed selection + CRM id from enriched customer (Approach B) · L541-542
Current:
```js
  const [tabIsCustomerSelected, setTabIsCustomerSelected] = useState(false);
  const [tabCrmId, setTabCrmId] = useState(null); // BUG-183: CRM customer ID for TAB billing (reversed BUG-038 owner decision 2026-08-26)
```
New:
```js
  const tabSeedMatched = !!(customer?.id && customer?.phone); // BUG-660: prefilled customer already CRM-matched
  const [tabIsCustomerSelected, setTabIsCustomerSelected] = useState(tabSeedMatched); // BUG-660 (OD-660-01); edits still reset (OD-660-03)
  const [tabCrmId, setTabCrmId] = useState(tabSeedMatched ? customer.id : null); // BUG-183 + BUG-660
  const tabAutoSelectedPhoneRef = useRef(tabSeedMatched ? customer.phone : null); // BUG-660: auto-select once per phone
```
Note: the BUG-038 GAP-A comment block (L533-540) stays; GAP-A intent is preserved by E5/E6 (any edit resets).

### E2 — Stale-response guard, phone search effect · L566-575
Current:
```js
    if (tabPhone.trim() && tabPhone.length >= 3) {
      searchCustomers(tabPhone).then((filtered) => {
        setTabFilteredByPhone(filtered);
        setTabShowPhoneSuggestions(filtered.length > 0);
      });
    } else {
```
New:
```js
    if (tabPhone.trim() && tabPhone.length >= 3) {
      let cancelled = false; // BUG-660: drop results that resolve after selection/next keystroke
      searchCustomers(tabPhone).then((filtered) => {
        if (cancelled) return; // BUG-660
        setTabFilteredByPhone(filtered);
        setTabShowPhoneSuggestions(filtered.length > 0);
      });
      return () => { cancelled = true; }; // BUG-660
    } else {
```

### E3 — Lookup-found marks selected (Approach A) · L594-595
Current:
```js
          if (found?.id) {
            setTabCrmId(found.id);
```
New:
```js
          if (found?.id) {
            setTabCrmId(found.id);
            if (tabAutoSelectedPhoneRef.current !== tabPhone) { // BUG-660 OD-660-01: phone match = selected, keep typed name
              tabAutoSelectedPhoneRef.current = tabPhone;
              setTabIsCustomerSelected(true);
            }
```
Not-found → create path unchanged. `.catch(() => {})` unchanged → on CRM failure nothing is selected and search lists keep working (OD-660-02). BUG-636 timer/debounce/cleanup untouched.

### E4 — Stale-response guard, name search effect · L614-619
Same pattern as E2:
```js
    if (tabName.trim() && tabName.length >= 2) {
      let cancelled = false; // BUG-660
      searchCustomers(tabName).then((filtered) => {
        if (cancelled) return; // BUG-660
        setTabFilteredByName(filtered);
        setTabShowNameSuggestions(filtered.length > 0);
      });
      return () => { cancelled = true; }; // BUG-660
    } else {
```

### E5 — Dropdown pick records phone · `selectTabCustomer` L645-652
Add after `setTabCrmId(c.id || null); // BUG-183`:
```js
    tabAutoSelectedPhoneRef.current = c.phone; // BUG-660: no re-auto-select after later name edit
```

### E6 — Any edit resets selection (OD-660-03) · handlers L657-677
Current `handleTabNameChange` body after `setTabName(newName);`:
```js
    if (!newName.trim() && tabIsCustomerSelected) {
      setTabPhone("");
      setTabCrmId(null); // BUG-183
      setTabIsCustomerSelected(false);
    }
```
New:
```js
    if (tabIsCustomerSelected) { // BUG-660 OD-660-03: any edit re-enables search
      if (!newName.trim()) { setTabPhone(""); setTabCrmId(null); } // BUG-183 blank-out preserved
      setTabIsCustomerSelected(false);
    }
```
Current `handleTabPhoneChange` after `setTabPhone(newPhone);`:
```js
    if (!newPhone.trim() && tabIsCustomerSelected) {
      setTabName("");
      setTabCrmId(null); // BUG-183
      setTabIsCustomerSelected(false);
    }
```
New:
```js
    if (newPhone !== tabPhone) setTabCrmId(null); // BUG-660: crmId belongs to the old phone; lookup recaptures
    if (tabIsCustomerSelected) { // BUG-660 OD-660-03
      if (!newPhone.trim()) setTabName(""); // BUG-038 blank-out preserved
      setTabIsCustomerSelected(false);
    }
```

## 3. Behaviour After Fix
| Scenario | Result |
|---|---|
| Order customer already enriched (`customer.id`) → Credit | Selected at mount; no search, no dropdowns; crmId = customer.id |
| Not enriched yet, phone in CRM | Searches may start; lookup resolves → selected → cleanup cancels pending search results, dropdowns close; crmId set |
| Phone not in CRM | Not selected; create path creates profile (unchanged); suggestions behave as today |
| CRM down / timeout | Not selected; search returns [] (unchanged) |
| Cashier edits name after auto-select | Selection off, name search works; lookup does NOT re-select same phone (ref) |
| Cashier edits phone | crmId cleared, search works; new valid phone → lookup → auto-select if found |
| Cashier clears a field | Same blank-out as today (other field cleared) |

## 4. Execution Sequence
1. Entry verification: confirm L541-542, L566-575, L594-595, L614-619, L645-652, L657-677 match "Current" blocks.
2. Apply E1 → E6 in one pass (single file).
3. Compile check (webpack 0 new warnings; no new eslint-disable needed — effects already list deps).
4. Self-test per Verification Matrix.
5. Registry checklist.

## 5. Verification Matrix
| # | Edit | Change | How to Verify | Automated? |
|---|---|---|---|:---:|
| V1 | E1 | Seed from enriched customer | Order #021115 → Collect Bill → Credit: `tab-customer-name-suggestions` and `tab-customer-phone-suggestions` count = 0; name "prashant", phone 9535004327 prefilled | YES (Playwright) |
| V2 | E1/E3 | crmId in payload | Same flow, Pay (preprod, owner-approved test order only): collect-bill request body `crm_customer_id` = f917cc7a-4713-44e8-9ddd-24efa238f326 | NO (Network tab) |
| V3 | E3 | Late enrichment fallback | Open Collect Bill immediately on reload (before enrichment); after lookup resolves both dropdowns closed | YES (Playwright w/ wait) |
| V4 | E2/E4 | Stale guard | Type phone fast then pick suggestion → no dropdown re-opens after pick | YES |
| V5 | E6 | Name edit re-enables search | After V1, append/remove a char in name → name suggestions appear; phone dropdown stays closed; no auto re-select | YES |
| V6 | E6 | Phone edit clears crmId | Change last digit → crmId null; restore → lookup re-selects | NO (React devtools / payload) |
| V7 | E6 | Blank-out parity | Clear name → phone cleared; clear phone → name cleared | YES |
| V8 | E3 | Not-in-CRM create path | New 10-digit number + name → no auto-select; CRM create fired (Network `POST /pos/customers`) | NO |
| V9 | E3 | CRM failure (OD-660-02) | Block crm.mygenie.online → no crash, form usable, Pay enabled with valid name/phone | NO |
| V10 | E3 | Intl (+971) BUG-636 | 600 ms debounce single lookup; auto-select on match | NO |
| V11 | — | Non-TAB methods | Cash/UPI/Card: no CRM calls from TAB effects | YES |
| V12 | — | Regression guard | `src/tests/cr385/hideSectionRows.cr385.test.js` passes (testid unchanged) | YES (jest) |

## 6. Risk Register
| # | Risk | Mitigation | Verified by |
|---|---|---|---|
| R1 | BUG-038 GAP-A regression (can't bill different customer) | E6 any edit resets | V5, V7 |
| R2 | Async race re-opens dropdowns | E2/E4 cancel flag via effect cleanup | V3, V4 |
| R3 | Wrong customer linked | Match on exact phone (+cc) only; name kept | V1, V6 |
| R4 | BUG-636 debounce broken | E3 edits only `.then` body | V10 |
| R5 | crmId missing → Daily Report Credit tab (BUG-183) | Seed + lookup capture | V2 |
| R6 | Seed stale if `customer` prop changes while panel open | Accepted: lookup effect still runs when not seeded; panel remounts per Collect Bill open | V3 |

## 7. Post-Code Registry Checklist (Implementation agent MUST do)
- [ ] `registry.json`: BUG-660 → status `GATE_5A_IMPLEMENTED`, gate/current_gate updated, `files` confirmed
- [ ] `BUG_TRACKER.md`: BUG-660 row updated (edits E1-E6 + lines)
- [ ] `FILE_OWNERSHIP.md`: add row for `CollectPaymentPanel.jsx` — BUG-660 E1-E6 lines
- [ ] Code markers: `// BUG-660` on every changed line group (E1-E6)
- [ ] QA handover: `handover/QA_HANDOVER_BUG660_<date>.md` seeded from §5

## 8. Owner Gate
Gate 4 GO required (P0 / HIGH risk / R5 hotspot). Fast Lane: NOT eligible.
