import { McpServer, McpConnection, McpTool } from '@modelcontextprotocol/sdk';
import { createDbConnection } from './db.js';
import { Connection, Request } from 'tedious';

const server = new McpServer();

server.on('connection', async (connection: McpConnection) => {
  console.log('Client connected');

  const connectionString = connection.connectionString;
  if (!connectionString) {
    console.error('Connection string is missing');
    connection.close();
    return;
  }

  let dbConnection: Connection;
  try {
    dbConnection = await createDbConnection(connectionString);
    console.log('Database connection established');
  } catch (err) {
    console.error('Database connection failed:', err);
    connection.close();
    return;
  }

  const listTablesTool: McpTool = {
    name: 'list_tables',
    description: 'Lists all tables in the database',
    run: () => {
      return new Promise((resolve, reject) => {
        const tables: string[] = [];
        const request = new Request("SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_TYPE = 'BASE TABLE'", (err, rowCount) => {
          if (err) {
            reject(err);
          } else {
            resolve(tables);
          }
        });

        request.on('row', (columns: any[]) => {
          tables.push(columns[0].value);
        });

        dbConnection.execSql(request);
      });
    }
  };

  connection.addTool(listTablesTool);

  const getTableSchemaTool: McpTool = {
    name: 'get_table_schema',
    description: 'Gets the schema of a specific table',
    argument: {
      name: 'tableName',
      description: 'The name of the table',
      type: 'string'
    },
    run: (tableName: string) => {
      return new Promise((resolve, reject) => {
        const schema: { [columnName: string]: string } = {};
        const request = new Request(`SELECT COLUMN_NAME, DATA_TYPE FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = '${tableName}'`, (err, rowCount) => {
          if (err) {
            reject(err);
          } else {
            resolve(schema);
          }
        });

        request.on('row', (columns: any[]) => {
          schema[columns[0].value] = columns[1].value;
        });

        dbConnection.execSql(request);
      });
    }
  };

  connection.addTool(getTableSchemaTool);

  const getSampleDataTool: McpTool = {
    name: 'get_sample_data',
    description: 'Gets sample data from a table',
    argument: {
      name: 'options',
      description: 'The options for getting sample data',
      type: 'object',
      properties: {
        tableName: {
          type: 'string',
          description: 'The name of the table'
        },
        rowCount: {
          type: 'number',
          description: 'The number of rows to return',
          optional: true
        }
      }
    },
    run: (options: { tableName: string, rowCount?: number }) => {
      return new Promise((resolve, reject) => {
        const rowCount = options.rowCount || 5;
        const data: any[] = [];
        const request = new Request(`SELECT TOP ${rowCount} * FROM ${options.tableName}`, (err, rowCount) => {
          if (err) {
            reject(err);
          } else {
            resolve(data);
          }
        });

        request.on('row', (columns: any[]) => {
          const row: { [columnName: string]: any } = {};
          columns.forEach(column => {
            row[column.metadata.colName] = column.value;
          });
          data.push(row);
        });

        dbConnection.execSql(request);
      });
    }
  };

  connection.addTool(getSampleDataTool);

  const executeQueryTool: McpTool = {
    name: 'execute_query',
    description: 'Executes a SQL query',
    argument: {
      name: 'query',
      description: 'The SQL query to execute',
      type: 'string'
    },
    run: (query: string) => {
      return new Promise((resolve, reject) => {
        if (!query.trim().toLowerCase().startsWith('select')) {
          return reject(new Error('Only SELECT queries are allowed'));
        }

        const data: any[] = [];
        const request = new Request(query, (err, rowCount) => {
          if (err) {
            reject(err);
          } else {
            resolve(data);
          }
        });

        request.on('row', (columns: any[]) => {
          const row: { [columnName: string]: any } = {};
          columns.forEach(column => {
            row[column.metadata.colName] = column.value;
          });
          data.push(row);
        });

        dbConnection.execSql(request);
      });
    }
  };

  connection.addTool(executeQueryTool);

  connection.on('close', () => {
    console.log('Client disconnected');
    dbConnection.close();
  });
});

const port: number | string = process.env.PORT || 3000;
server.listen(port, () => {
  console.log(`MCP server listening on port ${port}`);
});
