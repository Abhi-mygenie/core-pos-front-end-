#!/usr/bin/env python3
"""CR-385 P5 §5.4 re-run of probes_2026_09_20_n11/run_n11.py (matrix 20): per-night GST slab + nights_detail on calendar extend; held control."""
import os; os.environ.setdefault("PROBE_RUN", "n11")
import json, time
from _probe_common import H, D, s, CREATED, save, board, lr, settings_set, settings_get, tab, checkin_form, cleanup

CIN, COUT, COUT2, ROOM = "2026-10-10", "2026-10-11", "2026-10-12", 8525   # r4
PLAN = "executive-s-ep"

def create(tag, name, phone):
    c, b = save(f"{tag}_direct", s.post(f"{H}/api/v2/vendoremployee/aiosell/direct-reservation", json={
        "guest": {"name": name, "phone": phone}, "checkin": CIN, "checkout": COUT, "adults": 2, "children": 0,
        "rooms": [{"room_code": "executive", "rateplan_code": PLAN, "rooms_count": 1}], "advance": {"amount": 1000, "method": "upi", "reference": tag.upper()}}), 300)
    res = b["data"]["reservation"]; CREATED.append(res["id"]); print(f"  RES {res['id']} BOOKING {res['booking_id']} charge {res.get('charge')}"); return res["id"], res["booking_id"]

def checkin(tag, name, phone, res_id, booking_id):
    return save(f"{tag}_checkin", s.post(f"{H}/api/v1/vendoremployee/pos/user-group-check-in", files={k: (None, v) for k, v in checkin_form(name, phone, res_id, booking_id, ROOM, CIN, COUT, f"{tag} suite upgrade").items()}), 500)

def extend(tag, order_id, reason):
    c, b = save(f"{tag}_extend", s.post(f"{H}/api/v2/vendoremployee/pos/room-extend-stay", json={"order_id": int(order_id), "new_checkout_date": COUT2, "reason": reason, "payment": {"amount": 500, "method": "cash"}}), 0)
    ch = ((b.get("data") or {}).get("charge")) or {}
    print(f"  extend HTTP {c} top-level charge? {'charge' in b} data.charge: {({k: ch.get(k) for k in ('nights','rate_per_night','upgrade_amount','booking_charge','sgst','cgst','total_with_gst','advance_payment','balance_due')})}")
    return c, ch

def lr_charge(res_id):
    r, _ = lr(res_id); return r and r.get("charge")

def show(ch):
    print("  charge:", {k: ch.get(k) for k in ("nights","rate_per_night","upgrade_amount","booking_charge","sgst","cgst","total_with_gst","advance_payment","balance_due")})
    nd = ch.get("nights_detail"); print("  nights_detail:", json.dumps(nd))
    return nd

try:
    stamp = time.strftime("%H%M%S")
    print("== 0 defaults + board"); settings_get("s0"); bd = board(); print("  ", ROOM, bd.get(ROOM), "| in-house:", {k: v for k, v in bd.items() if v[0] and v[0].startswith("occupied")})
    print("== 1 CALENDAR: expect per-night slab 8600@18% + 7400@5% + upgrade 1500@18% = GST 2188, nights_detail present")
    settings_set("s1", {"allow_early_checkin": True, "extend_rate_mode": "calendar"})
    P1 = "98773" + stamp; R1, B1 = create("s1", "P5 QA N11 Cal Guest", P1)
    c, b = checkin("s1", "P5 QA N11 Cal Guest", P1, R1, B1); O1 = (b.get("data") or {}).get("order_id"); ch0 = (b.get("data") or {}).get("charge") or {}
    print("  check-in", c, "order", O1, "| charge:", {k: ch0.get(k) for k in ("booking_charge","sgst","cgst","total_with_gst")}, "| nights_detail on check-in:", "nights_detail" in ch0)
    c, ch = extend("s1_cal", O1, "N11 calendar"); nd = show(ch)
    lrc = lr_charge(R1); print("  LR charge:", {k: lrc.get(k) for k in ("booking_charge","sgst","cgst","total_with_gst","rate_per_night","advance_payment","balance_due")}, "| LR has nights_detail:", "nights_detail" in lrc)
    exp = {"booking_charge": 17500, "sgst": 1094, "cgst": 1094, "total_with_gst": 19688}
    print("  MATCH backend claim:", {k: (ch.get(k) == v) for k, v in exp.items()})
    if nd:
        print("  per-night check:", [(n.get("date"), n.get("rate"), n.get("source"), n.get("gst_percent"), n.get("gst")) for n in nd], "| sum gst:", sum(float(n.get("gst") or 0) for n in nd))
    tab("s1", O1, lrc.get("balance_due"), "P5 QA N11 Cal Guest", P1)
    print("== 2 HELD control: expect 18700, GST 18% single-rate 1683+1683, no nights_detail")
    settings_set("s2", {"extend_rate_mode": "held"})
    P2 = "98774" + stamp; R2, B2 = create("s2", "P5 QA N11 Held Guest", P2)
    c, b = checkin("s2", "P5 QA N11 Held Guest", P2, R2, B2); O2 = (b.get("data") or {}).get("order_id"); print("  check-in", c, "order", O2)
    c, ch = extend("s2_held", O2, "N11 held"); show(ch)
    print("  MATCH:", ch.get("booking_charge") == 18700, ch.get("sgst") == 1683, "nights_detail absent:", ch.get("nights_detail") is None)
    tab("s2", O2, lr_charge(R2).get("balance_due"), "P5 QA N11 Held Guest", P2)
    print("== 3 restore"); settings_set("s3_restore", {"allow_early_checkin": False, "extend_rate_mode": "calendar", "auto_print_checkin_receipt": False}); settings_get("s3"); print("  board:", board().get(ROOM))
finally:
    cleanup()
