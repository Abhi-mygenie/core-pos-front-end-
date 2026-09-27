import asyncio
from playwright.async_api import async_playwright

BASE_URL = "https://core-pos-deploy-24.preview.emergentagent.com"

REPORT_PAGES = [
    ("P&L Report", "/reports-module/profit-loss"),
    ("Sales Report", "/reports-module/sales"),
    ("Settlement Report", "/reports-module/settlement"),
    ("Hourly Sales", "/reports-module/hourly-sales"),
    ("Daily Sales", "/reports-module/daily-sales"),
    ("Order Ledger", "/reports-module/order-ledger"),
    ("PMS Revenue", "/reports-module/pms-revenue"),
]

async def run_tests():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context()
        page = await context.new_page()
        await page.set_viewport_size({"width": 1920, "height": 1080})

        errors = []
        page.on("pageerror", lambda err: errors.append(str(err)))

        # Check bundle
        await page.goto(BASE_URL, timeout=15000)
        await page.wait_for_timeout(2000)
        bundle = await page.evaluate("""() => {
            const scripts = Array.from(document.querySelectorAll('script[src]'));
            return scripts.map(s => s.src).filter(s => s.includes('main.'));
        }""")
        print(f"Bundle: {bundle}")

        # Login
        await page.fill('input[placeholder="Email"]', 'owner@cafe103.com')
        await page.fill('input[placeholder="Password"]', 'Qplazm@10')
        await page.click('button[type="submit"]', force=True)
        await page.wait_for_timeout(4000)
        print(f"After login URL: {page.url}")

        results = {}

        for name, path in REPORT_PAGES:
            try:
                errors.clear()
                await page.goto(BASE_URL + path, timeout=15000)
                await page.wait_for_timeout(3000)

                body_text = await page.evaluate("() => document.body.innerText")
                has_error_boundary = ("something went wrong" in body_text.lower())

                svg_count = await page.evaluate("() => document.querySelectorAll('svg').length")
                type_errors = [e for e in errors if "TypeError" in e or "is not a function" in e]

                status = "PASS" if not has_error_boundary and not type_errors else "FAIL"
                results[name] = {"status": status, "svg_count": svg_count, "error_boundary": has_error_boundary, "type_errors": type_errors}
                print(f"{status} | {name}: SVG={svg_count}, ErrorBoundary={has_error_boundary}, TypeErrors={type_errors}")

                if status == "FAIL":
                    await page.screenshot(path=f"/app/tests/{name.replace(' ', '_')}_FAIL.png", quality=40, full_page=False)
            except Exception as e:
                results[name] = {"status": "ERROR", "exception": str(e)}
                print(f"ERROR | {name}: {e}")

        await browser.close()
        return results

results = asyncio.run(run_tests())
print("\n=== SUMMARY ===")
for name, r in results.items():
    print(f"{r['status']} | {name}")
