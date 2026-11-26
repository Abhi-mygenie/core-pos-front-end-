#!/usr/bin/env python3
"""CR-385 P5 §5.4 re-run of probes_2026_09_20_gate4/run_gate4.py (matrix 11, 18, 21): BQ-16 omit-rate, lifecycle booking+advance, check-in paid upgrade, extend, move, TAB.
Deviation vs 09-20 copy: N7 guard is now server-enforced → allow_early_checkin=True set before check-in and restored in finally."""
import os; os.environ.setdefault("PROBE_RUN", "gate4")
import json, time
from _probe_common import H, D, s, CREATED, save, board, lr, folio, settings_set, settings_get, tab, checkin_form, cleanup

CIN, COUT, COUT2 = "2026-10-10", "2026-10-11", "2026-10-12"
TABLE_SUITE, TABLE_DEST = 8525, 8527          # r4 → r5 (QA rooms only)
PHONE = "98765002" + time.strftime("%S")
RES = f"{H}/api/v2/vendoremployee/aiosell/direct-reservation"
EXT = f"{H}/api/v2/vendoremployee/pos/room-extend-stay"

try:
    print("== 0 board / settings"); print("  ", board()); settings_get("s0")
    c, b = save("s0_rates", s.post(f"{H}/api/v2/vendoremployee/aiosell/fetch-rates", json={"start_date": CIN, "end_date": COUT2}), 0)
    for u in b["data"]["aiosell"]["body"]["updates"]:
        print("  ", u["startDate"], [(r.get("rateplanCode"), r["rate"]) for r in u["rates"] if r.get("rateplanCode") in ("executive-s-ep", "suite-s-ep")])

    # §1 BQ-16 omit rate
    c, b = save("s1_bq16_omit_rate", s.post(RES, json={"guest": {"name": "P5 QA BQ16 Guest", "phone": "9876500100"}, "checkin": CIN, "checkout": COUT2, "adults": 2, "children": 0,
                                                  "rooms": [{"room_code": "executive", "rateplan_code": "executive-s-ep", "rooms_count": 1}]}))
    rid = ((b.get("data") or {}).get("reservation") or {}).get("id")
    if rid: CREATED.append(rid); save("s1_cancel", s.post(f"{H}/api/v2/vendoremployee/aiosell/local-reservations/{rid}/cancel", json={"reason": "probe"}))
    # §1b unknown rateplan → 422 (sandbox has rates for Jan 2027, so the "no rates" case uses the unknown-plan variant as in 09-20)
    c, b = save("s1b_bq16_unknown_plan", s.post(RES, json={"guest": {"name": "P5 QA No Rate Guest", "phone": "9876500999"}, "checkin": "2027-01-01", "checkout": "2027-01-03",
                                                     "rooms": [{"room_code": "executive", "rateplan_code": "does-not-exist", "rooms_count": 1}]}))
    rid = ((b.get("data") or {}).get("reservation") or {}).get("id")
    if rid: CREATED.append(rid); save("s1b_cancel_unexpected", s.post(f"{H}/api/v2/vendoremployee/aiosell/local-reservations/{rid}/cancel", json={"reason": "probe"}))

    # §2 lifecycle booking + advance
    c, b = save("s2_create_advance", s.post(RES, json={"guest": {"name": "P5 QA Gate4 Guest", "phone": PHONE}, "checkin": CIN, "checkout": COUT, "adults": 2, "children": 0,
                                                 "rooms": [{"room_code": "executive", "rateplan_code": "executive-s-ep", "rooms_count": 1}],
                                                 "advance": {"amount": 1000, "method": "upi", "reference": "GATE4ADV"}}))
    res = b["data"]["reservation"]; RES_ID, BOOKING_ID = res["id"], res["booking_id"]; CREATED.append(RES_ID)
    print("RES_ID", RES_ID, "BOOKING_ID", BOOKING_ID, "charge", res.get("charge"))

    # §3 check-in paid upgrade (N7 guard: allow early check-in for the future-dated stay)
    settings_set("s3_allow_early", {"allow_early_checkin": True})
    c, b = save("s3_checkin_upgrade", s.post(f"{H}/api/v1/vendoremployee/pos/user-group-check-in",
                                            files={k: (None, v) for k, v in checkin_form("P5 QA Gate4 Guest", PHONE, RES_ID, BOOKING_ID, TABLE_SUITE, CIN, COUT, "Suite upgrade probe").items()}))
    r, counts = lr(RES_ID); json.dump(r, open(f"{D}/gate4_s3_lr.json", "w"), indent=1)
    ORDER_ID = (b.get("data") or {}).get("order_id") or (r["rooms"][0].get("order_id") if r else None)
    print("ORDER_ID", ORDER_ID, "\nLR after check-in:", json.dumps({k: r.get(k) for k in ["operational_status", "advance_payment", "balance_payment", "charge"]}), "\ncounts", counts)
    f = folio(ORDER_ID); json.dump(f, open(f"{D}/gate4_s3_folio.json", "w"), indent=1); ri = f["orders"][0]["room_info"]
    print("FOLIO room_info:", json.dumps({k: ri.get(k) for k in ["room_price", "gst_tax", "advance_payment", "balance_payment", "order_amount", "payment_mode"]}), "\nsummary:", json.dumps(ri.get("room_payment_summary"))[:600])
    print("BOARD", board())

    # §4 extend +1 night same room, payment 500 cash (D12 same-room self-conflict must be gone)
    save("s4_extend", s.post(EXT, json={"order_id": int(ORDER_ID), "new_checkout_date": COUT2, "reason": "Gate4 extra night", "payment": {"amount": 500, "method": "cash"}}))
    r, _ = lr(RES_ID); print("LR after extend:", json.dumps(r.get("charge")))
    # §5 move r4 → r5 (D13 regression must be gone)
    save("s5_move", s.post(EXT, json={"order_id": int(ORDER_ID), "new_checkout_date": COUT2, "new_restaurant_table_id": TABLE_DEST, "reason": "Gate4 move"}))
    bd = board(); json.dump({str(k): v for k, v in bd.items()}, open(f"{D}/gate4_s5_board.json", "w")); print("BOARD after move", bd)
    r, _ = lr(RES_ID); json.dump(r, open(f"{D}/gate4_s5_lr.json", "w"), indent=1); print("LR after move:", json.dumps(r.get("charge")), r["rooms"][0].get("restaurant_table_id"))
    f = folio(ORDER_ID); json.dump(f, open(f"{D}/gate4_s5_folio.json", "w"), indent=1); ri = f["orders"][0]["room_info"]
    print("FOLIO after move:", json.dumps({k: ri.get(k) for k in ["room_price", "gst_tax", "advance_payment", "balance_payment"]}), json.dumps(ri.get("room_payment_summary"))[:700])
    BAL = r["charge"]["balance_due"]

    # §6 TAB settle, no order_discount key
    tab("s6_no_order_discount", ORDER_ID, BAL, "P5 QA Gate4 Guest", PHONE)
    r, counts = lr(RES_ID); json.dump(r, open(f"{D}/gate4_s6_lr.json", "w"), indent=1)
    print("LR after TAB:", r.get("operational_status"), json.dumps(r.get("charge")), json.dumps({k: r["rooms"][0].get(k) for k in ["line_status", "order_payment_status", "checked_out_at"]}), counts)
    f = folio(ORDER_ID); json.dump(f, open(f"{D}/gate4_s6_folio.json", "w"), indent=1); o = f["orders"][0]; ri = o["room_info"]
    print("ORDER:", json.dumps({k: o.get(k) for k in ["payment_status", "payment_method", "order_status", "order_amount", "collect_bill"]}))
    print("D8 ledger:", json.dumps(ri.get("room_payment_summary"))[:900])
    bd = board(); json.dump({str(k): v for k, v in bd.items()}, open(f"{D}/gate4_s6_board.json", "w")); print("BOARD after TAB", bd)
finally:
    cleanup()
