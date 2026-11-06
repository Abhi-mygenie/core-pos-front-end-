# CR-482 P11-P15 retest: F8 Radix toast focus-steal fix + F4 conditional refocus (paste into browser_automation)
BASE = "https://pos-core-web-1--1h25t0al.preview.emergentagent.com"
results = []
def rec(name, ok, info=""):
    results.append((name, ok)); print(("PASS" if ok else "FAIL"), name, info)

await page.set_viewport_size({"width": 1920, "height": 1080})
await page.add_init_script("""
localStorage.setItem('mygenie_keyboard_shortcuts_enabled','true');
window.__blocked=[];
window.addEventListener('click',(e)=>{const b=e.target.closest&&e.target.closest('[data-testid="place-order-btn"],[data-testid^="order-entry-print-bill-btn-"]'); if(b){e.stopImmediatePropagation();e.preventDefault();window.__blocked.push(b.getAttribute('data-testid'));}},true);
window.__keys=[];
document.addEventListener('keydown',(e)=>{window.__keys.push(e.key+':'+e.defaultPrevented);},true);
""")

async def state():
    return await page.evaluate("""()=>{const a=document.activeElement;return {tag:a?a.tagName:null,tid:a?a.getAttribute('data-testid'):null,item:a?a.hasAttribute('data-kbd-item'):false,blocked:[...window.__blocked],panel:!!document.querySelector('[data-testid=collect-payment-panel]'),ols:document.querySelectorAll('ol').length}}""")

async def clear():
    await page.evaluate("()=>{window.__blocked=[]}")

async def close_panel():
    if await page.locator('[data-testid="payment-back-btn"]').count():
        await page.click('[data-testid="payment-back-btn"]')
        await page.wait_for_timeout(800)

async def open_table(tid):
    await page.goto(BASE + "/dashboard", wait_until="domcontentloaded")
    await page.wait_for_selector(f'[data-testid="{tid}"]', timeout=60000)
    await page.locator(f'[data-testid="{tid}"]').click()
    await page.wait_for_selector('[data-testid="menu-search-input"]', timeout=20000)
    await page.wait_for_timeout(1500)
