# BUG-104 — Phase 2A — Safe Read-Only QA Handoff — 2026-05-22

> **Status:** `bug_104_phase_2a_ready_for_qa`

## 1. Test Environment

| Item | Value |
|---|---|
| Preview URL | `https://insights-phase.preview.emergentagent.com` |
| Login | `owner@palmhouse.com` / `Qplazm@10` |
| Restaurant | Palm House (id 541), ~40 credit customers |
| Navigation | Dashboard → Sidebar (expand) → **Credit Management** (Wallet icon) |

## 2. Retest Checklist (30 rows)

| # | Area | Check | Expected | Pass/Fail |
|---|---|---|---|---|
| 1 | SS2 | Download Statement button visible | Orange outlined button with Download icon | |
| 2 | SS2 | Print Statement button visible | Grey outlined button with Printer icon | |
| 3 | SS2 | Download Statement tooltip | "Download credit statement as PDF with full bill details (Phase 2A)" | |
| 4 | SS2 | Print Statement tooltip | "Print credit statement for this customer (Phase 2A)" | |
| 5 | SS2 | Date filter from-date input visible | `<input type="date">` in date filter bar | |
| 6 | SS2 | Date filter to-date input visible | `<input type="date">` in date filter bar | |
| 7 | SS2 | Set from-date → transactions filter | Only transactions on or after from-date shown | |
| 8 | SS2 | Set to-date → transactions filter | Only transactions on or before to-date shown | |
| 9 | SS2 | Set both dates → combined filter | Only transactions within range shown | |
| 10 | SS2 | Clear button appears when dates set | "Clear" text button visible | |
| 11 | SS2 | Clear button resets filter | All transactions shown again | |
| 12 | SS2 | Filtered section headers show "N of M" | e.g., "Credits — Tabs opened (5 of 50)" | |
| 13 | SS2 | Empty filter result | "No credit transactions match the selected date range." | |
| 14 | SS2 | Click Download Statement → statement generates | New browser tab opens with styled statement HTML | |
| 15 | SS2 | Statement includes customer name + mobile | Visible in customer bar of statement | |
| 16 | SS2 | Statement includes summary strip | Total Credit / Total Paid / Outstanding / First Credit | |
| 17 | SS2 | Statement includes credit transactions table | # / Date / Order ID / Credit (Bill) / Balance | |
| 18 | SS2 | Statement includes bill item details (Q3=C) | Item names, quantities, prices under each credit row | |
| 19 | SS2 | Statement includes payments table | # / Date / Method / Amount / Balance After | |
| 20 | SS2 | Statement footer shows "Powered by MyGenie" | Present at bottom | |
| 21 | SS2 | Statement respects date filter | Only filtered transactions appear in statement | |
| 22 | SS2 | Click Print Statement → same output | Browser print dialog appears | |
| 23 | SS1 | Per-row Download PDF icon visible | Download icon in Quick Actions column | |
| 24 | SS1 | Click per-row Download → statement generates | Toast "Preparing statement..." then statement opens | |
| 25 | SS1 | WhatsApp button disabled | Greyed out, cursor-not-allowed | |
| 26 | SS1 | WhatsApp tooltip shows Phase 2B | "Phase 2B — WhatsApp share" | |
| 27 | SS1 | Bulk Download button disabled | Greyed out in header bar | |
| 28 | SS2 | Settle All button disabled | Greyed out, tooltip shows Phase 2C | |
| 29 | SS4 | Print Receipt button disabled | Greyed out, tooltip shows Phase 2C | |
| 30 | SS1 | KPI Outstanding tile active | Shows ₹ amount, not "—" | |
| 31 | SS1 | KPI Total Credit tile shows "—" | Pending BG-01 | |
| 32 | SS1 | KPI Total Paid tile shows "—" | Pending BG-01 | |
| 33 | Network | No payment API invoked during statement generation | Network tab shows only GET/POST for read endpoints | |
| 34 | Network | No `tap-waiter-order-insert` call | Absent from network log during entire test | |
| 35 | Regression | Record Payment flow still works | Modal opens, validates, submits (if owner chooses to test) | |
| 36 | Regression | Bill detail (SS3) still opens | Click View → OrderDetailSheet renders | |
| 37 | Regression | Escape behavior preserved | 1st Esc closes SS3, 2nd closes SS2 | |
| 38 | Regression | Search + filter still work | Name/mobile/email search, All/With Balance/Settled filter | |
| 39 | Regression | Audit Report unaffected | Order Reports → Audit → drill-down works | |
| 40 | Build | `yarn build` passes | 0 errors, 1 pre-existing warning | |

## 3. Smoke Steps

1. Log in as `owner@palmhouse.com / Qplazm@10`
2. Expand sidebar → click **Credit Management**
3. Verify SS1: 3-tile KPI strip (Outstanding active, Total Credit/Paid show "—")
4. Click any customer row → SS2 opens
5. Verify Download Statement + Print Statement buttons visible (enabled)
6. Verify Settle All button disabled with tooltip
7. Set a from-date in the date filter → verify transactions filter
8. Set a to-date → verify combined filter works
9. Click **Download Statement** → verify print window opens with full statement
10. Check statement has: customer info, summary, credit table with bill items, payments table, footer
11. Close print window, click **Clear** in date filter
12. Click **Print Statement** → verify same print dialog
13. Go back to SS1, click the Download icon on a customer row → verify toast + statement generates
14. Verify WhatsApp / Bulk Download icons are disabled
15. Open SS4 (Record Payment) → verify Print Receipt is disabled
16. **Do NOT submit a real payment** unless owner explicitly chooses
17. Verify Audit Report drill-down still works (regression)

## 4. Real Payment Test Warning

> Same as Phase 1: Do NOT submit real payments unless owner explicitly selects a test customer. Statement generation is purely read-only and safe to test freely.

## 5. Gate

**`WAITING_QA_VERIFICATION`**

---

*— BUG-104 Phase 2A — Safe Read-Only QA Handoff — 2026-05-22 —*
