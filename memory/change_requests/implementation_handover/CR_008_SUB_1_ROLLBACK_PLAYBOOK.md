# CR-008 Sub-CR #1 — Rollback Playbook (D1-Cap + D1-Gate)

**Scope of this playbook:** all changes shipped during the 2026-05-03 session under CR-008 Sub-CR #1.
**Bucket coverage:** D1-Cap Round 1 + D1-Cap Round 2 + D1-Gate.
**Use this when:** preprod validation finds an issue and you want to roll back partially or fully.

---

## 1. What changed and where the backups live

### 1.1 Files modified across the 3 rounds

| File | Hotspot | D1-Cap R1 | D1-Cap R2 | D1-Gate | Backup file |
|---|---|---|---|---|---|
| `frontend/src/components/order-entry/OrderEntry.jsx` | YES | ✅ | — | ✅ (1-line prop pass) | `OrderEntry.jsx.bak.d1cap` |
| `frontend/src/api/transforms/orderTransform.js` | YES | ✅ | ✅ | — | `orderTransform.js.bak.d1cap` |
| `frontend/src/components/order-entry/CartPanel.jsx` | No | ✅ | — | — | (no backup; non-hotspot) |
| `frontend/src/components/order-entry/AddressFormModal.jsx` | No | ✅ | — | — | (no backup; non-hotspot) |
| `frontend/src/components/order-entry/CollectPaymentPanel.jsx` | YES | — | — | ✅ | `CollectPaymentPanel.jsx.bak.d1gate` |

**Backup baseline note:**
- `*.bak.d1cap` files = pre-D1-Cap state (clean baseline before any change in this session).
- `*.bak.d1gate` file = post-D1-Cap-Round-2 state (i.e. immediately before D1-Gate edits).

### 1.2 Why only hotspots have `.bak` backups
Per session policy (`IMPLEMENTATION_AGENT_RULES.md` §146), only hotspot files get pre-edit backups. Non-hotspots (`CartPanel`, `AddressFormModal`) revert via git or direct revert of the small additions described in the per-bucket handovers.

---

## 2. Rollback options — choose one

### Option A — Full revert (undo all 3 rounds back to pre-D1-Cap)

Use when: validation finds a fundamental problem with the entire delivery-charge feature and you want to ship preprod back to clean baseline.

```bash
# 1. Stop hot-reload from racing your changes
sudo supervisorctl stop frontend

# 2. Restore the two D1-Cap hotspot baselines
cp /app/frontend/src/components/order-entry/OrderEntry.jsx.bak.d1cap \
   /app/frontend/src/components/order-entry/OrderEntry.jsx

cp /app/frontend/src/api/transforms/orderTransform.js.bak.d1cap \
   /app/frontend/src/api/transforms/orderTransform.js

# 3. Revert the two non-hotspot changes via git
cd /app && git checkout HEAD -- \
  frontend/src/components/order-entry/CartPanel.jsx \
  frontend/src/components/order-entry/AddressFormModal.jsx

# 4. Restore CollectPaymentPanel from its D1-Gate backup
#    (this backup IS the post-D1-Cap state, but D1-Cap did not touch CollectPaymentPanel,
#     so it is also = pre-D1-Cap baseline for that file)
cp /app/frontend/src/components/order-entry/CollectPaymentPanel.jsx.bak.d1gate \
   /app/frontend/src/components/order-entry/CollectPaymentPanel.jsx

# 5. Restart frontend
sudo supervisorctl start frontend

# 6. Verify
sleep 8 && curl -s -o /dev/null -w "HTTP=%{http_code}\n" http://localhost:3000/
tail -n 8 /var/log/supervisor/frontend.out.log
```

**Expected after Option A:**
- Field at `delivery_charge: 0` hardcoded again in placeOrder/updateOrder.
- No editable cart row, no AddressFormModal field.
- BUG-019 readOnly rule (`initialDeliveryCharge > 0`) restored on Collect Bill.
- App boots; webpack only emits the unrelated `LoadingPage.jsx` warning.

---

### Option B — Revert only D1-Gate (keep D1-Cap)

Use when: the gate-flip causes confusion / regression but the capture+threading is fine.

```bash
sudo supervisorctl stop frontend

# Restore CollectPaymentPanel only
cp /app/frontend/src/components/order-entry/CollectPaymentPanel.jsx.bak.d1gate \
   /app/frontend/src/components/order-entry/CollectPaymentPanel.jsx

# Remove the 1-line prop pass in OrderEntry that targets D1-Gate
# Use git to revert just the isPrepaid prop addition:
cd /app && git diff HEAD -- frontend/src/components/order-entry/OrderEntry.jsx | head -30
# Manually inspect the diff. The block to remove is:
#   // CR-008 / Bucket D1-Gate (May-2026): isPrepaid drives the
#   ...
#   isPrepaid={isPrepaid}
# (immediately after `orderType={orderType}` inside <CollectPaymentPanel ... />)
# Simplest: re-edit OrderEntry to remove that block. Backup preserves the full file
# so you can compare via:
diff /app/frontend/src/components/order-entry/OrderEntry.jsx \
     /app/frontend/src/components/order-entry/OrderEntry.jsx.bak.d1cap

sudo supervisorctl start frontend
```

**Expected after Option B:**
- D1-Cap behaviour intact (cart row editable, charge persists, dashboard cards show correct totals).
- BUG-019 readOnly rule restored on Collect Bill — in-POS delivery orders revert to read-only when value > 0 (D1-Cap correction-gap re-appears, by design).

---

### Option C — Revert only D1-Cap Round 2 (keep R1 + D1-Gate)

Use when: dashboard tile totals are wrong in some specific edge case and you want to back out the `calcOrderTotals` extras pass without touching anything else.

```bash
# This is the smallest possible revert — 2 sites in orderTransform.js only.
# Use git to view the precise R2 hunk:
cd /app && git log --oneline -- frontend/src/api/transforms/orderTransform.js | head -5

# Identify the commit that introduced R2. The R2 change passes
# `{ deliveryCharge: orderType === 'delivery' ? ... : 0 }` as 3rd arg to
# calcOrderTotals at L666 (placeOrder) and L754 (updateOrder).
#
# Manual edit: open orderTransform.js and at both sites, remove the third arg
# entirely so the call reverts to:
#   calcOrderTotals(unplacedItems.map(buildCartItem), serviceChargePercentage)
#   calcOrderTotals(allBuilt, serviceChargePercentage)

sudo supervisorctl restart frontend
```

**Expected after Option C:**
- `delivery_charge` field still flows in payload as separate field.
- `order_amount` reverts to "items + tax (no delivery)" — dashboard tiles drop delivery again.
- Collect Bill grand total still correct (it recomputes client-side independently).

---

### Option D — Git-only full revert (alternative to Option A)

Use when: you prefer git over `cp`.

```bash
cd /app
# Find the commit hash immediately before your earliest D1-Cap commit:
git log --oneline -10
# Pick the commit IMMEDIATELY BEFORE the first D1-Cap auto-commit, then:
git checkout <pre-d1cap-hash> -- \
  frontend/src/components/order-entry/OrderEntry.jsx \
  frontend/src/api/transforms/orderTransform.js \
  frontend/src/components/order-entry/CartPanel.jsx \
  frontend/src/components/order-entry/AddressFormModal.jsx \
  frontend/src/components/order-entry/CollectPaymentPanel.jsx

sudo supervisorctl restart frontend
```

**Note:** Emergent's autocommit may have rolled multiple bucket changes into a single commit. Inspect with `git log -p -- <file>` first if unsure.

---

## 3. Verification after rollback

Run this checklist after any rollback option:

| # | Check | Pass criterion |
|---|---|---|
| 1 | `curl http://localhost:3000/` | HTTP 200 |
| 2 | `tail /var/log/supervisor/frontend.out.log` | "webpack compiled with 1 warning" (the LoadingPage one) — no new errors |
| 3 | Login page renders | Visible on preview URL |
| 4 | Login + open Order Entry on a delivery order | No JS crash; cart renders |
| 5 | DevTools Network — place a delivery order | Payload structure intact (matches expected post-rollback shape per the option chosen) |
| 6 | Collect Bill screen opens | No crash |

---

## 4. After rollback — communication

If any rollback is executed:
1. Note the failing scenario in `/app/memory/change_requests/qa_reports/D1_PREPROD_FAILURE_<DATE>.md` with screenshot + DevTools payload.
2. Open a focused fix bucket (`D1-CAP-R3` or `D1-GATE-R2`) for the next session — quote the failure document.
3. Do NOT re-run validation on the same code path until the fix bucket ships.

---

## 5. Backup file lifecycle

| Lifecycle stage | Action |
|---|---|
| Created | At start of each bucket's first edit |
| Retained | Until Owner explicitly verifies preprod is correct |
| Removed | After verbal "Approved — clean up" from Owner |

**Do NOT remove backups before Owner verification, even if validation appears to pass locally.** The same backup files cover both rollback and forensics if a delayed bug surfaces.

---

## 6. Quick reference — backup file paths

```
/app/frontend/src/components/order-entry/OrderEntry.jsx.bak.d1cap
/app/frontend/src/api/transforms/orderTransform.js.bak.d1cap
/app/frontend/src/components/order-entry/CollectPaymentPanel.jsx.bak.d1gate
```

```bash
# Verify all backups exist:
ls -la /app/frontend/src/components/order-entry/*.bak.* \
       /app/frontend/src/api/transforms/*.bak.*
```

---

## 7. Cross-references

- D1-Cap handover: `/app/memory/change_requests/implementation_handover/CR_BUCKET_D1_CAP_DELIVERY_CHARGE_CAPTURE_HANDOVER.md`
- D1-Cap Round 2 QA note: `/app/memory/change_requests/implementation_handover/CR_BUCKET_D1_CAP_ROUND2_QA_NOTE.md`
- D1-Gate handover: `/app/memory/change_requests/implementation_handover/CR_BUCKET_D1_GATE_OVERRIDE_RULE_HANDOVER.md`
- Detailed QA handover (sister doc): `/app/memory/change_requests/qa_handover/CR_008_SUB_1_QA_HANDOVER.md`
- Future GST work: `/app/memory/change_requests/CR_013_GST_CONFIG_CORRECTION.md`
