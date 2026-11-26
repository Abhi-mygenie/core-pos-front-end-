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
        print("Waiting 35s for all APIs...")
        await page.wait_for_timeout(35000)

        # Dismiss banner
        banner = await page.query_selector('[data-testid="sound-unlock-banner"]')
        if banner:
            await banner.click(force=True)
            await page.wait_for_timeout(500)

        # Try clicking the line chart icon at y=388 (Insights section)
        await page.mouse.click(27, 388)
        await page.wait_for_timeout(1000)
        page_text_388 = await page.evaluate("() => document.body.innerText.substring(0, 300)")
        print(f"y=388 submenu: {page_text_388}")

        # Check if audit log visible
        if "Audit" in page_text_388:
            audit_btn = await page.get_by_text("Audit Log")
            if audit_btn:
                await audit_btn.click(force=True)
                await page.wait_for_timeout(10000)
                print(f"Navigated to: {page.url}")
        elif "Insights" in page_text_388:
            # Look for Audit Log in Insights
            print("Found Insights submenu")

        await page.screenshot(path="/app/test_reports/screenshots/automation_output/20261126_152021_37b7dda08427/sidebar_388.jpeg", type="jpeg", quality=40, full_page=False)

    except Exception as e:
        print(f"Error: {e}")

