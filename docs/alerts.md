# Monitoring & Alerting Baseline

## Alert Thresholds (5-10 Minute Window)

| Metric | Threshold | Severity | Description |
| :--- | :--- | :--- | :--- |
| **Error Rate** | > 5% | **High** | General system instability. |
| **Validation Errors** | > 20% | **Medium** | Potential client misuse or breaking API change. |
| **Provider Failures** | > 10% | **High** | MealMe or other external API outage. |
| **Rate Limits** | > 5% | **Medium** | OpenAI or Provider rate limits hit. |
| **Latency (p95)** | > 15s | **Medium** | System slowness, potential timeout risk. |

## Response Procedures

### High Severity (Error Rate > 5% or Provider Failures > 10%)
1.  **Check Logs:** Identify if errors are `INTERNAL`, `PROVIDER`, or `NETWORK`.
2.  **Provider Outage:** If `PROVIDER` errors are high, check status pages (MealMe, OpenAI).
    *   **Action:** Enable `DISABLE_ORDERING` kill switch if orders are failing consistently.
3.  **Bad Deploy:** If errors started immediately after deploy:
    *   **Action:** Execute **Rollback** (see `docs/deploy.md`).

### Medium Severity (Validation Spikes or Latency)
1.  **Check Logs:** Identify specific endpoints or clients causing the spike.
2.  **Validation:** If a specific client version is sending bad data, contact client team.
3.  **Latency:** Check for slow dependencies (e.g., OpenAI response times).

## Health Summary Script

To manually check health via logs (if log export is not automated):

```bash
# Example: Count errors by category in last 1000 lines
grep "level\":\"error" prod.log | jq -r '.context.errorCategory' | sort | uniq -c
```
