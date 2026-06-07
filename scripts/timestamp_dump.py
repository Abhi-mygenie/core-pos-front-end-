#!/usr/bin/env python3
"""
Timestamp dump: Check raw timestamps for PACKAGED, KDS, OTHER items
to validate classification threshold.
"""
import requests, json, sys
from collections import defaultdict

BASE = "https://preprod.mygenie.online"

print("=" * 90)
print("TIMESTAMP RAW DUMP — Pav (vishal@pav.com) — Today")
print("=" * 90)

# Login
r = requests.post(f"{BASE}/api/v1/auth/vendoremployee/login", json={"email": "vishal@pav.com", "password": "Qplazm@10"})
token = r.json().get("token")
headers = {"Authorization": f"Bearer {token}"}

# Fetch today's orders
r = requests.post(f"{BASE}/api/v2/vendoremployee/report/order-logs-report",
    headers=headers, json={"sort_by": "created_at", "from_date": "2026-06-07", "to_date": "2026-06-07"})
raw_orders = r.json().get("order", [])
print(f"Orders today: {len(raw_orders)}")

if len(raw_orders) == 0:
    print("No orders today, trying 7-day range...")
    r = requests.post(f"{BASE}/api/v2/vendoremployee/report/order-logs-report",
        headers=headers, json={"sort_by": "created_at", "from_date": "2026-06-01", "to_date": "2026-06-07"})
    raw_orders = r.json().get("order", [])
    print(f"Orders 7-day: {len(raw_orders)}")

from datetime import datetime

def parse_ts(ts):
    if not ts: return None
    for fmt in ["%Y-%m-%d %H:%M:%S", "%Y-%m-%dT%H:%M:%S", "%Y-%m-%dT%H:%M:%S.%f", "%Y-%m-%d %H:%M:%S.%f"]:
        try: return datetime.strptime(ts[:26], fmt)
        except: pass
    return None

def sec_diff(ts1, ts2):
    d1, d2 = parse_ts(ts1), parse_ts(ts2)
    if not d1 or not d2: return None
    return round((d2 - d1).total_seconds(), 1)

# Collect by item_type
by_type = defaultdict(list)

for wrapper in raw_orders:
    ot = wrapper.get("orders_table", {})
    order_id = ot.get("restaurant_order_id", "?")
    order_created = ot.get("created_at", "")
    
    for item in wrapper.get("order_details_table", []):
        fd = item.get("food_details", "{}")
        if isinstance(fd, str):
            try: fd = json.loads(fd)
            except: fd = {}
        
        by_type[item.get("item_type", "UNKNOWN")].append({
            "order": order_id,
            "name": fd.get("name", "?"),
            "station": item.get("station", "?"),
            "item_type": item.get("item_type", "?"),
            "food_status": item.get("food_status"),
            "order_created": order_created,
            "created_at": item.get("created_at", ""),
            "ready_at": item.get("ready_at"),
            "serve_at": item.get("serve_at"),
            "cancel_at": item.get("cancel_at"),
        })

for item_type in ["KDS", "PACKAGED", "OTHER"]:
    items = by_type.get(item_type, [])
    print(f"\n{'='*90}")
    print(f"ITEM TYPE: {item_type} ({len(items)} items)")
    print(f"{'='*90}")
    
    # Show first 15 items with full timestamp detail
    shown = 0
    for it in items:
        if it["food_status"] == 3:  # skip cancelled
            continue
        if shown >= 15:
            break
        shown += 1
        
        oc = it["order_created"]
        ra = it["ready_at"]
        sa = it["serve_at"]
        
        gap_created_to_ready = sec_diff(oc, ra)
        gap_ready_to_serve = sec_diff(ra, sa)
        gap_created_to_serve = sec_diff(oc, sa)
        
        print(f"\n  Order #{it['order']} | {it['name'][:35]:35s} | station={it['station']:10s} | status={it['food_status']}")
        print(f"    order_created_at : {oc}")
        print(f"    item_created_at  : {it['created_at']}")
        print(f"    ready_at         : {ra or 'NULL'}")
        print(f"    serve_at         : {sa or 'NULL'}")
        print(f"    ── Gaps ──")
        print(f"    created→ready    : {gap_created_to_ready}s ({round(gap_created_to_ready/60, 1) if gap_created_to_ready is not None else 'N/A'} min)" if gap_created_to_ready is not None else f"    created→ready    : N/A")
        print(f"    ready→serve      : {gap_ready_to_serve}s ({round(gap_ready_to_serve/60, 1) if gap_ready_to_serve is not None else 'N/A'} min)" if gap_ready_to_serve is not None else f"    ready→serve      : N/A")
        print(f"    created→serve    : {gap_created_to_serve}s ({round(gap_created_to_serve/60, 1) if gap_created_to_serve is not None else 'N/A'} min)" if gap_created_to_serve is not None else f"    created→serve    : N/A")
        
        # Classification with current 30s threshold
        THRESHOLD = 30  # seconds
        if gap_created_to_ready is not None and gap_created_to_serve is not None:
            if gap_created_to_ready < THRESHOLD and gap_created_to_serve < THRESHOLD:
                cls = "DIRECT (all ≈ same)"
            elif gap_created_to_ready < THRESHOLD and gap_created_to_serve >= THRESHOLD:
                cls = "BAR (auto-ready, real serve)"
            elif gap_created_to_ready >= THRESHOLD:
                cls = "KITCHEN (real prep)"
            else:
                cls = "DIRECT (fallback)"
        elif gap_created_to_ready is None and gap_created_to_serve is not None:
            cls = f"BAR (no ready_at, serve gap={gap_created_to_serve}s)"
        elif ra is None and sa is None:
            cls = "DIRECT (no timestamps)"
        else:
            cls = "DIRECT (partial)"
        
        print(f"    CLASSIFICATION   : {cls}")
    
    # Summary stats
    print(f"\n  ── SUMMARY for {item_type} ({len(items)} items) ──")
    gaps = []
    for it in items:
        if it["food_status"] == 3: continue
        g = sec_diff(it["order_created"], it["ready_at"])
        if g is not None: gaps.append(g)
    
    if gaps:
        under_30s = sum(1 for g in gaps if g < 30)
        under_60s = sum(1 for g in gaps if g < 60)
        under_120s = sum(1 for g in gaps if g < 120)
        over_120s = sum(1 for g in gaps if g >= 120)
        print(f"  created→ready gaps: {len(gaps)} items with ready_at")
        print(f"    < 30s (current threshold): {under_30s}")
        print(f"    < 60s:                     {under_60s}")
        print(f"    < 120s (2 min):            {under_120s}")
        print(f"    >= 120s (2+ min):          {over_120s}")
        if gaps:
            print(f"    Min: {min(gaps)}s  Max: {max(gaps)}s  Avg: {round(sum(gaps)/len(gaps), 1)}s")
    else:
        print(f"  No ready_at timestamps found")
