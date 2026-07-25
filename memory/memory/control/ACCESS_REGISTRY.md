# Layer 8 — Access & Credentials Registry

**Status:** POPULATED
**Last Updated:** 2026-05-29

---

## Test Accounts

| Account | Password | Restaurant ID | Features | Used For |
|---|---|---|---|---|
| owner@cafe103.com | Qplazm@10 | rid=644 | No rooms, postpaid, has GST | General testing |
| vishal@pav.com | Qplazm@10 | rid=383 | Prepaid, has ready_at | Prepaid flow testing |
| owner@palmhouse.com | Qplazm@10 | rid=541 | Rooms, mixed, has discount+round-off | Room + financial testing |
| owner@kunafamahal.com | Qplazm@10 | R689 | CRM 2.0 features | CRM 2.0 QA (cross-sell, customer intel) |

**Default test customer (R689):** Mobile `7505242126` — use this for all loyalty/coupon/wallet testing.
| owner@18march.com | Qplazm@10 | rid=478 | Delivery (deliveryAssign=No) | Delivery dispatch testing |
| owner@mantri.com | (ask owner) | (ask owner) | Room Orders Report | Room report testing (POS 2.0 era) |

---

## API Keys

| Key | Location | Purpose | Notes |
|---|---|---|---|
| Firebase API Key | `/app/frontend/.env` | Firebase services | `AIzaSyCvn7MctrSgULjgiHqQSl4QfeP3dWxITwY` |
| Firebase VAPID Key | `/app/frontend/.env` | Push notifications | See env file |
| Google Maps Key | Not currently set | Delivery address autocomplete | EP-04: real dependency for address form |
| CRM Token | From login response | CRM API auth | Extracted via `authTransform.js` → `crmAxios.js` (BUG-098) |

---

## Service Endpoints

| Service | URL | Notes |
|---|---|---|
| Main API | `https://preprod.mygenie.online/` | Laravel backend |
| Socket | `https://presocket.mygenie.online` | Socket.io |
| CRM | `https://crm.mygenie.online/api` | Configured via `REACT_APP_CRM_BASE_URL` on `2-jiune-v2` (previously varied per Emergent deploy on `30-may`) |
| Firebase | `mygenie-restaurant.firebaseapp.com` | Auth + notifications |
| Preview | `https://insights-phase.preview.emergentagent.com` | Current Emergent pod (was `dashboard-reports-4.preview.emergentagent.com` on `30-may`) |

---

## Credential Notes

- All test accounts use `Qplazm@10` except kunafamahal and mantri (ask owner for password)
- CRM token is per-session — extracted from login response, not stored in env
- Firebase keys are shared across all environments (preprod + production)
- Google Maps key is missing — delivery address autocomplete will not work without it
- Auth token stored in localStorage as `auth_token` — per-tab (sessionStorage not used)
