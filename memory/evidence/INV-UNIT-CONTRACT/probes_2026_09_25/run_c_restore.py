import os; os.environ["PROBE_RUN"]="c"
from _common import *
def rb(tag, ID):
    _, rows = stock(); r = slim(row(rows, ID)); print(f"  readback[{tag}] #{ID} {r['stock_title']} qty={r['quantity']} cal={r['cal_quantity']} disp={r['display_qty']} {r['display_unit']} text='{r['display_qty_text']}' physical_qty={r['physical_qty']}"); json.dump(r, open(f"{D}/c_{tag}_readback.json","w"), indent=1); return r
def recount(tag, ID, unit, q):
    return save(tag, s.post(f"{H}/api/v2/vendoremployee/inventory/add-stock/{ID}", json={"quantity":0,"unit":unit,"physicalqty_master":True,"physical_qty":q,"waste_reason":f"PROBE {tag}","wastage_reason_id":None,"notes":""}), 300)
# C1 restore probe item 20326 → 9.75 pkt (7800 gm)
recount("c1_restore_20326", 20326, "pkt", 9.75); rb("c1", 20326)
# C2 repair ANGARA GREAVY (corrupted 2,300,000 gm by base-number+pkt-label) → 9.4 pkt = 4700 gm
rb("c2_before", 20320); recount("c2_repair_angara", 20320, "pkt", 9.4); rb("c2_after", 20320)
# C3 sub-recipe rows present?
_, rows = stock(); subs=[slim(r) for r in rows if r.get("is_sub_recipe")]; print("sub-recipe rows:", len(subs)); [print(json.dumps(x,default=str)[:400]) for x in subs[:5]]
