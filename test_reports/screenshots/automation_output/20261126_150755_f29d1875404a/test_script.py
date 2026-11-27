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

        # Wait for data to load
        print("Waiting 35 seconds for audit log data...")
        await page.wait_for_timeout(35000)

        await page.screenshot(path="/app/test_reports/screenshots/automation_output/20261126_150755_f29d1875404a/audit_log_loaded.jpeg", type="jpeg", quality=40, full_page=False)
        print(f"URL: {page.url}")

        # Get page text
        page_text = await page.evaluate("() => document.body.innerText")
        print(f"Page content: {page_text[:1000]}")

        # BUG-697: Check active preset pill
        # Get all preset pills and their classes
        preset_data = await page.evaluate("""() => {
            const pills = document.querySelectorAll('button');
            const presetLabels = ['Today', '7D', 'LM', '30D', 'MTD', 'FY'];
            return Array.from(pills)
                .filter(b => presetLabels.includes(b.textContent.trim()))
                .map(b => ({
                    text: b.textContent.trim(),
                    className: b.className,
                    ariaPressed: b.getAttribute('aria-pressed'),
                    dataTestid: b.getAttribute('data-testid')
                }));
        }""")
        print(f"BUG-697 Preset pills: {preset_data}")

        # BUG-695: Check no nested button errors
        if nested_btn_errors:
            print(f"BUG-695 FAIL: Nested button errors: {nested_btn_errors}")
        else:
            print("BUG-695: No nested button console errors")

        # Check TIME column content
        time_cells = await page.evaluate("""() => {
            // Look for elements that show time data
            const rows = document.querySelectorAll('tr, [class*="row"]');
            const timeCells = [];
            rows.forEach(row => {
                const cells = row.querySelectorAll('td, [class*="cell"]');
                if (cells.length > 0) {
                    timeCells.push(Array.from(cells).map(c => c.textContent.trim()).join(' | '));
                }
            });
            return timeCells.slice(0, 5);
        }""")
        print(f"BUG-691 Table rows: {time_cells}")

        # BUG-695: Try to toggle Card 1 and check for nested buttons
        card1 = await page.query_selector('[data-testid*="card1"], [class*="card"]')
        print(f"Card 1 found: {card1 is not None}")

    except Exception as e:
        print(f"Error: {e}")

