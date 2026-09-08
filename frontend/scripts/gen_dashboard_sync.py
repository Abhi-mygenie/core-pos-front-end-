#!/usr/bin/env python3
# CR-048-REBUILD: Dashboard sync script — regenerates dashboard JSONs from registry.json
# Usage: python3 frontend/scripts/gen_dashboard_sync.py
# Input:  /app/memory/control/registry.json
# Output: /app/frontend/public/__dev/data/cr_registry.json
#         /app/frontend/public/__dev/data/bug_tracker.json

import json
import os
from datetime import datetime, timezone

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
REGISTRY_PATH = os.path.join(ROOT, "memory", "control", "registry.json")
CR_OUT = os.path.join(ROOT, "frontend", "public", "__dev", "data", "cr_registry.json")
BUG_OUT = os.path.join(ROOT, "frontend", "public", "__dev", "data", "bug_tracker.json")

CLOSED_KW = ['CLOSED', 'QA PASS', 'OWNER VERIFIED', 'SHIPPED', 'VERIFIED',
             'CANNOT REPRODUCE', 'DUPLICATE', 'NOT A BUG', 'AS DESIGNED', 'AS DESIRED']
IMPL_KW = ['IMPLEMENTED']
BLOCKED_KW = ['BACKEND-BLOCKED', 'CRM-BLOCKED']
ABSORBED_KW = ['ABSORBED', 'HALTED', 'DEFERRED', 'RETIRED', 'SUBSUMED']
INTAKE_KW = ['INTAKE', 'BACKEND-BLOCKED', 'CRM-BLOCKED', 'NOT STARTED', 'PLACEHOLDER']

def classify_cr_category(status):
    s = (status or '').upper()
    if 'NOT STARTED' in s and 'CLOSED' not in s:
        return 'NOT_STARTED'
    if any(k in s for k in BLOCKED_KW) and 'CLOSED' not in s:
        return 'BLOCKED'
    if any(k in s for k in ABSORBED_KW) and 'CLOSED' not in s:
        return 'SUBSUMED'
    if any(k in s for k in CLOSED_KW):
        return 'SHIPPED'
    if any(k in s for k in IMPL_KW):
        return 'SHIPPED'
    return 'IN_PROGRESS'

def classify_bug_section(item):
    rid = (item.get('id') or '').upper()
    if rid.startswith('PROD-') or rid.startswith('PROD_'):
        return 'production_hotfixes'
    s = (item.get('status') or '').upper()
    if any(k in s for k in CLOSED_KW) or any(k in s for k in IMPL_KW) or any(k in s for k in ABSORBED_KW):
        return 'older_closed_or_partial'
    if any(k in s for k in INTAKE_KW):
        return 'true_intake_or_blocked'
    return 'active_recent_bugs'

def extract_blocker(status):
    s = (status or '').upper()
    if 'BACKEND' in s and 'BLOCK' in s:
        return 'Backend'
    if 'CRM' in s and 'BLOCK' in s:
        return 'CRM'
    return ''

def normalize_artifact_refs(refs):
    if not refs:
        return []
    if isinstance(refs, list):
        return refs
    if isinstance(refs, dict):
        label_map = {
            'intake': 'Intake',
            'impact_analysis': 'Impact Analysis',
            'implementation_plan': 'Implementation Plan',
            'code_gate': 'Code Gate',
            'impl_summary': 'Implementation Summary',
            'qa_report': 'QA Report',
            'smoke_signoff': 'Owner Smoke Sign-off',
            'backend_brief': 'Backend Brief',
        }
        out = []
        for k, v in refs.items():
            if v and isinstance(v, str):
                out.append({
                    'label': label_map.get(k, k.replace('_', ' ').title()),
                    'path': v,
                    'type': k
                })
        return out
    return []

def count_completeness(refs):
    slots = ['intake', 'impact_analysis', 'implementation_plan', 'code_gate',
             'impl_summary', 'qa_report', 'smoke_signoff']
    if isinstance(refs, dict):
        present = sum(1 for k in slots if refs.get(k))
    elif isinstance(refs, list):
        types = {r.get('type', '') for r in refs if isinstance(r, dict)}
        type_map = {'intake': 'intake', 'impact': 'impact_analysis', 'plan': 'implementation_plan',
                    'code_gate': 'code_gate', 'impl_summary': 'impl_summary',
                    'qa_report': 'qa_report', 'smoke_signoff': 'smoke_signoff'}
        present = sum(1 for slot_type in type_map.values() if slot_type in types or
                      any(slot_type in t for t in types))
    else:
        present = 0
    return f"{present}/7"

def is_cr(item):
    t = (item.get('type') or '').upper()
    if t == 'CR':
        return True
    rid = (item.get('id') or '').upper()
    return rid.startswith(('CR-', 'POS2-', 'UX-', 'DEV-'))

def is_bug(item):
    t = (item.get('type') or '').upper()
    if t == 'BUG':
        return True
    rid = (item.get('id') or '').upper()
    return rid.startswith(('BUG-', 'PROD-'))

def main():
    with open(REGISTRY_PATH) as f:
        registry = json.load(f)

    items = registry.get('items', [])
    now = datetime.now(timezone.utc).isoformat()

    # --- CR Registry ---
    crs = [i for i in items if is_cr(i)]
    sprints = {}
    for cr in crs:
        sk = cr.get('sprint_key') or 'unassigned'
        if sk not in sprints:
            sprints[sk] = {'status': 'IN_PROGRESS', 'crs': []}
        cat = classify_cr_category(cr.get('status', ''))
        sprints[sk]['crs'].append({
            'id': cr['id'],
            'title': cr.get('title', ''),
            'status': cr.get('status', ''),
            'priority': cr.get('severity', '') or '',
            'category': cat,
            'artifact_refs': normalize_artifact_refs(cr.get('artifact_refs')),
            'completeness': count_completeness(cr.get('artifact_refs')),
        })

    # Mark sprints as CLOSED if all CRs are shipped/subsumed
    for sk, sp in sprints.items():
        if sp['crs'] and all(c['category'] in ('SHIPPED', 'SUBSUMED') for c in sp['crs']):
            sp['status'] = 'CLOSED'

    cat_counts = {}
    for sp in sprints.values():
        for c in sp['crs']:
            cat_counts[c['category']] = cat_counts.get(c['category'], 0) + 1

    active = cat_counts.get('NOT_STARTED', 0) + cat_counts.get('IN_PROGRESS', 0) + cat_counts.get('BLOCKED', 0)
    shipped = cat_counts.get('SHIPPED', 0)

    cr_out = {
        'generated_at': now,
        'source': 'gen_dashboard_sync.py (CR-048-REBUILD)',
        'schema_version': '2.0',
        'sprints': sprints,
        'cross_sprint_dependency_flags': [],
        'category_counts': cat_counts,
        'active_count': active,
        'shipped_count': shipped,
        'subsumed_count': cat_counts.get('SUBSUMED', 0),
        'closed_count': shipped,
        'tracked_total': len(crs),
    }

    with open(CR_OUT, 'w') as f:
        json.dump(cr_out, f, indent=2)

    # --- Bug Tracker ---
    bugs = [i for i in items if is_bug(i)]
    sections = {
        'active_recent_bugs': [],
        'older_closed_or_partial': [],
        'true_intake_or_blocked': [],
        'production_hotfixes': [],
    }

    closed_count = 0
    intake_count = 0
    blocked_count = 0

    for bug in bugs:
        section = classify_bug_section(bug)
        s_upper = (bug.get('status') or '').upper()

        if any(k in s_upper for k in CLOSED_KW) or any(k in s_upper for k in IMPL_KW):
            closed_count += 1
        if any(k in s_upper for k in INTAKE_KW):
            intake_count += 1
        if any(k in s_upper for k in BLOCKED_KW):
            blocked_count += 1

        sections[section].append({
            'id': bug['id'],
            'title': bug.get('title', ''),
            'priority': bug.get('severity', '') or '',
            'status': bug.get('status', ''),
            'sprint': bug.get('sprint_key', '') or '',
            'blocker': extract_blocker(bug.get('status', '')),
            'artifact_refs': normalize_artifact_refs(bug.get('artifact_refs')),
            'completeness': count_completeness(bug.get('artifact_refs')),
        })

    bug_out = {
        'generated_at': now,
        'schema_version': '2.0',
        'source': 'gen_dashboard_sync.py (CR-048-REBUILD)',
        'summary': {
            'total_tracked': len(bugs),
            'closed_verified': closed_count,
            'open_intake': intake_count,
            'backend_blocked': blocked_count,
            'crm_blocked': 0,
        },
        'active_recent_bugs': sections['active_recent_bugs'],
        'older_closed_or_partial': sections['older_closed_or_partial'],
        'true_intake_or_blocked': sections['true_intake_or_blocked'],
        'production_hotfixes': sections['production_hotfixes'],
        'intake_only_bugs': [],
        'pos_2_0_closed_consolidated_2026_05_18': [],
        'pos_final_1_0_closed_consolidated_2026_05_12': [],
        'normalized_at': now,
    }

    with open(BUG_OUT, 'w') as f:
        json.dump(bug_out, f, indent=2)

    # --- Summary ---
    print(f"CR-048-REBUILD sync complete")
    print(f"  cr_registry.json:  {len(crs)} CRs across {len(sprints)} sprints")
    print(f"  bug_tracker.json:  {len(bugs)} BUGs — "
          f"{len(sections['active_recent_bugs'])} active, "
          f"{len(sections['older_closed_or_partial'])} closed, "
          f"{len(sections['true_intake_or_blocked'])} intake/blocked, "
          f"{len(sections['production_hotfixes'])} hotfixes")
    print(f"  Generated at: {now}")

if __name__ == '__main__':
    main()
