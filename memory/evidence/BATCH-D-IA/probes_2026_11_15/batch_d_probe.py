"""Batch D IA probes (2026-11-15). Re-runnable. Creds from env PROBE_POS_EMAIL / PROBE_POS_PASSWORD. Tokens masked."""
import os, sys, json, requests

B = "https://preprod.mygenie.online"
OUT = os.path.dirname(os.path.abspath(__file__))
S = requests.Session()


def save(name, obj):
    s = json.dumps(obj, indent=1, default=str)
    for k in ("token", "access_token"):
        s = s.replace(str(obj.get(k, "")) if isinstance(obj, dict) and obj.get(k) else "\x00", "***")
    open(os.path.join(OUT, name), "w").write(s)


def call(method, path, name=None, **kw):
    r = S.request(method, B + path, timeout=90, **kw)
    try:
        body = r.json()
    except Exception:
        body = {"raw": r.text[:2000]}
    if name:
        save(name, {"request": {"method": method, "path": path, "json": kw.get("json"), "data": kw.get("data")}, "status": r.status_code, "response": body})
    return r.status_code, body


def login():
    st, d = call("POST", "/api/v1/auth/vendoremployee/common-login", json={"email": os.environ["PROBE_POS_EMAIL"], "password": os.environ["PROBE_POS_PASSWORD"]})
    tok = d.get("token") or (d.get("data") or {}).get("token")
    S.headers["Authorization"] = "Bearer " + tok
    save("01_login_masked.json", {"status": st, "login_type": d.get("login_type"), "token": "***", "role_count": len(d.get("role") or [])})
    return d


if __name__ == "__main__":
    login()
    step = sys.argv[1] if len(sys.argv) > 1 else "profile"
    if step == "profile":
        st, p = call("GET", "/api/v1/vendoremployee/profile", "02_profile.json")
        r = (p.get("restaurants") or [{}])[0]
        print(st, "RID", r.get("id"), "name", r.get("name"))
