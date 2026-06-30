/**
 * Query validation and helper utilities for MSSQL MCP Server
 */

/**
 * Validates and sanitizes SQL queries for read-only access
 * @param query - The SQL query to validate
 * @throws Error if query contains forbidden operations
 */
export function validateReadOnlyQuery(query: string): void {
  const normalizedQuery = query.trim().toLowerCase();

  // Allow only SELECT statements
  if (!normalizedQuery.startsWith('select')) {
    throw new Error('Only SELECT queries are allowed for security reasons');
  }

  if (/[;]|--|\/\*|\*\//.test(normalizedQuery)) {
    throw new Error('Query must be a single SELECT statement without comments');
  }

  // Block potentially dangerous keywords
  const blockedKeywords = [
    'insert', 'update', 'delete', 'drop', 'create', 'alter',
    'truncate', 'exec', 'execute', 'sp_', 'xp_'
  ];

  for (const keyword of blockedKeywords) {
    if (normalizedQuery.includes(keyword)) {
      throw new Error(`Query contains blocked keyword: ${keyword}`);
    }
  }

  const blockedPatterns: Array<[RegExp, string]> = [
    [/\binto\b/, 'into'],
    [/\bopenrowset\b/, 'openrowset'],
    [/\bopendatasource\b/, 'opendatasource'],
    [/\bopenquery\b/, 'openquery'],
    [/\bwaitfor\b/, 'waitfor'],
    [/\buse\b/, 'use'],
    [/\bdeclare\b/, 'declare'],
    [/\bset\b/, 'set'],
    [/\bbackup\b/, 'backup'],
    [/\brestore\b/, 'restore'],
    [/\bgrant\b/, 'grant'],
    [/\brevoke\b/, 'revoke'],
    [/\bdeny\b/, 'deny']
  ];

  for (const [pattern, keyword] of blockedPatterns) {
    if (pattern.test(normalizedQuery)) {
      throw new Error(`Query contains blocked keyword: ${keyword}`);
    }
  }
}

/**
 * Escapes a value for use inside a T-SQL string literal.
 * Prefer parameters for user data where possible; these helpers are for
 * metadata queries that currently build static SQL text.
 */
export function escapeSqlString(value: string): string {
  return value.replace(/'/g, "''");
}

/**
 * Builds a quoted T-SQL string literal.
 */
export function sqlStringLiteral(value: string): string {
  return `'${escapeSqlString(value)}'`;
}

/**
 * Escapes a literal search value for use in a LIKE pattern with ESCAPE '\'.
 */
export function escapeLikePattern(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/%/g, "\\%")
    .replace(/_/g, "\\_")
    .replace(/\[/g, "[[]");
}

/**
 * Builds a quoted LIKE pattern that searches for a literal substring.
 */
export function sqlLikeContainsLiteral(value: string): string {
  return `${sqlStringLiteral(`%${escapeLikePattern(value)}%`)} ESCAPE '\\'`;
}

/**
 * Quotes a single SQL Server identifier part using bracket escaping.
 */
export function quoteIdentifierPart(name: string): string {
  const trimmed = name.trim();

  if (!trimmed) {
    throw new Error("SQL identifier cannot be empty");
  }

  if (/[\u0000-\u001F\u007F]/.test(trimmed)) {
    throw new Error("SQL identifier contains control characters");
  }

  return `[${trimmed.replace(/]/g, "]]")}]`;
}

/**
 * Builds a bounded integer for safe use in TOP and similar numeric clauses.
 */
export function clampSqlInteger(
  value: number,
  min: number,
  max: number,
  fallback: number
): number {
  if (!Number.isFinite(value)) {
    return fallback;
  }

  const integer = Math.trunc(value);
  return Math.min(Math.max(integer, min), max);
}

/**
 * Builds a bounded number for safe use in numeric comparison clauses.
 */
export function clampSqlNumber(
  value: number,
  min: number,
  max: number,
  fallback: number
): number {
  if (!Number.isFinite(value)) {
    return fallback;
  }

  return Math.min(Math.max(value, min), max);
}

/**
 * Adds a TOP clause to limit query results
 * @param query - The SQL query to modify
 * @param limit - The maximum number of rows to return (default: 20)
 * @returns The modified query with TOP clause
 */
export function addLimitToQuery(query: string, limit: number = 20): string {
  const trimmedQuery = query.trim();
  const boundedLimit = clampSqlInteger(limit, 1, 1000, 20);

  // Check if query already has TOP clause
  if (trimmedQuery.toLowerCase().includes('select top')) {
    return trimmedQuery;
  }

  // Add TOP clause after SELECT
  return trimmedQuery.replace(/^select\s+/i, `SELECT TOP ${boundedLimit} `);
}

/**
 * Sanitizes table and schema names to prevent SQL injection
 * @deprecated Use sqlStringLiteral() for string comparisons or
 * quoteIdentifierPart()/buildTableReference() for SQL identifiers.
 * @param name - The name to sanitize
 * @returns The sanitized name
 */
export function sanitizeName(name: string): string {
  // Remove any characters that aren't alphanumeric, underscore, or space
  const sanitized = name.replace(/[^a-zA-Z0-9_\s]/g, '');

  // Trim whitespace
  return sanitized.trim();
}

/**
 * Builds a safe WHERE clause for schema filtering
 * @param schema - The schema name to filter by
 * @returns A safe WHERE clause string
 */
export function buildSchemaFilter(schema: string = "dbo"): string {
  return `WHERE SCHEMA_NAME(schema_id) = ${sqlStringLiteral(schema)}`;
}

/**
 * Builds a safe table reference with schema
 * @param tableName - The table name
 * @param schema - The schema name (default: dbo)
 * @returns A safe table reference string
 */
export function buildTableReference(tableName: string, schema: string = "dbo"): string {
  return `${quoteIdentifierPart(schema)}.${quoteIdentifierPart(tableName)}`;
}

/**
 * Builds a quoted object name literal for functions such as OBJECT_ID().
 */
export function buildObjectNameLiteral(name: string, schema: string = "dbo"): string {
  return sqlStringLiteral(buildTableReference(name, schema));
}
