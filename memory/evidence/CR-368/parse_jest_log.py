import re, sys, json
ansi = re.compile(r'\x1b\[[0-9;]*m')
log = ansi.sub('', open(sys.argv[1]).read())
lines = log.split('\n')
suite = None
out = []
i = 0
while i < len(lines):
    ln = lines[i]
    m = re.match(r'^(PASS|FAIL) (\S+)', ln)
    if m:
        suite = m.group(2) if m.group(1) == 'FAIL' else None
    elif ln.startswith('  ● ') and suite and 'Console' not in ln:
        name = ln[4:].strip()
        j = i + 1
        msg = []
        while j < len(lines) and not lines[j].startswith('  ● ') and not re.match(r'^(PASS|FAIL) ', lines[j]):
            s = lines[j].strip()
            if s and not s.startswith('at ') and not s.startswith('|') and not re.match(r'^\d+ \|', s) and not s.startswith('>') and not s.startswith('^'):
                msg.append(s)
            j += 1
        loc = [l.strip() for l in lines[i:j] if 'at Object' in l or re.search(r'\((src/[^)]+:\d+:\d+)\)', l)]
        out.append({'suite': suite, 'test': name, 'msg': ' | '.join(msg[:4])[:300], 'loc': loc[0][:120] if loc else ''})
        i = j
        continue
    i += 1
json.dump(out, open('/app/memory/evidence/CR-368/failures_parsed.json', 'w'), indent=1)
by = {}
for o in out:
    by.setdefault(o['suite'], []).append(o)
for s, items in by.items():
    print(f'\n### {s} ({len(items)})')
    for o in items:
        print(f"- {o['test']}\n    MSG: {o['msg']}\n    LOC: {o['loc']}")
