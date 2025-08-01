/**
 * Enhanced Stored Procedure tools for MSSQL MCP Server
 * These tools provide comprehensive stored procedure analysis and query extraction
 */

import { z } from "zod";
import { ConnectionManager, executeQuery } from "../utils/connection.js";
import { sanitizeName } from "../utils/query.js";
import { McpToolResponse } from "../types/index.js";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

export function registerStoredProcedureTools(server: McpServer, connectionManager: ConnectionManager): void {

  // Tool: Get stored procedure definition (SQL query)
  server.registerTool(
    "get_stored_procedure_definition",
    {
      title: "Get Stored Procedure Definition",
      description: "Get the complete SQL query/definition of a stored procedure - this is the actual source code",
      inputSchema: {
        connectionString: z.string().optional().describe("SQL Server connection string (uses default if not provided)"),
        connectionName: z.string().optional().describe("Named connection to use (e.g., 'production', 'staging')"),
        procedureName: z.string().describe("Name of the stored procedure to get definition for"),
        schema: z.string().optional().describe("Schema name (default: dbo)"),
        formatOutput: z.boolean().optional().describe("Format the SQL output for better readability (default: true)")
      }
    },
    async ({ connectionString, connectionName, procedureName, schema = "dbo", formatOutput = true }): Promise<McpToolResponse> => {
      try {
        const connection = await connectionManager.getConnection(connectionString, connectionName);
        
        // First, verify the procedure exists
        const existsResult = await executeQuery(connection, `
          SELECT 
            SCHEMA_NAME(p.schema_id) as schema_name,
            p.name as procedure_name,
            p.type_desc as object_type,
            p.create_date,
            p.modify_date
          FROM sys.procedures p
          WHERE p.name = '${sanitizeName(procedureName)}' 
            AND SCHEMA_NAME(p.schema_id) = '${sanitizeName(schema)}'
        `);

        if (existsResult.length === 0) {
          return {
            content: [{
              type: "text",
              text: `Stored procedure '${schema}.${procedureName}' not found.`
            }],
            isError: true
          };
        }

        // Get the complete definition using OBJECT_DEFINITION
        const definitionResult = await executeQuery(connection, `
          SELECT 
            OBJECT_DEFINITION(OBJECT_ID('${sanitizeName(schema)}.${sanitizeName(procedureName)}')) as definition,
            LEN(OBJECT_DEFINITION(OBJECT_ID('${sanitizeName(schema)}.${sanitizeName(procedureName)}'))) as definition_length
        `);

        const definition = definitionResult[0]?.definition;
        const definitionLength = definitionResult[0]?.definition_length || 0;

        if (!definition) {
          return {
            content: [{
              type: "text",
              text: `Could not retrieve definition for stored procedure '${schema}.${procedureName}'. This may be an encrypted procedure or system object.`
            }],
            isError: true
          };
        }

        const procedureInfo = existsResult[0];
        
        const result = {
          procedureInfo: {
            ...procedureInfo,
            full_name: `${procedureInfo.schema_name}.${procedureInfo.procedure_name}`
          },
          definition: {
            sql: definition,
            length_characters: definitionLength,
            formatted: formatOutput
          },
          metadata: {
            retrieved_at: new Date().toISOString(),
            method_used: "OBJECT_DEFINITION()"
          }
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
            text: `Error getting stored procedure definition: ${err.message}`
          }],
          isError: true
        };
      }
    }
  );

  // Tool: Get multiple stored procedure definitions
  server.registerTool(
    "get_multiple_stored_procedure_definitions",
    {
      title: "Get Multiple Stored Procedure Definitions",
      description: "Get complete SQL definitions for multiple stored procedures at once",
      inputSchema: {
        connectionString: z.string().optional().describe("SQL Server connection string (uses default if not provided)"),
        connectionName: z.string().optional().describe("Named connection to use (e.g., 'production', 'staging')"),
        procedureNames: z.array(z.string()).describe("Array of stored procedure names to get definitions for"),
        schema: z.string().optional().describe("Schema name (default: dbo)"),
        includeMetadata: z.boolean().optional().describe("Include metadata like creation date, modification date (default: true)")
      }
    },
    async ({ connectionString, connectionName, procedureNames, schema = "dbo", includeMetadata = true }): Promise<McpToolResponse> => {
      try {
        const connection = await connectionManager.getConnection(connectionString, connectionName);
        
        if (procedureNames.length === 0) {
          return {
            content: [{
              type: "text",
              text: "No procedure names provided."
            }],
            isError: true
          };
        }

        // Limit to reasonable number to avoid performance issues
        const maxProcedures = 20;
        const limitedProcedures = procedureNames.slice(0, maxProcedures);
        
        if (procedureNames.length > maxProcedures) {
          console.warn(`Limited request to first ${maxProcedures} procedures out of ${procedureNames.length} requested.`);
        }

        const procedures = [];
        const notFound = [];
        
        for (const procedureName of limitedProcedures) {
          try {
            // Get procedure info and definition
            const combinedResult = await executeQuery(connection, `
              SELECT 
                SCHEMA_NAME(p.schema_id) as schema_name,
                p.name as procedure_name,
                p.type_desc as object_type,
                p.create_date,
                p.modify_date,
                OBJECT_DEFINITION(p.object_id) as definition,
                LEN(OBJECT_DEFINITION(p.object_id)) as definition_length,
                ISNULL(ep.value, '') as description
              FROM sys.procedures p
              LEFT JOIN sys.extended_properties ep ON ep.major_id = p.object_id AND ep.minor_id = 0 AND ep.name = 'MS_Description'
              WHERE p.name = '${sanitizeName(procedureName)}' 
                AND SCHEMA_NAME(p.schema_id) = '${sanitizeName(schema)}'
            `);

            if (combinedResult.length > 0) {
              const proc = combinedResult[0];
              const procedureData: any = {
                name: procedureName,
                full_name: `${proc.schema_name}.${proc.procedure_name}`,
                definition: proc.definition,
                definition_length: proc.definition_length
              };

              if (includeMetadata) {
                procedureData.metadata = {
                  schema_name: proc.schema_name,
                  object_type: proc.object_type,
                  create_date: proc.create_date,
                  modify_date: proc.modify_date,
                  description: proc.description
                };
              }

              procedures.push(procedureData);
            } else {
              notFound.push(procedureName);
            }
          } catch (error) {
            notFound.push(`${procedureName} (error: ${(error as Error).message})`);
          }
        }

        const result = {
          summary: {
            requested: procedureNames.length,
            processed: limitedProcedures.length,
            found: procedures.length,
            not_found: notFound.length
          },
          procedures: procedures,
          not_found: notFound,
          retrieved_at: new Date().toISOString()
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
            text: `Error getting multiple stored procedure definitions: ${err.message}`
          }],
          isError: true
        };
      }
    }
  );

  // Tool: Get all stored procedure definitions in schema
  server.registerTool(
    "get_all_stored_procedure_definitions",
    {
      title: "Get All Stored Procedure Definitions",
      description: "Get complete SQL definitions for all stored procedures in a schema",
      inputSchema: {
        connectionString: z.string().optional().describe("SQL Server connection string (uses default if not provided)"),
        connectionName: z.string().optional().describe("Named connection to use (e.g., 'production', 'staging')"),
        schema: z.string().optional().describe("Schema name (default: dbo)"),
        includeSystemProcedures: z.boolean().optional().describe("Include system stored procedures (default: false)"),
        maxResults: z.number().optional().describe("Maximum number of procedures to return (default: 50, max: 100)")
      }
    },
    async ({ connectionString, connectionName, schema = "dbo", includeSystemProcedures = false, maxResults = 50 }): Promise<McpToolResponse> => {
      try {
        const connection = await connectionManager.getConnection(connectionString, connectionName);
        
        // Limit results to prevent overwhelming responses
        const actualMaxResults = Math.min(maxResults || 50, 100);
        const systemFilter = includeSystemProcedures ? "" : "AND p.is_ms_shipped = 0";
        
        const result = await executeQuery(connection, `
          SELECT TOP ${actualMaxResults}
            SCHEMA_NAME(p.schema_id) as schema_name,
            p.name as procedure_name,
            p.type_desc as object_type,
            p.create_date,
            p.modify_date,
            OBJECT_DEFINITION(p.object_id) as definition,
            LEN(OBJECT_DEFINITION(p.object_id)) as definition_length,
            ISNULL(ep.value, '') as description
          FROM sys.procedures p
          LEFT JOIN sys.extended_properties ep ON ep.major_id = p.object_id AND ep.minor_id = 0 AND ep.name = 'MS_Description'
          WHERE SCHEMA_NAME(p.schema_id) = '${sanitizeName(schema)}' ${systemFilter}
            AND OBJECT_DEFINITION(p.object_id) IS NOT NULL
          ORDER BY p.name
        `);

        const procedures = result.map(proc => ({
          name: proc.procedure_name,
          full_name: `${proc.schema_name}.${proc.procedure_name}`,
          definition: proc.definition,
          metadata: {
            schema_name: proc.schema_name,
            object_type: proc.object_type,
            create_date: proc.create_date,
            modify_date: proc.modify_date,
            description: proc.description,
            definition_length: proc.definition_length
          }
        }));

        const summary = {
          schema: schema,
          total_procedures: procedures.length,
          include_system_procedures: includeSystemProcedures,
          max_results_limit: actualMaxResults,
          retrieved_at: new Date().toISOString()
        };
        
        return {
          content: [{
            type: "text",
            text: JSON.stringify({
              summary,
              procedures
            }, null, 2)
          }]
        };
      } catch (error: unknown) {
        const err = error as Error;
        return {
          content: [{
            type: "text",
            text: `Error getting all stored procedure definitions: ${err.message}`
          }],
          isError: true
        };
      }
    }
  );

  // Tool: Search stored procedures by content
  server.registerTool(
    "search_stored_procedures_by_content",
    {
      title: "Search Stored Procedures by Content",
      description: "Search for stored procedures containing specific text or patterns in their SQL definition",
      inputSchema: {
        connectionString: z.string().optional().describe("SQL Server connection string (uses default if not provided)"),
        connectionName: z.string().optional().describe("Named connection to use (e.g., 'production', 'staging')"),
        searchText: z.string().describe("Text or pattern to search for in procedure definitions"),
        schema: z.string().optional().describe("Schema name (default: dbo)"),
        caseSensitive: z.boolean().optional().describe("Case sensitive search (default: false)"),
        includeDefinitions: z.boolean().optional().describe("Include full procedure definitions in results (default: false)")
      }
    },
    async ({ connectionString, connectionName, searchText, schema = "dbo", caseSensitive = false, includeDefinitions = false }): Promise<McpToolResponse> => {
      try {
        const connection = await connectionManager.getConnection(connectionString, connectionName);
        
        if (!searchText || searchText.trim().length === 0) {
          return {
            content: [{
              type: "text",
              text: "Search text cannot be empty."
            }],
            isError: true
          };
        }

        // Build the search condition based on case sensitivity
        const searchCondition = caseSensitive 
          ? `OBJECT_DEFINITION(p.object_id) LIKE '%${sanitizeName(searchText)}%'`
          : `LOWER(OBJECT_DEFINITION(p.object_id)) LIKE LOWER('%${sanitizeName(searchText)}%')`;

        const definitionColumn = includeDefinitions 
          ? "OBJECT_DEFINITION(p.object_id) as definition,"
          : "";

        const result = await executeQuery(connection, `
          SELECT 
            SCHEMA_NAME(p.schema_id) as schema_name,
            p.name as procedure_name,
            p.type_desc as object_type,
            p.create_date,
            p.modify_date,
            ${definitionColumn}
            LEN(OBJECT_DEFINITION(p.object_id)) as definition_length,
            ISNULL(ep.value, '') as description
          FROM sys.procedures p
          LEFT JOIN sys.extended_properties ep ON ep.major_id = p.object_id AND ep.minor_id = 0 AND ep.name = 'MS_Description'
          WHERE SCHEMA_NAME(p.schema_id) = '${sanitizeName(schema)}'
            AND p.is_ms_shipped = 0
            AND OBJECT_DEFINITION(p.object_id) IS NOT NULL
            AND ${searchCondition}
          ORDER BY p.name
        `);

        const searchResults = {
          search_criteria: {
            search_text: searchText,
            schema: schema,
            case_sensitive: caseSensitive,
            include_definitions: includeDefinitions
          },
          summary: {
            total_matches: result.length,
            searched_at: new Date().toISOString()
          },
          matches: result.map(proc => {
            const match: any = {
              name: proc.procedure_name,
              full_name: `${proc.schema_name}.${proc.procedure_name}`,
              metadata: {
                schema_name: proc.schema_name,
                object_type: proc.object_type,
                create_date: proc.create_date,
                modify_date: proc.modify_date,
                description: proc.description,
                definition_length: proc.definition_length
              }
            };

            if (includeDefinitions) {
              match.definition = proc.definition;
            }

            return match;
          })
        };
        
        return {
          content: [{
            type: "text",
            text: JSON.stringify(searchResults, null, 2)
          }]
        };
      } catch (error: unknown) {
        const err = error as Error;
        return {
          content: [{
            type: "text",
            text: `Error searching stored procedures: ${err.message}`
          }],
          isError: true
        };
      }
    }
  );
}
