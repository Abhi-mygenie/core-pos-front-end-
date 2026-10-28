# P5 Session A follow-up — READ-ONLY self-check of the it.29 "checkout-room-booking-toggle leak" finding: is the D57/M6-09 CSS rule live on /pms/front-desk-v2? Credentials from memory, never printed.
import re, json, asyncio
from playwright.async_api import async_playwright
sec = open('/app/memory/test_credentials.md').read().split('## QA_TGK')[1]
EMAIL = re.search(r'email `([^`]+)`', sec).group(1); PASSWORD = re.search(r'password `([^`]+)`', sec).group(1)
URL = open('/app/frontend/.env').read().split('REACT_APP_BACKEND_URL=')[1].split('\n')[0].strip()
OUT = '/app/memory/evidence/CR-385/probes_2026_09_23_release/it29_toggle_css_selfcheck.json'
PROBE = """() => {
  const host = document.createElement('div'); host.className = 'frontdesk-bill'; host.style.position='absolute'; host.style.left='-9999px';
  const ids = ['checkout-room-booking-toggle','checkout-transferred-toggle','checkout-room-service-toggle','payment-split-btn','tab-customer-section'];
  const out = {};
  for (const id of ids) { const b = document.createElement('button'); b.setAttribute('data-testid', id); b.textContent = 'x'; host.appendChild(b); }
  document.body.appendChild(host);
  for (const id of ids) out[id] = getComputedStyle(host.querySelector(`[data-testid="${id}"]`)).display;
  const bare = document.createElement('button'); bare.setAttribute('data-testid','checkout-room-booking-toggle'); document.body.appendChild(bare);
  out['bare_outside_host_checkout-room-booking-toggle'] = getComputedStyle(bare).display;
  host.remove(); bare.remove();
  out['rule_in_stylesheets'] = [...document.styleSheets].some(s => { try { return [...s.cssRules].some(r => (r.selectorText||'').includes('.frontdesk-bill [data-testid="checkout-room-booking-toggle"]')); } catch(e) { return false; } });
  return out; }"""

async def main():
    res = {"mutating_requests": []}
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox'])
        pg = await b.new_page(viewport={"width": 1920, "height": 800})
        pg.on("request", lambda r: res["mutating_requests"].append(r.method + " " + r.url.split('.online')[-1]) if r.method in ("POST", "PUT", "PATCH", "DELETE") and "/api/" in r.url and "login" not in r.url and "local-reservations" not in r.url and "settings-list" not in r.url else None)
        await pg.goto(URL + "/", wait_until="domcontentloaded")
        await pg.fill("[data-testid='login-email']", EMAIL); await pg.fill("[data-testid='login-password']", PASSWORD)
        await pg.click("button[type='submit']")
        for i in range(180):
            await pg.wait_for_timeout(1000)
            if "/loading" not in pg.url and pg.url.rstrip('/') != URL.rstrip('/'): break
        await pg.goto(URL + "/pms/front-desk-v2", wait_until="domcontentloaded")
        await pg.wait_for_selector("[data-testid='fd-tab-arrivals']", timeout=120000)
        await pg.wait_for_timeout(1500)
        res["url"] = pg.url.replace(URL, '')
        res["computed_display"] = await pg.evaluate(PROBE)
        await b.close()
    json.dump(res, open(OUT, 'w'), indent=1); print(json.dumps(res, indent=1))
asyncio.run(main())
