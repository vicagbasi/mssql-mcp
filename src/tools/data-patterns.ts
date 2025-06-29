/**
 * Data pattern analysis tools for MSSQL MCP Server
 * These tools help identify data patterns, lookup tables, and audit trails
 */

import { z } from "zod";
import { ConnectionManager, executeQuery } from "../utils/connection.js";
import { sanitizeName, buildTableReference } from "../utils/query.js";
import { McpToolResponse } from "../types/index.js";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

export function registerDataPatternTools(server: McpServer, connectionManager: ConnectionManager): void {

  // Tool: Analyze data distribution
  server.registerTool(
    "analyze_data_distribution",
    {
      title: "Analyze Data Distribution",
      description: "Get data distribution patterns for columns to understand data quality and patterns",
      inputSchema: {
        connectionString: z.string().optional().describe("SQL Server connection string (uses default if not provided)"),
        connectionName: z.string().optional().describe("Named connection to use (e.g., 'production', 'staging')"),
        tableName: z.string().describe("Name of the table to analyze"),
        schema: z.string().optional().describe("Schema name (default: dbo)"),
        columnName: z.string().optional().describe("Specific column to analyze (analyzes all if not provided)"),
        sampleSize: z.number().optional().describe("Sample size for analysis (default: 1000)")
      }
    },
    async ({ connectionString, connectionName, tableName, schema = "dbo", columnName, sampleSize = 1000 }): Promise<McpToolResponse> => {
      try {
        const connection = await connectionManager.getConnection(connectionString, connectionName);
        const tableRef = buildTableReference(tableName, schema);
        
        let columns = [];
        if (columnName) {
          columns.push(sanitizeName(columnName));
        } else {
          // Get all columns for the table
          const columnsResult = await executeQuery(connection, `
            SELECT COLUMN_NAME 
            FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_SCHEMA = '${sanitizeName(schema)}' 
              AND TABLE_NAME = '${sanitizeName(tableName)}'
              AND DATA_TYPE IN ('varchar', 'nvarchar', 'char', 'nchar', 'text', 'ntext', 'int', 'bigint', 'smallint', 'tinyint', 'decimal', 'numeric', 'float', 'real', 'bit', 'datetime', 'date')
            ORDER BY ORDINAL_POSITION
          `);
          columns = columnsResult.map(row => row.COLUMN_NAME);
        }

        const results = [];
        
        for (const col of columns.slice(0, 10)) { // Limit to 10 columns for performance
          const analysis = await executeQuery(connection, `
            SELECT TOP 1
              '${col}' as column_name,
              COUNT(*) as total_rows,
              COUNT(DISTINCT [${col}]) as distinct_values,
              COUNT([${col}]) as non_null_count,
              COUNT(*) - COUNT([${col}]) as null_count,
              CAST(COUNT([${col}]) * 100.0 / COUNT(*) AS DECIMAL(5,2)) as non_null_percentage,
              CAST(COUNT(DISTINCT [${col}]) * 100.0 / COUNT([${col}]) AS DECIMAL(5,2)) as uniqueness_percentage
            FROM (SELECT TOP ${sampleSize} [${col}] FROM ${tableRef}) sample
          `);

          const topValues = await executeQuery(connection, `
            SELECT TOP 10
              [${col}] as value,
              COUNT(*) as frequency,
              CAST(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM (SELECT TOP ${sampleSize} [${col}] FROM ${tableRef} WHERE [${col}] IS NOT NULL) s) AS DECIMAL(5,2)) as percentage
            FROM (SELECT TOP ${sampleSize} [${col}] FROM ${tableRef} WHERE [${col}] IS NOT NULL) sample
            GROUP BY [${col}]
            ORDER BY COUNT(*) DESC
          `);

          results.push({
            column_analysis: analysis[0],
            top_values: topValues
          });
        }
        
        return {
          content: [{
            type: "text",
            text: JSON.stringify({
              table: `${schema}.${tableName}`,
              sample_size: sampleSize,
              analysis: results
            }, null, 2)
          }]
        };
      } catch (error: unknown) {
        const err = error as Error;
        return {
          content: [{
            type: "text",
            text: `Error analyzing data distribution: ${err.message}`
          }],
          isError: true
        };
      }
    }
  );

  // Tool: Find lookup tables
  server.registerTool(
    "find_lookup_tables",
    {
      title: "Find Lookup Tables",
      description: "Identify reference/lookup tables automatically based on table patterns",
      inputSchema: {
        connectionString: z.string().optional().describe("SQL Server connection string (uses default if not provided)"),
        connectionName: z.string().optional().describe("Named connection to use (e.g., 'production', 'staging')"),
        schema: z.string().optional().describe("Schema name (default: dbo)"),
        maxRows: z.number().optional().describe("Maximum rows to consider as lookup table (default: 1000)")
      }
    },
    async ({ connectionString, connectionName, schema = "dbo", maxRows = 1000 }): Promise<McpToolResponse> => {
      try {
        const connection = await connectionManager.getConnection(connectionString, connectionName);
        
        const result = await executeQuery(connection, `
          WITH TableStats AS (
            SELECT 
              t.name as table_name,
              SUM(p.rows) as row_count,
              COUNT(c.column_id) as column_count,
              COUNT(CASE WHEN c.name LIKE '%id' OR c.name LIKE '%code' THEN 1 END) as id_columns,
              COUNT(CASE WHEN c.name LIKE '%name' OR c.name LIKE '%desc%' OR c.name LIKE '%title' THEN 1 END) as description_columns,
              COUNT(CASE WHEN pk.column_id IS NOT NULL THEN 1 END) as pk_columns
            FROM sys.tables t
            INNER JOIN sys.columns c ON t.object_id = c.object_id
            INNER JOIN sys.partitions p ON t.object_id = p.object_id AND p.index_id < 2
            LEFT JOIN sys.index_columns pk ON c.object_id = pk.object_id AND c.column_id = pk.column_id 
              AND EXISTS(SELECT 1 FROM sys.indexes i WHERE i.object_id = pk.object_id AND i.index_id = pk.index_id AND i.is_primary_key = 1)
            WHERE SCHEMA_NAME(t.schema_id) = '${sanitizeName(schema)}'
            GROUP BY t.name, t.object_id
          ),
          ForeignKeyRefs AS (
            SELECT 
              t.name as table_name,
              COUNT(*) as referenced_by_count
            FROM sys.tables t
            INNER JOIN sys.foreign_keys fk ON t.object_id = fk.referenced_object_id
            WHERE SCHEMA_NAME(t.schema_id) = '${sanitizeName(schema)}'
            GROUP BY t.name
          )
          SELECT 
            ts.table_name,
            ts.row_count,
            ts.column_count,
            ts.id_columns,
            ts.description_columns,
            ts.pk_columns,
            ISNULL(fkr.referenced_by_count, 0) as referenced_by_count,
            CASE 
              WHEN ts.row_count <= ${maxRows} 
                AND ts.column_count <= 10 
                AND ts.id_columns >= 1 
                AND ts.description_columns >= 1 
                AND ISNULL(fkr.referenced_by_count, 0) > 0
              THEN 'High Confidence Lookup'
              WHEN ts.row_count <= ${maxRows} 
                AND (ts.id_columns >= 1 OR ts.description_columns >= 1)
                AND ISNULL(fkr.referenced_by_count, 0) > 0
              THEN 'Likely Lookup'
              WHEN ts.row_count <= ${maxRows} 
                AND ts.column_count <= 5
              THEN 'Possible Lookup'
              ELSE 'Unlikely Lookup'
            END as lookup_confidence,
            CASE
              WHEN ts.table_name LIKE '%type%' OR ts.table_name LIKE '%category%' THEN 'Type/Category'
              WHEN ts.table_name LIKE '%status%' OR ts.table_name LIKE '%state%' THEN 'Status/State'
              WHEN ts.table_name LIKE '%code%' OR ts.table_name LIKE '%lookup%' THEN 'Code/Lookup'
              WHEN ts.table_name LIKE '%ref%' OR ts.table_name LIKE '%reference%' THEN 'Reference'
              ELSE 'Generic'
            END as lookup_type
          FROM TableStats ts
          LEFT JOIN ForeignKeyRefs fkr ON ts.table_name = fkr.table_name
          WHERE ts.row_count <= ${maxRows * 2} -- Include some larger tables for analysis
          ORDER BY 
            CASE 
              WHEN CASE 
                WHEN ts.row_count <= ${maxRows} 
                  AND ts.column_count <= 10 
                  AND ts.id_columns >= 1 
                  AND ts.description_columns >= 1 
                  AND ISNULL(fkr.referenced_by_count, 0) > 0
                THEN 'High Confidence Lookup'
                WHEN ts.row_count <= ${maxRows} 
                  AND (ts.id_columns >= 1 OR ts.description_columns >= 1)
                  AND ISNULL(fkr.referenced_by_count, 0) > 0
                THEN 'Likely Lookup'
                WHEN ts.row_count <= ${maxRows} 
                  AND ts.column_count <= 5
                THEN 'Possible Lookup'
                ELSE 'Unlikely Lookup'
              END = 'High Confidence Lookup' THEN 1
              WHEN CASE 
                WHEN ts.row_count <= ${maxRows} 
                  AND ts.column_count <= 10 
                  AND ts.id_columns >= 1 
                  AND ts.description_columns >= 1 
                  AND ISNULL(fkr.referenced_by_count, 0) > 0
                THEN 'High Confidence Lookup'
                WHEN ts.row_count <= ${maxRows} 
                  AND (ts.id_columns >= 1 OR ts.description_columns >= 1)
                  AND ISNULL(fkr.referenced_by_count, 0) > 0
                THEN 'Likely Lookup'
                WHEN ts.row_count <= ${maxRows} 
                  AND ts.column_count <= 5
                THEN 'Possible Lookup'
                ELSE 'Unlikely Lookup'
              END = 'Likely Lookup' THEN 2
              WHEN CASE 
                WHEN ts.row_count <= ${maxRows} 
                  AND ts.column_count <= 10 
                  AND ts.id_columns >= 1 
                  AND ts.description_columns >= 1 
                  AND ISNULL(fkr.referenced_by_count, 0) > 0
                THEN 'High Confidence Lookup'
                WHEN ts.row_count <= ${maxRows} 
                  AND (ts.id_columns >= 1 OR ts.description_columns >= 1)
                  AND ISNULL(fkr.referenced_by_count, 0) > 0
                THEN 'Likely Lookup'
                WHEN ts.row_count <= ${maxRows} 
                  AND ts.column_count <= 5
                THEN 'Possible Lookup'
                ELSE 'Unlikely Lookup'
              END = 'Possible Lookup' THEN 3
              ELSE 4
            END,
            fkr.referenced_by_count DESC,
            ts.row_count
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
            text: `Error finding lookup tables: ${err.message}`
          }],
          isError: true
        };
      }
    }
  );

  // Tool: Analyze null patterns
  server.registerTool(
    "analyze_null_patterns",
    {
      title: "Analyze NULL Patterns",
      description: "Find columns with high null percentages and analyze null patterns",
      inputSchema: {
        connectionString: z.string().optional().describe("SQL Server connection string (uses default if not provided)"),
        connectionName: z.string().optional().describe("Named connection to use (e.g., 'production', 'staging')"),
        schema: z.string().optional().describe("Schema name (default: dbo)"),
        minNullPercentage: z.number().optional().describe("Minimum null percentage to include (default: 10)")
      }
    },
    async ({ connectionString, connectionName, schema = "dbo", minNullPercentage = 10 }): Promise<McpToolResponse> => {
      try {
        const connection = await connectionManager.getConnection(connectionString, connectionName);
        
        const result = await executeQuery(connection, `
          SELECT 
            t.name as table_name,
            c.name as column_name,
            TYPE_NAME(c.user_type_id) as data_type,
            c.is_nullable,
            p.rows as total_rows,
            CAST((p.rows - COUNT_BIG(CASE WHEN c.name IS NOT NULL THEN 1 END)) * 100.0 / NULLIF(p.rows, 0) AS DECIMAL(5,2)) as estimated_null_percentage,
            CASE 
              WHEN c.name LIKE '%date%' OR c.name LIKE '%time%' THEN 'Date/Time Field'
              WHEN c.name LIKE '%desc%' OR c.name LIKE '%comment%' OR c.name LIKE '%note%' THEN 'Optional Description'
              WHEN c.name LIKE '%phone%' OR c.name LIKE '%email%' OR c.name LIKE '%fax%' THEN 'Contact Information'
              WHEN c.name LIKE '%address%' OR c.name LIKE '%city%' OR c.name LIKE '%zip%' THEN 'Address Information'
              WHEN c.name LIKE '%middle%' OR c.name LIKE '%suffix%' OR c.name LIKE '%prefix%' THEN 'Optional Name Parts'
              ELSE 'Other'
            END as field_category
          FROM sys.tables t
          INNER JOIN sys.columns c ON t.object_id = c.object_id
          INNER JOIN sys.partitions p ON t.object_id = p.object_id AND p.index_id < 2
          WHERE SCHEMA_NAME(t.schema_id) = '${sanitizeName(schema)}'
            AND c.is_nullable = 1
            AND p.rows > 0
          GROUP BY t.name, c.name, c.user_type_id, c.is_nullable, p.rows
          HAVING CAST((p.rows - COUNT_BIG(CASE WHEN c.name IS NOT NULL THEN 1 END)) * 100.0 / NULLIF(p.rows, 0) AS DECIMAL(5,2)) >= ${minNullPercentage}
          ORDER BY estimated_null_percentage DESC, t.name, c.name
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
            text: `Error analyzing null patterns: ${err.message}`
          }],
          isError: true
        };
      }
    }
  );

  // Tool: Detect audit columns
  server.registerTool(
    "detect_audit_columns",
    {
      title: "Detect Audit Columns",
      description: "Identify common audit trail patterns (created/modified dates, user tracking)",
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
            t.name as table_name,
            c.name as column_name,
            TYPE_NAME(c.user_type_id) as data_type,
            c.is_nullable,
            dc.definition as default_value,
            CASE 
              WHEN c.name LIKE '%created%date%' OR c.name LIKE '%create%date%' OR c.name LIKE 'date%created%' THEN 'Created Date'
              WHEN c.name LIKE '%modified%date%' OR c.name LIKE '%update%date%' OR c.name LIKE 'date%modified%' OR c.name LIKE 'date%updated%' THEN 'Modified Date'
              WHEN c.name LIKE '%created%by%' OR c.name LIKE '%create%by%' THEN 'Created By User'
              WHEN c.name LIKE '%modified%by%' OR c.name LIKE '%update%by%' OR c.name LIKE '%updated%by%' THEN 'Modified By User'
              WHEN c.name LIKE '%version%' OR c.name LIKE '%timestamp%' OR c.name LIKE '%rowversion%' THEN 'Version/Timestamp'
              WHEN c.name LIKE '%deleted%' OR c.name LIKE '%active%' OR c.name LIKE '%enabled%' THEN 'Status/Flag'
              WHEN c.name LIKE '%id' AND (
                c.name LIKE '%created%by%id' OR 
                c.name LIKE '%modified%by%id' OR 
                c.name LIKE '%updated%by%id'
              ) THEN 'Audit User ID'
              ELSE 'Other Audit Pattern'
            END as audit_type,
            CASE 
              WHEN dc.definition LIKE '%GETDATE%' OR dc.definition LIKE '%GETUTCDATE%' THEN 'Auto Current Date'
              WHEN dc.definition LIKE '%USER%' OR dc.definition LIKE '%SUSER%' THEN 'Auto Current User'
              WHEN dc.definition = '(1)' OR dc.definition = '1' THEN 'Default True/Active'
              WHEN dc.definition = '(0)' OR dc.definition = '0' THEN 'Default False/Inactive'
              ELSE 'Manual or Other'
            END as default_behavior
          FROM sys.tables t
          INNER JOIN sys.columns c ON t.object_id = c.object_id
          LEFT JOIN sys.default_constraints dc ON c.object_id = dc.parent_object_id AND c.column_id = dc.parent_column_id
          WHERE SCHEMA_NAME(t.schema_id) = '${sanitizeName(schema)}'
            AND (
              c.name LIKE '%created%' OR c.name LIKE '%create%' OR
              c.name LIKE '%modified%' OR c.name LIKE '%update%' OR
              c.name LIKE '%deleted%' OR c.name LIKE '%active%' OR
              c.name LIKE '%version%' OR c.name LIKE '%timestamp%' OR
              c.name LIKE '%by%' OR c.name LIKE '%user%' OR
              c.name LIKE '%enabled%'
            )
          ORDER BY t.name, 
            CASE 
              WHEN c.name LIKE '%created%date%' OR c.name LIKE '%create%date%' THEN 1
              WHEN c.name LIKE '%created%by%' OR c.name LIKE '%create%by%' THEN 2
              WHEN c.name LIKE '%modified%date%' OR c.name LIKE '%update%date%' THEN 3
              WHEN c.name LIKE '%modified%by%' OR c.name LIKE '%update%by%' THEN 4
              ELSE 5
            END,
            c.name
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
            text: `Error detecting audit columns: ${err.message}`
          }],
          isError: true
        };
      }
    }
  );
}
