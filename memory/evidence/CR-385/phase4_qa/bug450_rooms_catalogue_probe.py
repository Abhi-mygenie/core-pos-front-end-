# BUG-450 read-only probe: does the TGK Room Mapping catalogue carry room_name? (credentials read from memory/test_credentials.md, never printed)
import re, json, requests
API = "https://preprod.mygenie.online"
sec = open('/app/memory/test_credentials.md').read().split('## QA_TGK')[1]
email = re.search(r'email `([^`]+)`', sec).group(1); password = re.search(r'password `([^`]+)`', sec).group(1)
s = requests.Session(); s.headers.update({"X-localization": "en", "Content-Type": "application/json"})
r = s.post(f"{API}/api/v1/auth/vendoremployee/common-login", json={"email": email, "password": password}); print("LOGIN", r.status_code)
d = r.json(); s.headers["Authorization"] = f"Bearer {d.get('token') or d.get('data', {}).get('token')}"
rooms = s.get(f"{API}/api/v2/vendoremployee/aiosell/rooms"); print("ROOMS", rooms.status_code)
j = rooms.json(); body = j.get('data', j)
ai = body.get('aiosell', {}); ab = ai.get('body', ai) if isinstance(ai, dict) else {}
out = {"top_keys": list(body.keys()), "aiosell_keys": list(ai.keys()) if isinstance(ai, dict) else str(type(ai)),
       "aiosell_body_rooms": ab.get('rooms') if isinstance(ab, dict) else None,
       "mapping_by_aiosell_room_code": (body.get('mapping') or {}).get('by_aiosell_room_code')}
print(json.dumps(out, indent=1, default=str)[:2500])
json.dump(out, open('/app/memory/evidence/CR-385/phase4_qa/bug450_rooms_catalogue_probe.json', 'w'), indent=1, default=str)
