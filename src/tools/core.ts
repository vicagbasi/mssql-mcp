/**
 * Core database tools for MSSQL MCP Server
 */

import { z } from "zod";
import { ConnectionManager, executeQuery } from "../utils/connection.js";
import {
  validateReadOnlyQuery,
  addLimitToQuery,
  buildTableReference,
} from "../utils/query.js";
import { McpToolResponse, TableInfo } from "../types/index.js";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

export function registerCoreTools(
  server: McpServer,
  connectionManager: ConnectionManager
): void {
  // Tool: List available connections
  server.registerTool(
    "list_connections",
    {
      title: "List Available Connections",
      description:
        "List all available named database connections configured in the server",
      inputSchema: {},
    },
    async (): Promise<McpToolResponse> => {
      try {
        const namedConnections = connectionManager.getNamedConnections();
        const connectionList = Object.keys(namedConnections).map((name) => ({
          name,
          connectionString: namedConnections[name],
        }));

        const result = {
          defaultConnection: connectionManager.getDefaultConnectionString()
            ? "Available"
            : "Not configured",
          namedConnections: connectionList,
          totalConnections: connectionList.length,
        };

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      } catch (error: unknown) {
        const err = error as Error;
        return {
          content: [
            {
              type: "text",
              text: `Error listing connections: ${err.message}`,
            },
          ],
          isError: true,
        };
      }
    }
  );

  // Tool: Test connection
  server.registerTool(
    "test_connection",
    {
      title: "Test Connection",
      description:
        "Test the database connection and return basic server information",
      inputSchema: {
        connectionString: z
          .string()
          .optional()
          .describe(
            "SQL Server connection string (uses default if not provided)"
          ),
        connectionName: z
          .string()
          .optional()
          .describe("Named connection to use (e.g., 'production', 'staging')"),
      },
    },
    async ({ connectionString, connectionName }): Promise<McpToolResponse> => {
      try {
        const connection = await connectionManager.getConnection(
          connectionString,
          connectionName
        );
        const result = await executeQuery(
          connection,
          "SELECT @@VERSION as version, @@SERVERNAME as server_name, DB_NAME() as database_name"
        );

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      } catch (error: unknown) {
        const err = error as Error;
        return {
          content: [
            {
              type: "text",
              text: `Error testing connection: ${err.message}`,
            },
          ],
          isError: true,
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
        connectionString: z
          .string()
          .optional()
          .describe(
            "SQL Server connection string (uses default if not provided)"
          ),
        connectionName: z
          .string()
          .optional()
          .describe("Named connection to use (e.g., 'production', 'staging')"),
      },
    },
    async ({ connectionString, connectionName }): Promise<McpToolResponse> => {
      try {
        const connection = await connectionManager.getConnection(
          connectionString,
          connectionName
        );
        const result = await executeQuery(
          connection,
          `
          SELECT name, database_id, create_date, collation_name
          FROM sys.databases 
          WHERE state = 0
          ORDER BY name
        `
        );

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      } catch (error: unknown) {
        const err = error as Error;
        return {
          content: [
            {
              type: "text",
              text: `Error listing databases: ${err.message}`,
            },
          ],
          isError: true,
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
        connectionString: z
          .string()
          .optional()
          .describe(
            "SQL Server connection string (uses default if not provided)"
          ),
        connectionName: z
          .string()
          .optional()
          .describe("Named connection to use (e.g., 'production', 'staging')"),
        schema: z.string().optional().describe("Schema name (default: dbo)"),
      },
    },
    async ({
      connectionString,
      connectionName,
      schema = "dbo",
    }): Promise<McpToolResponse> => {
      try {
        const connection = await connectionManager.getConnection(
          connectionString,
          connectionName
        );
        const result = await executeQuery(
          connection,
          `
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
        `
        );

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      } catch (error: unknown) {
        const err = error as Error;
        return {
          content: [
            {
              type: "text",
              text: `Error listing tables: ${err.message}`,
            },
          ],
          isError: true,
        };
      }
    }
  );

  // Tool: Get table schema details
  server.registerTool(
    "describe_table",
    {
      title: "Describe Table",
      description:
        "Get detailed schema information for a specific table including columns, data types, and constraints",
      inputSchema: {
        connectionString: z
          .string()
          .optional()
          .describe(
            "SQL Server connection string (uses default if not provided)"
          ),
        connectionName: z
          .string()
          .optional()
          .describe("Named connection to use (e.g., 'production', 'staging')"),
        tableName: z.string().describe("Name of the table to describe"),
        schema: z.string().optional().describe("Schema name (default: dbo)"),
      },
    },
    async ({
      connectionString,
      connectionName,
      tableName,
      schema = "dbo",
    }): Promise<McpToolResponse> => {
      try {
        const connection = await connectionManager.getConnection(
          connectionString,
          connectionName
        );

        // First check if table exists using a more robust query
        const tableExistsResult = await executeQuery(
          connection,
          `
          SELECT 
            COUNT(*) as table_count,
            MAX(t.TABLE_TYPE) as table_type,
            MAX(t.TABLE_SCHEMA) as actual_schema
          FROM INFORMATION_SCHEMA.TABLES t
          WHERE UPPER(t.TABLE_SCHEMA) = UPPER('${schema.replace(/'/g, "''")}') 
            AND UPPER(t.TABLE_NAME) = UPPER('${tableName.replace(/'/g, "''")}')
        `
        );

        if (tableExistsResult[0]?.table_count === 0) {
          // Try to find similar table names
          const similarTables = await executeQuery(
            connection,
            `
            SELECT TOP 5 
              TABLE_SCHEMA,
              TABLE_NAME,
              TABLE_TYPE
            FROM INFORMATION_SCHEMA.TABLES 
            WHERE TABLE_NAME LIKE '%${tableName.replace(/'/g, "''")}%'
            ORDER BY 
              CASE WHEN UPPER(TABLE_NAME) = UPPER('${tableName.replace(
                /'/g,
                "''"
              )}') THEN 1 ELSE 2 END,
              TABLE_NAME
          `
          );

          let suggestion = "";
          if (similarTables.length > 0) {
            suggestion = `\n\nSimilar tables found:\n${similarTables
              .map(
                (t) => `- ${t.TABLE_SCHEMA}.${t.TABLE_NAME} (${t.TABLE_TYPE})`
              )
              .join("\n")}`;
          }

          return {
            content: [
              {
                type: "text",
                text: `Table '${schema}.${tableName}' does not exist or you don't have permission to access it.${suggestion}`,
              },
            ],
            isError: true,
          };
        }

        // Get enhanced column information with identity and computed column details
        const columnsResult = await executeQuery(
          connection,
          `
          SELECT 
            c.COLUMN_NAME,
            c.DATA_TYPE,
            CASE 
              WHEN c.DATA_TYPE IN ('varchar', 'nvarchar', 'char', 'nchar') 
              THEN c.DATA_TYPE + '(' + 
                CASE WHEN c.CHARACTER_MAXIMUM_LENGTH = -1 THEN 'MAX' 
                     ELSE CAST(c.CHARACTER_MAXIMUM_LENGTH AS VARCHAR(10)) END + ')'
              WHEN c.DATA_TYPE IN ('decimal', 'numeric')
              THEN c.DATA_TYPE + '(' + CAST(c.NUMERIC_PRECISION AS VARCHAR(3)) + ',' + CAST(c.NUMERIC_SCALE AS VARCHAR(3)) + ')'
              WHEN c.DATA_TYPE IN ('float', 'real') AND c.NUMERIC_PRECISION IS NOT NULL
              THEN c.DATA_TYPE + '(' + CAST(c.NUMERIC_PRECISION AS VARCHAR(3)) + ')'
              ELSE c.DATA_TYPE
            END as FULL_DATA_TYPE,
            c.CHARACTER_MAXIMUM_LENGTH,
            c.NUMERIC_PRECISION,
            c.NUMERIC_SCALE,
            c.IS_NULLABLE,
            c.COLUMN_DEFAULT,
            c.ORDINAL_POSITION,
            CASE WHEN sc.is_identity = 1 THEN 'YES' ELSE 'NO' END as IS_IDENTITY,
            CASE WHEN sc.is_computed = 1 THEN 'YES' ELSE 'NO' END as IS_COMPUTED,
            ISNULL(cc.definition, '') as COMPUTED_DEFINITION,
            ISNULL(ep.value, '') as COLUMN_DESCRIPTION
          FROM INFORMATION_SCHEMA.COLUMNS c
          INNER JOIN sys.tables st ON st.name = c.TABLE_NAME AND SCHEMA_NAME(st.schema_id) = c.TABLE_SCHEMA
          INNER JOIN sys.columns sc ON sc.object_id = st.object_id AND sc.name = c.COLUMN_NAME
          LEFT JOIN sys.computed_columns cc ON cc.object_id = st.object_id AND cc.name = c.COLUMN_NAME
          LEFT JOIN sys.extended_properties ep ON ep.major_id = st.object_id AND ep.minor_id = sc.column_id AND ep.name = 'MS_Description'
          WHERE c.TABLE_SCHEMA = '${schema.replace(
            /'/g,
            "''"
          )}' AND c.TABLE_NAME = '${tableName.replace(/'/g, "''")}'
          ORDER BY c.ORDINAL_POSITION
        `
        );

        // Get primary key information with constraint details
        let pkResult = [];
        try {
          pkResult = await executeQuery(
            connection,
            `
            SELECT 
              kcu.COLUMN_NAME,
              tc.CONSTRAINT_NAME,
              kcu.ORDINAL_POSITION
            FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS tc
            JOIN INFORMATION_SCHEMA.KEY_COLUMN_USAGE kcu
              ON tc.CONSTRAINT_NAME = kcu.CONSTRAINT_NAME 
              AND tc.TABLE_SCHEMA = kcu.TABLE_SCHEMA 
              AND tc.TABLE_NAME = kcu.TABLE_NAME
            WHERE tc.CONSTRAINT_TYPE = 'PRIMARY KEY' 
              AND tc.TABLE_SCHEMA = '${schema.replace(/'/g, "''")}' 
              AND tc.TABLE_NAME = '${tableName.replace(/'/g, "''")}'
            ORDER BY kcu.ORDINAL_POSITION
          `
          );
        } catch (error) {
          console.warn("Could not retrieve primary key information:", error);
        }

        // Get foreign key information with detailed relationship info
        let fkResult = [];
        try {
          fkResult = await executeQuery(
            connection,
            `
            SELECT 
              fk.name as CONSTRAINT_NAME,
              COL_NAME(fkc.parent_object_id, fkc.parent_column_id) as COLUMN_NAME,
              SCHEMA_NAME(ro.schema_id) as REFERENCED_TABLE_SCHEMA,
              ro.name as REFERENCED_TABLE_NAME,
              COL_NAME(fkc.referenced_object_id, fkc.referenced_column_id) as REFERENCED_COLUMN_NAME,
              fk.delete_referential_action_desc as DELETE_RULE,
              fk.update_referential_action_desc as UPDATE_RULE,
              fkc.constraint_column_id as ORDINAL_POSITION
            FROM sys.foreign_keys fk
            INNER JOIN sys.foreign_key_columns fkc ON fk.object_id = fkc.constraint_object_id
            INNER JOIN sys.tables pt ON fkc.parent_object_id = pt.object_id
            INNER JOIN sys.tables ro ON fkc.referenced_object_id = ro.object_id
            WHERE pt.name = '${tableName.replace(/'/g, "''")}' 
              AND SCHEMA_NAME(pt.schema_id) = '${schema.replace(/'/g, "''")}'
            ORDER BY fk.name, fkc.constraint_column_id
          `
          );
        } catch (error) {
          console.warn("Could not retrieve foreign key information:", error);
        }

        // Get check constraints
        let checkConstraints = [];
        try {
          checkConstraints = await executeQuery(
            connection,
            `
            SELECT 
              cc.name as CONSTRAINT_NAME,
              cc.definition as CHECK_CLAUSE,
              cc.is_disabled as IS_DISABLED,
              cc.is_not_trusted as IS_NOT_TRUSTED
            FROM sys.check_constraints cc
            INNER JOIN sys.tables t ON cc.parent_object_id = t.object_id
            WHERE t.name = '${tableName.replace(/'/g, "''")}' 
              AND SCHEMA_NAME(t.schema_id) = '${schema.replace(/'/g, "''")}'
            ORDER BY cc.name
          `
          );
        } catch (error) {
          console.warn("Could not retrieve check constraints:", error);
        }

        // Get indexes with better performance information
        let indexes = [];
        try {
          indexes = await executeQuery(
            connection,
            `
            SELECT 
              i.name as INDEX_NAME,
              i.type_desc as INDEX_TYPE,
              i.is_unique as IS_UNIQUE,
              i.is_primary_key as IS_PRIMARY_KEY,
              i.is_unique_constraint as IS_UNIQUE_CONSTRAINT,
              i.fill_factor as FILL_FACTOR,
              STUFF((
                SELECT ', ' + c.name + CASE WHEN ic.is_descending_key = 1 THEN ' DESC' ELSE ' ASC' END
                FROM sys.index_columns ic
                INNER JOIN sys.columns c ON ic.object_id = c.object_id AND ic.column_id = c.column_id
                WHERE ic.object_id = i.object_id AND ic.index_id = i.index_id AND ic.is_included_column = 0
                ORDER BY ic.key_ordinal
                FOR XML PATH('')
              ), 1, 2, '') as KEY_COLUMNS,
              STUFF((
                SELECT ', ' + c.name
                FROM sys.index_columns ic
                INNER JOIN sys.columns c ON ic.object_id = c.object_id AND ic.column_id = c.column_id
                WHERE ic.object_id = i.object_id AND ic.index_id = i.index_id AND ic.is_included_column = 1
                ORDER BY ic.index_column_id
                FOR XML PATH('')
              ), 1, 2, '') as INCLUDED_COLUMNS
            FROM sys.indexes i
            INNER JOIN sys.tables t ON i.object_id = t.object_id
            WHERE t.name = '${tableName.replace(/'/g, "''")}' 
              AND SCHEMA_NAME(t.schema_id) = '${schema.replace(/'/g, "''")}'
              AND i.type > 0
            ORDER BY i.is_primary_key DESC, i.is_unique DESC, i.name
          `
          );
        } catch (error) {
          console.warn("Could not retrieve index information:", error);
        }

        // Get table metadata
        let tableMetadata = {};
        try {
          const metadataResult = await executeQuery(
            connection,
            `
            SELECT 
              t.name as TABLE_NAME,
              SCHEMA_NAME(t.schema_id) as SCHEMA_NAME,
              t.create_date as CREATED_DATE,
              t.modify_date as MODIFIED_DATE,
              p.rows as ROW_COUNT,
              CAST(ROUND(((SUM(a.total_pages) * 8) / 1024.00), 2) AS NUMERIC(36, 2)) as TOTAL_SPACE_MB,
              CAST(ROUND(((SUM(a.used_pages) * 8) / 1024.00), 2) AS NUMERIC(36, 2)) as USED_SPACE_MB,
              ISNULL(ep.value, '') as TABLE_DESCRIPTION
            FROM sys.tables t
            INNER JOIN sys.indexes i ON t.object_id = i.object_id
            INNER JOIN sys.partitions p ON i.object_id = p.object_id AND i.index_id = p.index_id
            INNER JOIN sys.allocation_units a ON p.partition_id = a.container_id
            LEFT JOIN sys.extended_properties ep ON ep.major_id = t.object_id AND ep.minor_id = 0 AND ep.name = 'MS_Description'
            WHERE t.name = '${tableName.replace(/'/g, "''")}' 
              AND SCHEMA_NAME(t.schema_id) = '${schema.replace(/'/g, "''")}'
              AND i.index_id < 2
            GROUP BY t.name, t.schema_id, t.create_date, t.modify_date, p.rows, ep.value
          `
          );
          tableMetadata = metadataResult[0] || {};
        } catch (error) {
          console.warn("Could not retrieve table metadata:", error);
        }

        const tableInfo: TableInfo = {
          schema: schema,
          tableName: tableName,
          columns: columnsResult,
          primaryKeys: pkResult,
          foreignKeys: fkResult,
          checkConstraints: checkConstraints,
          indexes: indexes,
          metadata: tableMetadata,
        };

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(tableInfo, null, 2),
            },
          ],
        };
      } catch (error: unknown) {
        const err = error as Error;
        return {
          content: [
            {
              type: "text",
              text: `Error describing table '${schema}.${tableName}': ${err.message}`,
            },
          ],
          isError: true,
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
        connectionString: z
          .string()
          .optional()
          .describe(
            "SQL Server connection string (uses default if not provided)"
          ),
        connectionName: z
          .string()
          .optional()
          .describe("Named connection to use (e.g., 'production', 'staging')"),
        tableName: z.string().describe("Name of the table to sample"),
        schema: z.string().optional().describe("Schema name (default: dbo)"),
        limit: z
          .number()
          .optional()
          .describe("Number of rows to return (default: 10, max: 100)"),
      },
    },
    async ({
      connectionString,
      connectionName,
      tableName,
      schema = "dbo",
      limit = 10,
    }): Promise<McpToolResponse> => {
      try {
        const actualLimit = Math.min(limit, 100); // Cap at 100 for safety
        const connection = await connectionManager.getConnection(
          connectionString,
          connectionName
        );
        const tableRef = buildTableReference(tableName, schema);

        const result = await executeQuery(
          connection,
          `SELECT TOP ${actualLimit} * FROM ${tableRef}`
        );

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  rowCount: result.length,
                  data: result,
                },
                null,
                2
              ),
            },
          ],
        };
      } catch (error: unknown) {
        const err = error as Error;
        return {
          content: [
            {
              type: "text",
              text: `Error retrieving sample data: ${err.message}`,
            },
          ],
          isError: true,
        };
      }
    }
  );

  // Tool: Execute custom SQL query (read-only)
  server.registerTool(
    "execute_query",
    {
      title: "Execute SQL Query",
      description:
        "Execute a custom SQL SELECT query with automatic limit (top 20 rows)",
      inputSchema: {
        connectionString: z
          .string()
          .optional()
          .describe(
            "SQL Server connection string (uses default if not provided)"
          ),
        connectionName: z
          .string()
          .optional()
          .describe("Named connection to use (e.g., 'production', 'staging')"),
        query: z.string().describe("SQL SELECT query to execute"),
      },
    },
    async ({
      connectionString,
      connectionName,
      query,
    }): Promise<McpToolResponse> => {
      try {
        // Validate query is read-only
        validateReadOnlyQuery(query);

        // Add limit to query
        const limitedQuery = addLimitToQuery(query, 20);

        const connection = await connectionManager.getConnection(
          connectionString,
          connectionName
        );
        const result = await executeQuery(connection, limitedQuery);

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  query: limitedQuery,
                  rowCount: result.length,
                  data: result,
                },
                null,
                2
              ),
            },
          ],
        };
      } catch (error: unknown) {
        const err = error as Error;
        return {
          content: [
            {
              type: "text",
              text: `Error executing query: ${err.message}`,
            },
          ],
          isError: true,
        };
      }
    }
  );

  // Tool: Get database relationships
  server.registerTool(
    "get_relationships",
    {
      title: "Get Table Relationships",
      description:
        "Get foreign key relationships between tables in the database",
      inputSchema: {
        connectionString: z
          .string()
          .optional()
          .describe(
            "SQL Server connection string (uses default if not provided)"
          ),
        connectionName: z
          .string()
          .optional()
          .describe("Named connection to use (e.g., 'production', 'staging')"),
        schema: z.string().optional().describe("Schema name (default: dbo)"),
      },
    },
    async ({
      connectionString,
      connectionName,
      schema = "dbo",
    }): Promise<McpToolResponse> => {
      try {
        const connection = await connectionManager.getConnection(
          connectionString,
          connectionName
        );
        const result = await executeQuery(
          connection,
          `
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
        `
        );

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      } catch (error: unknown) {
        const err = error as Error;
        return {
          content: [
            {
              type: "text",
              text: `Error retrieving relationships: ${err.message}`,
            },
          ],
          isError: true,
        };
      }
    }
  );
}
