# POS — BUG-109 + BUG-110 — Discovery Registration

**Date:** 2026-05-27
**Type:** BUG_REGISTRATION (Stage 1 of CHANGE_REQUEST_PLAYBOOK — Discovery placeholder)
**Source:** Owner verbal report 2026-05-27
**Priority (proposed):** P1 — both block production POS use under QSR mode
**Sprint anchor:** **OPEN QUESTION** — see §6
**Status:** REGISTERED — NO_INVESTIGATION_YET — NO_CODE_CHANGE_YET

Per `/app/memory/final/CHANGE_REQUEST_PLAYBOOK.md`:
> "No future agent should start coding from the user request alone. Every request must first be translated into module, API, state, UI, and regression terms." (§ Final rule)

This doc captures the raw owner report verbatim and parks both bugs at **Stage 1 Discovery**. No code has been inspected. No fix has been proposed. No mutating action taken.

---

## 1. BUG-109 — QSR mode skips mandatory customer + address validation

### 1.1 Raw report (verbatim)

> *"In QSR mode, we are currently not validating mandatory takeaway/delivery customer details properly. For both QSR mode and normal mode, these fields must be required whenever the order is takeaway or delivery: Customer name, Customer mobile number, Delivery address (for delivery orders). This validation should not be skipped just because the restaurant is in QSR mode. Mandatory customer and delivery details must be enforced consistently across both modes."*

### 1.2 First-pass module classification (per playbook Step 2)

| Field | Proposed value |
|---|---|
| Primary module (per `MODULE_DECISIONS_FINAL.md` quick-mapping) | **Order Entry / Cart / Payment Workflow** |
| Secondary module(s) | **Customer / CRM Integration**, **Visibility Settings / Device Configuration** (QSR-mode toggle) |
| Affected workflow | Takeaway + Delivery order placement |
| Change type | **State-flow fix** + **policy-consistency fix** (validation gate must not depend on QSR toggle) |
| Likely entry points (unverified — TO BE CONFIRMED via code audit in Stage 1) | `CartPanel.jsx` (validation on Place Order / Collect Bill), `OrderEntry.jsx` (order-type gating), `CollectPaymentPanel.jsx`, plus QSR-mode flag source (likely `settingsTransform.js` / `Visibility Settings`) |
| Hotspot file risk (per playbook §165) | **HIGH** — likely touches `OrderEntry.jsx` and/or `CollectPaymentPanel.jsx` |

### 1.3 Acceptance hint (owner-supplied, NOT a frozen AC)

| Order type | Required fields (both QSR and normal mode) |
|---|---|
| Dine-in / walk-in | (existing rules — out of scope here) |
| Takeaway | Customer name + customer mobile |
| Delivery | Customer name + customer mobile + delivery address |

### 1.4 Open clarifying questions (Stage 2 owner decisions — needed before any code)

| Q | Question | Why it matters |
|---|---|---|
| Q1 | Where exactly should the validation **block**? At "Add to Cart"? At "Place Order"? At "Collect Bill" / Pay? At all three? | Determines which gates are hardened — different gates have different UX implications |
| Q2 | If mandatory fields are missing, what's the failure UX? Inline field error + focus jump? Toast? Modal? | Owner UX decision |
| Q3 | "Customer mobile number" format — must it be 10-digit India format only, or any non-empty digit string? Same rule as CartPanel today (`replace(/\D/g, '').length === 10`)? | Determines validation regex |
| Q4 | Delivery address — is it satisfied by *any* address line populated, or must it be a CRM-saved address from the address picker? | Determines whether free-text + picker both qualify |
| Q5 | Does this validation apply to **room orders** as well (RM type via dine-in path that switches to takeaway)? | Edge case |
| Q6 | If an existing pre-CR order is restored that lacks these fields (legacy data), is it grandfathered or forced to fill before further action? | Migration policy |

---

## 2. BUG-110 — QSR paid order is re-editable / Pay button reappears after navigation

### 2.1 Raw report (verbatim)

> *"In QSR mode, the order should follow a prepaid flow because payment is always collected first. Once the order is marked as paid, the system should treat it as a prepaid order. Current issue: After payment is completed, if I click Cart and then come back to the Order screen, the Pay button still appears. I can also open View Full Mode, which allows order editing. Expected business rule: For QSR mode, once the order is paid/prepaid: the Pay button should not appear again; the order should not be editable; View Full Mode / edit flow should be blocked or read-only; the same prepaid-chain rule should apply as in normal prepaid orders: paid prepaid orders cannot be edited. So this needs to be handled as a QSR-specific enforcement of the existing prepaid business rule."*

### 2.2 First-pass module classification (per playbook Step 2)

| Field | Proposed value |
|---|---|
| Primary module | **Order Entry / Cart / Payment Workflow** |
| Secondary module(s) | **Dashboard / POS Workspace** (re-entry from Cart back to Order screen), **Visibility Settings / Device Configuration** (QSR mode flag), **State-flow / orderFinancials + prepaid chain** |
| Affected workflow | QSR post-payment screen state |
| Change type | **Policy / state-flow fix** — QSR paid order must enter the **existing prepaid lock chain** (no new lock semantics) |
| Likely entry points (unverified) | `OrderEntry.jsx` (Pay-button visibility + View-Full-Mode gating), `CartPanel.jsx` (Cart back-nav), `CollectPaymentPanel.jsx` (post-payment dispatch), prepaid-chain predicate (whatever existing flag — `isPrepaid` / `paymentStatus` / `f_order_status`) |
| Hotspot file risk | **HIGH** — touches `OrderEntry.jsx` (high-risk per playbook §165) and prepaid-chain logic (financial/payment-adjacent) |

### 2.3 Owner-stated rule (the contract)

- QSR paid order ≡ **PREPAID** (re-use existing prepaid semantics; do **not** invent new rule)
- Pay button: hidden on prepaid
- View Full Mode / edit flow: blocked or read-only on prepaid
- Lock applies regardless of nav route (Cart ↔ Order screen ↔ Dashboard ↔ etc.)

### 2.4 Open clarifying questions

| Q | Question | Why it matters |
|---|---|---|
| Q1 | Is there an **explicit** `isPrepaid` boolean in the order state today, or is it derived from `paymentStatus === 'paid' \|\| f_order_status === ...`? (Code audit required) | Determines whether QSR-paid → prepaid is a state-flag flip or a predicate extension |
| Q2 | "View Full Mode" — block entirely vs render in **read-only** mode? Owner phrasing says "or read-only" — which is preferred? | UX decision; read-only is friendlier but more work |
| Q3 | After QSR payment, does the order automatically transition to KOT-ready / placed lifecycle, or does it stay editable until KOT print? (Some QSR flows have a brief "edit before fire" window) | Edge case — owner clarifies whether lock applies at "paid" or "paid + fired" |
| Q4 | Manager-override unlock — does the existing prepaid lock have a manager-override pin path that QSR should also inherit? | Inherit or block? |
| Q5 | Cancel / refund flow on QSR-paid order — same as normal prepaid (likely BUG-108 G-17 "no reversal endpoint")? | Out-of-scope confirmation |

---

## 3. Cross-cut: shared scoping notes (apply to both bugs)

| Topic | Note |
|---|---|
| QSR-mode flag source | Likely a restaurant-level config (settings transform) toggled per outlet. Audit will find the exact accessor. |
| QSR-mode routing | Today QSR likely routes through `CartPanel.handleCollectBill` per the BUG-108 G-20 register entry ("QSR `CartPanel.handleCollectBill` emits coupon zeros only — Owner Q4=A: route QSR through Full Billing → CollectPaymentPanel"). Need to confirm. |
| Regression risk overlap | Both bugs touch the same hotspot files (`OrderEntry.jsx`, `CartPanel.jsx`, `CollectPaymentPanel.jsx`) → consider combining into one CR with two sub-acceptance-buckets to avoid back-to-back regression cycles. |

---

## 4. Status snapshot

| Bug | Stage | Status |
|---|---|---|
| BUG-109 | 1 — Discovery | **REGISTERED, awaiting code audit + owner decisions** |
| BUG-110 | 1 — Discovery | **REGISTERED, awaiting code audit + owner decisions** |

---

## 5. Tests-to-write hint (NOT executed yet — for the Stage-7 QA agent)

| Bug | Test scenarios to cover |
|---|---|
| BUG-109 | (a) QSR mode + takeaway + missing name → blocked; (b) QSR + takeaway + missing phone → blocked; (c) QSR + delivery + missing address → blocked; (d) normal mode same trio; (e) all fields present → passes in both modes; (f) edit-existing-order with legacy nulls per Q6 |
| BUG-110 | (a) QSR place → pay → cart-tab → back to order → Pay button hidden; (b) View Full Mode blocked or read-only; (c) re-pay attempt blocked; (d) normal prepaid order still locks (no regression); (e) edit on unpaid QSR still works |

---

## 6. Sprint anchor — needs owner decision

These are **POS frontend bugs**. CRM 2.0 (the currently active sprint) is themed around CRM integration. Two options:

| Option | Anchor | Numbering | Pros | Cons |
|---|---|---|---|---|
| **A** | Open POS3.1 (or POS3.0-CARRYOVER) sprint | **BUG-109, BUG-110** | Honors POS bug-numbering convention; clean separation from CRM 2.0 | Requires opening a new sprint scaffold |
| **B** | Slot under CRM 2.0 as bug-class CRs | **CR-010-QSR-VALIDATION, CR-011-QSR-PREPAID** | Single active sprint; minimal scaffolding | Mixes POS-flow bugs into a CRM-themed sprint |
| **C** | Treat as POS3.0 carryover hotfixes | Append to `/app/memory/change_requests/final_sprint_reconciliation/POS3_0_BUG_108_…` register | Aligns with existing carryover practice | The two bugs are NOT BUG-108-related |

Recommended: **Option A** (open POS3.1 or use this doc as the seed of a small POS3.1-HOTFIX register). Owner to confirm.

---

## 7. Confirmations

| # | Confirmation | Status |
|---|---|---|
| 1 | No code investigated yet | CONFIRMED |
| 2 | No code changed | CONFIRMED |
| 3 | No mutating API called | CONFIRMED |
| 4 | `/app/memory/final/` UNTOUCHED | CONFIRMED |
| 5 | `/app/memory/crm/crm_1_0/` UNTOUCHED | CONFIRMED |
| 6 | Owner report captured verbatim per §1.1 and §2.1 | CONFIRMED |
| 7 | Sprint anchor decision parked at §6 | CONFIRMED |

---

**End of BUG-109 + BUG-110 Discovery Registration. Stage 1 ENTERED. Awaiting code audit + owner decisions before Stage 2.**
