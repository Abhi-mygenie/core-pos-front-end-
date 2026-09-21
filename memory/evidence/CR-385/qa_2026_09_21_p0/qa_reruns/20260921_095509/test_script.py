async def run_test(page, output_dir, page_url):
    import re, time
    creds = open('/app/memory/test_credentials.md').read()
    email = re.search(r'- email: (\S+)', creds).group(1); pw = re.search(r'- password: (\S+)', creds).group(1)
    net = []
    page.on("response", lambda r: net.append((round(time.time()%1000,1), r.status, r.url.split('/aiosell/')[-1][:40])) if "aiosell" in r.url else None)
    await page.set_viewport_size({"width": 1920, "height": 800})
    await page.goto("https://core-pos-deploy-20.preview.emergentagent.com/", wait_until="domcontentloaded")
    await page.wait_for_selector("[data-testid=login-email]", timeout=45000)
    await page.fill("[data-testid=login-email]", email); await page.fill("[data-testid=login-password]", pw)
    await page.get_by_role("button", name=re.compile("log in", re.I)).click()
    await page.wait_for_timeout(20000)
    await page.goto("https://core-pos-deploy-20.preview.emergentagent.com/pms/front-desk-v2?tab=rooms", wait_until="domcontentloaded")
    await page.wait_for_selector("button[data-testid^=fd-room-tile-]", timeout=90000)
    net.clear()
    async def fail500(route):
        print("intercepted", route.request.url[-40:]); await route.fulfill(status=500, content_type="application/json", body='{"status":false}')
    await page.route(re.compile(r".*room-status-board.*"), fail500)
    await page.click("[data-testid=fd-refresh-btn]")
    try:
        await page.wait_for_selector("[data-testid=fd-rooms-error]", timeout=20000); print("rooms-error shown; tile:", await page.locator("[data-testid=fd-tab-rooms-count]").inner_text())
    except Exception:
        print("rooms-error NOT shown; tile:", await page.locator("[data-testid=fd-tab-rooms-count]").inner_text())
    print("network A:", net); net.clear()
    await page.unroute(re.compile(r".*room-status-board.*"))
    t0 = time.time(); await page.click("[data-testid=fd-rooms-retry-btn]")
    try:
        await page.wait_for_selector("button[data-testid^=fd-room-tile-]", timeout=30000); print("ROOMS RETRY recovered after", round(time.time()-t0,1), "s; tile:", await page.locator("[data-testid=fd-tab-rooms-count]").inner_text())
    except Exception:
        print("ROOMS RETRY did NOT recover in 30s"); await page.screenshot(path="/root/.emergent/automation_output/20260921_095509/qa_rooms_retry_fail.jpeg", type="jpeg", quality=40, full_page=False)
    print("network B:", net)
    await page.screenshot(path="/root/.emergent/automation_output/20260921_095509/qa_rooms_retry_end.jpeg", type="jpeg", quality=40, full_page=False)
