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
        # Login first
        await page.wait_for_selector('input[type="email"]', timeout=15000)
        await page.fill('input[type="email"]', "owner@palmhouse.com")
        await page.fill('input[type="password"]', "Qplazm@10")
        await page.click('button[type="submit"]')
        print("Logged in, waiting 25s for APIs...")
        await page.wait_for_timeout(25000)

        # Navigate to audit log
        await page.goto('https://core-pos-3--04y1cpk6.preview.emergentagent.com/reports-module/audit-log')
        print("Navigated to audit log, waiting 10s...")
        await page.wait_for_timeout(10000)

        # BUG-697: Check active preset pill BEFORE any user action (fresh load)
        preset_data = await page.evaluate("""() => {
            const pills = document.querySelectorAll('button');
            const presetLabels = ['Today', '7D', 'LM', '30D', 'MTD', 'FY'];
            return Array.from(pills)
                .filter(b => presetLabels.includes(b.textContent.trim()))
                .map(b => ({
                    text: b.textContent.trim(),
                    hasShadow: b.className.includes('shadow-sm'),
                    hasNonHoverBg: /\bbg-white\b/.test(b.className) && !b.className.includes('hover:bg-white'),
                    isDark: b.className.includes('text-zinc-900') || b.className.includes('font-semibold'),
                }));
        }""")
        print(f"BUG-697 preset pill states on first load: {preset_data}")

        active_on_load = [p for p in preset_data if p['hasShadow'] or p['hasNonHoverBg']]
        if active_on_load:
            print(f"BUG-697 PASS: Preset(s) highlighted on first load: {[p['text'] for p in active_on_load]}")
        else:
            print(f"BUG-697 FAIL: No preset highlighted on first load")

        # Click 7D to get data
        btn_7d = await page.query_selector('button:has-text("7D")')
        if btn_7d:
            await btn_7d.click(force=True)
            print("Clicked 7D, waiting 30s for data...")
            await page.wait_for_timeout(30000)

        # Check preset states after 7D click
        preset_data_7d = await page.evaluate("""() => {
            const pills = document.querySelectorAll('button');
            const presetLabels = ['Today', '7D', 'LM', '30D', 'MTD', 'FY'];
            return Array.from(pills)
                .filter(b => presetLabels.includes(b.textContent.trim()))
                .map(b => ({
                    text: b.textContent.trim(),
                    hasShadow: b.className.includes('shadow-sm'),
                    hasNonHoverBg: /\bbg-white\b/.test(b.className) && !b.className.includes('hover:bg-white'),
                }));
        }""")
        active_after_7d = [p for p in preset_data_7d if p['hasShadow'] or p['hasNonHoverBg']]
        print(f"BUG-697 After 7D click: active = {[p['text'] for p in active_after_7d]}")

        await page.screenshot(path="/app/test_reports/screenshots/automation_output/20261126_151252_3cbdeb499f7c/bug697_7d.jpeg", type="jpeg", quality=40, full_page=False)

        # BUG-691 & BUG-695: Try to expand the card by clicking the chevron
        # Find the down arrow/chevron button near High Risk Cancellations
        chevron_btns = await page.query_selector_all('[class*="chevron"], svg[class*="chevron"], button[class*="toggle"]')
        print(f"Chevron buttons found: {len(chevron_btns)}")

        # Find the card area 
        card_texts = await page.evaluate("() => Array.from(document.querySelectorAll('[class*=\"card\"]')).map(c => c.textContent.trim().substring(0, 60))")
        print(f"Card elements: {card_texts[:5]}")

        # Try clicking the chevron icon within the card
        card_expand = await page.query_selector('button:has(svg), [role="button"]')
        if card_expand:
            expand_text = await card_expand.text_content()
            print(f"Found expand element: '{expand_text[:30]}'")

        # Get current page text to check if data loaded
        page_text = await page.evaluate("() => document.body.innerText")
        print(f"Page content: {page_text[:800]}")

        # Check nested buttons
        nested = await page.evaluate("""() => {
            return document.querySelectorAll('button button').length;
        }""")
        if nested > 0:
            print(f"BUG-695 FAIL: {nested} nested button elements found in DOM")
        else:
            print("BUG-695 PASS: No nested button elements in DOM")

        if nested_btn_errors:
            print(f"BUG-695 FAIL console: {nested_btn_errors}")
        else:
            print("BUG-695 PASS console: No nested button errors")

    except Exception as e:
        print(f"Error: {e}")

