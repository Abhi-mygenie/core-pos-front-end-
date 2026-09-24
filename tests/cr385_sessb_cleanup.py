"""Session B cleanup — settle P5 QA in-house rows + cancel arrivals."""
import asyncio, re, json, time
from playwright.async_api import async_playwright

def parse_creds():
    t=open("/app/memory/test_credentials.md").read().split("## QA_TGK")[1].split("##")[0]
    return re.search(r"email\s*`([^`]+)`",t).group(1), re.search(r"password\s*`([^`]+)`",t).group(1)

async def main():
    email,pw = parse_creds()
    url = open("/app/frontend/.env").read().split("REACT_APP_BACKEND_URL=")[1].split("\n")[0].strip()
    log = {"steps":[], "end":{}}

    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path="/usr/bin/google-chrome", headless=True,
                                     args=["--no-sandbox","--disable-dev-shm-usage"])
        ctx = await b.new_context(viewport={"width":1366,"height":768})
        page = await ctx.new_page()

        # login
        await page.goto(url+"/", wait_until="domcontentloaded", timeout=60000)
        await page.wait_for_selector("input[type='password']", timeout=30000)
        inputs = await page.query_selector_all("input")
        await inputs[0].fill(email)
        await page.locator("input[type='password']").fill(pw)
        await page.locator("button[type='submit']").click()
        end=time.time()+30
        while time.time()<end:
            if "/loading" not in page.url and page.url != url+"/": break
            await page.wait_for_timeout(500)

        await page.goto(url+"/pms/front-desk-v2", wait_until="domcontentloaded", timeout=60000)
        await page.wait_for_selector("[data-testid='fd-page']", timeout=20000)

        # --- STEP 1: Settle P5 QA rows IN-HOUSE ---
        await page.click("[data-testid='fd-tab-inhouse']")
        await page.wait_for_timeout(2000)
        try: await page.click("[data-testid='fd-chip-inhouse-all']")
        except Exception: pass
        await page.wait_for_timeout(2000)

        for attempt in range(4):
            ids=[]
            for r in await page.query_selector_all("[data-testid^='fd-row-']"):
                tx = await r.inner_text()
                if "P5 QA" in tx:
                    tid = await r.get_attribute("data-testid")
                    m = re.match(r"fd-row-([^-]+)", tid)
                    if m: ids.append(m.group(1))
            ids = list(dict.fromkeys(ids))
            if not ids: break
            log["steps"].append(f"inhouse P5 QA rows: {ids}")
            for rid in ids:
                try:
                    bill_btn = await page.query_selector(f"[data-testid='fd-row-{rid}-bill-btn']")
                    if not bill_btn: continue
                    await bill_btn.click()
                    await page.wait_for_timeout(4000)
                    # click cash payment
                    try:
                        await page.click("[data-testid='payment-cash-btn']")
                        await page.wait_for_timeout(500)
                    except Exception: pass
                    # fill cash received = full balance
                    try:
                        bal = await page.text_content(f"[data-testid='fd-row-{rid}-balance']") or ""
                        digits = re.sub(r'[^\d]','', bal)
                        if digits:
                            await page.fill("[data-testid='cash-received-input']", digits)
                            await page.wait_for_timeout(300)
                    except Exception: pass
                    # complete
                    try:
                        await page.click("[data-testid='complete-payment-btn']")
                        await page.wait_for_timeout(4000)
                        log["steps"].append(f"settled inhouse {rid}")
                    except Exception as ex:
                        log["steps"].append(f"settle err {rid}: {ex}")
                except Exception as ex:
                    log["steps"].append(f"bill err {rid}: {ex}")
            await page.wait_for_timeout(2000)

        # --- STEP 2: Cancel P5 QA Arrivals ---
        await page.click("[data-testid='fd-tab-arrivals']")
        await page.wait_for_timeout(2000)
        for chip in ["fd-chip-arrivals-late","fd-chip-arrivals-today","fd-chip-arrivals-tomorrow","fd-chip-arrivals-upcoming"]:
            try: await page.click(f"[data-testid='{chip}']")
            except Exception: continue
            await page.wait_for_timeout(2000)
            for attempt2 in range(4):
                ids=[]
                for r in await page.query_selector_all("[data-testid^='fd-row-']"):
                    tx = await r.inner_text()
                    if "P5 QA" in tx:
                        tid = await r.get_attribute("data-testid")
                        m = re.match(r"fd-row-([^-]+)", tid)
                        if m: ids.append(m.group(1))
                ids = list(dict.fromkeys(ids))
                if not ids: break
                for rid in ids:
                    try:
                        cb = await page.query_selector(f"[data-testid='fd-row-{rid}-cancel-btn']")
                        if not cb: continue
                        await cb.click()
                        await page.wait_for_selector("[data-testid='cancel-reason-select']", timeout=8000)
                        await page.wait_for_timeout(1000)
                        vals=[]
                        for _ in range(20):
                            vals = await page.locator("[data-testid='cancel-reason-select'] option").evaluate_all("els=>els.map(e=>e.value)")
                            real=[v for v in vals if v]
                            if real: break
                            await page.wait_for_timeout(300)
                        real=[v for v in vals if v]
                        if real:
                            await page.locator("[data-testid='cancel-reason-select']").select_option(value=real[0])
                            await page.wait_for_timeout(500)
                            for _ in range(15):
                                if not await page.locator("[data-testid='cancel-booking-confirm-btn']").is_disabled(): break
                                await page.wait_for_timeout(300)
                            await page.click("[data-testid='cancel-booking-confirm-btn']")
                            await page.wait_for_timeout(3000)
                            log["steps"].append(f"cancelled arrivals {rid}")
                    except Exception as ex:
                        log["steps"].append(f"cancel err {rid}: {ex}")
                await page.wait_for_timeout(1500)

        # --- STEP 3: Verify counts ---
        await page.goto(url+"/pms/front-desk-v2", wait_until="domcontentloaded", timeout=60000)
        await page.wait_for_selector("[data-testid='fd-page']", timeout=20000)
        await page.click("[data-testid='fd-tab-inhouse']"); await page.wait_for_timeout(2000)
        ih=0
        for r in await page.query_selector_all("[data-testid^='fd-row-']"):
            if "P5 QA" in (await r.inner_text()): ih+=1

        ar=0
        await page.click("[data-testid='fd-tab-arrivals']"); await page.wait_for_timeout(1500)
        for chip in ["fd-chip-arrivals-late","fd-chip-arrivals-today","fd-chip-arrivals-tomorrow","fd-chip-arrivals-upcoming"]:
            try:
                await page.click(f"[data-testid='{chip}']"); await page.wait_for_timeout(1500)
                for r in await page.query_selector_all("[data-testid^='fd-row-']"):
                    if "P5 QA" in (await r.inner_text()): ar+=1
            except Exception: pass

        # --- STEP 4: Rules check ---
        try:
            await page.goto(url+"/pms/channel-manager", wait_until="domcontentloaded", timeout=60000)
            await page.wait_for_timeout(2000)
            await page.click("[data-testid='channel-manager-tab-4']")
            await page.wait_for_selector("[data-testid='toggle-allow-early-checkin']", timeout=15000)
            await page.wait_for_timeout(2000)
            toggle = await page.evaluate("() => document.querySelector(\"[data-testid='toggle-allow-early-checkin']\").checked")
            cal = await page.evaluate("() => { const r=document.querySelector(\"input[data-testid='radio-extend-rate-mode-calendar']\"); return r?r.checked:null; }")
            if toggle:
                await page.click("[data-testid='toggle-allow-early-checkin']")
                await page.wait_for_timeout(500)
                await page.click("[data-testid='frontdesk-rules-save-btn']")
                await page.wait_for_timeout(2000)
                log["steps"].append("fixed: toggle set to OFF")
                toggle = False
        except Exception as ex:
            log["steps"].append(f"rules err: {ex}")
            toggle, cal = None, None

        log["end"] = {"inhouse_p5": ih, "arrivals_p5": ar, "toggle": toggle, "cal_radio": cal}
        await b.close()

    print(json.dumps(log, indent=2))
    with open("/app/test_reports/sessb_cleanup_result.json","w") as f:
        json.dump(log, f, indent=2, default=str)

asyncio.run(main())
