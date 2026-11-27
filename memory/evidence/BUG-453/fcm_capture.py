import asyncio, json, os, re, sys, time
from playwright.async_api import async_playwright

URL = os.environ['PREVIEW_URL'].strip()
EMAIL = os.environ['CAP_EMAIL']
PASSWORD = os.environ['CAP_PASSWORD']
OUT = '/app/memory/evidence/BUG-453/fcm_console_capture.log'
MAX_MIN = int(os.environ.get('CAP_MINUTES', '45'))

def log(line):
    with open(OUT, 'a') as f:
        f.write(f'{time.strftime("%H:%M:%S")} {line}\n')

async def main():
    open(OUT, 'w').close()
    log(f'START url={URL} user={EMAIL} max={MAX_MIN}min')
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True, channel=None,
            executable_path='/pw-browsers/chromium-1243/chrome-linux/chrome' if os.path.exists('/pw-browsers/chromium-1243/chrome-linux/chrome') else None)
        ctx = await browser.new_context(permissions=['notifications'], viewport={'width': 1600, 'height': 900})
        page = await ctx.new_page()
        def on_console(msg):
            t = msg.text
            if any(k in t for k in ('[Notification]', '[Firebase]', '[SoundManager]', 'order_id', '[Socket', 'BUG-453')):
                log(f'CONSOLE[{msg.type}] {t[:4000]}')
        page.on('console', on_console)
        page.on('pageerror', lambda e: log(f'PAGEERROR {e}'))
        await page.goto(URL, wait_until='domcontentloaded')
        await page.wait_for_selector('[data-testid="login-email"]', timeout=60000)
        await page.fill('[data-testid="login-email"]', EMAIL)
        await page.fill('[data-testid="login-password"]', PASSWORD)
        await page.click('[data-testid="login-button"]')
        log('LOGIN submitted')
        try:
            await page.wait_for_url(re.compile(r'/dashboard'), timeout=180000)
        except Exception as e:
            log(f'WAIT dashboard failed: {e}; url={page.url}')
        log(f'URL now {page.url}')
        await page.screenshot(path='/app/memory/evidence/BUG-453/capture_dashboard.png', quality=30, type='jpeg')
        deadline = time.time() + MAX_MIN * 60
        n = 0
        while time.time() < deadline:
            await asyncio.sleep(30)
            n += 1
            if n % 10 == 0:
                log(f'HEARTBEAT url={page.url}')
            if os.path.exists('/tmp/cap_stop'):
                log('STOP requested'); break
        await browser.close()
        log('END')

asyncio.run(main())
