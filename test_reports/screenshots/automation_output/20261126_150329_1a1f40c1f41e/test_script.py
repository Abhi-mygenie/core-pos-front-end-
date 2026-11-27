async def run_test(page, output_dir, page_url):

    skip_reconcile_logs = []
    page.on("console", lambda msg: skip_reconcile_logs.append(msg.text) if "BUG-686" in msg.text or "skip reconcile" in msg.text.lower() else None)
    await page.set_viewport_size({"width": 1920, "height": 1080})

    try:
        # Login
        await page.wait_for_selector('input[type="email"]', timeout=15000)
        await page.fill('input[type="email"]', "owner@palmhouse.com")
        await page.fill('input[type="password"]', "Qplazm@10")
        await page.click('button[type="submit"]')

        print("Waiting 25 seconds for APIs...")
        await page.wait_for_timeout(25000)

        # Count running orders initially
        bill_btns = await page.query_selector_all('button:has-text("Bill"), button:has-text("C/Out")')
        count_0 = len(bill_btns)
        print(f"BUG-686 count before reloads: {count_0}")

        counts = [count_0]

        # Reload 3 times
        for i in range(3):
            await page.reload()
            await page.wait_for_timeout(20000)  # Wait for preprod APIs after reload

            # Dismiss banner if present
            banner = await page.query_selector('[data-testid="sound-unlock-banner"]')
            if banner:
                await banner.click(force=True)
                await page.wait_for_timeout(500)

            bill_btns = await page.query_selector_all('button:has-text("Bill"), button:has-text("C/Out")')
            count = len(bill_btns)
            counts.append(count)
            print(f"BUG-686 count after reload {i+1}: {count}")

            if skip_reconcile_logs:
                print(f"Skip reconcile logs seen: {skip_reconcile_logs[-1]}")
                skip_reconcile_logs.clear()

        # Evaluate results
        min_count = min(counts)
        if min_count == 0:
            print(f"BUG-686 FAIL: Running orders dropped to 0 at some point. Counts: {counts}")
        elif all(c >= count_0 * 0.8 for c in counts):
            print(f"BUG-686 PASS: Running orders stable across reloads. Counts: {counts}")
        else:
            print(f"BUG-686 WARNING: Significant drop in orders. Counts: {counts}")

        await page.screenshot(path="/app/test_reports/screenshots/automation_output/20261126_150329_1a1f40c1f41e/bug686_after_reloads.jpeg", type="jpeg", quality=40, full_page=False)

    except Exception as e:
        print(f"Error: {e}")

