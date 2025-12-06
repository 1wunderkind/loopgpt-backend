# Observability Layer Testing & Validation Guide

This document provides comprehensive testing instructions for the observability and monitoring layer (Step 2).

---

## 📋 Table of Contents

1. [Prerequisites](#prerequisites)
2. [Manual Testing Checklist](#manual-testing-checklist)
3. [Database Validation](#database-validation)
4. [Structured Logging Validation](#structured-logging-validation)
5. [Materialized Views Validation](#materialized-views-validation)
6. [Integration Testing](#integration-testing)
7. [Performance Validation](#performance-validation)
8. [Acceptance Criteria](#acceptance-criteria)

---

## Prerequisites

Before testing, ensure:

1. ✅ All migrations have been applied to Supabase:
   - `20251206_tool_invocations_observability.sql`
   - `20251206_tool_health_views.sql`

2. ✅ MCP server code has been deployed with latest changes:
   - `lib/logger.ts`
   - `lib/tool-metrics.ts`
   - `lib/reliability.ts` (updated with logger integration)
   - `index.ts` (updated with tool metrics logging)

3. ✅ Environment variables are set:
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`

---

## Manual Testing Checklist

### Test 1: Database Logging Works

**Objective:** Verify that tool invocations are logged to `analytics.tool_invocations`

**Steps:**
1. Make a test call to any MCP tool (e.g., `get_affiliate_links`)
2. Query the database:
   ```sql
   SELECT * FROM analytics.tool_invocations
   ORDER BY created_at DESC
   LIMIT 5;
   ```

**Expected Result:**
- ✅ A new row appears with:
  - `tool_name` = the tool you called
  - `success` = true (if successful) or false (if failed)
  - `duration_ms` > 0
  - `started_at` and `finished_at` timestamps
  - `user_id`, `gpt_name`, `provider` (if applicable)

**Pass Criteria:**
- Row exists in database
- All required fields are populated
- Timestamps are reasonable (not in the future, not too old)

---

### Test 2: Error Logging Works

**Objective:** Verify that failed tool invocations are logged with error codes

**Steps:**
1. Trigger a tool failure (e.g., call `delivery_search_restaurants` with invalid coordinates)
2. Query the database:
   ```sql
   SELECT tool_name, success, error_code, metadata
   FROM analytics.tool_invocations
   WHERE success = false
   ORDER BY created_at DESC
   LIMIT 5;
   ```

**Expected Result:**
- ✅ A row appears with:
  - `success` = false
  - `error_code` = one of: TIMEOUT, NETWORK_ERROR, UPSTREAM_4XX, UPSTREAM_5XX, VALIDATION_ERROR, UNKNOWN
  - `metadata` contains error details

**Pass Criteria:**
- Error is logged to database
- Error code is correctly classified
- Metadata includes useful debugging information

---

### Test 3: Structured Logs Appear in Console

**Objective:** Verify that structured JSON logs are printed to console

**Steps:**
1. Make a test call to any MCP tool
2. Check the Supabase Edge Function logs (or local console if running locally)

**Expected Result:**
- ✅ JSON logs appear with structure:
  ```json
  {
    "level": "info",
    "message": "Tool executed successfully",
    "timestamp": "2025-12-06T22:00:00.000Z",
    "source": "tool-metrics",
    "toolName": "get_affiliate_links",
    "durationMs": 123
  }
  ```

**Pass Criteria:**
- Logs are valid JSON
- All expected fields are present
- Log levels are appropriate (debug, info, warn, error)

---

### Test 4: Retry Logic Logs Correctly

**Objective:** Verify that retry attempts are logged with context

**Steps:**
1. Trigger a retryable error (e.g., timeout on `delivery_search_restaurants`)
2. Check the console logs for retry messages

**Expected Result:**
- ✅ Logs show retry attempts:
  ```json
  {
    "level": "info",
    "message": "Retrying after error",
    "source": "mcp-reliability",
    "toolName": "delivery_search_restaurants",
    "errorCode": "TIMEOUT",
    "attemptNumber": 2,
    "maxRetries": 2,
    "delayMs": 400,
    "retryable": true
  }
  ```

**Pass Criteria:**
- Retry logs appear for each attempt
- `attemptNumber` increments correctly
- `delayMs` follows exponential backoff (300ms → 600ms → 1200ms)

---

## Database Validation

### Validation 1: Table Exists and Has Correct Schema

```sql
-- Check table exists
SELECT table_name, table_type
FROM information_schema.tables
WHERE table_schema = 'analytics'
  AND table_name = 'tool_invocations';

-- Check columns
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'analytics'
  AND table_name = 'tool_invocations'
ORDER BY ordinal_position;
```

**Expected Result:**
- ✅ Table exists
- ✅ All columns present: `id`, `tool_name`, `user_id`, `session_id`, `gpt_name`, `started_at`, `finished_at`, `duration_ms`, `success`, `error_code`, `provider`, `source_gpt`, `metadata`, `created_at`

---

### Validation 2: Indexes Exist

```sql
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'tool_invocations'
  AND schemaname = 'analytics';
```

**Expected Result:**
- ✅ 5 indexes exist:
  - `idx_tool_invocations_tool_name`
  - `idx_tool_invocations_created_at`
  - `idx_tool_invocations_success`
  - `idx_tool_invocations_tool_time_success`
  - `idx_tool_invocations_error_code`

---

### Validation 3: RLS Policy Exists

```sql
SELECT policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE tablename = 'tool_invocations'
  AND schemaname = 'analytics';
```

**Expected Result:**
- ✅ Policy `service_role_all` exists
- ✅ Applies to `service_role`

---

## Structured Logging Validation

### Validation 1: Log Format is Valid JSON

**Test:**
1. Capture console output from a tool execution
2. Parse each line as JSON

**Expected Result:**
- ✅ All log lines parse as valid JSON
- ✅ No syntax errors

---

### Validation 2: Log Levels are Appropriate

**Test:**
1. Check logs for different scenarios:
   - Success → `debug` or `info`
   - Retry → `info`
   - Max retries exhausted → `warn`
   - Error → `error`

**Expected Result:**
- ✅ Log levels match severity
- ✅ No `error` logs for successful operations

---

### Validation 3: Sensitive Data is Redacted

**Test:**
1. Make a tool call with sensitive data (e.g., API key in metadata)
2. Check logs for redacted fields

**Expected Result:**
- ✅ Sensitive fields show `[REDACTED]`
- ✅ No API keys, passwords, or tokens in logs

---

## Materialized Views Validation

### Validation 1: Views Exist

```sql
SELECT matviewname
FROM pg_matviews
WHERE schemaname = 'analytics';
```

**Expected Result:**
- ✅ `tool_error_rate_24h` exists
- ✅ `tool_latency_p50_p95_24h` exists

---

### Validation 2: Views Refresh Correctly

```sql
-- Manually refresh views
SELECT analytics.refresh_all_views();

-- Check last refresh time
SELECT schemaname, matviewname, last_refresh
FROM pg_stat_user_tables
WHERE schemaname = 'analytics'
  AND relname LIKE '%24h';
```

**Expected Result:**
- ✅ Function executes without errors
- ✅ `last_refresh` timestamp is recent

---

### Validation 3: Views Return Correct Data

```sql
-- Check error rate view
SELECT tool_name, total_invocations, error_rate_pct
FROM analytics.tool_error_rate_24h
ORDER BY error_rate_pct DESC
LIMIT 5;

-- Check latency view
SELECT tool_name, p50_ms, p95_ms, avg_ms
FROM analytics.tool_latency_p50_p95_24h
ORDER BY p95_ms DESC
LIMIT 5;

-- Check health summary
SELECT tool_name, health_status, error_rate_pct, p95_ms
FROM analytics.tool_health_summary
ORDER BY health_status, error_rate_pct DESC;
```

**Expected Result:**
- ✅ Views return rows (if data exists)
- ✅ Percentages are between 0-100
- ✅ Latency values are reasonable (not negative, not absurdly high)
- ✅ Health status is one of: `healthy`, `warning`, `critical`

---

## Integration Testing

### Integration Test 1: End-to-End Tool Execution

**Scenario:** Call a tool and verify all observability components work

**Steps:**
1. Call `get_affiliate_links` with valid input
2. Check database for new row
3. Check console logs for structured logs
4. Refresh materialized views
5. Query health summary

**Expected Result:**
- ✅ Row in `analytics.tool_invocations`
- ✅ Structured logs in console
- ✅ Views refresh successfully
- ✅ Tool appears in health summary with `healthy` status

---

### Integration Test 2: Error Handling Flow

**Scenario:** Trigger an error and verify observability captures it

**Steps:**
1. Call `delivery_search_restaurants` with invalid coordinates (trigger 400 error)
2. Check database for error row
3. Check console logs for error logs
4. Refresh materialized views
5. Query error rate view

**Expected Result:**
- ✅ Row in `analytics.tool_invocations` with `success = false`
- ✅ Error logs in console with `level: "error"`
- ✅ Tool appears in `tool_error_rate_24h` with non-zero error rate
- ✅ Health summary shows `warning` or `critical` status

---

### Integration Test 3: Retry Flow

**Scenario:** Trigger a retryable error and verify retry logic works

**Steps:**
1. Simulate a timeout on `delivery_search_restaurants` (e.g., by setting a very short timeout)
2. Check console logs for retry attempts
3. Check database for final outcome
4. Verify retry count matches expected

**Expected Result:**
- ✅ Multiple retry log entries in console
- ✅ `attemptNumber` increments (1, 2, 3, ...)
- ✅ Exponential backoff delays (300ms, 600ms, 1200ms)
- ✅ Final row in database shows outcome (success after retry OR failure after max retries)

---

## Performance Validation

### Performance Test 1: Logging Overhead

**Objective:** Verify that logging doesn't significantly slow down tool execution

**Steps:**
1. Measure tool execution time WITHOUT observability (baseline)
2. Measure tool execution time WITH observability
3. Calculate overhead percentage

**Expected Result:**
- ✅ Overhead < 5% of total execution time
- ✅ Database inserts are async (don't block response)

**Benchmark:**
- Fast tool (< 1s): Overhead < 50ms
- Medium tool (1-5s): Overhead < 200ms
- Slow tool (> 5s): Overhead < 500ms

---

### Performance Test 2: Database Insert Performance

**Objective:** Verify that database inserts don't cause bottlenecks

**Steps:**
1. Make 100 concurrent tool calls
2. Check database for 100 rows
3. Measure time to insert all rows

**Expected Result:**
- ✅ All 100 rows inserted successfully
- ✅ No database errors or timeouts
- ✅ Average insert time < 100ms per row

---

### Performance Test 3: Materialized View Refresh Time

**Objective:** Verify that view refreshes complete quickly

**Steps:**
1. Populate `analytics.tool_invocations` with 10,000 rows
2. Measure time to refresh views:
   ```sql
   \timing on
   SELECT analytics.refresh_all_views();
   ```

**Expected Result:**
- ✅ Refresh completes in < 5 seconds
- ✅ No database locks or deadlocks

---

## Acceptance Criteria

### ✅ Criterion 1: Database Logging Works
- [ ] `analytics.tool_invocations` table exists
- [ ] Tool invocations are logged for success and failure
- [ ] All required fields are populated
- [ ] Async logging doesn't break tool execution

### ✅ Criterion 2: Structured Logging Works
- [ ] `logger.ts` module exists
- [ ] JSON logs are printed to console
- [ ] Logs include all required context fields
- [ ] Sensitive data is redacted

### ✅ Criterion 3: Materialized Views Work
- [ ] `tool_error_rate_24h` view exists and returns data
- [ ] `tool_latency_p50_p95_24h` view exists and returns data
- [ ] `tool_health_summary` view exists and returns data
- [ ] `analytics.refresh_all_views()` function works

### ✅ Criterion 4: Integration Works
- [ ] MCP server logs tool invocations to database
- [ ] Reliability module uses structured logger
- [ ] Error codes are correctly classified
- [ ] Retry logic is logged with context

### ✅ Criterion 5: Performance is Acceptable
- [ ] Logging overhead < 5%
- [ ] Database inserts are async
- [ ] View refreshes complete in < 5 seconds
- [ ] No database bottlenecks

### ✅ Criterion 6: Failures Don't Break Execution
- [ ] Database insert failures are logged but don't throw
- [ ] Logging failures don't break tool execution
- [ ] Missing environment variables are handled gracefully

---

## Troubleshooting

### Issue: No rows in analytics.tool_invocations

**Possible Causes:**
1. Migration not applied
2. Environment variables not set
3. Database insert failing silently

**Debug Steps:**
1. Check migration status:
   ```sql
   SELECT * FROM supabase_migrations.schema_migrations
   WHERE version LIKE '20251206%';
   ```
2. Check environment variables in Edge Function logs
3. Look for error logs in console

---

### Issue: Materialized views are empty

**Possible Causes:**
1. No data in `analytics.tool_invocations` yet
2. Views not refreshed
3. Time window filter excludes all data

**Debug Steps:**
1. Check if data exists:
   ```sql
   SELECT COUNT(*) FROM analytics.tool_invocations
   WHERE created_at >= NOW() - INTERVAL '24 hours';
   ```
2. Manually refresh views:
   ```sql
   SELECT analytics.refresh_all_views();
   ```

---

### Issue: Logs not appearing in console

**Possible Causes:**
1. Logger module not imported
2. Console output not captured by log aggregation tool
3. Log level filtering

**Debug Steps:**
1. Check import statement in `reliability.ts` and `index.ts`
2. Verify Supabase Edge Function logs are accessible
3. Check log level (debug logs may be filtered out)

---

## Next Steps

After validating the observability layer:

1. ✅ Set up automated view refresh (cron job or pg_cron)
2. ✅ Configure alerting for high error rates
3. ✅ Create dashboard for tool health monitoring
4. ✅ Integrate with external observability tools (Datadog, Grafana, etc.)
5. ✅ Document observability best practices for team

---

**Last Updated:** 2025-12-06  
**Version:** 1.0.0  
**Status:** Ready for Testing
