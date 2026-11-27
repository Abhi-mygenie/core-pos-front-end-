#!/usr/bin/env python3
"""
INV-WEB-EDIT-NOTCONFIRM — passive socket listener (READ-ONLY).

Joins the same room the POS joins (`join_restaurant` -> rest_<rid>) over the
Socket.IO v4 HTTP long-polling transport using only stdlib, and logs every
packet with a timestamp. Emits nothing except the join + engine.io pongs.

Usage: PROBE_RID=672 PROBE_SECONDS=900 python3 socket_listen.py
"""
import json, os, sys, time, urllib.request, urllib.error
from datetime import datetime

BASE = "https://presocket.mygenie.online"
RID = int(os.environ.get("PROBE_RID", "672"))
RUN_FOR = int(os.environ.get("PROBE_SECONDS", "900"))
OUT = "/app/memory/evidence/INV-WEB-EDIT-NOTCONFIRM-2026-11-17"
LOG = open(f"{OUT}/socket_capture.log", "a", buffering=1)
SEP = "\x1e"

WATCH = ("new-order", "update-order", "update-food-status", "update-order-status",
         "update-item-status", "update-order-target", "update-order-source",
         "update-order-paid", "scan-new-order", "update-table", "order-engage",
         "split-order")


def ts():
    return datetime.now().strftime("%H:%M:%S.%f")[:-3]


def say(msg):
    line = f"[{ts()}] {msg}"
    print(line, flush=True)
    LOG.write(line + "\n")


def http(method, url, body=None):
    req = urllib.request.Request(url, data=body.encode() if body else None, method=method)
    if body:
        req.add_header("Content-Type", "text/plain;charset=UTF-8")
    with urllib.request.urlopen(req, timeout=70) as r:
        return r.read().decode()


# --- handshake -------------------------------------------------------------
hs = http("GET", f"{BASE}/socket.io/?EIO=4&transport=polling")
sid = json.loads(hs[1:])["sid"]
say(f"HANDSHAKE ok sid={sid[:6]}*** rid={RID}")
poll = f"{BASE}/socket.io/?EIO=4&transport=polling&sid={sid}"

http("POST", poll, "40")                                     # connect namespace
http("POST", poll, '42["join_restaurant",{"restaurant_id":%d}]' % RID)
say(f"JOIN emitted for restaurant {RID} — listening {RUN_FOR}s (passive)")

deadline = time.time() + RUN_FOR
while time.time() < deadline:
    try:
        data = http("GET", poll)
    except urllib.error.HTTPError as e:
        say(f"POLL HTTP {e.code} — session ended"); break
    except Exception as e:
        say(f"POLL error {type(e).__name__}: {e}"); time.sleep(2); continue

    for pkt in filter(None, data.split(SEP)):
        if pkt == "2":                       # engine.io ping
            try:
                http("POST", poll, "3")      # pong (keep-alive only)
            except Exception:
                pass
            continue
        if pkt in ("3", "40") or pkt.startswith("40"):
            say(f"ENGINE pkt: {pkt[:80]}")
            continue
        if pkt.startswith("42"):
            try:
                payload = json.loads(pkt[2:])
            except Exception:
                say(f"RAW {pkt[:400]}")
                continue
            name = payload[0] if payload else "?"
            args = payload[1:]
            hit = " <<< WATCHED" if any(w in str(name) for w in WATCH) else ""
            say(f"EVENT '{name}' argc={len(args)}{hit}")
            say("  PAYLOAD " + json.dumps(args)[:1800])
            with open(f"{OUT}/socket_events.jsonl", "a") as f:
                f.write(json.dumps({"t": datetime.now().isoformat(),
                                    "event": name, "args": args})[:200000] + "\n")
        else:
            say(f"RAW {pkt[:300]}")

say("listener finished")
