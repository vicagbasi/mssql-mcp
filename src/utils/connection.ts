/**
 * Connection management utilities for MSSQL MCP Server
 */

import { Connection, Request } from "tedious";
import { ConnectionConfig, WindowsCredentials, NamedConnections } from "../types/index.js";

export class ConnectionManager {
  private connections = new Map<string, Connection>();
  private defaultConnectionString: string | undefined;
  private windowsCredentials: WindowsCredentials = {};
  private namedConnections: NamedConnections = {};

  constructor() {
    this.initializeFromEnvironment();
  }

  private initializeFromEnvironment(): void {
    // Get default connection string
    this.defaultConnectionString = process.env.MSSQL_CONNECTION_STRING;

    // Initialize Windows credentials
    this.loadWindowsCredentials();

    // Initialize named connections
    this.loadNamedConnections();
  }

  private loadWindowsCredentials(): void {
    try {
      // New individual credential approach (cleanest - no JSON strings)
      if (process.env.WINDOWS_USERNAME || process.env.WINDOWS_PASSWORD || process.env.WINDOWS_DOMAIN) {
        if (process.env.WINDOWS_USERNAME) {
          this.windowsCredentials.username = process.env.WINDOWS_USERNAME;
        }
        if (process.env.WINDOWS_PASSWORD) {
          this.windowsCredentials.password = process.env.WINDOWS_PASSWORD;
        }
        if (process.env.WINDOWS_DOMAIN) {
          this.windowsCredentials.domain = process.env.WINDOWS_DOMAIN;
        }
      }
      // Fallback: windows_credentials (clean name, JSON string)
      else if (process.env.windows_credentials) {
        this.windowsCredentials = JSON.parse(process.env.windows_credentials);
      }
      // Fallback: MSSQL_WINDOWS_CREDENTIALS (longer prefixed name, JSON string)
      else if (process.env.MSSQL_WINDOWS_CREDENTIALS) {
        this.windowsCredentials = JSON.parse(process.env.MSSQL_WINDOWS_CREDENTIALS);
      }
      // Fallback: legacy individual environment variables
      else {
        if (process.env.MSSQL_USERNAME) {
          this.windowsCredentials.username = process.env.MSSQL_USERNAME;
        }
        if (process.env.MSSQL_PASSWORD) {
          this.windowsCredentials.password = process.env.MSSQL_PASSWORD;
        }
        if (process.env.MSSQL_DOMAIN) {
          this.windowsCredentials.domain = process.env.MSSQL_DOMAIN;
        }
      }
    } catch (error) {
      console.error('Error parsing Windows credentials:', error);
    }
  }

  private loadNamedConnections(): void {
    try {
      // New individual connection approach (cleanest - find all CONNECTION_* variables)
      const connectionVars: Record<string, string> = {};
      for (const [key, value] of Object.entries(process.env)) {
        if (key.startsWith('CONNECTION_') && typeof value === 'string') {
          const connectionName = key.substring(11).toLowerCase(); // Remove 'CONNECTION_' prefix
          connectionVars[connectionName] = value;
        }
      }
      
      if (Object.keys(connectionVars).length > 0) {
        this.namedConnections = connectionVars;
      }
      // Fallback: connections (clean name, JSON string)
      else if (process.env.connections) {
        this.namedConnections = JSON.parse(process.env.connections);
      }
      // Fallback: MSSQL_CONNECTIONS (longer prefixed name, JSON string)
      else if (process.env.MSSQL_CONNECTIONS) {
        this.namedConnections = JSON.parse(process.env.MSSQL_CONNECTIONS);
      }
    } catch (error) {
      console.error('Error parsing named connections:', error);
    }
  }

  public parseConnectionString(connectionString: string, envCredentials?: WindowsCredentials): ConnectionConfig {
    const config: ConnectionConfig = {
      server: 'localhost',
      options: {
        encrypt: true,
        trustServerCertificate: true,
        enableArithAbort: true
      },
      authentication: {
        type: 'default',
        options: {}
      }
    };

    // Parse connection string
    const parts = connectionString.split(';').filter(part => part.trim());
    
    for (const part of parts) {
      const [key, value] = part.split('=').map(s => s.trim());
      if (!key || !value) continue;
      
      const lowerKey = key.toLowerCase();
      
      switch (lowerKey) {
        case 'server':
        case 'data source':
          config.server = value;
          break;
        case 'database':
        case 'initial catalog':
          config.options.database = value;
          break;
        case 'user id':
        case 'uid':
          config.authentication.options.userName = value;
          break;
        case 'password':
        case 'pwd':
          config.authentication.options.password = value;
          break;
        case 'integrated security':
          if (value.toLowerCase() === 'true' || value.toLowerCase() === 'sspi') {
            config.authentication.type = 'ntlm';
            // Use environment credentials if provided, otherwise rely on current user context
            if (envCredentials?.username) {
              config.authentication.options.userName = envCredentials.username;
            }
            if (envCredentials?.password) {
              config.authentication.options.password = envCredentials.password;
            }
            if (envCredentials?.domain) {
              config.authentication.options.domain = envCredentials.domain;
            }
            // If no credentials provided, remove them to attempt current user authentication
            if (!envCredentials?.username && !envCredentials?.password) {
              delete config.authentication.options.userName;
              delete config.authentication.options.password;
            }
          }
          break;
        case 'encrypt':
          config.options.encrypt = value.toLowerCase() === 'true';
          break;
        case 'trustservercertificate':
          config.options.trustServerCertificate = value.toLowerCase() === 'true';
          break;
      }
    }

    return config;
  }

  public getConnectionString(providedConnectionString?: string, connectionName?: string): string {
    // Priority: explicit connectionString > named connection > default
    if (providedConnectionString) {
      return providedConnectionString;
    }
    
    if (connectionName) {
      const namedConnection = this.namedConnections[connectionName];
      if (!namedConnection) {
        throw new Error(`Named connection '${connectionName}' not found. Available connections: ${Object.keys(this.namedConnections).join(', ')}`);
      }
      return namedConnection;
    }
    
    if (this.defaultConnectionString) {
      return this.defaultConnectionString;
    }
    
    throw new Error('No connection string provided and no default connection string configured');
  }

  public async getConnection(connectionString?: string, connectionName?: string): Promise<Connection> {
    const actualConnectionString = this.getConnectionString(connectionString, connectionName);
    
    if (this.connections.has(actualConnectionString)) {
      const connection = this.connections.get(actualConnectionString)!;
      if (connection.state.name === 'LoggedIn') {
        return connection;
      }
    }

    // Use the global windows credentials
    const config = this.parseConnectionString(actualConnectionString, this.windowsCredentials);
    
    return new Promise((resolve, reject) => {
      const connection = new Connection(config);
      
      connection.on('connect', (err) => {
        if (err) {
          reject(err);
        } else {
          this.connections.set(actualConnectionString, connection);
          resolve(connection);
        }
      });

      connection.on('error', (err) => {
        this.connections.delete(actualConnectionString);
        reject(err);
      });

      connection.connect();
    });
  }

  public getNamedConnections(): NamedConnections {
    return this.namedConnections;
  }

  public getDefaultConnectionString(): string | undefined {
    return this.defaultConnectionString;
  }

  public closeAllConnections(): void {
    for (const connection of this.connections.values()) {
      connection.close();
    }
    this.connections.clear();
  }
}

export async function executeQuery(connection: Connection, sql: string): Promise<any[]> {
  return new Promise((resolve, reject) => {
    const rows: any[] = [];
    
    const request = new Request(sql, (err) => {
      if (err) {
        reject(err);
      } else {
        resolve(rows);
      }
    });

    request.on('row', (columns: any[]) => {
      const row: any = {};
      columns.forEach((column: any) => {
        row[column.metadata.colName] = column.value;
      });
      rows.push(row);
    });

    connection.execSql(request);
  });
}
