# POS2.0 — Team Action Items: Blocked, Deferred, Pending & Closeable Bugs

**Date:** 2026-05-17
**Sprint:** POS2.0
**Total bugs in this document:** 12

This document is the single shareable reference for all POS2.0 bugs that need **team action** (backend answers, QA verification, or formal closure). Frontend implementation bugs are NOT in this document — they are tracked in the Master Implementation Plan.

---

## Section A — Backend Team: 4 Blocked Bugs (Need Your Answer)

These bugs cannot be planned or implemented until the backend team provides the requested information.

---

### BUG-063 — Room Bill Print Template Fields

**What frontend needs from backend:**
The printed room bill currently shows minimal room info. Owner has approved adding all room fields (room_no, check_in_date, guest_name, advance_amount, room_price, firm_name, firm_gst).

**Backend action required:**
1. What are the **exact payload key names** the print template expects for each room field?
2. Does the template **already have rendering slots** for these fields, or does it need a template update?
3. If template update needed — what is the timeline?

**Evidence needed:** Template field list or print contract showing accepted key names.

**Impact if not answered:** Room bills will continue showing minimal info. Customer-visible issue for room guests.

---

### BUG-064 — Room Transfer Notification Marker

**What frontend needs from backend:**
When an order is transferred to a room, the notification looks identical to a new order (same sound, same banner). Owner wants a **different sound + different banner message** for room transfers.

**Backend action required:**
1. Does the FCM/socket payload currently carry a **marker distinguishing room-transfer from new-order**? (e.g., `notification_type: 'room_transfer'` or similar)
2. If no marker exists — can backend **add one**? What field name and value?
3. Timeline for adding the marker?

**Evidence needed:** FCM payload sample for a room transfer event, or confirmation that no marker exists.

**Impact if not answered:** Room transfers will continue triggering false "new order" alerts, confusing operators.

---

### BUG-065 — Corporate Room GST Echo to Bill

**What frontend needs from backend:**
Frontend captures `firm_name` and `firm_gst` during corporate room check-in, but these don't appear on the printed bill. Owner confirmed: show firm fields on bill **only when provided** (conditional).

**Backend action required:**
1. Which **response keys** echo `firm_name` / `firm_gst` back on the `single-order-new` API response for corporate rooms?
2. Which **print template slots** map to them? (e.g., `custGSTName` / `custGST`, or dedicated room-specific slots?)

**Evidence needed:** API response sample for a corporate room order + template field mapping.

**Impact if not answered:** Corporate room guests will not see their firm/GST details on the bill. Compliance issue.

---

### BUG-069 — Notification Sound Sequencing

**What frontend needs from backend:**
Currently, notification sound fires **before** order data appears on the dashboard. Owner directed: "to be handled at backend."

**Backend action required:**
1. Implement sequencing so order data arrives **before or simultaneously** with the notification sound.
2. What is the **implementation approach** (e.g., delay FCM until socket data is sent, or bundle data with FCM)?
3. What is the **timeline**?

**Evidence needed:** Backend implementation plan or confirmation of approach.

**Impact if not answered:** Operators hear a sound but see no new order on screen, causing confusion and missed orders.

---

## Section B — Deferred: 1 Bug (No Action This Sprint)

### BUG-084 — Per-Component CGST/SGST Payload Keys

**What was decided:** Backend does not need per-component CGST/SGST keys in the payload this sprint. Frontend UI already displays the per-component breakdown correctly (item, SC, Tip, Delivery CGST/SGST).

**Deferred to:** Future sprint, when backend adds per-component key support.

**Carry-forward questions for future sprint:**
- Q-084-1: What are the exact per-component CGST/SGST key names?
- Q-084-2: Should composite keys be retained alongside per-component keys?
- Q-084-3: How does backend avoid double-counting?
- Q-084-4: Which payload flows need per-component keys?

**No action needed from anyone this sprint.**

---

## Section C — Pending Backend Answer: 1 Bug (Single Question)

### BUG-085 — Print Template Delivery GST Slot

**Context:** BUG-083 (in the implementation plan) adds `delivery_charge_gst_amount` to the payload. The owner confirmed (Q-083-5) that the print template renders this field. But a specific template-level verification was parked for the backend team.

**Backend action required (single question):**
Does the print template **already have a rendering slot** for `delivery_charge_gst_amount`, or does it need a backend template update to display this field on the receipt?

**Evidence needed:** Template field list or template source excerpt showing whether `delivery_charge_gst_amount` is mapped to a receipt line.

**What happens based on answer:**
- **If YES (slot exists):** BUG-085 bundles with BUG-083 implementation — frontend adds the field to the print payload and it appears on the receipt.
- **If NO (slot missing):** Backend template update is needed first. BUG-085 stays blocked until template is updated.

---

## Section D — QA Team / Verification Closures: 6 Bugs

These bugs are believed to be already resolved or duplicates. Each needs a quick verification before formal closure. No implementation expected.

---

### BUG-053 — Hardcoded SGST/CGST Percentage Label

**Why closeable:** Code inspection confirmed all GST percentage labels come from the restaurant profile — no hardcoded values found. Item-level GST rows intentionally show no percentage (mixed-rate items).

**Verification needed:** If the original reporter can provide a **screenshot** showing the exact row with a wrong percentage, reopen. Otherwise close.

**Verification effort:** 2 minutes — check Collect Bill GST breakdown on any order.

**Recommended action:** **Close immediately** unless screenshot evidence surfaces.

---

### BUG-074 — Remember Me / Browser Autofill

**Why closeable:** Login form already has `autoComplete="email"` on the email input and `autoComplete="current-password"` on the password input. Browser-native autofill should work.

**Verification needed:** Open login page in Chrome/Safari → confirm browser prompts to save and autofill credentials.

**Verification effort:** 1 minute.

**Recommended action:** **Close immediately** after quick browser check.

---

### BUG-076 — Round-off (Duplicate of BUG-051)

**Why closeable:** Exact same scope as BUG-051 (always-ceil round-off). BUG-051 is already in the implementation plan (Wave 2).

**Verification needed:** None — duplicate confirmed by both impact analysis and reconciliation report.

**Recommended action:** **Close as duplicate** when BUG-051 passes QA.

---

### BUG-077 — Mobile Trim Before CRM Lookup

**Why closeable:** Reconciliation report states current code appears to trim mobile before CRM lookup. The pending-freeze item (PAY-009a) may be stale.

**Verification needed:** Enter a phone number with **leading and trailing spaces** in the CRM lookup → confirm lookup works correctly.

**Verification effort:** 2 minutes on any tenant with CRM enabled.

**Recommended action:** **Close** if trim works. If a trim miss is found, it's a one-line fix bundled with BUG-078.

---

### BUG-081 — Snooze Duration Already 120000ms

**Why closeable:** Code shows snooze timeout is already 120000ms (2 minutes), matching the owner-correct rule (SCAN-002). Only stale comments referencing "5 minutes" remain.

**Verification needed:** Trigger snooze on the Scan & Order popup → time the re-appearance. Should be ~2 minutes.

**Verification effort:** 3 minutes (need a web order to trigger the popup).

**Recommended action:** **Close** if 2-minute duration confirmed. Stale comments can be cleaned up during any scan-order work.

---

### BUG-086 — Room Grand-Total Key

**Why closeable:** Code comment cites 2026-04-25 user confirmation that `order_amount` is the correct key for room order grand total. Impact analysis confirms code matches.

**Verification needed:** Capture a room order payload (room with pending balance) → confirm `order_amount` contains the correct grand total.

**Verification effort:** 5 minutes (need a room order with balance).

**Recommended action:** **Close** if `order_amount` is confirmed correct.

---

## Summary Table

| Bug | Team | Action | Priority | Effort |
|---|---|---|---|---|
| BUG-063 | Backend | Provide room print template field names | High | Answer needed |
| BUG-064 | Backend | Add room-transfer notification marker | High | Implementation needed |
| BUG-065 | Backend | Confirm corporate GST echo fields + template mapping | High | Answer needed |
| BUG-069 | Backend | Implement notification sound sequencing | Medium | Implementation needed |
| BUG-084 | None | Deferred to future sprint | — | No action |
| BUG-085 | Backend | Confirm print template slot for `delivery_charge_gst_amount` | Medium | Answer needed |
| BUG-053 | QA | Verify or close (no hardcoded percentage found) | Low | 2 min |
| BUG-074 | QA | Verify browser autofill works | Low | 1 min |
| BUG-076 | QA | Close as duplicate of BUG-051 | Low | 0 min |
| BUG-077 | QA | Verify mobile trim on CRM lookup | Low | 2 min |
| BUG-081 | QA | Verify snooze is 2 minutes | Low | 3 min |
| BUG-086 | QA | Verify room `order_amount` key | Low | 5 min |

---

**Backend team:** Please prioritize BUG-063, 064, 065 (customer-visible room issues) and BUG-085 (single yes/no question).

**QA team:** 6 verification items, total ~15 minutes. Close each after verification.

---

*— End of Team Action Items —*
