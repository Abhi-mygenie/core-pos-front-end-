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

        # Clear errors before the critical action
        console_errors.clear()
        reference_errors.clear()

        # Click "Blueberry Muffins" to add it (non-customizable, simple item from Popular)
        muffin_btn = await page.query_selector('button:has-text("Blueberry Muffins")')
        if muffin_btn:
            await muffin_btn.click(force=True)
            await page.wait_for_timeout(2000)
            print("Clicked Blueberry Muffins to add to cart")

            # Check for ReferenceError
            if reference_errors:
                print(f"BUG-685 FAIL: ReferenceError found: {reference_errors}")
            else:
                print("BUG-685 CHECK 1: No ReferenceError after adding Blueberry Muffins")

            # Verify item in cart
            cart_area = await page.query_selector('[class*="cart"], [class*="Cart"]')

            # Look for pencil/edit icon in cart
            pencil_icon = await page.query_selector('button[data-testid*="edit-item"], [data-testid*="cart-item-edit"], .lucide-pencil, svg[class*="pencil"]')
            # Try alternative selectors
            edit_btns = await page.query_selector_all('button .lucide-pencil, [class*="edit"] svg')
            print(f"Edit/pencil elements found: {len(edit_btns)}")

            await page.screenshot(path="/app/test_reports/screenshots/automation_output/20261126_150231_4f314844232f/bug685_added_item.jpeg", type="jpeg", quality=40, full_page=False)
            print("Screenshot taken with item added")

            # Now try clicking the pencil/edit icon in cart to test onEdit
            # Look for pencil button in cart
            # From the earlier screenshot, I saw the edit icon next to Blueberry Muffins
            all_buttons = await page.query_selector_all('button')
            button_texts = []
            for btn in all_buttons[:20]:
                txt = await btn.text_content()
                button_texts.append(txt.strip()[:30] if txt else "")
            print(f"Cart buttons: {button_texts}")

    except Exception as e:
        print(f"Error: {e}")
        if reference_errors:
            print(f"BUG-685 FAIL ReferenceError: {reference_errors}")

