import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { Connection, Request, TYPES } from "tedious";

/**
 * MSSQL MCP Server
 * 
 * This server provides Model Context Protocol (MCP) tools for interacting with Microsoft SQL Server databases.
 * It exposes schema discovery and data access capabilities through standardized MCP tools.
 */

// Connection management
const connections = new Map<string, Connection>();

// Get default connection string from environment
const defaultConnectionString = process.env.MSSQL_CONNECTION_STRING;

// Helper function to parse connection string into tedious config
function parseConnectionString(connectionString: string, envCredentials?: { username?: string, password?: string, domain?: string }): any {
  const config: any = {
    server: 'localhost',
    options: {
      encrypt: true,
      trustServerCertificate: true,
      enableArithAbort: true
    },
    authentication: {
      type: 'default',
      options: {}
    }
  };

  // Parse connection string
  const parts = connectionString.split(';').filter(part => part.trim());
  
  for (const part of parts) {
    const [key, value] = part.split('=').map(s => s.trim());
    if (!key || !value) continue;
    
    const lowerKey = key.toLowerCase();
    
    switch (lowerKey) {
      case 'server':
      case 'data source':
        config.server = value;
        break;
      case 'database':
      case 'initial catalog':
        config.options.database = value;
        break;
      case 'user id':
      case 'uid':
        config.authentication.options.userName = value;
        break;
      case 'password':
      case 'pwd':
        config.authentication.options.password = value;
        break;
      case 'integrated security':
        if (value.toLowerCase() === 'true' || value.toLowerCase() === 'sspi') {
          config.authentication.type = 'ntlm';
          // Use environment credentials if provided, otherwise rely on current user context
          if (envCredentials?.username) {
            config.authentication.options.userName = envCredentials.username;
          }
          if (envCredentials?.password) {
            config.authentication.options.password = envCredentials.password;
          }
          if (envCredentials?.domain) {
            config.authentication.options.domain = envCredentials.domain;
          }
          // If no credentials provided, remove them to attempt current user authentication
          if (!envCredentials?.username && !envCredentials?.password) {
            delete config.authentication.options.userName;
            delete config.authentication.options.password;
          }
        }
        break;
      case 'encrypt':
        config.options.encrypt = value.toLowerCase() === 'true';
        break;
      case 'trustservercertificate':
        config.options.trustServerCertificate = value.toLowerCase() === 'true';
        break;
    }
  }

  return config;
}

// Helper function to get connection string (use provided or default)
function getConnectionString(providedConnectionString?: string): string {
  const connectionString = providedConnectionString || defaultConnectionString;
  if (!connectionString) {
    throw new Error('No connection string provided and no default connection string configured');
  }
  return connectionString;
}
// Helper function to get or create a connection
async function getConnection(connectionString?: string): Promise<Connection> {
  const actualConnectionString = getConnectionString(connectionString);
  if (connections.has(actualConnectionString)) {
    const connection = connections.get(actualConnectionString)!;
    if (connection.state.name === 'LoggedIn') {
      return connection;
    }
  }

  // Get credentials from environment variables if available
  const envCredentials: { username?: string, password?: string, domain?: string } = {};
  
  if (process.env.MSSQL_USERNAME) {
    envCredentials.username = process.env.MSSQL_USERNAME;
  }
  if (process.env.MSSQL_PASSWORD) {
    envCredentials.password = process.env.MSSQL_PASSWORD;
  }
  if (process.env.MSSQL_DOMAIN) {
    envCredentials.domain = process.env.MSSQL_DOMAIN;
  }

  const config = parseConnectionString(actualConnectionString, envCredentials);
  
  return new Promise((resolve, reject) => {
    const connection = new Connection(config);
    
    connection.on('connect', (err) => {
      if (err) {
        reject(err);
      } else {
        connections.set(actualConnectionString, connection);
        resolve(connection);
      }
    });

    connection.on('error', (err) => {
      connections.delete(actualConnectionString);
      reject(err);
    });

    connection.connect();
  });
}

// Helper function to execute SQL query
async function executeQuery(connection: Connection, sql: string): Promise<any[]> {
  return new Promise((resolve, reject) => {
    const rows: any[] = [];
    
    const request = new Request(sql, (err) => {
      if (err) {
        reject(err);
      } else {
        resolve(rows);
      }
    });

    request.on('row', (columns: any[]) => {
      const row: any = {};
      columns.forEach((column: any) => {
        row[column.metadata.colName] = column.value;
      });
      rows.push(row);
    });

    connection.execSql(request);
  });
}

// Helper function to validate and sanitize SQL queries for read-only access
function validateReadOnlyQuery(query: string): void {
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

// Helper function to add LIMIT to queries
function addLimitToQuery(query: string, limit: number = 20): string {
  const trimmedQuery = query.trim();
  
  // Check if query already has TOP clause
  if (trimmedQuery.toLowerCase().includes('select top')) {
    return trimmedQuery;
  }
  
  // Add TOP clause after SELECT
  return trimmedQuery.replace(/^select\s+/i, `SELECT TOP ${limit} `);
}

// Create MCP server instance
const server = new McpServer({
  name: "mssql-mcp-server",
  version: "1.0.0"
});

// Tool: Test connection
server.registerTool(
  "test_connection",
  {
    title: "Test Connection",
    description: "Test the database connection and return basic server information",
    inputSchema: {
      connectionString: z.string().optional().describe("SQL Server connection string (uses default if not provided)")
    }
  },
  async ({ connectionString }) => {
    try {
      const connection = await getConnection(connectionString);
      const result = await executeQuery(connection, "SELECT @@VERSION as version, @@SERVERNAME as server_name, DB_NAME() as database_name");
      
      return {
        content: [{
          type: "text",
          text: JSON.stringify(result, null, 2)
        }]
      };
    } catch (error: unknown) {
      const err = error as Error;
      return {
        content: [{
          type: "text",
          text: `Error testing connection: ${err.message}`
        }],
        isError: true
      };
    }
  }
);

// Tool: List all databases
server.registerTool(
  "list_databases",
  {
    title: "List Databases",
    description: "List all databases available on the SQL Server instance",
    inputSchema: {
      connectionString: z.string().optional().describe("SQL Server connection string (uses default if not provided)")
    }
  },
  async ({ connectionString }) => {
    try {
      const connection = await getConnection(connectionString);
      const result = await executeQuery(connection, `
        SELECT name, database_id, create_date, collation_name
        FROM sys.databases 
        WHERE state = 0
        ORDER BY name
      `);
      
      return {
        content: [{
          type: "text",
          text: JSON.stringify(result, null, 2)
        }]
      };
    } catch (error: unknown) {
      const err = error as Error;
      return {
        content: [{
          type: "text",
          text: `Error listing databases: ${err.message}`
        }],
        isError: true
      };
    }
  }
);

// Tool: List all tables in a database
server.registerTool(
  "list_tables",
  {
    title: "List Tables",
    description: "List all tables in the connected database",
    inputSchema: {
      connectionString: z.string().optional().describe("SQL Server connection string (uses default if not provided)"),
      schema: z.string().optional().describe("Schema name (default: dbo)")
    }
  },
  async ({ connectionString, schema = "dbo" }) => {
    try {
      const connection = await getConnection(connectionString);
      const result = await executeQuery(connection, `
        SELECT 
          t.TABLE_SCHEMA,
          t.TABLE_NAME,
          t.TABLE_TYPE,
          ISNULL(ep.value, '') as TABLE_DESCRIPTION
        FROM INFORMATION_SCHEMA.TABLES t
        LEFT JOIN sys.tables st ON st.name = t.TABLE_NAME
        LEFT JOIN sys.extended_properties ep ON ep.major_id = st.object_id AND ep.minor_id = 0 AND ep.name = 'MS_Description'
        WHERE t.TABLE_SCHEMA = '${schema}'
        ORDER BY t.TABLE_NAME
      `);
      
      return {
        content: [{
          type: "text",
          text: JSON.stringify(result, null, 2)
        }]
      };
    } catch (error: unknown) {
      const err = error as Error;
      return {
        content: [{
          type: "text",
          text: `Error listing tables: ${err.message}`
        }],
        isError: true
      };
    }
  }
);

// Tool: Get table schema details
server.registerTool(
  "describe_table",
  {
    title: "Describe Table",
    description: "Get detailed schema information for a specific table including columns, data types, and constraints",
    inputSchema: {
      connectionString: z.string().optional().describe("SQL Server connection string (uses default if not provided)"),
      tableName: z.string().describe("Name of the table to describe"),
      schema: z.string().optional().describe("Schema name (default: dbo)")
    }
  },
  async ({ connectionString, tableName, schema = "dbo" }) => {
    try {
      const connection = await getConnection(connectionString);
      
      // Get column information
      const columnsResult = await executeQuery(connection, `
        SELECT 
          c.COLUMN_NAME,
          c.DATA_TYPE,
          c.CHARACTER_MAXIMUM_LENGTH,
          c.NUMERIC_PRECISION,
          c.NUMERIC_SCALE,
          c.IS_NULLABLE,
          c.COLUMN_DEFAULT,
          c.ORDINAL_POSITION,
          ISNULL(ep.value, '') as COLUMN_DESCRIPTION
        FROM INFORMATION_SCHEMA.COLUMNS c
        LEFT JOIN sys.tables t ON t.name = c.TABLE_NAME
        LEFT JOIN sys.columns sc ON sc.object_id = t.object_id AND sc.name = c.COLUMN_NAME
        LEFT JOIN sys.extended_properties ep ON ep.major_id = t.object_id AND ep.minor_id = sc.column_id AND ep.name = 'MS_Description'
        WHERE c.TABLE_SCHEMA = '${schema}' AND c.TABLE_NAME = '${tableName}'
        ORDER BY c.ORDINAL_POSITION
      `);
      
      // Get primary key information
      const pkResult = await executeQuery(connection, `
        SELECT c.COLUMN_NAME
        FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS tc
        JOIN INFORMATION_SCHEMA.CONSTRAINT_COLUMN_USAGE cu ON tc.CONSTRAINT_NAME = cu.CONSTRAINT_NAME
        JOIN INFORMATION_SCHEMA.COLUMNS c ON cu.COLUMN_NAME = c.COLUMN_NAME AND cu.TABLE_NAME = c.TABLE_NAME
        WHERE tc.CONSTRAINT_TYPE = 'PRIMARY KEY' 
          AND tc.TABLE_SCHEMA = '${schema}' 
          AND tc.TABLE_NAME = '${tableName}'
      `);
      
      // Get foreign key information
      const fkResult = await executeQuery(connection, `
        SELECT 
          kcu.COLUMN_NAME,
          kcu.REFERENCED_TABLE_SCHEMA,
          kcu.REFERENCED_TABLE_NAME,
          kcu.REFERENCED_COLUMN_NAME
        FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE kcu
        JOIN INFORMATION_SCHEMA.REFERENTIAL_CONSTRAINTS rc ON kcu.CONSTRAINT_NAME = rc.CONSTRAINT_NAME
        WHERE kcu.TABLE_SCHEMA = '${schema}' AND kcu.TABLE_NAME = '${tableName}'
      `);
      
      const tableInfo = {
        schema: schema,
        tableName: tableName,
        columns: columnsResult,
        primaryKeys: pkResult,
        foreignKeys: fkResult
      };
      
      return {
        content: [{
          type: "text",
          text: JSON.stringify(tableInfo, null, 2)
        }]
      };
    } catch (error: unknown) {
      const err = error as Error;
      return {
        content: [{
          type: "text",
          text: `Error describing table: ${err.message}`
        }],
        isError: true
      };
    }
  }
);

// Tool: Get sample data from a table
server.registerTool(
  "sample_data",
  {
    title: "Sample Table Data",
    description: "Retrieve sample data from a table (top 10 rows by default)",
    inputSchema: {
      connectionString: z.string().optional().describe("SQL Server connection string (uses default if not provided)"),
      tableName: z.string().describe("Name of the table to sample"),
      schema: z.string().optional().describe("Schema name (default: dbo)"),
      limit: z.number().optional().describe("Number of rows to return (default: 10, max: 100)")
    }
  },
  async ({ connectionString, tableName, schema = "dbo", limit = 10 }) => {
    try {
      const actualLimit = Math.min(limit, 100); // Cap at 100 for safety
      const connection = await getConnection(connectionString);
      
      const result = await executeQuery(connection, `SELECT TOP ${actualLimit} * FROM [${schema}].[${tableName}]`);
      
      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            rowCount: result.length,
            data: result
          }, null, 2)
        }]
      };
    } catch (error: unknown) {
      const err = error as Error;
      return {
        content: [{
          type: "text",
          text: `Error retrieving sample data: ${err.message}`
        }],
        isError: true
      };
    }
  }
);

// Tool: Execute custom SQL query (read-only)
server.registerTool(
  "execute_query",
  {
    title: "Execute SQL Query",
    description: "Execute a custom SQL SELECT query with automatic limit (top 20 rows)",
    inputSchema: {
      connectionString: z.string().optional().describe("SQL Server connection string (uses default if not provided)"),
      query: z.string().describe("SQL SELECT query to execute")
    }
  },
  async ({ connectionString, query }) => {
    try {
      // Validate query is read-only
      validateReadOnlyQuery(query);
      
      // Add limit to query
      const limitedQuery = addLimitToQuery(query, 20);
      
      const connection = await getConnection(connectionString);
      const result = await executeQuery(connection, limitedQuery);
      
      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            query: limitedQuery,
            rowCount: result.length,
            data: result
          }, null, 2)
        }]
      };
    } catch (error: unknown) {
      const err = error as Error;
      return {
        content: [{
          type: "text",
          text: `Error executing query: ${err.message}`
        }],
        isError: true
      };
    }
  }
);

// Tool: Get database relationships
server.registerTool(
  "get_relationships",
  {
    title: "Get Table Relationships",
    description: "Get foreign key relationships between tables in the database",
    inputSchema: {
      connectionString: z.string().optional().describe("SQL Server connection string (uses default if not provided)"),
      schema: z.string().optional().describe("Schema name (default: dbo)")
    }
  },
  async ({ connectionString, schema = "dbo" }) => {
    try {
      const connection = await getConnection(connectionString);
      const result = await executeQuery(connection, `
        SELECT 
          fk.name AS CONSTRAINT_NAME,
          tp.name AS PARENT_TABLE,
          cp.name AS PARENT_COLUMN,
          tr.name AS REFERENCED_TABLE,
          cr.name AS REFERENCED_COLUMN,
          fk.delete_referential_action_desc AS DELETE_RULE,
          fk.update_referential_action_desc AS UPDATE_RULE
        FROM sys.foreign_keys fk
        INNER JOIN sys.tables tp ON fk.parent_object_id = tp.object_id
        INNER JOIN sys.tables tr ON fk.referenced_object_id = tr.object_id
        INNER JOIN sys.foreign_key_columns fkc ON fkc.constraint_object_id = fk.object_id
        INNER JOIN sys.columns cp ON fkc.parent_column_id = cp.column_id AND fkc.parent_object_id = cp.object_id
        INNER JOIN sys.columns cr ON fkc.referenced_column_id = cr.column_id AND fkc.referenced_object_id = cr.object_id
        INNER JOIN sys.schemas s ON tp.schema_id = s.schema_id
        WHERE s.name = '${schema}'
        ORDER BY tp.name, fk.name
        `);
      
      return {
        content: [{
          type: "text",
          text: JSON.stringify(result, null, 2)
        }]
      };
    } catch (error: unknown) {
      const err = error as Error;
      return {
        content: [{
          type: "text",
          text: `Error retrieving relationships: ${err.message}`
        }],
        isError: true
      };
    }
  }
);

// Start the server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  
  // Clean up connections on exit
  process.on('SIGINT', async () => {
    console.error('Shutting down server...');
    for (const connection of connections.values()) {
      connection.close();
    }
    process.exit(0);
  });
}

main().catch((error) => {
  console.error('Server failed to start:', error);
  process.exit(1);
});
