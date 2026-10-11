#!/usr/bin/env python3
"""CR-385 perf probe — local-reservations vs board vs kpis latency (RID 69 preprod). Token never printed. Output: lr_latency_probe.json"""
import re, time, json, requests, os
HERE = os.path.dirname(os.path.abspath(__file__))
c = open('/app/memory/test_credentials.md').read()
email = re.search(r'- email: (\S+)', c).group(1); pw = re.search(r'- password: (\S+)', c).group(1)
H = 'https://preprod.mygenie.online'; s = requests.Session(); s.headers['X-localization'] = 'en'
t = time.time(); r = s.post(f'{H}/api/v1/auth/vendoremployee/common-login', json={'email': email, 'password': pw}, timeout=60)
login_s = round(time.time() - t, 2)
j = r.json(); tok = (j.get('data') or {}).get('token') or j.get('token'); s.headers['Authorization'] = f'Bearer {tok}'
EPS = {
  'LR -30/+60d view=all (workstation call)': '/api/v2/vendoremployee/aiosell/local-reservations?start_date=2026-08-22&end_date=2026-11-20&view=all',
  'LR -7/+30d view=all': '/api/v2/vendoremployee/aiosell/local-reservations?start_date=2026-09-14&end_date=2026-10-21&view=all',
  'room-status-board': '/api/v2/vendoremployee/aiosell/room-status-board',
  'dashboard-kpis today': '/api/v2/vendoremployee/aiosell/dashboard-kpis?start_date=2026-09-21&end_date=2026-09-21',
}
out = {'date': '2026-09-21', 'rid': 69, 'login_seconds': login_s, 'samples': {}, 'note': '3 samples per endpoint from the Emergent pod; 60 s client timeout; token redacted'}
for name, p in EPS.items():
    rec = {'seconds': [], 'status': None, 'payload_bytes': None, 'shape': None, 'timeouts': 0}
    for _ in range(3):
        t = time.time()
        try:
            r = s.get(H + p, timeout=60); rec['seconds'].append(round(time.time() - t, 2)); rec['status'] = r.status_code; rec['payload_bytes'] = len(r.content)
            if 'local-reservations' in p and r.ok:
                rs = r.json()['data']['reservations']; st = {}
                for x in rs: st[x['operational_status']] = st.get(x['operational_status'], 0) + 1
                rec['shape'] = {'reservations': len(rs), 'by_operational_status': st, 'counts': r.json()['data'].get('counts')}
        except Exception as e:
            rec['seconds'].append(f'TIMEOUT>{round(time.time() - t)}s'); rec['timeouts'] += 1
    out['samples'][name] = rec
    print(name, rec['status'], rec['seconds'], rec['payload_bytes'], rec['shape'] and rec['shape']['by_operational_status'], flush=True)
json.dump(out, open(os.path.join(HERE, 'lr_latency_probe.json'), 'w'), indent=1)
print('written')
