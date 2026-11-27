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
        print("Waiting 35s for all APIs to load...")
        await page.wait_for_timeout(35000)

        # Dismiss banner
        banner = await page.query_selector('[data-testid="sound-unlock-banner"]')
        if banner:
            await banner.click(force=True)
            await page.wait_for_timeout(500)

        # Get all sidebar icon elements
        sidebar_icons = await page.evaluate("""() => {
            // Look for clickable elements in the sidebar (narrow left panel)
            const all = Array.from(document.querySelectorAll('button, [role="button"], div[class*="sidebar"], nav > div, nav > button'));
            return all
                .filter(el => {
                    const rect = el.getBoundingClientRect();
                    return rect.x < 60 && rect.width < 60 && rect.height > 20 && rect.y > 50;
                })
                .map(el => ({
                    y: el.getBoundingClientRect().y,
                    x: el.getBoundingClientRect().x,
                    text: el.textContent.trim().substring(0,20),
                    tag: el.tagName,
                    className: el.className.substring(0,50)
                }));
        }""")
        print(f"Sidebar icons: {sidebar_icons}")

        # Try clicking at y=325 (approximate location of bar chart/reports icon)
        # Based on sidebar layout (each icon ~35px apart starting from y=75)
        # Try clicking the reports/bar chart icon using mouse.click
        await page.mouse.click(27, 325)
        await page.wait_for_timeout(2000)
        print(f"Clicked at 27,325. URL: {page.url}")

        # Check if we got submenu
        page_text = await page.evaluate("() => document.body.innerText")
        if "Audit" in page_text or "audit" in page_text.lower():
            print("Audit Log submenu visible!")
            # Look for Audit Log text link
            audit_el = await page.query_selector('text="Audit Log"')
            if audit_el:
                await audit_el.click(force=True)
                await page.wait_for_timeout(10000)
                print(f"Navigated to: {page.url}")

        await page.screenshot(path="/app/test_reports/screenshots/automation_output/20261126_151657_985c206643b8/audit_sidebar.jpeg", type="jpeg", quality=40, full_page=False)

    except Exception as e:
        print(f"Error: {e}")

