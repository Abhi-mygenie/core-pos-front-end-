#!/usr/bin/env python3
"""Replicates each Insights report's exact frontend aggregation logic on raw
/order-logs-report payloads for The Palm House (rid 541) and cross-compares.
Mirrors /app/frontend/src logic:
  - orderLedgerService.js + SalesMockup/PaymentsMockup (Sales, Payments, Ledger)
  - AllOrdersReportPage TAB_FILTERS.paid (Ledger Paid tab)
  - insightsService.getItemSalesAggregated (Items & Menu)
  - insightsService.getDashboardAggregated (Dashboard)
  - CancellationsMockup (Cancellations)
Run: python3 analyze.py
"""
import json, os
from collections import defaultdict

D = os.path.dirname(os.path.abspath(__file__))
MONTHS = [("mar","2026-03-01","2026-03-31"),("apr","2026-04-01","2026-04-30"),
          ("may","2026-05-01","2026-05-31"),("jun","2026-06-01","2026-06-10")]

def f(v):
    try: return float(v or 0)
    except (ValueError, TypeError): return 0.0

def load(name, sort):
    return json.load(open(f"{D}/orders_{name}_{sort}.json"))["order"]

# Business day: palmhouse schedules = 06:00 -> 03:00(+1) every day
def bd_range(from_date, to_date):
    start = f"{from_date} 06:00:00"
    y,m,d = map(int, to_date.split("-"))
    import datetime
    nxt = (datetime.date(y,m,d)+datetime.timedelta(days=1)).isoformat()
    end = f"{nxt} 03:00:00"
    return start, end

def bd_filter(wrappers, from_date, to_date):
    start, end = bd_range(from_date, to_date)
    out=[]
    for w in wrappers:
        ot = w.get("orders_table") or {}
        ca = (ot.get("created_at") or "").replace("T"," ")[:19]
        if not ca: continue
        if start <= ca <= end and f"{from_date} 00:00:00" <= ca:  # range mode: ca>=dayStart and ca<=dayEnd (+inRange for ledger)
            out.append(w)
    return out

def is_room(ot):
    return ot.get("order_in") in ("RM","SRM") or (ot.get("payment_method") or "") == "ROOM"

def tab_filter_paid(ot):
    pm = ot.get("payment_method") or ""
    pml = pm.lower()
    ps = ot.get("payment_status") or ""
    fs = ot.get("f_order_status")
    if pm=="Cancel" or pml=="cancelled": return False
    if pm=="Merge" or ps=="Merge": return False
    if pm=="TAB": return False
    if ps=="unpaid": return False
    if pml=="paylater": return False
    if fs==9: return False
    if pml=="transfertoroom": return False
    return fs==6

R = {}  # results

# ============ per-month replication ============
for name, fd_, td_ in MONTHS:
    raw = load(name, "created_at")
    rows = bd_filter(raw, fd_, td_)                       # ledger/sales/cancellations base
    nonroom = [w for w in rows if not is_room(w["orders_table"])]
    m = {}

    # ---- SALES (room-excluded, fStatus===6, totalAmount=order_amount) ----
    sales_rev=sales_cnt=sales_tax=sales_disc=0
    sales_daily=defaultdict(float); sales_pm=defaultdict(float)
    sales_tab_rev=sales_tab_cnt=0; sales_ttr_rev=0  # transferToRoom passing room-exclusion
    zero_amt_paid=0
    for w in nonroom:
        ot=w["orders_table"]
        if ot.get("f_order_status")!=6: continue
        amt=f(ot.get("order_amount"))
        sales_rev+=amt; sales_cnt+=1
        sales_tax+=f(ot.get("total_gst_tax_amount"))+f(ot.get("total_vat_tax_amount"))
        sales_disc+=f(ot.get("restaurant_discount_amount"))+f(ot.get("coupon_discount_amount"))
        sales_daily[(ot.get("created_at") or "")[:10]]+=amt
        pm=(ot.get("payment_method") or "Other")
        pml=pm.lower()
        key = "UPI" if "upi" in pml else "Card" if "card" in pml else "Cash" if "cash" in pml else "TAB" if pml=="tab" else "Partial" if "partial" in pml else pm
        sales_pm[key]+=amt
        if pm=="TAB": sales_tab_rev+=amt; sales_tab_cnt+=1
        if pml=="transfertoroom": sales_ttr_rev+=amt
        if amt==0: zero_amt_paid+=1
    m["sales"]=dict(rev=round(sales_rev), cnt=sales_cnt, tax=round(sales_tax), disc=round(sales_disc),
                    pm={k:round(v) for k,v in sales_pm.items()}, tab_rev=round(sales_tab_rev),
                    tab_cnt=sales_tab_cnt, ttr_rev=round(sales_ttr_rev), zero_amt_paid=zero_amt_paid,
                    daily={k:round(v) for k,v in sorted(sales_daily.items())})

    # ---- LEDGER Paid tab + meta ----
    paid_rev=paid_cnt=0
    for w in nonroom:
        if tab_filter_paid(w["orders_table"]):
            paid_rev+=f(w["orders_table"].get("order_amount")); paid_cnt+=1
    meta_all=sum(f(w["orders_table"].get("order_amount")) for w in nonroom)
    m["ledger"]=dict(paid_rev=round(paid_rev), paid_cnt=paid_cnt, meta_total=round(meta_all), all_rows=len(nonroom))

    # ---- ITEMS & MENU (insightsService: incl rooms, excl Merge) ----
    im_rows=[w for w in rows if (w["orders_table"].get("payment_method") or "").lower()!="merge"]
    sold_rev=0.0; sold_rev_fixed=0.0; sold_tax=0.0; pend_rev=0.0
    mismatch_orders=0; mismatch_delta=0.0
    for w in im_rows:
        ot=w["orders_table"]
        is_paid = str(ot.get("f_order_status") or "")=="6"
        dly=f(ot.get("delivery_charge")); tip=f(ot.get("tip_amount"))
        ro_bug=f(ot.get("round_off"))     # field doesn't exist -> 0 (live bug)
        ro_fix=f(ot.get("round_up"))
        order_sold=0.0; line_revs=[]
        items_sum=0.0
        for line in (w.get("order_details_table") or []):
            qty=f(line.get("quantity")); up=f(line.get("unit_price"))
            addon=f(line.get("total_add_on_price")); var=f(line.get("total_variation_price"))
            disc=f(line.get("discount_on_food")); svc=f(line.get("service_charge"))
            rawgst=f(line.get("gst_tax_amount")); vat=f(line.get("vat_tax_amount"))
            gst=rawgst-vat; tax=gst+vat
            itot=up*qty+addon+var; sub=itot-disc+svc; trev=sub+tax
            cancelled=str(line.get("food_status"))=="3"
            comp=str(line.get("complementary"))=="1" or line.get("complementary")==1
            if not cancelled and not comp:
                items_sum+=trev
                if is_paid:
                    sold_rev+=trev; sold_tax+=tax
                    if trev>0: order_sold+=trev; line_revs.append(trev)
                else:
                    pend_rev+=trev
        # distribute order-level charges
        charges_bug=dly+tip+ro_bug; charges_fix=dly+tip+ro_fix
        if order_sold>0 and line_revs:
            sold_rev+=charges_bug          # what live code adds
            sold_rev_fixed+=charges_fix-charges_bug
        if is_paid and abs(items_sum + dly + tip + ro_fix - f(ot.get("order_amount")))>1 and not is_room(ot):
            mismatch_orders+=1; mismatch_delta+=f(ot.get("order_amount"))-(items_sum+dly+tip+ro_fix)
    m["items"]=dict(sold_rev=round(sold_rev), roundoff_missing=round(sold_rev_fixed),
                    item_tax=round(sold_tax), pending_rev=round(pend_rev),
                    mismatch_orders=mismatch_orders, mismatch_delta=round(mismatch_delta))

    # ---- DASHBOARD (incl rooms, excl Merge, fStatus str '6') ----
    db_rows=im_rows
    db_rev=db_cnt=0; db_pm=defaultdict(float); db_unsettled_tab=0
    db_room_rev=0
    co_cnt=0; co_rev=0.0; ci_cnt=0; ci_rev=0.0
    top_items_basis=0.0
    for w in db_rows:
        ot=w["orders_table"]; items=w.get("order_details_table") or []
        fs=str(ot.get("f_order_status")); amt=f(ot.get("order_amount"))
        if fs=="6":
            db_rev+=amt; db_cnt+=1
            pm=ot.get("payment_method") or "Other"; pml=pm.lower()
            key="UPI" if "upi" in pml else "Card" if "card" in pml else "Cash" if "cash" in pml else "TAB" if pml=="tab" else "Room Transfer" if "transfertoroom" in pml else pm
            db_pm[key]+=amt
            if pml=="tab" and fs!="6": db_unsettled_tab+=amt   # dead code replica
            if is_room(ot): db_room_rev+=amt
        # cancellations (cancel_at within calendar range)
        if fs=="3":
            if any((it.get("cancel_at") or "")[:10] and fd_<=(it.get("cancel_at") or "")[:10]<=td_ for it in items):
                co_cnt+=1; co_rev+=amt
        else:
            for it in items:
                if str(it.get("food_status"))=="3":
                    cd=(it.get("cancel_at") or "")[:10]
                    if cd and fd_<=cd<=td_:
                        ci_cnt+=1; ci_rev+=f(it.get("price"))
        for it in items:
            if str(it.get("food_status"))!="3" and str(it.get("complementary"))!="1" and it.get("complementary")!=1:
                top_items_basis+=f(it.get("price"))
    m["dashboard"]=dict(rev=round(db_rev), cnt=db_cnt, pm={k:round(v) for k,v in db_pm.items()},
                        unsettled_tab=round(db_unsettled_tab), room_rev=round(db_room_rev),
                        cancel_orders=co_cnt, cancel_order_rev=round(co_rev),
                        cancel_items=ci_cnt, cancel_item_rev=round(ci_rev),
                        cancel_total_rev=round(co_rev+ci_rev), top_items_basis=round(top_items_basis))

    # ---- CANCELLATIONS report ----
    c_loss=0.0; c_qty=0; order_scope_qty=0; item_scope_qty=0
    pm_of_cancelled=defaultdict(int)
    big=[]
    for w in im_rows:
        ot=w["orders_table"]; pml=(ot.get("payment_method") or "").lower()
        is_order_cancel_bug = pml=="cancelled"     # live bug: actual value 'cancel'
        if ot.get("f_order_status")==3 or (ot.get("payment_method") or "")=="Cancel":
            pm_of_cancelled[ot.get("payment_method")]+=1
        o_loss=0.0
        for line in (w.get("order_details_table") or []):
            if str(line.get("food_status"))!="3": continue
            qty=f(line.get("quantity")); up=f(line.get("unit_price"))
            addon=f(line.get("total_add_on_price")); var=f(line.get("total_variation_price"))
            disc=f(line.get("discount_on_food")); svc=f(line.get("service_charge"))
            rawgst=f(line.get("gst_tax_amount")); vat=f(line.get("vat_tax_amount"))
            amt=(up*qty+addon+var-disc+svc)+(rawgst-vat)+vat
            c_loss+=amt; c_qty+=int(qty); o_loss+=amt
            if is_order_cancel_bug: order_scope_qty+=int(qty)
            else: item_scope_qty+=int(qty)
        if o_loss>20000:
            big.append((ot.get("restaurant_order_id"), round(o_loss), ot.get("cancellation_reason")))
    m["cancellations"]=dict(loss=round(c_loss), qty=c_qty, order_scope_qty=order_scope_qty,
                            item_scope_qty=item_scope_qty, cancelled_pm=dict(pm_of_cancelled), big=big)

    # ---- TAB / partial / misc enums on full row set ----
    tab_cnt=0; tab_rev=0.0; tab_fs=defaultdict(int)
    enum_cnt=defaultdict(int); merged=0; merged_amt=0.0
    h0003=0
    partial_paid_rev=0.0
    for w in rows:
        ot=w["orders_table"]; pm=ot.get("payment_method") or ""
        enum_cnt[pm]+=1
        if pm=="TAB":
            tab_cnt+=1; tab_rev+=f(ot.get("order_amount")); tab_fs[ot.get("f_order_status")]+=1
        if pm=="Merge" or (ot.get("payment_status") or "")=="Merge":
            merged+=1; merged_amt+=f(ot.get("order_amount"))
        hh=(ot.get("created_at") or "")[11:13]
        if hh in ("00","01","02"): h0003+=1
        if pm.lower()=="partial" and ot.get("f_order_status")==6:
            partial_paid_rev+=f(ot.get("order_amount"))
    m["tab"]=dict(cnt=tab_cnt, rev=round(tab_rev), fs=dict(tab_fs))
    m["enums"]=dict(enum_cnt)
    m["merged"]=dict(cnt=merged, amt=round(merged_amt))
    m["after_midnight_orders"]=h0003
    m["partial_paid_rev"]=round(partial_paid_rev)
    R[name]=m

# ============ June daily: punch-date vs collection-date vs backend ============
jun_cb = load("jun","collect_bill")
cb_daily=defaultdict(float)
for w in jun_cb:
    ot=w["orders_table"]
    if is_room(ot): continue
    if ot.get("f_order_status")!=6: continue
    cbd=(ot.get("collect_bill") or ot.get("updated_at") or "")[:10]
    cb_daily[cbd]+=f(ot.get("order_amount"))
ds=json.load(open(f"{D}/daily_sales.json"))
st=json.load(open(f"{D}/settlement.json"))
st_daily={}
for mn in st:
    for day in st[mn].get("data",[]):
        t=day.get("totals") or {}
        st_daily[day["date"]]=f(t.get("total_sale"))
jun_cmp=[]
for d_ in [f"2026-06-{i:02d}" for i in range(1,11)]:
    b=ds.get(d_,{})
    jun_cmp.append(dict(date=d_,
        sales_created=round(R["jun"]["sales"]["daily"].get(d_,0)),
        ledger_collect=round(cb_daily.get(d_,0)),
        backend_paid=round(f(b.get("paid_revenue"))),
        backend_total_sales=round(f(b.get("total_sales"))),
        backend_tab_settled=round(f(b.get("total_tab_payment"))),
        backend_unpaid=round(f(b.get("unpaid_revenue"))),
        backend_cash=round(f(b.get("Cash"))), backend_card=round(f(b.get("Card"))), backend_upi=round(f(b.get("UPI"))),
        settlement_sale=round(st_daily.get(d_,0))))
R["jun_daily_comparison"]=jun_cmp
# spot days
for d_ in ("2026-03-15","2026-04-15","2026-05-15"):
    b=ds.get(d_,{})
    mn={"03":"mar","04":"apr","05":"may"}[d_[5:7]]
    R.setdefault("spot_days",[]).append(dict(date=d_,
        sales_created=round(R[mn]["sales"]["daily"].get(d_,0)),
        backend_paid=round(f(b.get("paid_revenue"))),
        backend_tab_settled=round(f(b.get("total_tab_payment"))),
        settlement_sale=round(st_daily.get(d_,0))))

# settlement monthly totals
R["settlement_totals"]={mn: {k: f(v) for k,v in (st[mn].get("totals") or {}).items() if k in
   ("total_today_collection","total_today_settlement","total_pilferage","total_sale")} for mn in st}

json.dump(R, open(f"{D}/results.json","w"), indent=1)

# ---- print summary ----
for mn,_,_ in MONTHS:
    m=R[mn]
    print(f"\n===== {mn.upper()} =====")
    print(f"Sales rev {m['sales']['rev']:>10,} ({m['sales']['cnt']} orders)  tax {m['sales']['tax']:,}  disc {m['sales']['disc']:,}")
    print(f"  incl TAB {m['sales']['tab_rev']:,} ({m['sales']['tab_cnt']})  transferToRoom {m['sales']['ttr_rev']:,}  zero-amt paid {m['sales']['zero_amt_paid']}")
    print(f"Ledger Paid {m['ledger']['paid_rev']:>8,} ({m['ledger']['paid_cnt']})   meta_total {m['ledger']['meta_total']:,} over {m['ledger']['all_rows']} rows")
    print(f"Items sold {m['items']['sold_rev']:>9,}  (round-off missing {m['items']['roundoff_missing']:,}; mismatch orders {m['items']['mismatch_orders']} drift {m['items']['mismatch_delta']:,})  pending {m['items']['pending_rev']:,}")
    print(f"Dashboard rev {m['dashboard']['rev']:>6,} ({m['dashboard']['cnt']})  room part {m['dashboard']['room_rev']:,}  unsettledTAB {m['dashboard']['unsettled_tab']}")
    print(f"  Dash cancels: orders {m['dashboard']['cancel_orders']} rev {m['dashboard']['cancel_order_rev']:,} + items {m['dashboard']['cancel_items']} rev {m['dashboard']['cancel_item_rev']:,} = {m['dashboard']['cancel_total_rev']:,}")
    print(f"Cancellations report loss {m['cancellations']['loss']:,} qty {m['cancellations']['qty']} (order-scope qty matched: {m['cancellations']['order_scope_qty']})  cancelled pm values {m['cancellations']['cancelled_pm']}")
    if m['cancellations']['big']: print(f"  big cancels: {m['cancellations']['big']}")
    print(f"TAB {m['tab']['cnt']} orders {m['tab']['rev']:,} fs={m['tab']['fs']}  Merged {m['merged']['cnt']} ({m['merged']['amt']:,})  after-midnight {m['after_midnight_orders']}")
    print(f"enums {m['enums']}")
    print(f"Sales pm: {m['sales']['pm']}")
    print(f"Dash pm:  {m['dashboard']['pm']}")
print("\n===== JUNE DAILY =====")
for r in R["jun_daily_comparison"]:
    print(r)
print("\nspot:", R["spot_days"])
print("settlement monthly:", R["settlement_totals"])
