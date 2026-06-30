# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).


## [1.3.0] - 2026-06-30

### Security

- Fixed SQL injection in schema filters by safely escaping user-controlled schema, table, procedure, view, trigger, and search inputs used in metadata queries.
- Removed arbitrary `connectionString` MCP tool arguments; tools now use named/default connections configured through environment variables.
- Disabled the high-risk `execute_query` tool by default. Set `MSSQL_ENABLE_EXECUTE_QUERY=true` to enable it explicitly.
- Changed the default SQL Server TLS behavior to `TrustServerCertificate=False`.
- Updated runtime dependencies, including `@modelcontextprotocol/sdk` and `tedious`, to resolve npm audit advisories.

### Added

- Added validated SQL Server `host,port` parsing for connection strings.
- Added focused unit tests for SQL escaping, identifier quoting, read-only query validation, numeric clamping, and connection-string port parsing.

### Changed

- Updated package release scripts so `npm publish` runs build and unit tests without requiring live SQL Server credentials.
- Moved the live SQL Server MCP smoke test to `npm run test:integration`.
- Updated packaged examples and configuration templates to prefer certificate validation by default.

## [1.2.2] - 2025-08-06

### Fixed

- Fixed 'Invalid column name definition' error in `describe_table` tool
- Fixed primary key query to use KEY_COLUMN_USAGE for ORDINAL_POSITION
- Improved error handling for schema queries

## [1.2.1] - 2025-08-06

### Fixed

- Fixed issues in `describe_table` tool 

## [1.1.0] - 2025-06-28

### Added

- 28 comprehensive database analysis tools
- Multi-database connection support with named connections
- Individual environment variable configuration approach
- Classic ASP modernization workflow tools
- Schema discovery tools (stored procedures, views, triggers)
- Performance analysis tools (index analysis, missing indexes)
- Data pattern analysis tools (lookup tables, audit columns)
- Constraint analysis tools (check constraints, computed columns)
- Windows Authentication (NTLM) support
- Connection pooling and reuse
- Read-only security with query validation
- Comprehensive documentation and configuration examples

### Changed

- Modernized configuration approach with individual variables
- Consolidated test files into `tests/` directory
- Improved documentation structure
- Improved error handling and validation

### Security

- Added `.env` file for secure credential management (development only)
- Implemented read-only query restrictions
- Added automatic result limiting
- Secure credential handling for Windows Authentication

## [1.0.0] - Initial Release

### Added

- Basic MCP server functionality
- Core database tools
- SQL Server connectivity via tedious
- Basic configuration support
