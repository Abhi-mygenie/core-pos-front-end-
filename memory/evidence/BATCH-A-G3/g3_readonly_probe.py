# BATCH-A Gate 3 READ-ONLY probe (owner-approved 2026-11-14). Creds from env, never printed. Tokens masked.
# Usage: python3 g3_readonly_probe.py <login|profile|settings|reasons|insights|beta|cancellist|missing>
import json, os, re, sys, requests

B = "https://preprod.mygenie.online"
OUT = "/app/memory/evidence/BATCH-A-G3/"
TOKF = "/root/.g3_probe_tok"
MASK_KEYS = {"token", "firebase_token", "crm_token", "fcm_token", "password", "email", "phone", "mobile",
             "cust_mobile", "cust_email", "cust_phone", "customer_phone", "customer_email",
             "user_name", "f_name", "l_name", "customer_name", "address", "delivery_address"}
T = 110


def mask(o):
    if isinstance(o, dict):
        return {k: ("***" if k.lower() in MASK_KEYS else mask(v)) for k, v in o.items()}
    if isinstance(o, list):
        return [mask(v) for v in o]
    if isinstance(o, str) and re.fullmatch(r"\+?\d{10,13}", o):
        return "***"
    return o


def save(name, status, body):
    if status != 200 and os.path.exists(OUT + name):
        return
    json.dump({"status": status, "body": mask(body)}, open(OUT + name, "w"), indent=1)


def call(method, name, path, **kw):
    H = {"Authorization": f"Bearer {open(TOKF).read().strip()}", "Accept": "application/json"}
    try:
        x = requests.request(method, B + path, headers=H, timeout=T, **kw)
    except requests.exceptions.Timeout:
        print(name, "TIMEOUT")
        return 0, None
    try:
        b = x.json()
    except Exception:
        b = x.text[:2000]
    save(name, x.status_code, b)
    print(name, x.status_code)
    return x.status_code, b


step = sys.argv[1]
if step == "login":
    r = requests.post(B + "/api/v1/auth/vendoremployee/login", timeout=T,
                      json={"email": os.environ["PREPROD_PROBE_EMAIL"], "password": os.environ["PREPROD_PROBE_PASSWORD"]})
    login = r.json()
    save("01_login_masked.json", r.status_code, login)
    open(TOKF, "w").write(login["token"])
    roles = login.get("permissions") or login.get("role") or []
    print("login", r.status_code, "role_name:", login.get("role_name"), "perm count:", len(roles))
    for k in ["complementary_food", "order_cancel", "food", "update_payment", "order_unpaid", "clear_payment", "print_icon", "discount"]:
        print(f"  has {k}: {k in roles}")
elif step == "profile":
    s, prof = call("GET", "02_profile.json", "/api/v1/vendoremployee/profile")
    if s == 200:
        rest = (prof.get("restaurants") or [{}])[0]
        print("rid:", rest.get("id"), "complementary:", rest.get("complementary"))
        print("keys:", [k for k in sorted(rest) if re.search(r"cancel|note|pin|compl|limit|meal|threshold|alert|notif", k, re.I)])
elif step == "settings":
    s, st = call("GET", "03_settings_list.json", "/api/v2/vendoremployee/restaurant-settings/settings-list")
    print("keys:", sorted({m for m in re.findall(r'"([a-z_]*(?:cancel|note|pin|limit|meal|threshold|alert|notif)[a-z_]*)"', json.dumps(st), re.I)}))
elif step == "reasons":
    s, rs = call("GET", "04_cancellation_reasons.json", "/api/v1/vendoremployee/cancellation-reasons", params={"limit": 100, "offset": 1})
    t = json.dumps(rs)
    print("Order:", t.count('"Order"'), "Food:", t.count('"Food"'))
elif step == "insights":
    call("POST", "05_insights_cancellations_nov.json", "/api/v2/vendoremployee/report/insights-cancellations",
         json={"from_date": "2026-11-01", "to_date": "2026-11-14"})
elif step == "beta":
    s, beta = call("POST", "06_order_beta_today.json", "/api/v1/vendoremployee/daily-order-report-details-combined",
                   json={"from": "2026-11-14", "to": "2026-11-14"})
elif step == "cancellist":
    for d in sys.argv[2:]:
        call("GET", f"07_cancel_order_list_{d}.json", "/api/v2/vendoremployee/cancel-order-list", params={"search_date": d})
elif step == "missing":
    for p in ["/api/v2/vendoremployee/verify-pin", "/api/v2/vendoremployee/restaurant-settings/cancel-config",
              "/api/v2/vendoremployee/employee/notification-preferences"]:
        H = {"Authorization": f"Bearer {open(TOKF).read().strip()}"}
        print(p, requests.get(B + p, headers=H, timeout=T).status_code)
elif step == "cleanup":
    os.remove(TOKF)
    print("token file removed")
