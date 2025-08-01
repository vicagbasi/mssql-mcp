# Enhanced Stored Procedure Tools Documentation

## Overview

The enhanced stored procedure tools provide comprehensive access to SQL Server stored procedure definitions and queries. These tools are designed to give you complete visibility into your stored procedure code, making it easy to analyze, search, and extract the actual SQL queries.

## Available Tools

### 1. `get_stored_procedure_definition`

**Purpose**: Get the complete SQL query/definition of a single stored procedure

**Use Cases**:

- Reviewing the exact SQL code of a specific stored procedure
- Understanding business logic implemented in stored procedures
- Code analysis and documentation
- Debugging stored procedure logic

**Parameters**:

- `procedureName` (required): Name of the stored procedure
- `schema` (optional): Schema name (default: "dbo")
- `connectionString` (optional): Connection string to use
- `connectionName` (optional): Named connection to use
- `formatOutput` (optional): Format the SQL output for better readability (default: true)

**Example Usage**:

```json
{
  "procedureName": "GetCustomerOrders",
  "schema": "sales",
  "formatOutput": true
}
```

### 2. `get_multiple_stored_procedure_definitions`

**Purpose**: Get complete SQL definitions for multiple stored procedures at once

**Use Cases**:

- Bulk analysis of related stored procedures
- Comparing implementations across similar procedures
- Batch extraction for documentation purposes
- Code review of multiple procedures

**Parameters**:

- `procedureNames` (required): Array of stored procedure names
- `schema` (optional): Schema name (default: "dbo")
- `includeMetadata` (optional): Include creation/modification dates (default: true)
- `connectionString` (optional): Connection string to use
- `connectionName` (optional): Named connection to use

**Example Usage**:

```json
{
  "procedureNames": ["GetCustomers", "UpdateCustomer", "DeleteCustomer"],
  "schema": "sales",
  "includeMetadata": true
}
```

### 3. `get_all_stored_procedure_definitions`

**Purpose**: Get complete SQL definitions for all stored procedures in a schema

**Use Cases**:

- Complete schema documentation
- Database migration analysis
- Comprehensive code review
- Business logic inventory

**Parameters**:

- `schema` (optional): Schema name (default: "dbo")
- `includeSystemProcedures` (optional): Include system procedures (default: false)
- `maxResults` (optional): Maximum procedures to return (default: 50, max: 100)
- `connectionString` (optional): Connection string to use
- `connectionName` (optional): Named connection to use

**Example Usage**:

```json
{
  "schema": "sales",
  "includeSystemProcedures": false,
  "maxResults": 50
}
```

### 4. `search_stored_procedures_by_content`

**Purpose**: Search for stored procedures containing specific text or patterns in their SQL definition

**Use Cases**:

- Finding procedures that use specific tables or columns
- Searching for business logic patterns
- Impact analysis for schema changes
- Finding procedures with specific SQL patterns or functions

**Parameters**:

- `searchText` (required): Text or pattern to search for
- `schema` (optional): Schema name (default: "dbo")
- `caseSensitive` (optional): Case sensitive search (default: false)
- `includeDefinitions` (optional): Include full procedure definitions in results (default: false)
- `connectionString` (optional): Connection string to use
- `connectionName` (optional): Named connection to use

**Example Usage**:

```json
{
  "searchText": "Customer",
  "schema": "sales",
  "caseSensitive": false,
  "includeDefinitions": true
}
```

## Technical Implementation Details

### Why `OBJECT_DEFINITION()` is the Best Approach

These tools use SQL Server's `OBJECT_DEFINITION()` function, which is the **optimal approach** for retrieving stored procedure definitions because:

1. **Authentic Source**: Returns the exact source code as stored in the database
2. **Complete**: Includes the entire procedure definition, including all statements
3. **Reliable**: Works consistently across all SQL Server versions
4. **Efficient**: Single function call, no complex parsing required
5. **Secure**: Respects permissions and encryption settings

### Alternative Approaches Considered

- **CREATE/ALTER Scripts**: More complex, requires reverse-engineering, prone to formatting issues
- **sys.sql_modules**: Lower-level, more complex queries needed
- **SSMS Scripting**: External dependency, not programmatically accessible

### Error Handling

The tools handle common scenarios:

- **Procedure Not Found**: Clear error message with procedure name
- **Encrypted Procedures**: Appropriate error message explaining limitation
- **Permission Issues**: SQL Server permission errors are passed through
- **Connection Issues**: Standard connection error handling

### Performance Considerations

- **Batch Operations**: Multiple procedure tool limits results to prevent memory issues
- **Search Operations**: Indexed searches where possible
- **Result Limiting**: Configurable limits to prevent overwhelming responses

## Output Format

All tools return JSON with consistent structure:

```json
{
  "procedureInfo": {
    "schema_name": "dbo",
    "procedure_name": "GetCustomers",
    "full_name": "dbo.GetCustomers",
    "object_type": "SQL_STORED_PROCEDURE"
  },
  "definition": {
    "sql": "CREATE PROCEDURE dbo.GetCustomers...",
    "length_characters": 1542,
    "formatted": true
  },
  "metadata": {
    "retrieved_at": "2025-07-30T10:30:00Z",
    "method_used": "OBJECT_DEFINITION()"
  }
}
```

## Best Practices

1. **Start Small**: Use single procedure tool first, then move to batch operations
2. **Use Search**: Search tool is excellent for impact analysis and finding related procedures
3. **Check Permissions**: Ensure database user has appropriate SELECT permissions
4. **Handle Large Results**: Use maxResults parameter to control output size
5. **Consider Encryption**: Encrypted procedures will return null definitions

## Integration with Existing Tools

These enhanced tools complement your existing schema discovery tools:

- Use `list_stored_procedures` to discover available procedures
- Use `describe_stored_procedure` for parameter information
- Use these new tools for complete SQL definition access

The tools are designed to work seamlessly with your existing connection management and follow the same patterns as your other MCP tools.
