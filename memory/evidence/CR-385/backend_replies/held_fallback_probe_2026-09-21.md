# CR-385 · `held_fallback` live test scenario (BQ-385-21) · 2026-09-21 · RID 69

**Host:** `https://preprod.mygenie.online` · hotel `sandbox-pms`

## What it is (plain English)

In **calendar** extend mode, each **added** night is priced from the CM rate table. If that night has **no usable rate** (missing or `≤ 0`), the server does **not** fail — it uses the guest’s checked-in (held) rate and tags the night `source: "held_fallback"`. FE chip: grey **“held (no rate for this date)”**.

Money still comes from the server; the chip is a label only.

## How we force a miss without keeping sandbox broken

1. Save the real rate for **one** night (the night that will be **added** by extend).
2. `push-rates` that night to **`rate: 0`** (lookup treats `≤ 0` as no rate).
3. Check in a 1-night stay that **ends** on that wiped night’s date, then extend **+1** so the added night is the wiped date.
4. Read `data.charge.nights_detail` → expect `held_fallback` at the held unit rate.
5. **Always restore** the original rate (even if extend fails).

**Live accept (ran 2026-09-21):** wipe `2026-11-15` suite-s-ep `31500 → 0` → extend → night `2026-11-15` **`held_fallback` @ 36800** (check-in held) → restored `31500`.

---

## Curl pack

```bash
HOST="https://preprod.mygenie.online"
TOKEN="<Bearer>"
AUTH=(-H "Authorization: Bearer $TOKEN" -H "Accept: application/json" -H "X-localization: en")
CIN=2026-11-14; COUT=2026-11-15; COUT2=2026-11-16
WIPE=2026-11-15          # added night only
ROOM=8525                # free suite
PHONE=98790$(date +%H%M%S | cut -c1-5)

# 0) Save original wipe-night rate
curl -sS -X POST "$HOST/api/v2/vendoremployee/aiosell/fetch-rates" \
  "${AUTH[@]}" -H "Content-Type: application/json" \
  -d "{\"start_date\":\"$WIPE\",\"end_date\":\"$COUT2\"}" -o /tmp/hf_rates_before.json
# Note suite-s-ep rate for $WIPE (was 31500 on probe day) → ORIG=

# 1) Wipe (temporary)
curl -sS -X POST "$HOST/api/v2/vendoremployee/aiosell/push-rates" \
  "${AUTH[@]}" -H "Content-Type: application/json" \
  -d "{\"start_date\":\"$WIPE\",\"end_date\":\"$WIPE\",\"rates\":[{\"room_code\":\"suite\",\"rateplan_code\":\"suite-s-ep\",\"rate\":0}]}"

# 2) Settings + Direct + check-in (1 night ending on WIPE)
curl -sS -X POST "$HOST/api/v2/vendoremployee/restaurant-settings/update-settings" \
  "${AUTH[@]}" -F 'data={"basic":{"allow_early_checkin":true,"extend_rate_mode":"calendar"}}' >/dev/null

curl -sS -X POST "$HOST/api/v2/vendoremployee/aiosell/direct-reservation" \
  "${AUTH[@]}" -H "Content-Type: application/json" \
  -d "{\"guest\":{\"name\":\"HF Guest\",\"phone\":\"$PHONE\"},\"checkin\":\"$CIN\",\"checkout\":\"$COUT\",\"adults\":2,\"children\":0,\"rooms\":[{\"room_code\":\"suite\",\"rateplan_code\":\"suite-s-ep\",\"rooms_count\":1}],\"advance\":{\"amount\":500,\"method\":\"upi\",\"reference\":\"HF\"}}" \
  -o /tmp/hf_direct.json

RES=$(python3 -c 'import json; print(json.load(open("/tmp/hf_direct.json"))["data"]["reservation"]["id"])')
BID=$(python3 -c 'import json; print(json.load(open("/tmp/hf_direct.json"))["data"]["reservation"]["booking_id"])')

curl -sS -X POST "$HOST/api/v1/vendoremployee/pos/user-group-check-in" \
  "${AUTH[@]}" \
  -F "phone=$PHONE" -F "name=HF Guest" -F "email=" \
  -F "booking_type=Direct" -F "booking_for=Individual" -F "booking_details=" \
  -F "booking_id=$BID" -F "aiosell_reservation_id=$RES" \
  -F "id_type=Aadhaar" -F "room_id[]=$ROOM" \
  -F "checkin_date=$CIN" -F "checkout_date=$COUT" \
  -F "order_amount=0" -F "room_price=0" -F "advance_payment=0" -F "balance_payment=0" -F "gst_tax=0" \
  -F "total_adult=2" -F "total_children=0" -F "payment_method=Cash" \
  -F "name2=" -F "id_type2=" -F "name3=" -F "id_type3=" -F "name4=" -F "id_type4=" \
  -F "firm_name=" -F "firm_gst=" \
  -o /tmp/hf_ci.json

ORDER=$(python3 -c 'import json; print(json.load(open("/tmp/hf_ci.json"))["data"]["order_id"])')
HELD=$(python3 -c 'import json; print(json.load(open("/tmp/hf_ci.json"))["data"]["charge"]["rate_per_night"])')

# 3) Extend into wiped night
curl -sS -X POST "$HOST/api/v2/vendoremployee/pos/room-extend-stay" \
  "${AUTH[@]}" -H "Content-Type: application/json" \
  -d "{\"order_id\":$ORDER,\"new_checkout_date\":\"$COUT2\",\"reason\":\"held_fallback probe\"}" \
  -o /tmp/hf_ext.json

python3 -c 'import json; c=json.load(open("/tmp/hf_ext.json"))["data"]["charge"]; print({k:c.get(k) for k in ("nights","rate_per_night","booking_charge")}); print(c.get("nights_detail"))'
# Expect: nights_detail[1].date=$WIPE · source=held_fallback · rate=$HELD

# 4) RESTORE (mandatory) — use ORIG from step 0
curl -sS -X POST "$HOST/api/v2/vendoremployee/aiosell/push-rates" \
  "${AUTH[@]}" -H "Content-Type: application/json" \
  -d "{\"start_date\":\"$WIPE\",\"end_date\":\"$WIPE\",\"rates\":[{\"room_code\":\"suite\",\"rateplan_code\":\"suite-s-ep\",\"rate\":31500}]}"

# 5) TAB + restore settings (omit full TAB body — same as other packs)
```

**Expect (probed):**

| Night | source | rate |
|-------|--------|------|
| 2026-11-14 | `held` | 36800 |
| 2026-11-15 | **`held_fallback`** | **36800** (= check-in held; not calendar 31500) |

`booking_charge` **73600** = 36800 × 2.

---

## FE ask

1. Chip on `source === "held_fallback"`: e.g. “held (no rate for this date)”.
2. Do **not** treat fallback as a money error — totals stay in `charge.*`.
3. For demos: use this wipe→extend→**restore** pack; leave restored rates on the sandbox.

## Ops note

Wiping is temporary and must be restored in the same session. Prefer a **future** night (as above) so current week calendar demos stay intact.

---

## FE open stay (no wipe) · 2026-09-21

Left **in-house** for Front Desk UI (no TAB, no rate wipe). Not a `held_fallback` sample — nights are `held` + `calendar` only.

| Field | Value |
|-------|--------|
| Guest | **FE Demo Guest** |
| Phone | `9876511203` |
| Room | **8525 / r4** (suite-s-ep) |
| Order | **1232647** |
| Reservation | **220** |
| Booking | `MG-69-0EA429C8-63B3-4532-AA02-A95841888B97` |
| Stay | check-in **2026-10-22** → checkout **2026-10-24** (extended from 23) |
| Settings left on | `allow_early_checkin=true`, `extend_rate_mode=calendar` |

**`nights_detail` expect:**

| Night | source | rate |
|-------|--------|------|
| 2026-10-22 | `held` | 31500 |
| 2026-10-23 | `calendar` | 36800 |

Money (extend): `booking_charge 68300` · `total_with_gst 80594` · `advance_payment 500` · `balance_due 80094`.

**Cleanup when FE done:** TAB order `1232647`; restore settings (`allow_early_checkin=false` if desired).
