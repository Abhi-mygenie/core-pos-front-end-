#!/usr/bin/env python3
"""CR-385 final-pack extras: OD-385-18 split_payments · X-05 zero-night · G4-03(d) shorten · M6-04 second TAB · settings toggle for gate4 step 3."""
import json, os, sys, requests
H="https://preprod.mygenie.online"; D=os.path.dirname(os.path.abspath(__file__))
s=requests.Session()
tok=s.post(f"{H}/api/v1/auth/vendoremployee/common-login", json={"email":"owner@thegoankitchen.com","password":os.environ["PMS_PW"]}, headers={"X-localization":"en"}).json()["token"]
s.headers.update({"Authorization":f"Bearer {tok}","Accept":"application/json","X-localization":"en"})
def save(name,r,show=500):
    try: body=r.json()
    except Exception: body={"_raw":r.text[:1500]}
    json.dump({"http":r.status_code,"body":body},open(f"{D}/{name}.json","w"),indent=1,default=str)
    print(f"[{name}] HTTP {r.status_code} :: {json.dumps(body,default=str)[:show]}"); return r.status_code,body
def settings_set(tag,d):
    return save(f"{tag}_set",s.post(f"{H}/api/v2/vendoremployee/restaurant-settings/update-settings",files={"data":(None,json.dumps({"basic":d}))}),200)
RES=f"{H}/api/v2/vendoremployee/aiosell/direct-reservation"; LR=f"{H}/api/v2/vendoremployee/aiosell/local-reservations"
step=sys.argv[1]
if step=="allow_on":  settings_set("x0_allow_on",{"allow_early_checkin":True})
if step=="restore":   settings_set("x9_restore",{"allow_early_checkin":False,"extend_rate_mode":"calendar","auto_print_checkin_receipt":False}); save("x9_profile",s.get(f"{H}/api/v1/vendoremployee/profile"),0); p=json.load(open(f"{D}/x9_profile.json"))["body"]["restaurants"][0]["settings"]; print("  settings now:",{k:p.get(k) for k in ("allow_early_checkin","extend_rate_mode","auto_print_checkin_receipt")})
if step=="split":
    # OD-385-18: split_payments[] on direct-reservation advance (MASTER L133-134 proposed shape)
    c,b=save("x1_split_advance",s.post(RES,json={"guest":{"name":"Split Probe","phone":"9876500201"},"checkin":"2026-10-20","checkout":"2026-10-21","adults":2,"children":0,
        "rooms":[{"room_code":"executive","rateplan_code":"executive-s-ep","rooms_count":1}],
        "advance":{"amount":1000,"method":"split","reference":"","split_payments":[{"method":"card","amount":600,"transaction_id":"4321"},{"method":"upi","amount":400}]}}))
    res=((b.get("data") or {}).get("reservation") or {}); rid=res.get("id")
    print("  charge:",res.get("charge"))
    if rid:
        r=s.get(LR,params={"start_date":"2026-10-01","end_date":"2026-10-31","view":"all"}).json()["data"]["reservations"]
        me=[x for x in r if x["id"]==rid]; json.dump(me,open(f"{D}/x1_lr_row.json","w"),indent=1)
        print("  LR row charge:",me[0]["charge"] if me else None, "| advance keys in row:",[k for k in (me[0].keys() if me else []) if "adv" in k or "pay" in k])
        # X-05 zero-night on this pending row: PATCH checkout=checkin preview
        save("x2_zero_night_preview",s.patch(f"{LR}/{rid}",json={"checkin":"2026-10-20","checkout":"2026-10-20","reason":"probe","preview":True}))
        # preview:true sanity (should not persist): PATCH +1 night preview then re-read
        save("x2b_preview_plus1",s.patch(f"{LR}/{rid}",json={"checkout":"2026-10-22","reason":"probe","preview":True}))
        r2=[x for x in s.get(LR,params={"start_date":"2026-10-01","end_date":"2026-10-31","view":"all"}).json()["data"]["reservations"] if x["id"]==rid]
        print("  after preview, checkout still:",r2[0]["checkout"] if r2 else None)
        save("x1_cancel",s.post(f"{LR}/{rid}/cancel",json={"reason":"probe","cancelled_by":"probe","notify_cm":True}))
if step=="shorten":
    ids=json.load(open(f"{D}/ids.json")); O=int(ids["ORDER_ID"]); R=ids["RES_ID"]
    # G4-03(d): shorten back by one night (COUT2 -> COUT) — expect held math, no re-pricing, 200 or a clear 4xx
    save("x3_shorten",s.post(f"{H}/api/v2/vendoremployee/pos/room-extend-stay",json={"order_id":O,"new_checkout_date":sys.argv[2],"reason":"probe shorten"}))
    r=[x for x in s.get(LR,params={"start_date":"2026-10-01","end_date":"2026-10-31","view":"all"}).json()["data"]["reservations"] if x["id"]==R]
    print("  LR after shorten:",r[0]["checkout"] if r else None, r[0]["charge"] if r else None)
    # re-extend to COUT2 so gate4 step 6 balance assumptions hold
    save("x3b_reextend",s.post(f"{H}/api/v2/vendoremployee/pos/room-extend-stay",json={"order_id":O,"new_checkout_date":sys.argv[3],"reason":"probe re-extend"}))
    r=[x for x in s.get(LR,params={"start_date":"2026-10-01","end_date":"2026-10-31","view":"all"}).json()["data"]["reservations"] if x["id"]==R]
    print("  LR after re-extend:",r[0]["checkout"], r[0]["charge"]); ids["BALANCE_DUE"]=r[0]["charge"]["balance_due"]; json.dump(ids,open(f"{D}/ids.json","w"))
if step=="second_tab":
    ids=json.load(open(f"{D}/ids.json")); O=str(ids["ORDER_ID"]); P=ids["PHONE"]
    body={"order_id":O,"payment_mode":"TAB","payment_amount":1,"payment_status":"success","transaction_id":"","billing_auto_bill_print":"No","food_detail":[],"waiter_id":5117,"restaurant_name":"The Goan Kitchen","email":"","order_sub_total_amount":0,"order_sub_total_without_tax":0,"total_gst_tax_amount":0,"gst_tax":0,"vat_tax":0,"grant_amount":1,"order_amount":1,"round_up":0,"service_tax":0,"service_gst_tax_amount":0,"tip_amount":0,"tip_tax_amount":0,"delivery_charge":0,"self_discount":0,"discount_for":None,"coupon_code":"","coupon_discount":0,"coupon_title":"","coupon_type":"","comm_discount":0,"discount_type":"","order_discount_type":"Percent","discount_value":0,"discount_member_category_id":0,"discount_member_category_name":"","used_loyalty_point":0,"loyalty_points_used":0,"loyalty_discount":0,"loyalty_redemption_id":None,"use_wallet_balance":0,"paid_room":"yes","usage_id":"","cust_name":"Gate4 Guest","cust_mobile":P,"cust_membership_id":"","name":"Gate4 Guest","mobile":P,"crm_customer_id":"","custGST":"","custGSTName":""}
    save("x4_second_tab",s.post(f"{H}/api/v2/vendoremployee/order/order-bill-payment",json=body))
