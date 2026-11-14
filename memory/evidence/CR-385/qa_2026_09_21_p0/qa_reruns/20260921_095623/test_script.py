async def run_test(page, output_dir, page_url):
    import re
    creds = open('/app/memory/test_credentials.md').read()
    email = re.search(r'- email: (\S+)', creds).group(1); pw = re.search(r'- password: (\S+)', creds).group(1)
    await page.set_viewport_size({"width": 1920, "height": 800})
    await page.goto("https://core-pos-deploy-20.preview.emergentagent.com/", wait_until="domcontentloaded")
    await page.wait_for_selector("[data-testid=login-email]", timeout=45000)
    await page.fill("[data-testid=login-email]", email); await page.fill("[data-testid=login-password]", pw)
    await page.get_by_role("button", name=re.compile("log in", re.I)).click()
    await page.wait_for_timeout(20000)
    await page.goto("https://core-pos-deploy-20.preview.emergentagent.com/pms/front-desk-v2?tab=arrivals", wait_until="domcontentloaded")
    await page.wait_for_selector("[data-testid=fd-tab-strip]", timeout=90000)
    r = await page.evaluate("""() => {
      const pg=document.querySelector('[data-testid=fd-page]'); const main=pg.querySelector('main');
      const cmNodes=[...pg.querySelectorAll('*')].filter(e=>e.children.length===0 && e.textContent.trim()==='Channel Manager');
      return {mainHasCM: main.innerText.includes('Channel Manager'), pageHasCM: pg.innerText.includes('Channel Manager'),
              cmInsideSidebar: cmNodes.map(e=>!!e.closest('aside, nav, [class*=sidebar], [class*=Sidebar]') || !main.contains(e)),
              cmVisible: cmNodes.map(e=>{const b=e.getBoundingClientRect(); return b.width>0 && b.height>0;})};
    }""")
    print("CM scope:", r)
    await page.screenshot(path="/root/.emergent/automation_output/20260921_095623/qa_cm_scope.jpeg", type="jpeg", quality=40, full_page=False)
