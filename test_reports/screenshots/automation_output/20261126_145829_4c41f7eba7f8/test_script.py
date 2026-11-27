async def run_test(page, output_dir, page_url):

    page.on("console", lambda msg: print(f"CONSOLE [{msg.type}]: {msg.text}"))
    await page.set_viewport_size({"width": 1920, "height": 1080})

    console_errors = []
    page.on("console", lambda msg: console_errors.append(msg.text) if msg.type == "error" else None)

    try:
        # Login as owner@palmhouse.com
        await page.wait_for_selector('input[type="email"], input[name="email"], input[placeholder*="email" i]', timeout=15000)
        await page.fill('input[type="email"], input[name="email"], input[placeholder*="email" i]', "owner@palmhouse.com")
        await page.fill('input[type="password"], input[name="password"], input[placeholder*="password" i]', "Qplazm@10")
        await page.click('button[type="submit"]')
        print("Login submitted")

        # Wait 25 seconds for preprod APIs to load
        print("Waiting 25 seconds for preprod APIs...")
        await page.wait_for_timeout(25000)

        # Take screenshot to see current state
        await page.screenshot(path="/app/test_reports/screenshots/automation_output/20261126_145829_4c41f7eba7f8/bug685_after_login.jpeg", type="jpeg", quality=40, full_page=False)
        print("Screenshot taken after login wait")

        # Check current URL
        print(f"Current URL: {page.url}")

    except Exception as e:
        print(f"Login error: {e}")

