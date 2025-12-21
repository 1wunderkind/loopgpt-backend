# Service Level Objectives (SLOs)

## Definitions

- **Availability:** Percentage of requests returning non-5xx errors (excluding
  503 during maintenance).
- **Latency:** Time from request receipt to response sent.
- **Error Budget:** Allowable failure rate before triggering alerts/degradation.

## Targets

| Service          | Availability Target | Latency Target (p95) | Error Budget (Monthly) |
| :--------------- | :------------------ | :------------------- | :--------------------- |
| **Get Quotes**   | 99.5%               | < 3s                 | ~216 mins downtime     |
| **Place Order**  | 99.9%               | < 5s                 | ~43 mins downtime      |
| **Nutrition AI** | 99.0%               | < 8s                 | ~7 hours downtime      |
| **Meal Plan AI** | 99.0%               | < 15s                | ~7 hours downtime      |

## Monitoring & Response

- **Green:** All metrics within targets.
- **Yellow:** Error budget consuming > 10% faster than expected.
  - _Action:_ Investigate logs, check provider status.
- **Red:** Targets breached.
  - _Action:_ Enable **Degraded Mode** (disable retries) or **Safe Mode**
    (disable ordering).
