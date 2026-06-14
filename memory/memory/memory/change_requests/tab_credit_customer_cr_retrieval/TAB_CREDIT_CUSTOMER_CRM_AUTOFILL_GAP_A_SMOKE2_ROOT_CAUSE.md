# BUG-038 GAP-A Live Smoke Round 2 — Root Cause Analysis

> **Date:** 2026-05-15
> **Mode:** Diagnostic only — no code change, no commits.
> **Trigger:** Owner re-smoked after GAP-A patch was applied (auto-commit `50c8c1b`); screenshot shows Credit selected, `name="abhi"` (4 chars ≥ 2), `phone="7505"` (4 chars ≥ 3) — **both thresholds crossed**, Network panel still empty, no `customers?search=…` calls.

---

## 1. Bottom Line First

✅ **My GAP-A code is correct, present on disk, and bundled by the local dev server.** Verified by direct bundle inspection (D9, D11 below).

❌ **The owner's browser is NOT loading my code.** The URL the owner is testing serves a **completely different bundle** that does not contain the GAP-A fix (or, very likely, does not contain the entire BUG-038 implementation either).

**This is not a bug in the fix. This is a deployment/routing gap.** The frontend code in `/app` on this preview pod ≠ the frontend bundle being served at the URL the owner is testing against. Two separate deployments. No code edit will help — the deployment pipeline / preview-pod routing needs attention.

---

## 2. Hard Evidence (collected via curl + md5 in this session)

### 2.1 The fix IS on disk in this preview pod

```bash
$ grep -n "tabIsCustomerSelected" frontend/src/components/order-entry/CollectPaymentPanel.jsx
351:  const [tabIsCustomerSelected, setTabIsCustomerSelected] = useState(false);   ✅ GAP-A applied
370:    if (tabIsCustomerSelected) { ...                                            ✅ Phone-search guard
384:  }, [tabPhone, tabIsCustomerSelected, isTabPayment]);                          ✅ Dep array
388:    if (tabIsCustomerSelected) { ...                                            ✅ Name-search guard
402:  }, [tabName, tabIsCustomerSelected, isTabPayment]);                           ✅ Dep array
438:    if (!newName.trim() && tabIsCustomerSelected) { ... reset                   ✅ Blank-out reset
447:    if (!newPhone.trim() && tabIsCustomerSelected) { ... reset                  ✅ Symmetric reset
```

File mtime: `2026-05-15 10:56:11 UTC` — recent. Code is correct.

### 2.2 The local dev server IS bundling the fix

```bash
$ curl -s http://localhost:3000/static/js/bundle.js | grep -c "GAP-A\|tabIsCustomerSelected"
7    # GAP-A marker comment + 6 references to the state variable
```

So `yarn start` (the CRACO dev server, supervisor-managed on `0.0.0.0:3000`) has correctly recompiled and is serving a 7.5 MB bundle.js that contains my fix. The dev server side of the world is healthy.

### 2.3 The external URL serves a **completely different** bundle

```bash
$ LOCAL_HASH=$(curl -s http://localhost:3000/static/js/bundle.js | md5sum | awk '{print $1}')
$ EXT_HASH=$(curl -s https://insights-phase.preview.emergentagent.com/static/js/bundle.js | md5sum | awk '{print $1}')

$ echo "$LOCAL_HASH  $EXT_HASH"
cf6447ee838dbe2c07830495d32c059a   a1666ba75043222628cfd3f31983f5b1
❌ DIFFERENT
```

```
localhost  bundle.js: 7,508,694 bytes
external   bundle.js: 1,357 bytes     ← NOT a real bundle
```

The external bundle is **1,357 bytes**. That's not a bundle at all — it's a stub HTML page:

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <title>Loading...</title>
    ...
</head>
<body>
    <iframe id="contentFrame"
            src="https://app.emergent.sh/loading-preview?host=restaurant-pos-v2-1.preview.emergentagent.com"
            allowfullscreen></iframe>
    <script>
        window.addEventListener('message', function(event) { ... });
    </script>
</body>
</html>
```

The external preview-pod URL is **stubbed to a "Loading…" iframe** that points at `app.emergent.sh/loading-preview`. **Every static asset is being served this same stub**, regardless of path. That's why the owner sees the "Frontend Preview Only. Please wake servers to enable backend functionality" overlay — the actual React app never executes on the external URL.

### 2.4 GAP-A marker is absent from the external bundle

```bash
$ curl -s https://insights-phase.preview.emergentagent.com/static/js/bundle.js | grep -c "GAP-A\|tabIsCustomerSelected"
0    ← ZERO. The fix is literally not in what the browser downloads.
```

---

## 3. Where Is The Owner Actually Testing?

The owner's screenshot 3 (₹52 order, "abhi" + "7505") **cannot** have been taken from the external preview-pod URL — because that URL serves a stub iframe, not the real app. The screenshots show the real Mygenie POS app working.

Therefore the owner is testing against one of the following:

| Possibility | Description | My fix loaded there? |
|---|---|---|
| **(A)** Owner's local dev server | Running `yarn start` on their own machine, against their own /app | ❌ No — different codebase, different working tree |
| **(B)** Mygenie preprod deployment | A deployed build of the frontend, hosted on a Mygenie-controlled domain (e.g. `https://preprod.mygenie.online` — note this is the `REACT_APP_API_BASE_URL` from `frontend/.env`, but the FRONTEND might also be deployed at the same or similar domain) | ❌ No — independent deployment; needs explicit redeploy with this CR's code |
| **(C)** A different Emergent preview pod | Some other preview job with its own /app tree | ❌ No |
| **(D)** Browser cache from an earlier session | Old JS still cached even after a refresh | ❌ No — without hard refresh / cache clear |

**My code is in /app on THIS preview pod. None of (A)–(D) automatically pick that up.**

The previous round-1 owner smoke (screenshots 1+2 showing CartPanel 401s) was presumably taken from the same environment the owner is using now — which means **even the original BUG-038 implementation (the wire-up, the typeahead, the suggestion overlay) may not have been deployed there yet**. The owner has been testing against an upstream/older bundle the whole time.

This is consistent with what the empty Network panel shows in screenshot 3: with `name="abhi"` (4 ≥ 2) and `phone="7505"` (4 ≥ 3) both above thresholds and an unconditional `useState(false)` seed, the **only way zero calls can fire** is if the code is not running. Confirmed.

---

## 4. Why This Wasn't Caught Earlier

### 4.1 Round-1 implementation smoke (BUG-038)

After I applied the BUG-038 implementation, I:
- Ran ESLint — ✅ clean
- Ran a Playwright load test against the external URL — ✅ saw the login page render (which is actually served from the Emergent stub iframe's child page, hence why it "worked")
- Static-grepped the source file — ✅ confirmed all 5 hunks present

But I did **not** verify that the **served bundle** at the URL owner uses contains my changes. I assumed the preview-pod URL would auto-proxy to localhost:3000. It doesn't — it serves a stub.

### 4.2 Round-2 GAP-A smoke

Same blind spot — I verified disk + lint + grep, marked it "static PASS", and asked owner for runtime smoke. The static guarantees are correct **for the code I wrote**. The code is just not being executed where the owner is testing.

---

## 5. Resolution Paths (Owner-Side Action Required — None Are Code Changes)

You have three options, in order of effort:

### 5.1 Option A — Owner pushes /app to the deployment branch & redeploys

If the Mygenie preprod frontend is deployed from this repo, you need to:

1. Commit + push the GAP-A fix (auto-commit `50c8c1b`) to your deployment branch.
2. Trigger the preprod frontend rebuild/redeploy.
3. After redeploy completes, hard-refresh (Cmd+Shift+R / Ctrl+Shift+R) in the browser to bypass cache.
4. Confirm at DevTools → Sources tab → search `CollectPaymentPanel.jsx` → line 351 reads `useState(false)`. If it does, re-smoke.

This is the right answer if owner's actual test URL is a Mygenie-controlled deployment.

### 5.2 Option B — Owner wakes the Emergent preview pod and tests against it

If the goal is to test my code without a full preprod redeploy:

1. In the browser, click the **"Wake up servers"** button on the "Frontend Preview Only" overlay at `https://insights-phase.preview.emergentagent.com`.
2. Wait for the preview pod's external routing to switch from the stub iframe to the real app (this usually takes 30–60 seconds and is controlled by Emergent's preview infra).
3. After that, the external URL will start serving the dev-server bundle from `localhost:3000` (which contains my fix).
4. Run the smoke per the QA report §5.

Caveat: the preview pod's backend is also stubbed today; auth + Mygenie preprod / CRM calls may or may not reach the real backend depending on how the preview routing is configured. Worth a try if option A is heavyweight.

### 5.3 Option C — Owner clones /app's CollectPaymentPanel.jsx into their own working frontend

If the owner has a separate FE workspace with their own git origin, they can take the 9-line GAP-A diff (the `useState(!!customer?.id)` → `useState(false)` change plus the 8-line comment) and apply it directly to their tree, then build & deploy. That avoids any preview-pod routing question. Same one-line business-logic change.

---

## 6. What This Means For BUG-038 / GAP-A Closure

The fix itself is structurally correct and verified at multiple layers:
- ✅ Source file on disk (`useState(false)` at line 351)
- ✅ ESLint clean
- ✅ Bundled by local dev server (GAP-A marker present in bundle.js served on localhost:3000)
- ✅ Payload byte-identical to pre-BUG-038 baseline
- ✅ No `customer_id` / `tabCustomerId` writes
- ✅ Single-file footprint (only `CollectPaymentPanel.jsx`)

**The remaining work is operational, not code.** Owner needs to make sure the bundle being executed in their browser is the one I built. Until then, no amount of code review or fix-on-fix will help — the code change isn't reaching the runtime.

---

## 7. What's NOT Going Wrong (Ruled Out)

To save time on dead-end investigations:

| Hypothesis | Status |
|---|---|
| GAP-A patch syntax error / didn't compile | ❌ Ruled out — bundle.js compiled successfully, marker present |
| `tabIsCustomerSelected` somehow still seeded `true` | ❌ Ruled out — confirmed `useState(false)` in the served localhost bundle |
| `isTabPayment` is false when Credit is highlighted | ❌ Ruled out — JSX block for Credit Customer Details renders, which itself requires `isTabPayment && !showSplit`. If `isTabPayment` were false, the entire block (including the inputs the owner is typing into) would not render |
| `searchCustomers` import path broken | ❌ Ruled out — bundle.js loads the import via `customerService.js`, which CartPanel uses identically and successfully (per round-1 screenshot 2's CartPanel firing CRM calls) |
| CRM threshold logic wrong (≥3 / ≥2) | ❌ Ruled out — code is byte-identical to CartPanel's working pattern |
| CRACO dev-server not picking up the file change | ❌ Ruled out — localhost bundle contains the GAP-A marker comment + `useState(false)` |
| Browser-cache holding the old bundle | ⚠ Possible contributing factor on top of the deployment gap, but not the primary cause — the primary cause is that the URL serves a stub at the gateway level, not stale cache |
| GAP-B (CRM 401) interfering with my fix | ❌ Ruled out for this symptom — if my code were running, requests would AT LEAST fire (and 401). They don't fire at all → code isn't running |

---

## 8. Recommended Immediate Action

1. **Confirm what URL you (owner) are testing against.** Paste the URL in your reply. That tells us which environment needs the redeploy.
2. **If the URL is a Mygenie-controlled deployment (e.g. preprod.mygenie.online or similar):**
   - Pull from this `/app` working tree (or get me to push to a specific branch) → rebuild → redeploy that frontend.
   - Hard-refresh after deploy.
3. **If the URL is the Emergent preview pod (`https://insights-phase.preview.emergentagent.com`):**
   - Click "Wake up servers" on the overlay. Wait 30–60 s. Try again.
4. **In DevTools → Sources tab** after the re-smoke: search for `CollectPaymentPanel.jsx`, scroll to line 351. If it shows `useState(false)` → my fix is loaded. If it shows `useState(!!customer?.id)` → the old bundle is still being served and the deployment pipeline needs another push.

---

## 9. Compliance — No Code Updates In This Session

| Rule | Status |
|---|---|
| No code change | ✅ — only filesystem + curl reads + md5 + grep |
| No commits | ✅ |
| No backend change | ✅ |
| No `customer_id` introduced | ✅ — diagnostic only |
| `orderTransform.js` untouched | ✅ |
| `customerService.js` untouched | ✅ |
| `CartPanel.jsx` untouched | ✅ |
| `/app/memory/final/*` untouched | ✅ |
| Owner directive "no code update, do proper analysis" honoured | ✅ |

---

— End of BUG-038 GAP-A Live Smoke Round 2 — Root Cause Analysis —
