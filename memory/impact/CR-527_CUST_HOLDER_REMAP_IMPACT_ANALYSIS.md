# CR-527a — IMPACT ANALYSIS (Gate 2) — TAB holder → `cust_*` (Option B re-map)

**ID:** CR-527 (slice "a")  **Role:** PLANNING (Gate 2 — IA only, no code)  **Date:** 2026-11-24
**Severity/Priority:** P1  **Risk:** HIGH  **Area:** Payments / Credit  **Client:** ALL  **Assignee:** Abhishek
**Intake:** `change_requests/CR-527_CUST_HOLDER_REMAP_REINTAKE_INTAKE.md`

## Header — Code Reality + Conflict Pre-Check
- **Code Reality (deployed `main` `07b8f43`):** **NONE** for holder-first `cust_*` — main is **customer-first** (diner wins). Implemented **FULL** on branch `notification-fix` (`8c80bfe`).
- **Conflict pre-check (`FILE_OWNERSHIP.md`):** `orderTransform.js` recently touched by **CR-527** (capture phase — diner_* lines), **BUG-742** (`customItemFromAPI` L2336), **CR-552** (`fromAPI` foodStatus/isNotConfirmed), **BUG-683/BUG-664/BUG-665**. The CR-527a edit touches `cust_*` at **L1415–1421** (placeOrderWithPayment) and **L1793–1796** (collectBillExisting) — **line-disjoint** from all of the above.
  - **Interaction to note — BUG-672** (prepaid→credit, GATE_5A): BUG-672 authored the current L1415–1421 `customer || (isTab ? tabContact…)` fallback. CR-527a **overwrites that precedence** (holder-first). Must verify BUG-672's prepaid-TAB-move still works after the flip.

## 1. Problem & data-flow trace
On a Credit/TAB bill with an outer diner ≠ holder, deployed `main` writes the **diner** into `cust_*`; backend sets `orders.user_name`/`user_id` from `cust_*`; Order Report CUSTOMER + CRM sync read `user_name` → show the **diner**, not the holder.

```
CollectPaymentPanel: tabContact={holder koji}, dinerContact={diner mown}, customer={mown}
  → orderTransform.collectBillExisting  (postpaid Collect Bill → Credit)
       main L1793-1796:  cust_* = customer?.name||''            → DINER  ❌ (no tabContact fallback at all)
       main L1798-1800:  name/mobile/crm_customer_id = tabContact → HOLDER ✓
       main L1803-1806:  diner_* = dinerContact (omit when blank) → DINER  ✓
  → orderTransform.placeOrderWithPayment (prepaid place + Credit)
       main L1415-1421:  cust_* = customer || (isTab? tabContact) → DINER  ❌ (BUG-672 fallback only)
       main L1517-1524:  name/mobile/crm_customer_id = tabContact → HOLDER ✓ ; diner_* = dinerContact ✓
  → POST place-order / order-bill-payment
  → backend orders.user_name := cust_name (DINER)  → Report CUSTOMER = diner; CRM spend on diner
READ side (already correct): fromAPI.order reads user_name→customerName, diner_*→diner/dinerMobile.
```
**BREAK POINT:** WRITE precedence of `cust_*` in the two payment builders (and the backend sourcing `user_name` from `cust_name`).

## 2. Proposed fix on `notification-fix` (what Gate 3 would cherry-pick)
Make `cust_*` **holder-first when `isTab`** in both builders:
`cust_name: isTab ? (tabContact?.name || customer?.name || '') : (customer?.name || '')` (+ `cust_mobile`, `cust_country_code`, `cust_membership_id`). Non-TAB (cash/card/upi/paylater) unchanged. `+46` lines in `orderTransform.cr527.test.js` assert holder in `cust_*`, diner in `diner_*`.
- Files: `frontend/src/api/transforms/orderTransform.js` (2 spots), `__tests__/orderTransform.cr527.test.js`. Scope SMALL, separable.

## 3. CRITICAL context — this is a FE workaround for a BACKEND root cause
Prior branch investigation `INV-TAB-HOLDER-CREDIT-2026-11-22` (HIGH confidence FE, MEDIUM backend) found:
- FE **already** sends holder correctly in `name`/`mobile`/`crm_customer_id`; the real defect is **backend sets `user_name` from `cust_name`** and the **Order Report has no holder field** to read.
- Option B re-points `cust_*` to the holder so backend's `user_name` becomes the holder — a **workaround**, not the structural fix.

## 4. Downstream consumers / blast radius of the flip
- `cust_membership_id` moves from the **diner's** CRM id to the **holder's** (`tabContact.crmId`). → **the order's CRM customer / spend / loyalty attaches to the HOLDER.** In the captured payload, `cust_membership_id` was the diner's (mown's) membership; after the flip it becomes the holder's. This is the intended behavior but is a **real business/attribution change** — must be owner-confirmed.
- Printed bill / backend "customer" (driven by `user_name`) will show the holder; the diner remains visible via the existing diner chip/row (capture phase).
- **Edge:** if the holder is not CRM-linked (`tabContact.crmId` empty) the flip sends a blank `cust_membership_id` where previously the diner's id was sent. Confirm acceptable.
- **Credit-only (no outer customer):** on `main`, `collectBillExisting` has **no** tabContact fallback → `cust_*` was `''`; the flip fixes this to holder (secondary benefit).

## 5. Out of scope (do NOT bundle)
- **Issue 2** from the investigation — resettle/prepaid order appears as "credit" in Report but has no matching Credit-Management ledger row — is a **separate BACKEND bug** (orders-table vs tap-ledger sync). Not addressed by CR-527a; needs its own backend brief/intake.
- Backend structural fix (`user_name` from holder `name`, or report reads a holder field) — alternative to the FE workaround (see OD-527a-2).
- Cash/Card/UPI/PayLater `cust_*`; unpaid `place-order` (L1112) and update-place-order (L1248) — intentionally untouched.

## 6. Risk register
| Risk | Sev | Mitigation |
|---|---|---|
| CRM spend/loyalty re-attributed holder→ instead of diner on every credit bill | HIGH | Owner confirm OD-527a-1; live write-probe holder≠diner |
| BUG-672 prepaid-TAB-move regression (shared L1415-1421) | MED | Regress BUG-672 flow (prepaid move-to-credit) after flip |
| Holder not CRM-linked → blank `cust_membership_id` | MED | OD-527a-3 decision; verify tabContact.crmId populated in UI |
| Workaround masks backend bug; backend later "fixed" → double-flip | MED | Log as dependency; coordinate with backend brief |

## 7. Owner decisions (BLOCK Gate 3)
- **OD-527a-1:** Confirm `cust_*` = **holder** on TAB/credit (so Report CUSTOMER + CRM = holder, spend attaches to holder). [owner re-intake implies YES — confirm explicitly]
- **OD-527a-2:** Ship the **FE workaround now** (already built on `nf`) vs wait for / also file a **backend fix**? (Recommend: ship FE workaround + file backend brief for durability.)
- **OD-527a-3:** Holder-not-CRM-linked → blank `cust_membership_id` acceptable? (vs keep diner's id as fallback.)

## 8. Verification (to run at Gate 3 / pre-merge — not now)
- Live write-probe with `pms@macha` (now available) on preprod: place a credit order holder≠diner → verify request `cust_*`=holder, `diner_*`=diner, and `orders.user_name`/Report CUSTOMER/Credit Mgmt = holder. (No destructive write performed during IA.)
- Unit: `orderTransform.cr527.test.js` (nf +46) green; regress BUG-672 prepaid move.

**Gate status:** GATE_2_IA_COMPLETE. No Implementation Plan written (Gate 2 only). No app code changed.
**Next:** Owner resolves OD-527a-1/2/3 → PLANNING Gate 3 (Implementation Plan + Verification Matrix) → Gate-4 GO → cherry-pick.
