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
        print("Logged in, waiting 40s for all APIs + loading page...")
        await page.wait_for_timeout(40000)

        print(f"URL after 40s: {page.url}")

        # If still on loading page, wait more
        if "loading" in page.url:
            print("Still loading, waiting 20 more seconds...")
            await page.wait_for_timeout(20000)

        print(f"URL after additional wait: {page.url}")

        await page.screenshot(path="/app/test_reports/screenshots/automation_output/20261126_152139_7f91aace66c2/audit_via_direct.jpeg", type="jpeg", quality=40, full_page=False)

        # Get page content
        page_text = await page.evaluate("() => document.body.innerText")
        print(f"Page content: {page_text[:500]}")

        # BUG-697: Check active preset pill
        if "audit-log" in page.url or "Audit" in page_text:
            preset_data = await page.evaluate("""() => {
                const pills = document.querySelectorAll('button');
                const presetLabels = ['Today', '7D', 'LM', '30D', 'MTD', 'FY'];
                return Array.from(pills)
                    .filter(b => presetLabels.includes(b.textContent.trim()))
                    .map(b => ({
                        text: b.textContent.trim(),
                        hasShadow: b.className.includes('shadow-sm'),
                        hasNonHoverBg: /(?<![:/])\bbg-white\b/.test(b.className),
                        className: b.className.substring(0,80)
                    }));
            }""")
            print(f"BUG-697 presets: {preset_data}")

    except Exception as e:
        print(f"Error: {e}")

