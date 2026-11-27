"""CR-559 PROBE-1 — does the vendoremployee profile payload carry scan_order_auto_print?
Logs in as owner@thegoankitchen.com (Goan Kitchen — web/scan tenant), fetches the SAME
profile endpoint profileService.getProfile() uses, saves the response, and locates the flag.
Secrets (token/password) are never printed.
"""
import json, sys, requests

BASE = "https://preprod.mygenie.online"
EMAIL = "owner@thegoankitchen.com"
PASSWORD = "Qplazm@10"
H = {"Content-Type": "application/json", "Accept": "application/json", "X-localization": "en"}

# 1) login (COMMON_LOGIN — authService uses this)
lr = requests.post(f"{BASE}/api/v1/auth/vendoremployee/common-login",
                   json={"email": EMAIL, "password": PASSWORD}, headers=H, timeout=30)
print("LOGIN HTTP", lr.status_code)
lj = lr.json()

def deep_find_token(o):
    if isinstance(o, dict):
        for k, v in o.items():
            if k.lower() in ("token", "access_token", "auth_token") and isinstance(v, str):
                return v
            r = deep_find_token(v)
            if r: return r
    elif isinstance(o, list):
        for v in o:
            r = deep_find_token(v)
            if r: return r
    return None

token = deep_find_token(lj)
print("TOKEN PRESENT:", bool(token), "| login_type:", (lj.get("data") or lj).get("login_type") if isinstance(lj, dict) else "?")
if not token:
    print("LOGIN KEYS:", list(lj.keys()) if isinstance(lj, dict) else type(lj))
    sys.exit("No token — cannot probe profile")

# 2) profile (exact endpoint profileService.getProfile uses)
pr = requests.get(f"{BASE}/api/v1/vendoremployee/profile",
                  headers={**H, "Authorization": f"Bearer {token}"}, timeout=30)
print("PROFILE HTTP", pr.status_code)
pj = pr.json()
json.dump(pj, open("/app/memory/evidence/CR-559/profile_response.json", "w"), indent=2)

# 3) locate every key related to the flag, with full path
HITS = []
def walk(o, path=""):
    if isinstance(o, dict):
        for k, v in o.items():
            p = f"{path}.{k}" if path else k
            kl = k.lower()
            if any(t in kl for t in ("scan_order_auto_print", "auto_printing", "settings_config")):
                HITS.append((p, v if not isinstance(v, (dict, list)) else f"<{type(v).__name__}: keys={list(v.keys()) if isinstance(v,dict) else len(v)}>"))
            walk(v, p)
    elif isinstance(o, list):
        for i, v in enumerate(o[:1]):  # restaurants[0] etc — first element only
            walk(v, f"{path}[{i}]")

walk(pj)
print("\n=== FLAG-RELATED KEYS FOUND ===")
if HITS:
    for p, v in HITS:
        print(f"  {p} = {v}")
else:
    print("  NONE — scan_order_auto_print / auto_printing / settings_config absent from profile payload")

# 4) what profileTransform actually reads: restaurants[0] root + restaurants[0].settings
root = pj.get("data", pj)
rests = root.get("restaurants") if isinstance(root, dict) else None
if isinstance(rests, list) and rests:
    r0 = rests[0]
    print("\n=== restaurants[0] ROOT keys (print-related) ===")
    print("  ", sorted([k for k in r0 if any(t in k.lower() for t in ("print","kot","bill","scan","auto","settings_config"))]))
    s = r0.get("settings")
    if isinstance(s, dict):
        print("=== restaurants[0].settings keys (print-related) ===")
        print("  ", sorted([k for k in s if any(t in k.lower() for t in ("print","kot","bill","scan","auto"))]))
        print("  scan_order_auto_print in settings:", "scan_order_auto_print" in s, "=>", s.get("scan_order_auto_print"))
    sc = r0.get("settings_config")
    print("=== restaurants[0].settings_config present:", isinstance(sc, dict))
    if isinstance(sc, dict):
        print("   settings_config keys:", list(sc.keys()))
        ap = sc.get("auto_printing")
        if isinstance(ap, dict):
            print("   auto_printing keys:", list(ap.keys()))
            print("   auto_printing.scan_order_auto_print =>", ap.get("scan_order_auto_print"))
else:
    print("\nNo restaurants[] array at", "data.restaurants" if isinstance(root, dict) else "root")
print("\nSaved: /app/memory/evidence/CR-559/profile_response.json")
