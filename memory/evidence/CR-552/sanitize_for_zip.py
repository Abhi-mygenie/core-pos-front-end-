#!/usr/bin/env python3
"""
Build a shareable copy of the INV-WEB-EDIT-NOTCONFIRM artifacts with secrets and
customer PII redacted (AGENT_PROMPT_ALPHA v0.7 security rule: never ship tokens,
credentials or customer-sensitive payloads in reports/handovers).

Redacts: auth/firebase/crm tokens, phone numbers, emails, delivery addresses,
lat/long, and customer contact fields. Order ids, item ids and food_status are
PRESERVED — they are the subject of the investigation.

Usage: python3 sanitize_for_zip.py <src_dir> <dst_dir>
"""
import json, os, re, shutil, sys

SRC, DST = sys.argv[1], sys.argv[2]
MASK = "***REDACTED***"

SENSITIVE_KEYS = {
    "token", "old_token", "access_token", "firebase_token", "crm_token",
    "phone", "email", "contact_person_number", "contact_person_name",
    "address", "delivery_address", "latitude", "longitude", "pincode",
    "fcm_token", "password",
}

# NOTE on precision: timestamps ("2026-11-17 23:07:05") must survive intact — they
# are evidence. So phone matching requires a 10+ digit unbroken run, which no date
# component can produce.
TEXT_PATTERNS = [
    # secrets by key
    (re.compile(r'("(?:old_token|token|firebase_token|crm_token|access_token|fcm_token|password)"\s*:\s*")[^"]*(")'), r'\1' + MASK + r'\2'),
    (re.compile(r'("PROBE_PWD"|PROBE_PWD=)[^\s]*'), r'\1' + MASK),
    # customer PII by key
    (re.compile(r'("(?:address|email|contact_person_number|pincode)"\s*:\s*")[^"]*(")'), r'\1' + MASK + r'\2'),
    (re.compile(r'("(?:latitude|longitude)"\s*:\s*")[^"]*(")'), r'\1' + MASK + r'\2'),
    (re.compile(r'("phone"\s*:\s*")[^"]*(")'), r'\1' + MASK + r'\2'),
    # free-floating PII (incl. values truncated mid-token by log clipping)
    (re.compile(r'[\w\.\-+]+@[\w\.\-]+\.\w+'), MASK),
    (re.compile(r'temp_[0-9a-f]{6,}[0-9a-f.]*'), MASK),
    (re.compile(r'(?<![\d:\-])\+?\d{10,15}(?![\d:\-])'), MASK),
]


def scrub(obj):
    if isinstance(obj, dict):
        return {k: (MASK if k.lower() in SENSITIVE_KEYS else scrub(v)) for k, v in obj.items()}
    if isinstance(obj, list):
        return [scrub(v) for v in obj]
    return obj


def scrub_text(s):
    for pat, rep in TEXT_PATTERNS:
        s = pat.sub(rep, s)
    return s


os.makedirs(DST, exist_ok=True)
for name in sorted(os.listdir(SRC)):
    src, dst = os.path.join(SRC, name), os.path.join(DST, name)
    if os.path.isdir(src) or name == os.path.basename(__file__):
        continue
    if name.endswith(".json"):
        with open(src) as f:
            json.dump(scrub(json.load(f)), open(dst, "w"), indent=2)
    elif name.endswith(".jsonl"):
        with open(src) as f, open(dst, "w") as o:
            for line in f:
                if line.strip():
                    o.write(json.dumps(scrub(json.loads(line))) + "\n")
    elif name.endswith((".log", ".txt", ".py")):
        open(dst, "w").write(scrub_text(open(src).read()))
    else:
        shutil.copy2(src, dst)
    print("sanitized:", name)
