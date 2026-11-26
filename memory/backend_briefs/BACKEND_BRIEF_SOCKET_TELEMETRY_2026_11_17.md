# BACKEND_BRIEF_SOCKET_TELEMETRY_2026_11_17

**From:** Frontend (Abhishek / Emergent Agent)
**To:** Gyan (Backend)
**Date:** 2026-11-17
**Classification:** NEW_FEATURE — Observability / Telemetry
**Related:** BUG-677 (Socket Disconnection in PWA)
**Priority:** P1
**Risk:** LOW (write-only endpoint, no business logic, no existing flows affected)

---

## 1. Summary

**What:** A single backend API endpoint that accepts socket health telemetry events from the POS frontend and stores them in a new DB table. This gives us per-restaurant, per-device, per-event-type visibility into socket disconnections — especially in PWA.

**Why:** BUG-677 investigation confirmed that PWA socket disconnections affect ALL restaurants silently. We currently have ZERO data on:
- Which restaurants are most affected
- How frequently sockets die per restaurant per day
- Whether the problem is iOS-only, Android-only, or both
- Whether our fixes (BUG-677 F1–F6) actually reduce incidents after deployment
- How many aggregator orders (Swiggy/Zomato) are being silently missed

**Frontend impact:** We will instrument 7 telemetry hooks into the BUG-677 socket fixes. Each hook calls this endpoint. Without this endpoint, the telemetry calls will silently no-op (fire-and-forget), so there is no frontend blocker — but we lose all observability.

**Scope:** 1 new API endpoint + 1 new DB table + 1 migration. No changes to any existing endpoint, table, or business logic.

---

## 2. API Contract

### Endpoint

```
POST /api/v1/socket-telemetry/log
```

### Authentication

```
Authorization: Bearer {vendor_employee_auth_token}
```

Standard vendor employee auth token (same as all other POS API calls). If the token is expired or missing, return `401`. Frontend will silently drop the telemetry — this is acceptable (telemetry should never force a re-login).

### Request Headers

```
Content-Type: application/json
```

### Request Body

```json
{
  "events": [
    {
      "restaurant_id": 672,
      "event_type": "server_disconnect",
      "event_timestamp": "2026-11-17T14:32:05.123Z",
      "session_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",

      "device_context": {
        "is_pwa": true,
        "user_agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
        "platform": "iOS",
        "network_type": "wifi",
        "network_downlink": 12.5
      },

      "socket_context": {
        "connection_uptime_ms": 342000,
        "reconnect_attempts_used": 10,
        "socket_status_before": "RECONNECTING",
        "socket_status_after": "ERROR",
        "transport": "websocket"
      },

      "metadata": {
        "disconnect_reason": "io server disconnect",
        "background_duration_ms": 95000
      }
    }
  ]
}
```

### Field Definitions

#### Top-level

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `events` | Array | YES | Array of 1–20 event objects. Frontend buffers and sends in batches. |

#### Per event object

| Field | Type | Required | Validation | Description |
|-------|------|----------|------------|-------------|
| `restaurant_id` | Integer | YES | Must be valid RID | The restaurant where the socket event occurred |
| `event_type` | String | YES | One of 7 allowed values (see §3) | Type of socket health event |
| `event_timestamp` | ISO 8601 String | YES | Valid datetime, not future | When the event occurred on the client (frontend clock) |
| `session_id` | UUID v4 String | YES | 36-char UUID format | Unique per page load. Groups all events from one browser session. |

#### `device_context` object

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `is_pwa` | Boolean | YES | `true` if running as installed PWA (standalone display mode), `false` if regular browser tab |
| `user_agent` | String | NO | Full browser User-Agent string. For device/OS/browser identification. |
| `platform` | String | NO | Derived by frontend: `"iOS"`, `"Android"`, `"Desktop"`, `"Unknown"` |
| `network_type` | String | NO | From `navigator.connection.effectiveType`: `"4g"`, `"3g"`, `"2g"`, `"slow-2g"`, `"wifi"`, `"unknown"` |
| `network_downlink` | Float | NO | From `navigator.connection.downlink` — estimated bandwidth in Mbps. Null if unavailable. |

#### `socket_context` object

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `connection_uptime_ms` | Integer | NO | Milliseconds since last successful socket connection. How long was the socket alive before this event? |
| `reconnect_attempts_used` | Integer | NO | Number of reconnection attempts consumed before this event (0–10, or higher if Infinity is set) |
| `socket_status_before` | String | NO | Socket status immediately before this event: `"CONNECTED"`, `"DISCONNECTED"`, `"RECONNECTING"`, `"ERROR"` |
| `socket_status_after` | String | NO | Socket status immediately after this event |
| `transport` | String | NO | Socket.IO transport: `"websocket"` or `"polling"` |

#### `metadata` object

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| (varies) | JSON object | NO | Event-specific extra data. See §3 for per-event metadata fields. Store as JSON column. |

### Success Response

```
HTTP 200 OK
Content-Type: application/json

{
  "received": 2,
  "status": "ok"
}
```

`received` = number of events successfully stored.

### Error Responses

| Status | When | Body |
|--------|------|------|
| `401` | Token expired/missing | Standard auth error |
| `422` | Validation failure (missing required field, invalid event_type) | `{ "error": "validation_failed", "details": [...] }` |
| `429` | Rate limit exceeded (optional, see §6) | `{ "error": "rate_limited", "retry_after_seconds": 60 }` |
| `500` | Server error | Standard error — frontend will silently drop |

### Important Behavior Notes

1. **Partial success:** If batch has 5 events and 1 fails validation, store the 4 valid ones and return `{ "received": 4, "errors": [{ "index": 2, "reason": "invalid event_type" }] }`. Do NOT reject the entire batch.
2. **Idempotency:** No deduplication needed. If the same event is sent twice (network retry), store both. The `session_id` + `event_timestamp` combination can be used for dedup in queries later if needed.
3. **Fire-and-forget from FE:** Frontend does NOT retry on failure. If this endpoint is down, telemetry is silently lost. This is by design — telemetry must never impact POS functionality.

---

## 3. Event Types — Complete Reference

### 7 Allowed `event_type` Values

```
reconnect_budget_exhausted
server_disconnect
visibility_recovery_attempt
visibility_recovery_result
heartbeat_recovery
room_join_timeout
aggregator_reconciliation_found
```

### Per-Event Detail

---

#### E1: `reconnect_budget_exhausted`

**When it fires:** Socket.IO's built-in reconnection cycle exhausted all allowed attempts (currently 10, will become Infinity after BUG-677 F1). The `reconnect_failed` event fires and socket enters permanent ERROR state.

**What it means:** This restaurant's POS is now DEAD for real-time — no orders, no table updates, no aggregator events until force refresh.

**Severity:** CRITICAL — this is the worst event. Every occurrence = missed orders.

**Expected `metadata`:**
```json
{
  "max_attempts_configured": 10,
  "backoff_schedule_ms": [1000, 2000, 4000, 8000, 16000, 30000, 30000, 30000, 30000, 30000],
  "total_reconnect_duration_ms": 181000
}
```

**Expected frequency after BUG-677 fix:** Should drop to near-zero (F1 sets attempts to Infinity). If still occurring = new issue.

---

#### E2: `server_disconnect`

**When it fires:** The Socket.IO server disconnected the client. Disconnect reason = `"io server disconnect"` or `"transport close"`. This happens when the server's ping timeout (85s) expires because the PWA was backgrounded and couldn't respond.

**What it means:** The app was in background long enough for the server to give up. Socket.IO will NOT auto-reconnect (by design). Recovery depends on visibility/heartbeat handlers.

**Severity:** HIGH — expected in PWA, but each occurrence is a window where orders can be missed.

**Expected `metadata`:**
```json
{
  "disconnect_reason": "io server disconnect",
  "background_duration_ms": 95000,
  "last_pong_age_ms": 87000
}
```

**Key analysis queries:**
- `background_duration_ms` distribution → how long are staff leaving the app in background?
- Correlation with `platform` → iOS (30s kill) vs Android (5min kill)

---

#### E3: `visibility_recovery_attempt`

**When it fires:** The `visibilitychange` event detected the page becoming visible again, and the frontend is attempting to reconnect the socket.

**What it means:** User returned to the app. This is the START of recovery. Pair with E4 to see if recovery succeeded.

**Severity:** INFO — expected behavior, not a failure.

**Expected `metadata`:**
```json
{
  "time_in_background_ms": 120000,
  "socket_was_connected": false,
  "network_online": true
}
```

---

#### E4: `visibility_recovery_result`

**When it fires:** After the visibility recovery attempt (E3), this logs whether the reconnection succeeded or failed, and how long it took.

**What it means:** `success: true` = socket recovered, staff can continue. `success: false` = socket still dead, may need heartbeat (E5) or force refresh.

**Severity:** HIGH when `success: false` — means the primary recovery path failed.

**Expected `metadata`:**
```json
{
  "success": true,
  "time_to_recover_ms": 2300,
  "error": null,
  "fallback_needed": false
}
```
Or on failure:
```json
{
  "success": false,
  "time_to_recover_ms": null,
  "error": "connect_timeout",
  "fallback_needed": true
}
```

**Key analysis:** `success` rate by `platform` → are iOS recoveries worse than Android?

---

#### E5: `heartbeat_recovery`

**When it fires:** The 30-second heartbeat health check (BUG-677 F2) detected the socket was stuck in ERROR state while the page was visible, and forced a disconnect + reconnect cycle.

**What it means:** The primary recovery (visibility handler) FAILED, but the heartbeat safety net caught it. Without this heartbeat, the socket would have stayed dead.

**Severity:** MEDIUM — it's a save, but indicates the primary path failed.

**Expected `metadata`:**
```json
{
  "error_state_duration_ms": 45000,
  "recovery_successful": true,
  "heartbeat_cycle_number": 3
}
```

**Key analysis:** High E5 count per RID = that restaurant's network is unreliable. If E5 fires frequently after BUG-677 deploy = good (safety net working). If E5 never fires = great (primary recovery working).

---

#### E6: `room_join_timeout`

**When it fires:** After emitting `join_restaurant`, the frontend waited 5 seconds for the `joined_restaurant` ACK from the server. No ACK received. Frontend will retry once, then force reconnect.

**What it means:** Socket is "connected" but NOT receiving any restaurant events. This is the SILENT FAILURE — staff sees a connected app with stale data.

**Severity:** CRITICAL — invisible to staff, causes missed orders with no indication.

**Expected `metadata`:**
```json
{
  "attempt_number": 1,
  "ack_received": false,
  "time_waited_ms": 5000,
  "action_taken": "re_emit",
  "restaurant_id_sent": 672
}
```
Or on second timeout:
```json
{
  "attempt_number": 2,
  "ack_received": false,
  "time_waited_ms": 5000,
  "action_taken": "force_reconnect",
  "restaurant_id_sent": 672
}
```

**Key analysis:** If E6 count is high for a specific RID → possible server-side room management issue for that restaurant.

---

#### E7: `aggregator_reconciliation_found`

**When it fires:** The polling reconciliation cycle (every 60s) fetched aggregator orders from the API and found orders that were NOT already in the frontend's order context — meaning the socket had missed them.

**What it means:** Swiggy/Zomato orders were silently missed by the socket. The polling safety net caught them. Without this safety net (pre-BUG-677), these orders would have been invisible.

**Severity:** HIGH — each occurrence = aggregator orders that would have been missed without the fix.

**Expected `metadata`:**
```json
{
  "orders_found_count": 3,
  "order_ids": ["agg_12345", "agg_12346", "agg_12347"],
  "order_sources": ["swiggy", "swiggy", "zomato"],
  "socket_status_at_discovery": "ERROR",
  "time_since_last_socket_event_ms": 180000
}
```

**Key analysis:** This directly measures "orders saved by the fix." Sum of `orders_found_count` per week = aggregator orders that would have been lost without BUG-677 F4.

---

## 4. Database Schema

### Migration: `create_socket_telemetry_logs_table`

```sql
CREATE TABLE socket_telemetry_logs (
    id                      BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    restaurant_id           INT UNSIGNED NOT NULL,
    event_type              VARCHAR(50) NOT NULL,
    event_timestamp         TIMESTAMP(3) NOT NULL COMMENT 'Client-side timestamp with milliseconds',
    session_id              CHAR(36) NOT NULL COMMENT 'UUID v4, unique per page load',

    -- Device context (denormalized for fast queries)
    is_pwa                  BOOLEAN NOT NULL DEFAULT FALSE,
    user_agent              TEXT NULL,
    platform                VARCHAR(20) NULL COMMENT 'iOS / Android / Desktop / Unknown',
    network_type            VARCHAR(20) NULL COMMENT '4g / 3g / 2g / wifi / unknown',
    network_downlink        DECIMAL(6,2) NULL COMMENT 'Mbps',

    -- Socket context (denormalized for fast queries)
    connection_uptime_ms    INT UNSIGNED NULL COMMENT 'How long socket was alive before this event',
    reconnect_attempts_used SMALLINT UNSIGNED NULL,
    socket_status_before    VARCHAR(20) NULL,
    socket_status_after     VARCHAR(20) NULL,
    transport               VARCHAR(20) NULL COMMENT 'websocket / polling',

    -- Flexible per-event data
    metadata                JSON NULL,

    -- Server timestamps
    created_at              TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- Indexes for the 5 primary query patterns
    INDEX idx_rid_event_time (restaurant_id, event_type, event_timestamp),
    INDEX idx_event_type_time (event_type, event_timestamp),
    INDEX idx_session (session_id),
    INDEX idx_pwa_platform (is_pwa, platform, event_timestamp),
    INDEX idx_created (created_at)

) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Socket health telemetry from POS frontend (BUG-677 observability)';
```

### Why These Indexes

| Index | Serves Query Pattern |
|-------|---------------------|
| `idx_rid_event_time` | "Show me all disconnects for restaurant 672 this week" — the #1 query |
| `idx_event_type_time` | "How many budget_exhausted events across ALL restaurants today?" — global health |
| `idx_session` | "Show me the full timeline of events in this one browser session" — debugging a specific incident |
| `idx_pwa_platform` | "PWA vs Browser breakdown" and "iOS vs Android" — platform analysis |
| `idx_created` | Cleanup/archival queries, TTL enforcement |

### Storage Estimate

| Scenario | Events/day | Row size | Daily storage |
|----------|-----------|----------|---------------|
| 100 restaurants, stable | ~500 | ~500 bytes | ~250 KB |
| 100 restaurants, bad day | ~5,000 | ~500 bytes | ~2.5 MB |
| 500 restaurants, peak | ~25,000 | ~500 bytes | ~12.5 MB |

**Monthly worst case:** ~375 MB. Recommend TTL of 90 days (see §6).

---

## 5. Validation Rules

### `event_type` — whitelist only

```php
$allowedEventTypes = [
    'reconnect_budget_exhausted',
    'server_disconnect',
    'visibility_recovery_attempt',
    'visibility_recovery_result',
    'heartbeat_recovery',
    'room_join_timeout',
    'aggregator_reconciliation_found',
];
```

### `events` array

- Min: 1 event
- Max: 20 events per request
- If >20: reject with 422

### `restaurant_id`

- Must be integer > 0
- Optionally: validate that the RID exists in restaurants table (but NOT mandatory — telemetry should not fail because of a lookup miss)

### `session_id`

- Must be valid UUID v4 format (36 chars with hyphens)

### `event_timestamp`

- Must be valid ISO 8601
- Must not be more than 24 hours in the future (clock skew tolerance)
- Must not be more than 7 days in the past (stale event tolerance)

### `metadata`

- Accept any valid JSON object
- Max size: 10 KB per event (reject if larger)
- Do NOT validate internal structure — frontend may add new fields over time

---

## 6. Optional Enhancements (Not Blocking — Implement If Time Permits)

### A. Rate Limiting

Recommend per-restaurant rate limit to prevent a buggy client from flooding:
- **100 events per restaurant per minute** (generous — normal is ~5/min)
- If exceeded: return `429` with `retry_after_seconds: 60`
- Frontend handles: silently drops telemetry until next flush cycle

### B. TTL / Auto-cleanup

```sql
-- Run daily via scheduler
DELETE FROM socket_telemetry_logs 
WHERE created_at < NOW() - INTERVAL 90 DAY;
```

90 days retention is sufficient for trend analysis. Older data can be archived to cold storage if needed.

### C. Summary Materialized View (For Dashboard)

If you want a quick daily dashboard without querying the raw table:

```sql
CREATE TABLE socket_telemetry_daily_summary (
    id              BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    summary_date    DATE NOT NULL,
    restaurant_id   INT UNSIGNED NOT NULL,
    event_type      VARCHAR(50) NOT NULL,
    is_pwa          BOOLEAN NOT NULL,
    platform        VARCHAR(20) NULL,
    event_count     INT UNSIGNED NOT NULL DEFAULT 0,
    
    UNIQUE INDEX idx_unique_combo (summary_date, restaurant_id, event_type, is_pwa, platform),
    INDEX idx_date (summary_date)
);
```

Populated by a nightly aggregation job. Not blocking — raw table is sufficient for V1.

---

## 7. Ready-to-Use Analysis Queries

These are the queries we'll need once data starts flowing. Including them here so you can validate the schema supports them.

### Q1: Top 20 Most Affected Restaurants (Last 7 Days)

```sql
SELECT 
    restaurant_id,
    COUNT(*) as total_incidents,
    COUNT(DISTINCT session_id) as sessions_affected,
    SUM(CASE WHEN event_type = 'reconnect_budget_exhausted' THEN 1 ELSE 0 END) as budget_exhausted,
    SUM(CASE WHEN event_type = 'server_disconnect' THEN 1 ELSE 0 END) as server_disconnects,
    SUM(CASE WHEN event_type = 'room_join_timeout' THEN 1 ELSE 0 END) as room_join_failures,
    SUM(CASE WHEN event_type = 'aggregator_reconciliation_found' THEN 1 ELSE 0 END) as aggregator_saves
FROM socket_telemetry_logs
WHERE event_timestamp > NOW() - INTERVAL 7 DAY
  AND event_type IN ('reconnect_budget_exhausted', 'server_disconnect', 'room_join_timeout', 'aggregator_reconciliation_found')
GROUP BY restaurant_id
ORDER BY total_incidents DESC
LIMIT 20;
```

### Q2: PWA vs Browser Breakdown

```sql
SELECT 
    is_pwa,
    event_type,
    COUNT(*) as count,
    COUNT(DISTINCT restaurant_id) as restaurants_affected
FROM socket_telemetry_logs
WHERE event_timestamp > NOW() - INTERVAL 7 DAY
GROUP BY is_pwa, event_type
ORDER BY is_pwa DESC, count DESC;
```

### Q3: iOS vs Android vs Desktop

```sql
SELECT 
    platform,
    event_type,
    COUNT(*) as count
FROM socket_telemetry_logs
WHERE is_pwa = TRUE 
  AND event_timestamp > NOW() - INTERVAL 7 DAY
GROUP BY platform, event_type
ORDER BY platform, count DESC;
```

### Q4: Aggregator Orders Saved by Polling (Quantifies BUG-677 F4 Value)

```sql
SELECT 
    restaurant_id,
    COUNT(*) as reconciliation_events,
    SUM(JSON_EXTRACT(metadata, '$.orders_found_count')) as total_orders_saved
FROM socket_telemetry_logs
WHERE event_type = 'aggregator_reconciliation_found'
  AND event_timestamp > NOW() - INTERVAL 7 DAY
GROUP BY restaurant_id
ORDER BY total_orders_saved DESC;
```

### Q5: Visibility Recovery Success Rate by Platform

```sql
SELECT 
    platform,
    COUNT(*) as attempts,
    SUM(CASE WHEN JSON_EXTRACT(metadata, '$.success') = true THEN 1 ELSE 0 END) as successes,
    ROUND(
        SUM(CASE WHEN JSON_EXTRACT(metadata, '$.success') = true THEN 1 ELSE 0 END) * 100.0 / COUNT(*), 
        1
    ) as success_rate_pct,
    AVG(CASE WHEN JSON_EXTRACT(metadata, '$.success') = true 
         THEN JSON_EXTRACT(metadata, '$.time_to_recover_ms') END) as avg_recovery_ms
FROM socket_telemetry_logs
WHERE event_type = 'visibility_recovery_result'
  AND event_timestamp > NOW() - INTERVAL 7 DAY
GROUP BY platform;
```

### Q6: Before vs After BUG-677 Deployment Comparison

```sql
-- Run this AFTER deploying BUG-677 fixes, comparing 7 days before vs after
SELECT 
    CASE 
        WHEN event_timestamp < '2026-11-25 00:00:00' THEN 'BEFORE_FIX'
        ELSE 'AFTER_FIX'
    END as period,
    event_type,
    COUNT(*) as count,
    COUNT(DISTINCT restaurant_id) as restaurants
FROM socket_telemetry_logs
WHERE event_timestamp BETWEEN '2026-11-18 00:00:00' AND '2026-12-02 00:00:00'
GROUP BY period, event_type
ORDER BY period, count DESC;
```

### Q7: Specific Restaurant Deep Dive (For Support Tickets)

```sql
SELECT 
    event_type,
    event_timestamp,
    session_id,
    is_pwa,
    platform,
    network_type,
    connection_uptime_ms,
    reconnect_attempts_used,
    socket_status_before,
    socket_status_after,
    metadata
FROM socket_telemetry_logs
WHERE restaurant_id = 672
  AND event_timestamp > NOW() - INTERVAL 24 HOUR
ORDER BY event_timestamp DESC;
```

### Q8: Hourly Incident Heatmap (Identify Peak Problem Hours)

```sql
SELECT 
    HOUR(event_timestamp) as hour_of_day,
    COUNT(*) as incidents,
    COUNT(DISTINCT restaurant_id) as restaurants
FROM socket_telemetry_logs
WHERE event_type IN ('reconnect_budget_exhausted', 'server_disconnect')
  AND event_timestamp > NOW() - INTERVAL 7 DAY
GROUP BY HOUR(event_timestamp)
ORDER BY hour_of_day;
```

---

## 8. Laravel Implementation Notes

### Suggested File Structure

```
app/
├── Http/
│   └── Controllers/
│       └── Api/V1/
│           └── SocketTelemetryController.php    ← NEW
├── Models/
│   └── SocketTelemetryLog.php                   ← NEW
├── Http/
│   └── Requests/
│       └── StoreSocketTelemetryRequest.php      ← NEW (form request validation)
│
database/
└── migrations/
    └── 2026_11_18_000001_create_socket_telemetry_logs_table.php  ← NEW
│
routes/
└── api.php                                       ← ADD 1 route
```

### Route Registration

```php
// routes/api.php — inside the v1 authenticated group
Route::post('socket-telemetry/log', [SocketTelemetryController::class, 'store']);
```

### Controller Pseudo-code

```php
class SocketTelemetryController extends Controller
{
    public function store(StoreSocketTelemetryRequest $request)
    {
        $events = $request->validated()['events'];
        $received = 0;
        $errors = [];

        foreach ($events as $index => $event) {
            try {
                SocketTelemetryLog::create([
                    'restaurant_id'           => $event['restaurant_id'],
                    'event_type'              => $event['event_type'],
                    'event_timestamp'         => $event['event_timestamp'],
                    'session_id'              => $event['session_id'],
                    'is_pwa'                  => $event['device_context']['is_pwa'] ?? false,
                    'user_agent'              => $event['device_context']['user_agent'] ?? null,
                    'platform'                => $event['device_context']['platform'] ?? null,
                    'network_type'            => $event['device_context']['network_type'] ?? null,
                    'network_downlink'        => $event['device_context']['network_downlink'] ?? null,
                    'connection_uptime_ms'    => $event['socket_context']['connection_uptime_ms'] ?? null,
                    'reconnect_attempts_used' => $event['socket_context']['reconnect_attempts_used'] ?? null,
                    'socket_status_before'    => $event['socket_context']['socket_status_before'] ?? null,
                    'socket_status_after'     => $event['socket_context']['socket_status_after'] ?? null,
                    'transport'               => $event['socket_context']['transport'] ?? null,
                    'metadata'                => $event['metadata'] ?? null,
                ]);
                $received++;
            } catch (\Exception $e) {
                $errors[] = ['index' => $index, 'reason' => $e->getMessage()];
            }
        }

        return response()->json([
            'received' => $received,
            'status'   => empty($errors) ? 'ok' : 'partial',
            'errors'   => $errors ?: undefined,
        ]);
    }
}
```

### Performance Note

For high-volume scenarios, consider using `DB::table('socket_telemetry_logs')->insert($batch)` (bulk insert) instead of individual Eloquent creates. This reduces DB round-trips from N to 1 per request.

```php
// Bulk insert approach (faster):
$rows = array_map(fn($event) => [
    'restaurant_id'    => $event['restaurant_id'],
    'event_type'       => $event['event_type'],
    // ... flatten all fields ...
    'metadata'         => json_encode($event['metadata'] ?? []),
    'created_at'       => now(),
], $events);

DB::table('socket_telemetry_logs')->insert($rows);

return response()->json(['received' => count($rows), 'status' => 'ok']);
```

---

## 9. CORS Note

This endpoint will be called from the same origin as all other POS API calls (`preprod.mygenie.online`). No special CORS configuration needed — it follows the existing CORS setup.

---

## 10. Testing

### Manual Test (curl)

```bash
curl -X POST https://preprod.mygenie.online/api/v1/socket-telemetry/log \
  -H "Authorization: Bearer <valid_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "events": [{
      "restaurant_id": 672,
      "event_type": "server_disconnect",
      "event_timestamp": "2026-11-17T14:32:05.123Z",
      "session_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      "device_context": {"is_pwa": true, "platform": "iOS"},
      "socket_context": {"reconnect_attempts_used": 10, "socket_status_after": "ERROR"},
      "metadata": {"disconnect_reason": "io server disconnect"}
    }]
  }'

# Expected: 200 OK {"received": 1, "status": "ok"}
```

### Validation Test Cases

| # | Test | Expected |
|---|------|----------|
| T1 | Valid single event | 200, received: 1 |
| T2 | Valid batch of 5 events | 200, received: 5 |
| T3 | No auth token | 401 |
| T4 | Invalid event_type ("foo_bar") | 422 or partial (4/5 received) |
| T5 | Empty events array | 422 |
| T6 | 25 events (exceeds max 20) | 422 |
| T7 | Missing required field (no restaurant_id) | 422 |
| T8 | Future timestamp (>24h ahead) | 422 for that event |
| T9 | Valid event with no metadata | 200 (metadata is optional) |
| T10 | Valid event with no device_context | 200 (device_context fields nullable) |

---

## 11. Deployment Sequence

| Step | Who | Action |
|------|-----|--------|
| 1 | Gyan | Create migration + model + controller + route |
| 2 | Gyan | Run migration on preprod |
| 3 | Gyan | Test with curl (§10) |
| 4 | Gyan | Confirm endpoint live → tell Abhishek |
| 5 | FE | Implement `socketTelemetry.js` utility + 7 instrumentation hooks (part of BUG-677 F1–F6 code) |
| 6 | FE | Deploy frontend with telemetry enabled |
| 7 | Both | Monitor for 48 hours → run Q1–Q3 queries |
| 8 | Both | After 7 days → run Q6 (before/after comparison) |

**No blocking dependency:** Frontend telemetry calls are wrapped in try/catch with silent failure. If the endpoint isn't ready, frontend works fine — telemetry is just silently dropped.

---

## 12. Checklist for Gyan

```
□ Create migration: socket_telemetry_logs table
□ Create model: SocketTelemetryLog
□ Create form request: StoreSocketTelemetryRequest (validation)
□ Create controller: SocketTelemetryController@store
□ Register route: POST /api/v1/socket-telemetry/log
□ Run migration on preprod
□ Test with curl (T1–T10)
□ Confirm endpoint live
□ (Optional) Add rate limiting: 100 events/RID/minute
□ (Optional) Add cleanup scheduler: DELETE > 90 days
□ (Optional) Create daily summary materialized view
```

---

*End of backend brief. Questions → Abhishek / Emergent Agent.*
