# CR-527 (capture phase) — Impact Analysis (Gate 2)

**Item:** CR-527 (re-intake, capture phase) — diner capture in Collect-Payment credit flow + running-order display
**Role:** PLANNING (Gate 2 — Impact Analysis ONLY; no Implementation Plan this session)
**Date:** 2026-11-21
**Intake:** `change_requests/CR-527_DINER_CAPTURE_REINTAKE_INTAKE.md`
**Risk:** **HIGH** (customer data + credit attribution, financial area; 3 R5 hotspot files)
**Code Reality:** **PARTIAL** — credit-row display shipped (E1-E3, GATE_5A, QA_PASS 2026-11-20); capture + payload threading + running-order display NOT started.

---

## 0. Code Reality Check

| Sub-scope | State | Evidence |
|---|---|---|
| Credit-row Diner column + filter | **DONE** | `creditTransform.js:107-108` (`dinerName`/`dinerMobile`), `CreditCustomerDetailSheet.jsx` |
| Diner **capture** in CollectPaymentPanel | **NONE** | `CollectPaymentPanel.jsx:3335-3424` captures a single identity (`tabName`/`tabPhone` = holder); no diner field |
| Diner on **write payloads** | **NONE** | `orderTransform.js` emits no `diner_name`/`diner_mobile` key on any builder |
| Diner on **running-order read/display** | **NONE** | `orderTransform.js:179-221` reads `user_name` only, never `diner_name`; `OrderCard.jsx`/`OrderDetailSheet.jsx` show holder only |

---

## 1. Conflict Pre-Check (FILE_OWNERSHIP + registry)

| Target file | R5 hotspot | Recent modifiers (shipped) | Overlap risk | Action |
|---|---|---|---|---|
| `CollectPaymentPanel.jsx` | **YES** | BUG-660 (L541-692 tab seed/search), BUG-595 (L366), BUG-538/CR-412/CR-413, BUG-665 | **Tab-identity logic (L541-692) is where the holder seed lives — our diner field + "stop seeding holder from order customer" edits sit right beside it.** No *open* item on this file in registry. | Single session/PR; coordinate diner field with BUG-660's `tabName` seed + `tabPhoneWasUserTypedRef` guard |
| `orderTransform.js` | **YES** | BUG-742 (L2336), CR-552 (foodStatus), BUG-536/556 (L2011/2225), CR-409 (L447) | Payload blocks are line-disjoint from our edit sites (L218, L1109, L1245, L1412, L1514, L1786) | Line-disjoint; safe |
| `OrderCard.jsx` | **YES** | CR-525 (L123/465/1061/1241), BUG-573 (L699-715), CR-430/BUG-576+ | Diner render near customer block (L920-929) — disjoint | Line-disjoint; safe |
| `OrderDetailSheet.jsx` | no | — | Customer section L690-709 | safe |

**No currently-open (status ≠ CLOSED) item touches these files.** All listed modifiers are shipped. Shared-file lock recommended on `CollectPaymentPanel.jsx`.

---

## 2. Data-Flow Trace

### 2A. WRITE path (capture) — where the diner must be sent
```
CollectPaymentPanel "Credit Customer Details" (L3335-3424)
  → captures ONE identity: tabName/tabPhone  (= HOLDER)
     seeded from customer?.name/phone (L557-558)   ← default-equality seed
  → tabContact built (L1295) = {name:tabName, phone:tabPhone, crmId, countryCode}
     passed up via onCollect paymentData.tabContact
OrderEntry.jsx
  → placeOrderWithPayment(...) (L1749 / L2529)   — fresh credit order
  → collectBillExisting(...)   (L1909 / L2642)   — settle placed order to credit
orderTransform.js payload builders
  → placeOrderWithPayment (L1317):
       cust_name = customer?.name || (isTab ? tabContact?.name) (L1412)   ← CONFLATION
       TAB block name/mobile/crm_customer_id = tabContact (holder) (L1515-1517)
  → collectBillExisting (L1540):
       cust_name/cust_mobile = customer (order-linked) (L1786-1787)
       TAB block name/mobile/crm_customer_id = tabContact (holder) (L1791-1793)
  → place-order (L1109) / update-place-order (L1245): cust_name = customer?.name
BREAK POINT (capture): no field carries a DINER distinct from holder; no `diner_name`/`diner_mobile` key emitted on any builder.
```

### 2B. READ path (running-order display) — where the diner must surface
```
API: GET employee-orders-list (v1+v2), POST get-single-order-new
     → rows carry diner_name / diner_mobile (backend A3, live-verified)
orderTransform.fromAPI.order (L176-222):
     customer = api.user_name (L179); customerName = customer (L220); phone = user.phone (L221)
     ← NO diner_name / diner_mobile read                              ← BREAK POINT (read)
OrderCard.jsx: shows order.customer / order.customerName (L379-389, L929) — holder only
OrderDetailSheet.jsx: displayData.customer (L699) + customerContact.phone (L705-709) — holder only
```

### 2C. Backend contract (DONE, verified) — the field semantics
Per `handover/CR-527_BUG-680_BACKEND_HANDOVER.md` A1-A4:
- `cust_name` / `cust_mobile` = **HOLDER / customer** (`cust_mobile` **creates/links a CRM customer**; on TAB identifies the credit holder).
- `diner_name` / `diner_mobile` = **DINER**, plain text, **never** CRM-linked. Accepted on place-order (in `data`), update-place-order (top-level, omit=keep / `""`|`null`=clear), order-bill-payment, and credit-insert. Snapshot fallback = diner saved on the order, else `null`. **Diner == holder → backend stores `null` → FE shows "—".** No backfill.

---

## 3. THE CRUX — Owner + Backend decision (OD-527-E, must resolve before Gate 3)

The current FE credit mapping is **inverted vs the new contract**:
- Today FE puts the **holder** (tabContact) in `name`/`mobile`/`crm_customer_id`, and the **order customer** in `cust_name`/`cust_mobile`.
- Backend A1 now defines `cust_name`/`cust_mobile` as the **holder** (and `cust_mobile` is what links CRM).

**Two implementation strategies:**

| Option | What | Risk | Note |
|---|---|---|---|
| **A — Additive (RECOMMENDED)** | Leave existing `cust_*` + `name/mobile` TAB blocks untouched. Add ONLY new `diner_name`/`diner_mobile` keys, sourced from the new Diner field (or holder when empty, per OD-527-D). | Lower | Needs backend to confirm it still reads the credit **holder** from the existing `name`/`mobile` TAB block (BUG-183/252) and that adding `diner_*` doesn't collide with its order-snapshot fallback. |
| **B — Re-map to contract** | Move holder → `cust_name`/`cust_mobile`, diner → `diner_*`, deprecate the `name`/`mobile` TAB block. | **HIGH** | Touches CRM-link behaviour, BUG-183 credit-holder identification, `user_name` display, and multiple shipped bug fixes. Not advised inside this CR. |

➡ **Decision needed from owner + Gyan:** confirm Option A is contract-correct (holder stays in `name`/`mobile`, diner added as `diner_*`). Gate 3 must **curl a live credit write** with a holder ≠ diner and read it back on `employee-orders-list` + `tap-customer-record-list` before locking edits. (R11 read-probe this session returned an `errors` envelope on a bare GET — the FE supplies params the raw curl lacks; read schema already live-verified in `INV-CR527_BUG680_BACKEND_VERIFICATION_2026-11-21.md`.)

---

## 4. Affected Files & Edit Sites (scope — exact edits deferred to Gate 3)

**WILL change:**
1. `frontend/src/components/order-entry/CollectPaymentPanel.jsx` — add **Diner (who ate)** field (name + optional phone) in the Credit Customer Details section (L3335-3424), **gated to render only when holder fields are filled** (OD-527-D.1); new diner state; stop seeding the holder field from the order customer (L557-558) — seed the **diner** instead; empty-diner → fill diner from holder on submit (OD-527-D.2); thread diner into `tabContact`/`onCollect` (L1295). **R5 hotspot.**
2. `frontend/src/api/transforms/orderTransform.js` — emit `diner_name`/`diner_mobile` on `placeOrderWithPayment` (L1317/1514 block), `collectBillExisting` (L1540/1791 block), `place-order` (L1109), `update-place-order` (L1245, omit=keep / `""`=clear); add `diner`/`dinerMobile` **read** in `fromAPI.order` (L218-221). **R5 hotspot.**
3. `frontend/src/components/cards/OrderCard.jsx` — render diner (distinct from holder) on the running-order card (near L920-929). **R5 hotspot.** *(subject to OD-527-F)*
4. `frontend/src/components/reports/OrderDetailSheet.jsx` — show diner in the Customer section (L690-709).
5. Tests: extend `orderTransform` + a CPP capture test; `creditTransform.cr527.test.js` already green.

**WILL NOT touch:** backend; `creditTransform.js` / `CreditCustomerDetailSheet.jsx` (already shipped — light up automatically); discount/coupon/loyalty/wallet/tax/print/settlement logic; `CartPanel.jsx`; `DashboardPage.jsx`. `socketHandlers.js` only if OD-527-G requires it (see §6).

---

## 5. Downstream Consumers

- Credit detail sheet Diner column + filter (shipped) — lights up for distinct diners.
- Running-order list (`OrderCard`) + detail (`OrderDetailSheet`) — new display.
- Credit ledger `tap-customer-record-list` (already returns diner per A3).
- `CreditManagementPanel.jsx` — verify no regression in holder display.

---

## 6. Additional Owner / Backend Decisions

- **OD-527-E (crux, §3):** payload strategy A (additive, recommended) vs B (re-map). **Blocks Gate 3.**
- **OD-527-D (locked at intake):** diner gated behind holder; empty diner → send holder as diner → displays "—" via backend null-collapse. Confirm this "—" is the desired display when diner == holder (vs printing the holder's name).
- **OD-527-F:** show diner on the running-order **card face**, or only in the **detail sheet**? (card space is tight).
- **OD-527-G:** does the **socket**-pushed running-order payload carry `diner_name`? `socketHandlers.js` has no diner mapping today — if the socket omits it, diner appears only after a refetch/poll. Gate 3 to probe; may add a socket-side read (otherwise `socketHandlers.js` stays untouched).

---

## 7. Risk Register

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Wrong payload field → diner becomes holder / spurious CRM contact | Med | **HIGH** (customer data) | Resolve OD-527-E; Gate 3 live write-probe before locking |
| Holder seed removal (L557-558) breaks BUG-660 search/auto-select | Med | Med | Coordinate with BUG-660 logic (L541-692); regression the TAB CRM typeahead |
| Diner not on socket payload → stale display | Med | Low | OD-527-G probe; accept refetch-only if backend omits |
| Hotspot triple-file change (CPP + orderTransform + OrderCard) | — | Med | Shared-file lock, single PR, line-disjoint edits, full regression |

---

## 8. Handover

```
Planning complete: CR-527 (capture phase)
Stage: Impact Analysis (Gate 2) ONLY — Implementation Plan NOT written (owner scope)
Code reality: PARTIAL (display shipped; capture/write/running-order-display remaining)
Risk: HIGH — no planning-skip
Files WILL change: CollectPaymentPanel.jsx, orderTransform.js, OrderCard.jsx, OrderDetailSheet.jsx (+tests)
Files WILL NOT touch: backend, creditTransform/CreditCustomerDetailSheet, discount/coupon/print/tax, CartPanel, DashboardPage
Owner decisions needed: OD-527-E (payload strategy A vs B — BLOCKS Gate 3), OD-527-D confirm, OD-527-F (card vs sheet), OD-527-G (socket diner)
Next: owner resolves OD-527-E/F/G → PLANNING Gate 3 (Implementation Plan) with live write-probe
```
