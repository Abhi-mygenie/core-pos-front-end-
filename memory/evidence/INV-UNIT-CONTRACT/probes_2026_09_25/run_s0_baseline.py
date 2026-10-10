import os; os.environ["PROBE_RUN"]="s0"
from _common import *
b, rows = stock()
json.dump(b, open(f"{D}/s0_stock_inventory_raw.json","w"), indent=1, default=str)
print("total rows:", len(rows)); print("top-level keys:", list(b.keys()))
print("sample raw row keys:", list(rows[0].keys()) if rows else None)
conv = [slim(r) for r in rows if r.get("has_unit_conversion")]
print("rows with conversion:", len(conv))
for r in conv[:40]: print(json.dumps(r, default=str))
