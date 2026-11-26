async def run_test(page, output_dir, page_url):

    import re

    console_errors = []
    reference_errors = []
    page.on("console", lambda msg: (
        console_errors.append(msg.text) if msg.type == "error" else None,
        reference_errors.append(msg.text) if "ReferenceError" in msg.text or "onEdit" in msg.text else None
    ))

    await page.set_viewport_size({"width": 1920, "height": 1080})

    try:
        # Login
        await page.wait_for_selector('input[type="email"]', timeout=15000)
        await page.fill('input[type="email"]', "owner@palmhouse.com")
        await page.fill('input[type="password"]', "Qplazm@10")
        await page.click('button[type="submit"]')
        print("Login submitted")

        # Wait 25 seconds for preprod APIs
        print("Waiting 25 seconds for APIs to load...")
        await page.wait_for_timeout(25000)
        print(f"Dashboard URL: {page.url}")

        # Count running orders BEFORE reload (for BUG-686)
        table_cards = await page.query_selector_all('[class*="table-card"], [data-testid*="table"]')
        # Count cards with running orders (has Bill button or C/Out button)
        bill_buttons = await page.query_selector_all('button:has-text("Bill"), button:has-text("C/Out")')
        running_count_before = len(bill_buttons)
        print(f"BUG-686 initial: {running_count_before} tables with running orders")

        # Navigate to C-2 (Available) or find an available Dine-In table to test adding items
        # Click on table 2 (Available Dine-In)
        available_tables = await page.query_selector_all('text=Available')
        print(f"Found {len(available_tables)} available tables")

        # Click the first available dine-in table (table 2)
        await available_tables[0].click()
        await page.wait_for_timeout(3000)
        print(f"After clicking available table: {page.url}")

        await page.screenshot(path="/app/test_reports/screenshots/automation_output/20261126_145916_c1fc9409dc2c/bug685_order_entry.jpeg", type="jpeg", quality=40, full_page=False)
        print("Order entry screenshot taken")

    except Exception as e:
        print(f"Error: {e}")

