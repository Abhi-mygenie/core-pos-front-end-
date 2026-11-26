async def run_test(page, output_dir, page_url):

    console_errors = []
    nested_btn_errors = []

    def on_console(msg):
        text = msg.text
        if msg.type == "error":
            console_errors.append(text)
        if "nested" in text.lower() or "button descendant" in text.lower():
            nested_btn_errors.append(text)

    page.on("console", on_console)
    await page.set_viewport_size({"width": 1920, "height": 1080})

    try:
        # Login
        await page.wait_for_selector('input[type="email"]', timeout=15000)
        await page.fill('input[type="email"]', "owner@palmhouse.com")
        await page.fill('input[type="password"]', "Qplazm@10")
        await page.click('button[type="submit"]')
        print("Logged in, waiting 30s for all APIs...")
        await page.wait_for_timeout(30000)
        print(f"Dashboard URL: {page.url}")

        # Wait for loading page to complete
        await page.wait_for_selector('text=YTC', timeout=30000)
        print("Dashboard fully loaded")

        # Navigate to audit log via sidebar
        await page.goto('https://core-pos-3--04y1cpk6.preview.emergentagent.com/reports-module/audit-log')
        print("Navigated to audit log, waiting 10s...")
        await page.wait_for_timeout(10000)
        print(f"URL: {page.url}")

        # Check if we're on audit log now
        if "audit-log" in page.url:
            print("On audit log page")

            # BUG-697 CHECK: preset pill state on first load
            preset_data = await page.evaluate("""() => {
                const pills = document.querySelectorAll('button');
                const presetLabels = ['Today', '7D', 'LM', '30D', 'MTD', 'FY'];
                return Array.from(pills)
                    .filter(b => presetLabels.includes(b.textContent.trim()))
                    .map(b => ({
                        text: b.textContent.trim(),
                        className: b.className
                    }));
            }""")
            print(f"BUG-697 presets: {preset_data}")

            await page.screenshot(path="/app/test_reports/screenshots/automation_output/20261126_151348_f6a1d5d46fcb/bug697_fresh.jpeg", type="jpeg", quality=40, full_page=False)
        else:
            print(f"Not on audit log. URL: {page.url}")
            # Navigate using sidebar
            reports_icon = await page.query_selector('[data-testid="sidebar-reports"], a[href*="report"]')
            if reports_icon:
                await reports_icon.click(force=True)
                await page.wait_for_timeout(2000)
            await page.screenshot(path="/app/test_reports/screenshots/automation_output/20261126_151348_f6a1d5d46fcb/bug697_fresh.jpeg", type="jpeg", quality=40, full_page=False)

    except Exception as e:
        print(f"Error: {e}")

