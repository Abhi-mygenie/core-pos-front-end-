"""CR-559 PROBE-2 — printer-agent-config endpoint: does it carry scan_order_auto_print, and under what path?"""
import json, sys, requests

BASE = "https://preprod.mygenie.online"
H = {"Content-Type": "application/json", "Accept": "application/json", "X-localization": "en"}

lr = requests.post(f"{BASE}/api/v1/auth/vendoremployee/common-login",
                   json={"email": "owner@thegoankitchen.com", "password": "Qplazm@10"}, headers=H, timeout=30)
def tok(o):
    if isinstance(o, dict):
        for k, v in o.items():
            if k.lower() in ("token","access_token","auth_token") and isinstance(v,str): return v
            r=tok(v)
            if r: return r
    elif isinstance(o,list):
        for v in o:
            r=tok(v)
            if r: return r
token = tok(lr.json())

pr = requests.get(f"{BASE}/api/v2/vendoremployee/restaurant-settings/printer-agent-config",
                  headers={**H, "Authorization": f"Bearer {token}"}, timeout=30)
print("PRINTER-AGENT-CONFIG HTTP", pr.status_code)
pj = pr.json()
json.dump(pj, open("/app/memory/evidence/CR-559/printer_agent_config_response.json","w"), indent=2)

HITS=[]
def walk(o,p=""):
    if isinstance(o,dict):
        for k,v in o.items():
            np=f"{p}.{k}" if p else k
            if "scan_order_auto_print" in k.lower() or "auto_printing" in k.lower():
                HITS.append((np, v if not isinstance(v,(dict,list)) else f"<{type(v).__name__}>"))
            walk(v,np)
    elif isinstance(o,list):
        for i,v in enumerate(o[:1]): walk(v,f"{p}[{i}]")
walk(pj)
print("=== scan_order_auto_print / auto_printing location(s) ===")
for p,v in HITS: print(f"  {p} = {v}")
if not HITS: print("  NONE")
print("Saved: /app/memory/evidence/CR-559/printer_agent_config_response.json")
