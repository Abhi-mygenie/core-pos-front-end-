#!/usr/bin/env python3
# INV-RECIPE-DELETE (2026-09-24) — read-only probe of recipe delete contracts.
# Uses a NON-EXISTENT id (999999999) so nothing is deleted; Laravel validation runs first.
import json, os, sys, requests

H = "https://preprod.mygenie.online"
OUT = os.path.dirname(os.path.abspath(__file__))
EMAIL, PWD = os.environ["PROBE_EMAIL"], os.environ["PROBE_PWD"]

s = requests.Session()
tok = s.post(f"{H}/api/v1/auth/vendoremployee/common-login", json={"email": EMAIL, "password": PWD},
             headers={"X-localization": "en"}).json()["token"]
s.headers.update({"Authorization": f"Bearer {tok}", "Accept": "application/json", "X-localization": "en"})

BOGUS = 999999999
results = {}

def rec(name, r):
    try: body = r.json()
    except Exception: body = r.text[:500]
    results[name] = {"status": r.status_code, "body": body}
    print(f"{name:45s} -> {r.status_code} {json.dumps(body)[:160]}")

# 0. list shapes (read-only)
r = s.get(f"{H}/api/v2/vendoremployee/product/addon-recipe-list"); rec("GET addon-recipe-list", r)
j = r.json() if r.ok else {}
if isinstance(j, dict):
    lst = j.get("data") or j.get("addon_recipes") or j.get("recipes") or []
    if isinstance(lst, list) and lst:
        results["addon_recipe_sample_keys"] = list(lst[0].keys()); print("addon sample keys:", results["addon_recipe_sample_keys"])
rec("GET delete-reasons (menu)", s.get(f"{H}/api/v2/vendoremployee/delete-reasons"))

# 1. delete contract probes on bogus id — no body / reason / delete_reason
for label, path in [("addon", "product/delete-addon-recipe"), ("standard", "recipe/delete-recipe"), ("sub", "recipe/delete-sub-recipe")]:
    url = f"{H}/api/v2/vendoremployee/{path}/{BOGUS}"
    rec(f"DELETE {label} no-body", s.delete(url))
    rec(f"DELETE {label} {{reason}}", s.delete(url, json={"reason": "probe"}))
    rec(f"DELETE {label} {{delete_reason}}", s.delete(url, json={"delete_reason": "probe"}))

json.dump(results, open(os.path.join(OUT, "probe_delete_contract_2026_09_24.json"), "w"), indent=2)
print("saved")
