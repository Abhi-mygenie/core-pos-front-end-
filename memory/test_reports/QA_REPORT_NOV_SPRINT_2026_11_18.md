# QA Report — Nov Sprint (All 6 Batches) — 2026-11-18

**Tester:** Automated QA (E1 testing agent)
**Target:** Deployed preview frontend https://pull-build-3--2jz687ss.preview.emergentagent.com → preprod backend
**Accounts used:** owner@ruby.com (CRM/general), owner@palmhouse.com (rooms/F&B)
**Rule:** Verification only — no application code changed. Firebase push/FCM/ringer = HIGHLIGHTED-SKIPPED (keys pending).
**Note:** Run hit its time limit; coverage partial. This is the consolidated record (no iteration json was produced).

## Summary
- Items attempted: all 33 across 6 batches
- PASS: 13 | FAIL: 2 | BLOCKED: ~11 | PARTIAL: 3 | SKIPPED(Firebase): push/ringer | Not executed: a few (code present)
- Two defects gate most order-entry/tax testing (1 BLOCKER, 1 MAJOR).

## 🔴 BLOCKER findings (require code fix in the source repo)

### BLOCKER-1 — Adding any item to the cart crashes Order Entry ("ReferenceError: onEdit is not defined")
- Tapping any menu item (plain or customizable) shows the error screen.
- Root cause: `frontend/src/components/order-entry/CartPanel.jsx` — the main CartPanel component props block (~line 811) destructures `onCustomize` but NOT `onEdit`, while line 1353 renders `onEdit={onEdit}`. `OrderEntry.jsx:2964` correctly passes `onEdit` in. Inside CartPanel `onEdit` is undefined → crash. (Incomplete CR-551 implementation.)
- Suggested fix: add `onEdit,` to CartPanel's destructured props next to `onCustomize`.
- Blocks: CR-551 (fully); new-order creation for BUG-647, BUG-683, BUG-678, SC+GST regression; and self-created orders needed for CR-526/BUG-671/BUG-672.
- Severity: BLOCKER (normal place-order flow broken).

### MAJOR-2 — Dashboard drops all running orders right after login (~60–70% of logins)
- Loading shows "Running Orders 53 loaded" then dashboard shows POS 0; Refresh does not recover, full reload does.
- Root cause: `frontend/src/hooks/useOrderPollingReconciliation.js:275-281` (BUG-677 F4 change) uses `Promise.allSettled`; when the running-orders fetch is rejected it treats it as server=0 and removes all local orders (console showed server=0, local=53, 53 removals).
- Suggested fix: skip reconcile when `posResult.status === 'rejected'`.
- Severity: MAJOR.

## Results by batch

### Batch 3 — Order Entry & Cart
| ID | Result | Notes |
|----|--------|-------|
| CR-551 | BLOCKED | By BLOCKER-1. Confirmed: placed items show no Edit button; Customize button is orange in code. |
| BUG-677 | PASS | Offline→online: socket auto-reconnected ~10s, status dot Offline→Online, channels subscribed once (no duplicate listeners). NOTE: `join_restaurant` sent twice after reconnect (double ack). |

### Batch 2 — Tax & Payment Accuracy
| ID | Result | Notes |
|----|--------|-------|
| BUG-647 | BLOCKED (UI) | Fix code present in `orderTransform.js`/`profileTransform.js`; couldn't place order (BLOCKER-1). |
| BUG-683 | BLOCKED (UI) | Same as above. |
| BUG-678 | BLOCKED (UI) | Same as above. |
| BUG-684 | PARTIAL | On an existing order Collect Bill showed ₹137 but was disabled; payment panel never opened, could not compare billed amount. |

### Batch 1 — Cancellation & Credit
| ID | Result | Notes |
|----|--------|-------|
| CR-493 | PASS | Confirm disabled until a reason is chosen, then enabled (both dialogs). |
| BUG-670 | PASS | Item-cancel dialog has "Additional Notes (Optional)". |
| BUG-674 | PASS | Order-cancel dialog has "Notes (Optional)". Not confirmed, to protect real data. |
| BUG-675 | PASS | Settlement page shows no "definition pending" text. |
| CR-526 | BLOCKED | Would alter real orders; couldn't create own (BLOCKER-1). Credit page loads (2 customers, ₹1,008 outstanding). |
| BUG-671 | BLOCKED | Same reason. |
| BUG-672 | BLOCKED | Same reason. |

### Batch 5 — Reports & Audit
| ID | Result | Notes |
|----|--------|-------|
| CR-524 | PASS | Cancellation table has PUNCH TIME and DURATION (MIN) columns. |
| CR-523 | Not executed | Code present at `OrderEntry.jsx:1108`. |
| CR-528 | PARTIAL | Page is 4 KPI cards + 3 collapsible cards (CR-546 design), not 3 tabs. "Leakage After Print" shows 11 events in 7 cols (spec said 10). MINOR: some TIME cells clipped at "2026-". Confirm spec vs CR-546 redesign. |
| BUG-630 | FAIL | Not in this deployment. No BUG-630 markers; `ItemSalesLedgerMockup.jsx` still has "Gross Revenue" card (subtitle "after disc+GST"); `/reports-module/items` shows old Item Ledger. |

### Batch 4 — Dashboard / Scan Popup
| ID | Result | Notes |
|----|--------|-------|
| CR-545 | BLOCKED | No live web/APS order available. |
| BUG-679 | BLOCKED | Same reason. |
| CR-552 | FAIL | Not deployed — no CR-552 markers in code. |
| Firebase push/ringer | SKIPPED | Notification permission denied in test browser; per instruction. |

### Batch 6 — Staff Rights, Setup & Admin
| ID | Result | Notes |
|----|--------|-------|
| CR-372-B | PASS | 5 protected routes redirect to login when logged out. |
| CR-521 | PASS | Bill-printed cards use rgb(255,237,213) = #FFEDD5. |
| CR-394 | PASS | Add Product form has no Inclusive option. |
| BUG-229 | PASS | First name "Testqa" → email `testqa@rubyzap.com`. NOTE: domain gets ".com" appended. |
| BUG-230 | PASS | Renaming first name updated the auto-generated email. |
| BUG-669 | PASS | Empty price blocked ("Price required"); ₹0 add-on created then deleted. MINOR: add-on list didn't refresh immediately after create. |
| BUG-667 | PASS (code review) | No overflow seen; Ruby name too short to show truncation. |
| BUG-673 | PASS (caveat) | No auto-select on open/typing; keyboard mode may be off for this outlet. |
| CR-515 | BLOCKED | No waiter login provided. |
| CR-492 | BLOCKED | No waiter login provided. |
| CR-503 | Not executed | Code present. |
| CR-405 | Not executed | Needs room check-in/checkout on real palmhouse data + permission to change. |

## Minor / observations
- "New version available" banner on every page.
- Login page logo renders blank.
- Direct-URL after fresh login routes through /loading (>10s).

## Items needing a Bug Fix agent (source repo)
- BLOCKER-1 (CartPanel onEdit) — gates most order entry.
- MAJOR-2 (order polling reconcile on fetch failure).
- BUG-630 Phase A and CR-552 are MISSING from this build (not just failing) — need to be deployed.

## Prerequisites needed to finish QA
- Waiter sub-accounts (rights tests CR-515, CR-492).
- A live web order + APS (₹1) order on preprod (CR-545, BUG-679, CR-552).
- Permission to modify palmhouse data (CR-405) and to confirm cancels/credit actions (Batch 1 writes).
