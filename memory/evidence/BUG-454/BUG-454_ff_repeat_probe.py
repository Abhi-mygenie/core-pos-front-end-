# BUG-454 — repeat clone/play probe N times in fresh Firefox contexts, with network timing for /sounds/
import asyncio, json, time
from playwright.async_api import async_playwright

ORIGIN = 'https://pos-uat.mygenie.online'
JS = """
async (key) => {
  const t0 = performance.now();
  const cache = new Audio('/sounds/' + key + '.wav'); cache.preload = 'auto';
  await new Promise(r => setTimeout(r, 4000));
  const a = cache.cloneNode(); a.volume = 0.01;
  const r = await new Promise((resolve) => {
    const t = setTimeout(() => resolve({result:'TIMEOUT', rs:a.readyState, ns:a.networkState, cacheRs:cache.readyState, cacheNs:cache.networkState}), 25000);
    a.addEventListener('error', () => { clearTimeout(t); resolve({result:'ERROR', code:a.error&&a.error.code, msg:a.error&&a.error.message}); });
    a.play().then(() => { clearTimeout(t); resolve({result:'PLAY_OK'}); })
            .catch(e => { clearTimeout(t); resolve({result:'PLAY_REJECTED', name:e.name, msg:e.message}); });
  });
  r.ms = Math.round(performance.now() - t0); a.pause();
  return r;
}
"""

async def one(p, i):
    b = await p.firefox.launch()
    ctx = await b.new_context()
    page = await ctx.new_page()
    net = []
    t0 = time.time()
    def on_req(req):
        if '/sounds/' in req.url: net.append({'t': round(time.time()-t0,2), 'ev': 'request', 'url': req.url.split('/')[-1], 'range': req.headers.get('range')})
    def on_res(res):
        if '/sounds/' in res.url: net.append({'t': round(time.time()-t0,2), 'ev': 'response', 'url': res.url.split('/')[-1], 'status': res.status, 'cf': res.headers.get('cf-cache-status'), 'cl': res.headers.get('content-length'), 'cr': res.headers.get('content-range')})
    def on_fail(req):
        if '/sounds/' in req.url: net.append({'t': round(time.time()-t0,2), 'ev': 'FAILED', 'url': req.url.split('/')[-1], 'err': req.failure})
    def on_fin(req):
        if '/sounds/' in req.url: net.append({'t': round(time.time()-t0,2), 'ev': 'finished', 'url': req.url.split('/')[-1]})
    page.on('request', on_req); page.on('response', on_res); page.on('requestfailed', on_fail); page.on('requestfinished', on_fin)
    await page.goto(ORIGIN + '/login', wait_until='domcontentloaded', timeout=60000)
    out = {}
    for key in ['forty_five_sec_buzzer', 'five_sec_buzzer']:
        out[key] = await page.evaluate(JS, key)
    out['net'] = net
    await b.close()
    return out

async def main():
    report = []
    async with async_playwright() as p:
        for i in range(3):
            r = await one(p, i)
            report.append(r)
            print(f'run {i}:', json.dumps({k: v for k, v in r.items() if k != 'net'}))
            for n in r['net']: print('   ', n)
    json.dump(report, open('/app/memory/evidence/BUG-454/BUG-454_ff_repeat_probe.json', 'w'), indent=2)

asyncio.run(main())
