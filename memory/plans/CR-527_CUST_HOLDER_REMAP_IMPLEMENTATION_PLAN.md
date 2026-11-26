# CR-527a — IMPLEMENTATION PLAN v2 (Gate 3, redo) — TAB holder → `cust_*` + CRM-create holder

**ID:** CR-527 (slice "a")  **Role:** PLANNING (Gate 3 — plan only, NO code)  **Date:** 2026-11-24 (v2 supersedes v1)
**Risk:** HIGH  **Client:** ALL  **Assignee:** Abhishek
**IA:** `impact/CR-527_CUST_HOLDER_REMAP_IMPACT_ANALYSIS.md`
**ODs locked:** OD-527a-1 YES (cust_*=holder) · OD-527a-2 ship FE only · OD-527a-3 membership never = diner
**NEW question this redo answers (owner):** *"Can't we create that holder in CRM (`/pos/customers`) as order entry does, instead of sending blank?"* → **Yes — that mechanism already exists; v2 makes it reliable at submit.**

## Finding that drove the redo
`CollectPaymentPanel` already runs the **same CRM lookup-or-create as order entry** for the TAB holder:
- Effect L634–666: when holder phone is valid, `lookupCustomer(tabPhone)` → if found `setTabCrmId(found.id)`; else `createCustomer({name,phone,cc}, restaurant.id)` → `setTabCrmId(created.id)`.
- It is **debounced + fire-and-forget** ("Never blocks bill confirmation", `.catch(()=>{})`). Same pattern as order-entry's customer (CartPanel L1105/1123).
- `tabCrmId` → `tabContact.crmId` at submit (L1317), consumed by `handlePayment` (async, L1296 builds paymentData → L1388 `onPaymentComplete`).

So the holder **is** created in CRM; `cust_membership_id` is only blank in the **residual race/failure window** (cashier submits before the async create resolves, or CRM errored). v2 closes that window by resolving the holder id **at submit** — exactly "create like order entry", just awaited.

---

## Part A — `orderTransform.js` (cherry-pick from `notification-fix`, with OD-527a-3 deviation)

### Edit 1 — `placeOrderWithPayment`, main L1414–1421
Replace the BUG-672 customer-first block with holder-first; `cust_membership_id` blank-not-diner:
```js
      // CR-527a (OD-527a-1): TAB → cust_* = tab holder; diner stays in diner_*. Supersedes BUG-672 customer-first fallback.
      cust_name:                  isTab ? (tabContact?.name || customer?.name || '') : (customer?.name || ''),
      cust_mobile:                isTab ? (tabContact?.phone || customer?.phone || '') : (customer?.phone || ''),
      cust_country_code:          isTab ? (tabContact?.countryCode || customer?.countryCode || '+91') : (customer?.countryCode || '+91'), // CR-479
      cust_email:                 customer?.email || '',
      cust_dob:                   customer?.dob || '',
      cust_anniversary:           customer?.anniversary || '',
      // CR-527a (OD-527a-3): holder not CRM-linked → BLANK; never fall back to diner id.
      cust_membership_id:         isTab ? (tabContact?.crmId || '') : (customer?.id || ''),
```

### Edit 2 — `collectBillExisting`, main L1793–1796
```js
      // CR-527a (OD-527a-1): TAB → cust_* = tab holder; diner stays in diner_*.
      cust_name:          isTab ? (tabContact?.name || customer?.name || '') : (customer?.name || ''),
      cust_mobile:        isTab ? (tabContact?.phone || customer?.phone || '') : (customer?.phone || ''),
      cust_country_code:  isTab ? (tabContact?.countryCode || customer?.countryCode || '+91') : (customer?.countryCode || '+91'), // CR-479
      // CR-527a (OD-527a-3): holder not CRM-linked → BLANK; never fall back to diner id.
      cust_membership_id: isTab ? (tabContact?.crmId || '') : (customer?.id || ''),
```
> **Deviation from `nf`:** nf uses `tabContact?.crmId || customer?.id || ''` — drops the `|| customer?.id`.

---

## Part B — `CollectPaymentPanel.jsx` ensure-holder-CRM-id at submit  ⚠ NET-NEW (NOT on `notification-fix`)

In `handlePayment` (async, L~1266), **before** building `paymentData` (L1296), add a bounded resolve so `tabContact.crmId` is the holder's real CRM id:

```js
// CR-527a: guarantee the TAB holder exists in CRM (parity with order-entry customer create),
// so cust_membership_id carries the HOLDER id, not blank. Never hard-blocks the bill.
let resolvedTabCrmId = tabCrmId;
if (isTabPayment && !resolvedTabCrmId && tabName.trim() && isValidTabPhone) {
  try {
    const found = await lookupCustomer(tabPhone, tabCountryCode);
    if (found?.id) resolvedTabCrmId = found.id;
    else {
      const created = await createCustomer({ name: tabName.trim(), phone: tabPhone, countryCode: tabCountryCode }, restaurant?.id);
      if (created?.id) resolvedTabCrmId = created.id;
    }
  } catch (e) {
    // CRM_TIMEOUT / failure → proceed with BLANK membership (OD-527a-3). NEVER diner. Non-blocking toast.
    toast?.({ title: 'Credit saved', description: 'Holder not linked to CRM (offline) — you can link later.', });
  }
}
```
Then at L1317 build: `tabContact: isTabPayment ? { name: tabName, phone: tabPhone, crmId: resolvedTabCrmId || '', countryCode: tabCountryCode } : null`.

**Design guards:**
- Reuse existing `lookupCustomer`/`createCustomer` (already imported L11). **No refactor / no shared helper.**
- Bounded by the existing `crmApi` axios timeout; on timeout/error → blank + continue (preserves the current "never block bill confirmation" rule).
- Only runs when `isTabPayment && !tabCrmId` — the common selected/already-resolved path is untouched (zero added latency).
- `isValidTabPhone` = same rule as L640 (`+91` ⇒ len 10, else ≥6).

---

## Part C — tests (`orderTransform.cr527.test.js`)
1. Cherry-pick nf +46 (holder-in-`cust_*` for placeOrder + collectBill; crmId on existing tests).
2. **ADD** edge: TAB + `tabContact.crmId` absent + `customer.id` present → `cust_membership_id === ''` (both builders).
3. (Optional) light test/manual note for Part B resolve (lookup-or-create at submit) — covered by Verify #6 browser probe.

---

## Verification Matrix
| # | Scope | Verify | Auto |
|---|------|--------|:--:|
| 1 | orderTransform placeOrder | holder-first cust_*; membership blank-not-diner | YES (unit) |
| 2 | orderTransform collectBill | holder-first cust_*; membership blank-not-diner | YES (unit) |
| 3 | non-TAB | cash/card/upi cust_* = customer; no diner fields | YES (unit) |
| 4 | Part B resolve | isTab + no crmId + holder name/phone → lookup→create → tabContact.crmId set | NO (browser, `pms@macha`) |
| 5 | Part B failure | CRM offline → bill still completes, membership blank, non-blocking toast | NO |
| 6 | live write-probe | holder≠diner credit order → request cust_*=holder, diner_*=diner → Report CUSTOMER + Credit Mgmt = holder | NO |
| 7 | BUG-672 regress | prepaid move-to-credit still captures holder in cust_* | NO |

## Post-Code Registry Checklist
- [ ] registry.json CR-527 → CR-527a IMPLEMENTED (GATE_5A); keep capture-phase history
- [ ] CR_REGISTRY.md row updated
- [ ] FILE_OWNERSHIP.md += `orderTransform.js` (cust_* holder) **and** `CollectPaymentPanel.jsx` (Part B ensure-holder)
- [ ] `// CR-527a` markers in all 3 edited spots
- [ ] webpack 0 new warnings; `cr527` unit green

## Risk register & rollback
- **HIGH** — re-attributes CRM spend to holder (OD-527a-1, approved). Verify #6.
- **Part B adds an awaited CRM call to the credit-submit path** (only when holder id missing). Mitigated by timeout→blank fallback so it never hard-blocks. New surface not on `nf` → needs its own browser QA (#4/#5).
- Shared-line with BUG-672 (Edit 1) → Verify #7.
- **Rollback:** Part A = revert 2 hunks in `orderTransform.js`; Part B = remove the resolve block in `handlePayment` + restore `crmId: tabCrmId` at L1317. Self-contained.

## Open owner decision (BLOCKS Gate-4 for Part B only)
- **OD-527a-4:** Approve **Part B await-at-submit** (guarantees holder CRM id; may add up to the CRM timeout before Collect/Place completes when the holder was typed and not yet resolved; falls back to blank on failure)? 
  - **Recommended: YES** — directly implements "create the holder like order entry". 
  - Alternative: ship **Part A only** (membership blank in the rare race window; holder still auto-created async by the existing effect) — smaller, no submit-path change.

**Gate status:** GATE_3_PLAN_COMPLETE (v2). No code written (PLANNING role).
**Next:** Owner picks OD-527a-4 (Part A only, or Part A+B) + **Gate-4 GO** → IMPLEMENTATION.
