# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
