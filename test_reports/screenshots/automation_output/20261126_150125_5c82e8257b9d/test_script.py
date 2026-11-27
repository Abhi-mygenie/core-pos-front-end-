async def run_test(page, output_dir, page_url):

    console_errors = []
    reference_errors = []

    def on_console(msg):
        if msg.type == "error":
            console_errors.append(msg.text)
        if "ReferenceError" in msg.text or "onEdit" in msg.text.lower():
            reference_errors.append(msg.text)

    page.on("console", on_console)
    await page.set_viewport_size({"width": 1920, "height": 1080})

    try:
        # Login
        await page.wait_for_selector('input[type="email"]', timeout=15000)
        await page.fill('input[type="email"]', "owner@palmhouse.com")
        await page.fill('input[type="password"]', "Qplazm@10")
        await page.click('button[type="submit"]')

        print("Waiting 25 seconds for APIs...")
        await page.wait_for_timeout(25000)

        # Dismiss sound banner
        banner = await page.query_selector('[data-testid="sound-unlock-banner"]')
        if banner:
            await banner.click(force=True)
            await page.wait_for_timeout(500)

        # Click C-1 table
        c1 = await page.query_selector('text=C-1')
        if c1:
            await c1.click(force=True)
            await page.wait_for_timeout(5000)

        # Now in Order Entry - add a menu item (Toast is simple, non-customizable)
        toast_btn = await page.query_selector('button:has-text("Toast")')
        if not toast_btn:
            # Try any simple item
            all_items = await page.query_selector_all('[class*="menu"] button, .menu-item button')
            print(f"Found {len(all_items)} menu item buttons")
        else:
            # Clear any console errors before clicking
            console_errors.clear()
            reference_errors.clear()

            await toast_btn.click(force=True)
            await page.wait_for_timeout(2000)
            print("Clicked Toast to add to cart")

            # Check for ReferenceError
            if reference_errors:
                print(f"BUG-685 FAIL: ReferenceError found: {reference_errors}")
            else:
                print("BUG-685: No ReferenceError found after adding item")

            if console_errors:
                print(f"Console errors: {console_errors[:3]}")

            # Check if item appears in cart
            cart_items = await page.query_selector_all('[class*="cart"] [class*="item"], [data-testid*="cart-item"]')
            print(f"Cart items count: {len(cart_items)}")

            # Check for pencil/edit icon
            edit_icons = await page.query_selector_all('[data-testid*="edit"], button[title*="edit" i], [class*="pencil"]')
            print(f"Edit icons found: {len(edit_icons)}")

            await page.screenshot(path="/app/test_reports/screenshots/automation_output/20261126_150125_5c82e8257b9d/bug685_after_add.jpeg", type="jpeg", quality=40, full_page=False)
            print("Screenshot after adding item")

    except Exception as e:
        print(f"Error: {e}")
        if reference_errors:
            print(f"BUG-685 FAIL: ReferenceError: {reference_errors}")

