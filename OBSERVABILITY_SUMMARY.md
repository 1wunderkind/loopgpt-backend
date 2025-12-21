# Observability & Monitoring Layer - Implementation Summary

**Step 2 of Production Readiness**

This document summarizes the observability and monitoring layer implementation
for LooptOS MCP tools.

---

## 🎯 Objective

Implement comprehensive observability for all MCP tools with:

1. Database-backed metrics storage
2. Structured JSON logging
3. Per-tool health monitoring views
4. Integration with reliability layer

---

## 📦 What Was Delivered

### 1. Database Schema (`analytics.tool_invocations`)

**Migration:** `supabase/migrations/20251206_tool_invocations_observability.sql`

**Table Structure:**

- `tool_name` - MCP tool identifier
- `user_id`, `session_id`, `gpt_name` - Context fields
- `started_at`, `finished_at`, `duration_ms` - Timing metrics
- `success`, `error_code` - Outcome tracking
- `provider`, `source_gpt` - Classification
- `metadata` - JSONB for debugging context

**Indexes (5 total):**

- `idx_tool_invocations_tool_name` - Filter by tool
- `idx_tool_invocations_created_at` - Time-based queries
- `idx_tool_invocations_success` - Success/failure filtering
- `idx_tool_invocations_tool_time_success` - Composite index
- `idx_tool_invocations_error_code` - Error analysis

**Security:**

- RLS enabled
- Service role-only access

---

### 2. Structured Logger Module (`lib/logger.ts`)

**Features:**

- 4 log levels: debug, info, warn, error
- JSON-formatted output for log aggregation
- Structured context fields
- Convenience functions: `logDebug()`, `logInfo()`, `logWarn()`, `logError()`
- `ScopedLogger` class for tool-scoped logging
- Utility functions: `sanitizeLogContext()`, `formatDuration()`

**Example Usage:**

```typescript
import { logError, logInfo } from "./lib/logger";

logInfo("Tool executed successfully", {
  toolName: "delivery_search_restaurants",
  durationMs: 1234,
});

logError("Tool failed", {
  toolName: "delivery_place_order",
  errorCode: "TIMEOUT",
  retryable: true,
});
```

**Log Output:**

```json
{
  "level": "error",
  "message": "Tool failed",
  "timestamp": "2025-12-06T22:00:00.000Z",
  "source": "mcp-tool",
  "toolName": "delivery_place_order",
  "errorCode": "TIMEOUT",
  "retryable": true,
  "durationMs": 8000
}
```

---

### 3. Tool Metrics Logging (`lib/tool-metrics.ts`)

**Features:**

- `logToolInvocationToDb()` - Async database logging
- `inferGptNameFromTool()` - Maps tool names to GPT names
- `inferProviderFromTool()` - Maps tool names to external providers
- `extractUserIdFromRequest()` - Extracts user ID from JWT
- `sanitizeMetadata()` - Removes sensitive data
- Non-throwing error handling

**Integration Points:**

- MCP server success path
- MCP server invocation error path
- MCP server unexpected error path

**Logged Fields:**

- `tool_name`, `started_at`, `finished_at`, `duration_ms`
- `success`, `error_code`
- `user_id`, `gpt_name`, `provider`
- `metadata` (sanitized)

---

### 4. Materialized Views for Health Monitoring

**Migration:** `supabase/migrations/20251206_tool_health_views.sql`

**Views Created:**

#### `analytics.tool_error_rate_24h` (Materialized)

- Per-tool error rates over 24 hours
- Fields: `total_invocations`, `error_count`, `error_rate_pct`,
  `most_common_error`
- Sorted by error rate (highest first)
- Indexed on `tool_name`

#### `analytics.tool_latency_p50_p95_24h` (Materialized)

- Per-tool latency percentiles over 24 hours
- Fields: `p50_ms`, `p95_ms`, `avg_ms`, `min_ms`, `max_ms`
- Only includes successful invocations
- Sorted by P95 latency (slowest first)
- Indexed on `tool_name`

#### `analytics.tool_health_summary` (Regular View)

- Combines error rates + latency metrics
- Adds `health_status` classification:
  - **Critical:** error_rate > 10%
  - **Warning:** error_rate > 5% OR p95_latency > 10s
  - **Healthy:** Otherwise

**Refresh Function:**

```sql
SELECT analytics.refresh_all_views();
```

- Refreshes both materialized views concurrently
- Should be run periodically (e.g., hourly cron job)

---

### 5. Reliability Layer Integration

**File:** `supabase/functions/mcp-server/lib/reliability.ts`

**Changes:**

- Imported structured logger: `logDebug()`, `logInfo()`, `logWarn()`,
  `logError()`
- Replaced 5 console.log calls with structured logging
- Added context fields: `toolName`, `errorCode`, `attemptNumber`, `maxRetries`,
  `delayMs`, `durationMs`, `retryable`
- Kept backward-compatible JSON logging

**Log Locations:**

1. Retry skip (debug)
2. Max retries exhausted (warn)
3. Retry attempt (info)
4. Tool success (debug)
5. Tool error (error)

---

## 📊 Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                      MCP Server (index.ts)                  │
│                                                             │
│  ┌───────────────────────────────────────────────────────┐ │
│  │ Tool Execution Handler                                │ │
│  │                                                       │ │
│  │  1. Extract user context (user_id, session_id)       │ │
│  │  2. Record start time                                │ │
│  │  3. Invoke Edge Function (supabase.functions.invoke) │ │
│  │  4. Record finish time                               │ │
│  │  5. Log to database (async, non-blocking)            │ │
│  │     - logToolInvocationToDb()                        │ │
│  │  6. Return response to ChatGPT                       │ │
│  └───────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│              Reliability Layer (reliability.ts)             │
│                                                             │
│  ┌───────────────────────────────────────────────────────┐ │
│  │ withToolReliability()                                 │ │
│  │                                                       │ │
│  │  - Timeout enforcement (AbortController)             │ │
│  │  - Retry logic (exponential backoff)                 │ │
│  │  - Error classification (6 codes)                    │ │
│  │  - Structured logging (logger.ts)                    │ │
│  └───────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                Structured Logger (logger.ts)                │
│                                                             │
│  - JSON-formatted logs                                     │
│  - 4 log levels (debug, info, warn, error)                 │
│  - Context fields (toolName, errorCode, durationMs, etc.)  │
│  - Sensitive data redaction                                │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│         Database (analytics.tool_invocations)               │
│                                                             │
│  - Stores all tool invocations                             │
│  - Indexed for fast queries                                │
│  - RLS for security                                        │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│           Materialized Views (tool_error_rate_24h,          │
│                    tool_latency_p50_p95_24h)                │
│                                                             │
│  - Aggregated metrics for monitoring                       │
│  - Refreshed periodically (hourly)                         │
│  - Powering dashboards and alerts                          │
└─────────────────────────────────────────────────────────────┘
```

---

## 🎯 Benefits

### For Operations Team:

- ✅ **Centralized metrics:** All tool invocations in one table
- ✅ **Error tracking:** Per-tool error rates and common error codes
- ✅ **Latency monitoring:** P50/P95 percentiles for SLA tracking
- ✅ **Health dashboard:** Single view of all tool health statuses
- ✅ **Alerting-ready:** Can set up alerts on error rates or latency

### For Developers:

- ✅ **Structured logs:** Easy to parse and analyze
- ✅ **Rich context:** All relevant fields in every log entry
- ✅ **Debugging:** Metadata field captures error details
- ✅ **Retry visibility:** Can see retry attempts and outcomes
- ✅ **Performance insights:** Duration tracking for optimization

### For Product Team:

- ✅ **Usage metrics:** Which tools are most/least used
- ✅ **Reliability metrics:** Which tools have highest error rates
- ✅ **User experience:** Latency percentiles show user-facing performance
- ✅ **Provider insights:** Can track external API reliability

---

## 📈 Key Metrics

### Error Rate Metrics:

- **Total invocations** - Volume of tool usage
- **Error count** - Number of failures
- **Error rate %** - Percentage of failures
- **Most common error** - Top error code for debugging
- **Unique error codes** - Variety of failure modes

### Latency Metrics:

- **P50 (median)** - Typical latency
- **P95** - Worst-case latency for 95% of requests
- **Average** - Mean latency
- **Min/Max** - Range of latencies

### Health Status:

- **Healthy** - error_rate ≤ 5% AND p95_latency ≤ 10s
- **Warning** - error_rate > 5% OR p95_latency > 10s
- **Critical** - error_rate > 10%

---

## 🔧 Configuration

### Database Refresh Schedule

**Recommended:** Refresh materialized views every hour

**Option 1: pg_cron (Supabase)**

```sql
SELECT cron.schedule(
  'refresh-tool-health-views',
  '0 * * * *',  -- Every hour at minute 0
  $$SELECT analytics.refresh_all_views()$$
);
```

**Option 2: External Cron Job**

```bash
# Add to crontab
0 * * * * curl -X POST https://your-supabase-project.supabase.co/rest/v1/rpc/refresh_all_views \
  -H "apikey: YOUR_SERVICE_ROLE_KEY" \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY"
```

---

### Alerting Thresholds

**Recommended thresholds for alerts:**

| Metric             | Warning | Critical |
| ------------------ | ------- | -------- |
| Error rate         | > 5%    | > 10%    |
| P95 latency        | > 5s    | > 10s    |
| Total errors (24h) | > 100   | > 500    |

**Example Alert Query:**

```sql
SELECT tool_name, error_rate_pct, p95_ms
FROM analytics.tool_health_summary
WHERE health_status IN ('warning', 'critical')
ORDER BY health_status, error_rate_pct DESC;
```

---

## 🧪 Testing

See [OBSERVABILITY_TESTING.md](./OBSERVABILITY_TESTING.md) for comprehensive
testing instructions.

**Quick Validation:**

```sql
-- Check if data is being logged
SELECT COUNT(*) FROM analytics.tool_invocations
WHERE created_at >= NOW() - INTERVAL '1 hour';

-- Check error rates
SELECT * FROM analytics.tool_error_rate_24h
ORDER BY error_rate_pct DESC;

-- Check latencies
SELECT * FROM analytics.tool_latency_p50_p95_24h
ORDER BY p95_ms DESC;

-- Check health summary
SELECT * FROM analytics.tool_health_summary;
```

---

## 📝 Files Changed

### New Files Created (6):

1. `supabase/migrations/20251206_tool_invocations_observability.sql` - Database
   schema
2. `supabase/migrations/20251206_tool_health_views.sql` - Materialized views
3. `supabase/functions/mcp-server/lib/logger.ts` - Structured logger
4. `supabase/functions/mcp-server/lib/tool-metrics.ts` - Tool metrics logging
5. `OBSERVABILITY_TESTING.md` - Testing guide
6. `OBSERVABILITY_SUMMARY.md` - This document

### Files Modified (2):

1. `supabase/functions/mcp-server/index.ts` - Added tool metrics logging
2. `supabase/functions/mcp-server/lib/reliability.ts` - Integrated structured
   logger

---

## 🚀 Deployment Checklist

- [ ] Apply database migrations:
  - [ ] `20251206_tool_invocations_observability.sql`
  - [ ] `20251206_tool_health_views.sql`
- [ ] Deploy updated MCP server code
- [ ] Verify environment variables are set
- [ ] Test database logging (make a test tool call)
- [ ] Test structured logging (check console logs)
- [ ] Refresh materialized views manually
- [ ] Verify views return data
- [ ] Set up automated view refresh (cron job)
- [ ] Configure alerting (optional)
- [ ] Create dashboard (optional)

---

## 📊 Success Metrics

### Immediate (Day 1):

- ✅ All tool invocations logged to database
- ✅ Structured logs appear in console
- ✅ Materialized views return data
- ✅ No errors in Edge Function logs

### Short-Term (Week 1):

- ✅ Error rates < 5% for all tools
- ✅ P95 latencies < 5s for all tools
- ✅ Logging overhead < 5% of total execution time
- ✅ No database bottlenecks

### Long-Term (Month 1):

- ✅ Dashboard showing tool health
- ✅ Alerts configured for high error rates
- ✅ Integrated with external observability tools
- ✅ Team using metrics for debugging and optimization

---

## 🔮 Future Enhancements

1. **Real-time alerting** - Slack/PagerDuty integration
2. **Grafana dashboard** - Visual tool health monitoring
3. **Distributed tracing** - Track requests across services
4. **Custom metrics** - Business-specific KPIs
5. **Log aggregation** - Datadog/Splunk integration
6. **Anomaly detection** - ML-based error prediction
7. **User journey tracking** - Multi-tool session analysis

---

## 📞 Support

**Questions or Issues?**

- Check [OBSERVABILITY_TESTING.md](./OBSERVABILITY_TESTING.md) for
  troubleshooting
- Review Edge Function logs in Supabase dashboard
- Query `analytics.tool_invocations` for debugging
- Contact: technical-support@theloopgpt.ai

---

**Last Updated:** 2025-12-06\
**Version:** 1.0.0\
**Status:** ✅ Production Ready
