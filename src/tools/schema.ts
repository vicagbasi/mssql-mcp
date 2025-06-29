/**
 * Schema discovery tools for MSSQL MCP Server
 * These tools help analyze stored procedures, views, triggers, and other database objects
 */

import { z } from "zod";
import { ConnectionManager, executeQuery } from "../utils/connection.js";
import { sanitizeName } from "../utils/query.js";
import { McpToolResponse } from "../types/index.js";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

export function registerSchemaDiscoveryTools(server: McpServer, connectionManager: ConnectionManager): void {

  // Tool: List stored procedures
  server.registerTool(
    "list_stored_procedures",
    {
      title: "List Stored Procedures",
      description: "List all stored procedures, functions, and their basic information",
      inputSchema: {
        connectionString: z.string().optional().describe("SQL Server connection string (uses default if not provided)"),
        connectionName: z.string().optional().describe("Named connection to use (e.g., 'production', 'staging')"),
        schema: z.string().optional().describe("Schema name (default: dbo)"),
        includeSystemObjects: z.boolean().optional().describe("Include system stored procedures (default: false)")
      }
    },
    async ({ connectionString, connectionName, schema = "dbo", includeSystemObjects = false }): Promise<McpToolResponse> => {
      try {
        const connection = await connectionManager.getConnection(connectionString, connectionName);
        const systemFilter = includeSystemObjects ? "" : "AND p.is_ms_shipped = 0";
        
        const result = await executeQuery(connection, `
          SELECT 
            SCHEMA_NAME(p.schema_id) as SCHEMA_NAME,
            p.name as PROCEDURE_NAME,
            p.type_desc as OBJECT_TYPE,
            p.create_date,
            p.modify_date,
            ISNULL(ep.value, '') as DESCRIPTION
          FROM sys.procedures p
          LEFT JOIN sys.extended_properties ep ON ep.major_id = p.object_id AND ep.minor_id = 0 AND ep.name = 'MS_Description'
          WHERE SCHEMA_NAME(p.schema_id) = '${sanitizeName(schema)}' ${systemFilter}
          ORDER BY p.name
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
            text: `Error listing stored procedures: ${err.message}`
          }],
          isError: true
        };
      }
    }
  );

  // Tool: Describe stored procedure
  server.registerTool(
    "describe_stored_procedure",
    {
      title: "Describe Stored Procedure",
      description: "Get detailed information about a specific stored procedure including parameters and definition",
      inputSchema: {
        connectionString: z.string().optional().describe("SQL Server connection string (uses default if not provided)"),
        connectionName: z.string().optional().describe("Named connection to use (e.g., 'production', 'staging')"),
        procedureName: z.string().describe("Name of the stored procedure to describe"),
        schema: z.string().optional().describe("Schema name (default: dbo)"),
        includeDefinition: z.boolean().optional().describe("Include the procedure definition/body (default: true)")
      }
    },
    async ({ connectionString, connectionName, procedureName, schema = "dbo", includeDefinition = true }): Promise<McpToolResponse> => {
      try {
        const connection = await connectionManager.getConnection(connectionString, connectionName);
        
        // Get procedure parameters
        const parametersResult = await executeQuery(connection, `
          SELECT 
            p.parameter_id,
            p.name as parameter_name,
            TYPE_NAME(p.user_type_id) as data_type,
            p.max_length,
            p.precision,
            p.scale,
            p.is_output,
            p.has_default_value,
            p.default_value
          FROM sys.parameters p
          INNER JOIN sys.procedures pr ON p.object_id = pr.object_id
          WHERE pr.name = '${sanitizeName(procedureName)}' 
            AND SCHEMA_NAME(pr.schema_id) = '${sanitizeName(schema)}'
          ORDER BY p.parameter_id
        `);

        // Get procedure information
        const procedureInfoResult = await executeQuery(connection, `
          SELECT 
            SCHEMA_NAME(p.schema_id) as schema_name,
            p.name as procedure_name,
            p.type_desc as object_type,
            p.create_date,
            p.modify_date,
            ISNULL(ep.value, '') as description
          FROM sys.procedures p
          LEFT JOIN sys.extended_properties ep ON ep.major_id = p.object_id AND ep.minor_id = 0 AND ep.name = 'MS_Description'
          WHERE p.name = '${sanitizeName(procedureName)}' 
            AND SCHEMA_NAME(p.schema_id) = '${sanitizeName(schema)}'
        `);

        let definition = null;
        if (includeDefinition) {
          const definitionResult = await executeQuery(connection, `
            SELECT OBJECT_DEFINITION(OBJECT_ID('${sanitizeName(schema)}.${sanitizeName(procedureName)}')) as definition
          `);
          definition = definitionResult[0]?.definition || null;
        }

        const result = {
          procedureInfo: procedureInfoResult[0] || null,
          parameters: parametersResult,
          definition: definition
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
            text: `Error describing stored procedure: ${err.message}`
          }],
          isError: true
        };
      }
    }
  );

  // Tool: List views
  server.registerTool(
    "list_views",
    {
      title: "List Views",
      description: "List all views in the database with their basic information",
      inputSchema: {
        connectionString: z.string().optional().describe("SQL Server connection string (uses default if not provided)"),
        connectionName: z.string().optional().describe("Named connection to use (e.g., 'production', 'staging')"),
        schema: z.string().optional().describe("Schema name (default: dbo)"),
        includeSystemViews: z.boolean().optional().describe("Include system views (default: false)")
      }
    },
    async ({ connectionString, connectionName, schema = "dbo", includeSystemViews = false }): Promise<McpToolResponse> => {
      try {
        const connection = await connectionManager.getConnection(connectionString, connectionName);
        const systemFilter = includeSystemViews ? "" : "AND v.is_ms_shipped = 0";
        
        const result = await executeQuery(connection, `
          SELECT 
            SCHEMA_NAME(v.schema_id) as SCHEMA_NAME,
            v.name as VIEW_NAME,
            v.create_date,
            v.modify_date,
            ISNULL(ep.value, '') as DESCRIPTION
          FROM sys.views v
          LEFT JOIN sys.extended_properties ep ON ep.major_id = v.object_id AND ep.minor_id = 0 AND ep.name = 'MS_Description'
          WHERE SCHEMA_NAME(v.schema_id) = '${sanitizeName(schema)}' ${systemFilter}
          ORDER BY v.name
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
            text: `Error listing views: ${err.message}`
          }],
          isError: true
        };
      }
    }
  );

  // Tool: Describe view
  server.registerTool(
    "describe_view",
    {
      title: "Describe View",
      description: "Get detailed information about a specific view including its definition and dependencies",
      inputSchema: {
        connectionString: z.string().optional().describe("SQL Server connection string (uses default if not provided)"),
        connectionName: z.string().optional().describe("Named connection to use (e.g., 'production', 'staging')"),
        viewName: z.string().describe("Name of the view to describe"),
        schema: z.string().optional().describe("Schema name (default: dbo)"),
        includeDefinition: z.boolean().optional().describe("Include the view definition (default: true)")
      }
    },
    async ({ connectionString, connectionName, viewName, schema = "dbo", includeDefinition = true }): Promise<McpToolResponse> => {
      try {
        const connection = await connectionManager.getConnection(connectionString, connectionName);
        
        // Get view information
        const viewInfoResult = await executeQuery(connection, `
          SELECT 
            SCHEMA_NAME(v.schema_id) as schema_name,
            v.name as view_name,
            v.create_date,
            v.modify_date,
            ISNULL(ep.value, '') as description
          FROM sys.views v
          LEFT JOIN sys.extended_properties ep ON ep.major_id = v.object_id AND ep.minor_id = 0 AND ep.name = 'MS_Description'
          WHERE v.name = '${sanitizeName(viewName)}' 
            AND SCHEMA_NAME(v.schema_id) = '${sanitizeName(schema)}'
        `);

        // Get view columns
        const columnsResult = await executeQuery(connection, `
          SELECT 
            c.COLUMN_NAME,
            c.DATA_TYPE,
            c.CHARACTER_MAXIMUM_LENGTH,
            c.NUMERIC_PRECISION,
            c.NUMERIC_SCALE,
            c.IS_NULLABLE,
            c.ORDINAL_POSITION
          FROM INFORMATION_SCHEMA.VIEW_COLUMN_USAGE vcu
          INNER JOIN INFORMATION_SCHEMA.COLUMNS c ON c.TABLE_NAME = vcu.VIEW_NAME AND c.TABLE_SCHEMA = vcu.VIEW_SCHEMA
          WHERE vcu.VIEW_NAME = '${sanitizeName(viewName)}' 
            AND vcu.VIEW_SCHEMA = '${sanitizeName(schema)}'
          ORDER BY c.ORDINAL_POSITION
        `);

        let definition = null;
        if (includeDefinition) {
          const definitionResult = await executeQuery(connection, `
            SELECT OBJECT_DEFINITION(OBJECT_ID('${sanitizeName(schema)}.${sanitizeName(viewName)}')) as definition
          `);
          definition = definitionResult[0]?.definition || null;
        }

        const result = {
          viewInfo: viewInfoResult[0] || null,
          columns: columnsResult,
          definition: definition
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
            text: `Error describing view: ${err.message}`
          }],
          isError: true
        };
      }
    }
  );

  // Tool: List triggers
  server.registerTool(
    "list_triggers",
    {
      title: "List Triggers",
      description: "List all triggers in the database with their associated tables",
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
            SCHEMA_NAME(t.schema_id) as TABLE_SCHEMA,
            t.name as TABLE_NAME,
            tr.name as TRIGGER_NAME,
            tr.type_desc as TRIGGER_TYPE,
            tr.create_date,
            tr.modify_date,
            tr.is_disabled,
            CASE 
              WHEN tr.is_instead_of_trigger = 1 THEN 'INSTEAD OF'
              ELSE 'AFTER'
            END as TRIGGER_TIMING,
            ISNULL(ep.value, '') as DESCRIPTION
          FROM sys.triggers tr
          INNER JOIN sys.tables t ON tr.parent_id = t.object_id
          LEFT JOIN sys.extended_properties ep ON ep.major_id = tr.object_id AND ep.minor_id = 0 AND ep.name = 'MS_Description'
          WHERE SCHEMA_NAME(t.schema_id) = '${sanitizeName(schema)}' ${tableFilter}
          ORDER BY t.name, tr.name
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
            text: `Error listing triggers: ${err.message}`
          }],
          isError: true
        };
      }
    }
  );

  // Tool: Describe trigger
  server.registerTool(
    "describe_trigger",
    {
      title: "Describe Trigger",
      description: "Get detailed information about a specific trigger including its definition and events",
      inputSchema: {
        connectionString: z.string().optional().describe("SQL Server connection string (uses default if not provided)"),
        connectionName: z.string().optional().describe("Named connection to use (e.g., 'production', 'staging')"),
        triggerName: z.string().describe("Name of the trigger to describe"),
        includeDefinition: z.boolean().optional().describe("Include the trigger definition (default: true)")
      }
    },
    async ({ connectionString, connectionName, triggerName, includeDefinition = true }): Promise<McpToolResponse> => {
      try {
        const connection = await connectionManager.getConnection(connectionString, connectionName);
        
        // Get trigger information
        const triggerInfoResult = await executeQuery(connection, `
          SELECT 
            tr.name as trigger_name,
            SCHEMA_NAME(t.schema_id) as table_schema,
            t.name as table_name,
            tr.type_desc as trigger_type,
            tr.create_date,
            tr.modify_date,
            tr.is_disabled,
            CASE 
              WHEN tr.is_instead_of_trigger = 1 THEN 'INSTEAD OF'
              ELSE 'AFTER'
            END as trigger_timing,
            ISNULL(ep.value, '') as description
          FROM sys.triggers tr
          INNER JOIN sys.tables t ON tr.parent_id = t.object_id
          LEFT JOIN sys.extended_properties ep ON ep.major_id = tr.object_id AND ep.minor_id = 0 AND ep.name = 'MS_Description'
          WHERE tr.name = '${sanitizeName(triggerName)}'
        `);

        // Get trigger events
        const eventsResult = await executeQuery(connection, `
          SELECT 
            te.type_desc as event_type
          FROM sys.trigger_events te
          INNER JOIN sys.triggers tr ON te.object_id = tr.object_id
          WHERE tr.name = '${sanitizeName(triggerName)}'
        `);

        let definition = null;
        if (includeDefinition && triggerInfoResult.length > 0) {
          const schemaName = triggerInfoResult[0].table_schema;
          const definitionResult = await executeQuery(connection, `
            SELECT OBJECT_DEFINITION(OBJECT_ID('${sanitizeName(schemaName)}.${sanitizeName(triggerName)}')) as definition
          `);
          definition = definitionResult[0]?.definition || null;
        }

        const result = {
          triggerInfo: triggerInfoResult[0] || null,
          events: eventsResult,
          definition: definition
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
            text: `Error describing trigger: ${err.message}`
          }],
          isError: true
        };
      }
    }
  );

  // Tool: List user-defined functions
  server.registerTool(
    "list_functions",
    {
      title: "List User-Defined Functions",
      description: "List all user-defined functions (scalar, table-valued, etc.)",
      inputSchema: {
        connectionString: z.string().optional().describe("SQL Server connection string (uses default if not provided)"),
        connectionName: z.string().optional().describe("Named connection to use (e.g., 'production', 'staging')"),
        schema: z.string().optional().describe("Schema name (default: dbo)"),
        functionType: z.enum(["ALL", "SCALAR", "TABLE_VALUED", "INLINE_TABLE_VALUED"]).optional().describe("Filter by function type (default: ALL)")
      }
    },
    async ({ connectionString, connectionName, schema = "dbo", functionType = "ALL" }): Promise<McpToolResponse> => {
      try {
        const connection = await connectionManager.getConnection(connectionString, connectionName);
        
        let typeFilter = "";
        switch (functionType) {
          case "SCALAR":
            typeFilter = "AND o.type = 'FN'";
            break;
          case "TABLE_VALUED":
            typeFilter = "AND o.type = 'TF'";
            break;
          case "INLINE_TABLE_VALUED":
            typeFilter = "AND o.type = 'IF'";
            break;
        }
        
        const result = await executeQuery(connection, `
          SELECT 
            SCHEMA_NAME(o.schema_id) as SCHEMA_NAME,
            o.name as FUNCTION_NAME,
            CASE o.type 
              WHEN 'FN' THEN 'Scalar Function'
              WHEN 'IF' THEN 'Inline Table-Valued Function'
              WHEN 'TF' THEN 'Table-Valued Function'
              ELSE o.type_desc
            END as FUNCTION_TYPE,
            o.create_date,
            o.modify_date,
            ISNULL(ep.value, '') as DESCRIPTION
          FROM sys.objects o
          LEFT JOIN sys.extended_properties ep ON ep.major_id = o.object_id AND ep.minor_id = 0 AND ep.name = 'MS_Description'
          WHERE o.type IN ('FN', 'IF', 'TF')
            AND SCHEMA_NAME(o.schema_id) = '${sanitizeName(schema)}'
            AND o.is_ms_shipped = 0 ${typeFilter}
          ORDER BY o.name
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
            text: `Error listing functions: ${err.message}`
          }],
          isError: true
        };
      }
    }
  );
}
