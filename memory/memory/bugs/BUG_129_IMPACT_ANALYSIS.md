# BUG-129 — Impact Analysis (Gate 2)

**Date:** 2026-06-11 · **Status:** ANALYSIS COMPLETE — BACKEND-BLOCKED (no FE code)

## 1. Nature
Backend data-contract issue. `orders_table.f_order_status` is set to 6 for TAB orders at punch. 460 TAB orders across two restaurants confirm 100% fStatus=6 with money uncollected.

## 2. Contradiction Inside Backend
`daily-sales-revenue-report` itself classifies TAB as `unpaid_revenue`/`orderTAB` and only counts revenue on `tab_cash/card/upi` settlement — backend report engine disagrees with backend status stamping.

## 3. Frontend Blast Radius (if backend changes the stamp)
⚠️ A backend change here is HIGH-RISK for the FE — every fStatus-6 gate shifts:
| Consumer | Effect of TAB losing fStatus 6 |
|---|---|
| SalesMockup / PaymentsMockup (`fOrderStatus === 6`) | TAB drops out of revenue — Sales totals DECREASE by ₹49–70K/month (palmhouse) |
| insightsService Items (`String(fs)==='6'`) | TAB lines move Sold → Pending Billing |
| insightsService Dashboard (`fs==='6'`) | Same |
| TAB_FILTERS.paid (already excludes TAB) | No change |
| deriveOrderStatus (TAB → 'credit' before fStatus check) | No change |
| Dashboard STATUS_COLUMNS / table grids | TAB cards change column |

## 4. Recommended Sequencing
1. Backend answers the contract question (new status vs payment_status flag vs keep-as-is).
2. If contract changes: FE work re-registers as a follow-up CR with the table above as its scope checklist.
3. CR-030 (attribution/TAB policy) owner decision should reference this — do NOT let backend change land before FE gates are aligned.

## 5. Test Strategy (post-backend)
- `/app/audit_data/analyze.py` `tab.fs` distribution should show settled vs outstanding split; Sales/Ledger-Paid gap should close to ₹0 for TAB-free attribution.
