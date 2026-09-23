"""Final cleanup pass — cancel remaining P5 QA rows."""
import asyncio, os, re, json, time
from playwright.async_api import async_playwright

def parse_creds():
    t=open("/app/memory/test_credentials.md").read().split("## QA_TGK")[1].split("##")[0]
    return re.search(r"email\s*`([^`]+)`",t).group(1), re.search(r"password\s*`([^`]+)`",t).group(1)

async def main():
    email,pw = parse_creds()
    url = open("/app/frontend/.env").read().split("REACT_APP_BACKEND_URL=")[1].split("\n")[0].strip()
    log = {"steps": [], "captured_bill_payment": [], "end": {}}
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path="/usr/bin/google-chrome", headless=True, args=["--no-sandbox","--disable-dev-shm-usage"])
        ctx = await b.new_context(viewport={"width":1366,"height":768})
        page = await ctx.new_page()
        async def _req(r):
            if r.method in ("POST","PUT","PATCH") and ("bill-payment" in r.url or "order-bill-payment" in r.url or "cancel" in r.url):
                try: bd=r.post_data or ""
                except: bd=""
                log["captured_bill_payment"].append({"url":r.url,"body":bd[:2000]})
        page.on("request", _req)

        # login
        await page.goto(url+"/", wait_until="domcontentloaded", timeout=60000)
        await page.wait_for_selector("input[type='password']", timeout=30000)
        inputs = await page.query_selector_all("input")
        await inputs[0].fill(email)
        await page.locator("input[type='password']").fill(pw)
        await page.locator("button[type='submit']").click()
        end=time.time()+90
        while time.time()<end:
            if "/loading" not in page.url and page.url != url+"/": break
            await page.wait_for_timeout(500)

        # arrivals cancel loop
        await page.goto(url+"/pms/front-desk-v2?tab=arrivals", wait_until="domcontentloaded", timeout=60000)
        await page.wait_for_selector("[data-testid='fd-page']", timeout=20000)
        for chip in ["fd-chip-arrivals-late","fd-chip-arrivals-today","fd-chip-arrivals-tomorrow","fd-chip-arrivals-upcoming"]:
            try:
                await page.click(f"[data-testid='{chip}']"); await page.wait_for_timeout(2500)
            except: continue
            for attempt in range(5):
                ids=[]
                for r in await page.query_selector_all("[data-testid^='fd-row-']"):
                    tx = await r.inner_text()
                    if "P5 QA" in tx:
                        tid = await r.get_attribute("data-testid")
                        m = re.match(r"fd-row-([^-]+)", tid)
                        if m: ids.append(m.group(1))
                ids=list(dict.fromkeys(ids))
                if not ids: break
                for rid in ids:
                    try:
                        cb = await page.query_selector(f"[data-testid='fd-row-{rid}-cancel-btn']")
                        if not cb: continue
                        await cb.click()
                        await page.wait_for_selector("[data-testid='cancel-reason-select']", timeout=8000)
                        # wait until options loaded
                        vals = []
                        for _ in range(30):
                            vals = await page.locator("[data-testid='cancel-reason-select'] option").evaluate_all("els => els.map(e => e.value)")
                            real = [v for v in vals if v]
                            if real: break
                            await page.wait_for_timeout(300)
                        real_vals = [v for v in vals if v]
                        log["steps"].append(f"cancel {rid} options {vals}")
                        if real_vals:
                            await page.locator("[data-testid='cancel-reason-select']").select_option(value=real_vals[0])
                            await page.wait_for_timeout(500)
                            for _ in range(20):
                                if not await page.locator("[data-testid='cancel-booking-confirm-btn']").is_disabled(): break
                                await page.wait_for_timeout(300)
                            await page.click("[data-testid='cancel-booking-confirm-btn']")
                            await page.wait_for_timeout(3500)
                        else:
                            log["steps"].append(f"no reasons for {rid}, closing")
                            await page.keyboard.press("Escape")
                    except Exception as ex:
                        log["steps"].append(f"cancel err {rid}: {ex}")

        # counts
        await page.goto(url+"/pms/front-desk-v2", wait_until="domcontentloaded", timeout=60000)
        await page.wait_for_selector("[data-testid='fd-page']", timeout=20000)
        await page.click("[data-testid='fd-tab-inhouse']"); await page.wait_for_timeout(1500)
        try: await page.click("[data-testid='fd-chip-inhouse-all']")
        except: pass
        await page.wait_for_timeout(1500)
        ih=0
        for r in await page.query_selector_all("[data-testid^='fd-row-']"):
            tx = await r.inner_text()
            if "P5 QA" in tx: ih+=1
        ar=0
        await page.click("[data-testid='fd-tab-arrivals']"); await page.wait_for_timeout(1500)
        for chip in ["fd-chip-arrivals-late","fd-chip-arrivals-today","fd-chip-arrivals-tomorrow","fd-chip-arrivals-upcoming"]:
            try:
                await page.click(f"[data-testid='{chip}']"); await page.wait_for_timeout(1500)
                for r in await page.query_selector_all("[data-testid^='fd-row-']"):
                    tx = await r.inner_text()
                    if "P5 QA" in tx: ar+=1
            except: pass
        # rules
        await page.goto(url+"/pms/channel-manager", wait_until="domcontentloaded", timeout=60000)
        await page.wait_for_timeout(1500)
        await page.click("[data-testid='channel-manager-tab-4']")
        await page.wait_for_selector("[data-testid='toggle-allow-early-checkin']", timeout=15000)
        await page.wait_for_timeout(2000)
        s = await page.evaluate("() => document.querySelector(\"[data-testid='toggle-allow-early-checkin']\").checked")
        c = await page.evaluate("() => { const r=document.querySelector(\"input[data-testid='radio-extend-rate-mode-calendar']\"); return r? r.checked: null; }")
        log["end"] = {"inhouse_p5":ih, "arrivals_p5":ar, "toggle":s, "cal_radio":c}
        await b.close()
    print(json.dumps(log, indent=2))
    with open("/app/test_reports/session_a_final_cleanup.json","w") as f:
        json.dump(log, f, indent=2, default=str)

asyncio.run(main())
