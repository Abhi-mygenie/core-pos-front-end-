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
        # Will be redirected to login
        await page.wait_for_selector('input[type="email"]', timeout=15000)
        await page.fill('input[type="email"]', "owner@palmhouse.com")
        await page.fill('input[type="password"]', "Qplazm@10")
        await page.click('button[type="submit"]')
        print("Logged in, waiting 25s for loading page to complete and redirect...")
        await page.wait_for_timeout(25000)

        print(f"URL after 25s: {page.url}")

        # Wait for the app to settle on audit-log OR dashboard
        for i in range(6):
            url = page.url
            if "audit-log" in url:
                print(f"On audit log at t+{25+i*5}s!")
                break
            await page.wait_for_timeout(5000)
            print(f"URL at t+{25+(i+1)*5}s: {page.url}")

        print(f"Final URL: {page.url}")

        # Check if we're on audit log
        if "audit-log" in page.url:
            # Check preset pills (BUG-697)
            await page.wait_for_timeout(3000)
            preset_data = await page.evaluate("""() => {
                const pills = document.querySelectorAll('button');
                const presetLabels = ['Today', '7D', 'LM', '30D', 'MTD', 'FY'];
                return Array.from(pills)
                    .filter(b => presetLabels.includes(b.textContent.trim()))
                    .map(b => ({
                        text: b.textContent.trim(),
                        hasShadow: b.className.includes('shadow-sm'),
                        className: b.className.substring(0,100)
                    }));
            }""")

            # Check if Today or 7D pill is highlighted  
            active_presets = [p for p in preset_data if p['hasShadow']]
            if active_presets:
                print(f"BUG-697 PASS: Active preset(s) on first load: {[p['text'] for p in active_presets]}")
            else:
                print(f"BUG-697: No shadow found. All presets: {[(p['text'], p['className'][:60]) for p in preset_data]}")

            # Wait for data
            print("Waiting 30s for audit log data...")
            await page.wait_for_timeout(30000)

            await page.screenshot(path="/app/test_reports/screenshots/automation_output/20261126_152253_c8e7ed5a67a0/audit_log_final.jpeg", type="jpeg", quality=40, full_page=False)

            page_text = await page.evaluate("() => document.body.innerText")
            print(f"Audit log content: {page_text[:800]}")

        else:
            print(f"Not on audit log. Need to navigate via sidebar. URL: {page.url}")
            # Navigate using React Router client-side
            await page.evaluate("() => window.location.href = '/reports-module/audit-log'")
            await page.wait_for_timeout(10000)
            print(f"After JS navigate: {page.url}")

            page_text = await page.evaluate("() => document.body.innerText")
            print(f"Content: {page_text[:500]}")

            await page.screenshot(path="/app/test_reports/screenshots/automation_output/20261126_152253_c8e7ed5a67a0/audit_log_final.jpeg", type="jpeg", quality=40, full_page=False)

    except Exception as e:
        print(f"Error: {e}")

