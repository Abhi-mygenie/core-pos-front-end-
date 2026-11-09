# BUG-450 self-check (read-only, QA_TGK): Room Mapping tab → Rates & Restrictions → labels use catalogue room_name. Credentials read from memory, never printed.
import re, json, asyncio
from playwright.async_api import async_playwright
sec = open('/app/memory/test_credentials.md').read().split('## QA_TGK')[1]
EMAIL = re.search(r'email `([^`]+)`', sec).group(1); PASSWORD = re.search(r'password `([^`]+)`', sec).group(1)
URL = open('/app/frontend/.env').read().split('REACT_APP_BACKEND_URL=')[1].split('\n')[0].strip()
OUT = '/app/memory/evidence/CR-385/phase4_qa/bug450_selfcheck.json'

async def main():
    res = {"console_errors": [], "mutating_requests": []}
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox'])
        pg = await b.new_page(viewport={"width": 1920, "height": 800})
        pg.on("console", lambda m: res["console_errors"].append(m.text[:200]) if m.type == "error" else None)
        pg.on("request", lambda r: res["mutating_requests"].append(r.method + " " + r.url.split('.online')[-1]) if r.method in ("POST", "PUT", "PATCH", "DELETE") and "/api/" in r.url and "login" not in r.url else None)
        await pg.goto(URL + "/", wait_until="networkidle")
        await pg.fill("[data-testid='login-email']", EMAIL); await pg.fill("[data-testid='login-password']", PASSWORD)
        await pg.click("button[type='submit']")
        await pg.wait_for_url(lambda u: "/loading" not in u and not u.rstrip('/').endswith(URL.rstrip('/')), timeout=40000)
        await pg.wait_for_timeout(1500)
        print("after-login url", pg.url.replace(URL, ''))
        await pg.goto(URL + "/pms/channel-manager", wait_until="domcontentloaded")
        for i in range(12):
            await pg.wait_for_timeout(5000); print("t", i*5, pg.url.replace(URL, ''))
            if await pg.query_selector("[data-testid='channel-manager-tab-3']"): break
        await pg.screenshot(path='/app/memory/evidence/CR-385/phase4_qa/bug450_nav_debug.png')
        await pg.wait_for_selector("[data-testid='channel-manager-tab-3']", timeout=5000)
        await pg.click("[data-testid='channel-manager-tab-3']"); await pg.wait_for_selector("[data-testid='rt-rates-grid']", timeout=30000)
        await pg.wait_for_timeout(1500)
        await pg.click("[data-testid='rt-subtab-inv']"); await pg.wait_for_selector("[data-testid='rt-inv-form']")
        res["labels_before_mapping"] = await pg.eval_on_selector_all("[data-testid^='rt-inv-label-']", "els => els.map(e => [e.dataset.testid, e.textContent])")
        await pg.click("[data-testid='channel-manager-tab-2']"); await pg.wait_for_timeout(4000)
        await pg.click("[data-testid='channel-manager-tab-3']"); await pg.wait_for_selector("[data-testid='rt-rates-grid']", timeout=30000)
        await pg.wait_for_timeout(1500)
        res["grid_headers_after_mapping"] = await pg.eval_on_selector_all("[data-testid='rt-rates-grid'] tbody td[colspan] span", "els => els.map(e => e.textContent.trim())")
        await pg.click("[data-testid='rt-subtab-inv']"); await pg.wait_for_selector("[data-testid='rt-inv-form']")
        res["labels_after_mapping"] = await pg.eval_on_selector_all("[data-testid^='rt-inv-label-']", "els => els.map(e => [e.dataset.testid, e.textContent])")
        res["push_btn_disabled"] = await pg.get_attribute("[data-testid='rt-inv-push-btn']", "disabled")
        await pg.screenshot(path='/app/memory/evidence/CR-385/phase4_qa/bug450_inv_after_mapping.png')
        for path in ("/pms/departures", "/pms/new-booking", "/pms/check-in"):
            await pg.goto(URL + path, wait_until="domcontentloaded"); await pg.wait_for_timeout(2500)
            res["legacy_" + path.split('/')[-1]] = {"url": pg.url.replace(URL, ''), "h1": (await pg.eval_on_selector_all("h1,h2", "els => els.slice(0,2).map(e => e.textContent.trim())"))}
        await b.close()
    res["console_errors"] = [e for e in res["console_errors"] if not re.search(r"socket|firebase|messaging|WebSocket", e, re.I)]
    json.dump(res, open(OUT, 'w'), indent=1)
    print(json.dumps(res, indent=1))
asyncio.run(main())
