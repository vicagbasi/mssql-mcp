# 🗄️ MSSQL MCP Server

A Model Context Protocol (MCP) server that provides secure access to Microsoft SQL Server databases. This server enables LLM applications to explore database schemas and execute read-only queries through standardized MCP tools.

Built using the [tedious](https://github.com/tediousjs/tedious) library for pure JavaScript SQL Server connectivity with support for Windows Authentication (NTLM).

## 🚀 Quick Start

1. **📦 Install**: `npm install && npm run build`
2. **⚙️ Configure**: Update `.vscode/mcp.json` with your database credentials
3. **🔗 Connect**: Tools automatically use the default connection from configuration
4. **🔍 Explore**: Use natural language to query and explore your database

## 🛠️ Available Tools

All tools accept an optional `connectionString` parameter. If not provided, they use the default connection from MCP configuration.

- **🔌 test_connection** - Test database connectivity and get server information
- **📚 list_databases** - List all available databases on the SQL Server instance
- **📋 list_tables** - List all tables in a specific schema (default: dbo)
- **📊 describe_table** - Get detailed schema information including columns, data types, and constraints
- **🎯 sample_data** - Retrieve sample data from a table (default: 10 rows, max: 100)
- **💻 execute_query** - Execute custom SELECT queries (read-only, limited to 20 rows)
- **🔗 get_relationships** - Get foreign key relationships between tables

## ✨ Features

- **⚡ Default Connection Configuration**: Set up once in MCP config, use everywhere
- **🔐 Windows Authentication Support**: Full NTLM authentication with domain credentials
- **🔍 Schema Discovery**: Comprehensive database exploration capabilities
- **📊 Data Sampling**: Safe data retrieval with configurable limits
- **🛡️ Read-Only Security**: Built-in query validation and safety restrictions
- **🔄 Connection Pooling**: Efficient connection reuse using tedious
- **🎛️ Flexible Usage**: Optional connection strings for multi-database scenarios

## 📦 Installation

```bash
npm install
npm run build
```

## ⚙️ Configuration

### 🎯 MCP Configuration (Recommended)

Configure your default database connection in `.vscode/mcp.json`:

```jsonc
{
    "servers": {
        "mssql-mcp": {
            "type": "stdio",
            "command": "node",
            "args": [
                "C:\\path\\to\\mssql-mcp\\dist\\index.js"
            ],
            "env": {
                // Windows Authentication credentials for NTLM
                "MSSQL_USERNAME": "your-domain-username",
                "MSSQL_PASSWORD": "your-password",
                "MSSQL_DOMAIN": "your-domain",
                
                // Default connection string
                "MSSQL_CONNECTION_STRING": "Data Source=ServerName; Initial Catalog=DatabaseName; Integrated Security=SSPI; TrustServerCertificate=True;"
            }
        }
    }
}
```

### 🔗 Connection String Examples

**🔐 Windows Authentication (Recommended):**
```
Data Source=ServerName; Initial Catalog=DatabaseName; Integrated Security=SSPI; TrustServerCertificate=True;
```

**🔑 SQL Server Authentication:**
```
Server=localhost,1433;Database=AdventureWorks;User Id=sa;Password=YourPassword123!;Encrypt=true;TrustServerCertificate=true;
```

**☁️ Azure SQL Database:**
```
Server=your-server.database.windows.net;Database=your-database;User Id=your-username;Password=your-password;Encrypt=true;
```

**🏷️ Named Instance:**
```
Server=localhost\\SQLEXPRESS;Database=TestDB;Integrated Security=true;TrustServerCertificate=true;
```

## 📖 Usage

### 🔄 Connection Hierarchy

The server uses the following connection priority:

1. **🎯 Explicit connection string** (provided in tool call)
2. **🌐 Default connection string** (from `MSSQL_CONNECTION_STRING` environment variable)
3. **❌ Error** (if neither is available)

### 🏃‍♂️ Basic Workflow

1. **🔌 Test Connection**
   ```
   Use test_connection() to verify your default configuration
   ```

2. **🔍 Explore Database**
   ```
   Use list_databases() to see available databases
   Use list_tables() to see tables in current database
   ```

3. **📊 Understand Schema**
   ```
   Use describe_table(tableName: "Users") to get column details
   Use get_relationships() to see foreign key relationships
   ```

4. **📋 Access Data**
   ```
   Use sample_data(tableName: "Orders") to preview data
   Use execute_query(query: "SELECT * FROM Products WHERE Category = 'Electronics'")
   ```

### 🚀 Advanced Usage

**🔀 Multi-Database Access:**
```
Use any tool with a specific connectionString parameter to access different databases
```

**🏢 Schema-Specific Operations:**
```
Use list_tables(schema: "HR") to list tables in the HR schema
Use describe_table(tableName: "Employees", schema: "HR") for HR.Employees table
```

## 🔐 Windows Authentication Setup

This server fully supports Windows Authentication through NTLM. Configure your domain credentials in the MCP configuration:

### 📋 Required Environment Variables

- `MSSQL_USERNAME` - Your domain username
- `MSSQL_PASSWORD` - Your domain password  
- `MSSQL_DOMAIN` - Your domain name
- `MSSQL_CONNECTION_STRING` - Connection string with Integrated Security=SSPI

### 🎉 Benefits of Windows Authentication

- **🎫 Single Sign-On**: Use your Windows credentials
- **🏢 Domain Security**: Leverage existing domain policies
- **🚫 No SQL Logins**: Avoid managing separate SQL Server accounts
- **📝 Audit Trail**: Actions tracked through Windows identity

## 🛡️ Security Features

- **👁️ Read-Only Access**: Only SELECT statements are permitted
- **✅ Query Validation**: Blocks INSERT, UPDATE, DELETE, DROP, CREATE, ALTER, etc.
- **📏 Automatic Limits**: TOP clause inserted (20 rows for queries, 10 for samples)
- **🔒 Connection Security**: Credentials stored in MCP configuration only
- **🚨 Error Handling**: Detailed error messages for troubleshooting

## 🔧 Integration Examples

### 💻 VS Code with Copilot Chat

```jsonc
// In .vscode/mcp.json
{
    "servers": {
        "mssql-mcp": {
            "type": "stdio",
            "command": "node",
            "args": ["./dist/index.js"],
            "env": {
                "MSSQL_USERNAME": "user@domain.com",
                "MSSQL_PASSWORD": "password",
                "MSSQL_DOMAIN": "DOMAIN",
                "MSSQL_CONNECTION_STRING": "Data Source=DevServer; Initial Catalog=AppDB; Integrated Security=SSPI; TrustServerCertificate=True;"
            }
        }
    }
}
```

### 🤖 Claude Desktop

```json
{
  "mcpServers": {
    "mssql-mcp": {
      "command": "node",
      "args": ["/path/to/mssql-mcp/dist/index.js"],
      "env": {
        "MSSQL_CONNECTION_STRING": "your-connection-string"
      }
    }
  }
}
```

## 👨‍💻 Development

```bash
# Install dependencies
npm install

# Build TypeScript
npm run build

# Development mode
npm run dev

# Test connection (requires configuration)
npm test
```

## 🚨 Troubleshooting

### ⚠️ Common Issues

**❌ "No connection string provided"**
- Ensure `MSSQL_CONNECTION_STRING` is set in your MCP configuration
- Verify the environment variables are properly configured

**🔑 "Login failed for user ''"**
- Check Windows Authentication credentials in MCP config
- Verify domain, username, and password are correct
- Ensure SQL Server allows Windows Authentication

**🌐 "Server not found"**
- Verify server name in connection string
- Check network connectivity to SQL Server
- Confirm SQL Server is running and accessible

### 🔍 Debugging

Enable detailed logging by checking MCP server output and SQL Server error logs.

## 📋 Requirements

- **⚙️ Node.js**: Version 18 or higher
- **🗄️ Microsoft SQL Server**: (2008 or later)
- **🔐 Valid SQL Server connection credentials**
- **🌐 Network access** to SQL Server instance

## 📄 License

MIT License

## 🤝 Contributing

1. 🍴 Fork the repository
2. 🌿 Create a feature branch
3. ✏️ Make your changes
4. 🧪 Add tests if applicable
5. 📤 Submit a pull request

## 🆘 Support

For issues and questions:
- 🔍 Check the troubleshooting section
- 📖 Review SQL Server connectivity requirements
- ⚙️ Verify MCP configuration format
- 🐛 Submit issues via GitHub repository
