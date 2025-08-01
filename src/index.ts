#!/usr/bin/env node
/**
 * MSSQL MCP Server - Modular Entry Point
 * 
 * This server provides Model Context Protocol (MCP) tools for interacting with Microsoft SQL Server databases.
 * It exposes comprehensive schema discovery and data access capabilities through standardized MCP tools.
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { ConnectionManager } from "./utils/connection.js";
import { registerCoreTools } from "./tools/core.js";
import { registerSchemaDiscoveryTools } from "./tools/schema.js";
import { registerIndexAndPerformanceTools } from "./tools/performance.js";
import { registerConstraintAnalysisTools } from "./tools/constraints.js";
import { registerDataPatternTools } from "./tools/data-patterns.js";
import { registerStoredProcedureTools } from "./tools/stored-procedures.js";

/**
 * Initialize and start the MSSQL MCP Server
 */
async function main() {
  // Create MCP server instance
  const server = new McpServer({
    name: "mssql-mcp-server",
    version: "1.2.0"
  });

  // Initialize connection manager
  const connectionManager = new ConnectionManager();

  // Register all tool modules
  console.error("Registering core database tools...");
  registerCoreTools(server, connectionManager);

  console.error("Registering schema discovery tools...");
  registerSchemaDiscoveryTools(server, connectionManager);

  console.error("Registering index and performance tools...");
  registerIndexAndPerformanceTools(server, connectionManager);

  console.error("Registering constraint analysis tools...");
  registerConstraintAnalysisTools(server, connectionManager);

  console.error("Registering data pattern analysis tools...");
  registerDataPatternTools(server, connectionManager);

  console.error("Registering enhanced stored procedure tools...");
  registerStoredProcedureTools(server, connectionManager);

  console.error("All tools registered successfully. Starting server...");

  // Start the server with stdio transport
  const transport = new StdioServerTransport();
  await server.connect(transport);
  
  console.error("MSSQL MCP Server started successfully!");

  // Clean up connections on exit
  process.on('SIGINT', async () => {
    console.error('Shutting down server...');
    connectionManager.closeAllConnections();
    process.exit(0);
  });

  process.on('SIGTERM', async () => {
    console.error('Shutting down server...');
    connectionManager.closeAllConnections();
    process.exit(0);
  });
}

// Start the server
main().catch((error) => {
  console.error('Server failed to start:', error);
  process.exit(1);
});
