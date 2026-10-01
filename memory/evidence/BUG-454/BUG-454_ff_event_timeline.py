# BUG-454 — Firefox media event timeline for preload cache + clone + fresh Audio (UAT)
import asyncio, json
from playwright.async_api import async_playwright

ORIGIN = 'https://pos-uat.mygenie.online'
JS = """
async ([key, mode, waitMs]) => {
  const evs = ['loadstart','progress','suspend','stalled','abort','emptied','loadedmetadata','loadeddata','canplay','canplaythrough','playing','error','waiting'];
  const t0 = performance.now();
  const timeline = [];
  const tag = (a, who) => evs.forEach(e => a.addEventListener(e, () => timeline.push(`${who}:${e}@${Math.round(performance.now()-t0)}ms rs=${a.readyState} ns=${a.networkState}` + (e==='error' && a.error ? ` code=${a.error.code} ${a.error.message}` : ''))));
  const cache = new Audio('/sounds/' + key + '.wav'); cache.preload = 'auto'; tag(cache, 'cache');
  await new Promise(r => setTimeout(r, 3000));
  let a;
  if (mode === 'clone') a = cache.cloneNode();
  else if (mode === 'fresh') a = new Audio('/sounds/' + key + '.wav');
  else a = cache;
  a.volume = 0.01; tag(a, mode);
  const res = await new Promise((resolve) => {
    const t = setTimeout(() => resolve({result:'TIMEOUT', rs:a.readyState, ns:a.networkState}), waitMs);
    a.play().then(() => { clearTimeout(t); resolve({result:'PLAY_OK', ms: Math.round(performance.now()-t0)}); })
            .catch(e => { clearTimeout(t); resolve({result:'PLAY_REJECTED', name:e.name, msg:e.message, ms: Math.round(performance.now()-t0)}); });
  });
  a.pause();
  return { res, timeline };
}
"""

async def main():
    report = {}
    async with async_playwright() as p:
        b = await p.firefox.launch()
        page = await b.new_page()
        await page.goto(ORIGIN + '/login', wait_until='domcontentloaded', timeout=60000)
        for key, mode in [('forty_five_sec_buzzer','clone'), ('forty_five_sec_buzzer','fresh'), ('forty_five_sec_buzzer','cache'), ('order_accepted','clone'), ('five_sec_buzzer','clone')]:
            report[f'{key}/{mode}'] = await page.evaluate(JS, [key, mode, 40000])
            print(key, mode, json.dumps(report[f'{key}/{mode}']['res']))
        await b.close()
    json.dump(report, open('/app/memory/evidence/BUG-454/BUG-454_ff_event_timeline.json', 'w'), indent=2)
    for k, v in report.items():
        print('\n##', k); print('\n'.join(v['timeline'][-12:]))

asyncio.run(main())
