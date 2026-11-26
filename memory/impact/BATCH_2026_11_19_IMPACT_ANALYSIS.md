# Impact Analysis (Gate 2) — Batch 2026-11-19 (BUG-704..712 + CR-553)

**Role:** PLANNING (Gate 2 — Impact Analysis only; no code written, no Implementation Plan yet)
**Sprint:** nov_cr_batch · **Assignee:** Abhishek · **Client:** ALL
**Probe account:** owner@cafe103.com (Owner, 50 perms — has BOTH `print_icon` and `clear_payment`)
**Evidence dir:** `/app/memory/evidence/BATCH_2026_11_19_IA/` (login, cancellations, dashboard, orderlogs, single_*, profile)
**Code reality:** all anchors re-verified against current `main` @ deployed HEAD. Two investigation claims corrected (see BUG-704 FY and BUG-708 field name).

---

## Confirmation matrix

| ID | Code anchor re-verified (current line) | Live probe | Verdict |
|---|---|---|---|
| BUG-711 | `OrderReportBetaPage.jsx` L779 `{row.f_order_status === 6 && (` Reprint has NO `hasPermission`; siblings gated L753/763/814 | owner has print_icon (can't repro gating) | **FE bug CONFIRMED** |
| BUG-712 | `orderTransform.js` L179/181/220 reads `user_name`/`user.f_name` (correct) | `get-single-order-new` returns `user_name` + `user.f_name` correctly for 3 linked orders | **Read-back NOT broken; narrower bug — needs owner input** |
| BUG-705 | `CollectBillPanelDrawer.jsx` L300 `allowedMethods={['cash','card','upi']}` | n/a (UI) | **FE bug CONFIRMED — owner decision needed** |
| BUG-706 | `OrderReportBetaPage.jsx` L501/699/881 hardcode "GST"; `profileTransform` maps `gstStatus` + `vatStatus` | profile has `gst_status:true` AND `vat_info.status:true` **both true** on a GST restaurant | **FE bug CONFIRMED; discriminator UNSAFE — needs VAT-restaurant probe/owner input** |
| BUG-704 | `ItemSalesLedgerMockup.jsx` L166 LM early-returns before `setSharedFrom/To` (L177); **FY (L170-174) falls through to L177 — NOT broken** | n/a | **FE bug CONFIRMED (LM only; FY claim was wrong)** |
| BUG-708 | `CancellationsMockup.jsx` L971-977 renders `r.cancelNote` (never mapped); separate `notes` col L963 works | API returns `notes` (8/65 filled); `cancel_item_note` & `cancel_note` EMPTY (0/65) | **FE bug CONFIRMED; data-source ambiguous — needs owner input** |
| BUG-707 | `CancellationsMockup.jsx` L736/L954 raw `{orderDate} {orderTime}` vs L980 `toLocaleString` | n/a | **FE bug CONFIRMED (display)** |
| BUG-709 | `AuditLogMockup.jsx` reads `insights-dashboard` → `audits.orders[]` filter `type==='make_unpaid'` (correct) | dashboard `audits.make_unpaid_count:3`, events present | **Backend; needs settle→unpaid→cancel order to confirm drop** |
| BUG-710 | `reportTransform.js` reads `restaurant_discount_amount` (correct); field exists in `orders_table` | cafe103 `discount_apply_after_print_count:0` — no repro data on this account | **Backend-suspected; needs the specific after-print-discount order** |
| CR-553 | `OrderReportBetaPage.jsx` L814 Collect gated by `clear_payment` only | n/a | **Owner policy decision** |

---

## Per-item plain-English + scope

### BUG-711 — Reprint ignores print permission (P0, CRITICAL) — FE, ready
The "Reprint" button on Order Report (Beta) shows for any settled order with no check on the user's bill-print right. Every sibling action on that row (Change/Unpaid/Collect) checks a permission; only Reprint was missed. A staff member with no print rights can reprint bills.
- **Will change:** `OrderReportBetaPage.jsx` L779 — add `hasPermission('print_icon') &&`.
- **Will NOT touch:** any other file. **Risk:** LOW (gate only). **Repro limit:** owner has print_icon, so verification needs a no-print staff role.

### BUG-712 — Customer name not captured (P0) — needs owner input BEFORE plan
Probe result overturns the "backend read-back gap" theory: `get-single-order-new` returned the customer name correctly (`user_name` and `user.f_name`) for every customer-linked order tested. So reopening a *properly linked* order shows the name. The reported blank (order #015925) is therefore specific to the **quick-customer typed-name path** (typing a name into the cart field, which POSTs to `user-check-create`) — that path may not be linking the typed name to the order's `user_id`.
- **Cannot plan yet** — need the specific failing order or a controlled repro to see whether the typed name ever reaches the order record. Likely a backend/linkage brief, not a FE transform change.

### BUG-705 — PayLater Collect shows only Cash/UPI/Card (P1) — owner decision
When collecting a PayLater/TAB bill from Order Report (Beta), only Cash/UPI/Card appear; Split, Credit/TAB, To-Room and dynamic types (Zomato Gold, etc.) are hidden. Cause: the drawer hardcodes `allowedMethods={['cash','card','upi']}` (added for the Audit→Hold Collect flow, BUG-042-A) and CR-503 reused the same drawer for OrderBeta without lifting that restriction. The hardcoded list switches the panel into "hold context" which hides the second row of methods.
- **Will change:** `CollectBillPanelDrawer.jsx` (and possibly caller). **Risk:** MEDIUM (UI only, payload unaffected).
- **Owner decision:** (A) remove the restriction so all configured methods show for OrderBeta PayLater, or (B) make it a caller-driven prop (Audit=restricted, OrderBeta=full).

### BUG-706 — VAT amount labelled "GST" in Order Beta (P2) — discriminator unsafe
Order Report (Beta) always prints the tax column/header/footer as "GST" (hardcoded in 3 places); the backend puts the tax value in `gst_amount` regardless of GST or VAT. **New probe finding:** the profile for cafe103 (a GST restaurant with a GST number) returns **both** `gst_status:true` and `vat_info.status:true`. So the existing `restaurant.tax.vatStatus` flag (from `vat_info.status`) is TRUE even for GST restaurants — using it to flip the label to "VAT" would mislabel GST restaurants.
- **Cannot finalise the plan** until we know the correct VAT-vs-GST discriminator. Need a probe of an actual VAT restaurant's `/profile` (e.g., the hogwarts account from the original report) to see how VAT differs (likely `gst_status:false` + `vat_info.status:true`, or a `restaurent_gst` value).
- **Will change (once rule is known):** `OrderReportBetaPage.jsx` L501/699/881 (+ export) to render conditionally; possibly `profileTransform.js`. **Risk:** MEDIUM (display only).

### BUG-704 — "Last Month" preset not persistent (P2) — FE, ready (FY is fine)
On Item Sales Ledger, clicking "LM" loads correctly, but navigating away and back resets to today. Cause: the LM branch (L166) sets the applied dates then `return`s, skipping the line (L177) that writes the dates into the shared Insights date-context; on remount the page re-reads the shared context (still "today"). **Correction to the investigation:** the FY branch does NOT early-return — it falls through to L177 and already persists correctly. So only LM is broken.
- **Will change:** `ItemSalesLedgerMockup.jsx` LM branch — add `setSharedFrom/ setSharedTo`. **Risk:** LOW.

### BUG-708 — "Staff cancel note" column always "—" (P1) — data-source ambiguous
The Cancellation Report has TWO note columns: a "Notes" column (reads `notes`, which **works** — 8/65 rows show content from the API) and a separate "staff cancel note" column (reads `r.cancelNote`, which is never mapped → always "—"). **Probe finding:** the API field the investigation guessed (`cancel_item_note`) is EMPTY in all 65 rows; `cancel_note` doesn't exist; only `notes` carries content.
- **Open question:** what is the "staff cancel note" column meant to show that the "Notes" column doesn't? If it's the same note, the column may be redundant (or should read `notes`). If it's a distinct staff note, the backend currently isn't populating `cancel_item_note` → backend gap.
- **Will change (pending answer):** `CancellationsMockup.jsx` transform/render. **Risk:** LOW.

### BUG-707 — Date/time format inconsistent in Cancellation Report (P2) — FE
In the same table, the Date/Time cells render raw API strings (e.g. `2026-10-01 19:31`) while the Punch Time cell uses a formatted style (`01 Oct, 06:51 pm`). There's no shared date formatter across report pages.
- **Will change:** `CancellationsMockup.jsx` L736/L954 (and ideally a shared `formatDateTime` util). **Risk:** LOW (display). **Minor owner choice:** which single format to standardise on.

### BUG-709 — "Make Unpaid" audit event missing after cancel (P1) — backend
The Audit view reads events from `insights-dashboard.audits.orders[]` and filters `make_unpaid`. The FE is correct — the probe shows `make_unpaid` events are present (count 3). The reported bug is that once an order is subsequently *cancelled*, its earlier `make_unpaid` event disappears from the audit feed. That's a backend data-retention behaviour (audit should be append-only).
- **No FE change.** Needs a backend brief + a specific settle→make-unpaid→cancel order to demonstrate the drop (couldn't be reproduced on cafe103's current data).

### BUG-710 — Discount applied after bill print not in report (P2) — backend-suspected
The report transform reads `restaurant_discount_amount` correctly and the field exists in `orders_table`. On cafe103, `discount_apply_after_print_count` is 0 for the probed window — no order with an after-print discount exists to test. So the FE path looks correct; the suspicion is the backend doesn't write the discount into `restaurant_discount_amount` when it's applied via collect-bill after printing.
- **Needs the specific order** (the originally reported "priti" order, or a controlled repro) to confirm whether `restaurant_discount_amount` is 0 on such an order → then backend brief.

### CR-553 — Require print_icon (plus clear_payment) for Collect-flow bill print (P2) — owner policy
Collecting a bill prints a bill but is gated only by `clear_payment`. A user with collect rights but no print rights can still trigger a bill print during collection. This is a policy question, not a code defect.
- **Owner decision:** should the Collect flow additionally require `print_icon` to print? If yes → small FE gate change (relates to BUG-711 area).

---

## Owner decision queue (blocks Gate 3 for the affected items)
1. **BUG-705:** Option A (show all configured methods) or Option B (caller-driven prop)?
2. **BUG-706:** confirm the VAT-vs-GST discriminator — can you share/allow a probe of a VAT restaurant's profile (e.g. hogwarts)? `vat_info.status` is true even on GST cafe103.
3. **BUG-708:** what should the "staff cancel note" column show vs the existing "Notes" column?
4. **BUG-712:** can you point to the failing order (e.g. #015925) or confirm it was created by typing a name into the cart quick-customer field? Needed to repro.
5. **BUG-710:** can you point to a specific order where a discount was added after the bill was printed?
6. **CR-553:** should Collect-flow bill printing also require `print_icon`?
7. **BUG-709 / BUG-710 / BUG-712:** confirm these route to backend briefs if repro confirms backend.

## Ready to plan now (no owner input needed beyond go-ahead)
- **BUG-711** (1-line permission gate), **BUG-704** (LM shared-date persistence), **BUG-707** (date format standardise).

---

## PROBE RESULTS — Round 2 (2026-11-19, owner-supplied accounts/orders)

- **BUG-711 (T@t.com):** role=Cashier, `print_icon:false`, `clear_payment:false`. Perfect no-print repro account — this user WILL wrongly see "Reprint" on Order Report Beta, and correctly NOT see Collect. **FE bug confirmed, repro account available.**
- **BUG-706 (owner@beanmeup.com = VAT):** profile `gst_status:false` + `vat_info.status:true` (vs cafe103 GST `gst_status:true`). **Discriminator = `gst_status`.** Rule: `gstStatus===true → "GST"`, else if `vatStatus===true → "VAT"`. Both flags already in `profileTransform` (gstStatus, vatStatus). **No backend change needed.**
- **BUG-704 (cafe103):** top-food-sales LM (Oct) = 364 rows — data exists. LM click loads; bug is non-persistence on nav (LM branch skips `setSharedFrom/To`). FY confirmed NOT broken.
- **BUG-709 (owner@ruby.com, order 000802):** dashboard `audits.orders[]` **DOES contain** the `make_unpaid` event for cancelled order 000802 (plus new `cancel_after_unpaid`). Operations: bill_print→order_bill_payment(upi)→make_unpaid→order_cancel. **Event is NOT dropped — overturns the backend-drop theory.** Either already fixed or a FE display/bucketing issue. Needs UI confirmation whether it still shows missing.
- **BUG-710 (owner@ruby.com):** order 000803 (real after-print discount) → `restaurant_discount_amount:59.9`, `order_discount:59.90` **stored correctly** + `discount_apply_after_print` audit event present. Order 000804 (owner-cited) has NO discount operation at all and `restaurant_discount_amount:0`. **Overturns theory — field works when a discount is actually applied.** Need owner to clarify what was done on 000804.
- **BUG-712:** `placeOrder` payload sends `cust_name` + `cust_mobile` (orderTransform L1109-1110). Post-placement edit calls `LINK_CUSTOMER_ORDER` = `/api/v1/vendoremployee/pos/user-check-create` with `order_id` (OrderEntry L1114), BUT `saveCustomerToServer` early-returns if order not yet placed (L1111). Read-back via `get-single-order-new` returns `user_name`/`user.f_name` correctly for linked orders. **So an attach API exists and read-back works; the gap is conditional** — need the specific order to see which path was used.
- **BUG-708:** confirmed report = **Cancellation Report** (`/reports-module/cancellations`), "Cancellation Details" table. Two adjacent columns: "Notes" (reads `notes`, works — 8/65 rows) and an unlabelled staff-note column (BUG-674 B2, reads unmapped `r.cancelNote` → always "—"). API field `cancel_item_note` empty in all 65 rows.

## Owner decisions captured this round
- BUG-705 → **Option A (show all configured methods).**
- BUG-706 → discriminator resolved via beanmeup probe (`gst_status`).

---

## DECISIONS & IA CLOSURE — Round 3 (2026-11-19, owner)

| ID | Decision | IA status |
|---|---|---|
| BUG-711 | No owner input needed. Add `hasPermission('print_icon')` to Reprint gate. Repro acct: T@t.com (Cashier, no print_icon). | **IA CLOSED → ready Gate 3** |
| BUG-704 | Fix LM branch only (add `setSharedFrom/To`); FY already correct. | **IA CLOSED → ready Gate 3** |
| BUG-705 | **Owner: Option A — show ALL configured payment methods.** Remove hardcoded `allowedMethods` restriction on OrderBeta PayLater Collect. | **IA CLOSED → ready Gate 3** |
| BUG-706 | Discriminator = `gst_status` (true→GST, else `vat_info.status`→VAT). Both flags already in profileTransform. No backend change. | **IA CLOSED → ready Gate 3** |
| BUG-707 | Frontend-only display standardisation (shared date formatter). | **IA CLOSED → ready Gate 3** |
| BUG-710 | **Owner: no discount was applied after print on 000804.** Probe proved field works (000803 stored `restaurant_discount_amount:59.9`). No defect. | **IA CLOSED — NO DEFECT / not reproduced** |
| CR-553 | **Owner: Collect-flow bill print is acceptable as-is; no extra `print_icon` gate required.** | **IA CLOSED — DECLINED / won't fix** |
| BUG-708 | PENDING owner: what should the staff-note column show vs working "Notes" col? (`cancel_item_note` empty in all 65 rows; `notes` works). | **IA OPEN — awaiting owner** |
| BUG-709 | PENDING owner: will confirm whether UI still shows it missing. Probe: `make_unpaid` event IS present in dashboard audits for cancelled order 000802 (+ new `cancel_after_unpaid`). | **IA OPEN — awaiting owner** |
| BUG-712 | PENDING owner: will share the failing order. Contract aligned with mobile brief (endpoint/payload/membership_id=crmId/X-localization). Suspected gap: web fires `user-check-create` eagerly on blur with empty `membership_id` before CRM `crmId` resolves (brief wants CRM-first → single call). Awaiting owner answer on whether backend requires non-empty `membership_id` to link. | **IA OPEN — awaiting owner** |

**Ready for Gate 3 (Implementation Plan):** BUG-711, BUG-704, BUG-705, BUG-706, BUG-707.
**Closed without fix:** BUG-710 (no defect), CR-553 (declined).
**IA remains open:** BUG-708, BUG-709, BUG-712.

---
*Gate 2 Impact Analysis. No code written. No gates skipped. Probes read-only. No remote push.*
