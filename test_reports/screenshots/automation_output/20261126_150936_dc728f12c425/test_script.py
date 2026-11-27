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
        await page.wait_for_timeout(3000)

        if "login" in page.url.lower() or page.url.endswith("/"):
            await page.wait_for_selector('input[type="email"]', timeout=10000)
            await page.fill('input[type="email"]', "owner@palmhouse.com")
            await page.fill('input[type="password"]', "Qplazm@10")
            await page.click('button[type="submit"]')
            await page.wait_for_timeout(25000)
            await page.goto('https://core-pos-3--04y1cpk6.preview.emergentagent.com/reports-module/audit-log')

        # Wait for initial load
        await page.wait_for_timeout(15000)

        # BUG-697: Check active preset pill BEFORE any user clicks
        preset_data = await page.evaluate("""() => {
            const pills = document.querySelectorAll('button');
            const presetLabels = ['Today', '7D', 'LM', '30D', 'MTD', 'FY'];
            return Array.from(pills)
                .filter(b => presetLabels.includes(b.textContent.trim()))
                .map(b => ({
                    text: b.textContent.trim(),
                    className: b.className,
                    hasActiveBg: b.className.includes('bg-white') || b.className.includes('bg-orange') || b.className.includes('bg-primary') || b.className.includes('font-semibold') || b.className.includes('font-bold')
                }));
        }""")

        active_pills = [p for p in preset_data if p['hasActiveBg']]
        inactive_pills = [p for p in preset_data if not p['hasActiveBg']]

        if active_pills:
            print(f"BUG-697 PASS: Active preset pill(s) found: {[p['text'] for p in active_pills]}")
        else:
            print(f"BUG-697 FAIL: No active preset pill on first load. All pills: {[p['text'] for p in preset_data]}")

        # Click 7D to get data
        btn_7d = await page.query_selector('button:has-text("7D")')
        if btn_7d:
            await btn_7d.click(force=True)
            print("Clicked 7D preset")
            await page.wait_for_timeout(30000)

        await page.screenshot(path="/app/test_reports/screenshots/automation_output/20261126_150936_dc728f12c425/audit_7d.jpeg", type="jpeg", quality=40, full_page=False)

        page_text = await page.evaluate("() => document.body.innerText")
        print(f"Page content after 7D: {page_text[:800]}")

        # BUG-695: Check nested button errors
        if nested_btn_errors:
            print(f"BUG-695 FAIL: Nested button errors: {nested_btn_errors}")
        else:
            print("BUG-695 PASS: No nested button console errors")

        # BUG-691: Look for TIME column data
        time_col_data = await page.evaluate("""() => {
            // Find rows with time data - look for cells that look like times
            const allText = [];
            document.querySelectorAll('td, [class*="time"]').forEach(el => {
                const t = el.textContent.trim();
                if (t.length > 2 && t.length < 30) allText.push(t);
            });
            return allText.slice(0, 20);
        }""")
        print(f"BUG-691 potential time cells: {time_col_data[:10]}")

        # BUG-695: Look for card expand/collapse
        card_divs = await page.query_selector_all('[role="button"], [class*="card"]')
        print(f"Card elements (role=button or class card): {len(card_divs)}")

        # Check if nested buttons exist in DOM
        nested_check = await page.evaluate("""() => {
            const nestedBtns = [];
            document.querySelectorAll('button button').forEach(el => {
                nestedBtns.push(el.textContent.trim().substring(0,30));
            });
            return nestedBtns;
        }""")
        if nested_check:
            print(f"BUG-695 FAIL: Nested buttons in DOM: {nested_check[:5]}")
        else:
            print("BUG-695 PASS: No nested button elements in DOM")

    except Exception as e:
        print(f"Error: {e}")

