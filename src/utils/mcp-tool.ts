/**
 * Thin wrapper around the MCP SDK tool registration.
 *
 * Newer SDK versions infer deeply through every Zod input schema. Keeping that
 * inference behind this boundary avoids TS2589 while preserving runtime schema
 * validation in the SDK.
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { McpToolResponse } from "../types/index.js";

interface ToolRegistrationConfig {
  title: string;
  description: string;
  inputSchema: Record<string, unknown>;
}

type ToolHandler = (args: any) => Promise<McpToolResponse>;

export function registerMcpTool(
  server: McpServer,
  name: string,
  config: ToolRegistrationConfig,
  handler: ToolHandler
): unknown {
  return server.registerTool(name, config as any, handler as any);
}
