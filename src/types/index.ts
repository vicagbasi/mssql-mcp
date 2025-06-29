/**
 * Type definitions for the MSSQL MCP Server
 */

import { Connection } from "tedious";

export interface WindowsCredentials {
  username?: string;
  password?: string;
  domain?: string;
}

export interface ConnectionConfig {
  server: string;
  options: {
    database?: string;
    encrypt: boolean;
    trustServerCertificate: boolean;
    enableArithAbort: boolean;
  };
  authentication: {
    type: "default" | "ntlm" | "token-credential" | "azure-active-directory-password" | "azure-active-directory-msi-app-service" | "azure-active-directory-msi-vm" | "azure-active-directory-access-token" | "azure-active-directory-service-principal-secret" | "azure-active-directory-default";
    options: {
      userName?: string;
      password?: string;
      domain?: string;
    };
  };
}

export interface NamedConnections {
  [key: string]: string;
}

export interface ConnectionManager {
  connections: Map<string, Connection>;
  defaultConnectionString?: string;
  windowsCredentials: WindowsCredentials;
  namedConnections: NamedConnections;
}

export interface McpToolResponse {
  content: Array<{
    type: "text";
    text: string;
  }>;
  isError?: boolean;
  [key: string]: unknown;
}

export interface TableInfo {
  schema: string;
  tableName: string;
  columns: any[];
  primaryKeys: any[];
  foreignKeys: any[];
}

export interface StoredProcedureInfo {
  schema: string;
  name: string;
  type: string;
  definition?: string;
  parameters: any[];
  created_date: Date;
  modified_date: Date;
}

export interface IndexInfo {
  table_name: string;
  index_name: string;
  index_type: string;
  is_unique: boolean;
  is_primary_key: boolean;
  columns: string;
  included_columns?: string;
  user_seeks: number;
  user_scans: number;
  user_lookups: number;
  user_updates: number;
}

export interface ConstraintInfo {
  table_name: string;
  constraint_name: string;
  constraint_type: string;
  column_name: string;
  check_clause?: string;
  referenced_table?: string;
  referenced_column?: string;
}
