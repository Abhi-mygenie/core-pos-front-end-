async def run_test(page, output_dir, page_url):

    console_errors = []
    nested_btn_errors = []

    def on_console(msg):
        text = msg.text
        if msg.type == "error":
            console_errors.append(text)
        if "nested" in text.lower() or "button descendant" in text.lower() or "interactive" in text.lower():
            nested_btn_errors.append(text)

    page.on("console", on_console)
    await page.set_viewport_size({"width": 1920, "height": 1080})

    try:
        # Login
        await page.wait_for_selector('input[type="email"]', timeout=15000)
        await page.fill('input[type="email"]', "owner@palmhouse.com")
        await page.fill('input[type="password"]', "Qplazm@10")
        await page.click('button[type="submit"]')

        print("Waiting 25 seconds for APIs...")
        await page.wait_for_timeout(25000)

        # Dismiss sound banner
        banner = await page.query_selector('[data-testid="sound-unlock-banner"]')
        if banner:
            await banner.click(force=True)
            await page.wait_for_timeout(500)

        # Navigate to Reports (sidebar icon)
        # Look for Reports sidebar icon
        report_link = await page.query_selector('a[href*="report"], [data-testid*="report"], a[href*="/reports"]')
        if report_link:
            await report_link.click(force=True)
            await page.wait_for_timeout(2000)
            print(f"Navigated to reports: {page.url}")
        else:
            # Try sidebar navigation
            await page.goto('https://core-pos-3--04y1cpk6.preview.emergentagent.com/reports-module/audit-log')
            await page.wait_for_timeout(10000)
            print(f"Navigated directly to audit log: {page.url}")

        # Wait for Audit Log data to load (up to 30s per instructions)
        await page.wait_for_timeout(20000)

        await page.screenshot(path="/app/test_reports/screenshots/automation_output/20261126_150516_9d7e4a0f1f8f/bug691_audit_log.jpeg", type="jpeg", quality=40, full_page=False)
        print(f"Audit Log screenshot. URL: {page.url}")

        # Check for nested button errors (BUG-695)
        if nested_btn_errors:
            print(f"BUG-695 FAIL: Nested button errors: {nested_btn_errors}")
        else:
            print("BUG-695 CHECK: No nested button errors in console so far")

    except Exception as e:
        print(f"Error: {e}")

