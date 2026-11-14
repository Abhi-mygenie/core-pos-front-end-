#!/usr/bin/env python3
"""CR-385 P5 §5.4 re-run of probes_2026_09_20_d1516/run_d1516.py 8525 8527 (matrix 20): D15 shorten re-price · D16 move keeps price · BQ-385-20 split contract. Settles + restores."""
import os; os.environ.setdefault("PROBE_RUN", "d1516")
import json, time
from _probe_common import H, D, s, CREATED, save, board, lr, settings_set, tab, checkin_form, cleanup

CIN, COUT, COUT2 = "2026-10-10", "2026-10-11", "2026-10-12"; ROOM, ROOM2 = 8525, 8527   # r4 → r5
EXT = f"{H}/api/v2/vendoremployee/pos/room-extend-stay"; RES = f"{H}/api/v2/vendoremployee/aiosell/direct-reservation"
def ch(c): return {k: c.get(k) for k in ("nights","rate_per_night","booking_charge","sgst","cgst","total_with_gst","advance_payment","balance_due")}
def cancel(tag, rid): return save(tag, s.post(f"{H}/api/v2/vendoremployee/aiosell/local-reservations/{rid}/cancel", json={"reason": "BQ20 unused", "cancelled_by": "probe", "notify_cm": True}))

try:
    print("board before:", board())
    settings_set("s0_settings", {"allow_early_checkin": True, "extend_rate_mode": "calendar"})
    PH = "98781" + time.strftime("%H%M%S")[:5]
    c, b = save("s1_direct", s.post(RES, json={"guest": {"name": "P5 QA D15D16 Guest", "phone": PH}, "checkin": CIN, "checkout": COUT, "adults": 2, "children": 0, "rooms": [{"room_code": "executive", "rateplan_code": "executive-s-ep", "rooms_count": 1}], "advance": {"amount": 1000, "method": "upi", "reference": "D1516"}}), 0)
    res = b["data"]["reservation"]; RID, BID = res["id"], res["booking_id"]; CREATED.append(RID); print(" RES", RID, "charge", ch(res["charge"]))
    c, b = save("s2_checkin", s.post(f"{H}/api/v1/vendoremployee/pos/user-group-check-in", files={k: (None, v) for k, v in checkin_form("P5 QA D15D16 Guest", PH, RID, BID, ROOM, CIN, COUT, "d15d16").items()}), 0)
    O = b["data"]["order_id"]; print(" ORDER", O, "charge", b["data"].get("charge"))
    c, b = save("s3_extend", s.post(EXT, json={"order_id": O, "new_checkout_date": COUT2, "reason": "d15 extend"}), 0); cg = b["data"]["charge"]; print(" EXTEND", ch(cg), "\n  nights_detail", cg.get("nights_detail")); print("  LR", ch(lr(RID)[0]["charge"]))
    c, b = save("s4_move", s.post(EXT, json={"order_id": O, "new_checkout_date": COUT2, "new_restaurant_table_id": ROOM2, "reason": "d16 move"}), 0); cg = b["data"]["charge"]; print(" MOVE(D16)", ch(cg), "\n  nights_detail", cg.get("nights_detail")); l = lr(RID)[0]; print("  LR", ch(l["charge"]), "room", l["rooms"][0]["restaurant_table_id"]); bd = board(); print("  board:", bd.get(ROOM), bd.get(ROOM2))
    c, b = save("s5_shorten", s.post(EXT, json={"order_id": O, "new_checkout_date": COUT, "reason": "d15 shorten"}), 0); cg = b["data"]["charge"]; print(" SHORTEN(D15)", ch(cg), "\n  nights_detail", cg.get("nights_detail")); l = lr(RID)[0]; print("  LR", ch(l["charge"]), "checkout", l["checkout"])
    c, b = save("s6_reextend", s.post(EXT, json={"order_id": O, "new_checkout_date": COUT2, "reason": "d15 reextend"}), 0); cg = b["data"]["charge"]; print(" REEXTEND", ch(cg), "\n  nights_detail", cg.get("nights_detail")); l = lr(RID)[0]; print("  LR", ch(l["charge"]), "checkout", l["checkout"]); BAL = l["charge"]["balance_due"]
    # BQ-20 split confirm (separate reservation, then cancel)
    c, b = save("s7_split", s.post(RES, json={"guest": {"name": "P5 QA BQ20 Split", "phone": "98780" + time.strftime("%M%S") + "1"}, "checkin": "2026-10-20", "checkout": "2026-10-21", "adults": 2, "children": 0, "rooms": [{"room_code": "executive", "rateplan_code": "executive-s-ep", "rooms_count": 1}], "advance": {"amount": 1000, "method": "split", "split_payments": [{"method": "card", "amount": 600, "transaction_id": "4321"}, {"method": "upi", "amount": 400}]}}), 0)
    r7 = b["data"]["reservation"]; CREATED.append(r7["id"]); print(" SPLIT advance_payment", r7["charge"]["advance_payment"], "| 'split' in echo:", "split" in json.dumps(b)); cancel("s7_cancel", r7["id"])
    c, b = save("s7b_split_badsum", s.post(RES, json={"guest": {"name": "P5 QA BQ20 Bad", "phone": "98780" + time.strftime("%M%S") + "2"}, "checkin": "2026-10-20", "checkout": "2026-10-21", "adults": 2, "children": 0, "rooms": [{"room_code": "executive", "rateplan_code": "executive-s-ep", "rooms_count": 1}], "advance": {"amount": 1000, "method": "split", "split_payments": [{"method": "card", "amount": 600}, {"method": "upi", "amount": 100}]}}), 200)
    rb = ((b.get("data") or {}).get("reservation") or {}).get("id")
    if rb: CREATED.append(rb); cancel("s7b_cancel", rb)
    # settle
    tab("s8", O, BAL, "P5 QA D15D16 Guest", PH); l = lr(RID)[0]; print(" after TAB:", l["operational_status"], ch(l["charge"]))
    settings_set("s9_restore", {"allow_early_checkin": False, "extend_rate_mode": "calendar", "auto_print_checkin_receipt": False})
    p = s.get(f"{H}/api/v1/vendoremployee/profile").json()["restaurants"][0]["settings"]; print(" settings:", {k: p.get(k) for k in ("allow_early_checkin", "extend_rate_mode", "auto_print_checkin_receipt")}); print("board after:", board())
finally:
    cleanup()
