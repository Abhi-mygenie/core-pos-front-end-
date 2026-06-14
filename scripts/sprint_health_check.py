#!/usr/bin/env python3
"""
POS Sprint Health Check — Prevention mechanism for documentation drift.
Run at session start/end: python3 /app/scripts/sprint_health_check.py
"""
import json
import os
import glob
import sys
from datetime import datetime

REGISTRY = "/app/memory/control/registry.json"
CR_REGISTRY = "/app/memory/control/CR_REGISTRY.md"
BUG_TRACKER = "/app/memory/control/BUG_TRACKER.md"
FILE_OWNERSHIP = "/app/memory/control/FILE_OWNERSHIP.md"
CHANGE_REQUESTS = "/app/memory/change_requests"
HANDOVERS = "/app/memory/handover"
QA_REPORTS = "/app/memory/test_reports"

PASS = "\033[92m PASS\033[0m"
FAIL = "\033[91m FAIL\033[0m"
WARN = "\033[93m WARN\033[0m"

def load_registry():
    with open(REGISTRY, "r") as f:
        return json.load(f)

def check_registry_basics(data):
    """Check 1: registry.json loads and has items"""
    items = data.get("items", [])
    print(f"\n{'='*60}")
    print(f"CHECK 1: Registry Basics")
    print(f"{'='*60}")
    print(f"  Total items: {len(items)}")

    # Count by sprint
    sprint_counts = {}
    for item in items:
        sk = item.get("sprint_key", "NONE")
        sprint_counts[sk] = sprint_counts.get(sk, 0) + 1
    for sk, count in sorted(sprint_counts.items(), key=lambda x: -x[1]):
        print(f"  sprint_key={sk}: {count} items")

    # Check for items with no sprint_key
    no_sprint = [i["id"] for i in items if not i.get("sprint_key")]
    if no_sprint:
        print(f"\n  {WARN} {len(no_sprint)} items with no sprint_key:")
        for nid in no_sprint[:10]:
            print(f"    - {nid}")
        if len(no_sprint) > 10:
            print(f"    ... and {len(no_sprint)-10} more")
    return len(items)

def check_artifact_completeness(data, sprint="pos_4_0"):
    """Check 2: For each sprint item, verify expected artifacts exist"""
    items = [i for i in data["items"] if i.get("sprint_key") == sprint]
    print(f"\n{'='*60}")
    print(f"CHECK 2: Artifact Completeness ({sprint}, {len(items)} items)")
    print(f"{'='*60}")

    missing_intake = []
    missing_plan = []
    missing_impl = []
    missing_smoke = []

    for item in items:
        iid = item["id"]
        status = item.get("status", "")

        # Check intake doc exists on disk
        refs = item.get("artifact_refs", "")
        if isinstance(refs, str) and refs:
            path = os.path.join("/app", refs)
            if not os.path.exists(path):
                missing_intake.append(f"{iid}: {refs}")

        # Check artifact fields
        if item.get("art1_intake") == "MISSING":
            missing_intake.append(f"{iid}: art1_intake=MISSING")
        if item.get("art3_plan") == "MISSING" and "IMPLEMENTED" in status:
            missing_plan.append(f"{iid}: implemented but no plan")
        if item.get("art5_impl_summary_qa") == "MISSING" and "IMPLEMENTED" in status:
            missing_impl.append(f"{iid}: implemented but no QA")
        if item.get("art6_owner_smoke") == "MISSING" and "CLOSED" in status:
            missing_smoke.append(f"{iid}: closed but no smoke")

    if missing_intake:
        print(f"\n  {WARN} Missing intake docs ({len(missing_intake)}):")
        for m in missing_intake[:5]:
            print(f"    - {m}")
    else:
        print(f"  {PASS} All intake docs present")

    if missing_plan:
        print(f"\n  {WARN} Implemented without plan ({len(missing_plan)}):")
        for m in missing_plan[:5]:
            print(f"    - {m}")
    else:
        print(f"  {PASS} All implemented items have plans")

    if missing_smoke:
        print(f"\n  {FAIL} Closed without smoke ({len(missing_smoke)}):")
        for m in missing_smoke[:5]:
            print(f"    - {m}")

    return len(missing_intake) + len(missing_plan) + len(missing_smoke)

def check_status_sync(data):
    """Check 3: Compare registry.json statuses against CR_REGISTRY.md keywords"""
    print(f"\n{'='*60}")
    print(f"CHECK 3: Status Sync (registry.json vs CR_REGISTRY.md)")
    print(f"{'='*60}")

    # Read CR_REGISTRY for keywords
    if not os.path.exists(CR_REGISTRY):
        print(f"  {FAIL} CR_REGISTRY.md not found!")
        return 1

    with open(CR_REGISTRY, "r") as f:
        cr_text = f.read()

    mismatches = 0
    for item in data["items"]:
        iid = item["id"]
        json_status = item.get("status", "").upper()

        # Quick keyword check — if CR_REGISTRY says CLOSED but JSON says REGISTERED
        if f"{iid}" in cr_text:
            if "REGISTERED" in json_status:
                # Check if CR_REGISTRY has a different status
                if f"{iid}" in cr_text:
                    lines = [l for l in cr_text.split("\n") if iid in l]
                    for line in lines:
                        if "IMPLEMENTED" in line.upper() or "CLOSED" in line.upper():
                            print(f"  {WARN} {iid}: JSON='{json_status}' but CR_REGISTRY mentions IMPLEMENTED/CLOSED")
                            mismatches += 1
                            break

    if mismatches == 0:
        print(f"  {PASS} No obvious status mismatches detected")
    else:
        print(f"\n  {WARN} {mismatches} potential status mismatches")
    return mismatches

def check_file_ownership():
    """Check 4: FILE_OWNERSHIP.md freshness"""
    print(f"\n{'='*60}")
    print(f"CHECK 4: FILE_OWNERSHIP.md Freshness")
    print(f"{'='*60}")

    if not os.path.exists(FILE_OWNERSHIP):
        print(f"  {FAIL} FILE_OWNERSHIP.md not found!")
        return 1

    with open(FILE_OWNERSHIP, "r") as f:
        content = f.read()

    # Check last updated
    for line in content.split("\n"):
        if "Last Updated" in line:
            print(f"  {line.strip()}")
            break

    # Check if key recent files are mentioned
    recent_files = [
        "orderPayloadStripper.js",
        "insightsCache.js",
        "InsightsCacheContext.jsx",
        "SettlementPanel.jsx"
    ]
    missing = [f for f in recent_files if f not in content]
    if missing:
        print(f"  {WARN} {len(missing)} recent files not in FILE_OWNERSHIP:")
        for m in missing:
            print(f"    - {m}")
    else:
        print(f"  {PASS} Key recent files present in FILE_OWNERSHIP")
    return len(missing)

def check_session_start_files():
    """Check 5: Session Start files (Artifact #0)"""
    print(f"\n{'='*60}")
    print(f"CHECK 5: Session Start Files (Artifact #0)")
    print(f"{'='*60}")

    sessions_dir = "/app/memory/control/sessions"
    if not os.path.exists(sessions_dir):
        print(f"  {WARN} No sessions/ directory found")
        return 0

    files = glob.glob(os.path.join(sessions_dir, "SESSION_START_*.md"))
    print(f"  Found {len(files)} Session Start files")
    for f in sorted(files):
        print(f"    - {os.path.basename(f)}")
    return 0

def check_handover_coverage():
    """Check 6: Handover docs exist for recent sessions"""
    print(f"\n{'='*60}")
    print(f"CHECK 6: Handover Coverage")
    print(f"{'='*60}")

    if not os.path.exists(HANDOVERS):
        print(f"  {WARN} No handover/ directory")
        return 0

    handovers = glob.glob(os.path.join(HANDOVERS, "*.md"))
    print(f"  Total handover docs: {len(handovers)}")

    # Check for QA handovers
    qa_handovers = [h for h in handovers if "QA" in os.path.basename(h).upper()]
    print(f"  QA handovers: {len(qa_handovers)}")
    for h in sorted(qa_handovers):
        print(f"    - {os.path.basename(h)}")

    return 0

def check_smoke_batch():
    """Check 7: Smoke batch exists and coverage"""
    print(f"\n{'='*60}")
    print(f"CHECK 7: Smoke Batch Coverage")
    print(f"{'='*60}")

    smoke_files = glob.glob("/app/memory/control/POS4_0_OWNER_SMOKE_BATCH*.md")
    print(f"  Smoke batch files: {len(smoke_files)}")
    for sf in sorted(smoke_files):
        print(f"    - {os.path.basename(sf)}")

    return 0

def main():
    print("=" * 60)
    print("  POS SPRINT HEALTH CHECK")
    print(f"  Run: {datetime.now().strftime('%Y-%m-%d %H:%M')}")
    print("=" * 60)

    data = load_registry()
    total_issues = 0

    total_issues += check_registry_basics(data)  # informational
    total_issues += check_artifact_completeness(data, "pos_4_0")
    total_issues += check_status_sync(data)
    total_issues += check_file_ownership()
    check_session_start_files()
    check_handover_coverage()
    check_smoke_batch()

    print(f"\n{'='*60}")
    print(f"  SUMMARY")
    print(f"{'='*60}")
    if total_issues == 0:
        print(f"  {PASS} All checks passed — sprint health is GREEN")
    else:
        print(f"  {WARN} {total_issues} issues found — review above")
    print()

if __name__ == "__main__":
    main()
