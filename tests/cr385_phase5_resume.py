"""Resume: A5 bill/settle + A4 toggle-cycle repeat + final cleanup."""
import asyncio, os, re, json, random, sys, time, traceback
from datetime import datetime, timedelta
from playwright.async_api import async_playwright

RESULTS = {"per_row": [], "captured": [], "console": [], "figures": {}, "end_state": {}}

def add(row,st,sev,det):
    RESULTS["per_row"].append({"row":row,"status":st,"severity":sev,"detail":det})
    print(f"[{st}] {row}: {det[:250]}")

def digits(s): return re.sub(r"[^0-9]","",s or "")

def parse_creds():
    t=open("/app/memory/test_credentials.md").read().split("## QA_TGK")[1].split("##")[0]
    return re.search(r"email\s*`([^`]+)`",t).group(1), re.search(r"password\s*`([^`]+)`",t).group(1)

FORB=["rate_per_night","room_price","amount_after_tax","order_amount","new_room_price"]
def check_forbidden(body, allow_zero=None):
    allow_zero = allow_zero or set(); found=[]; seen=[]
    try:
        o=json.loads(body)
        for k in FORB+["gst_tax"]:
            if k in o:
                seen.append(f"{k}={o[k]}")
                if k in allow_zero and str(o[k]) in ("0","0.0"): continue
                if k in FORB: found.append(f"{k}={o[k]}")
    except:
        for k in FORB+["gst_tax"]:
            m=re.search(rf'name="{k}"\r?\n\r?\n([^\r\n-]*)',body)
            if m:
                v=m.group(1).strip(); seen.append(f"{k}={v}")
                if k in allow_zero and v in ("0","0.0"): continue
                if k in FORB: found.append(f"{k}={v}")
    return found,seen

async def main():
    email,pw = parse_creds()
    url = open("/app/frontend/.env").read().split("REACT_APP_BACKEND_URL=")[1].split("\n")[0].strip()
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path="/usr/bin/google-chrome", headless=True, args=["--no-sandbox","--disable-dev-shm-usage"])
        ctx = await b.new_context(viewport={"width":1366,"height":768})
        page = await ctx.new_page()
        IGN=("socket","firebase","messaging","Payment Debug")
        page.on("console", lambda m: RESULTS["console"].append(m.text[:400]) if m.type=="error" and not any(k.lower() in m.text.lower() for k in IGN) else None)
        async def _req(r):
            if r.method in ("POST","PUT","PATCH"):
                try: bd=r.post_data or ""
                except: bd=""
                RESULTS["captured"].append({"url":r.url,"body":bd[:8000]})
        page.on("request", _req)

        try:
            # LOGIN
            await page.goto(url+"/", wait_until="domcontentloaded", timeout=60000)
            await page.wait_for_selector("input[type='password']", timeout=30000)
            inputs = await page.query_selector_all("input")
            await inputs[0].fill(email)
            await page.locator("input[type='password']").fill(pw)
            await page.locator("button[type='submit']").click()
            end=time.time()+90
            while time.time()<end:
                if "/loading" not in page.url and page.url != url+"/": break
                await page.wait_for_timeout(500)
            print("logged in", page.url)

            # ===== A5 first: settle any remaining P5 QA Suite inhouse row =====
            await page.goto(url+"/pms/front-desk-v2", wait_until="domcontentloaded", timeout=60000)
            await page.wait_for_selector("[data-testid='fd-page']", timeout=20000)
            await page.click("[data-testid='fd-tab-inhouse']"); await page.wait_for_timeout(1500)
            try: await page.click("[data-testid='fd-chip-inhouse-all']")
            except: pass
            await page.wait_for_timeout(2000)

            suite_row = None
            for r in await page.query_selector_all("[data-testid^='fd-row-']"):
                txt = await r.inner_text()
                if "P5 QA Suite" in txt:
                    tid = await r.get_attribute("data-testid")
                    m = re.match(r"fd-row-([^-]+)", tid)
                    if m: suite_row = m.group(1); break

            a5_status = "NOT-RUN"; a5_detail=""
            if suite_row:
                # inhouse paid cell
                paid_cell = ""
                try:
                    paid_cell = (await page.locator(f"[data-testid='fd-row-{suite_row}-paid']").inner_text()).strip()
                except: pass
                if not paid_cell:
                    # try to find any data-testid with 'paid' on this row
                    try:
                        el = await page.query_selector(f"[data-testid^='fd-row-{suite_row}-'][data-testid*='paid']")
                        if el: paid_cell = (await el.inner_text()).strip()
                    except: pass
                RESULTS["figures"]["paid_cell_inhouse"] = paid_cell

                await page.click(f"[data-testid='fd-row-{suite_row}-bill-btn']")
                await page.wait_for_selector(f"[data-testid='bill-panel-{suite_row}']", timeout=15000)
                await page.wait_for_selector("[data-testid='bill-right']", timeout=15000)
                for _ in range(20):
                    lo = await page.query_selector("[data-testid='bill-panel-loading']")
                    if not lo: break
                    await page.wait_for_timeout(500)
                geom = await page.evaluate("""() => {
                  const el = document.querySelector("[data-testid='bill-right'] .frontdesk-bill");
                  if (!el) return null;
                  const r = el.getBoundingClientRect();
                  return {w:r.width,h:r.height};
                }""")
                sgst_ok = bool(await page.query_selector("[data-testid='bill-room-sgst']"))
                cgst_ok = bool(await page.query_selector("[data-testid='bill-room-cgst']"))
                d88 = await page.evaluate("""() => {
                  const ids=['checkout-room-booking-toggle','checkout-transferred-toggle','checkout-room-service-toggle','payment-split-btn'];
                  const o={};
                  ids.forEach(i=>{const e=document.querySelector(`[data-testid='${i}']`);
                    if(!e) o[i]='absent';
                    else {const s=getComputedStyle(e); o[i]=(s.display==='none'||s.visibility==='hidden')?'hidden':'visible';}});
                  return o;
                }""")
                stack_bal=""; right_bal=""; row_bal=""
                for _ in range(20):
                    stack_bal = (await page.locator("[data-testid='bill-stack-room-balance']").inner_text()).strip()
                    right_bal = (await page.locator("[data-testid='bill-room-balance']").inner_text()).strip()
                    try: row_bal = (await page.locator(f"[data-testid='fd-row-{suite_row}-balance']").inner_text()).strip()
                    except: row_bal=""
                    if all("…" not in x and x for x in [stack_bal, right_bal, row_bal]): break
                    await page.wait_for_timeout(500)
                ds,dr,drr = digits(stack_bal), digits(right_bal), digits(row_bal)
                bal_eq = ds==dr==drr and ds
                geom_ok = geom and abs(geom["w"]-440)<=2 and abs(geom["h"]-560)<=2
                d88_ok = all(v in ("absent","hidden") for v in d88.values())
                RESULTS["figures"]["a5"] = {"geom":geom,"stack":stack_bal,"right":right_bal,"row":row_bal,"d88":d88}

                await page.click("[data-testid='payment-cash-btn']"); await page.wait_for_timeout(500)
                await page.fill("[data-testid='cash-received-input']", ds or "0")
                await page.click("[data-testid='complete-payment-btn']")
                toast_co = False
                try:
                    await page.wait_for_selector("text=Checked out", timeout=25000); toast_co=True
                except: pass
                await page.wait_for_timeout(2500)
                row_gone = not bool(await page.query_selector(f"[data-testid='fd-row-{suite_row}-bill-btn']"))
                # rooms tab hk
                await page.click("[data-testid='fd-tab-rooms']"); await page.wait_for_timeout(2500)
                hk = False
                for tid in (8525,8527):
                    b_ = await page.query_selector(f"[data-testid='fd-room-tile-badge-{tid}']")
                    if b_: hk=True; break
                bp = [r for r in RESULTS["captured"] if "bill-payment" in r["url"] or "order-bill-payment" in r["url"]]
                forb_bp, keys_bp = ([],[])
                if bp:
                    forb_bp, keys_bp = check_forbidden(bp[-1]["body"])
                a5_ok = geom_ok and sgst_ok and cgst_ok and d88_ok and bal_eq and toast_co and row_gone and bp and not forb_bp
                a5_status = "PASS" if a5_ok else "FAIL"
                a5_detail = f"paid_cell='{paid_cell}'; geom={geom} ok={geom_ok}; sgst={sgst_ok} cgst={cgst_ok}; D88={d88}; bals stack={stack_bal} right={right_bal} row={row_bal} eq={bool(bal_eq)}; toast={toast_co}; row_gone={row_gone}; hk_badge={hk}; bill-payment captured={bool(bp)}; forbidden={forb_bp}; keys={keys_bp}"
            else:
                a5_detail="no P5 QA Suite inhouse row present"
            add("A5 BILL/CASH", a5_status, "NOTE" if a5_status=="PASS" else "MAJOR", a5_detail)

            # ===== A4 toggle cycle re-run (already-validated read-back) =====
            # Also find P5 QA Tomorrow row id
            await page.click("[data-testid='fd-tab-arrivals']"); await page.wait_for_timeout(1500)
            await page.click("[data-testid='fd-chip-arrivals-tomorrow']"); await page.wait_for_timeout(2500)
            tomorrow_row=None
            for r in await page.query_selector_all("[data-testid^='fd-row-']"):
                txt = await r.inner_text()
                if "P5 QA Tomorrow" in txt:
                    tid = await r.get_attribute("data-testid")
                    m = re.match(r"fd-row-([^-]+)", tid)
                    if m: tomorrow_row=m.group(1); break

            btn_disabled_initial=None; tooltip_ok=None
            if tomorrow_row:
                bb = page.locator(f"[data-testid='fd-row-{tomorrow_row}-checkin-btn']")
                try: btn_disabled_initial = await bb.is_disabled()
                except: pass
                try:
                    await bb.hover(force=True); await page.wait_for_timeout(800)
                    tt = await page.query_selector("[data-testid='checkin-early-tooltip']")
                    if tt:
                        ttxt = await tt.inner_text()
                        tooltip_ok = "Arrives" in ttxt
                except: pass

            # Rules toggle ON, save, check calendar radio persisted
            await page.goto(url+"/pms/channel-manager", wait_until="domcontentloaded", timeout=60000)
            await page.wait_for_timeout(1500)
            await page.click("[data-testid='channel-manager-tab-4']")
            await page.wait_for_selector("[data-testid='toggle-allow-early-checkin']", timeout=15000)
            await page.wait_for_timeout(2000)  # let fetch land
            # Read actual `checked` prop
            async def toggle_state():
                return await page.evaluate("() => document.querySelector(\"[data-testid='toggle-allow-early-checkin']\").checked")
            async def cal_state():
                return await page.evaluate("() => { const r=document.querySelector(\"input[data-testid='radio-extend-rate-mode-calendar']\"); return r? r.checked: null; }")
            s0 = await toggle_state(); c0 = await cal_state()
            if not s0:
                await page.click("[data-testid='toggle-allow-early-checkin']"); await page.wait_for_timeout(400)
            # wait dirty
            for _ in range(10):
                if not await page.locator("[data-testid='frontdesk-rules-save-btn']").is_disabled(): break
                await page.wait_for_timeout(300)
            await page.click("[data-testid='frontdesk-rules-save-btn']")
            await page.wait_for_timeout(3000)
            s1 = await toggle_state(); c1 = await cal_state()

            # go check Tomorrow row - button enabled?
            await page.goto(url+"/pms/front-desk-v2?tab=arrivals", wait_until="domcontentloaded", timeout=60000)
            await page.wait_for_selector("[data-testid='fd-page']", timeout=20000)
            await page.click("[data-testid='fd-chip-arrivals-tomorrow']"); await page.wait_for_timeout(3000)
            btn_enabled_after=None
            if tomorrow_row:
                try:
                    btn_enabled_after = not await page.locator(f"[data-testid='fd-row-{tomorrow_row}-checkin-btn']").is_disabled()
                except: pass

            # Toggle OFF
            await page.goto(url+"/pms/channel-manager", wait_until="domcontentloaded", timeout=60000)
            await page.wait_for_timeout(1500)
            await page.click("[data-testid='channel-manager-tab-4']")
            await page.wait_for_selector("[data-testid='toggle-allow-early-checkin']", timeout=15000)
            await page.wait_for_timeout(2000)
            s_pre_off = await toggle_state()
            if s_pre_off:
                await page.click("[data-testid='toggle-allow-early-checkin']"); await page.wait_for_timeout(400)
            for _ in range(10):
                if not await page.locator("[data-testid='frontdesk-rules-save-btn']").is_disabled(): break
                await page.wait_for_timeout(300)
            await page.click("[data-testid='frontdesk-rules-save-btn']")
            await page.wait_for_timeout(3000)
            await page.reload(wait_until="domcontentloaded"); await page.wait_for_timeout(1500)
            await page.click("[data-testid='channel-manager-tab-4']")
            await page.wait_for_selector("[data-testid='toggle-allow-early-checkin']", timeout=15000)
            await page.wait_for_timeout(2000)
            s_after_reload = await toggle_state()
            c_after_reload = await cal_state()

            # arrival tomorrow disabled again
            await page.goto(url+"/pms/front-desk-v2?tab=arrivals", wait_until="domcontentloaded", timeout=60000)
            await page.wait_for_selector("[data-testid='fd-page']", timeout=20000)
            await page.click("[data-testid='fd-chip-arrivals-tomorrow']"); await page.wait_for_timeout(3000)
            btn_disabled_final=None
            if tomorrow_row:
                try: btn_disabled_final = await page.locator(f"[data-testid='fd-row-{tomorrow_row}-checkin-btn']").is_disabled()
                except: pass

            a4_ok = (tomorrow_row and btn_disabled_initial and tooltip_ok and btn_enabled_after and s_after_reload==False and c_after_reload==True and btn_disabled_final)
            add("A4 TOMORROW+guard+toggle","PASS" if a4_ok else "FAIL","NOTE" if a4_ok else "MAJOR",
                f"tomorrow_row={tomorrow_row}; initial_disabled={btn_disabled_initial}; tooltip_Arrives={tooltip_ok}; s0={s0} c0={c0} s1={s1} c1={c1}; enabled_after_ON={btn_enabled_after}; s_after_reload_off={s_after_reload}; cal_after_reload={c_after_reload}; disabled_after_OFF={btn_disabled_final}")

        except Exception as e:
            traceback.print_exc()
            add("EXEC","FAIL","BLOCKER", f"Exception: {e}")

        finally:
            try:
                # ===== CLEANUP =====
                await page.goto(url+"/pms/front-desk-v2", wait_until="domcontentloaded", timeout=60000)
                await page.wait_for_selector("[data-testid='fd-page']", timeout=20000)
                # inhouse
                await page.click("[data-testid='fd-tab-inhouse']"); await page.wait_for_timeout(1500)
                try: await page.click("[data-testid='fd-chip-inhouse-all']")
                except: pass
                await page.wait_for_timeout(1500)
                for _ in range(6):
                    ids=[]
                    for r in await page.query_selector_all("[data-testid^='fd-row-']"):
                        tx = await r.inner_text()
                        if "P5 QA" in tx and "coke" not in tx.lower():
                            tid = await r.get_attribute("data-testid")
                            m = re.match(r"fd-row-([^-]+)", tid)
                            if m: ids.append(m.group(1))
                    ids=list(dict.fromkeys(ids))
                    if not ids: break
                    for rid in ids:
                        try:
                            bt = await page.query_selector(f"[data-testid='fd-row-{rid}-bill-btn']")
                            if not bt: continue
                            await bt.click()
                            await page.wait_for_selector(f"[data-testid='bill-panel-{rid}']", timeout=10000)
                            await page.wait_for_timeout(1500)
                            bal = digits(await page.locator("[data-testid='bill-stack-room-balance']").inner_text()) or "0"
                            await page.click("[data-testid='payment-cash-btn']"); await page.wait_for_timeout(300)
                            await page.fill("[data-testid='cash-received-input']", bal)
                            await page.click("[data-testid='complete-payment-btn']"); await page.wait_for_timeout(3500)
                        except Exception as ex: print("cl_ih",ex)
                # arrivals cancel
                await page.click("[data-testid='fd-tab-arrivals']"); await page.wait_for_timeout(1500)
                for chip in ["fd-chip-arrivals-late","fd-chip-arrivals-today","fd-chip-arrivals-tomorrow","fd-chip-arrivals-upcoming"]:
                    try: await page.click(f"[data-testid='{chip}']"); await page.wait_for_timeout(2000)
                    except: continue
                    for _ in range(6):
                        ids=[]
                        for r in await page.query_selector_all("[data-testid^='fd-row-']"):
                            tx = await r.inner_text()
                            if "P5 QA" in tx:
                                tid = await r.get_attribute("data-testid")
                                m = re.match(r"fd-row-([^-]+)", tid)
                                if m: ids.append(m.group(1))
                        ids=list(dict.fromkeys(ids))
                        if not ids: break
                        for rid in ids:
                            try:
                                cb = await page.query_selector(f"[data-testid='fd-row-{rid}-cancel-btn']")
                                if not cb: continue
                                await cb.click()
                                await page.wait_for_selector("[data-testid='cancel-reason-select']", timeout=8000)
                                # It might be a shadcn Select - click to open, pick option
                                sel = page.locator("[data-testid='cancel-reason-select']")
                                tag = await sel.evaluate("el => el.tagName")
                                if tag == "SELECT":
                                    opts = await sel.locator("option").all_text_contents()
                                    real = [o for o in opts if o.strip() and o.strip().lower() not in ("select","choose","")]
                                    if real: await sel.select_option(label=real[0])
                                else:
                                    await sel.click(force=True); await page.wait_for_timeout(500)
                                    opt = await page.query_selector("[role='option']")
                                    if opt: await opt.click(force=True)
                                await page.wait_for_timeout(500)
                                # wait for confirm-btn enabled
                                for _ in range(20):
                                    if not await page.locator("[data-testid='cancel-booking-confirm-btn']").is_disabled(): break
                                    await page.wait_for_timeout(300)
                                await page.click("[data-testid='cancel-booking-confirm-btn']")
                                await page.wait_for_timeout(3000)
                            except Exception as ex: print("cl_cancel",ex)
                # rules end-state
                await page.goto(url+"/pms/channel-manager", wait_until="domcontentloaded", timeout=60000)
                await page.wait_for_timeout(1500)
                await page.click("[data-testid='channel-manager-tab-4']")
                await page.wait_for_selector("[data-testid='toggle-allow-early-checkin']", timeout=15000)
                await page.wait_for_timeout(2000)
                s = await page.evaluate("() => document.querySelector(\"[data-testid='toggle-allow-early-checkin']\").checked")
                c = await page.evaluate("() => { const r=document.querySelector(\"input[data-testid='radio-extend-rate-mode-calendar']\"); return r? r.checked: null; }")
                changed=False
                if s:
                    await page.click("[data-testid='toggle-allow-early-checkin']"); changed=True; await page.wait_for_timeout(400)
                if not c:
                    try: await page.click("input[data-testid='radio-extend-rate-mode-calendar']"); changed=True
                    except: pass
                if changed:
                    for _ in range(10):
                        if not await page.locator("[data-testid='frontdesk-rules-save-btn']").is_disabled(): break
                        await page.wait_for_timeout(300)
                    await page.click("[data-testid='frontdesk-rules-save-btn']"); await page.wait_for_timeout(2500)
                s_final = await page.evaluate("() => document.querySelector(\"[data-testid='toggle-allow-early-checkin']\").checked")
                c_final = await page.evaluate("() => { const r=document.querySelector(\"input[data-testid='radio-extend-rate-mode-calendar']\"); return r? r.checked: null; }")

                # counts
                await page.goto(url+"/pms/front-desk-v2", wait_until="domcontentloaded", timeout=60000)
                await page.wait_for_selector("[data-testid='fd-page']", timeout=20000)
                await page.click("[data-testid='fd-tab-inhouse']"); await page.wait_for_timeout(1500)
                try: await page.click("[data-testid='fd-chip-inhouse-all']")
                except: pass
                await page.wait_for_timeout(1500)
                ih=0
                for r in await page.query_selector_all("[data-testid^='fd-row-']"):
                    tx = await r.inner_text()
                    if "P5 QA" in tx: ih+=1
                ar=0
                await page.click("[data-testid='fd-tab-arrivals']"); await page.wait_for_timeout(1500)
                for chip in ["fd-chip-arrivals-late","fd-chip-arrivals-today","fd-chip-arrivals-tomorrow","fd-chip-arrivals-upcoming"]:
                    try:
                        await page.click(f"[data-testid='{chip}']"); await page.wait_for_timeout(1500)
                        for r in await page.query_selector_all("[data-testid^='fd-row-']"):
                            tx = await r.inner_text()
                            if "P5 QA" in tx: ar+=1
                    except: pass
                RESULTS["end_state"] = {"inhouse_remaining":ih,"arrivals_remaining":ar,"toggle":s_final,"cal_radio":c_final}
                add("A7 CLEANUP","PASS" if ih==0 and ar==0 and s_final==False and c_final==True else "FAIL","NOTE",
                    json.dumps(RESULTS["end_state"]))
            except Exception as e:
                traceback.print_exc(); add("A7 CLEANUP","FAIL","MAJOR", str(e))

            add("A6 CONSOLE","PASS" if not RESULTS["console"] else "FAIL",
                "NOTE" if not RESULTS["console"] else "MAJOR",
                f"errors={len(RESULTS['console'])}: {RESULTS['console'][:5]}")
            await b.close()

    with open("/app/test_reports/session_a_resume.json","w") as f:
        json.dump(RESULTS, f, indent=2, default=str)
    print("=== DONE ===")
    print(json.dumps(RESULTS["per_row"], indent=2))

if __name__ == "__main__":
    asyncio.run(main())
