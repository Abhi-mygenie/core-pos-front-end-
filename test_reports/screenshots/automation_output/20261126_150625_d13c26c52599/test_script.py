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
        # This page is opened directly - wait for auth redirect or login
        await page.wait_for_timeout(3000)
        print(f"Initial URL: {page.url}")

        # If redirected to login, login first
        if "login" in page.url.lower() or page.url == "https://core-pos-3--04y1cpk6.preview.emergentagent.com/":
            await page.wait_for_selector('input[type="email"]', timeout=15000)
            await page.fill('input[type="email"]', "owner@palmhouse.com")
            await page.fill('input[type="password"]', "Qplazm@10")
            await page.click('button[type="submit"]')
            print("Logging in...")
            await page.wait_for_timeout(25000)
            # Navigate to audit log
            await page.goto('https://core-pos-3--04y1cpk6.preview.emergentagent.com/reports-module/audit-log')
            await page.wait_for_timeout(5000)

        print(f"URL: {page.url}")

        # Wait for page to load
        await page.wait_for_timeout(30000)  # Up to 30s for Audit Log report data

        await page.screenshot(path="/app/test_reports/screenshots/automation_output/20261126_150625_d13c26c52599/bug691_audit_log2.jpeg", type="jpeg", quality=40, full_page=False)
        print(f"Audit Log loaded. URL: {page.url}")

        # BUG-695: Check for nested button errors
        if nested_btn_errors:
            print(f"BUG-695 FAIL: Nested button errors: {nested_btn_errors}")
        else:
            print("BUG-695: No nested button console errors found")

        # BUG-697: Check if any preset pill is highlighted on first load
        preset_pills = await page.query_selector_all('[data-testid*="preset"], button:has-text("7D"), button:has-text("30D"), button:has-text("FY")')
        print(f"Found {len(preset_pills)} preset pills")

        # Check for active/highlighted pill
        active_pill = await page.query_selector('[data-testid*="preset"][class*="active"], [data-testid*="preset"][class*="selected"], button[class*="active"]:has-text("7D")')

        # Look for TIME column in audit events
        time_col = await page.query_selector('th:has-text("TIME"), [data-testid*="time-column"]')
        print(f"TIME column found: {time_col is not None}")

        # Get page content to analyze
        page_text = await page.evaluate("() => document.body.innerText")
        print(f"Page text preview (first 500 chars): {page_text[:500]}")

    except Exception as e:
        print(f"Error: {e}")

