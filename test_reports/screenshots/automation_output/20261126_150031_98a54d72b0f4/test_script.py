async def run_test(page, output_dir, page_url):

    import re

    console_errors = []
    reference_errors = []

    def on_console(msg):
        if msg.type == "error":
            console_errors.append(msg.text)
        if "ReferenceError" in msg.text or "onEdit" in msg.text:
            reference_errors.append(msg.text)

    page.on("console", on_console)
    await page.set_viewport_size({"width": 1920, "height": 1080})

    try:
        # Login
        await page.wait_for_selector('input[type="email"]', timeout=15000)
        await page.fill('input[type="email"]', "owner@palmhouse.com")
        await page.fill('input[type="password"]', "Qplazm@10")
        await page.click('button[type="submit"]')
        print("Login submitted")

        # Wait 25 seconds
        print("Waiting 25 seconds for APIs...")
        await page.wait_for_timeout(25000)
        print(f"Dashboard URL: {page.url}")

        # Count running orders BEFORE reload for BUG-686
        bill_btns = await page.query_selector_all('button:has-text("Bill"), button:has-text("C/Out")')
        running_count_before = len(bill_btns)
        print(f"BUG-686 initial running orders count: {running_count_before}")

        # Dismiss the sound-unlock-banner by clicking it
        banner = await page.query_selector('[data-testid="sound-unlock-banner"]')
        if banner:
            await banner.click(force=True)
            await page.wait_for_timeout(1000)
            print("Dismissed sound banner")

        # Navigate to C-1 table (has running order with ₹189, Owner)
        # Use C-1 since it has an order already
        c1_table = await page.query_selector('text=C-1')
        if c1_table:
            await c1_table.click(force=True)
            await page.wait_for_timeout(5000)
            print(f"After clicking C-1: {page.url}")

        await page.screenshot(path="/app/test_reports/screenshots/automation_output/20261126_150031_98a54d72b0f4/bug685_c1_order.jpeg", type="jpeg", quality=40, full_page=False)
        print("Order entry screenshot")

    except Exception as e:
        print(f"Error: {e}")

