# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]

### Added
- CI/CD pipeline with GitHub Actions
- Safe deployment scripts for staging and production
- Typed environment variable validation
- Structured logging and error taxonomy
- Runtime contract validation for external providers

### Changed
- Refactored `mealme_get_quotes` and `delivery_place_order` to use standardized error handling
- Updated `nutrition` and `mealplan` tools to use standardized logging and validation

### Fixed
- Removed `no-explicit-any` from critical paths
- Improved resilience of MCP tools with fallback logic
