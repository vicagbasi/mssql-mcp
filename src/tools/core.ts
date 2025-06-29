/**
 * Core database tools for MSSQL MCP Server
 */

import { z } from "zod";
import { ConnectionManager, executeQuery } from "../utils/connection.js";
import { validateReadOnlyQuery, addLimitToQuery, buildTableReference } from "../utils/query.js";
import { McpToolResponse, TableInfo } from "../types/index.js";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

export function registerCoreTools(server: McpServer, connectionManager: ConnectionManager): void {
  
  // Tool: List available connections
  server.registerTool(
    "list_connections",
    {
      title: "List Available Connections",
      description: "List all available named database connections configured in the server",
      inputSchema: {}
    },
    async (): Promise<McpToolResponse> => {
      try {
        const namedConnections = connectionManager.getNamedConnections();
        const connectionList = Object.keys(namedConnections).map(name => ({
          name,
          connectionString: namedConnections[name]
        }));
        
        const result = {
          defaultConnection: connectionManager.getDefaultConnectionString() ? "Available" : "Not configured",
          namedConnections: connectionList,
          totalConnections: connectionList.length
        };
        
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
            text: `Error listing connections: ${err.message}`
          }],
          isError: true
        };
      }
    }
  );

  // Tool: Test connection
  server.registerTool(
    "test_connection",
    {
      title: "Test Connection",
      description: "Test the database connection and return basic server information",
      inputSchema: {
        connectionString: z.string().optional().describe("SQL Server connection string (uses default if not provided)"),
        connectionName: z.string().optional().describe("Named connection to use (e.g., 'production', 'staging')")
      }
    },
    async ({ connectionString, connectionName }): Promise<McpToolResponse> => {
      try {
        const connection = await connectionManager.getConnection(connectionString, connectionName);
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
        connectionString: z.string().optional().describe("SQL Server connection string (uses default if not provided)"),
        connectionName: z.string().optional().describe("Named connection to use (e.g., 'production', 'staging')")
      }
    },
    async ({ connectionString, connectionName }): Promise<McpToolResponse> => {
      try {
        const connection = await connectionManager.getConnection(connectionString, connectionName);
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
        connectionName: z.string().optional().describe("Named connection to use (e.g., 'production', 'staging')"),
        schema: z.string().optional().describe("Schema name (default: dbo)")
      }
    },
    async ({ connectionString, connectionName, schema = "dbo" }): Promise<McpToolResponse> => {
      try {
        const connection = await connectionManager.getConnection(connectionString, connectionName);
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
        connectionName: z.string().optional().describe("Named connection to use (e.g., 'production', 'staging')"),
        tableName: z.string().describe("Name of the table to describe"),
        schema: z.string().optional().describe("Schema name (default: dbo)")
      }
    },
    async ({ connectionString, connectionName, tableName, schema = "dbo" }): Promise<McpToolResponse> => {
      try {
        const connection = await connectionManager.getConnection(connectionString, connectionName);
        
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
        
        const tableInfo: TableInfo = {
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
        connectionName: z.string().optional().describe("Named connection to use (e.g., 'production', 'staging')"),
        tableName: z.string().describe("Name of the table to sample"),
        schema: z.string().optional().describe("Schema name (default: dbo)"),
        limit: z.number().optional().describe("Number of rows to return (default: 10, max: 100)")
      }
    },
    async ({ connectionString, connectionName, tableName, schema = "dbo", limit = 10 }): Promise<McpToolResponse> => {
      try {
        const actualLimit = Math.min(limit, 100); // Cap at 100 for safety
        const connection = await connectionManager.getConnection(connectionString, connectionName);
        const tableRef = buildTableReference(tableName, schema);
        
        const result = await executeQuery(connection, `SELECT TOP ${actualLimit} * FROM ${tableRef}`);
        
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
        connectionName: z.string().optional().describe("Named connection to use (e.g., 'production', 'staging')"),
        query: z.string().describe("SQL SELECT query to execute")
      }
    },
    async ({ connectionString, connectionName, query }): Promise<McpToolResponse> => {
      try {
        // Validate query is read-only
        validateReadOnlyQuery(query);
        
        // Add limit to query
        const limitedQuery = addLimitToQuery(query, 20);
        
        const connection = await connectionManager.getConnection(connectionString, connectionName);
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
        connectionName: z.string().optional().describe("Named connection to use (e.g., 'production', 'staging')"),
        schema: z.string().optional().describe("Schema name (default: dbo)")
      }
    },
    async ({ connectionString, connectionName, schema = "dbo" }): Promise<McpToolResponse> => {
      try {
        const connection = await connectionManager.getConnection(connectionString, connectionName);
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
}
