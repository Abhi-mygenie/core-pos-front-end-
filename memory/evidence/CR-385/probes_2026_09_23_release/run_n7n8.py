#!/usr/bin/env python3
"""CR-385 P5 §5.4 re-run of probes_2026_09_20_n7n8/run_n7n8.py (matrix 16 live, 32): N7 early check-in guard → 422; N8 extend_rate_mode calendar 17500 / held 18700."""
import os; os.environ.setdefault("PROBE_RUN", "n7n8")
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

try:
    print("== 0 defaults"); settings_get("s0")
    print("== 0b board (room %d must be free)" % ROOM); bd = board(); print("  ", bd.get(ROOM), "| in-house:", {k: v for k, v in bd.items() if v[0] and v[0].startswith("occupied")})
    print("== 1 invalid mode -> 422"); settings_set("s1_bogus", {"extend_rate_mode": "bogus"})
    print("== 1b raw JSON body (should be ignored per backend)"); save("s1b_rawjson", s.post(f"{H}/api/v2/vendoremployee/restaurant-settings/update-settings", json={"basic": {"allow_early_checkin": True}}), 0); settings_get("s1b")
    print("== 2 CM rates"); c, b = save("s2_rates", s.post(f"{H}/api/v2/vendoremployee/aiosell/fetch-rates", json={"start_date": CIN, "end_date": COUT2}), 0)
    for u in b["data"]["aiosell"]["body"]["updates"]:
        for r in u["rates"]:
            if r.get("rateplanCode") == PLAN: print("  ", u["startDate"], r["rate"])

    stamp = time.strftime("%H%M%S")
    print("== 3 N7 block (early OFF, calendar)"); settings_set("s3_defaults", {"allow_early_checkin": False, "extend_rate_mode": "calendar"})
    P1 = "98765" + stamp; R1, B1 = create("s3", "P5 QA N7 Guest", P1)
    c, b = checkin("s3_block", "P5 QA N7 Guest", P1, R1, B1); print("  N7 blocked:", c == 422, "| msg:", b.get("error") or b.get("message"))
    print("  charge after failed check-in (must be untouched):", lr_charge(R1))
    print("== 4 N7 allow -> 200, then N8 calendar extend -> 17500"); settings_set("s4_allow", {"allow_early_checkin": True})
    c, b = checkin("s4_ok", "P5 QA N7 Guest", P1, R1, B1); O1 = (b.get("data") or {}).get("order_id"); ch = (b.get("data") or {}).get("charge") or {}
    print("  check-in 200:", c == 200, "| order", O1, "| booking_charge", ch.get("booking_charge"), "rate", ch.get("rate_per_night"), "upgrade", ch.get("upgrade_amount"))
    c, ch = extend("s4_cal", O1, "N8 calendar"); print("  LR charge after extend:", lr_charge(R1))
    tab("s4", O1, lr_charge(R1).get("balance_due"), "P5 QA N7 Guest", P1); print("  board after TAB:", board().get(ROOM))

    print("== 5 N8 held extend -> 18700"); settings_set("s5_held", {"allow_early_checkin": True, "extend_rate_mode": "held"})
    P2 = "98772" + stamp; R2, B2 = create("s5", "P5 QA N8 Held Guest", P2)
    c, b = checkin("s5", "P5 QA N8 Held Guest", P2, R2, B2); O2 = (b.get("data") or {}).get("order_id"); print("  check-in", c, "order", O2)
    c, ch = extend("s5_held", O2, "N8 held"); print("  LR charge after extend:", lr_charge(R2))
    tab("s5", O2, lr_charge(R2).get("balance_due"), "P5 QA N8 Held Guest", P2); print("  board after TAB:", board().get(ROOM))
    print("== 6 restore defaults"); settings_set("s6_restore", {"allow_early_checkin": False, "extend_rate_mode": "calendar", "auto_print_checkin_receipt": False}); settings_get("s6")
finally:
    cleanup()
