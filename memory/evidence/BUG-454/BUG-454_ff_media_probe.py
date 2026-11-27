# BUG-454 — Firefox vs Chromium media-load probe against UAT sound files (investigation only)
import asyncio, json, sys
from playwright.async_api import async_playwright

ORIGIN = 'https://pos-uat.mygenie.online'
KEYS = ['five_sec_buzzer', 'forty_five_sec_buzzer', 'order_accepted', 'new_order', 'confirm_order', 'order_rejected', 'swiggy_new_order', 'silent']

JS = """
async (keys) => {
  const out = {};
  for (const k of keys) {
    out[k] = await new Promise((resolve) => {
      const a = new Audio('/sounds/' + k + '.wav');
      a.preload = 'auto'; a.muted = false; a.volume = 0.01;
      const t = setTimeout(() => resolve({result:'TIMEOUT', readyState:a.readyState, networkState:a.networkState}), 15000);
      a.addEventListener('error', () => { clearTimeout(t); resolve({result:'ERROR', code:a.error && a.error.code, msg:a.error && a.error.message}); });
      a.addEventListener('canplaythrough', () => {
        a.play().then(() => { clearTimeout(t); resolve({result:'PLAY_OK', duration:a.duration}); })
                .catch(e => { clearTimeout(t); resolve({result:'PLAY_REJECTED', name:e.name, msg:e.message}); });
      });
    });
  }
  return out;
}
"""

async def run(browser_name, autoplay_allowed):
    async with async_playwright() as p:
        if browser_name == 'firefox':
            prefs = {'media.autoplay.default': 0 if autoplay_allowed else 1, 'media.autoplay.blocking_policy': 0}
            b = await p.firefox.launch(firefox_user_prefs=prefs)
        else:
            args = ['--autoplay-policy=no-user-gesture-required'] if autoplay_allowed else []
            b = await p.chromium.launch(args=args, executable_path='/usr/bin/google-chrome')
        page = await b.new_page()
        await page.goto(ORIGIN + '/login', wait_until='domcontentloaded')
        res = await page.evaluate(JS, KEYS)
        await b.close()
        return res

async def main():
    report = {}
    for bn, ap in [('firefox', True), ('firefox', False), ('chromium', True)]:
        try:
            report[f'{bn}_autoplay_{"allowed" if ap else "blocked"}'] = await run(bn, ap)
        except Exception as e:
            report[f'{bn}_autoplay_{"allowed" if ap else "blocked"}'] = {'launch_error': str(e)[:300]}
    print(json.dumps(report, indent=2))
    json.dump(report, open('/app/memory/evidence/BUG-454/BUG-454_ff_vs_chrome_media_probe.json', 'w'), indent=2)

asyncio.run(main())
