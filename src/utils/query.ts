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
}

/**
 * Adds a TOP clause to limit query results
 * @param query - The SQL query to modify
 * @param limit - The maximum number of rows to return (default: 20)
 * @returns The modified query with TOP clause
 */
export function addLimitToQuery(query: string, limit: number = 20): string {
  const trimmedQuery = query.trim();
  
  // Check if query already has TOP clause
  if (trimmedQuery.toLowerCase().includes('select top')) {
    return trimmedQuery;
  }
  
  // Add TOP clause after SELECT
  return trimmedQuery.replace(/^select\s+/i, `SELECT TOP ${limit} `);
}

/**
 * Sanitizes table and schema names to prevent SQL injection
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
  const safeSchema = sanitizeName(schema);
  return `WHERE SCHEMA_NAME(schema_id) = '${safeSchema}'`;
}

/**
 * Builds a safe table reference with schema
 * @param tableName - The table name
 * @param schema - The schema name (default: dbo)
 * @returns A safe table reference string
 */
export function buildTableReference(tableName: string, schema: string = "dbo"): string {
  const safeTable = sanitizeName(tableName);
  const safeSchema = sanitizeName(schema);
  return `[${safeSchema}].[${safeTable}]`;
}
