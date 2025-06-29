/**
 * Constraint and business logic analysis tools for MSSQL MCP Server
 * These tools help identify business rules embedded in database constraints
 */

import { z } from "zod";
import { ConnectionManager, executeQuery } from "../utils/connection.js";
import { sanitizeName } from "../utils/query.js";
import { McpToolResponse } from "../types/index.js";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

export function registerConstraintAnalysisTools(server: McpServer, connectionManager: ConnectionManager): void {

  // Tool: List all constraints
  server.registerTool(
    "list_constraints",
    {
      title: "List All Constraints",
      description: "List all constraints (check, unique, foreign key, etc.) across tables in the database",
      inputSchema: {
        connectionString: z.string().optional().describe("SQL Server connection string (uses default if not provided)"),
        connectionName: z.string().optional().describe("Named connection to use (e.g., 'production', 'staging')"),
        schema: z.string().optional().describe("Schema name (default: dbo)"),
        constraintType: z.enum(["ALL", "CHECK", "UNIQUE", "FOREIGN_KEY", "PRIMARY_KEY", "DEFAULT"]).optional().describe("Filter by constraint type (default: ALL)")
      }
    },
    async ({ connectionString, connectionName, schema = "dbo", constraintType = "ALL" }): Promise<McpToolResponse> => {
      try {
        const connection = await connectionManager.getConnection(connectionString, connectionName);
        
        let typeFilter = "";
        switch (constraintType) {
          case "CHECK":
            typeFilter = "AND tc.CONSTRAINT_TYPE = 'CHECK'";
            break;
          case "UNIQUE":
            typeFilter = "AND tc.CONSTRAINT_TYPE = 'UNIQUE'";
            break;
          case "FOREIGN_KEY":
            typeFilter = "AND tc.CONSTRAINT_TYPE = 'FOREIGN KEY'";
            break;
          case "PRIMARY_KEY":
            typeFilter = "AND tc.CONSTRAINT_TYPE = 'PRIMARY KEY'";
            break;
          case "DEFAULT":
            typeFilter = "AND EXISTS (SELECT 1 FROM sys.default_constraints dc WHERE dc.name = tc.CONSTRAINT_NAME)";
            break;
        }
        
        const result = await executeQuery(connection, `
          SELECT 
            tc.TABLE_SCHEMA,
            tc.TABLE_NAME,
            tc.CONSTRAINT_NAME,
            tc.CONSTRAINT_TYPE,
            STUFF((
              SELECT ', ' + ccu.COLUMN_NAME
              FROM INFORMATION_SCHEMA.CONSTRAINT_COLUMN_USAGE ccu
              WHERE ccu.CONSTRAINT_NAME = tc.CONSTRAINT_NAME
              FOR XML PATH('')
            ), 1, 2, '') as COLUMNS,
            CASE 
              WHEN tc.CONSTRAINT_TYPE = 'CHECK' THEN cc.CHECK_CLAUSE
              WHEN tc.CONSTRAINT_TYPE = 'FOREIGN KEY' THEN 
                kcu.REFERENCED_TABLE_SCHEMA + '.' + kcu.REFERENCED_TABLE_NAME + '(' + kcu.REFERENCED_COLUMN_NAME + ')'
              ELSE NULL
            END as CONSTRAINT_DEFINITION
          FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS tc
          LEFT JOIN INFORMATION_SCHEMA.CHECK_CONSTRAINTS cc ON tc.CONSTRAINT_NAME = cc.CONSTRAINT_NAME
          LEFT JOIN INFORMATION_SCHEMA.KEY_COLUMN_USAGE kcu ON tc.CONSTRAINT_NAME = kcu.CONSTRAINT_NAME
          WHERE tc.TABLE_SCHEMA = '${sanitizeName(schema)}' ${typeFilter}
          ORDER BY tc.TABLE_NAME, tc.CONSTRAINT_TYPE, tc.CONSTRAINT_NAME
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
            text: `Error listing constraints: ${err.message}`
          }],
          isError: true
        };
      }
    }
  );

  // Tool: Analyze check constraints
  server.registerTool(
    "analyze_check_constraints",
    {
      title: "Analyze Check Constraints",
      description: "Extract and analyze business rules from check constraints",
      inputSchema: {
        connectionString: z.string().optional().describe("SQL Server connection string (uses default if not provided)"),
        connectionName: z.string().optional().describe("Named connection to use (e.g., 'production', 'staging')"),
        schema: z.string().optional().describe("Schema name (default: dbo)"),
        tableName: z.string().optional().describe("Filter by specific table name")
      }
    },
    async ({ connectionString, connectionName, schema = "dbo", tableName }): Promise<McpToolResponse> => {
      try {
        const connection = await connectionManager.getConnection(connectionString, connectionName);
        
        const tableFilter = tableName ? `AND t.name = '${sanitizeName(tableName)}'` : "";
        
        const result = await executeQuery(connection, `
          SELECT 
            SCHEMA_NAME(t.schema_id) as table_schema,
            t.name as table_name,
            cc.name as constraint_name,
            cc.definition as check_clause,
            cc.is_disabled,
            cc.is_not_trusted,
            CASE 
              WHEN cc.definition LIKE '%IN (%' THEN 'Enumeration/List Check'
              WHEN cc.definition LIKE '%>%' OR cc.definition LIKE '%<%' THEN 'Range Check'
              WHEN cc.definition LIKE '%LIKE%' THEN 'Pattern/Format Check'
              WHEN cc.definition LIKE '%LEN(%' THEN 'Length Check'
              WHEN cc.definition LIKE '%IS NOT NULL%' THEN 'Not Null Check'
              WHEN cc.definition LIKE '%=%' THEN 'Equality Check'
              ELSE 'Complex Business Rule'
            END as constraint_category,
            STUFF((
              SELECT ', ' + c.name
              FROM sys.check_constraints cc_inner
              CROSS APPLY sys.split(cc_inner.definition, '[') s1
              CROSS APPLY sys.split(s1.value, ']') s2
              INNER JOIN sys.columns c ON c.object_id = cc_inner.parent_object_id AND c.name = s2.value
              WHERE cc_inner.object_id = cc.object_id
              FOR XML PATH('')
            ), 1, 2, '') as affected_columns
          FROM sys.check_constraints cc
          INNER JOIN sys.tables t ON cc.parent_object_id = t.object_id
          WHERE SCHEMA_NAME(t.schema_id) = '${sanitizeName(schema)}' ${tableFilter}
          ORDER BY t.name, cc.name
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
            text: `Error analyzing check constraints: ${err.message}`
          }],
          isError: true
        };
      }
    }
  );

  // Tool: List user-defined data types
  server.registerTool(
    "list_user_defined_types",
    {
      title: "List User-Defined Data Types",
      description: "List all user-defined data types and their definitions",
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
            SCHEMA_NAME(t.schema_id) as schema_name,
            t.name as type_name,
            st.name as base_type,
            t.max_length,
            t.precision,
            t.scale,
            t.is_nullable,
            dc.definition as default_value,
            cc.definition as check_constraint,
            t.is_user_defined
          FROM sys.types t
          INNER JOIN sys.types st ON t.system_type_id = st.system_type_id AND st.user_type_id = st.system_type_id
          LEFT JOIN sys.default_constraints dc ON t.default_object_id = dc.object_id
          LEFT JOIN sys.check_constraints cc ON t.rule_object_id = cc.object_id
          WHERE t.is_user_defined = 1
            AND SCHEMA_NAME(t.schema_id) = '${sanitizeName(schema)}'
          ORDER BY t.name
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
            text: `Error listing user-defined types: ${err.message}`
          }],
          isError: true
        };
      }
    }
  );

  // Tool: Find computed columns
  server.registerTool(
    "find_computed_columns",
    {
      title: "Find Computed Columns",
      description: "List computed columns and their formulas to understand derived business logic",
      inputSchema: {
        connectionString: z.string().optional().describe("SQL Server connection string (uses default if not provided)"),
        connectionName: z.string().optional().describe("Named connection to use (e.g., 'production', 'staging')"),
        schema: z.string().optional().describe("Schema name (default: dbo)"),
        tableName: z.string().optional().describe("Filter by specific table name")
      }
    },
    async ({ connectionString, connectionName, schema = "dbo", tableName }): Promise<McpToolResponse> => {
      try {
        const connection = await connectionManager.getConnection(connectionString, connectionName);
        
        const tableFilter = tableName ? `AND t.name = '${sanitizeName(tableName)}'` : "";
        
        const result = await executeQuery(connection, `
          SELECT 
            SCHEMA_NAME(t.schema_id) as table_schema,
            t.name as table_name,
            c.name as column_name,
            TYPE_NAME(c.user_type_id) as data_type,
            c.max_length,
            c.precision,
            c.scale,
            cc.definition as computed_formula,
            c.is_persisted,
            c.is_nullable,
            CASE 
              WHEN cc.definition LIKE '%+%' OR cc.definition LIKE '%-%' OR cc.definition LIKE '%*%' OR cc.definition LIKE '%/%' THEN 'Mathematical Calculation'
              WHEN cc.definition LIKE '%CONCAT%' OR cc.definition LIKE '%+%' AND TYPE_NAME(c.user_type_id) LIKE '%char%' THEN 'String Concatenation'
              WHEN cc.definition LIKE '%CASE%' THEN 'Conditional Logic'
              WHEN cc.definition LIKE '%ISNULL%' OR cc.definition LIKE '%COALESCE%' THEN 'Null Handling'
              WHEN cc.definition LIKE '%CONVERT%' OR cc.definition LIKE '%CAST%' THEN 'Data Type Conversion'
              WHEN cc.definition LIKE '%GETDATE%' OR cc.definition LIKE '%DATEADD%' OR cc.definition LIKE '%DATEDIFF%' THEN 'Date Calculation'
              ELSE 'Other Business Logic'
            END as formula_category
          FROM sys.computed_columns cc
          INNER JOIN sys.columns c ON cc.object_id = c.object_id AND cc.column_id = c.column_id
          INNER JOIN sys.tables t ON c.object_id = t.object_id
          WHERE SCHEMA_NAME(t.schema_id) = '${sanitizeName(schema)}' ${tableFilter}
          ORDER BY t.name, c.name
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
            text: `Error finding computed columns: ${err.message}`
          }],
          isError: true
        };
      }
    }
  );

  // Tool: List default constraints
  server.registerTool(
    "list_default_constraints",
    {
      title: "List Default Constraints",
      description: "List all default value constraints and their definitions",
      inputSchema: {
        connectionString: z.string().optional().describe("SQL Server connection string (uses default if not provided)"),
        connectionName: z.string().optional().describe("Named connection to use (e.g., 'production', 'staging')"),
        schema: z.string().optional().describe("Schema name (default: dbo)"),
        tableName: z.string().optional().describe("Filter by specific table name")
      }
    },
    async ({ connectionString, connectionName, schema = "dbo", tableName }): Promise<McpToolResponse> => {
      try {
        const connection = await connectionManager.getConnection(connectionString, connectionName);
        
        const tableFilter = tableName ? `AND t.name = '${sanitizeName(tableName)}'` : "";
        
        const result = await executeQuery(connection, `
          SELECT 
            SCHEMA_NAME(t.schema_id) as table_schema,
            t.name as table_name,
            c.name as column_name,
            TYPE_NAME(c.user_type_id) as data_type,
            dc.name as constraint_name,
            dc.definition as default_value,
            CASE 
              WHEN dc.definition LIKE '%GETDATE%' OR dc.definition LIKE '%GETUTCDATE%' THEN 'Current Date/Time'
              WHEN dc.definition LIKE '%NEWID%' THEN 'GUID Generation'
              WHEN dc.definition LIKE '%USER%' OR dc.definition LIKE '%SUSER%' THEN 'Current User'
              WHEN dc.definition LIKE '%(0)%' OR dc.definition = '0' THEN 'Zero Default'
              WHEN dc.definition LIKE '%''''%' THEN 'String Literal'
              WHEN dc.definition LIKE '%(1)%' OR dc.definition = '1' THEN 'One/True Default'
              ELSE 'Other Default'
            END as default_category
          FROM sys.default_constraints dc
          INNER JOIN sys.columns c ON dc.parent_object_id = c.object_id AND dc.parent_column_id = c.column_id
          INNER JOIN sys.tables t ON c.object_id = t.object_id
          WHERE SCHEMA_NAME(t.schema_id) = '${sanitizeName(schema)}' ${tableFilter}
          ORDER BY t.name, c.name
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
            text: `Error listing default constraints: ${err.message}`
          }],
          isError: true
        };
      }
    }
  );
}
