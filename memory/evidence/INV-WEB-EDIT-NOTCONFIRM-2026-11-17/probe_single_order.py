#!/usr/bin/env python3
"""INV-WEB-EDIT-NOTCONFIRM — read-only single-order probe for specimen 1578831."""
import json, os, sys, urllib.request, urllib.error

BASE = "https://preprod.mygenie.online"
OUT = "/app/memory/evidence/INV-WEB-EDIT-NOTCONFIRM-2026-11-17"
ORDER_ID = int(os.environ.get("PROBE_ORDER_ID", "1578831"))


def call(method, path, body=None, token=None):
    req = urllib.request.Request(BASE + path,
                                 data=json.dumps(body).encode() if body is not None else None,
                                 method=method)
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
                 {"email": os.environ["PROBE_EMAIL"], "password": os.environ["PROBE_PWD"]})
if st != 200:
    print("LOGIN FAILED", st); sys.exit(1)
token = (login.get("data") or login).get("token")

st2, resp = call("POST", "/api/v2/vendoremployee/get-single-order-new", {"order_id": ORDER_ID}, token)
print("SINGLE_ORDER status:", st2)
with open(f"{OUT}/single_order_{ORDER_ID}.json", "w") as f:
    json.dump(resp, f, indent=2)

orders = resp.get("orders") or []
if not orders:
    print("no orders in response:", json.dumps(resp)[:300]); sys.exit(0)
o = orders[0]
print("order-level fields:")
for k in ("id", "order_from", "f_order_status", "order_status", "order_type",
          "bill_print", "payment_status", "is_prepaid", "created_at", "updated_at"):
    if k in o:
        print(f"  {k} = {o.get(k)}")

details = o.get("orderDetails") or o.get("order_details") or []
print(f"\nitems: {len(details)}")
for it in details:
    fd = it.get("food_details") or {}
    print("  ---")
    print(f"  id={it.get('id')} food_status={it.get('food_status')} "
          f"name={fd.get('name') or it.get('food_name')} qty={it.get('quantity') or it.get('qty')}")
    extra = {k: v for k, v in it.items()
             if k not in ("food_details",) and ("status" in k or "add" in k or "confirm" in k
                                                or k.endswith("_at") or "kot" in k)}
    print(f"  status/flag fields: {json.dumps(extra)}")

keys7 = set()
for it in details:
    if str(it.get("food_status")) == "7":
        keys7 |= set(it.keys())
print("\nkeys present on food_status=7 lines:", sorted(keys7))
