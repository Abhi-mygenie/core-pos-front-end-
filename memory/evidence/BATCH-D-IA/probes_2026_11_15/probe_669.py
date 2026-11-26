"""BUG-669 probes: add-on ₹0 and variation ₹0. Cleans up everything it creates."""
import json
from batch_d_probe import login, call

login()
st, cats = call("GET", "/api/v2/vendoremployee/product/categories")
cl = cats if isinstance(cats, list) else (cats.get("data") or cats.get("categories") or [])
cat_id = cl[0]["id"] if cl else None
print("category", cat_id)

# P1a add-on price 0
st, r = call("POST", "/api/v2/vendoremployee/product/add-addon", "P1a_add_addon_price0.json",
             json={"name": "BATCHD_IA_PROBE_ADDON", "price": 0, "weight": 0, "veg": 1, "status": 1, "has_inventory": "No"})
print("P1a", st, json.dumps(r)[:300])

st, al = call("GET", "/api/v2/vendoremployee/product/addon-list")
items = al if isinstance(al, list) else (al.get("data") or al.get("addons") or [])
probe_addons = [a for a in items if isinstance(a, dict) and a.get("name") == "BATCHD_IA_PROBE_ADDON"]
print("P1a listed", [(a.get("id"), a.get("price")) for a in probe_addons])

# P1b food with a variation option at 0
food = {
    "name": "BATCHD_IA_PROBE_FOOD", "description": "", "category_id": cat_id, "price": 10, "discount": 0,
    "discount_type": "amount", "food_for": "Normal", "dinein": "Yes", "delivery": "No", "takeaway": "No",
    "live_web": "N", "available_time_starts": "00:00:00", "available_time_ends": "23:59:59",
    "prepration_time_min": 0, "serve_time_in_min": 0, "pack_charges": "0", "takeaway_charge": "0",
    "delivery_charge": "0", "tax_type": "GST", "tax": "0", "complementary": "No", "give_discount": "No",
    "item_code": "", "kcal": 0, "allergens": "", "item_type": 1, "veg": 1, "is_inventory": "No",
    "packed_food": "No", "stock_out": "N", "is_disable": "Y", "tax_calc": "Exclusive",
    "variations": [{"name": "Size", "type": "single", "required": "off", "min": 0, "max": 0,
                    "values": [{"label": "Small", "optionPrice": "0"}, {"label": "Large", "optionPrice": "5"}]}],
    "item_unit": "", "item_unit_price": "",
}
st, r = call("POST", "/api/v2/vendoremployee/product/add-food", "P1b_add_food_variation0.json",
             data={"food_info": json.dumps(food)}, files={"_": ("", b"")})
print("P1b", st, json.dumps(r)[:400])

# P1c food with a variation option at 5 (control) to separate "variation rejected" from "0 rejected"
food["name"] = "BATCHD_IA_PROBE_FOOD_CTRL"
food["variations"][0]["values"][0]["optionPrice"] = "3"
st, r = call("POST", "/api/v2/vendoremployee/product/add-food", "P1c_add_food_variation_control.json",
             data={"food_info": json.dumps(food)}, files={"_": ("", b"")})
print("P1c", st, json.dumps(r)[:400])

# cleanup
for a in probe_addons:
    st, r = call("DELETE", f"/api/v2/vendoremployee/product/delete-addon/{a['id']}", f"cleanup_addon_{a['id']}.json")
    print("cleanup addon", a["id"], st)
st, pl = call("GET", "/api/v1/vendoremployee/get-products-list?food_for=Normal&type=all", None)
txt = json.dumps(pl)
open("P1_products_after.json.tmp", "w").write(txt)
