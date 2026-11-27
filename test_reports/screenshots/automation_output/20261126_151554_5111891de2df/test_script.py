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
        print("Waiting 35s...")
        await page.wait_for_timeout(35000)

        # Dismiss banner
        banner = await page.query_selector('[data-testid="sound-unlock-banner"]')
        if banner:
            await banner.click(force=True)
            await page.wait_for_timeout(500)

        # Check all sidebar icon hrefs
        sidebar_data = await page.evaluate("""() => {
            const links = Array.from(document.querySelectorAll('a'));
            return links.map(a => ({href: a.getAttribute('href'), text: a.textContent.trim().substring(0,30)}))
                .filter(a => a.href && a.href.startsWith('/'));
        }""")
        for s in sidebar_data:
            print(f"Link: {s['href']} | {s['text']}")

        # Find report link
        report_link = await page.query_selector('a[href="/reports-module"]')
        if report_link:
            await report_link.click(force=True)
            await page.wait_for_timeout(2000)
            print(f"Clicked reports: {page.url}")

        # Now look for Audit Log submenu
        audit_link = await page.query_selector('a[href="/reports-module/audit-log"]')
        if audit_link:
            await audit_link.click(force=True)
            await page.wait_for_timeout(10000)
            print(f"Clicked Audit Log: {page.url}")
        else:
            # Try looking for the text
            audit_text = await page.query_selector('text="Audit Log"')
            if audit_text:
                await audit_text.click(force=True)
                await page.wait_for_timeout(10000)
                print(f"Clicked Audit text: {page.url}")
            else:
                # Check submenu items
                submenu_links = await page.evaluate("""() => {
                    return Array.from(document.querySelectorAll('a'))
                        .map(a => a.getAttribute('href'))
                        .filter(h => h && h.includes('report'));
                }""")
                print(f"Report links: {submenu_links}")

        await page.screenshot(path="/app/test_reports/screenshots/automation_output/20261126_151554_5111891de2df/audit_nav2.jpeg", type="jpeg", quality=40, full_page=False)

    except Exception as e:
        print(f"Error: {e}")

