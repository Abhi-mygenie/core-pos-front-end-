
# CR-482 iteration_24 browser_automation body (FLAG placeholder replaced per run)
await page.set_viewport_size({"width": 1920, "height": 1080})
await page.add_init_script("""
localStorage.setItem('mygenie_keyboard_shortcuts_enabled', '__FLAG__');
window.__blocked = [];
window.addEventListener('click', e => {
  const t = e.target.closest && e.target.closest('[data-testid]');
  if (!t) return; const id = t.getAttribute('data-testid');
  if (id === 'place-order-btn' || id === 'reprint-kot-btn' || id === 'collect-bill-btn' || id.startsWith('order-entry-print-bill-btn')) {
    e.preventDefault(); e.stopPropagation(); e.stopImmediatePropagation(); window.__blocked.push(id);
  }
}, true);
""")
for pat in ["**/order-temp-store**", "**/place-order**", "**/update-place-order**", "**/order-bill-payment**", "https://crm.mygenie.online/**", "**/restaurant-crm-token**"]:
    await page.route(pat, lambda r: r.abort())
await page.reload()
await page.wait_for_timeout(2000)

async def ae():
    return await page.evaluate("()=>{const a=document.activeElement;return a.tagName+'['+(a.getAttribute('data-testid')||'')+']'}")
async def vis(tid):
    return await page.locator(f'[data-testid="{tid}"]').count() > 0

try:
    print("flag:", await page.evaluate("localStorage.getItem('mygenie_keyboard_shortcuts_enabled')"), "interceptor:", await page.evaluate("Array.isArray(window.__blocked)"))
    await page.fill('[data-testid="login-email"]', 'owner@cafe103.com')
    await page.fill('[data-testid="login-password"]', 'Qplazm@10')
    await page.click('[data-testid="login-button"]')
    await page.wait_for_selector('[data-testid="table-card-8322"]', timeout=120000)
    await page.click('[data-testid="table-card-8322"]')
    await page.wait_for_selector('[data-testid="menu-search-input"]', timeout=30000)
    await page.wait_for_timeout(2000)
    print("OE open C2")

    # ---- Order notes
    await page.click('[data-testid="order-notes-btn"]'); await page.wait_for_timeout(600)
    print("OrderNotes open:", await vis("order-notes-modal"), "ae:", await ae())
    await page.keyboard.press("Escape"); await page.wait_for_timeout(400)
    print("ORDER NOTES ESC-IMMEDIATE closed:", not await vis("order-notes-modal"))
    await page.click('[data-testid="order-notes-btn"]'); await page.wait_for_timeout(600)
    inp = page.locator('[data-testid="order-notes-modal"] input').first
    await inp.click(); await page.keyboard.type("Test note", delay=60); await page.wait_for_timeout(300)
    print("ORDER NOTE value:", repr(await inp.input_value()), "ae:", await ae())
    await page.keyboard.press("Escape"); await page.wait_for_timeout(400)
    print("OrderNotes closed:", not await vis("order-notes-modal"))

    # ---- Custom item
    await page.click('[data-testid="add-custom-item-btn"]'); await page.wait_for_timeout(600)
    print("CustomItem open ae:", await ae())
    await page.keyboard.press("Escape"); await page.wait_for_timeout(400)
    print("CUSTOM ITEM ESC-IMMEDIATE closed:", not await vis("add-custom-item-modal"))
    await page.click('[data-testid="add-custom-item-btn"]'); await page.wait_for_timeout(600)
    await page.keyboard.type("TestItem", delay=60)
    print("CUSTOM NAME typed (autoFocus, no click):", repr(await page.input_value('[data-testid="custom-item-name-input"]')))
    await page.click('[data-testid="custom-item-price-input"]')
    await page.keyboard.type("150", delay=60); await page.wait_for_timeout(300)
    print("CUSTOM PRICE:", repr(await page.input_value('[data-testid="custom-item-price-input"]')), "name:", repr(await page.input_value('[data-testid="custom-item-name-input"]')), "ae:", await ae())
    await page.keyboard.press("+"); await page.keyboard.press("F8"); await page.wait_for_timeout(300)
    print("custom modal still open after +/F8:", await vis("add-custom-item-modal"), "blocked:", await page.evaluate("window.__blocked"))
    await page.click('[data-testid="custom-item-close-btn"]'); await page.wait_for_timeout(400)

    # ---- Add items & item notes
    await page.locator('[data-testid^="menu-item-"]').nth(1).click(); await page.wait_for_timeout(600)
    await page.locator('[data-testid^="menu-item-"]').nth(2).click(); await page.wait_for_timeout(600)
    nb = page.locator('[data-testid^="add-note-btn-"]').first
    print("note btns:", await page.locator('[data-testid^="add-note-btn-"]').count())
    await nb.click(); await page.wait_for_timeout(600)
    print("ItemNotes open:", await vis("item-notes-modal"), "ae:", await ae())
    await page.keyboard.press("Escape"); await page.wait_for_timeout(400)
    print("ITEM NOTES ESC-IMMEDIATE closed:", not await vis("item-notes-modal"))
    await nb.click(); await page.wait_for_timeout(600)
    await page.keyboard.press("+"); await page.keyboard.press("F8"); await page.wait_for_timeout(300)
    print("item-notes still open after +/F8:", await vis("item-notes-modal"), "blocked:", await page.evaluate("window.__blocked"))
    iinp = page.locator('[data-testid="item-notes-modal"] input').first
    await iinp.click(); await page.keyboard.type("Less spicy", delay=60); await page.wait_for_timeout(300)
    print("ITEM NOTE value:", repr(await iinp.input_value()), "ae:", await ae())
    await page.keyboard.press("Escape"); await page.wait_for_timeout(400)
    print("ItemNotes closed:", not await vis("item-notes-modal"), "ae after close:", await ae())

    # ---- Customer modal (CRM requests aborted to avoid 401 logout)
    await page.click('[data-testid="customer-info-btn"]'); await page.wait_for_timeout(600)
    print("Customer open ae:", await ae())
    await page.keyboard.press("Escape"); await page.wait_for_timeout(400)
    print("CUSTOMER ESC-IMMEDIATE closed:", not await vis("customer-modal"))
    await page.click('[data-testid="customer-info-btn"]'); await page.wait_for_timeout(600)
    await page.keyboard.press("+"); await page.keyboard.press("F8"); await page.wait_for_timeout(300)
    print("customer still open after +/F8:", await vis("customer-modal"), "blocked:", await page.evaluate("window.__blocked"))
    await page.click('[data-testid="customer-name-input"]')
    await page.keyboard.type("TEST_Name", delay=60); await page.wait_for_timeout(300)
    print("CUSTOMER NAME value:", repr(await page.input_value('[data-testid="customer-name-input"]')), "ae:", await ae())
    await page.keyboard.press("Escape"); await page.wait_for_timeout(400)
    if await vis("customer-modal"):
        await page.keyboard.press("Escape"); await page.wait_for_timeout(400)
    print("Customer closed:", not await vis("customer-modal"))
    print("still logged-in OE:", await vis("menu-search-input"))
    await page.screenshot(path=".screenshots/it24_cart.jpg", quality=40, full_page=False)

    # ---- P16 Stay / Esc / Leave
    await page.click('[data-testid="menu-search-input"]'); await page.wait_for_timeout(200)
    await page.keyboard.press("Escape"); await page.wait_for_timeout(500)
    print("confirm shown:", await vis("kbd-leave-confirm"), "ae:", await ae())
    if await vis("kbd-leave-confirm"):
        await page.keyboard.press("Enter"); await page.wait_for_timeout(500)
        print("STAY(Enter): confirm gone:", not await vis("kbd-leave-confirm"), "OE open:", await vis("menu-search-input"), "ae:", await ae())
        await page.keyboard.press("Escape"); await page.wait_for_timeout(500)
        print("confirm shown again:", await vis("kbd-leave-confirm"))
        await page.keyboard.press("Escape"); await page.wait_for_timeout(500)
        print("ESC-DISMISS: confirm gone:", not await vis("kbd-leave-confirm"), "ae:", await ae())
        await page.keyboard.press("Escape"); await page.wait_for_timeout(500)
        await page.keyboard.press("Tab"); await page.wait_for_timeout(200)
        print("after Tab ae:", await ae())
        await page.keyboard.press("Enter"); await page.wait_for_timeout(1500)
        print("LEAVE: OE closed:", not await vis("menu-search-input"), "dashboard:", await vis("table-card-8322"))
    print("Final blocked:", await page.evaluate("window.__blocked"))
except Exception as e:
    print("ERROR:", e)
    await page.screenshot(path=".screenshots/it24_err.jpg", quality=40, full_page=False)
