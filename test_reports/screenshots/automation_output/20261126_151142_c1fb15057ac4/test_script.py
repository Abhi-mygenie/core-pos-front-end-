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
        await page.wait_for_timeout(3000)
        if "login" in page.url.lower() or page.url.endswith("/"):
            await page.wait_for_selector('input[type="email"]', timeout=10000)
            await page.fill('input[type="email"]', "owner@palmhouse.com")
            await page.fill('input[type="password"]', "Qplazm@10")
            await page.click('button[type="submit"]')
            await page.wait_for_timeout(25000)
            await page.goto('https://core-pos-3--04y1cpk6.preview.emergentagent.com/reports-module/audit-log')

        await page.wait_for_timeout(10000)

        # Click 7D to get data
        btn_7d = await page.query_selector('button:has-text("7D")')
        if btn_7d:
            await btn_7d.click(force=True)
            await page.wait_for_timeout(30000)

        print("Checking BUG-697: active preset after 7D click (verify 7D is now highlighted)")
        preset_data_after = await page.evaluate("""() => {
            const pills = document.querySelectorAll('button');
            const presetLabels = ['Today', '7D', 'LM', '30D', 'MTD', 'FY'];
            return Array.from(pills)
                .filter(b => presetLabels.includes(b.textContent.trim()))
                .map(b => ({
                    text: b.textContent.trim(),
                    hasShadow: b.className.includes('shadow-sm'),
                    hasActiveBg: b.className.includes('bg-white') && !b.className.includes('hover:bg-white'),
                    className: b.className.substring(0, 100)
                }));
        }""")
        print(f"After 7D click, presets: {preset_data_after}")

        # BUG-695: Expand Card 1 (High Risk Cancellations) - look for the chevron/expand
        card_header = await page.query_selector('text=High Risk Cancellations')
        if card_header:
            await card_header.click(force=True)
            await page.wait_for_timeout(3000)
            print("Clicked High Risk Cancellations card header")

            # Check for nested button errors after click
            if nested_btn_errors:
                print(f"BUG-695 FAIL: Nested button errors after toggle: {nested_btn_errors}")
            else:
                print("BUG-695: No nested button errors after toggle")

        await page.screenshot(path="/app/test_reports/screenshots/automation_output/20261126_151142_c1fb15057ac4/bug695_card1_expanded.jpeg", type="jpeg", quality=40, full_page=False)

        # BUG-691: Check TIME column in drill-down table
        page_text = await page.evaluate("() => document.body.innerText")
        print(f"Page content after expanding: {page_text[:1500]}")

        # Look for TIME column specifically
        time_data = await page.evaluate("""() => {
            const thAll = Array.from(document.querySelectorAll('th'));
            const thTexts = thAll.map(th => th.textContent.trim());

            // Find cells that look like time values
            const tdAll = Array.from(document.querySelectorAll('td'));
            const tdTexts = tdAll.map(td => td.textContent.trim()).filter(t => t.length > 0);

            return { headers: thTexts, cells: tdTexts.slice(0, 20) };
        }""")
        print(f"BUG-691 Table headers: {time_data['headers']}")
        print(f"BUG-691 Table cells: {time_data['cells']}")

    except Exception as e:
        print(f"Error: {e}")

