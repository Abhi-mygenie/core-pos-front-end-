#!/usr/bin/env python3
"""
S10 Data Exploration: Understand prep/serve time patterns across 2 restaurants.

Checks:
1. Timestamp availability (created_at, ready_at, serve_at) per item
2. Item lifecycle mode classification (Kitchen / Bar / Direct-billing)
3. Station mapping
4. Escalation matrix / target config availability
5. Real timing distributions
"""
import requests, json, sys
from collections import defaultdict, Counter

BASE = "https://preprod.mygenie.online"

ACCOUNTS = [
    {"email": "vishal@pav.com", "password": "Qplazm@10", "label": "Pav (vishal)"},
    {"email": "owner@cafe103.com", "password": "Qplazm@10", "label": "Cafe 103"},
]

def login(email, password):
    r = requests.post(f"{BASE}/api/v1/auth/vendoremployee/login", json={"email": email, "password": password})
    data = r.json()
    token = data.get("token")
    if not token:
        for k in data:
            if isinstance(data[k], dict) and "token" in data[k]:
                token = data[k]["token"]
                break
    return token, data

def fetch_orders(token, from_date, to_date):
    headers = {"Authorization": f"Bearer {token}"}
    r = requests.post(f"{BASE}/api/v2/vendoremployee/report/order-logs-report",
        headers=headers,
        json={"sort_by": "created_at", "from_date": from_date, "to_date": to_date}
    )
    return r.json().get("order", [])

def parse_timestamp(ts):
    if not ts:
        return None
    return ts

def minutes_between(t1, t2):
    """Rough minute diff between two ISO/datetime strings"""
    if not t1 or not t2:
        return None
    from datetime import datetime
    formats = ["%Y-%m-%d %H:%M:%S", "%Y-%m-%dT%H:%M:%S", "%Y-%m-%dT%H:%M:%S.%f", "%Y-%m-%d %H:%M:%S.%f"]
    d1, d2 = None, None
    for fmt in formats:
        try: d1 = datetime.strptime(t1[:26], fmt); break
        except: pass
    for fmt in formats:
        try: d2 = datetime.strptime(t2[:26], fmt); break
        except: pass
    if not d1 or not d2:
        return None
    diff = (d2 - d1).total_seconds() / 60.0
    return round(diff, 1)

def analyze_restaurant(account, from_date="2026-06-01", to_date="2026-06-07"):
    print(f"\n{'='*80}")
    print(f"RESTAURANT: {account['label']} ({account['email']})")
    print(f"Date range: {from_date} → {to_date}")
    print(f"{'='*80}")
    
    token, login_data = login(account["email"], account["password"])
    if not token:
        print(f"  LOGIN FAILED: {list(login_data.keys())}")
        return
    print(f"  Login OK")
    
    # Check if restaurant config has escalation/target settings
    # Look for any config in login response
    restaurant_data = login_data.get("restaurant", login_data.get("data", {}).get("restaurant", {}))
    if isinstance(restaurant_data, dict):
        # Look for timing/escalation config
        esc_keys = [k for k in restaurant_data.keys() if any(x in k.lower() for x in ["escal", "target", "prep", "serve", "time", "kds", "kitchen"])]
        if esc_keys:
            print(f"\n  ESCALATION/TIMING CONFIG KEYS FOUND: {esc_keys}")
            for k in esc_keys:
                val = restaurant_data[k]
                if isinstance(val, (str, int, float, bool)):
                    print(f"    {k} = {val}")
                elif isinstance(val, list) and len(val) < 10:
                    print(f"    {k} = {json.dumps(val, indent=6)[:500]}")
                elif isinstance(val, dict):
                    print(f"    {k} = {json.dumps(val, indent=6)[:500]}")
        else:
            print(f"\n  No escalation/timing config keys found in restaurant object")
            print(f"  Available keys: {sorted(restaurant_data.keys())[:30]}")
    
    orders = fetch_orders(token, from_date, to_date)
    print(f"  Orders fetched: {len(orders)}")
    
    if not orders:
        return
    
    # Analyze items
    total_items = 0
    items_with_ready_at = 0
    items_with_serve_at = 0
    items_with_both = 0
    items_with_neither = 0
    items_with_created_only = 0
    
    station_counter = Counter()
    food_status_counter = Counter()
    item_type_counter = Counter()
    
    # Per-station patterns
    station_patterns = defaultdict(lambda: {"kitchen": 0, "bar": 0, "direct": 0, "total": 0})
    
    # Timing samples
    prep_times = []
    serve_times = []
    total_times = []
    
    # Item-level details for samples
    samples_kitchen = []
    samples_bar = []
    samples_direct = []
    
    for wrapper in orders:
        ot = wrapper.get("orders_table", {})
        items_raw = wrapper.get("order_details_table", [])
        order_id = ot.get("restaurant_order_id", "?")
        created_at = ot.get("created_at", "")
        
        for item in items_raw:
            total_items += 1
            
            fd = item.get("food_details", "{}")
            if isinstance(fd, str):
                try: fd = json.loads(fd)
                except: fd = {}
            
            name = fd.get("name", "?")
            station = item.get("station", "") or "NONE"
            food_status = item.get("food_status")
            item_type = item.get("item_type", "")
            ready_at = item.get("ready_at")
            serve_at = item.get("serve_at")
            cancel_at = item.get("cancel_at")
            
            station_counter[station] += 1
            food_status_counter[food_status] += 1
            if item_type:
                item_type_counter[item_type] += 1
            
            has_ready = bool(ready_at)
            has_serve = bool(serve_at)
            
            if has_ready:
                items_with_ready_at += 1
            if has_serve:
                items_with_serve_at += 1
            if has_ready and has_serve:
                items_with_both += 1
            if not has_ready and not has_serve:
                items_with_neither += 1
                if created_at:
                    items_with_created_only += 1
            
            # Classify lifecycle mode
            if has_ready and has_serve:
                mode = "kitchen"
                prep = minutes_between(created_at, ready_at)
                serve = minutes_between(ready_at, serve_at)
                if prep is not None and prep >= 0:
                    prep_times.append(prep)
                if serve is not None and serve >= 0:
                    serve_times.append(serve)
                if prep is not None and serve is not None and prep >= 0 and serve >= 0:
                    total_times.append(prep + serve)
                if len(samples_kitchen) < 5:
                    samples_kitchen.append({"order": order_id, "name": name, "station": station, "prep": prep, "serve": serve, "status": food_status})
            elif not has_ready and has_serve:
                mode = "bar"
                serve = minutes_between(created_at, serve_at)
                if serve is not None and serve >= 0:
                    serve_times.append(serve)
                if len(samples_bar) < 5:
                    samples_bar.append({"order": order_id, "name": name, "station": station, "serve": serve, "status": food_status})
            else:
                mode = "direct"
                if len(samples_direct) < 5:
                    samples_direct.append({"order": order_id, "name": name, "station": station, "status": food_status, "ready_at": ready_at, "serve_at": serve_at})
            
            station_patterns[station][mode] += 1
            station_patterns[station]["total"] += 1
    
    # Print results
    print(f"\n  ── ITEM TIMESTAMP ANALYSIS ({total_items} items) ──")
    print(f"  Items with ready_at:              {items_with_ready_at} ({items_with_ready_at/total_items*100:.1f}%)")
    print(f"  Items with serve_at:              {items_with_serve_at} ({items_with_serve_at/total_items*100:.1f}%)")
    print(f"  Items with BOTH (Kitchen):        {items_with_both} ({items_with_both/total_items*100:.1f}%)")
    print(f"  Items with NEITHER (Direct bill):  {items_with_neither} ({items_with_neither/total_items*100:.1f}%)")
    
    print(f"\n  ── LIFECYCLE MODE CLASSIFICATION ──")
    total_k = sum(sp["kitchen"] for sp in station_patterns.values())
    total_b = sum(sp["bar"] for sp in station_patterns.values())
    total_d = sum(sp["direct"] for sp in station_patterns.values())
    print(f"  Kitchen (prep + serve):  {total_k} ({total_k/total_items*100:.1f}%)")
    print(f"  Bar (serve only):        {total_b} ({total_b/total_items*100:.1f}%)")
    print(f"  Direct billing:          {total_d} ({total_d/total_items*100:.1f}%)")
    
    print(f"\n  ── STATIONS ──")
    for station, count in station_counter.most_common():
        sp = station_patterns[station]
        print(f"    {station:25s} | {count:4d} items | Kitchen:{sp['kitchen']:3d}  Bar:{sp['bar']:3d}  Direct:{sp['direct']:3d}")
    
    print(f"\n  ── FOOD STATUS DISTRIBUTION ──")
    status_labels = {1: "Preparing", 2: "Ready", 3: "Cancelled", 5: "Served", 6: "Paid"}
    for status, count in food_status_counter.most_common():
        label = status_labels.get(status, f"Unknown({status})")
        print(f"    {label:20s} ({status}): {count}")
    
    if item_type_counter:
        print(f"\n  ── ITEM TYPE FIELD ──")
        for it, count in item_type_counter.most_common():
            print(f"    {str(it):20s}: {count}")
    
    if prep_times:
        print(f"\n  ── PREP TIME STATS (Kitchen items only) ──")
        prep_times_clean = [t for t in prep_times if 0 <= t <= 120]
        if prep_times_clean:
            avg = sum(prep_times_clean) / len(prep_times_clean)
            print(f"    Count: {len(prep_times_clean)} | Avg: {avg:.1f} min | Min: {min(prep_times_clean):.1f} | Max: {max(prep_times_clean):.1f}")
            # Distribution
            buckets = {"0-5": 0, "5-10": 0, "10-15": 0, "15-20": 0, "20-30": 0, "30+": 0}
            for t in prep_times_clean:
                if t < 5: buckets["0-5"] += 1
                elif t < 10: buckets["5-10"] += 1
                elif t < 15: buckets["10-15"] += 1
                elif t < 20: buckets["15-20"] += 1
                elif t < 30: buckets["20-30"] += 1
                else: buckets["30+"] += 1
            print(f"    Distribution: {dict(buckets)}")
    
    if serve_times:
        print(f"\n  ── SERVE TIME STATS ──")
        serve_times_clean = [t for t in serve_times if 0 <= t <= 120]
        if serve_times_clean:
            avg = sum(serve_times_clean) / len(serve_times_clean)
            print(f"    Count: {len(serve_times_clean)} | Avg: {avg:.1f} min | Min: {min(serve_times_clean):.1f} | Max: {max(serve_times_clean):.1f}")
    
    print(f"\n  ── SAMPLE: Kitchen items (prep + serve) ──")
    for s in samples_kitchen:
        print(f"    Order #{s['order']} | {s['name']:30s} | stn={s['station']:15s} | prep={s['prep']}min serve={s['serve']}min | status={s['status']}")
    
    print(f"\n  ── SAMPLE: Bar items (serve only) ──")
    for s in samples_bar:
        print(f"    Order #{s['order']} | {s['name']:30s} | stn={s['station']:15s} | serve={s['serve']}min | status={s['status']}")
    
    print(f"\n  ── SAMPLE: Direct billing items (no timestamps) ──")
    for s in samples_direct:
        print(f"    Order #{s['order']} | {s['name']:30s} | stn={s['station']:15s} | status={s['status']} | ready_at={s['ready_at']} serve_at={s['serve_at']}")


# Run for both restaurants
for account in ACCOUNTS:
    try:
        analyze_restaurant(account)
    except Exception as e:
        print(f"\n  ERROR: {e}")
        import traceback
        traceback.print_exc()
