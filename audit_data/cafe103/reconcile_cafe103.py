#!/usr/bin/env python3
"""GO-2/GO-3 reconciliation for cafe103 (rid 644), Mar-May 2026. REPORT ONLY.

Replicates shipped FE logic exactly:
  A. CR-030/SALES-VAL: Sales(day) = sum fs6 order_amount by collect_bill business day
     (pm!=merge, pm='TAB' excluded) + tab settlements  ==  daily-sales paid_revenue
  B. CR-034: Sold + Credit == old Sold (item-line totalRevenue, insightsService predicates,
     incl. Pass-2 order-level charge distribution)
  C. CR-031: cancellation totals via cancellationValuation.js (cancel_at attribution,
     45d lookback, OPS-CANCEL override vs line consolidation cross-check)
"""
import json, os, datetime
from collections import defaultdict

D = os.path.dirname(os.path.abspath(__file__))

def f(v):
    try: return float(str(v or 0).replace(',', ''))
    except (ValueError, TypeError): return 0.0

def load(label):
    return json.load(open(f"{D}/orders_{label}.json")).get("order", [])

def dedupe(wrappers):
    seen, out = set(), []
    for w in wrappers:
        oid = (w.get("orders_table") or {}).get("id")
        if oid in seen: continue
        seen.add(oid); out.append(w)
    return out

def add_days(iso, n):
    y, m, d = map(int, iso.split("-"))
    return (datetime.date(y, m, d) + datetime.timedelta(days=n)).isoformat()

# cafe103 schedules: 06:00 -> 03:00(+1) all 7 days (verified profile.json)
OPEN, CLOSE = "06:00:00", "03:00:00"
def bd_start(d): return f"{d} {OPEN}"
def bd_end(d):   return f"{add_days(d, 1)} {CLOSE}"
def business_day_of(ts):  # mirrors orderLedgerService.businessDayOf
    cal = ts[:10]
    return add_days(cal, -1) if ts < bd_start(cal) else cal

def norm_ts(ts): return (ts or "").replace("T", " ")[:19]

MONTHS = [("Mar", "2026-03-01", "2026-03-31"), ("Apr", "2026-04-01", "2026-04-30"),
          ("May", "2026-05-01", "2026-05-31")]

daily = json.load(open(f"{D}/daily_sales.json"))
report = {"restaurant": "cafe103 rid=644", "generated": str(datetime.datetime.now())}

# ════════ A. SALES == paid_revenue per day ════════
cb = dedupe(load("cb_mar") + load("cb_apr") + load("cb_may"))
day_sales = defaultdict(float)   # business day -> sum order_amount (fs6, non-TAB)
day_tab_punched = defaultdict(float)
start_all, end_all = bd_start("2026-03-01"), bd_end("2026-05-31")
n_fs6 = n_tab = 0
for w in cb:
    ot = w.get("orders_table") or {}
    if str(ot.get("f_order_status")) != "6": continue
    pm = (ot.get("payment_method") or "").lower()
    if pm == "merge": continue
    cbt = norm_ts(ot.get("collect_bill") or ot.get("updated_at"))
    if not cbt or cbt < start_all or cbt > end_all: continue
    bd = business_day_of(cbt)
    amt = f(ot.get("order_amount"))
    if pm == "tab":
        n_tab += 1; day_tab_punched[bd] += amt
        continue  # isTabCredit -> excluded from revenue
    n_fs6 += 1
    day_sales[bd] += amt

rows, mismatches = [], []
tot_fe = tot_be = 0.0
d = datetime.date(2026, 3, 1)
while d <= datetime.date(2026, 5, 31):
    ds = d.isoformat()
    dsj = daily.get(ds, {})
    tp = (dsj.get("paid_revenue_method") or {}).get("tab_payment") or {}
    settle = f(tp.get("Credit Cash")) + f(tp.get("Credit Card")) + f(tp.get("Credit UPI"))
    fe = round(day_sales.get(ds, 0.0) + settle, 2)
    be = round(f(dsj.get("paid_revenue")), 2)
    diff = round(fe - be, 2)
    tot_fe += fe; tot_be += be
    rows.append({"day": ds, "fe_orders": round(day_sales.get(ds, 0.0), 2), "tab_settle": settle,
                 "fe_sales": fe, "be_paid_revenue": be, "diff": diff})
    if abs(diff) > 0.01:
        mismatches.append(rows[-1])
    d += datetime.timedelta(days=1)

report["A_sales_identity"] = {
    "days_checked": len(rows), "days_exact": len(rows) - len(mismatches),
    "mismatch_days": mismatches,
    "total_fe": round(tot_fe, 2), "total_be": round(tot_be, 2),
    "total_diff": round(tot_fe - tot_be, 2),
    "fs6_revenue_orders": n_fs6, "tab_orders_excluded": n_tab,
}

# ════════ B. CR-034 identity: Sold + Credit == old Sold ════════
ca_all = dedupe(load("ca_jan") + load("ca_feb") + load("ca_mar") + load("ca_apr") + load("ca_may"))

def line_value(l):  # insightsService non-comp line totalRevenue
    qty = f(l.get("quantity")); up = f(l.get("unit_price"))
    addon = f(l.get("total_add_on_price")); var = f(l.get("total_variation_price"))
    disc = f(l.get("discount_on_food")); sc = f(l.get("service_charge"))
    tax = f(l.get("gst_tax_amount"))  # VAT-FIX: holds total tax (gst+vat); tax = gst+vat = this
    if str(l.get("complementary")) == "1":
        comp = f(l.get("complementary_price")) or up
        return comp * qty - disc + sc + tax
    return up * qty + addon + var - disc + sc + tax

b_out = {}
for mn, fd_, td_ in MONTHS:
    ds_, de_ = bd_start(fd_), bd_end(td_)
    old_sold = new_sold = credit = 0.0
    old_charges = new_charges = 0.0
    tab_nonfs6_lines = 0; tab_nonfs6_value = 0.0
    n_credit_lines = n_sold_lines = 0
    for w in ca_all:
        ot = w.get("orders_table") or {}
        pm = (ot.get("payment_method") or "").lower()
        if pm == "merge": continue
        ca = norm_ts(ot.get("created_at"))
        if not ca or ca < ds_ or ca > de_: continue  # punch-range gate
        is_paid = str(ot.get("f_order_status")) == "6"
        is_tab = pm == "tab"
        charges = f(ot.get("delivery_charge")) + f(ot.get("tip_amount")) + f(ot.get("round_up"))
        old_has, new_has = False, False
        for l in w.get("order_details_table") or []:
            if not l.get("food_id"): continue
            if str(l.get("food_status")) == "3": continue
            if str(l.get("complementary")) == "1" or l.get("complementary") == 1: continue
            v = line_value(l)
            if is_tab:
                credit += v; n_credit_lines += 1
                if v > 0: new_has = True
                if is_paid:
                    old_sold += v
                    if v > 0: old_has = True
                else:
                    tab_nonfs6_lines += 1; tab_nonfs6_value += v
            elif is_paid:
                old_sold += v; new_sold += v; n_sold_lines += 1
                if v > 0: old_has, new_has = True, True
        if old_has: old_charges += charges
        if new_has: new_charges += charges
    b_out[mn] = {
        "old_sold": round(old_sold + old_charges, 2),
        "new_sold": round(new_sold + (new_charges if False else 0), 2),  # charges split reported separately
        "credit": round(credit, 2),
        "new_sold_plus_credit_lines_only": round(new_sold + credit, 2),
        "old_sold_lines_only": round(old_sold, 2),
        "identity_diff_lines_only": round((new_sold + credit) - old_sold, 2),
        "order_charges_old_dist": round(old_charges, 2),
        "order_charges_new_dist": round(new_charges, 2),
        "charges_dist_diff": round(new_charges - old_charges, 2),
        "tab_nonfs6_lines": tab_nonfs6_lines,
        "tab_nonfs6_value": round(tab_nonfs6_value, 2),
        "sold_lines": n_sold_lines, "credit_lines": n_credit_lines,
    }
report["B_cr034_identity"] = b_out

# ════════ C. CR-031 cancellations ════════
def value_cancelled_line(l):  # mirrors cancellationValuation.valueCancelledLine
    qty = f(l.get("quantity")); up = f(l.get("unit_price"))
    addon = f(l.get("total_add_on_price")); var = f(l.get("total_variation_price"))
    disc = f(l.get("discount_on_food")); sc = f(l.get("service_charge"))
    raw_gst = f(l.get("gst_tax_amount")); vat = f(l.get("vat_tax_amount"))
    tax = raw_gst  # (raw_gst - vat) + vat
    is_comp = str(l.get("complementary")) == "1" or l.get("complementary") == 1
    item_total = (f(l.get("complementary_price")) or up) * qty if is_comp else up * qty + addon + var
    return item_total - disc + sc + tax, qty, is_comp

def is_order_cancel_scope(ot):
    pm = (ot.get("payment_method") or "").lower()
    return str(ot.get("f_order_status")) == "3" or pm in ("cancel", "cancelled")

c_out = {}
for mn, fd_, td_ in MONTHS:
    ds_, de_ = bd_start(fd_), bd_end(td_)
    item_val = 0.0; item_qty = 0.0; item_lines = 0; comp_cancel_lines = 0
    order_scope_orders = 0; ops_count = 0
    ops_total = 0.0; consol_total_for_ops_orders = 0.0; consol_total_all = 0.0
    drift_list = []
    flagged_012612 = None
    for w in ca_all:
        ot = w.get("orders_table") or {}
        pm = (ot.get("payment_method") or "").lower()
        if pm == "merge": continue
        lines = w.get("order_details_table") or []
        order_cancel = is_order_cancel_scope(ot)
        # order-scope attribution: order cancel_at (fallback first line cancel_at)
        if order_cancel:
            oca = norm_ts(ot.get("cancel_at")) or next(
                (norm_ts(l.get("cancel_at")) for l in lines if norm_ts(l.get("cancel_at"))), "")
            if oca and ds_ <= oca <= de_:
                order_scope_orders += 1
                consol = sum(value_cancelled_line(l)[0] for l in lines if str(l.get("food_status")) == "3")
                consol_total_all += consol
                ops = next((op for op in (w.get("operations") or [])
                            if (op.get("operation") or "").lower() == "order_cancel"
                            and f(op.get("previous_order_amount")) > 0), None)
                if ops:
                    ops_count += 1
                    opsv = f(ops.get("previous_order_amount"))
                    ops_total += opsv; consol_total_for_ops_orders += consol
                    if abs(opsv - consol) > 1:
                        drift_list.append({"order": ot.get("restaurant_order_id") or ot.get("id"),
                                           "ops": opsv, "lines": round(consol, 2)})
                roid = str(ot.get("restaurant_order_id") or "")
                if roid.endswith("012612"):
                    flagged_012612 = {"order_amount": f(ot.get("order_amount")), "cancel_at": oca}
        # item-scope cancelled lines by cancel_at (only when NOT order-scope, per S9 split)
        for l in lines:
            if str(l.get("food_status")) != "3": continue
            lca = norm_ts(l.get("cancel_at"))
            if not lca or lca < ds_ or lca > de_: continue
            v, q, is_comp = value_cancelled_line(l)
            if not order_cancel:
                item_val += v; item_qty += q; item_lines += 1
                if is_comp: comp_cancel_lines += 1
    c_out[mn] = {
        "item_scope": {"lines": item_lines, "qty": item_qty, "value": round(item_val, 2),
                       "comp_cancel_lines": comp_cancel_lines},
        "order_scope": {"orders": order_scope_orders,
                        "ops_coverage": f"{ops_count}/{order_scope_orders}",
                        "ops_valued_total": round(ops_total, 2),
                        "line_consol_same_orders": round(consol_total_for_ops_orders, 2),
                        "line_consol_all_orders": round(consol_total_all, 2),
                        "ops_vs_lines_drift_orders": drift_list[:8],
                        "drift_orders_count": len(drift_list)},
        "order_012612_in_range": flagged_012612,
    }
report["C_cr031_cancellations"] = c_out

json.dump(report, open(f"{D}/reconciliation_results.json", "w"), indent=2)

# console summary
A = report["A_sales_identity"]
print(f"A. SALES IDENTITY: {A['days_exact']}/{A['days_checked']} days exact · total diff Rs{A['total_diff']}")
for m in A["mismatch_days"][:12]:
    print(f"   MISMATCH {m['day']}: FE {m['fe_sales']} vs BE {m['be_paid_revenue']} (diff {m['diff']}) [orders {m['fe_orders']} + settle {m['tab_settle']}]")
print("B. CR-034 IDENTITY (Sold+Credit vs old Sold):")
for mn, v in b_out.items():
    print(f"   {mn}: oldSold {v['old_sold_lines_only']} · newSold {v['new_sold']} · credit {v['credit']} · diff {v['identity_diff_lines_only']} · nonFS6-TAB lines {v['tab_nonfs6_lines']} (Rs{v['tab_nonfs6_value']}) · charge-dist diff {v['charges_dist_diff']}")
print("C. CR-031 CANCELLATIONS:")
for mn, v in c_out.items():
    i, o = v["item_scope"], v["order_scope"]
    print(f"   {mn}: item-scope {i['lines']} lines / qty {i['qty']} / Rs{i['value']} (comp-cancels {i['comp_cancel_lines']}) · order-scope {o['orders']} orders, ops {o['ops_coverage']}, ops Rs{o['ops_valued_total']} vs lines Rs{o['line_consol_same_orders']}, drift orders {o['drift_orders_count']}")
    if v["order_012612_in_range"]: print(f"   !! 012612 in range: {v['order_012612_in_range']}")
print("saved -> reconciliation_results.json")
