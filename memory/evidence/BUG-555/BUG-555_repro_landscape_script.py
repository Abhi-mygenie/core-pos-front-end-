async def run_test(page, output_dir, page_url):
    await page.set_viewport_size({"width": 1920, "height": 800})
    URL = "https://core-pos-app-6.preview.emergentagent.com"
    await page.set_content(f'''<html><body style="margin:0;background:#222;display:flex;gap:20px;padding:10px">
    <iframe id="land" src="{URL}/" style="width:853px;height:533px;border:2px solid red"></iframe>
    </body></html>''')
    await page.wait_for_timeout(8000)
    def fr():
        return [f for f in page.frames if f.url.startswith(URL)][0]
    async def kill_overlay():
        try: await fr().evaluate("() => { const o=document.getElementById('webpack-dev-server-client-overlay'); if(o) o.remove(); }")
        except Exception: pass
    await kill_overlay()
    fl = page.frame_locator("#land")
    await fl.locator('[data-testid="login-email"]').click()
    await fl.locator('[data-testid="login-email"]').type("owner@thegoankitchen.com", delay=5)
    await fl.locator('[data-testid="login-password"]').click()
    await fl.locator('[data-testid="login-password"]').type("***", delay=5)
    await fl.locator('[data-testid="login-button"]').click()
    await page.wait_for_timeout(15000)
    await kill_overlay()
    MEASURE = """() => { const scrollable = (e) => { let p=e.parentElement; while(p){ const o=getComputedStyle(p).overflowX; if(o==='auto'||o==='scroll') return true; p=p.parentElement;} return false; };
     const ov=[...document.querySelectorAll('*')].filter(e => { const b=e.getBoundingClientRect(); return b.width>0 && b.right > innerWidth + 1; });
     const clipped = ov.filter(e=>!scrollable(e)); const sb=document.querySelector('[data-testid="sidebar"]');
     return {path: location.pathname, vw: document.documentElement.clientWidth, vh: innerHeight, docScrollH: document.documentElement.scrollHeight, sidebarW: sb?Math.round(sb.getBoundingClientRect().width):null, clippedCount: clipped.length, scrollableOnly: ov.length-clipped.length, clippedMaxRight: clipped.length?Math.max(...clipped.map(e=>Math.round(e.getBoundingClientRect().right))):0, clippedSample: clipped.slice(0,4).map(e => (e.getAttribute('data-testid')||e.tagName)+'|'+e.className.toString().slice(0,40)+'|R='+Math.round(e.getBoundingClientRect().right))} }"""
    print("DASH", await fr().evaluate(MEASURE))
    await fr().evaluate("() => window.scrollTo(0, document.documentElement.scrollHeight)")
    await page.wait_for_timeout(600)
    print("DASH SCROLLED sidebarTop:", await fr().evaluate("() => Math.round(document.querySelector('[data-testid=\"sidebar\"]').getBoundingClientRect().top)"))
    await page.screenshot(path="/root/.emergent/automation_output/20261015_081134/L01_dashboard_scrolled_853x533.jpeg", type="jpeg", quality=40, full_page=False)
    await fr().evaluate("() => window.scrollTo(0,0)")
    await fl.locator('[data-testid^="table-card-"]').first.click(force=True)
    await page.wait_for_timeout(5000); await kill_overlay()
    print("ORDER-ENTRY", await fr().evaluate(MEASURE))
    print("  panels:", await fr().evaluate("""() => { const s=document.querySelector('[data-testid="order-entry-screen"]'); return [...s.firstElementChild.children].map(k => k.className.toString().slice(0,22)+' L='+Math.round(k.getBoundingClientRect().left)+' W='+Math.round(k.getBoundingClientRect().width)); }"""))
    await page.screenshot(path="/root/.emergent/automation_output/20261015_081134/L02_order_entry_853x533.jpeg", type="jpeg", quality=40, full_page=False)
    # add an item then collect bill
    try:
        item = fl.locator('[data-testid^="menu-item-"], [data-testid^="product-card-"]').first
        await item.click(force=True, timeout=4000)
        await page.wait_for_timeout(1500)
        await fl.locator('[data-testid="collect-bill-btn"]').click(force=True, timeout=4000)
        await page.wait_for_timeout(3000); await kill_overlay()
        print("COLLECT", await fr().evaluate(MEASURE))
        await page.screenshot(path="/root/.emergent/automation_output/20261015_081134/L03_collect_payment_853x533.jpeg", type="jpeg", quality=40, full_page=False)
    except Exception as e:
        print("collect flow:", str(e)[:120])
    for r in ["/employees","/inventory","/reports/audit","/reports-module/dashboard","/reports-module/items","/reports-module/consumption-report","/reports-module/profit-loss","/reports-module/settlement"]:
        await fr().evaluate(f"() => {{ window.history.pushState({{}}, '', '{r}'); window.dispatchEvent(new PopStateEvent('popstate')); }}")
        await page.wait_for_timeout(3500); await kill_overlay()
        print("ROUTE", r, await fr().evaluate(MEASURE))
        if r == "/reports-module/items":
            await page.screenshot(path="/root/.emergent/automation_output/20261015_081134/L04_reports_items_853x533.jpeg", type="jpeg", quality=40, full_page=False)
    await page.screenshot(path="/root/.emergent/automation_output/20261015_081134/L05_reports_settlement_853x533.jpeg", type="jpeg", quality=40, full_page=False)
    print("done")
