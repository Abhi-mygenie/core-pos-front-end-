#!/usr/bin/env python3
"""Validate BE reply d15-16_reply (2026-09-20): D15 shorten · D16 move · BQ-385-20 split. Settles + restores."""
import json, os, sys, time, requests
H="https://preprod.mygenie.online"; D=os.path.dirname(os.path.abspath(__file__))
CIN,COUT,COUT2="2026-10-10","2026-10-11","2026-10-12"; ROOM,ROOM2=int(sys.argv[1]),int(sys.argv[2])
s=requests.Session()
tok=s.post(f"{H}/api/v1/auth/vendoremployee/common-login",json={"email":"owner@thegoankitchen.com","password":os.environ["PMS_PW"]},headers={"X-localization":"en"}).json()["token"]
s.headers.update({"Authorization":f"Bearer {tok}","Accept":"application/json","X-localization":"en"})
def save(n,r,show=0):
    try: b=r.json()
    except Exception: b={"_raw":r.text[:1500]}
    json.dump({"http":r.status_code,"body":b},open(f"{D}/{n}.json","w"),indent=1,default=str); print(f"[{n}] HTTP {r.status_code} {json.dumps(b,default=str)[:show]}"); return b
def setb(tag,d): return save(tag,s.post(f"{H}/api/v2/vendoremployee/restaurant-settings/update-settings",files={"data":(None,json.dumps({"basic":d}))}))
def lr(rid):
    r=[x for x in s.get(f"{H}/api/v2/vendoremployee/aiosell/local-reservations",params={"start_date":"2026-10-01","end_date":"2026-10-31","view":"all"}).json()["data"]["reservations"] if x["id"]==rid]; return r[0] if r else None
def ch(c): return {k:c.get(k) for k in ("nights","rate_per_night","booking_charge","sgst","cgst","total_with_gst","advance_payment","balance_due")}
def board(): return {r["restaurant_table_id"]:(r["display_status"],(r.get("guest") or {}).get("name")) for r in s.get(f"{H}/api/v2/vendoremployee/aiosell/room-status-board").json()["data"]["rooms"]}
print("board before:",board())
setb("s0_settings",{"allow_early_checkin":True,"extend_rate_mode":"calendar"})
PH="98781"+time.strftime("%H%M%S")[:5]
b=save("s1_direct",s.post(f"{H}/api/v2/vendoremployee/aiosell/direct-reservation",json={"guest":{"name":"D15D16 Guest","phone":PH},"checkin":CIN,"checkout":COUT,"adults":2,"children":0,"rooms":[{"room_code":"executive","rateplan_code":"executive-s-ep","rooms_count":1}],"advance":{"amount":1000,"method":"upi","reference":"D1516"}}))
res=b["data"]["reservation"]; RID,BID=res["id"],res["booking_id"]; print(" RES",RID,"charge",ch(res["charge"]))
f={k:(None,str(v)) for k,v in {"phone":PH,"name":"D15D16 Guest","email":"","booking_type":"Direct","booking_for":"Individual","booking_details":"","booking_id":BID,"aiosell_reservation_id":RID,"id_type":"Aadhaar","room_id[]":ROOM,"checkin_date":CIN,"checkout_date":COUT,"order_amount":0,"room_price":0,"advance_payment":0,"balance_payment":0,"gst_tax":0,"total_adult":2,"total_children":0,"payment_method":"Cash","name2":"","id_type2":"","name3":"","id_type3":"","name4":"","id_type4":"","firm_name":"","firm_gst":"","upgrade_type":"paid","upgrade_amount":1500,"upgrade_reason":"d15d16"}.items()}
b=save("s2_checkin",s.post(f"{H}/api/v1/vendoremployee/pos/user-group-check-in",files=f)); O=b["data"]["order_id"]; print(" ORDER",O,"charge",b["data"].get("charge"))
EXT=f"{H}/api/v2/vendoremployee/pos/room-extend-stay"
b=save("s3_extend",s.post(EXT,json={"order_id":O,"new_checkout_date":COUT2,"reason":"d15 extend"})); c=b["data"]["charge"]; print(" EXTEND",ch(c),"\n  nights_detail",c.get("nights_detail")); print("  LR",ch(lr(RID)["charge"]))
b=save("s4_move",s.post(EXT,json={"order_id":O,"new_checkout_date":COUT2,"new_restaurant_table_id":ROOM2,"reason":"d16 move"})); c=b["data"]["charge"]; print(" MOVE(D16)",ch(c),"\n  nights_detail",c.get("nights_detail")); l=lr(RID); print("  LR",ch(l["charge"]),"room",l["rooms"][0]["restaurant_table_id"]); print("  board:",board().get(ROOM),board().get(ROOM2))
b=save("s5_shorten",s.post(EXT,json={"order_id":O,"new_checkout_date":COUT,"reason":"d15 shorten"})); c=b["data"]["charge"]; print(" SHORTEN(D15)",ch(c),"\n  nights_detail",c.get("nights_detail")); l=lr(RID); print("  LR",ch(l["charge"]),"checkout",l["checkout"])
b=save("s6_reextend",s.post(EXT,json={"order_id":O,"new_checkout_date":COUT2,"reason":"d15 reextend"})); c=b["data"]["charge"]; print(" REEXTEND",ch(c),"\n  nights_detail",c.get("nights_detail")); l=lr(RID); print("  LR",ch(l["charge"]),"checkout",l["checkout"]); BAL=l["charge"]["balance_due"]
# BQ-20 split confirm (separate reservation, then cancel)
b=save("s7_split",s.post(f"{H}/api/v2/vendoremployee/aiosell/direct-reservation",json={"guest":{"name":"BQ20 Split","phone":"98780"+time.strftime("%M%S")+"1"},"checkin":"2026-10-20","checkout":"2026-10-21","adults":2,"children":0,"rooms":[{"room_code":"executive","rateplan_code":"executive-s-ep","rooms_count":1}],"advance":{"amount":1000,"method":"split","split_payments":[{"method":"card","amount":600,"transaction_id":"4321"},{"method":"upi","amount":400}]}}))
r7=b["data"]["reservation"]; print(" SPLIT advance_payment",r7["charge"]["advance_payment"],"| 'split' in echo:", "split" in json.dumps(b)); save("s7_cancel",s.post(f"{H}/api/v2/vendoremployee/aiosell/local-reservations/{r7['id']}/cancel",json={"reason":"BQ20 unused","cancelled_by":"probe","notify_cm":True}))
# bad sum split (validation claim)
b=save("s7b_split_badsum",s.post(f"{H}/api/v2/vendoremployee/aiosell/direct-reservation",json={"guest":{"name":"BQ20 Bad","phone":"98780"+time.strftime("%M%S")+"2"},"checkin":"2026-10-20","checkout":"2026-10-21","adults":2,"children":0,"rooms":[{"room_code":"executive","rateplan_code":"executive-s-ep","rooms_count":1}],"advance":{"amount":1000,"method":"split","split_payments":[{"method":"card","amount":600},{"method":"upi","amount":100}]}}),200)
rb=((b.get("data") or {}).get("reservation") or {}).get("id")
if rb: save("s7b_cancel",s.post(f"{H}/api/v2/vendoremployee/aiosell/local-reservations/{rb}/cancel",json={"reason":"BQ20 unused","cancelled_by":"probe","notify_cm":True}))
# settle
body={"order_id":str(O),"payment_mode":"TAB","payment_amount":BAL,"payment_status":"success","transaction_id":"","billing_auto_bill_print":"No","food_detail":[],"waiter_id":5118,"restaurant_name":"The Goan Kitchen","email":"","order_sub_total_amount":0,"order_sub_total_without_tax":0,"total_gst_tax_amount":0,"gst_tax":0,"vat_tax":0,"grant_amount":BAL,"order_amount":BAL,"round_up":0,"service_tax":0,"service_gst_tax_amount":0,"tip_amount":0,"tip_tax_amount":0,"delivery_charge":0,"self_discount":0,"discount_for":None,"coupon_code":"","coupon_discount":0,"coupon_title":"","coupon_type":"","comm_discount":0,"discount_type":"","order_discount_type":"Percent","discount_value":0,"discount_member_category_id":0,"discount_member_category_name":"","used_loyalty_point":0,"loyalty_points_used":0,"loyalty_discount":0,"loyalty_redemption_id":None,"use_wallet_balance":0,"paid_room":"yes","usage_id":"","cust_name":"D15D16 Guest","cust_mobile":PH,"cust_membership_id":"","name":"D15D16 Guest","mobile":PH,"crm_customer_id":"","custGST":"","custGSTName":""}
save("s8_tab",s.post(f"{H}/api/v2/vendoremployee/order/order-bill-payment",json=body),120); l=lr(RID); print(" after TAB:",l["operational_status"],ch(l["charge"]))
setb("s9_restore",{"allow_early_checkin":False,"extend_rate_mode":"calendar","auto_print_checkin_receipt":False})
p=s.get(f"{H}/api/v1/vendoremployee/profile").json()["restaurants"][0]["settings"]; print(" settings:",{k:p.get(k) for k in ("allow_early_checkin","extend_rate_mode","auto_print_checkin_receipt")}); print("board after:",board())
