import json

P = "/app/memory/control/registry.json"
DOC = "memory/change_requests/BATCH_A_OWNER_DECISIONS_2026_11_14.md"
DATE = "2026-11-14"
READY = f"GATE_1_INTAKE_COMPLETE — OWNER ODs ANSWERED {DATE} (Batch A). Next: IMPACT ANALYSIS BATCH-A."
WAIT_GYAN = "Gyan — backend keys/rights"

UPDATES = {
    "BUG-674": dict(status=READY, blocked_on=WAIT_GYAN, note="Add notes to order cancel dialog (all modes); show in Cancellation report + Order Beta."),
    "BUG-670": dict(status=READY, blocked_on=WAIT_GYAN, note="RE-SCOPED: item notes collected in CancelFoodModal but never sent (cancelItem payload has no notes). Fix payload + show in Cancellation report + Order Beta."),
    "CR-493": dict(status=READY, blocked_on=WAIT_GYAN, note="Reason always mandatory; one setting (Gyan key) for notes mandatory/optional, default optional."),
    "CR-492": dict(status=READY, blocked_on=WAIT_GYAN, note="No right → hidden. Item + order comp (100% discount hidden as fallback)."),
    "CR-494": dict(status=READY, blocked_on=WAIT_GYAN, assignee="Abhishek", note="Separate PIN per action (6 actions incl. discount + comp), per-action ₹ threshold (0 = always), daily per-user ₹+count limits for cancels+discounts, over limit → PIN. Config in backend admin."),
    "CR-529": dict(status=f"INTAKE — PHASE 2 (OTP for all PIN actions). Decided {DATE}.", priority="P1", blocked_on="CR-494", note="Phase 1 PIN = CR-494. This CR = OTP phase 2."),
    "CR-515": dict(status=READY, blocked_on=WAIT_GYAN, note="4 new rights: reprint, change payment method, make unpaid, collect pay-later. No right → hidden."),
    "CR-495": dict(status=READY, blocked_on="CR-492; backend package keys", note="Package at check-in (walk-in too), OTA meal plan auto. Comp any food up to ₹/guest × guests per day; above → PIN."),
    "CR-445": dict(status=READY, blocked_on=WAIT_GYAN, assignee="Abhishek", note="Absorbs CR-058. Comp in payment-methods list, reason required, count in Discount report comp section."),
    "CR-443": dict(status=READY, blocked_on=WAIT_GYAN, assignee="Abhishek", note="Absorbs CR-496. POS + push; right decides eligibility, employee can mute per device. Phase 2: read tick + open order."),
    "CR-071": dict(status=READY, blocked_on=WAIT_GYAN, assignee="Abhishek", note="Pulled into Batch A."),
    "CR-372-B": dict(status=READY, note="Delete /settlement/preview. /local-printer-setup decide at impact. Report previews already guarded."),
    "CR-058": dict(status=f"CLOSED — MERGED INTO CR-445 ({DATE}, owner)", note="Merged into CR-445."),
    "CR-496": dict(status=f"CLOSED — MERGED INTO CR-443 ({DATE}, owner)", note="Merged into CR-443."),
}

d = json.load(open(P))
by_id = {i["id"]: i for i in d["items"]}
for bid, u in UPDATES.items():
    it = by_id[bid]
    it["status"] = u["status"]
    it["client"] = "ALL"
    it["batch"] = "BATCH-A-2026-11-14"
    for k in ("priority", "assignee", "blocked_on"):
        if k in u:
            it[k] = u[k]
    it["notes"] = f"[{DATE} owner decisions] {u['note']} || " + (it.get("notes") or "")
    refs = it.setdefault("artifact_refs", [])
    if not any((r.get("path") if isinstance(r, dict) else r) == DOC for r in refs):
        refs.append({"label": "Batch A owner decisions", "path": DOC, "type": "decisions"})

if "CR-540" not in by_id:
    d["items"].append({
        "type": "CR", "id": "CR-540", "sprint_key": "TBD",
        "title": "Revenue Leakage Controls (Cancels, Discounts, Comps)",
        "status": "INTAKE", "priority": "TBD", "risk": "HIGH", "area": "Permissions / Security",
        "files": "TBD", "notes": "Owner accepted 8 leakage ideas as one CR (2026-11-14).",
        "blocked_on": WAIT_GYAN, "related": ["CR-494", "CR-443", "CR-515", "CR-497"],
        "assignee": "Abhishek", "client": "ALL", "batch": "BATCH-A-2026-11-14",
        "artifact_refs": [{"label": "Intake", "path": "memory/change_requests/CR-540_REVENUE_LEAKAGE_CONTROLS_INTAKE.md", "type": "intake"}],
    })

d["meta"]["last_updated"] = DATE
d["meta"]["last_action"] = "Batch A owner decisions applied: 12 items ready for impact, CR-058→CR-445, CR-496→CR-443 merged, CR-529 P1 phase 2, CR-540 registered."
d["meta"]["total"] = d["meta"]["total_items"] = len(d["items"])
json.dump(d, open(P, "w"), indent=2, ensure_ascii=False)
print("updated", len(UPDATES), "total", len(d["items"]))
