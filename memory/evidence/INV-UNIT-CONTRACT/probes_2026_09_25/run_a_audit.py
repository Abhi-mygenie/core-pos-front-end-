import os; os.environ["PROBE_RUN"]="a"
from _common import *
ID = 20326  # UAT VIS SPICE PKT — pkt/gm @800
def rb(tag):
    _, rows = stock(); r = slim(row(rows, ID)); print(f"  readback[{tag}] qty={r['quantity']} cal={r['cal_quantity']} disp={r['display_qty']} {r['display_unit']} text='{r['display_qty_text']}' physical_qty={r['physical_qty']}"); json.dump(r, open(f"{D}/a_{tag}_readback.json","w"), indent=1); return r
def add_stock(tag, body):
    return save(tag, s.post(f"{H}/api/v2/vendoremployee/inventory/add-stock/{ID}", json=body))
base = rb("s0_baseline")
# A1: display unit + display qty equal to current → expect unchanged 7800
add_stock("a1_pkt_equal", {"quantity":0,"unit":"pkt","physicalqty_master":True,"physical_qty":9.75,"waste_reason":"PROBE A1 unit-contract","wastage_reason_id":None,"notes":""}); rb("a1")
# A2: display unit, whole number 9 → expect 7200
add_stock("a2_pkt_9", {"quantity":0,"unit":"pkt","physicalqty_master":True,"physical_qty":9,"waste_reason":"PROBE A2 unit-contract","wastage_reason_id":None,"notes":""}); rb("a2")
# A3: base unit gm, 7800 → expect 7800 (does backend honour small_unit?)
add_stock("a3_gm_7800", {"quantity":0,"unit":"gm","physicalqty_master":True,"physical_qty":7800,"waste_reason":"PROBE A3 unit-contract","wastage_reason_id":None,"notes":""}); rb("a3")
# A4: display unit decimal 9.5 → expect 7600
add_stock("a4_pkt_9p5", {"quantity":0,"unit":"pkt","physicalqty_master":True,"physical_qty":9.5,"waste_reason":"PROBE A4 unit-contract","wastage_reason_id":None,"notes":""}); rb("a4")
# A5: empty unit → what does backend assume?
add_stock("a5_unit_empty", {"quantity":0,"unit":"","physicalqty_master":True,"physical_qty":9,"waste_reason":"PROBE A5 unit-contract","wastage_reason_id":None,"notes":""}); rb("a5")
# A6: unknown unit → 422 or fallback?
add_stock("a6_unit_bogus", {"quantity":0,"unit":"xyz","physicalqty_master":True,"physical_qty":9,"waste_reason":"PROBE A6 unit-contract","wastage_reason_id":None,"notes":""}); rb("a6")
# A7: unit case variant
add_stock("a7_unit_PKT_upper", {"quantity":0,"unit":"PKT","physicalqty_master":True,"physical_qty":9.25,"waste_reason":"PROBE A7 unit-contract","wastage_reason_id":None,"notes":""}); rb("a7")
# A8: physicalqty_master omitted (sub-recipe style body) → still recount?
add_stock("a8_no_master_flag", {"quantity":0,"unit":"pkt","physical_qty":9.75,"waste_reason":"PROBE A8 unit-contract","wastage_reason_id":None,"notes":""}); rb("a8")
# restore to baseline 9.75 pkt
add_stock("a9_restore", {"quantity":0,"unit":"pkt","physicalqty_master":True,"physical_qty":9.75,"waste_reason":"PROBE restore","wastage_reason_id":None,"notes":""}); rb("a9_final")
