async def run_test(page, output_dir, page_url):
    await page.set_viewport_size({"width": 1920, "height": 800})
    URL = "https://core-pos-app-6.preview.emergentagent.com"
    await page.set_content(f'''<html><body style="margin:0;background:#222;display:flex;gap:20px;padding:10px">
    <iframe id="port" src="{URL}/" style="width:533px;height:780px;border:2px solid blue"></iframe>
    </body></html>''')
    await page.wait_for_timeout(8000)
    def fr():
        return [f for f in page.frames if f.url.startswith(URL)][0]
    async def kill_overlay():
        try: await fr().evaluate("() => { const o=document.getElementById('webpack-dev-server-client-overlay'); if(o) o.remove(); }")
        except Exception: pass
    await kill_overlay()
    fl = page.frame_locator("#port")
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
     return {path: location.pathname, vw: document.documentElement.clientWidth, vh: innerHeight, docScrollH: document.documentElement.scrollHeight, sidebarW: sb?Math.round(sb.getBoundingClientRect().width):null, clippedCount: clipped.length, clippedMaxRight: clipped.length?Math.max(...clipped.map(e=>Math.round(e.getBoundingClientRect().right))):0, clippedSample: clipped.slice(0,5).map(e => (e.getAttribute('data-testid')||e.tagName)+'|'+e.className.toString().slice(0,40)+'|R='+Math.round(e.getBoundingClientRect().right))} }"""
    print("DASH-PORTRAIT", await fr().evaluate(MEASURE))
    await page.screenshot(path="/root/.emergent/automation_output/20261015_081330/P01_dashboard_533x780.jpeg", type="jpeg", quality=40, full_page=False)
    await fl.locator('[data-testid^="table-card-"]').first.click(force=True)
    await page.wait_for_timeout(5000); await kill_overlay()
    print("ORDER-ENTRY-PORTRAIT", await fr().evaluate(MEASURE))
    print("  panels:", await fr().evaluate("""() => { const s=document.querySelector('[data-testid="order-entry-screen"]'); return [...s.firstElementChild.children].map(k => k.className.toString().slice(0,22)+' L='+Math.round(k.getBoundingClientRect().left)+' W='+Math.round(k.getBoundingClientRect().width)); }"""))
    await page.screenshot(path="/root/.emergent/automation_output/20261015_081330/P02_order_entry_533x780.jpeg", type="jpeg", quality=40, full_page=False)
    print("done")
