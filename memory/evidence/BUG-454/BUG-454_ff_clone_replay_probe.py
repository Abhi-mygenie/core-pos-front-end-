# BUG-454 — replicate soundManager preload -> cloneNode -> play -> stop -> play (Firefox) against UAT
import asyncio, json
from playwright.async_api import async_playwright

ORIGIN = 'https://pos-uat.mygenie.online'
JS = """
async (key) => {
  const cache = new Audio('/sounds/' + key + '.wav'); cache.preload = 'auto';
  await new Promise(r => setTimeout(r, 4000));   // let preload settle like the app does
  const out = { cacheReadyState: cache.readyState, cacheNetworkState: cache.networkState, plays: [] };
  let current = null;
  for (let i = 0; i < 3; i++) {
    if (current) { current.pause(); current.currentTime = 0; current = null; }
    const a = cache.cloneNode(); a.volume = 0.01; current = a;
    const t0 = performance.now();
    const r = await new Promise((resolve) => {
      const t = setTimeout(() => resolve({result:'TIMEOUT', readyState:a.readyState, networkState:a.networkState}), 20000);
      a.addEventListener('error', () => { clearTimeout(t); resolve({result:'ERROR', code:a.error&&a.error.code, msg:a.error&&a.error.message}); });
      a.play().then(() => { clearTimeout(t); resolve({result:'PLAY_OK', readyStateAtPlay:a.readyState}); })
              .catch(e => { clearTimeout(t); resolve({result:'PLAY_REJECTED', name:e.name, msg:e.message}); });
    });
    r.ms = Math.round(performance.now() - t0);
    out.plays.push(r);
    await new Promise(r => setTimeout(r, 1500));
  }
  return out;
}
"""

async def main():
    report = {}
    async with async_playwright() as p:
        b = await p.firefox.launch()
        page = await b.new_page()
        reqs = []
        page.on('response', lambda r: reqs.append({'url': r.url.split('/')[-1], 'status': r.status, 'fromSW': r.from_service_worker}) if '/sounds/' in r.url else None)
        await page.goto(ORIGIN + '/login', wait_until='domcontentloaded', timeout=60000)
        for key in ['forty_five_sec_buzzer', 'five_sec_buzzer']:
            report[key] = await page.evaluate(JS, key)
        report['sound_requests_observed'] = reqs
        await b.close()
    print(json.dumps(report, indent=2))
    json.dump(report, open('/app/memory/evidence/BUG-454/BUG-454_ff_clone_replay_probe.json', 'w'), indent=2)

asyncio.run(main())
