import os; os.environ["PROBE_RUN"]="b"
from _common import *
ID = 20326  # UAT VIS SPICE PKT — pkt/gm @800
def rb(tag):
    _, rows = stock(); r = slim(row(rows, ID)); print(f"  readback[{tag}] qty={r['quantity']} cal={r['cal_quantity']} disp={r['display_qty']} {r['display_unit']} text='{r['display_qty_text']}' unit={r['unit']}"); json.dump(r, open(f"{D}/b_{tag}_readback.json","w"), indent=1); return r
vend = s.get(f"{H}/api/v2/vendoremployee/inventory/get-vendor").json(); json.dump(vend, open(f"{D}/b_vendors.json","w"), indent=1, default=str)
vl = vend if isinstance(vend, list) else (vend.get("data") if isinstance(vend.get("data"), list) else ((vend.get("data") or {}).get("data") or []))
VID = vl[0]["id"] if vl else None; VNAME = (vl[0].get("name") or vl[0].get("vendor_name")) if vl else "PROBE VENDOR"
print("vendor used:", VID, VNAME)
def purchase(tag, unit, qty, rate=1):
    body = {"vendor_name": VNAME, "vendor_id": VID, "purchase_date": "25-09-2026", "payment_type": "Cash", "invoice_number": f"PROBE-{tag}",
            "tot_amount": qty*rate, "item_total": qty*rate, "tot_fair": 0, "tot_tax": 0,
            "partial_payments": [{"payment_mode": "Cash", "amount": qty*rate}],
            "purchase_items": [{"Ingredient": ID, "Unit": unit, "quantity": qty, "rate": rate, "Amount": qty*rate, "batch": "", "expiry_date": "", "origin": "planner"}]}
    return save(tag, s.post(f"{H}/api/v2/vendoremployee/inventory/add-purchase", json=body), 700)
rb("s0_baseline")
purchase("b1_pkt_1", "pkt", 1); rb("b1")            # expect +800 gm → 8600
purchase("b2_gm_100", "gm", 100); rb("b2")          # expect +100 gm → 8700 (does base unit work / flip display?)
purchase("b3_pkt_1p5", "pkt", 1.5); rb("b3")        # expect +1200 → 9900
purchase("b4_unit_bogus", "xyz", 1); rb("b4")       # expect 422
purchase("b5_PKT_upper", "PKT", 1); rb("b5")        # case
