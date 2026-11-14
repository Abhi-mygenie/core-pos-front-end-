import json

P = "/app/memory/control/registry.json"
DOC = "memory/change_requests/BATCH_B_OWNER_DECISIONS_2026_11_14.md"
DATE = "2026-11-14"
BATCH = "BATCH-B-2026-11-14"
READY = f"GATE_1_INTAKE_COMPLETE — OWNER ODs ANSWERED {DATE} (Batch B). Next: IMPACT ANALYSIS BATCH-B."
WAIT = "Gyan — backend"

UPDATES = {
    "BUG-671": dict(status=READY, blocked_on=WAIT, note="Show Unpaid for partly-paid orders; whole bill unpaid; backend handles paid amount."),
    "BUG-672": dict(status=READY, blocked_on=WAIT, note="Prepaid (scan/online + cashier) → Credit via Collect Bill Credit method broken. No extra right."),
    "CR-514": dict(status=READY, blocked_on=WAIT, note="Backend sets per method show/hide + required/optional; required locks Pay; one box per split part."),
    "CR-522": dict(status=READY, blocked_on=WAIT, note="Free-typed %, same both ways, outside blocked. P1 backend admin, P2 POS Settings."),
    "CR-526": dict(status=READY, blocked_on=WAIT, note="Make-unpaid/remove button in Audit, Order Beta, Credit Mgmt; make-unpaid right; no PIN; same as existing unpaid."),
    "CR-527": dict(status=READY, note="Details at impact."),
    "CR-536": dict(status=READY, blocked_on=WAIT, title="Credit / B2B: GST Number, Address and UPI ID in Credit Payment (report + print)",
                   note="All restaurants, one CR, Prana removed from title. Entry point + UPI owner decided at impact."),
    "BUG-607": dict(status=READY, assignee="Gyan", note="Item/category-level GST when GST enabled — backend. POS key exists; FE part at impact."),
    "CR-394": dict(status=READY, blocked_on=WAIT, note="Inclusive vs exclusive unclear — discuss at impact."),
    "CR-517": dict(priority="P1", note="Moved to P1. Idea: Advance option during payment collection."),
    "BUG-475": dict(priority="P1", note="Moved to P1."),
    "BUG-118": dict(priority="P1", note="Moved to P1."),
    "CR-425": dict(priority="P1", note="Moved to P1."),
    "CR-520": dict(priority="P1", note="Moved to P1."),
    "CR-126": dict(priority="P2", note="Moved to P2."),
    "CR-438": dict(priority="P2", note="Moved to P2."),
}

NEW = [
    ("CR-541", "Payment Reference-Box Settings in POS Settings", "P1", "MEDIUM",
     "From CR-514: per-method reference box show/required config editable in POS Settings.",
     ["CR-514", "CR-522"], "CR-541_PAYMENT_REFERENCE_SETTINGS_POS_INTAKE.md"),
    ("CR-542", "Reason Mandatory on Every Make Unpaid", "TBD", "HIGH",
     "Every make-unpaid requires reason from new backend unpaid-reasons list, everywhere.",
     ["CR-526", "CR-515", "BUG-671"], "CR-542_UNPAID_REASON_MANDATORY_INTAKE.md"),
]

d = json.load(open(P))
by_id = {i["id"]: i for i in d["items"]}
for bid, u in UPDATES.items():
    it = by_id[bid]
    for k in ("status", "priority", "assignee", "blocked_on", "title"):
        if k in u:
            it[k] = u[k]
    it["client"] = "ALL"
    it["batch"] = BATCH
    it["notes"] = f"[{DATE} owner decisions] {u['note']} || " + (it.get("notes") or "")
    refs = it.setdefault("artifact_refs", [])
    if not any((r.get("path") if isinstance(r, dict) else r) == DOC for r in refs):
        refs.append({"label": "Batch B owner decisions", "path": DOC, "type": "decisions"})

for cid, title, pri, risk, notes, rel, fn in NEW:
    if cid in by_id:
        continue
    d["items"].append({
        "type": "CR", "id": cid, "sprint_key": "TBD", "title": title, "status": "INTAKE",
        "priority": pri, "risk": risk, "area": "Payments / Coupons / Credit", "files": "TBD",
        "notes": notes, "blocked_on": WAIT, "related": rel, "assignee": "Abhishek",
        "client": "ALL", "batch": BATCH,
        "artifact_refs": [{"label": "Intake", "path": f"memory/change_requests/{fn}", "type": "intake"}],
    })

d["meta"]["last_updated"] = DATE
d["meta"]["last_action"] = "Batch B owner decisions applied: 9 P0 items ready for impact, 7 re-prioritised, CR-541 + CR-542 registered."
d["meta"]["total"] = d["meta"]["total_items"] = len(d["items"])
json.dump(d, open(P, "w"), indent=2, ensure_ascii=False)
print("updated", len(UPDATES), "total", len(d["items"]))
