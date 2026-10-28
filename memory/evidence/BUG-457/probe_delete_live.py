#!/usr/bin/env python3
# INV-RECIPE-DELETE (2026-09-24) — net-zero mutation probe on the test restaurant:
# create a clearly-labelled probe recipe (addon + sub), try DELETE without body, then with
# {reason} / {delete_reason}, confirm removal. Nothing pre-existing is touched.
import json, os, requests

H = "https://preprod.mygenie.online"
V2 = f"{H}/api/v2/vendoremployee"
OUT = os.path.dirname(os.path.abspath(__file__))
EMAIL, PWD = os.environ["PROBE_EMAIL"], os.environ["PROBE_PWD"]

s = requests.Session()
tok = s.post(f"{H}/api/v1/auth/vendoremployee/common-login", json={"email": EMAIL, "password": PWD},
             headers={"X-localization": "en"}).json()["token"]
s.headers.update({"Authorization": f"Bearer {tok}", "Accept": "application/json", "X-localization": "en"})

results = {}
def rec(name, r):
    try: body = r.json()
    except Exception: body = r.text[:500]
    results[name] = {"status": r.status_code, "body": body}
    print(f"{name:48s} -> {r.status_code} {json.dumps(body)[:200]}")
    return body

# masters
inv = s.get(f"{V2}/inventory/get-inventory-master").json()
ings = inv.get("data") or inv.get("ingredients") or inv
if isinstance(ings, dict): ings = ings.get("ingredients") or ings.get("data") or []
ing = ings[0]; print("ingredient sample:", {k: ing.get(k) for k in ("id", "name", "unit", "small_unit")})
addons = s.get(f"{V2}/product/addon-list").json()
alist = addons.get("data") or addons.get("addons") or addons
if isinstance(alist, dict): alist = alist.get("addons") or alist.get("data") or []
addon = alist[0]; print("addon sample:", {k: addon.get(k) for k in ("id", "name")})
results["masters"] = {"ingredient": {"id": ing.get("id"), "name": ing.get("name")}, "addon": {"id": addon.get("id"), "name": addon.get("name")}}

# ---- ADDON probe recipe ----
pay = {"addon_id": addon["id"], "name": "INV-PROBE-DELETE-ME addon", "recipe_qty": 1, "recipe_unit": "pieces",
       "preparation_time": 0, "serves_people": 1, "serve_time": 0,
       "ingredients": [{"id": ing["id"], "qty": 1, "unit": ing.get("small_unit") or ing.get("unit")}]}
b = rec("POST store-addon-recipe (probe)", s.post(f"{V2}/product/store-addon-recipe", json=pay))
lst = s.get(f"{V2}/product/addon-recipe-list").json().get("recipes", [])
mine = [r for r in lst if r.get("name") == "INV-PROBE-DELETE-ME addon" or r.get("addon_id") == addon["id"]]
print("addon probe rows found:", [(r["recipe_id"], r["name"]) for r in mine])
if mine:
    rid = mine[-1]["recipe_id"]
    url = f"{V2}/product/delete-addon-recipe/{rid}"
    rec("DELETE addon no-body", s.delete(url))
    rec("DELETE addon {delete_reason}", s.delete(url, json={"delete_reason": "probe"}))
    rec("DELETE addon {reason}", s.delete(url, json={"reason": "INV probe cleanup"}))
    still = [r for r in s.get(f"{V2}/product/addon-recipe-list").json().get("recipes", []) if r["recipe_id"] == rid]
    results["addon_still_listed_after_delete"] = bool(still); print("addon still listed:", bool(still))

# ---- SUB probe recipe ----
pay = {"sub_recipe_name": "INV-PROBE-DELETE-ME sub", "qty": 1, "subunit": "kg", "prepration_time": "0", "serve_time": 0,
       "serve_people": 1, "thershold_qty": 0, "thershold_unit": "",
       "ingredient": [{"id": ing["id"], "qty": 1, "unit": ing.get("small_unit") or ing.get("unit")}]}
b = rec("POST store-sub-recipe (probe)", s.post(f"{V2}/recipe/store-sub-recipe", json=pay))
sl = s.get(f"{V2}/recipe/sub-recipes").json()
subs = sl.get("sub_recipes") or sl.get("data") or sl.get("recipes") or []
results["sub_list_keys"] = list(sl.keys()) if isinstance(sl, dict) else "list"
mine = [r for r in subs if "INV-PROBE-DELETE-ME" in json.dumps(r)]
print("sub probe rows found:", [(r.get("id") or r.get("sub_recipe_id"), r.get("name") or r.get("sub_recipe_name")) for r in mine])
if mine:
    sid = mine[-1].get("id") or mine[-1].get("sub_recipe_id")
    url = f"{V2}/recipe/delete-sub-recipe/{sid}"
    rec("DELETE sub no-body", s.delete(url))
    rec("DELETE sub {delete_reason}", s.delete(url, json={"delete_reason": "probe"}))
    rec("DELETE sub {reason}", s.delete(url, json={"reason": "INV probe cleanup"}))
    sl2 = s.get(f"{V2}/recipe/sub-recipes").json()
    subs2 = sl2.get("sub_recipes") or sl2.get("data") or sl2.get("recipes") or []
    results["sub_still_listed_after_delete"] = any("INV-PROBE-DELETE-ME" in json.dumps(r) for r in subs2)
    print("sub still listed:", results["sub_still_listed_after_delete"])

json.dump(results, open(os.path.join(OUT, "probe_delete_live_2026_09_24.json"), "w"), indent=2)
print("saved")
