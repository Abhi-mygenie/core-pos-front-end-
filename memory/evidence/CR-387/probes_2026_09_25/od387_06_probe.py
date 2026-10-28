"""CR-387 OD-387-06 READ-ONLY probe: vendor-item-list unit_price basis. GET only. Never prints secrets."""
import json, re, sys, requests
sec = open('/app/memory/test_credentials.md').read().split('## QA_INV')[1]
EMAIL = re.search(r'email `([^`]+)`', sec).group(1); PASSWORD = re.search(r'password `([^`]+)`', sec).group(1)
H = open('/app/frontend/.env').read().split('REACT_APP_API_BASE_URL=')[1].split('\n')[0].strip().rstrip('/')
s = requests.Session()
r = s.post(f"{H}/api/v1/auth/vendoremployee/common-login", json={"email":EMAIL,"password":PASSWORD}, timeout=60)
tok = r.json().get("token")
if not tok: print("LOGIN FAILED", r.status_code); sys.exit(2)
s.headers.update({"Authorization":f"Bearer {tok}","Accept":"application/json","X-localization":"en"})
r = s.get(f"{H}/api/v2/vendoremployee/inventory/vendor-item-list", timeout=60)
body = r.json()
rows = body.get("data") if isinstance(body, dict) else body
rows = rows or []
print("HTTP", r.status_code, "| rows:", len(rows))
if rows: print("keys:", sorted(rows[0].keys()))
# focus: probe purchases on item 20326 (pkt/gm @800) from 2026-09-25 + any row with quantity/unit fields
sel = [x for x in rows if str(x.get("ingredient_id") or x.get("Ingredient") or x.get("ingredient")) in ("20326","20329","20320")]
print("rows for 20326/20329/20320:", len(sel))
for x in sel[:12]:
    print(json.dumps({k:x.get(k) for k in x if k.lower() in ("id","purchase_id","ingredient_id","ingredient_name","stock_title","unit","unit_name","sunit","quantity","stock_quantity","calculate_quantity","rate","unit_price","amount","total","purchase_date","last_purchase_date","created_at","vendor_id")}, default=str))
json.dump({"http": r.status_code, "row_count": len(rows), "sample_keys": sorted(rows[0].keys()) if rows else [], "rows_20326_20329_20320": sel[:20]}, open("od387_06_vendor_item_list.json","w"), indent=1, default=str)
