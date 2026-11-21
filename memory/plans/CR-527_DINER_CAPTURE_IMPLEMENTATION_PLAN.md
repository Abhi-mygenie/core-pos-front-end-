# CR-527 (capture phase) — Implementation Plan (Gate 3)

**Item:** CR-527 (re-intake, capture phase) — diner capture in Collect-Payment credit flow + running-order display
**Role:** PLANNING (Gate 3 — Implementation Plan). **No application code changed in this session.**
**Date:** 2026-11-21
**Depends on:** `impact/CR-527_DINER_CAPTURE_IMPACT_ANALYSIS.md` (Gate 2)
**Backend contract:** `handover/CR-527_BUG-680_BACKEND_HANDOVER.md` (DONE, live-verified) — fields `diner_name` / `diner_mobile` (string|null)
**Risk:** HIGH (customer data + credit attribution; 3 R5 hotspot files). **Shared-file lock on `CollectPaymentPanel.jsx` + `orderTransform.js` + `OrderCard.jsx` — single session/PR.**

---

## 1. Decisions (locked)

| ID | Decision | Source |
|---|---|---|
| **OD-527-E** | **Option A (additive).** Keep the current payload mapping (`cust_*` = holder, TAB block `name/mobile/crm_customer_id` = holder). **Add `diner_name`/`diner_mobile` only.** Do NOT re-map holder→`cust_*`. | Owner 2026-11-21 |
| **OD-527-D** | Diner field value is sent **as-is**. **Blank → send `""`.** **Never echo the holder into the diner.** Diner == holder (or blank) → backend stores `null` → FE shows "—". Equality handled by backend (mobile match, or name match when no mobile). | Owner 2026-11-21 |
| **OD-527-D.1** | The **Diner field renders only once the holder fields are valid** (name present + valid phone). No orphan diner. | Owner (intake) |
| **Holder seed** | **UNCHANGED** — existing `tabName`/`tabPhone` seed from order customer (`CollectPaymentPanel.jsx:557-558`) stays (Option A = keep current mapping). Diner field defaults **empty**; cashier types a diner only when it differs from the holder. | Derived from OD-527-E |
| **OD-527-F** | Diner shown in **OrderDetailSheet** (always, when present) + a **compact conditional line on OrderCard** only when a distinct diner exists (hidden when "—"). | Planning default (owner may veto) |
| **OD-527-G** | **Socket NOT touched.** Diner surfaces via refetch/poll + on detail-sheet open (`get-single-order-new`). Real-time socket diner = future follow-up. | Planning default (owner may veto) |

---

## 2. Field placement (per backend A2/A3)

| FE builder | Endpoint | Diner placement |
|---|---|---|
| `placeOrderWithPayment` | PLACE_ORDER (`place-order`) | `diner_name`/`diner_mobile` in the built payload object (order `data`) |
| `collectBillExisting` | BILL_PAYMENT (`order-bill-payment`) | `diner_name`/`diner_mobile` top-level in the built payload |
| `fromAPI.order` (read) | `employee-orders-list` v1+v2, `get-single-order-new` | read `api.diner_name` / `api.diner_mobile` |

**Out of scope (NOT touched):** `place-order` plain builder (L1109) and `update-place-order` builder (L1245) — the diner is captured only at payment time, so these keep their omit=keep behaviour untouched (no diner sent → backend keeps existing). `socketHandlers.js` (OD-527-G). Backend. `creditTransform.js` / `CreditCustomerDetailSheet.jsx` (shipped — light up automatically). Discount/coupon/loyalty/wallet/tax/print/settlement. `CartPanel.jsx`, `DashboardPage.jsx`.

---

## 3. Edit-by-edit

### Edit 1 — `CollectPaymentPanel.jsx` : diner state + handlers
- **1a (near L557-558):** add state `const [dinerName, setDinerName] = useState("");` and `const [dinerPhone, setDinerPhone] = useState("");`. Do **not** seed from `customer` (starts empty).
- **1b (near L695-732):** add `handleDinerNameChange` / `handleDinerPhoneChange` (plain controlled setters; digit-strip phone like `handleTabPhoneChange`, max 10 for +91). No CRM search for diner (plain text, A4). Marker `// CR-527`.
- **Rationale:** diner is independent plain-text capture; no CRM typeahead (A4 — never links a CRM customer).

### Edit 2 — `CollectPaymentPanel.jsx` : Diner field UI (gated)
- **(inside the `isTabPayment && !showSplit` block, after the phone field L3410, before the validation hint L3412):** render a **"Diner (who ate)"** sub-block — `Diner Name` text input + `Diner Phone` (`PhoneInputField`, optional) — **wrapped in a gate**: `{tabName.trim() && tabPhoneValid && (<diner block/>)}` where `tabPhoneValid` mirrors the existing holder phone check (L3386). testids: `tab-diner-name-input`, `tab-diner-phone-input`, wrapper `tab-diner-section`. Helper caption: "Leave blank if the diner is the same as the credit customer."
- **Rationale:** OD-527-D.1 — diner only appears once holder valid.

### Edit 3 — `CollectPaymentPanel.jsx` : thread diner into paymentData
- **(L1295, beside `tabContact`):** add
  `dinerContact: isTabPayment ? { name: dinerName.trim(), phone: dinerPhone.trim() } : null, // CR-527`
- **Rationale:** parity channel with `tabContact`; keeps holder object untouched (Option A).

### Edit 4 — `orderTransform.js` : `placeOrderWithPayment` emit diner
- **4a (L1319 destructure):** add `dinerContact = null` to the `paymentData` destructure.
- **4b (inside the `...(isTab ? { ... } : {})` TAB block at L1514-1518):** add
  `diner_name: dinerContact?.name || '',`
  `diner_mobile: dinerContact?.phone || '',`
  (empty string when blank/no diner — OD-527-D; backend trims/ nulls; diner==holder → backend null).
- **Rationale:** PLACE_ORDER diner in order `data`. Only emitted on TAB (credit) orders, mirroring holder block.

### Edit 5 — `orderTransform.js` : `collectBillExisting` emit diner
- **5a (L1547 destructure):** add `dinerContact = null`.
- **5b (TAB block L1791-1793, beside `name`/`mobile`):** add
  `diner_name: dinerContact?.name || '',`
  `diner_mobile: dinerContact?.phone || '',`
- **Rationale:** BILL_PAYMENT diner top-level (the block at 1791 is top-level of the settle payload).

### Edit 6 — `orderTransform.js` : `fromAPI.order` read diner
- **(L218-221, in the Customer group):** add
  `diner: api.diner_name || null,`
  `dinerMobile: api.diner_mobile || null,`
- **Rationale:** surface diner for running-order display. `user_name`-derived `customer`/`customerName` unchanged (A3: holder).

### Edit 7 — `OrderDetailSheet.jsx` : show diner (Customer section)
- **(L690-709):** after the holder/customer + phone rows, render — only when `displayData.diner` present — a "Diner" row (`displayData.diner` + optional `dinerMobile`). Thread `diner`/`dinerMobile` through whatever maps `order → displayData` in this sheet (same group as `customer`/`customerContact`). testid `order-detail-diner`.
- **Rationale:** OD-527-F primary surface.

### Edit 8 — `OrderCard.jsx` : compact diner line (conditional)
- **(near the customer display L920-929):** render a small secondary line `Diner: {order.diner}` **only when** `order.diner && order.diner !== order.customerName` (hidden when same/`—`). testid `order-card-diner`.
- **Rationale:** OD-527-F — card stays clean; distinct diner visible at a glance.

### Edit 9 — Tests
- Extend `orderTransform` unit tests: (a) `placeOrderWithPayment`/`collectBillExisting` emit `diner_name`/`diner_mobile` from `dinerContact`, `''` when null; (b) `fromAPI.order` maps `diner_name`→`diner`. New file or append to existing `orderTransform.*.test.js`.
- `creditTransform.cr527.test.js` already green — no change.

---

## 4. Equality / empty logic (single rule)

FE sends the **raw diner field**, trimmed. No holder-echo, no client-side equality compare (backend owns the null-collapse, A2.57):
```
diner_name  = dinerContact?.name  || ''   // blank → '' → backend null
diner_mobile= dinerContact?.phone || ''
```
Result: blank diner → "—"; diner typed == holder → backend nulls → "—"; distinct diner → shows. Matches owner OD-527-D exactly.

---

## 5. Test Plan

**Unit (pre-push):** Edit 9 cases, `yarn test` for touched transforms green; webpack clean.

**Live write-probe (MANDATORY before merge — R11, preprod rest 69, `pms@macha.com`):** follow backend checklist Part A:
1. Place dine-in credit order: holder `cust_*` = Saurav, diner = Abhishek (distinct). Confirm `employee-orders-list` (Manager + Owner roles) + `get-single-order-new` return `diner_name`=Abhishek, `user_name`=Saurav.
2. Settle to credit → `tap-customer-record-list?customer_id=` shows diner on the row.
3. Diner blank, and diner == holder mobile → `diner_name` returns `null` → UI "—".
4. Running order card shows "Diner: Abhishek" only in case 1; detail sheet shows diner row.

**Browser QA (testing_agent, Gate 5):** CPP diner field gating (hidden until holder valid), capture, card + detail-sheet display, credit-sheet Diner column lights up. Account note: prior QA hit **401 on `owner@mealbreak.com`**; use `owner@cafe103.com` / `pms@macha.com`. Update `test_credentials.md`.

---

## 6. Rollback

All edits are additive and marker-tagged `// CR-527`. Rollback = revert the 4 files (CPP, orderTransform, OrderDetailSheet, OrderCard) + test. No schema/state migration; backend unchanged; no data written beyond the new optional fields (backend already live). Safe to ship behind normal PR revert.

---

## 7. Sequencing & Conflict

- **Shared-file lock:** `CollectPaymentPanel.jsx` (R5), `orderTransform.js` (R5), `OrderCard.jsx` (R5) — one IMPL session/PR. No open item currently on these files (BUG-660/BUG-595/CR-525 etc. all shipped). Edit sites are line-disjoint from shipped markers.
- **Coordinate with BUG-660** holder-seed/search logic (`CollectPaymentPanel.jsx:541-692`): our diner handlers (Edit 1b) must not reuse `tabPhoneWasUserTypedRef` / `tabIsCustomerSelected` (holder-only). Keep diner state fully separate.
- Order: Edits 1→3 (capture) → 4,5 (write) → 6 (read) → 7,8 (display) → 9 (tests) → live probe → QA.

---

## 8. Files

| File | Edits | Hotspot |
|---|---|---|
| `frontend/src/components/order-entry/CollectPaymentPanel.jsx` | 1,2,3 | R5 |
| `frontend/src/api/transforms/orderTransform.js` | 4,5,6 | R5 |
| `frontend/src/components/reports/OrderDetailSheet.jsx` | 7 | — |
| `frontend/src/components/cards/OrderCard.jsx` | 8 | R5 |
| `frontend/src/api/transforms/__tests__/orderTransform.*.test.js` | 9 | — |

---

## 9. Handover

```
Planning complete: CR-527 (capture phase) — Implementation Plan (Gate 3)
Decisions locked: OD-527-E=A (additive), OD-527-D (send raw diner, blank→'' , no holder echo),
                  OD-527-D.1 (gate behind holder), holder seed unchanged,
                  OD-527-F (detail sheet + conditional card line), OD-527-G (socket not touched)
Edits: 9 (CollectPaymentPanel x3, orderTransform x3, OrderDetailSheet x1, OrderCard x1, tests x1)
Field placement: place-order data + bill-payment top-level (diner_name/diner_mobile); read in fromAPI.order
Risk: HIGH — shared-file lock (CPP + orderTransform + OrderCard), single PR
Gate: GATE_3_PLAN_COMPLETE
Next: IMPL role (code the 9 edits) → live write-probe (Part A checklist) → testing_agent QA (Gate 5)
No app code changed this session.
```
