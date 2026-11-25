"""INV unit-contract probe header. Credentials read-by-pattern from memory/test_credentials.md (QA_INV), never printed."""
import json, os, re, sys, time, requests
D = os.path.dirname(os.path.abspath(__file__))
RUN = os.environ.get("PROBE_RUN", "probe")
sec = open('/app/memory/test_credentials.md').read().split('## QA_INV')[1]
EMAIL = re.search(r'email `([^`]+)`', sec).group(1); PASSWORD = re.search(r'password `([^`]+)`', sec).group(1)
H = open('/app/frontend/.env').read().split('REACT_APP_API_BASE_URL=')[1].split('\n')[0].strip().rstrip('/')
REQ_LOG = f"{D}/{RUN}_requests.jsonl"
class LoggedSession(requests.Session):
    def request(self, method, url, **kw):
        if method.upper() in ("POST","PUT","PATCH","DELETE") and "login" not in url:
            with open(REQ_LOG,"a") as f: f.write(json.dumps({"ts":time.time(),"method":method,"url":url.replace(H,""),"body":kw.get("json")},default=str)+"\n")
        return super().request(method, url, **kw)
s = LoggedSession()
_r = s.post(f"{H}/api/v1/auth/vendoremployee/common-login", json={"email":EMAIL,"password":PASSWORD})
tok = _r.json().get("token")
if not tok: print("LOGIN FAILED", _r.status_code); sys.exit(2)
s.headers.update({"Authorization":f"Bearer {tok}","Accept":"application/json","X-localization":"en","Content-Type":"application/json"})
print(f"[{RUN}] login OK")
def save(name, r, show=500):
    try: body = r.json()
    except Exception: body = {"_raw": r.text[:2000]}
    json.dump({"http":r.status_code,"body":body}, open(f"{D}/{RUN}_{name}.json","w"), indent=1, default=str)
    print(f"[{name}] HTTP {r.status_code} :: {json.dumps(body,default=str)[:show]}")
    return r.status_code, body
def stock():
    b = s.get(f"{H}/api/v2/vendoremployee/inventory/stock-inventory").json()
    rows = b.get("current_stocks") or []
    return b, rows
def row(rows, id_): return next((r for r in rows if str(r.get("id"))==str(id_)), None)
KEYS = ("id","stock_title","unit","small_unit","has_unit_conversion","converion_factor","consumption_unit","quantity","cal_quantity","display_qty","display_unit","display_qty_text","physical_qty","is_sub_recipe","subrecipe_id","display_qty_parts")
def slim(r): return {k:r.get(k) for k in KEYS} if r else None
