# Read-only: where does a hard reload of a legacy deep link land, and do the pages render via in-app navigation? (QA_TGK; credentials never printed)
import re, json, asyncio
from playwright.async_api import async_playwright
sec = open('/app/memory/test_credentials.md').read().split('## QA_TGK')[1]
EMAIL = re.search(r'email `([^`]+)`', sec).group(1); PASSWORD = re.search(r'password `([^`]+)`', sec).group(1)
URL = open('/app/frontend/.env').read().split('REACT_APP_BACKEND_URL=')[1].split('\n')[0].strip()
async def main():
    res = {"console_errors": []}
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox'])
        pg = await b.new_page(viewport={"width": 1920, "height": 800})
        pg.on("console", lambda m: res["console_errors"].append(m.text[:160]) if m.type == "error" else None)
        await pg.goto(URL + "/", wait_until="networkidle")
        await pg.fill("[data-testid='login-email']", EMAIL); await pg.fill("[data-testid='login-password']", PASSWORD)
        await pg.click("button[type='submit']")
        await pg.wait_for_url(lambda u: "/loading" not in u and not u.rstrip('/').endswith(URL.rstrip('/')), timeout=90000)
        await pg.wait_for_timeout(1500); res["landing"] = pg.url.replace(URL, '')
        await pg.goto(URL + "/pms/departures", wait_until="domcontentloaded")
        for i in range(6):
            await pg.wait_for_timeout(4000)
            if "/loading" not in pg.url: break
        res["hard_reload_departures_lands_on"] = pg.url.replace(URL, '')
        for path, tid in (("/pms/departures", "departures-page"), ("/pms/new-booking", None), ("/pms/check-in", None)):
            await pg.evaluate(f"window.history.pushState({{}}, '', '{path}'); window.dispatchEvent(new PopStateEvent('popstate'))")
            await pg.wait_for_timeout(4000)
            res["inapp_" + path.split('/')[-1]] = {"url": pg.url.replace(URL, ''), "headings": await pg.eval_on_selector_all("h1,h2", "els => els.slice(0,3).map(e => e.textContent.trim())"), "testid_present": (await pg.query_selector(f"[data-testid='{tid}']")) is not None if tid else None}
        await b.close()
    res["console_errors"] = [e for e in res["console_errors"] if not re.search(r"socket|firebase|messaging|WebSocket", e, re.I)]
    print(json.dumps(res, indent=1)); json.dump(res, open('/app/memory/evidence/CR-385/phase4_qa/legacy_routes_selfcheck.json', 'w'), indent=1)
asyncio.run(main())
