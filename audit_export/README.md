# TheLoopGPT Security & Production Readiness Audit Export

This directory contains a comprehensive export of the LoopGPT codebase,
configuration, and security diagnostics for audit purposes.

## Contents

1. **01_directory_tree.txt**: Complete file structure of the repository.
2. **02_all_edge_functions.txt**: Source code for all Supabase Edge Functions.
3. **03_shared_libraries.txt**: Shared utilities, middleware, and types.
4. **04_all_migrations.sql**: Database schema history.
5. **05_rls_policies.sql**: Row Level Security policies extracted from
   migrations.
6. **06_configs.txt**: Configuration files (Supabase, Deno, Package.json).
7. **07_auth_middleware.txt**: Authentication logic and middleware.
8. **08_middleware_usage.txt**: Locations where middleware is applied.
9. **09_security_scan.txt**: Automated scan for secrets, hardcoded URLs, and
   sensitive logs.
10. **10_mcp_config.txt**: MCP tool definitions and SDK client code.
11. **11_cicd_config.txt**: GitHub Actions workflows and deployment scripts.
12. **12_test_files_list.txt**: Inventory of all test files.
13. **13_security_tests.txt**: Source code of security-related tests.
14. **14_rate_limiting.txt**: Locations of rate limiting and input validation
    logic.

## Deployment Status

- **Supabase:** Database, Auth, and Edge Functions are hosted on Supabase.
- **Railway/Render:** (If applicable, add details here. Currently, the backend
  is primarily Supabase-native).

## Security Implementation Status

- **Rate Limiting:** Implemented via `RateLimiter.ts` and applied to critical
  paths.
- **Input Validation:** Implemented via Zod/manual validation in all critical
  Edge Functions (Phases V-VI).
- **Secrets:** `SERVICE_ROLE_KEY` exposure checks are included in
  `09_security_scan.txt`.
- **Logging:** `withLogging` middleware is standardized across functions.

## Known Technical Debt

- Legacy `any` types exist in non-critical paths (tests, older tools), but
  critical commerce paths are strictly typed.
- Some legacy tests may need updates to match new strict validation rules.
