#!/usr/bin/env python3
"""
INV-WEB-EDIT-NOTCONFIRM — read-only probe.
Goal: determine whether preprod already emits item-level food_status = 7
(Not-Confirm) and how order-level f_order_status behaves on web-edited orders.
READ-ONLY: login (POST, required for token) + GET order list only. No writes.
"""
import json, os, sys, collections
import urllib.request, urllib.error

BASE = "https://preprod.mygenie.online"
EMAIL = os.environ["PROBE_EMAIL"]
PWD = os.environ["PROBE_PWD"]
OUT = "/app/memory/evidence/INV-WEB-EDIT-NOTCONFIRM-2026-11-17"
os.makedirs(OUT, exist_ok=True)


def call(method, path, body=None, token=None, params=""):
    url = BASE + path + params
    data = json.dumps(body).encode() if body is not None else None
    req = urllib.request.Request(url, data=data, method=method)
    req.add_header("Content-Type", "application/json")
    req.add_header("Accept", "application/json")
    if token:
        req.add_header("Authorization", "Bearer " + token)
    try:
        with urllib.request.urlopen(req, timeout=60) as r:
            return r.status, json.loads(r.read().decode())
    except urllib.error.HTTPError as e:
        return e.code, {"_error": e.read().decode()[:400]}


st, login = call("POST", "/api/v1/auth/vendoremployee/common-login",
                 {"email": EMAIL, "password": PWD})
print("LOGIN status:", st)
if st != 200:
    print("LOGIN FAILED:", json.dumps(login)[:400]); sys.exit(1)

token = (login.get("data") or login).get("token") or login.get("access_token")
d = login.get("data") or login
print("login keys:", list(d.keys())[:18])
print("restaurant:", d.get("restaurant_name") or d.get("restaurant_id"))
perms = d.get("permissions") or d.get("role") or []
role = perms[0] if isinstance(perms, list) and perms else (d.get("role_name") or "Manager")
print("role_name used:", role)
if not token:
    print("no token in login response"); sys.exit(1)

st2, orders = call("GET", "/api/v1/vendoremployee/pos/employee-orders-list",
                   token=token, params="?role_name=" + str(role))
print("ORDERS status:", st2)
olist = orders.get("orders") or []
print("orders returned:", len(olist))

with open(OUT + "/orders_list_raw.json", "w") as f:
    json.dump(orders, f, indent=2)

f_counts = collections.Counter()
item_counts = collections.Counter()
web_orders, flagged = [], []
for o in olist:
    fs = o.get("f_order_status")
    f_counts[str(fs)] += 1
    details = o.get("orderDetails") or o.get("order_details") or o.get("details") or []
    statuses = [str(it.get("food_status")) for it in details]
    for s in statuses:
        item_counts[s] += 1
    rec = {
        "order_id": o.get("id") or o.get("order_id"),
        "order_from": o.get("order_from"),
        "f_order_status": fs,
        "item_food_statuses": statuses,
        "item_count": len(details),
    }
    if str(o.get("order_from", "")).lower() == "web":
        web_orders.append(rec)
    if "7" in statuses:
        flagged.append(rec)

print("\nf_order_status distribution:", dict(f_counts))
print("item food_status distribution:", dict(item_counts))
print("web orders:", len(web_orders))
print("orders containing an item with food_status=7:", len(flagged))
print("\nWEB ORDER SAMPLE:", json.dumps(web_orders[:6], indent=2))
print("\nFLAGGED (item food_status=7):", json.dumps(flagged[:6], indent=2))

summary = {
    "f_order_status_distribution": dict(f_counts),
    "item_food_status_distribution": dict(item_counts),
    "web_orders": web_orders,
    "orders_with_item_food_status_7": flagged,
    "total_orders": len(olist),
}
with open(OUT + "/probe_summary.json", "w") as f:
    json.dump(summary, f, indent=2)
print("\nsaved:", OUT)
