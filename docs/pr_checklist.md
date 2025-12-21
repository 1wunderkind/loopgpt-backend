# Pull Request Checklist

Before merging, ensure the following:

- [ ] **CI Passes:** `npm run ci` runs locally without errors.
- [ ] **Tests:** New functionality is covered by tests. Existing tests pass.
- [ ] **Environment:** Any new environment variables are added to
      `_shared/env.ts` and documented in `docs/deploy.md`.
- [ ] **Backward Compatibility:** Changes do not break existing clients or
      contracts.
- [ ] **Error Handling:** New code uses `ErrorHandler` and standard
      `ErrorCategory`.
- [ ] **Logging:** Critical paths use `Logger` with structured context.
- [ ] **Changelog:** Updated `CHANGELOG.md` with a summary of changes.
