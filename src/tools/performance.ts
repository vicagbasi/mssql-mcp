/**
 * Index and performance analysis tools for MSSQL MCP Server
 * These tools help analyze indexes, table statistics, and performance patterns
 */

import { z } from "zod";
import { ConnectionManager, executeQuery } from "../utils/connection.js";
import { sanitizeName } from "../utils/query.js";
import { McpToolResponse } from "../types/index.js";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

export function registerIndexAndPerformanceTools(server: McpServer, connectionManager: ConnectionManager): void {

  // Tool: List indexes
  server.registerTool(
    "list_indexes",
    {
      title: "List Table Indexes",
      description: "List all indexes on tables with usage statistics and detailed information",
      inputSchema: {
        connectionString: z.string().optional().describe("SQL Server connection string (uses default if not provided)"),
        connectionName: z.string().optional().describe("Named connection to use (e.g., 'production', 'staging')"),
        schema: z.string().optional().describe("Schema name (default: dbo)"),
        tableName: z.string().optional().describe("Filter by specific table name"),
        includeUsageStats: z.boolean().optional().describe("Include index usage statistics (default: true)")
      }
    },
    async ({ connectionString, connectionName, schema = "dbo", tableName, includeUsageStats = true }): Promise<McpToolResponse> => {
      try {
        const connection = await connectionManager.getConnection(connectionString, connectionName);
        
        const tableFilter = tableName ? `AND t.name = '${sanitizeName(tableName)}'` : "";
        const usageStatsJoin = includeUsageStats ? `
          LEFT JOIN sys.dm_db_index_usage_stats ius ON i.object_id = ius.object_id AND i.index_id = ius.index_id
        ` : "";
        const usageStatsColumns = includeUsageStats ? `
          ,ISNULL(ius.user_seeks, 0) as user_seeks,
          ISNULL(ius.user_scans, 0) as user_scans,
          ISNULL(ius.user_lookups, 0) as user_lookups,
          ISNULL(ius.user_updates, 0) as user_updates,
          ius.last_user_seek,
          ius.last_user_scan,
          ius.last_user_lookup,
          ius.last_user_update
        ` : "";
        
        const result = await executeQuery(connection, `
          SELECT 
            SCHEMA_NAME(t.schema_id) as table_schema,
            t.name as table_name,
            i.name as index_name,
            i.type_desc as index_type,
            i.is_unique,
            i.is_primary_key,
            i.is_unique_constraint,
            i.fill_factor,
            STUFF((
              SELECT ', ' + c.name + CASE WHEN ic.is_descending_key = 1 THEN ' DESC' ELSE ' ASC' END
              FROM sys.index_columns ic
              INNER JOIN sys.columns c ON ic.object_id = c.object_id AND ic.column_id = c.column_id
              WHERE ic.object_id = i.object_id AND ic.index_id = i.index_id AND ic.is_included_column = 0
              ORDER BY ic.key_ordinal
              FOR XML PATH('')
            ), 1, 2, '') as key_columns,
            STUFF((
              SELECT ', ' + c.name
              FROM sys.index_columns ic
              INNER JOIN sys.columns c ON ic.object_id = c.object_id AND ic.column_id = c.column_id
              WHERE ic.object_id = i.object_id AND ic.index_id = i.index_id AND ic.is_included_column = 1
              ORDER BY ic.index_column_id
              FOR XML PATH('')
            ), 1, 2, '') as included_columns
            ${usageStatsColumns}
          FROM sys.indexes i
          INNER JOIN sys.tables t ON i.object_id = t.object_id
          ${usageStatsJoin}
          WHERE SCHEMA_NAME(t.schema_id) = '${sanitizeName(schema)}' 
            AND i.type > 0 ${tableFilter}
          ORDER BY t.name, i.name
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
            text: `Error listing indexes: ${err.message}`
          }],
          isError: true
        };
      }
    }
  );

  // Tool: Analyze table statistics
  server.registerTool(
    "analyze_table_stats",
    {
      title: "Analyze Table Statistics",
      description: "Get table row counts, size information, and last update statistics",
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
            p.rows as row_count,
            CAST(ROUND(((SUM(a.total_pages) * 8) / 1024.00), 2) AS NUMERIC(36, 2)) as total_space_mb,
            CAST(ROUND(((SUM(a.used_pages) * 8) / 1024.00), 2) AS NUMERIC(36, 2)) as used_space_mb,
            CAST(ROUND(((SUM(a.total_pages) - SUM(a.used_pages)) * 8) / 1024.00, 2) AS NUMERIC(36, 2)) as unused_space_mb,
            t.create_date as table_created,
            t.modify_date as table_modified,
            STATS_DATE(i.object_id, i.index_id) as stats_last_updated
          FROM sys.tables t
          INNER JOIN sys.indexes i ON t.object_id = i.object_id
          INNER JOIN sys.partitions p ON i.object_id = p.object_id AND i.index_id = p.index_id
          INNER JOIN sys.allocation_units a ON p.partition_id = a.container_id
          LEFT JOIN sys.dm_db_partition_stats ps ON t.object_id = ps.object_id AND i.index_id = ps.index_id
          WHERE SCHEMA_NAME(t.schema_id) = '${sanitizeName(schema)}'
            AND i.index_id < 2 ${tableFilter}
          GROUP BY 
            t.schema_id, t.name, p.rows, t.create_date, t.modify_date,
            i.object_id, i.index_id
          ORDER BY used_space_mb DESC
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
            text: `Error analyzing table statistics: ${err.message}`
          }],
          isError: true
        };
      }
    }
  );

  // Tool: Find missing indexes
  server.registerTool(
    "find_missing_indexes",
    {
      title: "Find Missing Indexes",
      description: "Identify potentially missing indexes based on query execution patterns",
      inputSchema: {
        connectionString: z.string().optional().describe("SQL Server connection string (uses default if not provided)"),
        connectionName: z.string().optional().describe("Named connection to use (e.g., 'production', 'staging')"),
        schema: z.string().optional().describe("Schema name (default: dbo)"),
        minImpact: z.number().optional().describe("Minimum impact score to include (default: 1000)")
      }
    },
    async ({ connectionString, connectionName, schema = "dbo", minImpact = 1000 }): Promise<McpToolResponse> => {
      try {
        const connection = await connectionManager.getConnection(connectionString, connectionName);
        
        const result = await executeQuery(connection, `
          SELECT 
            SCHEMA_NAME(o.schema_id) as table_schema,
            OBJECT_NAME(mid.object_id) as table_name,
            migs.avg_total_user_cost * (migs.avg_user_impact / 100.0) * (migs.user_seeks + migs.user_scans) AS improvement_measure,
            'CREATE INDEX [IX_' + OBJECT_NAME(mid.object_id) + '_' 
              + REPLACE(REPLACE(REPLACE(ISNULL(mid.equality_columns,''),', ','_'),'[',''),']','') 
              + CASE WHEN mid.inequality_columns IS NOT NULL 
                THEN '_' + REPLACE(REPLACE(REPLACE(mid.inequality_columns,', ','_'),'[',''),']','') 
                ELSE '' END + '] ON ' 
              + QUOTENAME(SCHEMA_NAME(o.schema_id)) + '.' + QUOTENAME(OBJECT_NAME(mid.object_id)) 
              + ' (' + ISNULL(mid.equality_columns,'')
              + CASE WHEN mid.equality_columns IS NOT NULL AND mid.inequality_columns IS NOT NULL 
                THEN ',' ELSE '' END + ISNULL(mid.inequality_columns, '') + ')'
              + ISNULL(' INCLUDE (' + mid.included_columns + ')', '') AS create_index_statement,
            migs.user_seeks,
            migs.user_scans,
            migs.avg_total_user_cost,
            migs.avg_user_impact,
            mid.equality_columns,
            mid.inequality_columns,
            mid.included_columns
          FROM sys.dm_db_missing_index_details mid
          INNER JOIN sys.dm_db_missing_index_groups mig ON mid.index_handle = mig.index_handle
          INNER JOIN sys.dm_db_missing_index_group_stats migs ON mig.index_group_handle = migs.group_handle
          INNER JOIN sys.objects o ON mid.object_id = o.object_id
          WHERE migs.avg_total_user_cost * (migs.avg_user_impact / 100.0) * (migs.user_seeks + migs.user_scans) > ${minImpact}
            AND SCHEMA_NAME(o.schema_id) = '${sanitizeName(schema)}'
          ORDER BY improvement_measure DESC
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
            text: `Error finding missing indexes: ${err.message}`
          }],
          isError: true
        };
      }
    }
  );

  // Tool: Analyze index usage
  server.registerTool(
    "analyze_index_usage",
    {
      title: "Analyze Index Usage",
      description: "Show detailed index usage statistics to identify unused or underutilized indexes",
      inputSchema: {
        connectionString: z.string().optional().describe("SQL Server connection string (uses default if not provided)"),
        connectionName: z.string().optional().describe("Named connection to use (e.g., 'production', 'staging')"),
        schema: z.string().optional().describe("Schema name (default: dbo)"),
        tableName: z.string().optional().describe("Filter by specific table name"),
        showUnusedOnly: z.boolean().optional().describe("Show only unused indexes (default: false)")
      }
    },
    async ({ connectionString, connectionName, schema = "dbo", tableName, showUnusedOnly = false }): Promise<McpToolResponse> => {
      try {
        const connection = await connectionManager.getConnection(connectionString, connectionName);
        
        const tableFilter = tableName ? `AND t.name = '${sanitizeName(tableName)}'` : "";
        const unusedFilter = showUnusedOnly ? `
          AND (ius.user_seeks IS NULL AND ius.user_scans IS NULL AND ius.user_lookups IS NULL)
          AND i.is_primary_key = 0 AND i.is_unique_constraint = 0
        ` : "";
        
        const result = await executeQuery(connection, `
          SELECT 
            SCHEMA_NAME(t.schema_id) as table_schema,
            t.name as table_name,
            i.name as index_name,
            i.type_desc as index_type,
            i.is_primary_key,
            i.is_unique_constraint,
            ISNULL(ius.user_seeks, 0) as user_seeks,
            ISNULL(ius.user_scans, 0) as user_scans,
            ISNULL(ius.user_lookups, 0) as user_lookups,
            ISNULL(ius.user_updates, 0) as user_updates,
            (ISNULL(ius.user_seeks, 0) + ISNULL(ius.user_scans, 0) + ISNULL(ius.user_lookups, 0)) as total_reads,
            ius.last_user_seek,
            ius.last_user_scan,
            ius.last_user_lookup,
            ius.last_user_update,
            CASE 
              WHEN ius.user_seeks IS NULL AND ius.user_scans IS NULL AND ius.user_lookups IS NULL 
                AND i.is_primary_key = 0 AND i.is_unique_constraint = 0 
              THEN 'UNUSED - Consider dropping'
              WHEN ISNULL(ius.user_updates, 0) > (ISNULL(ius.user_seeks, 0) + ISNULL(ius.user_scans, 0) + ISNULL(ius.user_lookups, 0)) * 3
              THEN 'HIGH MAINTENANCE - Updates > 3x Reads'
              WHEN (ISNULL(ius.user_seeks, 0) + ISNULL(ius.user_scans, 0) + ISNULL(ius.user_lookups, 0)) > 0
              THEN 'ACTIVE'
              ELSE 'LOW USAGE'
            END as usage_assessment
          FROM sys.indexes i
          INNER JOIN sys.tables t ON i.object_id = t.object_id
          LEFT JOIN sys.dm_db_index_usage_stats ius ON i.object_id = ius.object_id AND i.index_id = ius.index_id
          WHERE SCHEMA_NAME(t.schema_id) = '${sanitizeName(schema)}'
            AND i.type > 0 ${tableFilter} ${unusedFilter}
          ORDER BY 
            usage_assessment DESC,
            total_reads DESC,
            t.name, i.name
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
            text: `Error analyzing index usage: ${err.message}`
          }],
          isError: true
        };
      }
    }
  );

  // Tool: Get database size information
  server.registerTool(
    "analyze_database_size",
    {
      title: "Analyze Database Size",
      description: "Get comprehensive database size information including data and log file sizes",
      inputSchema: {
        connectionString: z.string().optional().describe("SQL Server connection string (uses default if not provided)"),
        connectionName: z.string().optional().describe("Named connection to use (e.g., 'production', 'staging')")
      }
    },
    async ({ connectionString, connectionName }): Promise<McpToolResponse> => {
      try {
        const connection = await connectionManager.getConnection(connectionString, connectionName);
        
        // Get database file information
        const filesResult = await executeQuery(connection, `
          SELECT 
            name as file_name,
            type_desc as file_type,
            physical_name,
            CAST(size * 8.0 / 1024 AS DECIMAL(10,2)) as size_mb,
            CASE max_size 
              WHEN -1 THEN 'Unlimited'
              WHEN 0 THEN 'No growth allowed'
              ELSE CAST(max_size * 8.0 / 1024 AS VARCHAR(20)) + ' MB'
            END as max_size,
            CASE is_percent_growth
              WHEN 1 THEN CAST(growth AS VARCHAR(10)) + '%'
              ELSE CAST(growth * 8.0 / 1024 AS VARCHAR(10)) + ' MB'
            END as growth_setting,
            is_read_only
          FROM sys.database_files
          ORDER BY type, name
        `);

        // Get space usage by schema
        const schemaUsageResult = await executeQuery(connection, `
          SELECT 
            SCHEMA_NAME(t.schema_id) as schema_name,
            COUNT(*) as table_count,
            SUM(p.rows) as total_rows,
            CAST(SUM(a.total_pages) * 8.0 / 1024 AS DECIMAL(10,2)) as total_space_mb,
            CAST(SUM(a.used_pages) * 8.0 / 1024 AS DECIMAL(10,2)) as used_space_mb,
            CAST(SUM(a.data_pages) * 8.0 / 1024 AS DECIMAL(10,2)) as data_space_mb
          FROM sys.tables t
          INNER JOIN sys.indexes i ON t.object_id = i.object_id
          INNER JOIN sys.partitions p ON i.object_id = p.object_id AND i.index_id = p.index_id
          INNER JOIN sys.allocation_units a ON p.partition_id = a.container_id
          WHERE i.index_id < 2
          GROUP BY t.schema_id
          ORDER BY used_space_mb DESC
        `);

        const result = {
          database_files: filesResult,
          schema_usage: schemaUsageResult
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
            text: `Error analyzing database size: ${err.message}`
          }],
          isError: true
        };
      }
    }
  );
}
