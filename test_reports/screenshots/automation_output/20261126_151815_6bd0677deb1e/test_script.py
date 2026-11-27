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

        # Map all clickable elements in left sidebar area (x < 56)
        sidebar_map = await page.evaluate("""() => {
            const all = Array.from(document.querySelectorAll('*'));
            return all
                .filter(el => {
                    const rect = el.getBoundingClientRect();
                    return rect.x >= 0 && rect.x < 56 && rect.width > 10 && rect.height > 10 
                        && rect.y > 50 && rect.y < 500
                        && (el.tagName === 'BUTTON' || el.tagName === 'A' || el.getAttribute('role') === 'button');
                })
                .map(el => ({
                    y: Math.round(el.getBoundingClientRect().y),
                    h: Math.round(el.getBoundingClientRect().height),
                    text: el.textContent.trim().substring(0, 20),
                    onclick: el.onclick ? 'yes' : 'no',
                    href: el.href || ''
                }));
        }""")
        print(f"Sidebar clickables: {sidebar_map}")

        # Click at y=287 (expected reports position based on icon spacing)
        await page.mouse.click(27, 287)
        await page.wait_for_timeout(2000)
        print(f"Clicked at y=287. URL: {page.url}")

        # Check if reports submenu appeared
        page_text = await page.evaluate("() => document.body.innerText")
        if "Audit" in page_text or "Report" in page_text:
            print("Reports submenu visible!")
            # Find Audit Log
            elements = await page.query_selector_all('[class*="sidebar"] *')
            for el in elements[:30]:
                t = await el.text_content()
                if t and "Audit" in t:
                    await el.click(force=True)
                    await page.wait_for_timeout(10000)
                    print(f"Clicked Audit Log: {page.url}")
                    break

        await page.screenshot(path="/app/test_reports/screenshots/automation_output/20261126_151815_6bd0677deb1e/sidebar_287.jpeg", type="jpeg", quality=40, full_page=False)

    except Exception as e:
        print(f"Error: {e}")

