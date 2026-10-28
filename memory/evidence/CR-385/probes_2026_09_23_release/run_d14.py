#!/usr/bin/env python3
"""CR-385 P5 §5.4 re-run of probes_2026_09_20_n11/run_d14.py (matrix 20): calendar extend + collect-now 500 → charge.advance_payment/balance_due must be fresh in response AND LR (D14)."""
import os; os.environ.setdefault("PROBE_RUN", "d14")
import json, time
from _probe_common import H, D, s, CREATED, save, board, lr, folio, settings_set, tab, checkin_form, cleanup

CIN, COUT, COUT2, ROOM = "2026-10-10", "2026-10-11", "2026-10-12", 8525   # r4
PLAN = "executive-s-ep"

try:
    stamp = time.strftime("%H%M%S")
    print("== D14 repro: calendar extend + collect-now 500 -> is charge.advance_payment/balance_due stale in the response AND in the LR read-back?")
    settings_set("set", {"allow_early_checkin": True, "extend_rate_mode": "calendar"})
    P = "98775" + stamp
    c, b = save("direct", s.post(f"{H}/api/v2/vendoremployee/aiosell/direct-reservation", json={
        "guest": {"name": "P5 QA D14 Guest", "phone": P}, "checkin": CIN, "checkout": COUT, "adults": 2, "children": 0,
        "rooms": [{"room_code": "executive", "rateplan_code": PLAN, "rooms_count": 1}], "advance": {"amount": 1000, "method": "upi", "reference": "D14"}}), 300)
    res = b["data"]["reservation"]; R, B = res["id"], res["booking_id"]; CREATED.append(R); print(f"  RES {R} charge {res.get('charge')}")
    c, b = save("checkin", s.post(f"{H}/api/v1/vendoremployee/pos/user-group-check-in", files={k: (None, v) for k, v in checkin_form("P5 QA D14 Guest", P, R, B, ROOM, CIN, COUT, "d14 suite upgrade").items()}), 500)
    O = (b.get("data") or {}).get("order_id"); ch0 = (b.get("data") or {}).get("charge") or {}
    print("  after check-in: advance", ch0.get("advance_payment"), "balance_due", ch0.get("balance_due"), "total", ch0.get("total_with_gst"))
    c, b = save("cal_extend", s.post(f"{H}/api/v2/vendoremployee/pos/room-extend-stay", json={"order_id": int(O), "new_checkout_date": COUT2, "reason": "D14 repro", "payment": {"amount": 500, "method": "cash"}}), 0)
    ch = (b.get("data") or {}).get("charge") or {}; resv = (b.get("data") or {}).get("reservation") or {}
    print("  extend response: charge.advance_payment", ch.get("advance_payment"), "charge.balance_due", ch.get("balance_due"), "| reservation.advance_payment (legacy)", resv.get("advance_payment"), "| payment_record_id", (b.get("data") or {}).get("payment_record_id"))
    r, _ = lr(R); lrc = r.get("charge"); json.dump(lrc, open(f"{D}/d14_lr_charge_after_extend.json", "w"), indent=1)
    print("  LR read-back: charge.advance_payment", lrc.get("advance_payment"), "balance_due", lrc.get("balance_due"), "total", lrc.get("total_with_gst"))
    f = folio(O); json.dump(f, open(f"{D}/d14_folio_before_tab.json", "w"), indent=1); sm = f["orders"][0]["room_info"]["room_payment_summary"]
    print("  folio ledger before TAB:", [(p["payment_amount"], p["payment_mode"], p.get("payment_type")) for p in sm["payments"]], "total_paid", sm.get("total_paid_amount"))
    true_bal = float(ch.get("total_with_gst")) - sum(float(p["payment_amount"]) for p in sm["payments"])
    print("  true balance =", true_bal, "| charge.balance_due =", ch.get("balance_due"), "| RESPONSE STALE:", float(ch.get("balance_due")) != true_bal, "| LR STALE:", float(lrc.get("balance_due")) != true_bal)
    tab("", O, true_bal, "P5 QA D14 Guest", P)
    settings_set("restore", {"allow_early_checkin": False, "extend_rate_mode": "calendar", "auto_print_checkin_receipt": False}); print("  board:", board().get(ROOM))
finally:
    cleanup()
