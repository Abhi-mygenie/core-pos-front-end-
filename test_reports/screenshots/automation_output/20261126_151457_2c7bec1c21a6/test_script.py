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
        print("Logged in, waiting 35s for all APIs...")
        await page.wait_for_timeout(35000)

        # Wait for YTC and table cards to be visible
        try:
            await page.wait_for_selector('text=YTC', timeout=20000)
            print("Dashboard visible")
        except:
            print("YTC not visible yet")

        # Dismiss sound banner
        banner = await page.query_selector('[data-testid="sound-unlock-banner"]')
        if banner:
            await banner.click(force=True)
            await page.wait_for_timeout(500)

        # Navigate via Reports sidebar - click the chart icon in sidebar
        # Look at sidebar icons - there's a chart icon (reports)
        sidebar_links = await page.query_selector_all('a[href*="report"], nav a')
        print(f"Found {len(sidebar_links)} sidebar links")

        # Try clicking the reports icon (chart icon in sidebar)
        chart_icon = await page.query_selector('a[href="/reports-module"], a[href*="report"]')
        if chart_icon:
            await chart_icon.click(force=True)
            await page.wait_for_timeout(2000)
            print(f"Clicked reports link: {page.url}")

        # Find Audit Log in sidebar submenu
        audit_link = await page.query_selector('a[href*="audit-log"], text=Audit Log, text=Audit Report')
        if audit_link:
            await audit_link.click(force=True)
            await page.wait_for_timeout(10000)
            print(f"On audit log: {page.url}")
        else:
            # Try sidebar icon position (reports is the bar chart icon - position 7 from top in sidebar)
            sidebar_icons = await page.query_selector_all('aside a, nav a, [class*="sidebar"] a')
            for i, icon in enumerate(sidebar_icons):
                href = await icon.get_attribute('href')
                print(f"Sidebar {i}: {href}")

        await page.screenshot(path="/app/test_reports/screenshots/automation_output/20261126_151457_2c7bec1c21a6/audit_nav.jpeg", type="jpeg", quality=40, full_page=False)

    except Exception as e:
        print(f"Error: {e}")

