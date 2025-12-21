# Service Level Agreements (SLAs)

These targets define the expected performance and reliability of the LoopGPT
backend.

## 1. Availability

| Component        | Target | Allowed Downtime (Monthly) |
| ---------------- | ------ | -------------------------- |
| MCP Server       | 99.9%  | ~43 minutes                |
| Nutrition Engine | 99.99% | ~4 minutes                 |
| Commerce Router  | 99.9%  | ~43 minutes                |

## 2. Latency (P95)

| Operation            | Target  | Notes                             |
| -------------------- | ------- | --------------------------------- |
| Nutrition Estimation | < 200ms | Deterministic engine              |
| Route Order          | < 2s    | Includes external API calls       |
| Confirm Order        | < 3s    | Excludes provider processing time |
| Tool Execution       | < 500ms | General overhead                  |

## 3. Error Budgets

| Metric                | Limit  | Action if Breached     |
| --------------------- | ------ | ---------------------- |
| Tool Error Rate       | < 1%   | Alert engineering      |
| Failed Confirmations  | < 0.5% | Halt commerce features |
| Rate Limit Rejections | < 5%   | Investigate abuse      |

## 4. Data Durability

- **RPO (Recovery Point Objective)**: < 1 minute (Supabase PITR)
- **RTO (Recovery Time Objective)**: < 1 hour

## 5. Support Response

- **Critical (P0)**: < 1 hour
- **High (P1)**: < 4 hours
- **Normal (P2)**: < 24 hours
