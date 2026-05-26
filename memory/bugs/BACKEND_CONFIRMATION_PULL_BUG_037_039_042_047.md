# Backend Confirmation Pull — BUG-037, BUG-039, BUG-042, BUG-047

| Field | Value |
| --- | --- |
| Sprint | `pos_final_1.0` |
| Bugs Covered | **BUG-037, BUG-039, BUG-042, BUG-047** |
| Task Type | Owner-facing backend-confirmation pull (no implementation) |
| Pull Date / Time (UTC) | 2026-05-12 |
| Repo / Branch | `core-pos-front-end-` / `12-may-bugs` (HEAD `430dfb8`) |
| Code Changed In This Task | **NONE** |
| `/app/memory/final/` Updated | **NO** |
| `BUG_TEMPLATE.md` Updated | **NO** |

---

## Executive Summary

| Bug | One-line description | Type | Backend-only? | Blocker |
| --- | --- | --- | --- | --- |
| **BUG-037** | Scan & Order Accept fails when restaurant's default order config is set to "Delivered" | FE mapping gap + API contract | No (FE needs the mapping entry) | One backend question (numeric code + literal) |
| **BUG-039** | Audit Report shows the delivery charge under the Tax column | FE missing column + possibly backend composite-tax issue | Maybe — depends on backend response | One audit API response sample |
| **BUG-042** | UPI payment fails on a Hold order (other methods work) | API contract / payment flow | Possibly — needs network trace | One failing-call network trace |
| **BUG-047** | New-order notification shows "18 March" instead of the actual outlet name (e.g., "Mayur's Kitchen") | Backend FCM composition | **Likely yes — no FE change possible** | One FCM payload sample + outlet-name confirmation |

**Of the four:**
- **3 are blocked on a single backend response sample / network trace each.** (BUG-037, BUG-039, BUG-042.)
- **1 is almost certainly backend-only (BUG-047)** — the FE renders the FCM message text verbatim, so the wrong outlet name cannot originate on the FE.
- **None of them are blocked on a design decision** by you — every question below is a factual yes/no or data-sample request.

**Net status: 4 backend asks, ready to send.** I have drafted a single concise backend message at the end of this document grouped by bug.

---

## BUG-037 — "Delivered" default config breaks Scan & Order Accept

### Plain-English issue
You have a setting on the restaurant that controls what an incoming Scan & Order should be marked as when the cashier clicks **Accept**. When that setting is configured as **"Delivered"**, clicking Accept on a scan order does nothing visible — the Yet-To-Confirm tile stays put, the order doesn't progress.

For other values of the same setting (e.g., "Placed", "Preparing"), Accept works correctly.

### Suspected owner / user impact
- Affects: every restaurant whose default order config is "Delivered" (typically delivery-only outlets that want incoming scan orders to land already in delivered state).
- Symptom: Accept button silently no-ops; cashier must manually progress the order or refresh.
- Likely related to BUG-011 (older delivery-scan-confirm HTTP 500). Same family.

### Why backend confirmation is needed
The frontend's status-code mapping table (`F_ORDER_STATUS_API` in `frontend/src/api/constants.js`) **does not contain a `"delivered"` entry**. When backend sends the "delivered" numeric code, the frontend maps it to `null`, and the subsequent Accept HTTP call defaults to sending `order_status: 'paid'` — which the backend likely rejects with the same HTTP 500 BadMethodCallException as BUG-011.

To fix this on the frontend we need to know **two things from backend**:
1. **The numeric `def_ord_status` value backend uses for "delivered"** (so we can add the missing row to our mapping table).
2. **The string literal backend expects in the `order_status` field of the confirm payload** for a delivery-typed Scan & Order Accept (the value we should send to make it succeed).

### Exact backend ask
> _"For the restaurant default order config value 'Delivered':_
> _(a) what numeric value does the profile API return in `def_ord_status` for this configuration?_
> _(b) what string value does the `waiter-dinein-order-status-update` (CONFIRM_ORDER) endpoint expect in the `order_status` field of the PUT payload, in order to successfully transition a Scan & Order from yet-to-confirm to the delivered state?_
> _(c) is BUG-011 (delivery-scan-confirm HTTP 500 BadMethodCallException) the same backend root cause as this, or distinct?"_

### Sample / data required
Optionally a single failing-call network trace would be useful but is not strictly necessary if backend can answer (a) and (b) directly.

### What FE can do after confirmation
- Add a `"delivered"` entry to `F_ORDER_STATUS_API` keyed on the numeric value backend returns.
- Verify the `confirmOrder` service call sends the correct `order_status` literal end-to-end.
- Implementation footprint expected: **2 files, ~5 lines** (constants table + a small fallback guard in `orderService.confirmOrder` so we never accidentally send `'paid'` for an unknown default).

### What would make this backend-only
If backend confirms it's the same as BUG-011 and the fix is **on backend** (allow the YTC → delivered transition that's currently failing with 500), then the FE may not need a mapping change at all — depends on whether backend chooses to fix on its side or expose a new literal we should send.

### Current verdict
**FE-ready after confirmation.** Two-line backend response unblocks ~5-line FE change.

---

## BUG-039 — Audit Report shows Delivery Charge under the Tax column

### Plain-English issue
On the Audit Report's detail view for a delivery order, the **delivery charge value is appearing under the Tax column** instead of being shown as its own separate value. Result: the Tax figure is inflated by the delivery charge amount, and there's no separate "Delivery Charge" cell on the audit row.

### Suspected owner / user impact
- Affects: every delivery order in the audit detail view.
- Symptom: tax numbers look too high; delivery charges effectively hidden in a tax bucket; auditor cannot reconcile.
- Spillover: same audit row feeds CSV / PDF exports (BUG-040 / BUG-041). Fixing this row shape benefits all three reports.

### Why backend confirmation is needed
Two things could be happening, and we cannot tell from frontend code alone which one (or both):

1. **Frontend gap (confirmed by code review):** the audit row builder does **not** include a separate `delivery_charge` field on the row. So even if the backend ships it, we never display it.
2. **Backend composite issue (possible, needs confirmation):** per CR-013 (the approved delivery-GST encoding), the backend's `gst_tax` field is allowed to contain the **GST on delivery** (`deliveryCharge × delTaxRate`) — that part is by design and acceptable. **But** if backend additionally folds the **principal delivery charge amount itself** into `gst_tax` (not just its GST), then even after we add the missing column, the Tax cell would still be inflated.

To know how to fix it, we need to see one audit API response for a known-good delivery order.

### Exact backend ask
> _"Please share **one audit-API response** (`getOrderLogsReport` / audit list endpoint) for a known delivery order with `delivery_charge > 0`. Specifically we need to see, for that one order row, the values of:_
> _- `delivery_charge`_
> _- `gst_tax`_
> _- `vat_tax`_
> _- `service_tax`_
> _- `final_total` / `payment_amount`_
>
> _So we can confirm whether the principal delivery-charge value is included inside `gst_tax`, or only the GST-on-delivery component (`deliveryCharge × delTaxRate`) as per CR-013 D-GST-3."_

### Sample / data required
**One audit-API response JSON for one delivery order** (anonymised customer info is fine). Just the row, nothing else.

### What FE can do after confirmation

**Scenario A (gst_tax is composite, only GST on delivery — backend correct):**
- Pure FE fix: add a `deliveryCharge` field to the audit row, render it as a new column in the on-screen audit table and add it to CSV/PDF exports. Tax column stays as is.
- Estimated footprint: **2 files, ~20 lines** (`reportService.js` row builder + `OrderTable.jsx` / `OrderDetailSheet.jsx` column).

**Scenario B (gst_tax has principal delivery folded in — backend defect):**
- Backend must subtract the principal delivery amount from `gst_tax` before serving the audit row, OR
- FE must subtract `delivery_charge` from `gst_tax` when rendering the Tax cell on delivery rows.
- The FE-side subtraction is technically possible but risks under-counting tax if backend's encoding ever changes again. Backend fix is cleaner.

### What would make this backend-only
If Scenario B is confirmed and backend agrees to subtract the principal from `gst_tax` server-side, the FE still needs to add the new `Delivery Charge` column — so it's never fully backend-only, but the heavy lifting moves backend.

### Current verdict
**Needs backend response sample to size the fix.** One audit-API row will determine FE-only vs FE+BE.

---

## BUG-042 — UPI payment fails on a Hold order

### Plain-English issue
For an order that's been put on **Hold** in the Audit Report, clicking **Collect Bill → UPI → Pay** fails. The same UPI payment works on a non-hold (regular dashboard) order. Other payment methods (Cash / Card / Tab) appear to work on Hold orders per the bug intake context.

### Suspected owner / user impact
- Affects: every cashier who tries to settle a held order via UPI.
- Symptom: Pay click fails; the Collect Bill drawer stays open; toast / error shown.
- Workaround today: use another payment method or move out of Hold.

### Why backend confirmation is needed
Two candidate root causes from frontend code review, and we **cannot tell which one** without seeing the actual API failure response:

1. **API contract:** backend may require a **non-empty `transaction_id`** when payment method is UPI, on the Hold path specifically (Cash / Card on Hold may not have this requirement; dashboard Collect Bill apparently doesn't). The frontend sends `transaction_id: ''` for UPI on this path today.
2. **Payload conflict:** when a Hold order is re-loaded, its previously-saved `partial_payments` data may still be attached. When the cashier clicks Pay, the frontend builds a fresh `partial_payments` block — backend may reject the conflict.

Without the network trace we cannot tell whether to (a) start sending a generated UPI transaction id from the frontend, (b) strip residual `partial_payments` before sending, or (c) wait for a backend fix.

### Exact backend ask
> _"Please reproduce a UPI-on-Hold failure (Collect Bill drawer from the Hold tab in the Audit Report, payment method UPI, click Pay) and share:_
> _- **the request payload** sent to `order-bill-payment`,_
> _- **the response body** returned (HTTP status + JSON body)._
>
> _Specifically we need to know whether backend rejects because (a) the UPI `transaction_id` field is empty, (b) the payload's `partial_payments` block conflicts with previously-saved data on the held order, or (c) something else entirely._
>
> _If the rejection is on `transaction_id`, please also confirm what shape it should take for UPI (FE-generated UUID acceptable, or backend-anchored?)."_

### Sample / data required
**One failing-call network trace** — `Network` tab in Chrome DevTools, click the `order-bill-payment` row, screenshot of Headers + Request + Response is sufficient. Or the raw `.har` file.

### What FE can do after confirmation

**Scenario A (`transaction_id` required):**
- FE adds a generated UUID or backend-anchored ID in the UPI mode payload.
- Footprint: **2 files, ~5 lines** (`CollectPaymentPanel.jsx` UPI mode wiring + payload builder in `orderTransform.js`).

**Scenario B (residual `partial_payments` conflict):**
- FE strips the held order's old `partial_payments` before building the new one.
- Footprint: **1 file, ~3 lines** (`CollectBillPanelDrawer.jsx` pre-flight cleanup).

**Scenario C (backend-only fix):**
- No FE change. Backend agrees to accept UPI on Hold path with current payload shape.

### What would make this backend-only
Backend accepts the same payload it accepts on the dashboard Collect Bill (the non-hold path). Then no FE change needed.

### Current verdict
**Backend confirmation pending — network trace will decide FE vs BE.**

---

## BUG-047 — Notification shows "18 March" instead of the outlet name

### Plain-English issue
An order placed at outlet **"Mayur's Kitchen"** triggers a buzzer / new-order notification — but the notification's outlet label reads **"18 March"** instead of "Mayur's Kitchen". The user thinks "18 March" is the wrong outlet name leaking in.

### Suspected owner / user impact
- Affects: multi-outlet accounts. Operator sees confusing or wrong outlet attribution on every new-order buzzer.
- Cross-flow: also impacts confirm-order, settle-bill, attend-table, rejection tones if the same template is reused.

### Why backend confirmation is needed
The frontend **does not compose the notification text**. It receives a fully-formed FCM payload from backend and renders `data.title` / `data.body` verbatim. There is no FE-side string template, no FE-side outlet lookup, no FE-side date formatter touching this text. **If "18 March" shows up, it shows up because backend's FCM emitter put it there.**

There are two plausible backend causes:
1. **Outlet-id mismatch:** backend's FCM service looks up the order's outlet but uses the wrong `restaurant_id`, returning a different restaurant's display name.
2. **Template-slot misalignment:** the backend's FCM message template has slots like `"New order at {outlet_name}"` and `"{order_date}"`. If the slots get swapped, the formatted **date** ("18 March") would land in the outlet-name position. This hypothesis is especially likely because "18 March" looks exactly like a formatted date string.

To pick between the two, we need to see the literal payload backend pushes.

### Exact backend ask
> _"For an order placed at outlet 'Mayur's Kitchen' that triggered a notification showing 'New Order at 18 March' (or whatever the literal text was):_
> _(a) please share the **literal FCM payload** that backend pushed to the FE for one such order — title, body, and the entire `data` object._
> _(b) confirm whether '18 March' is a real outlet name registered against this operator's account, or whether it is a formatted timestamp leaking from a wrong template slot._
>
> _If '18 March' is a date, please review the backend FCM emitter's template assembly — specifically whether the `{restaurant_name}` and `{order_date}` slots can swap, or whether the outlet lookup is using `order.created_at` instead of `order.restaurant_id`."_

### Sample / data required
- **Screenshot of the wrong notification.**
- **Literal FCM payload** for one such notification (can be captured via `chrome://gcm-internals` → Receive Message Log, or backend FCM service logs).
- **Confirmation** whether "18 March" is a real outlet name in your account.

### What FE can do after confirmation
**Almost certainly nothing.** The notification content is owned by backend FCM emitter (documented in `MODULE_DECISIONS_FINAL.md` Notifications section, POS2-007 / POS2-008).

The only edge case where FE could help: if backend confirms it ships **correct** `restaurant_name` but FE's `processNotification` is mis-rendering it (e.g., picking up the wrong field). Code review says this is not happening today, but a payload sample would let us verify.

### What would make this backend-only
**Confirmed backend-only** unless the payload sample reveals an FE rendering bug we don't see today.

### Current verdict
**Backend-only likely.** FE planning not needed until payload sample arrives.

---

## Backend Message Draft

Below is a single short message you can send to backend, grouped by bug. Each ask is independent — backend can answer any subset and unblock that bug in isolation.

---

> **Subject: 4 backend confirmations needed — BUG-037, BUG-039, BUG-042, BUG-047 (pos_final_1.0)**
>
> Hi team,
>
> We have four production bugs where the frontend fix is blocked on a backend response. Each one needs only a small data sample or one-line confirmation. Could you share these at your convenience? You can answer any subset independently.
>
> ---
>
> **BUG-037 — Scan & Order Accept fails when default config is "Delivered"**
>
> For the restaurant default order config value **"Delivered"**:
> 1. What numeric value does the profile API return in `def_ord_status` for this configuration?
> 2. What string literal does `waiter-dinein-order-status-update` (CONFIRM_ORDER) expect in `order_status` to successfully accept a Scan & Order from yet-to-confirm to delivered state?
> 3. Is **BUG-011** (delivery-scan-confirm HTTP 500 BadMethodCallException) the same root cause as this, or distinct?
>
> ---
>
> **BUG-039 — Audit Report shows delivery charge under Tax column**
>
> Please share **one audit-API response row** (`getOrderLogsReport`/audit endpoint) for a known delivery order with `delivery_charge > 0`. We need to see, for that one row:
> - `delivery_charge`, `gst_tax`, `vat_tax`, `service_tax`, `final_total`/`payment_amount`.
>
> Question: does `gst_tax` contain **only** the GST-on-delivery component (`deliveryCharge × delTaxRate` per CR-013 D-GST-3), or does it also include the **principal delivery charge amount**? The bug surface implies the latter.
>
> ---
>
> **BUG-042 — UPI payment fails on a Hold order**
>
> Please reproduce a UPI-on-Hold failure (Audit Report → Hold tab → row's Collect → drawer → UPI → Pay) and share the **request payload** + **response body / HTTP status** for the failing `order-bill-payment` call.
>
> Specifically we need to know whether the rejection is caused by:
> - (a) empty `transaction_id` for UPI (a UPI-specific requirement on the Hold path),
> - (b) `partial_payments` conflict with previously-saved data on the held order, or
> - (c) something else.
>
> If (a), please confirm acceptable shape (FE-generated UUID, or backend-anchored id).
>
> ---
>
> **BUG-047 — New-order notification shows "18 March" instead of outlet name**
>
> For an order from outlet "Mayur's Kitchen" that triggered a notification labelled "18 March":
> 1. Please share the **literal FCM payload** (title, body, full `data` object) that backend pushed for one such order.
> 2. Confirm whether "18 March" is a **real outlet name** registered against this operator's account, or a **formatted timestamp** leaking from a wrong template slot.
>
> If "18 March" is a date string, please review whether the FCM message template's `{restaurant_name}` and `{order_date}` slots can swap, or whether the outlet lookup is using `order.created_at` instead of `order.restaurant_id`.
>
> ---
>
> Thanks — none of these are urgent on the order of hours, but BUG-042 is the most cashier-visible (UPI failures on Hold orders block cashiers). Priority order from our side:
>
> **BUG-042 → BUG-037 → BUG-039 → BUG-047.**
>
> Happy to jump on a 10-minute call if any of these need quick clarification on the FE side.

---

## Priority Order

| Rank | Bug | Why first |
| --- | --- | --- |
| **1** | **BUG-042** | Most cashier-visible failure. UPI on Hold blocks every cashier who hits the path. Backend trace is fast to capture. FE fix is small (~5 lines) once direction is confirmed. |
| **2** | **BUG-037** | Affects every restaurant whose default config is "Delivered". Backend answer is just 2 numeric/string values + one yes/no on BUG-011 relationship. FE fix is also tiny. Likely overlaps with BUG-011 → resolving this one closes both. |
| **3** | **BUG-039** | Audit Report inflated Tax visible to auditors. Backend response sample needed. FE-only fix is medium (~20 lines) once direction is confirmed; FE+BE if backend has a composite issue. |
| **4** | **BUG-047** | Most likely backend-only. Important to confirm whether it's an outlet-id mismatch or template-slot misalignment, but FE has nothing to ship regardless. Lowest urgency from FE perspective — can wait for backend to investigate without blocking any FE work. |

---

## Final Verdict

### **`backend_questions_ready_to_send`**

**Reasoning:**
- All four bugs have a clear, narrow, factual backend ask drafted (no design questions, no decisions required from backend team).
- All four backend asks are independent — any subset can be answered without blocking the others.
- All four bugs have a clear FE plan staged behind the backend response (or, in the case of BUG-047, a clear "no FE change expected" verdict).
- One copy-pasteable message above is grouped by bug for clean handoff.

**Not** `needs_more_bug_context`: every bug has a code-level analysis already done (Impact Analysis L66–168 for BUG-037, L263–360 for BUG-039, L543–641 for BUG-042, L1233–1331 for BUG-047). No additional context needed before sending.

**Not** `blocked_by_missing_docs`: all required final-doc and overlay docs are present and have been consulted. No CR or open-question gap is preventing this report.

---

## End Of Report

- **No code was changed in this task.**
- **`/app/memory/final/` was not modified.**
- **`/app/memory/BUG_TEMPLATE.md` was not modified.**
- This report lives at `/app/memory/bugs/BACKEND_CONFIRMATION_PULL_BUG_037_039_042_047.md`.
- Source files (`OrderEntry.jsx`, `CollectPaymentPanel.jsx`, `CartPanel.jsx`, transforms, services, sockets, etc.) — all untouched.
- BUG-044 parked, BUG-045 sealed, BUG-046 closed (QA pass / awaiting owner smoke) — none touched by this task.
